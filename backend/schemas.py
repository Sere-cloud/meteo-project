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
    ville:      str
    role:       str
    activities: List[ActivityItem]


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class UserUpdate(BaseModel):
    username:    Optional[str]            = None
    password:    Optional[str]            = None
    ville:       Optional[str]            = None
    activities:  Optional[List[ActivityItem]] = None


class UserResponse(BaseModel):
    id:              int
    username:        str
    email:           str
    ville:           str
    ville_reference: Optional[str]   = None
    latitude:        Optional[float] = None
    longitude:       Optional[float] = None
    role:            str
    is_active:       bool
    created_at:      datetime
    last_login:      Optional[datetime] = None
    activities:      List[ActivityItem] = []

    # Champs calculés depuis activities — lus directement par ProfileTab
    categories:  List[str] = []
    specificites: List[str] = []

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_computed(cls, user):
        """
        Construit une UserResponse en ajoutant les champs calculés
        categories et specificites à partir des activities du user.
        """
        cats  = []
        specs = []
        for act in (user.activities or []):
            if act.grande_categorie and act.grande_categorie not in cats:
                cats.append(act.grande_categorie)
            if act.specificite and act.specificite not in specs:
                specs.append(act.specificite)

        data = {
            "id":              user.id,
            "username":        user.username,
            "email":           user.email,
            "ville":           user.ville,
            "ville_reference": user.ville_reference,
            "latitude":        user.latitude,
            "longitude":       user.longitude,
            "role":            user.role,
            "is_active":       user.is_active,
            "created_at":      user.created_at,
            "last_login":      user.last_login,
            "activities":      [
                ActivityItem(
                    domaine=a.domaine,
                    grande_categorie=a.grande_categorie,
                    specificite=a.specificite,
                ) for a in (user.activities or [])
            ],
            "categories":    cats,
            "specificites":  specs,
        }
        return cls(**data)


class Token(BaseModel):
    access_token:    str
    token_type:      str
    role:            str
    username:        str
    ville:           str
    ville_reference: Optional[str] = None


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
    username: str

    class Config:
        from_attributes = True