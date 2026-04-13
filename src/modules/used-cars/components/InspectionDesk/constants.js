// ── Core constants ───────────────────────────────────────────────
export const INSPECTION_DONE_STAGE = "Inspection Done";
export const NOGO_REASON = "No-go car";
export const REPORT_VERSION = "cdb-hinglish-pdi-v2";
export const QUEUE_FILTERS = [
  "All",
  "Due Today",
  "Scheduled",
  "Rescheduled",
  "Draft",
  "Completed",
];

export const TYRE_ITEM_KEYS = [
  "frontLeftTyre",
  "frontRightTyre",
  "rearLeftTyre",
  "rearRightTyre",
  "spareTyre",
];

// ── Mandatory photo buckets ──────────────────────────────────────
export const PHOTO_BUCKETS = [
  { key: "frontView", labelEn: "Front View", labelHi: "Aage ki photo" },
  { key: "rearView", labelEn: "Rear View", labelHi: "Peeche ki photo" },
  { key: "leftSide", labelEn: "Left Side Profile", labelHi: "Baayein taraf" },
  { key: "rightSide", labelEn: "Right Side Profile", labelHi: "Daayein taraf" },
  {
    key: "odometer",
    labelEn: "Odometer Closeup",
    labelHi: "Odometer ka photo",
  },
  {
    key: "engineBay",
    labelEn: "Engine Bay Open",
    labelHi: "Engine compartment",
  },
  { key: "rcCopy", labelEn: "RC & Documents", labelHi: "RC aur papers" },
  { key: "tyres", labelEn: "All 4 Tyres", labelHi: "Charon tyre" },
  {
    key: "chassisPlate",
    labelEn: "Chassis Number Plate",
    labelHi: "Chassis number plate",
  },
  {
    key: "interiorDash",
    labelEn: "Dashboard / Interior",
    labelHi: "Dashboard aur andar",
  },
];

// ── Lead verification fields ─────────────────────────────────────
export const LEAD_VERIFICATION_FIELDS = [
  {
    key: "sellerIdentity",
    labelEn: "Seller Identity Matched",
    labelHi: "Seller ki pehchaan confirm hui",
  },
  {
    key: "ownerPresence",
    labelEn: "Registered Owner Present",
    labelHi: "RC waala maalik maujood hai",
  },
  {
    key: "mobileVerified",
    labelEn: "Mobile Number Verified",
    labelHi: "Mobile number sahi hai",
  },
  {
    key: "addressVerified",
    labelEn: "Address Confirmed",
    labelHi: "Address confirm hua",
  },
  {
    key: "rcAvailable",
    labelEn: "RC Book Available",
    labelHi: "RC haath mein hai",
  },
  {
    key: "registrationMatched",
    labelEn: "Registration No. Matched",
    labelHi: "Registration number mela",
  },
  {
    key: "chassisMatched",
    labelEn: "Chassis No. Matched (Physical)",
    labelHi: "Chassis physically match hua",
  },
  {
    key: "engineNumberMatched",
    labelEn: "Engine No. Matched (Physical)",
    labelHi: "Engine number match hua",
  },
  {
    key: "hypothecationConfirmed",
    labelEn: "Hypothecation Status Confirmed",
    labelHi: "Hypothecation confirm hua",
  },
  {
    key: "insuranceConfirmed",
    labelEn: "Insurance Paper Verified",
    labelHi: "Insurance paper dekha",
  },
  {
    key: "challansChecked",
    labelEn: "Challans Checked on Vahan",
    labelHi: "Challan Vahan pe check kiya",
  },
  {
    key: "pucChecked",
    labelEn: "PUC Certificate Verified",
    labelHi: "PUC certificate dekha",
  },
];

// ════════════════════════════════════════════════════════════════
// FIELD-CORRECT FAST OPTION FAMILIES
// ════════════════════════════════════════════════════════════════

export const OPTION_FAMILIES = {
  panel: [
    { value: "Original", severity: "ok" },
    { value: "Scratch", severity: "low" },
    { value: "Dent", severity: "medium" },
    { value: "Repainted", severity: "medium" },
    { value: "Repaired", severity: "high" },
    { value: "Replaced", severity: "high" },
    { value: "Rust", severity: "high" },
  ],
  structural: [
    { value: "OK", severity: "ok" },
    { value: "Repaired", severity: "high" },
    { value: "Replaced", severity: "high" },
    { value: "Rust", severity: "high" },
    { value: "Damaged", severity: "critical" },
  ],
  glass: [
    { value: "OK", severity: "ok" },
    { value: "Scratched", severity: "low" },
    { value: "Chipped", severity: "medium" },
    { value: "Cracked", severity: "high" },
    { value: "Replaced", severity: "medium" },
  ],
  lights: [
    { value: "OK", severity: "ok" },
    { value: "Faded", severity: "low" },
    { value: "Cracked", severity: "medium" },
    { value: "Not Working", severity: "high" },
    { value: "Replaced", severity: "medium" },
  ],
  fitment: [
    { value: "OK", severity: "ok" },
    { value: "Loose", severity: "low" },
    { value: "Damaged", severity: "medium" },
    { value: "Missing", severity: "high" },
    { value: "Replaced", severity: "medium" },
  ],
  tyre: [
    { value: "Good", severity: "ok" },
    { value: "Average", severity: "low" },
    { value: "Low Life", severity: "medium" },
    { value: "Uneven Wear", severity: "medium" },
    { value: "Cut / Bulge", severity: "high" },
    { value: "Replace", severity: "critical" },
  ],
  wheel: [
    { value: "OK", severity: "ok" },
    { value: "Scratched", severity: "low" },
    { value: "Bent", severity: "high" },
    { value: "Cracked", severity: "critical" },
    { value: "Replace", severity: "critical" },
  ],
  mechanical: [
    { value: "OK", severity: "ok" },
    { value: "Monitor", severity: "low" },
    { value: "Leak", severity: "high" },
    { value: "Noise", severity: "medium" },
    { value: "Repair", severity: "high" },
    { value: "Replace", severity: "critical" },
  ],
  electrical: [
    { value: "Working", severity: "ok" },
    { value: "Intermittent", severity: "medium" },
    { value: "Not Working", severity: "high" },
    { value: "Missing", severity: "critical" },
  ],
  safety: [
    { value: "OK", severity: "ok" },
    { value: "Warning", severity: "high" },
    { value: "Deployed", severity: "critical" },
    { value: "Missing", severity: "critical" },
  ],
  verification: [
    { value: "Verified", severity: "ok" },
    { value: "Mismatch", severity: "critical" },
    { value: "Not Available", severity: "high" },
    { value: "Review", severity: "medium" },
  ],
  binary: [
    { value: "Yes", severity: "ok" },
    { value: "No", severity: "high" },
    { value: "NA", severity: "low" },
  ],
  smoke: [
    { value: "None", severity: "ok" },
    { value: "White", severity: "high" },
    { value: "Blue", severity: "critical" },
    { value: "Grey", severity: "high" },
    { value: "Black", severity: "medium" },
  ],
  ac: [
    { value: "Excellent", severity: "ok" },
    { value: "Good", severity: "ok" },
    { value: "Weak", severity: "medium" },
    { value: "Not Cooling", severity: "critical" },
  ],
  road: [
    { value: "Excellent", severity: "ok" },
    { value: "Good", severity: "ok" },
    { value: "Average", severity: "low" },
    { value: "Issue", severity: "high" },
    { value: "Critical", severity: "critical" },
  ],
  market: [
    { value: "A+", severity: "ok" },
    { value: "A", severity: "ok" },
    { value: "B", severity: "low" },
    { value: "C", severity: "medium" },
    { value: "D", severity: "critical" },
  ],
  airbagCount: [
    { value: "0", severity: "critical" },
    { value: "2", severity: "ok" },
    { value: "4", severity: "ok" },
    { value: "6", severity: "ok" },
    { value: "7+", severity: "ok" },
  ],
  keyCount: [
    { value: "1 Key", severity: "medium" },
    { value: "2 Keys", severity: "ok" },
    { value: "3+ Keys", severity: "ok" },
  ],
};

