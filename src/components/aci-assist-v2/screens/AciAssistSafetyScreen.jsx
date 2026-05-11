import React from "react";
import AciAssistComingSoonScreen from "./AciAssistComingSoonScreen";

export default function AciAssistSafetyScreen(props) {
  return (
    <AciAssistComingSoonScreen
      {...props}
      title="Safety canvas"
      description="Safety scaffold is ready. Next step: wire NCAP and feature-based safety scoring."
    />
  );
}
