import React from "react";
import { getInitials } from "../utils/leadUtils";

export default function AvatarBadge({ name, size = 36 }) {
  const palette = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
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
