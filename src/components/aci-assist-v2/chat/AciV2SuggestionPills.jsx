import React from "react";
import { emitAciAction } from "../shared/AciAssistShared";

export default function AciV2SuggestionPills({
  items = [],
  onAction,
  className = "",
}) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return null;

  return (
    <div className={`aci-v2-suggestion-pills ${className}`.trim()}>
      {list.map((item, index) => {
        const label = item.label || item.title || item.query || `Option ${index + 1}`;
        return (
          <button
            type="button"
            key={item.id || `${label}-${index}`}
            className="aci-v2-pill"
            onClick={() => emitAciAction(item, onAction)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
