const fs = require("fs");
const path = require("path");

const API_BASE_URL = process.env.API_BASE_URL || "https://cdb-api.vercel.app";
const ROOT = process.cwd();
const SKIP_CUSTOMER_UPSERT_FOR_MIGRATION = true;
const EXTRACTED_PATH = path.join(ROOT, "migration_analysis", "case_match_extracted.json");
const RAW_JSON_DIR = "/Users/gauravgrover/oracle/mil2_json_export";
const VEHICLES_PATH = "/Users/gauravgrover/Documents/cdrive.vehicles.json";
const OUT_DIR = path.join(ROOT, "migration_analysis", "pilot_post_output");
const VEHICLE_CLEANUP_INDEX_PATH = path.join(
  ROOT,
  "migration_analysis",
  "vehicle_make_model_cleanup.safe_index.json",
);

const PILOT_CASE_IDS = [
  "3000004231",
  "3000004277",
  "3000004033",
  "3000004065",
  "3000004250",
  "3000003718",
  "3000004237",
  "3000003417",
];
const RAW_FILES = [
  "AUTH_SIGNATORY.json",
  "CPV_DETAIL.json",
  "CUSTOMER_BANK.json",
  "GURANTOR.json",
  "RC_CUSTOMER_ACCOUNT.json",
  "RC_DOC_DESPATCH_MASTER.json",
  "RC_INSTRUMENT_DETAIL.json",
  "RC_RC_INV_RECEIVING_DETAIL.json",
  "RC_RC_INV_STATUS.json",
  "RC_SOURCE_REFERENCE.json",
];

const CASE_OVERRIDES = {
  "3000004231": {
    typeOfLoan: "New Car",
    isFinanced: "Yes",
    currentStage: "delivery",
    vehicle: {
      brand: "Maruti",
      model: "S Presso",
      variant: "LXI CNG",
    },
  },
  "3000004277": {
    typeOfLoan: "New Car",
    isFinanced: "Yes",
    currentStage: "delivery",
    preferredCpvAccountNo: 3462,
    vehicle: {
      brand: "Tata",
      model: "Nexon",
      variant: "Creative Plus S CNG",
    },
  },
  "3000004033": {
    typeOfLoan: "New Car",
    isFinanced: "No",
    currentStage: "delivery",
    vehicle: {
      brand: "Maruti",
      model: "Baleno",
      variant: "Zeta AGS",
    },
  },
  "3000004065": {
    typeOfLoan: "New Car",
    isFinanced: "No",
    currentStage: "delivery",
    preferredTempCustCode: "3000004065",
    preferredCpvAccountNo: 3258,
    vehicle: {
      brand: "Kia",
      model: "Seltos",
      variant: "GTX TGDi DCT",
    },
  },
  "3000004250": {
    typeOfLoan: "Used Car",
    isFinanced: "Yes",
    currentStage: "postfile",
    vehicle: {
      brand: "Mercedes Benz",
      model: "E Class",
      variant: "E 220d",
    },
  },
  "3000003718": {
    typeOfLoan: "Used Car",
    isFinanced: "Yes",
    currentStage: "postfile",
    vehicle: {
      brand: "Mini",
      model: "Cooper Convertible",
      variant: "S",
    },
  },
  "3000004237": {
    typeOfLoan: "Car Cash-in",
    isFinanced: "Yes",
    currentStage: "payout",
    vehicle: {
      brand: "Mahindra",
      model: "TUV300 Plus",
      variant: "P8 2018",
    },
  },
  "3000003417": {
    typeOfLoan: "Car Cash-in",
    isFinanced: "Yes",
    currentStage: "payout",
    preferredCpvAccountNo: 2614,
    vehicle: {
      brand: "Toyota",
      model: "Innova Crysta",
      variant: "2.8 Z 2018",
    },
  },
};

const DEFAULT_TIME = "10:00";
const REG_CITY_BY_PREFIX = {
  UP16: "Noida",
  UP14: "Ghaziabad",
  UP13: "Ghaziabad",
  UP15: "Meerut",
  DL01: "Delhi",
  DL1: "Delhi",
  DL2: "Delhi",
  DL3: "Delhi",
  DL4: "Delhi",
  DL5: "Delhi",
  DL6: "Delhi",
  DL7: "Delhi",
  HR26: "Gurgaon",
  HR51: "Faridabad",
};

async function main() {
  const useAllCases = process.argv.includes("--all");
  const useRaw = process.argv.includes("--from-raw");
  const backfillCustomers = process.argv.includes("--backfill-customers");
  const selectedCases = extractCaseArgs(process.argv);
  const mode = process.argv.includes("--post") ? "post" : "dry-run";

  if (backfillCustomers) {
    await backfillCustomersFromLoans();
    return;
  }

  const extracted = useRaw ? buildExtractedFromRaw(RAW_JSON_DIR) : readJson(EXTRACTED_PATH);
  const vehicles = readJson(VEHICLES_PATH);
  const caseIds = selectedCases.length
    ? selectedCases
    : useAllCases
      ? Object.keys(extracted || {}).sort()
      : PILOT_CASE_IDS;

  ensureDir(OUT_DIR);
  if (useRaw) writeJson(path.join(OUT_DIR, "case_match_extracted.full.json"), extracted);

  if (mode === "post" && useAllCases) {
    await postCasesStreaming(caseIds, extracted, vehicles, { useAllCases, useRaw });
    return;
  }

  const payloads = caseIds.map((caseId) => buildPayload(caseId, extracted[caseId], vehicles));

  writeJson(path.join(OUT_DIR, "pilot_payloads.json"), payloads);
  writeJson(
    path.join(OUT_DIR, "pilot_payload_summary.json"),
    payloads.map((p) => ({
      caseId: p.__pilot.caseId,
      name: p.customerName,
      applicantType: p.applicantType,
      mobile: p.primaryMobile,
      typeOfLoan: p.typeOfLoan,
      isFinanced: p.isFinanced,
      currentStage: p.currentStage,
      approvalStatus: p.approval_status || null,
      vehicle: `${p.vehicleMake} | ${p.vehicleModel} | ${p.vehicleVariant}`,
      fuel: p.vehicleFuelType || null,
      coApplicant: p.co_customerName || null,
      signatory: p.signatory_customerName || null,
      dealerName: p.dealerName || null,
      loanNumber: p.loan_number || null,
      conflictFlags: p.__pilot.conflictFlags,
    })),
  );

  if (mode !== "post") {
    console.log(
      JSON.stringify(
        {
          mode,
          count: payloads.length,
          allCases: useAllCases,
          fromRaw: useRaw,
          output: path.join(OUT_DIR, "pilot_payloads.json"),
        },
        null,
        2,
      ),
    );
    return;
  }

  const existing = await apiGet("/api/loans");
  const existingLoans = Array.isArray(existing?.data) ? existing.data : [];
  const results = [];

  for (const payload of payloads) {
    const marker = getPilotMarker(payload.__pilot.caseId);
    const matched = existingLoans.find((loan) => {
      const notes = String(loan?.loan_notes || "");
      return notes.includes(marker);
    });

    const body = cleanupInstrumentPayload({ ...payload });
    delete body.__pilot;
    delete body._id;

    if (matched?._id && shouldSkipExistingLoan(matched, body)) {
      results.push({
        action: "skipped",
        caseId: payload.__pilot.caseId,
        customerName: payload.customerName,
        loanId: matched.loanId || matched._id,
      });
      continue;
    }

    if (!SKIP_CUSTOMER_UPSERT_FOR_MIGRATION) {
      body.customerId = await upsertCustomerRecord({
        payload: buildPrimaryCustomerPayload(body),
        name: body.customerName,
        mobile: body.primaryMobile,
        panNumber: body.panNumber,
        existingId: matched?.customerId || body.customerId,
        createOnlyWithMobile: false,
      });

      body.co_id = await upsertCustomerRecord({
        payload: buildCoApplicantCustomerPayload(body),
        name: body.co_customerName,
        mobile: body.co_primaryMobile,
        panNumber: body.co_pan,
        existingId: matched?.co_id || body.co_id,
      });

      body.gu_id = await upsertCustomerRecord({
        payload: buildGuarantorCustomerPayload(body),
        name: body.gu_customerName,
        mobile: body.gu_primaryMobile,
        panNumber: body.gu_pan,
        existingId: matched?.gu_id || body.gu_id,
      });

      body.signatory_id = await upsertCustomerRecord({
        payload: buildSignatoryCustomerPayload(body),
        name: body.signatory_customerName || (body.signatorySameAsCoApplicant ? body.co_customerName : ""),
        mobile: body.signatory_primaryMobile || (body.signatorySameAsCoApplicant ? body.co_primaryMobile : ""),
        panNumber: body.signatory_pan || (body.signatorySameAsCoApplicant ? body.co_pan : ""),
        existingId: matched?.signatory_id || body.signatory_id,
        createOnlyWithMobile: false,
      });
    }

    if (matched?._id) {
      const res = await apiPut(`/api/loans/${matched._id}`, body);
      const saved = res?.data || res || {};
      results.push({
        action: "updated",
        caseId: payload.__pilot.caseId,
        customerName: payload.customerName,
        loanId: saved.loanId || matched.loanId || matched._id,
      });
      continue;
    }

    const res = await apiPost("/api/loans", body);
    const saved = res?.data || res || {};
    results.push({
      action: "created",
      caseId: payload.__pilot.caseId,
      customerName: payload.customerName,
      loanId: saved.loanId || saved._id || null,
    });
  }

  writeJson(path.join(OUT_DIR, "pilot_post_results.json"), results);
  console.log(JSON.stringify({ mode, results }, null, 2));
}

function extractCaseArgs(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--case") {
      const next = cleanText(argv[i + 1]);
      if (next) out.push(next);
      i += 1;
      continue;
    }
    if (arg.startsWith("--case=")) {
      const value = cleanText(arg.slice("--case=".length));
      if (value) out.push(value);
    }
  }
  return uniq(out);
}

function cleanupInstrumentPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const out = { ...payload };
  const type = String(out.instrumentType || "").trim().toUpperCase();
  const chequeSuffixes = [
    "number",
    "bankName",
    "accountNumber",
    "date",
    "amount",
    "tag",
    "favouring",
    "signedBy",
    "image",
  ];

  const isFilled = (v) => {
    if (v === undefined || v === null) return false;
    if (typeof v === "number") return Number.isFinite(v) && v !== 0;
    const s = String(v).trim();
    if (!s || s === "0" || s === "0.0" || s === "0.00") return false;
    return true;
  };

  for (let i = 1; i <= 20; i += 1) {
    const hasValue = chequeSuffixes.some((suffix) => isFilled(out[`cheque_${i}_${suffix}`]));
    if (!hasValue) {
      chequeSuffixes.forEach((suffix) => delete out[`cheque_${i}_${suffix}`]);
    }
  }

  if (type === "SI") {
    delete out.ecs_micrCode;
    delete out.ecs_bankName;
    delete out.ecs_accountNumber;
    delete out.ecs_date;
    delete out.ecs_amount;
    delete out.ecs_tag;
    delete out.ecs_favouring;
    delete out.ecs_signedBy;
    delete out.ecs_image;
    for (let i = 1; i <= 20; i += 1) {
      chequeSuffixes.forEach((suffix) => delete out[`cheque_${i}_${suffix}`]);
    }
  } else if (type === "ECS") {
    delete out.si_accountNumber;
    delete out.si_signedBy;
    delete out.si_image;
  } else if (type === "CHEQUE") {
    delete out.si_accountNumber;
    delete out.si_signedBy;
    delete out.si_image;
    delete out.ecs_micrCode;
    delete out.ecs_bankName;
    delete out.ecs_accountNumber;
    delete out.ecs_date;
    delete out.ecs_amount;
    delete out.ecs_tag;
    delete out.ecs_favouring;
    delete out.ecs_signedBy;
    delete out.ecs_image;
  }

  return out;
}

async function postCasesStreaming(caseIds, extracted, vehicles, meta = {}) {
  const existing = await apiGet("/api/loans");
  const existingLoans = Array.isArray(existing?.data) ? existing.data : [];
  const results = [];

  for (let i = 0; i < caseIds.length; i += 1) {
    const caseId = caseIds[i];
    if (i % 25 === 0 || i === caseIds.length - 1) {
      console.log(`[stream] ${i + 1}/${caseIds.length} case=${caseId}`);
    }
    try {
      const payload = buildPayload(caseId, extracted[caseId], vehicles);
      const marker = getPilotMarker(payload.__pilot.caseId);
      const matched = existingLoans.find((loan) => String(loan?.loan_notes || "").includes(marker));

      const body = cleanupInstrumentPayload({ ...payload });
      delete body.__pilot;
      delete body._id;

      if (matched?._id && shouldSkipExistingLoan(matched, body)) {
        results.push({
          action: "skipped",
          caseId: payload.__pilot.caseId,
          customerName: payload.customerName,
          loanId: matched.loanId || matched._id,
        });
        continue;
      }

      if (!SKIP_CUSTOMER_UPSERT_FOR_MIGRATION) {
        body.customerId = await upsertCustomerRecord({
          payload: buildPrimaryCustomerPayload(body),
          name: body.customerName,
          mobile: body.primaryMobile,
          panNumber: body.panNumber,
          existingId: matched?.customerId || body.customerId,
          createOnlyWithMobile: false,
        });

        body.co_id = await upsertCustomerRecord({
          payload: buildCoApplicantCustomerPayload(body),
          name: body.co_customerName,
          mobile: body.co_primaryMobile,
          panNumber: body.co_pan,
          existingId: null,
          strictNameMatch: true,
        });

        body.gu_id = await upsertCustomerRecord({
          payload: buildGuarantorCustomerPayload(body),
          name: body.gu_customerName,
          mobile: body.gu_primaryMobile,
          panNumber: body.gu_pan,
          existingId: null,
          strictNameMatch: true,
        });

        body.signatory_id = await upsertCustomerRecord({
          payload: buildSignatoryCustomerPayload(body),
          name: body.signatory_customerName || (body.signatorySameAsCoApplicant ? body.co_customerName : ""),
          mobile: body.signatory_primaryMobile || (body.signatorySameAsCoApplicant ? body.co_primaryMobile : ""),
          panNumber: body.signatory_pan || (body.signatorySameAsCoApplicant ? body.co_pan : ""),
          existingId: matched?.signatory_id || body.signatory_id || null,
          createOnlyWithMobile: false,
          strictNameMatch: true,
        });
      }

      if (matched?._id) {
        const res = await apiPut(`/api/loans/${matched._id}`, body);
        const saved = res?.data || res || {};
        results.push({
          action: "updated",
          caseId: payload.__pilot.caseId,
          customerName: payload.customerName,
          loanId: saved.loanId || matched.loanId || matched._id,
        });
        continue;
      }

      const res = await apiPost("/api/loans", body);
      const saved = res?.data || res || {};
      const loanId = saved.loanId || saved._id || null;
      results.push({
        action: "created",
        caseId: payload.__pilot.caseId,
        customerName: payload.customerName,
        loanId,
      });
      existingLoans.push({
        _id: saved._id || loanId,
        loanId,
        loan_notes: body.loan_notes,
        customerId: body.customerId,
      });
    } catch (error) {
      const message = String(error?.message || error || "unknown error");
      results.push({
        action: "failed",
        caseId,
        message,
      });
      console.error(`[stream][failed] case=${caseId} error=${message}`);
    }
  }

  writeJson(path.join(OUT_DIR, "pilot_post_results.json"), results);
  console.log(
    JSON.stringify(
      { mode: "post", stream: true, allCases: meta.useAllCases, fromRaw: meta.useRaw, count: results.length },
      null,
      2,
    ),
  );
}

async function backfillCustomersFromLoans() {
  const existing = await apiGet("/api/loans");
  const loans = (Array.isArray(existing?.data) ? existing.data : [])
    .slice()
    .sort((a, b) => {
      const ta = Math.max(
        Date.parse(a?.updatedAt || "") || 0,
        Date.parse(a?.createdAt || "") || 0,
      );
      const tb = Math.max(
        Date.parse(b?.updatedAt || "") || 0,
        Date.parse(b?.createdAt || "") || 0,
      );
      return ta - tb; // oldest first, latest last (latest data wins)
    });
  const results = [];
  const customersRes = await apiGet("/api/customers");
  const existingCustomers = Array.isArray(customersRes?.data) ? customersRes.data : [];
  const resolver = createBackfillCustomerResolver(existingCustomers);

  for (let i = 0; i < loans.length; i += 1) {
    const loan = loans[i];
    const loanRef = loan?._id || loan?.loanId;
    if (i % 50 === 0 || i === loans.length - 1) {
      console.log(`[customer-backfill] ${i + 1}/${loans.length} loan=${loan?.loanId || loan?._id}`);
    }

    try {
      const body = pruneUndefined(convertDatesToStringsDeep(loan || {}));
      const primaryId = await resolver.resolveAndMerge({
        payload: buildPrimaryCustomerPayload(body),
        name: body.customerName,
        mobile: body.primaryMobile,
        panNumber: body.panNumber,
        existingId: body.customerId,
        createOnlyWithMobile: false,
      });

      const coId = await resolver.resolveAndMerge({
        payload: buildCoApplicantCustomerPayload(body),
        name: body.co_customerName,
        mobile: body.co_primaryMobile,
        panNumber: body.co_pan,
        existingId: body.co_id,
      });

      const guId = await resolver.resolveAndMerge({
        payload: buildGuarantorCustomerPayload(body),
        name: body.gu_customerName,
        mobile: body.gu_primaryMobile,
        panNumber: body.gu_pan,
        existingId: body.gu_id,
      });

      const signatoryId = await resolver.resolveAndMerge({
        payload: buildSignatoryCustomerPayload(body),
        name: body.signatory_customerName || (body.signatorySameAsCoApplicant ? body.co_customerName : ""),
        mobile: body.signatory_primaryMobile || (body.signatorySameAsCoApplicant ? body.co_primaryMobile : ""),
        panNumber: body.signatory_pan || (body.signatorySameAsCoApplicant ? body.co_pan : ""),
        existingId: body.signatory_id,
        createOnlyWithMobile: false,
      });

      const patch = {};
      if (primaryId && String(primaryId) !== String(body.customerId || "")) patch.customerId = primaryId;
      if (coId && String(coId) !== String(body.co_id || "")) patch.co_id = coId;
      if (guId && String(guId) !== String(body.gu_id || "")) patch.gu_id = guId;
      if (signatoryId && String(signatoryId) !== String(body.signatory_id || "")) patch.signatory_id = signatoryId;

      if (Object.keys(patch).length > 0 && loanRef) {
        await apiPut(`/api/loans/${loanRef}`, patch);
        results.push({ action: "updated", loanId: loan?.loanId || loanRef, patchKeys: Object.keys(patch) });
      } else {
        results.push({ action: "skipped", loanId: loan?.loanId || loanRef });
      }
    } catch (error) {
      results.push({
        action: "failed",
        loanId: loan?.loanId || loanRef || null,
        message: String(error?.message || error || "unknown error"),
      });
    }
  }
  await resolver.flushMergedUpdates();

  writeJson(path.join(OUT_DIR, "customer_backfill_results.json"), results);
  const summary = {
    mode: "backfill-customers",
    total: results.length,
    updated: results.filter((r) => r.action === "updated").length,
    skipped: results.filter((r) => r.action === "skipped").length,
    failed: results.filter((r) => r.action === "failed").length,
    output: path.join(OUT_DIR, "customer_backfill_results.json"),
  };
  console.log(JSON.stringify(summary, null, 2));
}

