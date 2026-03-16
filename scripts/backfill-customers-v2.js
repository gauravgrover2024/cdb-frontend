const fs = require("fs");
const path = require("path");

const API_BASE_URL = process.env.API_BASE_URL || "https://cdb-api.vercel.app";
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "migration_analysis", "pilot_post_output");

const LOAN_PAGE_SIZE = 250;
const CUSTOMER_PAGE_SIZE = 500;
const NAME_FUZZY_THRESHOLD = 0.9;
const FETCH_RETRIES = 6;
const FETCH_TIMEOUT_MS = 120000;
const ALLOW_CREATE_NEW_CUSTOMERS = String(process.env.ALLOW_CREATE_NEW_CUSTOMERS || "false").toLowerCase() === "true";

async function main() {
  ensureDir(OUT_DIR);

  console.log(`[v2-backfill] loading loans from ${API_BASE_URL} ...`);
  const loans = await fetchAllLoans();
  console.log(`[v2-backfill] loans loaded: ${loans.length}`);
  console.log(`[v2-backfill] loading customers from ${API_BASE_URL} ...`);
  const customers = await fetchAllCustomers();
  console.log(`[v2-backfill] customers loaded: ${customers.length}`);

  const sortedLoans = loans
    .slice()
    .sort((a, b) => {
      const ta = Date.parse(a?.createdAt || a?.updatedAt || 0) || 0;
      const tb = Date.parse(b?.createdAt || b?.updatedAt || 0) || 0;
      return ta - tb;
    });

  console.log(
    JSON.stringify(
      {
        mode: "customer-backfill-v2",
        apiBase: API_BASE_URL,
        loans: sortedLoans.length,
        customers: customers.length,
        rule: "2-core-signals + fuzzy-name>=90% + latest-wins + older-fill-missing",
      },
      null,
      2,
    ),
  );

  const resolver = createResolver(customers);
  const results = [];
  const unmatchedQueue = [];

  for (let i = 0; i < sortedLoans.length; i += 1) {
    const loan = sortedLoans[i];
    if (i % 50 === 0 || i === sortedLoans.length - 1) {
      console.log(`[v2-backfill] ${i + 1}/${sortedLoans.length} loan=${loan?.loanId || loan?._id}`);
    }

    const row = pruneUndefined(convertDatesToStringsDeep(loan || {}));
    const loanRef = row._id || row.loanId;

    try {
      const primary = await resolver.resolveAndMerge({
        role: "primary",
        payload: buildPrimaryCustomerPayload(row),
        name: row.customerName,
        mobile: row.primaryMobile,
        panNumber: row.panNumber,
        aadhaar: row.aadhaarNumber || row.aadharNumber,
        gst: row.gstNumber,
        existingId: row.customerId,
      });
      if (primary.unmatched) unmatchedQueue.push({ loanId: row.loanId || loanRef, role: "primary", ...primary.unmatched });

      const co = await resolver.resolveAndMerge({
        role: "co",
        payload: buildCoApplicantCustomerPayload(row),
        name: row.co_customerName || row.co_name,
        mobile: row.co_primaryMobile || row.co_mobile,
        panNumber: row.co_pan,
        aadhaar: row.co_aadhaar,
        gst: "",
        existingId: row.co_id,
      });
      if (co.unmatched) unmatchedQueue.push({ loanId: row.loanId || loanRef, role: "co", ...co.unmatched });

      const gu = await resolver.resolveAndMerge({
        role: "gu",
        payload: buildGuarantorCustomerPayload(row),
        name: row.gu_customerName || row.gu_name,
        mobile: row.gu_primaryMobile || row.gu_mobile,
        panNumber: row.gu_pan,
        aadhaar: row.gu_aadhaar,
        gst: "",
        existingId: row.gu_id,
      });
      if (gu.unmatched) unmatchedQueue.push({ loanId: row.loanId || loanRef, role: "gu", ...gu.unmatched });

      const patch = {};
      const existingPrimary = stringify(row.customerId);
      if (primary.id && stringify(primary.id) !== existingPrimary) patch.customerId = primary.id;
      if (co.id && stringify(co.id) !== stringify(row.co_id)) patch.co_id = co.id;
      if (gu.id && stringify(gu.id) !== stringify(row.gu_id)) patch.gu_id = gu.id;

      if ((patch.co_id || patch.gu_id) && !patch.customerId) {
        patch.customerId = existingPrimary || primary.id || "";
      }

      if (Object.keys(patch).length > 0 && loanRef && patch.customerId) {
        await apiPut(`/api/loans/${loanRef}`, patch);
        results.push({ action: "loan-updated", loanId: row.loanId || loanRef, patchKeys: Object.keys(patch) });
      } else {
        results.push({ action: "loan-skip", loanId: row.loanId || loanRef });
      }

      if (primary.warn) {
        results.push({ action: "warn", loanId: row.loanId || loanRef, message: primary.warn });
      }
    } catch (error) {
      results.push({
        action: "failed",
        loanId: row.loanId || loanRef || null,
        message: String(error?.message || error || "unknown error"),
      });
    }
  }

  await resolver.flushCustomerUpdates();

  const summary = {
    mode: "customer-backfill-v2",
    totalLoans: sortedLoans.length,
    loanUpdated: results.filter((r) => r.action === "loan-updated").length,
    loanSkip: results.filter((r) => r.action === "loan-skip").length,
    failed: results.filter((r) => r.action === "failed").length,
    warnings: results.filter((r) => r.action === "warn").length,
    customersCreated: resolver.stats.created,
    customersMatched: resolver.stats.matched,
    customersMerged: resolver.stats.merged,
    customersUpdated: resolver.stats.updated,
    unmatched: unmatchedQueue.length,
    output: path.join(OUT_DIR, "customer_backfill_v2_results.json"),
    unmatchedOutput: path.join(OUT_DIR, "customer_backfill_v2_unmatched.json"),
  };

  writeJson(path.join(OUT_DIR, "customer_backfill_v2_results.json"), { summary, results });
  writeJson(path.join(OUT_DIR, "customer_backfill_v2_unmatched.json"), unmatchedQueue);
  console.log(JSON.stringify(summary, null, 2));
}

