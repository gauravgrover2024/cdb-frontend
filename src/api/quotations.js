import axios from "axios";

const API_BASE_URL = "https://cdb-api.vercel.app";

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const quotationsApi = {
  create(payload) {
    return api.post("/api/quotations", payload);
  },

  get(id) {
    return api.get(`/api/quotations/${id}`);
  },

  list(params) {
    return api.get("/api/quotations", { params });
  },

  remove(id) {
    return api.delete(`/api/quotations/${id}`);
  },

  pdf(id) {
    return api.get(`/api/quotations/${id}/pdf`, { responseType: "blob" });
  },
};
