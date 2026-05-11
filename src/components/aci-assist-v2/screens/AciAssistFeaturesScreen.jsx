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
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../data/homeScreenData";
import { emitAciAction } from "../shared/AciAssistShared";
import { getDisplayCarImage } from "../shared/aciV2Image";

const AVATAR =
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=240&auto=format&fit=crop";

const categories = [
  { id: "comfort", label: "Comfort", Icon: Armchair },
  { id: "safety", label: "Safety", Icon: ShieldCheck },
  { id: "infotainment", label: "Infotainment", Icon: Music2 },
  { id: "convenience", label: "Convenience", Icon: Hand },
  { id: "adas", label: "ADAS", Icon: Route },
];
const FEATURE_ICONS = [
  Smartphone,
  Camera,
  Wind,
  ShieldCheck,
  Route,
  Gauge,
  Music2,
  Sparkles,
  Car,
  Check,
];

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
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

const compactText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(compactText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return compactText(value.label || value.name || value.title || value.value || "");
  }
  return "";
};

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.rows)) return value.rows;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.data?.rows)) return value.data.rows;
  if (Array.isArray(value.data?.items)) return value.data.items;
  if (Array.isArray(value.variants)) return value.variants;
  if (Array.isArray(value.features)) return value.features;
  return [];
};

const valueFrom = (object, keys, fallback = "") => {
  if (!object || typeof object !== "object") return fallback;

  for (const key of keys) {
    const value = object[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const isImageUrl = (value) => {
  if (!value || typeof value !== "string") return false;

  const text = value.trim();

  return (
    /^(data:image\/|blob:)/i.test(text) ||
    /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text) ||
    /cloudinary|imgix|googleusercontent|cardekho|carwale|acko|spinny|cars24|cdn|uploads|images/i.test(
      text,
    )
  );
};

const extractImage = (value, depth = 0) => {
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

    for (const nested of Object.values(value)) {
      const found = extractImage(nested, depth + 1);
      if (found) return found;
    }
  }

  return "";
};

const inferCategory = (name = "") => {
  const text = String(name).toLowerCase();
  if (/adas|lane|cruise|aeb|blind|collision|autonomous|assist/i.test(text)) return "adas";
  if (/airbag|safety|esc|isofix|brake|tpms|hill|camera|stability/i.test(text)) return "safety";
  if (/audio|speaker|touch|screen|android|apple|carplay|infotain|connected/i.test(text)) return "infotainment";
  if (/wireless|charger|mode|convenience|keyless|tailgate|seat memory|climate/i.test(text)) return "convenience";
  return "comfort";
};

const ensureFeatureRow = (value, index = 0) => {
  if (!value) return null;

  if (typeof value === "string") {
    const name = compactText(value);
    if (!name) return null;
    return {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      name,
      category: inferCategory(name),
      available: true,
      highlight: false,
    };
  }

  if (typeof value !== "object") return null;

  const name = compactText(
    value.name || value.label || value.title || value.feature || value.featureName,
  );

  if (!name) return null;

  const available =
    value.available === false ||
    value.present === false ||
    /no|unavailable|missing/i.test(compactText(value.status))
      ? false
      : true;

  return {
    id:
      compactText(value.id || value.key || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") || `feature-${index}`,
    name,
    category: inferCategory(value.category || value.group || value.type || name),
    available,
    highlight:
      value.highlight === true ||
      value.segmentHighlight === true ||
      /highlight|best|segment|top/i.test(compactText(value.badge || value.tag)),
  };
};

const collectFeaturesDeep = (value, bucket, depth = 0) => {
  if (!value || depth > 7) return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectFeaturesDeep(item, bucket, depth + 1));
    return;
  }

  if (typeof value === "string") {
    const row = ensureFeatureRow(value, bucket.length);
    if (row) bucket.push(row);
    return;
  }

  if (typeof value !== "object") return;

  const direct = ensureFeatureRow(value, bucket.length);
  if (direct) bucket.push(direct);

  const nestedKeys = [
    "features",
    "featureList",
    "highlights",
    "specs",
    "items",
    "rows",
    "data",
    "variants",
    "variant",
  ];

  nestedKeys.forEach((key) => collectFeaturesDeep(value[key], bucket, depth + 1));
};

