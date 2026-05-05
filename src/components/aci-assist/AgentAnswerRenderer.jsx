import React from "react";
import ChartSummaryInline from "./ChartSummaryInline";
import Customer360Inline from "./Customer360Inline";
import FeatureAvailabilityInline from "./FeatureAvailabilityInline";
import GenericEntityCard from "./GenericEntityCard";
import InlineReportRenderer from "./InlineReportRenderer";
import InsuranceCaseCardInline from "./InsuranceCaseCardInline";
import LoanCaseCardInline from "./LoanCaseCardInline";
import LoanClosureCardInline from "./LoanClosureCardInline";
import MissingRegistrationReportInline from "./MissingRegistrationReportInline";
import ModuleBreakdownCard from "./ModuleBreakdownCard";
import PayoutMissingReportInline from "./PayoutMissingReportInline";
import PriceHistoryReportInline from "./PriceHistoryReportInline";
import RecordsTableInline from "./RecordsTableInline";
import SimilarCarsInline from "./SimilarCarsInline";
import Vehicle360Inline from "./Vehicle360Inline";
import VehicleColorsInline from "./VehicleColorsInline";
import VehicleComparisonTable from "./VehicleComparisonTable";
import VehicleFeaturesInline from "./VehicleFeaturesInline";
import VehiclePriceListInline from "./VehiclePriceListInline";
import VariantSelectorInline from "./VariantSelectorInline";
import WidgetFrame from "./WidgetFrame";
import { asArray } from "./utils";
import GenericInlineAnswerCard from "./GenericInlineAnswerCard";
import {
  resolveInlineRegistryEntry,
  widgetTypeToInlineType,
} from "./canvasRegistry";

const Notice = ({ widget, tone = "slate", onAction }) => {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-50 text-slate-700";
  const message =
    widget.text ||
    widget.message ||
    widget.content ||
    widget.data?.message ||
    widget.data?.reason ||
    widget.summary?.message ||
    asArray(widget.notices)[0] ||
    "No additional detail was returned.";
  return (
    <WidgetFrame title={widget.title || (tone === "amber" ? "Unable to complete" : "Notice")} actions={widget.actions} onAction={onAction} className={toneClass}>
      <p className="text-sm font-semibold leading-relaxed">{message}</p>
    </WidgetFrame>
  );
};

export default function AgentAnswerRenderer({ message, widgets, onAction }) {
  const list = asArray(widgets);
  if (!list.length) return null;

  return (
    <div className="mt-4 space-y-3">
      {list.map((widget, index) => {
        const key = widget.id || `${widget.type || "widget"}-${index}`;
        const explicitInlineType =
          widget.inlineType ||
          message?.inlineType ||
          widgetTypeToInlineType[widget.type];

        if (explicitInlineType) {
          const inlineEntry = resolveInlineRegistryEntry(explicitInlineType);
          const InlineComponent = inlineEntry?.component || GenericInlineAnswerCard;
          return (
            <InlineComponent
              key={key}
              message={message}
              widget={widget}
              onAction={onAction}
            />
          );
        }

        switch (widget.type) {
          case "insurance_case_card":
            return <InsuranceCaseCardInline key={key} widget={widget} onAction={onAction} />;
          case "loan_case_card":
            return <LoanCaseCardInline key={key} widget={widget} onAction={onAction} />;
          case "loan_closure_card":
            return <LoanClosureCardInline key={key} widget={widget} onAction={onAction} />;
          case "vehicle_pricelist":
            return <VehiclePriceListInline key={key} widget={widget} onAction={onAction} />;
          case "vehicle_colors":
            return <VehicleColorsInline key={key} widget={widget} onAction={onAction} />;
          case "vehicle_features":
            return <VehicleFeaturesInline key={key} widget={widget} onAction={onAction} />;
          case "variant_selector":
            return <VariantSelectorInline key={key} widget={widget} onAction={onAction} />;
          case "vehicle_feature_answer":
          case "variant_feature_availability":
            return <FeatureAvailabilityInline key={key} widget={widget} onAction={onAction} />;
          case "vehicle_comparison":
            return <VehicleComparisonTable key={key} widget={widget} onAction={onAction} />;
          case "similar_cars":
            return <SimilarCarsInline key={key} widget={widget} onAction={onAction} />;
          case "customer_360":
            return <Customer360Inline key={key} widget={widget} onAction={onAction} />;
          case "vehicle_360":
            return <Vehicle360Inline key={key} widget={widget} onAction={onAction} />;
          case "count_summary":
          case "chart_summary":
            return <ChartSummaryInline key={key} widget={widget} onAction={onAction} />;
          case "module_breakdown":
            return <ModuleBreakdownCard key={key} widget={widget} onAction={onAction} />;
          case "records_table":
            return <RecordsTableInline key={key} widget={widget} onAction={onAction} />;
          case "missing_registration_report":
            return <MissingRegistrationReportInline key={key} widget={widget} onAction={onAction} />;
          case "payout_missing_report":
            return <PayoutMissingReportInline key={key} widget={widget} onAction={onAction} />;
          case "price_history_report":
            return <PriceHistoryReportInline key={key} widget={widget} onAction={onAction} />;
          case "generic_entity_cards":
            return <GenericEntityCard key={key} widget={widget} onAction={onAction} />;
          case "text_notice":
            return <Notice key={key} widget={widget} onAction={onAction} />;
          case "unavailable_notice":
            return <Notice key={key} widget={widget} tone="amber" onAction={onAction} />;
          default:
            return <InlineReportRenderer key={key} widget={{ ...widget, title: widget.title || "Result" }} onAction={onAction} />;
        }
      })}
    </div>
  );
}
