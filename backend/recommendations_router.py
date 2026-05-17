# backend/recommendations_router.py

import importlib.util
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .auth import get_current_user
from . import models, schemas
from .recommendations import generer_toutes_recommandations

def _load_predictor():
    path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', 'ml', 'predictor.py')
    )
    spec = importlib.util.spec_from_file_location("predictor", path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def _load_villes():
    path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', 'ml', 'villes.py')
    )
    spec = importlib.util.spec_from_file_location("villes", path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

_predictor = _load_predictor()
_villes    = _load_villes()

router = APIRouter(prefix="/recommendations", tags=["Recommandations"])


def _extraire_cultures(activities: list) -> list:
    cultures = []
    for a in activities:
        valeur = a.specificite if a.specificite else a.grande_categorie
        if valeur not in cultures:
            cultures.append(valeur)
    return cultures


@router.get("/")
def get_recommendations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        activities = db.query(models.UserActivity).filter(
            models.UserActivity.user_id == current_user.id
        ).all()

        if not activities:
            return {"ville": current_user.ville, "recommendations": []}

        cultures = _extraire_cultures(activities)

        # ← ville_reference au lieu de ville
        ville_ref = current_user.ville_reference or "yaounde"
        lat, lon  = _villes.get_coords(ville_ref)

        predictions     = _predictor.predire(lat, lon)
        recommandations = generer_toutes_recommandations(predictions, cultures)

        for reco in recommandations:
            db.add(models.RecommendationLog(
                user_id=current_user.id,
                titre=reco["titre"],
                detail=reco["detail"],
                type=reco["type"],
                culture=reco.get("culture"),
                horizon=reco.get("horizon"),
            ))
        db.commit()

        return {
            "ville":           current_user.ville,   # nom affiché
            "recommendations": recommandations
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur : {str(e)}")


@router.get("/history", response_model=list[schemas.RecommendationLogResponse])
def get_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(models.RecommendationLog).filter(
        models.RecommendationLog.user_id == current_user.id
    ).order_by(models.RecommendationLog.date.desc()).limit(50).all()
    return logs