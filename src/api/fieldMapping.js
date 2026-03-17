import { apiClient, buildUrl } from "./client";

const isMongoId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

const sendMappedLoanRequest = async (method, endpointUrl, payload) => {
  try {
    const parsed = await apiClient.request({
      endpoint: endpointUrl,
      method,
      body: payload,
    });

    return {
      res: { ok: true, status: 200, statusText: "OK" },
      parsed,
      method,
      endpointUrl,
    };
  } catch (error) {
    const message = String(error?.message || error);
    const status = Number(error?.status) || 500;

    return {
      res: { ok: false, status, statusText: "Request Failed" },
      parsed: message,
      method,
      endpointUrl,
    };
  }
};

const fetchMappedLoanJson = async (endpointUrl) => {
  try {
    const parsed = await apiClient.request({ endpoint: endpointUrl, method: "GET" });
    return {
      res: { ok: true, status: 200, statusText: "OK" },
      parsed,
    };
  } catch (error) {
    const message = String(error?.message || error);
    const status = Number(error?.status) || 500;

    return {
      res: { ok: false, status, statusText: "Request Failed" },
      parsed: message,
    };
  }
};

const extractLoanRows = (parsed) => {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.loans)) return parsed.loans;
  if (Array.isArray(parsed?.results)) return parsed.results;
  if (Array.isArray(parsed?.items)) return parsed.items;
  return [];
};

export const resolveExistingBackendIdByCase = async (baseUrl, caseId) => {
  const normalizedBaseUrl = buildUrl(String(baseUrl || "").replace(/\/+$/, ""));
  const candidates = [
    `${normalizedBaseUrl}?limit=200&search=${encodeURIComponent(String(caseId))}`,
    `${normalizedBaseUrl}?limit=200&caseId=${encodeURIComponent(String(caseId))}`,
  ];

  for (const url of candidates) {
    const probe = await fetchMappedLoanJson(url);
    if (!probe.res.ok) continue;

    const rows = extractLoanRows(probe.parsed);
    if (!rows.length) continue;

    const match = rows.find((row) => {
      const meta = row?.__importMeta || row?.importMeta || {};
      const metaCaseId = String(meta?.caseId || "").trim();
      const aliases = Array.isArray(meta?.aliases) ? meta.aliases.map(String) : [];

      return metaCaseId === String(caseId) || aliases.includes(String(caseId));
    });

    const backendId = match?._id;
    if (backendId && isMongoId(backendId)) {
      return String(backendId);
    }
  }

  return "";
};

export const submitMappedLoan = async ({
  baseUrl,
  payload,
  caseId,
  knownBackendId,
}) => {
  const normalizedBaseUrl = buildUrl(String(baseUrl || "").replace(/\/+$/, ""));
  let resolvedBackendId = isMongoId(knownBackendId) ? String(knownBackendId) : "";

  if (!resolvedBackendId) {
    resolvedBackendId = await resolveExistingBackendIdByCase(
      normalizedBaseUrl,
      caseId,
    );
  }

  let result = resolvedBackendId
    ? await sendMappedLoanRequest(
        "PUT",
        `${normalizedBaseUrl}/${resolvedBackendId}`,
        payload,
      )
    : await sendMappedLoanRequest("POST", normalizedBaseUrl, payload);

  if (resolvedBackendId && !result.res.ok && Number(result.res.status) === 400) {
    const existing = await fetchMappedLoanJson(
      `${normalizedBaseUrl}/${resolvedBackendId}`,
    );

    if (existing.res.ok && existing.parsed && typeof existing.parsed === "object") {
      const existingDoc = existing.parsed?.data || existing.parsed?.loan || existing.parsed;

      if (existingDoc && typeof existingDoc === "object") {
        const mergedPayload = { ...existingDoc, ...payload };
        delete mergedPayload._id;

        result = await sendMappedLoanRequest(
          "PUT",
          `${normalizedBaseUrl}/${resolvedBackendId}`,
          mergedPayload,
        );
      }
    }
  }

  let staleIdCleared = false;

  if (resolvedBackendId && !result.res.ok && Number(result.res.status) === 404) {
    staleIdCleared = true;
    resolvedBackendId = "";
    result = await sendMappedLoanRequest("POST", normalizedBaseUrl, payload);
  }

  const createdOrUpdatedBackendId =
    result.parsed?._id || result.parsed?.data?._id || result.parsed?.loan?._id || "";

  return {
    result,
    resolvedBackendId,
    matchedBackendId: resolvedBackendId,
    backendId:
      createdOrUpdatedBackendId && isMongoId(createdOrUpdatedBackendId)
        ? String(createdOrUpdatedBackendId)
        : "",
    staleIdCleared,
  };
};