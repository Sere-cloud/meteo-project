from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .config import settings
from .auth import hash_password, router as auth_router
from .weather import router as weather_router
from .recommendations_router import router as reco_router
from .admin import router as admin_router
from . import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Météo Cameroun",
    description="Système de prévision météorologique locale par ML",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://loquacious-dasik-e7e2ed.netlify.app",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_default_admin():
    db: Session = SessionLocal()
    try:
        existing = db.query(models.User).filter(
            models.User.username == settings.ADMIN_USERNAME
        ).first()
        if not existing:
            admin = models.User(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                ville="Yaoundé",
                role="admin",
            )
            db.add(admin)
            db.commit()
            print("✅ Admin créé automatiquement")
        else:
            print("ℹ️  Admin déjà existant")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    create_default_admin()

app.include_router(auth_router)
app.include_router(weather_router)
app.include_router(reco_router)
app.include_router(admin_router)

@app.get("/")
def root():
    return {"message": "API Météo Cameroun opérationnelle", "version": "1.0.0"}