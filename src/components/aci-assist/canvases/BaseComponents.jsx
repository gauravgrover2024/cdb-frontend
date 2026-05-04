import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, DatabaseZap, Sparkles, Zap } from "lucide-react";
import FollowUpSuggestions from "../FollowUpSuggestions";
import SourceTransparencyBar from "../SourceTransparencyBar";
import { asArray } from "../utils";
import { compactText, valueFrom } from "../canvas-utils";

const cx = (...parts) => parts.filter(Boolean).join(" ");

export const MODERN_COLORS = {
  gradients: {
    primary: "from-[#2563eb] to-[#1d4ed8]",
    success: "from-emerald-500 to-emerald-600",
    warning: "from-amber-500 to-orange-500",
    info: "from-[#eff6ff] to-[#dbeafe]",
  },
  backgrounds: {
    card: "bg-white/88 backdrop-blur-xl",
    surface: "bg-white",
    soft: "bg-[#f8fafc]",
    shell: "bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#eff6ff_100%)]",
    hover: "hover:bg-[#eff6ff]/65",
  },
  text: {
    primary: "text-[#0f172a]",
    secondary: "text-[#475569]",
    tertiary: "text-[#64748b]",
    muted: "text-[#94a3b8]",
    light: "text-white",
    accent: "text-[#2563eb]",
    accentDark: "text-[#1e40af]",
  },
  borders: {
    light: "border-[#dbe3ef]",
    medium: "border-[#cbd5e1]",
    blue: "border-[#bfdbfe]",
    soft: "border-[#e2e8f0]",
  },
};

export const SHADOWS = {
  sm: "shadow-sm",
  md: "shadow-[0_18px_60px_-50px_rgba(15,23,42,0.42)]",
  lg: "shadow-[0_30px_90px_-72px_rgba(15,23,42,0.55)]",
  blue: "shadow-[0_18px_40px_-22px_rgba(37,99,235,0.82)]",
  soft: "shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)]",
};

export function ActionButton({
  action,
  onAction,
  children,
  primary = false,
  className = "",
}) {
  if (!action && !children) return null;

  return (
    <button
      type="button"
      onClick={() => action && onAction?.(action)}
      disabled={action?.disabled || action?.unavailable}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
        primary
          ? "bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] text-white shadow-[0_18px_40px_-22px_rgba(37,99,235,0.82)] hover:-translate-y-0.5"
          : "border border-[#cbd5e1] bg-white text-[#1e293b] shadow-sm hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#1e40af]",
        className,
      )}
    >
      <span>{children || action?.label || "Open"}</span>
      {primary ? <ArrowUpRight size={15} /> : null}
    </button>
  );
}