export const ITEM_OPTION_OVERRIDES = {
  firewall: "structural",
  radiatorSupport: "structural",
  lowerCrossMember: "structural",
  upperCrossMember: "structural",
  coreStructure: "structural",
  isWaterlogged: "binary",
  accidentEvidence: "verification",
  headlamps: "lights",
  taillamps: "lights",
  fogLamps: "lights",
  drl: "lights",
  indicators: "lights",
  reverseLight: "lights",
  bumperGrille: "fitment",
  bumpersGrille: "fitment",
  antenna: "fitment",
  alloyWheels: "wheel",
  wheelCaps: "fitment",
  frontLeftTyre: "tyre",
  frontRightTyre: "tyre",
  rearLeftTyre: "tyre",
  rearRightTyre: "tyre",
  spareTyre: "tyre",
  airbagCount: "airbagCount",
  keysCount: "keyCount",
  ownerManual: "binary",
  serviceRecord: "binary",
  marketability: "market",
  odometerConsistency: "verification",
  odometer: "verification",
  registrationMatched: "verification",
};

export const SEVERITY_OPTIONS = [
  {
    value: "Low",
    tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
  },
  {
    value: "Medium",
    tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  },
  {
    value: "High",
    tone: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
  },
  {
    value: "Critical",
    tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  },
];

export const FAMILY_FALLBACKS = {
  body: "panel",
  road: "road",
  market: "market",
  verification: "verification",
  safety: "safety",
  ac: "ac",
  electrical: "electrical",
  mechanical: "mechanical",
};

export const PHOTO_ELIGIBLE_FAMILIES = new Set([
  "panel",
  "structural",
  "glass",
  "lights",
  "fitment",
  "tyre",
  "wheel",
]);

export function getItemOptionFamily(item, section) {
  const rawFamily =
    ITEM_OPTION_OVERRIDES[item.key] ||
    item.preset ||
    section.preset ||
    "mechanical";
  return FAMILY_FALLBACKS[rawFamily] || rawFamily;
}

export function getItemOptions(item, section) {
  const family = getItemOptionFamily(item, section);
  return OPTION_FAMILIES[family] || OPTION_FAMILIES.mechanical;
}

export function isPhotoEligibleItem(item, section) {
  return PHOTO_ELIGIBLE_FAMILIES.has(getItemOptionFamily(item, section));
}

export function getItemOptionMeta(item, section, status) {
  return getItemOptions(item, section).find((entry) => entry.value === status);
}

export function normalizeStatusList(status) {
  if (Array.isArray(status)) return status.filter(Boolean);
  if (!status) return [];
  return [status];
}

export function allowsMultiSelect(item, section) {
  const family = getItemOptionFamily(item, section);
  return ["panel", "glass", "lights", "fitment", "tyre", "wheel"].includes(
    family,
  );
}

export function getStatusSeverity(status, item, section) {
  const statuses = normalizeStatusList(status);
  if (!statuses.length || isPositiveInspectionStatus(statuses)) return "";
  const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
  const topSeverity = statuses.reduce((best, current) => {
    const currentSeverity =
      getItemOptionMeta(item, section, current)?.severity || "medium";
    return severityRank[currentSeverity] > severityRank[best]
      ? currentSeverity
      : best;
  }, "low");
  const map = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return map[topSeverity] || "Medium";
}

export function getOptionTone(option) {
  const value = String(option.value || "").toLowerCase();
  if (
    value === "original" ||
    value === "ok" ||
    value === "good" ||
    value === "working" ||
    value === "verified" ||
    value === "yes" ||
    value === "excellent"
  ) {
    return {
      borderColor: "#bbf7d0",
      background: "transparent",
      color: "#047857",
    };
  }
  if (
    value.includes("replace") ||
    value.includes("missing") ||
    value.includes("not working") ||
    value.includes("deployed") ||
    value.includes("mismatch") ||
    value.includes("critical")
  ) {
    return {
      borderColor: "#fecdd3",
      background: "transparent",
      color: "#be123c",
    };
  }
  if (
    value.includes("repair") ||
    value.includes("rust") ||
    value.includes("crack") ||
    value.includes("leak") ||
    value.includes("noise") ||
    value.includes("bulge")
  ) {
    return {
      borderColor: "#fed7aa",
      background: "transparent",
      color: "#c2410c",
    };
  }
  if (
    value.includes("repaint") ||
    value.includes("dent") ||
    value.includes("uneven") ||
    value.includes("low") ||
    value.includes("warning") ||
    value.includes("weak")
  ) {
    return {
      borderColor: "#fde68a",
      background: "transparent",
      color: "#b45309",
    };
  }
  return {
    borderColor: "#bae6fd",
    background: "transparent",
    color: "#0369a1",
  };
}

