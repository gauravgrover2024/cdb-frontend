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

export const ACI_HOME_IMAGES = {
  avatar:
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=240&auto=format&fit=crop",
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

export const ACI_VEHICLES = [
  {
    id: "hyundai-creta",
    brand: "Hyundai",
    make: "Hyundai",
    model: "Creta",
    displayName: "Hyundai Creta",
    bodyType: "suv",
    label: "CRETA",
    city: "Delhi",
    segment: "Premium mid-size SUV",
    subtitle: "Premium mid-size SUV · Delhi prices",
    imageUrl: ACI_HOME_IMAGES.creta,
    priceRange: "₹12.65L – ₹20.15L",
    startingOnRoadPrice: "₹12.65L",
    exShowroomPrice: "₹11.11L",
    selectedVariant: "SX Tech IVT",
    fuelText: "Petrol / Diesel",
    transmissionText: "Manual / Automatic",
    variantCount: 26,
    chips: ["26 variants", "Petrol / Diesel", "Manual / Automatic"],
    heroBadges: ["Selected car hub", "ACI Assist remembers this car"],
    specs: [
      { icon: Fuel, label: "Petrol / Diesel" },
      { icon: Gauge, label: "Manual / Automatic" },
      { icon: Users, label: "5 Seater" },
    ],
    highlights: [
      { icon: Sparkles, value: "26", label: "Variants" },
      { icon: Fuel, value: "3", label: "Fuel options" },
      { icon: Scale, value: "2", label: "Transmissions" },
      { icon: Gauge, value: "18.4 km/l", label: "Mileage (ARAI)" },
      { icon: Sparkles, value: "5★", label: "Global NCAP" },
    ],
    colors: [
      { name: "Atlas White", hex: "#F7F7F5" },
      { name: "Abyss Black", hex: "#050912" },
      { name: "Titan Grey", hex: "#8E98A6" },
      { name: "Fiery Red", hex: "#CD1E25" },
      { name: "Starry Blue", hex: "#19338C" },
    ],
    variants: [
      {
        id: "creta-sxo-ivt",
        tag: "BEST SELLER",
        name: "SX (O) IVT",
        fuel: "Petrol",
        transmission: "Automatic",
        price: "₹17.55L",
        sub: "On-road Delhi",
        meta: ["18.4 km/l", "5★ Safety"],
      },
      {
        id: "creta-sx-tech-ivt",
        tag: "TOP RATED",
        name: "SX Tech IVT",
        fuel: "Petrol",
        transmission: "Automatic",
        price: "₹18.98L",
        sub: "On-road Delhi",
        meta: ["18.4 km/l", "5★ Safety"],
      },
      {
        id: "creta-so-ivt",
        tag: "VALUE PICK",
        name: "S (O) IVT",
        fuel: "Petrol",
        transmission: "Automatic",
        price: "₹15.45L",
        sub: "On-road Delhi",
        meta: ["17.8 km/l", "5★ Safety"],
      },
    ],
    compareWith: {
      brand: "Hyundai",
      model: "Verna",
      displayName: "Hyundai Verna",
      variant: "SX IVT",
      price: "₹16.70L",
      bodyType: "sedan",
      label: "VERNA",
    },
    query: "Hyundai Creta",
  },
  {
    id: "hyundai-verna",
    brand: "Hyundai",
    make: "Hyundai",
    model: "Verna",
    displayName: "Hyundai Verna",
    bodyType: "sedan",
    label: "VERNA",
    city: "Delhi",
    segment: "Executive sedan",
    subtitle: "Executive sedan · Delhi prices",
    priceRange: "₹12.98 – 17.38 Lakh",
    startingOnRoadPrice: "₹12.98L",
    exShowroomPrice: "₹11.07L",
    selectedVariant: "SX (O) IVT",
    fuelText: "Petrol",
    transmissionText: "Manual / IVT",
    variantCount: 18,
    blue: false,
    specs: [
      { icon: Fuel, label: "Petrol" },
      { icon: Gauge, label: "Manual / IVT" },
      { icon: Users, label: "5 Seater" },
    ],
    query: "Hyundai Verna",
  },
  {
    id: "tata-safari",
    brand: "Tata",
    make: "Tata",
    model: "Safari",
    displayName: "Tata Safari",
    bodyType: "suv",
    label: "SAFARI",
    city: "Delhi",
    segment: "Premium 7-seater SUV",
    subtitle: "Premium SUV · Delhi prices",
    priceRange: "₹15.49 – 25.49 Lakh",
    startingOnRoadPrice: "₹16.19L",
    selectedVariant: "Accomplished+ 6S",
    fuelText: "Diesel",
    transmissionText: "Manual / Automatic",
    variantCount: 22,
    blue: true,
    specs: [
      { icon: Fuel, label: "Diesel" },
      { icon: Gauge, label: "Manual / Automatic" },
      { icon: Users, label: "6/7 Seater" },
    ],
    query: "Tata Safari",
  },
  {
    id: "kia-seltos",
    brand: "Kia",
    make: "Kia",
    model: "Seltos",
    displayName: "Kia Seltos",
    bodyType: "suv",
    label: "SELTOS",
    city: "Delhi",
    segment: "Premium compact SUV",
    subtitle: "Premium compact SUV · Delhi prices",
    priceRange: "₹11.13 – 20.51 Lakh",
    startingOnRoadPrice: "₹11.13L",
    selectedVariant: "HTX IVT",
    fuelText: "Petrol / Diesel",
    transmissionText: "Manual / DCT",
    variantCount: 24,
    blue: false,
    specs: [
      { icon: Fuel, label: "Petrol / Diesel" },
      { icon: Gauge, label: "Manual / DCT" },
      { icon: Users, label: "5 Seater" },
    ],
    query: "Kia Seltos",
  },
];

ACI_VEHICLES.forEach((vehicle) => {
  vehicle.name = vehicle.name || vehicle.displayName || [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  vehicle.price = vehicle.price || vehicle.priceRange || vehicle.startingOnRoadPrice || "";
  vehicle.variant = vehicle.variant || vehicle.selectedVariant || "";
});

const vehicleById = Object.fromEntries(ACI_VEHICLES.map((item) => [item.id, item]));

export const getAciVehicleById = (id) => vehicleById[id] || ACI_VEHICLES[0];

export const getAciVehicleByQuery = (query = "") => {
  const lower = String(query || "").toLowerCase();

  return (
    ACI_VEHICLES.find((vehicle) => {
      const keys = [
        vehicle.id,
        vehicle.brand,
        vehicle.make,
        vehicle.model,
        vehicle.displayName,
        vehicle.label,
      ]
        .filter(Boolean)
        .map((item) => String(item).toLowerCase());

      return keys.some((key) => lower.includes(key));
    }) || null
  );
};

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
      anchorModel: vehicle.model,
      anchorMake: vehicle.make,
      anchorCity: vehicle.city || "Delhi",
      selectedVehicle: vehicle,
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
    contextPatch: { selectedVehicle: vehicle, anchorModel: vehicle.model },
  }),
  makeAciAction({
    id: `${vehicle.id}-emi`,
    label: "Calculate EMI",
    query: `Calculate EMI for ${vehicle.model}`,
    intent: ACI_INTENTS.EMI,
    canvasType: ACI_CANVAS_TYPES.EMI,
    vehicle,
    contextPatch: { selectedVehicle: vehicle, anchorModel: vehicle.model },
  }),
  makeAciAction({
    id: `${vehicle.id}-compare`,
    label: "Compare",
    query: `Compare ${vehicle.model} with similar cars`,
    intent: ACI_INTENTS.COMPARISON,
    canvasType: ACI_CANVAS_TYPES.COMPARISON,
    vehicle,
    contextPatch: { selectedVehicle: vehicle, anchorModel: vehicle.model },
  }),
  makeAciAction({
    id: `${vehicle.id}-colors`,
    label: "Colors",
    query: `Show colors of ${vehicle.model}`,
    intent: ACI_INTENTS.COLORS,
    canvasType: ACI_CANVAS_TYPES.COLORS,
    vehicle,
    contextPatch: { selectedVehicle: vehicle, anchorModel: vehicle.model },
  }),
  makeAciAction({
    id: `${vehicle.id}-features`,
    label: "Features",
    query: `Show features of ${vehicle.model}`,
    intent: ACI_INTENTS.FEATURES,
    canvasType: ACI_CANVAS_TYPES.FEATURES,
    vehicle,
    contextPatch: { selectedVehicle: vehicle, anchorModel: vehicle.model },
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
    contextPatch: { selectedVehicle: vehicle, anchorModel: vehicle.model },
  }),
];

export const ACI_ASSIST_HOME_DATA = {
  selectedVehicle: ACI_VEHICLES[0],

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

  trendingCars: [ACI_VEHICLES[1], ACI_VEHICLES[2], ACI_VEHICLES[3]],

  rightRail: {
    popularAsks: [
      "Best mileage cars under ₹10 lakh",
      "7 seater SUVs under ₹20 lakh",
      "Automatic cars under ₹15 lakh",
      "Top rated cars for city driving",
      "Low maintenance cars in India",
    ],
    savedCars: [ACI_VEHICLES[1], ACI_VEHICLES[2], ACI_VEHICLES[3]],
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
    trustLine: "Trusted by 2M+ car buyers",
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
    popularCars: [ACI_VEHICLES[1], ACI_VEHICLES[2], ACI_VEHICLES[0]],
  },
};
