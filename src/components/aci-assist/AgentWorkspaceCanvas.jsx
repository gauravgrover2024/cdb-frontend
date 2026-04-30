import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Car,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DatabaseZap,
  FileQuestion,
  Layers3,
  MapPin,
  Palette,
  SearchCheck,
  Sparkles,
  WalletCards,
  XCircle,
} from "lucide-react";
import FollowUpSuggestions from "./FollowUpSuggestions";
import SourceTransparencyBar from "./SourceTransparencyBar";
import { asArray, formatCurrency, formatDate, humanize, pick } from "./utils";

const getWidgetType = (widget = {}) => widget.type || widget.widgetType || widget.name || "";

const widgetMatches = (widget, type) => String(getWidgetType(widget)).toLowerCase() === String(type).toLowerCase();

const findWidget = (message, type) => asArray(message?.widgets).find((widget) => widgetMatches(widget, type));

const findAnyWidget = (message, types = []) =>
  asArray(message?.widgets).find((widget) => types.some((type) => widgetMatches(widget, type)));

const rowsFrom = (widget = {}) =>
  asArray(
    widget.rows ||
      widget.records ||
      widget.colors ||
      widget.evidenceRows ||
      widget.data?.rows ||
      widget.data?.records ||
      widget.data?.variants ||
      widget.data?.colors ||
      widget.data?.evidenceRows,
  );

const valueFrom = (source, keys, fallback = "—") => pick(source, keys, fallback);