export function ModernStatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  subtext,
  className = "",
}) {
  const toneMap = {
    default: {
      card: "border-[#bfdbfe] bg-[#eff6ff]",
      icon: "bg-white text-[#2563eb] ring-[#bfdbfe]",
      glow: "bg-[#2563eb]/10",
    },
    success: {
      card: "border-emerald-200 bg-emerald-50",
      icon: "bg-white text-emerald-600 ring-emerald-200",
      glow: "bg-emerald-500/10",
    },
    warning: {
      card: "border-amber-200 bg-amber-50",
      icon: "bg-white text-amber-600 ring-amber-200",
      glow: "bg-amber-500/10",
    },
    danger: {
      card: "border-red-200 bg-red-50",
      icon: "bg-white text-red-600 ring-red-200",
      glow: "bg-red-500/10",
    },
    purple: {
      card: "border-indigo-200 bg-indigo-50",
      icon: "bg-white text-indigo-600 ring-indigo-200",
      glow: "bg-indigo-500/10",
    },
    slate: {
      card: "border-[#dbe3ef] bg-[#f8fafc]",
      icon: "bg-white text-[#475569] ring-[#dbe3ef]",
      glow: "bg-slate-500/10",
    },
  };

  const selectedTone = toneMap[tone] || toneMap.default;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className={cx(
        "relative overflow-hidden rounded-[24px] border p-4 shadow-[0_18px_60px_-50px_rgba(15,23,42,0.35)]",
        selectedTone.card,
        className,
      )}
    >
      <div
        className={cx(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl",
          selectedTone.glow,
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.95),transparent_34%)]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748b]">
            {label}
          </p>
          <p className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-[#0f172a]">
            {value ?? "—"}
          </p>
          {subtext ? (
            <p className="mt-1 text-xs font-semibold text-[#64748b]">
              {subtext}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={cx(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ring-1",
              selectedTone.icon,
            )}
          >
            <Icon size={19} strokeWidth={2.1} />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export function ModernTable({
  columns,
  rows,
  emptyText = "No data available",
  maxHeight = "max-h-[520px]",
  getRowKey,
  selectedRowKey,
  onRowClick,
  rowClassName,
  className = "",
}) {
  const safeRows = asArray(rows);

  return (
    <div
      className={cx(
        maxHeight,
        "overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-white shadow-[0_18px_60px_-52px_rgba(15,23,42,0.38)]",
        className,
      )}
    >
      <div className="h-full overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[#f8fafc]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cx(
                    "whitespace-nowrap border-b border-[#e2e8f0] px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.13em] text-[#64748b]",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#eef2f7]">
            {safeRows.length ? (
              safeRows.map((row, index) => {
                const rowKey =
                  getRowKey?.(row, index) || row.id || row._id || `${index}`;
                const isSelected = selectedRowKey && rowKey === selectedRowKey;

                return (
                  <motion.tr
                    key={rowKey}
                    whileHover={
                      onRowClick
                        ? { backgroundColor: "rgba(239,246,255,0.55)" }
                        : undefined
                    }
                    onClick={() => onRowClick?.(row, index)}
                    className={cx(
                      "transition",
                      onRowClick ? "cursor-pointer" : "",
                      isSelected
                        ? "bg-[#eff6ff] shadow-[inset_3px_0_0_#2563eb]"
                        : "hover:bg-[#eff6ff]/45",
                      typeof rowClassName === "function"
                        ? rowClassName(row, index, { isSelected, rowKey })
                        : rowClassName,
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cx(
                          "whitespace-nowrap px-4 py-3 font-semibold text-[#475569]",
                          column.cellClassName,
                        )}
                      >
                        {column.render
                          ? column.render(row, index, { isSelected, rowKey })
                          : compactText(
                              valueFrom(row, column.keys || [column.key]),
                            )}
                      </td>
                    ))}
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <DatabaseZap size={32} className="text-[#cbd5e1]" />
                    <p className="text-sm font-semibold text-[#64748b]">
                      {emptyText}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ModernCanvasShell({
  title,
  subtitle,
  icon: Icon = Sparkles,
  children,
  actions,
  onAction,
  footer,
  eyebrow = "ACI Assist",
  className = "",
  bodyClassName = "",
  headerClassName = "",
  compact = false,
  fullBleed = false,
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className={cx("relative w-full max-w-none overflow-visible", className)}
    >
      <div className="relative">
        <div
          className={cx(
            "mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
            compact ? "mb-4" : "",
            headerClassName,
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] bg-[linear-gradient(135deg,#eff6ff,#dbeafe)] text-[#2563eb] ring-1 ring-[#bfdbfe]">
              <Icon size={21} strokeWidth={1.9} />
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#2563eb]">
                {eyebrow}
              </p>
              <h2 className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.055em] text-[#0f172a] md:text-[36px]">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 max-w-4xl text-sm font-semibold leading-6 text-[#64748b]">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {actions?.length ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <ActionButton
                  key={`${action.label || action.type}-${index}`}
                  action={action}
                  onAction={onAction}
                  primary={index === 0}
                >
                  {action.label}
                </ActionButton>
              ))}
            </div>
          ) : null}
        </div>

        <div className={cx("space-y-5", bodyClassName)}>{children}</div>

        {footer}
      </div>
    </motion.article>
  );
}

export function ModernCanvasFooter({ message, showQueryPlan, onFollowUp }) {
  return (
    <div className="mt-6 space-y-4">
      <SourceTransparencyBar sourceTransparency={message?.sourceTransparency} />

      {showQueryPlan &&
      (message?.queryPlan || message?.intent || message?.entities) ? (
        <details className="rounded-[20px] border border-[#bfdbfe] bg-[#eff6ff]/75 p-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-black text-[#1e40af]">
            <Zap size={16} />
            View query plan
          </summary>
          <pre className="mt-3 max-h-60 overflow-auto rounded-[16px] bg-[#020617] p-4 text-xs text-slate-100">
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

      <FollowUpSuggestions
        suggestions={message?.followUpSuggestions}
        onSelect={onFollowUp}
      />
    </div>
  );
}
