import React from "react";

const PaymentGlobalHeader = ({ data = {} }) => {
  const dealerInfo = [
    data?.dealerName,
    data?.dealerContactPerson,
    data?.dealerContactNumber,
    data?.dealerAddress, // ✅ Added back
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
        padding: "20px 0",
        marginBottom: 32,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {/* Title */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#1d1d1f",
            marginBottom: 16,
          }}
        >
          Payment Details
        </div>

        {/* Meta Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          <MetaItem label="Customer" value={data?.customerName} />
          <MetaItem label="DO Reference" value={data?.doRefNo} />
          <MetaItem label="Loan Reference" value={data?.loanRefNo} />
          <MetaItem label="Dealer" value={dealerInfo} multiline />
        </div>
      </div>
    </div>
  );
};

const MetaItem = ({ label, value, multiline }) => (
  <div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: "#86868b",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 15,
        fontWeight: 500,
        color: "#1d1d1f",
        ...(multiline
          ? {
              lineHeight: "1.4",
              wordBreak: "break-word",
            }
          : {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }),
      }}
    >
      {value || "—"}
    </div>
  </div>
);

export default PaymentGlobalHeader;
