import React from "react";
import RecordsTableInline from "./RecordsTableInline";
import { asArray } from "./utils";

export default function SimilarCarsInline({ widget = {}, onAction }) {
  const records = asArray(widget.cars || widget.records || widget.data?.cars || widget.data?.records);
  const columns = [
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "segment", label: "Segment" },
    { key: "bodyType", label: "Body type" },
    { key: "priceRange", label: "Price range" },
    { key: "fuelOptions", label: "Fuel options" },
    { key: "transmissionOptions", label: "Transmission" },
    { key: "matchingReason", label: "Matching reason" },
  ];
  return (
    <RecordsTableInline
      widget={{ ...widget, title: widget.title || "Similar cars" }}
      records={records}
      columns={columns}
      onAction={onAction}
    />
  );
}