async function fetchAllLoans() {
  const all = [];
  let skip = 0;
  while (true) {
    const res = await apiGet(`/api/loans?limit=${LOAN_PAGE_SIZE}&skip=${skip}`);
    const rows = Array.isArray(res?.data) ? res.data : [];
    all.push(...rows);
    const hasMore = Boolean(res?.hasMore);
    if (!hasMore || rows.length === 0) break;
    skip += rows.length;
  }
  return all;
}

async function fetchAllCustomers() {
  const all = [];
  let skip = 0;
  while (true) {
    const res = await apiGet(`/api/customers?limit=${CUSTOMER_PAGE_SIZE}&skip=${skip}`);
    const rows = Array.isArray(res?.data) ? res.data : [];
    all.push(...rows);
    const total = Number(res?.count || 0);
    if (!rows.length || all.length >= total) break;
    skip += rows.length;
  }
  return all;
}

function createResolver(initialCustomers) {
  const customers = (Array.isArray(initialCustomers) ? initialCustomers : []).map((c) => {
    const copy = { ...c };
    copy.__norm = normalizeIdentity(copy);
    return copy;
  });
  const stagedUpdates = new Map();
  const aliasMap = new Map();
  const stats = { created: 0, matched: 0, merged: 0, updated: 0 };

  for (const c of customers) registerAliases(c, aliasMap);

  const resolveAndMerge = async ({
    role,
    payload,
    name,
    mobile,
    panNumber,
    aadhaar,
    gst,
    existingId,
  }) => {
    const cleanPayload = pruneUndefined(cleanEmptyValues(convertDatesToStringsDeep(payload || {})));
    const idn = normalizeIdentity({ name, mobile, panNumber, aadhaar, gst });
    if (!idn.nameCore) return { id: existingId || null };

    let matched = null;
    const forcedId = stringify(existingId);
    if (forcedId) {
      matched = customers.find((c) => stringify(c._id || c.id) === forcedId) || null;
    }
    if (!matched) matched = findBestMatch(idn, customers, aliasMap);

    if (!matched) {
      if (!hasTwoCoreSignals(idn)) {
        return {
          id: null,
          warn: `${role}: skipped (insufficient identity signals) for "${name || ""}"`,
          unmatched: {
            reason: "insufficient_signals",
            name: idn.nameRaw,
            mobile: idn.mobile,
            pan: idn.pan,
            aadhaar: idn.aadhaar,
            gst: idn.gst,
          },
        };
      }
      if (!ALLOW_CREATE_NEW_CUSTOMERS) {
        return {
          id: null,
          warn: `${role}: skipped create (safe mode) for "${name || ""}"`,
          unmatched: {
            reason: "safe_mode_no_create",
            name: idn.nameRaw,
            mobile: idn.mobile,
            pan: idn.pan,
            aadhaar: idn.aadhaar,
            gst: idn.gst,
          },
        };
      }
      const created = await apiPost("/api/customers", cleanPayload);
      const createdId = stringify(created?.data?._id || created?.data?.id || created?._id || created?.id);
      if (!createdId) return { id: null, warn: `${role}: create response missing id` };
      const doc = {
        ...(created?.data || cleanPayload),
        _id: createdId,
      };
      doc.__norm = normalizeIdentity(doc);
      customers.push(doc);
      registerAliases(doc, aliasMap);
      stagedUpdates.set(createdId, mergeLatestWins({}, cleanPayload));
      stats.created += 1;
      return { id: createdId };
    }

    const id = stringify(matched._id || matched.id);
    const base = stagedUpdates.get(id) || mergeLatestWins({}, matched);
    const merged = mergeLatestWins(base, cleanPayload);
    stagedUpdates.set(id, merged);
    Object.assign(matched, merged);
    matched.__norm = normalizeIdentity(matched);
    registerAliases(matched, aliasMap);
    stats.matched += 1;
    stats.merged += 1;
    return { id };
  };

  const flushCustomerUpdates = async () => {
    for (const [id, payload] of stagedUpdates.entries()) {
      const clean = pruneUndefined(cleanEmptyValues(convertDatesToStringsDeep(payload || {})));
      await apiPut(`/api/customers/${id}`, clean);
      stats.updated += 1;
    }
  };

  return { resolveAndMerge, flushCustomerUpdates, stats };
}

