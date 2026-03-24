import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showroomsApi } from "../api/showrooms";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const canonicalizeBrand = (value) => {
  const raw = normalize(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  const compact = raw.replace(/[^a-z0-9]/g, "");

  if (
    compact.includes("maruti") ||
    compact.includes("suzuki") ||
    compact === "msil"
  ) {
    return "maruti";
  }
  if (compact.includes("mercedes") || compact.includes("benz")) {
    return "mercedes-benz";
  }
  if (compact.includes("bmw")) return "bmw";
  if (
    compact.includes("landrover") ||
    compact.includes("jaguarlandrover") ||
    compact === "jlr"
  ) {
    return "land-rover";
  }
  if (compact.includes("volkswagen") || compact === "vw") return "volkswagen";
  if (compact.includes("mahindra") || compact === "mm" || compact === "m&m") {
    return "mahindra";
  }
  if (compact === "mg" || compact.includes("morrisgarage")) return "mg";
  if (compact.includes("tata")) return "tata";
  if (compact.includes("hyundai")) return "hyundai";
  if (compact.includes("kia")) return "kia";
  if (compact.includes("honda")) return "honda";
  if (compact.includes("toyota")) return "toyota";
  if (compact.includes("renault")) return "renault";
  if (compact.includes("nissan")) return "nissan";
  if (compact.includes("skoda")) return "skoda";
  if (compact.includes("audi")) return "audi";
  if (compact.includes("jeep")) return "jeep";
  if (compact.includes("isuzu")) return "isuzu";
  if (compact.includes("citroen")) return "citroen";
  if (compact.includes("byd")) return "byd";
  if (compact.includes("force")) return "force";
  if (compact.includes("jaguar")) return "jaguar";
  if (compact.includes("astonmartin")) return "aston-martin";
  if (compact.includes("bentley")) return "bentley";

  return raw;
};

export default function useShowroomAutoSuggest({
  limit = 20,
  brand = "",
} = {}) {
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const timerRef = useRef(null);
  const brandRef = useRef(canonicalizeBrand(brand));
  const queryRef = useRef("");
  const requestSeqRef = useRef(0);

  useEffect(() => {
    brandRef.current = canonicalizeBrand(brand);
  }, [brand]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const runSearch = useCallback(
    async (term = "") => {
      const q = String(term || "").trim();
      const requestId = ++requestSeqRef.current;
      setLoading(true);
      try {
        // Backend does the authoritative filtering:
        // 1) brand exact-key filter (if selected)
        // 2) strict contiguous name match for typed term
        const response = await showroomsApi.search({
          term: q,
          limit: Math.max(limit, 300),
          brand: brandRef.current || "",
        });
        if (requestId !== requestSeqRef.current) return;
        setShowrooms(Array.isArray(response?.data) ? response.data : []);
      } catch {
        if (requestId !== requestSeqRef.current) return;
        setShowrooms([]);
      } finally {
        if (requestId !== requestSeqRef.current) return;
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    runSearch(queryRef.current);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [brand, runSearch]);

  const search = useCallback(
    (term) => {
      const q = String(term || "").trim();

      setQuery(q);

      if (q.length < 2) {
        setShowrooms([]);
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        runSearch(q);
      }, 250);
    },
    [runSearch],
  );

  const options = useMemo(() => {
    const seen = new Set();
    return showrooms
      .filter((s) => {
        const key = [
          normalize(s?.showroomId),
          normalize(s?.name),
          normalize(s?.city),
          normalize(s?.mobile),
        ]
          .filter(Boolean)
          .join("|");
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((s) => ({
        value: s.name || "",
        label: `${s.name || "Unknown"}${s.city ? ` • ${s.city}` : ""}`,
        showroom: s,
      }));
  }, [showrooms]);

  const getByName = useCallback(
    (name) => {
      const n = normalize(name);
      return showrooms.find((s) => normalize(s?.name) === n) || null;
    },
    [showrooms],
  );

  return {
    loading,
    showrooms,
    options,
    search,
    getByName,
  };
}
