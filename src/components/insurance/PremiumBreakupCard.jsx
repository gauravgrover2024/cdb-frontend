import React from "react";
import { CheckCircleFilled, DownOutlined, UpOutlined } from "@ant-design/icons";
import { formatINR } from "../../utils/currency";
import { formatPolicyDuration } from "../../utils/insurancePolicyDisplay";

// Utility for conditional classes
const cx = (...classes) => classes.filter(Boolean).join(" ");

const BreakupRow = ({ label, value, bold, muted, indent }) => (
  <div
    className={cx(
      "flex items-center justify-between py-1",
      bold ? "mt-0.5 border-t border-slate-100 pt-1.5 dark:border-slate-800" : "",
      indent ? "pl-3" : "",
    )}
  >
    <span
      className={cx(
        "text-[12px]",
        bold
          ? "font-bold text-slate-800 dark:text-slate-200"
          : muted
            ? "text-slate-500 dark:text-slate-400"
            : "text-slate-500 dark:text-slate-400",
      )}
    >
      {label}
    </span>
    <span
      className={cx(
        "whitespace-nowrap tabular-nums text-[12px]",
        bold
          ? "font-black text-slate-900 dark:text-white"
          : muted
            ? "text-slate-500 dark:text-slate-400"
            : "font-semibold text-slate-700 dark:text-slate-200",
      )}
    >
      {value}
    </span>
  </div>
);

// Consistent color palettes for different insurers/cards
const addonPalette = [
  {
    bg: "bg-blue-50",
    ring: "ring-blue-100",
    text: "text-blue-700",
    activeBg: "bg-blue-100",
    activeRing: "ring-blue-200",
    accent: "text-blue-600",
  },
  {
    bg: "bg-cyan-50",
    ring: "ring-cyan-100",
    text: "text-cyan-700",
    activeBg: "bg-cyan-100",
    activeRing: "ring-cyan-200",
    accent: "text-cyan-600",
  },
  {
    bg: "bg-orange-50",
    ring: "ring-orange-100",
    text: "text-orange-700",
    activeBg: "bg-orange-100",
    activeRing: "ring-orange-200",
    accent: "text-orange-600",
  },
];

