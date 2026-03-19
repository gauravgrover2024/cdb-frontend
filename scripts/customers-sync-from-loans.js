const API_BASE_URL = process.env.API_BASE_URL || "https://cdb-api.vercel.app";
const LOAN_PAGE_SIZE = Number(process.env.LOAN_PAGE_SIZE || 250);
const CUSTOMER_PAGE_SIZE = Number(process.env.CUSTOMER_PAGE_SIZE || 500);
const FETCH_RETRIES = Number(process.env.FETCH_RETRIES || 5);
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 120000);
const DRY_RUN = String(process.env.DRY_RUN || "false").toLowerCase() === "true";

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeIdentityValue = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeName = (value) => normalizeIdentityValue(value).toLowerCase();

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const normalizePan = (value) =>
  String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();

const cleanEmptyValues = (input) => {
  if (Array.isArray(input)) {
    return input
      .map((item) => cleanEmptyValues(item))
      .filter((item) => item !== undefined && item !== null && item !== "");
  }

  if (!input || typeof input !== "object") return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    const cleaned = cleanEmptyValues(value);
    if (cleaned === undefined) continue;

    if (Array.isArray(cleaned) && cleaned.length === 0) continue;
    if (
      cleaned &&
      typeof cleaned === "object" &&
      !Array.isArray(cleaned) &&
      Object.keys(cleaned).length === 0
    ) {
      continue;
    }

    out[key] = cleaned;
  }

  return out;
};

const convertDatesToStringsDeep = (input) => {
  if (input instanceof Date) return input.toISOString();
  if (Array.isArray(input)) return input.map((item) => convertDatesToStringsDeep(item));
  if (!input || typeof input !== "object") return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = convertDatesToStringsDeep(value);
  }
  return out;
};

const pruneUndefined = (input) => {
  if (Array.isArray(input)) return input.map((item) => pruneUndefined(item));
  if (!input || typeof input !== "object") return input;
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, pruneUndefined(value)]),
  );
};

const isMeaningful = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const mergeLatestWins = (base, incoming) => {
  const out = { ...(base || {}) };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (isMeaningful(value)) {
      out[key] = value;
    } else if (!isMeaningful(out[key])) {
      out[key] = value;
    }
  }
  return out;
};

const stringifyId = (value) => (value == null ? "" : String(value).trim());

const getLoanRecencyTs = (loan) =>
  Math.max(Date.parse(loan?.updatedAt || "") || 0, Date.parse(loan?.createdAt || "") || 0);

const normalizeIdentity = ({ name, mobile, panNumber }) => ({
  name: normalizeName(name),
  mobile: normalizePhone(mobile),
  pan: normalizePan(panNumber),
});

const hasAnyIdentityPair = ({ name, mobile, pan }) =>
  Boolean((name && mobile) || (name && pan) || (pan && mobile));

const isIdentityPairMatch = (target, customer) => {
  const customerIdentity = normalizeIdentity({
    name: customer?.customerName,
    mobile: customer?.primaryMobile,
    panNumber: customer?.panNumber,
  });

  const nameMobile = Boolean(
    target.name &&
      customerIdentity.name &&
      target.name === customerIdentity.name &&
      target.mobile &&
      customerIdentity.mobile &&
      target.mobile === customerIdentity.mobile,
  );
  const namePan = Boolean(
    target.name &&
      customerIdentity.name &&
      target.name === customerIdentity.name &&
      target.pan &&
      customerIdentity.pan &&
      target.pan === customerIdentity.pan,
  );
  const panMobile = Boolean(
    target.pan &&
      customerIdentity.pan &&
      target.pan === customerIdentity.pan &&
      target.mobile &&
      customerIdentity.mobile &&
      target.mobile === customerIdentity.mobile,
  );

  return nameMobile || namePan || panMobile;
};

const firstMeaningful = (...values) => values.find((value) => isMeaningful(value));

const getNestedReference = (loan, key) => {
  const row = loan?.[key];
  return row && typeof row === "object" ? row : {};
};

const normalizeIfsc = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);

