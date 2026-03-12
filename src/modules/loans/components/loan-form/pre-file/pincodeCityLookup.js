const FALLBACK_PREFIX_CITY = [
  ["110", "Delhi"],
  ["122", "Gurgaon"],
  ["121", "Faridabad"],
  ["2013", "Noida"],
  ["2010", "Ghaziabad"],
];

const cityCache = new Map();

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

export const lookupCityByPincode = async (value) => {
  const pin = normalizePincode(value);
  if (!pin) return "";
  if (cityCache.has(pin)) return cityCache.get(pin);

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    const district = String(
      data?.[0]?.PostOffice?.[0]?.District ||
      data?.[0]?.PostOffice?.[0]?.Block ||
      "",
    ).trim();
    if (district) {
      cityCache.set(pin, district);
      return district;
    }
  } catch {
    // swallow and fallback below
  }

  const fallback = inferCityFromPincodePrefix(pin);
  if (fallback) {
    cityCache.set(pin, fallback);
    return fallback;
  }
  return "";
};

