import React from "react";
import { dayjs, fmt } from "../utils/formatters";

const getEmoji = (type) => {
  if (type === "call-log") return "📞";
  if (type === "inspection") return "📅";
  if (type === "lead-closed") return "🔒";
  if (type === "lead-updated") return "✏️";
  return "📋";
};

export default function ActivityTimeline({ activities = [] }) {
  return (
    <div>
      <p
        style={{
          margin: "0 0 12px",
          fontWeight: 700,
          fontSize: 12,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        ⚡ Activity Timeline
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {activities.map((act, idx) => (
          <div key={act.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#f1f5f9",
                  border: "2px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                {getEmoji(act.type)}
              </div>
              {idx < activities.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 16, background: "#e2e8f0", margin: "3px 0" }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: "#1e293b" }}>{act.title}</p>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap", marginLeft: 8 }}>
                  {dayjs(act.at).fromNow()}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{act.detail}</p>
              <p style={{ margin: "1px 0 0", fontSize: 10, color: "#cbd5e1" }}>{fmt(act.at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
