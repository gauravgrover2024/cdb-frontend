import React, { useState } from "react";
import { SearchOutlined, CloseCircleOutlined } from "@ant-design/icons";

const STATUS_OPTIONS = [
  { value: "all", label: "All payment status" },
  { value: "progress", label: "In progress" },
  { value: "verify", label: "Needs verification" },
  { value: "acpending", label: "AC pending" },
  { value: "settled", label: "Fully settled" },
  { value: "nofile", label: "No payment file" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "financed", label: "Financed" },
  { value: "cash", label: "Cash" },
];

const PaymentsFilterBar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  totalCount = 0,
  visibleCount = 0,
  dark = false,
}) => {
  const [focused, setFocused] = useState(false);

  const bgElevated = dark ? "#161a22" : "#f8fafc";
  const borderColor = dark ? "#293040" : "#dbe3ef";
  const focusBorder = dark ? "#60a5fa" : "#2563eb";
  const placeholderColor = dark ? "#6b778f" : "#8ea0b9";
  const textColor = dark ? "#e2e8f0" : "#0f172a";
  const shellBg = dark ? "#121a28" : "#f8fbff";

  const hasFilters =
    String(searchQuery || "").trim() ||
    statusFilter !== "all" ||
    typeFilter !== "all";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 14,
        background: shellBg,
        border: `1px solid ${dark ? "#232a3a" : "#dce6f3"}`,
        boxShadow: dark
          ? "0 12px 26px rgba(0,0,0,0.28)"
          : "0 10px 24px rgba(15,23,42,0.08)",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          flex: "1 1 320px",
        }}
      >
        <SearchOutlined
          style={{
            position: "absolute",
            left: 12,
            color: placeholderColor,
            fontSize: 12,
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search customer, loan ID, DO ref, showroom..."
          style={{
            width: "100%",
            padding: "8px 34px 8px 34px",
            borderRadius: 9,
            border: `1.5px solid ${focused ? focusBorder : borderColor}`,
            background: bgElevated,
            color: textColor,
            fontSize: 12,
            fontWeight: 500,
            outline: "none",
            transition: "border-color 200ms, box-shadow 200ms",
            boxShadow: focused ? `0 0 0 3px ${focusBorder}1f` : "none",
          }}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            style={{
              position: "absolute",
              right: 10,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: placeholderColor,
              fontSize: 12,
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <CloseCircleOutlined />
          </button>
        ) : null}
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        style={{
          flex: "1 1 200px",
          height: 34,
          borderRadius: 9,
          border: `1px solid ${borderColor}`,
          background: bgElevated,
          color: textColor,
          padding: "0 10px",
          fontSize: 11.5,
          fontWeight: 600,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
        style={{
          flex: "1 1 170px",
          height: 34,
          borderRadius: 9,
          border: `1px solid ${borderColor}`,
          background: bgElevated,
          color: textColor,
          padding: "0 10px",
          fontSize: 11.5,
          fontWeight: 600,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 10,
          minWidth: 185,
          marginLeft: "auto",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: dark ? "#8ea0b9" : "#64748b",
            whiteSpace: "nowrap",
          }}
        >
          Showing {visibleCount} of {totalCount} cases
        </div>
        <button
          type="button"
          onClick={() => {
            onSearchChange("");
            onStatusFilterChange("all");
            onTypeFilterChange("all");
          }}
          disabled={!hasFilters}
          style={{
            borderRadius: 999,
            border: `1px solid ${borderColor}`,
            background: hasFilters ? (dark ? "#1e293b" : "#ffffff") : "transparent",
            color: hasFilters
              ? dark
                ? "#e2e8f0"
                : "#0f172a"
              : dark
                ? "#475569"
                : "#94a3b8",
            padding: "5px 10px",
            fontSize: 10,
            fontWeight: 700,
            cursor: hasFilters ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default PaymentsFilterBar;
