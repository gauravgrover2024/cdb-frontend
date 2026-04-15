import dayjs from "dayjs";
import {
  INSPECTION_SECTIONS,
  isPositiveInspectionStatus,
  normalizeStatusList,
} from "./constants";

const ITEM_LABELS = Object.fromEntries(
  INSPECTION_SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.key, item.labelEn]),
  ),
);

const PANEL_KEYS = [
  "bonnet",
  "roof",
  "bootFloor",
  "leftFender",
  "rightFender",
  "leftFrontDoor",
  "leftRearDoor",
  "rightFrontDoor",
  "rightRearDoor",
  "leftQuarterPanel",
  "rightQuarterPanel",
  "frontBumper",
  "rearBumper",
  "leftRunningBoard",
  "rightRunningBoard",
  "windshield",
  "rearWindshield",
  "windowGlasses",
  "orvms",
  "headlamps",
  "taillamps",
];

const STRUCTURAL_KEYS = [
  "leftApronLeg",
  "rightApronLeg",
  "firewall",
  "radiatorSupport",
  "underbodyRust",
];

const NOGO_STRUCTURAL_KEYS = [
  "leftAPillar",
  "rightAPillar",
  "leftBPillar",
  "rightBPillar",
  "leftCPillar",
  "rightCPillar",
  "roof",
  "bootFloor",
  "firewall",
];

const getStatuses = (value) => normalizeStatusList(value?.status || value);
const hasStatus = (value, target) =>
  getStatuses(value).some(
    (entry) => String(entry || "").toLowerCase() === String(target || "").toLowerCase(),
  );
const hasAnyStatusToken = (value, tokens = []) =>
  getStatuses(value).some((entry) => {
    const current = String(entry || "").toLowerCase();
    return tokens.some((token) => current.includes(String(token || "").toLowerCase()));
  });
const isIssue = (value) =>
  getStatuses(value).length > 0 && !isPositiveInspectionStatus(getStatuses(value));

const sectionResult = (overrides = {}) => ({
  status: "OK",
  cost: 0,
  cap: 0,
  issueCount: 0,
  notes: [],
  noGoReasons: [],
  ...overrides,
});

const pushReason = (arr, reason) => {
  if (reason && !arr.includes(reason)) arr.push(reason);
};

const getAskPrice = (lead = {}, values = {}) =>
  Number(
    values?.evaluatorPrice ||
      lead?.updatedExpectedPrice ||
      lead?.expectedPrice ||
      lead?.pricing?.updatedExpectedPrice ||
      lead?.pricing?.expectedPrice ||
      0,
  ) || 0;

const getInsuranceValidity = (values = {}, lead = {}) => {
  const insuranceType = String(
    values.insuranceType ||
      lead.insuranceCategory ||
      lead.insuranceType ||
      lead?.vehicle?.insuranceCategory ||
      "",
  ).toLowerCase();
  const expiry =
    values.insuranceExpiry ||
    lead.insuranceExpiry ||
    lead?.vehicle?.insuranceExpiry ||
    null;
  const daysLeft = expiry ? dayjs(expiry).diff(dayjs(), "day") : -999;
  return insuranceType.includes("comprehensive") && daysLeft > 20;
};

const calculateExteriorSection = (items = {}) => {
  let paintCount = 0;
  let structuralCost = 0;
  const noGoReasons = [];

  PANEL_KEYS.forEach((key) => {
    if (hasAnyStatusToken(items[key], ["dent", "scratch", "repaired", "replaced"])) {
      paintCount += 1;
    }
  });

  STRUCTURAL_KEYS.forEach((key) => {
    if (isIssue(items[key])) structuralCost += 3000;
  });

  NOGO_STRUCTURAL_KEYS.forEach((key) => {
    if (hasStatus(items[key], "Repaired")) {
      pushReason(noGoReasons, `${ITEM_LABELS[key]} repaired`);
    }
  });

  let panelCost = paintCount * 1500;
  if (paintCount > 12) panelCost = 18000;
  const total = Math.min(panelCost + structuralCost, 30000);

  return sectionResult({
    status: noGoReasons.length ? "NO_GO" : "OK",
    cost: noGoReasons.length ? 0 : total,
    cap: 30000,
    issueCount: paintCount + STRUCTURAL_KEYS.filter((key) => isIssue(items[key])).length,
    notes: [
      ...(paintCount ? [`${paintCount} exterior panels need cosmetic work`] : []),
      ...(structuralCost ? [`Structural correction pool: Rs ${structuralCost}`] : []),
    ],
    noGoReasons,
  });
};

