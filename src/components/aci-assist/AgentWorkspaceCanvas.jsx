import React, { useMemo } from "react";
import { AnimatePresence } from "framer-motion";

import { asArray } from "./utils";
import { findWidget, findAnyWidget, widgetMatches } from "./canvas-utils";

import { ModernCanvasFooter } from "./canvases/BaseComponents";
import { AmbiguityCanvas } from "./canvases/AmbiguityCanvas";
import { EmptyWorkspace } from "./canvases/EmptyWorkspace";
import { LoadingWorkspace } from "./canvases/LoadingWorkspace";

import { VehiclePricelistCanvas } from "./canvases/VehiclePricelistCanvas";
import { VehicleColorsCanvas } from "./canvases/VehicleColorsCanvas";
import { VehicleFeatureAnswerCanvas } from "./canvases/VehicleFeatureAnswerCanvas";
import { VehicleFeaturesCanvas } from "./canvases/VehicleFeaturesCanvas";
import { VehicleColorSearchCanvas } from "./canvases/VehicleColorSearchCanvas";

import { PriceBreakupCanvas } from "./canvases/PriceBreakupCanvas";
import { ModelAmbiguityCanvas } from "./canvases/ModelAmbiguityCanvas";
import { VariantAmbiguityCanvas } from "./canvases/VariantAmbiguityCanvas";
import { FeatureDiscoveryCanvas } from "./canvases/FeatureDiscoveryCanvas";
import { SimilarCarsCanvas } from "./canvases/SimilarCarsCanvas";
import { VehicleComparisonCanvas } from "./canvases/VehicleComparisonCanvas";
import { VehicleRecommendationCanvas } from "./canvases/VehicleRecommendationCanvas";
import { VehicleEmiCalculatorCanvas } from "./canvases/VehicleEmiCalculatorCanvas";
import { PriceHistoryCanvas } from "./canvases/PriceHistoryCanvas";
import { VehicleSpecRankingCanvas } from "./canvases/VehicleSpecRankingCanvas";
import { VehicleSafetyCanvas } from "./canvases/VehicleSafetyCanvas";
import { VehicleVariantRecommendationCanvas } from "./canvases/VehicleVariantRecommendationCanvas";
import { VariantDifferenceCanvas } from "./canvases/VariantDifferenceCanvas";

import { LoanDisbursalReportCanvas } from "./canvases/LoanDisbursalReportCanvas";
import { LoanBusinessReportCanvas } from "./canvases/LoanBusinessReportCanvas";
import { LoanClosureCanvas } from "./canvases/LoanClosureCanvas";

// Re-importing base shell for the fallback
import { ModernCanvasShell } from "./canvases/BaseComponents";

