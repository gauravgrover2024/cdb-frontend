// ── Background Check Storage ─────────────────────────────────────
export const BGC_STORAGE_KEY = "used-car-bgc-v1";
export const INSPECTION_DONE_STAGE = "Inspection Done";

// ── Queue Filters ─────────────────────────────────────────────────
export const BGC_QUEUE_FILTERS = ["All", "Pending", "Vahan Done", "BGC Complete"];

// ── Vahan Check Options ───────────────────────────────────────────
export const OWNERSHIP_SERIAL_OPTS = ["1st", "2nd", "3rd", "4th", "5th+"];

export const FUEL_TYPE_OPTS = [
  "Petrol",
  "Diesel",
  "CNG",
  "Electric",
  "Hybrid",
  "LPG",
  "CNG + Petrol",
];

export const ROAD_TAX_STATUS_OPTS = [
  "Paid — Up to date",
  "Due — Payment pending",
  "Exempted",
  "Not Available",
];

export const NOC_STATUS_OPTS = [
  "Not Issued",
  "Issued — In Transit",
  "Received",
  "Not Applicable",
];

export const PARTY_PESHI_OPTS = [
  "Not Applicable",
  "Applicable — Date pending",
  "Applicable — Date confirmed",
  "Completed",
];

// ── Service History Options ───────────────────────────────────────
export const SERVICE_HISTORY_OPTS = ["Yes", "No", "N.A."];

export const ACCIDENT_HISTORY_OPTS = [
  "None",
  "Minor — Cosmetic only",
  "Major — Structural damage",
];

export const ODOMETER_STATUS_OPTS = [
  "Not Tampered",
  "Suspected Tamper",
  "Confirmed Tamper",
];

// ── BGC Status flow ───────────────────────────────────────────────
export const BGC_STATUS = {
  PENDING: "Pending",
  VAHAN_DONE: "Vahan Done",
  COMPLETE: "BGC Complete",
};

// ── Sample BGC queue (cars with inspection done) ─────────────────
export const BGC_SAMPLE_LEADS = [
  {
    id: "UL-2403",
    name: "Harish Verma",
    mobile: "98XXXX7721",
    make: "Hyundai",
    model: "i20",
    variant: "Sportz 1.4 AT",
    mfgYear: "2020",
    fuel: "Petrol",
    regNo: "HR26EM2201",
    ownership: "1st",
    hypothecation: false,
    bankName: "",
    assignedTo: "Deepak",
    inspectionScore: 82,
    bgcStatus: BGC_STATUS.PENDING,
    bgcData: null,
  },
  {
    id: "UL-2406",
    name: "Ankur Saxena",
    mobile: "91XXXX4422",
    make: "Maruti Suzuki",
    model: "Baleno",
    variant: "Delta CVT",
    mfgYear: "2021",
    fuel: "Petrol",
    regNo: "DL7CF1199",
    ownership: "1st",
    hypothecation: false,
    bankName: "",
    assignedTo: "Aviral",
    inspectionScore: 74,
    bgcStatus: BGC_STATUS.PENDING,
    bgcData: null,
  },
  {
    id: "UL-2407",
    name: "Meera Joshi",
    mobile: "99XXXX6633",
    make: "Honda",
    model: "Amaze",
    variant: "VX CVT",
    mfgYear: "2019",
    fuel: "Petrol",
    regNo: "UP16BT0041",
    ownership: "2nd",
    hypothecation: true,
    bankName: "Axis Bank",
    assignedTo: "Tarun",
    inspectionScore: 68,
    bgcStatus: BGC_STATUS.VAHAN_DONE,
    bgcData: null,
  },
  {
    id: "UL-2408",
    name: "Sunil Rawat",
    mobile: "96XXXX3311",
    make: "Toyota",
    model: "Innova Crysta",
    variant: "2.4 GX MT",
    mfgYear: "2018",
    fuel: "Diesel",
    regNo: "UP14DS6519",
    ownership: "2nd",
    hypothecation: false,
    bankName: "",
    assignedTo: "Deepak",
    inspectionScore: 91,
    bgcStatus: BGC_STATUS.COMPLETE,
    bgcData: null,
  },
];

// ── Default empty BGC form values ─────────────────────────────────
export function getDefaultBgcValues(lead = {}) {
  return {
    // Vahan Check
    ownerName: lead.name || "",
    hypothecation: lead.hypothecation === true ? "Yes" : lead.hypothecation === false ? "No" : null,
    hypothecationBank: lead.bankName || "",
    ownershipSerialNo: lead.ownership || null,
    make: lead.make || "",
    model: lead.model || "",
    variant: lead.variant || "",
    fuelType: lead.fuel || null,
    mfgYear: lead.mfgYear || "",
    regdDate: null,
    rcExpiry: null,
    roadTaxExpiry: null,
    roadTaxSameAsRc: false,
    blacklisted: null,
    blacklistedFiles: [],
    theft: null,
    theftFiles: [],
    roadTaxStatus: null,
    challanPending: null,
    echallanCount: null,
    echallanAmount: null,
    echallanFiles: [],
    dtpCount: null,
    dtpAmount: null,
    dtpFiles: [],
    rtoNocIssued: null,
    vahanComments: "",
    partyPeshi: null,
    partyPeshiDetail: "",
    // Service History
    serviceHistoryAvailable: null,
    accidentHistory: null,
    lastServiceDate: null,
    lastServiceOdometer: null,
    currentOdometer: null,
    odometerStatus: null,
    floodedCar: null,
    totalLossVehicle: null,
    migratedVehicle: null,
    serviceComments: "",
  };
}


