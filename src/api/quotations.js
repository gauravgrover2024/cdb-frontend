import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5050", // your backend port from server.js
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
};