function createBackfillCustomerResolver(initialCustomers) {
  const customers = (Array.isArray(initialCustomers) ? initialCustomers : []).map((c) => ({
    ...c,
    __norm: normalizedCustomerIdentity(c),
  }));
  const mergedById = new Map();
  const aliasToId = new Map(); // composite identity key -> customer id

  const resolveAndMerge = async ({ payload, name, mobile, panNumber, existingId, createOnlyWithMobile = true }) => {
    const cleanedPayload = pruneUndefined(cleanEmptyValues(convertDatesToStringsDeep(payload || {})));
    const target = normalizedIdentity({ name, mobile, panNumber });
    if (!target.nameRaw) return existingId || null;
    if (createOnlyWithMobile && !target.mobile && !existingId) return existingId || null;

    const forcedId = existingId ? String(existingId) : null;
    let match = null;
    if (forcedId) {
      match = customers.find((c) => String(c._id || c.id) === forcedId) || null;
    }
    if (!match) {
      match = findBestCustomerMatch(target, customers, aliasToId);
    }

    if (!match) {
      if (!hasAtLeastTwoSignals(target)) return null;
      const created = await apiPost("/api/customers", cleanedPayload);
      const createdId = created?.data?._id || created?.data?.id || created?._id || created?.id || null;
      if (!createdId) return null;
      const newCustomer = {
        ...(created?.data || cleanedPayload),
        _id: createdId,
        __norm: normalizedCustomerIdentity(created?.data || cleanedPayload),
      };
      customers.push(newCustomer);
      registerAliases(newCustomer, aliasToId);
      mergedById.set(String(createdId), mergeLatestWins({}, cleanedPayload));
      return createdId;
    }

    const matchedId = String(match._id || match.id);
    const base = mergedById.get(matchedId) || mergeLatestWins({}, match);
    const merged = mergeLatestWins(base, cleanedPayload);
    mergedById.set(matchedId, merged);

    // Keep in-memory copy updated for subsequent fuzzy matches in same run.
    Object.assign(match, merged);
    match.__norm = normalizedCustomerIdentity(match);
    registerAliases(match, aliasToId);
    return matchedId;
  };

  const flushMergedUpdates = async () => {
    for (const [id, payload] of mergedById.entries()) {
      const clean = pruneUndefined(cleanEmptyValues(convertDatesToStringsDeep(payload || {})));
      await apiPut(`/api/customers/${id}`, clean);
    }
  };

  for (const c of customers) registerAliases(c, aliasToId);
  return { resolveAndMerge, flushMergedUpdates };
}

function registerAliases(customer, aliasToId) {
  const id = String(customer?._id || customer?.id || "");
  if (!id) return;
  const n = customer.__norm || normalizedCustomerIdentity(customer);
  if (n.mobile && n.pan) aliasToId.set(`mp:${n.mobile}|${n.pan}`, id);
  if (n.mobile && n.nameCore) aliasToId.set(`mn:${n.mobile}|${n.nameCore}`, id);
  if (n.pan && n.nameCore) aliasToId.set(`pn:${n.pan}|${n.nameCore}`, id);
}

function normalizedCustomerIdentity(customer) {
  return normalizedIdentity({
    name: customer?.customerName,
    mobile: customer?.primaryMobile || customer?.contactPersonMobile || customer?.mobile,
    panNumber: customer?.panNumber,
  });
}

function normalizedIdentity({ name, mobile, panNumber }) {
  const nameRaw = normalizeIdentityValue(name);
  const nameCore = normalizeNameForMatch(nameRaw);
  const mobileNorm = normalizePhoneValue(mobile);
  const panNorm = normalizeIdentityValue(panNumber).toUpperCase();
  return {
    nameRaw,
    nameCore,
    mobile: mobileNorm || "",
    pan: panNorm || "",
  };
}

