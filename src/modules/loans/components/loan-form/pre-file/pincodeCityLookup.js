const FALLBACK_PREFIX_CITY = [
  ["110", "Delhi"],
  ["122", "Gurgaon"],
  ["121", "Faridabad"],
  ["2013", "Noida"],
  ["2010", "Ghaziabad"],
];

const EXACT_PINCODE_ADDRESS_OVERRIDES = {
  110092: {
    city: "East Delhi",
    state: "Delhi",
    area: "",
    district: "East Delhi",
  },
};

const cityCache = new Map();
const addressCache = new Map();

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

export const resolveCityFromPincodeSync = (value) => {
  const pin = normalizePincode(value);
  if (!pin) return "";
  const exactOverride = EXACT_PINCODE_ADDRESS_OVERRIDES[pin];
  if (exactOverride?.city) return exactOverride.city;
  return inferCityFromPincodePrefix(pin);
};

/**
 * Fetch full address details (City/District, State, Area) by Pincode.
 * Uses an exact override first, then the public postal API, then local fallback rules.
 */
export const lookupAddressByPincode = async (value) => {
  const pin = normalizePincode(value);
  if (!pin) return null;
  const exactOverride = EXACT_PINCODE_ADDRESS_OVERRIDES[pin];
  if (exactOverride) {
    addressCache.set(pin, exactOverride);
    cityCache.set(pin, exactOverride.city);
    return exactOverride;
  }
  if (addressCache.has(pin)) return addressCache.get(pin);

  // Helper to fetch with timeout
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  const capitalize = (str) => {
    if (!str) return "";
    return str.split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Public postal pin code API fallback.
  try {
    const res = await fetchWithTimeout(`https://api.postalpincode.in/pincode/${pin}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0].Status === "Success") {
        const postOffices = data[0].PostOffice || [];
        const primary = postOffices[0] || {};
        
        const addressData = {
          city: capitalize(String(primary.District || primary.Division || primary.Block || "").trim()),
          state: capitalize(String(primary.State || "").trim()),
          area: capitalize(String(primary.Name || "").trim()),
          district: capitalize(String(primary.District || "").trim()),
        };

        if (addressData.city) {
          addressCache.set(pin, addressData);
          // Sync to cityCache for lookupCityByPincode
          cityCache.set(pin, addressData.city);
          return addressData;
        }
      }
    }
  } catch (err) {
    console.warn(`Postal Pin Code API fallback failed for ${pin}:`, err.message);
  }

  // Fallback: Static prefixes
  const fallback = inferCityFromPincodePrefix(pin);
  if (fallback) {
    const fallbackData = {
      city: fallback,
      state: "",
      area: "",
      district: fallback,
    };
    addressCache.set(pin, fallbackData);
    cityCache.set(pin, fallback);
    return fallbackData;
  }

  return null;
};

/**
 * Backward compatible function returning a plain string city name.
 */
export const lookupCityByPincode = async (value) => {
  const pin = normalizePincode(value);
  if (!pin) return "";
  const exactOverride = EXACT_PINCODE_ADDRESS_OVERRIDES[pin];
  if (exactOverride?.city) return exactOverride.city;
  if (cityCache.has(pin)) return cityCache.get(pin);

  const address = await lookupAddressByPincode(pin);
  return address ? address.city : "";
};