const normalizeBankEntry = (entry = {}) => {
  const ifscCode = normalizeIfsc(entry?.ifscCode || entry?.ifsc);
  const accountSinceYears = Number(entry?.accountSinceYears);
  const openedIn = Number(entry?.openedIn);
  return {
    bankName: String(entry?.bankName || "").trim(),
    accountNumber: String(entry?.accountNumber || "").trim(),
    ifscCode,
    ifsc: ifscCode,
    branch: String(entry?.branch || "").trim(),
    accountType: String(entry?.accountType || "").trim(),
    accountSinceYears: Number.isFinite(accountSinceYears) ? accountSinceYears : undefined,
    openedIn: Number.isFinite(openedIn) ? openedIn : undefined,
  };
};

const hasBankEntry = (entry = {}) =>
  Boolean(
    String(entry?.bankName || "").trim() ||
      String(entry?.accountNumber || "").trim() ||
      normalizeIfsc(entry?.ifscCode || entry?.ifsc) ||
      String(entry?.branch || "").trim() ||
      String(entry?.accountType || "").trim(),
  );

const buildBankDetailsFromLoan = (loan = {}) => {
  const stored = Array.isArray(loan?.bankDetails) ? loan.bankDetails : [];
  const primary = normalizeBankEntry({
    bankName: loan?.bankName,
    accountNumber: loan?.accountNumber,
    ifscCode: loan?.ifscCode,
    ifsc: loan?.ifsc,
    branch: loan?.branch,
    accountType: loan?.accountType,
    accountSinceYears: loan?.accountSinceYears,
    openedIn: loan?.openedIn,
  });

  const normalizedStored = stored
    .map((entry) => normalizeBankEntry(entry))
    .filter((entry) => hasBankEntry(entry));

  const first = hasBankEntry(primary) ? primary : normalizedStored[0];
  const additional = normalizedStored.slice(first ? 1 : 0);

  return [first, ...additional].filter((entry) => hasBankEntry(entry)).slice(0, 3);
};

