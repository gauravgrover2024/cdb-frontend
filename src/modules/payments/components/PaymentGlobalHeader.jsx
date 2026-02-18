import React from "react";
import { Card } from "antd";

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
    <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>
      {value || "—"}
    </div>
  </div>
);

const PaymentGlobalHeader = ({ data = {} }) => {
  const dealerLines = [
    data?.dealerName,
    data?.dealerContactPerson
      ? `${data?.dealerContactPerson}${
          data?.dealerContactNumber ? ` • ${data?.dealerContactNumber}` : ""
        }`
      : data?.dealerContactNumber || "",
    data?.dealerAddress,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#f5f7fa",
        paddingBottom: 12,
        marginBottom: 12,
      }}
    >
      <Card
        style={{
          borderRadius: 14,
          border: "1px solid #f0f0f0",
          background: "#ffffff",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 10 }}>
          Payment Module
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <InfoRow label="Customer Name" value={data?.customerName} />
          <InfoRow label="DO Ref No" value={data?.doRefNo} />
          <InfoRow label="Loan Ref No" value={data?.loanRefNo} />
          <InfoRow label="Dealer" value={dealerLines || "—"} />
        </div>
      </Card>
    </div>
  );
};

export default PaymentGlobalHeader;
