# ml/collect_data.py

import requests
import pandas as pd
from datetime import date, timedelta
from pathlib import Path
from villes import VILLES  # import depuis villes.py dans le même dossier ml/

end_date = str(date.today() - timedelta(days=1))

for nom, coords in VILLES.items():
    fichier = Path(f"data/{nom}_raw.csv")

    if fichier.exists():
        df_existant = pd.read_csv(fichier)
        derniere_date = df_existant["time"].max()[:10]
        start_date = str(date.fromisoformat(derniere_date) + timedelta(days=1))
        print(f"{nom} — mise à jour depuis {start_date}...")
    else:
        start_date = "2022-01-01"
        df_existant = None
        print(f"{nom} — premier téléchargement depuis {start_date}...")

    if start_date > end_date:
        print(f"  {nom} — Déjà à jour.")
        continue

    params = {
        "latitude":  coords["lat"],
        "longitude": coords["lon"],
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,soil_moisture_0_1cm",
        "start_date": start_date,
        "end_date":   end_date,
        "timezone":   "Africa/Douala"
    }

    try:
        response = requests.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params=params,
            timeout=30
        )
        response.raise_for_status()
        df_nouveau = pd.DataFrame(response.json()["hourly"])

        if df_existant is not None:
            df_final = pd.concat([df_existant, df_nouveau], ignore_index=True)
        else:
            df_final = df_nouveau

        df_final.to_csv(fichier, index=False)
        print(f"  OK — {len(df_nouveau)} nouvelles lignes. Total : {len(df_final)} lignes.")

    except Exception as e:
        print(f"  ERREUR pour {nom} : {e}")

print(f"\nTerminé. Données jusqu'au : {end_date}")