const normalizeText = (value) => String(value || "").trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();

export const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
  "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
  "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana",
  "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivali",
  "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
  "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur",
  "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota",
  "Chandigarh", "Guwahati", "Thiruvananthapuram", "Solapur", "Hubli-Dharwad",
  "Tiruchirappalli", "Tiruppur", "Moradabad", "Mysore", "Bareilly", "Gurgaon",
  "Aligarh", "Jalandhar", "Bhubaneswar", "Salem", "Mira-Bhayandar", "Warangal",
  "Guntur", "Bhiwandi", "Saharanpur", "Gorakhpur", "Bikaner", "Amravati",
  "Noida", "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi",
  "Dehradun", "Durgapur", "Asansol", "Nanded", "Kolhapur", "Ajmer",
  "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri",
  "Jhansi", "Ulhasnagar", "Jammu", "Sangli-Miraj-Kupwad", "Mangalore",
  "Erode", "Belgaum", "Ambattur", "Tirunelveli", "Malegaon", "Gaya",
  "Jalgaon", "Udaipur", "Maheshtala", "Davanagere", "Kozhikode", "Kurnool",
  "Rajahmundry", "Bokaro", "South Dumdum", "Bellary", "Patiala", "Gopalpur",
  "Agartala", "Bhagalpur", "Muzaffarnagar", "Bhatpara", "Panihati", "Latur",
  "Dhule", "Tirupati", "Rohtak", "Korba", "Bhilwara", "Berhampur", "Muzaffarpur",
  "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa", "Kamarhati",
  "Sambalpur", "Bilaspur", "Shahjahanpur", "Satara", "Bijapur", "Rampur",
  "Shimoga", "Chandrapur", "Junagadh", "Thrissur", "Alwar", "Bardhaman",
  "Kulti", "Kakinada", "Nizamabad", "Parbhani", "Tumkur", "Khammam",
  "Ozhukarai", "Bihar Sharif", "Panipat", "Darbhanga", "Bally", "Aizawl",
  "Dewas", "Ichalkaranji", "Karnal", "Bathinda", "Jalna", "Eluru",
  "Kirari Suleman Nagar", "Barasat", "Purnia", "Satna", "Mau", "Sonipat",
  "Farrukhabad", "Sagar", "Rourkela", "Durg", "Imphal", "Ratlam",
  "Hapur", "Arrah", "Karimnagar", "Anantapur", "Etawah", "Ambernath",
  "North Dumdum", "Bharatpur", "Begusarai", "New Delhi", "Gandhidham",
  "Baranagar", "Tiruvottiyur", "Puducherry", "Sikar", "Thoothukudi",
  "Raigarh", "Gonder", "Habra", "Bhusawal", "Orai", "Bahraich",
  "Vellore", "Mahesana", "Sambalpur", "Raiganj", "Sirsa", "Danapur",
  "Serampore", "Sultan Pur Majra", "Guna", "Jaunpur", "Panvel", "Shivpuri",
  "Surendranagar Dudhrej", "Unnao", "Hugli and Chinsurah", "Alappuzha",
  "Kottayam", "Machilipatnam", "Shimla", "Adoni", "Udupi", "Katihar",
  "Proddatur", "Mahbubnagar", "Saharsa", "Dibrugarh", "Jorhat", "Hazaribagh",
];

export const CITY_ALIASES = {
  "new delhi": "Delhi",
};

const HARYANA_CITIES = new Set(
  [
    "gurgaon",
    "gurugram",
    "faridabad",
    "sonipat",
    "panipat",
    "karnal",
    "rohtak",
    "sirsa",
  ].map(normalizeKey),
);

const UP_CITIES = new Set(
  [
    "noida",
    "greater noida",
    "ghaziabad",
    "lucknow",
    "kanpur",
    "agra",
    "meerut",
    "varanasi",
    "allahabad",
    "prayagraj",
    "moradabad",
    "bareilly",
    "aligarh",
    "saharanpur",
    "gorakhpur",
    "firozabad",
    "jhansi",
    "mathura",
    "muzaffarnagar",
    "shahjahanpur",
    "rampur",
    "etawah",
    "hapur",
    "mau",
    "farrukhabad",
    "orai",
    "bahraich",
    "jaunpur",
    "unnao",
  ].map(normalizeKey),
);

export const normalizeCityAlias = (city) => {
  const raw = normalizeText(city);
  if (!raw) return "";
  const alias = CITY_ALIASES[raw.toLowerCase()];
  return alias || raw;
};

const readMaybeFormField = (source, field) => {
  if (!source) return "";
  if (typeof source?.getFieldValue === "function") {
    return source.getFieldValue(field) || "";
  }
  return source?.[field] || "";
};

export const resolveVehiclePricingCity = (rawCity, formOrContext = null) => {
  const city = normalizeCityAlias(rawCity);
  const cityKey = normalizeKey(city);

  const stateContext = [
    readMaybeFormField(formOrContext, "state"),
    readMaybeFormField(formOrContext, "permanentState"),
    readMaybeFormField(formOrContext, "officeState"),
    readMaybeFormField(formOrContext, "employmentState"),
  ]
    .map((v) => normalizeKey(v))
    .filter(Boolean)
    .join(" ");

  if (stateContext.includes("haryana") || HARYANA_CITIES.has(cityKey)) {
    return "Gurgaon";
  }

  if (
    stateContext.includes("uttar pradesh") ||
    /\bup\b/.test(stateContext) ||
    UP_CITIES.has(cityKey)
  ) {
    return "Noida";
  }

  return "New-Delhi";
};

export const INDIAN_CITY_OPTIONS = (() => {
  const seen = new Set();
  const normalized = INDIAN_CITIES.map(normalizeCityAlias).filter(Boolean);
  const unique = normalized.filter((city) => {
    const key = city.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique
    .sort((a, b) => a.localeCompare(b))
    .map((city) => ({ value: city, label: city }));
})();
