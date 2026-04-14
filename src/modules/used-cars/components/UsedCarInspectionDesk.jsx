import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Collapse,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  TimePicker,
  Upload,
  message,
} from "antd";
import { useReactToPrint } from "react-to-print";
import {
  ArrowLeftOutlined,
  CameraOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  INSPECTION_QUEUE_STAGE,
  SAMPLE_LEADS,
  STORAGE_KEY,
} from "./UsedCarLeadManager/constants";
import { dayjs, fmt, fmtInr } from "./UsedCarLeadManager/utils/formatters";
import {
  getInsuranceDisplay,
  getMileage,
  getPrice,
  mkActivity,
  normalizeLeadRecord,
  normText,
} from "./UsedCarLeadManager/utils/leadUtils";

const { TextArea } = Input;
const { Panel } = Collapse;

// ── Core constants ───────────────────────────────────────────────
const INSPECTION_DONE_STAGE = "Inspection Done";
const NOGO_REASON = "No-go car";
const REPORT_VERSION = "cdb-hinglish-pdi-v2";
const QUEUE_FILTERS = [
  "All",
  "Due Today",
  "Scheduled",
  "Rescheduled",
  "Draft",
  "Completed",
];

const TYRE_ITEM_KEYS = [
  "frontLeftTyre",
  "frontRightTyre",
  "rearLeftTyre",
  "rearRightTyre",
  "spareTyre",
];

const DAMAGE_OVERLAY_SHAPES = {
  frontBumper: (
    <path d="M192 40C211 28 232 22 260 22c28 0 49 6 68 18l-8 28c-18-7-37-10-60-10s-42 3-60 10z" />
  ),
  bonnet: (
    <path d="M196 82c20-14 40-20 64-20s44 6 64 20l12 68c-30 10-52 14-76 14s-46-4-76-14z" />
  ),
  windshield: (
    <path d="M208 168c18-8 35-12 52-12s34 4 52 12l8 52c-25 6-40 8-60 8s-35-2-60-8z" />
  ),
  roof: <rect x="210" y="238" width="100" height="180" rx="28" />,
  rearWindshield: (
    <path d="M208 430c25-6 40-8 60-8s35 2 60 8l-8 56c-18 8-35 12-52 12s-34-4-52-12z" />
  ),
  bootFloor: (
    <path d="M196 512c30-10 52-14 76-14s46 4 76 14l-12 68c-20 14-40 20-64 20s-44-6-64-20z" />
  ),
  rearBumper: (
    <path d="M200 614c18 7 37 10 60 10s42-3 60-10l8 28c-19 12-40 18-68 18-28 0-49-6-68-18z" />
  ),
  leftFender: <path d="M160 136c-22 22-34 44-42 80l30 16c8-34 18-57 38-81z" />,
  rightFender: (
    <path d="M360 136c22 22 34 44 42 80l-30 16c-8-34-18-57-38-81z" />
  ),
  leftFrontDoor: (
    <path d="M164 248c8-9 18-14 32-14h16v88h-44c-9 0-15-6-15-16z" />
  ),
  leftRearDoor: (
    <path d="M164 334h48v88h-16c-14 0-24-5-32-14l-11-58c0-10 5-16 11-16" />
  ),
  rightFrontDoor: (
    <path d="M308 234h16c14 0 24 5 32 14l11 58c0 10-5 16-11 16h-48z" />
  ),
  rightRearDoor: (
    <path d="M308 334h48c6 0 11 6 11 16l-11 58c-8 9-18 14-32 14h-16z" />
  ),
  leftQuarterPanel: (
    <path d="M162 432c18 17 34 26 50 30v74h-20c-17 0-31-6-44-19l-10-46c0-17 8-29 24-39" />
  ),
  rightQuarterPanel: (
    <path d="M308 462c16-4 32-13 50-30 16 10 24 22 24 39l-10 46c-13 13-27 19-44 19h-20z" />
  ),
  headlamps: (
    <g>
      <path d="M198 72c20-7 40-10 62-10" />
      <path d="M322 72c-20-7-40-10-62-10" />
    </g>
  ),
  taillamps: (
    <g>
      <path d="M198 610c20 7 40 10 62 10" />
      <path d="M322 610c-20 7-40 10-62 10" />
    </g>
  ),
  orvms: (
    <g>
      <path d="M166 182c-18 4-29 13-39 30" />
      <path d="M354 182c18 4 29 13 39 30" />
    </g>
  ),
  alloyWheels: (
    <g>
      <circle cx="120" cy="212" r="18" />
      <circle cx="400" cy="212" r="18" />
      <circle cx="120" cy="448" r="18" />
      <circle cx="400" cy="448" r="18" />
    </g>
  ),
};

