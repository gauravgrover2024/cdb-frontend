import React from "react";
import RecordsTableInline from "./RecordsTableInline";
import { asArray } from "./utils";

export default function VehiclePriceListInline({ widget = {}, onAction }) {
  const records = asArray(widget.variants || widget.records || widget.data?.variants || widget.data?.records);
  const columns = [
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "variant", label: "Variant" },
    { key: "fuel", label: "Fuel" },
    { key: "transmission", label: "Transmission" },
    { key: "exShowroomPrice", label: "Ex-showroom price" },
    { key: "onRoadPrice", label: "On-road price" },
    { key: "year", label: "Year" },
    { key: "status", label: "Status" },
    { key: "updatedAt", label: "Last updated" },
  ];
  return (
    <RecordsTableInline
      widget={{ ...widget, title: widget.title || "Vehicle pricelist" }}
      records={records}
      columns={columns}
      onAction={onAction}
    />
  );
}
