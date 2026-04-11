import { PIPELINE_COLUMNS } from "../constants";
import { dayjs, fmtDate } from "./formatters";

export const normText = (v) =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ");

export const normalizeHeaderKey = (v) =>
  normText(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export const normMoney = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, "") || 0);
  return Number.isFinite(n) ? n : 0;
};

export const normInsurance = (v) => {
  const t = normText(v).toLowerCase();
  if (!t) return "";
  if (t.includes("zero")) return "Zero-Dep";
  if (t.includes("third")) return "Third Party";
  if (t.includes("expired")) return "Expired";
  if (t.includes("comprehensive") || t.includes("valid")) return "Comprehensive";
  return "";
};

export const normStatus = (v) => {
  const status = normText(v);
  if (!status) return "New";
  if (status === "Attempted") return "Not Answered";
  return status;
};

export const genId = (p = "UL") =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const mkActivity = (type, title, detail) => ({
  id: genId("act"),
  type,
  title,
  detail,
  at: new Date().toISOString(),
});

export function firstPresent(...vals) {
  return vals.find((val) => normText(val) || Number(val || 0) > 0);
}

export const pickMapped = (mapped, aliases) =>
  firstPresent(...aliases.map((alias) => mapped[normalizeHeaderKey(alias)]));

export const getPrice = (r) =>
  normMoney(firstPresent(r.updatedExpectedPrice, r.expectedPrice, r.priceExpected, r.price));

export const parseLeadDate = (value) =>
  dayjs(value, ["DD MMM YYYY", "DD-MM-YYYY", "YYYY-MM-DD"], true);

export const getMileage = (r) => normText(r.mileage || r.milage);

export const getInsuranceDisplay = (r) =>
  normText(r.insuranceCategory || normInsurance(r.insurance) || r.insurance);

