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
print(f"Dataset : {len(df)} lignes | Colonnes : {df.columns.tolist()}")

CIBLES            = ["temperature", "humidite", "precipitation", "vent"]
HORIZONS_HORAIRES = {"H3": 3, "H6": 6, "H12": 12, "H24": 24}
HORIZONS_JOURS    = {"J2": 2, "J3": 3, "J4": 4, "J5": 5}

# Features horaires : variables météo brutes + features temporelles cycliques
FEATURES_HORAIRES = [
    "temperature", "humidite", "precipitation", "vent",
    "heure_sin", "heure_cos", "mois_sin", "mois_cos", "saison"
]

# Features journalières : moyennes météo + contexte temporel
FEATURES_JOURS = [
    "temperature", "humidite", "precipitation", "vent",
    "mois_sin", "mois_cos", "saison"
]

metriques = {}

# ─── 2. Horizons horaires H3, H6, H12, H24 ───────────────────────
# Tri sur l'index temporel réel (ville + jour + heure)
df = df.sort_values(["ville", "jour", "heure"]).reset_index(drop=True)

for horizon_nom, h in HORIZONS_HORAIRES.items():
    metriques[horizon_nom] = {}
    print(f"\n{'='*50}\n  Horizon {horizon_nom} (H+{h})\n{'='*50}")

    for cible in CIBLES:
        col_cible = f"{cible}_plus_{horizon_nom}"
        # Shift correct : décalage de h lignes par groupe ville,
        # trié chronologiquement — représente vraiment H+h heures plus tard
        df[col_cible] = df.groupby("ville")[cible].shift(-h)

    df_clean = df.dropna(subset=[f"{c}_plus_{horizon_nom}" for c in CIBLES])

    for cible in CIBLES:
        col_cible = f"{cible}_plus_{horizon_nom}"
        X = df_clean[FEATURES_HORAIRES]
        y = df_clean[col_cible]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model = xgb.XGBRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            random_state=42,
            verbosity=0
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        mae    = mean_absolute_error(y_test, y_pred)
        rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
        print(f"  {cible:<15} MAE={mae:.4f}  RMSE={rmse:.4f}")

        joblib.dump(model, os.path.join(dossier_models, f"xgb_{cible}_{horizon_nom}.pkl"))
        metriques[horizon_nom][cible] = {"MAE": round(mae, 4), "RMSE": round(rmse, 4)}

    # Nettoyage colonnes temporaires
    df = df.drop(columns=[f"{c}_plus_{horizon_nom}" for c in CIBLES])

# ─── 3. Horizons journaliers J2→J5 ───────────────────────────────
print(f"\n{'='*50}\n  Horizons J+2 à J+5\n{'='*50}")

# Agrégat journalier réel : moyenne par ville et par jour calendaire
df_agg = df.groupby(["ville", "jour"]).agg(
    temperature  = ("temperature",  "mean"),
    humidite     = ("humidite",     "mean"),
    precipitation= ("precipitation","sum"),   # précipitations = cumul journalier
    vent         = ("vent",         "mean"),
    mois_sin     = ("mois_sin",     "first"),
    mois_cos     = ("mois_cos",     "first"),
    saison       = ("saison",       "first"),
).reset_index()

for horizon_nom, j in HORIZONS_JOURS.items():
    metriques[horizon_nom] = {}
    print(f"\n--- Horizon {horizon_nom} (J+{j}) ---")

    for cible in CIBLES:
        col_cible = f"{cible}_plus_{horizon_nom}"
        df_agg[col_cible] = df_agg.groupby("ville")[cible].shift(-j)

    df_agg_clean = df_agg.dropna(subset=[f"{c}_plus_{horizon_nom}" for c in CIBLES])

    for cible in CIBLES:
        col_cible = f"{cible}_plus_{horizon_nom}"
        X = df_agg_clean[FEATURES_JOURS]
        y = df_agg_clean[col_cible]

        if len(X) < 10:
            print(f"  {cible} — pas assez de données")
            continue

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model = xgb.XGBRegressor(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbosity=0
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        mae    = mean_absolute_error(y_test, y_pred)
        rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
        print(f"  {cible:<15} MAE={mae:.4f}  RMSE={rmse:.4f}")

        joblib.dump(model, os.path.join(dossier_models, f"xgb_{cible}_{horizon_nom}.pkl"))
        metriques[horizon_nom][cible] = {"MAE": round(mae, 4), "RMSE": round(rmse, 4)}

    # Nettoyage colonnes temporaires
    df_agg = df_agg.drop(columns=[f"{c}_plus_{horizon_nom}" for c in CIBLES])

# ─── 4. Sauvegarde métriques ─────────────────────────────────────
metriques["date_entrainement"] = datetime.now().strftime("%Y-%m-%d %H:%M")
metriques["version"] = "2.0"

with open(os.path.join(dossier_models, "metrics.json"), "w") as f:
    json.dump(metriques, f, indent=2)

print("\n✅ Entraînement terminé !")
print("   Modèles → models/   |   Métriques → models/metrics.json")