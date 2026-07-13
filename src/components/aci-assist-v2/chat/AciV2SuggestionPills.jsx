import React, { useEffect, useMemo, useState } from "react";
import { emitAciAction } from "../shared/AciAssistShared";

export default function AciV2SuggestionPills({
  items = [],
  onAction,
  className = "",
}) {
  const list = useMemo(
    () => (Array.isArray(items) ? items.filter(Boolean) : []),
    [items],
  );
  const [expanded, setExpanded] = useState(false);
  const initialCount = 6;
  const visibleItems = expanded ? list : list.slice(0, initialCount);
  const remaining = Math.max(0, list.length - visibleItems.length);

  useEffect(() => {
    setExpanded(false);
  }, [list.length]);

  if (!list.length) return null;

  return (
    <div className={`aci-v2-suggestion-pills ${className}`.trim()}>
      {visibleItems.map((item, index) => {
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
      {remaining > 0 ? (
        <button
          type="button"
          className="aci-v2-pill"
          onClick={() => setExpanded(true)}
        >
          Show {remaining} more
        </button>
      ) : null}
    </div>
  );
}