export const getInitials = (name) =>
  String(name || "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase();

export const getCompleteness = (r) => {
  const filled = [
    normText(r.make),
    normText(r.model),
    normText(r.variant),
    normText(r.mfgYear),
    normText(r.color),
    getMileage(r),
    normText(r.fuel),
    normText(r.regNo),
    normText(r.ownership),
    getInsuranceDisplay(r),
  ].filter(Boolean).length;
  const hypo = r.hypothecation === true || r.hypothecation === false ? 1 : 0;
  const accident = r.accidentPaintHistory === true || r.accidentPaintHistory === false ? 1 : 0;
  const price = getPrice(r) > 0 ? 1 : 0;
  return Math.round(((filled + hypo + accident + price) / 13) * 100);
};

const POPULAR_MODELS = [
  "swift",
  "baleno",
  "wagon r",
  "city",
  "creta",
  "i20",
  "grand i10",
  "innova crysta",
  "nexon",
  "brezza",
];

export const getProcurementScore = (lead) => {
  let score = 20;
  const mileage = Number(getMileage(lead) || 0);
  const owner = normText(lead.ownership).toLowerCase();
  const insurance = getInsuranceDisplay(lead).toLowerCase();
  const hasHypothecation = lead.hypothecation === true;
  const hasAccidentHistory = lead.accidentPaintHistory === true;
  const price = getPrice(lead);
  const modelKey = `${normText(lead.make)} ${normText(lead.model)}`.toLowerCase();
  const completeness = getCompleteness(lead);

  if (mileage > 0 && mileage <= 30000) score += 18;
  else if (mileage <= 60000) score += 12;
  else if (mileage <= 90000) score += 6;

  if (owner.includes("1")) score += 14;
  else if (owner.includes("2")) score += 8;
  else if (owner) score += 4;

  if (insurance.includes("zero")) score += 10;
  else if (insurance.includes("comprehensive")) score += 8;
  else if (insurance.includes("third")) score += 4;

  if (!hasHypothecation) score += 10;
  if (!hasAccidentHistory) score += 8;
  if (price > 0 && price <= 1500000) score += 6;
  if (POPULAR_MODELS.some((model) => modelKey.includes(model))) score += 8;
  if (normText(lead.variant)) score += 4;
  if (normText(lead.regNo)) score += 2;
  score += Math.round(completeness / 10);

  return Math.max(0, Math.min(100, score));
};

export const getScoreTone = (score) => {
  if (score >= 80) return { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857", label: "Hot" };
  if (score >= 60) return { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", label: "Strong" };
  if (score >= 40) return { bg: "#fffbeb", border: "#fde68a", text: "#b45309", label: "Warm" };
  return { bg: "#fff1f2", border: "#fecdd3", text: "#be123c", label: "Cold" };
};

export const getPendingCallFields = (record) => {
  if (!record) return [];
  const items = [
    { key: "make", label: "Make", missing: !normText(record.make) },
    { key: "model", label: "Model", missing: !normText(record.model) },
    { key: "variant", label: "Variant", missing: !normText(record.variant) },
    { key: "mfgYear", label: "Year", missing: !normText(record.mfgYear) },
    { key: "color", label: "Color", missing: !normText(record.color) },
    { key: "mileage", label: "Kms", missing: !getMileage(record) },
    { key: "fuel", label: "Fuel", missing: !normText(record.fuel) },
    { key: "regNo", label: "Reg No", missing: !normText(record.regNo) },
    { key: "ownership", label: "Ownership", missing: !normText(record.ownership) },
    { key: "insuranceCategory", label: "Insurance Type", missing: !getInsuranceDisplay(record) },
    {
      key: "hypothecation",
      label: "Hypothecation",
      missing: !(record.hypothecation === true || record.hypothecation === false),
    },
    {
      key: "bankName",
      label: "Bank Name",
      missing: record.hypothecation === true && !normText(record.bankName),
    },
    {
      key: "accidentPaintHistory",
      label: "Accident/Paint History",
      missing: !(record.accidentPaintHistory === true || record.accidentPaintHistory === false),
    },
    {
      key: "accidentPaintNotes",
      label: "Accident Notes",
      missing: record.accidentPaintHistory === true && !normText(record.accidentPaintNotes),
    },
    {
      key: "updatedExpectedPrice",
      label: "Updated Expected Price",
      missing: !getPrice(record),
    },
  ];
  return items.filter((item) => item.missing);
};

export const buildLeadSignature = (lead) =>
  [
    normText(lead.mobile).replace(/\D/g, "").slice(-10),
    normText(lead.regNo).toLowerCase(),
    normText(lead.make).toLowerCase(),
    normText(lead.model).toLowerCase(),
    normText(lead.variant).toLowerCase(),
  ]
    .filter(Boolean)
    .join("|");

export const isOverdue = (r) => r.nextFollowUp && dayjs(r.nextFollowUp).isBefore(dayjs());
export const isDueToday = (r) =>
  r.nextFollowUp && !isOverdue(r) && dayjs(r.nextFollowUp).isBefore(dayjs().endOf("day"));

export const getColMeta = (key) =>
  PIPELINE_COLUMNS.find((c) => c.key === key) || PIPELINE_COLUMNS[0];

export const getNextStatusKey = (status) => {
  const idx = PIPELINE_COLUMNS.findIndex((item) => item.key === status);
  if (idx === -1 || idx === PIPELINE_COLUMNS.length - 1) return null;
  return PIPELINE_COLUMNS[idx + 1].key;
};

export const getCallScriptItems = (record) =>
  getPendingCallFields(record).map((field) => {
    const prompts = {
      make: "Ask: Which car make is this vehicle?",
      model: "Ask: Which model are you selling?",
      variant: "Ask: Which exact variant or trim is it?",
      mfgYear: "Ask: Which manufacturing year is mentioned on the RC?",
      color: "Ask: What is the exterior color?",
      mileage: "Ask: How many kilometres has the car run?",
      fuel: "Ask: Is it petrol, diesel, CNG, hybrid, or EV?",
      regNo: "Ask: Please confirm the registration number.",
      ownership: "Ask: Is this 1st owner, 2nd owner, or more?",
      insuranceCategory: "Ask: Is the insurance comprehensive, zero-dep, third-party, or expired?",
      hypothecation: "Ask: Is the car under any active bank finance or hypothecation?",
      bankName: "Ask: Which bank holds the hypothecation?",
      accidentPaintHistory: "Ask: Has the car had any accident or paint work?",
      accidentPaintNotes: "Ask: What exactly was repaired or repainted?",
      updatedExpectedPrice: "Ask: What is the latest expected selling price today?",
    };
    return { ...field, prompt: prompts[field.key] || `Ask for ${field.label}.` };
  });

export const normalizeLeadRecord = (lead) => ({
  ...lead,
  status: normStatus(lead.status),
  mileage: normText(lead.mileage || lead.milage),
  insuranceCategory: getInsuranceDisplay(lead),
  inspection: {
    inspectionId: "",
    executiveName: "",
    executiveMobile: "",
    conducted: null,
    verdict: "",
    noGoReason: "",
    remarks: "",
    lastOutcome: "",
    rescheduledAt: null,
    rescheduleExecutiveName: "",
    rescheduleExecutiveMobile: "",
    checklist: {},
    startedAt: null,
    submittedAt: null,
    ...(lead.inspection || {}),
  },
  procurementScore:
    typeof lead.procurementScore === "number" ? lead.procurementScore : getProcurementScore(lead),
});

export const buildImportedLead = (mapped, index, stage) => ({
  id: genId("UL"),
  name: normText(pickMapped(mapped, ["Name"])),
  mobile: normText(pickMapped(mapped, ["Mobile"])),
  address: [
    normText(pickMapped(mapped, ["Area"])),
    normText(pickMapped(mapped, ["City", "Pincode City"])),
  ]
    .filter(Boolean)
    .join(", "),
  leadDate:
    normText(
      firstPresent(
        pickMapped(mapped, ["Added Date", "Lead Date", "Status Date", "Status Updated Date"]),
        pickMapped(mapped, ["Date", "Created Date"]),
      ),
    ) || fmtDate(new Date()),
  leadId: normText(pickMapped(mapped, ["C2B Lead Id", "Lead ID"]) || `IMP-${index + 1}`),
  make: normText(pickMapped(mapped, ["Make"])),
  model: normText(pickMapped(mapped, ["Model"])),
  variant: normText(pickMapped(mapped, ["Version", "Variant"])),
  mfgYear: normText(pickMapped(mapped, ["Mfg Year"])),
  color: normText(pickMapped(mapped, ["Color"])),
  mileage: normText(pickMapped(mapped, ["Mileage", "Milage"])),
  fuel: normText(pickMapped(mapped, ["Fuel"])),
  regNo: normText(pickMapped(mapped, ["Regno", "Reg No"])),
  ownership: normText(pickMapped(mapped, ["Owner", "Ownership"])),
  insurance: normText(pickMapped(mapped, ["Insurance"])),
  insuranceCategory: normInsurance(pickMapped(mapped, ["Insurance"])),
  hypothecation: null,
  bankName: "",
  accidentPaintHistory: null,
  accidentPaintNotes: "",
  source: normText(pickMapped(mapped, ["Source"])),
  expectedPrice: normMoney(
    firstPresent(
      pickMapped(mapped, ["Expected Price"]),
      pickMapped(mapped, ["Expected price", "Price Expected"]),
      pickMapped(mapped, ["Expected Amount", "Price", "Quoted Price"]),
    ),
  ),
  updatedExpectedPrice: null,
  status: normStatus(pickMapped(mapped, ["Status"])),
  pipelineStage: stage,
  assignedTo: normText(pickMapped(mapped, ["Executive Name"])),
  nextFollowUp: null,
  inspectionScheduledAt: null,
  closureReason: "",
  notes: normText(pickMapped(mapped, ["Note against status"])),
  activities: [
    mkActivity(
      "lead-imported",
      "Lead imported",
      normText(pickMapped(mapped, ["Status"])) || "New",
    ),
  ],
});
