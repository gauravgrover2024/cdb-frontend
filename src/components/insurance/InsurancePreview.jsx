import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Empty, Table } from "antd";
import {
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  WalletOutlined,
  BankOutlined,
  UserOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  BadgeIndianRupee,
  CarFront,
  CreditCard,
  Download,
  FileText,
  Search,
  Shield,
  UserRound,
  X,
} from "lucide-react";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const EMPTY_LIST = Object.freeze([]);

const hasValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.some((item) => hasValue(item));
  if (typeof value === "object")
    return Object.values(value).some((item) => hasValue(item));
  return true;
};

const firstFilled = (...values) => values.find((value) => hasValue(value));

const asText = (value) => {
  if (!hasValue(value)) return "—";
  if (Array.isArray(value)) {
    const arr = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    return arr.length ? arr.join(", ") : "—";
  }
  return String(value);
};

const toINR = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);

const asMoney = (value) => {
  if (!hasValue(value)) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return asText(value);
  return toINR(n);
};

const asPercent = (value) => {
  if (!hasValue(value)) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return asText(value);
  return `${n}%`;
};

const asDateInput = (value) => {
  if (!hasValue(value)) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const asDateTime = (value) => {
  if (!hasValue(value)) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isImageUrl = (url = "") =>
  /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(url));
const isVideoUrl = (url = "") =>
  /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(url));

const getInitials = (value = "") =>
  String(value)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "IC";

const toneStyles = {
  mint: {
    card: "border-[#C9D9FF]/80 bg-[#C9D9FF]/28 dark:border-[#C9D9FF]/35 dark:bg-[#C9D9FF]/8",
    head: "text-slate-700 dark:text-slate-200",
  },
  sage: {
    card: "border-[#EEF7FF]/90 bg-[#EEF7FF]/35 dark:border-[#EEF7FF]/35 dark:bg-[#EEF7FF]/10",
    head: "text-slate-700 dark:text-slate-200",
  },
  cream: {
    card: "border-[#FFF4EC] bg-[#FFF4EC]/75 dark:border-[#FFF4EC]/30 dark:bg-[#FFF4EC]/10",
    head: "text-slate-700 dark:text-slate-200",
  },
  rose: {
    card: "border-[#F3A6B7]/80 bg-[#F3A6B7]/25 dark:border-[#F3A6B7]/35 dark:bg-[#F3A6B7]/10",
    head: "text-slate-700 dark:text-slate-200",
  },
};

const stagePillClass = (tone, active) => {
  const base =
    "group inline-flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition-colors";
  if (!active) {
    return `${base} border-border bg-background text-muted-foreground hover:border-slate-300 hover:bg-muted/35 hover:text-foreground dark:hover:border-slate-700`;
  }
  const map = {
    mint: "border-[#C9D9FF] bg-[#C9D9FF]/72 text-slate-900 dark:border-[#C9D9FF]/50 dark:bg-[#C9D9FF]/20 dark:text-slate-100",
    sage: "border-[#EEF7FF] bg-[#EEF7FF]/80 text-slate-900 dark:border-[#EEF7FF]/50 dark:bg-[#EEF7FF]/20 dark:text-slate-100",
    cream:
      "border-[#FFF4EC] bg-[#FFF4EC] text-slate-900 dark:border-[#FFF4EC]/45 dark:bg-[#FFF4EC]/16 dark:text-slate-100",
    rose: "border-[#F3A6B7] bg-[#F3A6B7]/72 text-slate-900 dark:border-[#F3A6B7]/50 dark:bg-[#F3A6B7]/20 dark:text-slate-100",
  };
  return `${base} ${map[tone] || map.mint}`;
};

const stageToneChipClass = (tone) => {
  const map = {
    mint: "bg-[#C9D9FF]/85 text-slate-800 dark:bg-[#C9D9FF]/30 dark:text-slate-100",
    sage: "bg-[#EEF7FF] text-slate-800 dark:bg-[#EEF7FF]/30 dark:text-slate-100",
    cream:
      "bg-[#FFF4EC] text-slate-800 dark:bg-[#FFF4EC]/30 dark:text-slate-100",
    rose: "bg-[#F3A6B7]/80 text-slate-800 dark:bg-[#F3A6B7]/30 dark:text-slate-100",
  };
  return map[tone] || map.mint;
};

const FieldRow = ({ label, value, highlight = false }) => (
  <div className="flex flex-col gap-1.5 border-b border-border60 py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
    <span className="max-w-full text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:max-w-[48%]">
      {label}
    </span>
    <span
      className={cx(
        "max-w-full break-words text-left text-sm font-semibold sm:max-w-[52%] sm:text-right",
        highlight
          ? "text-slate-900 dark:text-slate-100 font-bold"
          : "text-foreground",
      )}
    >
      {value}
    </span>
  </div>
);