const numberFrom = (value) => {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const compactText = (value, fallback = "—") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

function ActionButton({ action, onAction, children, primary = false }) {
  if (!action && !children) return null;
  return (
    <button
      type="button"
      onClick={() => action && onAction?.(action)}
      disabled={action?.disabled || action?.unavailable}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${
        primary
          ? "bg-slate-950 text-white hover:bg-indigo-700"
          : "border border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
      }`}
    >
      {children || action.label || "Open"}
      <ArrowUpRight size={15} />
    </button>
  );
}

function StatCard({ icon: Icon, label, value, tone = "slate", subtext }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-100 bg-blue-50/70 text-blue-950",
    emerald: "border-emerald-100 bg-emerald-50/80 text-emerald-950",
    amber: "border-amber-100 bg-amber-50/80 text-amber-950",
    rose: "border-rose-100 bg-rose-50/80 text-rose-950",
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-[24px] border p-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.75)] ${tones[tone] || tones.slate}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value ?? "—"}</p>
          {subtext ? <p className="mt-1 text-xs font-bold text-slate-500">{subtext}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-indigo-600 shadow-sm">
            <Icon size={18} />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function PremiumTable({ columns, rows, emptyText = "No records were returned for this view.", maxHeight = "max-h-[520px]" }) {
  const safeRows = asArray(rows);
  return (
    <div className={`overflow-auto rounded-[22px] border border-slate-200 bg-white shadow-sm ${maxHeight}`}>
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border-b border-slate-200 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.length ? (
            safeRows.map((row, index) => (
              <tr key={row.id || row._id || `${index}-${JSON.stringify(row).slice(0, 30)}`} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                    {column.render ? column.render(row, index) : compactText(valueFrom(row, column.keys || [column.key]))}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm font-bold text-slate-500">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CanvasShell({ title, subtitle, icon: Icon = Sparkles, children, actions, onAction, footer }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="rounded-[32px] border border-slate-200 bg-white/90 p-4 shadow-[0_28px_80px_-58px_rgba(15,23,42,0.9)] ring-1 ring-white/80 backdrop-blur md:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-50 to-sky-50 text-indigo-600 ring-1 ring-indigo-100">
            <Icon size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Live Workspace</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {actions?.length ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <ActionButton key={`${action.label || action.type}-${index}`} action={action} onAction={onAction} primary={index === 0}>
                {action.label}
              </ActionButton>
            ))}
          </div>
        ) : null}
      </div>
      {children}
      {footer}
    </motion.article>
  );
}

function CanvasFooter({ message, showQueryPlan, onFollowUp }) {
  return (
    <div className="mt-5">
      <SourceTransparencyBar sourceTransparency={message?.sourceTransparency} />
      {showQueryPlan && (message?.queryPlan || message?.intent || message?.entities) ? (
        <details className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <summary className="cursor-pointer text-sm font-black text-indigo-800">Query plan</summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700">
            {JSON.stringify(
              {
                intent: message?.intent,
                entities: message?.entities,
                queryPlan: message?.queryPlan,
              },
              null,
              2,
            )}
          </pre>
        </details>
      ) : null}
      <FollowUpSuggestions suggestions={message?.followUpSuggestions} onSelect={onFollowUp} />
    </div>
  );
}

function VehiclePricelistCanvas({ message, widget, onAction, footer }) {
  const rows = rowsFrom(widget);
  const total = widget.total || widget.totalCount || widget.data?.total || rows.length;
  const city = widget.city || widget.data?.city || valueFrom(rows[0], ["city", "citySlug"], "Delhi / new-delhi");
  const model = widget.model || widget.data?.model || valueFrom(rows[0], ["model"], message?.entities?.model || "Vehicle");
  const brand = widget.brand || widget.data?.brand || valueFrom(rows[0], ["brand", "make"], "");
  const lastUpdated = widget.lastUpdated || widget.data?.lastUpdated || valueFrom(rows[0], ["LastSeenDate", "updatedAt", "last_updated"], "—");
  const cities = asArray(widget.availableCities || widget.data?.availableCities || widget.cityOptions);
  const openAction = asArray(widget.actions).find((action) => /pricelist|price/i.test(action.label || action.type || ""));

  const columns = [
    { key: "variant", label: "Variant", keys: ["variant", "variant_short", "name"] },
    { key: "fuel", label: "Fuel", keys: ["fuel_type", "fuel", "fuelType"] },
    { key: "ex", label: "Ex-showroom", render: (row) => formatCurrency(valueFrom(row, ["ex_showroom", "ex_showroom_price_cardekho", "exShowroom"])) },
    { key: "rto", label: "RTO", render: (row) => formatCurrency(valueFrom(row, ["rto", "rto_amount_cardekho", "rtoAmount"])) },
    { key: "insurance", label: "Insurance", render: (row) => formatCurrency(valueFrom(row, ["insurance", "insurance_amount_cardekho", "insuranceAmount"])) },
    { key: "tcs", label: "TCS/Other", render: (row) => formatCurrency(valueFrom(row, ["other_tcsCharges", "other_totalOtherCharges", "optional_total"])) },
    {
      key: "onRoad",
      label: "On-road",
      render: (row) => (
        <span className="text-base font-black text-slate-950">
          {formatCurrency(valueFrom(row, ["total_on_road_with_accessories", "on_road_price_cardekho", "orp_without_accessories", "onRoadPrice"]))}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const discontinued = valueFrom(row, ["is_discontinued", "discontinued"], false);
        return (
          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${discontinued ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {discontinued ? "Discontinued" : "Active"}
          </span>
        );
      },
    },
  ];

  return (
    <CanvasShell
      title={`${[brand, model].filter(Boolean).join(" ")} pricelist`.trim()}
      subtitle={`Showing ${total} stored variant price records for ${city}.`}
      icon={Car}
      actions={openAction ? [openAction] : []}
      onAction={onAction}
      footer={footer}
    >
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <StatCard icon={Car} label="Model" value={model} subtext={brand || "Catalogue"} />
        <StatCard icon={MapPin} label="City" value={city} tone="blue" subtext={cities.length ? `${cities.length} cities available` : "Default city"} />
        <StatCard icon={Layers3} label="Variants" value={total} tone="emerald" subtext={`${rows.length} shown now`} />
        <StatCard icon={Clock3} label="Last updated" value={formatDate(lastUpdated)} tone="amber" />
      </div>
      {cities.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {cities.slice(0, 10).map((item) => (
            <span key={String(item)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              {humanize(item)}
            </span>
          ))}
        </div>
      ) : null}
      <PremiumTable columns={columns} rows={rows} />
    </CanvasShell>
  );
}

function VehicleColorsCanvas({ message, widget, footer }) {
  const colors = rowsFrom(widget);
  const model = widget.model || widget.data?.model || valueFrom(colors[0], ["model"], message?.entities?.model || "Vehicle");
  const brand = widget.brand || widget.data?.brand || valueFrom(colors[0], ["brand"], "");

  return (
    <CanvasShell
      title={`${[brand, model].filter(Boolean).join(" ")} colors`.trim()}
      subtitle={`${colors.length} stored color options from the vehicle color catalogue.`}
      icon={Palette}
      footer={footer}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {colors.length ? (
          colors.map((color, index) => {
            const name = valueFrom(color, ["colorName", "color_name", "name"], `Color ${index + 1}`);
            const hex = valueFrom(color, ["hex", "hexCode"], "");
            const imageUrl = valueFrom(color, ["imageUrl", "image_url", "image"], "");
            return (
              <motion.div
                key={`${name}-${index}`}
                whileHover={{ y: -3 }}
                className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.8)]"
              >
                {imageUrl ? (
                  <div className="aspect-[4/3] bg-slate-100">
                    <img src={imageUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-50">
                    <div
                      className="h-24 w-24 rounded-full border border-slate-200 shadow-inner"
                      style={{ background: hex || "linear-gradient(135deg,#e2e8f0,#f8fafc)" }}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <h3 className="text-base font-black text-slate-950">{name}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(valueFrom(color, ["lastUpdated", "last_updated", "updatedAt"], ""))}</p>
                  </div>
                  <div
                    className="h-10 w-10 shrink-0 rounded-2xl border border-slate-200 shadow-inner"
                    style={{ background: hex || "#f1f5f9" }}
                    title={hex || name}
                  />
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full rounded-[26px] border border-slate-200 bg-slate-50 p-8 text-center font-bold text-slate-500">
            No stored color records were returned.
          </div>
        )}
      </div>
    </CanvasShell>
  );
}

function VehicleFeatureAnswerCanvas({ message, widget, onAction, footer }) {
  const rows = rowsFrom(widget);
  const data = widget.data || {};
  const answer = compactText(widget.answer || data.answer, "Not found");
  const answerTone = {
    Yes: { icon: CheckCircle2, tone: "emerald", className: "bg-emerald-50 text-emerald-800 border-emerald-100" },
    No: { icon: XCircle, tone: "rose", className: "bg-rose-50 text-rose-800 border-rose-100" },
    Mixed: { icon: CircleAlert, tone: "amber", className: "bg-amber-50 text-amber-800 border-amber-100" },
    "Not found": { icon: FileQuestion, tone: "slate", className: "bg-slate-50 text-slate-800 border-slate-200" },
  }[answer] || { icon: FileQuestion, tone: "slate", className: "bg-slate-50 text-slate-800 border-slate-200" };
  const AnswerIcon = answerTone.icon;
  const summary = widget.summary || data.summary || {};
  const actions = asArray(widget.actions || data.actions);
  const primary = actions.find((action) => /feature/i.test(action.type || action.label || "")) || actions[0];
  const secondary = actions.filter((action) => action !== primary);

  const columns = [
    { key: "variant", label: "Variant", keys: ["variant", "variantName"] },
    { key: "featureKey", label: "Feature key", keys: ["featureKey", "key"] },
    { key: "featureValue", label: "Value", keys: ["featureValue", "value"] },
    {
      key: "answer",
      label: "Answer",
      render: (row) => (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
          {valueFrom(row, ["answer"], "—")}
        </span>
      ),
    },
  ];

  return (
    <CanvasShell
      title={widget.question || data.question || message?.content || "Feature answer"}
      subtitle="Answer based only on stored vehicle feature catalogue fields."
      icon={BadgeCheck}
      actions={primary ? [primary] : []}
      onAction={onAction}
      footer={footer}
    >
      <div className={`mb-5 rounded-[28px] border p-5 ${answerTone.className}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">Direct answer</p>
            <div className="mt-2 flex items-center gap-3">
              <AnswerIcon size={34} />
              <p className="text-5xl font-black tracking-tight">{answer}</p>
            </div>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2 text-sm font-black">
            <span className="rounded-2xl bg-white/70 p-3">Checked: {summary.totalVariantsChecked ?? rows.length}</span>
            <span className="rounded-2xl bg-white/70 p-3">Yes: {summary.yesCount ?? rows.filter((row) => /yes/i.test(valueFrom(row, ["answer", "featureValue"], ""))).length}</span>
            <span className="rounded-2xl bg-white/70 p-3">No: {summary.noCount ?? rows.filter((row) => /^no$/i.test(valueFrom(row, ["answer"], ""))).length}</span>
            <span className="rounded-2xl bg-white/70 p-3">Not found: {summary.notFoundCount ?? 0}</span>
          </div>
        </div>
      </div>
      <PremiumTable columns={columns} rows={rows} emptyText="No evidence rows were returned." maxHeight="max-h-[420px]" />
      {secondary.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {secondary.slice(0, 3).map((action, index) => (
            <ActionButton key={`${action.label}-${index}`} action={action} onAction={onAction}>
              {action.label}
            </ActionButton>
          ))}
        </div>
      ) : null}
    </CanvasShell>
  );
}