function normalizeNameForMatch(name) {
  const base = normalizeIdentityValue(name)
    .replace(/[^a-z0-9& ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\band\b/g, "&");
  return base;
}

function hasAtLeastTwoSignals(identity) {
  let count = 0;
  if (identity.mobile) count += 1;
  if (identity.pan) count += 1;
  if (identity.nameCore) count += 1;
  return count >= 2;
}

function findBestCustomerMatch(target, customers, aliasToId) {
  if (target.mobile && target.pan) {
    const id = aliasToId.get(`mp:${target.mobile}|${target.pan}`);
    if (id) return customers.find((c) => String(c._id || c.id) === id) || null;
  }
  if (target.mobile && target.nameCore) {
    const id = aliasToId.get(`mn:${target.mobile}|${target.nameCore}`);
    if (id) return customers.find((c) => String(c._id || c.id) === id) || null;
  }
  if (target.pan && target.nameCore) {
    const id = aliasToId.get(`pn:${target.pan}|${target.nameCore}`);
    if (id) return customers.find((c) => String(c._id || c.id) === id) || null;
  }

  let best = null;
  let bestScore = -1;
  for (const c of customers) {
    const n = c.__norm || normalizedCustomerIdentity(c);
    const mobileMatch = !!(target.mobile && n.mobile && target.mobile === n.mobile);
    const panMatch = !!(target.pan && n.pan && target.pan === n.pan);
    const nameScore = target.nameCore && n.nameCore ? similarityScore(target.nameCore, n.nameCore) : 0;
    const nameMatch = nameScore >= 0.9;

    let signals = 0;
    if (mobileMatch) signals += 1;
    if (panMatch) signals += 1;
    if (nameMatch) signals += 1;
    if (signals < 2) continue;

    // Conflicting strong identifiers should be rejected.
    if (target.pan && n.pan && target.pan !== n.pan && mobileMatch) continue;
    if (target.mobile && n.mobile && target.mobile !== n.mobile && panMatch) continue;

    let score = 0;
    if (mobileMatch && panMatch) score += 100;
    if (mobileMatch && nameMatch) score += 90;
    if (panMatch && nameMatch) score += 85;
    score += Math.round(nameScore * 10);

    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

function similarityScore(a, b) {
  const x = normalizeNameForMatch(a);
  const y = normalizeNameForMatch(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dist = levenshteinDistance(x, y);
  const maxLen = Math.max(x.length, y.length);
  return maxLen ? (1 - dist / maxLen) : 0;
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

function mergeLatestWins(base, incoming) {
  const out = { ...(base || {}) };
  const src = incoming || {};
  for (const [k, v] of Object.entries(src)) {
    if (isMeaningful(v)) {
      out[k] = v;
      continue;
    }
    if (!isMeaningful(out[k])) out[k] = v;
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

const RESUME_REQUIRED_KEYS = [
  "customerName",
  "primaryMobile",
  "typeOfLoan",
  "isFinanced",
  "currentStage",
  "vehicleModel",
  "vehicleVariant",
];

const RESUME_COMPARE_KEYS = [
  "customerName",
  "primaryMobile",
  "email",
  "applicantType",
  "typeOfLoan",
  "isFinanced",
  "currentStage",
  "status",
  "vehicleMake",
  "vehicleModel",
  "vehicleVariant",
  "vehicleFuelType",
  "boughtInYear",
  "loan_number",
  "approval_status",
  "approval_bankName",
  "approval_loanAmountApproved",
  "approval_loanAmountDisbursed",
  "postfile_bankName",
  "postfile_loanAmountApproved",
  "postfile_loanAmountDisbursed",
  "dispatch_date",
  "disbursement_date",
  "delivery_date",
];

function shouldSkipExistingLoan(existingLoan, body) {
  if (!isExistingLoanComplete(existingLoan, body)) return false;
  return isExistingLoanEquivalent(existingLoan, body);
}

function isExistingLoanComplete(existingLoan, body) {
  const required = [...RESUME_REQUIRED_KEYS];
  if (String(body.isFinanced || "").toLowerCase() === "yes") {
    required.push("approval_status");
    required.push("postfile_bankName");
  }
  return required.every((key) => hasMeaningfulValue(existingLoan[key]));
}

function isExistingLoanEquivalent(existingLoan, body) {
  for (const key of RESUME_COMPARE_KEYS) {
    const expected = body[key];
    if (!hasMeaningfulValue(expected)) continue;
    const actual = existingLoan[key];
    if (!valuesEquivalent(actual, expected)) return false;
  }
  return true;
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function valuesEquivalent(a, b) {
  return normalizeCompareValue(a) === normalizeCompareValue(b);
}

function normalizeCompareValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return JSON.stringify(value.map(normalizeCompareValue));
  if (typeof value === "object") return JSON.stringify(sortObjectForCompare(value));
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim().toLowerCase();
}

function sortObjectForCompare(obj) {
  const out = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) out[key] = normalizeCompareValue(obj[key]);
  return out;
}

function buildExtractedFromRaw(sourceDir) {
  const cases = {};
  const strongAliasToCase = new Map(); // TEMP/CDB -> caseId
  const cpvToCases = new Map(); // CPV -> Set(caseId)
  const cpvPrimaryCase = new Map(); // CPV -> one preferred caseId
  const unresolved = {};

  const readRows = (fileName) => {
    const fullPath = path.join(sourceDir, fileName);
    if (!fs.existsSync(fullPath)) return [];
    const rows = readJson(fullPath);
    return Array.isArray(rows) ? rows : [];
  };

  const addStrongAlias = (alias, caseId) => {
    if (!alias || !caseId) return;
    if (!strongAliasToCase.has(alias)) strongAliasToCase.set(alias, caseId);
  };

  // Base: one entry per CPV row; if same CPV has multiple CDBs they become separate caseIds.
  const cpvRows = readRows("CPV_DETAIL.json");
  for (let index = 0; index < cpvRows.length; index += 1) {
    const row = cpvRows[index];
    const cpv = cleanText(row.CPV_ACCOUNT_NO || row.CPV_AC_NO || row.CPV_ACCOUNT);
    const cdb = cleanText(row.CDB_ACCOUNT_NO || row.CDB_ACCOUNT_NUMBER || row.CDB_AC_NO || row.CDB_NO);
    const caseId = cdb || (cpv ? `${cpv}__ROW_${index + 1}` : "");
    if (!caseId) continue;

    if (!cases[caseId]) cases[caseId] = { matches: {}, aliases: [] };
    if (!cases[caseId].matches["CPV_DETAIL.json"]) cases[caseId].matches["CPV_DETAIL.json"] = [];
    cases[caseId].matches["CPV_DETAIL.json"].push(row);
    cases[caseId].aliases = uniq(cases[caseId].aliases.concat(extractStrongAliases(row), extractCpvAliases(row)));

    if (cpv) {
      if (!cpvToCases.has(cpv)) cpvToCases.set(cpv, new Set());
      cpvToCases.get(cpv).add(caseId);
      if (!cpvPrimaryCase.has(cpv)) cpvPrimaryCase.set(cpv, caseId);
    }
    for (const strong of extractStrongAliases(row)) addStrongAlias(strong, caseId);
  }

  const attachRow = (fileName, row, caseId) => {
    if (!caseId) return;
    if (!cases[caseId]) cases[caseId] = { matches: {}, aliases: [] };
    if (!cases[caseId].matches[fileName]) cases[caseId].matches[fileName] = [];
    cases[caseId].matches[fileName].push(row);
    cases[caseId].aliases = uniq(cases[caseId].aliases.concat(extractStrongAliases(row), extractCpvAliases(row)));
  };

  // Bridge strong aliases from RC rows (which have CPV + TEMP/CDB links).
  const rcRows = readRows("RC_CUSTOMER_ACCOUNT.json");
  for (const row of rcRows) {
    const cpvAliases = extractCpvAliases(row);
    const strong = extractStrongAliases(row);
    const primary = cpvAliases.map((c) => cpvPrimaryCase.get(c)).find(Boolean);
    if (!primary) continue;
    for (const s of strong) addStrongAlias(s, primary);
  }

  for (const fileName of RAW_FILES) {
    if (fileName === "CPV_DETAIL.json") continue;
    const rows = fileName === "RC_CUSTOMER_ACCOUNT.json" ? rcRows : readRows(fileName);
    for (const row of rows) {
      const strong = extractStrongAliases(row);
      const cpv = extractCpvAliases(row);
      const strongTarget = strong.map((s) => strongAliasToCase.get(s)).find(Boolean);
      const cpvPrimaryTargets = uniq(cpv.map((c) => cpvPrimaryCase.get(c)).filter(Boolean));
      const targets = strongTarget ? [strongTarget] : cpvPrimaryTargets;

      if (!targets.length) {
        if (!unresolved[fileName]) unresolved[fileName] = 0;
        unresolved[fileName] += 1;
        continue;
      }

      for (const caseId of targets) attachRow(fileName, row, caseId);
      for (const s of strong) addStrongAlias(s, targets[0]);
    }
  }

  if (Object.keys(unresolved).length) {
    writeJson(path.join(OUT_DIR, "unresolved_rows_by_file.json"), unresolved);
  }
  return cases;
}

function extractStrongAliases(row) {
  const keys = ["TEMP_CUST_CODE", "CDB_ACCOUNT_NO", "CDB_ACCOUNT_NUMBER", "CDB_AC_NO", "CDB_NO"];
  return uniq(keys.map((k) => cleanText(row?.[k])).filter(Boolean));
}

function extractCpvAliases(row) {
  const keys = ["CPV_ACCOUNT_NO", "CPV_AC_NO", "CPV_ACCOUNT"];
  return uniq(keys.map((k) => cleanText(row?.[k])).filter(Boolean));
}

let vehicleCleanupIndexCache = undefined;
function loadVehicleCleanupIndex() {
  if (vehicleCleanupIndexCache !== undefined) return vehicleCleanupIndexCache;
  try {
    vehicleCleanupIndexCache = readJson(VEHICLE_CLEANUP_INDEX_PATH);
  } catch (e) {
    vehicleCleanupIndexCache = null;
  }
  return vehicleCleanupIndexCache;
}

function normalizeNameLoose(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function pickVehicleCleanupCandidateByName(candidates, customerName) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  const target = normalizeNameLoose(customerName);
  if (!target) return null;
  const matched = candidates.find((c) => {
    const name = normalizeNameLoose(c?.customer_name);
    return name && (name === target || name.includes(target) || target.includes(name));
  });
  return matched || null;
}

function resolveVehicleCleanupOverride(caseId, caseData, cpv, rc, customerName) {
  const idx = loadVehicleCleanupIndex();
  if (!idx) return null;

  const asId = (v) => String(v || "").replace(/\D/g, "").trim();
  const tempCandidates = uniq(
    [caseId, rc?.TEMP_CUST_CODE, cpv?.TEMP_CUST_CODE].map(asId).filter(Boolean),
  );
  const cdbCandidates = uniq(
    [caseId, cpv?.CDB_ACCOUNT_NO, rc?.CDB_ACCOUNT_NO, rc?.CDB_ACCOUNT_NUMBER]
      .map(asId)
      .filter(Boolean),
  );
  const cpvCandidates = uniq(
    [cpv?.CPV_ACCOUNT_NO, rc?.CPV_ACCOUNT_NO, ...(caseData?.identifiers || [])]
      .map(asId)
      .filter(Boolean),
  );

  for (const id of tempCandidates) {
    const hit = idx?.by_temp_cust_code?.[id];
    if (hit) return hit;
  }
  for (const id of cdbCandidates) {
    const hit = idx?.by_cdb_account_no?.[id];
    if (hit) return hit;
  }
  for (const id of cpvCandidates) {
    const list = idx?.by_cpv_account_no_candidates?.[id];
    if (!Array.isArray(list) || !list.length) continue;
    const byName = pickVehicleCleanupCandidateByName(list, customerName);
    if (byName) return byName;
    if (list.length === 1) return list[0];
  }
  return null;
}

function getCaseOverride(caseId, caseData, vehicles) {
  if (CASE_OVERRIDES[caseId]) return CASE_OVERRIDES[caseId];
  return inferCaseOverride(caseData, vehicles);
}

function inferCaseOverride(caseData, vehicles) {
  const matches = caseData?.matches || {};
  const cpv = (matches["CPV_DETAIL.json"] || [])[0] || {};
  const rc = (matches["RC_CUSTOMER_ACCOUNT.json"] || [])[0] || {};
  const rcs = (matches["RC_RC_INV_STATUS.json"] || [])[0] || {};

  const typeOfLoan = inferTypeOfLoan(cpv, rc);
  const isFinanced = inferIsFinanced(cpv, rc, typeOfLoan);
  const currentStage = inferCurrentStage({ typeOfLoan, isFinanced, rc, rcs });
  const vehicle = resolveVehicleFromLegacyText(rc.MAKE_MODEL || rc.DELIVERED_MAKE_MODEL || cpv.CAR_MODEL || "", vehicles);
  return {
    typeOfLoan,
    isFinanced,
    currentStage,
    vehicle: {
      brand: cleanText(vehicle.brand),
      model: cleanText(vehicle.model) || cleanText(cpv.CAR_MODEL),
      variant: cleanText(vehicle.variant) || cleanText(cpv.CAR_MODEL),
    },
  };
}

function inferTypeOfLoan(cpv, rc) {
  const rcCaseType = cleanText(rc.CASE_TYPE || rc.CASE_TYPE_NAME || rc.CASE_TYPE_DESC).toLowerCase();
  if (rcCaseType.includes("cash-in") || rcCaseType.includes("cash in")) return "Car Cash-in";
  if (rcCaseType.includes("refinance") || rcCaseType.includes("re-finance")) return "Refinance";
  if (rcCaseType.includes("used")) return "Used Car";
  if (rcCaseType.includes("new")) return "New Car";
  if (rcCaseType.includes("cash sale") || rcCaseType.includes("cash")) return "New Car";

  const legacy = cleanText(
    cpv.TYPE_OF_LOAN ||
      cpv.LOAN_TYPE ||
      cpv.HIRE_PURPOSE ||
      cpv.PURPOSE_OF_LOAN ||
      rc.TYPE_OF_LOAN ||
      rc.LOAN_TYPE ||
      rc.LOAN_FOR,
  ).toLowerCase();
  if (legacy.includes("cash-in") || legacy.includes("cash in")) return "Car Cash-in";
  if (legacy.includes("refinance") || legacy.includes("re-finance")) return "Refinance";
  if (legacy.includes("used")) return "Used Car";
  return "New Car";
}

function inferIsFinanced(cpv, rc, typeOfLoan) {
  if (typeOfLoan === "Car Cash-in" || typeOfLoan === "Refinance") return "Yes";
  const hpToText = cleanText(rc.HP_TO || cpv.HP_TO || cpv.FINANCER).toLowerCase();
  if (hpToText.includes("cash sale") || hpToText.includes("cash")) return "No";
  const hasLoanAmount = toNumber(rc.LOAN_AMOUNT || rc.APPLIED_LOAN_AMOUNT || cpv.LOAN_EXPECTED);
  const financier = cleanText(rc.HP_TO || cpv.HP_TO || cpv.FINANCER);
  if ((hasLoanAmount || 0) > 0 || financier) return "Yes";
  return "No";
}

function inferCurrentStage({ typeOfLoan, isFinanced, rc, rcs }) {
  const hasDisburse = Boolean(toDateOnly(rc.DATE_OF_DISBURSE || rcs.DATE_OF_DISBURSE));
  const hasDelivery = Boolean(toDateOnly(rc.DATE_OF_DELIVERY || rcs.DATE_OF_DELIVERY));
  const hasDispatch = Boolean(toDateOnly(rc.DATE_OF_FILE_DESPATCH || rc.DATE_WHEN_FILE_DESPATCH));
  if (isFinanced === "No") return "delivery";
  if ((typeOfLoan === "Car Cash-in" || typeOfLoan === "Refinance") && hasDisburse) return "payout";
  if (hasDelivery) return "delivery";
  if (hasDisburse) return "postfile";
  if (hasDispatch) return "approval";
  return "prefile";
}

function buildPayload(caseId, caseData, vehicles) {
  const override = getCaseOverride(caseId, caseData, vehicles);
  if (!caseData) throw new Error(`Missing extracted case ${caseId}`);

  const matches = caseData.matches || {};
  const cpvRows = sortRows(selectRows(matches["CPV_DETAIL.json"] || [], override), [
    (row) => exactScore([row.CDB_ACCOUNT_NO, row.CPV_ACCOUNT_NO], [caseId, override.preferredCpvAccountNo]),
    (row) => parseDate(row.CPV_DATE),
  ]);
  const rcRows = sortRows(selectRows(matches["RC_CUSTOMER_ACCOUNT.json"] || [], override), [
    (row) => exactScore([row.TEMP_CUST_CODE, row.CPV_ACCOUNT_NO], [caseId, override.preferredCpvAccountNo]),
    (row) => parseDate(row.DATE_OF_DISBURSE || row.DATE_OF_FILE_DESPATCH || row.DATE_WHEN_FILE_RECEIVED),
  ]);
  const rcsRows = sortRows(matches["RC_RC_INV_STATUS.json"] || [], [
    (row) => parseDate(row.DATE_OF_DELIVERY || row.DATE_OF_DISBURSE),
  ]);
  const bankRows = matches["CUSTOMER_BANK.json"] || [];
  const authRows = sortRows(matches["AUTH_SIGNATORY.json"] || [], [
    (row) => parseDate(row.DATE_OF_BIRTH),
  ]);
  const gurRows = sortRows(matches["GURANTOR.json"] || [], [
    (row) => parseDate(row.DATE_OF_BIRTH),
  ]);
  const invRows = sortRows(matches["RC_RC_INV_RECEIVING_DETAIL.json"] || [], [
    (row) => invoicePriority(row),
    (row) => parseDate(row.RC_RECEIVED_ON_DATE || row.INV_RECEIVED_ON_DATE || row.ON_DATE),
  ]);
  const dispatchRows = sortRows(matches["RC_DOC_DESPATCH_MASTER.json"] || [], [
    (row) => parseDate(row.DATE_OF_DESP),
  ]);
  const instRows = sortRows(matches["RC_INSTRUMENT_DETAIL.json"] || [], [
    (row) => parseDate(row.ENTERED_ON_DATE || row.STATUS_ON_DATE),
  ]);
  const sourceRefRows = matches["RC_SOURCE_REFERENCE.json"] || [];

  const cpv = cpvRows[0] || {};
  const rc = rcRows[0] || {};
  const rcs = rcsRows[0] || {};
  const bank = bankRows[0] || {};
  const dispatch = dispatchRows[0] || {};
  const auth = authRows[0] || {};
  const gur = gurRows[0] || {};
  const invoiceRow = chooseInvoiceRow(invRows, rcs);
  const rcReceiptRow = chooseRcReceiptRow(invRows, rcs);
  const customerName = pickName(caseId, cpvRows, rcRows);
  const vehicleCleanupOverride = resolveVehicleCleanupOverride(caseId, caseData, cpv, rc, customerName);
  const chosenVehicle = resolveVehicle(
    vehicleCleanupOverride
      ? {
          brand: vehicleCleanupOverride.make,
          model: vehicleCleanupOverride.model,
          variant: vehicleCleanupOverride.variant,
          fuel: vehicleCleanupOverride.fuelType,
        }
      : override.vehicle,
    vehicles,
  );
  const fallbackVehicle = resolveVehicleFromLegacyText(
    rc.MAKE_MODEL || rc.DELIVERED_MAKE_MODEL || cpv.CAR_MODEL,
    vehicles,
  );
  const applicantType = normalizeApplicantType(cpv.HIRE_TYPE, customerName, cpv);
  const isCompany = applicantType === "Company";
  const primaryMobile = isCompany ? pickOfficePhone(cpv, rc, auth, gur) : pickMobile(cpv, rc, auth);
  const email = cleanText(cpv.E_MAIL || cpv.EMAIL_ADDRESS);
  const leadDate = toDateOnly(cpv.CPV_DATE || rc.DATE_WHEN_FILE_RECEIVED);
  const receivingDate = toDateOnly(rc.DATE_WHEN_FILE_RECEIVED || dispatch.DATE_OF_DESP || cpv.CPV_DATE);
  const receivingTime = normalizeTime(rc.TIME_WHEN_FILE_RECEIVED || dispatch.TIME_OF_DESP || DEFAULT_TIME);
  const approvalBank = normalizeBankName(rc.HP_TO || cpv.FINANCER);
  const loanAmount = toNumber(rc.LOAN_AMOUNT || rc.APPLIED_LOAN_AMOUNT || cpv.LOAN_EXPECTED || 0);
  const tenure = toNumber(rc.TENOR || rc.APPLIED_TENOR || cpv.TENDOR || 0);
  const roi = toNumber(rc.ROI || rc.APPLIED_ROI || 0);
  const approvalDate = toDateOnly(rc.DATE_OF_DISBURSE || rcs.DATE_OF_DISBURSE || rc.DATE_OF_FILE_DESPATCH || cpv.CPV_DATE);
  const disbursedDate = toDateOnly(rc.DATE_OF_DISBURSE || rcs.DATE_OF_DISBURSE);
  const deliveredDate = toDateOnly(rc.DATE_OF_DELIVERY || rcs.DATE_OF_DELIVERY);
  const dueDate = toDateOnly(rc.EMI_DUE_DATE || rc.APPLIED_EMI_DUE_DATE);
  const dealerName =
    (cleanText(rc.SOURCE).toLowerCase() === "indirect")
      ? cleanText(cpv.SOURCE_BY || rc.SOURCE_BY || "")
      : (
          cleanText(rc.PAYMENT_FAVOURING_AT_DESPATCH) &&
          cleanText(rc.PAYMENT_FAVOURING_AT_DESPATCH).toLowerCase() !== "customer name"
            ? cleanText(rc.PAYMENT_FAVOURING_AT_DESPATCH)
            : ""
        );
  const dealerAddress = "";
  const dealerMobile = "";
  const officeAddressWithPin = joinText(cpv.OFF_ADD1, cpv.OFF_ADD2, cpv.OFF_PIN);
  const residentialAddressWithPin = joinText(cpv.RESI_ADD1, cpv.RESI_ADD2, cpv.RESI_PIN);
  const signatoryCashAddressWithPin = joinText(auth.ADD1 || auth.ADD1_1, auth.ADD2 || auth.ADD2_1, auth.PIN || auth.PIN_1);
  const usedCarIndividualOfficeAddress =
    !isCompany && String(override.typeOfLoan || "").trim().toLowerCase() === "used car"
      ? (cleanText(cpv.OFF_ADD1) || officeAddressWithPin)
      : officeAddressWithPin;
  const residenceAddress = isCompany
    ? (officeAddressWithPin || residentialAddressWithPin)
    : (
      residentialAddressWithPin ||
      cleanText(cpv.RESIDENCE_ADDRESS || cpv.RESI_ADDRESS || rc.RESI_ADDRESS || rc.CUST_ADDRESS || rc.ADDRESS)
    );
  const pincode = cleanText(isCompany ? cpv.OFF_PIN : cpv.RESI_PIN) ||
    extractPincode(isCompany ? officeAddressWithPin : residenceAddress);
  const city = cleanText(isCompany ? cpv.OFF_CITY : cpv.RESI_CITY);
  const permanentAddress = parsePermanentAddress(cpv.PERMANENT_ADDRESS);
  const permanentAddressSimilarity = addressSimilarityScore(permanentAddress, residenceAddress);
  const sameAsCurrentAddress = isCompany
    ? true
    : (!permanentAddress ||
      sameAddress(permanentAddress, residenceAddress) ||
      permanentAddressSimilarity >= 0.75);
  const permanentPincode = sameAsCurrentAddress
    ? pincode
    : (extractReferencePincode(permanentAddress) || extractPincode(permanentAddress));
  const permanentCity = sameAsCurrentAddress ? city : guessCityFromAddress(permanentAddress);
  const companyType = inferCompanyType(cpv, customerName);
  const companyOccupationType = normalizeOccupationType(cpv.PROFESSION_TYPE) || "Self Employed";
  const businessNature = buildCombinedBusinessNature(cpv);
  const legacyMotherName = cleanText(cpv.MOTHERS_MAIDEN_NAME);
  const legacyMaritalStatus = normalizeMaritalStatus(cpv.MARITAL_STATUS);
  const companyCoApplicant = isCompany
    ? buildCompanyCoApplicant({ cpv, auth, gur, customerName, city, pincode, residenceAddress, companyType, businessNature })
    : null;
  const guarantorAsCoApplicant = cleanText(gur.NAME)
    ? (() => {
        const coAddress = joinText(gur.RESI_ADD1, gur.RESI_ADD2, gur.RESI_PIN);
        const coPincode = cleanText(gur.RESI_PIN) || extractReferencePincode(coAddress);
        const coCompanyAddress = joinText(gur.OFF_ADD1, gur.OFF_ADD2, gur.OFF_PIN) || cleanText(gur.OFF_ADD1);
        const coCompanyPincode = cleanText(gur.OFF_PIN) || extractReferencePincode(coCompanyAddress);
        return pruneUndefined({
          customerName: cleanText(gur.NAME),
          primaryMobile: cleanText(gur.RESI_PHONE || gur.OFF_PHONE),
          gender: normalizeGender(gur.SEX),
          occupation: normalizeOccupationType(gur.PROFESSION_TYPE),
          houseType: normalizeHouseTypeLabel(gur.RESIDENCE_TYPE),
          dob: toIsoOrNull(gur.DATE_OF_BIRTH),
          education: normalizeEducation(gur.EDUCATION),
          aadhaar: cleanText(gur.G_AADHAAR_NUMBER),
          dependents: numericOrUndefined(gur.NO_OF_DEPEND),
          companyAddress: coCompanyAddress,
          companyPincode: coCompanyPincode,
          companyCity: cleanText(gur.OFF_CITY) || (coCompanyPincode ? guessCityFromPincode(coCompanyPincode) : undefined),
          companyPhone: cleanText(gur.OFF_PHONE || gur.RESI_PHONE),
          address: coAddress,
          pincode: coPincode,
          city: cleanText(gur.RESI_CITY) || (coPincode ? guessCityFromPincode(coPincode) : guessCityFromAddress(coAddress)),
          currentExperience: numericOrUndefined(gur.YEARS_AT_PROFESSION),
          totalExperience: numericOrUndefined(gur.YEARS_AT_PROFESSION),
          yearsAtCurrentResidence: normalizeResidenceYears(gur.YEARS_AT_RESIDENCE, gur.DATE_OF_BIRTH),
        });
      })()
    : null;
  const coApplicantSource = guarantorAsCoApplicant || companyCoApplicant;
  const contactPersonName = isCompany ? companyCoApplicant?.customerName || cleanText(auth.NAME) || customerName : undefined;
  const contactPersonMobile = isCompany ? companyCoApplicant?.primaryMobile || cleanText(auth.PHONE || auth.MOBILE) || primaryMobile : undefined;
  const companyPartners = isCompany
    ? (() => {
      const authDob = toDateOnly(auth.DATE_OF_BIRTH_1 || auth.DATE_OF_BIRTH || cpv.DATE_OF_BIRTH);
      const coPartner = {
        name: cleanText(companyCoApplicant?.customerName),
        panNumber: undefined,
        contactNumber: cleanText(companyCoApplicant?.primaryMobile),
        dateOfBirth: toDateOnly(companyCoApplicant?.dob) || authDob,
      };
      if (hasPartnerContent(coPartner)) return [coPartner];
      return authRows.map(mapPartnerRow).filter(hasPartnerContent);
    })()
    : undefined;
  const reference1 = buildReference(cpv, 1);
  const reference2 = buildReference(cpv, 2);
  const referenceName = undefined;
  const referenceNumber = undefined;
  const instrumentData = buildInstrumentPayload(instRows, approvalBank);
  const registrationNumber = cleanText(invoiceRow.REGD_NUMBER || rcReceiptRow.REGD_NUMBER || rc.REGISTRATION_NUMBER || rcs.REGD_NUMBER);
  const registrationAddress = deriveRegistrationAddress({
    isCompany,
    rc,
    residenceAddress,
    pincode,
    city,
    permanentAddress,
    permanentPincode,
    permanentCity,
  });
  const registrationPincode = deriveRegistrationPincode({
    registrationAddress,
    pincode,
    permanentPincode,
  });
  const registrationCity = deriveRegistrationCity({
    registrationNumber,
    rc,
    registrationAddress,
    residenceAddress,
    permanentAddress,
    city,
    permanentCity,
    fallbackCity: cleanText(invoiceRow.RC_RECEIVED_FROM || rcReceiptRow.RC_RECEIVED_FROM),
  });
  const loanNumber = buildLoanNumber(rc);
  const approvalStatus = override.isFinanced === "Yes" ? "Disbursed" : undefined;
  const approvalHistory = override.isFinanced === "Yes"
    ? buildApprovalStatusHistory(approvalDate, disbursedDate)
    : undefined;
  const status = inferStatus(override.currentStage, approvalStatus, override.isFinanced);
  const recordSource = cleanText(rc.SOURCE || "Direct");
  const isIndirectSource = cleanText(recordSource).toLowerCase() === "indirect";
  const indirectDealerName = cleanText(cpv.SOURCE_BY);
  const sourceName = cleanText(
    isIndirectSource
      ? (indirectDealerName || sourceRefRows[0]?.SOURCE_NAME || sourceRefRows[0]?.REFERENCE_BY || rc.CASE_ORIGIN || "Legacy Import")
      : (sourceRefRows[0]?.SOURCE_NAME || sourceRefRows[0]?.REFERENCE_BY || cpv.SOURCE_BY || rc.CASE_ORIGIN || "Legacy Import")
  );
  const docsPreparedBy = cleanText(dispatch.DOCS_PREPARED_BY || rc.PRE_DOCS_PREPARED_BY || rc.POST_DOCS_PREPARED_BY || rc.CLOSED_BY || rc.DEALT_BY);
  const financeExpectation = override.isFinanced === "Yes" ? loanAmount : undefined;
  const exShowroomPrice = toNumber(rc.EX_SHOWROOM_OR_VALUATION);
  const invoiceReceivedAs = normalizeReceivedAs(invoiceRow.INV_RECEIVED_ON_DATE_2 || invoiceRow.INV_RECEIVED_ON_DATE_1 || invoiceRow.INV_RECEIVED_AS);
  const invoiceReceivedFrom = cleanText(invoiceRow.INV_RECEIVED_FROM);
  const invoiceReceivedDate = toDateOnly(invoiceRow.INV_RECEIVED_ON_DATE || invoiceRow.ON_DATE);
  const invoiceNumber = cleanText(invoiceRow.INVOICE_NUMBER || rcs.INVOICE_NUMBER);
  const invoiceDate = toDateOnly(invoiceRow.INVOICE_DATE || rcs.INVOICE_DATE);
  const rcReceivedAs = normalizeReceivedAs(rcReceiptRow.RC_RECEIVED_AS_1 || rcReceiptRow.RC_RECEIVED_AS);
  const rcReceivedFrom = cleanText(rcReceiptRow.RC_RECEIVED_FROM);
  const rcReceivedDate = toDateOnly(rcReceiptRow.RC_RECEIVED_ON_DATE || rcReceiptRow.ON_DATE);
  const rcRegistrationDate = toDateOnly(invoiceRow.DATE_OF_REGISTRATION || rcReceiptRow.DATE_OF_REGISTRATION || rcs.DATE_OF_REGISTRATION);
  const purposeOfLoan = normalizePurpose(cpv.PURPOSE_OF_LOAN, override.typeOfLoan);
  const payoutPercentage = toNumber(rc.PAYOUT_RATE);
  const cpvAadhaar = cleanText(
    cpv.AADHAAR_NUMBER ||
      cpv.AADHAR_NUMBER ||
      cpv["cpv_detail.AADHAAR_NUMBER"] ||
      cpv["cpv_detail.AADHAR_NUMBER"] ||
      cpv["CPV_DETAIL.AADHAAR_NUMBER"] ||
      cpv["CPV_DETAIL.AADHAR_NUMBER"],
  );
  const conflictFlags = detectConflicts(caseData, cpvRows, rcRows);
  const caseIdAliases = uniq([caseId, cpv.CPV_ACCOUNT_NO, cpv.CDB_ACCOUNT_NO, rc.TEMP_CUST_CODE, rcs.TEMP_CUST_CODE].map(stringify));
  const preferredVehicleText = cleanText(rc.MAKE_MODEL || rc.DELIVERED_MAKE_MODEL || cpv.CAR_MODEL);
  const vehicleBrandHint = canonicalMake(detectBrandHint(normalizeVehicleText(preferredVehicleText)));
  // Legacy raw mode: keep vehicle text exactly as legacy source to avoid bad auto-normalization.
  const resolvedVehicleMake = preferredVehicleValue(
    vehicleCleanupOverride?.make,
    preferredVehicleValue(vehicleBrandHint, preferredVehicleValue(chosenVehicle.brand, fallbackVehicle.brand)),
  );
  const resolvedVehicleModel = preferredVehicleValue(
    vehicleCleanupOverride?.model,
    preferredVehicleValue(preferredVehicleText, preferredVehicleValue(chosenVehicle.model, fallbackVehicle.model)),
  );
  const resolvedVehicleVariantRaw = preferredVehicleValue(
    vehicleCleanupOverride?.variant,
    preferredVehicleValue(preferredVehicleText, preferredVehicleValue(chosenVehicle.variant, fallbackVehicle.variant)),
  );
  const variantYearInfo = splitVariantYear(resolvedVehicleVariantRaw);
  const isUsedOrCashInOrRefi =
    override.typeOfLoan === "Used Car" ||
    override.typeOfLoan === "Car Cash-in" ||
    override.typeOfLoan === "Refinance";
  const normalizedVehicleVariant = resolvedVehicleVariantRaw;
  const normalizedVehicleFuelType = normalizeFuelType(
    vehicleCleanupOverride?.fuelType ||
      rc.FUEL_TYPE ||
      cpv.FUEL_TYPE ||
      chosenVehicle?.fuel ||
      chosenVehicle?.fuel_type ||
      fallbackVehicle?.fuel ||
      fallbackVehicle?.fuel_type,
  );
  const inferredBoughtInYear = isUsedOrCashInOrRefi
    ? parseYear(vehicleCleanupOverride?.year) ||
      variantYearInfo.year ||
      parseYear(rc.BOUGHT_IN_YEAR || rc.VEHICLE_YEAR || cpv.BOUGHT_IN_YEAR || preferredVehicleText)
    : undefined;
  const coYearsAtCurrentResidence =
    coApplicantSource?.yearsAtCurrentResidence ??
    normalizeResidenceYears(cpv.YEARS_AT_RESIDENCE, coApplicantSource?.dob || auth.DATE_OF_BIRTH_1 || auth.DATE_OF_BIRTH || cpv.DATE_OF_BIRTH);

  const payload = {
    customerName,
    applicantType,
    primaryMobile,
    email,
    leadDate,
    source: recordSource,
    sourceDetails: sourceName,
    dealtBy: cleanText(cpv.DEALT_BY || rc.DEALT_BY || "Legacy Import"),
    panNumber: cleanText(cpv.PAN_NUMBER),
    gstNumber: isCompany ? cleanText(cpv.GST_NUMBER || rc.GST_NUMBER) : undefined,
    contactPersonName,
    contactPersonMobile,
    residenceAddress,
    pincode,
    city,
    sameAsCurrentAddress,
    permanentAddress: sameAsCurrentAddress ? residenceAddress : permanentAddress,
    permanentPincode,
    permanentCity,
    primaryMobileAlt: pickAlternateMobile(primaryMobile, cpv, gur),
    hasCoApplicant: (isCompany ? true : false) || Boolean(cleanText(gur.NAME)),
    hasGuarantor: false,
    isFinanced: override.isFinanced,
    typeOfLoan: override.typeOfLoan,
    financeExpectation,
    loanTenureMonths: tenure || undefined,
    vehicleMake: resolvedVehicleMake || undefined,
    vehicleModel: resolvedVehicleModel || undefined,
    vehicleVariant: normalizedVehicleVariant || undefined,
    vehicleFuelType: normalizedVehicleFuelType,
    boughtInYear: inferredBoughtInYear,
    exShowroomPrice,
    loan_number: loanNumber,

    dob: isCompany ? undefined : toIsoOrNull(cpv.DATE_OF_BIRTH),
    gender: isCompany ? undefined : normalizeGender(cpv.SEX),
    motherName: isCompany ? undefined : legacyMotherName,
    sdwOf: isCompany ? undefined : joinText(cpv.FATHERS_NAME_FIRST, cpv.FATHERS_NAME_MIDDLE, cpv.FATHERS_NAME_LAST),
    maritalStatus: isCompany ? undefined : legacyMaritalStatus,
    dependents: isCompany ? undefined : numericOrUndefined(cpv.NO_OF_DEPENDANTS),
    education: isCompany ? undefined : normalizeEducation(cpv.EDUCATION),
    houseType: isCompany ? undefined : normalizeHouseType(cpv.RESIDENCE_TYPE),
    yearsInCurrentCity: isCompany ? undefined : normalizeResidenceYears(cpv.YEARS_AT_RESIDENCE, cpv.DATE_OF_BIRTH),
    yearsInCurrentHouse: isCompany ? undefined : normalizeResidenceYears(cpv.YEARS_AT_RESIDENCE, cpv.DATE_OF_BIRTH),
    identityProofType: isCompany
      ? undefined
      : cpvAadhaar
        ? "AADHAAR"
        : inferIdentityProofType(cpv),
    identityProofNumber: isCompany
      ? undefined
      : cleanText(cpvAadhaar || cpv.DRIVING_LICENSE || cpv.PASSPORT_NUMBER),
    addressProofType: isCompany ? undefined : "AADHAAR",
    addressProofNumber: isCompany ? undefined : cpvAadhaar,
    addressType: isCompany ? undefined : "residential",
    aadhaarNumber: isCompany ? undefined : cpvAadhaar,
    aadharNumber: isCompany ? undefined : cpvAadhaar,

    isMSME: isCompany ? "No" : undefined,
    occupationType: isCompany ? companyOccupationType : normalizeOccupationType(cpv.PROFESSION_TYPE),
    professionalType: undefined,
    companyType: isCompany ? companyType : cleanText(cpv.CATEGORY || cpv.ORGANISATION_TYPE),
    businessNature,
    designation: isCompany
      ? defaultCompanyDesignation(companyType)
      : cleanText(cpv.CATEGORY || cpv.INDUSTRY_DETAIL),
    experienceCurrent: isCompany ? undefined : numericOrUndefined(cpv.YEAR_AT_PROFESSION),
    totalExperience: isCompany ? undefined : numericOrUndefined(cpv.YEAR_AT_PROFESSION),
    companyName: isCompany ? undefined : cleanText(cpv.OFF_NAME),
    employmentAddress: usedCarIndividualOfficeAddress,
    officeAddress: usedCarIndividualOfficeAddress,
    employmentPincode: cleanText(cpv.OFF_PIN),
    employmentCity: cleanText(cpv.OFF_CITY),
    employmentPhone: pickOfficePhone(cpv, rc, auth, gur),
    officialEmail: email || undefined,
    companyPartners,

    bankName: normalizeBankName(bank.BANK_NAME || approvalBank),
    accountNumber: cleanText(bank.CA_ACCOUNT_NO || bank.SB_ACCOUNT_NO),
    branch: cleanText(bank.BANK_ADDRESS),
    accountType: inferAccountType(bank),
    monthlyIncome: undefined,
    totalIncome: toNumber(cpv.ANNUAL_INCOME),
    totalIncomeITR: toNumber(cpv.ANNUAL_INCOME),

    reference1: hasReferenceContent(reference1) ? reference1 : undefined,
    reference2: hasReferenceContent(reference2) ? reference2 : undefined,
    reference1_name: reference1.name || undefined,
    reference1_mobile: reference1.mobile || undefined,
    reference1_address: reference1.address || undefined,
    reference1_pincode: reference1.pincode || undefined,
    reference1_city: reference1.city || undefined,
    reference1_relation: reference1.relation || undefined,
    reference2_name: reference2.name || undefined,
    reference2_mobile: reference2.mobile || undefined,
    reference2_address: reference2.address || undefined,
    reference2_pincode: reference2.pincode || undefined,
    reference2_city: reference2.city || undefined,
    reference2_relation: reference2.relation || undefined,

    receivingDate,
    receivingTime,
    recordSource,
    sourceName,
    referenceName: cleanText(sourceRefRows[0]?.REFERENCE_BY || ""),
    referenceNumber: cleanText(sourceRefRows[0]?.PHONE_NUMBER || ""),
    docsPreparedBy,
    dsaCode: cleanText(rc.DSA_CODE),

    dealerName,
    dealerAddress,
    dealerMobile,
    dealerContactPerson: "",
    dealerContactNumber: "",

    usage: inferVehicleUsage(cpv, rc),
    purposeOfLoan,
    hypothecation: override.isFinanced === "Yes" ? "Yes" : "No",
    hypothecationBank: override.isFinanced === "Yes" ? approvalBank : undefined,
    registerSameAsAadhaar: normalizeYesNo(rc.IS_CAR_REGISTER_ON_SAME_ADDRES) || (registrationAddress === residenceAddress ? "Yes" : "No"),
    registerSameAsPermanent: registrationAddress === permanentAddress ? "Yes" : registrationAddress === residenceAddress ? undefined : "No",
    registrationAddress,
    registrationPincode,
    registrationCity,

    currentStage: override.currentStage,
    status,

    approval_bankId: override.isFinanced === "Yes" ? 1 : undefined,
    approval_bankName: override.isFinanced === "Yes" ? approvalBank : undefined,
    approval_status: approvalStatus,
    approval_loanAmountApproved: override.isFinanced === "Yes" ? loanAmount : undefined,
    approval_loanAmountDisbursed: override.isFinanced === "Yes" ? loanAmount : undefined,
    approval_roi: override.isFinanced === "Yes" ? roi : undefined,
    approval_tenureMonths: override.isFinanced === "Yes" ? tenure : undefined,
    approval_processingFees: override.isFinanced === "Yes" ? 0 : undefined,
    approval_approvalDate: override.isFinanced === "Yes" ? toIsoOrNull(disbursedDate || approvalDate) : undefined,
    approval_disbursedDate: override.isFinanced === "Yes" ? toIsoOrNull(disbursedDate || approvalDate) : undefined,
    approval_breakup_netLoanApproved: override.isFinanced === "Yes" ? loanAmount : undefined,
    approval_breakup_creditAssured: 0,
    approval_breakup_insuranceFinance: 0,
    approval_breakup_ewFinance: 0,
    approval_statusHistory: approvalHistory,
    approval_banksData: override.isFinanced === "Yes" ? [buildPrimaryBankData({
      approvalBank,
      loanAmount,
      roi,
      tenure,
      approvalDate,
      disbursedDate: disbursedDate || approvalDate,
      chosenVehicle,
      exShowroomPrice,
      payoutPercentage,
      approvalHistory,
      dsaCode: rc.DSA_CODE,
    })] : [],

    postfile_bankName: override.isFinanced === "Yes" ? approvalBank : undefined,
    postfile_approvalDate: override.isFinanced === "Yes" ? (disbursedDate || approvalDate) : undefined,
    postfile_loanAmountApproved: override.isFinanced === "Yes" ? loanAmount : undefined,
    postfile_loanAmountDisbursed: override.isFinanced === "Yes" ? loanAmount : undefined,
    postfile_sameAsApproved: override.isFinanced === "Yes" ? "Yes" : undefined,
    postfile_processingFees: override.isFinanced === "Yes" ? 0 : undefined,
    postfile_roiType: override.isFinanced === "Yes" ? cleanText(rc.ROI_TYPE) || "Fixed" : undefined,
    postfile_roi: override.isFinanced === "Yes" ? roi : undefined,
    postfile_emiMode: override.isFinanced === "Yes" ? cleanText(rc.EMI_TYPE_ARREAR_ADVANCE) || "Arrear" : undefined,
    postfile_emiPlan: override.isFinanced === "Yes" ? normalizeEmiPlan(rc.EMI_PLAN) || "Normal" : undefined,
    emiPlan: override.isFinanced === "Yes" ? normalizeEmiPlan(rc.EMI_PLAN) || "Normal" : undefined,
    postfile_tenureMonths: override.isFinanced === "Yes" ? tenure : undefined,
    postfile_firstEmiDate: override.isFinanced === "Yes" ? dueDate : undefined,
    postfile_emiAmount: override.isFinanced === "Yes" ? toNumber(rc.EMI || rc.APPLIED_EMI) : undefined,
    postfile_disbursedLoan: override.isFinanced === "Yes" ? loanAmount : undefined,
    postfile_disbursedCreditAssured: toNumber(rc.ICICI_CREDIT_ASSURED) || 0,
    postfile_disbursedInsurance: toNumber(rc.INSURANCE_FINANCED) || 0,
    postfile_disbursedEw: 0,
    postfile_disbursedLoanTotal: override.isFinanced === "Yes" ? loanAmount : undefined,
    postfile_regd_city: registrationCity,
    dispatch_date: toDateOnly(dispatch.DATE_OF_DESP || rc.DATE_OF_FILE_DESPATCH || rc.DATE_WHEN_FILE_DESPATCH),
    dispatch_time: normalizeTime(dispatch.TIME_OF_DESP || rc.TIME_OF_FILE_DESPATCH),
    dispatch_through: cleanText(dispatch.DESP_THROUGH || rc.DESPATCH_FOR_APPROVAL_THROUGH || rc.FILE_DESPATCH_BY),
    disbursement_date: disbursedDate,
    docsPreparedBy: docsPreparedBy,
    docs_prepared_by: docsPreparedBy,

    delivery_date: override.typeOfLoan === "New Car" ? deliveredDate : undefined,
    delivery_dealerName: override.typeOfLoan === "New Car" ? dealerName : undefined,
    delivery_dealerContactPerson: "",
    delivery_dealerContactNumber: "",
    delivery_dealerAddress: "",
    delivery_by: override.typeOfLoan === "New Car" ? cleanText(rc.PERSON_WHO_DELIVERED_THE_CAR || "Customer") : undefined,
    insurance_by: override.typeOfLoan === "New Car" ? cleanText(rc.INSURANCE_BY) : undefined,
    insurance_company_name: override.typeOfLoan === "New Car" ? cleanText(rc.INSURANCE_COMPANY) : undefined,
    insurance_policy_number: override.typeOfLoan === "New Car" ? cleanText(rc.INSURANCE_COVERNOTE_NUMBER) : undefined,
    invoice_number: override.typeOfLoan === "New Car" ? invoiceNumber : undefined,
    invoice_date: override.typeOfLoan === "New Car" ? invoiceDate : undefined,
    invoice_received_as: override.typeOfLoan === "New Car" ? invoiceReceivedAs : undefined,
    invoice_received_from: override.typeOfLoan === "New Car" ? invoiceReceivedFrom : undefined,
    invoice_received_date: override.typeOfLoan === "New Car" ? invoiceReceivedDate : undefined,
    rc_redg_no: override.typeOfLoan === "New Car" ? registrationNumber : undefined,
    rc_chassis_no: override.typeOfLoan === "New Car" ? cleanText(invoiceRow.CHASIS_NUMBER || rcReceiptRow.CHASIS_NUMBER || rcs.CHASIS_NUMBER) : undefined,
    rc_engine_no: override.typeOfLoan === "New Car" ? cleanText(invoiceRow.ENGINE_NUMBER || rcReceiptRow.ENGINE_NUMBER || rcs.ENGINE_NUMBER) : undefined,
    rc_redg_date: override.typeOfLoan === "New Car" ? rcRegistrationDate : undefined,
    rc_received_as: override.typeOfLoan === "New Car" ? rcReceivedAs : undefined,
    rc_received_from: override.typeOfLoan === "New Car" ? rcReceivedFrom : undefined,
    rc_received_date: override.typeOfLoan === "New Car" ? rcReceivedDate : undefined,

    payoutApplicable: override.typeOfLoan === "Car Cash-in" ? "Yes" : undefined,
    prefile_sourcePayoutPercentage: override.typeOfLoan === "Car Cash-in" ? payoutPercentage || 0 : undefined,
    payoutPercentage: override.typeOfLoan === "Car Cash-in" ? payoutPercentage || 0 : undefined,

    co_customerName: coApplicantSource?.customerName,
    co_name: coApplicantSource?.customerName,
    coApplicant_name: coApplicantSource?.customerName,
    co_primaryMobile: coApplicantSource?.primaryMobile,
    co_mobile: coApplicantSource?.primaryMobile,
    coApplicant_mobile: coApplicantSource?.primaryMobile,
    co_address: guarantorAsCoApplicant
      ? guarantorAsCoApplicant?.address
      : (isCompany ? (residentialAddressWithPin || companyCoApplicant?.address) : companyCoApplicant?.address),
    co_pincode: coApplicantSource?.pincode,
    co_city: coApplicantSource?.city,
    co_dob: coApplicantSource?.dob || toIsoOrNull(auth.DATE_OF_BIRTH_1 || auth.DATE_OF_BIRTH || cpv.DATE_OF_BIRTH),
    co_gender: coApplicantSource?.gender,
    co_pan: coApplicantSource?.pan,
    co_aadhaar: isCompany
      ? cpvAadhaar || coApplicantSource?.aadhaar
      : coApplicantSource?.aadhaar,
    co_motherName: isCompany
      ? (companyCoApplicant?.motherName || legacyMotherName || undefined)
      : coApplicantSource?.motherName,
    co_fatherName: coApplicantSource?.fatherName,
    co_maritalStatus: isCompany ? (coApplicantSource?.maritalStatus || legacyMaritalStatus) : undefined,
    co_dependents: coApplicantSource?.dependents,
    co_education: coApplicantSource?.education,
    co_houseType: coApplicantSource?.houseType,
    co_occupation: guarantorAsCoApplicant ? guarantorAsCoApplicant?.occupation : (isCompany ? companyOccupationType : coApplicantSource?.occupation),
    co_professionalType: coApplicantSource?.professionalType,
    co_companyType: isCompany ? companyType : coApplicantSource?.companyType,
    co_businessNature: isCompany ? businessNature : coApplicantSource?.businessNature,
    co_designation: isCompany ? defaultCompanyDesignation(companyType) : coApplicantSource?.designation,
    co_currentExperience: coApplicantSource?.currentExperience,
    co_totalExperience: coApplicantSource?.totalExperience,
    co_companyName: coApplicantSource?.companyName,
    co_companyAddress: guarantorAsCoApplicant
      ? guarantorAsCoApplicant?.companyAddress
      : (isCompany ? residenceAddress : coApplicantSource?.companyAddress),
    co_companyPincode: isCompany ? pincode : coApplicantSource?.companyPincode,
    co_companyCity: coApplicantSource?.companyCity,
    co_companyPhone: isCompany ? primaryMobile : coApplicantSource?.companyPhone,
    co_yearsAtCurrentResidence: coYearsAtCurrentResidence,
    co_yearsInCurrentResidence: coYearsAtCurrentResidence,

    signatorySameAsCoApplicant: isCompany ? true : undefined,
    signatory_customerName: isCompany ? cleanText(auth.NAME || auth.NAME_1) || companyCoApplicant?.customerName : undefined,
    signatory_primaryMobile: isCompany ? cleanText(auth.PHONE || auth.PHONE_1 || auth.MOBILE) || companyCoApplicant?.primaryMobile || primaryMobile : undefined,
    signatory_address: isCompany
      ? (override.isFinanced === "No"
          ? (
              signatoryCashAddressWithPin ||
              residentialAddressWithPin ||
              joinText(auth.ADD1 || auth.ADD1_1, auth.ADD2 || auth.ADD2_1) ||
              companyCoApplicant?.address ||
              residenceAddress
            )
          : (
              residentialAddressWithPin ||
              joinText(auth.ADD1_1 || auth.ADD1, auth.ADD2_1 || auth.ADD2) ||
              companyCoApplicant?.address ||
              residenceAddress
            ))
      : undefined,
    signatory_pincode: isCompany
      ? (override.isFinanced === "No"
          ? (
              cleanText(auth.PIN || auth.PIN_1) ||
              extractReferencePincode(
                signatoryCashAddressWithPin ||
                  residentialAddressWithPin ||
                  joinText(auth.ADD1 || auth.ADD1_1, auth.ADD2 || auth.ADD2_1) ||
                  companyCoApplicant?.address ||
                  residenceAddress,
              ) ||
              companyCoApplicant?.pincode ||
              pincode
            )
          : (
              cleanText(auth.PIN || auth.PIN_1) ||
              extractReferencePincode(
                residentialAddressWithPin ||
                  joinText(auth.ADD1_1 || auth.ADD1, auth.ADD2_1 || auth.ADD2) ||
                  companyCoApplicant?.address ||
                  residenceAddress,
              ) ||
              companyCoApplicant?.pincode ||
              pincode
            ))
      : undefined,
    signatory_city: isCompany ? cleanText(auth.CITY_1 || auth.CITY) || companyCoApplicant?.city || city : undefined,
    signatory_dob: isCompany ? toIsoOrNull(auth.DATE_OF_BIRTH_1 || auth.DATE_OF_BIRTH) || companyCoApplicant?.dob : undefined,
    signatory_designation: isCompany ? defaultCompanyDesignation(companyType) : undefined,
    signatory_pan: undefined,
    signatory_aadhaar: isCompany ? cleanText(auth.AUTH_AADHAAR_NUMBER || auth.AADHAAR_NUMBER_1) || companyCoApplicant?.aadhaar : undefined,

    ...instrumentData,

    loan_notes: buildLoanNotes({
      caseId,
      cpvAccountNo: cpv.CPV_ACCOUNT_NO,
      chosenVehicle,
      caseIdAliases,
      conflictFlags,
    }),
  };

  payload.__pilot = {
    caseId,
    cpvAccountNo: stringify(cpv.CPV_ACCOUNT_NO),
    conflictFlags,
  };

  applyCityFallbacks(payload);
  applyIfscBankFallbacks(payload);
  return pruneUndefined(payload);
}

function applyCityFallbacks(payload) {
  if (!payload || typeof payload !== "object") return;
  const pairs = [
    ["city", "pincode"],
    ["permanentCity", "permanentPincode"],
    ["employmentCity", "employmentPincode"],
    ["co_city", "co_pincode"],
    ["co_companyCity", "co_companyPincode"],
    ["gu_city", "gu_pincode"],
    ["gu_companyCity", "gu_companyPincode"],
    ["signatory_city", "signatory_pincode"],
    ["registrationCity", "registrationPincode"],
    ["reference1_city", "reference1_pincode"],
    ["reference2_city", "reference2_pincode"],
  ];

  pairs.forEach(([cityKey, pinKey]) => {
    if (cleanText(payload[cityKey])) return;
    const inferred = guessCityFromPincode(payload[pinKey]);
    if (inferred) payload[cityKey] = inferred;
  });
}

function applyIfscBankFallbacks(payload) {
  if (!payload || typeof payload !== "object") return;
  const inferredMain = inferBankNameFromIfsc(payload.ifscCode || payload.ifsc);
  if (inferredMain) {
    ["bankName", "approval_bankName", "postfile_bankName", "disburse_bankName"].forEach((key) => {
      if (!cleanText(payload[key])) payload[key] = inferredMain;
    });
  }
  const inferredEcs = inferBankNameFromMicr(payload.ecs_micrCode);
  if (inferredEcs && !cleanText(payload.ecs_bankName)) payload.ecs_bankName = inferredEcs;
  const inferredCo = inferBankNameFromIfsc(payload.co_ifscCode || payload.co_ifsc);
  if (inferredCo && !cleanText(payload.co_bankName)) payload.co_bankName = inferredCo;
  const inferredGu = inferBankNameFromIfsc(payload.gu_ifscCode || payload.gu_ifsc);
  if (inferredGu && !cleanText(payload.gu_bankName)) payload.gu_bankName = inferredGu;
}

async function upsertCustomerRecord({ payload, name, mobile, panNumber, existingId, createOnlyWithMobile = true }) {
  const normalizedName = normalizeIdentityValue(name);
  const normalizedMobile = normalizePhoneValue(mobile);
  const normalizedPan = normalizeIdentityValue(panNumber).toUpperCase();

  if (!normalizedName) return existingId || null;
  if (createOnlyWithMobile && normalizedMobile.length < 10 && !existingId) return existingId || null;

  const cleanData = pruneUndefined(cleanEmptyValues(convertDatesToStringsDeep(payload || {})));
  if (Array.isArray(cleanData.companyType)) cleanData.companyType = cleanData.companyType[0] || "";

  const matchedId = await findExistingCustomerId({
    name,
    mobile,
    panNumber,
    existingId,
  });

  if (matchedId) {
    await apiPut(`/api/customers/${matchedId}`, cleanData);
    return matchedId;
  }

  const res = await apiPost('/api/customers', cleanData);
  return res?.data?._id || res?.data?.id || res?._id || res?.id || null;
}

async function findExistingCustomerId({ name, mobile, panNumber, existingId }) {
  if (existingId) return existingId;

  const normalizedName = normalizeIdentityValue(name);
  const normalizedMobile = normalizePhoneValue(mobile);
  const normalizedPan = normalizeIdentityValue(panNumber).toUpperCase();

  const queries = [];
  if (normalizedMobile.length >= 10) queries.push(normalizedMobile);
  if (normalizedPan) queries.push(normalizedPan);
  if (normalizedName.length >= 2) queries.push(name);

  for (const query of queries) {
    try {
      const res = await apiGet(`/api/customers/search?q=${encodeURIComponent(query)}`);
      const matches = Array.isArray(res?.data) ? res.data : [];
      const matched = matches.find((customer) => {
        const customerMobile = normalizePhoneValue(customer.primaryMobile);
        const customerPan = normalizeIdentityValue(customer.panNumber).toUpperCase();
        const customerName = normalizeIdentityValue(customer.customerName);

        if (normalizedMobile && customerMobile && customerMobile === normalizedMobile) return true;
        if (normalizedPan && customerPan && customerPan === normalizedPan) return true;
        return normalizedName && customerName === normalizedName;
      });

      if (matched?._id || matched?.id) return matched._id || matched.id;
    } catch (error) {
      // Keep moving if a search query fails
    }
  }

  return null;
}

function buildPrimaryCustomerPayload(body) {
  const ref1 = body.reference1 || {};
  const ref2 = body.reference2 || {};
  const salaryMonthly = body.salaryMonthly || body.monthlySalary || body.monthlyIncome;
  return {
    applicantType: body.applicantType || 'Individual',
    customerName: body.customerName,
    primaryMobile: body.primaryMobile,
    email: body.email,
    emailAddress: body.email,
    panNumber: body.panNumber,
    aadhaarNumber: body.aadhaarNumber || body.aadharNumber,
    aadharNumber: body.aadharNumber || body.aadhaarNumber,
    gstNumber: body.gstNumber,
    contactPersonName: body.contactPersonName,
    contactPersonMobile: body.contactPersonMobile,
    sameAsCurrentAddress: body.sameAsCurrentAddress,
    residenceAddress: body.residenceAddress,
    pincode: body.pincode,
    city: body.city,
    permanentAddress: body.permanentAddress,
    permanentPincode: body.permanentPincode,
    permanentCity: body.permanentCity,
    gender: body.gender,
    dob: body.dob,
    motherName: body.motherName,
    sdwOf: body.sdwOf,
    maritalStatus: body.maritalStatus,
    dependents: body.dependents,
    education: body.education,
    houseType: body.houseType,
    occupationType: body.occupationType,
    professionalType: body.professionalType,
    monthlyIncome: body.monthlyIncome || body.salaryMonthly || body.monthlySalary,
    salaryMonthly,
    monthlySalary: body.monthlySalary || body.salaryMonthly || body.monthlyIncome,
    annualIncome: body.annualIncome,
    totalIncomeITR: body.totalIncomeITR,
    annualTurnover: body.annualTurnover,
    netProfit: body.netProfit,
    otherIncome: body.otherIncome,
    otherIncomeSource: body.otherIncomeSource,
    companyType: body.companyType,
    businessNature: body.businessNature,
    designation: body.designation,
    companyPartners: body.companyPartners,
    experienceCurrent: body.experienceCurrent,
    totalExperience: body.totalExperience,
    isMSME: body.isMSME,
    employmentAddress: body.employmentAddress,
    employmentPincode: body.employmentPincode,
    employmentCity: body.employmentCity,
    employmentPhone: body.employmentPhone,
    officialEmail: body.officialEmail,
    companyName: body.companyName,
    companyAddress: body.companyAddress || body.employmentAddress,
    companyPincode: body.companyPincode || body.employmentPincode,
    companyCity: body.companyCity || body.employmentCity,
    companyPhone: body.companyPhone || body.employmentPhone,
    bankName: body.bankName,
    accountNumber: body.accountNumber,
    ifscCode: body.ifscCode || body.ifsc,
    ifsc: body.ifsc || body.ifscCode,
    branch: body.branch,
    accountType: body.accountType,
    reference1_name: body.reference1_name || ref1.name,
    reference1_mobile: body.reference1_mobile || ref1.mobile,
    reference1_address: body.reference1_address || ref1.address,
    reference1_pincode: body.reference1_pincode || ref1.pincode,
    reference1_city: body.reference1_city || ref1.city,
    reference1_relation: body.reference1_relation || ref1.relation,
    reference2_name: body.reference2_name || ref2.name,
    reference2_mobile: body.reference2_mobile || ref2.mobile,
    reference2_address: body.reference2_address || ref2.address,
    reference2_pincode: body.reference2_pincode || ref2.pincode,
    reference2_city: body.reference2_city || ref2.city,
    reference2_relation: body.reference2_relation || ref2.relation,
    reference1: {
      name: body.reference1_name || ref1.name,
      mobile: body.reference1_mobile || ref1.mobile,
      address: body.reference1_address || ref1.address,
      pincode: body.reference1_pincode || ref1.pincode,
      city: body.reference1_city || ref1.city,
      relation: body.reference1_relation || ref1.relation,
    },
    reference2: {
      name: body.reference2_name || ref2.name,
      mobile: body.reference2_mobile || ref2.mobile,
      address: body.reference2_address || ref2.address,
      pincode: body.reference2_pincode || ref2.pincode,
      city: body.reference2_city || ref2.city,
      relation: body.reference2_relation || ref2.relation,
    },
    customerType: body.applicantType,
    loan_notes: body.loan_notes,
  };
}

function buildCoApplicantCustomerPayload(body) {
  return {
    applicantType: 'Individual',
    customerName: body.co_customerName,
    primaryMobile: body.co_primaryMobile,
    motherName: body.co_motherName,
    sdwOf: body.co_fatherName,
    fatherName: body.co_fatherName,
    gender: body.co_gender,
    dob: body.co_dob,
    maritalStatus: body.co_maritalStatus,
    dependents: body.co_dependents,
    education: body.co_education,
    houseType: body.co_houseType,
    residenceAddress: body.co_address,
    pincode: body.co_pincode,
    city: body.co_city,
    panNumber: body.co_pan,
    aadhaarNumber: body.co_aadhaar,
    aadharNumber: body.co_aadhaar,
    occupationType: body.co_occupation,
    professionalType: body.co_professionalType,
    companyType: body.co_companyType,
    businessNature: body.co_businessNature,
    designation: body.co_designation,
    currentExp: body.co_currentExperience,
    experienceCurrent: body.co_currentExperience,
    totalExp: body.co_totalExperience,
    totalExperience: body.co_totalExperience,
    companyName: body.co_companyName,
    companyAddress: body.co_companyAddress || body.co_address,
    companyPincode: body.co_companyPincode || body.co_pincode,
    companyCity: body.co_companyCity || body.co_city,
    companyPhone: body.co_companyPhone,
    employmentAddress: body.co_companyAddress || body.co_address,
    employmentPincode: body.co_companyPincode || body.co_pincode,
    employmentCity: body.co_companyCity || body.co_city,
    employmentPhone: body.co_companyPhone,
    monthlyIncome: body.co_monthlySalary || body.co_salaryMonthly,
    salaryMonthly: body.co_salaryMonthly || body.co_monthlySalary,
    monthlySalary: body.co_monthlySalary || body.co_salaryMonthly,
    customerType: "Co-Applicant",
    loan_notes: body.loan_notes,
  };
}

function buildGuarantorCustomerPayload(body) {
  return {
    applicantType: 'Individual',
    customerName: body.gu_customerName,
    primaryMobile: body.gu_primaryMobile,
    motherName: body.gu_motherName,
    sdwOf: body.gu_fatherName,
    fatherName: body.gu_fatherName,
    gender: body.gu_gender,
    dob: body.gu_dob,
    maritalStatus: body.gu_maritalStatus,
    dependents: body.gu_dependents,
    education: body.gu_education,
    houseType: body.gu_houseType,
    residenceAddress: body.gu_address,
    pincode: body.gu_pincode,
    city: body.gu_city,
    panNumber: body.gu_pan,
    aadhaarNumber: body.gu_aadhaar,
    aadharNumber: body.gu_aadhaar,
    occupationType: body.gu_occupation,
    professionalType: body.gu_professionalType,
    companyType: body.gu_companyType,
    businessNature: body.gu_businessNature,
    designation: body.gu_designation,
    currentExp: body.gu_currentExperience,
    experienceCurrent: body.gu_currentExperience,
    totalExp: body.gu_totalExperience,
    totalExperience: body.gu_totalExperience,
    companyName: body.gu_companyName,
    companyAddress: body.gu_companyAddress || body.gu_address,
    companyPincode: body.gu_companyPincode || body.gu_pincode,
    companyCity: body.gu_companyCity || body.gu_city,
    companyPhone: body.gu_companyPhone,
    employmentAddress: body.gu_companyAddress || body.gu_address,
    employmentPincode: body.gu_companyPincode || body.gu_pincode,
    employmentCity: body.gu_companyCity || body.gu_city,
    employmentPhone: body.gu_companyPhone,
    customerType: "Guarantor",
    loan_notes: body.loan_notes,
  };
}

function buildSignatoryCustomerPayload(body) {
  const useCo = !!body.signatorySameAsCoApplicant;
  return {
    applicantType: "Individual",
    customerName: body.signatory_customerName || (useCo ? body.co_customerName : undefined),
    primaryMobile: body.signatory_primaryMobile || (useCo ? body.co_primaryMobile : undefined),
    residenceAddress: body.signatory_address || (useCo ? body.co_address : undefined),
    pincode: body.signatory_pincode || (useCo ? body.co_pincode : undefined),
    city: body.signatory_city || (useCo ? body.co_city : undefined),
    dob: body.signatory_dob || (useCo ? body.co_dob : undefined),
    gender: body.signatory_gender || (useCo ? body.co_gender : undefined),
    designation: body.signatory_designation || (useCo ? body.co_designation : undefined),
    panNumber: body.signatory_pan || (useCo ? body.co_pan : undefined),
    aadhaarNumber: body.signatory_aadhaar || (useCo ? body.co_aadhaar : undefined),
    aadharNumber: body.signatory_aadhaar || (useCo ? body.co_aadhaar : undefined),
    customerType: "Authorised Signatory",
    loan_notes: body.loan_notes,
  };
}

function normalizeIdentityValue(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizePhoneValue(value) {
  return String(value || '').replace(/\D+/g, '');
}

function cleanEmptyValues(value) {
  if (Array.isArray(value)) {
    return value.map(cleanEmptyValues).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, val]) => [key, cleanEmptyValues(val)])
      .filter(([, val]) => val !== undefined && val !== '');
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  if (value === null || value === undefined || value === '') return undefined;
  return value;
}

function convertDatesToStringsDeep(value) {
  if (Array.isArray(value)) return value.map(convertDatesToStringsDeep);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convertDatesToStringsDeep(v)]));
  }
  return value;
}

function buildPrimaryBankData({ approvalBank, loanAmount, roi, tenure, approvalDate, disbursedDate, chosenVehicle, exShowroomPrice, payoutPercentage, approvalHistory, dsaCode }) {
  return {
    id: 1,
    bankName: normalizeBankName(approvalBank) || "Legacy Bank",
    dsaCode: cleanText(dsaCode),
    status: "Disbursed",
    statusHistory: approvalHistory,
    loanAmount,
    disbursedAmount: loanAmount,
    interestRate: roi || undefined,
    tenure: tenure || undefined,
    processingFee: 0,
    payoutPercent: payoutPercentage || "",
    approvalDate: toIsoOrNull(approvalDate),
    disbursedDate: toIsoOrNull(disbursedDate),
    vehicle: {
      make: chosenVehicle.brand,
      model: chosenVehicle.model,
      variant: chosenVehicle.variant,
      fuel: normalizeFuelType(chosenVehicle.fuel || chosenVehicle.fuel_type),
      exShowroomPrice,
    },
    breakupNetLoanApproved: loanAmount,
    breakupCreditAssured: 0,
    breakupInsuranceFinance: 0,
    breakupEwFinance: 0,
  };
}

function buildApprovalStatusHistory(approvalDate, disbursedDate) {
  const approvalIso = toIsoOrNull(approvalDate);
  const disbursedIso = toIsoOrNull(disbursedDate || approvalDate);
  return [
    { status: "Approved", date: approvalIso, changedAt: approvalIso },
    { status: "Disbursed", date: disbursedIso, changedAt: disbursedIso },
  ].filter((entry) => entry.date);
}

function buildInstrumentPayload(rows, approvalBank) {
  if (!rows.length) return {};

  const buildChequeFields = (chequeRows, base = {}) => {
    const payload = { ...base };
    chequeRows.forEach((row, index) => {
      const id = index + 1;
      payload[`cheque_${id}_number`] = cleanText(row.INSTRMNT_NO || row.INSTRMNT_RECPT_ID_NO);
      payload[`cheque_${id}_bankName`] = normalizeBankName(row.DRAWN_ON);
      payload[`cheque_${id}_accountNumber`] = cleanText(row.ACCOUNT_NUMBER);
      payload[`cheque_${id}_date`] = toDateOnly(row.INSTRMNT_DATE || row.ENTERED_ON_DATE);
      payload[`cheque_${id}_amount`] = toNumber(row.INSTRMNT_AMOUNT);
      payload[`cheque_${id}_tag`] = cleanText(row.INSTRMNT_FAVOURING);
      payload[`cheque_${id}_favouring`] = normalizeBankName(approvalBank);
      payload[`cheque_${id}_signedBy`] = normalizeInstrumentParty(row.INSTRMNT_BY_BORWR_GRNTR);
    });
    return payload;
  };

  const cheques = rows.filter((row) => cleanText(row.INSTRMNT_TYPE).toUpperCase() === "CHEQUE");

  const si = rows.find((row) => cleanText(row.INSTRMNT_TYPE).toUpperCase() === "SI");
  if (si) {
    return {
      instrumentType: "SI",
      si_accountNumber: cleanText(si.ACCOUNT_NUMBER),
      si_signedBy: normalizeInstrumentParty(si.INSTRMNT_BY_BORWR_GRNTR),
    };
  }

  const ecs = rows.find((row) => cleanText(row.INSTRMNT_TYPE).toUpperCase() === "ECS");
  if (ecs) {
    return buildChequeFields(cheques, {
      instrumentType: "ECS",
      ecs_micrCode: cleanText(ecs.MICR_CODE),
      ecs_bankName: normalizeBankName(ecs.DRAWN_ON),
      ecs_accountNumber: cleanText(ecs.ACCOUNT_NUMBER),
      ecs_date: toDateOnly(ecs.INSTRMNT_DATE),
      ecs_amount: toNumber(ecs.INSTRMNT_AMOUNT),
      ecs_tag: cleanText(ecs.INSTRMNT_FAVOURING),
      ecs_favouring: normalizeBankName(approvalBank),
      ecs_signedBy: normalizeInstrumentParty(ecs.INSTRMNT_BY_BORWR_GRNTR),
    });
  }

  if (!cheques.length) return {};
  return buildChequeFields(cheques, { instrumentType: "Cheque" });
}

function normalizeInstrumentParty(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return undefined;
  if (text.includes("grntr") || text.includes("guarantor")) return "Guarantor";
  if (text.includes("co")) return "Co-applicant";
  return "Applicant";
}

function buildCompanyCoApplicant({ cpv, auth, gur, customerName, city, pincode, residenceAddress, companyType, businessNature }) {
  const occupation = normalizeOccupationType(cpv.PROFESSION_TYPE) || "Self Employed";
  const authAddress = joinText(auth.ADD1_1 || auth.ADD1, auth.ADD2_1 || auth.ADD2);
  const gurAddress = joinText(gur.RESI_ADD1, gur.RESI_ADD2) || joinText(gur.OFF_ADD1, gur.OFF_ADD2);
  const personAddress =
    authAddress ||
    gurAddress ||
    joinText(cpv.RESI_ADD1, cpv.RESI_ADD2, cpv.RESI_PIN) ||
    residenceAddress;
  const personPincodeFromAddress = extractReferencePincode(personAddress);
  return pruneUndefined({
    customerName: cleanText(auth.NAME || auth.NAME_1 || gur.NAME) || undefined,
    primaryMobile: cleanText(auth.PHONE || auth.PHONE_1 || auth.MOBILE || gur.RESI_PHONE || gur.OFF_PHONE || cpv.RESI_PHONE1 || cpv.MOBILE) || undefined,
    address: personAddress || undefined,
    pincode:
      cleanText(auth.PIN || auth.PIN_1 || gur.RESI_PIN || gur.OFF_PIN || cpv.RESI_PIN) ||
      personPincodeFromAddress ||
      pincode ||
      undefined,
    city: cleanText(auth.CITY_1 || auth.CITY || gur.RESI_CITY || gur.OFF_CITY || cpv.RESI_CITY) || city || undefined,
    dob: toIsoOrNull(auth.DATE_OF_BIRTH_1 || auth.DATE_OF_BIRTH || cpv.DATE_OF_BIRTH),
    gender: normalizeGender(cpv.SEX),
    pan: undefined,
    aadhaar:
      cleanText(
        cpv.AADHAAR_NUMBER ||
          cpv.AADHAR_NUMBER ||
          auth.AUTH_AADHAAR_NUMBER ||
          auth.AADHAAR_NUMBER_1 ||
          gur.G_AADHAAR_NUMBER,
      ) || undefined,
    motherName: cleanText(cpv.MOTHERS_MAIDEN_NAME) || undefined,
    fatherName: joinText(cpv.FATHERS_NAME_FIRST, cpv.FATHERS_NAME_MIDDLE, cpv.FATHERS_NAME_LAST) || cleanText(cpv.HUSBAND_NAME) || undefined,
    maritalStatus: normalizeMaritalStatus(cpv.MARITAL_STATUS),
    dependents: numericOrUndefined(cpv.NO_OF_DEPENDANTS || gur.NO_OF_DEPEND),
    education: normalizeEducation(cpv.EDUCATION),
    houseType: normalizeHouseTypeLabel(cpv.RESIDENCE_TYPE || gur.RESIDENCE_TYPE),
    occupation,
    professionalType: occupation === "Self Employed Professional" ? "Other" : undefined,
    companyType,
    businessNature,
    designation: defaultCompanyDesignation(companyType),
    currentExperience: numericOrUndefined(cpv.YEAR_AT_PROFESSION),
    totalExperience: numericOrUndefined(cpv.YEAR_AT_PROFESSION),
    companyName: customerName || undefined,
    companyAddress: residenceAddress || joinText(cpv.OFF_ADD1, cpv.OFF_ADD2) || undefined,
    companyPincode: cleanText(pincode || cpv.OFF_PIN) || undefined,
    companyCity: cleanText(cpv.OFF_CITY) || undefined,
    companyPhone: cleanText(cpv.OFF_PHONE1 || cpv.OFF_PHONE2 || cpv.OFF_PHONE3 || gur.OFF_PHONE || cpv.RESI_PHONE1) || undefined,
  });
}

function mapPartnerRow(row) {
  return {
    name: cleanText(row.NAME || row.NAME_1),
    panNumber: undefined,
    contactNumber: cleanText(row.PHONE || row.PHONE_1 || row.MOBILE),
    dateOfBirth: toDateOnly(row.DATE_OF_BIRTH || row.DATE_OF_BIRTH_1),
  };
}

function hasPartnerContent(partner) {
  return Boolean(partner && (partner.name || partner.contactNumber || partner.dateOfBirth));
}

function buildReference(cpv, index) {
  const prefix = `REF${index}`;
  const address = cleanText(cpv[`${prefix}_ADD`]);
  const pincode = extractReferencePincode(address);
  return {
    name: cleanText(cpv[`${prefix}_NAME`]),
    mobile: cleanText(cpv[`${prefix}_PHONE`]),
    address,
    pincode,
    city: pincode ? guessCityFromPincode(pincode) : guessCityFromAddress(address),
    relation: cleanText(cpv[`${prefix}_RELATION`]),
  };
}

function hasReferenceContent(ref) {
  return Boolean(ref && (ref.name || ref.mobile || ref.address || ref.relation));
}

function deriveRegistrationAddress({ isCompany, rc, residenceAddress, permanentAddress }) {
  const regRule = cleanText(rc.ADDRESS_FOR_REGISTER).toUpperCase();
  if (regRule.includes("OFFICE") || regRule.includes("GST")) return residenceAddress;
  if (regRule.includes("PERMANENT")) return permanentAddress || residenceAddress;
  if (regRule.includes("RESI") || regRule.includes("AADHAR") || regRule.includes("AADHAAR")) return residenceAddress;
  return isCompany ? residenceAddress : permanentAddress || residenceAddress;
}

function deriveRegistrationPincode({ registrationAddress, pincode, permanentPincode }) {
  const extracted = extractPincode(registrationAddress);
  return extracted || (registrationAddress === undefined ? undefined : permanentPincode || pincode);
}

function deriveRegistrationCity({ registrationNumber, rc, registrationAddress, residenceAddress, permanentAddress, city, permanentCity, fallbackCity }) {
  const prefixCity = getRegistrationCityFromNumber(registrationNumber);
  if (prefixCity) return prefixCity;

  if (sameAddress(registrationAddress, residenceAddress) && city) return city;
  if (sameAddress(registrationAddress, permanentAddress) && permanentCity) return permanentCity;

  const rule = cleanText(rc.ADDRESS_FOR_REGISTER).toUpperCase();
  if (rule.includes("OFFICE") || rule.includes("GST") || rule.includes("RESI") || rule.includes("AADHAR") || rule.includes("AADHAAR")) {
    return city || fallbackCity || undefined;
  }
  if (rule.includes("PERMANENT")) {
    return permanentCity || city || fallbackCity || undefined;
  }

  return fallbackCity || guessCityFromAddress(registrationAddress) || city || permanentCity || undefined;
}

function getRegistrationCityFromNumber(registrationNumber) {
  const normalized = cleanText(registrationNumber).toUpperCase().replace(/\s+/g, "");
  if (!normalized) return undefined;

  const directKey = Object.keys(REG_CITY_BY_PREFIX).find((key) => normalized.startsWith(key));
  if (directKey) return REG_CITY_BY_PREFIX[directKey];

  if (normalized.startsWith("DL")) return "Delhi";
  return undefined;
}

function parsePermanentAddress(value) {
  const text = cleanText(value);
  return text && text.toUpperCase() !== "NA" ? text : undefined;
}

function buildLoanNumber(rc) {
  const parts = [
    cleanText(rc.LOAN_NUMBER_PREFIX),
    cleanText(rc.LOAN_NUMBER_MIDDLE),
    cleanText(rc.LOAN_NUMBER_SUFFIX),
    cleanText(rc.LOAN_NUMBER),
  ].filter(Boolean);
  if (!parts.length) return undefined;
  if (parts.length === 1) return parts[0];
  return parts.join("");
}

function chooseInvoiceRow(rows, rcs) {
  return rows.find((row) => row.INVOICE_NUMBER || row.INV_RECEIVED_AS) || rcs || rows[0] || {};
}

function chooseRcReceiptRow(rows, rcs) {
  return rows.find((row) => row.REGD_NUMBER || row.RC_RECEIVED_AS_1 || row.RC_RECEIVED_AS || row.RC_RECEIVED_FROM) || rcs || rows[0] || {};
}

function invoicePriority(row) {
  let score = 0;
  if (row.INVOICE_NUMBER) score += 3;
  if (row.REGD_NUMBER) score += 2;
  if (row.RC_RECEIVED_AS_1) score += 2;
  if (row.RC_RECEIVED_AS) score += 1;
  return score;
}

function detectConflicts(caseData, cpvRows, rcRows) {
  const flags = [];
  const cpvNames = uniq(cpvRows.map((r) => cleanText(r.CUSTOMER_NAME)));
  const rcNames = uniq(rcRows.map((r) => cleanText(r.CUST_NAME)));
  const vehicleNames = uniq(cpvRows.map((r) => cleanText(r.CAR_MODEL)).concat(rcRows.map((r) => cleanText(r.MAKE_MODEL))));
  if (cpvNames.length > 1 || rcNames.length > 1 || uniq(cpvNames.concat(rcNames)).length > 1) {
    flags.push("name_conflict");
  }
  if (vehicleNames.length > 1) flags.push("vehicle_conflict");
  if ((caseData.matches["CPV_DETAIL.json"] || []).length > 1) flags.push("multiple_cpv_rows");
  if ((caseData.matches["RC_CUSTOMER_ACCOUNT.json"] || []).length > 1) flags.push("multiple_rc_rows");
  return flags;
}

function getPilotMarker(caseId) {
  return `[pilot-import:${caseId}]`;
}

function buildLoanNotes({ caseId, cpvAccountNo, chosenVehicle, caseIdAliases, conflictFlags }) {
  return [
    getPilotMarker(caseId),
    `Legacy aliases: ${caseIdAliases.join(", ")}`,
    `Vehicle mapped by pilot importer: ${chosenVehicle.brand} / ${chosenVehicle.model} / ${chosenVehicle.variant}`,
    `CPV account: ${cpvAccountNo || "NA"}`,
    conflictFlags.length ? `Conflict flags: ${conflictFlags.join(", ")}` : "Conflict flags: none",
  ].join("\n");
}

function pickName(caseId, cpvRows, rcRows) {
  const preferred = CASE_OVERRIDES[caseId] || {};
  const targetTemp = preferred.preferredTempCustCode || caseId;
  const rcExact = rcRows.find((row) => stringify(row.TEMP_CUST_CODE) === targetTemp && cleanText(row.CUST_NAME));
  if (rcExact) return cleanText(rcExact.CUST_NAME);
  const cpvExact = cpvRows.find((row) => stringify(row.CDB_ACCOUNT_NO) === targetTemp && cleanText(row.CUSTOMER_NAME));
  if (cpvExact) return cleanText(cpvExact.CUSTOMER_NAME);
  return cleanText(rcRows[0]?.CUST_NAME || cpvRows[0]?.CUSTOMER_NAME || "");
}

function pickMobile(cpv, rc, auth) {
  return cleanText(cpv.RESI_PHONE1 || cpv.MOBILE || rc.MOBILE_NUMBER || rc.PHONE_NUMBERS_RESI || auth.PHONE || auth.MOBILE);
}

function pickOfficePhone(cpv, rc, auth, gur = {}) {
  return cleanText(
    cpv.OFF_PHONE1 ||
      cpv.OFF_PHONE2 ||
      cpv.OFF_PHONE3 ||
      gur.OFF_PHONE ||
      rc.PHONE_NUMBERS_OFFICE ||
      auth.PHONE ||
      auth.MOBILE ||
      cpv.RESI_PHONE1,
  );
}

function pickAlternateMobile(primaryMobile, cpv, gur = {}) {
  const primary = cleanText(primaryMobile);
  const candidates = [
    cpv.RESI_PHONE2,
    cpv.RESI_PHONE3,
    cpv.OFF_PHONE2,
    cpv.OFF_PHONE3,
    gur.RESI_PHONE,
    gur.OFF_PHONE,
    cpv.OFF_PHONE1,
  ].map(cleanText).filter(Boolean);
  return candidates.find((num) => num !== primary);
}

function splitVariantYear(variant) {
  const text = cleanText(variant);
  const fourDigit = text.match(/^(.*?)(?:\s+)(19\d{2}|20\d{2})$/);
  if (fourDigit) return { variant: cleanText(fourDigit[1]), year: Number(fourDigit[2]) };
  const twoDigit = text.match(/^(.*?)(?:\s+)(\d{2})$/);
  if (!twoDigit) return { variant: text, year: undefined };
  return { variant: cleanText(twoDigit[1]), year: normalizeTwoDigitYear(twoDigit[2]) };
}

function parseYear(value) {
  const text = cleanText(value);
  if (!text) return undefined;
  const match = text.match(/(19\d{2}|20\d{2})/);
  return match ? Number(match[1]) : undefined;
}

function normalizeTwoDigitYear(twoDigits) {
  const yy = Number(twoDigits);
  if (!Number.isFinite(yy)) return undefined;
  const currentYY = new Date().getFullYear() % 100;
  return yy <= currentYY ? 2000 + yy : 1900 + yy;
}

function resolveVehicleFromLegacyText(label, vehicles) {
  const raw = cleanText(label);
  if (!raw) return {};
  const { variant: withoutYear } = splitVariantYear(raw);
  const legacyRaw = cleanText(withoutYear || raw);
  const normalized = normalizeVehicleText(withoutYear || raw);
  const all = Array.isArray(vehicles) ? vehicles : [];
  const brandHint = detectBrandHint(normalized);
  const filteredByBrand = brandHint
    ? all.filter((v) => canonicalMake(v.brand) === canonicalMake(brandHint))
    : all;
  const candidatePool = filteredByBrand.length ? filteredByBrand : all;
  const rawTokens = tokenizeVehicleText(normalized);

  const exact = candidatePool.find((v) => {
    const combo = normalizeVehicleText(`${cleanText(v.brand)} ${cleanText(v.model)} ${cleanText(v.variant)}`);
    return combo === normalized;
  });
  if (exact) {
    return {
      brand: canonicalMake(exact.brand),
      model: trimVehicleLabel(cleanText(exact.model), cleanText(exact.brand)),
      variant: trimVehicleVariant(cleanText(exact.variant), cleanText(exact.brand), cleanText(exact.model)),
      fuel: normalizeFuelType(exact.fuel || exact.fuel_type),
    };
  }

  const scored = candidatePool
    .map((v) => {
      const brand = cleanText(v.brand);
      const model = cleanText(v.model);
      const variant = cleanText(v.variant);
      const vBrand = normalizeVehicleText(brand);
      const vModel = normalizeVehicleText(model);
      const vVariant = normalizeVehicleText(trimVehicleVariant(variant, brand, model));
      const vCombo = normalizeVehicleText(`${brand} ${model} ${variant}`);
      const modelTokens = tokenizeVehicleText(vModel);
      const variantTokens = tokenizeVehicleText(vVariant);
      const modelOverlap = tokenOverlapScore(normalized, vModel);
      let score = 0;
      if (vBrand && normalized.includes(vBrand)) score += 3;
      const hasStrongModelMatch =
        vModel && (normalized.includes(vModel) || tokenSequenceContained(rawTokens, modelTokens) || modelOverlap >= 1);
      if (hasStrongModelMatch) score += 14;
      if (vVariant && normalized.includes(vVariant)) score += 8;
      score += tokenOverlapScore(normalized, `${vModel} ${vVariant}`);
      if (normalized === vModel || normalized === `${vModel} ${vVariant}`) score += 5;
      if (vCombo.includes(normalized) || normalized.includes(vCombo)) score += 3;
      if (!hasStrongModelMatch && modelOverlap < 1) score -= 6;
      // Penalize semantic mismatches (fuel/gearbox) to avoid wrong premium trims.
      if (/\bhybrid\b/.test(vCombo) && !/\bhybrid\b/.test(normalized)) score -= 7;
      if (/\bcvt\b/.test(vCombo) && /\bmt\b/.test(normalized)) score -= 6;
      if (/\bamt\b/.test(vCombo) && /\bmt\b/.test(normalized)) score -= 4;
      if (/\bdct\b/.test(vCombo) && /\bmt\b/.test(normalized)) score -= 4;
      if (/\bdiesel\b/.test(vCombo) && /\bvtec\b/.test(normalized)) score -= 3;
      if (/\bcng\b/.test(vCombo) && !/\bcng\b/.test(normalized)) score -= 3;
      if (/\belectric\b|\bev\b/.test(vCombo) && !/\belectric\b|\bev\b/.test(normalized)) score -= 12;
      if (/\bdsl\b|\bcrdi\b|\bdiesel\b|\bpetrol\b|\bvtvt\b/.test(normalized) && /\belectric\b|\bev\b/.test(vCombo)) score -= 18;
      return { v, score, modelLen: vModel.length };
    })
    .filter((r) => r.score > 2)
    .sort((a, b) => (b.score - a.score) || (b.modelLen - a.modelLen));

  const best = scored[0];
  const strictScore = 12;
  if (!best || best.score < strictScore) {
    if (!brandHint) {
      return {
        brand: "",
        model: legacyRaw,
        variant: legacyRaw,
        fuel: undefined,
      };
    }
    return {
      brand: canonicalMake(brandHint),
      model: inferModelFromLegacyByBrand(normalized, brandHint) || legacyRaw,
      variant: legacyRaw,
      fuel: undefined,
    };
  }
  let picked = best.v;
  // If legacy text does not mention hybrid, avoid defaulting to hybrid model.
  if (!/\bhybrid\b/.test(normalized) && /\bhybrid\b/.test(normalizeVehicleText(picked.model))) {
    const fallbackModel = candidatePool.find((v) => {
      if (normalizeVehicleText(v.brand) !== normalizeVehicleText(picked.brand)) return false;
      const m = normalizeVehicleText(v.model);
      return !/\bhybrid\b/.test(m) && tokenOverlapScore(normalized, m) >= 1;
    });
    if (fallbackModel) picked = fallbackModel;
  }
  // If legacy mentions fuel (diesel/petrol) and not EV, don't allow electric model pick.
  if (/\bdsl\b|\bcrdi\b|\bdiesel\b|\bpetrol\b|\bvtvt\b/.test(normalized) && !/\belectric\b|\bev\b/.test(normalized)) {
    const pickedModelNorm = normalizeVehicleText(picked.model);
    if (/\belectric\b|\bev\b/.test(pickedModelNorm)) {
      const nonEvFallback = candidatePool.find((v) => {
        if (canonicalMake(v.brand) !== canonicalMake(picked.brand)) return false;
        const m = normalizeVehicleText(v.model);
        return !/\belectric\b|\bev\b/.test(m) && tokenOverlapScore(normalized, m) >= 1;
      });
      if (nonEvFallback) picked = nonEvFallback;
    }
  }
  const pickedBrand = canonicalMake(picked.brand);
  const pickedModelRaw = cleanText(picked.model);
  let finalModelRaw =
    !/\bhybrid\b/i.test(normalized) && /\bhybrid\b/i.test(pickedModelRaw)
      ? cleanText(pickedModelRaw.replace(/\bhybrid\b/gi, ""))
      : pickedModelRaw;
  if (pickedBrand === "Mahindra" && /\bscorpio\b/.test(normalized) && !/\bscorpio n\b/.test(normalized) && /\bscorpio n\b/i.test(finalModelRaw)) {
    finalModelRaw = "Scorpio";
  }
  const legacyVariant = cleanText(trimVehicleVariant(withoutYear || raw, pickedBrand, finalModelRaw));
  const chosenVariant = legacyVariant && legacyVariant.length >= 3
    ? legacyVariant
    : trimVehicleVariant(cleanText(picked.variant), pickedBrand, finalModelRaw);
  if (!hasLooseVehicleMatch(normalized, finalModelRaw, chosenVariant)) {
    return {
      brand: canonicalMake(brandHint || ""),
      model: legacyRaw,
      variant: legacyRaw,
      fuel: undefined,
    };
  }
  if (brandHint && canonicalMake(pickedBrand) && canonicalMake(pickedBrand) !== canonicalMake(brandHint)) {
    return {
      brand: canonicalMake(brandHint),
      model: legacyRaw,
      variant: legacyRaw,
      fuel: undefined,
    };
  }
  return {
    brand: pickedBrand,
    model: trimVehicleLabel(finalModelRaw, pickedBrand),
    variant: chosenVariant,
    fuel: normalizeFuelType(picked.fuel || picked.fuel_type),
  };
}

function detectBrandHint(normalized) {
  const rules = [
    { re: /\bmerc(?:edes)?\b|\bbenz\b|\bamg\b/, brand: "Mercedes Benz" },
    { re: /\bhonda\b|\bcity\b|\bvtec\b|\bidtec\b|\bamaze\b|\bjazz\b|\bbrio\b|\bwrv\b|\bmobilio\b|\bbrv\b/, brand: "Honda" },
    { re: /\bmahindra\b|\bscorpio\b|\btuv\b|\bbolero\b|\bxuv\b|\bthar\b/, brand: "Mahindra" },
    { re: /\bmaruti\b|\bsuzuki\b|\bswift\b|\bbaleno\b|\bbrezza\b|\bertiga\b|\bwagonr\b|\bciaz\b|\bignis\b|\balto\b|\bfronx\b|\bcelerio\b|\bs(?:\-|\s)?cross\b|\bsx4\b|\britz\b|\ba(?:\-|\s)?star\b/, brand: "Maruti Suzuki" },
    { re: /\bhyundai\b|\bcreta\b|\bvenue\b|\bi20\b|\bi10\b|\bverna\b|\baura\b|\bsantro\b|\bgrand i10\b|\bnios\b|\bexter\b|\belantra\b|\baccent\b/, brand: "Hyundai" },
    { re: /\bchevrolet\b|\bspark\b|\bbeat\b|\baveo\b|\btavera\b|\bcruze\b|\benjoy\b/, brand: "Chevrolet" },
    { re: /\btata\b|\bharrier\b|\bnexon\b|\bsafari\b|\baltroz\b|\btiago\b|\bpunch\b/, brand: "Tata" },
    { re: /\bkia\b|\bseltos\b|\bsonet\b|\bcarens\b/, brand: "Kia" },
    { re: /\btoyota\b|\binnova\b|\bfortuner\b|\bglanza\b|\bhyryder\b|\bcorolla\b|\baltis\b|\betios\b|\byaris\b|\bcamry\b/, brand: "Toyota" },
    { re: /\brenault\b|\bkiger\b|\btriber\b|\bkwid\b|\bduster\b/, brand: "Renault" },
    { re: /\bvolkswagen\b|\bpolo\b|\bvento\b|\btaigun\b|\btiguan\b|\bvirtus\b/, brand: "Volkswagen" },
    { re: /\bskoda\b|\brapid\b|\bslavia\b|\bkushaq\b|\boctavia\b|\bsuperb\b/, brand: "Skoda" },
    { re: /\bford\b|\bfigo\b|\becosport\b|\bendeavour\b|\baspire\b|\bfreestyle\b/, brand: "Ford" },
    { re: /\bnissan\b|\bmagnite\b|\bsunny\b|\bmicra\b|\bterrano\b|\bkicks\b/, brand: "Nissan" },
    { re: /\bmg\b|\bhector\b|\bastor\b|\bgloster\b|\bzs\b/, brand: "MG" },
  ];
  const hit = rules.find((r) => r.re.test(normalized));
  return hit?.brand;
}

function hasLooseVehicleMatch(rawNormalized, model, variant) {
  const rawTokens = tokenizeVehicleText(rawNormalized).filter((t) => t.length >= 3);
  if (!rawTokens.length) return true;
  const target = normalizeVehicleText(`${model} ${variant}`);
  const targetCompact = target.replace(/[^a-z0-9]/g, "");
  return rawTokens.some((t) => {
    const token = normalizeVehicleText(t);
    const tokenCompact = token.replace(/[^a-z0-9]/g, "");
    return target.includes(token) || (tokenCompact && targetCompact.includes(tokenCompact));
  });
}

function inferModelFromLegacyByBrand(normalized, brand) {
  if (brand === "Mercedes Benz") {
    if (/\be\s*220\b|\be220\b/.test(normalized)) return "E Class";
    if (/\bc\s*220\b|\bc220\b/.test(normalized)) return "C Class";
    if (/\bs\s*63\b|\bs63\b/.test(normalized)) return "Amg S 63";
  }
  if (brand === "Honda") {
    if (/\bcity\b/.test(normalized)) return "City";
    if (/\bamaze\b/.test(normalized)) return "Amaze";
    if (/\bjazz\b/.test(normalized)) return "Jazz";
    if (/\bbrio\b/.test(normalized)) return "Brio";
    if (/\bwrv\b/.test(normalized)) return "WR-V";
    if (/\bmobilio\b/.test(normalized)) return "Mobilio";
    if (/\bbrv\b/.test(normalized)) return "BR-V";
  }
  if (brand === "Mahindra") {
    if (/\bscorpio\b/.test(normalized)) return "Scorpio";
    if (/\btuv\b/.test(normalized)) return "TUV300 Plus";
    if (/\bxuv\s*500\b/.test(normalized)) return "XUV500";
    if (/\bxuv\s*700\b/.test(normalized)) return "XUV700";
  }
  if (brand === "Hyundai") {
    if (/\bsantro\b/.test(normalized)) return "Santro";
    if (/\bgrand i10\b|\bnios\b/.test(normalized)) return "Grand I10 Nios";
    if (/\bi20\b/.test(normalized)) return "I20";
    if (/\bi10\b/.test(normalized)) return "Grand I10 Nios";
    if (/\bcreta\b/.test(normalized)) return "Creta";
    if (/\bvenue\b/.test(normalized)) return "Venue";
    if (/\bverna\b/.test(normalized)) return "Verna";
    if (/\baura\b/.test(normalized)) return "Aura";
    if (/\baccent\b/.test(normalized)) return "Accent";
  }
  if (brand === "Chevrolet") {
    if (/\bspark\b/.test(normalized)) return "Spark";
    if (/\baveo\b/.test(normalized)) return "Aveo";
    if (/\btavera\b/.test(normalized)) return "Tavera";
    if (/\bbeat\b/.test(normalized)) return "Beat";
    if (/\bcruze\b/.test(normalized)) return "Cruze";
  }
  if (brand === "Toyota") {
    if (/\bcorolla\b|\baltis\b/.test(normalized)) return "Corolla Altis";
    if (/\binnova\b/.test(normalized)) return "Innova Crysta";
    if (/\bfortuner\b/.test(normalized)) return "Fortuner";
    if (/\betios\b/.test(normalized)) return "Etios";
    if (/\bglanza\b/.test(normalized)) return "Glanza";
  }
  if (brand === "Volkswagen") {
    if (/\bpolo\b/.test(normalized)) return "Polo";
    if (/\bvento\b/.test(normalized)) return "Vento";
    if (/\btaigun\b/.test(normalized)) return "Taigun";
    if (/\bvirtus\b/.test(normalized)) return "Virtus";
    if (/\btiguan\b/.test(normalized)) return "Tiguan";
  }
  if (brand === "Skoda") {
    if (/\brapid\b/.test(normalized)) return "Rapid";
    if (/\bslavia\b/.test(normalized)) return "Slavia";
    if (/\bkushaq\b/.test(normalized)) return "Kushaq";
    if (/\boctavia\b/.test(normalized)) return "Octavia";
    if (/\bsuperb\b/.test(normalized)) return "Superb";
  }
  if (brand === "Ford") {
    if (/\bfigo\b/.test(normalized)) return "Figo";
    if (/\becosport\b/.test(normalized)) return "Ecosport";
    if (/\bendeavour\b/.test(normalized)) return "Endeavour";
    if (/\baspire\b/.test(normalized)) return "Aspire";
  }
  if (brand === "Maruti Suzuki") {
    if (/\bswift\b/.test(normalized)) return "Swift";
    if (/\bdzire\b/.test(normalized)) return "Dzire";
    if (/\bciaz\b/.test(normalized)) return "Ciaz";
    if (/\bertiga\b/.test(normalized)) return "Ertiga";
    if (/\bwagonr\b/.test(normalized)) return "Wagon R";
    if (/\ba(?:\-|\s)?star\b/.test(normalized)) return "A-Star";
    if (/\bs(?:\-|\s)?cross\b/.test(normalized)) return "S-Cross";
    if (/\bbaleno\b/.test(normalized)) return "Baleno";
  }
  return "";
}

function canonicalMake(make) {
  const t = normalizeVehicleText(make);
  if (!t) return "";
  if (/\bmaruti\b|\bsuzuki\b/.test(t)) return "Maruti Suzuki";
  if (/\bmercedes\b|\bbenz\b|\bmerc\b/.test(t)) return "Mercedes Benz";
  if (t === "mg" || /\bmorris garag/.test(t)) return "MG";
  return cleanText(make);
}

function resolveVehicle(overrideVehicle, vehicles) {
  const fallback = {
    brand: canonicalMake(overrideVehicle?.brand),
    model: cleanText(overrideVehicle?.model),
    variant: cleanText(overrideVehicle?.variant),
    fuel: normalizeFuelType(overrideVehicle?.fuel || overrideVehicle?.fuel_type),
  };
  if (!fallback.brand || !fallback.model || !fallback.variant) return fallback;
  const exact = vehicles.find(
    (v) =>
      cleanText(v.brand).toLowerCase() === fallback.brand.toLowerCase() &&
      cleanText(v.model).toLowerCase() === fallback.model.toLowerCase() &&
      cleanText(v.variant).toLowerCase() === fallback.variant.toLowerCase(),
  );
  if (exact) {
    return {
      brand: canonicalMake(exact.brand),
      model: trimVehicleLabel(cleanText(exact.model), cleanText(exact.brand)),
      variant: trimVehicleVariant(cleanText(exact.variant), cleanText(exact.brand), cleanText(exact.model)),
      fuel: normalizeFuelType(exact.fuel || exact.fuel_type),
    };
  }
  return fallback;
}

function normalizeVehicleText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[-_/(),.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlapScore(a, b) {
  const as = new Set(tokenizeVehicleText(normalizeVehicleText(a)));
  const bs = new Set(tokenizeVehicleText(normalizeVehicleText(b)));
  let score = 0;
  for (const t of as) if (bs.has(t)) score += 1;
  return score;
}

function tokenizeVehicleText(value) {
  return normalizeVehicleText(value)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t && (t.length >= 3 || /^\d{2,}$/.test(t)));
}

function tokenSequenceContained(haystackTokens, needleTokens) {
  if (!needleTokens.length) return false;
  const hay = haystackTokens.join(" ");
  const needle = needleTokens.join(" ");
  return hay.includes(needle);
}

function preferredVehicleValue(primary, fallback) {
  const p = cleanText(primary);
  if (p && p.toLowerCase() !== "unknown") return p;
  const f = cleanText(fallback);
  return f && f.toLowerCase() !== "unknown" ? f : "";
}

function trimVehicleLabel(label, make) {
  let value = cleanText(label);
  const makeText = cleanText(make);
  if (makeText) value = value.replace(new RegExp(`^${escapeRegExp(makeText)}\\s+`, "i"), "");
  return value;
}

function trimVehicleVariant(label, make, model) {
  let value = cleanText(label);
  const makeText = cleanText(make);
  const modelText = cleanText(model);
  if (makeText) value = value.replace(new RegExp(`^${escapeRegExp(makeText)}\\s+`, "i"), "");
  if (modelText) value = value.replace(new RegExp(`^${escapeRegExp(modelText)}\\s+`, "i"), "");
  return value;
}

function inferStatus(currentStage, approvalStatus, isFinanced) {
  if (currentStage === "payout") return "In Progress";
  if (currentStage === "delivery" && isFinanced === "No") return "In Progress";
  if (approvalStatus === "Disbursed") return "Disbursed";
  return "In Progress";
}

function inferIdentityProofType(cpv) {
  if (cleanText(cpv.AADHAAR_NUMBER)) return "AADHAAR";
  if (cleanText(cpv.PASSPORT_NUMBER)) return "PASSPORT";
  if (cleanText(cpv.DRIVING_LICENSE)) return "DRIVING_LICENSE";
  return undefined;
}

function inferAccountType(bank) {
  if (cleanText(bank.CA_ACCOUNT_NO)) return "Current";
  if (cleanText(bank.SB_ACCOUNT_NO)) return "Savings";
  return undefined;
}

function inferCompanyType(cpv, customerName) {
  const name = cleanText(customerName).toUpperCase();
  const category = cleanText(cpv.CATEGORY).toUpperCase();
  if (category.includes("PARTNER")) return "Partnership";
  const pan = cleanText(cpv.PAN_NUMBER).toUpperCase();
  if (name.includes("PVT LTD") || name.includes("PRIVATE LIMITED")) return "Pvt Ltd";
  if (name.includes("LIMITED") || name.includes(" LTD")) return "Ltd";
  if (name.includes("LLP")) return "Partnership";
  if (name.includes("PARTNERSHIP")) return "Partnership";
  if (name.includes("PROPRIETOR") || name.includes(" PROP")) return "Proprietorship";
  if (pan.length >= 4) {
    const code = pan[3];
    if (code === "C") return "Pvt Ltd";
    if (code === "F") return "Partnership";
    if (code === "P") return "Proprietorship";
    if (code === "T") return "Trust";
  }
  return cleanText(cpv.CATEGORY || cpv.ORGANISATION_TYPE) || undefined;
}

function defaultCompanyDesignation(companyType) {
  const t = cleanText(companyType).toLowerCase();
  if (t.includes("partnership") || t.includes("partner")) return "Partner";
  return "Director";
}

function normalizeBankName(value) {
  const text = cleanText(value);
  const upper = text.toUpperCase();
  if (!text) return undefined;
  if (upper.includes("HDFC")) return "HDFC Bank";
  if (upper.includes("ICICI")) return "ICICI Bank";
  if (upper.includes("AXIS")) return "Axis Bank";
  if (upper === "SBI" || upper.includes("STATE BANK")) return "State Bank of India";
  if (upper.includes("KOTAK")) return "Kotak Mahindra Bank";
  if (upper.includes("FEDERAL")) return "Federal Bank";
  if (upper.includes("PNB") || upper.includes("PUNJAB NATIONAL")) return "Punjab National Bank";
  if (upper.includes("YESBANK") || upper.includes("YES BANK")) return "Yes Bank";
  if (!/\bBANK\b/i.test(text) && /^[A-Z\s.&-]{2,}$/.test(text)) return `${text} Bank`;
  return text;
}

function inferBankNameFromIfsc(value) {
  const ifsc = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return undefined;
  const code = ifsc.slice(0, 4);
  const map = {
    HDFC: "HDFC Bank",
    ICIC: "ICICI Bank",
    SBIN: "State Bank of India",
    UTIB: "Axis Bank",
    KKBK: "Kotak Mahindra Bank",
    FDRL: "Federal Bank",
    PUNB: "Punjab National Bank",
    CNRB: "Canara Bank",
    IDIB: "Indian Bank",
    BARB: "Bank of Baroda",
    BKID: "Bank of India",
    UBIN: "Union Bank of India",
    INDB: "IndusInd Bank",
    YESB: "Yes Bank",
    IDFB: "IDFC First Bank",
    MAHB: "Bank of Maharashtra",
  };
  return map[code];
}

function inferBankNameFromMicr(value) {
  const micr = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 9);
  if (micr.length !== 9) return undefined;
  const bankCode = micr.slice(3, 6);
  const map = {
    "002": "State Bank of India",
    "012": "Bank of Baroda",
    "013": "Bank of India",
    "015": "Canara Bank",
    "019": "Indian Bank",
    "026": "Union Bank of India",
    "176": "Punjab National Bank",
    "211": "Axis Bank",
    "229": "ICICI Bank",
    "237": "IndusInd Bank",
    "240": "HDFC Bank",
    "425": "Federal Bank",
    "485": "Kotak Mahindra Bank",
    "532": "Yes Bank",
    "760": "IDFC First Bank",
  };
  return map[bankCode];
}

