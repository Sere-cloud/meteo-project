# ml/preprocess.py

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import os, joblib

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dossier_data   = os.path.join(BASE_DIR, "data")
dossier_models = os.path.join(BASE_DIR, "models")

fichiers = [f for f in os.listdir(dossier_data) if f.endswith("_raw.csv")]
print(f"{len(fichiers)} fichiers trouvés")

tous_les_df = []

for fichier in fichiers:
    ville = fichier.replace("_raw.csv", "")
    df    = pd.read_csv(os.path.join(dossier_data, fichier))

    # Interpolation des valeurs manquantes (humidite_sol exclue — supprimée)
    cols_num = ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m"]
    df[cols_num] = df[cols_num].interpolate(method="linear")

    # Renommage
    df = df.rename(columns={
        "time":                 "datetime",
        "temperature_2m":       "temperature",
        "relative_humidity_2m": "humidite",
        "wind_speed_10m":       "vent",
    })

    # Suppression humidite_sol si présente
    if "soil_moisture_0_1cm" in df.columns:
        df = df.drop(columns=["soil_moisture_0_1cm"])

    # Features temporelles
    df["datetime"] = pd.to_datetime(df["datetime"])
    df["jour"]     = (df["datetime"] - df["datetime"].min()).dt.days  # index journalier réel
    df["heure"]    = df["datetime"].dt.hour
    df["mois"]     = df["datetime"].dt.month
    df["saison"]   = df["mois"].map({
        12:0, 1:0, 2:0,
         3:1, 4:1, 5:1,
         6:2, 7:2, 8:2,
         9:3,10:3,11:3
    })

    # Encodage cyclique heure et mois
    df["heure_sin"] = np.sin(2 * np.pi * df["heure"] / 24)
    df["heure_cos"] = np.cos(2 * np.pi * df["heure"] / 24)
    df["mois_sin"]  = np.sin(2 * np.pi * (df["mois"] - 1) / 12)
    df["mois_cos"]  = np.cos(2 * np.pi * (df["mois"] - 1) / 12)

    df["ville"] = ville
    df = df.drop(columns=["datetime"])

    print(f"  {ville} : {len(df)} lignes")
    tous_les_df.append(df)

df_final = pd.concat(tous_les_df, ignore_index=True)
print(f"\nTotal : {len(df_final)} lignes | Colonnes : {df_final.columns.tolist()}")

# Scaler fitté uniquement sur les variables météo brutes (pas les features dérivées)
cols_scaler = ["temperature", "humidite", "precipitation", "vent"]
scaler = MinMaxScaler()
scaler.fit(df_final[cols_scaler])

# Les données restent brutes dans processed.csv — le scaler est utilisé uniquement à la prédiction
joblib.dump(scaler, os.path.join(dossier_models, "scaler.pkl"))
df_final.to_csv(os.path.join(dossier_data, "processed.csv"), index=False)

print("\nScaler sauvegardé  → models/scaler.pkl")
print("Dataset sauvegardé → data/processed.csv  (valeurs brutes, non normalisées)")
print("Prétraitement terminé !")