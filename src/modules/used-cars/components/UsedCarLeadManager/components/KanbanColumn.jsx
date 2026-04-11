import React from "react";
import { Button } from "antd";
import LeadCard from "./LeadCard";
import StatusDot from "./StatusDot";
import { fmtInr } from "../utils/formatters";
import { getPrice } from "../utils/leadUtils";

export default function KanbanColumn({
  col,
  leads,
  onCardClick,
  onQuickAdvance,
  dragOver,
  onDragOver,
  onDragLeave,
  onDropLead,
  onDragStartCard,
  onDragEndCard,
  visibleCount,
  onLoadMore,
  isDarkMode = false,
  themeTokens,
  snapActive = false,
  snapLeadId = null,
}) {
  const count = leads.length;
  const total = leads.reduce((sum, row) => sum + getPrice(row), 0);
  const visibleLeads = leads.slice(0, visibleCount);
  const panelBg = isDarkMode ? "#0c1118" : "#ffffff";
  const surfaceBg = isDarkMode ? "#0a0f16" : "transparent";
  const borderBase = themeTokens?.panelBorder || (isDarkMode ? "#1e293b" : "#e2e8f0");
  const textStrong = themeTokens?.textStrong || (isDarkMode ? "#f8fafc" : "#0f172a");
  const textMuted = themeTokens?.textMuted || "#94a3b8";

  return (
    <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "10px 14px", borderRadius: 14, background: isDarkMode ? "rgba(15,23,42,0.68)" : col.bg, border: `1.5px solid ${isDarkMode ? borderBase : col.border}`, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <StatusDot status={col.key} />
            <span style={{ fontWeight: 800, fontSize: 12, color: textStrong, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              {col.label}
            </span>
          </div>
          <span style={{ background: col.color, color: "#fff", fontWeight: 800, fontSize: 11, borderRadius: 20, padding: "1px 8px" }}>
            {count}
          </span>
        </div>
        {total > 0 && <p style={{ margin: "4px 0 0", fontSize: 11, color: textMuted, fontWeight: 600 }}>{fmtInr(total)} total value</p>}
      </div>

      <div
        className={snapActive ? "column-snap-glow" : ""}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          overflowY: "auto",
          flex: 1,
          minHeight: 180,
          borderRadius: 16,
          border: dragOver ? `2px dashed ${col.color}` : `2px dashed ${isDarkMode ? "rgba(51,65,85,0.35)" : "transparent"}`,
          background: dragOver ? (isDarkMode ? "rgba(79,70,229,0.08)" : col.bg) : surfaceBg,
          padding: dragOver ? 8 : "0 0 8px 0",
          transition: "all 0.15s",
        }}
        onDragOver={(e) => onDragOver(e, col.key)}
        onDragLeave={() => onDragLeave(col.key)}
        onDrop={(e) => onDropLead(e, col.key)}
      >
        {leads.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: textMuted, fontSize: 12 }}>No leads</div>
        ) : (
          visibleLeads.map((row) => (
            <div key={row.id} draggable onDragStart={(e) => onDragStartCard(e, row.id)} onDragEnd={onDragEndCard}>
              <LeadCard
                record={row}
                onClick={() => onCardClick(row.id)}
                onQuickAdvance={onQuickAdvance}
                isDarkMode={isDarkMode}
                snap={snapLeadId === row.id}
              />
            </div>
          ))
        )}
        {count > visibleCount && (
          <Button
            size="small"
            onClick={onLoadMore}
            style={{
              borderRadius: 20,
              fontWeight: 700,
              color: col.color,
              borderColor: isDarkMode ? borderBase : col.border,
              background: panelBg,
            }}
          >
            Load more ({count - visibleCount} left)
          </Button>
        )}
      </div>
    </div>
  );
}
