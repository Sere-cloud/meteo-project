# ml/villes.py

VILLES = {
    "douala":      {"lat": 4.0511,  "lon": 9.7679,  "affichage": "Douala"},
    "yaounde":     {"lat": 3.8480,  "lon": 11.5021, "affichage": "Yaoundé"},
    "bafoussam":   {"lat": 5.4764,  "lon": 10.4176, "affichage": "Bafoussam"},
    "garoua":      {"lat": 9.3017,  "lon": 13.3921, "affichage": "Garoua"},
    "bamenda":     {"lat": 5.9527,  "lon": 10.1463, "affichage": "Bamenda"},
    "ngaoundere":  {"lat": 7.3167,  "lon": 13.5833, "affichage": "Ngaoundéré"},
    "bertoua":     {"lat": 4.5833,  "lon": 13.6833, "affichage": "Bertoua"},
    "ebolowa":     {"lat": 2.9000,  "lon": 11.1500, "affichage": "Ebolowa"},
    "buea":        {"lat": 4.1527,  "lon": 9.2408,  "affichage": "Buea"},
    "maroua":      {"lat": 10.5900, "lon": 14.3200, "affichage": "Maroua"},
}

def get_coords(ville: str):
    """
    Retourne (lat, lon) pour une ville donnée.
    Accepte le nom avec ou sans accents, en minuscules ou majuscules.
    Lève une ValueError si la ville n'est pas trouvée.
    """
    cle = ville.lower().strip() \
        .replace("é", "e").replace("è", "e").replace("ê", "e") \
        .replace("à", "a").replace("â", "a")
    if cle not in VILLES:
        raise ValueError(f"Ville inconnue : {ville}. Villes disponibles : {list(VILLES.keys())}")
    coords = VILLES[cle]
    return coords["lat"], coords["lon"]

def get_noms_affichage() -> list:
    """Retourne la liste des noms de villes pour l'affichage frontend."""
    return [v["affichage"] for v in VILLES.values()]