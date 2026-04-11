import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Collapse,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Tag,
  TimePicker,
  Upload,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CameraOutlined,
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
// ALL PRESET DROPDOWN OPTION ARRAYS
// ════════════════════════════════════════════════════════════════

const OPT = {
  body: [
    "Original — Koi issue nahi",
    "Minor Scratch — Chhoti khraoch",
    "Major Scratch — Badi khraoch",
    "Minor Dent — Chhota dent",
    "Major Dent — Bada dent",
    "Repaired & Repainted — Marmat aur paint",
    "Rusting — Zang laga hua",
    "Cracked / Broken — Toota hua",
    "Panel Replaced — Naya panel laga",
    "Missing — Gum hai",
  ],

  glass: [
    "OK — Koi issue nahi",
    "Minor Crack — Chhoti darar",
    "Major Crack — Badi darar",
    "Scratch — Khraoch hai",
    "Chip — Chip laga hai",
    "Replaced — Badla hua hai",
    "Not Working / Jammed — Kaam nahi kar raha",
  ],

  tyre: [
    "Good — 70%+ life bachi hai",
    "Average — 40-70% life bachi hai",
    "Low — 20-40% life bachi hai",
    "Very Low — 20% se kam",
    "Uneven Wear — Teda ghisa hua",
    "Sidewall Damage — Side mein damage",
    "Needs Replacement — Badlana padega",
    "Bald — Bilkul ghisa hua",
  ],

  mechanical: [
    "OK — Sahi kaam kar raha",
    "Observe — Dhyan dene ki zaroorat",
    "Minor Leak — Chhota leak",
    "Major Leak — Bada leak",
    "Noise / Awaaz — Awaaz aa rahi hai",
    "Vibration — Kaampan ho raha",
    "Repair Needed — Repair chahiye",
    "Replacement Needed — Badlana padega",
    "Not Working — Bilkul kaam nahi",
    "NA — Laagu nahi",
  ],

  electrical: [
    "Working — Theek kaam kar raha",
    "Intermittent — Kabhi karta kabhi nahi",
    "Not Working — Kaam nahi kar raha",
    "Missing — Laga hi nahi",
    "Repair Needed — Repair chahiye",
    "Fuse Blown — Fuse gaya hai",
    "NA — Laagu nahi",
  ],

  safety: [
    "Present & OK — Hai aur sahi hai",
    "Warning Light ON — Warning light jal rahi ⚠️",
    "Deployed / Used — Chal chuka hai",
    "Replaced — Badla gaya hai",
    "Missing — Nahi hai",
    "Not Tested — Check nahi kiya",
    "NA — Laagu nahi",
  ],

  verification: [
    "Verified — Confirm hua ✅",
    "Mismatch — Match nahi kiya ⚠️",
    "Not Available — Nahi mila",
    "Needs Review — Dobara dekhna hai",
  ],

  road: [
    "Good — Koi problem nahi",
    "Average — Theek-thaak",
    "Observe — Dhyan dene layak",
    "Issue Found — Koi problem mili",
    "Critical — Bahut badi problem",
    "Not Tested — Test nahi kiya",
  ],

  smoke: [
    "None — Koi dhua nahi ✅",
    "White Smoke — Safed dhua (coolant leak?)",
    "Blue Smoke — Neela dhua (oil jal raha)",
    "Grey Smoke — Dhuandla dhua",
    "Black Smoke — Kaala dhua (zyada fuel)",
  ],

  ac: [
    "Excellent — Bahut thanda aata hai",
    "Good — Sahi thanda aata hai",
    "Weak Cooling — Kam thanda aata hai",
    "Not Cooling — Thanda bilkul nahi",
    "No AC Fitted — AC hai hi nahi",
    "NA — Laagu nahi",
  ],

  market: [
    "A+ — Seedha bech sakte ho",
    "A — Minor cleanup ke baad ready",
    "B — Moderate refurb chahiye",
    "C — Heavy refurb chahiye",
    "D — Scrap / Parts only",
  ],

  warnLight: [
    "OFF — Normal hai ✅",
    "ON — Warning aa rahi hai ⚠️",
    "Not Checked — Check nahi kiya",
  ],

  yn: ["Yes — Haan", "No — Nahi", "NA — Laagu nahi"],
};

// ── Standalone option lists ──────────────────────────────────────

const INSURANCE_OPTS = [
  "Comprehensive — Full cover",
  "Zero-Dep — Zero depreciation",
  "Third Party Only — Sirf third party",
  "Expired — Khatam ho gayi",
  "Not Available — Nahi mili",
];