const dedupeById = (rows = []) => {
  const seen = new Set();
  const out = [];
  rows.forEach((row) => {
    if (!row?.id || seen.has(row.id)) return;
    seen.add(row.id);
    out.push(row);
  });
  return out;
};

function emitFeatureAction(onAction, {
  label,
  query,
  type = "features_action",
  intent = ACI_INTENTS.FEATURES,
  canvasType = ACI_CANVAS_TYPES.FEATURES,
  vehicle,
  payload = {},
}) {
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

function AciLogo({ onAction }) {
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
      <span className="select-none text-[34px] font-black leading-none tracking-[-0.18em] text-[#075df6] [transform:skewX(-9deg)]">
        ACI
      </span>
      <span className="select-none text-[16px] font-black tracking-[0.36em] text-[#080f2b]">
        ASSIST
      </span>
    </button>
  );
}

function SafariVector({ compact = false }) {
  return (
    <svg
      viewBox="0 0 820 430"
      role="img"
      aria-label="Vehicle"
      className={`h-auto w-full ${compact ? "max-h-[170px]" : ""}`}
    >
      <defs>
        <linearGradient id="safariFeaturePaint" x1="0" x2="1">
          <stop offset="0%" stopColor="#071d3c" />
          <stop offset="48%" stopColor="#0b3f7f" />
          <stop offset="100%" stopColor="#071d3c" />
        </linearGradient>
        <linearGradient id="safariFeatureGlass" x1="0" x2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#172033" />
        </linearGradient>
      </defs>

      <ellipse cx="410" cy="360" rx="270" ry="36" fill="rgba(15,23,42,.14)" />

      <path
        d="M84 292 L129 212 Q166 145 246 136 L420 127 Q503 123 570 169 L671 233 Q714 261 735 305 L743 326 L76 326 Z"
        fill="url(#safariFeaturePaint)"
      />
      <path
        d="M237 147 L423 138 Q496 136 554 174 L612 222 L174 222 Z"
        fill="url(#safariFeatureGlass)"
        opacity=".94"
      />
      <rect x="338" y="280" width="122" height="34" rx="8" fill="#f8fafc" />
      <text x="399" y="302" textAnchor="middle" fontSize="17" fontWeight="900" fill="#0f172a">
        CAR
      </text>
      <circle cx="216" cy="326" r="55" fill="#0f172a" />
      <circle cx="216" cy="326" r="30" fill="#d8dee8" />
      <circle cx="622" cy="326" r="55" fill="#0f172a" />
      <circle cx="622" cy="326" r="30" fill="#d8dee8" />
    </svg>
  );
}

