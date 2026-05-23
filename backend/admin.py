# backend/admin.py — VERSION FINALE CORRIGÉE
# Corrections :
#   - sys.executable utilisé pour lancer le script Python (évite le problème de PATH)
#   - stderr capturé séparément pour afficher les vraies erreurs
#   - Vérification existence de processed.csv avant lancement
#   - Admin exclu de tous les comptages et listes utilisateurs
#   - Régions dérivées depuis User.ville_reference (dict de correspondance)
#   - /admin/cities utilise ville_reference pour le nom d'affichage et la région
#   - /admin/stats : nb_villes = villes distinctes des users non-admin uniquement

import sys
import json
import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
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
# DICTIONNAIRE RÉGIONS (basé sur ville_reference de villes.py)
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
    """Requête de base : uniquement les utilisateurs non-admin."""
    return db.query(models.User).filter(models.User.role != "admin")


@router.get("/users", response_model=List[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    """
    Liste tous les utilisateurs (agriculteurs + logisticiens).
    L'admin est exclu de la liste.
    """
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
# STATS  (admin exclu)
# ═══════════════════════════════════════════════════════

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    """
    Compteurs globaux — admin exclu de tous les totaux.
    nb_villes = villes distinctes (via ville_reference) des users non-admin.
    """
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
# CITIES  (ville_reference → nom affichage + région)
# ═══════════════════════════════════════════════════════

@router.get("/cities")
def get_cities(db: Session = Depends(get_db), _=Depends(require_admin)):
    """
    Liste des villes avec nom d'affichage, région, nb utilisateurs et précision.
    - Groupé par User.ville_reference (clé normalisée, ex: "douala")
    - Région issue du dict REGIONS (correspondance fixe villes.py → région)
    - Nom propre depuis NOMS_AFFICHAGE
    - Admin exclu du comptage
    """
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
# TRAINING — Server-Sent Events
# ═══════════════════════════════════════════════════════

@router.post("/train")
async def launch_training(_=Depends(require_admin)):
    """
    Lance train_xgboost.py et diffuse la progression en SSE.
    Événements JSON : { progress, message, done, success?, duration? }

    Corrections :
      - sys.executable : utilise l'interpréteur Python du venv actif (évite
        les problèmes de PATH où "python" est introuvable ou pointe vers
        la mauvaise version / le mauvais environnement virtuel).
      - stderr séparé : permet de capturer les vraies erreurs du script
        (ImportError, FileNotFoundError, etc.) et de les renvoyer au frontend.
      - Vérification de processed.csv avant de lancer le subprocess.
    """
    if not TRAIN_SCRIPT.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Script d'entraînement introuvable : {TRAIN_SCRIPT}"
        )

    if not DATA_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=(
                f"Fichier de données introuvable : {DATA_PATH}. "
                "Lancez d'abord la collecte de données (collect_data.py puis preprocess.py)."
            )
        )

    async def event_stream():
        import time
        start = time.time()
        try:
            # ── sys.executable garantit le bon interpréteur (venv actif) ──
            process = await asyncio.create_subprocess_exec(
                sys.executable, str(TRAIN_SCRIPT),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,   # séparé pour capturer les erreurs
            )

            progress = 0
            async for line in process.stdout:
                line_text = line.decode("utf-8", errors="replace").strip()
                if not line_text:
                    continue
                progress = min(progress + 3, 95)
                payload = json.dumps({
                    "progress": progress,
                    "message":  line_text,
                    "done":     False,
                }, ensure_ascii=False)
                yield f"data: {payload}\n\n"

            await process.wait()

            # ── Lire stderr pour construire un message d'erreur utile ──
            stderr_output = await process.stderr.read()
            stderr_text   = stderr_output.decode("utf-8", errors="replace").strip()

            elapsed = round(time.time() - start)
            minutes, seconds = elapsed // 60, elapsed % 60
            duration_str = f"{minutes}min {seconds}s" if minutes else f"{seconds}s"

            if process.returncode == 0:
                yield f"data: {json.dumps({'progress': 100, 'message': 'Terminé avec succès', 'done': True, 'success': True, 'duration': duration_str}, ensure_ascii=False)}\n\n"
            else:
                # On renvoie les 300 premiers caractères de stderr au frontend
                error_msg = stderr_text[:300] if stderr_text else "Erreur durant l'entraînement (code {process.returncode})"
                yield f"data: {json.dumps({'progress': 0, 'message': error_msg, 'done': True, 'success': False}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'progress': 0, 'message': str(e), 'done': True, 'success': False}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
        }
    )