const buildPrimaryCustomerPayload = (loan) => {
  const reference1 = getNestedReference(loan, "reference1");
  const reference2 = getNestedReference(loan, "reference2");
  const bankDetails = buildBankDetailsFromLoan(loan);
  const primaryBank = bankDetails[0] || {};

  return pruneUndefined(
    cleanEmptyValues(
      convertDatesToStringsDeep({
        applicantType: loan.applicantType || "Individual",
        customerName: loan.customerName,
        primaryMobile: loan.primaryMobile,
        email: loan.email,
        emailAddress: loan.email,
        whatsappNumber: loan.whatsappNumber,
        sdwOf: loan.sdwOf,
        fatherName: loan.fatherName,
        gender: loan.gender,
        dob: loan.dob,
        motherName: loan.motherName,
        contactPersonName: loan.contactPersonName,
        contactPersonMobile: loan.contactPersonMobile,
        sameAsCurrentAddress: loan.sameAsCurrentAddress,

        residenceAddress: loan.residenceAddress,
        currentAddress: loan.currentAddress,
        pincode: loan.pincode,
        city: loan.city,
        state: loan.state,
        yearsInCurrentHouse: loan.yearsInCurrentHouse,
        yearsInCurrentCity: loan.yearsInCurrentCity,
        houseType: loan.houseType,
        permanentAddress: loan.permanentAddress,
        permanentPincode: loan.permanentPincode,
        permanentCity: loan.permanentCity,

        education: loan.education,
        educationOther: loan.educationOther,
        maritalStatus: loan.maritalStatus,
        dependents: loan.dependents,
        extraMobiles: loan.extraMobiles,

        nomineeName: loan.nomineeName,
        nomineeDob: loan.nomineeDob,
        nomineeRelation: loan.nomineeRelation,

        occupationType: loan.occupationType,
        employmentType: loan.employmentType,
        professionalType: loan.professionalType,
        companyName: loan.companyName,
        designation: loan.designation,
        companyPartners: loan.companyPartners,
        companyType: loan.companyType,
        businessNature: loan.businessNature,
        currentExp: loan.currentExp || loan.experienceCurrent,
        totalExp: loan.totalExp || loan.totalExperience,
        experienceCurrent: loan.experienceCurrent || loan.currentExp,
        totalExperience: loan.totalExperience || loan.totalExp,
        incorporationYear: loan.incorporationYear,
        isMSME: loan.isMSME,

        employmentAddress: loan.employmentAddress,
        employmentPincode: loan.employmentPincode,
        employmentCity: loan.employmentCity,
        employmentPhone: loan.employmentPhone,
        companyAddress: loan.employmentAddress || loan.companyAddress,
        companyPincode: loan.employmentPincode || loan.companyPincode,
        companyCity: loan.employmentCity || loan.companyCity,
        companyPhone: loan.employmentPhone || loan.companyPhone,
        officialEmail: loan.officialEmail,
        officeAddress: loan.officeAddress,

        monthlyIncome: loan.monthlyIncome,
        salaryMonthly: loan.salaryMonthly,
        monthlySalary: loan.monthlySalary,
        annualIncome: loan.annualIncome,
        totalIncomeITR: loan.totalIncomeITR,
        annualTurnover: loan.annualTurnover,
        netProfit: loan.netProfit,
        otherIncome: loan.otherIncome,
        otherIncomeSource: loan.otherIncomeSource,

        typeOfLoan: loan.typeOfLoan,
        financeExpectation: loan.financeExpectation,
        loanTenureMonths: loan.loanTenureMonths,

        aadhaarNumber: loan.aadhaarNumber,
        aadharNumber: loan.aadhaarNumber || loan.aadharNumber,
        panNumber: loan.panNumber,
        passportNumber: loan.passportNumber,
        dlNumber: loan.dlNumber,
        gstNumber: loan.gstNumber,
        voterId: loan.voterId,

        aadhaarCardDocUrl: loan.aadhaarCardDocUrl,
        panCardDocUrl: loan.panCardDocUrl,
        passportDocUrl: loan.passportDocUrl,
        dlDocUrl: loan.dlDocUrl,
        gstDocUrl: loan.gstDocUrl,
        addressProofDocUrl: loan.addressProofDocUrl,

        bankName: primaryBank.bankName || loan.bankName,
        accountNumber: primaryBank.accountNumber || loan.accountNumber,
        ifscCode: primaryBank.ifscCode || loan.ifscCode,
        ifsc: primaryBank.ifsc || primaryBank.ifscCode || loan.ifscCode || loan.ifsc,
        branch: primaryBank.branch || loan.branch,
        accountType: primaryBank.accountType || loan.accountType,
        accountSinceYears:
          primaryBank.accountSinceYears !== undefined
            ? primaryBank.accountSinceYears
            : loan.accountSinceYears,
        openedIn:
          primaryBank.openedIn !== undefined ? primaryBank.openedIn : loan.openedIn,
        bankDetails,

        reference1_name: loan.reference1_name || reference1.name,
        reference1_mobile: loan.reference1_mobile || reference1.mobile,
        reference1_address: loan.reference1_address || reference1.address,
        reference1_pincode: loan.reference1_pincode || reference1.pincode,
        reference1_city: loan.reference1_city || reference1.city,
        reference1_relation: loan.reference1_relation || reference1.relation,
        reference2_name: loan.reference2_name || reference2.name,
        reference2_mobile: loan.reference2_mobile || reference2.mobile,
        reference2_address: loan.reference2_address || reference2.address,
        reference2_pincode: loan.reference2_pincode || reference2.pincode,
        reference2_city: loan.reference2_city || reference2.city,
        reference2_relation: loan.reference2_relation || reference2.relation,

        identityProofType: loan.identityProofType,
        identityProofNumber: loan.identityProofNumber,
        addressProofType: loan.addressProofType,
        addressProofNumber: loan.addressProofNumber,
        identityProofExpiry: loan.identityProofExpiry,
        addressType: loan.addressType,

        customerType: loan.customerType,
        loan_notes: loan.loan_notes,
        kycStatus: loan.kycStatus,
      }),
    ),
  );
};

