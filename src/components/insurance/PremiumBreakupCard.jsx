import React from "react";
import { CheckCircleFilled, DownOutlined, UpOutlined } from "@ant-design/icons";
import { formatINR } from "../../utils/currency";

// Utility for conditional classes
const cx = (...classes) => classes.filter(Boolean).join(" ");

// Reusable Row Component with improved typography and spacing
const BreakupRow = ({ label, value, bold, muted, indent, isLast }) => (
  <div
    className={cx(
      "flex items-center justify-between py-2 group",
      indent ? "pl-4" : "",
      !isLast && !bold ? "border-b border-slate-50/50" : "" // Subtle separator for non-bold rows
    )}
  >
    <span
      className={cx(
        "text-[13px] leading-relaxed",
        bold ? "font-semibold text-slate-800" : muted ? "text-slate-500" : "text-slate-600",
        indent ? "text-slate-500" : ""
      )}
    >
      {label}
    </span>
    <span
      className={cx(
        "tabular-nums text-[13px] leading-relaxed whitespace-nowrap",
        bold
          ? "font-bold text-slate-900"
          : muted
            ? "text-slate-400"
            : "font-medium text-slate-700"
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
}) => {
  const [localShowAllAddons, setLocalShowAllAddons] = React.useState(false);

  // Controlled vs Uncontrolled state handling
  const isExpanded = onToggleAddons ? showAllAddons : localShowAllAddons;
  const toggleHandler = onToggleAddons || (() => setLocalShowAllAddons(!localShowAllAddons));

  // Limit visible addons to prevent clutter, unless expanded
  const visibleAddons = isExpanded
    ? includedAddons
    : includedAddons.slice(0, 3); // Reduced to 3 for cleaner initial view

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

  return (
    <div
      className={cx(
        "relative flex flex-col rounded-xl bg-white transition-all duration-300 ease-in-out",
        "border border-slate-200",
        isAccepted
          ? "shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-blue-200 border-blue-100"
          : "shadow-sm hover:shadow-md hover:border-slate-300",
        className
      )}
    >
      {/* Accepted Badge - Floating */}
      {isAccepted && (
        <div className="absolute -top-3 left-4 z-10">
          <span className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm shadow-blue-200">
            <CheckCircleFilled className="text-[10px]" />
            ACCEPTED
          </span>
        </div>
      )}

      {/* Header Section */}
      {(logoUrl || insurerName) && (
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {/* Logo / Initials Box */}
              <div
                className={cx(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-1 transition-colors",
                  isAccepted
                    ? "bg-blue-50 text-blue-700 ring-blue-100"
                    : `${palette.bg} ${palette.text} ${palette.ring}`
                )}
              >
                {logoUrl && !fallbackLogoFailed ? (
                  <img
                    src={logoUrl}
                    alt={insurerName || "Insurer"}
                    className="h-8 w-8 object-contain"
                    onError={() => setFallbackLogoFailed(true)}
                  />
                ) : (
                  <span className={cx("text-lg", isAccepted ? "text-blue-600" : palette.accent)}>
                    {initial}
                  </span>
                )}
              </div>

              {/* Insurer Details */}
              <div className="min-w-0 pt-0.5">
                <p className="truncate text-base font-bold text-slate-900 leading-tight">
                  {insurerName || "Unknown Insurer"}
                </p>

                {/* Meta Tags */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {coverageType && (
                    <span className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                      {coverageType}
                    </span>
                  )}
                  {policyDuration && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      {policyDuration}
                    </span>
                  )}
                  {!coverageType && !policyDuration && title && (
                    <span className="text-[11px] text-slate-500">{title}</span>
                  )}
                </div>
              </div>
            </div>

            {/* IDV Block */}
            {idv && (
              <div className="text-right shrink-0 pl-2 border-l border-slate-100 ml-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                  IDV
                </p>
                <p className="text-sm font-bold tabular-nums text-slate-800">
                  {formattedIdv}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Divider after header */}
      {(logoUrl || insurerName) && <div className="mx-5 border-t border-slate-100" />}

      {/* Breakdown Content */}
      <div className="px-5 pt-4 pb-2">
        {!logoUrl && !insurerName && (
          <p className="mb-4 text-sm font-bold text-slate-800 uppercase tracking-wide">
            {title}
          </p>
        )}

        {/* Own Damage Section */}
        <div className="space-y-0">
          <BreakupRow
            label="Own Damage Premium"
            value={formatCurrency(Number(breakup.ownDamageBeforeNcb || breakup.ownDamage || breakup.basicOwnDamage || 0))}
            bold
          />
          <BreakupRow
            label="Base OD"
            value={formatCurrency(Number(breakup.ownDamageBeforeNcb || breakup.ownDamage || breakup.basicOwnDamage || 0))}
            indent
            muted
          />
          <BreakupRow
            label={`NCB Discount (${Number(breakup.ncbPercent || 0)}%)`}
            value={`- ${formatCurrency(Number((breakup.ownDamageBeforeNcb || 0) * (breakup.ncbPercent || 0) / 100))}`}
            indent
            muted
          // Optional: Show negative value in red/green if desired, currently keeping neutral gray
          />
        </div>

        {/* Third Party Section */}
        {coverageType !== "Stand Alone OD" && (
          <div className="mt-2 space-y-0">
            <BreakupRow
              label="Third Party Liability"
              value={formatCurrency(Number(breakup.thirdParty || breakup.basicThirdParty || 0))}
              bold
            />
            <BreakupRow
              label="Basic TP"
              value={formatCurrency(Number(breakup.basicThirdParty || breakup.thirdParty || 0))}
              indent
              muted
            />
          </div>
        )}

        {/* Add-ons Section */}
        {showAddons && includedAddons.length > 0 && (
          <div className="mt-2">
            <BreakupRow
              label="Add-on Covers"
              value={formatCurrency(breakup.addOnsTotal || 0)}
              bold
            />

            <div className="mt-1 space-y-0">
              {visibleAddons.map(({ name, amt }) => (
                <BreakupRow
                  key={name}
                  label={name}
                  value={amt > 0 ? formatCurrency(amt) : "Included"}
                  indent
                  muted
                />
              ))}
            </div>

            {/* Toggle Button */}
            {includedAddons.length > 3 && (
              <button
                type="button"
                onClick={toggleHandler}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-200 bg-slate-50 py-1.5 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-800 hover:border-slate-300"
              >
                {isExpanded ? (
                  <>
                    <UpOutlined className="text-[10px]" /> Show Less
                  </>
                ) : (
                  <>
                    <DownOutlined className="text-[10px]" /> +{includedAddons.length - 3} More Add-ons
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Total Section */}
      <div className="mt-auto">
        {/* Dashed Separator */}
        <div className="mx-5 border-t border-dashed border-slate-200 my-2" />

        <div className="bg-slate-50/50 rounded-b-xl p-5">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-500">
                Net Premium
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Incl. GST & Taxes
              </span>
            </div>
            <div className="text-right">
              <span className="block text-2xl font-black tabular-nums text-slate-900 tracking-tight">
                {formatCurrency(totalAmount || breakup.totalAmount || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumBreakupCard;