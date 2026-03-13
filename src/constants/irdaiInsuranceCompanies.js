// IRDAI general insurer list for motor/general policies
// Source: https://irdai.gov.in/list-of-general-insurers
// Last consolidated: 2026-03-13

const generalInsurerSet = new Set([
  "Acko General Insurance Limited",
  "Agriculture Insurance Company of India Limited",
  "Bajaj General Insurance Limited",
  "Cholamandalam MS General Insurance Company Limited",
  "ECGC Limited",
  "Generali Central Insurance Company Limited",
  "Go Digit General Insurance Limited",
  "HDFC ERGO General Insurance Company Limited",
  "ICICI Lombard General Insurance Company Limited",
  "IFFCO TOKIO General Insurance Company Limited",
  "Zurich Kotak General Insurance Company (India) Limited",
  "Kshema General Insurance Limited",
  "Liberty General Insurance Limited",
  "Magma General Insurance Limited",
  "National Insurance Company Limited",
  "Navi General Insurance Limited",
  "Raheja QBE General Insurance Co. Ltd.",
  "IndusInd General Insurance Company Limited",
  "Royal Sundaram General Insurance Company Limited",
  "SBI General Insurance Company Limited",
  "Shriram General Insurance Company Limited",
  "Tata AIG General Insurance Company Limited",
  "The New India Assurance Company Limited",
  "The Oriental Insurance Company Limited",
  "United India Insurance Company Limited",
  "Universal Sompo General Insurance Company Limited",
  "Zuno General Insurance Ltd.",
]);

export const IRDAI_INSURANCE_COMPANIES = Array.from(generalInsurerSet).sort(
  (a, b) => a.localeCompare(b, "en", { sensitivity: "base" })
);