const buildCoApplicantCustomerPayload = (loan) =>
  pruneUndefined(
    cleanEmptyValues(
      convertDatesToStringsDeep({
        applicantType: "Individual",
        customerName: loan.co_customerName,
        primaryMobile: loan.co_primaryMobile,
        motherName: loan.co_motherName,
        sdwOf: loan.co_fatherName,
        fatherName: loan.co_fatherName,
        gender: loan.co_gender,
        dob: loan.co_dob,
        maritalStatus: loan.co_maritalStatus,
        dependents: loan.co_dependents,
        education: loan.co_education,
        houseType: loan.co_houseType,
        residenceAddress: loan.co_address,
        pincode: loan.co_pincode,
        city: loan.co_city,
        panNumber: loan.co_pan,
        aadhaarNumber: loan.co_aadhaar,
        aadharNumber: loan.co_aadhaar,
        occupationType: loan.co_occupation,
        professionalType: loan.co_professionalType,
        companyType: loan.co_companyType,
        businessNature: loan.co_businessNature,
        designation: loan.co_designation,
        currentExp: loan.co_currentExperience,
        experienceCurrent: loan.co_currentExperience,
        totalExp: loan.co_totalExperience,
        totalExperience: loan.co_totalExperience,
        companyName: loan.co_companyName,
        employmentAddress: loan.co_companyAddress,
        employmentPincode: loan.co_companyPincode,
        employmentCity: loan.co_companyCity,
        employmentPhone: loan.co_companyPhone,
        companyAddress: loan.co_companyAddress || loan.co_address,
        companyPincode: loan.co_companyPincode || loan.co_pincode,
        companyCity: loan.co_companyCity || loan.co_city,
        companyPhone: loan.co_companyPhone,
        isMSME: loan.co_isMSME,
        monthlyIncome: firstMeaningful(loan.co_monthlySalary, loan.co_salaryMonthly),
        salaryMonthly: firstMeaningful(loan.co_salaryMonthly, loan.co_monthlySalary),
        monthlySalary: firstMeaningful(loan.co_monthlySalary, loan.co_salaryMonthly),
        bankName: loan.co_bankName,
        accountNumber: loan.co_accountNumber,
        ifscCode: loan.co_ifscCode || loan.co_ifsc,
        ifsc: loan.co_ifscCode || loan.co_ifsc,
        branch: loan.co_branch,
        accountType: loan.co_accountType,
        bankDetails: hasBankEntry({
          bankName: loan.co_bankName,
          accountNumber: loan.co_accountNumber,
          ifscCode: loan.co_ifscCode || loan.co_ifsc,
          branch: loan.co_branch,
          accountType: loan.co_accountType,
        })
          ? [
              normalizeBankEntry({
                bankName: loan.co_bankName,
                accountNumber: loan.co_accountNumber,
                ifscCode: loan.co_ifscCode || loan.co_ifsc,
                ifsc: loan.co_ifscCode || loan.co_ifsc,
                branch: loan.co_branch,
                accountType: loan.co_accountType,
              }),
            ]
          : [],
        customerType: "Co-Applicant",
        loan_notes: loan.loan_notes,
      }),
    ),
  );

