# backend/admin.py — VERSION POLLING (compatible Render / hébergement distant)
# Corrections :
#   - Remplacement SSE par polling : POST /admin/train lance en arrière-plan,
#     GET /admin/train/status retourne l'état courant toutes les N secondes
#   - sys.executable pour utiliser le bon interpréteur Python (venv actif)
#   - stderr capturé pour afficher les vraies erreurs au frontend
#   - Vérification existence de processed.csv avant lancement
#   - Admin exclu de tous les comptages et listes utilisateurs

import sys
import json
import asyncio
import time
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from .database import get_db
from .auth import require_admin
from . import models, schemas
from typing import List

router = APIRouter(prefix="/admin", tags=["Administration"])

METRICS_PATH = Path(__file__).resolve().parent.parent / "models" / "metrics.json"
TRAIN_SCRIPT = Path(__file__).resolve().parent.parent / "ml" / "train_xgboost.py"
DATA_PATH    = Path(__file__).resolve().parent.parent / "data" / "processed.csv"


# ═══════════════════════════════════════════════════════
# ÉTAT GLOBAL D'ENTRAÎNEMENT (en mémoire, par processus)
# ═══════════════════════════════════════════════════════

_train_state = {
    "running":   False,
    "progress":  0,
    "message":   "",
    "done":      False,
    "success":   None,   # True / False / None
    "duration":  "",
    "error":     "",
}


# ═══════════════════════════════════════════════════════
# DICTIONNAIRE RÉGIONS
# ═══════════════════════════════════════════════════════

REGIONS = {
    "douala":     "Littoral",
    "yaounde":    "Centre",
    "bafoussam":  "Ouest",
    "garoua":     "Nord",
    "bamenda":    "Nord-Ouest",
    "ngaoundere": "Adamaoua",
    "bertoua":    "Est",
    "ebolowa":    "Sud",
    "buea":       "Sud-Ouest",
    "maroua":     "Extrême-Nord",
}

NOMS_AFFICHAGE = {
    "douala":     "Douala",
    "yaounde":    "Yaoundé",
    "bafoussam":  "Bafoussam",
    "garoua":     "Garoua",
    "bamenda":    "Bamenda",
    "ngaoundere": "Ngaoundéré",
    "bertoua":    "Bertoua",
    "ebolowa":    "Ebolowa",
    "buea":       "Buea",
    "maroua":     "Maroua",
}


# ═══════════════════════════════════════════════════════
# UTILITAIRES MÉTRIQUES
# ═══════════════════════════════════════════════════════

