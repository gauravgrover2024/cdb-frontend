import GenericAciCanvas from "./GenericAciCanvas";
import GenericInlineAnswerCard from "./GenericInlineAnswerCard";

import { VehiclePricelistCanvas } from "./canvases/VehiclePricelistCanvas";
import { PriceBreakupCanvas } from "./canvases/PriceBreakupCanvas";
import { VehicleFeaturesCanvas } from "./canvases/VehicleFeaturesCanvas";
import { VehicleColorsCanvas } from "./canvases/VehicleColorsCanvas";
import { VehicleComparisonCanvas } from "./canvases/VehicleComparisonCanvas";
import { SimilarCarsCanvas } from "./canvases/SimilarCarsCanvas";
import { VehicleVariantRecommendationCanvas } from "./canvases/VehicleVariantRecommendationCanvas";
import { VariantDifferenceCanvas } from "./canvases/VariantDifferenceCanvas";
import { VehicleEmiCalculatorCanvas } from "./canvases/VehicleEmiCalculatorCanvas";
import { VehicleRecommendationCanvas } from "./canvases/VehicleRecommendationCanvas";
import { VehicleSafetyCanvas } from "./canvases/VehicleSafetyCanvas";
import { VehicleSpecRankingCanvas } from "./canvases/VehicleSpecRankingCanvas";

import FeatureAvailabilityInline from "./FeatureAvailabilityInline";
import VehiclePriceListInline from "./VehiclePriceListInline";
import VehicleFeaturesInline from "./VehicleFeaturesInline";
import VehicleColorsInline from "./VehicleColorsInline";
import SimilarCarsInline from "./SimilarCarsInline";
import VehicleComparisonTable from "./VehicleComparisonTable";

export const CANVAS_FALLBACK_KEY = "generic_canvas";
export const INLINE_FALLBACK_KEY = "generic_inline";

