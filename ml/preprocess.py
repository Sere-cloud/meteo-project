#ml/preprocess.py

import pandas as pd
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
    df = pd.read_csv(os.path.join(dossier_data, fichier))

    # Remplir humidite_sol vide par 0 avant tout
    df["soil_moisture_0_1cm"] = df["soil_moisture_0_1cm"].fillna(0)

    # Interpoler le reste des colonnes numériques
    cols_num = ["temperature_2m", "relative_humidity_2m",
                "precipitation", "wind_speed_10m", "soil_moisture_0_1cm"]
    df[cols_num] = df[cols_num].interpolate(method="linear")

    # Renommer
    df = df.rename(columns={
        "time":                  "datetime",
        "temperature_2m":        "temperature",
        "relative_humidity_2m":  "humidite",
        "wind_speed_10m":        "vent",
        "soil_moisture_0_1cm":   "humidite_sol"
    })

    # Features temporelles
    df["datetime"] = pd.to_datetime(df["datetime"])
    df["heure"]    = df["datetime"].dt.hour
    df["mois"]     = df["datetime"].dt.month
    df["saison"]   = df["mois"].map({
        12:0,1:0,2:0, 3:1,4:1,5:1,
        6:2,7:2,8:2,  9:3,10:3,11:3
    })
    df["ville"] = ville
    df = df.drop(columns=["datetime"])

    print(f"{ville} : {len(df)} lignes")
    tous_les_df.append(df)

df_final = pd.concat(tous_les_df, ignore_index=True)
print(f"\nTotal : {len(df_final)} lignes | Colonnes : {df_final.columns.tolist()}")

# Normalisation
cols_norm = ["temperature", "humidite", "precipitation", "vent", "humidite_sol"]
scaler = MinMaxScaler()
df_final[cols_norm] = scaler.fit_transform(df_final[cols_norm])

joblib.dump(scaler, os.path.join(dossier_models, "scaler.pkl"))
df_final.to_csv(os.path.join(dossier_data, "processed.csv"), index=False)

print("Scaler sauvegardé → models/scaler.pkl")
print("Dataset sauvegardé → data/processed.csv")
print("Prétraitement terminé avec succès !")