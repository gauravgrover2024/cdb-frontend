import { apiClient } from "./client";

export const aiAgentApi = {
  chat: async (payload, options = {}) => {
    const body = {
      message: String(payload?.message || "").trim(),
      sessionId: payload?.sessionId,
      context: payload?.context,
      selectedEntity: payload?.selectedEntity,
      filters: payload?.filters,
    };

    return apiClient.request({
      endpoint: "/api/ai-agent/chat",
      method: "POST",
      body,
      options,
    });
  },
};

export default aiAgentApi;
