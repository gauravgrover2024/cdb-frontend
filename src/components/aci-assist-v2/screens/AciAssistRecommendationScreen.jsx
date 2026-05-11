import React from "react";
import AciAssistComingSoonScreen from "./AciAssistComingSoonScreen";

export default function AciAssistRecommendationScreen(props) {
  return (
    <AciAssistComingSoonScreen
      {...props}
      title="Recommendation canvas"
      description="Recommendation canvas scaffold is ready. Next step: wire ranking buckets and reason codes."
    />
  );
}