const calculateExteriorFitmentSection = (items = {}, insuranceValidAndComprehensive = false) => {
  let total = 0;
  const glassCost = insuranceValidAndComprehensive ? 2000 : 9000;

  if (isIssue(items.windshield)) total += glassCost;
  if (isIssue(items.rearWindshield)) total += glassCost;
  if (isIssue(items.windowGlasses)) total += glassCost;
  if (isIssue(items.orvms)) total += 2000;
  if (isIssue(items.headlamps)) total += 3000;
  if (isIssue(items.taillamps)) total += 3000;
  if (isIssue(items.fogLamps)) total += 1000;
  if (isIssue(items.drl)) total += 3000;
  if (isIssue(items.indicators)) total += 2000;
  if (isIssue(items.bumpersGrille)) total += 3000;

  const issueCount = [
    "windshield",
    "rearWindshield",
    "windowGlasses",
    "orvms",
    "headlamps",
    "taillamps",
    "fogLamps",
    "drl",
    "indicators",
    "bumpersGrille",
  ].filter((key) => isIssue(items[key])).length;

  return sectionResult({
    cost: Math.min(total, 30000),
    cap: 30000,
    issueCount,
    notes: insuranceValidAndComprehensive
      ? ["Comprehensive insurance valid: glass pricing softened"]
      : [],
  });
};

const treadBelowThree = (value) => {
  const depth = Number(value?.treadDepth);
  return Number.isFinite(depth) && depth > 0 && depth < 3;
};

const calculateWheelsTyresSection = (items = {}) => {
  let tyreCost = 0;
  let total = 0;
  ["frontLeftTyre", "frontRightTyre", "rearLeftTyre", "rearRightTyre"].forEach((key) => {
    if (treadBelowThree(items[key])) tyreCost += 5000;
  });
  tyreCost = Math.min(tyreCost, 20000);
  total += tyreCost;
  if (isIssue(items.wheelCaps)) total += 1000;
  if (isIssue(items.brakes)) total += 7000;
  if (isIssue(items.powerSteering)) total += 8000;
  if (isIssue(items.handbrake)) total += 3000;

  return sectionResult({
    cost: total,
    cap: 39000,
    issueCount: ["wheelCaps", "brakes", "powerSteering", "handbrake"].filter((key) =>
      isIssue(items[key]),
    ).length + ["frontLeftTyre", "frontRightTyre", "rearLeftTyre", "rearRightTyre"].filter((key) =>
      treadBelowThree(items[key]),
    ).length,
    notes: tyreCost ? [`Tyre replacement reserve: Rs ${tyreCost}`] : [],
  });
};

const calculateEngineSection = (items = {}) => {
  let total = 0;
  const noGoReasons = [];

  if (hasAnyStatusToken(items.engineStart, ["hard start", "does not start"])) total += 5000;
  if (hasAnyStatusToken(items.engineNoise, ["noticeable", "heavy"])) total += 10000;
  if (hasAnyStatusToken(items.engineSmoke, ["white", "blue", "grey", "black"])) total += 20000;
  if (isIssue(items.engineLeakage)) total += 5000;
  if (isIssue(items.oilLevel)) total += 2000;
  if (isIssue(items.batteryCondition) && !hasStatus(items.batteryCondition, "Not Available")) total += 5000;
  if (isIssue(items.exhaustSystem)) total += 5000;
  if (isIssue(items.engineMounting)) total += 5000;
  if (isIssue(items.cngKit) && !hasStatus(items.cngKit, "Not Available")) total += 5000;

  if (isIssue(items.engineSmoke)) {
    pushReason(noGoReasons, "Engine smoke observed");
    total = 35000;
  }
  if (isIssue(items.engineNoise)) {
    pushReason(noGoReasons, "Engine noise / vibration observed");
    total = 35000;
  }

  return sectionResult({
    status: noGoReasons.length ? "NO_GO" : "OK",
    cost: noGoReasons.length ? 0 : Math.min(total, 35000),
    cap: 35000,
    issueCount: [
      "engineStart",
      "engineNoise",
      "engineSmoke",
      "engineLeakage",
      "oilLevel",
      "batteryCondition",
      "exhaustSystem",
      "engineMounting",
      "cngKit",
    ].filter((key) => isIssue(items[key])).length,
    noGoReasons,
  });
};