export const ACI_CANVAS_REGISTRY = {
  aci_home_canvas: {
    component: GenericAciCanvas,
    status: "missing",
    intents: ["aci_home"],
    expectedShape: "title + answer + widgets + actions + leadingQuestions",
    fallback: CANVAS_FALLBACK_KEY,
  },
  recommendation_results_canvas: {
    component: VehicleRecommendationCanvas,
    status: "implemented",
    intents: [
      "vehicle_recommendation_discovery",
      "vehicle_budget_search",
      "vehicle_body_type_search",
      "vehicle_use_case_search",
      "vehicle_brand_search",
      "vehicle_mileage_search",
    ],
    expectedShape: "rows/modelCards/groupedByModel + variantRows + notices",
    fallback: CANVAS_FALLBACK_KEY,
  },
  brand_results_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_brand_search"],
    expectedShape: "model rows grouped by brand + actions",
    fallback: CANVAS_FALLBACK_KEY,
  },
  model_overview_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_model_overview"],
    expectedShape: "model summary + highlights + actions",
    fallback: CANVAS_FALLBACK_KEY,
  },
  pricelist_canvas: {
    component: VehiclePricelistCanvas,
    status: "implemented",
    intents: ["vehicle_pricelist", "vehicle_city_price", "vehicle_variant_price"],
    expectedShape: "rows/variants + city + summary + notices",
    fallback: CANVAS_FALLBACK_KEY,
  },
  price_breakup_canvas: {
    component: PriceBreakupCanvas,
    status: "implemented",
    intents: ["vehicle_price_breakup"],
    expectedShape: "rows with components + totals",
    fallback: CANVAS_FALLBACK_KEY,
  },
  feature_explorer_canvas: {
    component: VehicleFeaturesCanvas,
    status: "implemented",
    intents: ["vehicle_model_features_explorer", "vehicle_feature_discovery"],
    expectedShape: "rows/features with grouping + context",
    fallback: CANVAS_FALLBACK_KEY,
  },
  color_studio_canvas: {
    component: VehicleColorsCanvas,
    status: "implemented",
    intents: ["vehicle_colors", "vehicle_color_gallery"],
    expectedShape: "colors/colorGallery + variantGroups",
    fallback: CANVAS_FALLBACK_KEY,
  },
  comparison_canvas: {
    component: VehicleComparisonCanvas,
    status: "implemented",
    intents: ["vehicle_comparison", "vehicle_model_comparison", "vehicle_variant_comparison", "vehicle_safety_comparison"],
    expectedShape: "models + variants + comparisonRows",
    fallback: CANVAS_FALLBACK_KEY,
  },
  similar_cars_canvas: {
    component: SimilarCarsCanvas,
    status: "implemented",
    intents: ["vehicle_similar_cars", "vehicle_alternative_search"],
    expectedShape: "rows + anchorModel + actions",
    fallback: CANVAS_FALLBACK_KEY,
  },
  variant_finder_canvas: {
    component: VehicleVariantRecommendationCanvas,
    status: "implemented",
    intents: ["vehicle_variant_recommendation"],
    expectedShape: "recommendedVariant + alternatives + ranked rows",
    fallback: CANVAS_FALLBACK_KEY,
  },
  variant_upgrade_value_canvas: {
    component: VariantDifferenceCanvas,
    status: "implemented",
    intents: ["vehicle_variant_upgrade_value", "vehicle_variant_difference"],
    expectedShape: "baseVariant + compareVariant + feature diff + price diff",
    fallback: CANVAS_FALLBACK_KEY,
  },
  emi_calculator_canvas: {
    component: VehicleEmiCalculatorCanvas,
    status: "implemented",
    intents: ["vehicle_emi_calculator", "vehicle_emi_options"],
    expectedShape: "inputs + result + scenarios + city context",
    fallback: CANVAS_FALLBACK_KEY,
  },
  monthly_budget_planner_canvas: {
    component: GenericAciCanvas,
    status: "missing",
    intents: ["vehicle_monthly_budget_planner"],
    expectedShape: "budget assumptions + recommended plans",
    fallback: CANVAS_FALLBACK_KEY,
  },
  finance_guide_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["new_car_finance_faq", "new_car_loan_enquiry"],
    expectedShape: "faq entries + docs + eligibility actions",
    fallback: CANVAS_FALLBACK_KEY,
  },
  offers_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_offers", "vehicle_offer_lookup"],
    expectedShape: "offers rows + validity + actions",
    fallback: CANVAS_FALLBACK_KEY,
  },
  aci_quotation_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["aci_new_car_quotation"],
    expectedShape: "quote fields + totals + lead actions",
    fallback: CANVAS_FALLBACK_KEY,
  },
  availability_waiting_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_availability", "vehicle_waiting_period"],
    expectedShape: "availability rows + waiting period + city",
    fallback: CANVAS_FALLBACK_KEY,
  },
  service_center_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["new_car_service_center_search"],
    expectedShape: "service center list + contact actions",
    fallback: CANVAS_FALLBACK_KEY,
  },
  ownership_service_warranty_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["new_car_ownership_guide", "new_car_service_cost", "new_car_warranty"],
    expectedShape: "ownership/service/warranty breakdown",
    fallback: CANVAS_FALLBACK_KEY,
  },
  tco_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_tco_analysis", "vehicle_running_cost"],
    expectedShape: "TCO assumptions + projected totals",
    fallback: CANVAS_FALLBACK_KEY,
  },
  fuel_decision_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_fuel_decision_advisor"],
    expectedShape: "fuel comparison + recommendation",
    fallback: CANVAS_FALLBACK_KEY,
  },
  resale_value_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_resale_value_analysis"],
    expectedShape: "resale factors + retention ranges",
    fallback: CANVAS_FALLBACK_KEY,
  },
  lifestyle_fit_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_lifestyle_fit_score"],
    expectedShape: "fit score + rationale + alternatives",
    fallback: CANVAS_FALLBACK_KEY,
  },
  safety_advisor_canvas: {
    component: VehicleSafetyCanvas,
    status: "implemented",
    intents: ["vehicle_safety_search"],
    expectedShape: "safety-ranked model cards + evidence",
    fallback: CANVAS_FALLBACK_KEY,
  },
  feature_match_builder_canvas: {
    component: GenericAciCanvas,
    status: "missing",
    intents: ["vehicle_must_have_feature_builder"],
    expectedShape: "must-have matrix + matched models",
    fallback: CANVAS_FALLBACK_KEY,
  },
  feature_value_score_canvas: {
    component: GenericAciCanvas,
    status: "missing",
    intents: ["vehicle_variant_upgrade_value"],
    expectedShape: "feature score vs price delta",
    fallback: CANVAS_FALLBACK_KEY,
  },
  senior_friendly_advisor_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_senior_friendly_recommendation"],
    expectedShape: "senior comfort fit cards",
    fallback: CANVAS_FALLBACK_KEY,
  },
  space_practicality_canvas: {
    component: GenericAciCanvas,
    status: "basic",
    intents: ["vehicle_space_practicality_advisor"],
    expectedShape: "space/practicality specs",
    fallback: CANVAS_FALLBACK_KEY,
  },
  performance_spec_ranking_canvas: {
    component: VehicleSpecRankingCanvas,
    status: "implemented",
    intents: ["vehicle_performance_advisor", "vehicle_spec_ranking", "vehicle_bad_roads_advisor"],
    expectedShape: "ranked rows + metric fields",
    fallback: CANVAS_FALLBACK_KEY,
  },
  [CANVAS_FALLBACK_KEY]: {
    component: GenericAciCanvas,
    status: "implemented",
    intents: [],
    expectedShape: "title + answer + flexible rows + actions",
    fallback: CANVAS_FALLBACK_KEY,
  },
};

