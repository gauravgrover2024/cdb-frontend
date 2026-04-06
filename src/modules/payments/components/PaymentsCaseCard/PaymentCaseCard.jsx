import React, { useEffect, useState } from "react";
import { Popover } from "antd";
import dayjs from "dayjs";
import {
  EyeOutlined,
  LinkOutlined,
  DollarOutlined,
  PlusOutlined,
  EditOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  LeftOutlined,
} from "@ant-design/icons";

const asInt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (value) => `₹ ${asInt(value).toLocaleString("en-IN")}`;

const fmtDate = (value, fallback = "—") => {
  if (!value) return fallback;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return fallback;
  return parsed.format("DD MMM YYYY, HH:mm");
};

const isManualShowroomRow = (row = {}) =>
  !row?._auto &&
  Boolean(
    asInt(row?.paymentAmount) > 0 ||
    String(row?.paymentType || "").trim() ||
    String(row?.paymentMadeBy || "").trim() ||
    String(row?.paymentMode || "").trim(),
  );

const isManualAcRow = (row = {}) =>
  !row?._auto &&
  Boolean(
    asInt(row?.receiptAmount) > 0 ||
    (Array.isArray(row?.receiptTypes) && row.receiptTypes.length > 0) ||
    String(row?.receiptMode || "").trim(),
  );

const STATUS_THEME = {
  SETTLED: {
    text: "Fully Settled",
    edgeLight: "#22c55e",
    edgeDark: "#4ade80",
  },
  PARTIAL: {
    text: "Partial",
    edgeLight: "#2563eb",
    edgeDark: "#60a5fa",
  },
  IN_PROGRESS: {
    text: "In Progress",
    edgeLight: "#f59e0b",
    edgeDark: "#fbbf24",
  },
  DRAFT: {
    text: "Draft",
    edgeLight: "#64748b",
    edgeDark: "#94a3b8",
  },
};

const interactiveArrow = (
  <ArrowUpOutlined style={{ transform: "rotate(15deg)", fontSize: 10 }} />
);

