import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Armchair,
  Bell,
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleMinus,
  Gauge,
  Hand,
  Info,
  Mic,
  Music2,
  Route,
  Search,
  SendHorizontal,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wind,
  Filter,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../data/homeScreenData";
import { emitAciAction } from "../shared/AciAssistShared";
import { getDisplayCarImage } from "../shared/aciV2Image";

const AVATAR =
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=240&auto=format&fit=crop";

const CATEGORY_CONFIG = [
  { id: "comfort", label: "Comfort", Icon: Armchair },
  { id: "safety", label: "Safety", Icon: ShieldCheck },
  { id: "infotainment", label: "Infotainment", Icon: Music2 },
  { id: "convenience", label: "Convenience", Icon: Hand },
  { id: "adas", label: "ADAS", Icon: Route },
];

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.03,
    },
  },
};

function compactText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return value.map(compactText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return compactText(
      value.label || value.name || value.title || value.value || "",
    );
  }
  return "";
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.rows)) return value.rows;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.data?.rows)) return value.data.rows;
  if (Array.isArray(value.data?.items)) return value.data.items;
  if (Array.isArray(value.features)) return value.features;
  if (Array.isArray(value.variants)) return value.variants;
  return [];
}

function valueFrom(object, keys, fallback = "") {
  if (!object || typeof object !== "object") return fallback;

  for (const key of keys) {
    const value = object[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function isImageUrl(value) {
  if (!value || typeof value !== "string") return false;

  const text = value.trim();

  return (
    /^(data:image\/|blob:)/i.test(text) ||
    /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text) ||
    /cloudinary|imgix|googleusercontent|cardekho|carwale|acko|spinny|cars24|cdn|uploads|images/i.test(
      text,
    )
  );
}

function extractImage(value, depth = 0) {
  if (!value || depth > 6) return "";

  if (typeof value === "string") {
    return isImageUrl(value) ? value.trim() : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImage(item, depth + 1);
      if (found) return found;
    }

    return "";
  }

  if (typeof value === "object") {
    const imageKeys = [
      "heroImage",
      "heroImageUrl",
      "vehicleImage",
      "vehicleImageUrl",
      "image",
      "imageUrl",
      "image_url",
      "thumbnail",
      "thumbnailUrl",
      "carImage",
      "car_image",
      "photo",
      "url",
      "src",
      "normalizedImageUrl",
      "cleanImageUrl",
      "normalized_image_url",
    ];

    for (const key of imageKeys) {
      const found = extractImage(value[key], depth + 1);
      if (found) return found;
    }

    for (const nestedValue of Object.values(value)) {
      const found = extractImage(nestedValue, depth + 1);
      if (found) return found;
    }
  }

  return "";
}

function normaliseCategory(value) {
  const text = compactText(value).toLowerCase();

  if (
    /adas|lane|cruise|aeb|blind|collision|autonomous|assist|departure/i.test(
      text,
    )
  ) {
    return "adas";
  }

  if (
    /airbag|safety|esc|isofix|brake|tpms|hill|stability|ncap|child/i.test(text)
  ) {
    return "safety";
  }

  if (
    /audio|speaker|touch|screen|android|apple|carplay|infotain|connected|music|jbl/i.test(
      text,
    )
  ) {
    return "infotainment";
  }

  if (
    /wireless|charger|mode|convenience|keyless|tailgate|memory|climate|boot|start/i.test(
      text,
    )
  ) {
    return "convenience";
  }

  return "comfort";
}

function getFeatureIcon(feature) {
  const text = `${feature.name || ""} ${feature.category || ""}`.toLowerCase();

  if (/camera|360/.test(text)) return Camera;
  if (/seat|ventilat|comfort/.test(text)) return Armchair;
  if (/airbag|safety|shield|brake/.test(text)) return ShieldCheck;
  if (/adas|lane|route|cruise|assist/.test(text)) return Route;
  if (/audio|music|speaker|jbl|infotain/.test(text)) return Music2;
  if (/android|apple|carplay|phone|wireless|screen/.test(text))
    return Smartphone;
  if (/tailgate|boot|car/.test(text)) return Car;
  if (/mode|gauge|drive/.test(text)) return Gauge;
  if (/sunroof|roof|panoramic/.test(text)) return Smartphone;
  if (/ac|climate|wind/.test(text)) return Wind;

  return Sparkles;
}

function emitFeatureAction(
  onAction,
  {
    label,
    query,
    type = "features_action",
    intent = ACI_INTENTS?.FEATURES,
    canvasType = ACI_CANVAS_TYPES?.FEATURES,
    vehicle,
    payload = {},
  },
) {
  emitAciAction(
    {
      label,
      query: query || label,
      type,
      intent,
      canvasType,
      vehicle,
      payload,
      contextPatch: {
        selectedVehicle: vehicle,
        anchorModel: vehicle?.model,
        anchorVariant: vehicle?.selectedVariant || vehicle?.variant,
        anchorCity: vehicle?.city || "Delhi",
      },
    },
    onAction,
  );
}

function parseVariantLabel(label = "") {
  const text = compactText(label);
  const seatMatch = text.match(/\b(6S|7S)\b/i);
  const seat = seatMatch?.[0] || "";
  const base = seat ? text.replace(/\b(6S|7S)\b/i, "").trim() : text;

  return { base, seat };
}

function parseVariants(widget, vehicle) {
  const raw = [
    ...asArray(widget?.variants),
    ...asArray(widget?.data?.variants),
    ...asArray(widget?.variantOptions),
    ...asArray(widget?.data?.variantOptions),
    ...asArray(vehicle?.variants),
  ];

  const parsed = raw
    .map((item, index) => {
      if (typeof item === "string") {
        const label = compactText(item);

        if (!label) return null;

        return {
          id:
            label.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
            `variant-${index}`,
          label,
          price: "",
        };
      }

      if (!item || typeof item !== "object") return null;

      const label = compactText(
        item.label ||
          item.name ||
          item.variant ||
          item.variantName ||
          item.title ||
          item.displayName,
      );

      if (!label) return null;

      return {
        id:
          compactText(item.id || item.key || label)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-") || `variant-${index}`,
        label,
        price: compactText(
          item.price ||
            item.priceRange ||
            item.range ||
            item.onRoadPrice ||
            item.exShowroomPrice,
        ),
      };
    })
    .filter(Boolean);

  const selectedVariant = compactText(
    vehicle?.selectedVariant ||
      vehicle?.variant ||
      widget?.selectedVariant ||
      widget?.variant ||
      widget?.data?.selectedVariant,
  );

  if (
    selectedVariant &&
    !parsed.some((item) => item.label === selectedVariant)
  ) {
    parsed.unshift({
      id: selectedVariant.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: selectedVariant,
      price: compactText(
        vehicle?.priceRange || widget?.priceRange || widget?.data?.priceRange,
      ),
    });
  }

  return parsed;
}

function normaliseFeature(item, index) {
  if (!item) return null;

  if (typeof item === "string") {
    const name = compactText(item);
    if (!name) return null;

    return {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      name,
      category: normaliseCategory(name),
      available: true,
      highlight: false,
      raw: item,
    };
  }

  if (typeof item !== "object") return null;

  const name = compactText(
    item.name ||
      item.label ||
      item.title ||
      item.feature ||
      item.featureName ||
      item.displayName,
  );

  if (!name) return null;

  const availabilityText = compactText(
    item.status || item.availability || item.availableText,
  );

  const available =
    item.available === false ||
    item.present === false ||
    item.included === false ||
    item.isAvailable === false ||
    /no|unavailable|missing|not available|absent/i.test(availabilityText)
      ? false
      : true;

  const categorySource = compactText(
    item.category || item.group || item.type || item.section || name,
  );

  return {
    id:
      compactText(item.id || item.key || item.slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") || `feature-${index}`,
    name,
    category: normaliseCategory(categorySource),
    available,
    highlight:
      item.highlight === true ||
      item.segmentHighlight === true ||
      item.isHighlight === true ||
      /highlight|best|segment|top/i.test(
        compactText(item.badge || item.tag || item.labelTag),
      ),
    raw: item,
  };
}

function collectFeatureRowsFrom(value, bucket, depth = 0) {
  if (!value || depth > 5) return;

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const row = normaliseFeature(item, bucket.length);
      if (row) bucket.push(row);

      if (item && typeof item === "object") {
        collectFeatureRowsFrom(item.features, bucket, depth + 1);
        collectFeatureRowsFrom(item.items, bucket, depth + 1);
        collectFeatureRowsFrom(item.rows, bucket, depth + 1);
        collectFeatureRowsFrom(item.children, bucket, depth + 1);
      }
    });

    return;
  }

  if (typeof value === "object") {
    const row = normaliseFeature(value, bucket.length);
    if (row) bucket.push(row);

    collectFeatureRowsFrom(value.features, bucket, depth + 1);
    collectFeatureRowsFrom(value.items, bucket, depth + 1);
    collectFeatureRowsFrom(value.rows, bucket, depth + 1);
    collectFeatureRowsFrom(value.children, bucket, depth + 1);
  }
}

