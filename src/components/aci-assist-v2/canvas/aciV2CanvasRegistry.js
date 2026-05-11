import AciAssistCarOverviewScreen from "../screens/AciAssistCarOverviewScreen";
import AciAssistColorsScreen from "../screens/AciAssistColorsScreen";
import AciAssistPriceListScreen from "../screens/AciAssistPriceListScreen";
import AciAssistEmiScreen from "../screens/AciAssistEmiScreen";
import AciAssistFeaturesScreen from "../screens/AciAssistFeaturesScreen";
import AciAssistCompareScreen from "../screens/AciAssistCompareScreen";
import AciAssistRecommendationScreen from "../screens/AciAssistRecommendationScreen";
import AciAssistVariantAdvisorScreen from "../screens/AciAssistVariantAdvisorScreen";
import AciAssistQuotationScreen from "../screens/AciAssistQuotationScreen";
import AciAssistOffersScreen from "../screens/AciAssistOffersScreen";
import AciAssistSafetyScreen from "../screens/AciAssistSafetyScreen";

export const ACI_V2_SCREENS = {
  HOME: "home",
  CAR_OVERVIEW: "car_overview",
  COLORS: "colors",
  PRICELIST: "pricelist",
  EMI: "emi",
  FEATURES: "features",
  COMPARISON: "comparison",
  RECOMMENDATION: "recommendation",
  VARIANT_ADVISOR: "variant_advisor",
  QUOTATION: "quotation",
  OFFERS: "offers",
  SAFETY: "safety",
};

export const ACI_V2_CANVAS_TYPE_TO_SCREEN = {
  car_overview_canvas: ACI_V2_SCREENS.CAR_OVERVIEW,
  vehicle_overview_canvas: ACI_V2_SCREENS.CAR_OVERVIEW,

  pricelist_canvas: ACI_V2_SCREENS.PRICELIST,
  price_breakup_canvas: ACI_V2_SCREENS.PRICELIST,

  color_gallery_canvas: ACI_V2_SCREENS.COLORS,
  colors_canvas: ACI_V2_SCREENS.COLORS,
  color_studio_canvas: ACI_V2_SCREENS.COLORS,

  emi_canvas: ACI_V2_SCREENS.EMI,
  emi_calculator_canvas: ACI_V2_SCREENS.EMI,

  features_canvas: ACI_V2_SCREENS.FEATURES,
  feature_explorer_canvas: ACI_V2_SCREENS.FEATURES,
  features_explorer_canvas: ACI_V2_SCREENS.FEATURES,

  comparison_canvas: ACI_V2_SCREENS.COMPARISON,

  recommendation_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  recommendation_results_canvas: ACI_V2_SCREENS.RECOMMENDATION,
  similar_cars_canvas: ACI_V2_SCREENS.RECOMMENDATION,

  variant_advisor_canvas: ACI_V2_SCREENS.VARIANT_ADVISOR,

  aci_quotation_canvas: ACI_V2_SCREENS.QUOTATION,
  lead_capture_canvas: ACI_V2_SCREENS.QUOTATION,

  offers_canvas: ACI_V2_SCREENS.OFFERS,

  safety_ranking_canvas: ACI_V2_SCREENS.SAFETY,
  safety_advisor_canvas: ACI_V2_SCREENS.SAFETY,
};

export const ACI_V2_SCREEN_COMPONENTS = {
  [ACI_V2_SCREENS.CAR_OVERVIEW]: AciAssistCarOverviewScreen,
  [ACI_V2_SCREENS.COLORS]: AciAssistColorsScreen,
  [ACI_V2_SCREENS.PRICELIST]: AciAssistPriceListScreen,
  [ACI_V2_SCREENS.EMI]: AciAssistEmiScreen,
  [ACI_V2_SCREENS.FEATURES]: AciAssistFeaturesScreen,
  [ACI_V2_SCREENS.COMPARISON]: AciAssistCompareScreen,
  [ACI_V2_SCREENS.RECOMMENDATION]: AciAssistRecommendationScreen,
  [ACI_V2_SCREENS.VARIANT_ADVISOR]: AciAssistVariantAdvisorScreen,
  [ACI_V2_SCREENS.QUOTATION]: AciAssistQuotationScreen,
  [ACI_V2_SCREENS.OFFERS]: AciAssistOffersScreen,
  [ACI_V2_SCREENS.SAFETY]: AciAssistSafetyScreen,
};

export const normalizeCanvasType = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

export const resolveScreenFromCanvasType = (canvasType = "") => {
  const key = normalizeCanvasType(canvasType);
  return ACI_V2_CANVAS_TYPE_TO_SCREEN[key] || "";
};
