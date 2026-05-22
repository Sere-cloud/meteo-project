# backend/auth.py
from datetime import datetime, timedelta, timezone
from typing import Optional
import importlib.util, secrets, smtplib, os, requests, time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from . import models, schemas
from .database import get_db
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security    = HTTPBearer()

# ─── Chargement predictor (get_nearest_ville uniquement) ─────────
def _load_predictor():
    path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml', 'predictor.py'))
    spec = importlib.util.spec_from_file_location("predictor", path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

_predictor = _load_predictor()

# ─── GÉOCODAGE NOMINATIM ✅ défini ici, plus dans predictor.py ───
def geocode_ville(nom_ville: str) -> Optional[dict]:
    """Géocode une ville camerounaise via Nominatim. Retourne {lat, lon} ou None."""
    try:
        time.sleep(1)  # politique Nominatim : 1 req/s
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": f"{nom_ville}, Cameroun", "format": "json", "limit": 1},
            headers={"User-Agent": "PrevioMet/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            return {"lat": float(results[0]["lat"]), "lon": float(results[0]["lon"])}
    except Exception as e:
        print(f"⚠️ Géocodage échoué pour '{nom_ville}': {e}")
    return None

# ─── MOT DE PASSE ────────────────────────────────────────────────
def hash_password(p: str) -> str: return pwd_context.hash(p)
def verify_password(plain: str, hashed: str) -> bool: return pwd_context.verify(plain, hashed)

# ─── JWT ─────────────────────────────────────────────────────────
def create_access_token(data: dict) -> str:
    to_encode = {**data, "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try: return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError: return None

# ─── UTILISATEUR COURANT ─────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token invalide ou expiré",
                        headers={"WWW-Authenticate": "Bearer"})
    payload = decode_token(credentials.credentials)
    if not payload: raise exc
    username = payload.get("sub")
    if not username: raise exc
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not user.is_active: raise exc
    return user

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    return current_user

# ─── EMAIL ───────────────────────────────────────────────────────
def send_reset_email(to_email: str, reset_link: str):
    if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
        print(f"\n{'='*60}\n📧 MODE DEV — Lien reset :\n{reset_link}\n{'='*60}\n")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Réinitialisation de votre mot de passe — PrevioMet"
    msg["From"]    = settings.GMAIL_USER
    msg["To"]      = to_email
    msg.attach(MIMEText(f"""<html><body>
    <h2 style="color:#1F5C99;">PrevioMet</h2>
    <p>Cliquez ci-dessous pour réinitialiser votre mot de passe (valable 30 min) :</p>
    <a href="{reset_link}" style="background:#1F5C99;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
       Réinitialiser mon mot de passe</a>
    <p style="color:gray;font-size:12px;margin-top:20px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    </body></html>""", "html"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            s.sendmail(settings.GMAIL_USER, to_email, msg.as_string())
    except Exception as e:
        print(f"⚠️ Erreur email : {e}\nLien de secours : {reset_link}")

# ─── ROUTEUR ─────────────────────────────────────────────────────
router = APIRouter(prefix="/auth", tags=["Authentification"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(400, "Nom d'utilisateur déjà pris")
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(400, "Email déjà utilisé")
    if user_data.role not in ["agriculteur", "logisticien"]:
        raise HTTPException(400, "Rôle invalide")

    coords    = geocode_ville(user_data.ville)  # ✅ fonction locale
    lat, lon  = (coords["lat"], coords["lon"]) if coords else (None, None)
    ville_ref = _predictor.get_nearest_ville(lat, lon) if coords else "yaounde"

    new_user = models.User(
        username=user_data.username, email=user_data.email,
        password_hash=hash_password(user_data.password),
        ville=user_data.ville, latitude=lat, longitude=lon,
        ville_reference=ville_ref, role=user_data.role,
    )
    db.add(new_user); db.flush()
    for act in user_data.activities:
        db.add(models.UserActivity(user_id=new_user.id, domaine=act.domaine,
                                   grande_categorie=act.grande_categorie, specificite=act.specificite))
    db.commit(); db.refresh(new_user)
    return schemas.UserResponse.from_orm_with_computed(new_user)

@router.post("/login", response_model=schemas.Token)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(403, "Compte désactivé")
    user.last_login = datetime.now(timezone.utc); db.commit()
    return {"access_token": create_access_token({"sub": user.username, "role": user.role}),
            "token_type": "bearer", "role": user.role, "username": user.username,
            "ville": user.ville, "ville_reference": user.ville_reference}

@router.get("/me",  response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserResponse.from_orm_with_computed(current_user)

@router.put("/me", response_model=schemas.UserResponse)
def update_me(body: schemas.UserUpdate, current_user: models.User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if body.username is not None:
        if db.query(models.User).filter(models.User.username == body.username,
                                        models.User.id != current_user.id).first():
            raise HTTPException(400, "Nom d'utilisateur déjà pris")
        current_user.username = body.username

    if body.password and body.password.strip():
        if len(body.password) < 6:
            raise HTTPException(400, "Le mot de passe doit contenir au moins 6 caractères")
        current_user.password_hash = hash_password(body.password)

    if body.ville is not None:
        current_user.ville = body.ville
        coords = geocode_ville(body.ville)  # ✅ fonction locale — plus d'AttributeError
        if coords:
            current_user.latitude        = coords["lat"]
            current_user.longitude       = coords["lon"]
            current_user.ville_reference = _predictor.get_nearest_ville(coords["lat"], coords["lon"])
        else:
            print(f"⚠️ Géocodage échoué pour '{body.ville}', ville_reference inchangée")

    if body.activities is not None:
        db.query(models.UserActivity).filter(models.UserActivity.user_id == current_user.id).delete()
        for act in body.activities:
            db.add(models.UserActivity(user_id=current_user.id, domaine=act.domaine,
                                       grande_categorie=act.grande_categorie, specificite=act.specificite))

    db.commit(); db.refresh(current_user)
    return schemas.UserResponse.from_orm_with_computed(current_user)

@router.post("/forgot-password")
def forgot_password(body: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user: return {"message": "Si cet email existe, un lien a été envoyé."}
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id, models.PasswordResetToken.used == False).delete()
    raw_token = secrets.token_urlsafe(32)
    db.add(models.PasswordResetToken(user_id=user.id, token=raw_token,
                                     expires_at=datetime.now(timezone.utc) + timedelta(minutes=30)))
    db.commit()
    send_reset_email(user.email, f"{settings.FRONTEND_URL}/reset-password?token={raw_token}")
    return {"message": "Si cet email existe, un lien a été envoyé."}

@router.post("/reset-password")
def reset_password(body: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == body.token, models.PasswordResetToken.used == False).first()
    if not record: raise HTTPException(400, "Lien invalide")
    expires = record.expires_at
    if expires.tzinfo is None: expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires: raise HTTPException(400, "Lien expiré, faites une nouvelle demande")
    record.user.password_hash = hash_password(body.new_password)
    record.used = True; db.commit()
    return {"message": "Mot de passe réinitialisé avec succès"}