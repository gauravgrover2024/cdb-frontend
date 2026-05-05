import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Car,
  CheckCircle2,
  ChevronRight,
  GitCompare,
  Search,
  SearchCheck,
  XCircle,
} from "lucide-react";
import { formatCurrency, asArray } from "../utils";
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
      value.startingPrice ??
        value.startPrice ??
        value.minPrice ??
        value.topPrice ??
        value.maxPrice ??
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
  return amount > 0 ? formatCurrency(amount) : "—";
};

const modelKey = (option, index) =>
  primitiveText(
    valueFrom(option, ["id", "_id", "modelId"], ""),
    `${modelLabel(option)}-${index}`,
  );

const brandLabel = (option) =>
  primitiveText(valueFrom(option, ["brand", "make"], ""), "");

const modelLabel = (option, index = 0) =>
  primitiveText(
    valueFrom(option, ["model", "name", "title"], ""),
    `Model ${index + 1}`,
  );

const modelFullLabel = (option, index = 0) =>
  [brandLabel(option), modelLabel(option, index)].filter(Boolean).join(" ");

const selectQuery = (option, index = 0) =>
  option.followUpQuery || `${modelFullLabel(option, index)} pricelist`;

const compareQuery = (options) =>
  `Compare ${options.map((option, index) => modelFullLabel(option, index)).join(" and ")}`;

export function ModelAmbiguityCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const options = asArray(data.options || widget?.options);
  const title = data.title || "Which model do you mean?";

  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return options;

    return options.filter((option, index) =>
      [
        brandLabel(option),
        modelLabel(option, index),
        primitiveText(
          valueFrom(option, ["bodyType", "body_type", "segment"], ""),
          "",
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [options, search]);

  const selectedOptions = options.filter((option, index) =>
    selectedKeys.includes(modelKey(option, index)),
  );

  const toggleSelected = (option, index) => {
    const key = modelKey(option, index);

    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const askSingle = (option, index = 0) => {
    onAction?.({
      type: "ask",
      message: selectQuery(option, index),
      selectedModel: option,
    });
  };

  const askCompareSelected = () => {
    if (selectedOptions.length < 2) return;

    onAction?.({
      type: "ask",
      action: "compare_selected_models",
      message: compareQuery(selectedOptions),
      selectedModels: selectedOptions,
    });
  };

  return (
    <ModernCanvasShell
      title={title}
      subtitle="Select a model, or choose multiple models to compare."
      icon={SearchCheck}
      footer={footer}
      eyebrow="Model match"
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
                placeholder="Search brand, model, body type..."
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
              : "Tap cards to mark models for comparison. Use Select to continue with one model."}
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredOptions.map((option, index) => {
            const key = modelKey(option, index);
            const selected = selectedKeys.includes(key);
            const brand = brandLabel(option);
            const model = modelLabel(option, index);
            const bodyType = primitiveText(
              valueFrom(option, ["bodyType", "body_type", "segment"], "Car"),
              "Car",
            );
            const variantCount = primitiveText(
              valueFrom(option, ["variantCount", "totalVariants"], ""),
              "",
            );
            const variantsValue = valueFrom(option, ["variants"], "");
            const finalVariantCount = Array.isArray(variantsValue)
              ? variantsValue.length
              : variantCount || primitiveText(variantsValue, "—");

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
                  "group cursor-pointer rounded-[26px] border bg-white/86 p-5 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5",
                  selected
                    ? "border-[#2563eb] ring-2 ring-[#bfdbfe]"
                    : "border-[#dbe3ef] hover:border-[#93c5fd] hover:bg-[#eff6ff]/55",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[20px] bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#eff6ff_60%,#dbeafe_100%)] text-[#2563eb] ring-1 ring-[#bfdbfe]">
                    <Car size={24} />
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

                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#2563eb]">
                  {brand || `Option ${index + 1}`}
                </p>

                <h3 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.055em] text-[#0f172a]">
                  {compactText(model)}
                </h3>

                <span className="mt-3 inline-flex rounded-full bg-[#f8fafc] px-3 py-1.5 text-xs font-black text-[#64748b] ring-1 ring-[#dbe3ef]">
                  {bodyType}
                </span>

                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#e2e8f0] pt-4 text-sm">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                      Starting
                    </p>
                    <p className="mt-1 font-black text-emerald-700">
                      {formatMoney(
                        valueFrom(
                          option,
                          ["startingPrice", "startPrice", "minPrice"],
                          "",
                        ),
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                      Top
                    </p>
                    <p className="mt-1 font-black text-[#0f172a]">
                      {formatMoney(
                        valueFrom(option, ["topPrice", "maxPrice"], ""),
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                      Variants
                    </p>
                    <p className="mt-1 font-black text-[#0f172a]">
                      {finalVariantCount}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    askSingle(option, index);
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#0f172a] px-4 py-3 text-sm font-black text-white transition hover:bg-[#1e293b]"
                >
                  Select
                  <ChevronRight size={16} />
                </button>
              </motion.article>
            );
          })}
        </div>

        {data.allowShowAll ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-5 py-2.5 text-sm font-black text-[#1e40af] transition hover:bg-white"
            onClick={() =>
              onAction?.({
                type: "ask",
                message: `Show all ${message?.entities?.model || "models"}`,
              })
            }
          >
            Show all models
            <ChevronRight size={16} />
          </button>
        ) : null}
      </div>
    </ModernCanvasShell>
  );
}