const Pill = ({ label, dark = false, tone = "slate" }) => {
  const palette = {
    slate: dark
      ? { bg: "#1e293b", fg: "#cbd5e1", border: "#334155" }
      : { bg: "#f1f5f9", fg: "#334155", border: "#dbe3ef" },
    blue: dark
      ? { bg: "#13243f", fg: "#93c5fd", border: "#1d4ed8" }
      : { bg: "#dbeafe", fg: "#1d4ed8", border: "#93c5fd" },
    green: dark
      ? { bg: "#11261b", fg: "#86efac", border: "#166534" }
      : { bg: "#dcfce7", fg: "#166534", border: "#86efac" },
    amber: dark
      ? { bg: "#33220f", fg: "#fcd34d", border: "#92400e" }
      : { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d" },
    violet: dark
      ? { bg: "#2d1f4f", fg: "#d8b4fe", border: "#7c3aed" }
      : { bg: "#ede9fe", fg: "#6d28d9", border: "#c4b5fd" },
  };

  const colors = palette[tone] || palette.slate;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${colors.border}`,
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 9.5,
        fontWeight: 700,
        lineHeight: 1.1,
        background: colors.bg,
        color: colors.fg,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
};

const PopupFrame = ({
  title,
  dark = false,
  children,
  subtitle = "",
  onClose = null,
  onBack = null,
  width = 320,
}) => (
  <div
    style={{
      width,
      maxWidth: `min(80vw, ${width}px)`,
      borderRadius: 12,
      border: `1px solid ${dark ? "#2a3340" : "#d8e2ef"}`,
      overflow: "hidden",
      background: dark ? "#111923" : "#f8fbff",
      boxShadow: dark
        ? "0 14px 30px rgba(0,0,0,0.34)"
        : "0 12px 24px rgba(15,23,42,0.11)",
    }}
  >
    <div
      style={{
        padding: "11px 12px 9px",
        borderBottom: `1px solid ${dark ? "#293140" : "#dde7f2"}`,
        background: dark ? "#16202d" : "#f4f8fd",
      }}
    >
      <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              border: "none",
              background: "transparent",
              color: dark ? "#c9d9ef" : "#4b5b74",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              marginTop: 1,
            }}
            aria-label="Go back"
          >
            <LeftOutlined style={{ fontSize: 10 }} />
          </button>
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.17em",
              fontWeight: 800,
              color: dark ? "#c8d5e8" : "#647286",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 4,
                fontSize: 10.6,
                color: dark ? "#96a4b9" : "#7f8ca0",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: dark ? "#b5c2d6" : "#5f6e84",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              marginTop: 1,
            }}
            aria-label="Close"
          >
            <CloseOutlined style={{ fontSize: 10 }} />
          </button>
        ) : null}
      </div>
    </div>
    <div
      style={{
        padding: "8px 12px 10px",
        display: "grid",
        gap: 0,
        background: dark ? "#111923" : "#f8fbff",
      }}
    >
      {children}
    </div>
  </div>
);

const PopupRow = ({
  label,
  value,
  dark = false,
  tone = "normal",
  valueAction = null,
  compact = false,
}) => {
  const color =
    tone === "accent"
      ? dark
        ? "#93c5fd"
        : "#1d4ed8"
      : tone === "danger"
        ? dark
          ? "#fca5a5"
          : "#dc2626"
        : tone === "positive"
          ? dark
            ? "#86efac"
            : "#166534"
          : dark
            ? "#d1d5db"
            : "#334155";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 10,
        alignItems: "center",
        fontSize: compact ? 10.4 : 11.4,
        padding: compact ? "7px 0" : "8px 0",
        borderBottom: `1px solid ${dark ? "#253041" : "#dde6f0"}`,
      }}
    >
      <span
        style={{
          color: dark ? "#c0cbdd" : "#4f5f76",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <span
        onClick={valueAction || undefined}
        onKeyDown={
          valueAction
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") valueAction();
              }
            : undefined
        }
        role={valueAction ? "button" : undefined}
        tabIndex={valueAction ? 0 : undefined}
        style={{
          color,
          fontWeight: 700,
          whiteSpace: "nowrap",
          textAlign: "right",
          cursor: valueAction ? "pointer" : "default",
          display: "inline-flex",
          alignItems: "center",
          gap: valueAction ? 5 : 0,
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        {value}
        {valueAction ? interactiveArrow : null}
      </span>
    </div>
  );
};

const PopupSection = ({ title, dark = false, tone = "blue", children }) => {
  const toneMap = {
    blue: dark
      ? { fg: "#9fb0c8", bg: "transparent", edge: "#2a3340" }
      : { fg: "#62748d", bg: "transparent", edge: "#dce5f0" },
    amber: dark
      ? { fg: "#d9bf8f", bg: "transparent", edge: "#3a3328" }
      : { fg: "#8a6940", bg: "transparent", edge: "#e8dcc9" },
    violet: dark
      ? { fg: "#bfb6da", bg: "transparent", edge: "#333046" }
      : { fg: "#746795", bg: "transparent", edge: "#e1dcef" },
  };
  const colors = toneMap[tone] || toneMap.blue;

  return (
    <div
      style={{
        marginTop: 2,
        marginBottom: 1,
        borderRadius: 0,
        border: "none",
        background: "transparent",
        padding: 0,
        display: "grid",
        gap: 1,
      }}
    >
      <div
        style={{
          fontSize: 9.4,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          fontWeight: 800,
          color: colors.fg,
          paddingTop: 4,
          paddingBottom: 3,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
};

const PopupLedgerEntry = ({ date, label, amount, dark = false, index = 0 }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) auto",
      gap: 10,
      alignItems: "center",
      borderBottom: `1px solid ${dark ? "#253041" : "#dde6f0"}`,
      padding: "8px 0",
    }}
  >
    <span
      style={{
        fontSize: 11,
        color: dark ? "#becbde" : "#495973",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {`${index + 1}. ${label} · ${date}`}
    </span>
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: dark ? "#74d79c" : "#198754",
        whiteSpace: "nowrap",
      }}
    >
      {money(amount)}
    </span>
  </div>
);

const VerticalInfoRow = ({ label, value, dark = false }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "84px 1fr",
      gap: 8,
      alignItems: "baseline",
      borderBottom: "none",
      paddingBottom: 0,
    }}
  >
    <span
      style={{
        fontSize: 9.2,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: dark ? "#94a3b8" : "#64748b",
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 10.8,
        fontWeight: 700,
        color: dark ? "#e2e8f0" : "#0f172a",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {value}
    </span>
  </div>
);

const MetricBox = ({
  label,
  value,
  dark = false,
  tone = "blue",
  popupContent = null,
  popupTitle = "",
  popupSubtitle = "",
  helpText = "",
  popupOpen = false,
  onPopupOpenChange = null,
  popupWidth = 320,
  popupPlacement = "bottomLeft",
  onPopupClose = null,
  popupBackAction = null,
}) => {
  const valueColors = {
    blue: dark ? "#93c5fd" : "#1d4ed8",
    green: dark ? "#86efac" : "#166534",
    amber: dark ? "#fbbf24" : "#c2410c",
    red: dark ? "#fca5a5" : "#dc2626",
    slate: dark ? "#e2e8f0" : "#0f172a",
  };
  const valueColor = valueColors[tone] || valueColors.slate;

  const card = (
    <button
      type="button"
      style={{
        borderRadius: 0,
        border: "none",
        background: "transparent",
        padding: "0",
        textAlign: "left",
        width: "100%",
        cursor: popupContent ? "pointer" : "default",
        boxShadow: "none",
        transition: "color 180ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 8.8,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
              color: dark ? "#9fb0c4" : "#5f718a",
              marginBottom: 2,
            }}
          >
            {label}
          </div>
          {helpText ? (
            <div
              style={{
                fontSize: 8.8,
                color: dark ? "#94a3b8" : "#64748b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {helpText}
            </div>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1,
            fontWeight: 800,
            color: valueColor,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: popupContent ? 5 : 0,
          }}
        >
          {value}
          {popupContent ? interactiveArrow : null}
        </div>
      </div>
    </button>
  );

  if (!popupContent) return card;

  return (
    <Popover
      trigger="click"
      placement={popupPlacement}
      open={popupOpen}
      onOpenChange={onPopupOpenChange || undefined}
      destroyTooltipOnHide
      overlayStyle={{ padding: 0 }}
      overlayInnerStyle={{
        padding: 0,
        background: "transparent",
        boxShadow: "none",
      }}
      content={
        <PopupFrame
          title={popupTitle || label}
          subtitle={popupSubtitle}
          dark={dark}
          onClose={onPopupClose}
          onBack={popupBackAction}
          width={popupWidth}
        >
          {popupContent}
        </PopupFrame>
      }
    >
      {card}
    </Popover>
  );
};

const ProgressRail = ({
  label = "Settlement Progress",
  numerator = 0,
  denominator = 0,
  dark = false,
}) => {
  const denominatorInt = asInt(denominator);
  const numeratorInt = asInt(numerator);
  const rawPercent =
    denominatorInt > 0 ? (numeratorInt / denominatorInt) * 100 : 100;
  const cappedPercent = Math.max(0, Math.min(100, rawPercent));
  const isOver = rawPercent > 100;
  const isDone = !isOver && rawPercent >= 100;

  const fillColor = isOver
    ? dark
      ? "#f87171"
      : "#dc2626"
    : isDone
      ? dark
        ? "#4ade80"
        : "#16a34a"
      : dark
        ? "#60a5fa"
        : "#2563eb";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          width: "100%",
          height: 7,
          borderRadius: 999,
          background: dark ? "#1f2937" : "#e2e8f0",
          overflow: "hidden",
          border: `1px solid ${dark ? "#273244" : "#dbe3ef"}`,
        }}
      >
        <div
          style={{
            width: `${cappedPercent}%`,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${fillColor} 0%, ${fillColor}${dark ? "AA" : "CC"} 100%)`,
            transition: "width 220ms ease-out",
            boxShadow: `0 0 10px ${fillColor}`,
          }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 12,
          fontSize: 10,
          color: dark ? "#94a3b8" : "#64748b",
          alignItems: "center",
        }}
      >
        <span style={{ lineHeight: 1.2 }}>{label}</span>
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
        >
          {money(numeratorInt)} / {money(denominatorInt)} ·{" "}
          <span style={{ color: fillColor, fontWeight: 700 }}>
            {Number.isFinite(rawPercent) ? rawPercent.toFixed(1) : "0.0"}%
          </span>
        </span>
      </div>
    </div>
  );
};

