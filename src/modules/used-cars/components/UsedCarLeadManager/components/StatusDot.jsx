import React from "react";
import { getColMeta } from "../utils/leadUtils";

export default function StatusDot({ status, size = 9 }) {
  const meta = getColMeta(status);
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: meta.color,
        flexShrink: 0,
      }}
    />
  );
}