const calculateInteriorSection = (items = {}) => {
  let total = 0;
  const issueCount = Object.values({
    dashboard: isIssue(items.dashboardTrim),
    seats: isIssue(items.seatsUpholstery),
    headliner: isIssue(items.headliner),
    doorPads: isIssue(items.doorPadsTrim),
    checkEngineLight: isIssue(items.checkEngineLight),
    absLight: isIssue(items.absLight),
    airbagLight: isIssue(items.airbagLight),
    batteryLight: isIssue(items.batteryLight),
    oilPressureLight: isIssue(items.oilPressureLight),
    infotainment: isIssue(items.infotainment) && !hasStatus(items.infotainment, "Retained by Customer"),
    speakers: isIssue(items.speakers) && !hasStatus(items.speakers, "Retained by Customer"),
    powerWindows: isIssue(items.powerWindows),
    centralLocking: isIssue(items.centralLocking),
    reverseCamera: isIssue(items.reverseCamera),
    hornControls: isIssue(items.hornSteeringCtrl),
    steeringWheel: isIssue(items.steeringWheel),
    gearKnob: isIssue(items.gearKnob),
    handbrakeHandle: isIssue(items.handbrakeHandle),
    sunroof: isIssue(items.sunroof) && !hasStatus(items.sunroof, "Not Available"),
  }).filter(Boolean).length;

  if (isIssue(items.dashboardTrim)) total += 1000;
  if (isIssue(items.seatsUpholstery)) total += 2000;
  if (isIssue(items.headliner)) total += 1000;
  if (isIssue(items.doorPadsTrim)) total += 1000;
  if (isIssue(items.checkEngineLight)) total += 1000;
  if (isIssue(items.absLight)) total += 1000;
  if (isIssue(items.airbagLight)) total += 1000;
  if (isIssue(items.batteryLight)) total += 1000;
  if (isIssue(items.oilPressureLight)) total += 1000;
  if (isIssue(items.infotainment) && !hasStatus(items.infotainment, "Retained by Customer")) total += 1000;
  if (isIssue(items.speakers) && !hasStatus(items.speakers, "Retained by Customer")) total += 1000;
  if (isIssue(items.powerWindows)) total += 1000;
  if (isIssue(items.centralLocking)) total += 1000;
  if (isIssue(items.reverseCamera)) total += 2000;
  if (isIssue(items.hornSteeringCtrl)) total += 2000;
  if (isIssue(items.steeringWheel)) total += 1000;
  if (isIssue(items.gearKnob)) total += 600;
  if (isIssue(items.handbrakeHandle)) total += 2000;
  if (isIssue(items.sunroof) && !hasStatus(items.sunroof, "Not Available")) total += 10000;

  if (isIssue(items.sunroof) && issueCount <= 3) total = 10000;
  if (issueCount >= 6 && !isIssue(items.sunroof)) total = 7000;

  return sectionResult({
    cost: Math.min(total, 14000),
    cap: 14000,
    issueCount,
  });
};

const calculateSafetySection = (items = {}) => {
  let total = 0;
  const noGoReasons = [];

  if (hasAnyStatusToken(items.airbags, ["deployed", "missing", "tampered"])) {
    pushReason(noGoReasons, "Airbags deployed / missing / tampered");
  }
  if (hasAnyStatusToken(items.absEsc, ["system fault", "disabled"])) {
    pushReason(noGoReasons, "ABS / ESC system fault");
  }
  if (hasStatus(items.airbags, "Warning Light On")) total += 2000;
  if (hasStatus(items.absEsc, "Warning Light On")) total += 5000;

  return sectionResult({
    status: noGoReasons.length ? "NO_GO" : "OK",
    cost: noGoReasons.length ? 0 : Math.min(total, 10000),
    cap: 10000,
    issueCount: ["airbags", "absEsc"].filter((key) => isIssue(items[key])).length,
    noGoReasons,
  });
};

