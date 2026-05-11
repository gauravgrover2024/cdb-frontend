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

const INLINE_RENDERERS = {
  feature_answer_card: FeatureAnswerCard,
  variant_ambiguity_card: VariantAmbiguityCard,
  model_ambiguity_card: ModelAmbiguityCard,
  price_summary_card: PriceSummaryCard,
  emi_answer_card: EmiAnswerCard,
  quotation_lead_card: QuotationLeadCard,
  recommendation_mini_card: RecommendationMiniCard,
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
