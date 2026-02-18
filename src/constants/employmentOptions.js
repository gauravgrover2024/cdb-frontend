/**
 * Shared options for Constitution / Type and Nature of Business across customer and loan forms.
 * Use with AutoComplete so users can select from list or type a custom value (stored in DB).
 */

/** Build options list including current value if it's custom (not in base list), so it displays when loaded from DB */
export function getOptionsWithCustom(baseOptions, currentValue) {
  const options = baseOptions.map((opt) => ({ value: opt, label: opt }));
  if (currentValue && typeof currentValue === "string" && currentValue.trim() && !baseOptions.includes(currentValue.trim())) {
    options.push({ value: currentValue.trim(), label: currentValue.trim() });
  }
  return options;
}

// Constitution / Type (Company Type)
export const COMPANY_TYPE_OPTIONS = [
  "Pvt Ltd",
  "Public Ltd",
  "Partnership",
  "Proprietorship",
  "LLP",
  "OPC",
  "HUF",
  "Trust",
  "Society",
  "Cooperative",
  "Retailers",
  "PSU",
  "Govt",
  "MNC",
  "Joint Venture",
  "Sole Proprietorship",
  "Foreign Company",
  "Other",
];

// Nature of Business – combined list for all forms
export const BUSINESS_NATURE_OPTIONS = [
  "Automobiles",
  "Agriculture Based",
  "Banking",
  "BPO",
  "Capital Goods",
  "Telecom",
  "IT",
  "ITeS",
  "Retail",
  "Real Estate",
  "Consumer Durables",
  "FMCG",
  "NBFC",
  "Marketing",
  "Advertisement",
  "Pharma",
  "Media",
  "Manufacturer",
  "Agriculturist",
  "Service Provider",
  "Trader",
  "Distributor",
  "Retailer",
  "Comm Agent",
  "Construction",
  "Education",
  "Healthcare",
  "Hospitality",
  "Logistics",
  "Manufacturing",
  "Mining",
  "Oil & Gas",
  "Power",
  "Textiles",
  "Engineering",
  "Consulting",
  "Insurance",
  "Export",
  "Import",
  "E-commerce",
  "Other",
];