const upsertByIdentity = async ({
  identitySource,
  payload,
  idFieldName,
  existingId,
  customers,
  stagedUpdates,
  stats,
  allowCreate = true,
}) => {
  const target = normalizeIdentity(identitySource);
  if (!hasAnyIdentityPair(target) && !existingId) {
    return null;
  }

  let match = null;
  const forcedId = stringifyId(existingId);

  if (forcedId) {
    match = customers.find((row) => stringifyId(row?._id || row?.id) === forcedId) || null;
  }

  if (!match) {
    const exactMatches = customers.filter((row) => isIdentityPairMatch(target, row));
    if (exactMatches.length) {
      exactMatches.sort((a, b) => {
        const aTs = Math.max(Date.parse(a?.updatedAt || "") || 0, Date.parse(a?.createdAt || "") || 0);
        const bTs = Math.max(Date.parse(b?.updatedAt || "") || 0, Date.parse(b?.createdAt || "") || 0);
        return bTs - aTs;
      });
      match = exactMatches[0];
    }
  }

  if (!match) {
    if (!allowCreate) return forcedId || null;
    if (!target.name || normalizePhone(identitySource?.mobile).length < 10) {
      // Backend create endpoint requires both customer name and primary mobile.
      return forcedId || null;
    }

    const created = DRY_RUN
      ? { data: { ...payload, _id: `dry-${Date.now()}-${Math.random().toString(16).slice(2)}` } }
      : await apiPost("/api/customers", payload);

    const createdId = stringifyId(created?.data?._id || created?.data?.id || created?._id || created?.id);
    if (!createdId) return null;

    const createdDoc = {
      ...(created?.data || payload),
      _id: createdId,
    };
    customers.push(createdDoc);
    stagedUpdates.set(createdId, mergeLatestWins({}, payload));
    stats.created += 1;
    return createdId;
  }

  const matchId = stringifyId(match?._id || match?.id);
  const base = stagedUpdates.get(matchId) || mergeLatestWins({}, match);
  const merged = mergeLatestWins(base, payload);
  stagedUpdates.set(matchId, merged);
  Object.assign(match, merged);
  stats.matched += 1;
  stats.merged += 1;
  return matchId;
};

const fetchAllLoans = async () => {
  const all = [];
  let skip = 0;

  while (true) {
    const response = await apiGet(`/api/loans?limit=${LOAN_PAGE_SIZE}&skip=${skip}`);
    const rows = toArray(response?.data || response?.loans || response?.items);
    if (!rows.length) break;

    all.push(...rows);

    const total = Number(response?.count ?? response?.total ?? response?.pagination?.total);
    const hasMore = Boolean(response?.hasMore ?? response?.pagination?.hasMore);

    skip += rows.length;

    if (!hasMore && (!Number.isFinite(total) || skip >= total) && rows.length < LOAN_PAGE_SIZE) {
      break;
    }
  }

  return all;
};

const fetchAllCustomers = async () => {
  const all = [];
  let skip = 0;

  while (true) {
    const response = await apiGet(`/api/customers?limit=${CUSTOMER_PAGE_SIZE}&skip=${skip}`);
    const rows = toArray(response?.data || response?.customers || response?.items);
    if (!rows.length) break;

    all.push(...rows);

    const total = Number(response?.count ?? response?.total ?? response?.pagination?.total);
    skip += rows.length;

    if (!Number.isFinite(total) || skip >= total || rows.length < CUSTOMER_PAGE_SIZE) {
      break;
    }
  }

  return all;
};

const requestWithRetry = async (endpoint, options = {}) => {
  let lastError = null;

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`timeout ${FETCH_TIMEOUT_MS}ms`)), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        data = { raw: text };
      }

      if (!response.ok) {
        const message = data?.message || data?.error || text || `HTTP ${response.status}`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
      }

      return data;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      if (attempt >= FETCH_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, Math.min(500 * 2 ** (attempt - 1), 8000)));
    }
  }

  throw lastError || new Error("request failed");
};

const apiGet = async (endpoint) => requestWithRetry(endpoint, { method: "GET" });

