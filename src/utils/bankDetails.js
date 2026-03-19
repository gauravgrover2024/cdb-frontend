const MAX_BANK_DETAILS = 3;
const MAX_ADDITIONAL_BANKS = MAX_BANK_DETAILS - 1;

const toCleanString = (value) => String(value || "").trim();

const toIfsc = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export const normalizeBankDetail = (entry = {}) => {
  const ifscCode = toIfsc(entry?.ifscCode || entry?.ifsc);
  const accountSinceYears = toOptionalNumber(entry?.accountSinceYears);
  const openedIn =
    toOptionalNumber(entry?.openedIn) ??
    (Number.isFinite(accountSinceYears)
      ? new Date().getFullYear() - accountSinceYears
      : undefined);

  return {
    bankName: toCleanString(entry?.bankName),
    accountNumber: toCleanString(entry?.accountNumber),
    ifscCode,
    ifsc: ifscCode,
    branch: toCleanString(entry?.branch),
    accountType: toCleanString(entry?.accountType),
    accountSinceYears,
    openedIn,
  };
};

export const hasBankDetail = (entry = {}) =>
  Boolean(
    toCleanString(entry?.bankName) ||
      toCleanString(entry?.accountNumber) ||
      toIfsc(entry?.ifscCode || entry?.ifsc) ||
      toCleanString(entry?.branch) ||
      toCleanString(entry?.accountType),
  );

const toPrimaryBankFromFlatFields = (values = {}) =>
  normalizeBankDetail({
    bankName: values?.bankName,
    accountNumber: values?.accountNumber,
    ifsc: values?.ifsc,
    ifscCode: values?.ifscCode,
    branch: values?.branch,
    accountType: values?.accountType,
    accountSinceYears: values?.accountSinceYears,
    openedIn: values?.openedIn,
  });

export const buildBankDetailsFromFormValues = (values = {}) => {
  const includeAdditionalBanks = values?.hasAdditionalBankDetails !== false;
  const primaryFlat = toPrimaryBankFromFlatFields(values);
  const explicitArray = Array.isArray(values?.bankDetails) ? values.bankDetails : [];
  const explicitAdditional = Array.isArray(values?.additionalBankDetails)
    ? values.additionalBankDetails
    : [];

  const normalizedArray = explicitArray
    .map((entry) => normalizeBankDetail(entry))
    .filter((entry) => hasBankDetail(entry));

  const normalizedAdditional = includeAdditionalBanks
    ? explicitAdditional
        .map((entry) => normalizeBankDetail(entry))
        .filter((entry) => hasBankDetail(entry))
    : [];

  const primary = hasBankDetail(primaryFlat)
    ? primaryFlat
    : normalizedArray[0] || {};

  const additional = includeAdditionalBanks
    ? normalizedAdditional.length > 0
      ? normalizedAdditional
      : normalizedArray.slice(1, MAX_BANK_DETAILS)
    : [];

  return [primary, ...additional]
    .filter((entry) => hasBankDetail(entry))
    .slice(0, MAX_BANK_DETAILS);
};

export const splitBankDetailsForFormValues = (values = {}) => {
  const fromArray = Array.isArray(values?.bankDetails) ? values.bankDetails : [];
  const normalizedFromArray = fromArray
    .map((entry) => normalizeBankDetail(entry))
    .filter((entry) => hasBankDetail(entry));

  const primary = normalizedFromArray[0] || toPrimaryBankFromFlatFields(values);
  const additional = normalizedFromArray
    .slice(1, MAX_BANK_DETAILS)
    .filter((entry) => hasBankDetail(entry));

  return {
    bankName: primary?.bankName || "",
    accountNumber: primary?.accountNumber || "",
    ifsc: primary?.ifsc || primary?.ifscCode || "",
    ifscCode: primary?.ifscCode || primary?.ifsc || "",
    branch: primary?.branch || "",
    accountType: primary?.accountType || "",
    accountSinceYears:
      primary?.accountSinceYears === undefined ? "" : primary?.accountSinceYears,
    openedIn: primary?.openedIn === undefined ? "" : primary?.openedIn,
    hasAdditionalBankDetails:
      additional.length > 0 || Boolean(values?.hasAdditionalBankDetails),
    additionalBankDetails: additional.slice(0, MAX_ADDITIONAL_BANKS),
  };
};

export const enrichPayloadWithBankDetails = (values = {}) => {
  const bankDetails = buildBankDetailsFromFormValues(values);
  const primary = bankDetails[0] || {};

  const payload = {
    ...values,
    bankDetails,
    bankName: primary?.bankName || "",
    accountNumber: primary?.accountNumber || "",
    ifscCode: primary?.ifscCode || primary?.ifsc || "",
    ifsc: primary?.ifsc || primary?.ifscCode || "",
    branch: primary?.branch || "",
    accountType: primary?.accountType || "",
    accountSinceYears: primary?.accountSinceYears,
    openedIn: primary?.openedIn,
  };

  delete payload.additionalBankDetails;
  delete payload.hasAdditionalBankDetails;

  return payload;
};

export { MAX_ADDITIONAL_BANKS, MAX_BANK_DETAILS };
