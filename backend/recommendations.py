# backend/recommendations.py
from datetime import datetime
from .crop_rules import SEUILS, SEMIS

def _normalise(culture: str) -> str:
    return (culture.lower().replace(" ", "_")
            .replace("é","e").replace("è","e").replace("ê","e"))

def generer_recommandations(meteo: dict, cultures: list, horizon: str = "actuel") -> list:
    recos    = []
    date_str = datetime.now().strftime("%Y-%m-%d")
    for culture in cultures:
        for regle in SEUILS.get(_normalise(culture), []):
            try:
                if regle["condition"](meteo):
                    recos.append({
                        "date":    date_str,
                        "horizon": horizon,
                        "culture": culture,
                        "type":    regle["type"],
                        "titre":   regle["titre"],
                        "detail":  regle["detail"],
                    })
            except Exception:
                continue
    return recos

def generer_toutes_recommandations(predictions: dict, cultures: list) -> list:
    toutes = generer_recommandations(predictions["actuel"], cultures, "Actuellement")
    for horizon, meteo in predictions["horaires"].items():
        toutes += generer_recommandations(meteo, cultures, horizon.replace("H","H+"))
    for horizon, meteo in predictions["jours"].items():
        toutes += generer_recommandations(meteo, cultures, horizon.replace("J","J+"))
    return toutes

def get_semis_conditions(cultures: list) -> dict:
    """Retourne {culture_originale: bool_semis_possible} selon SEMIS de crop_rules."""
    return {c: _normalise(c) in SEMIS for c in cultures}