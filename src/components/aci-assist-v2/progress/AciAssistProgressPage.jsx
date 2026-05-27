import React from "react";
import AciAssistProgressTracker from "./AciAssistProgressTracker";

export default function AciAssistProgressPage() {
  return (
    <AciAssistProgressTracker
      apiUrl="/api/aci-assist/progress"
      refreshMs={60000}
    />
  );
}
