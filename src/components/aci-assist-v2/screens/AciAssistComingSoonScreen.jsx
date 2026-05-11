import React from "react";
import { emitAciAction } from "../shared/AciAssistShared";

export default function AciAssistComingSoonScreen({
  title = "Canvas",
  description = "This canvas is scaffolded and ready for V2 tool wiring.",
  vehicle = null,
  onAction,
}) {
  return (
    <div className="aci-v2-coming-soon">
      <div className="aci-v2-coming-soon-card">
        <h2>{title}</h2>
        <p>{description}</p>
        <button
          type="button"
          onClick={() =>
            emitAciAction(
              {
                id: "back-to-car",
                type: "back_to_car",
                label: vehicle?.displayName
                  ? `Back to ${vehicle.displayName}`
                  : "Back to car",
                query: "Back to car page",
                vehicle,
              },
              onAction,
            )
          }
        >
          Back to car page
        </button>
      </div>
    </div>
  );
}