function parseFeatures(widget, vehicle) {
  const bucket = [];

  collectFeatureRowsFrom(widget?.features, bucket);
  collectFeatureRowsFrom(widget?.data?.features, bucket);
  collectFeatureRowsFrom(widget?.featureList, bucket);
  collectFeatureRowsFrom(widget?.data?.featureList, bucket);
  collectFeatureRowsFrom(widget?.rows, bucket);
  collectFeatureRowsFrom(widget?.items, bucket);
  collectFeatureRowsFrom(widget?.data?.rows, bucket);
  collectFeatureRowsFrom(widget?.data?.items, bucket);
  collectFeatureRowsFrom(vehicle?.features, bucket);
  collectFeatureRowsFrom(vehicle?.featureList, bucket);
  collectFeatureRowsFrom(vehicle?.specs, bucket);
  collectFeatureRowsFrom(vehicle?.highlights, bucket);

  const seen = new Set();

  return bucket
    .filter((feature) => {
      if (!feature?.id || seen.has(feature.id)) return false;
      seen.add(feature.id);
      return true;
    })
    .map((feature) => ({
      ...feature,
      Icon: getFeatureIcon(feature),
    }));
}

function parseStats(widget, features) {
  const statsSource =
    widget?.categoryStats ||
    widget?.featureStats ||
    widget?.data?.categoryStats ||
    widget?.data?.featureStats ||
    widget?.summary ||
    widget?.data?.summary;

  const output = {};

  CATEGORY_CONFIG.forEach((category) => {
    const source =
      statsSource?.[category.id] ||
      statsSource?.[category.label] ||
      statsSource?.[category.label.toLowerCase()] ||
      null;

    if (source && typeof source === "object") {
      const available = Number(
        source.available ??
          source.included ??
          source.present ??
          source.count ??
          0,
      );
      const total = Number(
        source.total ?? source.countTotal ?? source.overall ?? 0,
      );

      if (total || available) {
        output[category.id] = {
          available,
          total: total || available,
        };
        return;
      }
    }

    const rows = features.filter((feature) => feature.category === category.id);
    const available = rows.filter((feature) => feature.available).length;

    output[category.id] = {
      available,
      total: rows.length,
    };
  });

  return output;
}

