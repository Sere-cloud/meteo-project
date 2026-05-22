# backend/recommendations_router.py
import importlib.util, os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .auth import get_current_user
from . import models, schemas
from .recommendations import generer_toutes_recommandations, get_semis_conditions
from .crop_rules import SEMIS

def _load(name, rel):
    path = os.path.abspath(os.path.join(os.path.dirname(__file__), rel))
    spec = importlib.util.spec_from_file_location(name, path)
    mod  = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod

_predictor = _load("predictor", "../ml/predictor.py")
_villes    = _load("villes",    "../ml/villes.py")

router = APIRouter(prefix="/recommendations", tags=["Recommandations"])

HORIZON_ORDER = {"Actuellement":0,"H+3":1,"H+6":2,"H+12":3,"H+24":4,"J+2":5,"J+3":6,"J+4":7,"J+5":8}
TYPE_ORDER    = {"danger":0,"warning":1,"success":2}

def _extraire_cultures(activities):
    seen, result = set(), []
    for a in activities:
        v = a.specificite or a.grande_categorie
        if v not in seen: seen.add(v); result.append(v)
    return result

def _dedupliquer(recos):
    seen, result = {}, []
    for r in sorted(recos, key=lambda r: HORIZON_ORDER.get(r.get("horizon",""), 99)):
        k = (r.get("culture",""), r.get("titre",""))
        if k not in seen: seen[k] = True; result.append(r)
    return result

def _trier(recos):
    return sorted(recos, key=lambda r: (
        TYPE_ORDER.get(r.get("type","success"), 2),
        HORIZON_ORDER.get(r.get("horizon",""), 99),
    ))

def _get_user_data(current_user, db):
    activities = db.query(models.UserActivity).filter(
        models.UserActivity.user_id == current_user.id
    ).all()
    cultures  = _extraire_cultures(activities)
    ville_ref = current_user.ville_reference or "yaounde"
    lat, lon  = _villes.get_coords(ville_ref)
    return cultures, lat, lon

@router.get("/")
def get_recommendations(current_user: models.User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    try:
        cultures, lat, lon = _get_user_data(current_user, db)
        if not cultures:
            return {"ville": current_user.ville, "recommendations": []}
        predictions   = _predictor.predire(lat, lon)
        recos_brutes  = generer_toutes_recommandations(predictions, cultures)
        return {
            "ville":           current_user.ville,
            "recommendations": _trier(_dedupliquer(recos_brutes)),
        }
    except ValueError as e: raise HTTPException(400, str(e))
    except Exception  as e: raise HTTPException(500, f"Erreur : {e}")

@router.get("/semis")
def get_semis(current_user: models.User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    """
    Retourne pour chaque culture de l'utilisateur si les conditions de semis
    sont définies, et les seuils météo correspondants (t_min/t_max/p_min…).
    Utilisé par CalendarTab pour évaluer les jours de semis côté frontend.
    """
    try:
        cultures, lat, lon = _get_user_data(current_user, db)
        result = {}
        for culture in cultures:
            key = culture.lower().replace(" ","_").replace("é","e").replace("è","e").replace("ê","e")
            result[culture] = {"semis_defini": key in SEMIS}
        return {"cultures_semis": result}
    except ValueError as e: raise HTTPException(400, str(e))
    except Exception  as e: raise HTTPException(500, f"Erreur : {e}")

@router.delete("/all")
def delete_all(current_user: models.User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    db.query(models.RecommendationLog).filter(
        models.RecommendationLog.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Toutes les recommandations supprimées"}

@router.delete("/{reco_id}")
def delete_one(reco_id: int, current_user: models.User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    reco = db.query(models.RecommendationLog).filter(
        models.RecommendationLog.id == reco_id,
        models.RecommendationLog.user_id == current_user.id).first()
    if not reco: raise HTTPException(404, "Recommandation introuvable")
    db.delete(reco); db.commit()
    return {"message": "Recommandation supprimée"}

@router.get("/history", response_model=list[schemas.RecommendationLogResponse])
def get_history(current_user: models.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    return db.query(models.RecommendationLog).filter(
        models.RecommendationLog.user_id == current_user.id
    ).order_by(models.RecommendationLog.date.desc()).limit(50).all()