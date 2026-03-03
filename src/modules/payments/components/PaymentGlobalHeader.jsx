// src/modules/payments/components/PaymentGlobalHeader.jsx
import React from "react";
import { Card } from "antd";

const InfoRow = ({ label, value }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      fontSize: 12,
    }}
  >
    <div style={{ color: "#6b7280" }}>{label}</div>
    <div
      style={{
        fontWeight: 600,
        color: "#111827",
        maxWidth: 220,
        textAlign: "right",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {value || "—"}
    </div>
  </div>
);

const PaymentGlobalHeader = ({ data = {} }) => {
  const dealerLines = [
    data?.dealerName,
    data?.dealerContactPerson
      ? `${data.dealerContactPerson}${
          data?.dealerContactNumber ? ` • ${data.dealerContactNumber}` : ""
        }`
      : data?.dealerContactNumber || "",
    data?.dealerAddress,
  ]
    .filter(Boolean)
    .join(" | ");

  const titleLine = data?.customerName || "Payment module";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#f3f4f6",
        padding: "10px 0 12px",
        marginBottom: 12,
      }}
    >
      <Card
        style={{
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
        bodyStyle={{ padding: 12 }}
      >
        {/* Top line: label pill + main title */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.14,
                color: "#6b7280",
              }}
            >
              Payments
            </span>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                marginTop: 2,
                color: "#111827",
              }}
            >
              {titleLine}
            </div>
          </div>

          {/* Small pill with loan ref */}
          {data?.loanRefNo && (
            <div
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                color: "#374151",
                whiteSpace: "nowrap",
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "right",
              }}
            >
              {data.loanRefNo}
            </div>
          )}
        </div>

        {/* Two-column info grid like your EMI/spec cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginTop: 4,
          }}
        >
          <InfoRow label="DO Ref no." value={data?.doRefNo} />
          <InfoRow label="Loan type" value={data?.loanType || data?.usage} />
          <InfoRow label="Hypothecation bank" value={data?.hypothecationBank} />
          <InfoRow label="Dealer" value={dealerLines} />
        </div>
      </Card>
    </div>
  );
};

export default PaymentGlobalHeader;
