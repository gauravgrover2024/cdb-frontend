// src/modules/payments/components/showroom/ShowroomVehicleDetailsSection.jsx
import React from "react";
import { Card } from "antd";

const RowItem = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
    <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>
      {value !== undefined && value !== null ? value : "—"}
    </div>
  </div>
);

const ShowroomVehicleDetailsSection = ({ data = {} }) => {
  // show the raw OnRoad value coming from DO showroom account, total discount from DO,
  // and net OnRoad which is the amount after discount (prefer DO net if available)
  const onRoadRaw = data?.onRoadVehicleCost ?? 0;
  const totalDiscount = data?.discountExclVehicleValue ?? 0;
  const netOnRoad =
    data?.netOnRoadVehicleCost ??
    Math.max(0, (onRoadRaw || 0) - (totalDiscount || 0));

  return (
    <Card style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
        SECTION — Vehicle Details (Showroom Account)
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <RowItem label="Make" value={data?.make} />
        <RowItem label="Model" value={data?.model} />
        <RowItem label="Variant" value={data?.variant} />
        <RowItem
          label="OnRoad Vehicle Cost (Raw)"
          value={`₹ ${Number(onRoadRaw).toLocaleString("en-IN")}`}
        />
        <RowItem
          label="Total Discount (Showroom DO)"
          value={`₹ ${Number(totalDiscount).toLocaleString("en-IN")}`}
        />
        <RowItem
          label="Net OnRoad Vehicle Cost (After Discount)"
          value={`₹ ${Number(netOnRoad).toLocaleString("en-IN")}`}
        />
      </div>
    </Card>
  );
};

export default ShowroomVehicleDetailsSection;
