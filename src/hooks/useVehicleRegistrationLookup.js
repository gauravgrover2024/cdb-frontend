import { useCallback, useEffect, useRef, useState } from "react";
import { vehiclesApi } from "../api/vehicles";
import { normalizeVehicleRegistrationQuery } from "../utils/vehicleRecordAutofill";

const REG_SEARCH_DEBOUNCE_MS = 220;

const buildRegistrationOption = (record = {}) => {
  const registrationNumber = String(
    record?.registrationNumber || record?.registrationNumberNormalized || "",
  ).trim();
  const vehicleMeta = [record?.make, record?.model, record?.variant]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  return {
    value: registrationNumber,
    label: vehicleMeta
      ? `${registrationNumber} • ${vehicleMeta}`
      : registrationNumber,
    record,
  };
};

export const useVehicleRegistrationLookup = ({ minChars = 2, limit = 20 } = {}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestSeqRef = useRef(0);
  const timerRef = useRef(null);
  const optionsRef = useRef([]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const search = useCallback(
    (query) => {
      const normalized = normalizeVehicleRegistrationQuery(query);
      if (normalized.length < minChars) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setLoading(false);
        setOptions([]);
        return;
      }

      const currentSeq = ++requestSeqRef.current;
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          const isLast4SuffixQuery = /^\d{4}$/.test(normalized);
          const effectiveLimit = isLast4SuffixQuery ? Math.max(limit, 5000) : limit;
          const response = await vehiclesApi.searchMasterRecords(
            normalized,
            effectiveLimit,
          );
          const rows = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

          if (currentSeq !== requestSeqRef.current) return;
          setOptions(rows.map((row) => buildRegistrationOption(row)));
        } catch (error) {
          if (currentSeq !== requestSeqRef.current) return;
          setOptions([]);
          console.error("Registration lookup failed", error);
        } finally {
          if (currentSeq === requestSeqRef.current) {
            setLoading(false);
          }
        }
      }, REG_SEARCH_DEBOUNCE_MS);
    },
    [limit, minChars],
  );

  const resolveSelectedRecord = useCallback((value, option) => {
    if (option?.record) return option.record;
    const normalized = normalizeVehicleRegistrationQuery(value);
    return optionsRef.current.find(
      (item) =>
        normalizeVehicleRegistrationQuery(item?.value) === normalized ||
        normalizeVehicleRegistrationQuery(item?.record?.registrationNumberNormalized) ===
          normalized,
    )?.record;
  }, []);

  return { options, loading, search, resolveSelectedRecord };
};

export default useVehicleRegistrationLookup;
