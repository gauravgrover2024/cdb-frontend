import AciAssistCarOverviewScreen from "../screens/AciAssistCarOverviewScreen";
import AciAssistColorsScreen from "../screens/AciAssistColorsScreen";
import AciAssistPriceListScreen from "../screens/AciAssistPriceListScreen";
import AciAssistEmiScreen from "../screens/AciAssistEmiScreen";
import AciAssistFeaturesScreen from "../screens/AciAssistFeaturesScreen";
import AciAssistCompareScreen from "../screens/AciAssistCompareScreen";
import AciAssistRecommendationScreen from "../screens/AciAssistRecommendationScreen";
import AciAssistBrandsScreen from "../screens/AciAssistBrandsScreen";
import AciAssistVariantAdvisorScreen from "../screens/AciAssistVariantAdvisorScreen";
import AciAssistQuotationScreen from "../screens/AciAssistQuotationScreen";
import AciAssistOffersScreen from "../screens/AciAssistOffersScreen";

export const ACI_V2_SCREENS = Object.freeze({
  HOME: "home",
  CAR_OVERVIEW: "car_overview",
  COLORS: "colors",
  PRICELIST: "pricelist",
  EMI: "emi",
  FEATURES: "features",
  COMPARISON: "comparison",
  RECOMMENDATION: "recommendation",
  BRANDS: "brands",
  VARIANT_ADVISOR: "variant_advisor",
  QUOTATION: "quotation",
  OFFERS: "offers",
  SAFETY: "safety",
});

export const normalizeCanvasType = (value = "") => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
};

export const ACI_V2_CANVAS_TYPE_TO_SCREEN = Object.freeze({
  // Overview
  car_overview_canvas: ACI_V2_SCREENS.CAR_OVERVIEW,
  vehicle_overview_canvas: ACI_V2_SCREENS.CAR_OVERVIEW,
  model_overview_canvas: ACI_V2_SCREENS.CAR_OVERVIEW,

  // Price / price breakup
  pricelist_canvas: ACI_V2_SCREENS.PRICELIST,
  price_list_canvas: ACI_V2_SCREENS.PRICELIST,
  price_breakup_canvas: ACI_V2_SCREENS.PRICELIST,
  vehicle_price_canvas: ACI_V2_SCREENS.PRICELIST,
  vehicle_city_price_canvas: ACI_V2_SCREENS.PRICELIST,
  vehicle_variant_price_canvas: ACI_V2_SCREENS.PRICELIST,

  // Colors
  color_gallery_canvas: ACI_V2_SCREENS.COLORS,
  colors_canvas: ACI_V2_SCREENS.COLORS,
  colour_gallery_canvas: ACI_V2_SCREENS.COLORS,
  colours_canvas: ACI_V2_SCREENS.COLORS,
  color_studio_canvas: ACI_V2_SCREENS.COLORS,
  vehicle_colors_canvas: ACI_V2_SCREENS.COLORS,

  // EMI / finance
  emi_canvas: ACI_V2_SCREENS.EMI,
  emi_calculator_canvas: ACI_V2_SCREENS.EMI,
  finance_canvas: ACI_V2_SCREENS.EMI,
  finance_faq_canvas: ACI_V2_SCREENS.EMI,

  // Features
  features_canvas: ACI_V2_SCREENS.FEATURES,
  feature_canvas: ACI_V2_SCREENS.FEATURES,
  feature_answer_canvas: ACI_V2_SCREENS.FEATURES,
  feature_explorer_canvas: ACI_V2_SCREENS.FEATURES,
  features_explorer_canvas: ACI_V2_SCREENS.FEATURES,
  feature_match_builder_canvas: ACI_V2_SCREENS.FEATURES,
  vehicle_feature_answer_canvas: ACI_V2_SCREENS.FEATURES,
  vehicle_feature_discovery_canvas: ACI_V2_SCREENS.FEATURES,
  vehicle_model_features_explorer_canvas: ACI_V2_SCREENS.FEATURES,

  // Comparison
  comparison_canvas: ACI_V2_SCREENS.COMPARISON,
  compare_canvas: ACI_V2_SCREENS.COMPARISON,
  vehicle_comparison_canvas: ACI_V2_SCREENS.COMPARISON,

  // Recommendations / decision support
  recommendation_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  recommendations_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  recommendation_results_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  vehicle_recommendation_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  vehicle_recommendation_results_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  similar_cars_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  fuel_decision_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  safety_ranking_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  safety_advisor_canvas: ACI_V2_SCREENS.RECOMMENDATION,

  // Brand/model browsing
  brand_models_canvas: ACI_V2_SCREENS.BRANDS,
  brands_canvas: ACI_V2_SCREENS.BRANDS,
  brand_canvas: ACI_V2_SCREENS.BRANDS,

  // Variant advisor
  variant_advisor_canvas: ACI_V2_SCREENS.VARIANT_ADVISOR,
  variant_selector_canvas: ACI_V2_SCREENS.VARIANT_ADVISOR,
  variant_ambiguity_canvas: ACI_V2_SCREENS.VARIANT_ADVISOR,

  // Quotation / lead capture
  aci_quotation_canvas: ACI_V2_SCREENS.QUOTATION,
  quotation_canvas: ACI_V2_SCREENS.QUOTATION,
  quote_canvas: ACI_V2_SCREENS.QUOTATION,
  lead_capture_canvas: ACI_V2_SCREENS.QUOTATION,

  // Offers
  offers_canvas: ACI_V2_SCREENS.OFFERS,
  vehicle_offers_canvas: ACI_V2_SCREENS.OFFERS,
});

export const ACI_V2_SCREEN_COMPONENTS = Object.freeze({
  [ACI_V2_SCREENS.CAR_OVERVIEW]: AciAssistCarOverviewScreen,
  [ACI_V2_SCREENS.COLORS]: AciAssistColorsScreen,
  [ACI_V2_SCREENS.PRICELIST]: AciAssistPriceListScreen,
  [ACI_V2_SCREENS.EMI]: AciAssistEmiScreen,
  [ACI_V2_SCREENS.FEATURES]: AciAssistFeaturesScreen,
  [ACI_V2_SCREENS.COMPARISON]: AciAssistCompareScreen,
  [ACI_V2_SCREENS.RECOMMENDATION]: AciAssistRecommendationScreen,
  [ACI_V2_SCREENS.BRANDS]: AciAssistBrandsScreen,
  [ACI_V2_SCREENS.VARIANT_ADVISOR]: AciAssistVariantAdvisorScreen,
  [ACI_V2_SCREENS.QUOTATION]: AciAssistQuotationScreen,
  [ACI_V2_SCREENS.OFFERS]: AciAssistOffersScreen,
  [ACI_V2_SCREENS.SAFETY]: AciAssistRecommendationScreen,
});

export const resolveScreenFromCanvasType = (canvasType = "") => {
  const key = normalizeCanvasType(canvasType);
  return ACI_V2_CANVAS_TYPE_TO_SCREEN[key] || "";
};

export const resolveScreenComponentFromCanvasType = (canvasType = "") => {
  const screen = resolveScreenFromCanvasType(canvasType);
  return screen ? ACI_V2_SCREEN_COMPONENTS[screen] || null : null;
};

export const isKnownCanvasType = (canvasType = "") =>
  Boolean(resolveScreenFromCanvasType(canvasType));
