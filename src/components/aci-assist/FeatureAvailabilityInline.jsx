import React from "react";
import RecordsTableInline from "./RecordsTableInline";

export default function FeatureAvailabilityInline({ widget = {}, onAction }) {
  return (
    <RecordsTableInline
      widget={{ ...widget, title: widget.title || "Feature availability" }}
      records={widget.records || widget.rows}
      columns={
        widget.columns || [
          { key: "make", label: "Make" },
          { key: "model", label: "Model" },
          { key: "variant", label: "Variant" },
          { key: "fuel", label: "Fuel" },
          { key: "transmission", label: "Transmission" },
          { key: "feature", label: "Feature" },
          { key: "value", label: "Value" },
          { key: "exShowroomPrice", label: "Ex-showroom" },
          { key: "onRoadPrice", label: "On-road" },
        ]
      }
      onAction={onAction}
    />
  );
}