const apiPost = async (endpoint, body) =>
  requestWithRetry(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const apiPut = async (endpoint, body) =>
  requestWithRetry(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

async function main() {
  console.log(`[customers-sync] API: ${API_BASE_URL}`);
  console.log(`[customers-sync] dry-run: ${DRY_RUN ? "yes" : "no"}`);

  const loans = await fetchAllLoans();
  const customers = await fetchAllCustomers();

  console.log(`[customers-sync] loans loaded: ${loans.length}`);
  console.log(`[customers-sync] customers loaded: ${customers.length}`);

  const sortedLoans = loans.slice().sort((a, b) => getLoanRecencyTs(a) - getLoanRecencyTs(b));

  const stagedCustomerUpdates = new Map();
  const stats = {
    totalLoans: sortedLoans.length,
    loansPatched: 0,
    loansSkipped: 0,
    customerMatched: 0,
    customerMerged: 0,
    customerCreated: 0,
    customerUpdated: 0,
    failures: 0,
  };

  for (let index = 0; index < sortedLoans.length; index += 1) {
    const loan = sortedLoans[index];
    const loanRef = stringifyId(loan?._id || loan?.id || loan?.loanId || loan?.loan_number);

    if (!loanRef) {
      stats.loansSkipped += 1;
      continue;
    }

    try {
      const primaryPayload = buildPrimaryCustomerPayload(loan);
      const primaryId = await upsertByIdentity({
        identitySource: {
          name: loan.customerName,
          mobile: loan.primaryMobile,
          panNumber: loan.panNumber,
        },
        payload: primaryPayload,
        idFieldName: "customerId",
        existingId: loan.customerId,
        customers,
        stagedUpdates: stagedCustomerUpdates,
        stats: {
          get matched() {
            return stats.customerMatched;
          },
          set matched(v) {
            stats.customerMatched = v;
          },
          get merged() {
            return stats.customerMerged;
          },
          set merged(v) {
            stats.customerMerged = v;
          },
          get created() {
            return stats.customerCreated;
          },
          set created(v) {
            stats.customerCreated = v;
          },
        },
        allowCreate: true,
      });

      let coId = null;
      if (loan.hasCoApplicant || loan.co_customerName || loan.co_primaryMobile || loan.co_pan) {
        const coPayload = buildCoApplicantCustomerPayload(loan);
        coId = await upsertByIdentity({
          identitySource: {
            name: loan.co_customerName,
            mobile: loan.co_primaryMobile,
            panNumber: loan.co_pan,
          },
          payload: coPayload,
          idFieldName: "co_id",
          existingId: loan.co_id,
          customers,
          stagedUpdates: stagedCustomerUpdates,
          stats: {
            get matched() {
              return stats.customerMatched;
            },
            set matched(v) {
              stats.customerMatched = v;
            },
            get merged() {
              return stats.customerMerged;
            },
            set merged(v) {
              stats.customerMerged = v;
            },
            get created() {
              return stats.customerCreated;
            },
            set created(v) {
              stats.customerCreated = v;
            },
          },
          allowCreate: true,
        });
      }

      const patch = {};
      if (primaryId && stringifyId(loan.customerId) !== stringifyId(primaryId)) {
        patch.customerId = primaryId;
      }
      if (coId && stringifyId(loan.co_id) !== stringifyId(coId)) {
        patch.co_id = coId;
      }

      if (Object.keys(patch).length > 0) {
        if (!DRY_RUN) {
          await apiPut(`/api/loans/${loanRef}`, patch);
        }
        stats.loansPatched += 1;
      } else {
        stats.loansSkipped += 1;
      }

      if ((index + 1) % 50 === 0 || index === sortedLoans.length - 1) {
        console.log(
          `[customers-sync] processed ${index + 1}/${sortedLoans.length} loans (patched=${stats.loansPatched}, created=${stats.customerCreated})`,
        );
      }
    } catch (error) {
      stats.failures += 1;
      console.error(
        `[customers-sync][error] loan=${loan.loanId || loan._id || "unknown"} message=${String(
          error?.message || error,
        )}`,
      );
    }
  }

  for (const [customerId, payload] of stagedCustomerUpdates.entries()) {
    if (!customerId) continue;
    const cleanPayload = pruneUndefined(cleanEmptyValues(convertDatesToStringsDeep(payload)));
    if (DRY_RUN) {
      stats.customerUpdated += 1;
      continue;
    }
    await apiPut(`/api/customers/${customerId}`, cleanPayload);
    stats.customerUpdated += 1;
  }

  console.log(
    JSON.stringify(
      {
        mode: "customers-sync-from-loans",
        apiBaseUrl: API_BASE_URL,
        dryRun: DRY_RUN,
        scope: "primary + co-applicant only",
        matchingRule: "name+mobile OR name+pan OR pan+mobile",
        ...stats,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
