# backend/weather.py

import importlib.util
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .auth import get_current_user
from . import models

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

router = APIRouter(prefix="/weather", tags=["Météo"])

@router.get("/current")
def current_weather(current_user: models.User = Depends(get_current_user)):
    try:
        # ← ville_reference (clé ex:"douala") au lieu de ville (nom libre)
        ville_ref = current_user.ville_reference or "yaounde"
        lat, lon  = _villes.get_coords(ville_ref)
        donnees   = _predictor.get_donnees_actuelles(lat, lon)
        return {
            "ville": current_user.ville,   # nom affiché à l'utilisateur
            "data": {
                "temperature":   donnees["temperature"],
                "humidite":      donnees["humidite"],
                "precipitation": donnees["precipitation"],
                "vent":          donnees["vent"],
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur météo : {str(e)}")


@router.get("/predict")
def predict_weather(current_user: models.User = Depends(get_current_user)):
    try:
        # ← ville_reference au lieu de ville
        ville_ref   = current_user.ville_reference or "yaounde"
        lat, lon    = _villes.get_coords(ville_ref)
        predictions = _predictor.predire(lat, lon)
        return {
            "ville":       current_user.ville,   # nom affiché
            "predictions": predictions
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur prédiction : {str(e)}")