function normalizeFuelType(value) {
  const text = cleanText(value);
  const upper = text.toUpperCase();
  if (!text) return undefined;
  if (upper.includes("PETROL")) return "Petrol";
  if (upper.includes("DIESEL") || upper.includes("DSL")) return "Diesel";
  if (upper.includes("CNG")) return "CNG";
  if (upper.includes("HYBRID") || upper.includes("MHEV") || upper.includes("HEV")) return "Hybrid";
  if (upper.includes("ELECTRIC") || upper === "EV") return "Electric";
  return undefined;
}

function normalizeReceivedAs(value) {
  const text = cleanText(value);
  const upper = text.toUpperCase();
  if (!text) return undefined;
  if (upper === "ORIGINAL") return "Original";
  if (upper === "PHOTOCOPY" || upper === "PHOTO COPY" || upper === "PHOTOCOPY.") return "Photocopy";
  return text;
}

function normalizeEmiPlan(value) {
  const text = cleanText(value);
  const upper = text.toUpperCase().replace(/\s+/g, "");
  if (!text) return undefined;
  if (upper === "1+1" || upper === "1PLUS1") return "1+1";
  if (upper === "NORMAL") return "Normal";
  return text;
}

function normalizeBusinessNature(value) {
  const text = cleanText(value);
  if (!text) return undefined;
  return text.split(/[,&/]/).map((part) => cleanText(part)).filter(Boolean);
}

