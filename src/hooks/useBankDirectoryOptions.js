import { useEffect, useMemo, useState } from "react";
import { banksApi } from "../api/banks";
import { curatedCarLoanBanks } from "../constants/lenderHypothecationOptions";

let cachedNames = null;
let inFlight = null;

const extractRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.banks)) return response.banks;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const extractName = (row) => {
  if (!row) return "";
  if (typeof row === "string") return row.trim();
  return String(row.name || row.bankName || row.value || "").trim();
};

const fetchBankNames = async () => {
  if (Array.isArray(cachedNames)) return cachedNames;
  if (inFlight) return inFlight;

  inFlight = Promise.allSettled([
    banksApi.getAll(),
    banksApi.getAll({ limit: 100000 }),
  ])
    .then((results) => {
      const rows = results
        .filter((entry) => entry.status === "fulfilled")
        .flatMap((entry) => extractRows(entry.value));

      const seen = new Set();
      const names = [];

      rows.forEach((row) => {
        const name = extractName(row);
        const key = name.toLowerCase();
        if (!name || seen.has(key)) return;
        seen.add(key);
        names.push(name);
      });

      // Keep fallback values present but do not replace directory values.
      curatedCarLoanBanks.forEach((row) => {
        const name = String(row?.name || "").trim();
        const key = name.toLowerCase();
        if (!name || seen.has(key)) return;
        seen.add(key);
        names.push(name);
      });

      names.sort((a, b) => a.localeCompare(b));
      cachedNames = names;
      return names;
    })
    .catch((error) => {
      console.error("Failed to load bank directory names", error);
      // Do not cache failures forever; allow retry on next mount.
      cachedNames = null;
      return [];
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export const useBankDirectoryOptions = () => {
  const [names, setNames] = useState(() =>
    Array.isArray(cachedNames) ? cachedNames : [],
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
