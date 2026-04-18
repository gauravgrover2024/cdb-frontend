/**
 * Centralized configuration for Insurance Steps
 * Contains all step titles, icons, and catalog data
 */

import {
  Car,
  CreditCard,
  FileCheck2,
  FolderOpen,
  History,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";

export const STEP_TITLES = [
  "Step 1: Customer Information",
  "Step 2: Vehicle Details",
  "Step 3: Previous Policy Details",
  "Step 4: Insurance Quotes",
  "Step 5: New Policy Details",
  "Step 6: Documents",
  "Step 7: Payment",
  "Step 8: Payout Details",
];

export const STEP_ICON_MAP = {
  1: User,
  2: Car,
  3: History,
  4: ShieldCheck,
  5: FileCheck2,
  6: FolderOpen,
  7: Wallet,
  8: CreditCard,
};

export const durationOptions = [
  "1yr OD + 1yr TP",
  "1yr OD + 3yr TP",
  "2yr OD + 3yr TP",
  "3yr OD + 3yr TP",
];

export const addOnCatalog = [
  "Zero Depreciation",
  "Consumables",
  "Engine Protection",
  "Roadside Assistance",
  "No Claim Bonus (NCB) Protection",
  "Key Replacement",
  "Tyre Protection",
  "Return to Invoice",
  "Driver Cover",
  "Personal Accident Cover for Passengers",
  "Loss of Personal Belongings",
  "Outstation Emergency Cover",
  "Battery Cover",
];

export const requiredDocumentTags = [
  "RC",
  "Form 29",
  "Form 30 page 1",
  "Form 30 page 2",
  "Pan Number",
  "GST/Adhaar Card",
  "Previous Year Policy",
  "New Year Policy",
];

export const insurerList = [
  "HDFC ERGO General Insurance",
  "ICICI Lombard General Insurance",
  "Bajaj Allianz General Insurance",
  "Tata AIG General Insurance",
  "Reliance General Insurance",
  "SBI General Insurance",
  "New India Assurance",
  "National Insurance",
  "Oriental Insurance",
  "United India Insurance",
  "Kotak General Insurance",
  "Digit Insurance",
  "Acko General Insurance",
  "Chola MS General Insurance",
  "IFFCO Tokio General Insurance",
];

/** Alias used by store and other modules */
export const INSURERS = insurerList;

/** Ant Design / HTML Select-compatible option array */
export const INSURER_OPTIONS = insurerList.map((name) => ({
  label: name,
  value: name,
}));