export function getOptionActiveTone(option) {
  const value = String(option.value || "").toLowerCase();
  if (
    value === "original" ||
    value === "ok" ||
    value === "good" ||
    value === "working" ||
    value === "verified" ||
    value === "yes" ||
    value === "excellent"
  ) {
    return {
      borderColor: "#065f46",
      background: "#065f46",
      color: "#ffffff",
      boxShadow: "0 14px 30px rgba(6, 95, 70, 0.32)",
    };
  }
  if (
    value.includes("replace") ||
    value.includes("missing") ||
    value.includes("not working") ||
    value.includes("deployed") ||
    value.includes("mismatch") ||
    value.includes("critical")
  ) {
    return {
      borderColor: "#9f1239",
      background: "#9f1239",
      color: "#ffffff",
      boxShadow: "0 14px 30px rgba(159, 18, 57, 0.30)",
    };
  }
  if (
    value.includes("repair") ||
    value.includes("rust") ||
    value.includes("crack") ||
    value.includes("leak") ||
    value.includes("noise") ||
    value.includes("bulge")
  ) {
    return {
      borderColor: "#9a3412",
      background: "#9a3412",
      color: "#ffffff",
      boxShadow: "0 14px 30px rgba(154, 52, 18, 0.28)",
    };
  }
  if (
    value.includes("repaint") ||
    value.includes("dent") ||
    value.includes("uneven") ||
    value.includes("low") ||
    value.includes("warning") ||
    value.includes("weak")
  ) {
    return {
      borderColor: "#a16207",
      background: "#a16207",
      color: "#ffffff",
      boxShadow: "0 14px 30px rgba(161, 98, 7, 0.28)",
    };
  }
  return {
    borderColor: "#075985",
    background: "#075985",
    color: "#ffffff",
    boxShadow: "0 14px 30px rgba(7, 89, 133, 0.26)",
  };
}

// ── Standalone option lists ──────────────────────────────────────

export const TRANSMISSION_OPTS = [
  "Manual 4-speed",
  "Manual 5-speed",
  "Manual 6-speed",
  "Automatic",
  "AMT",
  "CVT",
  "DCT",
  "IMT",
];

export const AIRBAG_OPTS = [
  "0 — Koi airbag nahi",
  "2 — Driver + Co-driver",
  "4 — Front + Side airbags",
  "6 — 6 airbags",
  "7 — 7 airbags",
  "8+ — 8 ya zyada",
];

export const TYRE_BRANDS = [
  "MRF",
  "Apollo",
  "CEAT",
  "Bridgestone",
  "Michelin",
  "Goodyear",
  "TVS",
  "JK Tyre",
  "Yokohama",
  "Other — Koi aur",
];

export const NOGO_REASONS = [
  "Major accident damage — Bada accident damage",
  "Flood damaged — Baadh mein dooba tha",
  "Chassis / frame bent — Chassis tedhi ho gayi",
  "Tampered odometer — Odometer se chedhchad",
  "Chassis number tampered — Chassis number badla gaya",
  "Major engine failure — Engine bahut kharab",
  "Transmission failure — Gearbox fail ho gaya",
  "Airbag deployed / used — Airbag chal chuka hai",
  "Severe body damage — Bahut zyada dent/damage",
  "Documents mismatch — Papers sahi nahi",
  "Price mismatch — Daam zyada maang raha",
  "Flood / Water damage — Paani ghusa tha",
  "Other — Kuch aur wajah",
];

export const SEAT_OPTS = [
  "Fabric — Kapda",
  "Leather — Chamda",
  "Leatherette — Leatherette",
  "Rexine — Rexine",
  "Half Leather — Half chamda",
];

// ── END PART 1 ──────────────────────────────────────────────────
// ── PART 2A of 2J ── Section 1: Exterior Panels & Structure ────