function parseQuickSearches(widget, features) {
  const raw = [
    ...asArray(widget?.quickSearches),
    ...asArray(widget?.popularSearches),
    ...asArray(widget?.data?.quickSearches),
    ...asArray(widget?.data?.popularSearches),
  ];

  const provided = raw.map(compactText).filter(Boolean);

  if (provided.length) return provided.slice(0, 5);

  const derived = features
    .filter(
      (feature) =>
        feature.highlight ||
        /sunroof|adas|camera|carplay|seat/i.test(feature.name),
    )
    .map((feature) => {
      if (/sunroof/i.test(feature.name)) return "sunroof";
      if (/adas/i.test(feature.name)) return "ADAS";
      if (/360|camera/i.test(feature.name)) return "360 camera";
      if (/carplay|android/i.test(feature.name)) return "wireless CarPlay";
      return feature.name;
    });

  return [...new Set(derived)].slice(0, 5);
}

function parseHighlights(widget, features) {
  const raw = [
    ...asArray(widget?.highlights),
    ...asArray(widget?.data?.highlights),
    ...asArray(widget?.whyThisVariant),
    ...asArray(widget?.data?.whyThisVariant),
  ];

  const provided = raw.map(compactText).filter(Boolean);

  if (provided.length) return provided.slice(0, 4);

  return features
    .filter((feature) => feature.available && feature.highlight)
    .slice(0, 4)
    .map((feature) => `${feature.name} available in this variant`);
}

function AciLogo({ onAction, mobile = false }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-3 border-0 bg-transparent p-0"
      onClick={() =>
        emitFeatureAction(onAction, {
          label: "Home",
          type: "go_home",
          intent: "",
          canvasType: "",
        })
      }
    >
      <span
        className={`select-none font-black leading-none tracking-[-0.18em] text-[#075df6] [transform:skewX(-9deg)] ${
          mobile ? "text-[38px]" : "text-[34px]"
        }`}
      >
        ACI
      </span>

      <span
        className={`select-none font-black text-[#080f2b] ${
          mobile
            ? "text-[17px] tracking-[0.38em]"
            : "text-[16px] tracking-[0.36em]"
        }`}
      >
        ASSIST
      </span>
    </button>
  );
}

