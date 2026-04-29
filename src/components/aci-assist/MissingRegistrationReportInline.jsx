import React from "react";
import InlineReportRenderer from "./InlineReportRenderer";

export default function MissingRegistrationReportInline({ widget = {}, onAction }) {
  return (
    <InlineReportRenderer
      widget={{
        ...widget,
        title: widget.title || "Missing registration report",
        subtitle: widget.subtitle || "Loans, insurance and other module records without registration numbers",
      }}
      onAction={onAction}
    />
  );
}