function buildCombinedBusinessNature(cpv) {
  const organisation = normalizeBusinessNature(cpv.ORGANISATION_TYPE || "") || [];
  const industry = normalizeBusinessNature(cpv.INDUSTRY_DETAIL || "") || [];
  return uniq(organisation.concat(industry));
}

function normalizePurpose(value, loanType) {
  const text = cleanText(value);
  if (loanType === "Car Cash-in" || loanType === "Refinance") {
    const map = {
      personal: "Other",
      business: "Business",
      travel: "Travel",
      education: "Education",
      marriage: "Marriage",
      agriculture: "Agriculture",
    };
    return map[text.toLowerCase()] || "Other";
  }
  return text || undefined;
}

function inferVehicleUsage(cpv, rc) {
  const raw = cleanText(
    cpv.USAGE ||
      cpv.VEHICLE_USAGE ||
      rc.USAGE ||
      rc.VEHICLE_USAGE ||
      cpv.PURPOSE_OF_LOAN ||
      rc.PURPOSE_OF_LOAN ||
      cpv.CAR_MODEL ||
      rc.MAKE_MODEL,
  ).toLowerCase();
  if (!raw) return "Private";
  if (/(commercial|taxi|cab|transport|permit|school)/.test(raw)) return "Commercial";
  return "Private";
}

