import { apiClient } from "./client";

export const quotationsApi = {
  create(payload) {
    return apiClient.post("/api/quotations", payload);
  },

  get(id) {
    return apiClient.get(`/api/quotations/${id}`);
  },

  list(params) {
    return apiClient.get("/api/quotations", { params });
  },

  remove(id) {
    return apiClient.delete(`/api/quotations/${id}`);
  },

  pdf(id) {
    return apiClient.getBlob(`/api/quotations/${id}/pdf`);
  },
};