const SectionCard = ({ title, tone = "mint", fields = [], query = "" }) => {
  const visibleFields = fields
    .filter((field) => hasValue(field?.value))
    .filter((field) => {
      if (!query.trim()) return true;
      const hay =
        `${field.label} ${field.formatter ? field.formatter(field.value) : asText(field.value)}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });

  if (!visibleFields.length) return null;

  const ts = toneStyles[tone] || toneStyles.mint;

  return (
    <div className={cx("rounded-xl border p-3", ts.card)}>
      <p
        className={cx(
          "mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em]",
          ts.head,
        )}
      >
        {title}
      </p>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {visibleFields.map((field) => (
          <FieldRow
            key={`${title}-${field.label}`}
            label={field.label}
            value={
              field.formatter
                ? field.formatter(field.value)
                : asText(field.value)
            }
            highlight={field.highlight}
          />
        ))}
      </div>
    </div>
  );
};

const InlineEmptyState = ({
  text = "No captured data found in this page yet.",
}) => (
  <div className="rounded-2xl border border-dashed border-border70 bg-muted/15 px-4 py-6 text-center">
    <p className="text-xs font-medium text-muted-foreground">{text}</p>
  </div>
);

const ContinuousPageSection = React.forwardRef(
  (
    { icon: IconComp, title, page, active = false, tone = "mint", children },
    ref,
  ) => (
    <section
      ref={ref}
      className={cx(
        "scroll-mt-6 rounded-[26px] border px-4 py-4 md:px-5 md:py-5",
        active
          ? "border-[#C9D9FF] bg-[#EEF7FF]/45 dark:border-[#C9D9FF]/40 dark:bg-[#EEF7FF]/10"
          : "border-border70 bg-card",
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border60 pb-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                "inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-800",
                stageToneChipClass(tone),
              )}
            >
              <IconComp size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {page}
              </p>
              <h3 className="truncate text-sm font-bold text-foreground md:text-[15px]">
                {title}
              </h3>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3 pt-4">{children}</div>
    </section>
  ),
);

const ADDON_CATALOG = [
  "Zero Depreciation",
  "Consumables",
  "Engine Protection",
  "Roadside Assistance",
  "No Claim Bonus (NCB) Protection",
  "Key Replacement",
  "Tyre Protection",
  "Return to Invoice",
  "Driver Cover",
  "Personal Accident Cover for Passengers",
  "Loss of Personal Belongings",
  "Outstation Emergency Cover",
  "Battery Cover",
];

const getQuoteRowId = (q, index = 0) =>
  q?.id ?? q?._id ?? q?.quoteId ?? `quote-${index}`;

const computeQuoteBreakupFromRow = (q) => {
  if (!q || typeof q !== "object") {
    return {
      addOnsTotal: 0,
      odAmt: 0,
      tpAmt: 0,
      totalIdv: 0,
      ncbAmount: 0,
      taxableAmount: 0,
      gstAmount: 0,
      totalPremium: 0,
      addOnLines: [],
    };
  }

  const addOns = q.addOns && typeof q.addOns === "object" ? q.addOns : {};
  const coverageType = String(q.coverageType || "Comprehensive");
  const isThirdPartyOnly = coverageType === "Third Party";
  const isOdOnly =
    coverageType === "Own Damage" || coverageType === "Stand Alone OD";
  const includesOd = !isThirdPartyOnly;
  const includesTp = !isOdOnly;
  const allowsAddOns = includesOd;

  const included =
    q.addOnsIncluded && typeof q.addOnsIncluded === "object"
      ? q.addOnsIncluded
      : {};

  const selectedAddOnsTotal = ADDON_CATALOG.reduce((sum, name) => {
    if (!included[name]) return sum;
    return sum + Number(addOns[name] || 0);
  }, 0);

  const rawAddOnsTotal = Number(q.addOnsAmount || 0) + selectedAddOnsTotal;
  const addOnsTotal = allowsAddOns ? rawAddOnsTotal : 0;

  const normalizedOdAmount = Number(
    q.odAmount ?? q.ownDamage ?? q.basicOwnDamage ?? q.odPremium ?? 0,
  );
  const normalizedTpAmount = Number(
    q.thirdPartyAmount ?? q.thirdParty ?? q.basicThirdParty ?? q.tpPremium ?? 0,
  );
  const normalizedNcbDiscount = Number(
    q.ncbDiscount ?? q.newNcbDiscount ?? q.ncb_percentage ?? 0,
  );

  const odAmt = includesOd ? normalizedOdAmount : 0;
  const tpAmt = includesTp ? normalizedTpAmount : 0;

  const idvParts =
    Number(q.vehicleIdv || 0) +
    Number(q.cngIdv || 0) +
    Number(q.accessoriesIdv || 0);
  const storedIdv = Number(q.totalIdv);
  const totalIdv =
    Number.isFinite(storedIdv) && storedIdv > 0 ? storedIdv : idvParts;

  const basePremium = odAmt + tpAmt + addOnsTotal;
  const ncbAmount = Math.round((odAmt * normalizedNcbDiscount) / 100);
  const taxableAmount = Math.max(basePremium - ncbAmount, 0);
  const gstAmount = Math.round(taxableAmount * 0.18);
  const totalPremium = taxableAmount + gstAmount;

  const addOnLines = ADDON_CATALOG.filter((name) => included[name]).map(
    (name) => ({
      name,
      amount: Number(addOns[name] || 0),
    }),
  );

  return {
    addOnsTotal,
    odAmt,
    tpAmt,
    totalIdv,
    ncbAmount,
    taxableAmount,
    gstAmount,
    totalPremium,
    addOnLines,
  };
};

const formatStoredOrComputedIdv = (row) => {
  const s = Number(row?.totalIdv);
  if (Number.isFinite(s) && s > 0) return toINR(s);
  return toINR(computeQuoteBreakupFromRow(row).totalIdv);
};

const formatStoredOrComputedPremium = (row) =>
  toINR(computeQuoteBreakupFromRow(row).totalPremium);

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

const addonPalette = [
  {
    bg: "bg-[#C9D9FF]/35",
    ring: "ring-[#C9D9FF]",
    text: "text-slate-700",
    activeBg: "bg-[#C9D9FF]/70",
    activeRing: "ring-[#C9D9FF]",
  },
  {
    bg: "bg-[#EEF7FF]/40",
    ring: "ring-[#EEF7FF]",
    text: "text-slate-700",
    activeBg: "bg-[#EEF7FF]/75",
    activeRing: "ring-[#EEF7FF]",
  },
  {
    bg: "bg-[#FFF4EC]/55",
    ring: "ring-[#FFF4EC]",
    text: "text-slate-700",
    activeBg: "bg-[#FFF4EC]",
    activeRing: "ring-[#FFF4EC]",
  },
];

const QuotePreviewCard = ({
  row,
  idx,
  isAccepted = false,
  isCheapest = false,
}) => {
  const [showAllAddons, setShowAllAddons] = useState(false);
  const breakup = computeQuoteBreakupFromRow(row);
  const palette = addonPalette[idx % addonPalette.length];

  const ncbPct = Number(row?.ncbDiscount || 0);
  const ncbAmount = Number(breakup?.ncbAmount || 0);
  const odBeforeNcb = Number(breakup?.odAmt || 0);
  const odAfterNcb = Math.max(odBeforeNcb - ncbAmount, 0);

  const includedAddons = Object.entries(row?.addOnsIncluded || {})
    .filter(([, v]) => v)
    .map(([k]) => ({ name: k, amt: Number(row?.addOns?.[k] || 0) }));

  const visibleAddons = showAllAddons
    ? includedAddons
    : includedAddons.slice(0, 4);
  const initial = (row?.insuranceCompany || "?")
    .toString()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cx(
        "relative flex flex-col rounded-2xl bg-white dark:bg-[#151515] transition-all duration-200",
        isAccepted
          ? "shadow-[0_4px_24px_rgba(15,23,42,0.10)] ring-1 ring-[#C9D9FF]"
          : "shadow-[0_2px_16px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 hover:shadow-[0_6px_24px_rgba(15,23,42,0.11)] dark:ring-slate-800",
      )}
    >
      {isAccepted && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1">
          <span className="flex items-center gap-1 rounded-full bg-[#C9D9FF] px-2.5 py-0.5 text-[10px] font-black text-slate-800 shadow-sm">
            <CheckCircleFilled className="text-[9px]" /> Accepted
          </span>
        </div>
      )}

      {!isAccepted && isCheapest && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1">
          <span className="rounded-full bg-[#FFF4EC] px-2.5 py-0.5 text-[10px] font-black text-slate-700 shadow-sm ring-1 ring-[#FFF4EC]">
            Lowest Premium
          </span>
        </div>
      )}

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={cx(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ring-1",
                isAccepted
                  ? "bg-[#C9D9FF]/70 text-slate-800 ring-[#C9D9FF]"
                  : `${palette.activeBg} ${palette.text} ${palette.activeRing}`,
              )}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {row?.insuranceCompany || "—"}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                {row?.coverageType && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {row.coverageType}
                  </span>
                )}
                {row?.coverageType && row?.policyDuration && (
                  <span className="text-[10px] text-slate-300">·</span>
                )}
                {row?.policyDuration && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {row.policyDuration}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              IDV
            </p>
            <p className="m-0 text-sm font-black tabular-nums text-slate-800 dark:text-slate-100">
              {formatStoredOrComputedIdv(row)}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 border-t border-slate-100 dark:border-slate-800" />

      <div className="px-5 pt-5 pb-3">
        <p className="m-0 mb-3 text-sm font-black text-slate-800 dark:text-slate-100">
          Premium Breakup
        </p>

        <BreakupRow label="Own Damage" value={toINR(odAfterNcb)} bold />
        <BreakupRow
          label="Own Damage before NCB"
          value={toINR(odBeforeNcb)}
          indent
          muted
        />

        {ncbPct > 0 && (
          <BreakupRow
            label={`NCB Discount (${ncbPct}%)`}
            value={`-${toINR(ncbAmount)}`}
            indent
            muted
          />
        )}

        <BreakupRow
          label="Third Party"
          value={toINR(breakup?.tpAmt ?? 0)}
          bold
        />
        <BreakupRow
          label="Basic Third Party"
          value={toINR(breakup?.tpAmt ?? 0)}
          indent
          muted
        />

        {includedAddons.length > 0 && (
          <>
            <BreakupRow
              label="Add Ons"
              value={toINR(breakup?.addOnsTotal ?? 0)}
              bold
            />
            {visibleAddons.map(({ name, amt }) => (
              <BreakupRow
                key={name}
                label={name}
                value={amt > 0 ? toINR(amt) : "included"}
                indent
                muted
              />
            ))}
            {includedAddons.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllAddons((p) => !p)}
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
            {formatStoredOrComputedPremium(row)}
          </span>
        </div>
        <p className="m-0 mt-0.5 text-right text-[10px] text-slate-400">
          Prices are inclusive of GST
        </p>
      </div>

      <div className="px-5 pb-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cx(
              "flex-1 rounded-xl py-2.5 text-[13px] font-black tracking-wide border-0 shadow-sm",
              isAccepted
                ? "bg-[#C9D9FF] text-slate-800"
                : "bg-[#F3A6B7] text-slate-800",
            )}
          >
            {isAccepted ? "✓ Accepted" : "Accept"}
          </button>

          <button
            type="button"
            disabled
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-slate-50 text-slate-400 ring-1 ring-slate-200 cursor-not-allowed"
            title="Edit"
          >
            <EditOutlined className="text-xs" />
          </button>

          <button
            type="button"
            disabled
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-[#F3A6B7]/30 text-slate-500 ring-1 ring-[#F3A6B7] cursor-not-allowed"
            title="Delete"
          >
            <DeleteOutlined className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ENTRY_TYPES = {
  INSURER_PAYMENT: "INSURER_PAYMENT",
  CUSTOMER_RECEIPT: "CUSTOMER_RECEIPT",
  SUBVENTION_NON_RECOVERABLE: "SUBVENTION_NON_RECOVERABLE",
  SUBVENTION_REFUND: "SUBVENTION_REFUND",
};

const toAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const inferEntryType = (row = {}) => {
  if (row.entryType) return row.entryType;
  if (row.paymentType === "inhouse") return ENTRY_TYPES.INSURER_PAYMENT;
  if (row.paymentType === "customer") return ENTRY_TYPES.CUSTOMER_RECEIPT;
  if (row.paymentType === "subvention_nr")
    return ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE;
  if (row.paymentType === "adjustment") return ENTRY_TYPES.SUBVENTION_REFUND;
  return ENTRY_TYPES.INSURER_PAYMENT;
};

const normalizeLedgerRow = (row = {}, index = 0) => {
  const entryType = inferEntryType(row);
  const amount = toAmount(row.amount);
  const paidByRaw = String(
    row.paidBy || row.paymentBy || row.paymentMadeBy || "",
  ).trim();

  let paidBy = paidByRaw;
  if (entryType === ENTRY_TYPES.CUSTOMER_RECEIPT) paidBy = "Customer";
  if (
    entryType === ENTRY_TYPES.SUBVENTION_REFUND ||
    entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
  ) {
    paidBy = "Autocredits";
  }
  if (entryType === ENTRY_TYPES.INSURER_PAYMENT && !paidBy) {
    paidBy =
      String(row.paymentType || "").toLowerCase() === "customer"
        ? "Customer"
        : "Autocredits";
  }

  return {
    _id: row._id || row.id || `ins-pay-${Date.now()}-${index}`,
    entryType,
    paidBy,
    amount,
    date: row.date ?? row.paymentDate ?? row.receiptDate ?? null,
    paymentMode:
      row.paymentMode ||
      row.mode ||
      (entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
        ? ""
        : "Online Transfer/UPI"),
    transactionRef: row.transactionRef || row.reference || row.utr || "",
    bankName: row.bankName || "",
    remarks: row.remarks || "",
  };
};

const computePaymentTotals = (rows = [], premium = 0) => {
  const insurerPaidByAutocredits = rows
    .filter(
      (r) =>
        r.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "autocredits",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const insurerPaidByCustomer = rows
    .filter(
      (r) =>
        r.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "customer",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const customerRecovered = rows
    .filter((r) => r.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const subventionNotRecoverable = rows
    .filter((r) => r.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const subventionRefundPaid = rows
    .filter((r) => r.entryType === ENTRY_TYPES.SUBVENTION_REFUND)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const insurerPaidTotal = insurerPaidByAutocredits + insurerPaidByCustomer;
  const insurerOutstanding = Math.max(0, premium - insurerPaidTotal);

  const customerNetReceivableWhenAcPays = Math.max(
    0,
    insurerPaidByAutocredits - subventionNotRecoverable,
  );

  const customerOutstandingToAc = Math.max(
    0,
    customerNetReceivableWhenAcPays - customerRecovered,
  );

  const subventionRefundExpected = Math.max(0, premium - insurerPaidByCustomer);
  const subventionRefundOutstanding = Math.max(
    0,
    subventionRefundExpected - subventionRefundPaid,
  );

  return {
    insurerPaidByAutocredits,
    insurerPaidByCustomer,
    insurerPaidTotal,
    insurerOutstanding,
    customerRecovered,
    customerNetReceivableWhenAcPays,
    customerOutstandingToAc,
    subventionNotRecoverable,
    subventionRefundExpected,
    subventionRefundPaid,
    subventionRefundOutstanding,
  };
};

const ProgressBar = ({ value, total, color = "#7a978e" }) => {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
};

const PaymentMetricCard = ({
  title,
  value,
  sub,
  icon,
  accent = "#7a978e",
  accentBg = "#eef3ef",
  progress,
  progressTotal,
  tooltip,
}) => (
  <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#151515] p-4 shadow-sm transition-shadow hover:shadow-md">
    <div
      className="absolute right-0 top-0 h-20 w-20 rounded-bl-[60px] opacity-40"
      style={{ backgroundColor: accentBg }}
    />
    <div className="relative z-10 mb-3 flex items-start justify-between">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </div>
      {tooltip && (
        <div title={tooltip}>
          <InfoCircleOutlined className="cursor-help text-slate-300 hover:text-slate-500" />
        </div>
      )}
    </div>

    <div className="relative z-10">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </div>
      <div className="mt-0.5 text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
          {sub}
        </div>
      ) : null}
      {progress !== undefined ? (
        <ProgressBar value={progress} total={progressTotal} color={accent} />
      ) : null}
    </div>
  </div>
);

const renderEntryIcon = (row) => {
  if (row.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT) {
    return <ArrowDownOutlined className="text-emerald-600" />;
  }

  if (
    row.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
    String(row.paidBy || "").toLowerCase() === "customer"
  ) {
    return <SwapOutlined className="text-sky-600" />;
  }

  if (row.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE) {
    return <SwapOutlined className="text-amber-600" />;
  }

  if (row.entryType === ENTRY_TYPES.SUBVENTION_REFUND) {
    return <ArrowUpOutlined className="text-orange-600" />;
  }

  return <ArrowUpOutlined className="text-rose-600" />;
};

const renderEntryLabel = (row) => {
  if (row.entryType === ENTRY_TYPES.INSURER_PAYMENT)
    return "Paid to Insurance Co.";
  if (row.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT)
    return "Receipt from Customer";
  if (row.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE)
    return "Subvention (Not Recoverable)";
  return "Subvention refund to Customer";
};

const STAGE_CATALOG = [
  {
    originalStep: 1,
    key: "customer",
    title: "Customer Information",
    icon: UserRound,
    tone: "mint",
  },
  {
    originalStep: 2,
    key: "vehicle",
    title: "Vehicle Details",
    icon: CarFront,
    tone: "sage",
  },
  {
    originalStep: 3,
    key: "previous",
    title: "Previous Policy",
    icon: FileText,
    tone: "cream",
  },
  {
    originalStep: 4,
    key: "quotes",
    title: "Insurance Quotes",
    icon: BadgeIndianRupee,
    tone: "rose",
  },
  {
    originalStep: 6,
    key: "policy",
    title: "New Policy Details",
    icon: Shield,
    tone: "mint",
  },
  {
    originalStep: 7,
    key: "documents",
    title: "Gallery",
    icon: FileText,
    tone: "sage",
  },
  {
    originalStep: 8,
    key: "payment",
    title: "Payment",
    icon: CreditCard,
    tone: "cream",
  },
];

const InsurancePreview = ({ visible, onClose, data, initialStageKey = null }) => {
  const [activeStage, setActiveStage] = useState("customer");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  const sectionRefs = useRef({});
  const contentScrollRef = useRef(null);
  const suppressScrollSyncUntilRef = useRef(0);

  const isMobileViewport = viewportWidth < 768;
  const isNewCar = String(data?.vehicleType || "").trim() === "New Car";

  const visibleStages = useMemo(() => {
    return STAGE_CATALOG.filter((stage) => {
      if (isNewCar && stage.originalStep === 3) return false;
      return true;
    }).map((stage, idx) => ({
      ...stage,
      displayStep: idx + 1,
      displayLabel: `Step ${idx + 1}`,
    }));
  }, [isNewCar]);

  const stageByKey = useMemo(() => {
    const m = new Map();
    visibleStages.forEach((stage) => m.set(stage.key, stage));
    return m;
  }, [visibleStages]);

  const stageKeys = useMemo(
    () => visibleStages.map((stage) => stage.key),
    [visibleStages],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const fallbackStage = visibleStages[0]?.key || "customer";
    const preferredStage = stageByKey.has(initialStageKey)
      ? initialStageKey
      : fallbackStage;
    setActiveStage(preferredStage);
    setSearchQuery("");
    const timer = window.setTimeout(() => {
      const container = contentScrollRef.current;
      const section = sectionRefs.current[preferredStage];
      if (!container) return;
      container.scrollTo({
        top: Math.max(0, (section?.offsetTop || 0) - 16),
        behavior: "auto",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [visible, visibleStages, stageByKey, initialStageKey]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!visible) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior =
        previousHtmlOverscroll;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const container = contentScrollRef.current;
    if (!container || !stageKeys.length) return undefined;

    let frame = null;

    const syncActiveFromScroll = () => {
      if (Date.now() < suppressScrollSyncUntilRef.current) return;
      const scrollTop = container.scrollTop;
      const activationLine = scrollTop + 140;

      const candidate = stageKeys.reduce((current, key) => {
        const node = sectionRefs.current[key];
        if (!node) return current;
        if (node.offsetTop - 96 <= activationLine) return key;
        return current;
      }, stageKeys[0] || "customer");

      if (candidate && candidate !== activeStage) setActiveStage(candidate);
    };

    const onScroll = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveFromScroll);
    };

    syncActiveFromScroll();
    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      container.removeEventListener("scroll", onScroll);
    };
  }, [visible, stageKeys, activeStage]);

  const suppressScrollSync = (duration = 500) => {
    suppressScrollSyncUntilRef.current = Date.now() + duration;
  };

  const scrollToStage = (key) => {
    suppressScrollSync();
    setActiveStage(key);
    const container = contentScrollRef.current;
    const section = sectionRefs.current[key];
    if (!container || !section) return;
    container.scrollTo({
      top: Math.max(0, section.offsetTop - 16),
      behavior: "smooth",
    });
  };

  const quotes = useMemo(
    () => (Array.isArray(data?.quotes) ? data.quotes : EMPTY_LIST),
    [data?.quotes],
  );
  const acceptedQuoteId = firstFilled(
    data?.acceptedQuoteId,
    data?.accepted_quote_id,
  );
  const acceptedQuote =
    data?.acceptedQuote ||
    quotes.find(
      (q, idx) => String(getQuoteRowId(q, idx)) === String(acceptedQuoteId),
    ) ||
    null;

  const documents = useMemo(
    () => (Array.isArray(data?.documents) ? data.documents : EMPTY_LIST),
    [data?.documents],
  );

  const paymentHistoryRaw = useMemo(() => {
    if (Array.isArray(data?.paymentHistory)) return data.paymentHistory;
    if (Array.isArray(data?.payment_history)) return data.payment_history;
    return EMPTY_LIST;
  }, [data?.paymentHistory, data?.payment_history]);

  const paymentHistory = useMemo(
    () => paymentHistoryRaw.map((row, idx) => normalizeLedgerRow(row, idx)),
    [paymentHistoryRaw],
  );

  const premiumAmount = Number(
    firstFilled(
      data?.newTotalPremium,
      acceptedQuote?.totalPremium,
      computeQuoteBreakupFromRow(acceptedQuote).totalPremium,
      0,
    ),
  );

  const paymentTotals = useMemo(
    () => computePaymentTotals(paymentHistory, premiumAmount),
    [paymentHistory, premiumAmount],
  );

  const caseStatus = asText(
    firstFilled(data?.status, data?.newPolicyNumber ? "active" : "draft"),
  );
  const caseId = asText(firstFilled(data?.caseId, data?.id));
  const customerName = firstFilled(
    data?.customerName,
    data?.companyName,
    "Insurance Case",
  );
  const vehicleLabel = [
    data?.vehicleMake,
    data?.vehicleModel,
    data?.vehicleVariant,
  ]
    .filter(Boolean)
    .join(" ");
  const initials = getInitials(customerName);

  const galleryItems = useMemo(() => {
    return (documents || [])
      .map((doc, idx) => {
        const url = String(
          firstFilled(doc?.previewUrl, doc?.url, doc?.fileUrl, ""),
        ).trim();
        if (!url) return null;
        const kind = isImageUrl(url)
          ? "image"
          : isVideoUrl(url)
            ? "video"
            : null;
        if (!kind) return null;
        return {
          key: String(doc?.id || idx),
          name: asText(firstFilled(doc?.name, doc?.tag, `Media ${idx + 1}`)),
          tag: asText(firstFilled(doc?.tag, doc?.type, "")),
          url,
          kind,
        };
      })
      .filter(Boolean);
  }, [documents]);

  const quotePremiums = useMemo(
    () =>
      quotes.map((q) =>
        Number(computeQuoteBreakupFromRow(q).totalPremium || 0),
      ),
    [quotes],
  );
  const lowestPremium = quotePremiums.length
    ? Math.min(...quotePremiums)
    : null;

  const paymentColumns = [
    {
      title: "Date",
      key: "date",
      width: 140,
      render: (_, row) => asDateInput(row.date),
    },
    {
      title: "Entry",
      key: "entry",
      width: 240,
      render: (_, row) => (
        <div className="flex items-start gap-2.5">
          <span className="mt-[2px]">{renderEntryIcon(row)}</span>
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
              {renderEntryLabel(row)}
            </p>
            <p className="m-0 text-[11px] text-slate-500 dark:text-slate-400">
              by {row.paidBy || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 140,
      render: (_, row) => (
        <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {asMoney(row.amount)}
        </span>
      ),
    },
    {
      title: "Mode",
      key: "mode",
      width: 150,
      render: (_, row) => asText(row.paymentMode),
    },
    {
      title: "Ref",
      key: "ref",
      width: 160,
      render: (_, row) => asText(row.transactionRef),
    },
    {
      title: "Remarks",
      key: "remarks",
      width: 240,
      render: (_, row) => asText(row.remarks),
    },
  ];

  const renderStepLabel = (key) => stageByKey.get(key)?.displayLabel || "Step";
  const hasStage = (key) => stageByKey.has(key);

  if (!visible || !data) return null;

  const subventionCardIsNR = paymentTotals.subventionNotRecoverable > 0;
  const subventionCardValue = subventionCardIsNR
    ? paymentTotals.subventionNotRecoverable
    : paymentTotals.subventionRefundPaid;
  const subventionCardTotal = subventionCardIsNR
    ? Math.max(1, paymentTotals.subventionNotRecoverable)
    : Math.max(1, paymentTotals.subventionRefundExpected);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div
        className="fixed z-50 flex flex-col overflow-hidden border border-border bg-background shadow-2xl"
        style={{
          top: isMobileViewport ? "0" : "calc(50% + 18px)",
          left: isMobileViewport ? "0" : "50%",
          transform: isMobileViewport ? "none" : "translate(-50%, -50%)",
          width: isMobileViewport ? "100vw" : "min(1120px, 96vw)",
          height: isMobileViewport ? "100dvh" : "min(90vh, 840px)",
          borderRadius: isMobileViewport ? "0" : "18px",
        }}
      >
        <div className="flex-shrink-0 border-b border-border bg-card">
          <div className="bg-gradient-to-r from-[#EEF7FF]/75 via-[#FFF4EC]/75 to-[#C9D9FF]/55 px-3 py-3 md:px-5 md:py-4 dark:from-[#EEF7FF]/10 dark:via-[#FFF4EC]/10 dark:to-[#C9D9FF]/10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F3A6B7] text-sm font-bold text-slate-900 dark:bg-[#F3A6B7]/60 dark:text-slate-100">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground md:text-base">
                        {asText(customerName)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#C9D9FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-800 dark:bg-[#C9D9FF]/35 dark:text-slate-100">
                        {caseStatus}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-[#C9D9FF] bg-[#EEF7FF] px-2.5 py-1 font-mono font-semibold text-slate-700 dark:border-[#C9D9FF]/40 dark:bg-[#EEF7FF]/15 dark:text-slate-200">
                        {caseId}
                      </span>
                      {hasValue(data.registrationNumber) ? (
                        <span className="rounded-full border border-border70 px-2.5 py-1 font-medium">
                          {data.registrationNumber}
                        </span>
                      ) : null}
                      {hasValue(vehicleLabel) ? (
                        <span className="truncate rounded-full border border-border70 px-2.5 py-1 font-medium">
                          {vehicleLabel}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-border70 px-2.5 py-1 font-medium">
                        {premiumAmount
                          ? asMoney(premiumAmount)
                          : "Premium Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start lg:ml-4">
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={onClose}
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="relative mt-3 min-w-0">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any field or value"
                className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[#F3A6B7]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {visibleStages.map((stage) => {
                const IconComp = stage.icon;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => scrollToStage(stage.key)}
                    className={stagePillClass(
                      stage.tone,
                      activeStage === stage.key,
                    )}
                  >
                    <IconComp size={14} />
                    <span>{stage.displayLabel}</span>
                    <span className="hidden opacity-80 sm:inline">
                      · {stage.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          ref={contentScrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5"
        >
          <div className="space-y-4">
            {hasStage("customer") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.customer = node;
                }}
                icon={UserRound}
                title="Customer Information"
                page={renderStepLabel("customer")}
                tone={stageByKey.get("customer")?.tone || "mint"}
                active={activeStage === "customer"}
              >
                <SectionCard
                  title="Customer + Basic Setup"
                  tone="mint"
                  query={searchQuery}
                  fields={[
                    { label: "Buyer Type", value: data.buyerType },
                    { label: "Vehicle Type", value: data.vehicleType },
                    {
                      label: "Policy Type",
                      value: data.policyCategory || data.policyTypeSelector,
                    },
                    { label: "Employee (Staff)", value: data.employeeName },
                    { label: "Policy Done By", value: data.policyDoneBy },
                    { label: "Broker Name", value: data.brokerName },
                    { label: "Showroom Name", value: data.showroomName },
                    { label: "Source", value: data.source || data.sourceOrigin },
                    { label: "Source Name", value: data.sourceName },
                    { label: "Dealer / Channel", value: data.dealerChannelName },
                    {
                      label: "Dealer / Channel Address",
                      value: data.dealerChannelAddress,
                    },
                    { label: "Payout Applicable", value: data.payoutApplicable },
                    { label: "Payout %", value: data.payoutPercent },
                    { label: "Source Origin", value: data.sourceOrigin },
                    { label: "Customer Name", value: data.customerName },
                    { label: "Company Name", value: data.companyName },
                    {
                      label: "Contact Person Name",
                      value: data.contactPersonName,
                    },
                    {
                      label: "Customer Mobile",
                      value: data.mobile,
                      highlight: true,
                    },
                    { label: "Alternate Phone", value: data.alternatePhone },
                    { label: "Email", value: data.email },
                    { label: "Gender", value: data.gender },
                    { label: "PAN Number", value: data.panNumber },
                    { label: "GST Number", value: data.gstNumber },
                    { label: "Aadhaar Number", value: data.aadhaarNumber },
                    {
                      label: "Residence Address",
                      value: data.residenceAddress,
                    },
                    { label: "Pincode", value: data.pincode },
                    { label: "City", value: data.city },
                    { label: "Nominee Name", value: data.nomineeName },
                    {
                      label: "Nominee Relationship",
                      value: data.nomineeRelationship,
                    },
                    { label: "Nominee DOB", value: data.nomineeDob },
                    {
                      label: "Nominee Age",
                      value: firstFilled(data.nomineeAge, data.nominee_age),
                    },
                    { label: "Reference Name", value: data.referenceName },
                    { label: "Reference Phone", value: data.referencePhone },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {hasStage("vehicle") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.vehicle = node;
                }}
                icon={CarFront}
                title="Vehicle Details"
                page={renderStepLabel("vehicle")}
                tone={stageByKey.get("vehicle")?.tone || "sage"}
                active={activeStage === "vehicle"}
              >
                <SectionCard
                  title="Vehicle Profile + Identity"
                  tone="sage"
                  query={searchQuery}
                  fields={[
                    {
                      label: "Registration Number",
                      value: data.registrationNumber,
                      highlight: true,
                    },
                    { label: "Reg Authority", value: data.regAuthority },
                    {
                      label: "Date of Reg",
                      value: data.dateOfReg,
                      formatter: asDateInput,
                    },
                    { label: "Brand", value: data.vehicleMake },
                    { label: "Model", value: data.vehicleModel },
                    { label: "Vehicle Variant", value: data.vehicleVariant },
                    { label: "Cubic Capacity (cc)", value: data.cubicCapacity },
                    {
                      label: "Fuel Type",
                      value: firstFilled(data.fuelType, data.vehicleFuelType),
                    },
                    { label: "Types of Vehicle", value: data.typesOfVehicle },
                    { label: "Engine Number", value: data.engineNumber },
                    { label: "Chassis Number", value: data.chassisNumber },
                    {
                      label: "Manufacture Month",
                      value: data.manufactureMonth,
                    },
                    { label: "Manufacture Year", value: data.manufactureYear },
                    {
                      label: "Manufacture Date",
                      value: data.manufactureDate,
                      formatter: asDateInput,
                    },
                    { label: "Hypothecation", value: data.hypothecation },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {hasStage("previous") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.previous = node;
                }}
                icon={FileText}
                title="Previous Policy"
                page={renderStepLabel("previous")}
                tone={stageByKey.get("previous")?.tone || "cream"}
                active={activeStage === "previous"}
              >
                <SectionCard
                  title="Previous Policy Details"
                  tone="cream"
                  query={searchQuery}
                  fields={[
                    {
                      label: "Insurance Company",
                      value: data.previousInsuranceCompany,
                    },
                    {
                      label: "Policy Number",
                      value: data.previousPolicyNumber,
                    },
                    { label: "Policy Type", value: data.previousPolicyType },
                    {
                      label: "Policy Start Date",
                      value: data.previousPolicyStartDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Policy Duration",
                      value: data.previousPolicyDuration,
                    },
                    {
                      label: "NCB Discount",
                      value: data.previousNcbDiscount,
                      formatter: asPercent,
                    },
                    {
                      label: "Claim Taken Last Year",
                      value: data.claimTakenLastYear,
                    },
                    {
                      label: "OD Expiry Date",
                      value: data.previousOdExpiryDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "TP Expiry Date",
                      value: data.previousTpExpiryDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Previous Hypothecation",
                      value: data.previousHypothecation,
                    },
                    { label: "Remarks", value: data.previousRemarks },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {hasStage("quotes") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.quotes = node;
                }}
                icon={BadgeIndianRupee}
                title="Insurance Quotes"
                page={renderStepLabel("quotes")}
                tone={stageByKey.get("quotes")?.tone || "rose"}
                active={activeStage === "quotes"}
              >
                {quotes.length ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border70 bg-card px-4 py-3">
                      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Quote List
                      </p>
                      {acceptedQuote ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C9D9FF] px-3 py-1 text-[11px] font-black text-slate-800">
                          <CheckCircleFilled className="text-[10px]" />
                          {asText(acceptedQuote.insuranceCompany)} · Accepted
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {quotes
                        .filter((row) => {
                          if (!searchQuery.trim()) return true;
                          const breakup = computeQuoteBreakupFromRow(row);
                          const text = [
                            row?.insuranceCompany,
                            row?.coverageType,
                            row?.policyDuration,
                            breakup?.totalPremium,
                            breakup?.totalIdv,
                          ]
                            .map((v) => asText(v))
                            .join(" ")
                            .toLowerCase();
                          return text.includes(
                            searchQuery.trim().toLowerCase(),
                          );
                        })
                        .map((row, idx) => {
                          const rid = getQuoteRowId(row, idx);
                          const thisPremium = Number(
                            computeQuoteBreakupFromRow(row).totalPremium || 0,
                          );
                          const acceptedById =
                            hasValue(acceptedQuoteId) &&
                            String(rid) === String(acceptedQuoteId);
                          const acceptedByData =
                            !acceptedById &&
                            acceptedQuote &&
                            String(row?.insuranceCompany || "") ===
                              String(acceptedQuote?.insuranceCompany || "") &&
                            thisPremium ===
                              Number(
                                computeQuoteBreakupFromRow(acceptedQuote)
                                  .totalPremium || 0,
                              );

                          return (
                            <QuotePreviewCard
                              key={String(rid)}
                              row={row}
                              idx={idx}
                              isAccepted={acceptedById || acceptedByData}
                              isCheapest={
                                lowestPremium !== null &&
                                thisPremium === lowestPremium
                              }
                            />
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <InlineEmptyState text="No quotes available." />
                )}
              </ContinuousPageSection>
            )}

            {hasStage("policy") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.policy = node;
                }}
                icon={Shield}
                title="New Policy Details"
                page={renderStepLabel("policy")}
                tone={stageByKey.get("policy")?.tone || "mint"}
                active={activeStage === "policy"}
              >
                <SectionCard
                  title="Vehicle Pricing"
                  tone="mint"
                  query={searchQuery}
                  fields={[
                    {
                      label: "Ex-Showroom Price",
                      value: data.exShowroomPrice,
                      formatter: asMoney,
                    },
                    {
                      label: "Date of Sale",
                      value: data.dateOfSale,
                      formatter: asDateInput,
                    },
                    {
                      label: "Date of Purchase",
                      value: data.dateOfPurchase,
                      formatter: asDateInput,
                    },
                    {
                      label: "Current Odometer Reading",
                      value: data.odometerReading,
                    },
                  ]}
                />

                <SectionCard
                  title="Policy Details"
                  tone="cream"
                  query={searchQuery}
                  fields={[
                    {
                      label: "Insurance Company",
                      value: data.newInsuranceCompany,
                    },
                    { label: "Policy Type", value: data.newPolicyType },
                    { label: "Policy Number", value: data.newPolicyNumber },
                    {
                      label: "Issue Date",
                      value: data.newIssueDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Start Date",
                      value: data.newPolicyStartDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Insurance Duration",
                      value: data.newInsuranceDuration,
                    },
                    {
                      label: "OD Expiry Date",
                      value: data.newOdExpiryDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "TP Expiry Date",
                      value: data.newTpExpiryDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "NCB Discount",
                      value: data.newNcbDiscount,
                      formatter: asPercent,
                    },
                    {
                      label: "IDV Amount",
                      value: firstFilled(
                        data.newIdvAmount,
                        acceptedQuote?.totalIdv,
                        computeQuoteBreakupFromRow(acceptedQuote).totalIdv,
                      ),
                      formatter: asMoney,
                    },
                    {
                      label: "Total Premium",
                      value: data.newTotalPremium,
                      formatter: asMoney,
                      highlight: true,
                    },
                    { label: "Hypothecation", value: data.newHypothecation },
                    { label: "Remarks", value: data.newRemarks },
                  ]}
                />

                <SectionCard
                  title="Extended Warranty"
                  tone="sage"
                  query={searchQuery}
                  fields={[
                    {
                      label: "EW Commencement Date",
                      value: data.ewCommencementDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "EW Expiry Date",
                      value: data.ewExpiryDate,
                      formatter: asDateInput,
                    },
                    { label: "Kms Coverage", value: data.kmsCoverage },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {hasStage("documents") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.documents = node;
                }}
                icon={FileText}
                title="Gallery"
                page={renderStepLabel("documents")}
                tone={stageByKey.get("documents")?.tone || "sage"}
                active={activeStage === "documents"}
              >
                {galleryItems.length ? (
                  <div className="overflow-hidden rounded-2xl border border-border70 bg-card">
                    <div className="border-b border-border60 bg-[#C9D9FF]/60 px-4 py-3 dark:bg-[#C9D9FF]/10">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Gallery
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {galleryItems
                        .filter((item) => {
                          if (!searchQuery.trim()) return true;
                          return `${item.name} ${item.tag}`
                            .toLowerCase()
                            .includes(searchQuery.trim().toLowerCase());
                        })
                        .map((item) => (
                          <div
                            key={item.key}
                            className="overflow-hidden rounded-xl border border-border70 bg-background"
                          >
                            <div className="flex h-40 items-center justify-center bg-[#FFF4EC]/50 p-2 dark:bg-[#FFF4EC]/8">
                              {item.kind === "image" ? (
                                <img
                                  src={item.url}
                                  alt={item.name}
                                  className="h-full w-full rounded-lg object-contain"
                                />
                              ) : (
                                <video
                                  src={item.url}
                                  controls
                                  className="h-full w-full rounded-lg object-contain"
                                />
                              )}
                            </div>
                            <div className="border-t border-border60 px-3 py-2">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {item.name}
                              </p>
                              {item.tag && item.tag !== "—" ? (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {item.tag}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <InlineEmptyState text="No gallery media available." />
                )}
              </ContinuousPageSection>
            )}

            {hasStage("payment") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.payment = node;
                }}
                icon={CreditCard}
                title="Payment"
                page={renderStepLabel("payment")}
                tone={stageByKey.get("payment")?.tone || "cream"}
                active={activeStage === "payment"}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <PaymentMetricCard
                    title="Total Premium"
                    value={asMoney(premiumAmount)}
                    sub="Payable to insurance company"
                    icon={<WalletOutlined />}
                    accent="#6b7ee6"
                    accentBg="#eef1ff"
                    progress={premiumAmount}
                    progressTotal={premiumAmount || 1}
                  />

                  <PaymentMetricCard
                    title="Insurer Outstanding"
                    value={asMoney(
                      Math.max(0, paymentTotals.insurerOutstanding),
                    )}
                    sub={`${asMoney(paymentTotals.insurerPaidTotal)} paid of ${asMoney(premiumAmount)}`}
                    icon={<BankOutlined />}
                    accent={
                      paymentTotals.insurerOutstanding <= 0
                        ? "#7a978e"
                        : "#c48d96"
                    }
                    accentBg={
                      paymentTotals.insurerOutstanding <= 0
                        ? "#eef3ef"
                        : "#fbf1f3"
                    }
                    progress={paymentTotals.insurerPaidTotal}
                    progressTotal={premiumAmount || 1}
                  />

                  <PaymentMetricCard
                    title="Customer Outstanding"
                    value={asMoney(
                      Math.max(0, paymentTotals.customerOutstandingToAc),
                    )}
                    sub={`${asMoney(paymentTotals.customerRecovered)} recovered`}
                    icon={<UserOutlined />}
                    accent={
                      paymentTotals.customerOutstandingToAc <= 0
                        ? "#78a087"
                        : "#b39672"
                    }
                    accentBg={
                      paymentTotals.customerOutstandingToAc <= 0
                        ? "#f2f7f3"
                        : "#faf8f1"
                    }
                    progress={paymentTotals.customerRecovered}
                    progressTotal={Math.max(
                      1,
                      paymentTotals.customerNetReceivableWhenAcPays,
                    )}
                  />

                  <PaymentMetricCard
                    title={
                      subventionCardIsNR
                        ? "Subvention (NR)"
                        : "Subvention (Refund)"
                    }
                    value={asMoney(subventionCardValue)}
                    sub={
                      subventionCardIsNR
                        ? `${asMoney(subventionCardValue)} adjusted as non-recoverable`
                        : `${asMoney(subventionCardValue)} refunded to customer`
                    }
                    icon={<SwapOutlined />}
                    accent={subventionCardIsNR ? "#b39672" : "#c48d96"}
                    accentBg={subventionCardIsNR ? "#faf8f1" : "#fbf1f3"}
                    progress={subventionCardValue}
                    progressTotal={subventionCardTotal}
                  />
                </div>

                {paymentHistory.length ? (
                  <div className="overflow-hidden rounded-2xl border border-border70 bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border60 bg-[#FFF4EC]/70 px-4 py-3 dark:bg-[#FFF4EC]/10">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Payment Ledger
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#C9D9FF] bg-[#EEF7FF] px-2.5 py-1 text-[10px] font-bold text-slate-700">
                          <CheckCircleOutlined />
                          Insurer paid {asMoney(paymentTotals.insurerPaidTotal)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#FFF4EC] bg-[#FFF4EC] px-2.5 py-1 text-[10px] font-bold text-slate-700">
                          <FieldTimeOutlined />
                          Recovered {asMoney(paymentTotals.customerRecovered)}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table
                        columns={paymentColumns}
                        dataSource={paymentHistory
                          .filter((row) => {
                            if (!searchQuery.trim()) return true;
                            const hay = [
                              renderEntryLabel(row),
                              row.paidBy,
                              row.paymentMode,
                              row.transactionRef,
                              row.remarks,
                              row.amount,
                              row.date,
                            ]
                              .map((v) => asText(v))
                              .join(" ")
                              .toLowerCase();
                            return hay.includes(
                              searchQuery.trim().toLowerCase(),
                            );
                          })
                          .map((row, idx) => ({
                            ...row,
                            key: `${row._id}-${idx}`,
                          }))}
                        pagination={false}
                        size="small"
                        scroll={{ x: 980 }}
                      />
                    </div>
                  </div>
                ) : (
                  <InlineEmptyState text="No payment ledger entries available." />
                )}
              </ContinuousPageSection>
            )}

            {!visibleStages.length ? (
              <div className="rounded-2xl border border-border70 bg-card px-6 py-10 text-center">
                <Empty description="No preview stages available for this case." />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-card px-3 py-2.5 md:px-5">
          <span className="text-[11px] text-muted-foreground">
            {data?.updatedAt
              ? `Updated ${asDateTime(data.updatedAt)}`
              : caseId
                ? `Case ID: ${caseId}`
                : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>Close</Button>
            <Button
              type="primary"
              icon={<Download size={14} />}
              className="!border-[#F3A6B7] !bg-[#F3A6B7] !text-slate-900 hover:!opacity-90"
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default InsurancePreview;