function VehicleImage({ src, title, compact = false }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <SafariVector compact={compact} />;
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

function AssistantComposer({ mobile = false, onAction }) {
  return (
    <section
      className={
        mobile
          ? "fixed bottom-0 left-1/2 z-[90] w-full max-w-[430px] -translate-x-1/2 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2"
          : "pointer-events-none fixed bottom-3 left-1/2 z-[80] w-full max-w-[640px] -translate-x-1/2 px-5"
      }
    >
      <div
        className={`pointer-events-auto grid items-center gap-2 rounded-[28px] border border-[rgba(37,99,235,0.18)] bg-white/96 shadow-[0_0_0_5px_rgba(37,99,235,0.04),0_22px_50px_-36px_rgba(37,99,235,0.52),inset_0_1px_0_rgba(255,255,255,1)] ${
          mobile
            ? "min-h-[58px] grid-cols-[40px_1fr_30px_46px] p-[6px]"
            : "min-h-[56px] grid-cols-[38px_1fr_32px_42px] p-[5px]"
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

function DesktopHeader({ onAction }) {
  return (
    <motion.header
      variants={fadeUp}
      className="mx-auto flex h-[76px] w-full max-w-[1510px] items-center justify-between px-8"
    >
      <AciLogo onAction={onAction} />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => emitFeatureAction(onAction, { label: "Notifications", type: "notifications" })}
          className="relative grid h-10 w-10 place-items-center border-0 bg-transparent text-[#566176]"
        >
          <Bell size={23} strokeWidth={1.85} />
          <span className="absolute right-2 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#075df6]" />
        </button>

        <button
          type="button"
          onClick={() => emitFeatureAction(onAction, { label: "Profile", type: "profile" })}
          className="h-[48px] w-[48px] rounded-full bg-white p-[3px] shadow-[0_0_0_1px_#dbe5f2,0_12px_26px_-16px_rgba(37,99,235,0.5)]"
        >
          <img src={AVATAR} alt="Profile" className="h-full w-full rounded-full object-cover" />
        </button>

        <ChevronDown size={16} className="text-[#64748b]" />
      </div>
    </motion.header>
  );
}

function VariantSelect({ variants, selectedVariantId, setSelectedVariantId, compact = false }) {
  return (
    <label
      className={`relative inline-flex items-center rounded-[15px] border border-[#dbe3ef] bg-white/94 text-[#172033] shadow-[0_18px_45px_-36px_rgba(15,23,42,0.5)] ${
        compact ? "h-10 px-3 text-[12px]" : "h-[46px] px-4 text-[13px]"
      }`}
    >
      <span className="mr-2 font-semibold text-[#64748b]">Change variant</span>

      <select
        value={selectedVariantId}
        onChange={(event) => setSelectedVariantId(event.target.value)}
        className="appearance-none border-0 bg-transparent pr-7 font-semibold text-[#075df6] outline-none"
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

function FeatureRow({ feature, mobile = false }) {
  const Icon = feature.Icon || Sparkles;

  return (
    <motion.div
      layout
      variants={fadeUp}
      className={`grid items-center border-b border-[#e8eef7] last:border-b-0 ${
        mobile
          ? "grid-cols-[54px_1fr_auto] gap-3 py-3.5"
          : "grid-cols-[68px_1fr_auto_auto] gap-4 px-4 py-3.5"
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
            mobile ? "text-[14.5px] font-medium" : "text-[15px] font-medium"
          }`}
          title={feature.name}
        >
          {feature.name}
        </p>
      </div>

      {feature.highlight ? (
        <span
          className={`rounded-[8px] border border-[#bfdbfe] bg-[#eff6ff] text-[#075df6] ${
            mobile
              ? "hidden px-2 py-1 text-[10px] font-semibold sm:inline-flex"
              : "inline-flex px-3 py-1.5 text-[11px] font-semibold"
          }`}
        >
          Segment highlight
        </span>
      ) : (
        <span className={mobile ? "hidden sm:block" : "block"} />
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
          <CircleMinus size={mobile ? 25 : 24} className="text-[#94a3b8]" strokeWidth={1.7} />
        )}
      </span>
    </motion.div>
  );
}

function FeatureTable({
  activeCategory,
  query,
  setQuery,
  filteredFeatures,
  mobile = false,
  backendLiveMode = false,
}) {
  const activeMeta = categories.find((item) => item.id === activeCategory) || categories[0];

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
              ? "font-serif text-[22px] font-semibold leading-none tracking-[-0.045em] text-[#07102b]"
              : "font-serif text-[25px] font-semibold leading-none tracking-[-0.045em] text-[#07102b]"
          }
        >
          All {activeMeta.label.toLowerCase()} features
        </h2>

        <p className="shrink-0 text-[14px] font-medium text-[#64748b]">
          <span className="text-[#075df6]">{filteredFeatures.length}</span>
        </p>
      </div>

      <label
        className={`mt-4 grid items-center rounded-[17px] border border-[#dbe3ef] bg-white/95 text-[#64748b] shadow-[0_16px_42px_-36px_rgba(15,23,42,0.45)] ${
          mobile
            ? "h-[46px] grid-cols-[34px_1fr] px-3"
            : "h-[50px] grid-cols-[38px_1fr] px-4"
        }`}
      >
        <Search size={mobile ? 18 : 19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search features like sunroof, ADAS, ventilated seats..."
          className="min-w-0 border-0 bg-transparent text-[13px] font-normal text-[#172033] outline-none placeholder:text-[#94a3b8]"
        />
      </label>

      <div
        className={
          mobile
            ? "mt-4 overflow-hidden rounded-[19px] border border-[#e2e8f0] bg-white"
            : "mt-5 overflow-hidden rounded-[20px] border border-[#e2e8f0] bg-white"
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
              className="grid min-h-[140px] place-items-center px-6 text-center"
            >
              <div>
                <Search size={24} className="mx-auto mb-2 text-[#94a3b8]" />
                <p className="text-sm font-medium text-[#64748b]">
                  {backendLiveMode
                    ? "No live features returned for this model right now."
                    : "No matching features found."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function DesktopHero({
  title,
  image,
  selectedVariant,
  variants,
  selectedVariantId,
  setSelectedVariantId,
  onAction,
}) {
  return (
    <motion.section
      variants={fadeUp}
      className="relative overflow-hidden rounded-[28px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#f4f8ff_0%,#ffffff_48%,#edf4ff_100%)] shadow-[0_28px_78px_-58px_rgba(15,23,42,0.48)]"
    >
      <button
        type="button"
        onClick={() => emitFeatureAction(onAction, { label: "Share", type: "share" })}
        className="absolute right-7 top-7 z-20 inline-flex h-11 items-center gap-2 rounded-[14px] border border-[#dbe3ef] bg-white/82 px-4 text-[13px] font-semibold text-[#172033] shadow-[0_18px_38px_-30px_rgba(15,23,42,0.5)]"
      >
        <Share2 size={17} />
        Share
      </button>

      <div className="relative z-10 grid min-h-[370px] grid-cols-[1.04fr_.96fr] items-center gap-8 px-10 py-8">
        <div className="relative flex h-full items-end justify-center">
          <div className="w-[88%] max-w-[680px]">
            <VehicleImage src={image} title={title} />
          </div>
        </div>

        <div className="max-w-[575px] pb-2">
          <h1 className="font-serif text-[56px] font-semibold leading-[0.95] tracking-[-0.065em] text-[#07102b]">
            {title}
          </h1>

          <p className="mt-4 flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] text-[#526075]">
            {selectedVariant.price || "Price unavailable"}
            <Info size={17} />
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => emitFeatureAction(onAction, { label: "View key specs", type: "key_specs" })}
              className="inline-flex h-[48px] items-center gap-2 rounded-[14px] border-0 bg-[linear-gradient(135deg,#075df6,#0448d8)] px-7 text-[15px] font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.7)]"
            >
              View key specs
              <ChevronRight size={19} />
            </button>

            <VariantSelect
              variants={variants}
              selectedVariantId={selectedVariantId}
              setSelectedVariantId={setSelectedVariantId}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function CategoryTabs({ activeCategory, setActiveCategory, mobile = false }) {
  const counts = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = { available: 0, total: 0 };
    });
    return map;
  }, []);

  return (
    <motion.nav
      variants={fadeUp}
      className={
        mobile
          ? "-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "grid grid-cols-5 overflow-hidden rounded-[22px] border border-[#dbe3ef] bg-white/92 shadow-[0_20px_60px_-52px_rgba(15,23,42,0.42)]"
      }
    >
      {categories.map((category) => {
        const Icon = category.Icon;
        const active = category.id === activeCategory;

        return (
          <button
            type="button"
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={
              mobile
                ? `inline-flex h-[56px] shrink-0 items-center gap-3 rounded-[18px] border px-4 text-[14px] font-medium transition ${
                    active
                      ? "border-[#075df6] bg-white text-[#075df6] shadow-[0_18px_42px_-28px_rgba(37,99,235,0.52)]"
                      : "border-[#dbe3ef] bg-white/92 text-[#1f2937]"
                  }`
                : `relative flex h-[62px] items-center justify-center gap-3 text-[14px] font-semibold transition ${
                    active ? "text-[#075df6]" : "text-[#172033] hover:bg-[#eff6ff]"
                  }`
            }
          >
            <Icon size={mobile ? 22 : 20} strokeWidth={1.9} />

            <span>{category.label}</span>

            {!mobile && active ? (
              <motion.span
                layoutId="feature-active-category"
                className="absolute inset-x-0 bottom-0 h-[3px] bg-[#075df6]"
              />
            ) : null}
          </button>
        );
      })}
    </motion.nav>
  );
}

function DesktopSidebar({ setQuery, setActiveCategory, categoryStats }) {
  return (
    <aside className="space-y-4">
      <motion.article
        variants={fadeUp}
        className="rounded-[22px] border border-[#dbe3ef] bg-white/94 p-5 shadow-[0_22px_64px_-56px_rgba(15,23,42,0.42)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-[20px] font-semibold leading-none tracking-[-0.045em] text-[#07102b]">
            Feature summary
          </h3>
          <Sparkles size={17} fill="#075df6" className="text-[#075df6]" />
        </div>

        <div className="space-y-4">
          {categories.slice(0, 4).map((category) => {
            const stat = categoryStats[category.id] || { available: 0, total: 0 };
            const percent = stat.total ? Math.round((stat.available / stat.total) * 100) : 0;

            return (
              <button
                type="button"
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className="grid w-full grid-cols-[110px_1fr_54px] items-center gap-3 border-0 bg-transparent p-0 text-left"
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

      <motion.article
        variants={fadeUp}
        className="rounded-[22px] border border-[#dbe3ef] bg-white/94 p-5 shadow-[0_22px_64px_-56px_rgba(15,23,42,0.42)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-[20px] font-semibold leading-none tracking-[-0.045em] text-[#07102b]">
            Popular searches
          </h3>
          <Sparkles size={17} fill="#075df6" className="text-[#075df6]" />
        </div>

        <div className="flex flex-wrap gap-3">
          {["sunroof", "ADAS", "360 camera", "wireless CarPlay"].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setQuery(chip)}
              className="h-9 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-4 text-[12px] font-semibold text-[#075df6]"
            >
              {chip}
            </button>
          ))}
        </div>
      </motion.article>
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
  filteredFeatures,
  onAction,
  backendLiveMode,
  categoryStats,
}) {
  return (
    <section className="hidden xl:block">
      <motion.div variants={stagger} initial="hidden" animate="visible">
        <DesktopHeader onAction={onAction} />

        <main className="mx-auto w-full max-w-[1510px] space-y-4 px-8 pb-[110px]">
          <DesktopHero
            title={title}
            image={image}
            selectedVariant={selectedVariant}
            variants={variants}
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
            onAction={onAction}
          />

          <CategoryTabs activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

          <section className="grid grid-cols-[minmax(0,1fr)_470px] gap-7">
            <FeatureTable
              activeCategory={activeCategory}
              query={query}
              setQuery={setQuery}
              filteredFeatures={filteredFeatures}
              backendLiveMode={backendLiveMode}
            />

            <DesktopSidebar
              setQuery={setQuery}
              setActiveCategory={setActiveCategory}
              categoryStats={categoryStats}
            />
          </section>
        </main>
      </motion.div>

      <AssistantComposer onAction={onAction} />
    </section>
  );
}

function MobileHeader({ onAction }) {
  return (
    <motion.header variants={fadeUp} className="flex items-center justify-between">
      <AciLogo onAction={onAction} />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => emitFeatureAction(onAction, { label: "Notifications", type: "notifications" })}
          className="relative grid h-9 w-9 place-items-center border-0 bg-transparent text-[#566176]"
        >
          <Bell size={24} strokeWidth={1.85} />
          <span className="absolute right-1.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#075df6]" />
        </button>

        <button
          type="button"
          onClick={() => emitFeatureAction(onAction, { label: "Profile", type: "profile" })}
          className="h-[48px] w-[48px] rounded-full bg-white p-[3px] shadow-[0_0_0_1px_#dbe5f2,0_12px_26px_-16px_rgba(37,99,235,0.5)]"
        >
          <img src={AVATAR} alt="Profile" className="h-full w-full rounded-full object-cover" />
        </button>
      </div>
    </motion.header>
  );
}

function MobileTitle({ selectedVariant, onAction, title }) {
  return (
    <motion.section variants={fadeUp} className="grid grid-cols-[86px_1fr_70px] items-center gap-3">
      <button
        type="button"
        onClick={() =>
          emitFeatureAction(onAction, {
            label: "Back",
            type: "back_to_car",
            intent: ACI_INTENTS.OPEN_VEHICLE,
            canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
          })
        }
        className="grid h-[64px] w-[64px] place-items-center rounded-full border border-[#dbe3ef] bg-white text-[#07102b] shadow-[0_22px_56px_-44px_rgba(15,23,42,0.48)]"
      >
        <ArrowLeft size={27} />
      </button>

      <div className="min-w-0">
        <h1 className="font-serif text-[33px] font-semibold leading-[0.96] tracking-[-0.06em] text-[#07102b]">
          Features explorer
        </h1>

        <p className="mt-2 truncate text-[17px] font-normal text-[#667085]">
          {title} {selectedVariant.label}
        </p>
      </div>

      <button
        type="button"
        onClick={() => emitFeatureAction(onAction, { label: "Share", type: "share" })}
        className="grid h-[58px] w-[58px] place-items-center rounded-full border border-[#dbe3ef] bg-white text-[#07102b] shadow-[0_22px_56px_-44px_rgba(15,23,42,0.48)]"
      >
        <Share2 size={24} />
      </button>
    </motion.section>
  );
}

function MobileHero({ title, image, selectedVariant, variants, selectedVariantId, setSelectedVariantId, onAction }) {
  return (
    <motion.section
      variants={fadeUp}
      className="relative min-h-[218px] overflow-hidden rounded-[26px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#f5f9ff_0%,#ffffff_48%,#edf4ff_100%)] px-5 py-5 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.48)]"
    >
      <div className="absolute bottom-2 left-[-24px] z-[4] w-[58%]">
        <VehicleImage src={image} title={title} compact />
      </div>

      <div className="relative z-10 ml-[48%] min-w-0">
        <h2 className="font-serif text-[29px] font-semibold leading-[0.98] tracking-[-0.055em] text-[#07102b]">
          {title}
        </h2>

        <p className="mt-4 flex items-center gap-2 text-[15px] font-medium text-[#526075]">
          {selectedVariant.price}
          <Info size={16} />
        </p>

        <div className="mt-4">
          <VariantSelect
            variants={variants}
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
            compact
          />
        </div>

        <button
          type="button"
          onClick={() => emitFeatureAction(onAction, { label: "View key specs", type: "key_specs" })}
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
  variants,
  selectedVariant,
  selectedVariantId,
  setSelectedVariantId,
  activeCategory,
  setActiveCategory,
  query,
  setQuery,
  filteredFeatures,
  onAction,
  backendLiveMode,
}) {
  return (
    <section className="xl:hidden">
      <motion.main
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col gap-5 px-5 pb-[100px] pt-5"
      >
        <MobileHeader onAction={onAction} />

        <MobileTitle title={title} selectedVariant={selectedVariant} onAction={onAction} />

        <MobileHero
          title={title}
          image={image}
          selectedVariant={selectedVariant}
          variants={variants}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          onAction={onAction}
        />

        <CategoryTabs
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          mobile
        />

        <FeatureTable
          activeCategory={activeCategory}
          query={query}
          setQuery={setQuery}
          filteredFeatures={filteredFeatures}
          mobile
          backendLiveMode={backendLiveMode}
        />
      </motion.main>

      <AssistantComposer mobile onAction={onAction} />
    </section>
  );
}

function parseVariants(widget, vehicle) {
  const raw = [
    ...asArray(widget?.variants),
    ...asArray(widget?.data?.variants),
    ...asArray(widget?.variantOptions),
    ...asArray(widget?.rows).map((item) => ({ ...item, variant: item?.variant || item?.variantName || item?.name })),
    ...asArray(vehicle?.variants),
  ];

  const parsed = raw
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: item.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `variant-${index}`,
          label: item,
          price: "",
        };
      }

      const label = compactText(
        item?.label || item?.name || item?.variant || item?.variantName || item?.title,
      );

      if (!label) return null;

      const price = compactText(item?.price || item?.priceRange || item?.range || item?.onRoadPrice) || "";

      return {
        id:
          compactText(item?.id || item?.key || label)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-") || `variant-${index}`,
        label,
        price,
      };
    })
    .filter(Boolean);

  if (parsed.length) return parsed;

  const selected = compactText(vehicle?.selectedVariant || vehicle?.variant || "");
  if (selected) {
    return [{ id: selected.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: selected, price: compactText(vehicle?.priceRange) }];
  }

  return [{ id: "current", label: selected || "Variant", price: compactText(vehicle?.priceRange) }];
}

function parseFeatures(widget, vehicle) {
  const rows = [];

  collectFeaturesDeep(widget?.features, rows);
  collectFeaturesDeep(widget?.data?.features, rows);
  collectFeaturesDeep(widget?.rows, rows);
  collectFeaturesDeep(widget?.items, rows);
  collectFeaturesDeep(widget?.data?.rows, rows);
  collectFeaturesDeep(vehicle?.features, rows);
  collectFeaturesDeep(vehicle?.specs, rows);
  collectFeaturesDeep(vehicle?.highlights, rows);
  collectFeaturesDeep(vehicle?.variants, rows);

  const parsed = dedupeById(rows).map((item, index) => ({
    ...item,
    Icon: FEATURE_ICONS[index % FEATURE_ICONS.length] || Sparkles,
  }));

  return parsed;
}

export default function AciAssistFeaturesScreen({ vehicle, widget, onAction }) {
  const variants = useMemo(() => parseVariants(widget, vehicle), [widget, vehicle]);
  const features = useMemo(() => parseFeatures(widget, vehicle), [widget, vehicle]);
  const backendLiveMode = Boolean(widget?.__fromBackend);

  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || "current");
  const [activeCategory, setActiveCategory] = useState("comfort");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(variants[0]?.id || "current");
    }
  }, [variants, selectedVariantId]);

  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) || variants[0] || { id: "current", label: "Variant", price: "" };

  const title =
    compactText(
      valueFrom(widget || {}, ["model", "title"], "") ||
        vehicle?.model ||
        vehicle?.displayName ||
        [vehicle?.brand || vehicle?.make, vehicle?.model].filter(Boolean).join(" "),
    ) || "Selected car";

  const image = useMemo(() => {
    const direct =
      getDisplayCarImage(vehicle) ||
      extractImage(widget) ||
      extractImage(vehicle) ||
      "";

    return direct;
  }, [widget, title, vehicle]);

  const filteredFeatures = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return features.filter((feature) => {
      const categoryMatch = feature.category === activeCategory;
      const searchMatch =
        !normalized ||
        feature.name.toLowerCase().includes(normalized) ||
        feature.category.toLowerCase().includes(normalized);

      return categoryMatch && searchMatch;
    });
  }, [features, activeCategory, query]);

  const categoryStats = useMemo(() => {
    const seed = {};
    categories.forEach((category) => {
      seed[category.id] = { available: 0, total: 0 };
    });

    features.forEach((feature) => {
      const key = feature.category && seed[feature.category] ? feature.category : "comfort";
      seed[key].total += 1;
      if (feature.available !== false) seed[key].available += 1;
    });

    return seed;
  }, [features]);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_84%_-10%,rgba(37,99,235,0.08),transparent_30%),linear-gradient(180deg,#fff_0%,#f8fbff_100%)]">
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
        filteredFeatures={filteredFeatures}
        onAction={onAction}
        backendLiveMode={backendLiveMode}
        categoryStats={categoryStats}
      />

      <MobileFeaturesPage
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
        filteredFeatures={filteredFeatures}
        onAction={onAction}
        backendLiveMode={backendLiveMode}
      />
    </div>
  );
}
