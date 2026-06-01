import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL
});

export const userService = {
  getAll() {
    return api.get('/users');
  },

  getById(id) {
    return api.get(`/users/${id}`);
  },

  create(name) {
    return api.post('/users', { name });
  },

  getTournaments(userId) {
    return api.get(`/users/${userId}/tournaments`);
  },

  getSummary(userId) {
    return api.get(`/users/${userId}/summary`);
  },

  addTournament(userId, tournament) {
    return api.post(`/users/${userId}/tournaments`, tournament);
  },

  // Géolocalisation en temps réel
  updateLocation(userId, lat, lng) {
    return api.put(`/users/${userId}/location`, { lat, lng });
  },

  clearLocation(userId) {
    return api.delete(`/users/${userId}/location`);
  },

  getAllLocations() {
    return api.get('/users/locations');
  }
};

export const tournamentService = {
  update(id, tournament) {
    return api.put(`/tournaments/${id}`, tournament);
  },

  delete(id) {
    return api.delete(`/tournaments/${id}`);
  },

  updateNote(id, user_note) {
    return api.patch(`/tournaments/${id}/note`, { user_note });
  }
};

export default api;
