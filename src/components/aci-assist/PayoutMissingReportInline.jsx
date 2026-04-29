import React from "react";
import InlineReportRenderer from "./InlineReportRenderer";

export default function PayoutMissingReportInline({ widget = {}, onAction }) {
  return (
    <InlineReportRenderer
      widget={{
        ...widget,
        title: widget.title || "Payout missing report",
        subtitle: widget.subtitle || "Cases where payout entry or payout details are missing",
      }}
      onAction={onAction}
    />
  );
}
