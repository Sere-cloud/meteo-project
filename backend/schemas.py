# backend/schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class ActivityItem(BaseModel):
    domaine:          str
    grande_categorie: str
    specificite:      Optional[str] = None


class UserCreate(BaseModel):
    username:   str
    email:      EmailStr
    password:   str
    ville:      str        # nom libre saisi par l'utilisateur
    role:       str
    activities: List[ActivityItem]


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class UserResponse(BaseModel):
    id:              int
    username:        str
    email:           str
    ville:           str
    ville_reference: Optional[str] = None   # ← ajouté
    latitude:        Optional[float] = None  # ← ajouté
    longitude:       Optional[float] = None  # ← ajouté
    role:            str
    is_active:       bool
    created_at:      datetime
    activities:      List[ActivityItem] = []

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token:    str
    token_type:      str
    role:            str
    username:        str
    ville:           str
    ville_reference: Optional[str] = None   # ← ajouté


class RecommendationLogCreate(BaseModel):
    titre:   str
    detail:  str
    type:    str
    culture: Optional[str] = None
    horizon: Optional[str] = None


class RecommendationLogResponse(BaseModel):
    id:      int
    titre:   str
    detail:  str
    type:    str
    culture: Optional[str]
    horizon: Optional[str]
    date:    datetime

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:        str
    new_password: str

class LogAdminResponse(BaseModel):
    id:       int
    date:     datetime
    titre:    str
    detail:   str
    type:     str
    culture:  Optional[str] = None
    horizon:  Optional[str] = None
    username: str            # ← nom de l'utilisateur joint depuis la table User

    class Config:
        from_attributes = True