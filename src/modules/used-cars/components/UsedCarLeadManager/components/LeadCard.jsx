import React from "react";
import { ClockCircleOutlined, CalendarOutlined, RightOutlined } from "@ant-design/icons";
import AvatarBadge from "./AvatarBadge";
import { dayjs, fmtInrOrPending } from "../utils/formatters";
import {
  getColMeta,
  isOverdue,
  isDueToday,
  getProcurementScore,
  getScoreTone,
  getNextStatusKey,
  getPrice,
  getMileage,
} from "../utils/leadUtils";

export default function LeadCard({
  record,
  onClick,
  onQuickAdvance,
  isDarkMode = false,
  snap = false,
}) {
  const meta = getColMeta(record.status);
  const overdue = isOverdue(record);
  const dueToday = isDueToday(record);
  const score = record.procurementScore ?? getProcurementScore(record);
  const scoreTone = getScoreTone(score);
  const nextStatus = getNextStatusKey(record.status);
  const canQuickAdvance = Boolean(nextStatus && nextStatus !== "Closed");
  const isClosed = record.status === "Closed";
  const cardBg = isDarkMode ? "#000000" : "#ffffff";
  const softBg = isDarkMode ? "#0a0a0a" : "#f8fafc";
  const borderBase = isDarkMode ? "#1f2937" : "#e8edf3";
  const textStrong = isDarkMode ? "#f8fafc" : "#0f172a";
  const text = isDarkMode ? "#cbd5e1" : "#334155";
  const textMuted = isDarkMode ? "#94a3b8" : "#64748b";
  const shadow = isDarkMode
    ? "0 8px 24px rgba(2,6,23,0.35)"
    : "0 1px 4px rgba(15,23,42,0.06)";
  const hoverShadow = isDarkMode
    ? "0 18px 36px rgba(2,6,23,0.5)"
    : "0 8px 24px rgba(15,23,42,0.12)";

  return (
    <div
      onClick={onClick}
      className={snap ? "lead-snap-in" : ""}
      style={{
        background: cardBg,
        border: "1.5px solid",
        borderColor: overdue ? "#fca5a5" : dueToday ? "#fde68a" : borderBase,
        borderRadius: 16,
        padding: "14px 15px",
        cursor: "pointer",
        transition: "all 0.18s",
        boxShadow: shadow,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = shadow;
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: meta.color,
          borderRadius: "14px 14px 0 0",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 4 }}>
        <AvatarBadge name={record.name} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: textStrong, letterSpacing: "-0.01em" }}>
              {record.name}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: scoreTone.text,
                background: scoreTone.bg,
                border: `1px solid ${scoreTone.border}`,
                borderRadius: 20,
                padding: "1px 7px",
                letterSpacing: "0.04em",
              }}
            >
              {score} • {scoreTone.label}
            </span>
            {!isClosed && overdue && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 20, padding: "1px 7px", letterSpacing: "0.04em" }}>
                OVERDUE
              </span>
            )}
            {!isClosed && dueToday && !overdue && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "#fef3c7", borderRadius: 20, padding: "1px 7px", letterSpacing: "0.04em" }}>
                DUE TODAY
              </span>
            )}
          </div>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: textMuted }}>
            {record.mobile || "Mobile pending"}
            {record.leadDate ? ` • ${record.leadDate}` : ""}
          </p>
        </div>
        {canQuickAdvance && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdvance?.(record);
            }}
            title={`Move to ${nextStatus}`}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `1px solid ${borderBase}`,
              background: isDarkMode ? "#0a0a0a" : "#fff",
              color: meta.color,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: isDarkMode
                ? "0 4px 12px rgba(2,6,23,0.35)"
                : "0 1px 3px rgba(15,23,42,0.06)",
            }}
          >
            <RightOutlined style={{ fontSize: 11 }} />
          </button>
        )}
      </div>

      <div style={{ marginTop: 11, padding: "9px 11px", background: softBg, borderRadius: 10, border: `1px solid ${borderBase}` }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: textStrong }}>
          {[record.make, record.model].filter(Boolean).join(" ") || "Vehicle pending"}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: text, fontWeight: 600 }}>
          {record.variant || "Variant pending"}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: textMuted }}>
          {record.mfgYear ? `${record.mfgYear} • ` : ""}
          {record.fuel || ""}
          {getMileage(record) ? ` • ${Number(getMileage(record)).toLocaleString("en-IN")} km` : ""}
          {record.ownership ? ` • ${record.ownership} owner` : ""}
        </p>
      </div>

      <div style={{ marginTop: 10, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#059669" }}>
            {fmtInrOrPending(getPrice(record))}
          </p>
          {record.source && (
            <p style={{ margin: 0, fontSize: 10, color: textMuted, marginTop: 1 }}>
              {record.source} • {record.assignedTo || "Unassigned"}
            </p>
          )}
        </div>
        {!isClosed ? (
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 10, color: textMuted, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {record.status}
            </p>
          </div>
        ) : null}
      </div>

      {!isClosed && record.nextFollowUp && (
        <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: overdue ? "#dc2626" : "#7c3aed", fontWeight: 600 }}>
          <ClockCircleOutlined style={{ fontSize: 10 }} />
          <span>{dayjs(record.nextFollowUp).fromNow()}</span>
          <span style={{ color: "#cbd5e1", margin: "0 2px" }}>•</span>
          <span style={{ color: "#94a3b8", fontWeight: 500 }}>{dayjs(record.nextFollowUp).format("DD MMM, hh:mm A")}</span>
        </div>
      )}
      {!isClosed && record.inspectionScheduledAt && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#4f46e5", fontWeight: 600 }}>
          <CalendarOutlined style={{ fontSize: 10 }} />
          <span>Inspection {dayjs(record.inspectionScheduledAt).format("DD MMM, hh:mm A")}</span>
        </div>
      )}
      {isClosed && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            fontWeight: 800,
            color: "#be123c",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Lead Closed
        </div>
      )}
    </div>
  );
}