const calculateRoadTestSection = (items = {}) => {
  let total = 0;
  const issueMap = {
    pickup: isIssue(items.pickupDriveability),
    braking: isIssue(items.brakingRoad),
    suspensionNoise: isIssue(items.suspensionNoise),
    steeringFeel: isIssue(items.steeringFeel),
    vibration: isIssue(items.vibrationSpeed),
    pulling: isIssue(items.pullingLeft),
  };

  if (issueMap.pickup) total += 3000;
  if (issueMap.braking) total += 5000;
  if (issueMap.suspensionNoise) total += 4000;
  if (issueMap.steeringFeel) total += 4000;
  if (issueMap.vibration) total += 4000;
  if (issueMap.pulling) total += 3000;

  const issueCount = Object.values(issueMap).filter(Boolean).length;
  if (issueCount >= 3) total = 10000;
  if (issueMap.pickup && issueMap.vibration && issueMap.steeringFeel) total = 12000;

  return sectionResult({
    cost: Math.min(total, 12000),
    cap: 12000,
    issueCount,
  });
};

const calculateAcSection = (items = {}) => {
  const coolingIssue = isIssue(items.acCoolingPerf);
  const compressorIssue = isIssue(items.acCompressorNoise);
  let total = 0;

  if (coolingIssue) total += 5000;
  if (compressorIssue) total += 8000;
  if (compressorIssue && !coolingIssue) total = 8000;
  if (coolingIssue && compressorIssue) total = 10000;

  return sectionResult({
    cost: Math.min(total, 10000),
    cap: 10000,
    issueCount: [coolingIssue, compressorIssue].filter(Boolean).length,
  });
};

export function buildRefurbSummary({ itemValues = {}, insuranceType = "", insuranceExpiry = null, askPrice = 0 }) {
  const insuranceValidAndComprehensive = getInsuranceValidity(
    { insuranceType, insuranceExpiry },
    {},
  );

  const sections = {
    exterior: calculateExteriorSection(itemValues),
    exteriorFitment: calculateExteriorFitmentSection(itemValues, insuranceValidAndComprehensive),
    wheelsTyres: calculateWheelsTyresSection(itemValues),
    engineMechanical: calculateEngineSection(itemValues),
    interiorElectrical: calculateInteriorSection(itemValues),
    safety: calculateSafetySection(itemValues),
    roadTest: calculateRoadTestSection(itemValues),
    acSystem: calculateAcSection(itemValues),
  };

  const noGoReasons = Object.values(sections)
    .flatMap((section) => section.noGoReasons || [])
    .filter(Boolean);

  const warningLightCount = [
    itemValues.checkEngineLight,
    itemValues.absLight,
    itemValues.airbagLight,
    itemValues.batteryLight,
    itemValues.oilPressureLight,
  ].filter((value) => isIssue(value)).length;

  if (warningLightCount >= 3) {
    pushReason(noGoReasons, "Three or more warning lights active");
  }

  if (isIssue(itemValues.engineSmoke)) {
    pushReason(noGoReasons, "Engine smoke observed");
  }
  if (isIssue(itemValues.engineNoise)) {
    pushReason(noGoReasons, "Engine noise / vibration observed");
  }

  const noGo = noGoReasons.length > 0;
  const totalCost = noGo
    ? 0
    : Object.values(sections).reduce((sum, section) => sum + (Number(section.cost) || 0), 0);
  const suggestedBuyPrice = noGo ? 0 : Math.max(0, Number(askPrice || 0) - totalCost);

  return {
    noGo,
    noGoReasons,
    totalCost,
    suggestedBuyPrice,
    insuranceValidAndComprehensive,
    sections,
  };
}

export function buildNoGoNarrative(summary = {}) {
  if (!summary?.noGo || !Array.isArray(summary.noGoReasons) || !summary.noGoReasons.length) {
    return "";
  }
  return `No-Go reasons: ${summary.noGoReasons.join(", ")}.`;
}

export function buildRefurbContext({ lead = {}, values = {} }) {
  return buildRefurbSummary({
    itemValues: values.items || {},
    insuranceType: values.insuranceType || lead.insuranceCategory || "",
    insuranceExpiry: values.insuranceExpiry || lead.insuranceExpiry || null,
    askPrice: getAskPrice(lead, values),
  });
}
