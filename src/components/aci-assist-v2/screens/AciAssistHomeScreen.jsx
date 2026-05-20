import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Flame,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import {
  AciAssistantOrb,
  AciComposer,
  AciLogo,
  AciSavedButton,
  AciVehicleVisual,
  emitAciAction,
  fadeUp,
  stagger,
} from "../shared/AciAssistShared";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";
import { getAciV2PremiumIcon } from "../shared/AciV2PremiumIcons";
import { fetchAciPopularCars } from "../services/aciAssistV2Api";

const getModelDisplayName = (car = {}) => {
  const composed = [car.brand || car.make, car.model]
    .filter(Boolean)
    .join(" ")
    .trim();
  return composed || car.displayName || car.name || "Vehicle";
};

const toCityLabel = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "Delhi";
  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const CITY_SLUG = "new-delhi";
const LIVE_TRENDING_LIMIT = 25;
const RECENT_STORAGE_KEY = "aci_v2_recent_live_cars";

const getStageFrame = (imageFrame, stageKey = "homeCard") => {
  if (!imageFrame || typeof imageFrame !== "object") return null;

  return (
    imageFrame.stageFrames?.[stageKey] ||
    imageFrame.stages?.[stageKey] ||
    imageFrame[stageKey] ||
    imageFrame.stageFrames?.homeCard ||
    imageFrame.stageFrames?.chatCard ||
    imageFrame.stageFrames?.priceSide ||
    imageFrame.stageFrames?.mobileHero ||
    imageFrame.stageFrames?.default ||
    imageFrame
  );
};

const frameNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const cssPercent = (value, fallback = 0, min = -10, max = 12) => {
  const raw =
    typeof value === "string" && value.trim().endsWith("%")
      ? Number(value.trim().slice(0, -1))
      : frameNumber(value, fallback);

  if (!Number.isFinite(raw)) return `${fallback}%`;
  return `${clampNumber(raw, min, max)}%`;
};

