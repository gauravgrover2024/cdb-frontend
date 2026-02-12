import React from "react";

const ShowroomVehicleDetailsSection = ({ data = {} }) => {
  const onRoadRaw = data?.onRoadVehicleCost ?? 0;
  const totalDiscount = data?.discountExclVehicleValue ?? 0;
  const netOnRoad =
    data?.netOnRoadVehicleCost ??
    Math.max(0, (onRoadRaw || 0) - (totalDiscount || 0));

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        borderRadius: 16,
        padding: 24,
      }}
    >
      {/* Section Label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: "#86868b",
          marginBottom: 16,
        }}
      >
        Vehicle Details
      </div>

      {/* Vehicle Name - Hero */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#1d1d1f",
          marginBottom: 20,
          letterSpacing: "-0.3px",
        }}
      >
        {data?.make} {data?.model}
        {data?.variant && (
          <span style={{ color: "#86868b", fontWeight: 500 }}>
            {" "}
            · {data?.variant}
          </span>
        )}
      </div>

      {/* Pricing Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PriceRow label="On-Road Cost" value={onRoadRaw} subtle />
        <PriceRow
          label="Total Discount"
          value={totalDiscount}
          negative
          subtle
        />

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(0, 0, 0, 0.06)",
            margin: "8px 0",
          }}
        />

        <PriceRow label="Net Payable" value={netOnRoad} emphasized />
      </div>
    </div>
  );
};

const PriceRow = ({ label, value, negative, subtle, emphasized }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <div
      style={{
        fontSize: emphasized ? 15 : 13,
        fontWeight: emphasized ? 600 : 500,
        color: subtle ? "#86868b" : "#1d1d1f",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: emphasized ? 17 : 15,
        fontWeight: emphasized ? 700 : 600,
        color: negative ? "#ff3b30" : emphasized ? "#1d1d1f" : "#424245",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {negative && "−"}₹ {Number(value).toLocaleString("en-IN")}
    </div>
  </div>
);

export default ShowroomVehicleDetailsSection;
