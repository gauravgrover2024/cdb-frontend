const FALLBACK_PREFIX_CITY = [
  ["110", "Delhi"],
  ["122", "Gurgaon"],
  ["121", "Faridabad"],
  ["2013", "Noida"],
  ["2010", "Ghaziabad"],
];

const pincodeCache = new Map();

export const normalizePincode = (value) => {
  const pin = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 6);
  return pin.length === 6 ? pin : "";
};

export const inferCityFromPincodePrefix = (value) => {
  const pin = normalizePincode(value);
  if (!pin) return "";
  const hit = FALLBACK_PREFIX_CITY.find(([prefix]) => pin.startsWith(prefix));
  return hit ? hit[1] : "";
};

/**
 * Fetches comprehensive address details (City, State, District, Area) by pincode.
 * Utilizes in-memory caching and prefix fallbacks on API failure.
 */
export const lookupPincodeData = async (value) => {
  const pin = normalizePincode(value);
  if (!pin) return null;

  if (pincodeCache.has(pin)) {
    return pincodeCache.get(pin);
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    
    if (data?.[0]?.Status === "Success" && data?.[0]?.PostOffice?.length > 0) {
      const office = data[0].PostOffice[0];
      const result = {
        city: String(office.District || office.Division || "").trim(),
        state: String(office.State || "").trim(),
        district: String(office.District || "").trim(),
        area: String(office.Name || office.Block || "").trim(),
      };
      pincodeCache.set(pin, result);
      return result;
    }
  } catch (error) {
    console.error(`[lookupPincodeData] API lookup failed for pincode: ${pin}`, error);
  }

  // Fallback if API fails or returns no post offices
  const fallbackCity = inferCityFromPincodePrefix(pin);
  if (fallbackCity) {
    const fallbackResult = {
      city: fallbackCity,
      state: pin.startsWith("110") ? "Delhi" : pin.startsWith("12") ? "Haryana" : pin.startsWith("20") ? "Uttar Pradesh" : "",
      district: fallbackCity,
      area: "",
    };
    pincodeCache.set(pin, fallbackResult);
    return fallbackResult;
  }

  return null;
};

/**
 * Backward compatibility helper for single city/district lookup
 */
export const lookupCityByPincode = async (value) => {
  const data = await lookupPincodeData(value);
  return data ? data.district : "";
};


