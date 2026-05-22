// src/api/farmer.js
import api from './axios';

// ── Profil ────────────────────────────────────────────────────────────────────
export const getMyProfile    = ()     => api.get('/auth/me');
export const updateMyProfile = (data) => api.put('/auth/me', data);
export const getProfile      = getMyProfile;
export const updateProfile   = updateMyProfile;

// ── Météo ─────────────────────────────────────────────────────────────────────
export const getCurrentWeather = (city) => api.get('/weather/current', { params: { city } });
export const getForecast       = (city) => api.get('/weather/predict',  { params: { city } });
export const getWeatherCurrent = getCurrentWeather;
export const getWeatherPredict = getForecast;

// ── Recommandations ───────────────────────────────────────────────────────────
// suffix optionnel : '' → GET /recommendations/
//                   'semis' → GET /recommendations/semis
export const getRecommendations       = (suffix = '') => api.get(`/recommendations/${suffix}`);
export const deleteRecommendation     = (id)          => api.delete(`/recommendations/${id}`);
export const deleteAllRecommendations = ()            => api.delete('/recommendations/all');