export const INSPECTION_SECTIONS = [
  {
    key: "exteriorPanels",
    titleEn: "Exterior Panels & Structure",
    titleHi: "Bahari Body Panels aur Dhaancha",
    icon: "🚗",
    color: "#0284c7",
    preset: "body",
    items: [
      { key: "bonnet", labelEn: "Bonnet / Hood", labelHi: "Bonnet" },
      { key: "roof", labelEn: "Roof Panel", labelHi: "Chhat ka panel" },
      {
        key: "bootFloor",
        labelEn: "Boot Floor / Tailgate",
        labelHi: "Dickey ka floor aur darwaza",
      },
      { key: "leftFender", labelEn: "Left Fender", labelHi: "Baayein fender" },
      {
        key: "rightFender",
        labelEn: "Right Fender",
        labelHi: "Daayein fender",
      },
      {
        key: "leftFrontDoor",
        labelEn: "Left Front Door",
        labelHi: "Baayein agla darwaza",
      },
      {
        key: "leftRearDoor",
        labelEn: "Left Rear Door",
        labelHi: "Baayein peechla darwaza",
      },
      {
        key: "rightFrontDoor",
        labelEn: "Right Front Door",
        labelHi: "Daayein agla darwaza",
      },
      {
        key: "rightRearDoor",
        labelEn: "Right Rear Door",
        labelHi: "Daayein peechla darwaza",
      },
      {
        key: "leftQuarterPanel",
        labelEn: "Left Quarter Panel",
        labelHi: "Baayein quarter panel",
      },
      {
        key: "rightQuarterPanel",
        labelEn: "Right Quarter Panel",
        labelHi: "Daayein quarter panel",
      },
      {
        key: "frontBumper",
        labelEn: "Front Bumper",
        labelHi: "Aage ka bumper",
      },
      {
        key: "rearBumper",
        labelEn: "Rear Bumper",
        labelHi: "Peeche ka bumper",
      },
      {
        key: "leftRunningBoard",
        labelEn: "Left Running Board / Side Skirt",
        labelHi: "Baayein running board",
      },
      {
        key: "rightRunningBoard",
        labelEn: "Right Running Board / Side Skirt",
        labelHi: "Daayein running board",
      },
      {
        key: "leftAPillar",
        labelEn: "Left A-Pillar",
        labelHi: "Baayein A-pillar",
      },
      {
        key: "rightAPillar",
        labelEn: "Right A-Pillar",
        labelHi: "Daayein A-pillar",
      },
      {
        key: "leftBPillar",
        labelEn: "Left B-Pillar",
        labelHi: "Baayein B-pillar",
      },
      {
        key: "rightBPillar",
        labelEn: "Right B-Pillar",
        labelHi: "Daayein B-pillar",
      },
      {
        key: "leftCPillar",
        labelEn: "Left C-Pillar",
        labelHi: "Baayein C-pillar",
      },
      {
        key: "rightCPillar",
        labelEn: "Right C-Pillar",
        labelHi: "Daayein C-pillar",
      },
      {
        key: "leftApronLeg",
        labelEn: "Left Apron / Apron Leg",
        labelHi: "Baayein apron",
      },
      {
        key: "rightApronLeg",
        labelEn: "Right Apron / Apron Leg",
        labelHi: "Daayein apron",
      },
      { key: "firewall", labelEn: "Firewall / Cowl Top", labelHi: "Firewall" },
      {
        key: "radiatorSupport",
        labelEn: "Radiator Support / Headlight Support",
        labelHi: "Radiator support",
      },
      {
        key: "lowerCrossMember",
        labelEn: "Lower Cross Member",
        labelHi: "Lower cross member",
      },
      {
        key: "upperCrossMember",
        labelEn: "Upper Cross Member",
        labelHi: "Upper cross member",
      },
      {
        key: "underbodyRust",
        labelEn: "Underbody Rust / Corrosion",
        labelHi: "Neeche zang",
      },
      {
        key: "coreStructure",
        labelEn: "Core Structure Integrity",
        labelHi: "Core dhaancha theek hai",
      },
      {
        key: "isWaterlogged",
        labelEn: "Any Waterlogging Evidence",
        labelHi: "Paani ghusa tha kya?",
      },
      {
        key: "accidentEvidence",
        labelEn: "Accident Evidence (repaint/filler)",
        labelHi: "Accident ke nishan",
      },
    ],
  },

  // ── END PART 2A ─────────────────────────────────────────────────
  // ── PART 2B of 2J ── Section 2: Glass, Lights & Exterior Fitments

  {
    key: "fitmentGlass",
    titleEn: "Glass, Lights & Exterior Fitments",
    titleHi: "Sheeshe, Lights aur Bahari Parts",
    icon: "💡",
    color: "#7c3aed",
    preset: "glass",
    items: [
      {
        key: "windshield",
        labelEn: "Front Windshield",
        labelHi: "Aage ka sheesa",
        preset: "glass",
      },
      {
        key: "rearWindshield",
        labelEn: "Rear Windshield",
        labelHi: "Peeche ka sheesa",
        preset: "glass",
      },
      {
        key: "windowGlasses",
        labelEn: "All Window Glasses (4)",
        labelHi: "Charon khidkiyan",
        preset: "glass",
      },
      {
        key: "orvms",
        labelEn: "ORVMs — Both Side Mirrors",
        labelHi: "Dono side mirrors",
        preset: "glass",
      },
      {
        key: "headlamps",
        labelEn: "Headlamps (Both)",
        labelHi: "Dono headlights",
        preset: "body",
      },
      {
        key: "taillamps",
        labelEn: "Tail Lamps (Both)",
        labelHi: "Dono tail lights",
        preset: "body",
      },
      {
        key: "fogLamps",
        labelEn: "Fog Lamps (if fitted)",
        labelHi: "Fog lights",
        preset: "electrical",
      },
      {
        key: "drl",
        labelEn: "DRL / Daytime Running Lights",
        labelHi: "DRL lights",
        preset: "electrical",
      },
      {
        key: "indicators",
        labelEn: "All Indicators (4)",
        labelHi: "Charon indicators",
        preset: "electrical",
      },
      {
        key: "reverseLight",
        labelEn: "Reverse Light",
        labelHi: "Reverse light",
        preset: "electrical",
      },
      {
        key: "wipersWashers",
        labelEn: "Front Wipers & Washers",
        labelHi: "Wiper aur washer",
        preset: "mechanical",
      },
      {
        key: "rearWiper",
        labelEn: "Rear Wiper (if fitted)",
        labelHi: "Peeche ka wiper",
        preset: "mechanical",
      },
      {
        key: "bumpersGrille",
        labelEn: "Bumpers & Grille / Trims",
        labelHi: "Bumper aur grille",
        preset: "body",
      },
      {
        key: "antenna",
        labelEn: "Antenna / Shark Fin",
        labelHi: "Antenna",
        preset: "electrical",
      },
      {
        key: "sunroofGlass",
        labelEn: "Sunroof Glass (if fitted)",
        labelHi: "Sunroof sheesa",
        preset: "glass",
      },
    ],
  },

  // ── END PART 2B ─────────────────────────────────────────────────
  // ── PART 2C of 2J ── Section 3: Wheels, Tyres, Suspension & Brakes

  {
    key: "wheelsTyres",
    titleEn: "Wheels, Tyres, Suspension & Brakes",
    titleHi: "Wheels, Tyre, Suspension aur Brakes",
    icon: "⭕",
    color: "#d97706",
    preset: "tyre",
    items: [
      {
        key: "frontLeftTyre",
        labelEn: "Front Left Tyre",
        labelHi: "Aage baayein tyre",
        preset: "tyre",
        hasTread: true,
        hasBrand: true,
      },
      {
        key: "frontRightTyre",
        labelEn: "Front Right Tyre",
        labelHi: "Aage daayein tyre",
        preset: "tyre",
        hasTread: true,
        hasBrand: true,
      },
      {
        key: "rearLeftTyre",
        labelEn: "Rear Left Tyre",
        labelHi: "Peeche baayein tyre",
        preset: "tyre",
        hasTread: true,
        hasBrand: true,
      },
      {
        key: "rearRightTyre",
        labelEn: "Rear Right Tyre",
        labelHi: "Peeche daayein tyre",
        preset: "tyre",
        hasTread: true,
        hasBrand: true,
      },
      {
        key: "spareTyre",
        labelEn: "Spare Tyre & Toolkit",
        labelHi: "Spare tyre aur toolkit",
        preset: "tyre",
        hasTread: true,
      },
      {
        key: "alloyWheels",
        labelEn: "Alloy Wheel Condition",
        labelHi: "Alloy wheels ka haal",
        preset: "body",
      },
      {
        key: "wheelCaps",
        labelEn: "Wheel Caps / Hub Caps",
        labelHi: "Wheel caps",
        preset: "body",
      },
      {
        key: "suspension",
        labelEn: "Suspension — Shocks & Struts",
        labelHi: "Suspension",
        preset: "mechanical",
      },
      {
        key: "suspensionBushes",
        labelEn: "Suspension Bushes & Ball Joints",
        labelHi: "Bushes aur ball joints",
        preset: "mechanical",
      },
      {
        key: "brakes",
        labelEn: "Brakes — Disc / Drum",
        labelHi: "Brakes",
        preset: "mechanical",
      },
      {
        key: "brakeFluid",
        labelEn: "Brake Fluid Level",
        labelHi: "Brake fluid level",
        preset: "mechanical",
      },
      {
        key: "handbrake",
        labelEn: "Handbrake / Parking Brake",
        labelHi: "Handbrake",
        preset: "mechanical",
      },
      {
        key: "steeringAlignment",
        labelEn: "Steering Alignment / Pull",
        labelHi: "Steering alignment",
        preset: "mechanical",
      },
      {
        key: "steeringRack",
        labelEn: "Steering Rack & Column",
        labelHi: "Steering rack",
        preset: "mechanical",
      },
      {
        key: "powerSteering",
        labelEn: "Power Steering — Fluid / EPS",
        labelHi: "Power steering",
        preset: "mechanical",
      },
    ],
  },

  // ── END PART 2C ─────────────────────────────────────────────────
  // ── PART 2D of 2J ── Section 4: Engine Bay & Transmission ───────

  {
    key: "engineTransmission",
    titleEn: "Engine Bay, Transmission & Mechanicals",
    titleHi: "Engine, Gearbox aur Mechanical Parts",
    icon: "⚙️",
    color: "#dc2626",
    preset: "mechanical",
    items: [
      {
        key: "engineStart",
        labelEn: "Engine Cold Start",
        labelHi: "Thanda engine start karna",
      },
      {
        key: "engineNoise",
        labelEn: "Engine Noise / Vibration",
        labelHi: "Engine ki awaaz ya kaampan",
      },
      {
        key: "engineSmoke",
        labelEn: "Exhaust Smoke Colour",
        labelHi: "Exhaust dhua ka rang",
        preset: "smoke",
      },
      {
        key: "engineLeakage",
        labelEn: "Oil / Coolant Leakage",
        labelHi: "Oil ya coolant ka leak",
      },
      {
        key: "oilLevel",
        labelEn: "Engine Oil Level & Colour",
        labelHi: "Engine oil level aur rang",
      },
      {
        key: "coolantLevel",
        labelEn: "Coolant Level",
        labelHi: "Coolant level",
      },
      {
        key: "batteryCondition",
        labelEn: "Battery Condition",
        labelHi: "Battery ka haal",
      },
      {
        key: "batteryVoltage",
        labelEn: "Battery Voltage (ideal 12.4V+)",
        labelHi: "Battery voltage",
      },
      {
        key: "alternator",
        labelEn: "Alternator & Charging System",
        labelHi: "Alternator",
      },
      {
        key: "coolingSystem",
        labelEn: "Cooling System / Radiator",
        labelHi: "Cooling system",
      },
      {
        key: "acCompressor",
        labelEn: "AC Compressor Belt & Body",
        labelHi: "AC compressor",
      },
      {
        key: "airFilter",
        labelEn: "Air Filter Condition",
        labelHi: "Air filter",
      },
      {
        key: "throttleBody",
        labelEn: "Throttle Body — Clean?",
        labelHi: "Throttle body saaf hai?",
      },
      {
        key: "fuelSystem",
        labelEn: "Fuel Lines / Tank — No Leak",
        labelHi: "Fuel system leak nahi",
      },
      {
        key: "exhaustSystem",
        labelEn: "Exhaust System / Silencer",
        labelHi: "Exhaust aur silencer",
      },
      {
        key: "engineMounting",
        labelEn: "Engine Mounting",
        labelHi: "Engine mounting",
      },
      {
        key: "clutch",
        labelEn: "Clutch Feel & Bite Point",
        labelHi: "Clutch ka feel",
      },
      {
        key: "gearbox",
        labelEn: "Gearbox / Gear Shifting",
        labelHi: "Gearbox aur gear shifting",
      },
      {
        key: "automaticShifts",
        labelEn: "Automatic Transmission Shifts",
        labelHi: "AT gear shifts",
      },
      {
        key: "propshaft",
        labelEn: "Propshaft / CV Joints",
        labelHi: "Propshaft / CV joint",
      },
      {
        key: "timingBelt",
        labelEn: "Timing Belt / Chain Condition",
        labelHi: "Timing belt ya chain",
      },
      {
        key: "cngKit",
        labelEn: "CNG Kit — if fitted",
        labelHi: "CNG kit agar laga ho",
      },
      {
        key: "engineWiring",
        labelEn: "Engine Bay Wiring Harness",
        labelHi: "Engine wiring",
      },
    ],
  },

  // ── END PART 2D ─────────────────────────────────────────────────
  // ── PART 2E of 2J ── Section 5: Interior, Cabin & Electricals ───

  {
    key: "interiorElectrical",
    titleEn: "Interior, Cabin & Electricals",
    titleHi: "Andar ka Haal, Cabin aur Electricals",
    icon: "🪑",
    color: "#059669",
    preset: "electrical",
    items: [
      {
        key: "dashboardTrim",
        labelEn: "Dashboard & Trims",
        labelHi: "Dashboard aur trims",
        preset: "body",
      },
      {
        key: "seatsUpholstery",
        labelEn: "Seats & Upholstery",
        labelHi: "Seats aur kapda",
        preset: "body",
      },
      {
        key: "seatBelts",
        labelEn: "Seat Belts — All",
        labelHi: "Sabke seat belts",
        preset: "safety",
      },
      {
        key: "headliner",
        labelEn: "Headliner / Roof Lining",
        labelHi: "Upar ki lining",
        preset: "body",
      },
      {
        key: "floorCarpet",
        labelEn: "Floor Carpet & Mats",
        labelHi: "Neeche ka carpet",
        preset: "body",
      },
      {
        key: "doorPadsTrim",
        labelEn: "Door Pads & Interior Trims",
        labelHi: "Darwaze ke andar ke pads",
        preset: "body",
      },
      {
        key: "instrumentCluster",
        labelEn: "Instrument Cluster & Warning Lights",
        labelHi: "Cluster aur warning lights",
        preset: "electrical",
      },
      {
        key: "checkEngineLight",
        labelEn: "Check Engine / MIL Light",
        labelHi: "Check engine light",
        preset: "safety",
      },
      {
        key: "absLight",
        labelEn: "ABS Warning Light",
        labelHi: "ABS warning light",
        preset: "safety",
      },
      {
        key: "airbagLight",
        labelEn: "Airbag / SRS Warning Light",
        labelHi: "Airbag warning light",
        preset: "safety",
      },
      {
        key: "batteryLight",
        labelEn: "Battery Warning Light",
        labelHi: "Battery warning light",
        preset: "safety",
      },
      {
        key: "oilPressureLight",
        labelEn: "Oil Pressure Warning Light",
        labelHi: "Oil pressure warning light",
        preset: "safety",
      },
      {
        key: "infotainment",
        labelEn: "Infotainment / Stereo System",
        labelHi: "Infotainment system",
        preset: "electrical",
      },
      {
        key: "speakers",
        labelEn: "Speakers — All Working",
        labelHi: "Sabke speakers",
        preset: "electrical",
      },
      {
        key: "powerWindows",
        labelEn: "Power Windows — All 4",
        labelHi: "Charon power windows",
        preset: "electrical",
      },
      {
        key: "centralLocking",
        labelEn: "Central Locking System",
        labelHi: "Central locking",
        preset: "electrical",
      },
      {
        key: "acCooling",
        labelEn: "AC Cooling & Blower",
        labelHi: "AC thanda aur blower",
        preset: "ac",
      },
      {
        key: "heater",
        labelEn: "Heater Function",
        labelHi: "Heater kaam karta hai?",
        preset: "electrical",
      },
      {
        key: "climateControl",
        labelEn: "Climate Control / Auto AC",
        labelHi: "Climate control",
        preset: "electrical",
      },
      {
        key: "reverseCamera",
        labelEn: "Reverse Camera & Sensors",
        labelHi: "Reverse camera aur sensors",
        preset: "electrical",
      },
      {
        key: "parkingSensors",
        labelEn: "Parking Sensors",
        labelHi: "Parking sensors",
        preset: "electrical",
      },
      {
        key: "cabinLights",
        labelEn: "Cabin Lights & Dome Light",
        labelHi: "Andar ki lights",
        preset: "electrical",
      },
      {
        key: "hornSteeringCtrl",
        labelEn: "Horn & Steering Controls",
        labelHi: "Horn aur steering ke buttons",
        preset: "electrical",
      },
      {
        key: "steeringWheel",
        labelEn: "Steering Wheel Condition",
        labelHi: "Steering wheel ka haal",
        preset: "body",
      },
      {
        key: "gearKnob",
        labelEn: "Gear Knob & Gear Boot",
        labelHi: "Gear knob",
        preset: "body",
      },
      {
        key: "handbrakeHandle",
        labelEn: "Handbrake Handle & Lever",
        labelHi: "Handbrake handle",
        preset: "mechanical",
      },
      {
        key: "sunroof",
        labelEn: "Sunroof Operation (if fitted)",
        labelHi: "Sunroof kaam karta hai?",
        preset: "electrical",
      },
      {
        key: "wirelessCharging",
        labelEn: "Wireless Charging Pad (if fitted)",
        labelHi: "Wireless charging",
        preset: "electrical",
      },
      {
        key: "usbAuxPorts",
        labelEn: "USB / AUX Ports",
        labelHi: "USB aur AUX ports",
        preset: "electrical",
      },
      {
        key: "rearDefogger",
        labelEn: "Rear Defogger",
        labelHi: "Rear defogger",
        preset: "electrical",
      },
      {
        key: "odometer",
        labelEn: "Odometer Reading Consistent",
        labelHi: "Odometer reading sahi lagti",
        preset: "mechanical",
      },
    ],
  },

  // ── END PART 2E ─────────────────────────────────────────────────
  // ── PART 2F of 2J ── Section 6: Safety & Compliance ─────────────

  {
    key: "safety",
    titleEn: "Safety & Compliance",
    titleHi: "Safety aur Compliance",
    icon: "🛡️",
    color: "#4f46e5",
    preset: "safety",
    items: [
      {
        key: "airbags",
        labelEn: "Airbags — Count & Status",
        labelHi: "Airbags — kitne hain aur kaisi haalat",
        preset: "safety",
      },
      {
        key: "airbagCount",
        labelEn: "Number of Airbags",
        labelHi: "Airbags ki sankhya",
        preset: "airbag",
      },
      {
        key: "absEsc",
        labelEn: "ABS / ESC System",
        labelHi: "ABS aur ESC system",
        preset: "safety",
      },
      {
        key: "seatBeltDriver",
        labelEn: "Driver Seat Belt — Pre-tensioner OK",
        labelHi: "Driver seat belt",
        preset: "safety",
      },
      {
        key: "seatBeltPassenger",
        labelEn: "All Passenger Seat Belts",
        labelHi: "Sabke seat belts",
        preset: "safety",
      },
      {
        key: "childLock",
        labelEn: "Child Lock on Rear Doors",
        labelHi: "Rear door child lock",
        preset: "electrical",
      },
      {
        key: "isofix",
        labelEn: "ISOFIX Child Seat Anchors",
        labelHi: "ISOFIX anchors",
        preset: "safety",
      },
      {
        key: "tpms",
        labelEn: "TPMS — Tyre Pressure Alerts",
        labelHi: "TPMS tyre pressure system",
        preset: "electrical",
      },
      {
        key: "warningTriangle",
        labelEn: "Warning Triangle Present",
        labelHi: "Warning triangle hai?",
        preset: "safety",
      },
      {
        key: "firstAidKit",
        labelEn: "First Aid Kit Present",
        labelHi: "First aid kit hai?",
        preset: "safety",
      },
      {
        key: "fireExtinguisher",
        labelEn: "Fire Extinguisher (if applicable)",
        labelHi: "Fire extinguisher",
        preset: "safety",
      },
      {
        key: "keysCount",
        labelEn: "Number of Keys Available",
        labelHi: "Kitni chaabiyan hain?",
        preset: "safety",
      },
      {
        key: "ownerManual",
        labelEn: "Owner's Manual Available",
        labelHi: "Owner manual hai?",
        preset: "safety",
      },
      {
        key: "serviceRecord",
        labelEn: "Service Records Available",
        labelHi: "Service record hai?",
        preset: "safety",
      },
    ],
  },

  // ── END PART 2F ─────────────────────────────────────────────────
  // ── PART 2G of 2J ── Section 7: Road Test & Marketability ───────

  {
    key: "roadTest",
    titleEn: "Road Test & Marketability",
    titleHi: "Road Test aur Bechne layak haal",
    icon: "🛣️",
    color: "#0891b2",
    preset: "road",
    items: [
      {
        key: "pickupDriveability",
        labelEn: "Pickup & Driveability",
        labelHi: "Pickup aur drive ka feel",
        preset: "road",
      },
      {
        key: "brakingRoad",
        labelEn: "Braking on Road",
        labelHi: "Road pe braking",
        preset: "road",
      },
      {
        key: "suspensionNoise",
        labelEn: "Suspension & Cabin Noise",
        labelHi: "Suspension aur andar ki awaaz",
        preset: "road",
      },
      {
        key: "steeringFeel",
        labelEn: "Steering Feel & Response",
        labelHi: "Steering ka feel",
        preset: "road",
      },
      {
        key: "clutchBite",
        labelEn: "Clutch Bite Point (MT only)",
        labelHi: "Clutch bite point",
        preset: "road",
      },
      {
        key: "gearShiftRoad",
        labelEn: "Gear Shift Quality on Road",
        labelHi: "Road pe gear shifting",
        preset: "road",
      },
      {
        key: "autoGearRoad",
        labelEn: "Auto / AMT Shift Quality",
        labelHi: "Auto gear ka kaam",
        preset: "road",
      },
      {
        key: "vibrationSpeed",
        labelEn: "Vibration at High Speed",
        labelHi: "Speed pe kaampan",
        preset: "road",
      },
      {
        key: "pullingLeft",
        labelEn: "Car Pulling Left / Right",
        labelHi: "Gaadi ek taraf khichti hai?",
        preset: "road",
      },
      {
        key: "acOnRoad",
        labelEn: "AC Cooling While Driving",
        labelHi: "Drive karte waqt AC ka thanda",
        preset: "ac",
      },
      {
        key: "odometerConsistency",
        labelEn: "Odometer Reading Consistent",
        labelHi: "Odometer sahi lag raha",
        preset: "road",
      },
      {
        key: "marketability",
        labelEn: "Overall Marketability Grade",
        labelHi: "Bechne ki overall grade",
        preset: "market",
      },
    ],
  },

  // ── END PART 2G
  // ── PART 2H of 2J ── Section 8: AC System | Section 9: OEM Features

  {
    key: "acSystem",
    titleEn: "Air Conditioning System",
    titleHi: "AC System",
    icon: "❄️",
    color: "#0ea5e9",
    preset: "ac",
    items: [
      {
        key: "acCoolingPerf",
        labelEn: "AC Cooling Performance",
        labelHi: "AC thanda karta hai?",
        preset: "ac",
      },
      {
        key: "heaterPerf",
        labelEn: "Heater Performance",
        labelHi: "Heater kaam karta hai?",
        preset: "electrical",
      },
      {
        key: "blowerSpeeds",
        labelEn: "Blower — All Speeds Working",
        labelHi: "Blower ki saari speeds",
        preset: "electrical",
      },
      {
        key: "climateControlAc",
        labelEn: "Climate Control / Auto AC",
        labelHi: "Auto climate control",
        preset: "electrical",
      },
      {
        key: "acLeaks",
        labelEn: "AC Refrigerant Leaks",
        labelHi: "AC mein leak hai?",
        preset: "mechanical",
      },
      {
        key: "acCompressorNoise",
        labelEn: "AC Compressor Noise",
        labelHi: "AC compressor ki awaaz",
        preset: "mechanical",
      },
      {
        key: "condenserCondition",
        labelEn: "AC Condenser Condition",
        labelHi: "AC condenser ka haal",
        preset: "mechanical",
      },
      {
        key: "acFilterClean",
        labelEn: "AC Cabin Filter — Clean?",
        labelHi: "AC cabin filter saaf hai?",
        preset: "mechanical",
      },
    ],
  },

  {
    key: "oemFeatures",
    titleEn: "OEM Features & Specifications Verification",
    titleHi: "Factory Features ki Jaanch",
    icon: "📋",
    color: "#6366f1",
    preset: "verification",
    items: [
      {
        key: "oemPowerWindows",
        labelEn: "Power Windows — Count Verified",
        labelHi: "Power windows confirm",
        preset: "verification",
      },
      {
        key: "oemAirbags",
        labelEn: "Airbag Count — Matches OEM Spec",
        labelHi: "Airbag count OEM se mela",
        preset: "verification",
      },
      {
        key: "oemAbs",
        labelEn: "ABS Fitted as per Variant",
        labelHi: "ABS variant ke hisaab se hai",
        preset: "verification",
      },
      {
        key: "oemEsc",
        labelEn: "ESC / Stability Control",
        labelHi: "ESC stability control",
        preset: "verification",
      },
      {
        key: "oemCentralLock",
        labelEn: "Central Locking — OEM or Aftermarket",
        labelHi: "Central lock OEM ya aftermarket",
        preset: "verification",
      },
      {
        key: "oemRearDefogger",
        labelEn: "Rear Defogger Verified",
        labelHi: "Rear defogger confirm",
        preset: "verification",
      },
      {
        key: "oemReverseCamera",
        labelEn: "Reverse Camera — OEM or Added Later",
        labelHi: "Reverse camera OEM ya baad mein",
        preset: "verification",
      },
      {
        key: "oemParkingSensors",
        labelEn: "Parking Sensors — OEM or Added",
        labelHi: "Parking sensors OEM ya aftermarket",
        preset: "verification",
      },
      {
        key: "oemSunroof",
        labelEn: "Sunroof — OEM or Aftermarket Cut",
        labelHi: "Sunroof OEM ya cut karaya",
        preset: "verification",
      },
      {
        key: "oemAlloys",
        labelEn: "Alloy Wheels — OEM or Changed",
        labelHi: "Alloy wheels OEM ya badle",
        preset: "verification",
      },
      {
        key: "oemInfotainment",
        labelEn: "Infotainment — OEM or Replaced",
        labelHi: "Infotainment OEM ya badla",
        preset: "verification",
      },
      {
        key: "oemSeatUpholstery",
        labelEn: "Seat Upholstery — OEM or Modified",
        labelHi: "Seats OEM ya cover laga",
        preset: "verification",
      },
      {
        key: "oemFogLamps",
        labelEn: "Fog Lamps — OEM or Added Later",
        labelHi: "Fog lamps OEM ya baad mein lage",
        preset: "verification",
      },
      {
        key: "oemKeylessEntry",
        labelEn: "Keyless Entry / Smart Key Present",
        labelHi: "Keyless entry hai?",
        preset: "verification",
      },
      {
        key: "oemPushStart",
        labelEn: "Push Button Start Present",
        labelHi: "Push start hai?",
        preset: "verification",
      },
      {
        key: "oemCruiseControl",
        labelEn: "Cruise Control Present",
        labelHi: "Cruise control hai?",
        preset: "verification",
      },
      {
        key: "oemSteeringAudio",
        labelEn: "Steering Mounted Audio Controls",
        labelHi: "Steering pe music controls",
        preset: "verification",
      },
      {
        key: "oemAndroidAuto",
        labelEn: "Android Auto / Apple CarPlay",
        labelHi: "Android Auto / CarPlay hai?",
        preset: "verification",
      },
      {
        key: "oemGps",
        labelEn: "Built-in GPS / Navigation",
        labelHi: "Built-in GPS hai?",
        preset: "verification",
      },
      {
        key: "oemTpms",
        labelEn: "TPMS — Tyre Pressure Monitor",
        labelHi: "TPMS system hai?",
        preset: "verification",
      },
      {
        key: "oemLaneAssist",
        labelEn: "Lane Assist / ADAS Features",
        labelHi: "Lane assist ya ADAS hai?",
        preset: "verification",
      },
      {
        key: "oemRearAC",
        labelEn: "Rear AC Vents Present",
        labelHi: "Rear AC vents hain?",
        preset: "verification",
      },
      {
        key: "oemAmbientLight",
        labelEn: "Ambient Lighting (if applicable)",
        labelHi: "Ambient lighting hai?",
        preset: "verification",
      },
      {
        key: "oemVentilatedSeats",
        labelEn: "Ventilated / Heated Seats",
        labelHi: "Ventilated seats hain?",
        preset: "verification",
      },
      {
        key: "oemAutoHeadlamps",
        labelEn: "Auto Headlamps / Rain Sensing Wiper",
        labelHi: "Auto headlamps ya rain sensor",
        preset: "verification",
      },
    ],
  },

  // ── END PART 2H (COMPLETE) ───────────────────────────────────────
  // ── PART 2I of 2J ── Close INSPECTION_SECTIONS array ────────────
]; // ← closes INSPECTION_SECTIONS array

