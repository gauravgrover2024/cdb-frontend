const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = process.cwd();
const LEGACY_DIR = '/Users/gauravgrover/oracle/mil2_json_export';
const BACKEND_SNAPSHOT = path.join(ROOT, 'migration_analysis', 'backend_snapshots_loans.json');
const MAPPING_CONFIG = path.join(ROOT, 'migration_analysis', 'loan_field_mapping_config.sample.json');
const VEHICLE_CLEANUP_INDEX = path.join(ROOT, 'migration_analysis', 'vehicle_make_model_cleanup.safe_index.json');
const OUT_XLSX = path.join(ROOT, 'migration_analysis', 'legacy_vs_new_8_case_audit.xlsx');

const CASES = [
  { temp: '3000004231', cpv: '3419', loanId: 'LN-2026-0001' },
  { temp: '3000004277', cpv: '3462', loanId: 'LN-2026-0002' },
  { temp: '3000004033', cpv: '3226', loanId: 'LN-2026-0003' },
  { temp: '3000004065', cpv: '3250', loanId: 'LN-2026-0004' },
  { temp: '3000004250', cpv: '3436', loanId: 'LN-2026-0005' },
  { temp: '3000003718', cpv: '2911', loanId: 'LN-2026-0006' },
  { temp: '3000004237', cpv: '3425', loanId: 'LN-2026-0007' },
  { temp: '3000003417', cpv: '2614', loanId: 'LN-2026-0008' },
];

const LEGACY_FILES = [
  'AUTH_SIGNATORY.json',
  'CPV_DETAIL.json',
  'CUSTOMER_BANK.json',
  'GURANTOR.json',
  'RC_CUSTOMER_ACCOUNT.json',
  'RC_DOC_DESPATCH_MASTER.json',
  'RC_INSTRUMENT_DETAIL.json',
  'RC_RC_INV_RECEIVING_DETAIL.json',
  'RC_RC_INV_STATUS.json',
  'RC_SOURCE_REFERENCE.json',
];

const ID_KEYS = [
  'TEMP_CUST_CODE',
  'CDB_ACCOUNT_NO',
  'CDB_ACCOUNT_NUMBER',
  'CDB_AC_NO',
  'CPV_ACCOUNT_NO',
  'CPV_AC_NO',
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function safeKey(name) {
  return String(name || '')
    .replace(/\.json$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function parseTargetFields(raw) {
  const s = String(raw || '');
  if (!s.trim()) return [];
  const tokens = s.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  return [...new Set(tokens.filter((t) => /[a-z]/.test(t) || t.includes('_')))];
}

function normalizeLoose(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9.:/ -]/g, '');
}

function normalizeForCompare(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s) return '';

  const n = Number(s.replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(n) && /[0-9]/.test(s)) return `num:${n}`;

  const t = Date.parse(s);
  if (Number.isFinite(t)) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `date:${y}-${m}-${day}`;
  }

  return `str:${normalizeLoose(s)}`;
}

function isEmptyValue(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function flatten(obj, prefix = '', out = {}) {
  if (obj === null || obj === undefined) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    if (prefix) out[prefix] = obj;
    obj.forEach((item, idx) => flatten(item, prefix ? `${prefix}.${idx}` : String(idx), out));
    return out;
  }
  if (typeof obj !== 'object') {
    if (prefix) out[prefix] = obj;
    return out;
  }

  const keys = Object.keys(obj);
  if (!keys.length && prefix) out[prefix] = obj;
  for (const k of keys) {
    const p = prefix ? `${prefix}.${k}` : k;
    flatten(obj[k], p, out);
  }
  return out;
}