const PremiumBreakupCard = ({
  breakup,
  formatCurrency = formatINR,
  showAddons = true,
  includedAddons = [],
  showAllAddons = false,
  onToggleAddons,
  totalAmount,
  isAccepted = false,
  title = "Premium Breakup",
  className = "",
  logoUrl = "",
  insurerName = "",
  idx = 0,
  coverageType = "",
  policyDuration = "",
  idv = "",
  borderless = false,
}) => {
  const [localShowAllAddons, setLocalShowAllAddons] = React.useState(false);

  // Controlled vs Uncontrolled state handling
  const isExpanded = onToggleAddons ? showAllAddons : localShowAllAddons;
  const toggleHandler = onToggleAddons || (() => setLocalShowAllAddons(!localShowAllAddons));

  // Limit visible addons to prevent clutter, unless expanded
  const visibleAddons = isExpanded
    ? includedAddons
    : includedAddons.slice(0, 4);

  const palette = addonPalette[idx % addonPalette.length];

  // Generate initials safely
  const initial = (insurerName || "?")
    .toString()
    .replace(/[^a-zA-Z]/g, "") // Remove non-alpha for cleaner initials if needed
    .slice(0, 2)
    .toUpperCase();

  const [fallbackLogoFailed, setFallbackLogoFailed] = React.useState(false);

  // Helper to format IDV if it's a number
  const formattedIdv = idv && !isNaN(idv) ? formatCurrency(Number(idv)) : idv;
  const resolvedTotal = totalAmount || breakup.totalAmount || 0;
  const formattedTotal =
    typeof resolvedTotal === "string"
      ? resolvedTotal
      : formatCurrency(Number(resolvedTotal || 0));

  return (
    <div
      className={cx(
        "relative flex flex-col transition-all duration-200",
        borderless
          ? "bg-transparent border-0 shadow-none"
          : cx(
              "rounded-2xl bg-white dark:bg-[#151515]",
              isAccepted
                ? "shadow-[0_4px_24px_rgba(15,23,42,0.10)] ring-1 ring-[#9FC0FF]"
                : "shadow-[0_2px_16px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 hover:shadow-[0_6px_24px_rgba(15,23,42,0.11)] dark:ring-slate-800",
            ),
        className
      )}
    >
      {isAccepted && !borderless && (
        <div className="absolute -top-2.5 left-4 z-10">
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 shadow-sm ring-1 ring-emerald-300">
            <CheckCircleFilled className="text-[9px]" />
            Accepted
          </span>
        </div>
      )}

      {/* Header Section */}
      {(logoUrl || insurerName) && (
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <div
                className={cx(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ring-1",
                  isAccepted
                    ? "bg-[#9FC0FF]/70 text-slate-800 ring-[#9FC0FF]"
                    : `${palette.bg} dark:bg-opacity-20 ${palette.text} ${palette.ring}`
                )}
              >
                {logoUrl && !fallbackLogoFailed ? (
                  <img
                    src={logoUrl}
                    alt={insurerName || "Insurer"}
                    className="h-7 w-7 rounded-md bg-white object-contain"
                    onError={() => setFallbackLogoFailed(true)}
                  />
                ) : (
                  <span className={isAccepted ? "text-slate-800" : palette.accent}>
                    {initial}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">
                  {insurerName || "Unknown Insurer"}
                </p>

                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {coverageType && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {coverageType}
                    </span>
                  )}
                  {coverageType && policyDuration && (
                    <span className="text-[10px] text-slate-300 dark:text-slate-700">·</span>
                  )}
                  {policyDuration && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatPolicyDuration(policyDuration)}
                    </span>
                  )}
                  {!coverageType && !policyDuration && title && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-450">{title}</span>
                  )}
                </div>
              </div>
            </div>

            {idv && coverageType !== "Third Party" && (
              <div className="shrink-0 text-right">
                <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  IDV
                </p>
                <p className="m-0 text-sm font-black tabular-nums text-slate-800 dark:text-slate-200">
                  {formattedIdv}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {(logoUrl || insurerName) && <div className="mx-4 border-t border-slate-100 dark:border-slate-800" />}

      {/* Breakdown Content */}
      <div className="px-4 pb-2 pt-3">
        {!logoUrl && !insurerName && (
          <p className="m-0 mb-1.5 text-sm font-black text-slate-800 dark:text-slate-200">
            {title}
          </p>
        )}
        {(logoUrl || insurerName) && (
          <p className="m-0 mb-1.5 text-sm font-black text-slate-800 dark:text-slate-200">
            {title}
          </p>
        )}

        {/* Own Damage Section */}
        {coverageType !== "Third Party" && (
          <div className="space-y-0">
            <BreakupRow
              label="Own Damage"
              value={formatCurrency(Number(breakup.ownDamageBeforeNcb || breakup.ownDamage || breakup.basicOwnDamage || 0))}
              bold
            />
            <BreakupRow
              label="Own Damage (Base)"
              value={formatCurrency(Number(breakup.ownDamageBeforeNcb || breakup.ownDamage || breakup.basicOwnDamage || 0))}
              indent
              muted
            />
            <BreakupRow
              label="NCB %"
              value={`${Number(breakup.ncbPercent || 0)}%`}
              indent
              muted
            />
          </div>
        )}

        {/* Third Party Section */}
        {coverageType !== "Stand Alone OD" && (
          <div className="mt-2 space-y-0">
            <BreakupRow
              label="Third Party"
              value={formatCurrency(Number(breakup.thirdParty || breakup.basicThirdParty || 0))}
              bold
            />
            <BreakupRow
              label="Basic Third Party"
              value={formatCurrency(Number(breakup.basicThirdParty || breakup.thirdParty || 0))}
              indent
              muted
            />
          </div>
        )}

        {/* Add-ons Section */}
        {showAddons && coverageType !== "Third Party" && includedAddons.length > 0 && (
          <div className="mt-2">
            <BreakupRow
              label="Add Ons"
              value={formatCurrency(breakup.addOnsTotal || 0)}
              bold
            />

            <div className="mt-1 space-y-0">
              {visibleAddons.map(({ name, amt }) => (
                <BreakupRow
                  key={name}
                  label={name}
                  value={amt > 0 ? formatCurrency(amt) : "included"}
                  indent
                  muted
                />
              ))}
            </div>

            {/* Toggle Button */}
            {includedAddons.length > 4 && (
              <button
                type="button"
                onClick={toggleHandler}
                className="ml-3 mt-1 flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-semibold text-slate-600 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {isExpanded ? (
                  <>
                    <UpOutlined className="text-[10px]" /> Show Less
                  </>
                ) : (
                  <>
                    <DownOutlined className="text-[10px]" /> +{includedAddons.length - 4} More Add-ons
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="mx-4 border-t border-dashed border-slate-200 dark:border-slate-800" />

        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-slate-800 dark:text-slate-200">
              Total Amount
            </span>
            <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
              {formattedTotal}
            </span>
          </div>
          <p className="m-0 mt-0.5 text-right text-[10px] text-slate-400 dark:text-slate-500">
            Prices are inclusive of GST
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumBreakupCard;