function VehicleImage({ src, title, mobile = false }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center rounded-[24px] border border-[#dbe3ef] bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f8fafc_38%,#eaf2ff_100%)] text-[#94a3b8] ${
          mobile ? "h-[150px]" : "h-[260px]"
        }`}
      >
        <Car size={mobile ? 54 : 76} strokeWidth={1.25} />
      </div>
    );
  }

  return (
    <motion.img
      key={src}
      src={src}
      alt={title}
      draggable="false"
      onError={() => setFailed(true)}
      initial={{ opacity: 0, scale: 0.985, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 25 }}
      className="h-auto w-full object-contain mix-blend-multiply drop-shadow-[0_24px_26px_rgba(15,23,42,0.2)]"
    />
  );
}

function AssistantComposer({ mobile = false, onAction, vehicle }) {
  return (
    <section
      className={
        mobile
          ? "fixed bottom-0 left-1/2 z-[90] w-full max-w-[430px] -translate-x-1/2 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2"
          : "pointer-events-none fixed bottom-4 left-1/2 z-[80] w-full max-w-[700px] -translate-x-1/2 px-5"
      }
    >
      <div
        className={`pointer-events-auto grid items-center gap-2 rounded-[28px] border border-[rgba(37,99,235,0.18)] bg-white/96 shadow-[0_0_0_5px_rgba(37,99,235,0.04),0_22px_50px_-36px_rgba(37,99,235,0.52),inset_0_1px_0_rgba(255,255,255,1)] ${
          mobile
            ? "min-h-[58px] grid-cols-[40px_1fr_30px_46px] p-[6px]"
            : "min-h-[58px] grid-cols-[40px_1fr_32px_46px] p-[6px]"
        }`}
      >
        <button
          type="button"
          onClick={() =>
            emitFeatureAction(onAction, {
              label: "Assistant",
              query: "",
              type: "open_assistant",
              intent: "",
              canvasType: "",
              vehicle,
            })
          }
          className="grid h-10 w-10 place-items-center rounded-[17px] border border-[#e0e7f1] bg-[radial-gradient(circle_at_35%_28%,#fff_0%,#eef5ff_100%)] text-[#075df6]"
        >
          <Sparkles size={20} fill="currentColor" />
        </button>

        <input
          placeholder="Ask if this variant has any feature"
          className="min-w-0 border-0 bg-transparent text-[13px] font-normal text-[#1e293b] outline-none placeholder:text-[#94a3b8]"
        />

        <button
          type="button"
          onClick={() =>
            emitFeatureAction(onAction, {
              label: "Voice input",
              query: "",
              type: "voice_input",
              intent: "",
              canvasType: "",
              vehicle,
            })
          }
          className="grid h-9 w-[30px] place-items-center border-0 bg-transparent text-[#526075]"
        >
          <Mic size={21} />
        </button>

        <button
          type="button"
          onClick={() =>
            emitFeatureAction(onAction, {
              label: "Send",
              query: "",
              type: "send",
              intent: "",
              canvasType: "",
              vehicle,
            })
          }
          className="grid h-[46px] w-[46px] place-items-center rounded-[17px] border-0 bg-[linear-gradient(135deg,#075df6,#0448d8)] text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.58)]"
        >
          <SendHorizontal size={22} />
        </button>
      </div>
    </section>
  );
}

function DesktopHeader({ onAction, topSearch, setTopSearch, vehicle }) {
  return (
    <motion.header
      variants={fadeUp}
      className="mx-auto grid h-[76px] w-full max-w-[1510px] grid-cols-[250px_minmax(420px,640px)_250px] items-center gap-5 px-10"
    >
      <AciLogo onAction={onAction} />

      <label className="grid h-[54px] grid-cols-[38px_1fr_46px] items-center rounded-[21px] border border-[#dbe3ef] bg-white/95 px-4 text-[#64748b] shadow-[0_20px_52px_-42px_rgba(15,23,42,0.42)]">
        <Search size={20} />

        <input
          value={topSearch}
          onChange={(event) => setTopSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && topSearch.trim()) {
              emitFeatureAction(onAction, {
                label: "Search",
                query: topSearch,
                type: "search",
                vehicle,
              });
            }
          }}
          placeholder="Search for variants, features, specs and more..."
          className="min-w-0 border-0 bg-transparent text-[14px] font-normal text-[#172033] outline-none placeholder:text-[#7b8799]"
        />

        <span className="grid h-[30px] place-items-center rounded-[10px] border border-[#d8e0eb] bg-[#fbfcff] text-[12px] font-semibold text-[#6b7280]">
          ⌘ K
        </span>
      </label>

      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() =>
            emitFeatureAction(onAction, {
              label: "Notifications",
              type: "notifications",
              vehicle,
            })
          }
          className="relative grid h-10 w-10 place-items-center border-0 bg-transparent text-[#566176]"
        >
          <Bell size={23} strokeWidth={1.85} />
          <span className="absolute right-2 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#075df6]" />
        </button>

        <button
          type="button"
          onClick={() =>
            emitFeatureAction(onAction, {
              label: "Profile",
              type: "profile",
              vehicle,
            })
          }
          className="h-[48px] w-[48px] rounded-full bg-white p-[3px] shadow-[0_0_0_1px_#dbe5f2,0_12px_26px_-16px_rgba(37,99,235,0.5)]"
        >
          <img
            src={AVATAR}
            alt="Profile"
            className="h-full w-full rounded-full object-cover"
          />
        </button>

        <ChevronDown size={16} className="text-[#64748b]" />
      </div>
    </motion.header>
  );
}

function VariantSelect({
  variants,
  selectedVariantId,
  setSelectedVariantId,
  compact = false,
}) {
  if (!variants.length) return null;

  return (
    <label
      className={`relative inline-flex max-w-full items-center rounded-[15px] border border-[#dbe3ef] bg-white/94 text-[#172033] shadow-[0_18px_45px_-36px_rgba(15,23,42,0.5)] ${
        compact ? "h-10 px-3 text-[12px]" : "h-[46px] px-4 text-[13px]"
      }`}
    >
      <span className="mr-2 shrink-0 font-semibold text-[#64748b]">
        Change variant
      </span>

      <select
        value={selectedVariantId}
        onChange={(event) => setSelectedVariantId(event.target.value)}
        className="min-w-0 max-w-[190px] appearance-none truncate border-0 bg-transparent pr-7 font-semibold text-[#075df6] outline-none"
      >
        {variants.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={compact ? 15 : 16}
        className="pointer-events-none absolute right-3 text-[#64748b]"
      />
    </label>
  );
}

function FeatureSearch({
  query,
  setQuery,
  placeholder = "Search features like sunroof, ADAS, ventilated seats...",
}) {
  return (
    <label className="grid h-[48px] grid-cols-[38px_1fr] items-center rounded-[15px] border border-[#dbe3ef] bg-white/95 px-4 text-[#64748b] shadow-[0_16px_42px_-36px_rgba(15,23,42,0.45)]">
      <Search size={19} />

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 border-0 bg-transparent text-[13px] font-normal text-[#172033] outline-none placeholder:text-[#94a3b8]"
      />
    </label>
  );
}

function DesktopHero({
  title,
  image,
  selectedVariant,
  variants,
  selectedVariantId,
  setSelectedVariantId,
  query,
  setQuery,
  onAction,
  vehicle,
}) {
  const { base, seat } = parseVariantLabel(selectedVariant?.label);
  const price = selectedVariant?.price || compactText(vehicle?.priceRange);

  return (
    <motion.section
      variants={fadeUp}
      className="relative overflow-hidden rounded-[30px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#f4f8ff_0%,#ffffff_48%,#edf4ff_100%)] shadow-[0_30px_84px_-60px_rgba(15,23,42,0.5)]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-80 [background:repeating-radial-gradient(ellipse_at_82%_32%,rgba(255,255,255,0.62)_0,rgba(255,255,255,0.62)_2px,transparent_3px,transparent_24px)]" />
      <div className="pointer-events-none absolute -left-28 top-[-70px] h-64 w-64 rounded-full bg-white/70 blur-3xl" />

      <button
        type="button"
        onClick={() =>
          emitFeatureAction(onAction, {
            label: "Share",
            type: "share",
            vehicle,
          })
        }
        className="absolute right-8 top-7 z-20 inline-flex h-11 items-center gap-2 rounded-[14px] border border-[#dbe3ef] bg-white/82 px-4 text-[13px] font-semibold text-[#172033] shadow-[0_18px_38px_-30px_rgba(15,23,42,0.5)]"
      >
        <Share2 size={17} />
        Share
      </button>

      <div className="relative z-10 grid min-h-[300px] grid-cols-[45%_55%] items-center gap-8 px-10 py-7">
        <div className="relative flex h-full items-end justify-center">
          <div className="absolute inset-x-16 bottom-4 h-10 rounded-full bg-slate-500/20 blur-2xl" />

          <div className="w-[88%] max-w-[620px] translate-y-3">
            <VehicleImage src={image} title={title} />
          </div>
        </div>

        <div className="max-w-[610px] pb-1">
          <h1 className="font-serif text-[45px] font-semibold leading-[0.95] tracking-[-0.065em] text-[#07102b]">
            {title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {base ? (
              <span className="text-[24px] font-medium leading-none tracking-[-0.035em] text-[#075df6]">
                {base}
              </span>
            ) : null}

            {seat ? (
              <span className="inline-flex h-8 items-center rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3 text-[15px] font-semibold text-[#075df6]">
                {seat}
              </span>
            ) : null}
          </div>

          {price ? (
            <p className="mt-4 flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] text-[#526075]">
              {price}
              <Info size={17} />
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() =>
                emitFeatureAction(onAction, {
                  label: "View key specs",
                  type: "key_specs",
                  intent: ACI_INTENTS?.SPECS,
                  canvasType: ACI_CANVAS_TYPES?.SPECS,
                  vehicle,
                })
              }
              className="inline-flex h-[46px] items-center gap-2 rounded-[13px] border-0 bg-[linear-gradient(135deg,#075df6,#0448d8)] px-6 text-[15px] font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.7)]"
            >
              View key specs
              <ChevronRight size={18} />
            </button>

            <VariantSelect
              variants={variants}
              selectedVariantId={selectedVariantId}
              setSelectedVariantId={setSelectedVariantId}
            />
          </div>

          <div className="mt-5 max-w-[560px]">
            <FeatureSearch query={query} setQuery={setQuery} />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function CategoryTabs({ activeCategory, setActiveCategory, mobile = false }) {
  return (
    <motion.nav
      variants={fadeUp}
      className={
        mobile
          ? "-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex flex-wrap items-center gap-4"
      }
    >
      {CATEGORY_CONFIG.map((category) => {
        const Icon = category.Icon;
        const active = category.id === activeCategory;

        return (
          <button
            type="button"
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`inline-flex shrink-0 items-center gap-3 rounded-[17px] border bg-white/94 transition ${
              mobile
                ? `h-[56px] px-4 text-[14px] font-medium ${
                    active
                      ? "border-[#075df6] text-[#075df6] shadow-[0_18px_42px_-28px_rgba(37,99,235,0.52)]"
                      : "border-[#dbe3ef] text-[#1f2937] shadow-[0_16px_36px_-30px_rgba(15,23,42,0.38)]"
                  }`
                : `h-[52px] px-5 text-[13px] font-semibold ${
                    active
                      ? "border-[#075df6] text-[#075df6] shadow-[0_18px_42px_-30px_rgba(37,99,235,0.5)]"
                      : "border-[#dbe3ef] text-[#172033] shadow-[0_16px_38px_-32px_rgba(15,23,42,0.38)] hover:bg-[#eff6ff]"
                  }`
            }`}
          >
            <Icon size={mobile ? 22 : 20} strokeWidth={1.9} />
            <span>{category.label}</span>
          </button>
        );
      })}
    </motion.nav>
  );
}

function FeatureRow({ feature, mobile = false }) {
  const Icon = feature.Icon || Sparkles;

  return (
    <motion.div
      layout
      variants={fadeUp}
      className={`grid items-center border-b border-[#e8eef7] last:border-b-0 ${
        mobile
          ? "grid-cols-[54px_1fr_auto] gap-3 px-3 py-3.5"
          : "grid-cols-[68px_1fr_170px_38px] gap-4 px-5 py-3.5"
      }`}
    >
      <span
        className={`grid place-items-center rounded-[16px] border border-[#dbeafe] bg-[#f1f6ff] text-[#075df6] ${
          mobile ? "h-[42px] w-[42px]" : "h-[46px] w-[46px]"
        }`}
      >
        <Icon size={mobile ? 21 : 22} strokeWidth={1.85} />
      </span>

      <div className="min-w-0">
        <p
          className={`truncate text-[#07102b] ${
            mobile ? "text-[15px] font-normal" : "text-[15px] font-medium"
          }`}
          title={feature.name}
        >
          {feature.name}
        </p>
      </div>

      {feature.highlight ? (
        <span
          className={`w-fit rounded-[8px] border border-[#bfdbfe] bg-[#eff6ff] text-[#075df6] ${
            mobile
              ? "hidden px-2 py-1 text-[10px] font-semibold sm:inline-flex"
              : "inline-flex px-3 py-1.5 text-[11px] font-semibold"
          }`}
        >
          Segment highlight
        </span>
      ) : (
        <span className={mobile ? "hidden" : "block"} />
      )}

      <span className="grid place-items-center">
        {feature.available ? (
          <CircleCheck
            size={mobile ? 25 : 24}
            fill="#075df6"
            stroke="white"
            strokeWidth={2.4}
          />
        ) : (
          <CircleMinus
            size={mobile ? 25 : 24}
            className="text-[#94a3b8]"
            strokeWidth={1.7}
          />
        )}
      </span>
    </motion.div>
  );
}

function FeatureTable({
  activeCategory,
  filteredFeatures,
  categoryStats,
  mobile = false,
}) {
  const activeMeta =
    CATEGORY_CONFIG.find((item) => item.id === activeCategory) ||
    CATEGORY_CONFIG[0];

  const activeStats = categoryStats?.[activeCategory] || {
    available: 0,
    total: 0,
  };

  return (
    <motion.section
      variants={fadeUp}
      className={
        mobile
          ? "rounded-[24px] border border-[#dbe3ef] bg-white/95 p-4 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.48)]"
          : "rounded-[24px] border border-[#dbe3ef] bg-white/95 p-5 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.48)]"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          className={
            mobile
              ? "text-[18px] font-normal leading-none tracking-[-0.02em] text-[#07102b]"
              : "font-serif text-[20px] font-semibold leading-none tracking-[-0.045em] text-[#07102b]"
          }
        >
          All {activeMeta.label.toLowerCase()} features
        </h2>

        <p className="shrink-0 text-[14px] font-normal text-[#64748b]">
          <span className="text-[#075df6]">{activeStats.available}</span> /{" "}
          {activeStats.total} available
        </p>
      </div>

      <div
        className={
          mobile
            ? "mt-4 overflow-hidden rounded-[19px] border border-[#e2e8f0] bg-white"
            : "mt-4 overflow-hidden rounded-[20px] border border-[#e2e8f0] bg-white"
        }
      >
        <AnimatePresence mode="popLayout">
          {filteredFeatures.length ? (
            filteredFeatures.map((feature) => (
              <FeatureRow key={feature.id} feature={feature} mobile={mobile} />
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid min-h-[180px] place-items-center px-6 text-center"
            >
              <div>
                <Search size={24} className="mx-auto mb-2 text-[#94a3b8]" />
                <p className="text-sm font-medium text-[#64748b]">
                  No feature data available for this selection.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function DesktopFeatureControls({ query, setQuery, activeCategory }) {
  const activeMeta =
    CATEGORY_CONFIG.find((item) => item.id === activeCategory) ||
    CATEGORY_CONFIG[0];

  return (
    <div className="ml-auto hidden items-center gap-4 xl:flex">
      <button
        type="button"
        className="inline-flex h-[48px] items-center gap-2 rounded-[15px] border border-[#dbe3ef] bg-white/94 px-5 text-[13px] font-semibold text-[#172033] shadow-[0_16px_38px_-32px_rgba(15,23,42,0.38)]"
      >
        <Filter size={18} />
        Filter
        <ChevronDown size={16} />
      </button>

      <label className="grid h-[48px] w-[200px] grid-cols-[34px_1fr] items-center rounded-[15px] border border-[#dbe3ef] bg-white/94 px-3 text-[#64748b] shadow-[0_16px_38px_-32px_rgba(15,23,42,0.38)]">
        <Search size={18} />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search in ${activeMeta.label.toLowerCase()}`}
          className="min-w-0 border-0 bg-transparent text-[13px] font-normal text-[#172033] outline-none placeholder:text-[#94a3b8]"
        />
      </label>
    </div>
  );
}

