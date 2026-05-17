# ml/train_xgboost.py

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib, json, os
from datetime import datetime

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dossier_data   = os.path.join(BASE_DIR, "data")
dossier_models = os.path.join(BASE_DIR, "models")

# ─── 1. Chargement ───────────────────────────────────────────────
df = pd.read_csv(os.path.join(dossier_data, "processed.csv"))
print(f"Dataset chargé : {len(df)} lignes | Colonnes : {df.columns.tolist()}")

# ─── 2. Features et cibles ───────────────────────────────────────
FEATURES = ["temperature", "humidite", "precipitation", "vent",
            "heure", "mois", "saison"]

CIBLES = ["temperature", "humidite", "precipitation", "vent"]

HORIZONS = {
    "H3":  3,
    "H6":  6,
    "H12": 12,
    "H24": 24,
}

# ─── 3. Création des colonnes cibles décalées (shift) ────────────
# On groupe par ville pour éviter les mélanges entre villes
df = df.sort_values(["ville", "heure", "mois"]).reset_index(drop=True)

for horizon_nom, h in HORIZONS.items():
    for cible in CIBLES:
        col_name = f"{cible}_plus_{horizon_nom}"
        df[col_name] = df.groupby("ville")[cible].shift(-h)

# Supprimer les lignes avec NaN (dernières lignes de chaque ville après shift)
df = df.dropna().reset_index(drop=True)
print(f"Après shift et dropna : {len(df)} lignes")

# ─── 4. Entraînement par horizon et par cible ────────────────────
metriques = {}

for horizon_nom, h in HORIZONS.items():
    metriques[horizon_nom] = {}
    print(f"\n{'='*50}")
    print(f"  Horizon {horizon_nom} (H+{h})")
    print(f"{'='*50}")

    for cible in CIBLES:
        col_cible = f"{cible}_plus_{horizon_nom}"

        X = df[FEATURES]
        y = df[col_cible]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbosity=0
        )

        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        mae  = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_pred, y_test))

        print(f"  {cible:<15} MAE={mae:.4f}  RMSE={rmse:.4f}")

        # Sauvegarde du modèle
        nom_fichier = f"xgb_{cible}_{horizon_nom}.pkl"
        joblib.dump(model, os.path.join(dossier_models, nom_fichier))

        metriques[horizon_nom][cible] = {"MAE": round(mae, 4), "RMSE": round(rmse, 4)}

# ─── 5. Prévisions J+2 à J+5 (agrégats journaliers) ─────────────
print(f"\n{'='*50}")
print("  Horizons J+2 à J+5 (agrégats journaliers)")
print(f"{'='*50}")

# On crée un dataset journalier : moyenne par ville et par jour
df_jour = df.copy()
df_jour["jour_index"] = (df_jour["mois"] * 30 + df_jour["heure"] // 24).astype(int)

df_agg = df_jour.groupby(["ville", "jour_index"])[CIBLES].mean().reset_index()

HORIZONS_JOURS = {"J2": 2, "J3": 3, "J4": 4, "J5": 5}

for horizon_nom, j in HORIZONS_JOURS.items():
    metriques[horizon_nom] = {}
    print(f"\n--- Horizon {horizon_nom} (J+{j}) ---")

    for cible in CIBLES:
        col_cible = f"{cible}_plus_{horizon_nom}"
        df_agg[col_cible] = df_agg.groupby("ville")[cible].shift(-j)

    df_agg_clean = df_agg.dropna()

    for cible in CIBLES:
        col_cible = f"{cible}_plus_{horizon_nom}"
        FEATURES_JOUR = CIBLES  # pour J+X, on prédit depuis les moyennes journalières

        X = df_agg_clean[FEATURES_JOUR]
        y = df_agg_clean[col_cible]

        if len(X) < 10:
            print(f"  {cible} — pas assez de données, ignoré")
            continue

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            verbosity=0
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        mae  = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_pred, y_test))

        print(f"  {cible:<15} MAE={mae:.4f}  RMSE={rmse:.4f}")

        nom_fichier = f"xgb_{cible}_{horizon_nom}.pkl"
        joblib.dump(model, os.path.join(dossier_models, nom_fichier))

        metriques[horizon_nom][cible] = {"MAE": round(mae, 4), "RMSE": round(rmse, 4)}

# ─── 6. Sauvegarde des métriques ─────────────────────────────────
metriques["date_entrainement"] = datetime.now().strftime("%Y-%m-%d %H:%M")
metriques["version"] = "1.0"

with open(os.path.join(dossier_models, "metrics.json"), "w") as f:
    json.dump(metriques, f, indent=2)

print("\n✅ Entraînement terminé !")
print(f"   Modèles sauvegardés dans : models/")
print(f"   Métriques sauvegardées   : models/metrics.json")