// ── Tyre tread depth → life % + remaining km helper ─────────────
export const tyreLifeFromTread = (mm) => {
  const t = Number(mm) || 0;
  if (t >= 7) return { pct: 95, km: "44,000+", color: "#10b981" };
  if (t >= 6) return { pct: 80, km: "36,000", color: "#10b981" };
  if (t >= 5) return { pct: 70, km: "30,000", color: "#10b981" };
  if (t >= 4) return { pct: 55, km: "22,000", color: "#f59e0b" };
  if (t >= 3) return { pct: 40, km: "13,000", color: "#f59e0b" };
  if (t >= 2) return { pct: 20, km: "6,000", color: "#ef4444" };
  return { pct: 5, km: "<2,000", color: "#ef4444" };
};

// ── Score calculator — % complete per section ────────────────────
export const calcSectionScore = (sectionKey, itemValues) => {
  const section = INSPECTION_SECTIONS.find((s) => s.key === sectionKey);
  if (!section) return 0;
  const total = section.items.length;
  if (!total) return 0;
  const filled = section.items.filter((item) => {
    const v = itemValues?.[item.key]?.status;
    return normalizeStatusList(v).length > 0;
  }).length;
  return Math.round((filled / total) * 100);
};

// ── Overall report score (0–100) ─────────────────────────────────
export const calcOverallScore = (itemValues) => {
  const weights = {
    exteriorPanels: 20,
    fitmentGlass: 10,
    wheelsTyres: 10,
    engineTransmission: 20,
    interiorElectrical: 15,
    safety: 10,
    roadTest: 8,
    acSystem: 4,
    oemFeatures: 3,
  };
  let weightedScore = 0;
  let totalWeight = 0;
  INSPECTION_SECTIONS.forEach((section) => {
    const w = weights[section.key] || 0;
    const score = calcSectionScore(section.key, itemValues);
    weightedScore += score * w;
    totalWeight += w * 100;
  });
  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
};

