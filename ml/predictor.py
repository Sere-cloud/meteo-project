# ml/predictor.py

import joblib
import numpy as np
import pandas as pd
import os, math, requests, time
from datetime import datetime, timedelta

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dossier_models = os.path.join(BASE_DIR, "models")

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

# ─── Villes référence ────────────────────────────────────────────
import importlib.util as _ilu
_villes_path = os.path.join(os.path.dirname(__file__), "villes.py")
_villes_spec = _ilu.spec_from_file_location("villes", _villes_path)
_villes_mod  = _ilu.module_from_spec(_villes_spec)
_villes_spec.loader.exec_module(_villes_mod)
VILLES_REFERENCE = _villes_mod.VILLES

# ─── Cache en mémoire ────────────────────────────────────────────
# Clé : (lat, lon) → {timestamp, actuel, previsions_openmeteo}
# Durée de validité : 10 minutes — évite les appels répétés et
# absorbe les échecs réseau au démarrage
_CACHE_TTL = 600  # secondes
_cache: dict = {}


def _haversine(lat1, lon1, lat2, lon2):
    R    = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a    = (math.sin(dlat/2)**2 +
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
            math.sin(dlon/2)**2)
    return R * 2 * math.asin(math.sqrt(a))


def get_nearest_ville(lat, lon):
    nearest  = min(VILLES_REFERENCE.items(),
                   key=lambda item: _haversine(lat, lon, item[1]["lat"], item[1]["lon"]))
    distance = _haversine(lat, lon, nearest[1]["lat"], nearest[1]["lon"])
    print(f"📍 Ville référence : {nearest[1]['affichage']} ({distance:.1f} km)")
    return nearest[0]


def _get_saison(mois):
    return {12:0,1:0,2:0, 3:1,4:1,5:1, 6:2,7:2,8:2, 9:3,10:3,11:3}[mois]


# ─── Appel HTTP avec retry ────────────────────────────────────────
def _get_openmeteo(params, tentatives=3, delai=2):
    url = "https://api.open-meteo.com/v1/forecast"
    derniere_erreur = None
    for i in range(tentatives):
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            derniere_erreur = e
            print(f"⚠️  Open-Meteo tentative {i+1}/{tentatives} échouée : {e}")
            if i < tentatives - 1:
                time.sleep(delai)
        except requests.exceptions.HTTPError as e:
            raise e
    raise ConnectionError(
        f"Open-Meteo inaccessible après {tentatives} tentatives : {derniere_erreur}"
    )


# ─── Données actuelles + prévisions OpenMeteo (avec cache) ───────
def get_donnees_actuelles(lat, lon):
    """
    Récupère les données météo actuelles ET les prévisions OpenMeteo.
    Les résultats sont mis en cache 10 minutes par coordonnées.
    Si OpenMeteo est inaccessible et qu'un cache existe (même expiré),
    on l'utilise plutôt que de lever une erreur.
    """
    cle_cache = (round(lat, 4), round(lon, 4))
    maintenant = time.time()

    # Cache valide → retour immédiat
    if cle_cache in _cache:
        entree = _cache[cle_cache]
        age    = maintenant - entree["timestamp"]
        if age < _CACHE_TTL:
            print(f"📦 Cache utilisé pour {cle_cache} (âge : {int(age)}s)")
            return entree["actuel"], entree["previsions_openmeteo"]

    # Tentative d'appel OpenMeteo
    now          = datetime.utcnow()
    today_str    = now.strftime("%Y-%m-%d")
    tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    params = {
        "latitude":   lat,
        "longitude":  lon,
        "hourly":     "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        "start_date": today_str,
        "end_date":   tomorrow_str,
        "timezone":   "Africa/Douala",
    }

    try:
        data = _get_openmeteo(params)["hourly"]
    except ConnectionError as e:
        # OpenMeteo inaccessible — utiliser le cache expiré s'il existe
        if cle_cache in _cache:
            entree = _cache[cle_cache]
            print(f"⚠️  OpenMeteo inaccessible, cache expiré utilisé pour {cle_cache}")
            return entree["actuel"], entree["previsions_openmeteo"]
        # Aucun cache disponible → erreur remontée au backend
        raise e

    h = now.hour

    actuel = {
        "temperature":   round(data["temperature_2m"][h],       1),
        "humidite":      round(data["relative_humidity_2m"][h],  1),
        "precipitation": round(data["precipitation"][h],         2),
        "vent":          round(data["wind_speed_10m"][h],        1),
        "heure":         h % 24,
        "mois":          now.month,
        "saison":        _get_saison(now.month),
    }

    idx_h3  = h + 3
    idx_h6  = idx_h3 + 6
    idx_h12 = idx_h6 + 12

    def _safe(lst, idx):
        return round(lst[idx], 1) if idx < len(lst) else None

    previsions_openmeteo = {
        "H3": {
            "temperature":   _safe(data["temperature_2m"],      idx_h3),
            "humidite":      _safe(data["relative_humidity_2m"], idx_h3),
            "precipitation": _safe(data["precipitation"],        idx_h3),
            "vent":          _safe(data["wind_speed_10m"],       idx_h3),
        },
        "H6": {
            "temperature":   _safe(data["temperature_2m"],      idx_h6),
            "humidite":      _safe(data["relative_humidity_2m"], idx_h6),
            "precipitation": _safe(data["precipitation"],        idx_h6),
            "vent":          _safe(data["wind_speed_10m"],       idx_h6),
        },
        "H12": {
            "temperature":   _safe(data["temperature_2m"],      idx_h12),
            "humidite":      _safe(data["relative_humidity_2m"], idx_h12),
            "precipitation": _safe(data["precipitation"],        idx_h12),
            "vent":          _safe(data["wind_speed_10m"],       idx_h12),
        },
    }

    # Mise en cache
    _cache[cle_cache] = {
        "timestamp":            maintenant,
        "actuel":               actuel,
        "previsions_openmeteo": previsions_openmeteo,
    }
    print(f"✅ Cache mis à jour pour {cle_cache}")

    return actuel, previsions_openmeteo


