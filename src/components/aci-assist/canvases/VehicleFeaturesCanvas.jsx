import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Car,
  CheckCircle2,
  CircleAlert,
  Download,
  Layers3,
  ListFilter,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { asArray, humanize } from "../utils";
import {
  rowsFrom,
  valueFrom,
  compactText,
  formatAmount,
  getPriceParts,
} from "../canvas-utils";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const MAX_SELECTED_VARIANTS = 4;
const ALL_CATEGORY = "All Features";

const CATEGORY_ORDER = [
  ALL_CATEGORY,
  "Safety",
  "Comfort",
  "Infotainment",
  "Exterior",
  "Interior",
  "Engine",
  "Dimensions",
  "Features",
];

const IMAGE_KEYS = [
  "heroImage",
  "heroImageUrl",
  "vehicleImage",
  "vehicleImageUrl",
  "imageUrl",
  "image_url",
  "image",
  "thumbnail",
  "thumbnailUrl",
  "carImage",
  "car_image",
  "colorImage",
  "color_image",
  "photo",
  "url",
  "src",
];

const MODEL_IMAGE_MAP = {
  "hyundai verna": "/aci-cars/hyundai-verna.png",
  "tata safari": "/aci-cars/tata-safari.png",
  "kia seltos": "/aci-cars/kia-seltos.png",
  "hyundai creta": "/aci-cars/hyundai-creta.png",
};

const slug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const featureKeyFor = (group, feature) =>
  `${slug(group || "Features")}::${slug(feature || "")}`;

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const widgetTypeOf = (item = {}) =>
  String(item.type || item.widgetType || item.name || "").toLowerCase();

const collectWidgetsDeep = (value, depth = 0) => {
  if (!value || depth > 6) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectWidgetsDeep(item, depth + 1));
  }

  if (typeof value !== "object") return [];

  const type = widgetTypeOf(value);
  const looksLikeWidget =
    type ||
    value.rows ||
    value.records ||
    value.variants ||
    value.data?.rows ||
    value.data?.records ||
    value.data?.variants;

  const nested = [
    ...collectWidgetsDeep(value.widgets, depth + 1),
    ...collectWidgetsDeep(value.data?.widgets, depth + 1),
    ...collectWidgetsDeep(value.result?.widgets, depth + 1),
  ];

  return looksLikeWidget ? [value, ...nested] : nested;
};

const isPriceWidget = (item) =>
  [
    "vehicle_pricelist",
    "vehicle_price_list",
    "vehicle_prices",
    "pricelist",
    "price_list",
  ].includes(widgetTypeOf(item));

const getPriceRowsFromSources = ({ message, widget }) => {
  const allWidgets = [
    ...collectWidgetsDeep(message),
    ...collectWidgetsDeep(widget),
    ...collectWidgetsDeep(widget?.data),
  ];

  const priceWidget = allWidgets.find(isPriceWidget);

  const directRows = [
    ...asArray(widget?.priceRows),
    ...asArray(widget?.prices),
    ...asArray(widget?.pricelist),
    ...asArray(widget?.data?.priceRows),
    ...asArray(widget?.data?.prices),
    ...asArray(widget?.data?.pricelist),
  ];

  return {
    priceWidget,
    priceRows: priceWidget ? rowsFrom(priceWidget) : directRows,
  };
};

const getVariantName = (variant, index = 0) =>
  compactText(
    valueFrom(
      variant,
      [
        "variant",
        "variantName",
        "variant_name",
        "VariantName",
        "variantDisplayName",
        "name",
        "title",
      ],
      `Variant ${index + 1}`,
    ),
  );

const normalizeVariantTokens = (value, brand, model) => {
  const ignored = new Set(
    [
      ...String(brand || "").toLowerCase().split(/\s+/),
      ...String(model || "").toLowerCase().split(/\s+/),
      "hyundai",
      "tata",
      "kia",
      "maruti",
      "honda",
      "skoda",
      "toyota",
      "mahindra",
      "petrol",
      "diesel",
      "cng",
      "electric",
      "manual",
      "automatic",
      "auto",
      "mt",
      "at",
      "ivt",
      "cvt",
      "dct",
      "mpi",
      "turbo",
      "variant",
    ].filter(Boolean),
  );

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !ignored.has(token));
};

const variantScore = (needle, candidate, brand, model) => {
  const needleText = String(needle || "").toLowerCase();
  const candidateText = String(candidate || "").toLowerCase();

  if (!needleText || !candidateText) return 0;
  if (needleText === candidateText) return 100;
  if (candidateText.includes(needleText)) return 88;
  if (needleText.includes(candidateText)) return 78;

  const needleTokens = normalizeVariantTokens(needle, brand, model);
  const candidateTokens = normalizeVariantTokens(candidate, brand, model);

  if (!needleTokens.length || !candidateTokens.length) return 0;

  const candidateSet = new Set(candidateTokens);
  const matched = needleTokens.filter((token) => candidateSet.has(token)).length;
  const ratio = matched / needleTokens.length;

  if (ratio === 1) return 72;
  if (ratio >= 0.75) return 58;
  if (ratio >= 0.5) return 38;

  return 0;
};

const matchPriceRow = ({ variantName, priceRows, brand, model }) => {
  let bestRow = null;
  let bestScore = 0;

  asArray(priceRows).forEach((row, index) => {
    const candidate = getVariantName(row, index);
    const score = variantScore(variantName, candidate, brand, model);

    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  });

  return bestScore >= 38 ? bestRow : null;
};

const readNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value ?? "").replace(/[^\d.]/g, "");
  const parsed = Number(text);

  return Number.isFinite(parsed) ? parsed : 0;
};

const getPriceLabel = (variant, priceRow) => {
  const source = priceRow || variant || {};
  const parts = getPriceParts(source);

  const numeric =
    parts.exShowroom ||
    readNumber(
      valueFrom(
        source,
        [
          "exShowroom",
          "exShowroomPrice",
          "ex_showroom",
          "ex_showroom_price",
          "ExShowRoomPrice",
          "price",
          "priceText",
        ],
        "",
      ),
    );

  if (numeric) return formatAmount(numeric);

  const raw = compactText(
    valueFrom(
      source,
      [
        "price",
        "priceText",
        "exShowroomText",
        "ex_showroom_text",
        "displayPrice",
      ],
      "",
    ),
  );

  return raw || "";
};

const getVariantMeta = (variant, priceRow) => {
  const source = priceRow || variant || {};

  const fuel = compactText(
    valueFrom(source, ["fuel", "fuelType", "fuel_type", "FuelType"], ""),
  );

  const transmission = compactText(
    valueFrom(
      source,
      [
        "transmission",
        "transmissionType",
        "transmission_type",
        "TransmissionType",
      ],
      "",
    ),
  );

  const engine = compactText(
    valueFrom(source, ["engine", "engineType", "engine_type"], ""),
  );

  const priceLabel = getPriceLabel(variant, priceRow);

  return {
    fuel,
    transmission,
    engine,
    priceLabel,
    line: [fuel, transmission, engine].filter(Boolean).join(" / "),
  };
};

const directValueKeys = [
  "value",
  "featureValue",
  "feature_value",
  "available",
  "status",
  "answer",
  "details",
];

const readDirectValue = (item) => {
  if (!isPlainObject(item)) return undefined;

  for (const key of directValueKeys) {
    if (
      Object.prototype.hasOwnProperty.call(item, key) &&
      item[key] !== undefined &&
      item[key] !== null
    ) {
      return item[key];
    }
  }

  return undefined;
};

const normalizeDisplayValue = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";

  if (isPlainObject(value)) {
    const direct = readDirectValue(value);

    if (direct !== undefined) return normalizeDisplayValue(direct);

    return compactText(
      value.label || value.name || value.title || JSON.stringify(value),
      "—",
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDisplayValue(item)).join(", ");
  }

  const text = compactText(value, "—");

  if (String(text).toLowerCase() === "true") return "Yes";
  if (String(text).toLowerCase() === "false") return "No";

  return text;
};

const classifyFeatureValue = (value) => {
  if (value === true) return "yes";
  if (value === false) return "no";

  const text = normalizeDisplayValue(value).trim().toLowerCase();

  if (!text || text === "—" || text === "-") return "no";

  if (
    /not available|not offered|unavailable|missing|^no$|^false$|^n\/a$|^na$/i.test(
      text,
    )
  ) {
    return "no";
  }

  return "yes";
};

const isUsableImageUrl = (value) => {
  if (!value || typeof value !== "string") return false;

  const text = value.trim();

  return (
    /^(data:image\/|blob:)/i.test(text) ||
    /^https?:\/\//i.test(text) ||
    /^(\/|\.\/|\.\.\/)/.test(text) ||
    /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text)
  );
};

const findImageIn = (value, depth = 0) => {
  if (!value || depth > 6) return "";

  if (typeof value === "string") {
    return isUsableImageUrl(value) ? value.trim() : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageIn(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const key of IMAGE_KEYS) {
      const found = findImageIn(value[key], depth + 1);
      if (found) return found;
    }

    for (const nestedValue of Object.values(value)) {
      const found = findImageIn(nestedValue, depth + 1);
      if (found) return found;
    }
  }

  return "";
};

const categorySort = (a, b) => {
  const aIndex = CATEGORY_ORDER.indexOf(a);
  const bIndex = CATEGORY_ORDER.indexOf(b);

  if (aIndex !== -1 || bIndex !== -1) {
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  }

  return a.localeCompare(b);
};

const addFeature = (acc, group, feature, value) => {
  const safeGroup = humanize(compactText(group, "Features"));
  const safeFeature = humanize(compactText(feature, ""));

  if (!safeFeature) return;

  const key = featureKeyFor(safeGroup, safeFeature);

  acc.push({
    key,
    group: safeGroup,
    feature: safeFeature,
    rawFeature: compactText(feature, safeFeature),
    value,
    status: classifyFeatureValue(value),
    searchable:
      `${safeGroup} ${safeFeature} ${normalizeDisplayValue(value)}`.toLowerCase(),
  });
};

