import React from "react";
import { getInitials } from "../utils/leadUtils";

export default function AvatarBadge({ name, size = 36 }) {
  const palette = ["#2563eb", "#7c3aed", "#16a34a", "#d97706", "#dc2626", "#0891b2", "#9333ea"];
  const idx = (name || "?").charCodeAt(0) % palette.length;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: palette[idx],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: size * 0.35,
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {getInitials(name)}
    </div>
  );
}