function normalizeOccupationType(value) {
  const text = cleanText(value).toLowerCase().replace(/[_-]+/g, " ");
  if (!text) return undefined;
  if (text.includes("salaried")) return "Salaried";
  if (text.includes("self employed professional")) return "Self Employed Professional";
  if (text.includes("professional")) return "Self Employed Professional";
  if (text.includes("self employed") || text.includes("selfemployed")) return "Self Employed";
  return "Self Employed";
}

function normalizeApplicantType(value, customerName = "", cpv = {}) {
  const text = cleanText(value).toLowerCase();
  const companyType = cleanText(inferCompanyType(cpv, customerName)).toLowerCase();
  if (companyType === "proprietorship") return "Individual";
  return text === "company" ? "Company" : "Individual";
}

function normalizeGender(value) {
  const text = cleanText(value).toLowerCase();
  if (text === "m" || text === "male") return "Male";
  if (text === "f" || text === "female") return "Female";
  return undefined;
}

function normalizeMaritalStatus(value) {
  const text = cleanText(value).toLowerCase();
  if (text === "m" || text === "married") return "Married";
  if (["u", "s", "single", "unmarried"].includes(text)) return "Unmarried";
  return undefined;
}

function normalizeEducation(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return undefined;
  if (text.includes("post")) return "Postgraduate";
  if (text.includes("graduate")) return "Graduate";
  if (text.includes("under")) return "Undergraduate";
  return "Others";
}

