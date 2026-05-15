export const DEFAULT_PAYOUT_PERCENTAGE = 10;

/** TATA AIG RSA add-on — excluded from payout base only, not premium. */
export const TATA_AIG_RSA_EXCLUSION = 116;

export const isTataAigInsurer = (company) =>
  String(company || "").toUpperCase().includes("TATA AIG");

export const getPayoutAddOnsTotal = (addOnsTotal, insuranceCompany) =>
  isTataAigInsurer(insuranceCompany)
    ? Math.max(0, Number(addOnsTotal || 0) - TATA_AIG_RSA_EXCLUSION)
    : Number(addOnsTotal || 0);

export const computePayoutBaseAmount = (odAmt, addOnsTotal, insuranceCompany) =>
  Number(odAmt || 0) + getPayoutAddOnsTotal(addOnsTotal, insuranceCompany);