function VehicleFeaturesCanvas({ message, widget, footer }) {
  const rows = rowsFrom(widget);
  const variants = rows.length ? rows : asArray(widget.data?.variants);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = variants[selectedIndex] || variants[0] || {};
  const rawFeatures = selected.features || selected.featureGroups || widget.data?.features || {};
  const groups = useMemo(() => {
    if (!rawFeatures || typeof rawFeatures !== "object") return {};
    return Object.entries(rawFeatures).reduce((acc, [key, value]) => {
      const [group, feature] = String(key).includes("|")
        ? String(key).split("|").map((part) => part.trim())
        : ["Feature Catalogue", key];
      if (!acc[group]) acc[group] = [];
      acc[group].push({ feature, value });
      return acc;
    }, {});
  }, [rawFeatures]);

  return (
    <CanvasShell title={widget.title || "Vehicle features"} subtitle="Stored feature catalogue values only." icon={Layers3} footer={footer}>
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Variants</p>
          <div className="space-y-2">
            {variants.slice(0, 24).map((variant, index) => (
              <button
                key={variant.id || variant._id || index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`w-full rounded-2xl px-3 py-2 text-left text-sm font-black transition ${
                  index === selectedIndex ? "bg-slate-950 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                {valueFrom(variant, ["variant", "variantName", "name"], `Variant ${index + 1}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-[26px] border border-blue-100 bg-blue-50/70 p-4 text-sm font-bold text-blue-900">
            Feature values are shown only from stored feature catalogue fields.
          </div>
          {Object.keys(groups).length ? (
            Object.entries(groups).map(([group, items], index) => (
              <details key={group} open={index < 3} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-base font-black text-slate-950">{group}</summary>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {items.map((item) => (
                    <div key={`${group}-${item.feature}`} className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{item.feature}</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{compactText(item.value)}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))
          ) : (
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-8 text-center font-bold text-slate-500">
              No feature groups were returned.
            </div>
          )}
        </div>
      </div>
    </CanvasShell>
  );
}

function LoanDisbursalReportCanvas({ message, reportWidget, countWidget, onAction, footer }) {
  const rows = rowsFrom(reportWidget);
  const total =
    reportWidget.total ||
    reportWidget.summary?.total ||
    reportWidget.data?.total ||
    countWidget?.total ||
    countWidget?.summary?.total ||
    rows.length;
  const buckets = asArray(reportWidget.buckets || reportWidget.data?.buckets || reportWidget.summary?.buckets);
  const shown = reportWidget.shown || reportWidget.data?.shown || rows.length;
  const amountDateMissing = buckets.find((bucket) => /amount.*date|date.*amount/i.test(bucket.key || bucket.label || bucket.name || ""));
  const bankRowPending = buckets.find((bucket) => /bank/i.test(bucket.key || bucket.label || bucket.name || ""));

  const columns = [
    { key: "customer", label: "Customer", keys: ["customerName", "customer"] },
    { key: "vehicle", label: "Vehicle", render: (row) => [row.vehicleMake, row.vehicleModel, row.vehicleVariant].filter(Boolean).join(" ") || valueFrom(row, ["vehicle"], "—") },
    { key: "bank", label: "Bank", keys: ["approval_bankName", "bankName", "bank"] },
    { key: "approved", label: "Approved amount", render: (row) => formatCurrency(valueFrom(row, ["approval_loanAmountApproved", "approvedAmount", "loanAmount"])) },
    { key: "disbursed", label: "Disbursal amount", render: (row) => formatCurrency(valueFrom(row, ["approval_loanAmountDisbursed", "disbursedAmount"])) },
    { key: "status", label: "Status", keys: ["approval_status", "status", "currentStage"] },
    { key: "updated", label: "Last updated", render: (row) => formatDate(valueFrom(row, ["updatedAt", "createdAt"])) },
    {
      key: "action",
      label: "Action",
      render: (row) => {
        const action = asArray(row.actions).find(Boolean) || { type: "edit_record", label: "Open loan", module: "loan", id: row._id || row.id || row.loanId };
        return <ActionButton action={action} onAction={onAction}>Open loan</ActionButton>;
      },
    },
  ];

  return (
    <CanvasShell title="Approved but not disbursed" subtitle="Approval: Approved. Disbursal: Pending." icon={Banknote} footer={footer}>
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <StatCard icon={Banknote} label="Total pending" value={total} tone="blue" />
        <StatCard icon={Layers3} label="Shown records" value={shown} subtext={reportWidget.hasMore ? "More available" : "All shown"} />
        <StatCard icon={Clock3} label="Amount entered, date missing" value={amountDateMissing?.count ?? "—"} tone="amber" />
        <StatCard icon={CircleAlert} label="Bank row pending date" value={bankRowPending?.count ?? "—"} tone="rose" />
      </div>
      {buckets.length ? (
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {buckets.map((bucket) => (
            <div key={bucket.key || bucket.label || bucket.name} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{humanize(bucket.label || bucket.name || bucket.key)}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{bucket.count ?? bucket.total ?? "—"}</p>
            </div>
          ))}
        </div>
      ) : null}
      <PremiumTable columns={columns} rows={rows} />
    </CanvasShell>
  );
}

function LoanBusinessReportCanvas({ message, widget, footer }) {
  const summary = widget.summary || widget.data?.summary || {};
  const sections = asArray(widget.sections || widget.data?.sections);
  const recordsBySection = widget.recordsBySection || widget.data?.recordsBySection || {};
  const [activeSection, setActiveSection] = useState(sections[0]?.key || sections[0]?.id || Object.keys(recordsBySection)[0] || "loan_disbursed_this_month");

  const totalBusiness =
    summary.totalBusinessAmount ??
    numberFrom(summary.loanDisbursedAmount) + numberFrom(summary.cashCarBookValue) + numberFrom(summary.insurancePremiumAmount);
  const insuranceCount = (summary.insuranceIssuedCount || 0) + (summary.insuranceRenewedCount || 0);
  const activeRecords = asArray(recordsBySection[activeSection] || sections.find((section) => (section.key || section.id) === activeSection)?.records || widget.records || widget.rows);

  const sectionOptions = sections.length
    ? sections
    : [
        { key: "loan_disbursed_this_month", title: "Loan disbursed business" },
        { key: "cash_cars_delivered_this_month", title: "Cash car business" },
        { key: "insurance_issued_or_renewed_this_month", title: "Insurance business" },
      ];

  const columns = [
    { key: "customer", label: "Customer", keys: ["customerName", "customer"] },
    { key: "vehicle", label: "Vehicle", render: (row) => [row.vehicleMake, row.vehicleModel, row.vehicleVariant, row.make, row.model].filter(Boolean).join(" ") || valueFrom(row, ["vehicle"], "—") },
    { key: "date", label: "Business date", render: (row) => formatDate(valueFrom(row, ["businessDate", "disbursedDate", "deliveryDate", "newIssueDate", "updatedAt"])) },
    { key: "amount", label: "Amount", render: (row) => formatCurrency(valueFrom(row, ["amount", "businessAmount", "loanAmount", "premium", "bookValue"])) },
    { key: "status", label: "Status", keys: ["status", "currentStage", "section"] },
  ];

  return (
    <CanvasShell title="Business report" subtitle={widget.dateRange?.label || widget.data?.dateRange?.label || "Current business range"} icon={WalletCards} footer={footer}>
      <div className="mb-5 grid gap-3 md:grid-cols-3 2xl:grid-cols-7">
        <StatCard icon={WalletCards} label="Total business" value={formatCurrency(totalBusiness)} tone="emerald" />
        <StatCard icon={Banknote} label="Loan disbursed" value={formatCurrency(summary.loanDisbursedAmount)} tone="blue" />
        <StatCard icon={Car} label="Cash car book value" value={formatCurrency(summary.cashCarBookValue)} tone="amber" />
        <StatCard icon={BadgeCheck} label="Insurance premium" value={formatCurrency(summary.insurancePremiumAmount)} tone="slate" />
        <StatCard label="Loan count" value={summary.loanDisbursedCount ?? 0} />
        <StatCard label="Cash count" value={summary.cashCarCount ?? 0} />
        <StatCard label="Insurance count" value={insuranceCount} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {sectionOptions.map((section) => {
          const key = section.key || section.id || section.title;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                activeSection === key ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              {section.title || section.label || humanize(key)}
            </button>
          );
        })}
      </div>
      <PremiumTable columns={columns} rows={activeRecords} />
    </CanvasShell>
  );
}

function LoanClosureCanvas({ widget, onAction, footer }) {
  const data = widget.data || widget.summary || widget;
  const approx = valueFrom(data, ["approxClosure", "approxClosureAmount", "principalOutstanding", "pos", "closureAmount"], "—");
  const actions = asArray(widget.actions || data.actions);
  const fields = [
    ["Customer", valueFrom(data, ["customerName", "customer"])],
    ["Vehicle", valueFrom(data, ["vehicle", "vehicleName", "model"])],
    ["Registration", valueFrom(data, ["registrationNumber", "registration"])],
    ["Bank", valueFrom(data, ["bank", "loanBank", "bankName"])],
    ["Disbursed amount", formatCurrency(valueFrom(data, ["disbursedAmount", "principal"]))],
    ["ROI", valueFrom(data, ["roi", "annualRate"], "—")],
    ["Tenure", valueFrom(data, ["tenureMonths", "tenure"], "—")],
    ["EMI", formatCurrency(valueFrom(data, ["emi"]))],
    ["Months elapsed", valueFrom(data, ["monthsElapsed"], "—")],
    ["Months remaining", valueFrom(data, ["monthsRemaining"], "—")],
  ];

  return (
    <CanvasShell title="Loan closure estimate" subtitle="Calculated using Live POS style inputs returned by the backend." icon={Banknote} actions={actions} onAction={onAction} footer={footer}>
      <div className="mb-5 rounded-[30px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Approximate outstanding / closure</p>
        <p className="mt-2 text-5xl font-black tracking-tight text-slate-950">{formatCurrency(approx)}</p>
        <p className="mt-3 text-sm font-bold text-slate-600">
          Outstanding is calculated assuming all EMIs were paid on time. Actual bank foreclosure may vary.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-base font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </CanvasShell>
  );
}

function AmbiguityCanvas({ message, onAmbiguitySelect, footer }) {
  const ambiguity = message?.ambiguity || findWidget(message, "ambiguity")?.data || findWidget(message, "ambiguity");
  const options = asArray(ambiguity?.options);
  return (
    <CanvasShell title="Which one do you mean?" subtitle={ambiguity?.message || "I found more than one strong match."} icon={SearchCheck} footer={footer}>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option, index) => (
          <motion.button
            key={option.id || option._id || index}
            type="button"
            whileHover={{ y: -3 }}
            onClick={() => onAmbiguitySelect?.(option, message)}
            className="rounded-[26px] border border-amber-200 bg-amber-50/60 p-4 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
          >
            <p className="text-base font-black text-slate-950">{option.displayName || option.customerName || option.name || "Possible match"}</p>
            <p className="mt-1 text-sm font-bold text-slate-700">{option.vehicle || [option.make, option.model, option.variant].filter(Boolean).join(" ") || "Vehicle not listed"}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-600">
              {option.registrationNumber ? <span className="rounded-full bg-white px-2.5 py-1">{option.registrationNumber}</span> : null}
              {option.module ? <span className="rounded-full bg-white px-2.5 py-1">{option.module}</span> : null}
              {option.status ? <span className="rounded-full bg-white px-2.5 py-1">{option.status}</span> : null}
              {option.lastActivityDate ? <span className="rounded-full bg-white px-2.5 py-1">{formatDate(option.lastActivityDate)}</span> : null}
            </div>
          </motion.button>
        ))}
      </div>
    </CanvasShell>
  );
}

function UnavailableNoticeCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const checked = asArray(data.checked || data.modulesChecked || message?.sourceTransparency?.modulesChecked);
  return (
    <CanvasShell title={widget?.title || "No matching result"} subtitle={widget?.message || data.message || message?.assistantMessage} icon={FileQuestion} footer={footer}>
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
        <p className="text-lg font-black text-slate-950">{widget?.subtitle || "I could not find a structured answer for this request."}</p>
        {checked.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {checked.map((item) => (
              <span key={JSON.stringify(item)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                {humanize(item.module || item.name || item)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </CanvasShell>
  );
}

function GenericRecordsCanvas({ message, widget, onAction, footer }) {
  const rows = rowsFrom(widget);
  const sample = rows[0] || {};
  const columns = Object.keys(sample)
    .filter((key) => !["actions", "raw", "__v"].includes(key) && sample[key] !== undefined && sample[key] !== null && typeof sample[key] !== "object")
    .slice(0, 8)
    .map((key) => ({ key, label: humanize(key), keys: [key] }));
  const actions = asArray(widget.actions);
  return (
    <CanvasShell title={widget.title || humanize(getWidgetType(widget) || message?.intent || "ACI Assist result")} subtitle={message?.assistantMessage} icon={DatabaseZap} actions={actions} onAction={onAction} footer={footer}>
      <PremiumTable columns={columns.length ? columns : [{ key: "record", label: "Record", render: (row) => JSON.stringify(row) }]} rows={rows} />
    </CanvasShell>
  );
}

function EmptyWorkspace({ onAsk }) {
  const prompts = [
    "Verna pricelist",
    "Show colors of Verna",
    "Does Verna SX have sunroof?",
    "Approved but not disbursed cases",
    "Total business this month",
    "Cash car business this month",
    "Loan closure 7077",
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[32px] border border-slate-200 bg-white/85 p-6 shadow-[0_28px_80px_-58px_rgba(15,23,42,0.9)] ring-1 ring-white/80"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-slate-950 text-white shadow-sm">
        <Sparkles size={24} />
      </div>
      <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Live action canvas</h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
        Ask from the chat panel. ACI Assist will render the answer here as a catalogue, gallery, report, comparison, card or resolver.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {prompts.map((prompt) => (
          <motion.button
            key={prompt}
            type="button"
            whileHover={{ y: -2 }}
            onClick={() => onAsk?.(prompt)}
            className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

function LoadingWorkspace() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[32px] border border-slate-200 bg-white/85 p-6 shadow-[0_28px_80px_-58px_rgba(15,23,42,0.9)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-indigo-50 text-indigo-600">
          <Sparkles size={22} className="animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-950">Updating workspace...</h2>
          <p className="text-sm font-semibold text-slate-500">Reading the latest structured response.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
        ))}
      </div>
      <div className="mt-4 h-80 animate-pulse rounded-[26px] bg-slate-100" />
    </motion.section>
  );
}

export default function AgentWorkspaceCanvas({ message, loading, onAsk, onAction, onFollowUp, onAmbiguitySelect, showQueryPlan }) {
  if (loading) return <LoadingWorkspace />;
  if (!message) return <EmptyWorkspace onAsk={onAsk} />;

  const footer = <CanvasFooter message={message} showQueryPlan={showQueryPlan} onFollowUp={onFollowUp} />;
  const widgets = asArray(message.widgets);
  const widgetTypes = widgets.map(getWidgetType).filter(Boolean);

  if (message.ambiguity || findWidget(message, "ambiguity")) {
    return <AmbiguityCanvas message={message} onAmbiguitySelect={onAmbiguitySelect} footer={footer} />;
  }

  const pricelist = findWidget(message, "vehicle_pricelist");
  if (pricelist) return <VehiclePricelistCanvas message={message} widget={pricelist} onAction={onAction} footer={footer} />;

  const colors = findAnyWidget(message, ["vehicle_colors", "vehicle_colors_gallery"]);
  if (colors) return <VehicleColorsCanvas message={message} widget={colors} footer={footer} />;

  const featureAnswer = findAnyWidget(message, ["vehicle_feature_answer", "feature_answer"]);
  if (featureAnswer) return <VehicleFeatureAnswerCanvas message={message} widget={featureAnswer} onAction={onAction} footer={footer} />;

  const features = findWidget(message, "vehicle_features");
  if (features) return <VehicleFeaturesCanvas message={message} widget={features} footer={footer} />;

  const disbursal = findWidget(message, "loan_disbursal_report");
  if (disbursal || message.intent === "loan_disbursal_report") {
    return (
      <LoanDisbursalReportCanvas
        message={message}
        reportWidget={disbursal || widgets[0] || {}}
        countWidget={findWidget(message, "count_summary")}
        onAction={onAction}
        footer={footer}
      />
    );
  }

  const business = findWidget(message, "loan_business_report");
  if (business) return <LoanBusinessReportCanvas message={message} widget={business} footer={footer} />;

  const closure = findWidget(message, "loan_closure_card");
  if (closure) return <LoanClosureCanvas widget={closure} onAction={onAction} footer={footer} />;

  const unavailable = findWidget(message, "unavailable_notice");
  if (unavailable) return <UnavailableNoticeCanvas message={message} widget={unavailable} footer={footer} />;

  const generic = widgets.find((widget) => rowsFrom(widget).length) || widgets[0] || { type: message.intent, title: message.intent, rows: [] };
  return (
    <AnimatePresence mode="wait">
      <GenericRecordsCanvas
        key={`${message.id}-${widgetTypes.join("-")}`}
        message={message}
        widget={generic}
        onAction={onAction}
        footer={footer}
      />
    </AnimatePresence>
  );
}