const buildHomeImageFrameStyle = (imageFrame, stageKey = "homeCard") => {
  const frame = getStageFrame(imageFrame, stageKey);

  const pickFirst = (...values) =>
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    );

  const readNumber = (...values) => {
    const value = pickFirst(...values);
    if (typeof value === "string" && value.trim().endsWith("%")) {
      const parsed = Number(value.trim().slice(0, -1));
      return Number.isFinite(parsed) ? parsed / 100 : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizeFocus = (value) => {
    const number = readNumber(value);
    if (!Number.isFinite(number)) return null;
    return number > 1 ? number / 100 : number;
  };

  const getBounds = () => {
    const source =
      frame?.visibleBounds ||
      frame?.visibleBox ||
      frame?.contentBounds ||
      frame?.contentBox ||
      frame?.subjectBounds ||
      frame?.subjectBox ||
      frame?.carBounds ||
      frame?.carBox ||
      frame?.trimBounds ||
      frame?.trimBox ||
      frame?.bbox ||
      frame?.bounds ||
      imageFrame?.visibleBounds ||
      imageFrame?.visibleBox ||
      imageFrame?.contentBounds ||
      imageFrame?.contentBox ||
      imageFrame?.subjectBounds ||
      imageFrame?.subjectBox ||
      imageFrame?.carBounds ||
      imageFrame?.carBox ||
      imageFrame?.trimBounds ||
      imageFrame?.trimBox ||
      imageFrame?.bbox ||
      imageFrame?.bounds;

    if (!source || typeof source !== "object") return null;

    const naturalWidth = readNumber(
      frame?.naturalWidth,
      frame?.imageWidth,
      frame?.sourceWidth,
      frame?.canvasWidth,
      frame?.canvas_width,
      imageFrame?.naturalWidth,
      imageFrame?.imageWidth,
      imageFrame?.sourceWidth,
      imageFrame?.canvasWidth,
      imageFrame?.canvas_width,
      imageFrame?.width,
    );

    const naturalHeight = readNumber(
      frame?.naturalHeight,
      frame?.imageHeight,
      frame?.sourceHeight,
      frame?.canvasHeight,
      frame?.canvas_height,
      imageFrame?.naturalHeight,
      imageFrame?.imageHeight,
      imageFrame?.sourceHeight,
      imageFrame?.canvasHeight,
      imageFrame?.canvas_height,
      imageFrame?.height,
    );

    const left = readNumber(source.left, source.x, source.minX);
    const top = readNumber(source.top, source.y, source.minY);
    const width = readNumber(
      source.width,
      source.w,
      source.right && left != null ? source.right - left : null,
    );
    const height = readNumber(
      source.height,
      source.h,
      source.bottom && top != null ? source.bottom - top : null,
    );

    const looksNormalized =
      [left, top, width, height].every((value) => Number.isFinite(value)) &&
      left >= 0 &&
      top >= 0 &&
      width > 0 &&
      height > 0 &&
      left <= 1 &&
      top <= 1 &&
      width <= 1 &&
      height <= 1;

    if (looksNormalized) {
      return {
        centerX: left + width / 2,
        centerY: top + height / 2,
        widthRatio: width,
        heightRatio: height,
      };
    }

    if (
      !Number.isFinite(naturalWidth) ||
      !Number.isFinite(naturalHeight) ||
      naturalWidth <= 0 ||
      naturalHeight <= 0 ||
      !Number.isFinite(left) ||
      !Number.isFinite(top) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return null;
    }

    return {
      centerX: (left + width / 2) / naturalWidth,
      centerY: (top + height / 2) / naturalHeight,
      widthRatio: width / naturalWidth,
      heightRatio: height / naturalHeight,
    };
  };

  const isRecent = stageKey === "homeRecent";
  const isMobile = stageKey === "homeMobileCard";

  const fallbackScale = isRecent ? 1.04 : isMobile ? 1.02 : 1.04;
  const maxScale = isRecent ? 1.18 : isMobile ? 1.12 : 1.14;

  const cssVars = {
    ...(imageFrame?.cssVars || {}),
    ...(frame?.cssVars || {}),
  };

  const bounds = frame && typeof frame === "object" ? getBounds() : null;

  const explicitScale = readNumber(
    cssVars["--car-frame-scale"],
    frame?.scale,
    frame?.zoom,
  );

  const frameScale = bounds
    ? Math.max(
        fallbackScale,
        Math.min(
          maxScale,
          Math.max(
            0.86 / Math.max(bounds.widthRatio, 0.01),
            0.62 / Math.max(bounds.heightRatio, 0.01),
          ),
        ),
      )
    : fallbackScale;

  const scale = clampNumber(explicitScale ?? frameScale, 0.9, maxScale);

  const explicitX = pickFirst(
    cssVars["--car-frame-x"],
    frame?.translateXPct,
    frame?.translateXPercent,
    frame?.translateX,
    frame?.xOffset,
  );

  const explicitY = pickFirst(
    cssVars["--car-frame-y"],
    frame?.translateYPct,
    frame?.translateYPercent,
    frame?.translateY,
    frame?.yOffset,
  );

  const focusX = normalizeFocus(
    frame?.focusX ??
      frame?.focalX ??
      frame?.centerX ??
      imageFrame?.focusX ??
      imageFrame?.focalX,
  );

  const focusY = normalizeFocus(
    frame?.focusY ??
      frame?.focalY ??
      frame?.centerY ??
      imageFrame?.focusY ??
      imageFrame?.focalY,
  );

  const computedX = bounds
    ? (0.5 - bounds.centerX) * 100
    : Number.isFinite(focusX)
      ? (0.5 - focusX) * 100
      : 0;

  const computedY = bounds
    ? (0.5 - bounds.centerY) * 100
    : Number.isFinite(focusY)
      ? (0.5 - focusY) * 100
      : 0;

  const origin =
    cssVars["--car-frame-origin"] || frame?.transformOrigin || "center center";

  return {
    "--car-frame-scale": String(scale),
    "--car-frame-x": cssPercent(explicitX ?? computedX, 0, -18, 18),
    "--car-frame-y": cssPercent(explicitY ?? computedY, 0, -18, 18),
    "--car-frame-origin": origin,
  };
};

const budgetPresets = [
  { id: "all", label: "All", min: 0, max: Number.POSITIVE_INFINITY },
  { id: "under-10", label: "Under ₹10L", min: 0, max: 1000000 },
  { id: "10-15", label: "₹10L–₹15L", min: 1000000, max: 1500000 },
  { id: "15-25", label: "₹15L–₹25L", min: 1500000, max: 2500000 },
  {
    id: "above-25",
    label: "Above ₹25L",
    min: 2500000,
    max: Number.POSITIVE_INFINITY,
  },
];

const bodyFilters = ["All", "SUV", "Sedan", "Hatchback", "MUV"];

const getBudgetPreset = (budgetId, rows = []) => {
  const preset =
    budgetPresets.find((item) => item.id === budgetId) || budgetPresets[0];
  if (preset.id !== "all") return preset;

  const prices = rows
    .flatMap((car) => [car.minExShowroomPrice, car.maxExShowroomPrice])
    .map((value) => Number(value || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  return {
    ...preset,
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : Number.POSITIVE_INFINITY,
  };
};

const budgetOverlaps = (car, budget) => {
  const carMin = Number(car?.minExShowroomPrice || 0);
  const carMax = Number(car?.maxExShowroomPrice || carMin || 0);
  const budgetMin = Number(budget?.min || 0);
  const budgetMax = Number.isFinite(Number(budget?.max))
    ? Number(budget.max)
    : Number.POSITIVE_INFINITY;
  if (!carMin && !carMax) return false;
  return carMax >= budgetMin && carMin <= budgetMax;
};

const normalizePopularVehicle = (car = {}) => ({
  id: car.id,
  make: car.make || car.brand || "",
  brand: car.brand || car.make || "",
  model: car.model || "",
  displayName:
    car.displayName ||
    [car.brand || car.make, car.model].filter(Boolean).join(" "),
  city: car.city || CITY_SLUG,
  citySlug: car.city || CITY_SLUG,
  imageUrl: car.imageUrl || car.normalizedImageUrl || "",
  normalizedImageUrl: car.normalizedImageUrl || car.imageUrl || "",
  imageFrame: car.imageFrame || {},
});

const normalizeRecentVehicle = (
  car = {},
  mode = car.lastMode || "overview",
) => ({
  ...normalizePopularVehicle(car),
  priceRange: car.priceRange || "",
  bodyStyle: car.bodyStyle || "",
  segment: car.segment || "",
  lastMode: ["price", "colors", "overview"].includes(mode) ? mode : "overview",
});

const buildPopularContext = (car = {}) => {
  const selectedVehicle = normalizePopularVehicle(car);
  return buildVehicleContextPatch({
    vehicle: selectedVehicle,
    city: CITY_SLUG,
    includeVariant: false,
  });
};

const buildPopularAction = (car = {}, mode = "overview") => {
  const vehicle = normalizePopularVehicle(car);
  const displayName = vehicle.displayName || vehicle.model || "this car";
  const contextPatch = buildPopularContext(car);

  if (mode === "colors") {
    return {
      label: "Colors",
      query: `Show ${displayName} colors`,
      type: "ask",
      intent: "vehicle_colors",
      canvasType: "color_studio_canvas",
      vehicle,
      contextPatch,
    };
  }

  if (mode === "price") {
    return {
      label: "View price",
      query: `Show ${displayName} pricelist`,
      type: "ask",
      intent: "vehicle_pricelist",
      canvasType: "pricelist_canvas",
      vehicle,
      contextPatch,
    };
  }

  return {
    label: displayName,
    query: `Show ${displayName} overview`,
    type: "open_vehicle",
    intent: "vehicle_overview",
    canvasType: "car_overview_canvas",
    vehicle,
    contextPatch,
  };
};

const readRecentCars = () => {
  if (typeof window === "undefined") return [];
  try {
    const stores = [sessionStorage, localStorage];
    for (const store of stores) {
      const parsed = JSON.parse(store.getItem(RECENT_STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) {
        return parsed
          .filter(Boolean)
          .map((item) => normalizeRecentVehicle(item))
          .slice(0, 4);
      }
    }
  } catch {
    return [];
  }
  return [];
};

const writeRecentCar = (car = {}, mode = "overview") => {
  if (typeof window === "undefined") return [];
  const vehicle = normalizeRecentVehicle(car, mode);
  if (!vehicle.model) return readRecentCars();
  const next = [
    vehicle,
    ...readRecentCars().filter(
      (item) => item.id !== vehicle.id && item.model !== vehicle.model,
    ),
  ].slice(0, 4);
  try {
    sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  return next;
};

const EMPTY_HOME_DATA = {
  avatarUrl: "",
  header: {
    searchPlaceholder: "Ask about prices, features, EMI, or compare cars",
  },
  hero: {
    titlePrefix: "Hi there! I’m",
    titleHighlight: "ACI Assist",
    subtitle:
      "Your intelligent co-pilot for everything about new cars. Discover, compare, plan and decide with confidence.",
    badge: "For new cars only",
    prompts: [],
  },
  quickActions: [],
  trendingCars: [],
  rightRail: {
    popularAsks: [],
    savedCars: [],
    help: [],
  },
  mobile: {
    heroTitle: "One Bot Solution",
    heroSubtitle:
      "Ask one question and get a clear, confident answer to find your perfect new car.",
    primaryCta: "Start with your budget",
    trustLine: "Live new-car assistance",
    shortcuts: [],
    popularCars: [],
  },
  selectedVehicle: null,
};

const toSafeArray = (value) =>
  Array.isArray(value) ? value.filter(Boolean) : [];

const normalizeHomeData = (data = {}) => {
  const source = data && typeof data === "object" ? data : {};

  return {
    ...EMPTY_HOME_DATA,
    ...source,
    avatarUrl: source.avatarUrl || EMPTY_HOME_DATA.avatarUrl,
    header: {
      ...EMPTY_HOME_DATA.header,
      ...(source.header || {}),
    },
    hero: {
      ...EMPTY_HOME_DATA.hero,
      ...(source.hero || {}),
      prompts: toSafeArray(source.hero?.prompts),
    },
    quickActions: toSafeArray(source.quickActions),
    trendingCars: toSafeArray(source.trendingCars),
    rightRail: {
      ...EMPTY_HOME_DATA.rightRail,
      ...(source.rightRail || {}),
      popularAsks: toSafeArray(source.rightRail?.popularAsks),
      savedCars: toSafeArray(source.rightRail?.savedCars),
      help: toSafeArray(source.rightRail?.help),
    },
    mobile: {
      ...EMPTY_HOME_DATA.mobile,
      ...(source.mobile || {}),
      shortcuts: toSafeArray(source.mobile?.shortcuts),
      popularCars: toSafeArray(source.mobile?.popularCars),
    },
    selectedVehicle: source.selectedVehicle || null,
  };
};

function DesktopTrendingSkeletonCard({ index }) {
  return (
    <motion.article
      className="desktop-car-card desktop-car-card-skeleton"
      aria-hidden="true"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
    >
      <span className="car-tag skeleton-token skeleton-tag" />

      <span className="heart-button skeleton-heart" />

      <div className="desktop-car-image skeleton-image">
        <span className="skeleton-car-visual" />
      </div>

      <h3>
        <span className="skeleton-line skeleton-title" />
      </h3>

      <p>
        <span className="skeleton-line skeleton-price" />
      </p>

      <div className="desktop-car-specs skeleton-specs">
        <span />
        <span />
        <span />
      </div>
    </motion.article>
  );
}

function DesktopHeader({ data, onAction }) {
  const [searchText, setSearchText] = useState("");

  const submitSearch = () => {
    const query = String(searchText || "").trim();
    if (!query) return;

    emitAciAction({ label: query, query, type: "ask" }, onAction);
    setSearchText("");
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitSearch();
  };

  return (
    <motion.header
      className="desktop-header"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="desktop-header-left">
        <AciLogo onAction={onAction} />
      </div>

      <div className="desktop-header-center">
        <label className="desktop-search">
          <Search size={18} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={data.header.searchPlaceholder}
          />
          <button
            type="button"
            onClick={submitSearch}
            aria-label="Search ACI Assist"
          >
            ⌘ K
          </button>
        </label>
      </div>

      <div className="desktop-header-right">
        <button
          type="button"
          className="bell-button"
          onClick={() =>
            emitAciAction(
              { label: "Notifications", query: "Notifications" },
              onAction,
            )
          }
          aria-label="Notifications"
        >
          <Bell size={22} />
          <i />
        </button>

        <button
          type="button"
          className="avatar-button"
          onClick={() =>
            emitAciAction({ label: "Profile", query: "Profile" }, onAction)
          }
          aria-label="Profile"
        >
          <img src={data.avatarUrl} alt="Profile" />
        </button>

        <button
          type="button"
          className="plain-button"
          onClick={() =>
            emitAciAction(
              { label: "Profile menu", query: "Profile menu" },
              onAction,
            )
          }
          aria-label="Profile menu"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </motion.header>
  );
}

function DesktopHero({ data, onAction }) {
  const desktopHeroActions = Array.isArray(data.quickActions)
    ? data.quickActions.slice(0, 9)
    : [];

  return (
    <motion.section
      className="desktop-hero reference-desktop-hero"
      variants={fadeUp}
    >
      <div className="desktop-hero-bg" aria-hidden="true">
        <span className="desktop-hero-glow glow-one" />
        <span className="desktop-hero-glow glow-two" />
        <span className="desktop-hero-dot dot-one" />
        <span className="desktop-hero-dot dot-two" />
        <span className="desktop-hero-dot dot-three" />
      </div>

      <div className="desktop-hero-copy">
        <h1 className="desktop-hero-title">
          <span className="desktop-title-top">How can I help you</span>
          <span className="desktop-title-bottom">
            find <em>your perfect car?</em>
          </span>
        </h1>

        <p>
          Ask anything about cars and I'll help you with the best
          recommendations.
        </p>

        <div className="desktop-hero-action-cloud">
          {desktopHeroActions.map((item, index) => {
            const Icon =
              getAciV2PremiumIcon(item.title || item.label || item.body) ||
              item.icon ||
              Sparkles;

            return (
              <button
                type="button"
                key={item.title || item.label}
                className={`desktop-action-chip desktop-action-chip-${index + 1}`}
                onClick={() => emitAciAction(item, onAction)}
              >
                <span className="desktop-action-chip-icon">
                  <Icon size={15} />
                </span>

                <span>{item.title || item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        className="desktop-hero-orb"
        animate={{ y: [0, -5, 0], scale: [1, 1.012, 1] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <AciAssistantOrb
          size="hero"
          style={{
            "--orb-w": "440px",
            "--orb-h": "330px",
          }}
        />
      </motion.div>
    </motion.section>
  );
}



function PopularFilters({
  budgetId,
  bodyFilter,
  onBudgetChange,
  onBodyFilterChange,
}) {
  return (
    <div className="aci-live-filter-panel">
      <div className="aci-budget-filter">
        <span>Budget</span>
        <div className="aci-filter-chip-row">
          {budgetPresets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={budgetId === preset.id ? "is-active" : ""}
              onClick={() => onBudgetChange(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="aci-body-filter" aria-label="Filter by body style">
        <span>Body</span>
        <div className="aci-filter-chip-row">
          {bodyFilters.map((filter) => (
            <button
              type="button"
              key={filter}
              className={bodyFilter === filter ? "is-active" : ""}
              onClick={() => onBodyFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContinueExploring({ cars = [], onAction }) {
  if (!cars.length) return null;

  return (
    <motion.section className="aci-continue-exploring" variants={fadeUp}>
      <div className="section-head">
        <div>
          <h2 className="aci-lively-section-title is-continue">
            Continue exploring
          </h2>
        </div>
      </div>

      <div className="aci-recent-grid">
        {cars.slice(0, 4).map((car, index) => (
          <motion.button
            type="button"
            key={car.id || car.model}
            className="aci-recent-hero-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.24 }}
            onClick={() =>
              emitAciAction(
                buildPopularAction(car, car.lastMode || "overview"),
                onAction,
              )
            }
          >
            <div className="aci-recent-copy">
              <strong>{car.displayName || getModelDisplayName(car)}</strong>
              <em>
                {car.priceRange ? (
                  <>
                    {car.priceRange}
                    <small>Ex-showroom</small>
                  </>
                ) : (
                  "Price range updating"
                )}
              </em>
              <small>{toCityLabel(car.city || CITY_SLUG)}</small>
            </div>
            <div
              className="aci-recent-visual"
              style={buildHomeImageFrameStyle(car.imageFrame, "homeRecent")}
            >
              <AciVehicleVisual
                vehicle={car}
                height={158}
                stage
                stageVariant="compact"
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "auto"}
              />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

function LivePopularCarCard({
  car,
  onAction,
  savedIds,
  onToggleSaved,
  compact = false,
  onRemember,
  index = 0,
  isSpotlight = false,
}) {
  const vehicle = normalizePopularVehicle(car);
  const frameStyle = buildHomeImageFrameStyle(
    vehicle.imageFrame,
    compact ? "homeMobileCard" : "homeCard",
  );

  const fire = (mode) => {
    onRemember?.(car, mode);
    emitAciAction(buildPopularAction(car, mode), onAction);
  };

  return (
    <motion.article
      className={`aci-live-car-card ${compact ? "is-compact" : ""} ${isSpotlight ? "is-spotlight" : ""}`}
      style={{ "--aci-card-delay": `${Math.min(index * 55, 330)}ms` }}
      initial={{
        opacity: 0,
        y: compact ? 18 : 22,
        scale: 0.965,
        filter: "blur(7px)",
      }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.28 }}
      whileHover={
        compact
          ? undefined
          : {
              y: -8,
              scale: 1.012,
              transition: { type: "spring", stiffness: 260, damping: 20 },
            }
      }
      whileTap={{ scale: compact ? 0.982 : 0.992 }}
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 18,
        mass: 0.72,
        delay: Math.min(index * 0.04, 0.24),
      }}
    >
      <div className="aci-live-card-topline">
        <span className="aci-rank-pill">#{car.rank}</span>
      </div>

      <AciSavedButton
        vehicle={vehicle}
        saved={savedIds.has(vehicle.id)}
        onToggleSaved={onToggleSaved}
        className="heart-button aci-live-save"
        size={18}
      />

      <button
        type="button"
        className="aci-live-car-visual"
        onClick={() => fire("overview")}
        style={frameStyle}
      >
        <AciVehicleVisual
          vehicle={vehicle}
          height={compact ? 150 : 196}
          stage
          stageVariant="compact"
          loading={index < (compact ? 2 : 5) ? "eager" : "lazy"}
          fetchPriority={index < (compact ? 2 : 5) ? "high" : "auto"}
        />
      </button>

      <button
        type="button"
        className="aci-live-card-copy"
        onClick={() => fire("overview")}
      >
        <strong>{vehicle.displayName}</strong>
        <em>
          {car.priceRange ? (
            <>
              {car.priceRange}
              <small>Ex-showroom</small>
            </>
          ) : (
            "Price range updating"
          )}
        </em>
      </button>

      <div className="aci-live-card-actions">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            fire("price");
          }}
        >
          View price
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            fire("colors");
          }}
        >
          Colors
        </button>
      </div>
    </motion.article>
  );
}

function LiveTrendingSection({
  rows,
  displayedRows,
  loading,
  error,
  budgetId,
  bodyFilter,
  showAll,
  onBudgetChange,
  onBodyFilterChange,
  onToggleShowAll,
  onResetFilters,
  onAction,
  savedIds,
  onToggleSaved,
  onRemember,
  mobile = false,
}) {
  const hasRows = rows.length > 0;
  const visibleRows = displayedRows;
  const trackRef = useRef(null);
  const scrollRafRef = useRef(null);
  const [activePage, setActivePage] = useState(0);

  const pageCount = mobile ? Math.max(1, Math.ceil(visibleRows.length / 2)) : 0;

  const updateActivePage = useCallback(() => {
    if (!mobile || !trackRef.current || !visibleRows.length) return;

    const track = trackRef.current;
    const cards = Array.from(track.querySelectorAll(".aci-live-car-card"));

    if (!cards.length) {
      setActivePage(0);
      return;
    }

    const viewportCenter = track.scrollLeft + track.clientWidth / 2;
    let closestCardIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestCardIndex = index;
      }
    });

    setActivePage(
      Math.min(pageCount - 1, Math.max(0, Math.floor(closestCardIndex / 2))),
    );
  }, [mobile, pageCount, visibleRows.length]);

  const handleTrendingScroll = useCallback(() => {
    if (!mobile) return;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(updateActivePage);
  }, [mobile, updateActivePage]);

  const scrollToTrendingPage = useCallback(
    (pageIndex) => {
      if (!mobile || !trackRef.current) return;

      const track = trackRef.current;
      const cards = Array.from(track.querySelectorAll(".aci-live-car-card"));
      const targetCard = cards[Math.min(cards.length - 1, pageIndex * 2)];

      if (!targetCard) return;

      track.scrollTo({
        left: Math.max(0, targetCard.offsetLeft),
        behavior: "smooth",
      });

      setActivePage(pageIndex);
    },
    [mobile],
  );

  useEffect(() => {
    if (!mobile || !trackRef.current) return;

    setActivePage(0);
    trackRef.current.scrollTo({ left: 0, behavior: "auto" });

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(updateActivePage);
  }, [
    budgetId,
    bodyFilter,
    showAll,
    mobile,
    visibleRows.length,
    updateActivePage,
  ]);

  useEffect(
    () => () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    },
    [],
  );

  return (
    <motion.section
      className={`aci-live-trending ${mobile ? "is-mobile" : "is-desktop"}`}
      variants={fadeUp}
    >
      <div className="section-head aci-live-section-head">
        <div>
          <h2 className="aci-lively-section-title">
            <span className="aci-premium-trend-icon" aria-hidden="true">
              <TrendingUp size={15} />
            </span>
            <span>Trending right now</span>
          </h2>
        </div>

        {hasRows ? (
          <button type="button" onClick={onToggleShowAll}>
            {showAll ? "Show less" : "View all"} <ChevronRight size={16} />
          </button>
        ) : null}
      </div>

      <PopularFilters
        budgetId={budgetId}
        bodyFilter={bodyFilter}
        onBudgetChange={onBudgetChange}
        onBodyFilterChange={onBodyFilterChange}
      />

      {error ? (
        <p className="aci-live-notice">
          Live trending cars are not available right now.
        </p>
      ) : null}

      {loading ? (
        <div className={mobile ? "aci-live-mobile-track" : "aci-live-grid"}>
          {Array.from({ length: mobile ? 2 : 5 }).map((_, index) => (
            <DesktopTrendingSkeletonCard
              key={`popular-skeleton-${mobile}-${index}`}
              index={index}
            />
          ))}
        </div>
      ) : visibleRows.length ? (
        <>
          <div
            ref={mobile ? trackRef : null}
            className={mobile ? "aci-live-mobile-track" : "aci-live-grid"}
            onScroll={mobile ? handleTrendingScroll : undefined}
          >
            {visibleRows.map((car, index) => (
              <LivePopularCarCard
                key={car.id || `${car.rank}-${car.displayName}`}
                car={car}
                onAction={onAction}
                savedIds={savedIds}
                onToggleSaved={onToggleSaved}
                compact={mobile}
                onRemember={onRemember}
                index={index}
                isSpotlight={mobile && Math.floor(index / 2) === activePage}
              />
            ))}
          </div>

          {mobile && pageCount > 1 ? (
            <div
              className="aci-live-swipe-indicator"
              role="tablist"
              aria-label="Trending cars pages"
            >
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  type="button"
                  key={`trending-page-${index}`}
                  className={activePage === index ? "is-active" : ""}
                  onClick={() => scrollToTrendingPage(index)}
                  aria-label={`Show trending cars page ${index + 1}`}
                  aria-selected={activePage === index}
                >
                  <span>Page {index + 1}</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="aci-live-empty">
          <strong>No top sellers found in this budget.</strong>
          <p>Try widening your budget.</p>
          <button type="button" onClick={onResetFilters}>
            Reset budget
          </button>
        </div>
      )}
    </motion.section>
  );
}

function DesktopContinueExploringRail({ cars = [], onAction }) {
  if (!cars.length) return null;

  return (
    <motion.article
      className="rail-card reference-rail-card aci-rail-recent-card"
      variants={fadeUp}
    >
      <div className="reference-rail-head-row">
        <div>
          <h3 className="aci-lively-rail-title">Continue exploring</h3>
          <p>Resume your recent cars</p>
        </div>
      </div>

      <div className="aci-rail-recent-list">
        {cars.slice(0, 4).map((car, index) => (
          <motion.button
            type="button"
            key={car.id || car.model || index}
            className="aci-rail-recent-item"
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              type: "spring",
              stiffness: 160,
              damping: 18,
              delay: index * 0.035,
            }}
            onClick={() =>
              emitAciAction(
                buildPopularAction(car, car.lastMode || "overview"),
                onAction,
              )
            }
          >
            <span
              className="aci-rail-recent-visual"
              style={buildHomeImageFrameStyle(car.imageFrame, "homeRecent")}
            >
              <AciVehicleVisual
                vehicle={car}
                height={64}
                stage
                stageVariant="compact"
              />
            </span>

            <span className="aci-rail-recent-copy">
              <strong>{car.displayName || getModelDisplayName(car)}</strong>
              <em>{car.priceRange || "Price range updating"}</em>
              <small>{toCityLabel(car.city || CITY_SLUG)}</small>
            </span>

            <ChevronRight size={15} />
          </motion.button>
        ))}
      </div>
    </motion.article>
  );
}

function DesktopRightRail({ data, onAction, recentCars = [] }) {
  const popularAsks = Array.isArray(data?.rightRail?.popularAsks)
    ? data.rightRail.popularAsks
    : [];
  const help = Array.isArray(data?.rightRail?.help) ? data.rightRail.help : [];

  return (
    <aside className="desktop-right-rail aci-reference-rail">
      <motion.article
        className="rail-card reference-rail-card reference-asks-card"
        variants={fadeUp}
      >
        <div className="reference-rail-heading">
          <span className="reference-rail-mini-icon">
            <Sparkles size={16} />
          </span>
          <h3>Today’s popular asks</h3>
        </div>

        <div className="reference-asks-list">
          {popularAsks.length ? (
            popularAsks.slice(0, 5).map((ask, index) => (
              <button
                type="button"
                key={ask}
                onClick={() =>
                  emitAciAction(
                    { label: ask, query: ask, type: "ask" },
                    onAction,
                  )
                }
              >
                <span>{index + 1}</span>
                <strong>{ask}</strong>
                <ChevronRight size={14} />
              </button>
            ))
          ) : (
            <div className="reference-empty-line">
              <p>Live popular asks will appear here.</p>
            </div>
          )}
        </div>

        <button
          type="button"
          className="reference-rail-link"
          onClick={() =>
            emitAciAction(
              {
                label: "See more trending asks",
                query: "See more trending asks",
                type: "ask",
              },
              onAction,
            )
          }
        >
          See more trending asks <ChevronRight size={15} />
        </button>
      </motion.article>

      <DesktopContinueExploringRail cars={recentCars} onAction={onAction} />


      <motion.article
        className="rail-card reference-rail-card reference-tour-card"
        variants={fadeUp}
      >
        <div>
          <h3>New to ACI Assist?</h3>
          <p>Take a quick tour to explore all the features.</p>

          <button
            type="button"
            onClick={() =>
              emitAciAction(
                {
                  label: "Start tour",
                  query: "Start ACI Assist tour",
                  type: "ask",
                },
                onAction,
              )
            }
          >
            Start tour <ChevronRight size={15} />
          </button>
        </div>

        <span className="reference-tour-map">
          <MapPin size={26} />
        </span>
      </motion.article>
    </aside>
  );
}

function DesktopHomePage({
  data,
  popular,
  recentCars,
  onAction,
  savedIds,
  onToggleSaved,
}) {
  return (
    <>
      <DesktopHeader data={data} onAction={onAction} />

      <motion.main
        className="desktop-home-page"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <section className="desktop-home-layout">
          <div className="desktop-home-main">
            <DesktopHero data={data} onAction={onAction} />

            <LiveTrendingSection
              {...popular}
              onAction={onAction}
              savedIds={savedIds}
              onToggleSaved={onToggleSaved}
              mobile={false}
            />
            <AciComposer onAction={onAction} />
          </div>

          <DesktopRightRail
            data={data}
            onAction={onAction}
            recentCars={recentCars}
          />
        </section>
      </motion.main>
    </>
  );
}

function MobileHeader({ data, onAction }) {
  return (
    <motion.header
      className="mobile-header"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <AciLogo mobile onAction={onAction} />

      <div>
        <button
          type="button"
          className="mobile-bell"
          onClick={() =>
            emitAciAction(
              { label: "Notifications", query: "Notifications" },
              onAction,
            )
          }
          aria-label="Notifications"
        >
          <Bell size={27} />
          <i />
        </button>

        <button
          type="button"
          className="mobile-avatar"
          onClick={() =>
            emitAciAction({ label: "Profile", query: "Profile" }, onAction)
          }
          aria-label="Profile"
        >
          <img src={data.avatarUrl} alt="Profile" />
        </button>
      </div>
    </motion.header>
  );
}



const MOBILE_REFERENCE_SHORTCUTS = [
  {
    label: "Find car by budget",
    query: "Find car by budget",
    type: "ask",
  },
  {
    label: "Compare cars",
    query: "Compare cars",
    type: "ask",
    intent: "compare_cars",
  },
  {
    label: "Check price",
    query: "Check car price",
    type: "ask",
    intent: "vehicle_pricelist",
  },
  {
    label: "New car offers",
    query: "Show new car offers",
    type: "ask",
  },
];

function MobileHero({ data, onAction }) {
  return (
    <motion.section
      className="mobile-hero reference-mobile-hero"
      variants={fadeUp}
    >
      <div className="mobile-hero-bg" aria-hidden="true">
        <span className="hero-bg-dot dot-1" />
        <span className="hero-bg-dot dot-2" />
        <span className="hero-bg-dot dot-3" />
        <span className="hero-bg-dot dot-4" />
        <span className="hero-bg-orbit orbit-1" />
        <span className="hero-bg-orbit orbit-2" />
      </div>

      <div className="mobile-hero-copy">
        <h1 className="mobile-hero-title">
          <span className="hero-title-line hero-title-black">
            How can I help you find
          </span>
          <span className="hero-title-line hero-title-blue">
            your perfect car?
          </span>
        </h1>

        <p className="mobile-hero-subtitle-lines">
          <span>Ask anything about cars and I'll help you</span>
          <span>with the best recommendations.</span>
        </p>
      </div>

      <div className="mobile-hero-orb-shell" aria-hidden="true">
        <motion.div
          className="mobile-hero-orb"
          animate={{ y: [0, -4, 0], scale: [1, 1.01, 1] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <AciAssistantOrb
            size="hero"
            style={{
              "--orb-w": "310px",
              "--orb-h": "236px",
            }}
          />
        </motion.div>
      </div>
    </motion.section>
  );
}

function MobileShortcuts({ data, onAction }) {
  return (
    <motion.section
      className="mobile-shortcuts reference-mobile-shortcuts"
      variants={fadeUp}
    >
      {MOBILE_REFERENCE_SHORTCUTS.map((item, index) => {
        const Icon =
          getAciV2PremiumIcon(item.label || item.title || item.query) ||
          Sparkles;

        return (
          <motion.button
            type="button"
            key={item.label}
            className={`shortcut-color-${index + 1}`}
            onClick={() => emitAciAction(item, onAction)}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </motion.button>
        );
      })}
    </motion.section>
  );
}

function MobileHomePage({
  data,
  popular,
  recentCars,
  onAction,
  savedIds,
  onToggleSaved,
}) {
  return (
    <motion.main
      className="mobile-home-page"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <MobileHeader data={data} onAction={onAction} />
      <MobileHero data={data} onAction={onAction} />
      <MobileShortcuts data={data} onAction={onAction} />
      <ContinueExploring cars={recentCars} onAction={onAction} />
      <LiveTrendingSection
        {...popular}
        onAction={onAction}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
        mobile
      />
      <AciComposer
        mobile
        onAction={onAction}
        placeholder="Ask ACI Assist anything…"
      />
    </motion.main>
  );
}

export default function AciAssistHomeScreen({
  data,
  onAction,
  savedIds = new Set(),
  onToggleSaved,
}) {
  const safeData = normalizeHomeData(data);
  const [popularState, setPopularState] = useState({
    loading: true,
    error: "",
    rows: [],
    month: "",
    year: null,
    count: 0,
  });
  const [budgetId, setBudgetId] = useState("all");
  const [bodyFilter, setBodyFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [recentCars, setRecentCars] = useState(() => readRecentCars());

  useEffect(() => {
    const controller = new AbortController();
    setPopularState((prev) => ({ ...prev, loading: true, error: "" }));

    fetchAciPopularCars({
      city: CITY_SLUG,
      limit: LIVE_TRENDING_LIMIT,
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        setPopularState({
          loading: false,
          error: response?.ok ? "" : "unavailable",
          rows: Array.isArray(response?.rows) ? response.rows : [],
          month: response?.month || "",
          year: response?.year || null,
          count: Number(response?.count || response?.rows?.length || 0) || 0,
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setPopularState({
          loading: false,
          error: "unavailable",
          rows: [],
          month: "",
          year: null,
          count: 0,
        });
      });

    return () => controller.abort();
  }, []);

  const selectedBudget = useMemo(
    () => getBudgetPreset(budgetId, popularState.rows),
    [budgetId, popularState.rows],
  );

  const filteredRows = useMemo(() => {
    const filter = String(bodyFilter || "All").toLowerCase();
    return popularState.rows
      .filter((car) => budgetOverlaps(car, selectedBudget))
      .filter((car) => {
        if (filter === "all") return true;
        return (
          String(car.bodyStyle || "").toLowerCase() === filter.toLowerCase()
        );
      })
      .sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999));
  }, [bodyFilter, popularState.rows, selectedBudget]);

  const desktopRows = useMemo(
    () => filteredRows.slice(0, showAll ? LIVE_TRENDING_LIMIT : 5),
    [filteredRows, showAll],
  );

  const mobileRows = useMemo(
    () => filteredRows.slice(0, showAll ? LIVE_TRENDING_LIMIT : 5),
    [filteredRows, showAll],
  );

  const enrichedRecentCars = useMemo(() => {
    const popularByKey = new Map(
      popularState.rows.map((car) => [
        car.id || `${car.make || car.brand}-${car.model}`.toLowerCase(),
        car,
      ]),
    );
    return recentCars.map((car) => {
      const key =
        car.id || `${car.make || car.brand}-${car.model}`.toLowerCase();
      const popular = popularByKey.get(key) || {};
      return {
        ...popular,
        ...car,
        imageUrl:
          popular.imageUrl || popular.normalizedImageUrl || car.imageUrl || "",
        normalizedImageUrl:
          popular.normalizedImageUrl ||
          popular.imageUrl ||
          car.normalizedImageUrl ||
          "",
        imageFrame: popular.imageFrame || car.imageFrame || {},
        priceRange: car.priceRange || popular.priceRange || "",
        bodyStyle: car.bodyStyle || popular.bodyStyle || "",
        segment: car.segment || popular.segment || "",
      };
    });
  }, [popularState.rows, recentCars]);

  const enhancedData = useMemo(
    () => ({
      ...safeData,
      hero: {
        ...safeData.hero,
        badge:
          popularState.month && popularState.year
            ? `Trending right now · ${popularState.month} ${popularState.year}`
            : "Trending right now",
      },
      mobile: {
        ...safeData.mobile,
        trustLine: safeData.mobile.trustLine || "Live new-car assistance",
      },
    }),
    [popularState.month, popularState.year, safeData],
  );

  const rememberCar = (car, mode) => {
    setRecentCars(writeRecentCar(car, mode));
  };

  const resetFilters = () => {
    setBudgetId("all");
    setBodyFilter("All");
    setShowAll(false);
  };

  const popularDesktopProps = {
    rows: filteredRows,
    displayedRows: desktopRows,
    loading: popularState.loading,
    error: popularState.error,
    budgetId,
    bodyFilter,
    showAll,
    totalCount:
      popularState.count || popularState.rows.length || LIVE_TRENDING_LIMIT,
    onBudgetChange: setBudgetId,
    onBodyFilterChange: setBodyFilter,
    onToggleShowAll: () => setShowAll((prev) => !prev),
    onResetFilters: resetFilters,
    onRemember: rememberCar,
  };

  const popularMobileProps = {
    ...popularDesktopProps,
    displayedRows: mobileRows,
  };

  return (
    <div className="aci-home-root">
      <style>{`

/* ACI_HOME_REPLACEMENT_PRODUCTION_V2_START */

.aci-home-root {
  min-height: 100vh;
  color: #07102b;
  background:
    radial-gradient(circle at 50% 0%, rgba(248, 251, 255, .94), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 58%, #ffffff 100%) !important;
  overflow-x: hidden;
}

.aci-home-root * {
  box-sizing: border-box;
}

.aci-home-root button {
  font-family: inherit;
}

.aci-home-root .aci-v2-chatdock {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* Hard switch: laptop only when there is enough width. */
@media (min-width: 1181px) {
  .aci-home-root .mobile-home-page {
    display: none !important;
  }

  .aci-home-root .desktop-header {
    display: grid !important;
  }

  .aci-home-root .desktop-home-page {
    display: block !important;
    padding-bottom: 104px !important;
  }

  .aci-home-root .desktop-home-layout {
    grid-template-columns: minmax(0, 1fr) minmax(286px, 318px) !important;
    gap: 18px !important;
    align-items: start !important;
  }

  .aci-home-root .desktop-home-main {
    min-width: 0 !important;
  }
}

@media (max-width: 1180px) {
  .aci-home-root .desktop-header,
  .aci-home-root .desktop-home-page {
    display: none !important;
  }

  .aci-home-root .mobile-home-page {
    display: block !important;
    width: 100% !important;
    max-width: 430px !important;
    min-height: 100dvh !important;
    margin: 0 auto !important;
    padding: 18px 16px 104px !important;
    overflow-x: hidden !important;
    background:
      radial-gradient(circle at 50% 4%, rgba(248, 251, 255, .96), transparent 34%),
      linear-gradient(180deg, #ffffff 0%, #f8fbff 58%, #ffffff 100%) !important;
  }
}

/* Mobile header */
@media (max-width: 1180px) {
  .aci-home-root .mobile-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    margin: 0 0 14px !important;
    padding: 0 2px !important;
  }

  .aci-home-root .mobile-header > div {
    display: flex !important;
    align-items: center !important;
    gap: 9px !important;
  }

  .aci-home-root .mobile-bell,
  .aci-home-root .mobile-avatar {
    position: relative !important;
    width: 38px !important;
    height: 38px !important;
    border-radius: 999px !important;
    display: grid !important;
    place-items: center !important;
    border: 1px solid rgba(203, 213, 225, .86) !important;
    background: rgba(255, 255, 255, .94) !important;
    box-shadow: 0 12px 26px rgba(15, 23, 42, .055) !important;
    color: #334155 !important;
    overflow: hidden !important;
  }

  .aci-home-root .mobile-bell i {
    position: absolute !important;
    right: 10px !important;
    top: 10px !important;
    width: 6px !important;
    height: 6px !important;
    border-radius: 999px !important;
    background: #2563eb !important;
  }

  .aci-home-root .mobile-avatar img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }
}

/* Mobile hero: compact, balanced, centered orb, no giant blank area. */
@media (max-width: 1180px) {
  .aci-home-root .mobile-hero {
    position: relative !important;
    min-height: 286px !important;
    margin: 0 0 14px !important;
    padding: 27px 24px 24px !important;
    border-radius: 28px !important;
    border: 1px solid rgba(203, 213, 225, .86) !important;
    background:
      radial-gradient(circle at 15% 45%, rgba(219, 234, 254, .70), transparent 36%),
      linear-gradient(135deg, rgba(255,255,255,.98), rgba(248,251,255,.91)) !important;
    box-shadow:
      0 18px 44px rgba(15,23,42,.075),
      inset 0 1px 0 rgba(255,255,255,.95) !important;
    overflow: hidden !important;
  }

  .aci-home-root .mobile-hero-copy {
    position: relative !important;
    z-index: 2 !important;
    max-width: 62% !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    margin: 0 !important;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: 37px !important;
    line-height: .91 !important;
    letter-spacing: -0.055em !important;
    color: #070b20 !important;
  }

  .aci-home-root .mobile-hero-copy p {
    margin: 13px 0 0 !important;
    color: #374151 !important;
    font-size: 13.5px !important;
    line-height: 1.34 !important;
    font-weight: 560 !important;
  }

  .aci-home-root .mobile-hero-copy button {
    width: max-content !important;
    min-width: 204px !important;
    max-width: 100% !important;
    min-height: 45px !important;
    margin-top: 15px !important;
    padding: 0 18px !important;
    border: 0 !important;
    border-radius: 999px !important;
    background: #0b5cff !important;
    color: #ffffff !important;
    box-shadow: 0 18px 36px rgba(11,92,255,.20) !important;
    font-size: 13.4px !important;
    line-height: 1 !important;
    font-weight: 840 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .aci-home-root .mobile-hero-copy small {
    display: inline-flex !important;
    align-items: center !important;
    gap: 7px !important;
    margin-top: 13px !important;
    color: #64748b !important;
    font-size: 12px !important;
    line-height: 1.2 !important;
    font-weight: 760 !important;
  }

  .aci-home-root .mobile-hero-copy small svg {
    color: #d48b17 !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    position: absolute !important;
    top: 50% !important;
    right: 13px !important;
    width: 174px !important;
    height: 174px !important;
    margin-top: -87px !important;
    display: grid !important;
    place-items: center !important;
    z-index: 1 !important;
    opacity: .96 !important;
    pointer-events: none !important;
  }

  .aci-home-root .mobile-hero-orb {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    display: grid !important;
    place-items: center !important;
    transform-origin: center center !important;
    pointer-events: none !important;
  }

  .aci-home-root .mobile-hero-orb > * {
    width: 100% !important;
    height: 100% !important;
  }
}

@media (max-width: 430px) {
  .aci-home-root .mobile-hero {
    min-height: 270px !important;
    padding: 24px 21px 21px !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 34px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    font-size: 12.8px !important;
  }

  .aci-home-root .mobile-hero-copy button {
    min-width: 188px !important;
    min-height: 42px !important;
    font-size: 12.8px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: 1px !important;
    width: 158px !important;
    height: 158px !important;
    margin-top: -79px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero-copy {
    max-width: 64% !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 31px !important;
  }

  .aci-home-root .mobile-hero-copy button {
    min-width: 172px !important;
    font-size: 12px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: -18px !important;
    width: 145px !important;
    height: 145px !important;
    margin-top: -72.5px !important;
  }
}

/* Shortcut row */
@media (max-width: 1180px) {
  .aci-home-root .mobile-shortcuts {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 10px !important;
    margin: 0 0 14px !important;
  }

  .aci-home-root .mobile-shortcuts button {
    min-height: 72px !important;
    height: 72px !important;
    display: flex !important;
    align-items: center !important;
    gap: 9px !important;
    padding: 11px 10px !important;
    border-radius: 21px !important;
    border: 1px solid rgba(203, 213, 225, .88) !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.94)) !important;
    box-shadow: 0 13px 30px rgba(15,23,42,.06) !important;
    color: #070b20 !important;
    overflow: hidden !important;
  }

  .aci-home-root .mobile-shortcuts button svg {
    width: 23px !important;
    height: 23px !important;
    flex: 0 0 auto !important;
    stroke-width: 1.95 !important;
    color: #0b5cff !important;
    filter: drop-shadow(0 8px 14px rgba(11,92,255,.12));
  }

  .aci-home-root .mobile-shortcuts button span {
    display: block !important;
    min-width: 0 !important;
    color: #070b20 !important;
    font-size: 13.8px !important;
    line-height: 1.07 !important;
    letter-spacing: -0.025em !important;
    font-weight: 900 !important;
    text-align: left !important;
  }
}

@media (max-width: 390px) {
  .aci-home-root .mobile-shortcuts {
    gap: 8px !important;
  }

  .aci-home-root .mobile-shortcuts button {
    min-height: 66px !important;
    height: 66px !important;
    gap: 7px !important;
    padding: 10px 8px !important;
  }

  .aci-home-root .mobile-shortcuts button span {
    font-size: 12.4px !important;
  }
}

/* Section headings */
.aci-home-root .aci-lively-section-title,
.aci-home-root .aci-lively-rail-title {
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin: 0 !important;
  color: #07102b !important;
  letter-spacing: -0.045em !important;
  position: relative !important;
}

.aci-home-root .aci-lively-section-title {
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: clamp(25px, 2vw, 35px) !important;
  line-height: .96 !important;
  font-weight: 900 !important;
}

.aci-home-root .aci-lively-rail-title {
  font-size: 15px !important;
  line-height: 1 !important;
  font-weight: 880 !important;
  letter-spacing: -0.025em !important;
}

.aci-home-root .aci-title-orb {
  width: 34px !important;
  height: 34px !important;
  flex: 0 0 34px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 15px !important;
  color: #0b5cff !important;
  background:
    radial-gradient(circle at 32% 24%, #ffffff, #eef5ff 58%, #e5efff 100%) !important;
  border: 1px solid rgba(147, 197, 253, .72) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .96),
    0 14px 30px rgba(37, 99, 235, .13) !important;
}

.aci-home-root .aci-title-orb.is-fire {
  color: #f97316 !important;
  background:
    radial-gradient(circle at 35% 24%, #ffffff, #fff7ed 52%, #ffedd5 100%) !important;
  border-color: rgba(251, 146, 60, .58) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.96),
    0 14px 30px rgba(249,115,22,.15) !important;
}

.aci-home-root .aci-title-orb.is-fire svg {
  color: #f97316 !important;
}

/* Continue exploring mobile */
@media (max-width: 1180px) {
  .aci-home-root .aci-continue-exploring {
    margin: 0 0 14px !important;
    padding: 18px !important;
    border-radius: 28px !important;
    border: 1px solid rgba(203, 213, 225, .82) !important;
    background:
      radial-gradient(circle at 84% 12%, rgba(219, 234, 254, .48), transparent 34%),
      rgba(255,255,255,.92) !important;
    box-shadow: 0 16px 38px rgba(15,23,42,.06) !important;
    overflow: hidden !important;
  }

  .aci-home-root .aci-continue-exploring .section-head {
    margin: 0 0 14px !important;
    align-items: center !important;
  }

  .aci-home-root .aci-continue-exploring .aci-lively-section-title {
    font-size: 27px !important;
    line-height: 1 !important;
    gap: 10px !important;
  }

  .aci-home-root .aci-recent-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    scroll-snap-type: none !important;
  }

  .aci-home-root .aci-recent-hero-card {
    width: 100% !important;
    min-height: 136px !important;
    display: grid !important;
    grid-template-columns: minmax(0, .86fr) minmax(168px, 1.14fr) !important;
    grid-template-rows: 1fr !important;
    align-items: center !important;
    gap: 10px !important;
    padding: 14px 14px 14px 16px !important;
    border-radius: 24px !important;
    border: 1px solid rgba(203, 213, 225, .82) !important;
    background:
      radial-gradient(circle at 76% 48%, rgba(219, 234, 254, .54), transparent 48%),
      rgba(255,255,255,.78) !important;
    box-shadow: none !important;
    overflow: hidden !important;
    text-align: left !important;
  }

  .aci-home-root .aci-recent-copy {
    min-width: 0 !important;
    display: grid !important;
    gap: 5px !important;
    z-index: 2 !important;
  }

  .aci-home-root .aci-recent-copy strong {
    display: block !important;
    color: #07102b !important;
    font-size: 17px !important;
    line-height: 1.05 !important;
    letter-spacing: -0.025em !important;
    font-weight: 900 !important;
    overflow: hidden !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
  }

  .aci-home-root .aci-recent-copy em {
    display: grid !important;
    gap: 1px !important;
    color: #0b5cff !important;
    font-size: 14px !important;
    line-height: 1.08 !important;
    font-style: normal !important;
    font-weight: 850 !important;
  }

  .aci-home-root .aci-recent-copy em > small {
    color: #07102b !important;
    font-size: 11.5px !important;
    font-weight: 780 !important;
  }

  .aci-home-root .aci-recent-copy > small {
    color: #64748b !important;
    font-size: 12.5px !important;
    line-height: 1.08 !important;
    font-weight: 720 !important;
  }

  .aci-home-root .aci-recent-visual {
    width: 100% !important;
    height: 118px !important;
    min-height: 118px !important;
    margin: 0 -6px 0 0 !important;
    padding: 0 !important;
    display: grid !important;
    place-items: center !important;
    overflow: hidden !important;
    border-radius: 20px !important;
    background:
      radial-gradient(circle at 50% 58%, rgba(219, 234, 254, .62), transparent 58%) !important;
  }
}

@media (max-width: 430px) {
  .aci-home-root .aci-recent-hero-card {
    grid-template-columns: minmax(0, .86fr) minmax(142px, 1.14fr) !important;
    min-height: 132px !important;
  }

  .aci-home-root .aci-recent-visual {
    height: 112px !important;
    min-height: 112px !important;
  }

  .aci-home-root .aci-recent-copy strong {
    font-size: 15px !important;
  }

  .aci-home-root .aci-recent-copy em {
    font-size: 12.5px !important;
  }
}

/* Shared vehicle image fit */
.aci-home-root .aci-live-car-visual,
.aci-home-root .aci-recent-visual,
.aci-home-root .aci-rail-recent-visual {
  display: grid !important;
  place-items: center !important;
  overflow: visible !important;
}

.aci-home-root .aci-live-car-visual .aci-car-image-stage,
.aci-home-root .aci-recent-visual .aci-car-image-stage,
.aci-home-root .aci-rail-recent-visual .aci-car-image-stage {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  display: grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
  transform: none !important;
}

.aci-home-root .aci-live-car-visual img,
.aci-home-root .aci-live-car-visual svg,
.aci-home-root .aci-recent-visual img,
.aci-home-root .aci-recent-visual svg,
.aci-home-root .aci-rail-recent-visual img,
.aci-home-root .aci-rail-recent-visual svg {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  mix-blend-mode: multiply !important;
  filter: drop-shadow(0 24px 20px rgba(15, 23, 42, 0.18)) !important;
  transform:
    translate(var(--car-frame-x, 0%), var(--car-frame-y, 0%))
    scale(var(--car-frame-scale, 1.04)) !important;
  transform-origin: var(--car-frame-origin, center center) !important;
}

/* Trending section */
.aci-home-root .aci-live-trending {
  position: relative !important;
}

@media (max-width: 1180px) {
  .aci-home-root .aci-live-trending.is-mobile {
    margin: 0 0 16px !important;
    padding: 18px !important;
    border-radius: 28px !important;
    border: 1px solid rgba(203, 213, 225, .82) !important;
    background:
      radial-gradient(circle at 86% 12%, rgba(219, 234, 254, .46), transparent 34%),
      rgba(255,255,255,.92) !important;
    box-shadow: 0 16px 38px rgba(15,23,42,.06) !important;
    overflow: hidden !important;
  }

  .aci-home-root .aci-live-section-head {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;
    margin-bottom: 14px !important;
  }

  .aci-home-root .aci-live-section-head > div {
    min-width: 0 !important;
  }

  .aci-home-root .aci-live-section-head .aci-lively-section-title {
    font-size: 26px !important;
    line-height: 1 !important;
    letter-spacing: -0.05em !important;
  }

  .aci-home-root .aci-live-section-head > button {
    flex: 0 0 auto !important;
    min-height: 30px !important;
    padding: 0 0 0 10px !important;
    border: 0 !important;
    background: transparent !important;
    color: #0b5cff !important;
    font-size: 13px !important;
    line-height: 1.05 !important;
    font-weight: 880 !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
  }

  .aci-home-root .aci-live-filter-panel {
    display: grid !important;
    gap: 8px !important;
    padding: 0 !important;
    margin-bottom: 14px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .aci-home-root .aci-budget-filter,
  .aci-home-root .aci-body-filter {
    display: grid !important;
    gap: 6px !important;
  }

  .aci-home-root .aci-budget-filter > span,
  .aci-home-root .aci-body-filter > span {
    color: #64748b !important;
    font-size: 9px !important;
    line-height: 1 !important;
    letter-spacing: .075em !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
  }

  .aci-home-root .aci-filter-chip-row {
    width: 100% !important;
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 5px !important;
    overflow: visible !important;
  }

  .aci-home-root .aci-filter-chip-row button {
    flex: 0 1 auto !important;
    min-width: 0 !important;
    min-height: 28px !important;
    padding: 0 7px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(147, 197, 253, .72) !important;
    background: rgba(255,255,255,.84) !important;
    color: #334155 !important;
    font-size: 9.1px !important;
    line-height: 1 !important;
    letter-spacing: -0.02em !important;
    font-weight: 820 !important;
    white-space: nowrap !important;
  }

  .aci-home-root .aci-filter-chip-row button.is-active {
    border-color: #0b5cff !important;
    background: #0b5cff !important;
    color: #ffffff !important;
    box-shadow: 0 10px 22px rgba(11,92,255,.18) !important;
  }

  .aci-home-root .aci-live-mobile-track {
    display: flex !important;
    gap: 12px !important;
    overflow-x: auto !important;
    overflow-y: visible !important;
    scroll-snap-type: x mandatory !important;
    scroll-padding-inline: 4px !important;
    overscroll-behavior-x: contain !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
    margin: 0 -4px !important;
    padding: 0 4px 8px !important;
  }

  .aci-home-root .aci-live-mobile-track::-webkit-scrollbar {
    display: none !important;
  }

  .aci-home-root .aci-live-mobile-track .aci-live-car-card {
    scroll-snap-align: start !important;
    scroll-snap-stop: always !important;
    flex: 0 0 calc((100% - 12px) / 2) !important;
  }
}

.aci-home-root .aci-live-car-card {
  position: relative !important;
  isolation: isolate !important;
  overflow: hidden !important;
  border: 1px solid rgba(147, 197, 253, .55) !important;
  border-radius: 24px !important;
  background: rgba(255,255,255,.46) !important;
  box-shadow: none !important;
  transform-style: preserve-3d;
  will-change: transform, filter;
}

.aci-home-root .aci-live-car-card::before,
.aci-home-root .aci-live-car-card::after {
  display: none !important;
  content: none !important;
}

.aci-home-root .aci-live-car-card:hover,
.aci-home-root .aci-live-car-card.is-spotlight {
  background:
    radial-gradient(circle at 50% 26%, rgba(219, 234, 254, .34), transparent 50%),
    rgba(255,255,255,.52) !important;
  border-color: rgba(37, 99, 235, .38) !important;
  box-shadow: 0 18px 44px rgba(37, 99, 235, .09) !important;
}

.aci-home-root .aci-live-card-topline {
  position: relative !important;
  z-index: 2 !important;
}

.aci-home-root .aci-rank-pill {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 42px !important;
  height: 28px !important;
  padding: 0 10px !important;
  border-radius: 999px !important;
  border: 1px solid rgba(147, 197, 253, .84) !important;
  background: rgba(255,255,255,.86) !important;
  color: #0b5cff !important;
  font-size: 12px !important;
  line-height: 1 !important;
  font-weight: 900 !important;
}

.aci-home-root .aci-live-save {
  position: absolute !important;
  top: 16px !important;
  right: 14px !important;
  z-index: 3 !important;
  width: 38px !important;
  height: 38px !important;
  border-radius: 999px !important;
  border: 1px solid rgba(203, 213, 225, .82) !important;
  background: rgba(255,255,255,.88) !important;
  box-shadow: 0 10px 24px rgba(15,23,42,.06) !important;
  color: #64748b !important;
}

@media (max-width: 1180px) {
  .aci-home-root .aci-live-car-card.is-compact {
    padding: 12px !important;
    min-height: 334px !important;
  }

  .aci-home-root .aci-live-car-card.is-compact .aci-live-car-visual {
    height: 132px !important;
    margin: -2px 0 8px !important;
  }

  .aci-home-root .aci-live-card-copy {
    display: grid !important;
    gap: 2px !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    background: transparent !important;
    color: inherit !important;
    text-align: left !important;
  }

  .aci-home-root .aci-live-card-copy strong {
    display: block !important;
    color: #07102b !important;
    font-size: 16.2px !important;
    line-height: 1.08 !important;
    letter-spacing: -0.035em !important;
    font-weight: 900 !important;
  }

  .aci-home-root .aci-live-card-copy em {
    display: grid !important;
    gap: 1px !important;
    color: #0b5cff !important;
    font-size: 13px !important;
    line-height: 1.1 !important;
    font-style: normal !important;
    font-weight: 860 !important;
  }

  .aci-home-root .aci-live-card-copy small {
    color: #07102b !important;
    font-size: 10.8px !important;
    margin-top: 1px !important;
    font-weight: 780 !important;
  }

  .aci-home-root .aci-live-card-actions {
    display: grid !important;
    gap: 9px !important;
    margin-top: 12px !important;
  }

  .aci-home-root .aci-live-card-actions button {
    width: 100% !important;
    min-height: 38px !important;
    border-radius: 999px !important;
    font-size: 13px !important;
    font-weight: 900 !important;
    cursor: pointer !important;
  }

  .aci-home-root .aci-live-card-actions button:first-child {
    border: 0 !important;
    background: #0b5cff !important;
    color: #ffffff !important;
    box-shadow: 0 14px 28px rgba(11,92,255,.20) !important;
  }

  .aci-home-root .aci-live-card-actions button:last-child {
    border: 1px solid rgba(147, 197, 253, .72) !important;
    background: rgba(255,255,255,.80) !important;
    color: #0b5cff !important;
  }
}

@media (max-width: 390px) {
  .aci-home-root .aci-live-car-card.is-compact {
    min-height: 318px !important;
    padding: 11px !important;
  }

  .aci-home-root .aci-live-card-copy strong {
    font-size: 14.8px !important;
  }

  .aci-home-root .aci-live-card-copy em {
    font-size: 11.8px !important;
  }

  .aci-home-root .aci-live-card-actions button {
    min-height: 35px !important;
    font-size: 12px !important;
  }
}

/* Desktop trending */
@media (min-width: 1181px) {
  .aci-home-root .aci-live-trending.is-desktop {
    margin-top: 16px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-section-head {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;
    margin-bottom: 14px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-grid {
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    gap: 12px !important;
    align-items: stretch !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-car-card {
    min-width: 0 !important;
    border-radius: 22px !important;
    padding: 12px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-car-visual {
    height: 124px !important;
    margin-top: -4px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-copy {
    display: grid !important;
    gap: 2px !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    background: transparent !important;
    color: inherit !important;
    text-align: left !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-copy strong {
    color: #07102b !important;
    font-size: 14px !important;
    line-height: 1.08 !important;
    letter-spacing: -0.025em !important;
    font-weight: 900 !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-copy em {
    display: grid !important;
    color: #0b5cff !important;
    font-size: 12.5px !important;
    line-height: 1.12 !important;
    font-style: normal !important;
    font-weight: 850 !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-copy small {
    color: #07102b !important;
    font-size: 10.5px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-actions {
    display: grid !important;
    gap: 8px !important;
    margin-top: 10px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-actions button {
    min-height: 34px !important;
    border-radius: 999px !important;
    font-size: 12px !important;
    font-weight: 850 !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-actions button:first-child {
    border: 0 !important;
    background: #0b5cff !important;
    color: #ffffff !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-actions button:last-child {
    border: 1px solid rgba(147,197,253,.72) !important;
    background: rgba(255,255,255,.80) !important;
    color: #0b5cff !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-filter-panel {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 22px !important;
    width: 100% !important;
    padding: 0 !important;
    margin-bottom: 14px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-budget-filter,
  .aci-home-root .aci-live-trending.is-desktop .aci-body-filter {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    min-width: 0 !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-filter-chip-row {
    display: flex !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-filter-chip-row button {
    min-height: 28px !important;
    padding: 0 10px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(147, 197, 253, .72) !important;
    background: rgba(255,255,255,.84) !important;
    color: #334155 !important;
    font-size: 10.5px !important;
    font-weight: 760 !important;
    white-space: nowrap !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-filter-chip-row button.is-active {
    border-color: #0b5cff !important;
    background: #0b5cff !important;
    color: #ffffff !important;
  }
}

/* Swipe indicator */
.aci-home-root .aci-live-swipe-indicator {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 7px !important;
  margin: 7px 0 0 !important;
  min-height: 13px !important;
}

.aci-home-root .aci-live-swipe-indicator button {
  position: relative !important;
  width: 7px !important;
  height: 7px !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 999px !important;
  background: rgba(37, 99, 235, .22) !important;
  cursor: pointer !important;
  transition:
    width .34s cubic-bezier(.22, 1, .36, 1),
    background .24s ease,
    box-shadow .24s ease,
    transform .24s ease !important;
}

.aci-home-root .aci-live-swipe-indicator button.is-active {
  width: 30px !important;
  background: linear-gradient(90deg, #2563eb, #0b5cff) !important;
  box-shadow:
    0 8px 18px rgba(37, 99, 235, .24),
    0 0 0 4px rgba(37, 99, 235, .08) !important;
}

.aci-home-root .aci-live-swipe-indicator button span {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Desktop right rail */
@media (min-width: 1181px) {
  .aci-home-root .aci-reference-rail {
    position: sticky !important;
    top: 18px !important;
    display: grid !important;
    gap: 12px !important;
    align-self: start !important;
  }

  .aci-home-root .reference-rail-card {
    position: relative !important;
    overflow: hidden !important;
    border-radius: 24px !important;
    border: 1px solid rgba(203, 213, 225, .82) !important;
    background:
      radial-gradient(circle at 92% 8%, rgba(37, 99, 235, .055), transparent 28%),
      rgba(255,255,255,.92) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.94),
      0 18px 48px rgba(15,23,42,.065) !important;
    backdrop-filter: blur(18px);
  }

  .aci-home-root .aci-rail-recent-card {
    padding: 16px !important;
  }

  .aci-home-root .aci-rail-recent-list {
    display: grid !important;
    gap: 9px !important;
    margin-top: 12px !important;
  }

  .aci-home-root .aci-rail-recent-item {
    width: 100% !important;
    min-height: 80px !important;
    display: grid !important;
    grid-template-columns: 94px minmax(0, 1fr) 15px !important;
    align-items: center !important;
    gap: 9px !important;
    padding: 8px 9px !important;
    border-radius: 17px !important;
    border: 1px solid rgba(203, 213, 225, .78) !important;
    background:
      radial-gradient(circle at 24% 44%, rgba(219, 234, 254, .58), transparent 40%),
      rgba(255,255,255,.86) !important;
    color: #0f172a !important;
    text-align: left !important;
    cursor: pointer !important;
    overflow: hidden !important;
  }

  .aci-home-root .aci-rail-recent-visual {
    width: 94px !important;
    height: 64px !important;
    border-radius: 14px !important;
  }

  .aci-home-root .aci-rail-recent-copy {
    min-width: 0 !important;
    display: grid !important;
    gap: 2px !important;
  }

  .aci-home-root .aci-rail-recent-copy strong {
    color: #0f172a !important;
    font-size: 12.5px !important;
    line-height: 1.12 !important;
    letter-spacing: -.025em !important;
    font-weight: 880 !important;
    overflow: hidden !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
  }

  .aci-home-root .aci-rail-recent-copy em {
    color: #0b5cff !important;
    font-size: 11.5px !important;
    line-height: 1.1 !important;
    font-style: normal !important;
    font-weight: 850 !important;
    overflow: hidden !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
  }

  .aci-home-root .aci-rail-recent-copy small {
    color: #64748b !important;
    font-size: 10.5px !important;
    font-weight: 700 !important;
  }
}

/* Skeleton */
.aci-home-root .desktop-car-card-skeleton,
.aci-home-root .mobile-car-card-skeleton {
  pointer-events: none;
  background:
    radial-gradient(circle at 10% 10%, rgba(219, 234, 254, .55), transparent 18%),
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.95)) !important;
  border-color: rgba(147, 197, 253, .55) !important;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-token,
.aci-home-root .desktop-car-card-skeleton .skeleton-heart,
.aci-home-root .desktop-car-card-skeleton .skeleton-car-visual,
.aci-home-root .desktop-car-card-skeleton .skeleton-line,
.aci-home-root .desktop-car-card-skeleton .desktop-car-specs span,
.aci-home-root .mobile-car-card-skeleton .skeleton-heart,
.aci-home-root .mobile-car-card-skeleton .skeleton-car-visual,
.aci-home-root .mobile-car-card-skeleton .skeleton-line {
  position: relative;
  overflow: hidden;
  color: transparent !important;
  background: linear-gradient(90deg, #dbeafe 0%, #f8fbff 46%, #d7e6ff 78%) !important;
  background-size: 220% 100% !important;
  animation: aciHomeSkeletonPulse 1.35s ease-in-out infinite;
}

@keyframes aciHomeSkeletonPulse {
  0% { background-position: 120% 0; opacity: .72; }
  50% { opacity: 1; }
  100% { background-position: -120% 0; opacity: .72; }
}

@media (prefers-reduced-motion: reduce) {
  .aci-home-root *,
  .aci-home-root *::before,
  .aci-home-root *::after {
    animation: none !important;
    transition: none !important;
  }
}

/* ACI_HOME_REPLACEMENT_PRODUCTION_V2_END */


/* ACI_HOME_FINAL_VISUAL_POLISH_START */

/* 1) Remove desktop hero badge: "Trending right now · April 2026" */
@media (min-width: 1181px) {
  .aci-home-root .desktop-hero-copy > small {
    display: none !important;
  }
}

/* 2) Reduce hero height and remove dead empty space */
@media (max-width: 1180px) {
  .aci-home-root .mobile-hero {
    min-height: 248px !important;
    padding: 24px 22px 22px !important;
    margin-bottom: 12px !important;
    border-radius: 27px !important;
  }

  .aci-home-root .mobile-hero-copy {
    max-width: 62% !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 34px !important;
    line-height: .92 !important;
    letter-spacing: -.052em !important;
  }

  .aci-home-root .mobile-hero-copy p {
    margin-top: 11px !important;
    font-size: 13px !important;
    line-height: 1.32 !important;
  }

  .aci-home-root .mobile-hero-copy button {
    margin-top: 13px !important;
    min-height: 42px !important;
    min-width: 188px !important;
    padding: 0 16px !important;
    font-size: 13px !important;
    font-weight: 760 !important;
  }

  .aci-home-root .mobile-hero-copy small {
    margin-top: 11px !important;
    font-size: 11.5px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: 4px !important;
    width: 156px !important;
    height: 156px !important;
    margin-top: -78px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero {
    min-height: 238px !important;
    padding: 22px 20px 20px !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 31px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    font-size: 12.2px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: -14px !important;
    width: 144px !important;
    height: 144px !important;
    margin-top: -72px !important;
  }
}

@media (min-width: 1181px) {
  .aci-home-root .desktop-hero {
    min-height: 250px !important;
    padding: 26px 32px !important;
  }

  .aci-home-root .desktop-hero-copy h1 {
    font-size: clamp(28px, 2.1vw, 38px) !important;
    line-height: 1.02 !important;
  }

  .aci-home-root .desktop-hero-copy p {
    margin-top: 9px !important;
    max-width: 680px !important;
    line-height: 1.48 !important;
  }

  .aci-home-root .desktop-prompt-grid {
    margin-top: 18px !important;
  }
}

/* 3) Shortcut/action pills: slightly lighter font and icons */
@media (max-width: 1180px) {
  .aci-home-root .mobile-shortcuts button {
    min-height: 66px !important;
    height: 66px !important;
    padding: 10px 11px !important;
    gap: 8px !important;
  }

  .aci-home-root .mobile-shortcuts button svg {
    width: 21px !important;
    height: 21px !important;
    stroke-width: 1.75 !important;
  }

  .aci-home-root .mobile-shortcuts button span {
    font-size: 12.7px !important;
    line-height: 1.08 !important;
    font-weight: 760 !important;
    letter-spacing: -.015em !important;
  }
}

@media (min-width: 1181px) {
  .aci-home-root .desktop-prompt-grid button,
  .aci-home-root .desktop-quick-grid button {
    border: 1px solid rgba(203, 213, 225, .86) !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,251,255,.92)) !important;
    box-shadow: 0 12px 28px rgba(15,23,42,.045) !important;
  }

  .aci-home-root .desktop-prompt-grid button {
    min-height: 40px !important;
    border-radius: 13px !important;
    gap: 8px !important;
  }

  .aci-home-root .desktop-prompt-grid button span {
    font-size: 12px !important;
    font-weight: 720 !important;
    line-height: 1.15 !important;
  }

  .aci-home-root .desktop-quick-grid button {
    min-height: 72px !important;
    border-radius: 17px !important;
    padding: 12px 14px !important;
  }

  .aci-home-root .desktop-quick-grid button > span {
    width: 40px !important;
    height: 40px !important;
    border-radius: 15px !important;
    background: #f5f8ff !important;
    border: 1px solid rgba(203,213,225,.86) !important;
    color: #0b5cff !important;
    box-shadow: none !important;
  }

  .aci-home-root .desktop-quick-grid svg,
  .aci-home-root .desktop-prompt-grid svg {
    stroke-width: 1.75 !important;
  }

  .aci-home-root .desktop-quick-grid strong {
    font-size: 13px !important;
    font-weight: 760 !important;
    line-height: 1.15 !important;
  }

  .aci-home-root .desktop-quick-grid p {
    margin-top: 3px !important;
    font-size: 11.5px !important;
    line-height: 1.22 !important;
  }
}

/* 4) Headings: reduce size, remove continue icon, improve trending icon */
.aci-home-root .aci-lively-section-title.is-continue {
  gap: 0 !important;
}

@media (max-width: 1180px) {
  .aci-home-root .aci-continue-exploring .aci-lively-section-title.is-continue {
    font-size: 23px !important;
    line-height: 1 !important;
    letter-spacing: -.045em !important;
  }

  .aci-home-root .aci-live-section-head .aci-lively-section-title {
    font-size: 24px !important;
    line-height: .98 !important;
    letter-spacing: -.045em !important;
    max-width: 250px !important;
  }
}

@media (min-width: 1181px) {
  .aci-home-root .aci-live-section-head .aci-lively-section-title {
    font-size: 30px !important;
    line-height: 1 !important;
    letter-spacing: -.045em !important;
  }

  .aci-home-root .aci-lively-rail-title {
    font-size: 15px !important;
    font-weight: 760 !important;
    letter-spacing: -.02em !important;
  }
}

.aci-home-root .aci-trending-premium-icon {
  width: 34px !important;
  height: 34px !important;
  flex: 0 0 34px !important;
  border-radius: 14px !important;
  display: grid !important;
  place-items: center !important;
  color: #f97316 !important;
  background:
    radial-gradient(circle at 35% 25%, #fff 0%, #fff7ed 58%, #ffedd5 100%) !important;
  border: 1px solid rgba(251, 146, 60, .55) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.95),
    0 10px 22px rgba(249,115,22,.12) !important;
}

.aci-home-root .aci-trending-premium-icon svg {
  stroke-width: 1.8 !important;
}

/* 5) Trending filter spacing */
.aci-home-root .aci-live-filter-panel {
  margin-top: 8px !important;
}

@media (max-width: 1180px) {
  .aci-home-root .aci-live-filter-panel {
    gap: 10px !important;
    margin-bottom: 16px !important;
  }

  .aci-home-root .aci-budget-filter,
  .aci-home-root .aci-body-filter {
    gap: 7px !important;
  }

  .aci-home-root .aci-budget-filter > span,
  .aci-home-root .aci-body-filter > span {
    margin-bottom: 1px !important;
    font-size: 9.2px !important;
    letter-spacing: .08em !important;
  }

  .aci-home-root .aci-filter-chip-row {
    gap: 6px !important;
  }

  .aci-home-root .aci-filter-chip-row button {
    min-height: 28px !important;
    padding: 0 9px !important;
    border-radius: 999px !important;
    font-size: 10px !important;
    font-weight: 680 !important;
  }
}

@media (min-width: 1181px) {
  .aci-home-root .aci-live-trending.is-desktop .aci-live-filter-panel {
    gap: 18px !important;
    margin: 12px 0 18px !important;
    padding: 0 !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-budget-filter,
  .aci-home-root .aci-live-trending.is-desktop .aci-body-filter {
    gap: 8px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-filter-chip-row {
    gap: 7px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-filter-chip-row button {
    min-height: 29px !important;
    padding: 0 11px !important;
    font-size: 10.5px !important;
    font-weight: 650 !important;
  }
}

/* 6) Trending cards: reduce height, fix spacing and button weight */
.aci-home-root .aci-live-card-copy {
  display: grid !important;
  gap: 3px !important;
  text-align: left !important;
}

.aci-home-root .aci-live-card-copy strong,
.aci-home-root .aci-live-card-copy em,
.aci-home-root .aci-live-card-copy small {
  display: block !important;
}

.aci-home-root .aci-live-card-copy em {
  font-style: normal !important;
}

.aci-home-root .aci-live-card-actions {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 8px !important;
}

.aci-home-root .aci-live-card-actions button {
  letter-spacing: 0 !important;
  font-weight: 720 !important;
}

@media (max-width: 1180px) {
  .aci-home-root .aci-live-car-card.is-compact {
    min-height: 292px !important;
    padding: 11px !important;
    border-radius: 22px !important;
  }

  .aci-home-root .aci-live-car-card.is-compact .aci-live-car-visual {
    height: 116px !important;
    margin: 0 0 6px !important;
  }

  .aci-home-root .aci-live-card-copy {
    gap: 3px !important;
    min-height: 58px !important;
  }

  .aci-home-root .aci-live-card-copy strong {
    font-size: 15px !important;
    line-height: 1.08 !important;
    font-weight: 820 !important;
  }

  .aci-home-root .aci-live-card-copy em {
    font-size: 12.6px !important;
    line-height: 1.08 !important;
    font-weight: 760 !important;
  }

  .aci-home-root .aci-live-card-copy small {
    margin-top: 2px !important;
    font-size: 10.6px !important;
    line-height: 1.08 !important;
    font-weight: 680 !important;
  }

  .aci-home-root .aci-live-card-actions {
    margin-top: 9px !important;
  }

  .aci-home-root .aci-live-card-actions button {
    min-height: 34px !important;
    font-size: 12.5px !important;
    font-weight: 720 !important;
  }

  .aci-home-root .aci-live-mobile-track {
    padding-bottom: 6px !important;
  }
}

@media (min-width: 1181px) {
  .aci-home-root .aci-live-trending.is-desktop .aci-live-car-card {
    padding: 11px !important;
    min-height: 292px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-car-visual {
    height: 112px !important;
    margin: 0 0 6px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-copy {
    gap: 3px !important;
    min-height: 54px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-copy strong {
    font-size: 13.5px !important;
    line-height: 1.1 !important;
    font-weight: 780 !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-copy em {
    font-size: 12px !important;
    line-height: 1.1 !important;
    font-weight: 720 !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-copy small {
    font-size: 10.5px !important;
    line-height: 1.1 !important;
    margin-top: 2px !important;
    font-weight: 650 !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-actions {
    margin-top: 8px !important;
  }

  .aci-home-root .aci-live-trending.is-desktop .aci-live-card-actions button {
    min-height: 32px !important;
    font-size: 11.5px !important;
    font-weight: 700 !important;
  }
}

/* 7) Restore desktop right rail cards */
@media (min-width: 1181px) {
  .aci-home-root .aci-reference-rail {
    display: grid !important;
    gap: 14px !important;
    position: sticky !important;
    top: 18px !important;
    align-self: start !important;
  }

  .aci-home-root .reference-rail-card {
    border-radius: 24px !important;
    border: 1px solid rgba(203, 213, 225, .84) !important;
    background:
      radial-gradient(circle at 90% 8%, rgba(37,99,235,.06), transparent 30%),
      rgba(255,255,255,.94) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.92),
      0 18px 44px rgba(15,23,42,.06) !important;
    padding: 16px !important;
    overflow: hidden !important;
  }

  .aci-home-root .reference-rail-heading,
  .aci-home-root .reference-rail-head-row {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    margin-bottom: 12px !important;
  }

  .aci-home-root .reference-rail-mini-icon {
    width: 30px !important;
    height: 30px !important;
    border-radius: 12px !important;
    display: grid !important;
    place-items: center !important;
    color: #0b5cff !important;
    background: #f3f7ff !important;
    border: 1px solid rgba(147,197,253,.62) !important;
  }

  .aci-home-root .reference-rail-card h3 {
    margin: 0 !important;
    color: #0f172a !important;
    font-size: 15px !important;
    line-height: 1.08 !important;
    font-weight: 780 !important;
    letter-spacing: -.02em !important;
  }

  .aci-home-root .reference-asks-list,
  .aci-home-root .reference-help-list {
    display: grid !important;
    gap: 8px !important;
  }

  .aci-home-root .reference-asks-list button {
    min-height: 38px !important;
    width: 100% !important;
    display: grid !important;
    grid-template-columns: 24px minmax(0, 1fr) 14px !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 7px 8px !important;
    border: 1px solid transparent !important;
    border-radius: 13px !important;
    background: transparent !important;
    color: #334155 !important;
    text-align: left !important;
  }

  .aci-home-root .reference-asks-list button:hover {
    background: #f8fbff !important;
    border-color: rgba(147,197,253,.54) !important;
  }

  .aci-home-root .reference-asks-list button > span {
    width: 24px !important;
    height: 24px !important;
    border-radius: 999px !important;
    display: grid !important;
    place-items: center !important;
    color: #0b5cff !important;
    background: #eef5ff !important;
    font-size: 11px !important;
    font-weight: 800 !important;
  }

  .aci-home-root .reference-asks-list strong {
    font-size: 12px !important;
    line-height: 1.25 !important;
    font-weight: 700 !important;
  }

  .aci-home-root .reference-rail-link {
    margin-top: 12px !important;
    min-height: 34px !important;
    border-radius: 12px !important;
    border: 1px solid rgba(147,197,253,.54) !important;
    background: #f8fbff !important;
    color: #0b5cff !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
    font-size: 12px !important;
    font-weight: 760 !important;
  }

  .aci-home-root .reference-help-list button {
    min-height: 36px !important;
    display: grid !important;
    grid-template-columns: 16px minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 8px !important;
    border-radius: 12px !important;
    border: 1px solid rgba(226,232,240,.86) !important;
    background: #fff !important;
    color: #334155 !important;
    text-align: left !important;
    font-size: 12px !important;
    font-weight: 680 !important;
  }

  .aci-home-root .reference-help-list svg {
    color: #0b5cff !important;
    stroke-width: 1.8 !important;
  }

  .aci-home-root .reference-tour-card {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 58px !important;
    align-items: center !important;
    gap: 14px !important;
  }

  .aci-home-root .reference-tour-card p {
    margin: 7px 0 0 !important;
    color: #64748b !important;
    font-size: 12px !important;
    line-height: 1.38 !important;
  }

  .aci-home-root .reference-tour-card button {
    margin-top: 11px !important;
    border: 0 !important;
    background: transparent !important;
    color: #0b5cff !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 0 !important;
    font-size: 12px !important;
    font-weight: 760 !important;
  }

  .aci-home-root .reference-tour-map {
    width: 58px !important;
    height: 58px !important;
    border-radius: 20px !important;
    background:
      radial-gradient(circle at 50% 50%, rgba(11,92,255,.10), transparent 54%),
      #f5f8ff !important;
    color: #0b5cff !important;
    display: grid !important;
    place-items: center !important;
  }
}

/* ACI_HOME_FINAL_VISUAL_POLISH_END */



/* ACI_HOME_MOBILE_HERO_LOGO_HEADING_FINAL_START */

@media (max-width: 1180px) {
  .aci-home-root .mobile-header {
    margin-bottom: 12px !important;
  }
}

/* Compact hero, no large dead area */
@media (max-width: 1180px) {
  .aci-home-root .mobile-hero {
    min-height: 244px !important;
    padding: 22px 22px 20px !important;
    margin-bottom: 12px !important;
    border-radius: 26px !important;
    overflow: hidden !important;
  }

  .aci-home-root .mobile-hero-copy {
    max-width: 62% !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 32px !important;
    line-height: .92 !important;
    letter-spacing: -.052em !important;
    margin: 0 !important;
  }

  .aci-home-root .mobile-hero-copy p {
    margin-top: 10px !important;
    font-size: 12.4px !important;
    line-height: 1.32 !important;
    font-weight: 560 !important;
  }

  .aci-home-root .mobile-hero-copy button {
    width: max-content !important;
    min-width: 182px !important;
    max-width: 100% !important;
    min-height: 40px !important;
    margin-top: 12px !important;
    padding: 0 15px !important;
    font-size: 12.3px !important;
    font-weight: 760 !important;
    white-space: nowrap !important;
  }

  .aci-home-root .mobile-hero-copy small {
    margin-top: 10px !important;
    font-size: 11px !important;
    line-height: 1.2 !important;
    font-weight: 700 !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    top: 50% !important;
    right: 6px !important;
    width: 148px !important;
    height: 148px !important;
    margin-top: -74px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero {
    min-height: 232px !important;
    padding: 20px 19px 18px !important;
  }

  .aci-home-root .mobile-hero-copy {
    max-width: 64% !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 29px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    font-size: 11.6px !important;
  }

  .aci-home-root .mobile-hero-copy button {
    min-width: 168px !important;
    min-height: 38px !important;
    font-size: 11.5px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: -12px !important;
    width: 136px !important;
    height: 136px !important;
    margin-top: -68px !important;
  }
}

/* Continue exploring heading: smaller, no icon */
.aci-home-root .aci-lively-section-title.is-continue,
.aci-home-root .aci-lively-rail-title {
  display: block !important;
  gap: 0 !important;
}

@media (max-width: 1180px) {
  .aci-home-root .aci-continue-exploring .aci-lively-section-title.is-continue {
    font-size: 22px !important;
    line-height: 1 !important;
    letter-spacing: -.043em !important;
    font-weight: 900 !important;
  }

  .aci-home-root .aci-continue-exploring .section-head {
    margin-bottom: 12px !important;
  }
}

@media (min-width: 1181px) {
  .aci-home-root .aci-lively-rail-title {
    font-size: 15px !important;
    line-height: 1.05 !important;
    letter-spacing: -.02em !important;
    font-weight: 780 !important;
  }
}

/* Trending title: smaller with cleaner premium icon */
.aci-home-root .aci-premium-trend-icon {
  width: 31px !important;
  height: 31px !important;
  flex: 0 0 31px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 13px !important;
  color: #0b5cff !important;
  background:
    radial-gradient(circle at 35% 25%, #ffffff 0%, #f5f8ff 55%, #eaf2ff 100%) !important;
  border: 1px solid rgba(147, 197, 253, .68) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.96),
    0 10px 22px rgba(37, 99, 235, .12) !important;
}

.aci-home-root .aci-premium-trend-icon svg {
  stroke-width: 1.85 !important;
}

@media (max-width: 1180px) {
  .aci-home-root .aci-live-section-head .aci-lively-section-title {
    font-size: 23px !important;
    line-height: .98 !important;
    letter-spacing: -.043em !important;
    max-width: 245px !important;
    gap: 9px !important;
  }

  .aci-home-root .aci-live-section-head {
    margin-bottom: 13px !important;
  }

  .aci-home-root .aci-live-section-head > button {
    font-size: 12px !important;
    font-weight: 760 !important;
  }
}

@media (min-width: 1181px) {
  .aci-home-root .aci-live-section-head .aci-lively-section-title {
    font-size: 29px !important;
    line-height: 1 !important;
    letter-spacing: -.043em !important;
    gap: 10px !important;
  }
}

/* Hide desktop hero dynamic badge */
@media (min-width: 1181px) {
  .aci-home-root .desktop-hero-copy > small {
    display: none !important;
  }
}

/* ACI_HOME_MOBILE_HERO_LOGO_HEADING_FINAL_END */



/* ACI_HOME_HERO_SUBTITLE_WIDTH_FIX_START */

/*
  The subtitle was wrapping too early because the whole copy column was narrow.
  This lets the subtitle use more horizontal space while keeping the orb on the right.
*/

@media (max-width: 1180px) {
  .aci-home-root .mobile-hero {
    min-height: 224px !important;
    padding: 21px 21px 18px !important;
  }

  .aci-home-root .mobile-hero-copy {
    max-width: none !important;
    width: 72% !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    max-width: 205px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    width: min(276px, calc(100vw - 150px)) !important;
    max-width: none !important;
    margin-top: 9px !important;
    font-size: 12.4px !important;
    line-height: 1.28 !important;
  }

  .aci-home-root .mobile-hero-copy button {
    margin-top: 11px !important;
  }

  .aci-home-root .mobile-hero-copy small {
    margin-top: 9px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: -8px !important;
    width: 142px !important;
    height: 142px !important;
    margin-top: -65px !important;
  }
}

@media (max-width: 430px) {
  .aci-home-root .mobile-hero {
    min-height: 218px !important;
    padding: 20px 20px 17px !important;
  }

  .aci-home-root .mobile-hero-copy {
    width: 74% !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    max-width: 190px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    width: min(252px, calc(100vw - 142px)) !important;
    font-size: 12px !important;
    line-height: 1.27 !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: -16px !important;
    width: 136px !important;
    height: 136px !important;
    margin-top: -62px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero {
    min-height: 212px !important;
    padding: 19px 18px 16px !important;
  }

  .aci-home-root .mobile-hero-copy {
    width: 76% !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    max-width: 172px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    width: min(226px, calc(100vw - 126px)) !important;
    font-size: 11.5px !important;
    line-height: 1.26 !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: -24px !important;
    width: 126px !important;
    height: 126px !important;
    margin-top: -58px !important;
  }
}

/* ACI_HOME_HERO_SUBTITLE_WIDTH_FIX_END */



/* ACI_HOME_MOBILE_HERO_TIGHT_FINAL_START */

/*
  Final mobile hero/title tuning:
  - One Bot Solution stays in one line.
  - Subtitle breaks after exactly 5 words.
  - Orb remains fully visible inside the hero card.
  - Continue Exploring and Trending headings are smaller.
*/

@media (max-width: 1180px) {
  .aci-home-root .mobile-hero {
    min-height: 202px !important;
    padding: 20px 20px 18px !important;
    margin-bottom: 12px !important;
    border-radius: 25px !important;
  }

  .aci-home-root .mobile-hero-copy {
    width: 100% !important;
    max-width: none !important;
    position: relative !important;
    z-index: 2 !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    display: block !important;
    width: max-content !important;
    max-width: 100% !important;
    margin: 0 !important;
    white-space: nowrap !important;
    font-size: 30px !important;
    line-height: .96 !important;
    letter-spacing: -0.052em !important;
  }

  .aci-home-root .mobile-hero-copy p {
    width: 232px !important;
    max-width: calc(100% - 118px) !important;
    margin-top: 9px !important;
    font-size: 12px !important;
    line-height: 1.25 !important;
    font-weight: 560 !important;
  }

  .aci-home-root .mobile-hero-copy p span {
    display: block !important;
  }

  .aci-home-root .mobile-hero-copy p span:first-child {
    white-space: nowrap !important;
  }

  .aci-home-root .mobile-hero-copy button {
    min-width: 174px !important;
    min-height: 38px !important;
    margin-top: 10px !important;
    padding: 0 14px !important;
    font-size: 11.8px !important;
    font-weight: 740 !important;
  }

  .aci-home-root .mobile-hero-copy small {
    margin-top: 9px !important;
    font-size: 10.8px !important;
    line-height: 1.15 !important;
    font-weight: 680 !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    top: 50% !important;
    right: 14px !important;
    width: 122px !important;
    height: 122px !important;
    margin-top: -56px !important;
    opacity: .96 !important;
  }

  .aci-home-root .mobile-hero-orb {
    width: 100% !important;
    height: 100% !important;
  }

  .aci-home-root .mobile-hero-orb > * {
    width: 100% !important;
    height: 100% !important;
  }

  .aci-home-root .aci-continue-exploring .aci-lively-section-title.is-continue {
    font-size: 20px !important;
    line-height: 1 !important;
    letter-spacing: -0.04em !important;
    font-weight: 850 !important;
  }

  .aci-home-root .aci-live-section-head .aci-lively-section-title {
    font-size: 20px !important;
    line-height: 1 !important;
    letter-spacing: -0.04em !important;
    font-weight: 850 !important;
    max-width: 220px !important;
  }

  .aci-home-root .aci-premium-trend-icon,
  .aci-home-root .aci-trending-premium-icon {
    width: 28px !important;
    height: 28px !important;
    flex-basis: 28px !important;
    border-radius: 12px !important;
  }
}

@media (max-width: 430px) {
  .aci-home-root .mobile-hero {
    min-height: 196px !important;
    padding: 19px 18px 17px !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 28px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    width: 224px !important;
    max-width: calc(100% - 108px) !important;
    font-size: 11.5px !important;
    line-height: 1.24 !important;
  }

  .aci-home-root .mobile-hero-copy button {
    min-width: 164px !important;
    min-height: 36px !important;
    font-size: 11.2px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: 10px !important;
    width: 112px !important;
    height: 112px !important;
    margin-top: -51px !important;
  }

  .aci-home-root .aci-continue-exploring .aci-lively-section-title.is-continue,
  .aci-home-root .aci-live-section-head .aci-lively-section-title {
    font-size: 19px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero {
    min-height: 190px !important;
    padding: 18px 16px 16px !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 25.5px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    width: 205px !important;
    max-width: calc(100% - 96px) !important;
    font-size: 10.8px !important;
  }

  .aci-home-root .mobile-hero-copy button {
    min-width: 150px !important;
    min-height: 34px !important;
    font-size: 10.6px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: 7px !important;
    width: 100px !important;
    height: 100px !important;
    margin-top: -46px !important;
  }

  .aci-home-root .aci-continue-exploring .aci-lively-section-title.is-continue,
  .aci-home-root .aci-live-section-head .aci-lively-section-title {
    font-size: 18px !important;
  }
}

/* ACI_HOME_MOBILE_HERO_TIGHT_FINAL_END */



/* ACI_HOME_HERO_SUBTITLE_BAD_WRAP_FIX_START */

/*
  Fixes the bad subtitle wrap caused by the previous width rule.
  First line remains 5 words.
  Second line gets enough width and does not break into tiny fragments.
*/

@media (max-width: 1180px) {
  .aci-home-root .mobile-hero {
    min-height: 198px !important;
    padding: 20px 20px 17px !important;
  }

  .aci-home-root .mobile-hero-copy {
    width: 100% !important;
    max-width: none !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    white-space: nowrap !important;
    width: max-content !important;
    max-width: 100% !important;
  }

  .aci-home-root .mobile-hero-copy p {
    width: max-content !important;
    max-width: calc(100% - 18px) !important;
    margin-top: 8px !important;
    font-size: 11.35px !important;
    line-height: 1.28 !important;
    font-weight: 560 !important;
    position: relative !important;
    z-index: 3 !important;
  }

  .aci-home-root .mobile-hero-copy p span {
    display: block !important;
    white-space: nowrap !important;
  }

  .aci-home-root .mobile-hero-copy button {
    margin-top: 10px !important;
  }

  .aci-home-root .mobile-hero-copy small {
    margin-top: 8px !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: 8px !important;
    width: 118px !important;
    height: 118px !important;
    margin-top: -54px !important;
    z-index: 1 !important;
  }
}

@media (max-width: 430px) {
  .aci-home-root .mobile-hero {
    min-height: 194px !important;
    padding: 19px 18px 16px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    font-size: 10.95px !important;
    max-width: calc(100% - 6px) !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: 6px !important;
    width: 108px !important;
    height: 108px !important;
    margin-top: -50px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero {
    min-height: 188px !important;
    padding: 18px 16px 15px !important;
  }

  .aci-home-root .mobile-hero-copy p {
    font-size: 10px !important;
    max-width: 100% !important;
  }

  .aci-home-root .mobile-hero-orb-shell {
    right: 4px !important;
    width: 98px !important;
    height: 98px !important;
    margin-top: -46px !important;
  }
}

/* ACI_HOME_HERO_SUBTITLE_BAD_WRAP_FIX_END */

/* HERO_ORB_ONLY_POSITION_FIX_START */

@media (max-width: 1180px) {
  .aci-home-root .mobile-hero-orb-shell {
    position: absolute !important;
    top: 58% !important;
    right: 18px !important;
    width: 138px !important;
    height: 138px !important;
    margin: 0 !important;
    transform: translateY(-50%) !important;
    display: grid !important;
    place-items: center !important;
    z-index: 1 !important;
    opacity: .96 !important;
    pointer-events: none !important;
  }

  .aci-home-root .mobile-hero-orb {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    display: grid !important;
    place-items: center !important;
    pointer-events: none !important;
  }

  .aci-home-root .mobile-hero-orb > * {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
  }
}

@media (max-width: 430px) {
  .aci-home-root .mobile-hero-orb-shell {
    top: 59% !important;
    right: 40px !important;
    width: 126px !important;
    height: 126px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero-orb-shell {
    top: 55% !important;
    right: 60px !important;
    width: 100px !important;
    height: 100px !important;
  }
}

/* HERO_ORB_ONLY_POSITION_FIX_END */

/* -------------------------------------------------------------------------- */
/* MOBILE HERO FINAL TUNING                                                   */
/* -------------------------------------------------------------------------- */

@media (max-width: 1180px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    position: relative !important;
    min-height: 390px !important;
    margin: 4px 0 6px !important;
    padding: 18px 16px 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background:
      radial-gradient(circle at 50% 43%, rgba(224, 238, 255, 0.74), rgba(255,255,255,0) 46%),
      radial-gradient(circle at 50% 69%, rgba(48, 136, 255, 0.18), rgba(255,255,255,0) 30%),
      radial-gradient(circle at 50% 82%, rgba(38, 125, 255, 0.13), rgba(255,255,255,0) 22%),
      linear-gradient(180deg, #ffffff 0%, #f8fbff 62%, #ffffff 100%) !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  .aci-home-root .mobile-hero-bg {
    position: absolute !important;
    inset: 0 !important;
    z-index: 0 !important;
    pointer-events: none !important;
  }

  .aci-home-root .hero-bg-orbit {
    position: absolute !important;
    left: 50% !important;
    top: 57% !important;
    width: 326px !important;
    height: 82px !important;
    border-radius: 50% !important;
    border: 1px solid rgba(88, 148, 255, 0.34) !important;
    transform: translate(-50%, -50%) rotate(2deg) !important;
  }

  .aci-home-root .hero-bg-orbit.orbit-2 {
    width: 360px !important;
    height: 102px !important;
    border-color: rgba(100, 160, 255, 0.21) !important;
    transform: translate(-50%, -50%) rotate(-10deg) !important;
  }

  .aci-home-root .hero-bg-dot {
    position: absolute !important;
    width: 7px !important;
    height: 7px !important;
    border-radius: 999px !important;
    background: #77b6ff !important;
    box-shadow: 0 0 12px rgba(56, 142, 255, 0.5) !important;
    opacity: 0.8 !important;
  }

  .aci-home-root .hero-bg-dot.dot-1 {
    left: 16% !important;
    top: 43% !important;
  }

  .aci-home-root .hero-bg-dot.dot-2 {
    right: 17% !important;
    top: 42% !important;
  }

  .aci-home-root .hero-bg-dot.dot-3 {
    left: 29% !important;
    top: 56% !important;
    width: 4px !important;
    height: 4px !important;
  }

  .aci-home-root .hero-bg-dot.dot-4 {
    right: 25% !important;
    top: 56% !important;
    width: 5px !important;
    height: 5px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy {
    position: relative !important;
    z-index: 4 !important;
    max-width: 100% !important;
    width: 100% !important;
    text-align: center !important;
    margin: 0 auto !important;
    overflow: visible !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy h1 {
    width: 100% !important;
    max-width: 390px !important;
    margin: 0 auto !important;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: 32px !important;
    line-height: 0.98 !important;
    letter-spacing: -0.055em !important;
    color: #07102b !important;
    font-weight: 900 !important;
    white-space: normal !important;
    overflow: visible !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy h1 span {
    display: block !important;
    color: #0b5cff !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p {
    margin: 12px auto 0 !important;
    color: #536079 !important;
    font-size: 15px !important;
    line-height: 1.26 !important;
    font-weight: 520 !important;
    letter-spacing: -0.012em !important;
  }

  /* Orb moved up so the top rings sit behind the heading/subtitle area */
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    position: absolute !important;
    left: 50% !important;
    top: 146px !important;
    width: 336px !important;
    height: 258px !important;
    margin: 0 !important;
    transform: translateX(-50%) !important;
    display: grid !important;
    place-items: center !important;
    z-index: 2 !important;
    opacity: 1 !important;
    pointer-events: none !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb {
    position: relative !important;
    width: 330px !important;
    height: 252px !important;
    display: grid !important;
    place-items: center !important;
    transform-origin: center center !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 330px !important;
    height: 252px !important;
  }

  /* Keep the hero chat/search bar removed */
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-search {
    display: none !important;
  }
}

@media (max-width: 390px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    min-height: 374px !important;
    padding-top: 16px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy h1 {
    font-size: 29px !important;
    max-width: 345px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p {
    font-size: 13.8px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    top: 138px !important;
    width: 306px !important;
    height: 236px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 306px !important;
    height: 236px !important;
  }
}

/* -------------------------------------------------------------------------- */
/* MOBILE HERO SPACING TIGHTENING                                             */
/* -------------------------------------------------------------------------- */

@media (max-width: 1180px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    min-height: 334px !important;
    margin: 4px 0 0 !important;
    padding: 16px 16px 0 !important;
    overflow: hidden !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy {
    z-index: 5 !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy h1 {
    max-width: 410px !important;
    font-size: 32px !important;
    line-height: 0.96 !important;
    white-space: normal !important;
    overflow: visible !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy h1 span {
    display: block !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p {
    margin-top: 9px !important;
    font-size: 14.7px !important;
    line-height: 1.22 !important;
  }

  /* Move orb up. Top rings now sit behind the heading/subtitle area. */
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    top: 104px !important;
    width: 326px !important;
    height: 246px !important;
    z-index: 2 !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 326px !important;
    height: 246px !important;
  }

  /* Make background rings line up with the higher orb */
  .aci-home-root .hero-bg-orbit {
    top: 48% !important;
    width: 326px !important;
    height: 80px !important;
  }

  .aci-home-root .hero-bg-orbit.orbit-2 {
    top: 48% !important;
    width: 356px !important;
    height: 98px !important;
  }

  .aci-home-root .hero-bg-dot.dot-1 {
    top: 38% !important;
  }

  .aci-home-root .hero-bg-dot.dot-2 {
    top: 37% !important;
  }

  .aci-home-root .hero-bg-dot.dot-3,
  .aci-home-root .hero-bg-dot.dot-4 {
    top: 51% !important;
  }

  /* Start pills almost immediately after orb area */
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts {
    margin: -4px 0 18px !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px 12px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button {
    min-height: 54px !important;
    height: 54px !important;
    padding: 10px 15px !important;
    gap: 9px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button svg {
    width: 18px !important;
    height: 18px !important;
    flex: 0 0 18px !important;
    color: #0b5cff !important;
    stroke-width: 2 !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button span {
    font-size: 13.8px !important;
    font-weight: 700 !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-1 svg,
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-2 svg,
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-3 svg,
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-4 svg {
    color: #0b5cff !important;
  }
}

@media (max-width: 390px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    min-height: 318px !important;
    padding-top: 14px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy h1 {
    max-width: 350px !important;
    font-size: 29px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p {
    font-size: 13.4px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    top: 100px !important;
    width: 300px !important;
    height: 226px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 300px !important;
    height: 226px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts {
    margin-top: -2px !important;
    gap: 8px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button {
    min-height: 50px !important;
    height: 50px !important;
    padding: 9px 11px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button span {
    font-size: 12.5px !important;
    font-weight: 680 !important;
  }
}
 /* -------------------------------------------------------------------------- */
/* MOBILE SHORTCUT PILLS FINAL TUNING                                         */
/* -------------------------------------------------------------------------- */

@media (max-width: 1180px) {
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px 12px !important;
    margin: 0 0 18px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button {
    min-height: 54px !important;
    height: 54px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 9px !important;
    padding: 10px 14px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(203, 213, 225, 0.88) !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.94)) !important;
    box-shadow: 0 10px 24px rgba(15,23,42,0.05) !important;
    color: #07102b !important;
    overflow: hidden !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button svg {
    width: 18px !important;
    height: 18px !important;
    flex: 0 0 18px !important;
    stroke-width: 1.9 !important;
    filter: none !important;
    color: #0b5cff !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button span {
    display: block !important;
    min-width: 0 !important;
    color: #07102b !important;
    font-size: 13.4px !important;
    line-height: 1.05 !important;
    letter-spacing: -0.018em !important;
    font-weight: 690 !important;
    text-align: left !important;
    white-space: nowrap !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-1 svg {
    color: #0b5cff !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-2 svg {
    color: #2563eb !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-3 svg {
    color: #7c3aed !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-4 svg {
    color: #0ea5e9 !important;
  }
}

@media (max-width: 390px) {
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts {
    gap: 8px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button {
    min-height: 50px !important;
    height: 50px !important;
    gap: 7px !important;
    padding: 9px 11px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button span {
    font-size: 12.2px !important;
    font-weight: 660 !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button svg {
    width: 16px !important;
    height: 16px !important;
  }
}


/* -------------------------------------------------------------------------- */
/* MOBILE HERO FINAL TEXT + SPACING FIX                                       */
/* -------------------------------------------------------------------------- */

@media (max-width: 1180px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    min-height: 372px !important;
    padding: 18px 16px 0 !important;
    margin: 4px 0 2px !important;
    overflow: hidden !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 auto !important;
    text-align: center !important;
    position: relative !important;
    z-index: 6 !important;
    overflow: visible !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title {
    width: 100% !important;
    max-width: 392px !important;
    margin: 0 auto !important;
    padding: 0 !important;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: 31px !important;
    line-height: 1.04 !important;
    letter-spacing: -0.055em !important;
    font-weight: 900 !important;
    text-align: center !important;
    white-space: normal !important;
    overflow: visible !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title .hero-title-line {
    display: block !important;
    width: 100% !important;
    text-align: center !important;
    white-space: nowrap !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title .hero-title-black {
    color: #07102b !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title .hero-title-blue {
    color: #0b5cff !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p.mobile-hero-subtitle-lines {
    width: 100% !important;
    max-width: 332px !important;
    margin: 10px auto 0 !important;
    display: grid !important;
    gap: 2px !important;
    color: #536079 !important;
    font-size: 14.2px !important;
    line-height: 1.28 !important;
    font-weight: 520 !important;
    letter-spacing: -0.012em !important;
    text-align: center !important;
    white-space: normal !important;
    overflow: visible !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p.mobile-hero-subtitle-lines span {
    display: block !important;
    width: 100% !important;
    text-align: center !important;
    white-space: nowrap !important;
    color: #536079 !important;
  }

  /* Push orb lower so subtitle line 2 sits above it cleanly */
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    top: 156px !important;
    width: 322px !important;
    height: 242px !important;
    z-index: 2 !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 322px !important;
    height: 242px !important;
  }

  /* Keep the background rings aligned with lower orb */
  .aci-home-root .hero-bg-orbit {
    top: 55% !important;
    width: 322px !important;
    height: 80px !important;
  }

  .aci-home-root .hero-bg-orbit.orbit-2 {
    top: 55% !important;
    width: 352px !important;
    height: 98px !important;
  }

  .aci-home-root .hero-bg-dot.dot-1 {
    top: 41% !important;
  }

  .aci-home-root .hero-bg-dot.dot-2 {
    top: 40% !important;
  }

  .aci-home-root .hero-bg-dot.dot-3,
  .aci-home-root .hero-bg-dot.dot-4 {
    top: 55% !important;
  }

  /* Pull pills slightly upward so spacing below orb stays tight */
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts {
    margin: -2px 0 18px !important;
  }
}

@media (max-width: 430px) {
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title {
    max-width: 360px !important;
    font-size: 29px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p.mobile-hero-subtitle-lines {
    max-width: 306px !important;
    font-size: 13.6px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    top: 150px !important;
    width: 304px !important;
    height: 232px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 304px !important;
    height: 232px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    min-height: 356px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title {
    max-width: 330px !important;
    font-size: 26.5px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p.mobile-hero-subtitle-lines {
    max-width: 286px !important;
    font-size: 12.8px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    top: 146px !important;
    width: 292px !important;
    height: 222px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 292px !important;
    height: 222px !important;
  }
}

/* -------------------------------------------------------------------------- */
/* FINAL MOBILE HERO CENTER ALIGNMENT + ORB PLACEMENT                         */
/* -------------------------------------------------------------------------- */

@media (max-width: 1180px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    position: relative !important;
    display: block !important;
    min-height: 428px !important;
    margin: 4px 0 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    text-align: center !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy {
    position: absolute !important;
    top: 26px !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 auto !important;
    padding: 0 10px !important;
    display: block !important;
    text-align: center !important;
    z-index: 8 !important;
    overflow: visible !important;
    transform: none !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title {
    width: 100% !important;
    max-width: 390px !important;
    margin: 0 auto !important;
    padding: 0 !important;
    display: block !important;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: 31px !important;
    line-height: 1.04 !important;
    letter-spacing: -0.055em !important;
    font-weight: 900 !important;
    text-align: center !important;
    white-space: normal !important;
    overflow: visible !important;
    color: #07102b !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title .hero-title-line {
    display: block !important;
    width: 100% !important;
    text-align: center !important;
    white-space: nowrap !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title .hero-title-black {
    color: #07102b !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title .hero-title-blue {
    color: #0b5cff !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p.mobile-hero-subtitle-lines {
    width: 100% !important;
    max-width: 338px !important;
    margin: 10px auto 0 !important;
    padding: 0 !important;
    display: grid !important;
    gap: 2px !important;
    color: #536079 !important;
    font-size: 14.2px !important;
    line-height: 1.3 !important;
    font-weight: 520 !important;
    letter-spacing: -0.012em !important;
    text-align: center !important;
    white-space: normal !important;
    overflow: visible !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p.mobile-hero-subtitle-lines span {
    display: block !important;
    width: 100% !important;
    text-align: center !important;
    white-space: nowrap !important;
    color: #536079 !important;
  }

  /* Orb starts below the 4 text lines */
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    position: absolute !important;
    left: 50% !important;
    top: 156px !important;
    width: 328px !important;
    height: 248px !important;
    margin: 0 !important;
    transform: translateX(-50%) !important;
    display: grid !important;
    place-items: center !important;
    z-index: 2 !important;
    opacity: 1 !important;
    pointer-events: none !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 328px !important;
    height: 248px !important;
  }

  .aci-home-root .hero-bg-orbit {
    top: 55% !important;
    width: 328px !important;
    height: 82px !important;
  }

  .aci-home-root .hero-bg-orbit.orbit-2 {
    top: 55% !important;
    width: 356px !important;
    height: 100px !important;
  }

  /* Pills start right after the orb area */
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts {
    margin: -8px 0 18px !important;
  }
}

@media (max-width: 430px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    min-height: 414px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy {
    top: 24px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title {
    max-width: 360px !important;
    font-size: 29px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p.mobile-hero-subtitle-lines {
    max-width: 310px !important;
    font-size: 13.6px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    top: 150px !important;
    width: 304px !important;
    height: 232px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 304px !important;
    height: 232px !important;
  }
}

@media (max-width: 380px) {
  .aci-home-root .mobile-hero.reference-mobile-hero {
    min-height: 396px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-title {
    max-width: 330px !important;
    font-size: 26.5px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-copy p.mobile-hero-subtitle-lines {
    max-width: 286px !important;
    font-size: 12.7px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb-shell {
    top: 144px !important;
    width: 292px !important;
    height: 222px !important;
  }

  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb,
  .aci-home-root .mobile-hero.reference-mobile-hero .mobile-hero-orb > * {
    width: 292px !important;
    height: 222px !important;
  }
}

/* -------------------------------------------------------------------------- */
/* MOBILE PILLS FINAL TUNING                                                  */
/* -------------------------------------------------------------------------- */

@media (max-width: 1180px) {
  /* Pull the 4 pills upward closer to the orb */
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts {
    margin: -60px 0 16px !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 9px 11px !important;
  }

  /* Reduce pill height */
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button {
    min-height: 30px !important;
    height: 35px !important;
    padding: 2px 14px !important;
    gap: 8px !important;
    border-radius: 999px !important;
  }

  /* Force all icons to theme blue */
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button svg,
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-1 svg,
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-2 svg,
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-3 svg,
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts .shortcut-color-4 svg {
    width: 17px !important;
    height: 17px !important;
    flex: 0 0 17px !important;
    color: #0b5cff !important;
    stroke: #0b5cff !important;
    stroke-width: 2 !important;
  }

  /* Slightly readable but not heavy */
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button span {
    font-size: 13.3px !important;
    font-weight: 680 !important;
    line-height: 1 !important;
    letter-spacing: -0.012em !important;
    white-space: nowrap !important;
  }
}

@media (max-width: 390px) {
  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts {
    margin: -18px 0 15px !important;
    gap: 8px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button {
    min-height: 44px !important;
    height: 44px !important;
    padding: 8px 11px !important;
    gap: 7px !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button span {
    font-size: 12.4px !important;
    font-weight: 660 !important;
  }

  .aci-home-root .mobile-shortcuts.reference-mobile-shortcuts button svg {
    width: 16px !important;
    height: 16px !important;
    flex: 0 0 16px !important;
  }
}

/* -------------------------------------------------------------------------- */
/* DESKTOP HERO REDESIGN - TEXT LEFT, ORB RIGHT, 9 ACTIONS INSIDE HERO         */
/* -------------------------------------------------------------------------- */

@media (min-width: 1181px) {
  .aci-home-root .desktop-hero.reference-desktop-hero {
    position: relative !important;
    min-height: 326px !important;
    height: 326px !important;
    display: grid !important;
    grid-template-columns: minmax(0, 0.58fr) minmax(360px, 0.42fr) !important;
    align-items: center !important;
    gap: 22px !important;
    margin: 0 0 12px !important;
    padding: 34px 38px 30px !important;
    border-radius: 24px !important;
    border: 1px solid rgba(203, 213, 225, 0.9) !important;
    background:
      radial-gradient(circle at 74% 50%, rgba(94, 160, 255, 0.24), rgba(255,255,255,0) 32%),
      radial-gradient(circle at 38% 10%, rgba(235, 244, 255, 0.98), rgba(255,255,255,0) 42%),
      linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,255,0.94)) !important;
    box-shadow:
      0 18px 44px rgba(15, 23, 42, 0.055),
      inset 0 1px 0 rgba(255,255,255,0.95) !important;
    overflow: hidden !important;
  }

  .aci-home-root .desktop-hero-bg {
    position: absolute !important;
    inset: 0 !important;
    pointer-events: none !important;
    z-index: 0 !important;
  }

  .aci-home-root .desktop-hero-glow {
    position: absolute !important;
    border-radius: 999px !important;
    filter: blur(18px) !important;
  }

  .aci-home-root .desktop-hero-glow.glow-one {
    right: 105px !important;
    top: 46px !important;
    width: 360px !important;
    height: 240px !important;
    background: rgba(94, 160, 255, 0.12) !important;
  }

  .aci-home-root .desktop-hero-glow.glow-two {
    right: 190px !important;
    bottom: 20px !important;
    width: 330px !important;
    height: 68px !important;
    background: rgba(11, 92, 255, 0.15) !important;
  }

  .aci-home-root .desktop-hero-dot {
    position: absolute !important;
    width: 7px !important;
    height: 7px !important;
    border-radius: 999px !important;
    background: #5ea0ff !important;
    box-shadow: 0 0 14px rgba(37, 99, 235, 0.35) !important;
    opacity: 0.8 !important;
  }

  .aci-home-root .desktop-hero-dot.dot-one {
    right: 390px !important;
    top: 86px !important;
  }

  .aci-home-root .desktop-hero-dot.dot-two {
    right: 150px !important;
    top: 120px !important;
  }

  .aci-home-root .desktop-hero-dot.dot-three {
    right: 270px !important;
    bottom: 86px !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-copy {
    position: relative !important;
    z-index: 3 !important;
    max-width: 650px !important;
    min-width: 0 !important;
    padding: 0 !important;
  }

  .aci-home-root .desktop-hero-title {
    margin: 0 !important;
    max-width: 620px !important;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: clamp(34px, 3vw, 54px) !important;
    line-height: 0.98 !important;
    letter-spacing: -0.055em !important;
    font-weight: 900 !important;
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero-title span {
    display: block !important;
  }

  .aci-home-root .desktop-hero-title em {
    font-style: normal !important;
    color: #0b5cff !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-copy p {
    max-width: 620px !important;
    margin: 12px 0 0 !important;
    color: #536079 !important;
    font-size: 15.5px !important;
    line-height: 1.45 !important;
    font-weight: 520 !important;
    letter-spacing: -0.01em !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-copy > small,
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-prompt-grid {
    display: none !important;
  }

  .aci-home-root .desktop-hero-actions {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 10px 12px !important;
    max-width: 720px !important;
    margin: 28px 0 0 !important;
  }

  .aci-home-root .desktop-hero-actions button {
    min-height: 48px !important;
    height: 48px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 10px !important;
    padding: 9px 14px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(203, 213, 225, 0.88) !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.94)) !important;
    box-shadow:
      0 10px 24px rgba(15,23,42,0.045),
      inset 0 1px 0 rgba(255,255,255,0.94) !important;
    color: #07102b !important;
    text-align: left !important;
    overflow: hidden !important;
  }

  .aci-home-root .desktop-hero-action-icon {
    width: 28px !important;
    height: 28px !important;
    flex: 0 0 28px !important;
    display: grid !important;
    place-items: center !important;
    border-radius: 999px !important;
    color: #0b5cff !important;
    background: rgba(239, 246, 255, 0.92) !important;
    border: 1px solid rgba(191, 219, 254, 0.85) !important;
  }

  .aci-home-root .desktop-hero-action-icon svg {
    width: 16px !important;
    height: 16px !important;
    color: #0b5cff !important;
    stroke: #0b5cff !important;
    stroke-width: 2 !important;
  }

  .aci-home-root .desktop-hero-action-copy {
    min-width: 0 !important;
    display: block !important;
  }

  .aci-home-root .desktop-hero-action-copy strong {
    display: block !important;
    color: #07102b !important;
    font-size: 12.3px !important;
    line-height: 1.05 !important;
    font-weight: 720 !important;
    letter-spacing: -0.012em !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb {
    position: relative !important;
    z-index: 2 !important;
    width: 520px !important;
    height: 390px !important;
    margin: -18px -42px -26px auto !important;
    display: grid !important;
    place-items: center !important;
    pointer-events: none !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb > * {
    width: 520px !important;
    height: 390px !important;
  }

  /* Keep old separate quick grid hidden on desktop after actions move into hero */
  .aci-home-root .desktop-home-main > .desktop-quick-grid {
    display: none !important;
  }

  /* Pull Trending right now closer to the redesigned hero */
  .aci-home-root .desktop-home-main > .aci-live-trending.is-desktop {
    margin-top: 0 !important;
  }

  .aci-home-root .desktop-home-main > .aci-live-trending.is-desktop .aci-live-section-head {
    margin-top: 0 !important;
  }
}

@media (min-width: 1181px) and (max-width: 1360px) {
  .aci-home-root .desktop-hero.reference-desktop-hero {
    grid-template-columns: minmax(0, 0.6fr) minmax(320px, 0.4fr) !important;
    min-height: 318px !important;
    height: 318px !important;
    padding: 30px 30px 28px !important;
  }

  .aci-home-root .desktop-hero-title {
    font-size: clamp(31px, 2.8vw, 46px) !important;
  }

  .aci-home-root .desktop-hero-actions {
    gap: 9px !important;
    margin-top: 22px !important;
  }

  .aci-home-root .desktop-hero-actions button {
    min-height: 45px !important;
    height: 45px !important;
    padding: 8px 11px !important;
    gap: 8px !important;
  }

  .aci-home-root .desktop-hero-action-copy strong {
    font-size: 11.6px !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb,
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb > * {
    width: 455px !important;
    height: 344px !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb {
    margin-right: -50px !important;
  }
}

/* -------------------------------------------------------------------------- */
/* DESKTOP HERO FINAL: BLACK/BLUE TITLE + ACTION CHIP CLOUD                   */
/* -------------------------------------------------------------------------- */

@media (min-width: 1181px) {
  .aci-home-root .desktop-hero.reference-desktop-hero {
    height: 336px !important;
    min-height: 336px !important;
    padding: 34px 38px 26px !important;
    display: grid !important;
    grid-template-columns: minmax(0, 0.56fr) minmax(380px, 0.44fr) !important;
    align-items: center !important;
    gap: 22px !important;
    overflow: hidden !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-copy {
    position: relative !important;
    z-index: 4 !important;
    max-width: 670px !important;
    align-self: center !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title {
    margin: 0 !important;
    max-width: 630px !important;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: clamp(34px, 3vw, 52px) !important;
    line-height: 0.98 !important;
    letter-spacing: -0.055em !important;
    font-weight: 900 !important;
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title > span {
    display: block !important;
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title .desktop-title-black {
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title em {
    font-style: normal !important;
    color: #0b5cff !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-copy p {
    max-width: 640px !important;
    margin: 12px 0 0 !important;
    color: #536079 !important;
    font-size: 15px !important;
    line-height: 1.42 !important;
    font-weight: 520 !important;
  }

  .aci-home-root .desktop-hero-action-cloud {
    max-width: 690px !important;
    margin: 26px 0 0 !important;
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 9px !important;
  }

  .aci-home-root .desktop-action-chip {
    height: 36px !important;
    min-height: 36px !important;
    width: auto !important;
    max-width: 188px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 8px !important;
    padding: 6px 13px 6px 8px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(191, 219, 254, 0.88) !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,249,255,0.94)) !important;
    box-shadow:
      0 9px 22px rgba(15, 23, 42, 0.045),
      inset 0 1px 0 rgba(255,255,255,0.96) !important;
    color: #07102b !important;
    white-space: nowrap !important;
    overflow: hidden !important;
  }

  .aci-home-root .desktop-action-chip-icon {
    width: 24px !important;
    height: 24px !important;
    flex: 0 0 24px !important;
    display: grid !important;
    place-items: center !important;
    border-radius: 999px !important;
    background:
      radial-gradient(circle at 35% 25%, #ffffff, #eef6ff 60%, #e5f0ff 100%) !important;
    border: 1px solid rgba(191, 219, 254, 0.9) !important;
    color: #0b5cff !important;
  }

  .aci-home-root .desktop-action-chip-icon svg {
    width: 14px !important;
    height: 14px !important;
    color: #0b5cff !important;
    stroke: #0b5cff !important;
    stroke-width: 2 !important;
  }

  .aci-home-root .desktop-action-chip > span:last-child {
    min-width: 0 !important;
    display: block !important;
    color: #07102b !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 680 !important;
    letter-spacing: -0.01em !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  /* Give the chip cloud a more organic layout */
  .aci-home-root .desktop-action-chip-1,
  .aci-home-root .desktop-action-chip-4,
  .aci-home-root .desktop-action-chip-7 {
    margin-left: 0 !important;
  }

  .aci-home-root .desktop-action-chip-2,
  .aci-home-root .desktop-action-chip-5,
  .aci-home-root .desktop-action-chip-8 {
    transform: translateY(2px) !important;
  }

  .aci-home-root .desktop-action-chip-3,
  .aci-home-root .desktop-action-chip-6,
  .aci-home-root .desktop-action-chip-9 {
    transform: translateY(-1px) !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb {
    width: 520px !important;
    height: 390px !important;
    margin: -18px -46px -26px auto !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb > * {
    width: 520px !important;
    height: 390px !important;
  }

  .aci-home-root .desktop-home-main > .desktop-quick-grid {
    display: none !important;
  }

  .aci-home-root .desktop-home-main > .aci-live-trending.is-desktop {
    margin-top: 0 !important;
  }
}

@media (min-width: 1181px) and (max-width: 1360px) {
  .aci-home-root .desktop-hero.reference-desktop-hero {
    height: 332px !important;
    min-height: 332px !important;
    padding: 30px 30px 24px !important;
    grid-template-columns: minmax(0, 0.58fr) minmax(330px, 0.42fr) !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title {
    font-size: clamp(31px, 2.8vw, 45px) !important;
  }

  .aci-home-root .desktop-hero-action-cloud {
    margin-top: 22px !important;
    gap: 8px !important;
    max-width: 610px !important;
  }

  .aci-home-root .desktop-action-chip {
    height: 34px !important;
    min-height: 34px !important;
    max-width: 168px !important;
    padding: 5px 11px 5px 7px !important;
  }

  .aci-home-root .desktop-action-chip > span:last-child {
    font-size: 11.2px !important;
  }

  .aci-home-root .desktop-action-chip-icon {
    width: 22px !important;
    height: 22px !important;
    flex-basis: 22px !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb,
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb > * {
    width: 456px !important;
    height: 344px !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb {
    margin-right: -52px !important;
  }
}

/* -------------------------------------------------------------------------- */
/* DESKTOP HERO CORRECTIONS - TITLE, ORB, ACTION CHIPS                        */
/* -------------------------------------------------------------------------- */

@media (min-width: 1181px) {
  .aci-home-root .desktop-hero.reference-desktop-hero {
    height: 326px !important;
    min-height: 326px !important;
    padding: 32px 38px 24px !important;
    grid-template-columns: minmax(0, 0.58fr) minmax(330px, 0.42fr) !important;
    gap: 18px !important;
    overflow: hidden !important;
  }

  /* Title color + layout fix */
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title {
    max-width: 650px !important;
    margin: 0 !important;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: clamp(34px, 3vw, 50px) !important;
    line-height: 1.02 !important;
    letter-spacing: -0.055em !important;
    font-weight: 900 !important;
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title > span {
    display: block !important;
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-title-top,
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-title-black {
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-title-bottom {
    white-space: nowrap !important;
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-title-bottom em {
    font-style: normal !important;
    color: #0b5cff !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-copy p {
    margin-top: 10px !important;
    max-width: 640px !important;
    font-size: 14.6px !important;
    line-height: 1.4 !important;
    color: #536079 !important;
  }

  /* Smaller orb, still visually strong */
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb {
    width: 440px !important;
    height: 330px !important;
    margin: -8px -22px -30px auto !important;
    display: grid !important;
    place-items: center !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb > * {
    width: 440px !important;
    height: 330px !important;
  }

  /* Action chips: less table-like, smaller, softer */
  .aci-home-root .desktop-hero-action-cloud {
    max-width: 680px !important;
    margin: 22px 0 0 !important;
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .aci-home-root .desktop-action-chip {
    height: 32px !important;
    min-height: 32px !important;
    width: auto !important;
    max-width: none !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 7px !important;
    padding: 6px 12px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(203, 213, 225, 0.82) !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,251,255,0.78)) !important;
    box-shadow:
      0 7px 18px rgba(15, 23, 42, 0.035),
      inset 0 1px 0 rgba(255,255,255,0.92) !important;
    color: #07102b !important;
    white-space: nowrap !important;
    overflow: hidden !important;
  }

  /* Remove circle borders/background around icons */
  .aci-home-root .desktop-action-chip-icon {
    width: 16px !important;
    height: 16px !important;
    flex: 0 0 16px !important;
    display: grid !important;
    place-items: center !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #0b5cff !important;
  }

  .aci-home-root .desktop-action-chip-icon svg {
    width: 15px !important;
    height: 15px !important;
    color: #0b5cff !important;
    stroke: #0b5cff !important;
    stroke-width: 2 !important;
  }

  .aci-home-root .desktop-action-chip > span:last-child {
    color: #07102b !important;
    font-size: 11.8px !important;
    line-height: 1 !important;
    font-weight: 650 !important;
    letter-spacing: -0.006em !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  /* Remove old stagger offsets if they made the chips feel messy */
  .aci-home-root .desktop-action-chip-1,
  .aci-home-root .desktop-action-chip-2,
  .aci-home-root .desktop-action-chip-3,
  .aci-home-root .desktop-action-chip-4,
  .aci-home-root .desktop-action-chip-5,
  .aci-home-root .desktop-action-chip-6,
  .aci-home-root .desktop-action-chip-7,
  .aci-home-root .desktop-action-chip-8,
  .aci-home-root .desktop-action-chip-9 {
    transform: none !important;
    margin-left: 0 !important;
  }
}

@media (min-width: 1181px) and (max-width: 1360px) {
  .aci-home-root .desktop-hero.reference-desktop-hero {
    height: 318px !important;
    min-height: 318px !important;
    padding: 30px 30px 22px !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title {
    font-size: clamp(31px, 2.8vw, 43px) !important;
  }

  .aci-home-root .desktop-hero-action-cloud {
    margin-top: 18px !important;
    gap: 7px !important;
  }

  .aci-home-root .desktop-action-chip {
    height: 30px !important;
    min-height: 30px !important;
    padding: 5px 10px !important;
  }

  .aci-home-root .desktop-action-chip > span:last-child {
    font-size: 11px !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb,
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb > * {
    width: 400px !important;
    height: 300px !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-orb {
    margin-right: -28px !important;
  }
}

/* -------------------------------------------------------------------------- */
/* DESKTOP HERO MICRO FIX - LEFT CONTENT UP + TITLE SECOND LINE INLINE         */
/* -------------------------------------------------------------------------- */

@media (min-width: 1181px) {
  /* Move whole left content slightly upward */
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-copy {
    transform: translateY(-12px) !important;
    align-self: center !important;
  }

  /* Keep first line black */
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title .desktop-title-top {
    display: block !important;
    color: #07102b !important;
  }

  /* Keep find + your perfect car on the same line */
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title .desktop-title-bottom {
    display: block !important;
    white-space: nowrap !important;
    color: #07102b !important;
  }

  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title .desktop-title-bottom em {
    display: inline !important;
    font-style: normal !important;
    color: #0b5cff !important;
  }

  /* Make sure no older broad span rule forces the second line apart */
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title span,
  .aci-home-root .desktop-hero.reference-desktop-hero .desktop-hero-title em {
    vertical-align: baseline !important;
  }
}

      `}</style>
      <DesktopHomePage
        data={enhancedData}
        popular={popularDesktopProps}
        recentCars={enrichedRecentCars}
        onAction={onAction}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
      />
      <MobileHomePage
        data={enhancedData}
        popular={popularMobileProps}
        recentCars={enrichedRecentCars}
        onAction={onAction}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
      />
    </div>
  );
}
