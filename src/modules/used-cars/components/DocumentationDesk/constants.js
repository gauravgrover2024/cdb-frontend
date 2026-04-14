export const DOCUMENTATION_STORAGE_KEY = "acillp_used_car_docs";

export const VEHICLE_CATEGORY_OPTS = ["Private", "Commercial"];
export const OWNERSHIP_TYPE_OPTS = ["Individual", "Company"];
export const INSURANCE_TYPE_OPTS = ["Full Insurance", "Third Party", "Expired", "Zero Depreciation"];
export const RC_TYPE_OPTS = ["Original", "Photocopy"];
export const PROCUREMENT_CATEGORY_OPTS = ["Off-load", "Retail"];

export const ADDITIONAL_SERVICE_OPTS = [
  "Forfeiture letter collection",
  "NOC Collection",
  "Loan amount payment",
  "RC Transfer Assistance",
];

export const HOLDBACK_CONDITION_OPTS = [
  "Document Delivery (Bank NOC/Form 35)",
  "RC Original Delivery",
  "Key/Equipment Delivery",
  "Challan Clearance",
  "Inter-state NOC Cancellation",
];

export const getDefaultDocValues = (selectedLead = {}) => ({
  // 1-3 Personal
  customerName: selectedLead.name || "",
  fathersName: "",
  address: "",
  
  // 4-9 Vehicle Identity
  regNo: selectedLead.regNo || "",
  make: selectedLead.make || "",
  model: selectedLead.model || "",
  engineNo: "",
  chassisNo: "",
  mfgYear: selectedLead.mfgYear || "",
  
  // 10-14 Financials
  vehiclePrice: selectedLead.finalPrice || 0,
  holdbackAmount: 0,
  holdbackCondition: [],
  holdbackDays: 7,
  feesByUser: 0,
  
  // 15-17 Technical
  odometer: "",
  additionalServices: [],
  ownershipSerial: selectedLead.ownership || "1st",
  
  // 18-21 Bank & PII
  accHolderName: selectedLead.name || "",
  accountNo: "",
  bankName: "",
  ifsc: "",
  loanAccountNo: "",
  financerName: "",
  foreclosureAmount: 0,
  foreclosureStatement: [],
  panNo: "",
  aadhaarNo: "",
  
  // 22-25 metadata
  agreementDate: null,
  deliveryTime: null,
  contactNo: selectedLead.mobile || "",
  emailId: "",
  
  // 26-28 Status
  insuranceType: "Full Insurance",
  hypothecation: "No",
  linkedLoan: "No",
  linkedLoanStatus: "Paid",
  isDeathCase: "No",
  procurementCategory: "Retail",
  
  // Challan Summary (usually synced from BGC, but can be manual)
  challanCount: 0,
  challanAmount: 0,
  vahanChallanCount: 0,
  vahanChallanAmount: 0,

  // Payment Breakdown
  tokenAmount: 0,
  balanceStatus: "Pending",
  isVerified: false,
  handoffChecklist: {},
});