function normalizeHouseType(value) {
  const text = cleanText(value).toLowerCase();
  if (text.includes("rent")) return "rented";
  if (text.includes("parent")) return "parental";
  if (text.includes("company")) return "company";
  return "owned";
}

function normalizeHouseTypeLabel(value) {
  const normalized = normalizeHouseType(value);
  if (normalized === "rented") return "Rented";
  if (normalized === "owned") return "Owned";
  if (normalized === "parental") return "Parental";
  if (normalized === "company") return "Company Provided";
  return undefined;
}

function normalizeYesNo(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return undefined;
  if (
    text.includes("same as office") ||
    text.includes("same as gst") ||
    text.includes("same as resi") ||
    text.includes("same as aadhar") ||
    text.includes("same as aadhaar") ||
    text.includes("same as current")
  ) {
    return "Yes";
  }
  if (
    text.includes("different") ||
    text.includes("not same")
  ) {
    return "No";
  }
  if (["y", "yes"].includes(text)) return "Yes";
  if (["n", "no"].includes(text)) return "No";
  return undefined;
}

function selectRows(rows, override) {
  const preferredTemp = stringify(override.preferredTempCustCode || "");
  const preferredCpv = stringify(override.preferredCpvAccountNo || "");
  const filtered = rows.filter((row) => {
    const tempOk = !preferredTemp || stringify(row.TEMP_CUST_CODE) === preferredTemp || stringify(row.CDB_ACCOUNT_NO) === preferredTemp;
    const cpvOk = !preferredCpv || stringify(row.CPV_ACCOUNT_NO) === preferredCpv;
    return tempOk && cpvOk;
  });
  return filtered.length ? filtered : rows;
}

