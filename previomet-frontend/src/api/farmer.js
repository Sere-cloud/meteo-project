// src/api/farmer.js
import api from './axios';

// ── Profil ───────────────────────────────────────────────────
export const getMyProfile             = ()     => api.get('/auth/me');
export const updateMyProfile          = (data) => api.put('/auth/me', data);
export const getProfile               = getMyProfile;    // alias ProfileTab
export const updateProfile            = updateMyProfile; // alias ProfileTab

// ── Météo ────────────────────────────────────────────────────
export const getCurrentWeather        = (city) => api.get('/weather/current', { params: { city } });
export const getForecast              = (city) => api.get('/weather/predict',  { params: { city } });
export const getWeatherCurrent        = getCurrentWeather; // alias WeatherTab
export const getWeatherPredict        = getForecast;       // alias WeatherTab + CalendarTab

// ── Recommandations ──────────────────────────────────────────
export const getRecommendations       = ()   => api.get('/recommendations/');
export const deleteRecommendation     = (id) => api.delete(`/recommendations/${id}`);
export const deleteAllRecommendations = ()   => api.delete('/recommendations/all');