function joinNonEmpty(...parts) {
  return parts
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

function firstMeaningful(rows, keys) {
  for (const row of rows || []) {
    for (const k of keys) {
      const v = row?.[k];
      if (!isEmptyValue(v)) return v;
    }
  }
  return null;
}

function buildLegacyMappingIndex() {
  const idx = new Map();
  if (fs.existsSync(MAPPING_CONFIG)) {
    const cfg = readJson(MAPPING_CONFIG);
    const rows = Array.isArray(cfg?.flatMappings) ? cfg.flatMappings : [];
    for (const r of rows) {
      const targetRaw = String(r?.newField || r?.targetField || '').trim();
      const newFields = parseTargetFields(targetRaw);
      const lf = safeKey(r?.legacyFile || '');
      const legacyField = String(r?.legacyField || '').trim();
      if (!newFields.length || !lf || !legacyField) continue;
      const legacyPath = `${lf}.${legacyField}`.toLowerCase();
      if (!idx.has(legacyPath)) idx.set(legacyPath, new Set());
      for (const nf of newFields) idx.get(legacyPath).add(nf);
    }
  }

  const add = (legacyPath, newFields) => {
    const k = legacyPath.toLowerCase();
    if (!idx.has(k)) idx.set(k, new Set());
    for (const nf of newFields) idx.get(k).add(nf);
  };

  // Explicit and composite mappings used in migration logic
  add('cpv_detail.customer_name', ['customerName', 'companyName']);
  add('cpv_detail.fathers_name_first', ['sdwOf', 'co_fatherName']);
  add('cpv_detail.fathers_name_middle', ['sdwOf', 'co_fatherName']);
  add('cpv_detail.fathers_name_last', ['sdwOf', 'co_fatherName']);
  add('cpv_detail.fathers_name_combined', ['sdwOf', 'co_fatherName']);

  add('cpv_detail.off_add1', ['residenceAddress', 'employmentAddress', 'officeAddress', 'co_companyAddress']);
  add('cpv_detail.off_add2', ['residenceAddress', 'employmentAddress', 'officeAddress', 'co_companyAddress']);
  add('cpv_detail.off_pin', ['pincode', 'employmentPincode', 'co_companyPincode']);
  add('cpv_detail.off_address_combined', ['residenceAddress', 'employmentAddress', 'officeAddress', 'co_companyAddress']);

  add('cpv_detail.resi_add1', ['residenceAddress', 'co_address', 'signatory_address']);
  add('cpv_detail.resi_add2', ['residenceAddress', 'co_address', 'signatory_address']);
  add('cpv_detail.resi_pin', ['pincode', 'co_pincode', 'signatory_pincode']);
  add('cpv_detail.resi_address_combined', ['residenceAddress', 'co_address', 'signatory_address']);

  add('gurantor.name', ['co_customerName']);
  add('gurantor.resi_phone', ['co_primaryMobile']);
  add('gurantor.sex', ['co_gender']);
  add('gurantor.profession_type', ['co_occupation']);
  add('gurantor.residence_type', ['co_houseType']);
  add('gurantor.date_of_birth', ['co_dob']);
  add('gurantor.education', ['co_education']);
  add('gurantor.g_aadhaar_number', ['co_aadhaar']);
  add('gurantor.no_of_depend', ['co_dependents']);
  add('gurantor.off_add1', ['co_companyAddress']);
  add('gurantor.resi_address_combined', ['co_address']);
  add('gurantor.years_at_profession', ['co_currentExperience', 'co_totalExperience']);
  add('gurantor.years_at_residence', ['co_yearsAtCurrentResidence', 'co_yearsInCurrentResidence']);

  add('rc_customer_account.loan_number_combined', ['loan_number']);

  add('vehicle_cleanup.make', ['vehicleMake']);
  add('vehicle_cleanup.model', ['vehicleModel']);
  add('vehicle_cleanup.variant', ['vehicleVariant']);

  return idx;
}

function loadLegacyData() {
  const byFile = {};
  for (const file of LEGACY_FILES) {
    const p = path.join(LEGACY_DIR, file);
    byFile[safeKey(file)] = readJson(p);
  }
  return byFile;
}

function rowMatchesCase(row, aliases) {
  if (!row || typeof row !== 'object') return false;
  for (const k of ID_KEYS) {
    const v = row[k];
    if (v === undefined || v === null) continue;
    if (aliases.has(String(v).trim())) return true;
  }
  return false;
}

function getVehicleCleanupForCase(caseDef) {
  if (!fs.existsSync(VEHICLE_CLEANUP_INDEX)) return null;
  const idx = readJson(VEHICLE_CLEANUP_INDEX);
  const t = String(caseDef.temp || '').trim();
  const c = String(caseDef.cpv || '').trim();
  return idx?.by_temp_cust_code?.[t] || idx?.by_cdb_account_no?.[t] || idx?.by_cpv_account_no_candidates?.[c]?.[0] || null;
}

function collectLegacyRowsForCase(legacyByFile, caseDef) {
  const aliases = new Set([String(caseDef.temp), String(caseDef.cpv)]);
  const rows = [];
  const byFileRows = {};

  for (const [fileKey, records] of Object.entries(legacyByFile)) {
    if (!Array.isArray(records)) continue;
    const hits = records.filter((rec) => rowMatchesCase(rec, aliases));
    byFileRows[fileKey] = hits;

    let hitIndex = 0;
    for (const rec of hits) {
      hitIndex += 1;
      const flat = flatten(rec);
      const fields = Object.keys(flat).sort((a, b) => a.localeCompare(b));
      for (const field of fields) {
        rows.push({ fileKey, rowNo: hitIndex, field, value: flat[field] });
      }
    }
  }

  // Synthetic composites to reduce false mismatches
  const cpvRows = byFileRows.cpv_detail || [];
  const gurRows = byFileRows.gurantor || [];
  const rcRows = byFileRows.rc_customer_account || [];

  const fathersCombined = joinNonEmpty(
    firstMeaningful(cpvRows, ['FATHERS_NAME_FIRST']),
    firstMeaningful(cpvRows, ['FATHERS_NAME_MIDDLE']),
    firstMeaningful(cpvRows, ['FATHERS_NAME_LAST'])
  );
  if (fathersCombined) rows.push({ fileKey: 'cpv_detail', rowNo: 0, field: 'FATHERS_NAME_COMBINED', value: fathersCombined });

  const offCombined = joinNonEmpty(
    firstMeaningful(cpvRows, ['OFF_ADD1']),
    firstMeaningful(cpvRows, ['OFF_ADD2']),
    firstMeaningful(cpvRows, ['OFF_PIN'])
  );
  if (offCombined) rows.push({ fileKey: 'cpv_detail', rowNo: 0, field: 'OFF_ADDRESS_COMBINED', value: offCombined });

  const resiCombined = joinNonEmpty(
    firstMeaningful(cpvRows, ['RESI_ADD1']),
    firstMeaningful(cpvRows, ['RESI_ADD2']),
    firstMeaningful(cpvRows, ['RESI_PIN'])
  );
  if (resiCombined) rows.push({ fileKey: 'cpv_detail', rowNo: 0, field: 'RESI_ADDRESS_COMBINED', value: resiCombined });

  const gurResiCombined = joinNonEmpty(
    firstMeaningful(gurRows, ['RESI_ADD1']),
    firstMeaningful(gurRows, ['RESI_ADD2']),
    firstMeaningful(gurRows, ['RESI_PIN'])
  );
  if (gurResiCombined) rows.push({ fileKey: 'gurantor', rowNo: 0, field: 'RESI_ADDRESS_COMBINED', value: gurResiCombined });

  const loanNoCombined = joinNonEmpty(
    String(firstMeaningful(rcRows, ['LOAN_NUMBER_PREFIX']) || '').replace(/,+$/g, ''),
    String(firstMeaningful(rcRows, ['LOAN_NUMBER_SUFFIX']) || '').replace(/^,+/g, '')
  ).replace(/,\s*/g, '');
  if (loanNoCombined) rows.push({ fileKey: 'rc_customer_account', rowNo: 0, field: 'LOAN_NUMBER_COMBINED', value: loanNoCombined });

  const veh = getVehicleCleanupForCase(caseDef);
  if (veh) {
    rows.push({ fileKey: 'vehicle_cleanup', rowNo: 0, field: 'MAKE', value: veh.make ?? null });
    rows.push({ fileKey: 'vehicle_cleanup', rowNo: 0, field: 'MODEL', value: veh.model ?? null });
    rows.push({ fileKey: 'vehicle_cleanup', rowNo: 0, field: 'VARIANT', value: veh.variant ?? null });
  }

  return rows;
}

function findBackendCaseRecord(allLoans, caseDef) {
  const loanId = String(caseDef.loanId || '').trim().toLowerCase();
  return allLoans.find((x) => String(x.loanId || '').trim().toLowerCase() === loanId) || null;
}

function compareValue(legacyPath, legacyValue, newField, newValue) {
  const l = legacyValue;
  const n = newValue;

  if (isEmptyValue(l) && isEmptyValue(n)) return true;
  if (isEmptyValue(l) || isEmptyValue(n)) return false;

  const lNorm = normalizeForCompare(l);
  const nNorm = normalizeForCompare(n);
  if (lNorm && nNorm && lNorm === nNorm) return true;

  const ls = normalizeLoose(l);
  const ns = normalizeLoose(n);

  // bank normalization
  if (/bankname|_bankname|bank$/i.test(newField)) {
    if (ns === ls || ns === `${ls} bank` || ls === `${ns} bank`) return true;
  }

  // gender normalization
  if (/gender$/i.test(newField)) {
    if ((ls === 'm' && ns === 'male') || (ls === 'f' && ns === 'female')) return true;
    if ((ls === 'male' && ns === 'm') || (ls === 'female' && ns === 'f')) return true;
  }

  // house normalization
  if (/house/i.test(newField)) {
    if ((ls === 'your own' && ns === 'owned') || (ls === 'owned' && ns === 'your own')) return true;
  }

  // component-part permissive match for combined targets
  const isComponentLegacy = /fathers_name_(first|middle|last)$|off_add[12]$|resi_add[12]$/i.test(legacyPath);
  if (isComponentLegacy && ls.length >= 3 && ns.includes(ls)) return true;

  // business nature often combined multi-values
  if (/businessnature/i.test(newField) && ls.length >= 3 && ns.includes(ls)) return true;

  // loan number combined
  if (/loan_number_combined$/i.test(legacyPath) && /loan_number/i.test(newField)) {
    const lz = String(l).replace(/\s+/g, '');
    const nz = String(n).replace(/\s+/g, '');
    if (lz && nz && nz.includes(lz)) return true;
  }

  // address combined
  if (/address_combined$/i.test(legacyPath)) {
    const lt = ls.split(',').map((x) => x.trim()).filter(Boolean);
    const ok = lt.length ? lt.every((t) => ns.includes(t)) : false;
    if (ok) return true;
  }

  return false;
}

function createWorkbook() {
  if (!fs.existsSync(BACKEND_SNAPSHOT)) {
    throw new Error(`Backend snapshot missing: ${BACKEND_SNAPSHOT}`);
  }

  const backend = readJson(BACKEND_SNAPSHOT);
  const allLoans = Array.isArray(backend?.data) ? backend.data : (Array.isArray(backend?.loans) ? backend.loans : []);
  const legacyByFile = loadLegacyData();
  const mapIdx = buildLegacyMappingIndex();

  const wb = XLSX.utils.book_new();

  for (const c of CASES) {
    const loan = findBackendCaseRecord(allLoans, c);
    if (!loan) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Info'],
        [`Loan not found in backend snapshot for ${c.loanId} (${c.temp}/${c.cpv})`],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, `Case_${c.temp}`.slice(0, 31));
      continue;
    }

    const legacyRows = collectLegacyRowsForCase(legacyByFile, c);
    const newFlat = flatten(loan);
    const newFields = Object.keys(newFlat).sort((a, b) => a.localeCompare(b));

    const mappedNewFieldSet = new Set();
    const out = [];
    out.push([
      'Legacy Field (File.Field)',
      'Legacy Value',
      'New Field(s)',
      'New Value(s)',
      'Result',
    ]);

    for (const r of legacyRows) {
      const legacyPath = `${r.fileKey}.${r.field}`;
      const mappedSet = mapIdx.get(legacyPath.toLowerCase());
      const mapped = mappedSet ? [...mappedSet] : [];
      mapped.forEach((m) => mappedNewFieldSet.add(m));

      let newValCell = '';
      let status = 'No mapped new field';

      if (mapped.length) {
        const pairs = mapped.map((f) => ({ field: f, value: newFlat[f] }));
        newValCell = JSON.stringify(Object.fromEntries(pairs.map((p) => [p.field, p.value])));

        const anyMatch = pairs.some((p) => compareValue(legacyPath, r.value, p.field, p.value));
        status = anyMatch ? 'Match' : 'Incorrect mapping';
      }

      out.push([
        legacyPath,
        r.value === undefined ? null : r.value,
        mapped.join(', '),
        newValCell,
        status,
      ]);
    }

    out.push([]);
    out.push(['-- New Fields Coverage (including null) --', '', '', '', '']);

    for (const nf of newFields) {
      const referenced = mappedNewFieldSet.has(nf);
      out.push([
        `__NEW_ONLY__.${nf}`,
        null,
        nf,
        newFlat[nf],
        referenced ? 'Referenced by some legacy mapping' : 'New field not referenced',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(out);
    ws['!cols'] = [
      { wch: 52 },
      { wch: 36 },
      { wch: 46 },
      { wch: 68 },
      { wch: 28 },
    ];

    const sheetName = `${loan.loanId || 'Case'}_${c.temp}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, OUT_XLSX);
  console.log(JSON.stringify({ ok: true, out: OUT_XLSX }, null, 2));
}

createWorkbook();