function DesktopSidebar({
  query,
  setQuery,
  setActiveCategory,
  categoryStats,
  quickSearches,
  highlights,
}) {
  return (
    <aside className="space-y-4">
      <motion.article
        variants={fadeUp}
        className="rounded-[22px] border border-[#dbe3ef] bg-white/94 p-5 shadow-[0_22px_64px_-56px_rgba(15,23,42,0.42)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-[18px] font-semibold leading-none tracking-[-0.045em] text-[#07102b]">
            Feature search
          </h3>
          <Sparkles size={16} fill="#075df6" className="text-[#075df6]" />
        </div>

        <FeatureSearch query={query} setQuery={setQuery} />

        {quickSearches.length ? (
          <>
            <p className="mt-3 text-[11px] font-semibold text-[#94a3b8]">
              Popular searches
            </p>

            <div className="mt-2 flex flex-wrap gap-3">
              {quickSearches.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuery(chip)}
                  className="h-8 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-4 text-[11px] font-semibold text-[#075df6]"
                >
                  {chip}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </motion.article>

      <motion.article
        variants={fadeUp}
        className="rounded-[22px] border border-[#dbe3ef] bg-white/94 p-5 shadow-[0_22px_64px_-56px_rgba(15,23,42,0.42)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-[18px] font-semibold leading-none tracking-[-0.045em] text-[#07102b]">
            Feature summary
          </h3>
          <Sparkles size={16} fill="#075df6" className="text-[#075df6]" />
        </div>

        <div className="space-y-4">
          {CATEGORY_CONFIG.slice(0, 4).map((category) => {
            const stat = categoryStats?.[category.id] || {
              available: 0,
              total: 0,
            };
            const percent = stat.total
              ? Math.round((stat.available / stat.total) * 100)
              : 0;

            return (
              <button
                type="button"
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className="grid w-full grid-cols-[104px_1fr_54px] items-center gap-3 border-0 bg-transparent p-0 text-left"
              >
                <span className="text-[12px] font-semibold text-[#1f2937]">
                  {category.label}
                </span>

                <span className="h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="block h-full rounded-full bg-[#075df6]"
                  />
                </span>

                <span className="text-right text-[12px] font-medium text-[#64748b]">
                  {stat.available} / {stat.total}
                </span>
              </button>
            );
          })}
        </div>
      </motion.article>

      {highlights.length ? (
        <motion.article
          variants={fadeUp}
          className="rounded-[22px] border border-[#dbe3ef] bg-white/94 p-5 shadow-[0_22px_64px_-56px_rgba(15,23,42,0.42)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-[18px] font-semibold leading-none tracking-[-0.045em] text-[#07102b]">
              Why this variant stands out
            </h3>
            <Sparkles size={16} fill="#075df6" className="text-[#075df6]" />
          </div>

          <div className="space-y-3">
            {highlights.map((item) => (
              <p
                key={item}
                className="flex gap-2 text-[12px] font-medium leading-5 text-[#64748b]"
              >
                <Check
                  size={16}
                  className="mt-0.5 shrink-0 rounded-full bg-[#075df6] p-[3px] text-white"
                  strokeWidth={3}
                />
                {item}
              </p>
            ))}
          </div>
        </motion.article>
      ) : null}
    </aside>
  );
}

function DesktopFeaturesPage({
  title,
  image,
  variants,
  selectedVariant,
  selectedVariantId,
  setSelectedVariantId,
  activeCategory,
  setActiveCategory,
  query,
  setQuery,
  topSearch,
  setTopSearch,
  filteredFeatures,
  categoryStats,
  quickSearches,
  highlights,
  onAction,
  vehicle,
}) {
  return (
    <section className="hidden xl:block">
      <motion.div variants={stagger} initial="hidden" animate="visible">
        <DesktopHeader
          onAction={onAction}
          topSearch={topSearch}
          setTopSearch={setTopSearch}
          vehicle={vehicle}
        />

        <main className="mx-auto w-full max-w-[1510px] space-y-5 px-10 pb-[112px]">
          <DesktopHero
            title={title}
            image={image}
            selectedVariant={selectedVariant}
            variants={variants}
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
            query={query}
            setQuery={setQuery}
            onAction={onAction}
            vehicle={vehicle}
          />

          <section className="flex items-center gap-4">
            <CategoryTabs
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
            />
            <DesktopFeatureControls
              query={query}
              setQuery={setQuery}
              activeCategory={activeCategory}
            />
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)_460px] gap-7">
            <FeatureTable
              activeCategory={activeCategory}
              filteredFeatures={filteredFeatures}
              categoryStats={categoryStats}
            />

            <DesktopSidebar
              query={query}
              setQuery={setQuery}
              setActiveCategory={setActiveCategory}
              categoryStats={categoryStats}
              quickSearches={quickSearches}
              highlights={highlights}
            />
          </section>
        </main>
      </motion.div>

      <AssistantComposer onAction={onAction} vehicle={vehicle} />
    </section>
  );
}

function MobileHeader({ onAction, vehicle }) {
  return (
    <motion.header
      variants={fadeUp}
      className="flex items-center justify-between"
    >
      <AciLogo onAction={onAction} mobile />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() =>
            emitFeatureAction(onAction, {
              label: "Notifications",
              type: "notifications",
              vehicle,
            })
          }
          className="relative grid h-9 w-9 place-items-center border-0 bg-transparent text-[#566176]"
        >
          <Bell size={24} strokeWidth={1.85} />
          <span className="absolute right-1.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#075df6]" />
        </button>

        <button
          type="button"
          onClick={() =>
            emitFeatureAction(onAction, {
              label: "Profile",
              type: "profile",
              vehicle,
            })
          }
          className="h-[48px] w-[48px] rounded-full bg-white p-[3px] shadow-[0_0_0_1px_#dbe5f2,0_12px_26px_-16px_rgba(37,99,235,0.5)]"
        >
          <img
            src={AVATAR}
            alt="Profile"
            className="h-full w-full rounded-full object-cover"
          />
        </button>
      </div>
    </motion.header>
  );
}

