import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  GitCompare,
  Layers3,
  MapPin,
  Search,
  XCircle,
} from "lucide-react";
import { formatCurrency, asArray, humanize } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { compactText, valueFrom } from "../canvas-utils";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const primitiveText = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => primitiveText(item, ""))
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }

  if (typeof value === "object") {
    return (
      primitiveText(
        value.displayValue ??
          value.label ??
          value.value ??
          value.name ??
          value.title ??
          value.variant ??
          value.model ??
          value.brand ??
          value.make,
        "",
      ) || fallback
    );
  }

  return fallback;
};

const moneyNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (value && typeof value === "object") {
    return moneyNumber(
      value.onRoadPrice ??
        value.calculatedOnRoadPrice ??
        value.storedOnRoadPrice ??
        value.exShowroomPrice ??
        value.exShowroom ??
        value.price,
    );
  }

  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return 0;

  const parsed = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed)) return 0;

  if (raw.includes("crore") || raw.includes(" cr")) return parsed * 10000000;
  if (raw.includes("lakh") || raw.includes(" lac")) return parsed * 100000;

  return parsed;
};

const formatMoney = (value) => {
  const amount = moneyNumber(value);
  return amount > 0 ? formatCurrency(amount) : "Price unavailable";
};

const optionKey = (option, index) =>
  primitiveText(
    valueFrom(option, ["id", "_id", "variantId"], ""),
    `${optionName(option)}-${index}`,
  );

const optionBrand = (option) =>
  primitiveText(valueFrom(option, ["brand", "make"], ""), "");

const optionModel = (option, fallback = "") =>
  primitiveText(valueFrom(option, ["model"], fallback), fallback);

const optionName = (option, index = 0) =>
  primitiveText(
    valueFrom(
      option,
      [
        "variant",
        "variantName",
        "variant_name",
        "VariantName",
        "name",
        "title",
      ],
      `Variant ${index + 1}`,
    ),
    `Variant ${index + 1}`,
  );

const optionFuel = (option) =>
  primitiveText(valueFrom(option, ["fuel", "fuelType", "fuel_type"], ""), "");

const optionTransmission = (option) =>
  primitiveText(
    valueFrom(
      option,
      ["transmission", "transmissionType", "transmission_type"],
      "",
    ),
    "",
  );

const optionCity = (option) =>
  primitiveText(valueFrom(option, ["city", "citySlug"], "Delhi"), "Delhi");

const optionPrice = (option) =>
  valueFrom(
    option,
    [
      "onRoad",
      "onRoadPrice",
      "calculatedOnRoadPrice",
      "storedOnRoadPrice",
      "exShowroom",
      "exShowroomPrice",
      "price",
    ],
    "",
  );

const variantQueryLabel = (option, fallbackModel = "") => {
  const brand = optionBrand(option);
  const model = optionModel(option, fallbackModel);
  const variant = optionName(option);

  return [brand, model, variant].filter(Boolean).join(" ");
};

const singleSelectQuery = (option, fallbackModel = "") =>
  option.followUpQuery ||
  `${variantQueryLabel(option, fallbackModel)} pricelist`.trim();

const compareQuery = (options, fallbackModel = "") =>
  `Compare ${options.map((option) => variantQueryLabel(option, fallbackModel)).join(" and ")}`;

