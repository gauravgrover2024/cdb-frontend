import React from "react";

const getQuestionIconType = (label = "", index = 0) => {
  const text = String(label).toLowerCase();

  if (/automatic|manual|imt|ivt|dct|transmission/.test(text)) return "gear";
  if (/pricelist|price list|price breakup|breakup|on-road|road tax|insurance|fee/.test(text)) {
    return "receipt";
  }
  if (/best value|value|emi|loan|finance|budget|price/.test(text)) return "money";
  if (/compare|comparison|versus|vs/.test(text)) return "compare";
  if (/petrol|diesel|fuel|cng|ev|electric/.test(text)) return "fuel";
  if (/city|highway|road|drive|traffic/.test(text)) return "road";
  if (/seat|seater|family|space/.test(text)) return "people";
  if (/feature|sunroof|safety|variant/.test(text)) return "spark";

  return ["spark", "gear", "money", "road", "compare"][index % 5];
};

export default function AciV2QuestionIcon({ label = "", index = 0 }) {
  const type = getQuestionIconType(label, index);

  return (
    <span className="aci-chat-chip-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        {type === "gear" ? (
          <>
            <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
            <path d="M12 2.8v2.4" />
            <path d="M12 18.8v2.4" />
            <path d="M4.2 6.1l1.7 1.7" />
            <path d="M18.1 16.2l1.7 1.7" />
            <path d="M2.8 12h2.4" />
            <path d="M18.8 12h2.4" />
            <path d="M4.2 17.9l1.7-1.7" />
            <path d="M18.1 7.8l1.7-1.7" />
          </>
        ) : type === "receipt" ? (
          <>
            <path d="M7 3h10v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3Z" />
            <path d="M9 8h6" />
            <path d="M9 12h6" />
            <path d="M9 16h4" />
          </>
        ) : type === "money" ? (
          <>
            <path d="M7 5h10" />
            <path d="M7 9h10" />
            <path d="M9 5c5 0 5 8 0 8H8l7 6" />
          </>
        ) : type === "compare" ? (
          <>
            <path d="M7 5v14" />
            <path d="M17 5v14" />
            <path d="M4 9h6l-3 5-3-5Z" />
            <path d="M14 9h6l-3 5-3-5Z" />
          </>
        ) : type === "fuel" ? (
          <>
            <path d="M6 20V5.8C6 4.8 6.8 4 7.8 4h5.4c1 0 1.8.8 1.8 1.8V20" />
            <path d="M5 20h11" />
            <path d="M8 8h5" />
            <path d="M15 7l3 3v7a1.6 1.6 0 0 0 3.2 0v-4.5L18 9" />
          </>
        ) : type === "road" ? (
          <>
            <path d="M8 21 11 3" />
            <path d="M16 21 13 3" />
            <path d="M12 7v2" />
            <path d="M12 13v2" />
            <path d="M12 19v1" />
          </>
        ) : type === "people" ? (
          <>
            <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
            <path d="M14 17.5a4.5 4.5 0 0 1 6.5 2.5" />
          </>
        ) : (
          <>
            <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
          </>
        )}
      </svg>
    </span>
  );
}
