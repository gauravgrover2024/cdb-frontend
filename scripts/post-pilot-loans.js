const fs = require("fs");
const path = require("path");

const API_BASE_URL = "https://cdb-api.vercel.app";
const ROOT = process.cwd();
const EXTRACTED_PATH = path.join(ROOT, "migration_analysis", "case_match_extracted.json");
const VEHICLES_PATH = "/Users/gauravgrover/Documents/cdrive.vehicles.json";
const OUT_DIR = path.join(ROOT, "migration_analysis", "pilot_post_output");

const CASE_IDS = [
  "3000004231",
  "3000004277",
  "3000004033",
  "3000004065",
  "3000004250",
  "3000003718",
  "3000004237",
  "3000003417",
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
  const mode = process.argv.includes("--post") ? "post" : "dry-run";
  const extracted = readJson(EXTRACTED_PATH);
  const vehicles = readJson(VEHICLES_PATH);

  ensureDir(OUT_DIR);

  const payloads = CASE_IDS.map((caseId) => buildPayload(caseId, extracted[caseId], vehicles));

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

    const body = { ...payload };
    delete body.__pilot;
    delete body._id;

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

function buildPayload(caseId, caseData, vehicles) {
  const override = CASE_OVERRIDES[caseId];
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
  const invoiceRow = chooseInvoiceRow(invRows, rcs);
  const rcReceiptRow = chooseRcReceiptRow(invRows, rcs);
  const chosenVehicle = resolveVehicle(override.vehicle, vehicles);
  const applicantType = normalizeApplicantType(cpv.HIRE_TYPE);
  const isCompany = applicantType === "Company";
  const customerName = pickName(caseId, cpvRows, rcRows);
  const primaryMobile = isCompany ? pickOfficePhone(cpv, rc, auth) : pickMobile(cpv, rc, auth);
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
    cleanText(rc.PAYMENT_FAVOURING_AT_DESPATCH) &&
    cleanText(rc.PAYMENT_FAVOURING_AT_DESPATCH).toLowerCase() !== "customer name"
      ? cleanText(rc.PAYMENT_FAVOURING_AT_DESPATCH)
      : "";
  const dealerAddress = "";
  const dealerMobile = "";
  const residenceAddress = isCompany ? joinText(cpv.OFF_ADD1, cpv.OFF_ADD2) : joinText(cpv.RESI_ADD1, cpv.RESI_ADD2);
  const pincode = cleanText(isCompany ? cpv.OFF_PIN : cpv.RESI_PIN);
  const city = cleanText(isCompany ? cpv.OFF_CITY : cpv.RESI_CITY);
  const permanentAddress = parsePermanentAddress(cpv.PERMANENT_ADDRESS);
  const sameAsCurrentAddress = !permanentAddress || sameAddress(permanentAddress, residenceAddress);
  const permanentPincode = sameAsCurrentAddress ? pincode : extractPincode(permanentAddress);
  const permanentCity = sameAsCurrentAddress ? city : guessCityFromAddress(permanentAddress);
  const companyType = inferCompanyType(cpv, customerName);
  const businessNature = buildCombinedBusinessNature(cpv);
  const companyCoApplicant = isCompany ? buildCompanyCoApplicant({ cpv, auth, customerName, city, pincode, residenceAddress, companyType, businessNature }) : null;
  const contactPersonName = isCompany ? companyCoApplicant?.customerName || cleanText(auth.NAME) || customerName : undefined;
  const contactPersonMobile = isCompany ? companyCoApplicant?.primaryMobile || cleanText(auth.PHONE || auth.MOBILE) || primaryMobile : undefined;
  const companyPartners = isCompany ? authRows.map(mapPartnerRow).filter(hasPartnerContent) : undefined;
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
  const sourceName = cleanText(
    sourceRefRows[0]?.SOURCE_NAME ||
    sourceRefRows[0]?.REFERENCE_BY ||
    cpv.SOURCE_BY ||
    rc.CASE_ORIGIN ||
    "Legacy Import"
  );
  const docsPreparedBy = cleanText(dispatch.DOCS_PREPARED_BY || rc.PRE_DOCS_PREPARED_BY || rc.POST_DOCS_PREPARED_BY || rc.CLOSED_BY || rc.DEALT_BY);
  const financeExpectation = override.isFinanced === "Yes" ? loanAmount : undefined;
  const exShowroomPrice = toNumber(rc.EX_SHOWROOM_OR_VALUATION);
  const invoiceReceivedAs = normalizeReceivedAs(invoiceRow.INV_RECEIVED_ON_DATE_2 || invoiceRow.INV_RECEIVED_ON_DATE_1 || invoiceRow.INV_RECEIVED_AS);
  const invoiceReceivedFrom = cleanText(invoiceRow.INV_RECEIVED_FROM);
  const invoiceReceivedDate = toDateOnly(invoiceRow.INV_RECEIVED_ON_DATE || invoiceRow.ON_DATE);
  const invoiceNumber = cleanText(invoiceRow.INVOICE_NUMBER || rcs.INVOICE_NUMBER);
  const invoiceDate = toDateOnly(invoiceRow.INVOICE_DATE || rcs.INVOICE_DATE);
  const rcReceivedAs = cleanText(rcReceiptRow.RC_RECEIVED_AS);
  const rcReceivedFrom = cleanText(rcReceiptRow.RC_RECEIVED_FROM);
  const rcReceivedDate = toDateOnly(rcReceiptRow.RC_RECEIVED_ON_DATE || rcReceiptRow.ON_DATE);
  const rcRegistrationDate = toDateOnly(invoiceRow.DATE_OF_REGISTRATION || rcReceiptRow.DATE_OF_REGISTRATION || rcs.DATE_OF_REGISTRATION);
  const purposeOfLoan = normalizePurpose(cpv.PURPOSE_OF_LOAN, override.typeOfLoan);
  const payoutPercentage = toNumber(rc.PAYOUT_RATE);
  const conflictFlags = detectConflicts(caseData, cpvRows, rcRows);
  const caseIdAliases = uniq([caseId, cpv.CPV_ACCOUNT_NO, cpv.CDB_ACCOUNT_NO, rc.TEMP_CUST_CODE, rcs.TEMP_CUST_CODE].map(stringify));

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
    primaryMobileAlt: cleanText(cpv.RESI_PHONE2),
    hasCoApplicant: isCompany ? true : false,
    hasGuarantor: normalizeYesNo(cpv.GURANTOR_AVAILABLE) === "Yes",
    isFinanced: override.isFinanced,
    typeOfLoan: override.typeOfLoan,
    financeExpectation,
    loanTenureMonths: tenure || undefined,
    vehicleMake: chosenVehicle.brand,
    vehicleModel: chosenVehicle.model,
    vehicleVariant: chosenVehicle.variant,
    exShowroomPrice,
    loan_number: loanNumber,

    dob: isCompany ? undefined : toIsoOrNull(cpv.DATE_OF_BIRTH),
    gender: isCompany ? undefined : normalizeGender(cpv.SEX),
    motherName: isCompany ? undefined : cleanText(cpv.MOTHERS_MAIDEN_NAME),
    sdwOf: isCompany ? undefined : joinText(cpv.FATHERS_NAME_FIRST, cpv.FATHERS_NAME_MIDDLE, cpv.FATHERS_NAME_LAST),
    maritalStatus: isCompany ? undefined : normalizeMaritalStatus(cpv.MARITAL_STATUS),
    dependents: isCompany ? undefined : numericOrUndefined(cpv.NO_OF_DEPENDANTS),
    education: isCompany ? undefined : normalizeEducation(cpv.EDUCATION),
    houseType: isCompany ? undefined : normalizeHouseType(cpv.RESIDENCE_TYPE),
    yearsInCurrentCity: isCompany ? undefined : numericOrUndefined(cpv.YEARS_AT_RESIDENCE),
    yearsInCurrentHouse: isCompany ? undefined : numericOrUndefined(cpv.YEARS_AT_RESIDENCE),
    identityProofType: isCompany ? undefined : inferIdentityProofType(cpv),
    identityProofNumber: isCompany ? undefined : cleanText(cpv.AADHAAR_NUMBER || cpv.DRIVING_LICENSE || cpv.PASSPORT_NUMBER),
    addressProofType: isCompany ? undefined : "AADHAAR",
    addressProofNumber: isCompany ? undefined : cleanText(cpv.AADHAAR_NUMBER),

    isMSME: isCompany ? "No" : undefined,
    occupationType: isCompany ? "Self Employed" : normalizeOccupationType(cpv.PROFESSION_TYPE),
    professionalType: undefined,
    companyType: isCompany ? companyType : cleanText(cpv.CATEGORY || cpv.ORGANISATION_TYPE),
    businessNature,
    designation: isCompany ? cleanText(auth.DESIGNATION_1 || auth.DESIGNATION) : cleanText(cpv.INDUSTRY_DETAIL),
    experienceCurrent: numericOrUndefined(cpv.YEAR_AT_PROFESSION),
    totalExperience: numericOrUndefined(cpv.YEAR_AT_PROFESSION),
    companyName: isCompany ? undefined : cleanText(cpv.OFF_NAME),
    employmentAddress: joinText(cpv.OFF_ADD1, cpv.OFF_ADD2),
    employmentPincode: cleanText(cpv.OFF_PIN),
    employmentCity: cleanText(cpv.OFF_CITY),
    employmentPhone: pickOfficePhone(cpv, rc, auth),
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

    usage: "Private",
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
    postfile_emiPlan: override.isFinanced === "Yes" ? cleanText(rc.EMI_PLAN).trim() || "Normal" : undefined,
    postfile_tenureMonths: override.isFinanced === "Yes" ? tenure : undefined,
    postfile_firstEmiDate: override.isFinanced === "Yes" ? dueDate : undefined,
    postfile_emiAmount: override.isFinanced === "Yes" ? toNumber(rc.EMI || rc.APPLIED_EMI) : undefined,
    postfile_disbursedLoan: override.isFinanced === "Yes" ? loanAmount : undefined,
    postfile_disbursedCreditAssured: toNumber(rc.ICICI_CREDIT_ASSURED) || 0,
    postfile_disbursedInsurance: toNumber(rc.INSURANCE_FINANCED) || 0,
    postfile_disbursedEw: 0,
    postfile_disbursedLoanTotal: override.isFinanced === "Yes" ? loanAmount : undefined,
    postfile_regd_city: registrationCity,
    dispatch_date: toDateOnly(dispatch.DATE_OF_DESP || rc.DATE_OF_FILE_DESPATCH),
    dispatch_time: normalizeTime(dispatch.TIME_OF_DESP || rc.TIME_OF_FILE_DESPATCH),
    dispatch_through: cleanText(dispatch.DESP_THROUGH || rc.DESPATCH_FOR_APPROVAL_THROUGH || rc.FILE_DESPATCH_BY),
    disbursement_date: disbursedDate,
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

    co_customerName: companyCoApplicant?.customerName,
    co_name: companyCoApplicant?.customerName,
    coApplicant_name: companyCoApplicant?.customerName,
    co_primaryMobile: companyCoApplicant?.primaryMobile,
    co_mobile: companyCoApplicant?.primaryMobile,
    coApplicant_mobile: companyCoApplicant?.primaryMobile,
    co_address: companyCoApplicant?.address,
    co_pincode: companyCoApplicant?.pincode,
    co_city: companyCoApplicant?.city,
    co_dob: companyCoApplicant?.dob,
    co_gender: companyCoApplicant?.gender,
    co_pan: companyCoApplicant?.pan,
    co_aadhaar: companyCoApplicant?.aadhaar,
    co_motherName: companyCoApplicant?.motherName,
    co_fatherName: companyCoApplicant?.fatherName,
    co_maritalStatus: companyCoApplicant?.maritalStatus,
    co_dependents: companyCoApplicant?.dependents,
    co_education: companyCoApplicant?.education,
    co_houseType: companyCoApplicant?.houseType,
    co_occupation: companyCoApplicant?.occupation,
    co_professionalType: companyCoApplicant?.professionalType,
    co_companyType: companyCoApplicant?.companyType,
    co_businessNature: companyCoApplicant?.businessNature,
    co_designation: companyCoApplicant?.designation,
    co_currentExperience: companyCoApplicant?.currentExperience,
    co_totalExperience: companyCoApplicant?.totalExperience,
    co_companyName: companyCoApplicant?.companyName,
    co_companyAddress: companyCoApplicant?.companyAddress,
    co_companyPincode: companyCoApplicant?.companyPincode,
    co_companyCity: companyCoApplicant?.companyCity,
    co_companyPhone: companyCoApplicant?.companyPhone,

    signatorySameAsCoApplicant: isCompany ? true : undefined,
    signatory_customerName: isCompany ? cleanText(auth.NAME_1 || auth.NAME) || companyCoApplicant?.customerName : undefined,
    signatory_primaryMobile: isCompany ? cleanText(auth.PHONE_1 || auth.PHONE || auth.MOBILE) || companyCoApplicant?.primaryMobile || primaryMobile : undefined,
    signatory_address: isCompany ? joinText(auth.ADD1_1 || auth.ADD1, auth.ADD2_1 || auth.ADD2) || companyCoApplicant?.address || residenceAddress : undefined,
    signatory_pincode: isCompany ? cleanText(auth.PIN_1 || auth.PIN) || companyCoApplicant?.pincode || pincode : undefined,
    signatory_city: isCompany ? cleanText(auth.CITY_1 || auth.CITY) || companyCoApplicant?.city || city : undefined,
    signatory_dob: isCompany ? toIsoOrNull(auth.DATE_OF_BIRTH_1 || auth.DATE_OF_BIRTH) || companyCoApplicant?.dob : undefined,
    signatory_designation: isCompany ? cleanText(auth.DESIGNATION_1 || auth.DESIGNATION) || companyCoApplicant?.designation : undefined,
    signatory_pan: undefined,
    signatory_aadhaar: isCompany ? cleanText(auth.AADHAAR_NUMBER_1 || auth.AUTH_AADHAAR_NUMBER) || companyCoApplicant?.aadhaar : undefined,

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

  return pruneUndefined(payload);
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
  return {
    applicantType: body.applicantType || 'Individual',
    customerName: body.customerName,
    primaryMobile: body.primaryMobile,
    email: body.email,
    emailAddress: body.email,
    panNumber: body.panNumber,
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
    bankName: body.bankName,
    accountNumber: body.accountNumber,
    branch: body.branch,
    accountType: body.accountType,
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
    employmentAddress: body.co_companyAddress,
    employmentPincode: body.co_companyPincode,
    employmentCity: body.co_companyCity,
    employmentPhone: body.co_companyPhone,
  };
}

function buildGuarantorCustomerPayload(body) {
  return {
    applicantType: 'Individual',
    customerName: body.gu_customerName,
    primaryMobile: body.gu_primaryMobile,
    motherName: body.gu_motherName,
    sdwOf: body.gu_fatherName,
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
    employmentAddress: body.gu_companyAddress,
    employmentPincode: body.gu_companyPincode,
    employmentCity: body.gu_companyCity,
    employmentPhone: body.gu_companyPhone,
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
    { status: "Approved", date: approvalIso },
    { status: "Disbursed", date: disbursedIso },
  ].filter((entry) => entry.date);
}

function buildInstrumentPayload(rows, approvalBank) {
  if (!rows.length) return {};

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
    return {
      instrumentType: "ECS",
      ecs_micrCode: cleanText(ecs.MICR_CODE),
      ecs_bankName: normalizeBankName(ecs.DRAWN_ON),
      ecs_accountNumber: cleanText(ecs.ACCOUNT_NUMBER),
      ecs_date: toDateOnly(ecs.INSTRMNT_DATE),
      ecs_amount: toNumber(ecs.INSTRMNT_AMOUNT),
      ecs_tag: cleanText(ecs.INSTRMNT_FAVOURING),
      ecs_favouring: normalizeBankName(approvalBank),
      ecs_signedBy: normalizeInstrumentParty(ecs.INSTRMNT_BY_BORWR_GRNTR),
    };
  }

  const cheques = rows.filter((row) => cleanText(row.INSTRMNT_TYPE).toUpperCase() === "CHEQUE");
  if (!cheques.length) return {};

  const payload = { instrumentType: "Cheque" };
  cheques.forEach((row, index) => {
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
}

function normalizeInstrumentParty(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return undefined;
  if (text.includes("grntr") || text.includes("guarantor")) return "Guarantor";
  if (text.includes("co")) return "Co-applicant";
  return "Applicant";
}

function buildCompanyCoApplicant({ cpv, auth, customerName, city, pincode, residenceAddress, companyType, businessNature }) {
  const occupation = normalizeOccupationType(cpv.PROFESSION_TYPE) || "Self Employed";
  const authAddress = joinText(auth.ADD1, auth.ADD2);
  const personAddress = authAddress || joinText(cpv.RESI_ADD1, cpv.RESI_ADD2) || residenceAddress;
  return pruneUndefined({
    customerName: cleanText(auth.NAME || auth.NAME_1) || undefined,
    primaryMobile: cleanText(auth.PHONE || auth.PHONE_1 || auth.MOBILE || cpv.RESI_PHONE1 || cpv.MOBILE) || undefined,
    address: personAddress || undefined,
    pincode: cleanText(auth.PIN || auth.PIN_1 || cpv.RESI_PIN) || pincode || undefined,
    city: cleanText(auth.CITY || auth.CITY_1 || cpv.RESI_CITY) || city || undefined,
    dob: toIsoOrNull(auth.DATE_OF_BIRTH || auth.DATE_OF_BIRTH_1 || cpv.DATE_OF_BIRTH),
    gender: normalizeGender(cpv.SEX),
    pan: cleanText(auth.PAN_NUMBER || cpv.PAN_NUMBER) || undefined,
    aadhaar: cleanText(auth.AUTH_AADHAAR_NUMBER || cpv.AADHAAR_NUMBER) || undefined,
    motherName: cleanText(cpv.MOTHERS_MAIDEN_NAME) || undefined,
    fatherName: joinText(cpv.FATHERS_NAME_FIRST, cpv.FATHERS_NAME_MIDDLE, cpv.FATHERS_NAME_LAST) || cleanText(cpv.HUSBAND_NAME) || undefined,
    maritalStatus: normalizeMaritalStatus(cpv.MARITAL_STATUS),
    dependents: numericOrUndefined(cpv.NO_OF_DEPENDANTS),
    education: normalizeEducation(cpv.EDUCATION),
    houseType: normalizeHouseTypeLabel(cpv.RESIDENCE_TYPE),
    occupation,
    professionalType: occupation === "Self Employed Professional" ? "Other" : undefined,
    companyType,
    businessNature,
    designation: cleanText(auth.DESIGNATION || auth.DESIGNATION_1) || undefined,
    currentExperience: numericOrUndefined(cpv.YEAR_AT_PROFESSION),
    totalExperience: numericOrUndefined(cpv.YEAR_AT_PROFESSION),
    companyName: customerName || undefined,
    companyAddress: joinText(cpv.OFF_ADD1, cpv.OFF_ADD2) || undefined,
    companyPincode: cleanText(cpv.OFF_PIN) || undefined,
    companyCity: cleanText(cpv.OFF_CITY) || undefined,
    companyPhone: cleanText(cpv.OFF_PHONE1 || cpv.RESI_PHONE1) || undefined,
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
    city: pincode ? undefined : guessCityFromAddress(address),
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
  return joinText(rc.LOAN_NUMBER_PREFIX, rc.LOAN_NUMBER_MIDDLE, rc.LOAN_NUMBER_SUFFIX) || undefined;
}

function chooseInvoiceRow(rows, rcs) {
  return rows.find((row) => row.INVOICE_NUMBER || row.INV_RECEIVED_AS) || rcs || rows[0] || {};
}

function chooseRcReceiptRow(rows, rcs) {
  return rows.find((row) => row.REGD_NUMBER || row.RC_RECEIVED_AS || row.RC_RECEIVED_FROM) || rcs || rows[0] || {};
}

function invoicePriority(row) {
  let score = 0;
  if (row.INVOICE_NUMBER) score += 3;
  if (row.REGD_NUMBER) score += 2;
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
  const preferred = CASE_OVERRIDES[caseId];
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

function pickOfficePhone(cpv, rc, auth) {
  return cleanText(cpv.OFF_PHONE1 || rc.PHONE_NUMBERS_OFFICE || auth.PHONE || auth.MOBILE || cpv.RESI_PHONE1);
}

function resolveVehicle(overrideVehicle, vehicles) {
  const exact = vehicles.find(
    (v) =>
      cleanText(v.brand).toLowerCase() === overrideVehicle.brand.toLowerCase() &&
      cleanText(v.model).toLowerCase() === overrideVehicle.model.toLowerCase() &&
      cleanText(v.variant).toLowerCase() === overrideVehicle.variant.toLowerCase(),
  );
  if (exact) {
    return {
      brand: cleanText(exact.brand),
      model: trimVehicleLabel(cleanText(exact.model), cleanText(exact.brand)),
      variant: trimVehicleVariant(cleanText(exact.variant), cleanText(exact.brand), cleanText(exact.model)),
    };
  }
  return {
    brand: overrideVehicle.brand,
    model: overrideVehicle.model,
    variant: overrideVehicle.variant,
  };
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
  if (cleanText(bank.SB_ACCOUNT_NO)) return "Savings";
  if (cleanText(bank.CA_ACCOUNT_NO)) return "Current";
  return undefined;
}

function inferCompanyType(cpv, customerName) {
  const name = cleanText(customerName).toUpperCase();
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

function normalizeBankName(value) {
  const text = cleanText(value);
  const upper = text.toUpperCase();
  if (!text) return undefined;
  if (upper.includes("HDFC")) return "HDFC Bank";
  if (upper.includes("ICICI")) return "ICICI Bank";
  if (upper.includes("AXIS")) return "Axis Bank";
  if (upper === "SBI" || upper.includes("STATE BANK")) return "State Bank of India";
  if (upper.includes("YESBANK") || upper.includes("YES BANK")) return "Yes Bank";
  return text;
}

function normalizeReceivedAs(value) {
  const text = cleanText(value);
  const upper = text.toUpperCase();
  if (!text) return undefined;
  if (upper === "ORIGINAL") return "Original";
  if (upper === "PHOTOCOPY" || upper === "PHOTO COPY" || upper === "PHOTOCOPY.") return "Photocopy";
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

function normalizeOccupationType(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return undefined;
  if (text.includes("salaried")) return "Salaried";
  if (text.includes("professional")) return "Self Employed Professional";
  return "Self Employed";
}

function normalizeApplicantType(value) {
  return cleanText(value).toLowerCase() === "company" ? "Company" : "Individual";
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
  if (twoDigit && /\bDELHI\b/i.test(text)) {
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
