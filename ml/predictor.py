# ml/predictor.py

import joblib
import numpy as np
import os
import math
import requests
from datetime import datetime

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dossier_models = os.path.join(BASE_DIR, "models")

# ─── 1. Chargement du scaler et des modèles ──────────────────────
scaler = joblib.load(os.path.join(dossier_models, "scaler.pkl"))

CIBLES            = ["temperature", "humidite", "precipitation", "vent"]
HORIZONS_HORAIRES = ["H3", "H6", "H12", "H24"]
HORIZONS_JOURS    = ["J2", "J3", "J4", "J5"]

modeles = {}
for horizon in HORIZONS_HORAIRES + HORIZONS_JOURS:
    modeles[horizon] = {}
    for cible in CIBLES:
        chemin = os.path.join(dossier_models, f"xgb_{cible}_{horizon}.pkl")
        modeles[horizon][cible] = joblib.load(chemin)

print("✅ Tous les modèles sont chargés.")

# ─── 2. Villes référence et géolocalisation ──────────────────────

# Chargement de villes.py pour accéder aux coordonnées des villes référence
import importlib.util as _ilu
_villes_path = os.path.join(os.path.dirname(__file__), "villes.py")
_villes_spec = _ilu.spec_from_file_location("villes", _villes_path)
_villes_mod  = _ilu.module_from_spec(_villes_spec)
_villes_spec.loader.exec_module(_villes_mod)
VILLES_REFERENCE = _villes_mod.VILLES


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcule la distance en km entre deux points GPS."""
    R    = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a    = (math.sin(dlat / 2) ** 2 +
            math.cos(math.radians(lat1)) *
            math.cos(math.radians(lat2)) *
            math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def geocode_ville(nom_ville: str) -> dict:
    """
    Convertit un nom de ville en coordonnées GPS via Nominatim (OpenStreetMap).
    Retourne {"lat": float, "lon": float} ou None si échec.
    """
    try:
        url     = "https://nominatim.openstreetmap.org/search"
        params  = {"q": f"{nom_ville}, Cameroun", "format": "json", "limit": 1}
        headers = {"User-Agent": "MeteoAppCameroun/1.0"}
        resp    = requests.get(url, params=params, headers=headers, timeout=5)
        data    = resp.json()
        if data:
            return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
        return None
    except Exception as e:
        print(f"⚠️ Géocodage échoué pour '{nom_ville}': {e}")
        return None


def get_nearest_ville(lat: float, lon: float) -> str:
    """
    Retourne le nom clé (ex: 'douala') de la ville référence
    la plus proche des coordonnées données.
    Ce nom clé est compatible avec villes.py get_coords().
    """
    nearest  = min(
        VILLES_REFERENCE.items(),
        key=lambda item: _haversine(lat, lon, item[1]["lat"], item[1]["lon"])
    )
    distance = _haversine(lat, lon, nearest[1]["lat"], nearest[1]["lon"])
    print(f"📍 Ville référence : {nearest[1]['affichage']} ({distance:.1f} km)")
    return nearest[0]  # retourne la clé ex: "douala"


# ─── 3. Récupération des données actuelles via OpenMeteo ─────────
def get_donnees_actuelles(lat: float, lon: float) -> dict:
    now      = datetime.utcnow()
    date_str = now.strftime("%Y-%m-%d")
    params   = {
        "latitude":   lat,
        "longitude":  lon,
        "hourly":     "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        "start_date": date_str,
        "end_date":   date_str,
        "timezone":   "Africa/Douala"
    }
    response      = requests.get("https://api.open-meteo.com/v1/forecast", params=params)
    data          = response.json()["hourly"]
    heure_actuelle= now.hour

    return {
        "temperature":   data["temperature_2m"][heure_actuelle],
        "humidite":      data["relative_humidity_2m"][heure_actuelle],
        "precipitation": data["precipitation"][heure_actuelle],
        "vent":          data["wind_speed_10m"][heure_actuelle],
        "heure":         heure_actuelle,
        "mois":          now.month,
        "saison":        _get_saison(now.month)
    }


def _get_saison(mois: int) -> int:
    return {12:0,1:0,2:0, 3:1,4:1,5:1, 6:2,7:2,8:2, 9:3,10:3,11:3}[mois]


# ─── 4. Normalisation ────────────────────────────────────────────
def _normaliser(donnees: dict) -> np.ndarray:
    valeurs_brutes = np.array([[
        donnees["temperature"],
        donnees["humidite"],
        donnees["precipitation"],
        donnees["vent"],
        0
    ]])
    valeurs_norm = scaler.transform(valeurs_brutes)[0]
    return np.array([[
        valeurs_norm[0],
        valeurs_norm[1],
        valeurs_norm[2],
        valeurs_norm[3],
        donnees["heure"],
        donnees["mois"],
        donnees["saison"]
    ]])


# ─── 5. Dénormalisation ──────────────────────────────────────────
def _denormaliser(predictions_norm: dict) -> dict:
    valeurs = np.array([[
        predictions_norm["temperature"],
        predictions_norm["humidite"],
        predictions_norm["precipitation"],
        predictions_norm["vent"],
        0
    ]])
    valeurs_reelles = scaler.inverse_transform(valeurs)[0]
    return {
        "temperature":   round(float(valeurs_reelles[0]), 1),
        "humidite":      round(float(valeurs_reelles[1]), 1),
        "precipitation": round(float(valeurs_reelles[2]), 2),
        "vent":          round(float(valeurs_reelles[3]), 1),
    }


# ─── 6. Fonction principale de prédiction ────────────────────────
def predire(lat: float, lon: float) -> dict:
    donnees = get_donnees_actuelles(lat, lon)
    X       = _normaliser(donnees)

    resultats = {}

    resultats["horaires"] = {}
    for horizon in HORIZONS_HORAIRES:
        preds_norm = {c: float(modeles[horizon][c].predict(X)[0]) for c in CIBLES}
        resultats["horaires"][horizon] = _denormaliser(preds_norm)

    X_jour = np.array([[X[0][0], X[0][1], X[0][2], X[0][3]]])
    resultats["jours"] = {}
    for horizon in HORIZONS_JOURS:
        preds_norm = {c: float(modeles[horizon][c].predict(X_jour)[0]) for c in CIBLES}
        resultats["jours"][horizon] = _denormaliser(preds_norm)

    resultats["actuel"] = {
        "temperature":   round(donnees["temperature"], 1),
        "humidite":      round(donnees["humidite"], 1),
        "precipitation": round(donnees["precipitation"], 2),
        "vent":          round(donnees["vent"], 1),
    }

    return resultats