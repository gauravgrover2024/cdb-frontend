import { apiClient } from "./client";

export const featuresApi = {
  getVariantsWithPrice: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query
      ? `/api/features/variants-with-price?${query}`
      : "/api/features/variants-with-price";
    return await apiClient.get(url);
  },
};
