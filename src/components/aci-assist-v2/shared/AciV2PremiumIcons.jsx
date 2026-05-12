import React from "react";

const baseProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 28 28",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
};

const strokeProps = {
  stroke: "currentColor",
  strokeWidth: 2.15,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function AciBudgetIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M5.5 8.8h13.8a3.2 3.2 0 0 1 3.2 3.2v7.2a3.2 3.2 0 0 1-3.2 3.2H6.2a3.2 3.2 0 0 1-3.2-3.2V9.7a3 3 0 0 1 3-3h12.2" />
      <path {...strokeProps} d="M6.2 6.8 17 3.9a2.1 2.1 0 0 1 2.6 1.5l.4 1.4" />
      <path {...strokeProps} d="M18.6 14.2h3.9v4.5h-3.9a2.25 2.25 0 1 1 0-4.5Z" />
      <path {...strokeProps} d="M18.6 16.45h.1" />
    </svg>
  );
}

export function AciCompareIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M14 4.2v19.6" />
      <path {...strokeProps} d="M7.2 7.4h13.6" />
      <path {...strokeProps} d="M8.1 7.4 4.8 14h6.6L8.1 7.4Z" />
      <path {...strokeProps} d="M4.2 14c.45 2 1.8 3.1 3.9 3.1S11.55 16 12 14" />
      <path {...strokeProps} d="M19.9 7.4 16.6 14h6.6l-3.3-6.6Z" />
      <path {...strokeProps} d="M16 14c.45 2 1.8 3.1 3.9 3.1S23.35 16 23.8 14" />
      <path {...strokeProps} d="M10.2 23.8h7.6" />
    </svg>
  );
}

export function AciPriceIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M4.6 13.1 13.1 4.6h7.3v7.3l-8.5 8.5a3 3 0 0 1-4.2 0l-3.1-3.1a3 3 0 0 1 0-4.2Z" />
      <path {...strokeProps} d="M18.2 8.9h.1" />
      <path {...strokeProps} d="M10.2 11.4h5.2" />
      <path {...strokeProps} d="M10.2 14h4.1" />
      <path {...strokeProps} d="M11.5 11.4c1.5 0 2.2.55 2.2 1.5s-.74 1.55-2.2 1.55" />
    </svg>
  );
}

export function AciFeaturesIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M8 5.8h12.2a2.8 2.8 0 0 1 2.8 2.8v11.2a2.8 2.8 0 0 1-2.8 2.8H7.8A2.8 2.8 0 0 1 5 19.8V8.6a2.8 2.8 0 0 1 2.8-2.8Z" />
      <path {...strokeProps} d="m9 11 1.45 1.45L13.2 9.7" />
      <path {...strokeProps} d="M15.4 11.1h3.9" />
      <path {...strokeProps} d="m9 17 1.45 1.45 2.75-2.75" />
      <path {...strokeProps} d="M15.4 17.1h3.9" />
      <path {...strokeProps} d="M10.2 3.7v3.1" />
      <path {...strokeProps} d="M17.8 3.7v3.1" />
    </svg>
  );
}

export function AciColorsIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M14 4.2c-5.2 0-9.4 3.65-9.4 8.9 0 4.7 3.5 8.7 8.3 8.7h1.3c1.05 0 1.7-.92 1.35-1.9-.28-.78.3-1.6 1.15-1.6h1.3c3 0 5.4-2.55 5.4-5.7 0-4.7-4.2-8.4-9.4-8.4Z" />
      <path {...strokeProps} d="M9.2 12.1h.1" />
      <path {...strokeProps} d="M12.1 8.8h.1" />
      <path {...strokeProps} d="M16 8.8h.1" />
      <path {...strokeProps} d="M18.7 12.1h.1" />
      <path {...strokeProps} d="M12.4 16.5a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 0 0-3.2 0Z" />
    </svg>
  );
}

export function AciEmiIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <rect {...strokeProps} x="6.2" y="4.3" width="15.6" height="19.4" rx="3" />
      <path {...strokeProps} d="M9.8 8.2h8.4v3.7H9.8z" />
      <path {...strokeProps} d="M10 15.4h.1" />
      <path {...strokeProps} d="M14 15.4h.1" />
      <path {...strokeProps} d="M18 15.4h.1" />
      <path {...strokeProps} d="M10 19.2h.1" />
      <path {...strokeProps} d="M14 19.2h.1" />
      <path {...strokeProps} d="M18 19.2h.1" />
    </svg>
  );
}