const OWNERSHIP_OPTS = [
  "1st Owner — Pehla maalik",
  "2nd Owner — Doosra maalik",
  "3rd Owner — Teesra maalik",
  "4th Owner+ — Chauthaa ya zyada",
  "Unknown — Pata nahi",
];

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
    return v && v !== "" && v !== undefined;
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
  }));

const fromFileList = (files = []) =>
  files.map((file, index) => ({
    uid: file.uid || `upl-${index}`,
    name: file.name || `Photo ${index + 1}`,
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
        status: saved.status || undefined,
        notes: saved.notes || "",
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
          status: values.items?.[item.key]?.status || "",
          notes: normText(values.items?.[item.key]?.notes),
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
    slate: "text-slate-900 dark:text-slate-100",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    violet: "text-violet-700 dark:text-violet-300",
    rose: "text-rose-700 dark:text-rose-300",
    sky: "text-sky-700 dark:text-sky-300",
  };
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black tracking-tight ${toneMap[tone] || toneMap.slate}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{helper}</p> : null}
    </div>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 75
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40"
    : score >= 50
    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40"
    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${color}`}>
      Score {score}%
    </span>
  );
}

function SectionProgressBar({ sectionKey, itemValues }) {
  const score = calcSectionScore(sectionKey, itemValues);
  const color = score >= 75 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
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
    <div className="mt-2 rounded-[12px] border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          Tyre Life — {life.pct}%
        </span>
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          ~{life.km} km remaining
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
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
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Inspection completeness</p>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Checklist completion across all major sections</p>
      </div>
    </div>
  );
}

function InspectionQueueCard({ lead, active, onClick }) {
  const state = getInspectionState(lead);
  const schedule = lead?.inspection?.rescheduledAt || lead?.inspectionScheduledAt;
  const isToday = schedule && dayjs(schedule).isSame(dayjs(), "day");
  const isOverdue = schedule && dayjs(schedule).isBefore(dayjs()) && state.key === "scheduled";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">{lead.name}</p>
          <p className={`mt-1 text-xs font-medium ${active ? "text-white/70 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
            {lead.mobile} · {lead.make} {lead.model}{lead.variant ? ` ${lead.variant}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${state.tone}`}>
            {state.label}
          </span>
          {isOverdue ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">OVERDUE</span> : null}
          {isToday && !isOverdue ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">TODAY</span> : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className={`rounded-[14px] px-3 py-2 ${active ? "bg-white/10 dark:bg-black/10" : "bg-slate-50 dark:bg-white/[0.04]"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}>Executive</p>
          <p className="mt-1 truncate text-xs font-bold">{lead.inspection?.executiveName || lead.assignedTo || "Not assigned"}</p>
          <p className={`mt-0.5 text-[10px] font-medium ${active ? "text-white/60 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"}`}>
            {lead.inspection?.executiveMobile || "Mobile pending"}
          </p>
        </div>
        <div className={`rounded-[14px] px-3 py-2 ${active ? "bg-white/10 dark:bg-black/10" : "bg-slate-50 dark:bg-white/[0.04]"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}>Slot</p>
          <p className="mt-1 text-xs font-bold">{schedule ? fmt(schedule) : "Not scheduled"}</p>
          <p className={`mt-0.5 text-[10px] font-medium ${active ? "text-white/60 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"}`}>
            {lead.regNo || "Reg pending"} · {getMileage(lead) || "Kms pending"}
          </p>
        </div>
      </div>
      <div className={`mt-2 flex items-center justify-between text-xs font-medium ${active ? "text-white/72 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
        <span>{getInsuranceDisplay(lead) || "Insurance pending"}</span>
        <span className={`font-bold ${active ? "text-white dark:text-slate-950" : "text-slate-800 dark:text-slate-200"}`}>
          {fmtInrOrPending(getPrice(lead))}
        </span>
      </div>
      {state.key === "draft" ? (
        <div className="mt-3">
          <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55" : "text-slate-400 dark:text-slate-500"}`}>Report Progress</p>
          <SectionProgressBar sectionKey="exteriorPanels" itemValues={lead.inspection?.report?.items} />
        </div>
      ) : null}
    </button>
  );
}

function SectionItemCard({ item, section, formName }) {
  const preset = item.preset || section.preset || "mechanical";
  const options = OPT[preset] || OPT.mechanical;
  const isTyre = Boolean(item.hasTread);
  const hasBrand = Boolean(item.hasBrand);
  const form = Form.useFormInstance();
  const treadVal = Form.useWatch([formName, item.key, "treadDepth"], form);

  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.labelEn}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">{item.labelHi}</p>
        </div>
        <CameraOutlined className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Form.Item label={<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status / Haalat</span>} name={[formName, item.key, "status"]} className="!mb-0">
          <Select placeholder="Condition chunein..." showSearch allowClear optionFilterProp="label" options={options.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
        <Form.Item label={<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Notes / Observation</span>} name={[formName, item.key, "notes"]} className="!mb-0">
          <Input placeholder="Damage detail, khaas baat ya observation..." />
        </Form.Item>
      </div>
      {isTyre ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Form.Item label={<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tread Depth (mm)</span>} name={[formName, item.key, "treadDepth"]} className="!mb-0">
            <InputNumber min={0} max={12} step={0.5} placeholder="e.g. 4.5" className="w-full" addonAfter="mm" />
          </Form.Item>
          {hasBrand ? (
            <Form.Item label={<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tyre Brand</span>} name={[formName, item.key, "tyreBrand"]} className="!mb-0">
              <Select placeholder="Brand chunein..." showSearch allowClear options={TYRE_BRANDS.map((v) => ({ value: v, label: v }))} />
            </Form.Item>
          ) : null}
        </div>
      ) : null}
      {isTyre && treadVal > 0 ? <TyreLifeBar treadMm={treadVal} /> : null}
      <Form.Item label={<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Photos / Tasveerein</span>} name={[formName, item.key, "photos"]} valuePropName="fileList" getValueFromEvent={(e) => e?.fileList} className="!mb-0 mt-3">
        <Upload beforeUpload={() => false} multiple listType="picture" accept="image/*">
          <Button icon={<CameraOutlined />} size="small" className="!rounded-full !text-xs">Attach Photos</Button>
        </Upload>
      </Form.Item>
    </div>
  );
}

function ReportSummaryCard({ reportLead }) {
  const reportItems = reportLead?.inspection?.report?.items || {};
  const score = calcOverallScore(reportItems);
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <QueueMetric label="Inspection ID" value={reportLead.inspection?.inspectionId || "Not generated"} helper="Auto-generated for this visit" />
      <QueueMetric label="Seller Ask" value={fmtInrOrPending(getPrice(reportLead))} helper={`${getMileage(reportLead) || "Kms pending"} · ${reportLead.ownership || "Ownership pending"}`} tone="emerald" />
      <QueueMetric label="Insurance" value={getInsuranceDisplay(reportLead) || "Pending"} helper={`Hypothecation: ${reportLead.hypothecation === true ? "Yes" : reportLead.hypothecation === false ? "No" : "Unknown"}`} tone="amber" />
      <QueueMetric label="Scheduled For" value={fmt(reportLead.inspection?.rescheduledAt || reportLead.inspectionScheduledAt || new Date())} helper="Field visit slot" tone="violet" />
      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Overall Score</p>
        <div className="mt-3"><OverallScoreRing score={score} /></div>
      </div>
    </div>
  );
}

function VisitUpdateModal({ open, selectedLead, visitForm, onCancel, onSubmit }) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      centered
      width={640}
      okText="Save Visit Update"
      cancelText="Cancel"
      okButtonProps={{ className: "!bg-slate-900 !font-bold dark:!bg-white dark:!text-slate-950" }}
      title={
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inspection Visit Update</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{selectedLead?.make} {selectedLead?.model}{selectedLead?.name ? ` — ${selectedLead.name}` : ""}</p>
        </div>
      }
    >
      <p className="mb-5 text-sm font-medium text-slate-500 dark:text-slate-400">Yeh form tab use karo jab inspection field mein ho na saki ho. Actual inspection ke liye Start Inspection button use karo.</p>
      <Form form={visitForm} layout="vertical" size="middle">
        <Form.Item label="Kya reschedule karni hai? / Reschedule?" name="reschedule" rules={[{ required: true, message: "Option chunein." }]} className="!mb-4">
          <Select placeholder="Chunein..." options={[{ value: true, label: "Yes — Nayi date pe reschedule karo" }, { value: false, label: "No — Sirf not-conducted mark karo" }]} />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.reschedule !== curr.reschedule}>
          {({ getFieldValue }) => getFieldValue("reschedule") === true ? (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] mb-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">New Slot Details / Nayi Visit ki Jaankari</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Form.Item label="New Date / Nayi Tithi" name="rescheduleDate" rules={[{ required: true, message: "Date chunein." }]} className="!mb-0"><DatePicker className="w-full" format="DD-MM-YYYY" disabledDate={(d) => d && d.isBefore(dayjs(), "day")} /></Form.Item>
                <Form.Item label="New Time / Naya Samay" name="rescheduleTime" rules={[{ required: true, message: "Time chunein." }]} className="!mb-0"><TimePicker className="w-full" format="hh:mm A" use12Hours /></Form.Item>
                <Form.Item label="Executive Name / Nirikshak ka Naam" name="rescheduleExecutiveName" rules={[{ required: true, message: "Executive naam bharo." }]} className="!mb-0"><Input prefix={<UserOutlined />} placeholder="Field evaluator ka poora naam" /></Form.Item>
                <Form.Item label="Executive Mobile / Mobile Number" name="rescheduleExecutiveMobile" rules={[{ required: true, message: "Mobile number bharo." }]} className="!mb-0"><Input prefix={<PhoneOutlined />} placeholder="10-digit mobile number" maxLength={10} /></Form.Item>
              </div>
            </div>
          ) : null}
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.reschedule !== curr.reschedule}>
          {({ getFieldValue }) => getFieldValue("reschedule") === false ? (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 mb-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">Not Conducted — Kyun nahi hui?</p>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Yeh lead Not Conducted mark ho jaayegi. Baad mein queue se dobara start kar sakte ho.</p>
            </div>
          ) : null}
        </Form.Item>
        <Form.Item label="Remarks / Wajah aur Notes" name="remarks" rules={[{ required: true, message: "Kuch remarks likhna zaroori hai." }]} className="!mb-0">
          <TextArea rows={3} placeholder="Seller ghar par nahi tha, gaadi nahi mili, documents missing, location change, ya koi aur wajah..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function UsedCarInspectionDesk() {
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
  const [visitForm] = Form.useForm();
  const [reportForm] = Form.useForm();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  const updateLead = useCallback((leadId, updater) => {
    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== leadId) return lead;
        const nextLead = typeof updater === "function" ? updater(lead) : { ...lead, ...updater };
        return normalizeLeadRecord(nextLead);
      })
    );
  }, []);

  const inspectionPool = useMemo(() =>
    leads.filter((lead) =>
      lead.status !== "Closed" &&
      (lead.pipelineStage === INSPECTION_QUEUE_STAGE ||
        lead.status === "Inspection Scheduled" ||
        Boolean(lead.inspection?.startedAt) ||
        Boolean(lead.inspection?.submittedAt))
    ),
  [leads]);

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
          ].join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        const state = getInspectionState(lead).key;
        const schedule = lead.inspection?.rescheduledAt || lead.inspectionScheduledAt;
        if (queueFilter === "Due Today") return Boolean(schedule && dayjs(schedule).isSame(dayjs(), "day") && state !== "completed");
        if (queueFilter === "Scheduled") return state === "scheduled";
        if (queueFilter === "Rescheduled") return state === "rescheduled";
        if (queueFilter === "Draft") return state === "draft";
        if (queueFilter === "Completed") return state === "completed";
        return true;
      })
      .sort((a, b) => {
        const stateA = getInspectionState(a).key;
        const stateB = getInspectionState(b).key;
        const order = { draft: 0, scheduled: 1, rescheduled: 2, completed: 3, closed: 4 };
        if ((order[stateA] || 9) !== (order[stateB] || 9)) return (order[stateA] || 9) - (order[stateB] || 9);
        const aAt = dayjs(a.inspection?.rescheduledAt || a.inspectionScheduledAt || 0).valueOf();
        const bAt = dayjs(b.inspection?.rescheduledAt || b.inspectionScheduledAt || 0).valueOf();
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

  const selectedLead = filteredLeads.find((l) => l.id === selectedLeadId) || filteredLeads[0] || null;
  const reportLead = leads.find((l) => l.id === reportLeadId) || null;

  const summary = useMemo(() => {
    const scheduled = inspectionPool.filter((l) => getInspectionState(l).key === "scheduled").length;
    const rescheduled = inspectionPool.filter((l) => getInspectionState(l).key === "rescheduled").length;
    const draft = inspectionPool.filter((l) => getInspectionState(l).key === "draft").length;
    const completed = inspectionPool.filter((l) => getInspectionState(l).key === "completed").length;
    const nogo = inspectionPool.filter((l) => getInspectionState(l).key === "completed" && l.inspection?.verdict === NOGO_REASON).length;
    const passed = completed - nogo;
    const dueToday = inspectionPool.filter((l) => {
      const s = l.inspection?.rescheduledAt || l.inspectionScheduledAt;
      return s && dayjs(s).isSame(dayjs(), "day") && getInspectionState(l).key !== "completed";
    }).length;
    return { scheduled, rescheduled, draft, completed, nogo, passed, dueToday };
  }, [inspectionPool]);

  const openVisitUpdate = useCallback((lead) => {
    setSelectedLeadId(lead.id);
    visitForm.setFieldsValue({
      reschedule: true,
      remarks: lead.inspection?.remarks || "",
      rescheduleDate: lead.inspection?.rescheduledAt ? dayjs(lead.inspection.rescheduledAt) : lead.inspectionScheduledAt ? dayjs(lead.inspectionScheduledAt) : dayjs(),
      rescheduleTime: lead.inspection?.rescheduledAt ? dayjs(lead.inspection.rescheduledAt) : lead.inspectionScheduledAt ? dayjs(lead.inspectionScheduledAt) : dayjs().add(2, "hour"),
      rescheduleExecutiveName: lead.inspection?.rescheduleExecutiveName || lead.inspection?.executiveName || lead.assignedTo || "",
      rescheduleExecutiveMobile: lead.inspection?.rescheduleExecutiveMobile || lead.inspection?.executiveMobile || "",
    });
    setVisitModalOpen(true);
  }, [visitForm]);

  const openInspectionReport = useCallback((lead, mode = "edit") => {
    const existing = lead.inspection || {};
    const inspectionId = existing.inspectionId || `INS-${dayjs().format("YYYYMMDD")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
        activities: existing.startedAt ? current.activities : [mkActivity("inspection", "Inspection started", inspectionId), ...(current.activities || [])],
      }));
    }
    reportForm.setFieldsValue(buildReportValues({
      ...lead,
      inspection: {
        ...existing,
        inspectionId,
        startedAt: existing.startedAt || new Date().toISOString(),
      },
    }));
    setReportMode(mode);
    setReportLeadId(lead.id);
  }, [reportForm, updateLead]);

  const handleVisitUpdate = useCallback(async () => {
    if (!selectedLead) return;
    try {
      const values = await visitForm.validateFields();
      const nextAt = values.reschedule && values.rescheduleDate && values.rescheduleTime
        ? dayjs(values.rescheduleDate).hour(dayjs(values.rescheduleTime).hour()).minute(dayjs(values.rescheduleTime).minute()).second(0).toISOString()
        : null;
      updateLead(selectedLead.id, (lead) => ({
        ...lead,
        status: "Inspection Scheduled",
        pipelineStage: INSPECTION_QUEUE_STAGE,
        assignedTo: normText(values.rescheduleExecutiveName) || lead.inspection?.executiveName || lead.assignedTo,
        inspectionScheduledAt: nextAt || lead.inspectionScheduledAt,
        inspection: {
          ...lead.inspection,
          executiveName: normText(values.rescheduleExecutiveName) || lead.inspection?.executiveName || lead.assignedTo,
          executiveMobile: normText(values.rescheduleExecutiveMobile) || lead.inspection?.executiveMobile || "",
          lastOutcome: values.reschedule ? "rescheduled" : "not-conducted",
          rescheduledAt: nextAt,
          rescheduleExecutiveName: normText(values.rescheduleExecutiveName),
          rescheduleExecutiveMobile: normText(values.rescheduleExecutiveMobile),
          remarks: normText(values.remarks),
        },
        activities: [mkActivity("inspection", values.reschedule ? "Inspection rescheduled" : "Inspection not conducted", values.reschedule ? `${fmt(nextAt)} — ${normText(values.rescheduleExecutiveName)}` : normText(values.remarks) || "Visit not completed."), ...(lead.activities || [])],
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
        inspectionId: values.inspectionId || lead.inspection?.inspectionId || "",
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
      const inspectedAt = dayjs(values.inspectionDate).hour(dayjs(values.inspectionTime).hour()).minute(dayjs(values.inspectionTime).minute()).second(0).toISOString();
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
            activities: [mkActivity("lead-closed", "Lead closed from inspection — No-Go", normText(values.noGoReason) || "No-go car after inspection."), ...(lead.activities || [])],
          };
        }
        return {
          ...lead,
          status: "Inspection Passed",
          pipelineStage: INSPECTION_DONE_STAGE,
          inspection: nextInspection,
          activities: [mkActivity("inspection", "Inspection completed — Passed", normText(values.overallRemarks) || "Vehicle cleared for next stage."), ...(lead.activities || [])],
        };
      });
      const nextLead = filteredLeads.find((l) => l.id !== reportLead.id && getInspectionState(l).key !== "completed");
      setReportLeadId(null);
      setReportMode("edit");
      setSelectedLeadId(nextLead?.id || null);
      reportForm.resetFields();
      message.success(isNogo ? "No-go report submit hua. Lead band kar di gayi." : "Inspection report submit ho gaya. Vehicle aage bhej diya.");
    } catch {
      message.error("Kuch required fields bhari nahi hain. Please check karein.");
    }
  }, [filteredLeads, reportForm, reportLead, updateLead]);

  if (reportLeadId && reportLead) {
    const reportReadOnly = reportMode === "view";
    const reportItems = reportForm.getFieldValue("items") || reportLead.inspection?.report?.items || {};
    return (
      <section className="space-y-4">
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                <FileTextOutlined />
                Inspection Report
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-[28px]">{reportLead.make} {reportLead.model} {reportLead.variant}</h3>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{reportLead.name} · {reportLead.mobile} · {reportLead.regNo || "Registration pending"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button icon={<ArrowLeftOutlined />} onClick={() => { setReportLeadId(null); setReportMode("edit"); }} className="!rounded-full">Back to Queue</Button>
              {reportReadOnly ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  View Report
                </span>
              ) : (
                <>
                  <Button icon={<ReloadOutlined />} onClick={handleSaveDraft} className="!rounded-full">Save Draft</Button>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmitReport} className="!rounded-full !bg-slate-900 !px-5 !font-bold dark:!bg-white dark:!text-slate-950">Submit Report</Button>
                </>
              )}
            </div>
          </div>
          <ReportSummaryCard reportLead={reportLead} />
        </div>
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          <Form form={reportForm} layout="vertical" size="middle" disabled={reportReadOnly}>
            <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Visit Details / Daura Vivran</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Form.Item label="Inspection ID" name="inspectionId" rules={[{ required: true, message: "ID required hai." }]} className="!mb-0"><Input readOnly prefix={<FileTextOutlined />} className="!bg-slate-100 dark:!bg-white/5" /></Form.Item>
                    <Form.Item label="Inspection Executive / Nirikshak ka Naam" name="executiveName" rules={[{ required: true, message: "Executive naam bharo." }]} className="!mb-0"><Input prefix={<UserOutlined />} placeholder="Evaluator ka poora naam" /></Form.Item>
                    <Form.Item label="Contact No. / Mobile Number" name="executiveMobile" rules={[{ required: true, message: "Mobile number bharo." }]} className="!mb-0"><Input prefix={<PhoneOutlined />} placeholder="10-digit mobile number" maxLength={10} /></Form.Item>
                    <Form.Item label="Inspection Location / Jagah" name="inspectionLocation" rules={[{ required: true, message: "Location bharo." }]} className="!mb-0"><Input placeholder="Seller ka ghar ya showroom address" /></Form.Item>
                    <Form.Item label="Inspection Date / Tithi" name="inspectionDate" rules={[{ required: true, message: "Date chunein." }]} className="!mb-0"><DatePicker className="w-full" format="DD-MM-YYYY" /></Form.Item>
                    <Form.Item label="Inspection Time / Samay" name="inspectionTime" rules={[{ required: true, message: "Time chunein." }]} className="!mb-0"><TimePicker className="w-full" format="hh:mm A" use12Hours /></Form.Item>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Lead Verification / Lead Satyapan</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {LEAD_VERIFICATION_FIELDS.map((field) => (
                      <Form.Item key={field.key} name={["leadVerification", field.key]} valuePropName="checked" className="!mb-0">
                        <div className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                          <Checkbox className="mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{field.labelEn}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{field.labelHi}</p>
                          </div>
                        </div>
                      </Form.Item>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Form.Item label="Airbag Count" name="airbagCount" className="!mb-0"><Select allowClear options={AIRBAG_OPTS.map((v) => ({ value: v, label: v }))} /></Form.Item>
                    <Form.Item label="Transmission Type" name="transmissionType" className="!mb-0"><Select allowClear options={TRANSMISSION_OPTS.map((v) => ({ value: v, label: v }))} /></Form.Item>
                    <Form.Item label="Seat Material" name="seatMaterial" className="!mb-0"><Select allowClear options={SEAT_OPTS.map((v) => ({ value: v, label: v }))} /></Form.Item>
                    <Form.Item label="Fuel Type" name="fuelType" className="!mb-0"><Input placeholder="Fuel type" /></Form.Item>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Mandatory Photos / Zaroori Photos</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {PHOTO_BUCKETS.map((bucket) => (
                      <div key={bucket.key} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{bucket.labelEn}</p>
                        <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">{bucket.labelHi}</p>
                        <Form.Item name={["photoBuckets", bucket.key]} valuePropName="fileList" getValueFromEvent={(e) => e?.fileList} className="!mb-0">
                          <Upload beforeUpload={() => false} multiple listType="picture" accept="image/*">
                            <Button icon={<CameraOutlined />} size="small" className="!rounded-full !text-xs">Attach Photos</Button>
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Detailed Inspection Checklist / Vistar se Jaanch</p>
                      <p className="mt-1 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">Body, mechanicals, electricals, safety aur road test — sab kuch cover karo</p>
                    </div>
                    <ScoreBadge score={calcOverallScore(reportItems)} />
                  </div>
                </div>
                <Collapse ghost defaultActiveKey={[INSPECTION_SECTIONS[0].key]} className="!bg-transparent">
                  {INSPECTION_SECTIONS.map((section) => (
                    <Panel key={section.key} className="!mb-3 !rounded-[22px] !border !border-slate-200 !bg-white dark:!border-white/10 dark:!bg-[#11151b]" header={<div className="flex items-center justify-between gap-3 py-1"><div className="flex items-center gap-3"><span className="text-xl leading-none">{section.icon}</span><div><p className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">{section.titleEn}</p><p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{section.titleHi}</p></div></div><div className="flex items-center gap-3"><SectionProgressBar sectionKey={section.key} itemValues={reportItems} /><span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ background: section.color }}>{section.items.length} items</span></div></div>}>
                      <div className="grid gap-3 xl:grid-cols-2">
                        {section.items.map((item) => <SectionItemCard key={item.key} item={item} section={section} formName="items" />)}
                      </div>
                    </Panel>
                  ))}
                </Collapse>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Final Decision / Antim Nirnay</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Form.Item label="Inspection Result / Natija" name="verdict" rules={[{ required: true, message: "Verdict chunein." }]} className="!mb-0"><Select placeholder="Pass ya No-Go?" options={[{ value: "Inspection Passed", label: "Inspection Passed — Gaadi theek hai" }, { value: NOGO_REASON, label: "No-Go Car — Yeh gaadi nahi chalegi" }]} /></Form.Item>
                    <Form.Item label="Estimated Refurb Cost / Theek karne ka kharcha" name="estimatedRefurbCost" className="!mb-0"><InputNumber className="w-full" min={0} placeholder="e.g. 25000" formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/₹\s?|(,*)/g, "")} /></Form.Item>
                    <Form.Item label="Evaluator's Price / Evaluator ki Keemat" name="evaluatorPrice" className="!mb-0"><InputNumber className="w-full" min={0} placeholder="e.g. 450000" formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/₹\s?|(,*)/g, "")} /></Form.Item>
                    <Form.Item label="Negotiation Notes / Mol-tol ki Baatein" name="negotiationNotes" className="!mb-0"><Input placeholder="Seller ne kya kaha? Koi deal point?" /></Form.Item>
                  </div>
                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.verdict !== curr.verdict}>
                    {({ getFieldValue }) => getFieldValue("verdict") === NOGO_REASON ? (
                      <div className="mt-3">
                        <Form.Item label="No-Go Reason / No-Go ki Wajah" name="noGoReason" rules={[{ required: true, message: "No-Go ki wajah likhna zaroori hai." }]} className="!mb-0">
                          <Select placeholder="No-Go ki wajah chunein..." showSearch allowClear options={NOGO_REASONS.map((v) => ({ value: v, label: v }))} />
                        </Form.Item>
                      </div>
                    ) : null}
                  </Form.Item>
                  <div className="mt-3">
                    <Form.Item label="Overall Remarks / Saari Baatein" name="overallRemarks" rules={[{ required: true, message: "Overall remarks likhna zaroori hai." }]} className="!mb-0">
                      <TextArea rows={4} placeholder="Poori inspection ka summary — kya theek hai, kya nahi, resale view, aur koi bhi zaroori baat..." />
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
        <QueueMetric label="Scheduled" value={summary.scheduled} helper="Fresh queue — field visit pending" />
        <QueueMetric label="Due Today" value={summary.dueToday} helper="Aaj ki inspections" tone="sky" />
        <QueueMetric label="Rescheduled" value={summary.rescheduled} helper="Visit moved to new slot" tone="amber" />
        <QueueMetric label="Draft Reports" value={summary.draft} helper="Started, submit pending" tone="violet" />
        <QueueMetric label="Completed" value={summary.completed} helper="Reports submitted" tone="emerald" />
        <QueueMetric label="Passed" value={summary.passed} helper="Ready for next stage" tone="emerald" />
        <QueueMetric label="No-Go" value={summary.nogo} helper="Closed at inspection desk" tone="rose" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.34fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Inspection Queue</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">Vehicles ready for field evaluation</h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-300">{filteredLeads.length} vehicles</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUEUE_FILTERS.map((item) => {
              const active = queueFilter === item;
              return (
                <button key={item} type="button" onClick={() => setQueueFilter(item)} className={`rounded-full px-3 py-2 text-xs font-bold tracking-tight transition-all ${active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"}`}>
                  {item}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <Input allowClear prefix={<SearchOutlined className="text-slate-400" />} placeholder="Search seller, reg no, vehicle or inspection ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {filteredLeads.length > 0 ? filteredLeads.map((lead) => (
              <InspectionQueueCard key={lead.id} lead={lead} active={selectedLead?.id === lead.id} onClick={() => setSelectedLeadId(lead.id)} />
            )) : (
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
                  <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{selectedLead.make} {selectedLead.model} {selectedLead.variant}</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{selectedLead.name} · {selectedLead.mobile} · {selectedLead.regNo || "Registration pending"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getInspectionState(selectedLead).tone}`}>{getInspectionState(selectedLead).label}</span>
                  <Button icon={<ReloadOutlined />} onClick={() => openVisitUpdate(selectedLead)} className="!rounded-full">Visit Update</Button>
                  {selectedLead.inspection?.submittedAt ? (
                    <>
                      <Button icon={<FileSearchOutlined />} onClick={() => openInspectionReport(selectedLead, "view")} className="!rounded-full">View Report</Button>
                      <Button type="primary" icon={<FileTextOutlined />} onClick={() => openInspectionReport(selectedLead)} className="!rounded-full !bg-slate-900 !px-4 !font-bold dark:!bg-white dark:!text-slate-950">Continue Report</Button>
                    </>
                  ) : (
                    <Button type="primary" icon={selectedLead.inspection?.startedAt ? <FileTextOutlined /> : <PlayCircleOutlined />} onClick={() => openInspectionReport(selectedLead)} className="!rounded-full !bg-slate-900 !px-4 !font-bold dark:!bg-white dark:!text-slate-950">{selectedLead.inspection?.startedAt ? "Continue Report" : "Start Inspection"}</Button>
                  )}
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <QueueMetric label="Inspection Executive" value={selectedLead.inspection?.executiveName || selectedLead.assignedTo || "Pending"} helper={selectedLead.inspection?.executiveMobile || "Contact not captured"} />
                <QueueMetric label="Scheduled For" value={selectedLead.inspection?.rescheduledAt || selectedLead.inspectionScheduledAt ? fmt(selectedLead.inspection?.rescheduledAt || selectedLead.inspectionScheduledAt) : "Not scheduled"} helper="Current field visit slot" />
                <QueueMetric label="Seller Ask" value={fmtInrOrPending(getPrice(selectedLead))} helper={`${getMileage(selectedLead) || "Kms pending"} · ${selectedLead.ownership || "Ownership pending"}`} tone="emerald" />
                <QueueMetric label="Inspection ID" value={selectedLead.inspection?.inspectionId || "Not generated"} helper={selectedLead.inspection?.submittedAt ? `Submitted ${fmt(selectedLead.inspection.submittedAt)}` : "Will auto-generate on start"} tone="violet" />
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Lead and Vehicle Snapshot</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      ["Seller Address", selectedLead.address || "Pending"],
                      ["Fuel / Year", `${selectedLead.fuel || "—"} · ${selectedLead.mfgYear || "—"}`],
                      ["Color", selectedLead.color || "—"],
                      ["Insurance", getInsuranceDisplay(selectedLead) || "Pending"],
                      ["Hypothecation", selectedLead.hypothecation === true ? `Yes — ${selectedLead.bankName || "Bank pending"}` : selectedLead.hypothecation === false ? "No" : "Unknown"],
                      ["Accident History", selectedLead.accidentPaintHistory === true ? selectedLead.accidentPaintNotes || "Yes" : selectedLead.accidentPaintHistory === false ? "No" : "Unknown"],
                      ["Expected Price", fmtInrOrPending(getPrice(selectedLead))],
                      ["Mileage", getMileage(selectedLead) || "Pending"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Current Inspection Status</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Outcome / Natija</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLead.inspection?.verdict || getInspectionState(selectedLead).label}</p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Remarks / Tippani</p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">{selectedLead.inspection?.remarks || selectedLead.notes || "No inspection remarks recorded yet."}</p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Last Movement</p>
                      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{selectedLead.activities?.[0] ? `${selectedLead.activities[0].title} — ${fmt(selectedLead.activities[0].at)}` : "No inspection movement logged yet."}</p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">How this works / Kaise kaam karta hai</p>
                      {[
                        "1. Visit Update — agar inspection nahi ho saki, reschedule karo.",
                        "2. Start Inspection — jab evaluator ready ho tab full report bharo.",
                        "3. Report mein bilingual checkpoints, dropdowns aur photos hain.",
                        "4. Passed cars aage jaati hain, No-Go cars yahan band ho jaati hain.",
                      ].map((line) => <p key={line} className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">{line}</p>)}
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

      <VisitUpdateModal open={visitModalOpen} selectedLead={selectedLead} visitForm={visitForm} onCancel={() => { setVisitModalOpen(false); visitForm.resetFields(); }} onSubmit={handleVisitUpdate} />
    </section>
  );
}
