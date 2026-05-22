// src/api/axios.js

import axios from 'axios';

// ── 1. Instance Axios ──────────────────────────────────────────────
// Au lieu d'écrire "http://127.0.0.1:8000" à chaque appel API,
// on crée une instance configurée une seule fois ici.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ── 2. Intercepteur de requête ─────────────────────────────────────
// Avant CHAQUE requête envoyée au backend, cette fonction s'exécute.
// Elle lit le token JWT stocké dans localStorage et l'ajoute
// automatiquement dans l'en-tête "Authorization".
// Sans ça, le backend répond 401 (non autorisé) car il ne sait pas
// qui tu es.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── 3. Intercepteur de réponse ─────────────────────────────────────
// Après CHAQUE réponse reçue du backend, cette fonction s'exécute.
// Si le backend répond 401 (token expiré ou invalide), on supprime
// le token du localStorage et on redirige vers /login automatiquement.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;