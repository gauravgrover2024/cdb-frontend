import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  GitCompare,
  Search,
  SearchCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { findWidget, compactText, valueFrom } from "../canvas-utils";

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
        value.displayName ??
          value.customerName ??
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

const optionKey = (option, index) =>
  primitiveText(
    valueFrom(option, ["id", "_id", "key"], ""),
    `${optionLabel(option)}-${index}`,
  );

const optionLabel = (option, index = 0) =>
  primitiveText(
    option.displayName ||
      option.customerName ||
      option.name ||
      option.title ||
      option.variant ||
      option.model,
    `Option ${index + 1}`,
  );

const optionVehicle = (option) =>
  primitiveText(
    option.vehicle ||
      [option.make || option.brand, option.model, option.variant]
        .filter(Boolean)
        .join(" "),
    "",
  );

const optionQuery = (option) => {
  if (option.followUpQuery) return option.followUpQuery;
  if (option.query) return option.query;
  if (option.message) return option.message;

  const vehicle = optionVehicle(option);
  if (vehicle) return `${vehicle} details`;

  return optionLabel(option);
};

const compareQuery = (options) => {
  const labels = options
    .map((option) => optionVehicle(option) || optionLabel(option))
    .filter(Boolean);

  return `Compare ${labels.join(" and ")}`;
};

const isVehicleLike = (option) =>
  Boolean(
    option.vehicle ||
    option.model ||
    option.variant ||
    option.make ||
    option.brand ||
    option.variantName,
  );

export function AmbiguityCanvas({
  message,
  onAmbiguitySelect,
  onAction,
  footer,
}) {
  const ambiguity =
    message?.ambiguity ||
    findWidget(message, "ambiguity")?.data ||
    findWidget(message, "ambiguity");

  const options = asArray(ambiguity?.options);
  const title = ambiguity?.title || "Multiple matches found";
  const subtitle =
    ambiguity?.subtitle ||
    "Select one result, or choose multiple options to compare.";

  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return options;

    return options.filter((option, index) =>
      [
        optionLabel(option, index),
        optionVehicle(option),
        primitiveText(option.module, ""),
        primitiveText(option.status, ""),
        primitiveText(option.registrationNumber, ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [options, search]);

  const selectedOptions = options.filter((option, index) =>
    selectedKeys.includes(optionKey(option, index)),
  );

  const canCompare =
    selectedOptions.length >= 2 && selectedOptions.every(isVehicleLike);

  const toggleSelected = (option, index) => {
    const key = optionKey(option, index);

    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const selectOption = (option) => {
    if (onAmbiguitySelect) {
      onAmbiguitySelect(option, message);
      return;
    }

    onAction?.({
      type: "ask",
      message: optionQuery(option),
      selectedOption: option,
    });
  };

  const compareSelected = () => {
    if (!canCompare) return;

    const payload = {
      type: "ask",
      action: "compare_selected_options",
      message: compareQuery(selectedOptions),
      selectedOptions,
    };

    if (onAction) {
      onAction(payload);
      return;
    }

    onAmbiguitySelect?.(
      {
        type: "compare_selected_options",
        options: selectedOptions,
        message: payload.message,
      },
      message,
    );
  };

  return (
    <ModernCanvasShell
      title={title}
      subtitle={subtitle}
      icon={SearchCheck}
      footer={footer}
      eyebrow="Clarify"
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
                placeholder="Search matches..."
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
              disabled={!canCompare}
              onClick={compareSelected}
              className="flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[#0f172a] px-4 text-sm font-black text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <GitCompare size={16} />
              Compare selected
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold text-[#64748b]">
            {selectedOptions.length
              ? `${selectedOptions.length} selected${canCompare ? " for comparison" : ""}`
              : "Tap cards to mark options. Use Select to continue with one result."}
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOptions.map((option, index) => {
            const key = optionKey(option, index);
            const selected = selectedKeys.includes(key);
            const vehicle = optionVehicle(option);
            const label = optionLabel(option, index);

            const tags = [
              option.registrationNumber && { label: option.registrationNumber },
              option.module && { label: option.module },
              option.status && { label: option.status },
              option.city && { label: option.city },
            ].filter(Boolean);

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
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2563eb]">
                      Match {index + 1}
                    </p>
                    <h3 className="mt-1 whitespace-normal break-words text-lg font-black leading-6 text-[#0f172a]">
                      {compactText(label, "Option")}
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

                <div className="mt-4 rounded-[18px] bg-[#f8fafc] p-3 ring-1 ring-[#e2e8f0]">
                  <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-[#475569]">
                    <Zap size={15} className="mt-1 shrink-0 text-[#2563eb]" />
                    {compactText(vehicle, "Details available after selection")}
                  </p>
                </div>

                {tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag, tagIndex) => (
                      <span
                        key={`${tag.label}-${tagIndex}`}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#64748b] ring-1 ring-[#dbe3ef]"
                      >
                        {primitiveText(tag.label)}
                      </span>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectOption(option);
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
      </div>
    </ModernCanvasShell>
  );
}
