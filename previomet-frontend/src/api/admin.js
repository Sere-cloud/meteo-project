// src/api/admin.js
// Fonctions d'appels API pour le Dashboard Admin
// Toutes les routes → /admin/...
// Le token JWT est injecté automatiquement par l'intercepteur Axios (src/api/axios.js)

import api from "./axios";

// ─── Modèles ──────────────────────────────────────────────────────────────────

/**
 * GET /admin/models
 * Retourne le contenu de metrics.json (métriques par horizon et variable)
 * Structure attendue : { H3: { temperature: {MAE, RMSE}, vent: {...}, ... }, ..., date_entrainement: "..." }
 */
export function getModels() {
  return api.get("/admin/models");
}

/**
 * POST /admin/train  (Server-Sent Events)
 * Lance l'entraînement XGBoost et diffuse la progression en temps réel.
 * On utilise fetch() natif car axios ne gère pas le streaming SSE.
 *
 * @param {string} token          - JWT token récupéré depuis AuthContext
 * @param {function} onProgress   - callback({ progress, message })
 * @param {function} onDone       - callback({ success, duration, message })
 * @param {function} onError      - callback(messageErreur: string)
 */
export async function launchTrainingFetch(token, onProgress, onDone, onError) {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/admin/train`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      onError(err.detail || `Erreur ${response.status} lors du lancement de l'entraînement`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // garder le fragment incomplet

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        try {
          const data = JSON.parse(trimmed.slice(5).trim());
          if (data.done) {
            onDone(data);
          } else {
            onProgress(data);
          }
        } catch {
          // ligne non-JSON, on ignore
        }
      }
    }
  } catch (err) {
    onError(err.message || "Connexion au backend perdue pendant l'entraînement.");
  }
}

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

/**
 * GET /admin/users
 * Retourne la liste de tous les utilisateurs avec leurs activités.
 * Structure attendue par user :
 * { id, username, email, ville, ville_reference, role, is_active, created_at,
 *   activities: [{ domaine, grande_categorie, specificite }] }
 */
export function getUsers() {
  return api.get("/admin/users");
}

// ─── Villes ───────────────────────────────────────────────────────────────────

/**
 * GET /admin/cities
 * Retourne la liste des villes avec leurs stats.
 * Structure attendue par ville :
 * { nom, region, nb_utilisateurs, precision }
 * Note : precision peut être un float entre 0 et 1 (ex: 0.942) ou déjà en %
 */
export function getCities() {
  return api.get("/admin/cities");
}

// ─── Historique ───────────────────────────────────────────────────────────────

/**
 * GET /admin/logs
 * Retourne les 100 derniers logs de recommandation.
 * Structure attendue par log :
 * { id, user_id, username, date, titre, detail, type, culture, horizon }
 */
export function getLogs() {
  return api.get("/admin/logs");
}

// ─── Stats globales ───────────────────────────────────────────────────────────

/**
 * GET /admin/stats
 * Retourne les compteurs globaux.
 * Structure attendue :
 * { total_users, agriculteurs, logisticiens, total_recommandations, nb_villes }
 */
export function getStats() {
  return api.get("/admin/stats");
}
