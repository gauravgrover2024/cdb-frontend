const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const BASE = '/Users/gauravgrover/oracle/mil2_json_export';
const CPV_PATH = path.join(BASE, 'CPV_DETAIL.json');
const RC_PATH = path.join(BASE, 'RC_CUSTOMER_ACCOUNT.json');
const VEHICLES_MASTER_PATH = '/Users/gauravgrover/Documents/cdrive.vehicles.json';
const OUT_DIR = path.join(process.cwd(), 'migration_analysis');
const OUT_XLSX = path.join(OUT_DIR, 'vehicle_make_model_cleanup.xlsx');

const MAKE_ALIASES = [
  ['Aston Martin', [/\bASTON\s*[- ]?MARTIN\b/i]],
  ['Audi', [/\bAUDI\b/i]],
  ['BMW', [/\bBMW\b/i]],
  ['Bentley', [/\bBENTLEY\b/i]],
  ['Citroen', [/\bCITROEN\b/i]],
  ['Force', [/\bFORCE\b/i]],
  ['Honda', [/\bHONDA\b/i]],
  ['Hyundai', [/\bHYUNDAI\b/i]],
  ['Isuzu', [/\bISUZU\b/i]],
  ['Jaguar', [/\bJAGUAR\b/i]],
  ['Jeep', [/\bJEEP\b/i]],
  ['Kia', [/\bKIA\b/i]],
  ['Land Rover', [/\bLAND\s*ROVER\b/i, /\bRANGE\s*ROVER\b/i]],
  ['Lexus', [/\bLEXUS\b/i]],
  ['MG', [/\bMORRIS\s*GARAGES\b/i, /\bMG\b/i]],
  ['Mahindra', [/\bMAHINDRA\b/i]],
  ['Maruti Suzuki', [/\bMARUTI\b/i, /\bSUZUKI\b/i]],
  ['Mercedes-Benz', [/\bMERCEDES\s*[- ]?BENZ\b/i, /\bMERCEDES\b/i]],
  ['Mini', [/\bMINI\b/i]],
  ['Nissan', [/\bNISSAN\b/i]],
  ['Porsche', [/\bPORSCHE\b/i]],
  ['Renault', [/\bRENAULT\b/i]],
  ['Skoda', [/\bSKODA\b/i]],
  ['Tata', [/\bTATA\b/i]],
  ['Toyota', [/\bTOYOTA\b/i]],
  ['Volkswagen', [/\bVOLKSWAGEN\b/i, /\bVW\b/i]],
  ['Volvo', [/\bVOLVO\b/i]],
];

