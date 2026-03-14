import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { channelsApi } from "../api/channels";

const normalize = (value) => String(value || "").trim().toLowerCase();

const containsTerm = (row, term) => {
  const q = normalize(term);
  if (!q) return true;
  const hay = [
    row?.name,
    row?.mobile,
    row?.address,
    row?.city,
    row?.channelId,
    row?.businessName,
  ]
    .map((v) => normalize(v))
    .filter(Boolean)
    .join(" | ");
  return hay.includes(q);
};

export default function useChannelPartnerAutoSuggest({ limit = 25 } = {}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const allRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (Array.isArray(allRef.current)) return allRef.current;
    const response = await channelsApi.getAll({
      type: "Dealer",
      status: "Active",
      limit: 10000,
      skip: 0,
    });
    const data = response?.data || response?.channels || [];
    allRef.current = Array.isArray(data) ? data : [];
    return allRef.current;
  }, []);

  const fetchTop = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchAll();
      setPartners((all || []).slice(0, 1000));
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    fetchTop();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchTop]);

  const search = useCallback(
    (term) => {
      const q = String(term || "").trim();
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        if (!q) {
          await fetchTop();
          return;
        }
        if (q.length < 2) return;

        setLoading(true);
        try {
          const response = await channelsApi.search(q, "Dealer");
          let rows = response?.data || [];
          if (!Array.isArray(rows) || rows.length === 0) {
            const all = await fetchAll();
            rows = (all || []).filter((item) => containsTerm(item, q));
          }
          setPartners(rows);
        } catch {
          setPartners([]);
        } finally {
          setLoading(false);
        }
      }, 240);
    },
    [fetchAll, fetchTop],
  );

  const options = useMemo(
    () =>
      (partners || []).map((p) => ({
        value: p?.name || "",
        label: `${p?.name || "Unknown"}${p?.mobile ? ` • ${p.mobile}` : ""}`,
        partner: p,
      })),
    [partners],
  );

  const getByName = useCallback(
    (name) => {
      const n = normalize(name);
      return (partners || []).find((p) => normalize(p?.name) === n) || null;
    },
    [partners],
  );

  return {
    loading,
    partners,
    options,
    search,
    getByName,
  };
}

