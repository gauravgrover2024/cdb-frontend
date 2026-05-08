import React from "react";
import { formatINR } from "../../utils/currency";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const BreakupRow = ({ label, value, bold, muted, indent }) => (
  <div
    className={`flex items-center justify-between py-1.5 ${bold ? "border-t border-slate-100 mt-1 pt-2.5" : ""} ${indent ? "pl-3" : ""}`}
  >
    <span
      className={`text-[12px] ${bold ? "font-bold text-slate-800 dark:text-slate-100" : muted ? "text-slate-500 dark:text-slate-400" : "text-slate-500 dark:text-slate-300"}`}
    >
      {label}
    </span>
    <span
      className={`tabular-nums text-[12px] ${bold ? "font-black text-slate-900 dark:text-slate-50" : muted ? "text-slate-500 dark:text-slate-400" : "font-semibold text-slate-700 dark:text-slate-200"}`}
    >
      {value}
    </span>
  </div>
);

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
}) => {
  const visibleAddons = showAllAddons
    ? includedAddons
    : includedAddons.slice(0, 4);

  return (
    <div className={className}>
      <div className="px-5 pt-5 pb-3">
        {logoUrl && (
          <div className="mb-4 flex items-center gap-3">
            <img
              src={logoUrl}
              alt={insurerName || "Insurance Company"}
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            {insurerName && (
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {insurerName}
              </span>
            )}
          </div>
        )}
        <p className="m-0 mb-3 text-sm font-black text-slate-800 dark:text-slate-100">
          {title}
        </p>

        {breakup.ownDamage !== undefined && (
          <BreakupRow
            label="Own Damage"
            value={formatCurrency(breakup.ownDamage)}
            bold
          />
        )}

        {breakup.ownDamageBeforeNcb !== undefined && (
          <BreakupRow
            label="Own Damage before NCB"
            value={formatCurrency(breakup.ownDamageBeforeNcb)}
            indent
            muted
          />
        )}

        {breakup.basicOwnDamage !== undefined && (
          <BreakupRow
            label="Basic Own Damage"
            value={formatCurrency(breakup.basicOwnDamage)}
            indent
            muted
          />
        )}

        {breakup.ncbPercent !== undefined && breakup.ncbPercent > 0 && (
          <BreakupRow
            label={`NCB Discount (${breakup.ncbPercent}%)`}
            value={`-${formatCurrency(breakup.ncbAmount || 0)}`}
            indent
            muted
          />
        )}

        {breakup.thirdParty !== undefined && (
          <BreakupRow
            label="Third Party"
            value={formatCurrency(breakup.thirdParty)}
            bold
          />
        )}

        {breakup.basicThirdParty !== undefined && (
          <BreakupRow
            label="Basic Third Party"
            value={formatCurrency(breakup.basicThirdParty)}
            indent
            muted
          />
        )}

        {showAddons && includedAddons.length > 0 && (
          <>
            <BreakupRow
              label="Add Ons"
              value={formatCurrency(breakup.addOnsTotal || 0)}
              bold
            />
            {visibleAddons.map(({ name, amt }) => (
              <BreakupRow
                key={name}
                label={name}
                value={amt > 0 ? formatCurrency(amt) : "included"}
                indent
                muted
              />
            ))}
            {includedAddons.length > 4 && (
              <button
                type="button"
                onClick={onToggleAddons}
                className="mt-1 ml-3 flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0 text-[11px] font-semibold text-slate-600 hover:text-slate-700 transition-colors"
              >
                <span
                  className={cx(
                    "inline-block transition-transform duration-200",
                    showAllAddons ? "rotate-180" : "",
                  )}
                >
                  ▾
                </span>
                {showAllAddons
                  ? "Show Less"
                  : `+${includedAddons.length - 4} More Add-ons`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="mx-5 border-t border-dashed border-slate-200 dark:border-slate-800" />

      <div className="px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-slate-800 dark:text-slate-100">
            Total Amount
          </span>
          <span
            className={cx(
              "text-xl font-black tabular-nums",
              isAccepted
                ? "text-slate-800 dark:text-slate-100"
                : "text-slate-900 dark:text-slate-50",
            )}
          >
            {formatCurrency(totalAmount || breakup.totalAmount || 0)}
          </span>
        </div>
        <p className="m-0 mt-0.5 text-right text-[10px] text-slate-400">
          Prices are inclusive of GST
        </p>
      </div>
    </div>
  );
};

export default PremiumBreakupCard;