const VARIANT_TOKENS = new Set([
  'MT','AT','AMT','CVT','DCT','DSG','DIESEL','PETROL','CNG','EV','ELECTRIC','HYBRID','MHEV','DSL','BS6',
  'EX','SX','SXO','S','E','G','V','VX','ZX','Z','LXI','VXI','ZXI','AX3','AX5','AX7','HTK','HTX','GT','XLINE',
  'PREMIUM','PLUS','OPTIONAL','OPTION','TOP','BASE','PRO','ULTRA','SPORT','SPORTS','SPORTZ',
  '4X2','4X4','2WD','AWD','QUATTRO','TFSI','TSI','TDI','CRDI','VTEC','IVTEC','I-VTEC','KAPPA','REVOTORQ',
]);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function cleanText(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function normalizeText(v) {
  return cleanText(v)
    .replace(/[|]/g, ' ')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForMatch(v) {
  return normalizeText(v)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(v) {
  return normalizeForMatch(v).split(' ').filter(Boolean);
}

function stripYearSuffix(input) {
  const text = cleanText(input);
  if (!text) return { text: '', year: '' };
  const m4 = text.match(/\b(19\d{2}|20\d{2})\b\s*$/);
  if (m4) {
    return { text: text.replace(/\b(19\d{2}|20\d{2})\b\s*$/, '').trim(), year: m4[1] };
  }
  const m2 = text.match(/\b(\d{2})\b\s*$/);
  if (m2) {
    const yy = Number(m2[1]);
    const year = yy <= 30 ? `20${m2[1]}` : `19${m2[1]}`;
    return { text: text.replace(/\b\d{2}\b\s*$/, '').trim(), year };
  }
  return { text, year: '' };
}

function detectMake(raw) {
  for (const [make, patterns] of MAKE_ALIASES) {
    if (patterns.some((re) => re.test(raw))) return make;
  }
  return '';
}

function canonicalMake(raw) {
  return detectMake(raw) || cleanText(raw);
}

function splitModelVariant(raw, make) {
  let text = normalizeText(raw);
  if (!text) return { model: '', variant: '' };

  if (make) {
    const escaped = make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`^${escaped}\\s+`, 'i'), '').trim();
    if (make === 'Maruti Suzuki') {
      text = text.replace(/^MARUTI\s+/i, '').replace(/^SUZUKI\s+/i, '').trim();
    }
    if (make === 'Mercedes-Benz') {
      text = text.replace(/^MERCEDES\s*[- ]?BENZ\s+/i, '').replace(/^MERCEDES\s+/i, '').trim();
    }
  }

  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { model: '', variant: '' };

  let modelEnd = tokens.length;
  for (let i = 1; i < tokens.length; i += 1) {
    const t = tokens[i].toUpperCase();
    if (VARIANT_TOKENS.has(t) || /^\d+(\.\d+)?[A-Z]*$/.test(t) || /^[A-Z]{1,3}\d{0,2}$/.test(t)) {
      modelEnd = i;
      break;
    }
  }

  const model = tokens.slice(0, modelEnd).join(' ').trim();
  const variant = tokens.slice(modelEnd).join(' ').trim();
  return { model, variant };
}

function trimVariant(variant, make, model) {
  let v = cleanText(variant);
  if (!v) return v;
  if (make) {
    const mk = make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    v = v.replace(new RegExp(`^${mk}\\s+`, 'i'), '').trim();
  }
  if (model) {
    const md = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    v = v.replace(new RegExp(`^${md}\\s+`, 'i'), '').trim();
  }
  return v;
}

function loadVehicleMaster() {
  if (!fs.existsSync(VEHICLES_MASTER_PATH)) return [];
  try {
    const data = readJson(VEHICLES_MASTER_PATH);
    if (!Array.isArray(data)) return [];
    return data
      .map((r) => ({
        make: canonicalMake(r.brand),
        model: cleanText(r.model),
        variant: cleanText(r.variant),
        makeNorm: normalizeForMatch(canonicalMake(r.brand)),
        modelNorm: normalizeForMatch(r.model),
        variantNorm: normalizeForMatch(r.variant),
        variantTokens: new Set(tokenize(r.variant)),
      }))
      .filter((r) => r.make && r.model && r.variant);
  } catch {
    return [];
  }
}

function overlapScore(aSet, bSet) {
  if (!aSet.size || !bSet.size) return 0;
  let inter = 0;
  for (const v of aSet) if (bSet.has(v)) inter += 1;
  const union = aSet.size + bSet.size - inter;
  return union ? inter / union : 0;
}

function matchFromVehicleMaster(raw, yearlessText, baseMake, vehicles) {
  if (!yearlessText || !vehicles.length) return null;
  const rawNorm = normalizeForMatch(yearlessText);
  const rawTokenSet = new Set(tokenize(yearlessText));
  const candidates = baseMake
    ? vehicles.filter((v) => v.make === baseMake)
    : vehicles;
  if (!candidates.length) return null;

  let best = null;
  for (const v of candidates) {
    let score = 0;
    if (rawNorm === v.variantNorm) score += 120;
    if (rawNorm.includes(v.variantNorm) || v.variantNorm.includes(rawNorm)) score += 70;
    if (rawNorm.includes(v.modelNorm)) score += 25;
    if (rawNorm.includes(v.makeNorm)) score += 20;
    score += Math.round(overlapScore(rawTokenSet, v.variantTokens) * 60);

    const lenPenalty = Math.abs(rawNorm.length - v.variantNorm.length);
    score -= Math.min(15, Math.floor(lenPenalty / 8));

    if (!best || score > best.score) best = { ...v, score };
  }

  if (!best) return null;
  if (best.score < 45) return null;
  return {
    make: best.make,
    model: best.model,
    variant: trimVariant(best.variant, best.make, best.model) || best.variant,
    score: best.score,
  };
}

function bestEffortClean(raw, vehicles) {
  const base = cleanText(raw);
  if (!base) return { make: '', model: '', variant: '', inferredYear: '', confidence: 'none' };

  const { text, year } = stripYearSuffix(base);
  const make = detectMake(text);
  const matched = matchFromVehicleMaster(base, text, make, vehicles);
  const { model, variant } = matched || splitModelVariant(text, make);
  const finalMake = matched?.make || make;

  let confidence = 'low';
  if (matched?.score >= 90) confidence = 'high';
  else if (matched?.score >= 60) confidence = 'medium';
  else if (finalMake && model && variant) confidence = 'high';
  else if (finalMake && model) confidence = 'medium';

  return {
    make: finalMake,
    model,
    variant,
    inferredYear: year,
    confidence,
    matchedFromMaster: Boolean(matched),
    matchScore: matched?.score || '',
  };
}

function first(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function build() {
  const cpvRows = readJson(CPV_PATH);
  const rcRows = readJson(RC_PATH);
  const vehicles = loadVehicleMaster();

  const rcByCpv = new Map();
  const rcByCdb = new Map();
  for (const r of rcRows) {
    const cpv = cleanText(r.CPV_ACCOUNT_NO);
    const cdb = cleanText(r.CDB_ACCOUNT_NO || r.TEMP_CUST_CODE);
    if (cpv) {
      if (!rcByCpv.has(cpv)) rcByCpv.set(cpv, []);
      rcByCpv.get(cpv).push(r);
    }
    if (cdb) {
      if (!rcByCdb.has(cdb)) rcByCdb.set(cdb, []);
      rcByCdb.get(cdb).push(r);
    }
  }

  const rows = cpvRows.map((cpv, idx) => {
    const cpvNo = cleanText(cpv.CPV_ACCOUNT_NO);
    const cdb = cleanText(cpv.CDB_ACCOUNT_NO);
    const rcCandidates = [
      ...(rcByCdb.get(cdb) || []),
      ...(rcByCpv.get(cpvNo) || []),
    ];
    const rc = rcCandidates[0] || {};

    const tempCust = first(rc.TEMP_CUST_CODE, rc.CDB_ACCOUNT_NO, cdb);
    const rawVehicle = first(rc.MAKE_MODEL, rc.DELIVERED_MAKE_MODEL, cpv.CAR_MODEL);
    const cleaned = bestEffortClean(rawVehicle, vehicles);

    return {
      sr_no: idx + 1,
      cpv_account_no: cpvNo,
      temp_cust_code: tempCust,
      cdb_account_no: cdb,
      customer_name: first(cpv.CUSTOMER_NAME),
      legacy_vehicle_text: rawVehicle,
      case_type_legacy: first(rc.CASE_TYPE, rc.CASE_TYPE_NAME, rc.CASE_TYPE_DESC),
      cleaned_make_guess: cleaned.make,
      cleaned_model_guess: cleaned.model,
      cleaned_variant_guess: cleaned.variant,
      inferred_year_from_variant: cleaned.inferredYear,
      confidence: cleaned.confidence,
      matched_from_vehicle_master: cleaned.matchedFromMaster ? 'Yes' : 'No',
      vehicle_match_score: cleaned.matchScore,
      notes: '',
      final_make: '',
      final_model: '',
      final_variant: '',
    };
  });

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const wb = XLSX.utils.book_new();
  const wsAll = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'all_cases_cleaning');

  const lowConfidence = rows.filter((r) => r.confidence !== 'high');
  const wsReview = XLSX.utils.json_to_sheet(lowConfidence);
  XLSX.utils.book_append_sheet(wb, wsReview, 'needs_review');

  XLSX.writeFile(wb, OUT_XLSX);

  console.log(JSON.stringify({
    out: OUT_XLSX,
    vehiclesMasterRows: vehicles.length,
    totalCases: rows.length,
    highConfidence: rows.filter((r) => r.confidence === 'high').length,
    mediumConfidence: rows.filter((r) => r.confidence === 'medium').length,
    lowConfidence: rows.filter((r) => r.confidence === 'low').length,
    noneConfidence: rows.filter((r) => r.confidence === 'none').length,
  }, null, 2));
}

build();
