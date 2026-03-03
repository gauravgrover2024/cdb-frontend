// src/api/bookings.js
import { apiClient } from "./client";

const API_BASE = "/api/bookings";

export const bookingsApi = {
  // LIST /api/bookings?limit=&skip=&status=
  list(params = {}) {
    // IMPORTANT: return the promise
    return apiClient.get(API_BASE, { params });
  },

  getById(bookingId) {
    return apiClient.get(`${API_BASE}/${bookingId}`);
  },

  create(payload) {
    return apiClient.post(API_BASE, payload);
  },

  createLoanFromBooking(bookingId) {
    return apiClient.post(`${API_BASE}/${bookingId}/create-loan`);
  },

  mergeIntoPayment(bookingId) {
    return apiClient.post(`${API_BASE}/${bookingId}/merge-into-payment`);
  },

  cancel(bookingId, payload) {
    return apiClient.post(`${API_BASE}/${bookingId}/cancel`, payload);
  },
};
