# backend/auth.py

from datetime import datetime, timedelta, timezone
from typing import Optional
import importlib.util
import secrets
import smtplib
import os
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

# ─── Chargement predictor pour géocodage ─────────────────────────
def _load_predictor():
    path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', 'ml', 'predictor.py')
    )
    spec = importlib.util.spec_from_file_location("predictor", path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

_predictor = _load_predictor()

# ─── MOT DE PASSE ────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ─── JWT ─────────────────────────────────────────────────────────
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire    = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

# ─── UTILISATEUR COURANT ─────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(credentials.credentials)
    if not payload:
        raise exc
    username: str = payload.get("sub")
    if not username:
        raise exc
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not user.is_active:
        raise exc
    return user

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    return current_user

# ─── EMAIL ───────────────────────────────────────────────────────
def send_reset_email(to_email: str, reset_link: str):
    if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
        print("\n" + "="*60)
        print("📧 MODE DEV — Lien de réinitialisation :")
        print(reset_link)
        print("="*60 + "\n")
        return

    msg            = MIMEMultipart("alternative")
    msg["Subject"] = "Réinitialisation de votre mot de passe — Météo Cameroun"
    msg["From"]    = settings.GMAIL_USER
    msg["To"]      = to_email
    html = f"""
    <html><body>
    <h2 style="color:#1F5C99;">Météo Cameroun</h2>
    <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
    <p>Cliquez sur le bouton ci-dessous (valable 30 minutes) :</p>
    <a href="{reset_link}"
       style="background:#1F5C99;color:white;padding:12px 24px;
              border-radius:6px;text-decoration:none;display:inline-block;">
       Réinitialiser mon mot de passe
    </a>
    <p style="color:gray;font-size:12px;margin-top:20px;">
       Si vous n'avez pas fait cette demande, ignorez cet email.
    </p>
    </body></html>
    """
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.sendmail(settings.GMAIL_USER, to_email, msg.as_string())
    except Exception as e:
        print(f"⚠️ Erreur envoi email : {e}")
        print(f"Lien de secours : {reset_link}")

# ─── ROUTEUR ─────────────────────────────────────────────────────
router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà pris")
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    if user_data.role not in ["agriculteur", "logisticien"]:
        raise HTTPException(status_code=400, detail="Rôle invalide")

    # ── Géocodage : nom de ville → coordonnées GPS ───────────────
    coords = _predictor.geocode_ville(user_data.ville)
    if coords:
        lat       = coords["lat"]
        lon       = coords["lon"]
        ville_ref = _predictor.get_nearest_ville(lat, lon)  # clé ex: "douala"
    else:
        # Fallback : si géocodage échoue → Yaoundé par défaut
        lat, lon  = None, None
        ville_ref = "yaounde"
        print(f"⚠️ Géocodage échoué pour '{user_data.ville}', fallback yaounde")

    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        ville=user_data.ville,          # nom original conservé pour affichage
        latitude=lat,
        longitude=lon,
        ville_reference=ville_ref,      # clé compatible avec villes.py
        role=user_data.role,
    )
    db.add(new_user)
    db.flush()

    for act in user_data.activities:
        db.add(models.UserActivity(
            user_id=new_user.id,
            domaine=act.domaine,
            grande_categorie=act.grande_categorie,
            specificite=act.specificite,
        ))

    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.Token)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "access_token":    token,
        "token_type":      "bearer",
        "role":            user.role,
        "username":        user.username,
        "ville":           user.ville,
        "ville_reference": user.ville_reference,
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(body: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user:
        return {"message": "Si cet email existe, un lien a été envoyé."}

    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used    == False
    ).delete()

    raw_token = secrets.token_urlsafe(32)
    expires   = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.add(models.PasswordResetToken(
        user_id=user.id, token=raw_token, expires_at=expires,
    ))
    db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    send_reset_email(user.email, reset_link)
    return {"message": "Si cet email existe, un lien a été envoyé."}


@router.post("/reset-password")
def reset_password(body: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == body.token,
        models.PasswordResetToken.used  == False,
    ).first()
    if not record:
        raise HTTPException(status_code=400, detail="Lien invalide")

    now     = datetime.now(timezone.utc)
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        raise HTTPException(status_code=400, detail="Lien expiré, faites une nouvelle demande")

    record.user.password_hash = hash_password(body.new_password)
    record.used               = True
    db.commit()
    return {"message": "Mot de passe réinitialisé avec succès"}