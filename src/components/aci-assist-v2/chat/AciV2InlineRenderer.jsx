import React from "react";
import {
  EmiAnswerCard,
  FeatureAnswerCard,
  ModelAmbiguityCard,
  PriceSummaryCard,
  QuotationLeadCard,
  RecommendationMiniCard,
  TextNoticeCard,
  VariantAmbiguityCard,
} from "../inline/AciV2InlineCards";
import AciV2DiagnosticInlineCard from "../inline/AciV2DiagnosticInlineCard";

const INLINE_RENDERERS = {
  feature_answer_card: FeatureAnswerCard,
  feature_discovery_summary: FeatureAnswerCard,
  feature_explorer_summary: FeatureAnswerCard,
  feature_comparison_summary: FeatureAnswerCard,
  variant_ambiguity_card: VariantAmbiguityCard,
  model_ambiguity_card: ModelAmbiguityCard,
  price_summary_card: PriceSummaryCard,
  short_price_card: PriceSummaryCard,
  emi_answer_card: EmiAnswerCard,
  finance_faq_card: EmiAnswerCard,
  quotation_lead_card: QuotationLeadCard,
  recommendation_mini_card: RecommendationMiniCard,
  score_insight_summary: AciV2DiagnosticInlineCard,
  diagnostic_summary: AciV2DiagnosticInlineCard,
  decision_diagnostic_summary: AciV2DiagnosticInlineCard,
  similar_cars_summary: AciV2DiagnosticInlineCard,
  availability_answer_card: AciV2DiagnosticInlineCard,
  explainer_card: AciV2DiagnosticInlineCard,
  fallback_card: AciV2DiagnosticInlineCard,
  feature_difference_summary: AciV2DiagnosticInlineCard,
  offer_summary_card: AciV2DiagnosticInlineCard,
  service_center_answer_card: AciV2DiagnosticInlineCard,
  spec_answer_card: AciV2DiagnosticInlineCard,
  text_notice: TextNoticeCard,
  unavailable_notice: TextNoticeCard,
  clarification_card: TextNoticeCard,
};

export default function AciV2InlineRenderer({ inlineType = "", payload = {} }) {
  const key = String(inlineType || "").trim().toLowerCase();
  const Renderer = INLINE_RENDERERS[key] || null;

  if (!Renderer) return null;
  return <Renderer payload={payload} />;
}

export { INLINE_RENDERERS };