function MobileTitle({ selectedVariant, onAction, title, vehicle }) {
  return (
    <motion.section
      variants={fadeUp}
      className="grid grid-cols-[70px_1fr_62px] items-center gap-3"
    >
      <button
        type="button"
        onClick={() =>
          emitFeatureAction(onAction, {
            label: "Back",
            type: "back_to_car",
            intent: ACI_INTENTS?.OPEN_VEHICLE,
            canvasType: ACI_CANVAS_TYPES?.CAR_OVERVIEW,
            vehicle,
          })
        }
        className="grid h-[60px] w-[60px] place-items-center rounded-full border border-[#dbe3ef] bg-white text-[#07102b] shadow-[0_22px_56px_-44px_rgba(15,23,42,0.48)]"
      >
        <ArrowLeft size={26} />
      </button>

      <div className="min-w-0">
        <h1 className="font-serif text-[32px] font-semibold leading-[0.96] tracking-[-0.06em] text-[#07102b]">
          Features explorer
        </h1>

        <p className="mt-2 truncate text-[16px] font-normal text-[#667085]">
          {title} {selectedVariant?.label || ""}
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          emitFeatureAction(onAction, {
            label: "Share",
            type: "share",
            vehicle,
          })
        }
        className="grid h-[56px] w-[56px] place-items-center rounded-full border border-[#dbe3ef] bg-white text-[#07102b] shadow-[0_22px_56px_-44px_rgba(15,23,42,0.48)]"
      >
        <Share2 size={23} />
      </button>
    </motion.section>
  );
}