def _load_metrics() -> dict:
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Fichier metrics.json introuvable. Lancez d'abord un entraînement."
        )
    with open(METRICS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _precision_globale(metriques: dict) -> float | None:
    HORIZONS  = ["H3", "H6", "H12", "H24", "J2", "J3", "J4", "J5"]
    VARIABLES = ["temperature", "vent", "precipitation", "humidite"]
    vals = []
    for h in HORIZONS:
        if h not in metriques:
            continue
        for v in VARIABLES:
            if v in metriques[h] and "MAE" in metriques[h][v]:
                mae = metriques[h][v]["MAE"]
                vals.append(max(0.0, min(100.0, (1 - mae) * 100)))
    if not vals:
        return None
    return round(sum(vals) / len(vals), 1)


# ═══════════════════════════════════════════════════════
# USERS  (admin exclu partout)
# ═══════════════════════════════════════════════════════

def _users_only(db: Session):
    return db.query(models.User).filter(models.User.role != "admin")


@router.get("/users", response_model=List[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return (
        _users_only(db)
        .options(joinedload(models.User.activities))
        .order_by(models.User.created_at.desc())
        .all()
    )


@router.patch("/users/{user_id}/toggle")
def toggle_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    user = (
        db.query(models.User)
        .filter(models.User.id == user_id, models.User.role != "admin")
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    user.is_active = not user.is_active
    db.commit()
    return {"username": user.username, "is_active": user.is_active}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    user = (
        db.query(models.User)
        .filter(models.User.id == user_id, models.User.role != "admin")
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    db.delete(user)
    db.commit()
    return {"message": f"Utilisateur {user.username} supprimé"}


# ═══════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    total_users     = _users_only(db).count()
    total_farmers   = _users_only(db).filter(models.User.role == "agriculteur").count()
    total_logistics = _users_only(db).filter(models.User.role == "logisticien").count()
    total_logs      = db.query(models.RecommendationLog).count()
    nb_villes = (
        db.query(func.count(func.distinct(models.User.ville_reference)))
        .filter(models.User.role != "admin")
        .filter(models.User.ville_reference.isnot(None))
        .scalar() or 0
    )
    return {
        "total_users":           total_users,
        "agriculteurs":          total_farmers,
        "logisticiens":          total_logistics,
        "total_recommandations": total_logs,
        "nb_villes":             nb_villes,
    }


# ═══════════════════════════════════════════════════════
# LOGS
# ═══════════════════════════════════════════════════════

@router.get("/logs", response_model=List[schemas.LogAdminResponse])
def get_all_logs(db: Session = Depends(get_db), _=Depends(require_admin)):
    logs = (
        db.query(models.RecommendationLog)
        .options(joinedload(models.RecommendationLog.user))
        .order_by(models.RecommendationLog.date.desc())
        .limit(100)
        .all()
    )
    result = []
    for log in logs:
        result.append(schemas.LogAdminResponse(
            id=log.id,
            date=log.date,
            titre=log.titre,
            detail=log.detail,
            type=log.type,
            culture=log.culture,
            horizon=log.horizon,
            username=log.user.username if log.user else "Inconnu",
        ))
    return result


# ═══════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════

@router.get("/models")
def get_models(_=Depends(require_admin)):
    return _load_metrics()


# ═══════════════════════════════════════════════════════
# CITIES
# ═══════════════════════════════════════════════════════

@router.get("/cities")
def get_cities(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = (
        db.query(
            models.User.ville_reference.label("cle"),
            func.count(models.User.id).label("nb_utilisateurs"),
        )
        .filter(models.User.role != "admin")
        .filter(models.User.ville_reference.isnot(None))
        .group_by(models.User.ville_reference)
        .order_by(func.count(models.User.id).desc())
        .all()
    )
    try:
        metriques = _load_metrics()
        precision = _precision_globale(metriques)
    except HTTPException:
        precision = None

    result = []
    for row in rows:
        cle = row.cle
        result.append({
            "nom":             NOMS_AFFICHAGE.get(cle, cle.capitalize()),
            "region":          REGIONS.get(cle, None),
            "nb_utilisateurs": row.nb_utilisateurs,
            "precision":       precision,
        })
    return result


# ═══════════════════════════════════════════════════════
# TRAINING — Approche Polling (compatible Render)
#
# Pourquoi pas SSE ?
#   Render (et la plupart des hébergeurs gratuits) bufferisent les réponses
#   HTTP longues et coupent les connexions après ~30s. Le SSE ne fonctionne
#   donc pas de manière fiable en production distante.
#
# Comment ça marche :
#   1. POST /admin/train        → lance le script en arrière-plan, répond 200 immédiatement
#   2. GET  /admin/train/status → retourne l'état courant (_train_state)
#      Le frontend appelle cet endpoint toutes les 2s et met à jour l'UI.
#   3. POST /admin/train/reset  → remet l'état à zéro après succès ou erreur
# ═══════════════════════════════════════════════════════

async def _run_training():
    """Tâche de fond : exécute train_xgboost.py et met à jour _train_state."""
    global _train_state
    start = time.time()

    _train_state.update({
        "running":  True,
        "progress": 5,
        "message":  "Initialisation du script...",
        "done":     False,
        "success":  None,
        "duration": "",
        "error":    "",
    })

    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable, str(TRAIN_SCRIPT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        progress = 5
        async for line in process.stdout:
            line_text = line.decode("utf-8", errors="replace").strip()
            if not line_text:
                continue
            progress = min(progress + 3, 95)
            _train_state["progress"] = progress
            _train_state["message"]  = line_text

        await process.wait()

        stderr_output = await process.stderr.read()
        stderr_text   = stderr_output.decode("utf-8", errors="replace").strip()

        elapsed = round(time.time() - start)
        minutes, seconds = elapsed // 60, elapsed % 60
        duration_str = f"{minutes}min {seconds}s" if minutes else f"{seconds}s"

        if process.returncode == 0:
            _train_state.update({
                "running":  False,
                "progress": 100,
                "message":  "Entraînement terminé avec succès",
                "done":     True,
                "success":  True,
                "duration": duration_str,
                "error":    "",
            })
        else:
            error_msg = stderr_text[:400] if stderr_text else f"Erreur inconnue (code {process.returncode})"
            _train_state.update({
                "running":  False,
                "progress": 0,
                "message":  "Erreur durant l'entraînement",
                "done":     True,
                "success":  False,
                "duration": duration_str,
                "error":    error_msg,
            })

    except Exception as e:
        _train_state.update({
            "running":  False,
            "progress": 0,
            "message":  str(e),
            "done":     True,
            "success":  False,
            "duration": "",
            "error":    str(e),
        })


@router.post("/train")
async def launch_training(
    background_tasks: BackgroundTasks,
    _=Depends(require_admin)
):
    """
    Lance train_xgboost.py en arrière-plan et répond immédiatement.
    Interrogez GET /admin/train/status pour suivre la progression.
    """
    if _train_state["running"]:
        raise HTTPException(status_code=409, detail="Un entraînement est déjà en cours.")

    if not TRAIN_SCRIPT.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Script d'entraînement introuvable : {TRAIN_SCRIPT}"
        )

    if not DATA_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=(
                "Fichier de données introuvable : data/processed.csv. "
                "Lancez d'abord collect_data.py puis preprocess.py."
            )
        )

    background_tasks.add_task(_run_training)
    return {"message": "Entraînement lancé en arrière-plan."}


@router.get("/train/status")
def get_train_status(_=Depends(require_admin)):
    """
    Retourne l'état courant de l'entraînement.
    Structure : { running, progress, message, done, success, duration, error }
    """
    return _train_state


@router.post("/train/reset")
def reset_train_state(_=Depends(require_admin)):
    """Remet l'état d'entraînement à zéro (après succès ou erreur)."""
    global _train_state
    if _train_state["running"]:
        raise HTTPException(status_code=409, detail="Entraînement en cours, impossible de réinitialiser.")
    _train_state.update({
        "running":  False,
        "progress": 0,
        "message":  "",
        "done":     False,
        "success":  None,
        "duration": "",
        "error":    "",
    })
    return {"message": "État réinitialisé."}