import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showroomsApi } from "../api/showrooms";

const normalize = (value) => String(value || "").trim().toLowerCase();
const toArray = (value) => (Array.isArray(value) ? value : []);
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
  if (
    compact.includes("mahindra") ||
    compact === "mm" ||
    compact === "m&m"
  ) {
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
const brandTokens = (canonical) => {
  switch (canonical) {
    case "maruti":
      return ["maruti", "suzuki", "nexa", "arena", "msil"];
    case "mercedes-benz":
      return ["mercedes", "benz"];
    case "land-rover":
      return ["landrover", "land rover", "jlr"];
    case "mg":
      return ["mg", "morris"];
    case "tata":
      return ["tata"];
    case "mahindra":
      return ["mahindra"];
    case "hyundai":
      return ["hyundai"];
    case "kia":
      return ["kia"];
    case "honda":
      return ["honda"];
    case "toyota":
      return ["toyota"];
    default:
      return [canonical];
  }
};
const showroomBrandText = (showroom) =>
  [
    showroom?.name,
    showroom?.businessName,
    ...toArray(showroom?.brands),
  ]
    .map((v) => normalize(v))
    .filter(Boolean)
    .join(" | ");
const matchesBrand = (showroom, brand) => {
  const canonical = canonicalizeBrand(brand);
  if (!canonical) return true;
  const brands = toArray(showroom?.brands);
  if (brands.length) {
    const exact = brands.some((x) => canonicalizeBrand(x) === canonical);
    if (exact) return true;
  }
  const text = showroomBrandText(showroom);
  return brandTokens(canonical).some((token) => text.includes(token));
};
const includesBrand = (showroom, brand) => {
  return matchesBrand(showroom, brand);
};
const containsTerm = (showroom, term) => {
  const q = normalize(term);
  if (!q) return true;
  const hay = [
    showroom?.name,
    showroom?.city,
    showroom?.mobile,
    showroom?.address,
    showroom?.businessName,
  ]
    .map((v) => normalize(v))
    .filter(Boolean)
    .join(" | ");
  return hay.includes(q);
};

export default function useShowroomAutoSuggest({ limit = 20, brand = "" } = {}) {
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const brandRef = useRef(brand);
  const allActiveRef = useRef(null);

  useEffect(() => {
    brandRef.current = brand;
  }, [brand]);

  const filterByBrand = useCallback(
    (items) => {
      const rawBrand = normalize(brandRef.current);
      if (!rawBrand) return items;
      const matchBrand = canonicalizeBrand(rawBrand);
      return (items || []).filter((item) => matchesBrand(item, matchBrand));
    },
    [],
  );

  const fetchAllActive = useCallback(async () => {
    if (Array.isArray(allActiveRef.current)) return allActiveRef.current;
    const response = await showroomsApi.getAll({ status: "Active", limit: 15000, skip: 0 });
    const list = response?.data || [];
    allActiveRef.current = list;
    return list;
  }, []);

  const fetchTop = useCallback(async () => {
    setLoading(true);
    try {
      const hasBrand = Boolean(normalize(brand));
      if (hasBrand) {
        const all = await fetchAllActive();
        const filtered = filterByBrand(all || []);
        setShowrooms(filtered.slice(0, 5000));
      } else {
        const response = await showroomsApi.getAll({
          status: "Active",
          limit: Math.max(limit, 200),
          skip: 0,
        });
        setShowrooms(response?.data || []);
      }
    } catch {
      setShowrooms([]);
    } finally {
      setLoading(false);
    }
  }, [brand, fetchAllActive, filterByBrand, limit]);

  useEffect(() => {
    fetchTop();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
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
          const hasBrand = Boolean(normalize(brand));
          let items = [];
          if (hasBrand) {
            const all = await fetchAllActive();
            items = filterByBrand(all || []);
          } else {
            const response = await showroomsApi.search({
              term: q,
              limit: Math.max(limit, 200),
              brand: "",
            });
            items = response?.data || [];
          }
          if (q) items = items.filter((item) => containsTerm(item, q));
          setShowrooms(items);
        } catch {
          setShowrooms([]);
        } finally {
          setLoading(false);
        }
      }, 280);
    },
    [brand, fetchAllActive, fetchTop, filterByBrand, limit],
  );

  const options = useMemo(
    () =>
      showrooms
        .filter((s) => includesBrand(s, brand))
        .map((s) => ({
        value: s.name || "",
        label: `${s.name || "Unknown"}${s.city ? ` • ${s.city}` : ""}`,
        showroom: s,
      })),
    [brand, showrooms],
  );

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
