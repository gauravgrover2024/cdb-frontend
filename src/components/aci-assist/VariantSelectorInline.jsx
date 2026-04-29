import React, { useMemo, useState } from "react";
import { GitCompareArrows } from "lucide-react";
import RecordsTableInline from "./RecordsTableInline";
import WidgetFrame from "./WidgetFrame";
import { asArray, formatCurrency, pick } from "./utils";

const priceLabel = (variant) => {
  const onRoad = pick(variant, ["onRoadPrice", "price"], "");
  const exShowroom = pick(variant, ["exShowroomPrice"], "");
  if (onRoad) return `On-road ${formatCurrency(onRoad)}`;
  if (exShowroom) return `Ex-showroom ${formatCurrency(exShowroom)}`;
  return "Price not available";
};

export default function VariantSelectorInline({ widget = {}, onAction }) {
  const groups = asArray(widget.data?.models || widget.models);
  const summaryRows = asArray(widget.data?.summary || widget.rows);
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(groups.map((group) => [group.model || group.displayModel, group.variants?.[0]?.id || ""])),
  );

  const selectedIds = useMemo(
    () => Object.values(selected).filter(Boolean),
    [selected],
  );

  const canCompare = selectedIds.length >= 2 && selectedIds.length === groups.length;

  return (
    <div className="space-y-3">
      <WidgetFrame
        title={widget.title || "Choose variants to compare"}
        subtitle={widget.subtitle || "Select one variant for each model."}
        actions={widget.actions}
        onAction={onAction}
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {groups.map((group) => {
            const key = group.model || group.displayModel;
            const variants = asArray(group.variants);
            return (
              <label key={key} className="block rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
                  {group.displayModel || group.model}
                </span>
                <select
                  value={selected[key] || ""}
                  onChange={(event) => setSelected((prev) => ({ ...prev, [key]: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-300"
                >
                  <option value="">Select variant</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.variant} · {variant.fuel || "Fuel N/A"} · {priceLabel(variant)}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          disabled={!canCompare}
          onClick={() =>
            onAction?.({
              type: "compare",
              label: "Compare selected variants",
              message: "Compare selected variants",
              context: { selectedVariantIds: selectedIds, compareMode: "variants" },
            })
          }
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <GitCompareArrows size={14} />
          Compare selected variants
        </button>
      </WidgetFrame>
      <RecordsTableInline
        widget={{ title: "Model summary" }}
        records={summaryRows}
        columns={[
          { key: "make", label: "Make" },
          { key: "model", label: "Model" },
          { key: "startingPrice", label: "Starting price" },
          { key: "topPrice", label: "Top price" },
          { key: "variantCount", label: "Variants" },
          { key: "fuelOptions", label: "Fuel" },
          { key: "transmissionOptions", label: "Transmission" },
        ]}
        onAction={onAction}
      />
    </div>
  );
}
