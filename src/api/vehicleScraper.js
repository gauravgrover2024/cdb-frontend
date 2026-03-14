import { apiClient } from "./client";

export const vehicleScraperApi = {
  getCatalog: async () => {
    const payload = await apiClient.get("/api/vehicles/scraper/catalog");
    return payload?.data || [];
  },

  getSummary: async () => {
    const payload = await apiClient.get("/api/vehicles/scraper/summary");
    return payload?.data || null;
  },

  getRuns: async () => {
    const payload = await apiClient.get("/api/vehicles/scraper/runs");
    return payload?.data || [];
  },

  getRunById: async (runId, includeLogs = false) => {
    const payload = await apiClient.get(
      `/api/vehicles/scraper/runs/${encodeURIComponent(runId)}`,
      { params: { includeLogs } },
    );
    return payload?.data || null;
  },

  startRun: async (scriptKey) => {
    const payload = await apiClient.post("/api/vehicles/scraper/run", { scriptKey });
    return payload?.data || null;
  },
};