function findBestMatch(target, customers, aliasMap) {
  const shortcut = [
    `m+p:${target.mobile}|${target.pan}`,
    `m+n:${target.mobile}|${target.nameCore}`,
    `p+n:${target.pan}|${target.nameCore}`,
    `m+a:${target.mobile}|${target.aadhaar}`,
    `p+a:${target.pan}|${target.aadhaar}`,
  ].filter((k) => !k.includes("||") && !k.endsWith("|"));
  for (const key of shortcut) {
    const id = aliasMap.get(key);
    if (id) {
      const found = customers.find((c) => stringify(c._id || c.id) === id);
      if (found) return found;
    }
  }

  let best = null;
  let bestScore = -1;
  for (const c of customers) {
    const n = c.__norm || normalizeIdentity(c);
    const mobileMatch = !!(target.mobile && n.mobile && target.mobile === n.mobile);
    const panMatch = !!(target.pan && n.pan && target.pan === n.pan);
    const aadhaarMatch = !!(target.aadhaar && n.aadhaar && target.aadhaar === n.aadhaar);
    const gstMatch = !!(target.gst && n.gst && target.gst === n.gst);
    const nameScore = target.nameCore && n.nameCore ? similarityScore(target.nameCore, n.nameCore) : 0;
    const nameMatch = nameScore >= NAME_FUZZY_THRESHOLD;

    const coreSignals = [mobileMatch, panMatch, nameMatch].filter(Boolean).length;
    const extraSignals = [aadhaarMatch, gstMatch].filter(Boolean).length;
    if (coreSignals < 2 && !(coreSignals === 1 && extraSignals >= 1 && nameMatch)) continue;

    if (mobileMatch && target.pan && n.pan && target.pan !== n.pan) continue;
    if (panMatch && target.mobile && n.mobile && target.mobile !== n.mobile) continue;
    if (aadhaarMatch && target.pan && n.pan && target.pan !== n.pan) continue;

    let score = 0;
    if (mobileMatch && panMatch) score += 100;
    if (mobileMatch && nameMatch) score += 90;
    if (panMatch && nameMatch) score += 88;
    if (aadhaarMatch) score += 30;
    if (gstMatch) score += 20;
    score += Math.round(nameScore * 10);

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function normalizeIdentity(item) {
  return {
    nameRaw: normalizeIdentityValue(item?.customerName || item?.name || ""),
    nameCore: normalizeNameForMatch(item?.customerName || item?.name || ""),
    mobile: normalizePhoneValue(item?.primaryMobile || item?.mobile || item?.contactPersonMobile || ""),
    pan: normalizeIdentityValue(item?.panNumber || item?.pan || "").toUpperCase(),
    aadhaar: normalizePhoneValue(item?.aadhaarNumber || item?.aadharNumber || item?.aadhaar || "").slice(-12),
    gst: normalizeIdentityValue(item?.gstNumber || item?.gst || "").toUpperCase(),
  };
}

function normalizeNameForMatch(name) {
  return normalizeIdentityValue(name)
    .replace(/[^a-z0-9& ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\band\b/g, "&");
}

function hasTwoCoreSignals(n) {
  let count = 0;
  if (n.nameCore) count += 1;
  if (n.mobile) count += 1;
  if (n.pan) count += 1;
  return count >= 2;
}

function registerAliases(customer, aliasMap) {
  const id = stringify(customer?._id || customer?.id);
  if (!id) return;
  const n = customer.__norm || normalizeIdentity(customer);
  const entries = [
    [`m+p:${n.mobile}|${n.pan}`, n.mobile && n.pan],
    [`m+n:${n.mobile}|${n.nameCore}`, n.mobile && n.nameCore],
    [`p+n:${n.pan}|${n.nameCore}`, n.pan && n.nameCore],
    [`m+a:${n.mobile}|${n.aadhaar}`, n.mobile && n.aadhaar],
    [`p+a:${n.pan}|${n.aadhaar}`, n.pan && n.aadhaar],
  ];
  for (const [key, ok] of entries) {
    if (ok) aliasMap.set(key, id);
  }
}

function mergeLatestWins(base, incoming) {
  const out = { ...(base || {}) };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (isMeaningful(value)) {
      out[key] = value;
    } else if (!isMeaningful(out[key])) {
      out[key] = value;
    }
  }
  return out;
}

function isMeaningful(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

function buildPrimaryCustomerPayload(body) {
  return pruneUndefined({
    applicantType: body.applicantType || "Individual",
    customerName: body.customerName,
    primaryMobile: body.primaryMobile,
    extraMobiles: body.extraMobiles,
    whatsappNumber: body.whatsappNumber,
    email: body.email,
    emailAddress: body.email,
    sdwOf: body.sdwOf || body.fatherName,
    fatherName: body.fatherName || body.sdwOf,
    motherName: body.motherName,
    dob: body.dob,
    gender: body.gender,
    maritalStatus: body.maritalStatus,
    dependents: body.dependents,
    residenceAddress: body.residenceAddress || body.currentAddress,
    pincode: body.pincode,
    city: body.city,
    state: body.state,
    yearsInCurrentHouse: body.yearsInCurrentHouse,
    yearsInCurrentCity: body.yearsInCurrentCity,
    houseType: body.houseType,
    education: body.education,
    addressType: body.addressType,
    panNumber: body.panNumber,
    aadhaarNumber: body.aadhaarNumber || body.aadharNumber,
    aadharNumber: body.aadharNumber || body.aadhaarNumber,
    voterId: body.voterId,
    dlNumber: body.dlNumber,
    passportNumber: body.passportNumber,
    gstNumber: body.gstNumber,
    identityProofType: body.identityProofType,
    identityProofNumber: body.identityProofNumber,
    identityProofExpiry: body.identityProofExpiry,
    addressProofType: body.addressProofType,
    addressProofNumber: body.addressProofNumber,
    currentAddress: body.currentAddress || body.residenceAddress,
    permanentAddress: body.permanentAddress,
    permanentPincode: body.permanentPincode,
    permanentCity: body.permanentCity,
    sameAsCurrentAddress: body.sameAsCurrentAddress,
    occupationType: body.occupationType,
    professionalType: body.professionalType,
    monthlyIncome: body.monthlyIncome,
    salaryMonthly: body.salaryMonthly || body.monthlySalary,
    monthlySalary: body.monthlySalary || body.salaryMonthly,
    annualIncome: body.annualIncome,
    totalIncomeITR: body.totalIncomeITR,
    annualTurnover: body.annualTurnover,
    netProfit: body.netProfit,
    otherIncome: body.otherIncome,
    otherIncomeSource: body.otherIncomeSource,
    companyName: body.companyName,
    designation: body.designation,
    companyType: body.companyType,
    businessNature: body.businessNature,
    incorporationYear: body.incorporationYear,
    currentExp: body.currentExp || body.experienceCurrent,
    totalExp: body.totalExp || body.totalExperience,
    experienceCurrent: body.experienceCurrent || body.currentExp,
    totalExperience: body.totalExperience || body.totalExp,
    isMSME: body.isMSME,
    companyAddress: body.companyAddress || body.employmentAddress,
    companyPincode: body.companyPincode || body.employmentPincode,
    companyCity: body.companyCity || body.employmentCity,
    companyPhone: body.companyPhone || body.employmentPhone,
    employmentAddress: body.employmentAddress,
    employmentPincode: body.employmentPincode,
    employmentCity: body.employmentCity,
    employmentPhone: body.employmentPhone,
    officialEmail: body.officialEmail,
    typeOfLoan: body.typeOfLoan,
    financeExpectation: body.financeExpectation,
    loanTenureMonths: body.loanTenureMonths,
    nomineeName: body.nomineeName,
    nomineeDob: body.nomineeDob,
    nomineeRelation: body.nomineeRelation,
    reference1_name: body.reference1_name,
    reference1_mobile: body.reference1_mobile,
    reference1_address: body.reference1_address,
    reference1_pincode: body.reference1_pincode,
    reference1_city: body.reference1_city,
    reference1_relation: body.reference1_relation,
    reference2_name: body.reference2_name,
    reference2_mobile: body.reference2_mobile,
    reference2_address: body.reference2_address,
    reference2_pincode: body.reference2_pincode,
    reference2_city: body.reference2_city,
    reference2_relation: body.reference2_relation,
    bankName: body.bankName,
    accountNumber: body.accountNumber,
    ifscCode: body.ifscCode || body.ifsc,
    ifsc: body.ifsc || body.ifscCode,
    branch: body.branch,
    accountType: body.accountType,
    loan_notes: body.loan_notes,
    kycStatus: body.kycStatus,
    referenceName: body.referenceName,
    referenceNumber: body.referenceNumber,
    customerType: body.customerType || body.applicantType,
    createdOn: body.createdOn,
    createdBy: body.createdBy,
    contactPersonName: body.contactPersonName,
    contactPersonMobile: body.contactPersonMobile,
    companyPartners: body.companyPartners,
  });
}

function buildCoApplicantCustomerPayload(body) {
  return pruneUndefined({
    applicantType: "Individual",
    customerName: body.co_customerName || body.co_name,
    primaryMobile: body.co_primaryMobile || body.co_mobile,
    motherName: body.co_motherName,
    sdwOf: body.co_fatherName,
    fatherName: body.co_fatherName,
    gender: body.co_gender,
    dob: body.co_dob,
    maritalStatus: body.co_maritalStatus,
    dependents: body.co_dependents,
    education: body.co_education,
    houseType: body.co_houseType,
    occupationType: body.co_occupation,
    professionalType: body.co_professionalType,
    companyType: body.co_companyType,
    businessNature: body.co_businessNature,
    designation: body.co_designation,
    currentExp: body.co_currentExperience,
    totalExp: body.co_totalExperience,
    experienceCurrent: body.co_currentExperience,
    totalExperience: body.co_totalExperience,
    companyName: body.co_companyName,
    companyAddress: body.co_companyAddress || body.co_address,
    companyPincode: body.co_companyPincode || body.co_pincode,
    companyCity: body.co_companyCity || body.co_city,
    companyPhone: body.co_companyPhone,
    residenceAddress: body.co_address,
    pincode: body.co_pincode,
    city: body.co_city,
    panNumber: body.co_pan,
    aadhaarNumber: body.co_aadhaar,
    aadharNumber: body.co_aadhaar,
    customerType: "Co-Applicant",
    loan_notes: body.loan_notes,
  });
}

function buildGuarantorCustomerPayload(body) {
  return pruneUndefined({
    applicantType: "Individual",
    customerName: body.gu_customerName || body.gu_name,
    primaryMobile: body.gu_primaryMobile || body.gu_mobile,
    motherName: body.gu_motherName,
    sdwOf: body.gu_fatherName,
    fatherName: body.gu_fatherName,
    gender: body.gu_gender,
    dob: body.gu_dob,
    maritalStatus: body.gu_maritalStatus,
    dependents: body.gu_dependents,
    education: body.gu_education,
    houseType: body.gu_houseType,
    occupationType: body.gu_occupation,
    professionalType: body.gu_professionalType,
    companyType: body.gu_companyType,
    businessNature: body.gu_businessNature,
    designation: body.gu_designation,
    currentExp: body.gu_currentExperience,
    totalExp: body.gu_totalExperience,
    experienceCurrent: body.gu_currentExperience,
    totalExperience: body.gu_totalExperience,
    companyName: body.gu_companyName,
    companyAddress: body.gu_companyAddress || body.gu_address,
    companyPincode: body.gu_companyPincode || body.gu_pincode,
    companyCity: body.gu_companyCity || body.gu_city,
    companyPhone: body.gu_companyPhone,
    residenceAddress: body.gu_address,
    pincode: body.gu_pincode,
    city: body.gu_city,
    panNumber: body.gu_pan,
    aadhaarNumber: body.gu_aadhaar,
    aadharNumber: body.gu_aadhaar,
    customerType: "Guarantor",
    loan_notes: body.loan_notes,
  });
}

async function apiGet(endpoint) {
  return requestWithRetry(endpoint, { method: "GET" });
}

async function apiPost(endpoint, body) {
  return requestWithRetry(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function apiPut(endpoint, body) {
  return requestWithRetry(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function requestWithRetry(endpoint, options = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`Request timeout after ${FETCH_TIMEOUT_MS}ms`)), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch (_) {
          data = { raw: text };
        }
        const msg = data?.message || data?.error || text || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        if (res.status >= 500 && attempt < FETCH_RETRIES) {
          await sleep(backoffMs(attempt));
          lastError = err;
          continue;
        }
        throw err;
      }
      return handleResponse(res);
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt >= FETCH_RETRIES) break;
      console.warn(`[v2-backfill] retry ${attempt}/${FETCH_RETRIES} endpoint=${endpoint} reason=${String(error?.message || error)}`);
      await sleep(backoffMs(attempt));
    }
  }
  throw lastError || new Error("request failed");
}

function backoffMs(attempt) {
  return Math.min(500 * 2 ** (attempt - 1), 10000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function normalizeIdentityValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhoneValue(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function similarityScore(a, b) {
  const x = normalizeNameForMatch(a);
  const y = normalizeNameForMatch(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dist = levenshteinDistance(x, y);
  const maxLen = Math.max(x.length, y.length);
  return maxLen ? 1 - dist / maxLen : 0;
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function cleanEmptyValues(input) {
  if (Array.isArray(input)) return input.map(cleanEmptyValues).filter((v) => v !== undefined);
  if (!input || typeof input !== "object") return input;
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    const cleaned = cleanEmptyValues(value);
    if (cleaned === undefined) continue;
    out[key] = cleaned;
  }
  return out;
}

function convertDatesToStringsDeep(input) {
  if (input instanceof Date) return input.toISOString();
  if (Array.isArray(input)) return input.map(convertDatesToStringsDeep);
  if (!input || typeof input !== "object") return input;
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = convertDatesToStringsDeep(value);
  }
  return out;
}

function pruneUndefined(obj) {
  if (Array.isArray(obj)) return obj.map(pruneUndefined);
  if (!obj || typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, pruneUndefined(value)]),
  );
}

function stringify(v) {
  return v == null ? "" : String(v).trim();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