export default function AgentWorkspaceCanvas({
  message,
  loading,
  onAsk,
  onAction,
  onFollowUp,
  onAmbiguitySelect,
  showQueryPlan,
}) {
  const footerProps = useMemo(
    () => ({
      message,
      showQueryPlan,
      onFollowUp,
    }),
    [message, showQueryPlan, onFollowUp],
  );

  const widgets = useMemo(() => asArray(message?.widgets), [message?.widgets]);

  if (loading) {
    return <LoadingWorkspace />;
  }

  if (!message) {
    return <EmptyWorkspace onAsk={onAsk} />;
  }

  if (message.ambiguity || findWidget(message, "ambiguity")) {
    return (
      <AmbiguityCanvas
        message={message}
        onAmbiguitySelect={onAmbiguitySelect}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const priceBreakup = findWidget(message, "vehicle_price_breakup");
  if (priceBreakup) {
    return <PriceBreakupCanvas message={message} widget={priceBreakup} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const pricelist = findWidget(message, "vehicle_pricelist");
  if (pricelist) {
    return (
      <VehiclePricelistCanvas
        message={message}
        widget={pricelist}
        onAction={onAction}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const colors = findAnyWidget(message, [
    "vehicle_colors",
    "vehicle_colors_gallery",
  ]);
  if (colors) {
    return (
      <VehicleColorsCanvas
        message={message}
        widget={colors}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const featureAnswer = findAnyWidget(message, [
    "vehicle_feature_answer",
    "feature_answer",
  ]);
  if (featureAnswer) {
    return (
      <VehicleFeatureAnswerCanvas
        message={message}
        widget={featureAnswer}
        onAction={onAction}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const features = findWidget(message, "vehicle_features");
  if (features) {
    return (
      <VehicleFeaturesCanvas
        message={message}
        widget={features}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const discovery = findWidget(message, "vehicle_feature_discovery");
  if (discovery) {
    return <FeatureDiscoveryCanvas message={message} widget={discovery} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const colorSearch = findWidget(message, "vehicle_color_search");
  if (colorSearch) {
    return <VehicleColorSearchCanvas message={message} widget={colorSearch} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const similar = findWidget(message, "similar_cars");
  if (similar) {
    return <SimilarCarsCanvas message={message} widget={similar} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const comparison = findAnyWidget(message, ["vehicle_model_comparison", "vehicle_variant_comparison"]);
  if (comparison) {
    return <VehicleComparisonCanvas message={message} widget={comparison} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const recommendation = findAnyWidget(message, ["vehicle_recommendation_results", "vehicle_emi_recommendations", "vehicle_safety_results"]);
  if (recommendation) {
    if (widgetMatches(recommendation, "vehicle_safety_results")) {
      return <VehicleSafetyCanvas message={message} widget={recommendation} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
    }
    return <VehicleRecommendationCanvas message={message} widget={recommendation} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const emiCalc = findWidget(message, "vehicle_emi_calculator");
  if (emiCalc) {
    return <VehicleEmiCalculatorCanvas message={message} widget={emiCalc} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const priceHistory = findWidget(message, "vehicle_price_history");
  if (priceHistory) {
    return <PriceHistoryCanvas message={message} widget={priceHistory} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const specRanking = findWidget(message, "vehicle_spec_ranking");
  if (specRanking) {
    return <VehicleSpecRankingCanvas message={message} widget={specRanking} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const variantRec = findWidget(message, "vehicle_variant_recommendation");
  if (variantRec) {
    return <VehicleVariantRecommendationCanvas message={message} widget={variantRec} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const variantDiff = findWidget(message, "vehicle_variant_difference");
  if (variantDiff) {
    return <VariantDifferenceCanvas message={message} widget={variantDiff} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const disbursal = findWidget(message, "loan_disbursal_report");
  if (disbursal || message.intent === "loan_disbursal_report") {
    return (
      <LoanDisbursalReportCanvas
        message={message}
        reportWidget={disbursal}
        countWidget={findWidget(message, "count_summary")}
        onAction={onAction}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const business = findWidget(message, "loan_business_report");
  if (business) {
    return (
      <LoanBusinessReportCanvas
        message={message}
        widget={business}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const closure = findWidget(message, "loan_closure_card");
  if (closure) {
    return (
      <LoanClosureCanvas
        widget={closure}
        onAction={onAction}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const modelAmbiguity = findWidget(message, "vehicle_model_ambiguity");
  if (modelAmbiguity) {
    return <ModelAmbiguityCanvas message={message} widget={modelAmbiguity} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  const variantAmbiguity = findWidget(message, "vehicle_variant_ambiguity");
  if (variantAmbiguity) {
    return <VariantAmbiguityCanvas message={message} widget={variantAmbiguity} onAction={onAction} footer={<ModernCanvasFooter {...footerProps} />} />;
  }

  // Fallback
  const rowsFrom = (w = {}) =>
    asArray(
      w.rows || w.records || w.colors || w.evidenceRows || w.data?.rows || w.data?.records || w.data?.variants || w.data?.colors || w.data?.evidenceRows,
    );

  const generic = widgets.find((widget) => rowsFrom(widget).length) ||
    widgets[0] || { type: message.intent, title: message.intent, rows: [] };

  return (
    <AnimatePresence mode="wait">
      <ModernCanvasShell
        key={`${message.id}-${widgets.length}`}
        title={generic.title || "Results"}
        subtitle="Here are your results"
        footer={<ModernCanvasFooter {...footerProps} />}
      >
        <p className="text-slate-600">
          No specific renderer for this widget type.
        </p>
      </ModernCanvasShell>
    </AnimatePresence>
  );
}
