import React from "react";

export default function CallScriptPanel({ items }) {
  return (
    <div
      style={{
        marginBottom: 18,
        padding: 16,
        background: "#fffdf2",
        borderRadius: 16,
        border: "1px solid #fde68a",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: "#92400e" }}>Call Script</p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#a16207" }}>
            Ask only what is still missing so the caller can move quickly.
          </p>
        </div>
        {items.length > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#92400e",
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            {items.length} asks pending
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: "#047857",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 12,
            padding: "10px 12px",
            fontWeight: 700,
          }}
        >
          Core call fields are already captured. You can focus on status movement and pricing.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.key}
              style={{
                background: "#fff",
                border: "1px solid #fcd34d",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#92400e",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{item.prompt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