const normalizeFeaturesToList = (rawFeatures) => {
  const items = [];

  const walkArray = (features, fallbackGroup = "Features") => {
    asArray(features).forEach((item, index) => {
      if (!item) return;

      if (typeof item === "string") {
        addFeature(items, fallbackGroup, item, "Yes");
        return;
      }

      if (!isPlainObject(item)) {
        addFeature(items, fallbackGroup, `Feature ${index + 1}`, item);
        return;
      }

      const group = compactText(
        valueFrom(
          item,
          ["group", "category", "section", "type"],
          fallbackGroup,
        ),
      );

      const nested = item.items || item.features || item.rows || item.children;

      if (Array.isArray(nested)) {
        walkArray(nested, group);
        return;
      }

      if (isPlainObject(nested)) {
        Object.entries(nested).forEach(([feature, value]) => {
          addFeature(items, group, feature, value);
        });
        return;
      }

      const feature = compactText(
        valueFrom(
          item,
          ["feature", "featureName", "feature_name", "label", "name", "key"],
          "",
        ),
      );

      const directValue = readDirectValue(item);

      addFeature(
        items,
        group,
        feature || `Feature ${index + 1}`,
        directValue !== undefined ? directValue : item,
      );
    });
  };

  if (Array.isArray(rawFeatures)) {
    walkArray(rawFeatures);
    return items;
  }

  if (isPlainObject(rawFeatures)) {
    Object.entries(rawFeatures).forEach(([key, value]) => {
      if (String(key).includes("|")) {
        const [group, feature] = String(key)
          .split("|")
          .map((part) => part.trim());

        addFeature(items, group || "Features", feature || key, value);
        return;
      }

      if (Array.isArray(value)) {
        walkArray(value, humanize(key));
        return;
      }

      if (isPlainObject(value)) {
        const directValue = readDirectValue(value);

        if (directValue !== undefined) {
          addFeature(items, "Features", key, directValue);
          return;
        }

        Object.entries(value).forEach(([feature, nestedValue]) => {
          addFeature(items, humanize(key), feature, nestedValue);
        });
        return;
      }

      addFeature(items, "Features", key, value);
    });
  }

  return items;
};

function HighlightText({ text, query }) {
  const value = String(text ?? "");

  if (!query.trim()) return value;

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = value.split(regex);
  const lowerQuery = query.trim().toLowerCase();

  return parts.map((part, index) =>
    part.toLowerCase() === lowerQuery ? (
      <span
        key={`${part}-${index}`}
        className="rounded bg-[#dbeafe] px-0.5 font-black text-[#1d4ed8]"
      >
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search
        size={15}
        strokeWidth={2}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[16px] border border-[#dbe3ef] bg-white/90 pl-10 pr-10 text-sm font-semibold text-[#0f172a] outline-none shadow-sm transition placeholder:text-[#94a3b8] focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-[#dbeafe]/70"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] transition hover:text-[#475569]"
          aria-label="Clear search"
        >
          <XCircle size={16} />
        </button>
      ) : null}
    </div>
  );
}

function Toggle({ checked, onChange, label, helper }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-[18px] px-1 py-1 text-left"
    >
      <span>
        <span className="block text-sm font-black text-[#334155]">{label}</span>
        {helper ? (
          <span className="mt-0.5 block text-xs font-semibold text-[#94a3b8]">
            {helper}
          </span>
        ) : null}
      </span>

      <span
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-[#2563eb]" : "bg-[#cbd5e1]",
        )}
      >
        <span
          className={cx(
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  );
}

function HeroCarArt({ image, alt }) {
  return (
    <div className="relative hidden min-h-[170px] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f8fafc_42%,#dbeafe_100%)] ring-1 ring-[#dbe3ef] lg:block">
      <div className="absolute inset-x-14 bottom-8 h-9 rounded-full bg-slate-500/20 blur-xl" />

      {image ? (
        <img
          src={image}
          alt={alt}
          className="absolute left-1/2 top-1/2 h-[92%] w-[92%] -translate-x-1/2 -translate-y-1/2 object-contain object-center drop-shadow-[0_24px_26px_rgba(15,23,42,0.22)]"
        />
      ) : (
        <div className="absolute left-1/2 top-1/2 flex h-24 w-52 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[42px] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#020617] text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.8)]">
          <Car size={66} strokeWidth={1.35} />
        </div>
      )}

      <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/80 blur-3xl" />
    </div>
  );
}

function CategoryIcon({ group }) {
  const text = String(group || "").toLowerCase();

  if (text.includes("all")) return <Layers3 size={16} />;
  if (text.includes("safety")) return <ShieldCheck size={16} />;
  if (text.includes("comfort")) return <Sparkles size={16} />;
  if (text.includes("engine")) return <Car size={16} />;
  if (text.includes("dimension")) return <Layers3 size={16} />;

  return <BadgeCheck size={16} />;
}

function FeatureValueCell({ value, query }) {
  const label = normalizeDisplayValue(value);
  const status = classifyFeatureValue(value);

  if (status === "no") {
    return (
      <span className="inline-flex items-center justify-center text-[#94a3b8]">
        —
      </span>
    );
  }

  if (/^yes$/i.test(label)) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-1 text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={14} />
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-[170px] items-center justify-center rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-black text-[#1e40af] ring-1 ring-[#bfdbfe]">
      <span className="whitespace-normal break-words text-center leading-4">
        {query ? <HighlightText text={label} query={query} /> : label}
      </span>
    </span>
  );
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe3ef] bg-white/86 px-3.5 py-2 text-xs font-black text-[#1e40af] shadow-sm">
      <Icon size={15} className="text-[#2563eb]" />
      <span>{value}</span>
      <span className="text-[#64748b]">{label}</span>
    </span>
  );
}

function PresetButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#dbe3ef] bg-white px-4 py-2 text-xs font-black text-[#334155] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] hover:text-[#1e40af]"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

