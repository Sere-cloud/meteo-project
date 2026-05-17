// src/api/auth.js
// Ce fichier regroupe TOUS les appels liés à l'authentification.
// Chaque fonction correspond à une route du backend.

import api from './axios';

// Inscription — envoie les données du formulaire au backend
// Le backend va géocoder la ville et créer l'utilisateur
export const register = (userData) => api.post('/auth/register', userData);

// Connexion — renvoie le token JWT + role + username + ville + ville_reference
export const login = (credentials) => api.post('/auth/login', credentials);

// Récupérer le profil de l'utilisateur connecté
export const getMe = () => api.get('/auth/me');

// Mettre à jour le profil (username, mot de passe, ville, activités)
export const updateMe = (data) => api.patch('/auth/me', data);

// Demande de réinitialisation de mot de passe (envoie un email)
export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

// Réinitialisation avec le token reçu par email
export const resetPassword = (token, new_password) =>
  api.post('/auth/reset-password', { token, new_password });