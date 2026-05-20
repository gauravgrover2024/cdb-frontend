import {
  Calculator,
  FileText,
  Fuel,
  Gauge,
  Gift,
  IndianRupee,
  ListChecks,
  Palette,
  Scale,
  Sparkles,
  Tag,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";

export const ACI_HOME_IMAGES = {
  avatar: "",
  creta: "",
};

export const ACI_CANVAS_TYPES = {
  CAR_OVERVIEW: "car_overview_canvas",
  PRICELIST: "pricelist_canvas",
  EMI: "emi_calculator_canvas",
  COMPARISON: "comparison_canvas",
  COLORS: "color_gallery_canvas",
  FEATURES: "features_explorer_canvas",
  QUOTATION: "aci_quotation_canvas",
  SERVICE: "service_center_canvas",
  OFFERS: "offers_canvas",
  RECOMMENDATIONS: "recommendation_results_canvas",
};

export const ACI_INTENTS = {
  OPEN_VEHICLE: "vehicle_overview",
  PRICELIST: "vehicle_pricelist",
  EMI: "vehicle_emi_calculator",
  COMPARISON: "vehicle_comparison",
  COLORS: "vehicle_colors",
  FEATURES: "vehicle_model_features_explorer",
  QUOTATION: "aci_new_car_quotation",
  SERVICE: "vehicle_service_centers",
  OFFERS: "vehicle_offers",
  RECOMMENDATIONS: "vehicle_recommendation_discovery",
  BUDGET_SEARCH: "vehicle_budget_search",
  TOGGLE_SAVED: "toggle_saved_vehicle",
};

export const makeAciAction = ({
  id,
  label,
  title,
  body,
  query,
  intent,
  canvasType = "",
  type = "ask",
  tone = "blue",
  icon = "",
  vehicle = null,
  contextPatch = {},
  payload = {},
  ...rest
}) => {
  const finalLabel = label || title || query || "ACI Assist action";

  return {
    id,
    title: title || finalLabel,
    label: finalLabel,
    body: body || "",
    query: query || finalLabel,
    intent,
    canvasType,
    type,
    tone,
    icon,
    vehicle,
    contextPatch,
    payload,
    ...rest,
  };
};

export const ACI_VEHICLES = [];

/**
 * No static vehicle catalogue is kept in frontend.
 * Vehicles, variants, prices, colors, images, safety and recommendations
 * must come from the backend live response.
 */

const vehicleById = Object.fromEntries(ACI_VEHICLES.map((item) => [item.id, item]));

export const getAciVehicleById = (id) => vehicleById[id] || null;

export const getAciVehicleByQuery = () => null;

export const buildVehicleAction = (vehicle) =>
  makeAciAction({
    id: `open-${vehicle.id}`,
    label: vehicle.displayName,
    query: vehicle.displayName,
    intent: ACI_INTENTS.OPEN_VEHICLE,
    canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
    type: "open_vehicle",
    vehicle,
    contextPatch: {
      ...buildVehicleContextPatch({ vehicle, includeVariant: false }),
      activeCanvas: {
        type: ACI_CANVAS_TYPES.CAR_OVERVIEW,
        model: vehicle.model,
      },
    },
  });

export const buildVehicleQuickActions = (vehicle) => [
  makeAciAction({
    id: `${vehicle.id}-pricelist`,
    label: "Price list",
    query: `${vehicle.model} pricelist`,
    intent: ACI_INTENTS.PRICELIST,
    canvasType: ACI_CANVAS_TYPES.PRICELIST,
    vehicle,
    contextPatch: buildVehicleContextPatch({ vehicle, includeVariant: false }),
  }),
  makeAciAction({
    id: `${vehicle.id}-emi`,
    label: "Calculate EMI",
    query: `Calculate EMI for ${vehicle.model}`,
    intent: ACI_INTENTS.EMI,
    canvasType: ACI_CANVAS_TYPES.EMI,
    vehicle,
    contextPatch: buildVehicleContextPatch({ vehicle, includeVariant: false }),
  }),
  makeAciAction({
    id: `${vehicle.id}-compare`,
    label: "Compare",
    query: `Compare ${vehicle.model} with similar cars`,
    intent: ACI_INTENTS.COMPARISON,
    canvasType: ACI_CANVAS_TYPES.COMPARISON,
    vehicle,
    contextPatch: buildVehicleContextPatch({ vehicle, includeVariant: false }),
  }),
  makeAciAction({
    id: `${vehicle.id}-colors`,
    label: "Colors",
    query: `Show colors of ${vehicle.model}`,
    intent: ACI_INTENTS.COLORS,
    canvasType: ACI_CANVAS_TYPES.COLORS,
    vehicle,
    contextPatch: buildVehicleContextPatch({ vehicle, includeVariant: false }),
  }),
  makeAciAction({
    id: `${vehicle.id}-features`,
    label: "Features",
    query: `Show features of ${vehicle.model}`,
    intent: ACI_INTENTS.FEATURES,
    canvasType: ACI_CANVAS_TYPES.FEATURES,
    vehicle,
    contextPatch: buildVehicleContextPatch({ vehicle, includeVariant: false }),
  }),
  makeAciAction({
    id: `${vehicle.id}-quotation`,
    label: "Get quotation",
    query: `Get quotation for ${vehicle.model}`,
    intent: ACI_INTENTS.QUOTATION,
    canvasType: ACI_CANVAS_TYPES.QUOTATION,
    type: "lead",
    tone: "gold",
    vehicle,
    contextPatch: buildVehicleContextPatch({ vehicle, includeVariant: false }),
  }),
];

export const ACI_ASSIST_HOME_DATA = {
  selectedVehicle: null,

  header: {
    searchPlaceholder: "Search for cars, brands, features, prices...",
  },

  hero: {
    titlePrefix: "Hi there! I’m",
    titleHighlight: "ACI Assist",
    subtitle:
      "Your intelligent co-pilot for everything about new cars. Discover, compare, plan and decide with confidence.",
    badge: "For new cars only",
    prompts: [
      makeAciAction({
        id: "hero-verna-pricelist",
        icon: FileText,
        label: "Verna pricelist",
        query: "Verna pricelist",
        intent: ACI_INTENTS.PRICELIST,
        canvasType: ACI_CANVAS_TYPES.PRICELIST,
      }),
      makeAciAction({
        id: "hero-safari-colors",
        icon: Palette,
        label: "Show colors of Tata Safari",
        query: "Show colors of Tata Safari",
        intent: ACI_INTENTS.COLORS,
        canvasType: ACI_CANVAS_TYPES.COLORS,
      }),
      makeAciAction({
        id: "hero-best-automatic",
        icon: Sparkles,
        label: "Best automatic cars under ₹15 lakh",
        query: "Best automatic cars under 15 lakh",
        intent: ACI_INTENTS.BUDGET_SEARCH,
        canvasType: ACI_CANVAS_TYPES.RECOMMENDATIONS,
      }),
      makeAciAction({
        id: "hero-compare",
        icon: Scale,
        label: "Compare Verna, City & Slavia",
        query: "Compare Verna City Slavia",
        intent: ACI_INTENTS.COMPARISON,
        canvasType: ACI_CANVAS_TYPES.COMPARISON,
      }),
      makeAciAction({
        id: "hero-creta-emi",
        icon: Calculator,
        label: "EMI for Creta",
        query: "Calculate EMI for Creta",
        intent: ACI_INTENTS.EMI,
        canvasType: ACI_CANVAS_TYPES.EMI,
      }),
      makeAciAction({
        id: "hero-service",
        icon: Wrench,
        label: "Find Hyundai service centers in Delhi",
        query: "Find Hyundai service centers in Delhi",
        intent: ACI_INTENTS.SERVICE,
        canvasType: ACI_CANVAS_TYPES.SERVICE,
      }),
      makeAciAction({
        id: "hero-offers",
        icon: Tag,
        label: "Latest offers on Venue",
        query: "Latest offers on Venue",
        intent: ACI_INTENTS.OFFERS,
        canvasType: ACI_CANVAS_TYPES.OFFERS,
      }),
      makeAciAction({
        id: "hero-quote",
        icon: FileText,
        label: "Get best quotation for Seltos",
        query: "Get best quotation for Seltos",
        intent: ACI_INTENTS.QUOTATION,
        canvasType: ACI_CANVAS_TYPES.QUOTATION,
        type: "lead",
        tone: "gold",
      }),
    ],
  },

  quickActions: [
    makeAciAction({
      icon: IndianRupee,
      title: "Prices",
      label: "Prices",
      body: "Get ex-showroom & on-road prices",
      query: "Show new car prices",
      intent: ACI_INTENTS.PRICELIST,
      canvasType: ACI_CANVAS_TYPES.PRICELIST,
    }),
    makeAciAction({
      icon: ListChecks,
      title: "Features",
      label: "Features",
      body: "Explore features & specifications",
      query: "Explore car features",
      intent: ACI_INTENTS.FEATURES,
      canvasType: ACI_CANVAS_TYPES.FEATURES,
    }),
    makeAciAction({
      icon: Scale,
      title: "Compare",
      label: "Compare",
      body: "Compare cars side by side",
      query: "Compare cars",
      intent: ACI_INTENTS.COMPARISON,
      canvasType: ACI_CANVAS_TYPES.COMPARISON,
    }),
    makeAciAction({
      icon: Palette,
      title: "Colors",
      label: "Colors",
      body: "View colors & customize",
      query: "Show car colors",
      intent: ACI_INTENTS.COLORS,
      canvasType: ACI_CANVAS_TYPES.COLORS,
    }),
    makeAciAction({
      icon: Calculator,
      title: "EMI",
      label: "EMI",
      body: "Calculate EMI & plan budget",
      query: "Calculate EMI",
      intent: ACI_INTENTS.EMI,
      canvasType: ACI_CANVAS_TYPES.EMI,
    }),
    makeAciAction({
      icon: Sparkles,
      title: "Recommendations",
      label: "Recommendations",
      body: "AI picks based on preferences",
      query: "Recommend cars for me",
      intent: ACI_INTENTS.RECOMMENDATIONS,
      canvasType: ACI_CANVAS_TYPES.RECOMMENDATIONS,
    }),
    makeAciAction({
      icon: Gift,
      title: "Offers",
      label: "Offers",
      body: "Latest offers & benefits",
      query: "Show latest car offers",
      intent: ACI_INTENTS.OFFERS,
      canvasType: ACI_CANVAS_TYPES.OFFERS,
    }),
    makeAciAction({
      icon: Wrench,
      title: "Service",
      label: "Service",
      body: "Find service centers near you",
      query: "Find service centers",
      intent: ACI_INTENTS.SERVICE,
      canvasType: ACI_CANVAS_TYPES.SERVICE,
    }),
    makeAciAction({
      icon: FileText,
      title: "Quotation",
      label: "Quotation",
      body: "Get best price quotation",
      query: "Get best quotation",
      intent: ACI_INTENTS.QUOTATION,
      canvasType: ACI_CANVAS_TYPES.QUOTATION,
      type: "lead",
      tone: "gold",
    }),
  ],

  trendingCars: [],

  rightRail: {
    popularAsks: [
      "Best mileage cars under ₹10 lakh",
      "7 seater SUVs under ₹20 lakh",
      "Automatic cars under ₹15 lakh",
      "Top rated cars for city driving",
      "Low maintenance cars in India",
    ],
    savedCars: [],
    help: [
      "Find the right car for me",
      "Compare cars and variants",
      "Check prices & offers",
      "Locate service centers",
      "Calculate EMI & loans",
    ],
  },

  mobile: {
    heroTitle: "One Bot Solution",
    heroSubtitle:
      "Ask one question and get a clear, confident answer to find your perfect new car.",
    primaryCta: "Start with your budget",
    trustLine: "Live new-car assistance",
    shortcuts: [
      makeAciAction({
        icon: Wallet,
        label: "Find car by budget",
        query: "Find car by budget",
        intent: ACI_INTENTS.BUDGET_SEARCH,
        canvasType: ACI_CANVAS_TYPES.RECOMMENDATIONS,
      }),
      makeAciAction({
        icon: Scale,
        label: "Compare cars",
        query: "Compare cars",
        intent: ACI_INTENTS.COMPARISON,
        canvasType: ACI_CANVAS_TYPES.COMPARISON,
      }),
      makeAciAction({
        icon: Tag,
        label: "Check price",
        query: "Check car price",
        intent: ACI_INTENTS.PRICELIST,
        canvasType: ACI_CANVAS_TYPES.PRICELIST,
      }),
    ],
    popularCars: [],
  },
};