const csvEscape = (value) =>
  `"${String(value ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;

function VariantCard({ record, selected, disabled, image, onClick }) {
  const badges = [
    record.meta.fuel,
    record.meta.transmission,
    /turbo/i.test(`${record.name} ${record.meta.line}`) ? "Turbo" : "",
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className={cx(
        "group relative min-h-[122px] overflow-hidden rounded-[20px] border p-3 text-left transition duration-200 disabled:cursor-not-allowed disabled:opacity-55",
        selected
          ? "border-[#2563eb] bg-[#eff6ff] shadow-[0_18px_42px_-30px_rgba(37,99,235,0.8)] ring-2 ring-[#bfdbfe]"
          : "border-[#dbe3ef] bg-white hover:-translate-y-0.5 hover:border-[#93c5fd] hover:bg-[#eff6ff]/55",
      )}
    >
      <div className="absolute right-3 top-3 z-10">
        <span
          className={cx(
            "flex h-6 w-6 items-center justify-center rounded-full border transition",
            selected
              ? "border-[#2563eb] bg-[#2563eb] text-white"
              : "border-[#cbd5e1] bg-white text-transparent group-hover:border-[#2563eb]",
          )}
        >
          <CheckCircle2 size={15} />
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
        <div className="min-w-0">
          <p className="pr-7 text-sm font-black leading-5 text-[#0f172a]">
            {record.name}
          </p>

          <p className="mt-2 text-xs font-black text-[#1e40af]">
            {record.meta.priceLabel || "Price unavailable"}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-[#f8fafc] px-2 py-1 text-[10px] font-black text-[#64748b] ring-1 ring-[#dbe3ef]"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[72px] overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f8fafc_42%,#dbeafe_100%)]">
          <div className="absolute inset-x-4 bottom-2 h-4 rounded-full bg-slate-500/20 blur-md" />
          {image ? (
            <img
              src={image}
              alt={record.name}
              className="absolute inset-0 h-full w-full object-contain p-1.5 drop-shadow-[0_16px_16px_rgba(15,23,42,0.18)]"
            />
          ) : (
            <Car
              size={36}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#475569]"
            />
          )}
        </div>
      </div>
    </button>
  );
}

function ExplorerControls({
  stickyColumns,
  setStickyColumns,
  showCounts,
  setShowCounts,
  unitDisplay,
  setUnitDisplay,
  totalFeatures,
  totalVariants,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <label className="block">
        <span className="mb-1.5 block text-xs font-black text-[#64748b]">
          Unit display
        </span>
        <select
          value={unitDisplay}
          onChange={(event) => setUnitDisplay(event.target.value)}
          className="h-11 w-full rounded-[16px] border border-[#dbe3ef] bg-white px-3 text-sm font-black text-[#334155] outline-none"
        >
          <option>Auto</option>
          <option>Metric</option>
          <option>Text only</option>
        </select>
      </label>

      <Toggle
        checked={stickyColumns}
        onChange={setStickyColumns}
        label="Sticky feature names"
        helper="Recommended for wide comparisons"
      />

      <Toggle
        checked={showCounts}
        onChange={setShowCounts}
        label="Show counts"
        helper={`${totalFeatures} features · ${totalVariants} variants`}
      />
    </div>
  );
}

export function VehicleFeaturesCanvas({ message, widget, footer }) {
  const rows = rowsFrom(widget);
  const variants = rows.length ? rows : asArray(widget.data?.variants);

  const [variantSearch, setVariantSearch] = useState("");
  const [featureSearch, setFeatureSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [selectedVariantIndexes, setSelectedVariantIndexes] = useState([
    0, 1, 2, 3,
  ]);
  const [compareAll, setCompareAll] = useState(false);
  const [diffOnly, setDiffOnly] = useState(false);
  const [stickyColumns, setStickyColumns] = useState(true);
  const [showCounts, setShowCounts] = useState(true);
  const [unitDisplay, setUnitDisplay] = useState("Auto");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const { priceWidget, priceRows } = useMemo(
    () => getPriceRowsFromSources({ message, widget }),
    [message, widget],
  );

  const model =
    widget.model ||
    widget.data?.model ||
    priceWidget?.model ||
    priceWidget?.data?.model ||
    valueFrom(variants[0], ["model"], message?.entities?.model || "");

  const brand =
    widget.brand ||
    widget.data?.brand ||
    priceWidget?.brand ||
    priceWidget?.data?.brand ||
    valueFrom(variants[0], ["brand", "make"], message?.entities?.brand || "");

  const titleVehicle = [brand, model].filter(Boolean).join(" ") || "Vehicle";

  const vehicleImage = useMemo(() => {
    const modelKey = titleVehicle.toLowerCase();

    return (
      findImageIn(widget) ||
      findImageIn(widget?.data) ||
      findImageIn(priceWidget) ||
      findImageIn(message?.widgets) ||
      findImageIn(variants) ||
      MODEL_IMAGE_MAP[modelKey] ||
      ""
    );
  }, [message?.widgets, priceWidget, titleVehicle, variants, widget]);

  const variantRecords = useMemo(() => {
    return variants.map((variant, index) => {
      const name = getVariantName(variant, index);
      const priceRow = matchPriceRow({
        variantName: name,
        priceRows,
        brand,
        model,
      });

      const rawFeatures =
        variant.features ||
        variant.featureGroups ||
        variant.feature_groups ||
        variant.specifications ||
        variant.specs ||
        widget.data?.features ||
        {};

      const features = normalizeFeaturesToList(rawFeatures);
      const featureMap = new Map();

      features.forEach((feature) => {
        featureMap.set(feature.key, feature);
      });

      const meta = getVariantMeta(variant, priceRow);
      const image =
        findImageIn(variant) ||
        findImageIn(priceRow) ||
        vehicleImage ||
        "";

      return {
        variant,
        priceRow,
        index,
        name,
        meta,
        image,
        features,
        featureMap,
        searchable: `${name} ${meta.line} ${meta.priceLabel}`.toLowerCase(),
      };
    });
  }, [brand, model, priceRows, variants, vehicleImage, widget.data?.features]);

  const featureCatalog = useMemo(() => {
    const catalog = new Map();

    variantRecords.forEach((record) => {
      record.features.forEach((feature) => {
        if (!catalog.has(feature.key)) {
          catalog.set(feature.key, {
            key: feature.key,
            group: feature.group,
            feature: feature.feature,
            rawFeature: feature.rawFeature,
            searchable: `${feature.group} ${feature.feature}`.toLowerCase(),
          });
        }
      });
    });

    return Array.from(catalog.values()).sort((a, b) => {
      const groupOrder = categorySort(a.group, b.group);
      if (groupOrder !== 0) return groupOrder;
      return a.feature.localeCompare(b.feature);
    });
  }, [variantRecords]);

  const defaultSelectedIndexes = useMemo(
    () => variantRecords.slice(0, MAX_SELECTED_VARIANTS).map((item) => item.index),
    [variantRecords],
  );

  const safeSelectedIndexes = selectedVariantIndexes.filter(
    (index) => index >= 0 && index < variantRecords.length,
  );

  const activeVariantIndexes = compareAll
    ? variantRecords.map((record) => record.index)
    : safeSelectedIndexes.length
      ? safeSelectedIndexes
      : defaultSelectedIndexes;

  const activeVariantRecords = activeVariantIndexes
    .map((index) => variantRecords[index])
    .filter(Boolean);

  const valueFor = (record, featureKey) =>
    record?.featureMap?.get(featureKey)?.value ?? "—";

  const featureHasDifference = (feature) => {
    if (activeVariantRecords.length < 2) return true;

    const values = activeVariantRecords.map((record) =>
      normalizeDisplayValue(valueFor(record, feature.key)).toLowerCase(),
    );

    return new Set(values).size > 1;
  };

  const availableCategoryStats = useMemo(() => {
    const source = diffOnly
      ? featureCatalog.filter((feature) => featureHasDifference(feature))
      : featureCatalog;

    const map = new Map();

    source.forEach((feature) => {
      if (!map.has(feature.group)) {
        map.set(feature.group, {
          group: feature.group,
          count: 0,
        });
      }

      map.get(feature.group).count += 1;
    });

    const categoryRows = Array.from(map.values()).sort((a, b) =>
      categorySort(a.group, b.group),
    );

    return [
      {
        group: ALL_CATEGORY,
        count: source.length,
      },
      ...categoryRows,
    ];
  }, [diffOnly, featureCatalog, activeVariantRecords]);

  const availableCategoryNames = availableCategoryStats.map((item) => item.group);

  const activeCategory = availableCategoryNames.includes(selectedCategory)
    ? selectedCategory
    : ALL_CATEGORY;

  const searchingFeatures = Boolean(featureSearch.trim());

  const filteredFeatures = useMemo(() => {
    const q = featureSearch.trim().toLowerCase();

    return featureCatalog.filter((feature) => {
      const matchesCategory =
        searchingFeatures ||
        activeCategory === ALL_CATEGORY ||
        feature.group === activeCategory;

      const matchesSearch =
        !q ||
        feature.searchable.includes(q) ||
        activeVariantRecords.some((record) =>
          normalizeDisplayValue(valueFor(record, feature.key))
            .toLowerCase()
            .includes(q),
        );

      const matchesDiff = !diffOnly || featureHasDifference(feature);

      return matchesCategory && matchesSearch && matchesDiff;
    });
  }, [
    activeCategory,
    activeVariantRecords,
    diffOnly,
    featureCatalog,
    featureSearch,
    searchingFeatures,
  ]);

  const variantOptions = useMemo(() => {
    const q = variantSearch.trim().toLowerCase();

    return variantRecords.filter((record) => !q || record.searchable.includes(q));
  }, [variantRecords, variantSearch]);

  const totalFeatures = featureCatalog.length;
  const selectedCount = activeVariantRecords.length;
  const tableMinWidth = Math.max(760, 320 + selectedCount * 190);

  const activeCategoryCount =
    availableCategoryStats.find((item) => item.group === activeCategory)?.count ||
    filteredFeatures.length;

  const selectPreset = (type) => {
    const all = variantRecords;
    let indexes = [];

    if (type === "base") {
      indexes = all.slice(0, MAX_SELECTED_VARIANTS).map((item) => item.index);
    }

    if (type === "top") {
      indexes = all.slice(-MAX_SELECTED_VARIANTS).map((item) => item.index);
    }

    if (type === "popular") {
      indexes = all
        .filter((item) => /sx|s|zx|htx|popular|value/i.test(item.name))
        .slice(0, MAX_SELECTED_VARIANTS)
        .map((item) => item.index);
    }

    if (type === "bestValue") {
      const middle = Math.max(0, Math.floor(all.length / 2) - 2);
      indexes = all
        .slice(middle, middle + MAX_SELECTED_VARIANTS)
        .map((item) => item.index);
    }

    if (type === "automatic") {
      indexes = all
        .filter((item) =>
          /automatic|auto|ivt|cvt|dct|at/i.test(
            `${item.name} ${item.meta.line}`,
          ),
        )
        .slice(0, MAX_SELECTED_VARIANTS)
        .map((item) => item.index);
    }

    if (type === "turbo") {
      indexes = all
        .filter((item) => /turbo/i.test(`${item.name} ${item.meta.line}`))
        .slice(0, MAX_SELECTED_VARIANTS)
        .map((item) => item.index);
    }

    if (!indexes.length) {
      indexes = all.slice(0, MAX_SELECTED_VARIANTS).map((item) => item.index);
    }

    setCompareAll(false);
    setSelectedVariantIndexes(indexes);
  };

  const toggleVariant = (index) => {
    setCompareAll(false);

    setSelectedVariantIndexes((current) => {
      if (current.includes(index)) {
        return current.length > 1
          ? current.filter((item) => item !== index)
          : current;
      }

      if (current.length >= MAX_SELECTED_VARIANTS) {
        return [...current.slice(1), index];
      }

      return [...current, index];
    });
  };

  const variantBuckets = useMemo(() => {
    const base = variantRecords.slice(0, 2);
    const automatic = variantRecords.filter((item) =>
      /automatic|auto|ivt|cvt|dct|at/i.test(`${item.name} ${item.meta.line}`),
    );
    const turbo = variantRecords.filter((item) =>
      /turbo/i.test(`${item.name} ${item.meta.line}`),
    );
    const top = variantRecords.slice(-3);
    const value = variantRecords.filter(
      (item) =>
        !base.some((baseItem) => baseItem.index === item.index) &&
        !automatic.some((autoItem) => autoItem.index === item.index) &&
        !turbo.some((turboItem) => turboItem.index === item.index),
    );

    return [
      ["Base", base],
      ["Value", value.slice(0, 8)],
      ["Automatic", automatic.slice(0, 10)],
      ["Turbo", turbo.slice(0, 10)],
      ["Top", top],
    ].filter(([, items]) => items.length);
  }, [variantRecords]);

  const filteredVariantBuckets = useMemo(() => {
    if (!variantSearch.trim()) return variantBuckets;

    const allowed = new Set(variantOptions.map((item) => item.index));

    return variantBuckets
      .map(([label, items]) => [
        label,
        items.filter((item) => allowed.has(item.index)),
      ])
      .filter(([, items]) => items.length);
  }, [variantBuckets, variantOptions, variantSearch]);

  const exportCsv = () => {
    const headers = [
      "Category",
      "Feature",
      ...activeVariantRecords.map((record) => record.name),
    ];

    const rows = filteredFeatures.map((feature) => [
      feature.group,
      feature.feature,
      ...activeVariantRecords.map((record) =>
        normalizeDisplayValue(valueFor(record, feature.key)),
      ),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${slug(titleVehicle || "vehicle")}-features.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-none space-y-4">
      <section className="relative overflow-hidden rounded-[30px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_54%,#eff6ff_100%)] p-4 shadow-[0_30px_90px_-72px_rgba(15,23,42,0.55)] sm:p-5 lg:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#dbeafe]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[30%] h-64 w-64 rounded-full bg-[#e0e7ff]/50 blur-3xl" />

        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <h2 className="font-serif text-[34px] font-semibold leading-[1.03] tracking-[-0.065em] text-[#0f172a] sm:text-[44px]">
              {titleVehicle} Feature Explorer
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b] sm:text-base">
              Scalable view for {totalFeatures || "all"} features across{" "}
              {variantRecords.length} active variants
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatPill
                icon={BadgeCheck}
                value={variantRecords.length}
                label="active variants"
              />
              <StatPill icon={Layers3} value={totalFeatures} label="features" />
              <StatPill
                icon={ListFilter}
                value={selectedCount}
                label={compareAll ? "visible variants" : "selected variants"}
              />
              <StatPill icon={Sparkles} value="Wide" label="comparison table" />
            </div>
          </div>

          <HeroCarArt image={vehicleImage} alt={titleVehicle} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-4 rounded-[24px] border border-[#dbe3ef] bg-white/82 p-3 shadow-[0_24px_76px_-64px_rgba(15,23,42,0.48)] backdrop-blur-2xl">
            <p className="mb-3 px-2 text-sm font-black text-[#334155]">
              Categories
            </p>

            <div className="space-y-2">
              {availableCategoryStats.map((category) => {
                const active =
                  !searchingFeatures && category.group === activeCategory;

                return (
                  <button
                    key={category.group}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category.group);
                      setFeatureSearch("");
                    }}
                    className={cx(
                      "flex w-full items-center justify-between gap-2 rounded-[16px] border px-3 py-3 text-left text-sm font-black transition duration-200",
                      active
                        ? "border-[#93c5fd] bg-[#eff6ff] text-[#1e40af] shadow-[inset_3px_0_0_#2563eb]"
                        : "border-[#e2e8f0] bg-white text-[#475569] hover:border-[#93c5fd] hover:bg-[#eff6ff]/65",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cx(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px]",
                          active
                            ? "bg-white text-[#2563eb]"
                            : "bg-[#f8fafc] text-[#64748b]",
                        )}
                      >
                        <CategoryIcon group={category.group} />
                      </span>
                      <span className="truncate">{category.group}</span>
                    </span>

                    {showCounts ? (
                      <span className="text-xs opacity-70">
                        {category.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="rounded-[24px] border border-[#dbe3ef] bg-white/82 p-3 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)] backdrop-blur-2xl sm:p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setPickerOpen((value) => !value)}
                className="flex h-full min-h-[62px] w-full items-center gap-3 rounded-[18px] border border-[#dbe3ef] bg-white px-4 py-3 text-left transition duration-200 hover:border-[#93c5fd] hover:bg-[#eff6ff]/65"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
                  <BadgeCheck size={18} />
                </span>
                <span>
                  <span className="block text-sm font-black text-[#0f172a]">
                    Select variants
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-[#64748b]">
                    {compareAll
                      ? `${selectedCount} visible`
                      : `${selectedCount} selected`}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCompareAll(true)}
                className={cx(
                  "flex min-h-[62px] items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition duration-200",
                  compareAll
                    ? "border-[#2563eb] bg-[#eff6ff] text-[#1e40af]"
                    : "border-[#dbe3ef] bg-white text-[#334155] hover:border-[#93c5fd] hover:bg-[#eff6ff]/65",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
                  <Layers3 size={18} />
                </span>
                <span>
                  <span className="block text-sm font-black">Compare all</span>
                  <span className="mt-0.5 block text-xs font-semibold text-[#64748b]">
                    {variantRecords.length} variants
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiffOnly((value) => !value)}
                className={cx(
                  "flex min-h-[62px] items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition duration-200",
                  diffOnly
                    ? "border-[#2563eb] bg-[#eff6ff]"
                    : "border-[#dbe3ef] bg-white hover:border-[#93c5fd] hover:bg-[#eff6ff]/65",
                )}
              >
                <span>
                  <span className="block text-sm font-black text-[#0f172a]">
                    Differences only
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-[#64748b]">
                    Hide identical rows and empty categories
                  </span>
                </span>

                <span
                  className={cx(
                    "relative h-6 w-11 shrink-0 rounded-full transition",
                    diffOnly ? "bg-[#2563eb]" : "bg-[#cbd5e1]",
                  )}
                >
                  <span
                    className={cx(
                      "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
                      diffOnly ? "left-6" : "left-1",
                    )}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="flex min-h-[62px] items-center gap-3 rounded-[18px] border border-[#dbe3ef] bg-white px-4 py-3 text-left transition duration-200 hover:border-[#93c5fd] hover:bg-[#eff6ff]/65"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
                  <Download size={18} />
                </span>
                <span>
                  <span className="block text-sm font-black text-[#0f172a]">
                    Export list
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-[#64748b]">
                    Excel / CSV
                  </span>
                </span>
              </button>
            </div>

            {pickerOpen ? (
              <div className="mt-4 rounded-[28px] border border-[#dbe3ef] bg-[#f8fafc]/80 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="text-xs font-black text-[#2563eb]"
                    >
                      ← Back to Feature Explorer
                    </button>

                    <h3 className="mt-2 font-serif text-[30px] font-semibold leading-tight tracking-[-0.055em] text-[#0f172a]">
                      Select variants to compare
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-[#64748b]">
                      Choose up to {MAX_SELECTED_VARIANTS} variants from{" "}
                      {variantRecords.length} active variants.
                    </p>
                  </div>

                  <div className="w-full lg:max-w-[320px]">
                    <SearchInput
                      value={variantSearch}
                      onChange={setVariantSearch}
                      placeholder="Search variants"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  <PresetButton
                    icon={BadgeCheck}
                    label="Base"
                    onClick={() => selectPreset("base")}
                  />
                  <PresetButton
                    icon={Sparkles}
                    label="Popular"
                    onClick={() => selectPreset("popular")}
                  />
                  <PresetButton
                    icon={Star}
                    label="Best Value"
                    onClick={() => selectPreset("bestValue")}
                  />
                  <PresetButton
                    icon={ShieldCheck}
                    label="Top"
                    onClick={() => selectPreset("top")}
                  />
                  <PresetButton
                    icon={Car}
                    label="Automatic"
                    onClick={() => selectPreset("automatic")}
                  />
                  <PresetButton
                    icon={Sparkles}
                    label="Turbo"
                    onClick={() => selectPreset("turbo")}
                  />
                </div>

                <div className="mt-4 max-h-[560px] overflow-y-auto pr-1">
                  <div className="space-y-4">
                    {filteredVariantBuckets.map(([label, items]) => (
                      <section key={label}>
                        <div className="mb-2 flex items-center gap-2">
                          <h4 className="text-sm font-black text-[#1e3a8a]">
                            {label}
                          </h4>
                          <span className="text-xs font-bold text-[#94a3b8]">
                            {items.length} variants
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {items.map((record) => {
                            const selected =
                              activeVariantIndexes.includes(record.index) &&
                              !compareAll;
                            const disabled =
                              !selected &&
                              !compareAll &&
                              selectedVariantIndexes.length >=
                                MAX_SELECTED_VARIANTS;

                            return (
                              <VariantCard
                                key={`${label}-${record.name}-${record.index}`}
                                record={record}
                                selected={selected}
                                disabled={disabled}
                                image={record.image || vehicleImage}
                                onClick={() => toggleVariant(record.index)}
                              />
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setControlsOpen((value) => !value)}
              className="mt-3 flex w-full items-center justify-between rounded-[18px] border border-[#dbe3ef] bg-white px-4 py-3 text-sm font-black text-[#334155]"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={16} />
                Feature explorer controls
              </span>
              <span
                className={cx(
                  "text-xs text-[#64748b] transition",
                  controlsOpen ? "rotate-180" : "",
                )}
              >
                ▼
              </span>
            </button>

            {controlsOpen ? (
              <div className="mt-3 rounded-[22px] border border-[#dbe3ef] bg-white p-4">
                <ExplorerControls
                  stickyColumns={stickyColumns}
                  setStickyColumns={setStickyColumns}
                  showCounts={showCounts}
                  setShowCounts={setShowCounts}
                  unitDisplay={unitDisplay}
                  setUnitDisplay={setUnitDisplay}
                  totalFeatures={totalFeatures}
                  totalVariants={variantRecords.length}
                />
              </div>
            ) : null}
          </div>

          <div className="xl:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availableCategoryStats.map((category) => {
                const active =
                  !searchingFeatures && category.group === activeCategory;

                return (
                  <button
                    key={`${category.group}-mobile`}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category.group);
                      setFeatureSearch("");
                    }}
                    className={cx(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black ring-1 transition",
                      active
                        ? "bg-[#2563eb] text-white ring-[#2563eb]"
                        : "bg-white text-[#475569] ring-[#dbe3ef]",
                    )}
                  >
                    <CategoryIcon group={category.group} />
                    {category.group}
                    {showCounts ? <span>{category.count}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <section className="rounded-[26px] border border-[#dbe3ef] bg-white/88 shadow-[0_26px_86px_-68px_rgba(15,23,42,0.58)] backdrop-blur-2xl">
            <div className="flex flex-col gap-3 border-b border-[#e2e8f0] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#64748b]">
                  Showing {filteredFeatures.length} features
                </p>
                <h3 className="mt-1 flex items-center gap-2 text-base font-black text-[#0f172a]">
                  {searchingFeatures ? (
                    <Search size={16} />
                  ) : (
                    <CategoryIcon group={activeCategory} />
                  )}
                  {searchingFeatures
                    ? `Search results for “${featureSearch}”`
                    : `${activeCategory} — ${activeCategoryCount} features`}
                </h3>
              </div>

              <div className="w-full lg:max-w-[420px]">
                <SearchInput
                  value={featureSearch}
                  onChange={setFeatureSearch}
                  placeholder="Search all features"
                />
              </div>
            </div>

            <div className="max-h-[680px] overflow-auto">
              <table
                className="w-full border-separate border-spacing-0 text-sm"
                style={{ minWidth: `${tableMinWidth}px` }}
              >
                <thead className="sticky top-0 z-30 bg-[#f8fafc]">
                  <tr>
                    <th
                      className={cx(
                        "border-b border-[#e2e8f0] px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]",
                        stickyColumns
                          ? "sticky left-0 z-40 bg-[#f8fafc] shadow-[6px_0_12px_-12px_rgba(15,23,42,0.35)]"
                          : "",
                      )}
                      style={{ width: 320 }}
                    >
                      Feature
                    </th>

                    {activeVariantRecords.map((record) => (
                      <th
                        key={`${record.name}-${record.index}`}
                        className="border-b border-l border-[#e2e8f0] px-4 py-4 text-center text-[12px] font-black text-[#1e3a8a]"
                        style={{ width: 190 }}
                      >
                        <span className="mx-auto block max-w-[170px] whitespace-normal break-words leading-5">
                          {record.name}
                        </span>
                        <span className="mt-1 block text-[11px] font-bold text-[#64748b]">
                          {record.meta.priceLabel || "Price unavailable"}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredFeatures.map((feature) => (
                    <tr
                      key={feature.key}
                      className="group transition duration-150 hover:bg-[#eff6ff]/45"
                    >
                      <td
                        className={cx(
                          "border-b border-[#eef2f7] px-4 py-3 font-semibold text-[#334155]",
                          stickyColumns
                            ? "sticky left-0 z-20 bg-white shadow-[6px_0_12px_-12px_rgba(15,23,42,0.28)] group-hover:bg-[#eff6ff]"
                            : "",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CircleAlert
                            size={14}
                            className="shrink-0 text-[#64748b]"
                          />
                          <span className="whitespace-normal break-words leading-5">
                            <HighlightText
                              text={
                                activeCategory === ALL_CATEGORY ||
                                searchingFeatures
                                  ? `${feature.group} · ${feature.feature}`
                                  : feature.feature
                              }
                              query={featureSearch}
                            />
                          </span>
                        </span>
                      </td>

                      {activeVariantRecords.map((record) => (
                        <td
                          key={`${feature.key}-${record.index}`}
                          className="border-b border-l border-[#eef2f7] px-3 py-3 text-center"
                        >
                          <FeatureValueCell
                            value={valueFor(record, feature.key)}
                            query={featureSearch}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </section>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
