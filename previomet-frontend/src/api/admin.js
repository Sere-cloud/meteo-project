// src/api/admin.js
// Fonctions d'appels API pour le Dashboard Admin
// Toutes les routes → /admin/...
// Le token JWT est injecté automatiquement par l'intercepteur Axios (src/api/axios.js)

import api from "./axios";

// ─── Modèles ──────────────────────────────────────────────────────────────────

/**
 * GET /admin/models
 * Retourne le contenu de metrics.json (métriques par horizon et variable)
 * Structure attendue : { H3: { temperature: {MAE, RMSE}, ... }, date_entrainement: "..." }
 */
export function getModels() {
  return api.get("/admin/models");
}

/**
 * POST /admin/train
 * Lance l'entraînement en arrière-plan. Répond immédiatement { message }.
 * Utilisez getTrainStatus() en polling pour suivre la progression.
 *
 * Pourquoi on abandonne le SSE ?
 *   Render (hébergeur distant) bufferise les réponses longues et coupe
 *   les connexions après ~30s → le SSE ne fonctionne pas de manière fiable.
 *   Le polling (appel toutes les 2s à /admin/train/status) est plus robuste.
 */
export function launchTraining() {
  return api.post("/admin/train");
}

/**
 * GET /admin/train/status
 * Retourne l'état courant de l'entraînement.
 * Structure : { running, progress, message, done, success, duration, error }
 *
 * Appelé toutes les 2 secondes depuis ModelsTab pendant l'entraînement.
 */
export function getTrainStatus() {
  return api.get("/admin/train/status");
}

/**
 * POST /admin/train/reset
 * Remet l'état d'entraînement backend à zéro après succès ou erreur.
 * À appeler quand l'utilisateur clique "Retour aux modèles".
 */
export function resetTrainState() {
  return api.post("/admin/train/reset");
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