// ── END PART 2I ─────────────────────────────────────────────────
// ── PART 2J of 2J ── File helpers, getInspectionState, buildReportValues ──

// ── File list converters ─────────────────────────────────────────
export const toFileList = (files = [], prefix = "file") =>
  files.map((file, index) => ({
    uid: file.uid || `${prefix}-${index}`,
    name: file.name || `Photo ${index + 1}`,
    status: "done",
    url: file.url || file.thumbUrl || file.preview,
    thumbUrl: file.thumbUrl || file.preview || file.url,
    preview: file.preview || file.thumbUrl || file.url,
    evidenceTag: file.evidenceTag || "",
  }));

export const fromFileList = (files = []) =>
  files.map((file, index) => ({
    uid: file.uid || `upl-${index}`,
    name: file.name || `Photo ${index + 1}`,
    url: file.url || file.thumbUrl || file.preview,
    thumbUrl: file.thumbUrl || file.preview || file.url,
    preview: file.preview || file.thumbUrl || file.url,
    evidenceTag: file.evidenceTag || "",
  }));

export const normalizeEvidenceFiles = (files = []) =>
  files.map((file, index) => ({
    uid: file.uid || `evidence-${index}`,
    name: file.name || `Photo ${index + 1}`,
    status: file.status || "done",
    url: file.url || file.thumbUrl || file.preview,
    thumbUrl: file.thumbUrl || file.preview || file.url,
    preview: file.preview || file.thumbUrl || file.url,
    evidenceTag: file.evidenceTag || "",
  }));
export function isPositiveInspectionStatus(status) {
  if (Array.isArray(status)) status = status.filter(Boolean);
  if (!status) status = [];
  if (!Array.isArray(status)) status = [status];

  const values = status.map((entry) => String(entry || "").toLowerCase());
  if (!values.length) return false;

  const negativeTokens = [
    "scratch", "dent", "repair", "replace", "rust", "crack", "leak",
    "noise", "vibration", "warning", "missing", "mismatch", "issue",
    "critical", "observe", "not working", "very low", "low",
    "black smoke", "blue smoke", "white smoke", "grey smoke",
    "jammed", "damage"
  ];

  return !values.some((value) =>
    negativeTokens.some((token) => value.includes(token)),
  );
}