const ActionButton = ({
  label,
  icon,
  onClick,
  dark = false,
  emphasis = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      borderRadius: 8,
      border: `1px solid ${
        emphasis ? (dark ? "#1d4ed8" : "#93c5fd") : dark ? "#334155" : "#dbe3ef"
      }`,
      background: emphasis
        ? dark
          ? "linear-gradient(135deg, #112a4b 0%, #11213c 100%)"
          : "linear-gradient(135deg, #eff6ff 0%, #e6f0ff 100%)"
        : dark
          ? "linear-gradient(135deg, #131b2a 0%, #101826 100%)"
          : "linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)",
      color: emphasis
        ? dark
          ? "#93c5fd"
          : "#1d4ed8"
        : dark
          ? "#d1d5db"
          : "#334155",
      fontSize: 9.5,
      fontWeight: 600,
      lineHeight: 1,
      padding: "5px 7px",
      display: "inline-flex",
      gap: 5,
      alignItems: "center",
      cursor: "pointer",
      whiteSpace: "nowrap",
      boxShadow: "none",
    }}
  >
    <span style={{ fontSize: 10 }}>{icon}</span>
    <span>{label}</span>
  </button>
);

const buildOnRoadBreakup = (doRec = {}) => {
  const additions = [
    { label: "Ex-showroom", value: asInt(doRec?.do_exShowroomPrice) },
    { label: "TCS", value: asInt(doRec?.do_tcs) },
    { label: "Road Tax", value: asInt(doRec?.do_roadTax) },
    { label: "Insurance", value: asInt(doRec?.do_insuranceCost) },
    { label: "Accessories", value: asInt(doRec?.do_accessoriesAmount) },
    { label: "EPC", value: asInt(doRec?.do_epc) },
    { label: "Fastag", value: asInt(doRec?.do_fastag) },
    { label: "Extended Warranty", value: asInt(doRec?.do_extendedWarranty) },
  ].filter((row) => row.value > 0);

  const discounts = [
    { label: "Dealer Discount", value: asInt(doRec?.do_dealerDiscount) },
    { label: "Scheme Discount", value: asInt(doRec?.do_schemeDiscount) },
    { label: "Insurance Cashback", value: asInt(doRec?.do_insuranceCashback) },
    { label: "Exchange Bonus", value: asInt(doRec?.do_exchange) },
    {
      label: "Exchange Vehicle Price",
      value: asInt(doRec?.do_exchangeVehiclePrice),
    },
    { label: "Loyalty", value: asInt(doRec?.do_loyalty) },
    { label: "Corporate", value: asInt(doRec?.do_corporate) },
    { label: "Other Discounts", value: asInt(doRec?.do_discounts_othersTotal) },
  ].filter((row) => row.value > 0);

  const additionsTotal = additions.reduce(
    (sum, row) => sum + asInt(row?.value || 0),
    0,
  );
  const discountTotal = discounts.reduce(
    (sum, row) => sum + asInt(row?.value || 0),
    0,
  );
  const net = asInt(
    doRec?.do_netOnRoadVehicleCost ||
      doRec?.do_customer_netOnRoadVehicleCost ||
      Math.max(0, additionsTotal - discountTotal),
  );

  return { additions, discounts, additionsTotal, discountTotal, net };
};

