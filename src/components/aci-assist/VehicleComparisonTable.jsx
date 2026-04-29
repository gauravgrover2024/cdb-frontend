import React from "react";
import RecordsTableInline from "./RecordsTableInline";
import { asArray } from "./utils";

export default function VehicleComparisonTable({ widget = {}, onAction }) {
  const records = asArray(widget.vehicles || widget.records || widget.data?.vehicles || widget.data?.records);
  const columns = [
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "startingPrice", label: "Starting price" },
    { key: "topPrice", label: "Top price" },
    { key: "variantCount", label: "Variants" },
    { key: "fuelOptions", label: "Fuel" },
    { key: "transmissionOptions", label: "Transmission" },
    { key: "engineSummary", label: "Engine/spec" },
    { key: "keyFeatures", label: "Key features" },
    { key: "colors", label: "Colors" },
    { key: "updatedAt", label: "Last updated" },
  ];
  return (
    <RecordsTableInline
      widget={{ ...widget, title: widget.title || "Vehicle comparison" }}
      records={records}
      columns={columns}
      onAction={onAction}
    />
  );
}
