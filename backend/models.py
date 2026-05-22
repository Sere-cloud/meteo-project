# backend/models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String,  unique=True, nullable=False, index=True)
    email           = Column(String,  unique=True, nullable=False, index=True)
    password_hash   = Column(String,  nullable=False)
    ville           = Column(String,  nullable=False)
    latitude        = Column(Float,   nullable=True)
    longitude       = Column(Float,   nullable=True)
    ville_reference = Column(String,  nullable=True)
    role            = Column(String,  nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    # ✅ Nouveau champ — null tant que l'utilisateur ne s'est pas reconnecté
    last_login      = Column(DateTime(timezone=True), nullable=True, default=None)

    activities      = relationship("UserActivity",       back_populates="user", cascade="all, delete")
    recommendations = relationship("RecommendationLog",  back_populates="user", cascade="all, delete")
    reset_tokens    = relationship("PasswordResetToken", back_populates="user", cascade="all, delete")


class UserActivity(Base):
    __tablename__ = "user_activities"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    domaine          = Column(String,  nullable=False)
    grande_categorie = Column(String,  nullable=False)
    specificite      = Column(String,  nullable=True)

    user = relationship("User", back_populates="activities")


class RecommendationLog(Base):
    __tablename__ = "recommendations_log"

    id      = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date    = Column(DateTime(timezone=True), server_default=func.now())
    titre   = Column(String,  nullable=False)
    detail  = Column(Text,    nullable=False)
    type    = Column(String,  nullable=False)
    culture = Column(String,  nullable=True)
    horizon = Column(String,  nullable=True)

    user = relationship("User", back_populates="recommendations")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token      = Column(String,  unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used       = Column(Boolean, default=False)

    user = relationship("User", back_populates="reset_tokens")