function sortRows(rows, sorters) {
  return [...rows].sort((a, b) => {
    for (const sorter of sorters) {
      const av = sorter(a);
      const bv = sorter(b);
      if (av === bv) continue;
      return bv - av;
    }
    return 0;
  });
}

function exactScore(values, preferred) {
  const valSet = values.map(stringify);
  const prefSet = preferred.map(stringify).filter(Boolean);
  return prefSet.some((p) => valSet.includes(p)) ? 1 : 0;
}

function toIsoOrNull(value) {
  if (!value) return undefined;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function toDateOnly(value) {
  if (!value) return undefined;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function normalizeTime(value) {
  const text = cleanText(value);
  if (!text) return DEFAULT_TIME;

  const normalized = text.replace(/\./g, ":").replace(/\s+/g, " ").toUpperCase();
  const ampmMatch = normalized.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2] || 0);
    const ampm = ampmMatch[3];
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const hhmm = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return `${String(Number(hhmm[1])).padStart(2, "0")}:${hhmm[2]}`;
  return DEFAULT_TIME;
}

function parseDate(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function joinText(...parts) {
  return parts.map(cleanText).filter(Boolean).join(" ").trim();
}

function numericOrUndefined(value) {
  const n = toNumber(value);
  return n || n === 0 ? n : undefined;
}

function yearsFromDateString(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) years -= 1;
  return years >= 0 ? years : null;
}

function normalizeResidenceYears(value, dobValue) {
  const text = cleanText(value);
  if (!text) return undefined;
  if (text.toUpperCase() === "BB") {
    const age = yearsFromDateString(dobValue);
    return age !== null ? age : undefined;
  }
  return numericOrUndefined(text);
}

function yearsAgoToSinceYear(value) {
  const n = toNumber(value);
  if (n === undefined) return undefined;
  const rounded = Math.trunc(n);
  if (rounded >= 1900 && rounded <= 2100) return rounded;
  if (rounded < 0) return undefined;
  const currentYear = new Date().getFullYear();
  return currentYear - rounded;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const raw = String(value).replace(/[^0-9.-]/g, "");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function stringify(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function cleanText(value) {
  return stringify(value).replace(/\s+/g, " ").trim();
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function sameAddress(a, b) {
  return cleanText(a).toLowerCase() && cleanText(a).toLowerCase() === cleanText(b).toLowerCase();
}

function addressSimilarityScore(a, b) {
  const norm = (v) =>
    cleanText(v)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const ta = new Set(norm(a).split(" ").filter(Boolean));
  const tb = new Set(norm(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach((t) => {
    if (tb.has(t)) common += 1;
  });
  const denom = Math.max(ta.size, tb.size);
  return denom ? common / denom : 0;
}

function extractPincode(value) {
  const match = String(value || "").match(/\b\d{6}\b/);
  return match ? match[0] : undefined;
}

function extractReferencePincode(value) {
  const text = cleanText(value);
  if (!text) return undefined;

  const sixDigit = text.match(/(\d{6})(?!.*\d)/);
  if (sixDigit) return sixDigit[1];

  const twoDigit = text.match(/(\d{2})(?!.*\d)/);
  if (twoDigit) {
    return `1100${twoDigit[1]}`;
  }

  return undefined;
}

function guessCityFromAddress(value) {
  const text = cleanText(value).toUpperCase();
  if (!text) return undefined;
  const candidates = [
    "NOIDA",
    "GHAZIABAD",
    "DELHI",
    "GREATER NOIDA",
    "GURGAON",
    "FARIDABAD",
    "LUCKNOW",
    "KANPUR",
    "JAIPUR",
    "MUMBAI",
  ];
  const found = candidates.find((city) => text.includes(city));
  return found ? toTitleCase(found) : undefined;
}

function guessCityFromPincode(value) {
  const pin = String(value || "").replace(/\D/g, "").slice(0, 6);
  if (!pin) return undefined;
  if (pin.startsWith("110")) return "Delhi";
  if (pin.startsWith("122")) return "Gurgaon";
  if (pin.startsWith("121")) return "Faridabad";
  if (pin.startsWith("2013")) return "Noida";
  if (pin.startsWith("2010")) return "Ghaziabad";
  return undefined;
}

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`);
  return handleResponse(res);
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function apiPut(endpoint, body) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function handleResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
