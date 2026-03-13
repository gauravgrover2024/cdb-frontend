import { useEffect, useMemo, useState } from "react";
import { banksApi } from "../api/banks";
import { curatedCarLoanBanks } from "../constants/lenderHypothecationOptions";

let cachedNames = null;
let inFlight = null;
const BANK_DIRECTORY_CACHE_KEY = "bank_directory_names_cache_v2";

const supplementalBanks = [
  "Paytm Payments Bank",
  "Paytm Payments Bank Limited",
  "Airtel Payments Bank",
  "Airtel Payments Bank Limited",
  "India Post Payments Bank",
  "India Post Payments Bank Limited",
  "Fino Payments Bank",
  "Fino Payments Bank Limited",
  "Jio Payments Bank",
  "Jio Payments Bank Limited",
  "NSDL Payments Bank",
  "NSDL Payments Bank Limited",
  "DBS Bank India",
  "DBS Bank India Limited",
];

const extractRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.banks)) return response.banks;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const extractName = (row) => {
  if (!row) return "";
  if (typeof row === "string") return row.trim();
  return String(
    row.name ||
      row.bankName ||
      row.bank_name ||
      row.BANK_NAME ||
      row.bank ||
      row.BANK ||
      row.value ||
      row.label ||
      "",
  ).trim();
};

const mergeUniqueNames = (base, incoming) => {
  const seen = new Set(base.map((n) => String(n || "").trim().toLowerCase()).filter(Boolean));
  const result = [...base];
  incoming.forEach((raw) => {
    const name = String(raw || "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    result.push(name);
  });
  return result;
};

const readPersistedNames = () => {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(BANK_DIRECTORY_CACHE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean).map((x) => String(x).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const persistNames = (names) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(BANK_DIRECTORY_CACHE_KEY, JSON.stringify(names));
  } catch {
    // ignore storage quota / private mode issues
  }
};

const fetchBankNames = async () => {
  if (Array.isArray(cachedNames)) return cachedNames;
  if (inFlight) return inFlight;

  const persisted = readPersistedNames();
  inFlight = Promise.allSettled([
    banksApi.getAll(),
    banksApi.getAll({ limit: 100000 }),
    banksApi.getAll({ limit: 100000, allowDiskUse: true, sortBy: "name", sortOrder: "asc" }),
  ])
    .then((results) => {
      const rows = results
        .filter((entry) => entry.status === "fulfilled")
        .flatMap((entry) => extractRows(entry.value));

      let names = [];

      rows.forEach((row) => {
        const name = extractName(row);
        if (!name) return;
        names.push(name);
      });

      names = mergeUniqueNames([], names);
      names = mergeUniqueNames(names, persisted);

      // Keep fallback values present but do not replace directory values.
      names = mergeUniqueNames(
        names,
        curatedCarLoanBanks.map((row) => String(row?.name || "").trim()),
      );
      names = mergeUniqueNames(names, supplementalBanks);

      names.sort((a, b) => a.localeCompare(b));
      cachedNames = names;
      if (rows.length > 0) {
        persistNames(names);
      }
      return names;
    })
    .catch((error) => {
      console.error("Failed to load bank directory names", error);
      const fallback = mergeUniqueNames(
        mergeUniqueNames(
          [],
          curatedCarLoanBanks.map((row) => String(row?.name || "").trim()),
        ),
        mergeUniqueNames(persisted, supplementalBanks),
      ).sort((a, b) => a.localeCompare(b));
      // Keep retry behavior for next mount, but return robust fallback now.
      cachedNames = null;
      return fallback;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export const useBankDirectoryOptions = () => {
  const [names, setNames] = useState(() =>
    Array.isArray(cachedNames)
      ? cachedNames
      : mergeUniqueNames(
          mergeUniqueNames(
            readPersistedNames(),
            curatedCarLoanBanks.map((row) => String(row?.name || "").trim()),
          ),
          supplementalBanks,
        ),
  );
  const [loading, setLoading] = useState(!Array.isArray(cachedNames));

  useEffect(() => {
    let active = true;
    if (Array.isArray(cachedNames)) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    fetchBankNames().then((result) => {
      if (!active) return;
      setNames(Array.isArray(result) ? result : []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(
    () => names.map((name) => ({ value: name, label: name })),
    [names],
  );

  return { options, names, loading };
};