export function AciRecommendationIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M14 3.9 15.9 10l6.1 1.9-6.1 1.9L14 19.9l-1.9-6.1L6 11.9l6.1-1.9L14 3.9Z" />
      <path {...strokeProps} d="M6.8 18.4 7.6 21l2.6.8-2.6.8-.8 2.6-.8-2.6-2.6-.8 2.6-.8.8-2.6Z" />
      <path {...strokeProps} d="M21.4 3.8 22 5.7l1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z" />
    </svg>
  );
}

export function AciOffersIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M5 12h18v9.2a2.4 2.4 0 0 1-2.4 2.4H7.4A2.4 2.4 0 0 1 5 21.2V12Z" />
      <path {...strokeProps} d="M4.2 8.4h19.6V12H4.2V8.4Z" />
      <path {...strokeProps} d="M14 8.4v15.2" />
      <path {...strokeProps} d="M14 8.4s-1.9-4.1-4.4-3.2C7.4 6 8.8 8.4 11 8.4h3Z" />
      <path {...strokeProps} d="M14 8.4s1.9-4.1 4.4-3.2c2.2.8.8 3.2-1.4 3.2h-3Z" />
    </svg>
  );
}

export function AciServiceIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M18.6 4.8a5.4 5.4 0 0 0-6.8 6.8L5 18.4a2.9 2.9 0 0 0 4.1 4.1l6.8-6.8a5.4 5.4 0 0 0 6.8-6.8l-3.4 3.4-4-4 3.3-3.5Z" />
      <path {...strokeProps} d="M7.1 20.4h.1" />
    </svg>
  );
}

export function AciQuotationIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M8.2 4.5h8l4.6 4.6v13.2a1.9 1.9 0 0 1-1.9 1.9H8.2a1.9 1.9 0 0 1-1.9-1.9V6.4a1.9 1.9 0 0 1 1.9-1.9Z" />
      <path {...strokeProps} d="M16.2 4.7v4.6h4.5" />
      <path {...strokeProps} d="M10 13h7.8" />
      <path {...strokeProps} d="M10 16.7h7.8" />
      <path {...strokeProps} d="M10 20.4h4.9" />
    </svg>
  );
}

export function AciGenericCarIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path {...strokeProps} d="M5.4 15.2 7.3 9.8A3.2 3.2 0 0 1 10.4 7.6h7.2a3.2 3.2 0 0 1 3.1 2.2l1.9 5.4" />
      <path {...strokeProps} d="M4.8 15.2h18.4v5.2a2.2 2.2 0 0 1-2.2 2.2H7a2.2 2.2 0 0 1-2.2-2.2v-5.2Z" />
      <path {...strokeProps} d="M8.3 18.7h.1" />
      <path {...strokeProps} d="M19.6 18.7h.1" />
      <path {...strokeProps} d="M9 13h10" />
    </svg>
  );
}

export const ACI_PREMIUM_ICON_MAP = [
  { keys: ["budget", "find car", "under"], Icon: AciBudgetIcon },
  { keys: ["compare", "comparison"], Icon: AciCompareIcon },
  { keys: ["price", "prices", "pricelist", "ex-showroom", "on-road"], Icon: AciPriceIcon },
  { keys: ["feature", "features", "specification"], Icon: AciFeaturesIcon },
  { keys: ["color", "colors", "colour", "colours"], Icon: AciColorsIcon },
  { keys: ["emi", "loan", "finance"], Icon: AciEmiIcon },
  { keys: ["recommend", "recommendations", "suggest", "best"], Icon: AciRecommendationIcon },
  { keys: ["offer", "offers", "benefit", "discount"], Icon: AciOffersIcon },
  { keys: ["service", "center", "wrench"], Icon: AciServiceIcon },
  { keys: ["quote", "quotation"], Icon: AciQuotationIcon },
];

export function getAciV2PremiumIcon(value = "") {
  const text = String(value || "").toLowerCase();
  const match = ACI_PREMIUM_ICON_MAP.find((entry) =>
    entry.keys.some((key) => text.includes(key)),
  );

  return match?.Icon || AciGenericCarIcon;
}
