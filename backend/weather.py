# backend/weather.py

import importlib.util, os, time
from fastapi import APIRouter, Depends, HTTPException, Query
from .auth import get_current_user
from . import models


def _load_module(name, rel_path):
    path = os.path.abspath(os.path.join(os.path.dirname(__file__), rel_path))
    spec = importlib.util.spec_from_file_location(name, path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

_predictor = _load_module("predictor", "../ml/predictor.py")
_villes    = _load_module("villes",    "../ml/villes.py")

router = APIRouter(prefix="/weather", tags=["Météo"])

# ─── Cache en mémoire (5 minutes par ville) ──────────────────────
# Structure : { ville_ref: {"ts": timestamp, "current": {...}, "predict": {...}} }
_CACHE: dict = {}
_CACHE_TTL   = 300   # secondes


def _cache_get(ville_ref: str, cle: str):
    """Retourne la valeur en cache si elle existe et n'a pas expiré, sinon None."""
    entree = _CACHE.get(ville_ref)
    if entree and (time.time() - entree["ts"]) < _CACHE_TTL:
        return entree.get(cle)
    return None


def _cache_set(ville_ref: str, cle: str, valeur):
    """Stocke la valeur en cache pour la ville donnée."""
    if ville_ref not in _CACHE:
        _CACHE[ville_ref] = {"ts": time.time()}
    _CACHE[ville_ref]["ts"] = time.time()
    _CACHE[ville_ref][cle]  = valeur


# ─── Résolution de ville ──────────────────────────────────────────
def _resolve_ville(user: models.User, city: str = None) -> str:
    """
    Résout la clé ville à utiliser pour les appels API.
    - Si city est fourni (admin qui change de ville) → on l'utilise directement
    - Sinon on prend ville_reference de l'utilisateur
    - Fallback : yaounde
    """
    if city:
        return city.lower().strip()
    return getattr(user, "ville_reference", None) or "yaounde"


# ─── Routes ──────────────────────────────────────────────────────
@router.get("/current")
def current_weather(
    city: str = Query(default=None),
    current_user: models.User = Depends(get_current_user)
):
    """
    Données météo actuelles depuis OpenMeteo.
    Champs retournés à plat : temperature, humidite, precipitation, vent, ville.
    Query param ?city=douala utilisé par l'admin pour changer de ville.
    Résultat mis en cache 5 minutes par ville.
    """
    try:
        ville_ref   = _resolve_ville(current_user, city)
        nom_affiche = _villes.VILLES.get(ville_ref, {}).get("affichage", current_user.ville)

        # Vérification du cache
        cached = _cache_get(ville_ref, "current")
        if cached is not None:
            return cached

        lat, lon   = _villes.get_coords(ville_ref)
        donnees, _ = _predictor.get_donnees_actuelles(lat, lon)

        resultat = {
            "ville":         nom_affiche,
            "temperature":   donnees["temperature"],
            "humidite":      donnees["humidite"],
            "precipitation": donnees["precipitation"],
            "vent":          donnees["vent"],
        }
        _cache_set(ville_ref, "current", resultat)
        return resultat

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur météo : {str(e)}")


@router.get("/predict")
def predict_weather(
    city: str = Query(default=None),
    current_user: models.User = Depends(get_current_user)
):
    """
    Prévisions XGBoost structurées pour le frontend.
    Résultat mis en cache 5 minutes par ville.

    Structure retournée :
      horaire             : [{horizon, temperature, humidite, precipitation, vent}]  H3, H6, H12
      horaire_h24         : {temperature, humidite, precipitation, vent}             H24 = demain
      jours               : [{horizon, temperature, precipitation}]                  J2→J5
      horaire_openmeteo   : [{horizon, temperature}]  H3, H6, H12 — admin seulement
      ville               : nom affiché
    """
    try:
        ville_ref   = _resolve_ville(current_user, city)
        nom_affiche = _villes.VILLES.get(ville_ref, {}).get("affichage", current_user.ville)

        # Vérification du cache
        cached = _cache_get(ville_ref, "predict")
        if cached is not None:
            return cached

        lat, lon    = _villes.get_coords(ville_ref)
        predictions = _predictor.predire(lat, lon)

        # Horizons horaires H3, H6, H12 pour le graphe du jour
        horaire = []
        for key in ["H3", "H6", "H12"]:
            d = predictions["horaires"].get(key, {})
            horaire.append({
                "horizon":       key,
                "temperature":   d.get("temperature"),
                "humidite":      d.get("humidite"),
                "precipitation": d.get("precipitation"),
                "vent":          d.get("vent"),
            })

        # H24 = demain (premier jour des prévisions futures)
        d_h24 = predictions["horaires"].get("H24", {})
        horaire_h24 = {
            "temperature":   d_h24.get("temperature"),
            "humidite":      d_h24.get("humidite"),
            "precipitation": d_h24.get("precipitation"),
            "vent":          d_h24.get("vent"),
        }

        # J2→J5 — une température par jour
        jours = []
        for key in ["J2", "J3", "J4", "J5"]:
            d = predictions["jours"].get(key, {})
            jours.append({
                "horizon":       key,
                "temperature":   d.get("temperature"),
                "precipitation": d.get("precipitation"),
            })

        # Prévisions OpenMeteo pour double courbe
        openmeteo = []
        for key in ["H3", "H6", "H12"]:
            d = predictions["previsions_openmeteo"].get(key, {})
            openmeteo.append({
                "horizon":     key,
                "temperature": d.get("temperature"),
            })

        resultat = {
            "ville":              nom_affiche,
            "horaire":            horaire,
            "horaire_h24":        horaire_h24,
            "jours":              jours,
            "horaire_openmeteo":  openmeteo,
        }
        _cache_set(ville_ref, "predict", resultat)
        return resultat

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur prédiction : {str(e)}")