# ─── Construction des vecteurs de features ───────────────────────
def _build_features_horaires(donnees):
    h    = donnees["heure"]
    mois = donnees["mois"]
    return pd.DataFrame([{
        "temperature":   donnees["temperature"],
        "humidite":      donnees["humidite"],
        "precipitation": donnees["precipitation"],
        "vent":          donnees["vent"],
        "heure_sin":     np.sin(2 * np.pi * h / 24),
        "heure_cos":     np.cos(2 * np.pi * h / 24),
        "mois_sin":      np.sin(2 * np.pi * (mois - 1) / 12),
        "mois_cos":      np.cos(2 * np.pi * (mois - 1) / 12),
        "saison":        donnees["saison"],
    }])


def _build_features_jours(donnees):
    mois = donnees["mois"]
    return pd.DataFrame([{
        "temperature":   donnees["temperature"],
        "humidite":      donnees["humidite"],
        "precipitation": donnees["precipitation"],
        "vent":          donnees["vent"],
        "mois_sin":      np.sin(2 * np.pi * (mois - 1) / 12),
        "mois_cos":      np.cos(2 * np.pi * (mois - 1) / 12),
        "saison":        donnees["saison"],
    }])


# ─── Prédiction principale ───────────────────────────────────────
def predire(lat, lon):
    """
    Retourne les prédictions XGBoost + les prévisions OpenMeteo.

    Structure :
      actuel              : données météo actuelles
      horaires            : {H3, H6, H12, H24}
      jours               : {J2, J3, J4, J5}
      previsions_openmeteo: {H3, H6, H12}
    """
    donnees, previsions_openmeteo = get_donnees_actuelles(lat, lon)

    X_horaire = _build_features_horaires(donnees)
    X_jour    = _build_features_jours(donnees)

    resultats = {
        "actuel": {
            "temperature":   donnees["temperature"],
            "humidite":      donnees["humidite"],
            "precipitation": donnees["precipitation"],
            "vent":          donnees["vent"],
        },
        "horaires":             {},
        "jours":                {},
        "previsions_openmeteo": previsions_openmeteo,
    }

    for horizon in HORIZONS_HORAIRES:
        preds = {c: round(float(modeles[horizon][c].predict(X_horaire)[0]), 1)
                 for c in CIBLES}
        resultats["horaires"][horizon] = preds

    for horizon in HORIZONS_JOURS:
        preds = {c: round(float(modeles[horizon][c].predict(X_jour)[0]), 1)
                 for c in CIBLES}
        resultats["jours"][horizon] = preds

    return resultats