// ── Mandatory photo buckets ──────────────────────────────────────
const PHOTO_BUCKETS = [
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
const LEAD_VERIFICATION_FIELDS = [
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

const OPTION_FAMILIES = {
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

const ITEM_OPTION_OVERRIDES = {
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

const SEVERITY_OPTIONS = [
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

const FAMILY_FALLBACKS = {
  body: "panel",
  road: "road",
  market: "market",
  verification: "verification",
  safety: "safety",
  ac: "ac",
  electrical: "electrical",
  mechanical: "mechanical",
};

function getItemOptionFamily(item, section) {
  const rawFamily =
    ITEM_OPTION_OVERRIDES[item.key] ||
    item.preset ||
    section.preset ||
    "mechanical";
  return FAMILY_FALLBACKS[rawFamily] || rawFamily;
}

function getItemOptions(item, section) {
  const family = getItemOptionFamily(item, section);
  return OPTION_FAMILIES[family] || OPTION_FAMILIES.mechanical;
}

function getItemOptionMeta(item, section, status) {
  return getItemOptions(item, section).find((entry) => entry.value === status);
}

function normalizeStatusList(status) {
  if (Array.isArray(status)) return status.filter(Boolean);
  if (!status) return [];
  return [status];
}

function allowsMultiSelect(item, section) {
  const family = getItemOptionFamily(item, section);
  return ["panel", "glass", "lights", "fitment", "tyre", "wheel"].includes(
    family,
  );
}

function getStatusSeverity(status, item, section) {
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

function getOptionTone(option) {
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
      background: "#f0fdf4",
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
      background: "#fff1f2",
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
      background: "#fff7ed",
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
      background: "#fffbeb",
      color: "#b45309",
    };
  }
  return {
    borderColor: "#bae6fd",
    background: "#f0f9ff",
    color: "#0369a1",
  };
}

function getOptionActiveTone(option) {
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
      borderColor: "#047857",
      background: "#10b981",
      color: "#ffffff",
      boxShadow: "0 10px 24px rgba(5, 150, 105, 0.28)",
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
      borderColor: "#be123c",
      background: "#f43f5e",
      color: "#ffffff",
      boxShadow: "0 10px 24px rgba(225, 29, 72, 0.28)",
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
      borderColor: "#c2410c",
      background: "#f97316",
      color: "#ffffff",
      boxShadow: "0 10px 24px rgba(249, 115, 22, 0.28)",
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
      borderColor: "#b45309",
      background: "#f59e0b",
      color: "#ffffff",
      boxShadow: "0 10px 24px rgba(245, 158, 11, 0.28)",
    };
  }
  return {
    borderColor: "#0369a1",
    background: "#0ea5e9",
    color: "#ffffff",
    boxShadow: "0 10px 24px rgba(2, 132, 199, 0.28)",
  };
}

// ── Standalone option lists ──────────────────────────────────────

const TRANSMISSION_OPTS = [
  "Manual 4-speed",
  "Manual 5-speed",
  "Manual 6-speed",
  "Automatic",
  "AMT",
  "CVT",
  "DCT",
  "IMT",
];

const AIRBAG_OPTS = [
  "0 — Koi airbag nahi",
  "2 — Driver + Co-driver",
  "4 — Front + Side airbags",
  "6 — 6 airbags",
  "7 — 7 airbags",
  "8+ — 8 ya zyada",
];

const TYRE_BRANDS = [
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

const NOGO_REASONS = [
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

const SEAT_OPTS = [
  "Fabric — Kapda",
  "Leather — Chamda",
  "Leatherette — Leatherette",
  "Rexine — Rexine",
  "Half Leather — Half chamda",
];

// ── END PART 1 ──────────────────────────────────────────────────
// ── PART 2A of 2J ── Section 1: Exterior Panels & Structure ────

const INSPECTION_SECTIONS = [
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
    color: "#7c3aed",
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
    color: "#2563eb",
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
const tyreLifeFromTread = (mm) => {
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
const calcSectionScore = (sectionKey, itemValues) => {
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
const calcOverallScore = (itemValues) => {
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
const toFileList = (files = [], prefix = "file") =>
  files.map((file, index) => ({
    uid: file.uid || `${prefix}-${index}`,
    name: file.name || `Photo ${index + 1}`,
    status: "done",
    url: file.url || file.thumbUrl || file.preview,
    thumbUrl: file.thumbUrl || file.preview || file.url,
    preview: file.preview || file.thumbUrl || file.url,
  }));

const fromFileList = (files = []) =>
  files.map((file, index) => ({
    uid: file.uid || `upl-${index}`,
    name: file.name || `Photo ${index + 1}`,
    url: file.url || file.thumbUrl || file.preview,
    thumbUrl: file.thumbUrl || file.preview || file.url,
    preview: file.preview || file.thumbUrl || file.url,
  }));

// ── Inspection state badge ───────────────────────────────────────
const getInspectionState = (lead) => {
  const inspection = lead?.inspection;

  if (lead?.status === "Closed") {
    return {
      key: "closed",
      label: "Closed",
      tone: "bg-slate-100 text-slate-500 border-slate-200",
    };
  }
  if (inspection?.submittedAt) {
    const isNogo = inspection?.verdict === NOGO_REASON;
    return {
      key: "completed",
      label: isNogo ? "No-Go" : "Completed",
      tone: isNogo
        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40"
        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
    };
  }
  if (inspection?.lastOutcome === "rescheduled") {
    return {
      key: "rescheduled",
      label: "Rescheduled",
      tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40",
    };
  }
  if (inspection?.startedAt) {
    return {
      key: "draft",
      label: "Draft",
      tone: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/40",
    };
  }
  return {
    key: "scheduled",
    label: "Scheduled",
    tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/40",
  };
};

// ── Build form initial values from saved lead.inspection ─────────
const buildReportValues = (lead) => {
  const inspection = lead?.inspection || {};
  const report = inspection?.report || {};
  const leadVerif = report?.leadVerification || {};
  const photoBuckets = report?.photoBuckets || {};
  const savedItems = report?.items || {};

  const baseDate =
    inspection?.submittedAt ||
    inspection?.startedAt ||
    lead?.inspectionScheduledAt ||
    new Date().toISOString();

  // Rebuild checklist item values for form
  const items = {};
  INSPECTION_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const saved = savedItems[item.key] || {};
      items[item.key] = {
        status: Array.isArray(saved.status)
          ? saved.status
          : saved.status
            ? [saved.status]
            : [],
        severity: saved.severity || "",
        photos: toFileList(saved.photos || [], item.key),
        // tyre-specific
        ...(item.hasTread ? { treadDepth: saved.treadDepth || "" } : {}),
        ...(item.hasBrand ? { tyreBrand: saved.tyreBrand || "" } : {}),
      };
    });
  });

  return {
    // Visit details
    inspectionId: inspection?.inspectionId || "",
    executiveName: inspection?.executiveName || lead?.assignedTo || "",
    executiveMobile: inspection?.executiveMobile || "",
    inspectionLocation: report?.inspectionLocation || lead?.address || "",
    registrationNumber: report?.registrationNumber || lead?.regNo || "",
    insuranceExpiry: report?.insuranceExpiry
      ? dayjs(report.insuranceExpiry)
      : null,
    inspectionDate: dayjs(baseDate),
    inspectionTime: dayjs(baseDate),

    // Lead verification
    leadVerification: Object.fromEntries(
      LEAD_VERIFICATION_FIELDS.map((f) => [
        f.key,
        leadVerif[f.key] || undefined,
      ]),
    ),

    // Photo buckets
    photoBuckets: Object.fromEntries(
      PHOTO_BUCKETS.map((b) => [
        b.key,
        toFileList(photoBuckets[b.key] || [], b.key),
      ]),
    ),

    // All checklist items
    items,

    // OEM feature counts
    airbagCount: report?.airbagCount || undefined,
    powerWindowCount: report?.powerWindowCount || undefined,
    transmissionType: report?.transmissionType || undefined,
    seatMaterial: report?.seatMaterial || undefined,
    fuelType: report?.fuelType || lead?.fuel || undefined,

    // Final decision
    verdict: inspection?.verdict || undefined,
    noGoReason: inspection?.noGoReason || "",
    estimatedRefurbCost: report?.estimatedRefurbCost || null,
    evaluatorPrice: report?.evaluatorPrice || getPrice(lead) || null,
    negotiationNotes: report?.negotiationNotes || "",
    overallRemarks: inspection?.remarks || report?.overallRemarks || "",
  };
};

// ── Build report payload from form values (for saving) ───────────
const buildReportPayload = (values) => ({
  inspectionLocation: normText(values.inspectionLocation),
  registrationNumber: normText(values.registrationNumber),
  insuranceExpiry: values.insuranceExpiry
    ? dayjs(values.insuranceExpiry).toISOString()
    : "",
  leadVerification: Object.fromEntries(
    LEAD_VERIFICATION_FIELDS.map((f) => [
      f.key,
      values.leadVerification?.[f.key],
    ]),
  ),
  photoBuckets: Object.fromEntries(
    PHOTO_BUCKETS.map((b) => [
      b.key,
      fromFileList(values.photoBuckets?.[b.key] || []),
    ]),
  ),
  items: Object.fromEntries(
    INSPECTION_SECTIONS.flatMap((s) =>
      s.items.map((item) => [
        item.key,
        {
          status: normalizeStatusList(values.items?.[item.key]?.status),
          severity: values.items?.[item.key]?.severity || "",
          photos: fromFileList(values.items?.[item.key]?.photos || []),
          ...(item.hasTread
            ? { treadDepth: values.items?.[item.key]?.treadDepth || "" }
            : {}),
          ...(item.hasBrand
            ? { tyreBrand: values.items?.[item.key]?.tyreBrand || "" }
            : {}),
        },
      ]),
    ),
  ),
  airbagCount: values.airbagCount || "",
  powerWindowCount: values.powerWindowCount || "",
  transmissionType: values.transmissionType || "",
  seatMaterial: values.seatMaterial || "",
  fuelType: values.fuelType || "",
  estimatedRefurbCost: Number(values.estimatedRefurbCost) || null,
  evaluatorPrice: Number(values.evaluatorPrice) || null,
  negotiationNotes: normText(values.negotiationNotes),
  overallRemarks: normText(values.overallRemarks),
  reportVersion: REPORT_VERSION,
  generatedAt: new Date().toISOString(),
});

// ── END PART 2J — END OF ALL PART 2 SUB-PARTS ───────────────────

function fmtInrOrPending(value) {
  return Number(value || 0) > 0 ? fmtInr(value) : "Price pending";
}

function QueueMetric({ label, value, helper, tone = "slate" }) {
  const toneMap = {
    slate: "text-foreground dark:text-card-foreground",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    violet: "text-violet-700 dark:text-violet-300",
    rose: "text-rose-700 dark:text-rose-300",
    sky: "text-sky-700 dark:text-sky-300",
  };
  return (
    <div className="rounded-[22px] border border-border bg-muted/50 px-4 py-3 dark:border-border dark:bg-muted/20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground dark:text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-black tracking-tight ${toneMap[tone] || toneMap.slate}`}
      >
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function ScoreBadge({ score }) {
  const color =
    score >= 75
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40"
      : score >= 50
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40"
        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40";
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${color}`}
    >
      Score {score}%
    </span>
  );
}

function SectionProgressBar({ sectionKey, itemValues }) {
  const score = calcSectionScore(sectionKey, itemValues);
  const color = score >= 75 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted dark:bg-muted">
        <div
          style={{ width: `${score}%`, background: color }}
          className="h-full rounded-full transition-all duration-500"
        />
      </div>
      <span className="w-8 text-right text-[10px] font-bold" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

function TyreLifeBar({ treadMm }) {
  const life = tyreLifeFromTread(treadMm);
  return (
    <div className="mt-2 rounded-[12px] border border-border bg-card px-3 py-2 dark:border-border dark:bg-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground">
          Tyre Life — {life.pct}%
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground">
          ~{life.km} km remaining
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted dark:bg-muted">
        <div
          style={{ width: `${life.pct}%`, background: life.color }}
          className="h-full rounded-full transition-all duration-500"
        />
      </div>
    </div>
  );
}

function OverallScoreRing({ score }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-4">
      <Progress type="circle" percent={score} size={72} strokeColor={color} />
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Inspection completeness
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Checklist completion across all major sections
        </p>
      </div>
    </div>
  );
}

function getSectionOrder(sectionKey) {
  const index = INSPECTION_SECTIONS.findIndex(
    (section) => section.key === sectionKey,
  );
  return index >= 0 ? String(index + 1).padStart(2, "0") : "--";
}

function InspectionQueueCard({ lead, active, onClick }) {
  const state = getInspectionState(lead);
  const schedule =
    lead?.inspection?.rescheduledAt || lead?.inspectionScheduledAt;
  const isToday = schedule && dayjs(schedule).isSame(dayjs(), "day");
  const isOverdue =
    schedule && dayjs(schedule).isBefore(dayjs()) && state.key === "scheduled";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm dark:border-primary dark:bg-primary dark:text-primary-foreground"
          : "border-border bg-card hover:border-input dark:border-border dark:bg-card dark:hover:bg-secondary"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">
            {lead.name}
          </p>
          <p
            className={`mt-1 text-xs font-medium ${active ? "text-primary-foreground/70 dark:text-foreground/70" : "text-muted-foreground dark:text-muted-foreground"}`}
          >
            {lead.mobile} · {lead.make} {lead.model}
            {lead.variant ? ` ${lead.variant}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${state.tone}`}
          >
            {state.label}
          </span>
          {isOverdue ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              OVERDUE
            </span>
          ) : null}
          {isToday && !isOverdue ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              TODAY
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div
          className={`rounded-[14px] px-3 py-2 ${active ? "bg-white/10 dark:bg-black/10" : "bg-slate-50 dark:bg-white/[0.04]"}`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}
          >
            Executive
          </p>
          <p className="mt-1 truncate text-xs font-bold">
            {lead.inspection?.executiveName ||
              lead.assignedTo ||
              "Not assigned"}
          </p>
          <p
            className={`mt-0.5 text-[10px] font-medium ${active ? "text-white/60 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"}`}
          >
            {lead.inspection?.executiveMobile || "Mobile pending"}
          </p>
        </div>
        <div
          className={`rounded-[14px] px-3 py-2 ${active ? "bg-white/10 dark:bg-black/10" : "bg-slate-50 dark:bg-white/[0.04]"}`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}
          >
            Slot
          </p>
          <p className="mt-1 text-xs font-bold">
            {schedule ? fmt(schedule) : "Not scheduled"}
          </p>
          <p
            className={`mt-0.5 text-[10px] font-medium ${active ? "text-white/60 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"}`}
          >
            {lead.regNo || "Reg pending"} · {getMileage(lead) || "Kms pending"}
          </p>
        </div>
      </div>
      <div
        className={`mt-2 flex items-center justify-between text-xs font-medium ${active ? "text-white/72 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}
      >
        <span>{getInsuranceDisplay(lead) || "Insurance pending"}</span>
        <span
          className={`font-bold ${active ? "text-white dark:text-slate-950" : "text-slate-800 dark:text-slate-200"}`}
        >
          {fmtInrOrPending(getPrice(lead))}
        </span>
      </div>
      {state.key === "draft" ? (
        <div className="mt-3">
          <p
            className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55" : "text-slate-400 dark:text-slate-500"}`}
          >
            Report Progress
          </p>
          <SectionProgressBar
            sectionKey="exteriorPanels"
            itemValues={lead.inspection?.report?.items}
          />
        </div>
      ) : null}
    </button>
  );
}

function VerificationCard({ field }) {
  const form = Form.useFormInstance();
  const checked = Form.useWatch(["leadVerification", field.key], form);
  const activeStyle = checked
    ? {
        borderColor: "#047857",
        background: "#10b981",
        color: "#ffffff",
        boxShadow: "0 10px 24px rgba(5, 150, 105, 0.28)",
      }
    : undefined;
  return (
    <button
      type="button"
      onClick={() =>
        form.setFieldValue(["leadVerification", field.key], !checked)
      }
      style={activeStyle}
      className={`w-full rounded-[18px] border px-4 py-3 text-left transition-all ${
        checked
          ? ""
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#11151b]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-black ${
              checked
                ? "border-white bg-white text-emerald-700"
                : "border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500"
            }`}
          >
            {checked ? "✓" : ""}
          </span>
          <div>
            <p
              className={`text-sm font-semibold ${
                checked ? "text-white" : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {field.labelEn}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
            checked
              ? "border-white/70 bg-white text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
          }`}
        >
          {checked ? "Verified" : "Pending"}
        </span>
      </div>
    </button>
  );
}

function SectionItemCard({
  item,
  section,
  formName,
  autoOpen,
  clearAutoOpen,
  onAdvance,
  onSeedTyreBrand,
}) {
  const itemRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const options = getItemOptions(item, section);
  const multiSelect = allowsMultiSelect(item, section);
  const isTyre = Boolean(item.hasTread);
  const hasBrand = Boolean(item.hasBrand);
  const form = Form.useFormInstance();
  const statusVal = normalizeStatusList(
    Form.useWatch([formName, item.key, "status"], form),
  );
  const severityVal = Form.useWatch([formName, item.key, "severity"], form);
  const treadVal = Form.useWatch([formName, item.key, "treadDepth"], form);
  const photoList = Form.useWatch([formName, item.key, "photos"], form) || [];

  useEffect(() => {
    if (!autoOpen || !itemRef.current) return;
    itemRef.current.scrollIntoView({
      behavior: "auto",
      block: "center",
      inline: "nearest",
    });
    const timeout = window.setTimeout(() => clearAutoOpen(), 120);
    return () => window.clearTimeout(timeout);
  }, [autoOpen, clearAutoOpen]);

  useEffect(
    () => () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    },
    [],
  );

  const handleStatusSelect = useCallback(
    (status) => {
      const currentValue = form.getFieldValue([formName, item.key]) || {};
      const currentStatuses = normalizeStatusList(currentValue.status);
      const nextStatuses = multiSelect
        ? currentStatuses.includes(status)
          ? currentStatuses.filter((entry) => entry !== status)
          : [...currentStatuses, status]
        : currentStatuses[0] === status
          ? []
          : [status];
      form.setFieldValue([formName, item.key], {
        ...currentValue,
        status: nextStatuses,
        severity: nextStatuses.length
          ? currentValue.severity ||
            getStatusSeverity(nextStatuses, item, section)
          : "",
      });
      if (!nextStatuses.length) return;
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
      if (multiSelect) {
        advanceTimerRef.current = window.setTimeout(() => {
          onAdvance(item.key);
        }, 90);
        return;
      }
      onAdvance(item.key);
    },
    [form, formName, item, multiSelect, onAdvance, section],
  );

  return (
    <div
      ref={itemRef}
      data-inspection-item={item.key}
      className={`rounded-[18px] border px-4 py-4 transition-all ${
        autoOpen
          ? "border-sky-400 bg-sky-50/70 shadow-[0_0_0_3px_rgba(14,165,233,0.10)] dark:border-sky-400/70 dark:bg-sky-500/10"
          : "border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {item.labelEn}
          </p>
        </div>
        <span className="mt-0.5 shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:border-white/10 dark:text-slate-500">
          Photo
        </span>
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          Condition
        </p>
        {multiSelect ? (
          <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Multiple conditions can be selected for one part.
          </p>
        ) : null}
        {statusVal.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              Selected
            </span>
            {statusVal.map((status) => {
              const meta = getItemOptionMeta(item, section, status) || {
                value: status,
              };
              const activeTone = getOptionActiveTone(meta);
              return (
                <span
                  key={status}
                  style={activeTone}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
                >
                  {status}
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((option) => {
            const active = statusVal.includes(option.value);
            const tone = getOptionTone(option);
            const activeTone = getOptionActiveTone(option);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleStatusSelect(option.value)}
                style={active ? activeTone : tone}
                className={`relative z-10 cursor-pointer rounded-full border-2 px-4 py-2.5 text-sm font-bold leading-none transition-all ${
                  active
                    ? "scale-[1.02] ring-2 ring-offset-2 ring-offset-white ring-slate-900/10 dark:ring-white/20 dark:ring-offset-[#0f1319]"
                    : "border-opacity-60 opacity-75 hover:scale-[1.01] hover:opacity-100 hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-white/20"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {active ? <span className="text-[11px]">✓</span> : null}
                  <span>{option.value}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {statusVal.length > 0 && !isPositiveInspectionStatus(statusVal) ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Severity
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  form.setFieldValue(
                    [formName, item.key, "severity"],
                    option.value,
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  severityVal === option.value
                    ? `${option.tone} shadow-sm`
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-white/20"
                }`}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isTyre ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Form.Item
            label={
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Tread Depth (mm)
              </span>
            }
            name={[formName, item.key, "treadDepth"]}
            className="!mb-0"
          >
            <InputNumber
              min={0}
              max={12}
              step={0.5}
              placeholder="e.g. 4.5"
              className="w-full"
              addonAfter="mm"
            />
          </Form.Item>
          {hasBrand ? (
            <Form.Item
              label={
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Tyre Brand
                </span>
              }
              name={[formName, item.key, "tyreBrand"]}
              className="!mb-0"
            >
              <Select
                placeholder="Brand chunein..."
                showSearch
                allowClear
                options={TYRE_BRANDS.map((v) => ({ value: v, label: v }))}
                onChange={(value) => onSeedTyreBrand(item.key, value)}
              />
            </Form.Item>
          ) : null}
        </div>
      ) : null}
      {isTyre && treadVal > 0 ? <TyreLifeBar treadMm={treadVal} /> : null}
      <Form.Item
        label={
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Photos / Tasveerein
          </span>
        }
        name={[formName, item.key, "photos"]}
        valuePropName="fileList"
        getValueFromEvent={(e) => e?.fileList}
        className="!mb-0 mt-3"
      >
        <Upload
          beforeUpload={() => false}
          multiple
          listType="picture"
          accept="image/*"
        >
          <Button
            icon={<CameraOutlined />}
            size="small"
            className="!rounded-full !text-xs"
          >
            Attach Photos
          </Button>
        </Upload>
      </Form.Item>
      <p className="mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
        {photoList.length
          ? `${photoList.length} evidence photo${photoList.length > 1 ? "s" : ""} attached`
          : "Attach clear evidence photos only when needed."}
      </p>
    </div>
  );
}

function ReportSummaryCard({ reportLead }) {
  const reportItems = reportLead?.inspection?.report?.items || {};
  const score = calcOverallScore(reportItems);
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <QueueMetric
        label="Inspection ID"
        value={reportLead.inspection?.inspectionId || "Not generated"}
        helper="Auto-generated for this visit"
      />
      <QueueMetric
        label="Seller Ask"
        value={fmtInrOrPending(getPrice(reportLead))}
        helper={`${getMileage(reportLead) || "Kms pending"} · ${reportLead.ownership || "Ownership pending"}`}
        tone="emerald"
      />
      <QueueMetric
        label="Insurance"
        value={getInsuranceDisplay(reportLead) || "Pending"}
        helper={`Hypothecation: ${reportLead.hypothecation === true ? "Yes" : reportLead.hypothecation === false ? "No" : "Unknown"}`}
        tone="amber"
      />
      <QueueMetric
        label="Scheduled For"
        value={fmt(
          reportLead.inspection?.rescheduledAt ||
            reportLead.inspectionScheduledAt ||
            new Date(),
        )}
        helper="Field visit slot"
        tone="violet"
      />
      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Overall Score
        </p>
        <div className="mt-3">
          <OverallScoreRing score={score} />
        </div>
      </div>
    </div>
  );
}

function getStoredFileSrc(file) {
  return file?.url || file?.thumbUrl || file?.preview || "";
}

function compactStatus(status) {
  const statuses = normalizeStatusList(status).map((entry) =>
    String(entry).split("—")[0].trim(),
  );
  if (!statuses.length) return "Not marked";
  if (statuses.length === 1) return statuses[0];
  if (statuses.length === 2) return `${statuses[0]} and ${statuses[1]}`;
  return `${statuses.slice(0, -1).join(", ")} and ${statuses.at(-1)}`;
}

function isPositiveInspectionStatus(status) {
  const values = normalizeStatusList(status).map((entry) =>
    String(entry || "").toLowerCase(),
  );
  if (!values.length) return false;
  const negativeTokens = [
    "scratch",
    "dent",
    "repair",
    "replace",
    "rust",
    "crack",
    "leak",
    "noise",
    "vibration",
    "warning",
    "missing",
    "mismatch",
    "issue",
    "critical",
    "observe",
    "not working",
    "very low",
    "low",
    "black smoke",
    "blue smoke",
    "white smoke",
    "grey smoke",
    "jammed",
    "damage",
  ];
  return !values.some((value) =>
    negativeTokens.some((token) => value.includes(token)),
  );
}

function getSectionCounts(section, itemValues) {
  return section.items.reduce(
    (acc, item) => {
      const status = itemValues?.[item.key]?.status;
      if (!normalizeStatusList(status).length) return acc;
      if (isPositiveInspectionStatus(status)) acc.good += 1;
      else acc.issue += 1;
      return acc;
    },
    { good: 0, issue: 0 },
  );
}

function getMediaDiscipline(photoBuckets = {}, itemValues = {}) {
  const requiredPhotos = PHOTO_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.labelEn,
    files: photoBuckets[bucket.key] || [],
  }));
  const capturedRequired = requiredPhotos.filter(
    (bucket) => bucket.files.length,
  ).length;
  const defectItems = INSPECTION_SECTIONS.flatMap((section) =>
    section.items
      .map((item) => ({
        key: item.key,
        label: item.labelEn,
        status: itemValues?.[item.key]?.status,
        photos: itemValues?.[item.key]?.photos || [],
      }))
      .filter(
        (item) => item.status && !isPositiveInspectionStatus(item.status),
      ),
  );
  const defectPhotosCaptured = defectItems.filter(
    (item) => item.photos.length,
  ).length;

  return {
    requiredTotal: requiredPhotos.length,
    requiredCaptured: capturedRequired,
    missingBuckets: requiredPhotos
      .filter((bucket) => !bucket.files.length)
      .map((bucket) => bucket.label),
    defectTotal: defectItems.length,
    defectPhotosCaptured,
    missingDefectPhotos: defectItems
      .filter((item) => !item.photos.length)
      .map((item) => item.label),
  };
}

function buildSmartAutoSummary({ lead, report, itemValues, mediaDiscipline }) {
  const allIssues = INSPECTION_SECTIONS.flatMap((section) =>
    section.items
      .map((item) => {
        const value = itemValues?.[item.key] || {};
        if (!value.status || isPositiveInspectionStatus(value.status)) {
          return null;
        }
        return {
          section: section.titleEn,
          label: item.labelEn,
          status: compactStatus(value.status),
          severity:
            value.severity || getStatusSeverity(value.status, item, section),
        };
      })
      .filter(Boolean),
  );

  const criticalIssues = allIssues.filter(
    (issue) => issue.severity === "Critical" || issue.severity === "High",
  );

  const worstSection = INSPECTION_SECTIONS.map((section) => ({
    key: section.key,
    title: section.titleEn,
    ...getSectionCounts(section, itemValues),
  })).sort((a, b) => b.issue - a.issue)[0];

  const bullets = [
    criticalIssues.length
      ? `${criticalIssues.length} major issue${criticalIssues.length > 1 ? "s" : ""} flagged across ${worstSection?.title || "the vehicle"}`
      : "No major structural or mechanical concern flagged in the filled checklist",
    mediaDiscipline.missingBuckets.length
      ? `${mediaDiscipline.requiredCaptured}/${mediaDiscipline.requiredTotal} mandatory photo buckets captured`
      : "All mandatory photo buckets captured for reviewer confidence",
    report?.estimatedRefurbCost
      ? `Expected refurb budget estimated at ${fmtInr(report.estimatedRefurbCost)}`
      : "Refurb budget still needs evaluator confirmation",
  ];

  const narrative = criticalIssues.length
    ? `Vehicle shows ${criticalIssues.length} major finding${criticalIssues.length > 1 ? "s" : ""}. Focus review on ${criticalIssues
        .slice(0, 3)
        .map((issue) => issue.label)
        .join(", ")} before price closure.`
    : `Vehicle looks commercially workable from the current inspection inputs. Review photo evidence, OEM checks, and pricing notes before moving ahead.`;

  return {
    bullets,
    narrative,
    criticalIssues: criticalIssues.slice(0, 6),
    allIssues,
  };
}

function DocumentPage({ children, className = "" }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1319] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_32%),linear-gradient(135deg,rgba(248,250,252,0.95),rgba(239,246,255,0.8))] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_32%),linear-gradient(135deg,rgba(15,19,25,0.98),rgba(20,30,47,0.92))]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[72px] font-black tracking-[0.22em] text-slate-100/80 dark:text-white/[0.03]">
        INSPECTION REPORT
      </div>
      <div className="relative p-6 md:p-8">{children}</div>
    </section>
  );
}

function DocumentStat({ label, value, helper, tone = "slate" }) {
  const toneMap = {
    slate: "text-slate-900 dark:text-slate-100",
    blue: "text-sky-700 dark:text-sky-300",
    green: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    rose: "text-rose-700 dark:text-rose-300",
  };
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-black tracking-tight ${toneMap[tone] || toneMap.slate}`}
      >
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function StatusChip({ status }) {
  const positive = isPositiveInspectionStatus(status);
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
        status
          ? positive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
      }`}
    >
      {compactStatus(status)}
    </span>
  );
}

function ReportPhotoTile({ title, file }) {
  const src = getStoredFileSrc(file);
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <div className="aspect-[1.2/0.82] bg-slate-100 dark:bg-white/[0.05]">
        {src ? (
          <img src={src} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
            <CameraOutlined style={{ fontSize: 28 }} />
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {file?.name || "Photo pending"}
        </p>
      </div>
    </div>
  );
}

function DamageVisibilityMap({ itemValues }) {
  const mappedIssues = INSPECTION_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => DAMAGE_OVERLAY_SHAPES[item.key])
      .map((item) => {
        const value = itemValues?.[item.key] || {};
        if (!value.status || isPositiveInspectionStatus(value.status))
          return null;
        return {
          key: item.key,
          label: item.labelEn,
          status: compactStatus(value.status),
        };
      })
      .filter(Boolean),
  );

  const getOverlayTone = (status) => {
    const value = String(status || "").toLowerCase();
    if (
      value.includes("replace") ||
      value.includes("missing") ||
      value.includes("critical")
    ) {
      return { fill: "rgba(220, 38, 38, 0.22)", stroke: "#dc2626" };
    }
    if (
      value.includes("repair") ||
      value.includes("rust") ||
      value.includes("crack") ||
      value.includes("leak")
    ) {
      return { fill: "rgba(249, 115, 22, 0.22)", stroke: "#f97316" };
    }
    if (
      value.includes("repaint") ||
      value.includes("scratch") ||
      value.includes("dent") ||
      value.includes("warning")
    ) {
      return { fill: "rgba(245, 158, 11, 0.22)", stroke: "#f59e0b" };
    }
    return { fill: "rgba(14, 165, 233, 0.20)", stroke: "#0ea5e9" };
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="relative mx-auto h-[760px] max-w-[960px] overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f6f9ff)] p-8 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,19,25,0.98),rgba(20,30,47,0.92))]">
        <svg
          viewBox="0 0 520 700"
          className="absolute left-1/2 top-[42px] h-[676px] w-[452px] -translate-x-1/2"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="reportCarBody" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f8fbff" />
              <stop offset="100%" stopColor="#edf4ff" />
            </linearGradient>
            <linearGradient id="reportGlassTint" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#eef4ff" />
              <stop offset="100%" stopColor="#d7e8ff" />
            </linearGradient>
            <filter id="carShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="14"
                stdDeviation="18"
                floodColor="#0f172a"
                floodOpacity="0.08"
              />
            </filter>
          </defs>
          <path
            d="M260 18c55 0 96 20 121 64l31 56c33 18 54 46 61 86v252c-7 40-28 68-61 86l-31 56c-25 44-66 64-121 64s-96-20-121-64l-31-56c-33-18-54-46-61-86V224c7-40 28-68 61-86l31-56c25-44 66-64 121-64Z"
            fill="#dbe7f6"
            opacity="0.45"
          />
          <path
            d="M260 24c51 0 89 18 112 58l28 51c33 15 53 42 60 80v274c-7 38-27 65-60 80l-28 51c-23 40-61 58-112 58s-89-18-112-58l-28-51c-33-15-53-42-60-80V213c7-38 27-65 60-80l28-51c23-40 61-58 112-58Z"
            fill="url(#reportCarBody)"
            stroke="#b8cce6"
            strokeWidth="6"
            filter="url(#carShadow)"
          />
          <path
            d="M196 158c20-10 41-15 64-15s44 5 64 15l13 70c-27 8-50 11-77 11s-50-3-77-11Z"
            fill="url(#reportGlassTint)"
            stroke="#b9d3f5"
            strokeWidth="3"
          />
          <path
            d="M183 469c28 8 49 11 77 11s49-3 77-11l-13 72c-20 10-41 15-64 15s-44-5-64-15Z"
            fill="url(#reportGlassTint)"
            stroke="#b9d3f5"
            strokeWidth="3"
          />
          <rect
            x="108"
            y="190"
            width="34"
            height="90"
            rx="17"
            fill="#f8fbff"
            stroke="#8aa6c9"
            strokeWidth="4"
          />
          <rect
            x="378"
            y="190"
            width="34"
            height="90"
            rx="17"
            fill="#f8fbff"
            stroke="#8aa6c9"
            strokeWidth="4"
          />
          <rect
            x="108"
            y="418"
            width="34"
            height="90"
            rx="17"
            fill="#f8fbff"
            stroke="#8aa6c9"
            strokeWidth="4"
          />
          <rect
            x="378"
            y="418"
            width="34"
            height="90"
            rx="17"
            fill="#f8fbff"
            stroke="#8aa6c9"
            strokeWidth="4"
          />
          <path
            d="M260 88v528"
            stroke="#d9e5f4"
            strokeWidth="2.5"
            strokeDasharray="8 10"
          />
          <g fill="#fbfdff" stroke="#c3d6ed" strokeWidth="2.5">
            {Object.entries(DAMAGE_OVERLAY_SHAPES).map(([key, shape]) =>
              React.cloneElement(shape, {
                key: `base-${key}`,
              }),
            )}
          </g>
          <path d="M168 238h184" stroke="#dbe7f4" strokeWidth="2.5" />
          <path d="M168 334h184" stroke="#dbe7f4" strokeWidth="2.5" />
          <path d="M168 430h184" stroke="#dbe7f4" strokeWidth="2.5" />
          <path d="M208 238v194" stroke="#dbe7f4" strokeWidth="2" />
          <path d="M312 238v194" stroke="#dbe7f4" strokeWidth="2" />
          {mappedIssues.map((issue) => {
            const shape = DAMAGE_OVERLAY_SHAPES[issue.key];
            if (!shape) return null;
            const tone = getOverlayTone(issue.status);
            return React.cloneElement(shape, {
              key: `overlay-${issue.key}`,
              fill: tone.fill,
              stroke: tone.stroke,
              strokeWidth: 3,
            });
          })}
        </svg>
      </div>
    </div>
  );
}

function InspectionReportDocumentView({
  reportLead,
  onBack,
  onEdit,
  onDownload,
  printRef,
}) {
  const report = reportLead?.inspection?.report || {};
  const itemValues = report.items || {};
  const photoBuckets = report.photoBuckets || {};
  const leadVerification = report.leadVerification || {};
  const score = calcOverallScore(itemValues);
  const submittedAt =
    reportLead?.inspection?.submittedAt ||
    report?.generatedAt ||
    reportLead?.inspection?.startedAt ||
    new Date().toISOString();
  const leadDate =
    reportLead?.inspection?.rescheduledAt || reportLead?.inspectionScheduledAt;
  const verdict = reportLead?.inspection?.verdict || "Submitted";
  const bucketCards = PHOTO_BUCKETS.map((bucket) => ({
    title: bucket.labelEn,
    file: (photoBuckets[bucket.key] || [])[0] || null,
  })).filter((entry) => entry.file);
  const heroPhoto =
    (photoBuckets.frontView || [])[0] ||
    (photoBuckets.leftSide || [])[0] ||
    (photoBuckets.rightSide || [])[0] ||
    bucketCards[0]?.file ||
    null;
  const summarySections = INSPECTION_SECTIONS.map((section) => ({
    ...section,
    completion: calcSectionScore(section.key, itemValues),
    ...getSectionCounts(section, itemValues),
  }));
  const mediaDiscipline = getMediaDiscipline(photoBuckets, itemValues);
  const autoSummary = buildSmartAutoSummary({
    lead: reportLead,
    report,
    itemValues,
    mediaDiscipline,
  });
  const reportHighlights = [
    report?.registrationNumber || reportLead?.regNo || "Registration pending",
    reportLead?.mfgYear || "Year pending",
    reportLead?.fuel || report?.fuelType || "Fuel pending",
    getMileage(reportLead) || "Kms pending",
  ];

  return (
    <section className="space-y-5">
      <style>{`
        @media print {
          .inspection-report-toolbar {
            display: none !important;
          }
          .inspection-report-pages {
            max-width: 100% !important;
          }
          .inspection-report-pages section {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div className="inspection-report-toolbar rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              <FileTextOutlined />
              Inspection Report
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-[28px]">
              {reportLead.make} {reportLead.model} {reportLead.variant}
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              {reportLead.name} · {reportLead.mobile} · Generated{" "}
              {fmt(submittedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
              className="!rounded-full"
            >
              Back to Queue
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={onDownload}
              className="!rounded-full"
            >
              Download Report
            </Button>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={onEdit}
              className="!rounded-full !bg-slate-900 !px-4 !font-bold dark:!bg-white dark:!text-slate-950"
            >
              Continue Report
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={printRef}
        className="inspection-report-pages mx-auto max-w-[960px] space-y-6 pb-10"
      >
        <DocumentPage className="bg-[#f3f8ff] dark:bg-[#0f1622]">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-700 dark:border-sky-500/30 dark:bg-white/[0.05] dark:text-sky-300">
                Smart inspection report
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                Comprehensive
                <br />
                Car Inspection Report
              </h1>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                Thorough vehicle health review with structured condition
                findings, compliance verification, photo evidence, and
                procurement-ready pricing guidance.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {reportHighlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-sky-100 bg-white/90 p-5 shadow-sm dark:border-sky-500/20 dark:bg-white/[0.04]">
              <div className="mb-5 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="aspect-[1.28/0.88]">
                  {heroPhoto ? (
                    <img
                      src={getStoredFileSrc(heroPhoto)}
                      alt={`${reportLead.make} ${reportLead.model}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
                      <CameraOutlined style={{ fontSize: 40 }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    At a glance
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {reportLead.make} {reportLead.model}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {reportLead.variant || "Variant pending"} ·{" "}
                    {reportLead.fuel || report?.fuelType || "Fuel pending"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                    Overall
                  </p>
                  <p className="mt-1 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                    {Math.max(1, Math.round(score / 20))}/5
                  </p>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {score >= 80
                      ? "Excellent"
                      : score >= 60
                        ? "Good"
                        : score >= 40
                          ? "Fair"
                          : "Needs work"}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <DocumentStat
                  label="Inspection date"
                  value={fmt(submittedAt)}
                  helper="Report submitted"
                  tone="blue"
                />
                <DocumentStat
                  label="Inspection ID"
                  value={
                    reportLead?.inspection?.inspectionId || "Not generated"
                  }
                  helper="Evaluator job reference"
                />
                <DocumentStat
                  label="Verdict"
                  value={compactStatus(verdict)}
                  helper={
                    verdict === NOGO_REASON
                      ? "Lead closed at inspection"
                      : "Ready for next stage"
                  }
                  tone={verdict === NOGO_REASON ? "rose" : "green"}
                />
                <DocumentStat
                  label="Evaluator"
                  value={
                    reportLead?.inspection?.executiveName ||
                    reportLead?.assignedTo ||
                    "Pending"
                  }
                  helper={
                    reportLead?.inspection?.executiveMobile || "Mobile pending"
                  }
                />
                <DocumentStat
                  label="Registration"
                  value={
                    report?.registrationNumber || reportLead?.regNo || "Pending"
                  }
                  helper="Verified during inspection"
                />
                <DocumentStat
                  label="Insurance expiry"
                  value={
                    report?.insuranceExpiry
                      ? fmt(report.insuranceExpiry)
                      : "Pending"
                  }
                  helper={
                    getInsuranceDisplay(reportLead) || "Insurance type pending"
                  }
                  tone="amber"
                />
              </div>
              <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Health report summary
                </p>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                  {report?.overallRemarks || autoSummary.narrative}
                </p>
                <div className="mt-4 space-y-2">
                  {autoSummary.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DocumentPage>

        <DocumentPage>
          <DamageVisibilityMap itemValues={itemValues} />
        </DocumentPage>

        <DocumentPage>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Advanced report
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Content of report
              </h2>
            </div>
            <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
              {INSPECTION_SECTIONS.length + 4} sections
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {[
              [
                "01",
                "Your report at a glance",
                "Overview of vehicle condition, identity, and headline outcome",
              ],
              [
                "02",
                "Inspection summary",
                "Category-wise ratings and completion summary",
              ],
              [
                "03",
                "Vehicle images",
                "Mandatory inspection photo evidence captured by evaluator",
              ],
              [
                "04",
                "Detailed evaluation",
                "Full section tables for every inspected part and system",
              ],
              [
                "05",
                "OEM installed features & specs",
                "Factory-fit features, counts, and evaluator pricing notes",
              ],
            ].map(([index, title, desc]) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-[22px] border border-sky-100 bg-sky-50/60 px-4 py-4 dark:border-sky-500/20 dark:bg-sky-500/5"
              >
                <span className="text-4xl font-black tracking-tight text-sky-200 dark:text-sky-500/30">
                  {index}
                </span>
                <div>
                  <p className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {title}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DocumentPage>

        <DocumentPage>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Inspection report
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Inspection Summary
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
                This section provides a quick section-wise view of the current
                car assessment so the next team can decide pricing, refurb
                depth, and whether the car should move ahead immediately.
              </p>
            </div>
            <ScoreBadge score={score} />
          </div>
          <div className="mt-6 space-y-4">
            {summarySections.map((section) => (
              <div
                key={section.key}
                className="grid gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-[1.05fr_0.95fr] md:items-center"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white"
                      style={{ background: section.color }}
                    >
                      {getSectionOrder(section.key)}
                    </span>
                    <p className="text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
                      {section.titleEn}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Perfect parts: {section.good} | Imperfect parts:{" "}
                    {section.issue}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <SectionProgressBar
                      sectionKey={section.key}
                      itemValues={itemValues}
                    />
                  </div>
                  <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      {Math.max(0, Math.round(section.completion / 20))}/5
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                      Summary
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DocumentPage>

        <DocumentPage>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Evidence pack
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Vehicle Images
              </h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              {bucketCards.length} photos
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <DocumentStat
              label="Mandatory captured"
              value={`${mediaDiscipline.requiredCaptured}/${mediaDiscipline.requiredTotal}`}
              helper={
                mediaDiscipline.missingBuckets.length
                  ? `${mediaDiscipline.missingBuckets.length} buckets still pending`
                  : "All mandatory photo buckets captured"
              }
              tone={mediaDiscipline.missingBuckets.length ? "amber" : "green"}
            />
            <DocumentStat
              label="Defect photos"
              value={`${mediaDiscipline.defectPhotosCaptured}/${mediaDiscipline.defectTotal}`}
              helper="Negative findings with evidence"
              tone={
                mediaDiscipline.defectPhotosCaptured ===
                mediaDiscipline.defectTotal
                  ? "green"
                  : "amber"
              }
            />
            <DocumentStat
              label="Verification"
              value={`${Object.values(leadVerification).filter(Boolean).length}/${LEAD_VERIFICATION_FIELDS.length}`}
              helper="Lead and document checks completed"
              tone="blue"
            />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bucketCards.length ? (
              bucketCards.map((entry) => (
                <ReportPhotoTile
                  key={entry.title}
                  title={entry.title}
                  file={entry.file}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                Photo evidence abhi attach nahi hai.
              </div>
            )}
          </div>
        </DocumentPage>

        {INSPECTION_SECTIONS.map((section, index) => {
          const counts = getSectionCounts(section, itemValues);
          return (
            <DocumentPage key={section.key}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Inspection report
                  </p>
                  <h2 className="mt-2 text-[28px] font-black tracking-tight text-slate-950 dark:text-white">
                    {(index + 1).toString().padStart(2, "0")}. {section.titleEn}
                  </h2>
                </div>
                <div
                  className="rounded-[18px] border px-4 py-3 text-right"
                  style={{
                    borderColor: `${section.color}33`,
                    background: `${section.color}10`,
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{ color: section.color }}
                  >
                    Perfect parts: {counts.good} | Imperfect parts:{" "}
                    {counts.issue}
                  </p>
                  <p
                    className="mt-1 text-lg font-black"
                    style={{ color: section.color }}
                  >
                    {Math.max(
                      0,
                      Math.round(
                        calcSectionScore(section.key, itemValues) / 20,
                      ),
                    )}
                    /5
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 dark:border-white/10">
                <div className="grid grid-cols-[1.7fr_0.7fr] gap-4 bg-sky-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:bg-sky-500/10 dark:text-slate-300">
                  <span>Parameters</span>
                  <span className="text-right">Condition</span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-white/10">
                  {section.items.map((item) => {
                    const itemValue = itemValues?.[item.key] || {};
                    return (
                      <div
                        key={item.key}
                        className="grid grid-cols-[1.7fr_0.7fr] gap-4 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.labelEn}
                          </p>
                          {itemValue.tyreBrand || itemValue.treadDepth ? (
                            <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                              {[
                                itemValue.tyreBrand || "",
                                itemValue.treadDepth
                                  ? `${itemValue.treadDepth} mm`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="py-0.5 text-right">
                          <StatusChip status={itemValue.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </DocumentPage>
          );
        })}

        <DocumentPage>
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                OEM installed features &amp; specs
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Features, Specs &amp; Pricing Notes
              </h2>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <DocumentStat
                  label="Power windows"
                  value={report?.powerWindowCount || "Not captured"}
                  helper="Count verified during inspection"
                  tone="blue"
                />
                <DocumentStat
                  label="Airbags"
                  value={report?.airbagCount || "Not captured"}
                  helper="As seen physically / warning status"
                  tone="blue"
                />
                <DocumentStat
                  label="Transmission"
                  value={report?.transmissionType || "Not captured"}
                  helper="Variant-level gearbox verification"
                />
                <DocumentStat
                  label="Seat material"
                  value={report?.seatMaterial || "Not captured"}
                  helper="Cabin upholstery"
                />
                <DocumentStat
                  label="Fuel type"
                  value={report?.fuelType || reportLead?.fuel || "Not captured"}
                  helper="Lead + physical verification"
                />
                <DocumentStat
                  label="Estimated refurb"
                  value={fmtInrOrPending(report?.estimatedRefurbCost)}
                  helper="Expected rectification budget"
                  tone="amber"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Evaluator pricing
                </p>
                <p className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                  {fmtInrOrPending(report?.evaluatorPrice)}
                </p>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
                  {report?.negotiationNotes ||
                    "Evaluator negotiation notes abhi capture nahi hue hain."}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Final remarks
                </p>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                  {report?.overallRemarks ||
                    "Final evaluator remarks abhi available nahi hain."}
                </p>
                {leadDate ? (
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Original inspection slot: {fmt(leadDate)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </DocumentPage>
      </div>
    </section>
  );
}

function VisitUpdateModal({
  open,
  selectedLead,
  visitForm,
  onCancel,
  onSubmit,
}) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      centered
      width={640}
      okText="Save Visit Update"
      cancelText="Cancel"
      okButtonProps={{
        className:
          "!bg-slate-900 !font-bold dark:!bg-white dark:!text-slate-950",
      }}
      title={
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Inspection Visit Update
          </p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
            {selectedLead?.make} {selectedLead?.model}
            {selectedLead?.name ? ` — ${selectedLead.name}` : ""}
          </p>
        </div>
      }
    >
      <p className="mb-5 text-sm font-medium text-slate-500 dark:text-slate-400">
        Yeh form tab use karo jab inspection field mein ho na saki ho. Actual
        inspection ke liye Start Inspection button use karo.
      </p>
      <Form form={visitForm} layout="vertical" size="middle">
        <Form.Item
          label="Kya reschedule karni hai? / Reschedule?"
          name="reschedule"
          rules={[{ required: true, message: "Option chunein." }]}
          className="!mb-4"
        >
          <Select
            placeholder="Chunein..."
            options={[
              { value: true, label: "Yes — Nayi date pe reschedule karo" },
              { value: false, label: "No — Sirf not-conducted mark karo" },
            ]}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.reschedule !== curr.reschedule}
        >
          {({ getFieldValue }) =>
            getFieldValue("reschedule") === true ? (
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] mb-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  New Slot Details / Nayi Visit ki Jaankari
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Form.Item
                    label="New Date / Nayi Tithi"
                    name="rescheduleDate"
                    rules={[{ required: true, message: "Date chunein." }]}
                    className="!mb-0"
                  >
                    <DatePicker
                      className="w-full"
                      format="DD-MM-YYYY"
                      disabledDate={(d) => d && d.isBefore(dayjs(), "day")}
                    />
                  </Form.Item>
                  <Form.Item
                    label="New Time / Naya Samay"
                    name="rescheduleTime"
                    rules={[{ required: true, message: "Time chunein." }]}
                    className="!mb-0"
                  >
                    <TimePicker
                      className="w-full"
                      format="hh:mm A"
                      use12Hours
                    />
                  </Form.Item>
                  <Form.Item
                    label="Executive Name / Nirikshak ka Naam"
                    name="rescheduleExecutiveName"
                    rules={[
                      { required: true, message: "Executive naam bharo." },
                    ]}
                    className="!mb-0"
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Field evaluator ka poora naam"
                    />
                  </Form.Item>
                  <Form.Item
                    label="Executive Mobile / Mobile Number"
                    name="rescheduleExecutiveMobile"
                    rules={[
                      { required: true, message: "Mobile number bharo." },
                    ]}
                    className="!mb-0"
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                    />
                  </Form.Item>
                </div>
              </div>
            ) : null
          }
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.reschedule !== curr.reschedule}
        >
          {({ getFieldValue }) =>
            getFieldValue("reschedule") === false ? (
              <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 mb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                  Not Conducted — Kyun nahi hui?
                </p>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Yeh lead Not Conducted mark ho jaayegi. Baad mein queue se
                  dobara start kar sakte ho.
                </p>
              </div>
            ) : null
          }
        </Form.Item>
        <Form.Item
          label="Remarks / Wajah aur Notes"
          name="remarks"
          rules={[
            { required: true, message: "Kuch remarks likhna zaroori hai." },
          ]}
          className="!mb-0"
        >
          <TextArea
            rows={3}
            placeholder="Seller ghar par nahi tha, gaadi nahi mili, documents missing, location change, ya koi aur wajah..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function UsedCarInspectionDesk() {
  const reportPrintRef = useRef(null);
  const [leads, setLeads] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : SAMPLE_LEADS;
      return parsed.map(normalizeLeadRecord);
    } catch {
      return SAMPLE_LEADS.map(normalizeLeadRecord);
    }
  });
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [queueFilter, setQueueFilter] = useState("Scheduled");
  const [search, setSearch] = useState("");
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [reportLeadId, setReportLeadId] = useState(null);
  const [reportMode, setReportMode] = useState("edit");
  const [activeSectionKeys, setActiveSectionKeys] = useState([
    INSPECTION_SECTIONS[0].key,
  ]);
  const [autoOpenItemKey, setAutoOpenItemKey] = useState(null);
  const [visitForm] = Form.useForm();
  const [reportForm] = Form.useForm();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  const updateLead = useCallback((leadId, updater) => {
    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== leadId) return lead;
        const nextLead =
          typeof updater === "function"
            ? updater(lead)
            : { ...lead, ...updater };
        return normalizeLeadRecord(nextLead);
      }),
    );
  }, []);

  const inspectionPool = useMemo(
    () =>
      leads.filter(
        (lead) =>
          lead.status !== "Closed" &&
          (lead.pipelineStage === INSPECTION_QUEUE_STAGE ||
            lead.status === "Inspection Scheduled" ||
            Boolean(lead.inspection?.startedAt) ||
            Boolean(lead.inspection?.submittedAt)),
      ),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inspectionPool
      .filter((lead) => {
        if (q) {
          const haystack = [
            lead.name,
            lead.mobile,
            lead.regNo,
            lead.make,
            lead.model,
            lead.variant,
            lead.inspection?.inspectionId,
            lead.assignedTo,
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        const state = getInspectionState(lead).key;
        const schedule =
          lead.inspection?.rescheduledAt || lead.inspectionScheduledAt;
        if (queueFilter === "Due Today")
          return Boolean(
            schedule &&
            dayjs(schedule).isSame(dayjs(), "day") &&
            state !== "completed",
          );
        if (queueFilter === "Scheduled") return state === "scheduled";
        if (queueFilter === "Rescheduled") return state === "rescheduled";
        if (queueFilter === "Draft") return state === "draft";
        if (queueFilter === "Completed") return state === "completed";
        return true;
      })
      .sort((a, b) => {
        const stateA = getInspectionState(a).key;
        const stateB = getInspectionState(b).key;
        const order = {
          draft: 0,
          scheduled: 1,
          rescheduled: 2,
          completed: 3,
          closed: 4,
        };
        if ((order[stateA] || 9) !== (order[stateB] || 9))
          return (order[stateA] || 9) - (order[stateB] || 9);
        const aAt = dayjs(
          a.inspection?.rescheduledAt || a.inspectionScheduledAt || 0,
        ).valueOf();
        const bAt = dayjs(
          b.inspection?.rescheduledAt || b.inspectionScheduledAt || 0,
        ).valueOf();
        return aAt - bAt;
      });
  }, [inspectionPool, queueFilter, search]);

  useEffect(() => {
    if (!filteredLeads.length) {
      setSelectedLeadId(null);
      return;
    }
    if (!filteredLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLeadId]);

  const selectedLead =
    filteredLeads.find((l) => l.id === selectedLeadId) ||
    filteredLeads[0] ||
    null;
  const reportLead = leads.find((l) => l.id === reportLeadId) || null;

  const summary = useMemo(() => {
    const scheduled = inspectionPool.filter(
      (l) => getInspectionState(l).key === "scheduled",
    ).length;
    const rescheduled = inspectionPool.filter(
      (l) => getInspectionState(l).key === "rescheduled",
    ).length;
    const draft = inspectionPool.filter(
      (l) => getInspectionState(l).key === "draft",
    ).length;
    const completed = inspectionPool.filter(
      (l) => getInspectionState(l).key === "completed",
    ).length;
    const nogo = inspectionPool.filter(
      (l) =>
        getInspectionState(l).key === "completed" &&
        l.inspection?.verdict === NOGO_REASON,
    ).length;
    const passed = completed - nogo;
    const dueToday = inspectionPool.filter((l) => {
      const s = l.inspection?.rescheduledAt || l.inspectionScheduledAt;
      return (
        s &&
        dayjs(s).isSame(dayjs(), "day") &&
        getInspectionState(l).key !== "completed"
      );
    }).length;
    return { scheduled, rescheduled, draft, completed, nogo, passed, dueToday };
  }, [inspectionPool]);

  const itemSequence = useMemo(
    () =>
      INSPECTION_SECTIONS.flatMap((section) =>
        section.items.map((item) => ({
          sectionKey: section.key,
          itemKey: item.key,
        })),
      ),
    [],
  );

  const openVisitUpdate = useCallback(
    (lead) => {
      setSelectedLeadId(lead.id);
      visitForm.setFieldsValue({
        reschedule: true,
        remarks: lead.inspection?.remarks || "",
        rescheduleDate: lead.inspection?.rescheduledAt
          ? dayjs(lead.inspection.rescheduledAt)
          : lead.inspectionScheduledAt
            ? dayjs(lead.inspectionScheduledAt)
            : dayjs(),
        rescheduleTime: lead.inspection?.rescheduledAt
          ? dayjs(lead.inspection.rescheduledAt)
          : lead.inspectionScheduledAt
            ? dayjs(lead.inspectionScheduledAt)
            : dayjs().add(2, "hour"),
        rescheduleExecutiveName:
          lead.inspection?.rescheduleExecutiveName ||
          lead.inspection?.executiveName ||
          lead.assignedTo ||
          "",
        rescheduleExecutiveMobile:
          lead.inspection?.rescheduleExecutiveMobile ||
          lead.inspection?.executiveMobile ||
          "",
      });
      setVisitModalOpen(true);
    },
    [visitForm],
  );

  const openInspectionReport = useCallback(
    (lead, mode = "edit") => {
      const existing = lead.inspection || {};
      const inspectionId =
        existing.inspectionId ||
        `INS-${dayjs().format("YYYYMMDD")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      if (!existing.inspectionId || !existing.startedAt) {
        updateLead(lead.id, (current) => ({
          ...current,
          inspection: {
            ...current.inspection,
            inspectionId,
            executiveName: existing.executiveName || current.assignedTo || "",
            executiveMobile: existing.executiveMobile || "",
            startedAt: existing.startedAt || new Date().toISOString(),
            lastOutcome: existing.lastOutcome || "draft",
          },
          activities: existing.startedAt
            ? current.activities
            : [
                mkActivity("inspection", "Inspection started", inspectionId),
                ...(current.activities || []),
              ],
        }));
      }
      reportForm.setFieldsValue(
        buildReportValues({
          ...lead,
          inspection: {
            ...existing,
            inspectionId,
            startedAt: existing.startedAt || new Date().toISOString(),
          },
        }),
      );
      setReportMode(mode);
      setActiveSectionKeys([INSPECTION_SECTIONS[0].key]);
      setAutoOpenItemKey(null);
      setReportLeadId(lead.id);
    },
    [reportForm, updateLead],
  );

  const handleAdvanceToNextItem = useCallback(
    (currentItemKey) => {
      const currentIndex = itemSequence.findIndex(
        (entry) => entry.itemKey === currentItemKey,
      );
      const next = currentIndex >= 0 ? itemSequence[currentIndex + 1] : null;
      if (!next) {
        window.requestAnimationFrame(() => {
          const finalBlock = document.querySelector(
            "#inspection-final-decision",
          );
          finalBlock?.scrollIntoView({
            behavior: "auto",
            block: "center",
            inline: "nearest",
          });
        });
        return;
      }
      setActiveSectionKeys([next.sectionKey]);
      setAutoOpenItemKey(next.itemKey);
    },
    [itemSequence],
  );

  const handleTyreBrandSeed = useCallback(
    (sourceItemKey, value) => {
      if (sourceItemKey !== "frontLeftTyre" || !value) return;
      const patch = {};
      TYRE_ITEM_KEYS.filter((key) => key !== sourceItemKey).forEach((key) => {
        patch[key] = {
          ...(reportForm.getFieldValue(["items", key]) || {}),
          tyreBrand: value,
        };
      });
      reportForm.setFieldsValue({
        items: {
          ...(reportForm.getFieldValue("items") || {}),
          ...patch,
        },
      });
    },
    [reportForm],
  );

  const handleVisitUpdate = useCallback(async () => {
    if (!selectedLead) return;
    try {
      const values = await visitForm.validateFields();
      const nextAt =
        values.reschedule && values.rescheduleDate && values.rescheduleTime
          ? dayjs(values.rescheduleDate)
              .hour(dayjs(values.rescheduleTime).hour())
              .minute(dayjs(values.rescheduleTime).minute())
              .second(0)
              .toISOString()
          : null;
      updateLead(selectedLead.id, (lead) => ({
        ...lead,
        status: "Inspection Scheduled",
        pipelineStage: INSPECTION_QUEUE_STAGE,
        assignedTo:
          normText(values.rescheduleExecutiveName) ||
          lead.inspection?.executiveName ||
          lead.assignedTo,
        inspectionScheduledAt: nextAt || lead.inspectionScheduledAt,
        inspection: {
          ...lead.inspection,
          executiveName:
            normText(values.rescheduleExecutiveName) ||
            lead.inspection?.executiveName ||
            lead.assignedTo,
          executiveMobile:
            normText(values.rescheduleExecutiveMobile) ||
            lead.inspection?.executiveMobile ||
            "",
          lastOutcome: values.reschedule ? "rescheduled" : "not-conducted",
          rescheduledAt: nextAt,
          rescheduleExecutiveName: normText(values.rescheduleExecutiveName),
          rescheduleExecutiveMobile: normText(values.rescheduleExecutiveMobile),
          remarks: normText(values.remarks),
        },
        activities: [
          mkActivity(
            "inspection",
            values.reschedule
              ? "Inspection rescheduled"
              : "Inspection not conducted",
            values.reschedule
              ? `${fmt(nextAt)} — ${normText(values.rescheduleExecutiveName)}`
              : normText(values.remarks) || "Visit not completed.",
          ),
          ...(lead.activities || []),
        ],
      }));
      setVisitModalOpen(false);
      visitForm.resetFields();
      message.success("Visit update save ho gaya.");
    } catch {}
  }, [selectedLead, updateLead, visitForm]);

  const handleSaveDraft = useCallback(() => {
    if (!reportLead) return;
    const values = reportForm.getFieldsValue(true);
    updateLead(reportLead.id, (lead) => ({
      ...lead,
      inspection: {
        ...lead.inspection,
        inspectionId:
          values.inspectionId || lead.inspection?.inspectionId || "",
        executiveName: normText(values.executiveName),
        executiveMobile: normText(values.executiveMobile),
        startedAt: lead.inspection?.startedAt || new Date().toISOString(),
        lastOutcome: "draft",
        remarks: normText(values.overallRemarks),
        report: buildReportPayload(values),
        reportVersion: REPORT_VERSION,
      },
    }));
    message.success("Draft save ho gaya — koi bhi data lost nahi hua.");
  }, [reportForm, reportLead, updateLead]);

  const handleSubmitReport = useCallback(async () => {
    if (!reportLead) return;
    try {
      const values = await reportForm.validateFields();
      const inspectedAt = dayjs(values.inspectionDate)
        .hour(dayjs(values.inspectionTime).hour())
        .minute(dayjs(values.inspectionTime).minute())
        .second(0)
        .toISOString();
      const verdict = values.verdict;
      const isNogo = verdict === NOGO_REASON;
      updateLead(reportLead.id, (lead) => {
        const nextInspection = {
          ...lead.inspection,
          inspectionId: values.inspectionId || lead.inspection?.inspectionId,
          executiveName: normText(values.executiveName),
          executiveMobile: normText(values.executiveMobile),
          startedAt: lead.inspection?.startedAt || new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          inspectedAt,
          lastOutcome: isNogo ? "no-go" : "completed",
          verdict,
          noGoReason: normText(values.noGoReason),
          remarks: normText(values.overallRemarks),
          reportVersion: REPORT_VERSION,
          report: buildReportPayload(values),
        };
        if (isNogo) {
          return {
            ...lead,
            status: "Closed",
            pipelineStage: "Lead Closed",
            closureReason: NOGO_REASON,
            notes: normText(values.noGoReason) || lead.notes,
            inspection: nextInspection,
            activities: [
              mkActivity(
                "lead-closed",
                "Lead closed from inspection — No-Go",
                normText(values.noGoReason) || "No-go car after inspection.",
              ),
              ...(lead.activities || []),
            ],
          };
        }
        return {
          ...lead,
          status: "Inspection Passed",
          pipelineStage: INSPECTION_DONE_STAGE,
          inspection: nextInspection,
          activities: [
            mkActivity(
              "inspection",
              "Inspection completed — Passed",
              normText(values.overallRemarks) ||
                "Vehicle cleared for next stage.",
            ),
            ...(lead.activities || []),
          ],
        };
      });
      const nextLead = filteredLeads.find(
        (l) =>
          l.id !== reportLead.id && getInspectionState(l).key !== "completed",
      );
      setReportLeadId(null);
      setReportMode("edit");
      setSelectedLeadId(nextLead?.id || null);
      reportForm.resetFields();
      message.success(
        isNogo
          ? "No-go report submit hua. Lead band kar di gayi."
          : "Inspection report submit ho gaya. Vehicle aage bhej diya.",
      );
    } catch {
      message.error(
        "Kuch required fields bhari nahi hain. Please check karein.",
      );
    }
  }, [filteredLeads, reportForm, reportLead, updateLead]);

  const handleDownloadReport = useReactToPrint({
    contentRef: reportPrintRef,
    documentTitle: reportLead?.inspection?.inspectionId || "inspection-report",
    pageStyle: `
      @page { margin: 12mm; }
      html, body { background: #ffffff !important; }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .inspection-report-pages {
        max-width: 960px !important;
        margin: 0 auto !important;
      }
      .inspection-report-pages section {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 24px;
        box-shadow: none !important;
      }
    `,
    onPrintError: () => {
      message.error("Report print karte waqt issue aaya. Please try again.");
    },
  });

  if (reportLeadId && reportLead) {
    const reportReadOnly = reportMode === "view";
    if (reportReadOnly) {
      return (
        <InspectionReportDocumentView
          reportLead={reportLead}
          onDownload={handleDownloadReport}
          printRef={reportPrintRef}
          onBack={() => {
            setReportLeadId(null);
            setReportMode("edit");
          }}
          onEdit={() => setReportMode("edit")}
        />
      );
    }
    const reportItems =
      reportForm.getFieldValue("items") ||
      reportLead.inspection?.report?.items ||
      {};
    const currentPhotoBuckets =
      reportForm.getFieldValue("photoBuckets") ||
      reportLead.inspection?.report?.photoBuckets ||
      {};
    const mediaDiscipline = getMediaDiscipline(
      currentPhotoBuckets,
      reportItems,
    );
    return (
      <section className="space-y-4">
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                <FileTextOutlined />
                Inspection Report
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-[28px]">
                {reportLead.make} {reportLead.model} {reportLead.variant}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                {reportLead.name} · {reportLead.mobile} ·{" "}
                {reportLead.regNo || "Registration pending"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setReportLeadId(null);
                  setReportMode("edit");
                }}
                className="!rounded-full"
              >
                Back to Queue
              </Button>
              {reportReadOnly ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  View Report
                </span>
              ) : (
                <>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleSaveDraft}
                    className="!rounded-full"
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSubmitReport}
                    className="!rounded-full !bg-slate-900 !px-5 !font-bold dark:!bg-white dark:!text-slate-950"
                  >
                    Submit Report
                  </Button>
                </>
              )}
            </div>
          </div>
          <ReportSummaryCard reportLead={reportLead} />
        </div>
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          <Form
            form={reportForm}
            layout="vertical"
            size="middle"
            disabled={reportReadOnly}
          >
            <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Visit Details
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Form.Item
                      label="Inspection ID"
                      name="inspectionId"
                      rules={[{ required: true, message: "ID required hai." }]}
                      className="!mb-0"
                    >
                      <Input
                        readOnly
                        prefix={<FileTextOutlined />}
                        className="!bg-slate-100 dark:!bg-white/5"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Inspection Executive / Nirikshak ka Naam"
                      name="executiveName"
                      rules={[
                        { required: true, message: "Executive naam bharo." },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="Evaluator ka poora naam"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Contact No. / Mobile Number"
                      name="executiveMobile"
                      rules={[
                        { required: true, message: "Mobile number bharo." },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        prefix={<PhoneOutlined />}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                      />
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Inspection Location</span>
                          <button
                            type="button"
                            onClick={() =>
                              reportForm.setFieldValue(
                                "inspectionLocation",
                                reportLead.address || "",
                              )
                            }
                            className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:text-slate-300"
                          >
                            Same as lead
                          </button>
                        </div>
                      }
                      name="inspectionLocation"
                      rules={[{ required: true, message: "Location bharo." }]}
                      className="!mb-0"
                    >
                      <Input placeholder="Seller ka ghar ya showroom address" />
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Registration Number</span>
                          <button
                            type="button"
                            onClick={() =>
                              reportForm.setFieldValue(
                                "registrationNumber",
                                reportLead.regNo || "",
                              )
                            }
                            className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:text-slate-300"
                          >
                            Same as lead
                          </button>
                        </div>
                      }
                      name="registrationNumber"
                      rules={[
                        {
                          required: true,
                          message: "Registration number bharo.",
                        },
                      ]}
                      className="!mb-0"
                    >
                      <Input placeholder="e.g. HR26DE9898" />
                    </Form.Item>
                    <Form.Item
                      label="Insurance Expiry / Insurance ki last date"
                      name="insuranceExpiry"
                      className="!mb-0"
                    >
                      <DatePicker className="w-full" format="DD-MM-YYYY" />
                    </Form.Item>
                    <Form.Item
                      label="Inspection Date / Tithi"
                      name="inspectionDate"
                      rules={[{ required: true, message: "Date chunein." }]}
                      className="!mb-0"
                    >
                      <DatePicker className="w-full" format="DD-MM-YYYY" />
                    </Form.Item>
                    <Form.Item
                      label="Inspection Time / Samay"
                      name="inspectionTime"
                      rules={[{ required: true, message: "Time chunein." }]}
                      className="!mb-0"
                    >
                      <TimePicker
                        className="w-full"
                        format="hh:mm A"
                        use12Hours
                      />
                    </Form.Item>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Lead Verification
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {LEAD_VERIFICATION_FIELDS.map((field) => (
                      <VerificationCard key={field.key} field={field} />
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Form.Item
                      label="Airbag Count"
                      name="airbagCount"
                      className="!mb-0"
                    >
                      <Select
                        allowClear
                        options={AIRBAG_OPTS.map((v) => ({
                          value: v,
                          label: v,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Transmission Type"
                      name="transmissionType"
                      className="!mb-0"
                    >
                      <Select
                        allowClear
                        options={TRANSMISSION_OPTS.map((v) => ({
                          value: v,
                          label: v,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Seat Material"
                      name="seatMaterial"
                      className="!mb-0"
                    >
                      <Select
                        allowClear
                        options={SEAT_OPTS.map((v) => ({ value: v, label: v }))}
                      />
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Fuel Type</span>
                          <button
                            type="button"
                            onClick={() =>
                              reportForm.setFieldValue(
                                "fuelType",
                                reportLead.fuel || "",
                              )
                            }
                            className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:text-slate-300"
                          >
                            Same as lead
                          </button>
                        </div>
                      }
                      name="fuelType"
                      className="!mb-0"
                    >
                      <Input placeholder="Fuel type" />
                    </Form.Item>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                    <DocumentStat
                      label="Mandatory captured"
                      value={`${mediaDiscipline.requiredCaptured}/${mediaDiscipline.requiredTotal}`}
                      helper={
                        mediaDiscipline.missingBuckets.length
                          ? `${mediaDiscipline.missingBuckets.length} still pending`
                          : "All mandatory buckets complete"
                      }
                      tone={
                        mediaDiscipline.missingBuckets.length
                          ? "amber"
                          : "green"
                      }
                    />
                    <DocumentStat
                      label="Defect photos"
                      value={`${mediaDiscipline.defectPhotosCaptured}/${mediaDiscipline.defectTotal}`}
                      helper="Evidence against marked defects"
                      tone={
                        mediaDiscipline.defectPhotosCaptured ===
                        mediaDiscipline.defectTotal
                          ? "green"
                          : "amber"
                      }
                    />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Mandatory Photos
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {PHOTO_BUCKETS.map((bucket) => (
                      <div
                        key={bucket.key}
                        className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {bucket.labelEn}
                        </p>
                        <Form.Item
                          name={["photoBuckets", bucket.key]}
                          valuePropName="fileList"
                          getValueFromEvent={(e) => e?.fileList}
                          className="!mb-0"
                        >
                          <Upload
                            beforeUpload={() => false}
                            multiple
                            listType="picture"
                            accept="image/*"
                          >
                            <Button
                              icon={<CameraOutlined />}
                              size="small"
                              className="!rounded-full !text-xs"
                            >
                              Attach Photos
                            </Button>
                          </Upload>
                        </Form.Item>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        Detailed Inspection Checklist / Vistar se Jaanch
                      </p>
                      <p className="mt-1 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Body, mechanicals, electricals, safety aur road test —
                        sab kuch cover karo
                      </p>
                    </div>
                    <ScoreBadge score={calcOverallScore(reportItems)} />
                  </div>
                </div>
                <Collapse
                  ghost
                  activeKey={activeSectionKeys}
                  onChange={(keys) =>
                    setActiveSectionKeys(Array.isArray(keys) ? keys : [keys])
                  }
                  className="!bg-transparent"
                >
                  {INSPECTION_SECTIONS.map((section) => (
                    <Panel
                      key={section.key}
                      className="!mb-3 !rounded-[22px] !border !border-slate-200 !bg-white dark:!border-white/10 dark:!bg-[#11151b]"
                      header={
                        <div className="flex items-center justify-between gap-3 py-1">
                          <div className="flex items-center gap-3">
                            <span
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black text-white"
                              style={{ background: section.color }}
                            >
                              {getSectionOrder(section.key)}
                            </span>
                            <div>
                              <p className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                                {section.titleEn}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <SectionProgressBar
                              sectionKey={section.key}
                              itemValues={reportItems}
                            />
                            <span
                              className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                              style={{ background: section.color }}
                            >
                              {section.items.length} items
                            </span>
                          </div>
                        </div>
                      }
                    >
                      <div className="grid gap-3">
                        {section.items.map((item) => (
                          <SectionItemCard
                            key={item.key}
                            item={item}
                            section={section}
                            formName="items"
                            autoOpen={autoOpenItemKey === item.key}
                            clearAutoOpen={() => setAutoOpenItemKey(null)}
                            onAdvance={handleAdvanceToNextItem}
                            onSeedTyreBrand={handleTyreBrandSeed}
                          />
                        ))}
                      </div>
                    </Panel>
                  ))}
                </Collapse>

                <div
                  id="inspection-final-decision"
                  className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Final Decision
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Form.Item
                      label="Inspection Result / Natija"
                      name="verdict"
                      rules={[{ required: true, message: "Verdict chunein." }]}
                      className="!mb-0"
                    >
                      <Select
                        placeholder="Pass ya No-Go?"
                        options={[
                          {
                            value: "Inspection Passed",
                            label: "Inspection Passed — Gaadi theek hai",
                          },
                          {
                            value: NOGO_REASON,
                            label: "No-Go Car — Yeh gaadi nahi chalegi",
                          },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Estimated Refurb Cost / Theek karne ka kharcha"
                      name="estimatedRefurbCost"
                      className="!mb-0"
                    >
                      <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="e.g. 25000"
                        formatter={(v) =>
                          `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Evaluator's Price / Evaluator ki Keemat"
                      name="evaluatorPrice"
                      className="!mb-0"
                    >
                      <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="e.g. 450000"
                        formatter={(v) =>
                          `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Negotiation Notes / Mol-tol ki Baatein"
                      name="negotiationNotes"
                      className="!mb-0"
                    >
                      <Input placeholder="Seller ne kya kaha? Koi deal point?" />
                    </Form.Item>
                  </div>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) => prev.verdict !== curr.verdict}
                  >
                    {({ getFieldValue }) =>
                      getFieldValue("verdict") === NOGO_REASON ? (
                        <div className="mt-3">
                          <Form.Item
                            label="No-Go Reason / No-Go ki Wajah"
                            name="noGoReason"
                            rules={[
                              {
                                required: true,
                                message: "No-Go ki wajah likhna zaroori hai.",
                              },
                            ]}
                            className="!mb-0"
                          >
                            <Select
                              placeholder="No-Go ki wajah chunein..."
                              showSearch
                              allowClear
                              options={NOGO_REASONS.map((v) => ({
                                value: v,
                                label: v,
                              }))}
                            />
                          </Form.Item>
                        </div>
                      ) : null
                    }
                  </Form.Item>
                  <div className="mt-3">
                    <Form.Item
                      label="Overall Remarks / Saari Baatein"
                      name="overallRemarks"
                      rules={[
                        {
                          required: true,
                          message: "Overall remarks likhna zaroori hai.",
                        },
                      ]}
                      className="!mb-0"
                    >
                      <TextArea
                        rows={4}
                        placeholder="Poori inspection ka summary — kya theek hai, kya nahi, resale view, aur koi bhi zaroori baat..."
                      />
                    </Form.Item>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        <QueueMetric
          label="Scheduled"
          value={summary.scheduled}
          helper="Fresh queue — field visit pending"
        />
        <QueueMetric
          label="Due Today"
          value={summary.dueToday}
          helper="Aaj ki inspections"
          tone="sky"
        />
        <QueueMetric
          label="Rescheduled"
          value={summary.rescheduled}
          helper="Visit moved to new slot"
          tone="amber"
        />
        <QueueMetric
          label="Draft Reports"
          value={summary.draft}
          helper="Started, submit pending"
          tone="violet"
        />
        <QueueMetric
          label="Completed"
          value={summary.completed}
          helper="Reports submitted"
          tone="emerald"
        />
        <QueueMetric
          label="Passed"
          value={summary.passed}
          helper="Ready for next stage"
          tone="emerald"
        />
        <QueueMetric
          label="No-Go"
          value={summary.nogo}
          helper="Closed at inspection desk"
          tone="rose"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.34fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Inspection Queue
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
                Vehicles ready for field evaluation
              </h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-300">
              {filteredLeads.length} vehicles
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUEUE_FILTERS.map((item) => {
              const active = queueFilter === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQueueFilter(item)}
                  className={`rounded-full px-3 py-2 text-xs font-bold tracking-tight transition-all ${active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"}`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <Input
              allowClear
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Search seller, reg no, vehicle or inspection ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <InspectionQueueCard
                  key={lead.id}
                  lead={lead}
                  active={selectedLead?.id === lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-8 dark:border-white/10 dark:bg-white/[0.03]">
                <Empty description="Is filter mein koi inspection nahi mila." />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          {selectedLead ? (
            <div>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                    <FileTextOutlined />
                    Inspection Desk
                  </div>
                  <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {selectedLead.make} {selectedLead.model}{" "}
                    {selectedLead.variant}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {selectedLead.name} · {selectedLead.mobile} ·{" "}
                    {selectedLead.regNo || "Registration pending"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getInspectionState(selectedLead).tone}`}
                  >
                    {getInspectionState(selectedLead).label}
                  </span>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => openVisitUpdate(selectedLead)}
                    className="!rounded-full"
                  >
                    Visit Update
                  </Button>
                  {selectedLead.inspection?.submittedAt ? (
                    <>
                      <Button
                        icon={<FileSearchOutlined />}
                        onClick={() =>
                          openInspectionReport(selectedLead, "view")
                        }
                        className="!rounded-full"
                      >
                        View Report
                      </Button>
                      <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        onClick={() => openInspectionReport(selectedLead)}
                        className="!rounded-full !bg-slate-900 !px-4 !font-bold dark:!bg-white dark:!text-slate-950"
                      >
                        Continue Report
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      icon={
                        selectedLead.inspection?.startedAt ? (
                          <FileTextOutlined />
                        ) : (
                          <PlayCircleOutlined />
                        )
                      }
                      onClick={() => openInspectionReport(selectedLead)}
                      className="!rounded-full !bg-slate-900 !px-4 !font-bold dark:!bg-white dark:!text-slate-950"
                    >
                      {selectedLead.inspection?.startedAt
                        ? "Continue Report"
                        : "Start Inspection"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <QueueMetric
                  label="Inspection Executive"
                  value={
                    selectedLead.inspection?.executiveName ||
                    selectedLead.assignedTo ||
                    "Pending"
                  }
                  helper={
                    selectedLead.inspection?.executiveMobile ||
                    "Contact not captured"
                  }
                />
                <QueueMetric
                  label="Scheduled For"
                  value={
                    selectedLead.inspection?.rescheduledAt ||
                    selectedLead.inspectionScheduledAt
                      ? fmt(
                          selectedLead.inspection?.rescheduledAt ||
                            selectedLead.inspectionScheduledAt,
                        )
                      : "Not scheduled"
                  }
                  helper="Current field visit slot"
                />
                <QueueMetric
                  label="Seller Ask"
                  value={fmtInrOrPending(getPrice(selectedLead))}
                  helper={`${getMileage(selectedLead) || "Kms pending"} · ${selectedLead.ownership || "Ownership pending"}`}
                  tone="emerald"
                />
                <QueueMetric
                  label="Inspection ID"
                  value={
                    selectedLead.inspection?.inspectionId || "Not generated"
                  }
                  helper={
                    selectedLead.inspection?.submittedAt
                      ? `Submitted ${fmt(selectedLead.inspection.submittedAt)}`
                      : "Will auto-generate on start"
                  }
                  tone="violet"
                />
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Lead and Vehicle Snapshot
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      ["Seller Address", selectedLead.address || "Pending"],
                      [
                        "Fuel / Year",
                        `${selectedLead.fuel || "—"} · ${selectedLead.mfgYear || "—"}`,
                      ],
                      ["Color", selectedLead.color || "—"],
                      [
                        "Insurance",
                        getInsuranceDisplay(selectedLead) || "Pending",
                      ],
                      [
                        "Hypothecation",
                        selectedLead.hypothecation === true
                          ? `Yes — ${selectedLead.bankName || "Bank pending"}`
                          : selectedLead.hypothecation === false
                            ? "No"
                            : "Unknown",
                      ],
                      [
                        "Accident History",
                        selectedLead.accidentPaintHistory === true
                          ? selectedLead.accidentPaintNotes || "Yes"
                          : selectedLead.accidentPaintHistory === false
                            ? "No"
                            : "Unknown",
                      ],
                      [
                        "Expected Price",
                        fmtInrOrPending(getPrice(selectedLead)),
                      ],
                      ["Mileage", getMileage(selectedLead) || "Pending"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          {label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Current Inspection Status
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Outcome / Natija
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedLead.inspection?.verdict ||
                          getInspectionState(selectedLead).label}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Remarks / Tippani
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                        {selectedLead.inspection?.remarks ||
                          selectedLead.notes ||
                          "No inspection remarks recorded yet."}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Last Movement
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {selectedLead.activities?.[0]
                          ? `${selectedLead.activities[0].title} — ${fmt(selectedLead.activities[0].at)}`
                          : "No inspection movement logged yet."}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        How this works / Kaise kaam karta hai
                      </p>
                      {[
                        "1. Visit Update — agar inspection nahi ho saki, reschedule karo.",
                        "2. Start Inspection — jab evaluator ready ho tab full report bharo.",
                        "3. Report mein bilingual checkpoints, dropdowns aur photos hain.",
                        "4. Passed cars aage jaati hain, No-Go cars yahan band ho jaati hain.",
                      ].map((line) => (
                        <p
                          key={line}
                          className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
              <Empty description="Koi inspection vehicle select nahi hai." />
            </div>
          )}
        </div>
      </div>

      <VisitUpdateModal
        open={visitModalOpen}
        selectedLead={selectedLead}
        visitForm={visitForm}
        onCancel={() => {
          setVisitModalOpen(false);
          visitForm.resetFields();
        }}
        onSubmit={handleVisitUpdate}
      />
    </section>
  );
}