const PaymentsCaseCard = ({
  row,
  isDarkMode: dark,
  onOpenSummary,
  navigate,
  onQuickAdd,
}) => {
  const [openPopup, setOpenPopup] = useState(null);
  const [netPayableView, setNetPayableView] = useState("net");
  const [netReceivableView, setNetReceivableView] = useState("net");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1400 : window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!row) return null;

  const ss = row.snapshot?.showroomSummary || {};
  const ac = row.snapshot?.autocreditsSummary || {};
  const mb = row.snapshot?.marginBreakup || {};
  const payment = row.payment || {};
  const doRec = row.doRec || {};
  const theme = STATUS_THEME[row.overallStatus] || STATUS_THEME.DRAFT;

  const showroomRows = Array.isArray(payment?.showroomRows)
    ? payment.showroomRows
    : [];
  const acRows = Array.isArray(payment?.autocreditsRows)
    ? payment.autocreditsRows
    : [];
  const manualShowroomRows = showroomRows.filter(isManualShowroomRow);
  const manualAcRows = acRows.filter(isManualAcRow);
  const hasManualActivity =
    manualShowroomRows.length > 0 || manualAcRows.length > 0;

  const needsShowroomVerify =
    hasManualActivity && ss?.canVerify && !payment?.isVerified;
  const needsAcVerify =
    hasManualActivity && ac?.canVerify && !payment?.isAutocreditsVerified;

  const updatedAt =
    payment?.updatedAt || row?.doRec?.updatedAt || row?.doRec?.do_date;
  const showroomTone =
    asInt(ss.closingBalance) === 0
      ? "green"
      : asInt(ss.closingBalance) > 0
        ? "amber"
        : "red";
  const acTone =
    asInt(ac.closingBalance) === 0
      ? "green"
      : asInt(ac.closingBalance) > 0
        ? "amber"
        : "red";

  const showroomPaymentsTotal = asInt(ss.totalPaidToShowroom);

  const showroomEvents = showroomRows
    .filter((entry) => asInt(entry?.paymentAmount) > 0)
    .map((entry, idx) => ({
      key: `showroom-${idx}-${entry?.id || ""}`,
      ts:
        new Date(
          entry?.paymentDate || entry?.updatedAt || entry?.createdAt || 0,
        ).getTime() || 0,
      date: dayjs(
        entry?.paymentDate || entry?.updatedAt || entry?.createdAt,
      ).isValid()
        ? dayjs(
            entry?.paymentDate || entry?.updatedAt || entry?.createdAt,
          ).format("DD-MM-YY")
        : "—",
      label:
        `${entry?.paymentType || "Payment"} · ` +
        `${entry?.paymentMadeBy || "NA"} · ` +
        `${entry?.paymentMode || "NA"}`,
      amount: asInt(entry?.paymentAmount),
    }))
    .sort((a, b) => a.ts - b.ts);

  const acEvents = acRows
    .filter((entry) => asInt(entry?.receiptAmount) > 0)
    .map((entry, idx) => ({
      key: `ac-${idx}-${entry?.id || ""}`,
      ts:
        new Date(
          entry?.receiptDate || entry?.updatedAt || entry?.createdAt || 0,
        ).getTime() || 0,
      date: dayjs(
        entry?.receiptDate || entry?.updatedAt || entry?.createdAt,
      ).isValid()
        ? dayjs(
            entry?.receiptDate || entry?.updatedAt || entry?.createdAt,
          ).format("DD-MM-YY")
        : "—",
      label:
        `${Array.isArray(entry?.receiptTypes) ? entry.receiptTypes.join(", ") : "Receipt"} · ` +
        `${entry?.receiptMode || "NA"}`,
      amount: asInt(entry?.receiptAmount),
    }))
    .sort((a, b) => a.ts - b.ts);

  const onRoadBreakup = buildOnRoadBreakup(doRec);
  const isTablet = viewportWidth < 1240;
  const isMobile = viewportWidth < 760;
  const metricPopupWidth = isMobile ? 310 : 470;
  const compactMetricPopupWidth = isMobile ? 294 : 388;
  const metricPopupPlacement = isMobile ? "bottom" : "bottomLeft";
  const openPopupPanel = (popupKey) => {
    setOpenPopup(popupKey);
    if (popupKey === "netPayable") setNetPayableView("net");
    if (popupKey === "netReceivable") setNetReceivableView("net");
  };
  const closeAllPopups = () => {
    setOpenPopup(null);
    setNetPayableView("net");
    setNetReceivableView("net");
  };

  const marginBreakupContent = (
    <PopupSection title="Margin Components" tone="violet" dark={dark}>
      <PopupRow
        label="Showroom net on-road"
        value={money(mb.showroomNetOnRoadVehicleCost)}
        dark={dark}
      />
      <PopupRow
        label="Customer net on-road"
        value={money(mb.customerNetOnRoadVehicleCost)}
        dark={dark}
      />
      <PopupRow
        label="On-road delta contribution"
        value={money(mb.marginPartFromOnRoadDelta)}
        dark={dark}
      />
      <PopupRow
        label="Insurance spread contribution"
        value={money(mb.marginPartFromInsuranceSpread)}
        dark={dark}
      />
      <PopupRow
        label="Autocredits margin"
        value={money(mb.autocreditsMargin)}
        tone="positive"
        dark={dark}
      />
    </PopupSection>
  );

  const onRoadContent = (
    <>
      <PopupSection title="Additions" tone="blue" dark={dark}>
        {onRoadBreakup.additions.map((item) => (
          <PopupRow
            key={`add-${item.label}`}
            label={item.label}
            value={money(item.value)}
            dark={dark}
          />
        ))}
        <PopupRow
          label="Total Additions"
          value={money(onRoadBreakup.additionsTotal)}
          tone="positive"
          dark={dark}
        />
      </PopupSection>
      <PopupSection title="Discounts" tone="amber" dark={dark}>
        {onRoadBreakup.discounts.map((item) => (
          <PopupRow
            key={`disc-${item.label}`}
            label={item.label}
            value={money(item.value)}
            dark={dark}
          />
        ))}
        <PopupRow
          label="Total Discounts"
          value={money(onRoadBreakup.discountTotal)}
          tone="danger"
          dark={dark}
        />
      </PopupSection>
      <PopupRow
        label="Net On-road (DO)"
        value={money(onRoadBreakup.net)}
        tone="accent"
        dark={dark}
      />
    </>
  );

  const netPayableFormulaContent = (
    <>
      <PopupRow
        label="On-road vehicle cost"
        value={money(ss.netOnRoad)}
        tone="accent"
        dark={dark}
        valueAction={() => setNetPayableView("onRoad")}
      />
      <PopupRow
        label="Less: Insurance adjustment"
        value={money(ss.insAdjApplied)}
        dark={dark}
      />
      <PopupRow
        label="Less: Exchange adjustment"
        value={money(ss.exAdjApplied)}
        dark={dark}
      />
      <PopupRow
        label="Cross adjustment net"
        value={money(ss.crossAdjNet)}
        dark={dark}
      />
      <PopupRow
        label="Net Payable to Showroom"
        value={money(ss.netPayableToShowroom)}
        tone="positive"
        dark={dark}
      />
    </>
  );

  const netPayableContent =
    netPayableView === "onRoad" ? onRoadContent : netPayableFormulaContent;

  const paymentsContent = (
    <>
      {showroomEvents.length ? (
        showroomEvents.map((event, idx) => (
          <PopupLedgerEntry
            key={event.key}
            date={event.date}
            label={event.label}
            amount={event.amount}
            index={idx}
            dark={dark}
          />
        ))
      ) : (
        <div style={{ fontSize: 10.5, color: dark ? "#9ca3af" : "#64748b" }}>
          No payment entries yet.
        </div>
      )}
      <PopupRow
        label="Total Payments"
        value={money(showroomPaymentsTotal)}
        tone="positive"
        dark={dark}
      />
    </>
  );

  const netReceivableFormulaContent = (
    <>
      <PopupRow
        label="Autocredits margin"
        value={money(ac.autocreditsMargin)}
        tone="accent"
        dark={dark}
        valueAction={() => setNetReceivableView("margin")}
      />
      <PopupRow
        label="Paid by AC to showroom"
        value={money(ac.showroomAutoPaid)}
        dark={dark}
      />
      <PopupRow
        label="Insurance receivable"
        value={money(ac.insuranceReceivable)}
        dark={dark}
      />
      <PopupRow
        label="Less: Exchange adjustment"
        value={money(ac.exchangeAdjustment)}
        dark={dark}
      />
      <PopupRow
        label="Less: Insurance adjustment"
        value={money(ac.insuranceAdjustment)}
        dark={dark}
      />
      <PopupRow
        label="Less: Receivable from showroom"
        value={money(ac.receivableFromShowroom)}
        dark={dark}
      />
      <PopupRow
        label="Net Receivable"
        value={money(ac.netReceivable)}
        tone="positive"
        dark={dark}
      />
    </>
  );

  const netReceivableContent =
    netReceivableView === "margin"
      ? marginBreakupContent
      : netReceivableFormulaContent;

  const receiptsContent = (
    <>
      {acEvents.length ? (
        acEvents.map((event, idx) => (
          <PopupLedgerEntry
            key={event.key}
            date={event.date}
            label={event.label}
            amount={event.amount}
            index={idx}
            dark={dark}
          />
        ))
      ) : (
        <div style={{ fontSize: 10.5, color: dark ? "#9ca3af" : "#64748b" }}>
          No receipt entries yet.
        </div>
      )}
      <PopupRow
        label="Total Receipts"
        value={money(ac.receiptTotal)}
        tone="positive"
        dark={dark}
      />
    </>
  );

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        border: `1px solid ${dark ? "#222936" : "#dbe3ef"}`,
        borderLeft: `4px solid ${dark ? theme.edgeDark : theme.edgeLight}`,
        background: dark
          ? "linear-gradient(180deg, #0f141d 0%, #0b1019 100%)"
          : "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
        boxShadow: dark
          ? "0 16px 28px rgba(0,0,0,0.28)"
          : "0 16px 28px rgba(15,23,42,0.09)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px 8px",
          borderBottom: `1px solid ${dark ? "#212d3f" : "#dfe8f3"}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        {hasManualActivity ? (
          <Pill label="Payment Created" dark={dark} tone="green" />
        ) : (
          <Pill label="No Manual Entries" dark={dark} tone="amber" />
        )}
        <Pill
          label={row.isFinanced ? "Financed" : "Cash"}
          dark={dark}
          tone="blue"
        />
        <Pill label={theme.text} dark={dark} tone="violet" />
        <Pill label={row.doRef || "DO not mapped"} dark={dark} tone="slate" />
        {needsShowroomVerify ? (
          <Pill label="Showroom Verify Pending" dark={dark} tone="amber" />
        ) : null}
        {needsAcVerify ? (
          <Pill label="AC Verify Pending" dark={dark} tone="amber" />
        ) : null}
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontSize: 10,
            color: dark ? "#94a3b8" : "#64748b",
            whiteSpace: "nowrap",
          }}
        >
          Updated {fmtDate(updatedAt)}
        </div>
      </div>

      <div
        style={{
          padding: "9px 10px",
          display: "grid",
          gridTemplateColumns: isTablet
            ? "1fr"
            : "minmax(430px, 2.2fr) minmax(620px, 1.8fr)",
          gap: 8,
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            minWidth: 0,
            padding: "2px 2px 0",
          }}
        >
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: dark ? "#94a3b8" : "#64748b",
              fontWeight: 700,
            }}
          >
            Customer
          </div>
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 800,
              lineHeight: 1.1,
              color: dark ? "#f8fafc" : "#0f172a",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {row.customerName || "—"}
          </div>
          <div
            style={{
              display: "grid",
              gap: 5,
            }}
          >
            <VerticalInfoRow
              label="Mobile"
              value={row.primaryMobile || "—"}
              dark={dark}
            />
            <VerticalInfoRow
              label="Loan ID"
              value={row.loanId || "—"}
              dark={dark}
            />
            <VerticalInfoRow
              label="Showroom"
              value={row.dealerName || "—"}
              dark={dark}
            />
            <VerticalInfoRow
              label="Vehicle"
              value={row.vehicle || "—"}
              dark={dark}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "2px 2px 0",
              display: "grid",
              gap: 7,
              paddingRight: isTablet ? 2 : 12,
              marginRight: isTablet ? 0 : 2,
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 800,
                color: dark ? "#7dd3fc" : "#0369a1",
              }}
            >
              Showroom Ledger
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 6,
              }}
            >
              <MetricBox
                label="Net Payable"
                value={money(ss.netPayableToShowroom)}
                dark={dark}
                tone="blue"
                popupTitle={
                  netPayableView === "onRoad"
                    ? "On-road Cost Breakup"
                    : "Net Payable Calculation"
                }
                popupSubtitle={
                  netPayableView === "onRoad"
                    ? "Additions, discounts and net on-road"
                    : "Showroom account formula"
                }
                popupContent={netPayableContent}
                popupOpen={openPopup === "netPayable"}
                onPopupOpenChange={(nextOpen) => {
                  if (nextOpen) openPopupPanel("netPayable");
                  else closeAllPopups();
                }}
                onPopupClose={closeAllPopups}
                popupBackAction={
                  netPayableView === "onRoad"
                    ? () => setNetPayableView("net")
                    : null
                }
                popupPlacement={metricPopupPlacement}
                popupWidth={compactMetricPopupWidth}
              />
              <MetricBox
                label="Payments"
                value={money(showroomPaymentsTotal)}
                dark={dark}
                tone="green"
                popupTitle="Payments Breakup"
                popupSubtitle="Oldest entry shown first"
                popupContent={paymentsContent}
                helpText={`${showroomEvents.length} entries`}
                popupOpen={openPopup === "payments"}
                onPopupOpenChange={(nextOpen) => {
                  if (nextOpen) openPopupPanel("payments");
                  else closeAllPopups();
                }}
                onPopupClose={closeAllPopups}
                popupPlacement={metricPopupPlacement}
                popupWidth={metricPopupWidth}
              />
              <MetricBox
                label="Showroom Closing"
                value={money(ss.closingBalance)}
                dark={dark}
                tone={showroomTone}
              />
            </div>
            <ProgressRail
              label="Showroom Settlement"
              numerator={showroomPaymentsTotal}
              denominator={ss.netPayableToShowroom}
              dark={dark}
            />
          </div>

          <div
            style={{
              padding: "2px 2px 0",
              display: "grid",
              gap: 7,
              borderLeft: isTablet
                ? "none"
                : `1px solid ${dark ? "#2d3a4e" : "#cfdbeb"}`,
              paddingLeft: isTablet ? 2 : 14,
              marginLeft: isTablet ? 0 : 4,
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 800,
                color: dark ? "#c4b5fd" : "#6d28d9",
              }}
            >
              Autocredits Receivable
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 6,
              }}
            >
              <MetricBox
                label="Net Receivable"
                value={money(ac.netReceivable)}
                dark={dark}
                tone="blue"
                popupTitle={
                  netReceivableView === "margin"
                    ? "Autocredits Margin Breakup"
                    : "Net Receivable Calculation"
                }
                popupSubtitle={
                  netReceivableView === "margin"
                    ? "Margin components used in receivable formula"
                    : "Autocredits formula"
                }
                popupContent={netReceivableContent}
                popupOpen={openPopup === "netReceivable"}
                onPopupOpenChange={(nextOpen) => {
                  if (nextOpen) openPopupPanel("netReceivable");
                  else closeAllPopups();
                }}
                onPopupClose={closeAllPopups}
                popupBackAction={
                  netReceivableView === "margin"
                    ? () => setNetReceivableView("net")
                    : null
                }
                popupPlacement={metricPopupPlacement}
                popupWidth={compactMetricPopupWidth}
              />
              <MetricBox
                label="Receipts"
                value={money(ac.receiptTotal)}
                dark={dark}
                tone="green"
                popupTitle="Receipts Breakup"
                popupSubtitle="Oldest entry shown first"
                popupContent={receiptsContent}
                helpText={`${acEvents.length} entries`}
                popupOpen={openPopup === "receipts"}
                onPopupOpenChange={(nextOpen) => {
                  if (nextOpen) openPopupPanel("receipts");
                  else closeAllPopups();
                }}
                onPopupClose={closeAllPopups}
                popupPlacement={metricPopupPlacement}
                popupWidth={metricPopupWidth}
              />
              <MetricBox
                label="AC Balance"
                value={money(ac.closingBalance)}
                dark={dark}
                tone={acTone}
              />
            </div>
            <ProgressRail
              label="AC Settlement"
              numerator={ac.receiptTotal}
              denominator={ac.netReceivable}
              dark={dark}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "8px 14px 10px",
          borderTop: `1px solid ${dark ? "#1e2433" : "#e8eef7"}`,
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "wrap-reverse",
          alignItems: "center",
          gap: 5,
        }}
      >
        <ActionButton
          label="Quick View"
          icon={<EyeOutlined />}
          onClick={() => onOpenSummary("details", row)}
          dark={dark}
          emphasis
        />
        <ActionButton
          label="Loan"
          icon={<LinkOutlined />}
          onClick={() => navigate(`/loans/edit/${row.loanId}`)}
          dark={dark}
        />
        <ActionButton
          label="Payment"
          icon={<EditOutlined />}
          onClick={() => navigate(`/payments/${row.loanId}`)}
          dark={dark}
        />
        <ActionButton
          label="Add Showroom"
          icon={<DollarOutlined />}
          onClick={() => onQuickAdd(row, "SHOWROOM")}
          dark={dark}
        />
        <ActionButton
          label="Add AC"
          icon={<PlusOutlined />}
          onClick={() => onQuickAdd(row, "AC")}
          dark={dark}
        />
      </div>
    </div>
  );
};

export default PaymentsCaseCard;