export const ACI_INLINE_REGISTRY = {
  feature_answer_card: {
    component: FeatureAvailabilityInline,
    status: "implemented",
    intents: ["vehicle_feature_answer", "vehicle_safety_answer"],
    expectedShape: "answer + summary + evidenceRows + actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  spec_answer_card: {
    component: GenericInlineAnswerCard,
    status: "basic",
    intents: ["vehicle_spec_lookup"],
    expectedShape: "answer + key facts + actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  short_price_card: {
    component: VehiclePriceListInline,
    status: "basic",
    intents: ["vehicle_variant_price"],
    expectedShape: "single variant price + city + actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  model_ambiguity_card: {
    component: GenericInlineAnswerCard,
    status: "basic",
    intents: ["vehicle_model_ambiguity"],
    expectedShape: "options + ask actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  variant_ambiguity_card: {
    component: GenericInlineAnswerCard,
    status: "basic",
    intents: ["vehicle_variant_ambiguity"],
    expectedShape: "variant options + compare action",
    fallback: INLINE_FALLBACK_KEY,
  },
  finance_faq_card: {
    component: GenericInlineAnswerCard,
    status: "basic",
    intents: ["new_car_finance_faq", "new_car_loan_enquiry"],
    expectedShape: "faq answer + cta actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  offer_summary_card: {
    component: GenericInlineAnswerCard,
    status: "basic",
    intents: ["vehicle_offer_lookup"],
    expectedShape: "offer summary + validity + actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  service_center_answer_card: {
    component: GenericInlineAnswerCard,
    status: "basic",
    intents: ["new_car_service_center_search"],
    expectedShape: "nearest center + contact actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  availability_answer_card: {
    component: GenericInlineAnswerCard,
    status: "basic",
    intents: ["vehicle_availability", "vehicle_waiting_period"],
    expectedShape: "availability answer + lead actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  fallback_card: {
    component: GenericInlineAnswerCard,
    status: "implemented",
    intents: ["new_car_unavailable_or_out_of_scope"],
    expectedShape: "safe redirect + new-car actions",
    fallback: INLINE_FALLBACK_KEY,
  },
  [INLINE_FALLBACK_KEY]: {
    component: GenericInlineAnswerCard,
    status: "implemented",
    intents: [],
    expectedShape: "answer + facts + actions",
    fallback: INLINE_FALLBACK_KEY,
  },
};

export const resolveCanvasRegistryEntry = (canvasType = "") =>
  ACI_CANVAS_REGISTRY[canvasType] ||
  ACI_CANVAS_REGISTRY[CANVAS_FALLBACK_KEY];

export const resolveInlineRegistryEntry = (inlineType = "") =>
  ACI_INLINE_REGISTRY[inlineType] ||
  ACI_INLINE_REGISTRY[INLINE_FALLBACK_KEY];

export const resolveCanvasTypeForIntent = (intent = "") => {
  const clean = String(intent || "").trim();
  if (!clean) return null;
  const found = Object.entries(ACI_CANVAS_REGISTRY).find(([, entry]) =>
    (entry?.intents || []).includes(clean),
  );
  return found?.[0] || null;
};

export const widgetTypeToCanvasType = {
  vehicle_pricelist: "pricelist_canvas",
  vehicle_price_breakup: "price_breakup_canvas",
  vehicle_features: "feature_explorer_canvas",
  vehicle_feature_discovery: "feature_explorer_canvas",
  vehicle_colors: "color_studio_canvas",
  vehicle_color_search: "color_studio_canvas",
  vehicle_model_comparison: "comparison_canvas",
  vehicle_comparison: "comparison_canvas",
  similar_cars: "similar_cars_canvas",
  vehicle_variant_recommendation: "variant_finder_canvas",
  vehicle_variant_difference: "variant_upgrade_value_canvas",
  vehicle_emi_calculator: "emi_calculator_canvas",
  vehicle_emi_recommendations: "emi_calculator_canvas",
  vehicle_recommendation_results: "recommendation_results_canvas",
  vehicle_safety_results: "safety_advisor_canvas",
  vehicle_spec_ranking: "performance_spec_ranking_canvas",
  vehicle_feature_answer: null,
  model_ambiguity: null,
  variant_ambiguity: null,
};

export const widgetTypeToInlineType = {
  vehicle_feature_answer: "feature_answer_card",
  model_ambiguity: "model_ambiguity_card",
  variant_ambiguity: "variant_ambiguity_card",
  unavailable_notice: "fallback_card",
};

export const LEGACY_WIDGET_INLINE_COMPONENTS = {
  vehicle_pricelist: VehiclePriceListInline,
  vehicle_colors: VehicleColorsInline,
  vehicle_features: VehicleFeaturesInline,
  similar_cars: SimilarCarsInline,
  vehicle_comparison: VehicleComparisonTable,
};