function MobileHero({ title, image, selectedVariant, onAction, vehicle }) {
  const { base, seat } = parseVariantLabel(selectedVariant?.label);
  const price = selectedVariant?.price || compactText(vehicle?.priceRange);

  return (
    <motion.section
      variants={fadeUp}
      className="relative min-h-[214px] overflow-hidden rounded-[26px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#f5f9ff_0%,#ffffff_48%,#edf4ff_100%)] px-5 py-5 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.48)]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-80 [background:repeating-radial-gradient(ellipse_at_84%_26%,rgba(255,255,255,0.62)_0,rgba(255,255,255,0.62)_2px,transparent_3px,transparent_20px)]" />

      <div className="absolute bottom-1 left-[-18px] z-[4] w-[58%]">
        <VehicleImage src={image} title={title} mobile />
      </div>

      <div className="relative z-10 ml-[48%] min-w-0">
        <h2 className="font-serif text-[29px] font-semibold leading-[0.98] tracking-[-0.055em] text-[#07102b]">
          {title}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {base ? (
            <span className="text-[16px] font-medium text-[#075df6]">
              {base}
            </span>
          ) : null}

          {seat ? (
            <span className="inline-flex h-7 items-center rounded-[9px] border border-[#bfdbfe] bg-[#eff6ff] px-2.5 text-[13px] font-semibold text-[#075df6]">
              {seat}
            </span>
          ) : null}
        </div>

        {price ? (
          <p className="mt-4 flex items-center gap-2 text-[15px] font-medium text-[#526075]">
            {price}
            <Info size={16} />
          </p>
        ) : null}

        <button
          type="button"
          onClick={() =>
            emitFeatureAction(onAction, {
              label: "View key specs",
              type: "key_specs",
              intent: ACI_INTENTS?.SPECS,
              canvasType: ACI_CANVAS_TYPES?.SPECS,
              vehicle,
            })
          }
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-[13px] border border-[#bfdbfe] bg-white/78 px-4 text-[14px] font-medium text-[#075df6]"
        >
          View key specs
          <ChevronRight size={17} />
        </button>
      </div>
    </motion.section>
  );
}

function MobileFeaturesPage({
  title,
  image,
  selectedVariant,
  activeCategory,
  setActiveCategory,
  filteredFeatures,
  categoryStats,
  onAction,
  vehicle,
}) {
  return (
    <section className="xl:hidden">
      <motion.main
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col gap-5 px-5 pb-[100px] pt-5"
      >
        <MobileHeader onAction={onAction} vehicle={vehicle} />

        <MobileTitle
          title={title}
          selectedVariant={selectedVariant}
          onAction={onAction}
          vehicle={vehicle}
        />

        <MobileHero
          title={title}
          image={image}
          selectedVariant={selectedVariant}
          onAction={onAction}
          vehicle={vehicle}
        />

        <CategoryTabs
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          mobile
        />

        <FeatureTable
          activeCategory={activeCategory}
          filteredFeatures={filteredFeatures}
          categoryStats={categoryStats}
          mobile
        />
      </motion.main>

      <AssistantComposer mobile onAction={onAction} vehicle={vehicle} />
    </section>
  );
}

export default function AciAssistFeaturesScreen({
  vehicle = {},
  widget = {},
  message = {},
  onAction,
}) {
  const variants = useMemo(
    () => parseVariants(widget, vehicle),
    [widget, vehicle],
  );
  const features = useMemo(
    () => parseFeatures(widget, vehicle),
    [widget, vehicle],
  );

  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id || "",
  );
  const [activeCategory, setActiveCategory] = useState("comfort");
  const [query, setQuery] = useState("");
  const [topSearch, setTopSearch] = useState("");

  useEffect(() => {
    if (!variants.length) {
      setSelectedVariantId("");
      return;
    }

    if (!variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(variants[0]?.id || "");
    }
  }, [variants, selectedVariantId]);

  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ||
    variants[0] ||
    null;

  const title =
    compactText(
      valueFrom(widget || {}, ["model", "title", "vehicleName"], "") ||
        valueFrom(widget?.data || {}, ["model", "title", "vehicleName"], "") ||
        vehicle?.model ||
        vehicle?.displayName ||
        [vehicle?.brand || vehicle?.make, vehicle?.model]
          .filter(Boolean)
          .join(" "),
    ) || "Vehicle";

  const image = useMemo(() => {
    return (
      getDisplayCarImage(vehicle) ||
      extractImage(widget) ||
      extractImage(message) ||
      extractImage(vehicle)
    );
  }, [message, widget, vehicle]);

  const filteredFeatures = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return features.filter((feature) => {
      const categoryMatch = feature.category === activeCategory;
      const queryMatch =
        !normalisedQuery ||
        feature.name.toLowerCase().includes(normalisedQuery) ||
        feature.category.toLowerCase().includes(normalisedQuery);

      return categoryMatch && queryMatch;
    });
  }, [features, activeCategory, query]);

  const categoryStats = useMemo(
    () => parseStats(widget, features),
    [widget, features],
  );
  const quickSearches = useMemo(
    () => parseQuickSearches(widget, features),
    [widget, features],
  );
  const highlights = useMemo(
    () => parseHighlights(widget, features),
    [widget, features],
  );

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_84%_-10%,rgba(37,99,235,0.08),transparent_30%),linear-gradient(180deg,#fff_0%,#f8fbff_100%)] text-[#07102b]">
      <DesktopFeaturesPage
        title={title}
        image={image}
        variants={variants}
        selectedVariant={selectedVariant}
        selectedVariantId={selectedVariantId}
        setSelectedVariantId={setSelectedVariantId}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        query={query}
        setQuery={setQuery}
        topSearch={topSearch}
        setTopSearch={setTopSearch}
        filteredFeatures={filteredFeatures}
        categoryStats={categoryStats}
        quickSearches={quickSearches}
        highlights={highlights}
        onAction={onAction}
        vehicle={vehicle}
      />

      <MobileFeaturesPage
        title={title}
        image={image}
        selectedVariant={selectedVariant}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        filteredFeatures={filteredFeatures}
        categoryStats={categoryStats}
        onAction={onAction}
        vehicle={vehicle}
      />
    </div>
  );
}