export function VariantAmbiguityCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const options = asArray(data.options || widget?.options);
  const title = data.title || "Which variant do you mean?";
  const model = data.model || message?.entities?.model || "";

  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return options;

    return options.filter((option, index) =>
      [
        optionBrand(option),
        optionModel(option, model),
        optionName(option, index),
        optionFuel(option),
        optionTransmission(option),
        optionCity(option),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [options, search, model]);

  const selectedOptions = options.filter((option, index) =>
    selectedKeys.includes(optionKey(option, index)),
  );

  const toggleSelected = (option, index) => {
    const key = optionKey(option, index);

    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const askSingle = (option) => {
    onAction?.({
      type: "ask",
      message: singleSelectQuery(option, model),
      selectedVariant: option,
    });
  };

  const askCompareSelected = () => {
    if (selectedOptions.length < 2) return;

    onAction?.({
      type: "ask",
      action: "compare_selected_variants",
      message: compareQuery(selectedOptions, model),
      selectedVariants: selectedOptions,
    });
  };

  return (
    <ModernCanvasShell
      title={title}
      subtitle="Select one variant, or choose multiple variants to compare."
      icon={Layers3}
      footer={footer}
      eyebrow="Variant match"
      fullBleed
      className="w-full max-w-none"
    >
      <div className="space-y-4">
        <section className="rounded-[26px] border border-[#dbe3ef] bg-white/82 p-4 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search variant, fuel, transmission..."
                className="h-11 w-full rounded-[16px] border border-[#dbe3ef] bg-white/90 pl-10 pr-10 text-sm font-semibold text-[#0f172a] outline-none shadow-sm transition placeholder:text-[#94a3b8] focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-[#dbeafe]/70"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] transition hover:text-[#475569]"
                  aria-label="Clear search"
                >
                  <XCircle size={16} />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              disabled={selectedOptions.length < 2}
              onClick={askCompareSelected}
              className="flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[#0f172a] px-4 text-sm font-black text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <GitCompare size={16} />
              Compare selected
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold text-[#64748b]">
            {selectedOptions.length
              ? `${selectedOptions.length} selected for comparison`
              : "Tap cards to mark variants for comparison. Use Select to continue with one variant."}
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredOptions.map((option, index) => {
            const key = optionKey(option, index);
            const selected = selectedKeys.includes(key);
            const fuel = optionFuel(option);
            const transmission = optionTransmission(option);
            const city = optionCity(option);
            const variant = optionName(option, index);
            const brand = optionBrand(option);
            const optionModelName = optionModel(option, model);

            return (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.16,
                  delay: Math.min(index * 0.015, 0.12),
                }}
                onClick={() => toggleSelected(option, index)}
                className={cx(
                  "group cursor-pointer rounded-[24px] border bg-white/86 p-4 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5",
                  selected
                    ? "border-[#2563eb] ring-2 ring-[#bfdbfe]"
                    : "border-[#dbe3ef] hover:border-[#93c5fd] hover:bg-[#eff6ff]/55",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2563eb]">
                      {[brand, optionModelName].filter(Boolean).join(" ") ||
                        "Variant"}
                    </p>
                    <h3 className="mt-1 whitespace-normal break-words text-lg font-black leading-6 text-[#0f172a]">
                      {compactText(variant)}
                    </h3>
                  </div>

                  <span
                    className={cx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
                      selected
                        ? "border-[#2563eb] bg-[#2563eb] text-white"
                        : "border-[#cbd5e1] bg-white text-transparent group-hover:border-[#2563eb]",
                    )}
                  >
                    <CheckCircle2 size={16} />
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {fuel ? (
                    <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-[11px] font-black text-[#1e40af] ring-1 ring-[#bfdbfe]">
                      {fuel}
                    </span>
                  ) : null}

                  {transmission ? (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700 ring-1 ring-indigo-200">
                      {transmission}
                    </span>
                  ) : null}

                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f8fafc] px-2.5 py-1 text-[11px] font-black text-[#64748b] ring-1 ring-[#dbe3ef]">
                    <MapPin size={12} />
                    {humanize(city)}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#e2e8f0] pt-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8]">
                      Est. price
                    </p>
                    <p className="mt-1 text-base font-black text-emerald-700">
                      {formatMoney(optionPrice(option))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      askSingle(option);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0f172a] px-3 py-2 text-xs font-black text-white transition hover:bg-[#1e293b]"
                  >
                    Select
                    <ChevronRight size={14} />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>

        {data.compareAllOption && options.length > 1 ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-5 py-2.5 text-sm font-black text-[#1e40af] transition hover:bg-white"
            onClick={() =>
              onAction?.({
                type: "ask",
                action: "compare_all_variants",
                message: `Compare ${model} variants`,
                selectedVariants: options,
              })
            }
          >
            <GitCompare size={16} />
            Compare all {options.length} variants
          </button>
        ) : null}
      </div>
    </ModernCanvasShell>
  );
}
