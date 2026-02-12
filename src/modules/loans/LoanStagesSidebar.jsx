import React from "react";

const primarySteps = [
  "Lead Details",
  "Vehicle Details",
  "Finance Details",
  "Personal Details",
  "Employment Details",
  "Income Details",
  "Bank Details",
  "Reference Details",
  "KYC Details",
];

const sectionGroups = [
  { id: "pre-file", label: "Pre-File" },
  { id: "loan-approval", label: "Loan Approval" },
  { id: "post-file", label: "Post-File" },
  { id: "vehicle-delivery", label: "Vehicle Delivery" },
];

export default function LoanStagesSidebar({
  currentPrimaryStep = "Lead Details",
  onPrimaryStepChange,
}) {
  return (
    <aside
      style={{
        width: 260,
        borderRight: "1px solid #f3f4f6",
        background: "#f9fafb",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top pill */}
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <button
          type="button"
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            boxShadow: "0 12px 28px rgba(37,99,235,0.25)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span>Customer Profile</span>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: "rgba(15,23,42,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
            }}
          >
            ⌄
          </span>
        </button>
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          Loan workflow stages
        </div>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          overflowY: "auto",
        }}
      >
        {/* Customer Profile steps */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: 8,
          }}
        >
          <div
            style={{
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: "#9ca3af",
            }}
          >
            Customer Profile
          </div>

          <div
            style={{
              marginTop: 4,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {primarySteps.map((label) => {
              const isActive = label === currentPrimaryStep;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    onPrimaryStepChange && onPrimaryStepChange(label)
                  }
                  style={{
                    borderRadius: 999,
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "none",
                    background: isActive
                      ? "rgba(37,99,235,0.06)"
                      : "transparent",
                    cursor: "pointer",
                    fontSize: 12,
                    color: isActive ? "#111827" : "#6b7280",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: isActive ? 9 : 7,
                        height: isActive ? 9 : 7,
                        borderRadius: 999,
                        background: isActive
                          ? "#2563eb"
                          : "rgba(148,163,184,0.6)",
                      }}
                    />
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                    }}
                  >
                    Pending
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Other high-level sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sectionGroups.map((s) => (
            <button
              key={s.id}
              type="button"
              style={{
                borderRadius: 999,
                padding: "7px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                cursor: "pointer",
                fontSize: 12,
                color: "#4b5563",
              }}
            >
              <span>{s.label}</span>
              <span
                style={{
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: "#f3f4f6",
                  fontSize: 10,
                  color: "#6b7280",
                }}
              >
                0
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
