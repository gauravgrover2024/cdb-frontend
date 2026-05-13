import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Bell,
  ChevronDown,
  ChevronRight,
  DatabaseZap,
  Fuel,
  Info,
  MapPin,
  Settings2,
  Sparkles,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../shared/aciV2Constants";
import { AciComposer, emitAciAction } from "../shared/AciAssistShared";
import CarImageStage from "../shared/CarImageStage";

const IMAGE_KEYS = [
  "normalizedImageUrl",
  "cleanImageUrl",
  "normalized_image_url",
  "clean_image_url",
  "normalizedImagePngUrl",
  "sourceImageUrl",
  "heroImage",
  "heroImageUrl",
  "vehicleImage",
  "vehicleImageUrl",
  "image",
  "imageUrl",
  "image_url",
  "thumbnail",
  "thumbnailUrl",
  "carImage",
  "car_image",
  "colorImage",
  "color_image",
  "swatchImage",
  "photo",
  "url",
  "src",
];

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

const makeSlug = (value = "", fallback = "item") =>
  String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const compactText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const humanize = (value) =>
  compactText(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

const parseMoney = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value).replace(/,/g, "").trim();
  if (!text) return 0;

  const match = text.match(/[-+]?\d*\.?\d+/);
  if (!match) return 0;

  const number = Number(match[0]);
  if (!Number.isFinite(number)) return 0;

  if (/crore|cr\b/i.test(text)) return Math.round(number * 10000000);
  if (/lakh|lac|l\b/i.test(text)) return Math.round(number * 100000);
  if (number > 0 && number < 250) return Math.round(number * 100000);
  return Math.round(number);
};

const formatAmount = (value, compact = false) => {
  const amount = Number(value || 0);
  if (!amount) return "—";

  if (compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    return `₹${(amount / 100000).toFixed(2)}L`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getVehicleTitle = (vehicle = {}) =>
  vehicle?.displayName ||
  vehicle?.name ||
  [vehicle?.brand || vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
  "Selected car";

const getVehicleModel = (vehicle = {}) =>
  vehicle?.model ||
  getVehicleTitle(vehicle).split(" ").slice(-1)[0] ||
  "Vehicle";

const getVehicleCity = (vehicle, widget) =>
  widget?.city || widget?.data?.city || vehicle?.city || "Delhi";

const getVehicleImage = (vehicle, widget, rows) => {
  const searchValue = (value, depth = 0) => {
    if (!value || depth > 6) return "";

    if (typeof value === "string") {
      const text = value.trim();
      if (
        /^(data:image\/|blob:)/i.test(text) ||
        /^(https?:)?\/\//i.test(text) ||
        /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text) ||
        /cloudinary|imgix|googleusercontent|cardekho|carwale|acko|spinny|cars24|cdn|uploads/i.test(
          text,
        )
      ) {
        return text;
      }
      return "";
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = searchValue(item, depth + 1);
        if (found) return found;
      }
      return "";
    }

    if (typeof value === "object") {
      for (const key of IMAGE_KEYS) {
        const found = searchValue(value[key], depth + 1);
        if (found) return found;
      }
      for (const nested of Object.values(value)) {
        const found = searchValue(nested, depth + 1);
        if (found) return found;
      }
    }

    return "";
  };

  return searchValue(vehicle) || searchValue(widget) || searchValue(rows) || "";
};

const getRawRows = ({ vehicle, widget, message }) => {
  const candidates = [
    widget?.rows,
    widget?.items,
    widget?.variants,
    widget?.data?.rows,
    widget?.data?.items,
    widget?.data?.variants,
    widget?.data?.pricelist,
    message?.rows,
    message?.items,
    message?.variants,
    message?.data?.rows,
    message?.data?.variants,
    message?.data?.pricelist,
    vehicle?.priceRows,
    vehicle?.pricelist,
    vehicle?.priceList,
    vehicle?.variants,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }

  return [];
};

const getVariantName = (row, index = 0, vehicle) =>
  compactText(
    row.variant ||
      row.variantName ||
      row.name ||
      row.title ||
      row.trim ||
      row.version ||
      row.variant_display_name ||
      row.variantDisplayName ||
      row.selectedVariant ||
      row.label ||
      `${getVehicleModel(vehicle)} Variant ${index + 1}`,
  );

const pickFromText = (text, patterns, fallback = "") => {
  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) return label;
  }
  return fallback;
};

const splitFuelTransmission = (row = {}) => {
  const explicit = [
    row.fuelTransmission,
    row.fuel_transmission,
    row.fuelAndTransmission,
    row.fuel_and_transmission,
  ]
    .filter(Boolean)
    .join(" · ");

  const text =
    `${explicit} ${row.variant || ""} ${row.name || ""} ${row.title || ""}`.toLowerCase();

  const fuel = humanize(
    row.fuel ||
      row.fuelType ||
      row.fuel_type ||
      row.engineType ||
      pickFromText(
        text,
        [
          ["Diesel", /diesel/],
          ["Petrol", /petrol/],
          ["CNG", /\bcng\b/],
          ["Electric", /electric|\bev\b/],
          ["Hybrid", /hybrid/],
        ],
        "N.A.",
      ),
  );

  const transmission = humanize(
    row.transmission ||
      row.transmissionType ||
      row.gearbox ||
      row.transmission_type ||
      pickFromText(
        text,
        [
          ["DCT", /\bdct\b/],
          ["IVT", /\bivt\b/],
          ["CVT", /\bcvt\b/],
          ["AMT", /\bamt\b/],
          ["Automatic", /automatic|\bat\b/],
          ["Manual", /manual|\bmt\b/],
        ],
        "N.A.",
      ),
  );

  return { fuel, transmission };
};

const getFuelTransmission = (row) => {
  const meta = splitFuelTransmission(row);
  return (
    [meta.fuel, meta.transmission]
      .filter((item) => item && item !== "N.A.")
      .join(" · ") || "N.A."
  );
};

const pricePartsFromRow = (row = {}) => {
  const exShowroom =
    parseMoney(
      row.exShowroomPrice ??
        row.ex_showroom_price ??
        row.exShowroom ??
        row.ex_showroom ??
        row.price ??
        row.exPrice,
    ) || 0;

  const rto =
    parseMoney(
      row.rto ??
        row.roadTax ??
        row.road_tax ??
        row.registration ??
        row.rtoAmount,
    ) || 0;

  const insurance =
    parseMoney(
      row.insurance ??
        row.insuranceCost ??
        row.insurance_cost ??
        row.insuranceAmount,
    ) || 0;

  const otherRaw =
    row.otherCharges ||
    row.other_charges ||
    row.optionalItems ||
    row.optional_items ||
    row.accessories ||
    row.charges ||
    row.breakup ||
    [];

  let listItems = [];

  if (Array.isArray(otherRaw)) {
    listItems = otherRaw
      .map((item, index) => {
        if (typeof item === "number" || typeof item === "string") {
          return {
            label: `Other charge ${index + 1}`,
            amount: parseMoney(item),
          };
        }
        return {
          label:
            item.label ||
            item.name ||
            item.title ||
            `Other charge ${index + 1}`,
          amount: parseMoney(
            item.amount ?? item.value ?? item.price ?? item.cost,
          ),
        };
      })
      .filter((item) => item.amount);
  } else if (otherRaw && typeof otherRaw === "object") {
    listItems = Object.entries(otherRaw)
      .map(([label, amount]) => ({
        label: humanize(label),
        amount: parseMoney(amount),
      }))
      .filter((item) => item.amount);
  }

  const listTotal =
    parseMoney(
      row.other ?? row.otherAmount ?? row.otherChargesTotal ?? row.miscCharges,
    ) || listItems.reduce((sum, item) => sum + item.amount, 0);

  const onRoad =
    parseMoney(
      row.onRoadPrice ??
        row.on_road_price ??
        row.onRoad ??
        row.on_road ??
        row.finalPrice ??
        row.totalPrice,
    ) ||
    exShowroom + rto + insurance + listTotal ||
    0;

  return { exShowroom, rto, insurance, listItems, listTotal, onRoad };
};

const normalizeRows = ({ vehicle, widget, message }) => {
  const rawRows = getRawRows({ vehicle, widget, message });
  const sourceRows = rawRows.length ? rawRows : [];

  const normalizedRows = sourceRows.map((row, index) => {
    const parts = pricePartsFromRow(row);
    const variant = getVariantName(row, index, vehicle);
    const meta = splitFuelTransmission({ ...row, variant });

    return {
      ...row,
      id: row.id || row._id || row.variantId || `${makeSlug(variant)}-${index}`,
      variant,
      fuel: meta.fuel,
      transmission: meta.transmission,
      fuelTransmission: getFuelTransmission({ ...row, variant }),
      exShowroomPrice: parts.exShowroom,
      onRoadPrice: parts.onRoad,
      rto: parts.rto,
      insurance: parts.insurance,
      otherChargesTotal: parts.listTotal,
      otherItems: parts.listItems,
      recommended: Boolean(row.recommended || row.bestValue || row.popular),
    };
  });

  const deduped = [];
  const seen = new Set();

  for (const row of normalizedRows) {
    const dedupeKey = [
      compactText(row.variant).toLowerCase(),
      compactText(row.fuelTransmission).toLowerCase(),
    ].join("|");

    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deduped.push(row);
  }

  return deduped;
};

const rowKeyOf = (row, index) =>
  row.id || row._id || row.variantId || `${row.variant}-${index}`;

const buildVariantFilters = (rows = []) => {
  const list = Array.isArray(rows) ? rows : [];
  const has = (predicate) =>
    list.some((row) => predicate(splitFuelTransmission(row)));
  const filters = [{ id: "all", label: "All" }];

  if (has((meta) => /petrol/i.test(meta.fuel)))
    filters.push({ id: "petrol", label: "Petrol" });
  if (has((meta) => /diesel/i.test(meta.fuel)))
    filters.push({ id: "diesel", label: "Diesel" });
  if (has((meta) => /cng/i.test(meta.fuel)))
    filters.push({ id: "cng", label: "CNG" });
  if (has((meta) => /electric|ev/i.test(meta.fuel)))
    filters.push({ id: "electric", label: "Electric" });
  if (has((meta) => /hybrid/i.test(meta.fuel)))
    filters.push({ id: "hybrid", label: "Hybrid" });
  if (has((meta) => /manual|mt/i.test(meta.transmission)))
    filters.push({ id: "manual", label: "Manual" });
  if (has((meta) => /automatic|amt|cvt|dct|ivt|at/i.test(meta.transmission))) {
    filters.push({ id: "automatic", label: "Automatic" });
  }

  return filters;
};

const rowMatchesFilter = (row, filterId) => {
  if (!row || filterId === "all") return true;

  const meta = splitFuelTransmission(row);
  const fuel = String(meta.fuel || "").toLowerCase();
  const transmission = String(meta.transmission || "").toLowerCase();

  switch (filterId) {
    case "petrol":
      return fuel.includes("petrol");
    case "diesel":
      return fuel.includes("diesel");
    case "cng":
      return fuel.includes("cng");
    case "electric":
      return fuel.includes("electric") || fuel.includes("ev");
    case "hybrid":
      return fuel.includes("hybrid");
    case "manual":
      return transmission.includes("manual") || transmission === "mt";
    case "automatic":
      return /(automatic|amt|cvt|dct|ivt|at)/.test(transmission);
    default:
      return true;
  }
};

const rowExShowroomValue = (row) =>
  pricePartsFromRow(row).exShowroom || pricePartsFromRow(row).onRoad || 0;

const calculateEmi = (amount) => {
  const principal = Math.round((Number(amount || 0) || 0) * 0.9);
  const annualRate = 8.75;
  const tenureMonths = 36;

  if (!principal)
    return { principal: 0, emi: 0, totalPayable: 0, totalInterest: 0 };

  const monthlyRate = annualRate / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  const roundedEmi = Math.round(emi);
  const totalPayable = roundedEmi * tenureMonths;

  return {
    principal,
    emi: roundedEmi,
    totalPayable,
    totalInterest: totalPayable - principal,
  };
};

function firePriceAction(label, payload = {}, onAction) {
  const vehicle = payload.vehicle || null;
  const variant = payload.variant || payload.selectedVariant || "";

  emitAciAction(
    {
      id:
        payload.id ||
        makeSlug(`${label}-${vehicle?.id || vehicle?.model || ""}-${variant}`),
      label,
      query:
        payload.query ||
        `${label} ${getVehicleTitle(vehicle)}${variant ? ` ${variant}` : ""}`,
      type: payload.type || "pricelist_action",
      intent: payload.intent || ACI_INTENTS.PRICELIST,
      canvasType: payload.canvasType || ACI_CANVAS_TYPES.PRICELIST,
      vehicle,
      payload,
      contextPatch: {
        selectedVehicle: vehicle,
        anchorModel: vehicle?.model,
        anchorMake: vehicle?.make || vehicle?.brand,
        anchorCity: vehicle?.city,
        anchorVariant: variant,
        ...(payload.contextPatch || {}),
      },
    },
    onAction,
  );
}

function Logo({ mobile = false, onAction }) {
  return (
    <button
      type="button"
      className={`price-logo ${mobile ? "mobile" : ""}`}
      onClick={() =>
        firePriceAction("Home", { type: "go_home", intent: "" }, onAction)
      }
    >
      <span>ACI</span>
      <strong>ASSIST</strong>
      {!mobile ? <Sparkles size={14} /> : null}
    </button>
  );
}

function DesktopHeader({ data, onAction }) {
  return (
    <motion.header className="price-desktop-header" variants={fadeUp}>
      <Logo onAction={onAction} />
      <div className="desktop-actions">
        <button
          type="button"
          className="icon-bell"
          onClick={() => firePriceAction("Notifications", {}, onAction)}
        >
          <Bell size={22} />
          <i />
        </button>
        <button
          type="button"
          className="avatar-button"
          onClick={() => firePriceAction("Profile", {}, onAction)}
        >
          <img src={data?.avatarUrl} alt="Profile" />
        </button>
      </div>
    </motion.header>
  );
}

function VehicleArtwork({ image, imageFailed, vehicle, className = "" }) {
  const hasImage = Boolean(image) && !imageFailed;
  const modelLabel = getVehicleModel(vehicle);

  return (
    <div
      className={`price-car-art ${className} ${hasImage ? "has-image" : "no-image"}`}
    >
      {hasImage ? (
        <CarImageStage
          src={image}
          alt={getVehicleTitle(vehicle)}
          stageVariant={className.includes("mobile") ? "compact" : "hero"}
          className="price-car-stage"
          fallbackLabel={modelLabel}
          imageClassName="price-car-stage-image"
        />
      ) : (
        <div
          className="price-fallback-stage"
          aria-label={`${modelLabel} image unavailable`}
        >
          <span className="fallback-orbit orbit-one" />
          <span className="fallback-orbit orbit-two" />
          <strong>{modelLabel}</strong>
          <small>Image unavailable</small>
        </div>
      )}
    </div>
  );
}

function DesktopHero({ vehicle, rows, minPrice, maxPrice, city, onAction }) {
  return (
    <motion.section className="price-hero" variants={fadeUp}>
      <div className="price-hero-copy">
        <button
          type="button"
          onClick={() =>
            firePriceAction(
              `Back to ${getVehicleTitle(vehicle)}`,
              {
                vehicle,
                type: "back_to_car",
                intent: ACI_INTENTS.OPEN_VEHICLE,
                canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
              },
              onAction,
            )
          }
        >
          <ArrowLeft size={16} />
          Back to {getVehicleTitle(vehicle)}
        </button>

        <h1>{getVehicleTitle(vehicle)} price list</h1>
        <p>
          {humanize(city)} prices · {rows.length} variants ·{" "}
          {formatAmount(minPrice, true)} – {formatAmount(maxPrice, true)}{" "}
          ex-showroom
        </p>
      </div>

      <div className="desktop-hero-actions">
        <button
          type="button"
          className="desktop-city-selector"
          onClick={() =>
            firePriceAction(
              "Change city",
              {
                vehicle,
                type: "change_city",
                query: `Change city for ${getVehicleTitle(vehicle)} price list`,
              },
              onAction,
            )
          }
        >
          <MapPin size={15} />
          {humanize(city)}
          <ChevronDown size={14} />
        </button>
      </div>
    </motion.section>
  );
}

function FilterPills({
  rows = [],
  activeFilter = "all",
  setActiveFilter = () => {},
  className = "",
}) {
  const filters = useMemo(() => buildVariantFilters(rows), [rows]);

  useEffect(() => {
    if (!filters.some((filter) => filter.id === activeFilter))
      setActiveFilter("all");
  }, [activeFilter, filters, setActiveFilter]);

  return (
    <div className={`price-filter-pills ${className}`}>
      {filters.map((filter) => (
        <button
          type="button"
          key={filter.id}
          className={activeFilter === filter.id ? "active" : ""}
          onClick={() => setActiveFilter(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function FuelTransmissionLabel({ row, compact = false }) {
  const meta = splitFuelTransmission(row);
  return (
    <span className={`fuel-transmission-label ${compact ? "compact" : ""}`}>
      <Settings2 size={compact ? 11 : 12} />
      {meta.transmission || "N.A."}
      <em>•</em>
      <Fuel size={compact ? 11 : 12} />
      {meta.fuel || "N.A."}
    </span>
  );
}

function DesktopPriceTable({
  rows,
  allRows,
  selectedRowKey,
  setSelectedRowKey,
  openBreakupKey,
  setOpenBreakupKey,
  activeFilter,
  setActiveFilter,
}) {
  return (
    <motion.section className="price-table-card" variants={fadeUp}>
      <div className="table-head">
        <FilterPills
          rows={allRows}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
        <p>{rows.length} variants · prices are indicative</p>
      </div>

      <div className="price-table-wrap">
        <table>
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr>
              <th />
              {[
                "Variant",
                "Fuel / transmission",
                "Ex-showroom",
                "RTO",
                "Insurance",
                "Other",
                "On-road",
              ].map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody key={activeFilter}>
            {rows.length ? (
              rows.map((row, index) => {
                const rowKey = rowKeyOf(row, index);
                const isSelected = rowKey === selectedRowKey;
                const parts = pricePartsFromRow(row);

                return (
                  <motion.tr
                    key={rowKey}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => setSelectedRowKey(rowKey)}
                    whileHover={{ backgroundColor: "rgba(248,250,252,0.9)" }}
                    whileTap={{ scale: 0.996 }}
                    className={isSelected ? "selected" : ""}
                  >
                    <td>
                      <span className={`row-dot ${isSelected ? "active" : ""}`}>
                        {isSelected ? <i /> : null}
                      </span>
                    </td>
                    <td>
                      <strong>{row.variant}</strong>
                      {row.recommended ? <em>Recommended</em> : null}
                    </td>
                    <td>
                      <FuelTransmissionLabel row={row} />
                    </td>
                    <td>
                      <b>{formatAmount(parts.exShowroom)}</b>
                    </td>
                    <td>{formatAmount(parts.rto)}</td>
                    <td>{formatAmount(parts.insurance)}</td>
                    <td>
                      {parts.listItems.length || parts.listTotal ? (
                        <div className="other-cell">
                          <span>{formatAmount(parts.listTotal)}</span>
                          <button
                            type="button"
                            aria-label="Show other charge breakup"
                            onMouseEnter={() => setOpenBreakupKey(rowKey)}
                            onFocus={() => setOpenBreakupKey(rowKey)}
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenBreakupKey(
                                openBreakupKey === rowKey ? null : rowKey,
                              );
                            }}
                          >
                            <Info size={13} />
                          </button>
                          {openBreakupKey === rowKey ? (
                            <div
                              className={`breakup-popover ${index >= rows.length - 3 ? "top" : ""}`}
                              onMouseLeave={() => setOpenBreakupKey(null)}
                            >
                              <div>
                                <strong>Breakup</strong>
                                <b>{formatAmount(parts.listTotal)}</b>
                              </div>
                              {(parts.listItems.length
                                ? parts.listItems
                                : [
                                    {
                                      label: "Other charges",
                                      amount: parts.listTotal,
                                    },
                                  ]
                              ).map((item, itemIndex) => (
                                <p key={`${item.label}-${itemIndex}`}>
                                  <span>{item.label}</span>
                                  <b>{formatAmount(item.amount)}</b>
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <b className="on-road">{formatAmount(parts.onRoad)}</b>
                    </td>
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="empty-row">
                  <DatabaseZap size={30} />
                  <p>No price rows available.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <small>
        *On-road price includes RTO, insurance and other applicable charges.
      </small>
    </motion.section>
  );
}

function SideSummary({
  vehicle,
  selectedRow,
  selectedParts,
  city,
  image,
  imageFailed,
  onAction,
}) {
  const emi = calculateEmi(selectedParts.onRoad);

  return (
    <aside className="price-side">
      <motion.section className="side-card selected-summary" variants={fadeUp}>
        <div className="side-head">
          <h3>Selected variant</h3>
          <span>
            <i />
            Live
          </span>
        </div>

        <h4>{selectedRow.variant}</h4>
        <FuelTransmissionLabel row={selectedRow} />

        <VehicleArtwork
          image={image}
          imageFailed={imageFailed}
          vehicle={vehicle}
          className="side-art"
        />

        <div className="side-price">
          <span>Est. on-road price ({humanize(city)})</span>
          <strong>{formatAmount(selectedParts.onRoad)}</strong>
        </div>
      </motion.section>

      <motion.section className="side-card emi-card" variants={fadeUp}>
        <div className="side-head">
          <div>
            <h3>Estimated EMI</h3>
            <p>90% loan · 8.75% · 3 years</p>
          </div>
          <span className="icon-box">
            <Banknote size={19} />
          </span>
        </div>

        <strong>
          {formatAmount(emi.emi)}
          <em>/month</em>
        </strong>

        <div className="emi-lines">
          <p>
            <span>Loan amount</span>
            <b>{formatAmount(emi.principal)}</b>
          </p>
          <p>
            <span>Total interest</span>
            <b>{formatAmount(emi.totalInterest)}</b>
          </p>
          <p>
            <span>Total payable</span>
            <b>{formatAmount(emi.totalPayable)}</b>
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            firePriceAction(
              "View EMI options",
              {
                vehicle,
                variant: selectedRow.variant,
                intent: ACI_INTENTS.EMI,
                canvasType: ACI_CANVAS_TYPES.EMI,
                query: `Calculate EMI for ${getVehicleTitle(vehicle)} ${selectedRow.variant}`,
              },
              onAction,
            )
          }
        >
          View EMI options <ChevronRight size={14} />
        </button>
      </motion.section>
    </aside>
  );
}

function MobileHeader({ data, onAction }) {
  return (
    <header className="price-mobile-header">
      <Logo mobile onAction={onAction} />
      <div>
        <button
          type="button"
          className="mobile-bell"
          onClick={() => firePriceAction("Notifications", {}, onAction)}
        >
          <Bell size={24} />
          <i />
        </button>
        <button
          type="button"
          className="mobile-avatar"
          onClick={() => firePriceAction("Profile", {}, onAction)}
        >
          <img src={data?.avatarUrl} alt="Profile" />
        </button>
      </div>
    </header>
  );
}

function MobileBudgetSlider({ min, max, value, setValue }) {
  if (!min || !max || min >= max) return null;

  const safeMin = Number(min || 0);
  const safeMax = Number(max || safeMin);
  const safeValue = Math.min(
    Math.max(Number(value || safeMax), safeMin),
    safeMax,
  );
  const progress =
    safeMax > safeMin
      ? ((safeValue - safeMin) / (safeMax - safeMin)) * 100
      : 100;

  return (
    <div
      className="mobile-budget-slider"
      style={{
        "--budget-progress": `${Math.max(0, Math.min(100, progress))}%`,
      }}
    >
      <div className="mobile-budget-slider-head">
        <span>Budget range</span>
        <strong>Up to {formatAmount(safeValue, true)}</strong>
      </div>
      <input
        type="range"
        min={safeMin}
        max={safeMax}
        step={1000}
        value={safeValue}
        onChange={(event) => {
          const next = Number(event.target.value || safeMax);
          setValue(Math.min(Math.max(next, safeMin), safeMax));
        }}
      />
      <div className="mobile-budget-slider-scale">
        <span>{formatAmount(safeMin, true)}</span>
        <span>{formatAmount(safeMax, true)}</span>
      </div>
    </div>
  );
}

function MobileHero({
  vehicle,
  minPrice,
  maxPrice,
  city,
  count,
  image,
  imageFailed,
}) {
  return (
    <motion.section className="mobile-price-hero" variants={fadeUp}>
      <div>
        <h2>{getVehicleTitle(vehicle)}</h2>
        <strong>
          {formatAmount(minPrice, true)} – {formatAmount(maxPrice, true)}
        </strong>
        <p>
          {humanize(city)} · {count} variants · Ex-showroom
        </p>
      </div>
      <VehicleArtwork
        image={image}
        imageFailed={imageFailed}
        vehicle={vehicle}
        className="mobile-hero-art"
      />
    </motion.section>
  );
}

function MobileVariantRow({ row, index, active, expanded = false, onClick }) {
  const parts = pricePartsFromRow(row);

  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.986 }}
      onClick={onClick}
      className={`mobile-variant-row ${active ? "active" : ""} ${expanded ? "expanded" : ""}`}
    >
      <div className="mobile-variant-main">
        <h3>{row.variant || `Variant ${index + 1}`}</h3>
        {row.recommended ? <span>Most popular</span> : null}
      </div>
      <article className="mobile-variant-meta">
        <FuelTransmissionLabel row={row} compact />
      </article>
      <div className="mobile-variant-price">
        <strong>{formatAmount(parts.exShowroom || parts.onRoad, true)}</strong>
        <small>Ex-showroom</small>
      </div>
      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
    </motion.button>
  );
}

function MobileInlinePriceBreakup({ open, row, city, vehicle, onAction }) {
  if (!open || !row) return null;

  const parts = pricePartsFromRow(row);
  const items = [
    ["Ex-showroom price", parts.exShowroom],
    ["RTO charges", parts.rto],
    ["Insurance", parts.insurance],
    ...(parts.listItems?.length
      ? parts.listItems.map((item) => [item.label, item.amount])
      : parts.listTotal
        ? [["Other charges", parts.listTotal]]
        : []),
  ].filter(([, value]) => Number(value || 0));

  return (
    <AnimatePresence initial={false}>
      <motion.section
        className="mobile-inline-breakup"
        initial={{ opacity: 0, height: 0, y: -6 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mobile-inline-breakup-inner">
          <header>
            <div>
              <p>Price breakup</p>
              <h4>{row.variant}</h4>
              <span>{humanize(city)}</span>
            </div>
          </header>

          <div className="mobile-inline-breakup-lines">
            {items.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <b>{formatAmount(value)}</b>
              </div>
            ))}
            <footer>
              <span>Est. on-road price</span>
              <strong>{formatAmount(parts.onRoad)}</strong>
            </footer>
          </div>

          <div className="mobile-inline-breakup-actions">
            <button
              type="button"
              onClick={() =>
                firePriceAction(
                  "Get quotation",
                  {
                    vehicle,
                    variant: row.variant,
                    type: "lead",
                    intent: ACI_INTENTS.QUOTATION,
                    canvasType: ACI_CANVAS_TYPES.QUOTATION,
                    query: `Get quotation for ${getVehicleTitle(vehicle)} ${row.variant}`,
                  },
                  onAction,
                )
              }
            >
              Get quotation <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() =>
                firePriceAction(
                  "Calculate EMI",
                  {
                    vehicle,
                    variant: row.variant,
                    intent: ACI_INTENTS.EMI,
                    canvasType: ACI_CANVAS_TYPES.EMI,
                    query: `Calculate EMI for ${getVehicleTitle(vehicle)} ${row.variant}`,
                  },
                  onAction,
                )
              }
            >
              EMI
            </button>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

function MobilePage({
  data,
  vehicle,
  allRows,
  rows,
  selectedRowKey,
  setSelectedRowKey,
  activeFilter,
  setActiveFilter,
  budgetMin,
  budgetMax,
  budgetValue,
  setBudgetValue,
  minPrice,
  maxPrice,
  city,
  image,
  imageFailed,
  onAction,
}) {
  const [expandedMobileRowKey, setExpandedMobileRowKey] = useState("");
  const controlsAnchorRef = useRef(null);
  const controlsInnerRef = useRef(null);
  const [controlsFixed, setControlsFixed] = useState(false);
  const [controlsHeight, setControlsHeight] = useState(0);

  useEffect(() => {
    const updateControlsPosition = () => {
      const anchor = controlsAnchorRef.current;
      const inner = controlsInnerRef.current;
      if (!anchor || !inner || window.innerWidth > 1180) {
        setControlsFixed(false);
        return;
      }

      setControlsHeight(inner.offsetHeight || 0);
      setControlsFixed(anchor.getBoundingClientRect().top <= 0);
    };

    updateControlsPosition();
    window.addEventListener("scroll", updateControlsPosition, {
      passive: true,
    });
    window.addEventListener("resize", updateControlsPosition);

    return () => {
      window.removeEventListener("scroll", updateControlsPosition);
      window.removeEventListener("resize", updateControlsPosition);
    };
  }, []);

  useEffect(() => {
    if (!rows.length) {
      setExpandedMobileRowKey("");
      return;
    }
    const exists = rows.some(
      (row, index) => rowKeyOf(row, index) === expandedMobileRowKey,
    );
    if (expandedMobileRowKey && !exists) setExpandedMobileRowKey("");
  }, [rows, expandedMobileRowKey]);

  return (
    <main className="price-mobile-page">
      <MobileHeader data={data} onAction={onAction} />

      <section className="mobile-price-title">
        <h1>{getVehicleTitle(vehicle)} price list</h1>
        <p>Choose the right variant for your city.</p>
      </section>

      <section>
        <button
          type="button"
          className="mobile-back-link"
          onClick={() =>
            firePriceAction(
              `Back to ${getVehicleTitle(vehicle)}`,
              {
                vehicle,
                type: "back_to_car",
                intent: ACI_INTENTS.OPEN_VEHICLE,
                canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
              },
              onAction,
            )
          }
        >
          <ArrowLeft size={17} />
          Back to {getVehicleTitle(vehicle)}
        </button>
      </section>

      <MobileHero
        vehicle={vehicle}
        minPrice={minPrice}
        maxPrice={maxPrice}
        city={city}
        count={allRows.length}
        image={image}
        imageFailed={imageFailed}
      />

      <div
        ref={controlsAnchorRef}
        className={`mobile-filter-sticky-wrap ${controlsFixed ? "is-fixed" : ""}`}
        style={
          controlsFixed
            ? { "--mobile-controls-height": `${controlsHeight}px` }
            : undefined
        }
      >
        <div ref={controlsInnerRef} className="mobile-filter-sticky-inner">
          <button
            type="button"
            className="mobile-city-pill"
            onClick={() =>
              firePriceAction(
                "Change city",
                {
                  vehicle,
                  type: "change_city",
                  query: `Change city for ${getVehicleTitle(vehicle)} price list`,
                },
                onAction,
              )
            }
          >
            <MapPin size={16} />
            {humanize(city)}
            <ChevronDown size={14} />
          </button>

          <FilterPills
            rows={allRows}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            className="mobile-filters"
          />

          <MobileBudgetSlider
            min={budgetMin}
            max={budgetMax}
            value={budgetValue}
            setValue={setBudgetValue}
          />
        </div>
      </div>

      <div className="mobile-variant-list">
        {rows.length ? (
          rows.map((row, index) => {
            const rowKey = rowKeyOf(row, index);
            return (
              <React.Fragment key={rowKey}>
                <MobileVariantRow
                  row={row}
                  index={index}
                  active={rowKey === selectedRowKey}
                  expanded={expandedMobileRowKey === rowKey}
                  onClick={() => {
                    setSelectedRowKey(rowKey);
                    setExpandedMobileRowKey((previous) =>
                      previous === rowKey ? "" : rowKey,
                    );
                  }}
                />
                <MobileInlinePriceBreakup
                  open={expandedMobileRowKey === rowKey}
                  row={row}
                  city={city}
                  vehicle={vehicle}
                  onAction={onAction}
                />
              </React.Fragment>
            );
          })
        ) : (
          <div className="mobile-variants-empty">
            <h3>No variants in this filter</h3>
            <p>Try a different fuel, transmission, or budget range.</p>
          </div>
        )}
      </div>

      <AciComposer
        mobile
        selectedVehicle={vehicle}
        onAction={onAction}
        placeholder={`Ask ACI Assist about ${getVehicleModel(vehicle)} prices...`}
      />
    </main>
  );
}

function DesktopPage({
  data,
  vehicle,
  rows,
  allRows,
  activeFilter,
  setActiveFilter,
  selectedRow,
  selectedParts,
  selectedRowKey,
  setSelectedRowKey,
  openBreakupKey,
  setOpenBreakupKey,
  minPrice,
  maxPrice,
  city,
  image,
  imageFailed,
  onAction,
}) {
  return (
    <>
      <DesktopHeader data={data} onAction={onAction} />
      <motion.main
        className="price-desktop-page"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <section className="price-desktop-main">
          <DesktopHero
            vehicle={vehicle}
            rows={allRows}
            minPrice={minPrice}
            maxPrice={maxPrice}
            city={city}
            onAction={onAction}
          />

          <DesktopPriceTable
            rows={rows}
            allRows={allRows}
            selectedRowKey={selectedRowKey}
            setSelectedRowKey={setSelectedRowKey}
            openBreakupKey={openBreakupKey}
            setOpenBreakupKey={setOpenBreakupKey}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />

          <AciComposer
            selectedVehicle={vehicle}
            onAction={onAction}
            placeholder={`Ask ACI Assist anything about ${getVehicleTitle(vehicle)} prices...`}
          />
        </section>

        <SideSummary
          vehicle={vehicle}
          selectedRow={selectedRow}
          selectedParts={selectedParts}
          city={city}
          image={image}
          imageFailed={imageFailed}
          onAction={onAction}
        />
      </motion.main>
    </>
  );
}

export default function AciAssistPriceListScreen({
  data,
  vehicle,
  widget,
  message,
  onAction,
}) {
  const activeVehicle = useMemo(
    () => vehicle || data?.selectedVehicle || {},
    [vehicle, data?.selectedVehicle],
  );
  const backendLiveMode = Boolean(widget?.__fromBackend);
  const rows = useMemo(
    () =>
      normalizeRows({ vehicle: activeVehicle, widget, message }).sort(
        (a, b) => {
          const aPrice =
            pricePartsFromRow(a).exShowroom || Number.MAX_SAFE_INTEGER;
          const bPrice =
            pricePartsFromRow(b).exShowroom || Number.MAX_SAFE_INTEGER;
          return aPrice - bPrice;
        },
      ),
    [activeVehicle, widget, message],
  );

  const recommendedIndex = Math.max(
    0,
    rows.findIndex(
      (row) => row.recommended || /popular|best|value/i.test(row.variant || ""),
    ),
  );
  const defaultSelectedKey = rowKeyOf(
    rows[recommendedIndex] || rows[0] || {},
    recommendedIndex,
  );

  const [selectedRowKey, setSelectedRowKey] = useState(defaultSelectedKey);
  const [openBreakupKey, setOpenBreakupKey] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [mobileFilter, setMobileFilter] = useState("all");
  const [desktopFilter, setDesktopFilter] = useState("all");
  const [mobileBudgetMax, setMobileBudgetMax] = useState(0);

  useEffect(() => {
    if (!rows.length) return;
    const exists = rows.some(
      (row, index) => rowKeyOf(row, index) === selectedRowKey,
    );
    if (!exists) setSelectedRowKey(defaultSelectedKey);
  }, [rows, selectedRowKey, defaultSelectedKey]);

  const selectedIndex = Math.max(
    0,
    rows.findIndex((row, index) => rowKeyOf(row, index) === selectedRowKey),
  );
  const selectedRow = rows[selectedIndex] || rows[0] || {};
  const selectedParts = pricePartsFromRow(selectedRow);
  const city = getVehicleCity(activeVehicle, widget);
  const image = useMemo(
    () => getVehicleImage(activeVehicle, widget, rows),
    [activeVehicle, widget, rows],
  );

  useEffect(() => setImageFailed(false), [image]);

  const mobileBudgetValues = useMemo(
    () => rows.map(rowExShowroomValue).filter(Boolean),
    [rows],
  );
  const mobileBudgetMin = mobileBudgetValues.length
    ? Math.min(...mobileBudgetValues)
    : 0;
  const mobileBudgetMaxAvailable = mobileBudgetValues.length
    ? Math.max(...mobileBudgetValues)
    : 0;

  useEffect(() => {
    if (!mobileBudgetMaxAvailable) {
      setMobileBudgetMax(0);
      return;
    }
    setMobileBudgetMax((previous) => {
      if (
        previous &&
        previous >= mobileBudgetMin &&
        previous <= mobileBudgetMaxAvailable
      )
        return previous;
      return mobileBudgetMaxAvailable;
    });
  }, [mobileBudgetMin, mobileBudgetMaxAvailable]);

  const mobileRows = useMemo(
    () =>
      rows.filter((row) => {
        const price = rowExShowroomValue(row);
        const withinBudget =
          !mobileBudgetMax || !price || price <= mobileBudgetMax;
        return rowMatchesFilter(row, mobileFilter) && withinBudget;
      }),
    [rows, mobileFilter, mobileBudgetMax],
  );

  const desktopRows = useMemo(
    () => rows.filter((row) => rowMatchesFilter(row, desktopFilter)),
    [rows, desktopFilter],
  );

  useEffect(() => {
    if (!mobileRows.length) return;
    const existsInMobile = mobileRows.some(
      (row, index) => rowKeyOf(row, index) === selectedRowKey,
    );
    if (!existsInMobile) setSelectedRowKey(rowKeyOf(mobileRows[0], 0));
  }, [mobileRows, selectedRowKey]);

  if (backendLiveMode && !rows.length) {
    return (
      <div className="aci-price-root">
        <AciPriceStyles />
        <section className="aci-live-empty">
          <h2>No live price rows found</h2>
          <p>
            Backend was reached, but it did not return variant price rows for{" "}
            {getVehicleTitle(activeVehicle)} in {humanize(city)}.
          </p>
          <button
            type="button"
            onClick={() =>
              firePriceAction(
                `Back to ${getVehicleTitle(activeVehicle)}`,
                {
                  vehicle: activeVehicle,
                  type: "back_to_car",
                  intent: ACI_INTENTS.OPEN_VEHICLE,
                  canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
                },
                onAction,
              )
            }
          >
            Back to car page
          </button>
        </section>
      </div>
    );
  }

  const priceValues = rows
    .map(
      (row) =>
        pricePartsFromRow(row).exShowroom || pricePartsFromRow(row).onRoad,
    )
    .filter(Boolean);
  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;

  return (
    <div className="aci-price-root">
      <AciPriceStyles />

      <DesktopPage
        data={data}
        vehicle={activeVehicle}
        rows={desktopRows}
        allRows={rows}
        activeFilter={desktopFilter}
        setActiveFilter={setDesktopFilter}
        selectedRow={selectedRow}
        selectedParts={selectedParts}
        selectedRowKey={selectedRowKey}
        setSelectedRowKey={setSelectedRowKey}
        openBreakupKey={openBreakupKey}
        setOpenBreakupKey={setOpenBreakupKey}
        minPrice={minPrice}
        maxPrice={maxPrice}
        city={city}
        image={image}
        imageFailed={imageFailed}
        onAction={onAction}
      />

      <MobilePage
        data={data}
        vehicle={activeVehicle}
        allRows={rows}
        rows={mobileRows}
        selectedRowKey={selectedRowKey}
        setSelectedRowKey={setSelectedRowKey}
        activeFilter={mobileFilter}
        setActiveFilter={setMobileFilter}
        budgetMin={mobileBudgetMin}
        budgetMax={mobileBudgetMaxAvailable}
        budgetValue={mobileBudgetMax || mobileBudgetMaxAvailable}
        setBudgetValue={setMobileBudgetMax}
        minPrice={minPrice}
        maxPrice={maxPrice}
        city={city}
        image={image}
        imageFailed={imageFailed}
        onAction={onAction}
      />
    </div>
  );
}

function AciPriceStyles() {
  return (
    <style>{`
:root {
  --blue: #2563eb;
  --blue-dark: #1455ef;
  --ink: #080f2b;
  --text: #334155;
  --muted: #64748b;
  --line: #dbe3ef;
  --surface: rgba(255,255,255,.96);
  --shadow: 0 22px 62px -48px rgba(15,23,42,.48);
  --serif: Georgia, "Times New Roman", serif;
}

* { box-sizing: border-box; }
button, input { font-family: inherit; }
button { cursor: pointer; -webkit-tap-highlight-color: transparent; }

.aci-price-root {
  min-height: 100vh;
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #fff;
  -webkit-font-smoothing: antialiased;
}

.price-mobile-page { display: none; }

.price-logo {
  border: 0;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--ink);
}
.price-logo span {
  color: var(--blue);
  font-size: 32px;
  line-height: .9;
  font-weight: 900;
  letter-spacing: -4px;
  transform: skewX(-9deg);
}
.price-logo strong { font-size: 14px; line-height: 1; letter-spacing: 5px; font-weight: 760; }
.price-logo svg { color: var(--blue); fill: currentColor; }

.price-desktop-header,
.price-desktop-page {
  width: min(100%, 1510px);
  margin-inline: auto;
}

.price-desktop-header {
  position: sticky;
  top: 0;
  z-index: 80;
  height: 52px;
  padding: 6px 40px 2px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,255,255,.9));
  backdrop-filter: blur(18px);
}

.desktop-actions { display: flex; justify-content: flex-end; align-items: center; gap: 12px; }
.icon-bell, .plain-icon {
  position: relative;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  color: #475569;
}
.icon-bell i, .mobile-bell i {
  position: absolute;
  top: 5px;
  right: 7px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--blue);
  border: 2px solid #fff;
}
.avatar-button, .mobile-avatar {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  padding: 3px;
  background: #fff;
  box-shadow: 0 0 0 1px #dbe5f2, 0 10px 24px -14px rgba(37,99,235,.45);
}
.avatar-button img, .mobile-avatar img { width: 100%; height: 100%; border-radius: inherit; object-fit: cover; display: block; }

.price-hero,
.price-table-card,
.side-card,
.mobile-price-hero,
.mobile-variant-row,
.mobile-inline-breakup-inner,
.mobile-budget-slider {
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow), inset 0 1px 0 #fff;
}

.price-desktop-page {
  height: calc(100dvh - 52px - 62px);
  overflow: hidden;
  padding: 6px 40px 8px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 14px;
  align-items: stretch;
}

.price-desktop-main {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
}

.price-hero {
  position: relative;
  min-height: 92px;
  border-radius: 20px;
  padding: 14px 180px 13px 22px;
  background: linear-gradient(135deg, #fff 0%, #f9fbff 100%);
  overflow: hidden;
}
.price-hero-copy button {
  border: 0;
  background: transparent;
  color: var(--blue);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  font-size: 11.5px;
  font-weight: 760;
}
.price-hero-copy h1 {
  margin: 4px 0;
  color: #07102b;
  font-size: 25px;
  line-height: 1.02;
  letter-spacing: -.035em;
  font-weight: 850;
}
.price-hero-copy p {
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.32;
  font-weight: 560;
}
.desktop-hero-actions {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 5;
}
.desktop-city-selector,
.mobile-city-pill {
  border-radius: 999px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 12px 26px -23px rgba(15,23,42,.36);
}
.desktop-city-selector { height: 32px; padding: 0 12px; font-size: 11.5px; font-weight: 780; }
.desktop-city-selector svg, .mobile-city-pill svg { color: var(--blue); }

.price-table-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  padding: 10px;
}
.table-head {
  flex: 0 0 auto;
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.table-head p { margin: 0; color: #94a3b8; font-size: 11px; font-weight: 750; }
.price-filter-pills {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  scrollbar-width: none;
}
.price-filter-pills::-webkit-scrollbar { display: none; }
.price-filter-pills button {
  height: 30px;
  border-radius: 999px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #475569;
  padding: 0 12px;
  font-size: 11.5px;
  font-weight: 760;
  white-space: nowrap;
}
.price-filter-pills button.active { background: var(--blue); border-color: var(--blue); color: #fff; }
.price-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border-radius: 16px;
  border: 1px solid #dbe3ef;
  background: #fff;
}
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11.2px; }
th {
  position: sticky;
  top: 0;
  z-index: 8;
  border-bottom: 1px solid #e2e8f0;
  background: #fbfdff;
  color: #64748b;
  padding: 10px 8px;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: .07em;
  font-size: 8.8px;
  font-weight: 900;
}
td {
  border-bottom: 1px solid #eef2f7;
  padding: 9px 8px;
  color: #475569;
  font-weight: 650;
  position: relative;
}
tr { cursor: pointer; transition: background .2s ease; }
tr.selected { background: #eff6ff; box-shadow: inset 0 0 0 1px #93c5fd, inset 3px 0 0 var(--blue); }
td strong { display: block; color: #0f172a; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
td em { display: inline-flex; margin-top: 5px; height: 18px; align-items: center; border-radius: 7px; background: #dbeafe; color: var(--blue); padding: 0 6px; font-size: 8.8px; font-style: normal; font-weight: 800; }
td b { color: #0f172a; font-weight: 900; }
td .on-road { color: var(--blue); }
.muted { color: #94a3b8; }
.row-dot { width: 15px; height: 15px; border-radius: 999px; border: 1px solid #94a3b8; background: #fff; display: grid; place-items: center; }
.row-dot.active { border-color: var(--blue); background: var(--blue); }
.row-dot i { width: 5px; height: 5px; border-radius: 999px; background: #fff; }
.fuel-transmission-label { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; color: #475569; font-weight: 760; }
.fuel-transmission-label.compact { gap: 4px; font-size: 10.3px; }
.fuel-transmission-label svg { color: var(--blue); stroke-width: 1.8; flex: 0 0 auto; }
.fuel-transmission-label em { margin: 0; padding: 0; height: auto; background: transparent; color: #94a3b8; font-size: inherit; font-style: normal; font-weight: 900; }
.other-cell { position: relative; display: inline-flex; align-items: center; gap: 3px; }
.other-cell button { width: 24px; height: 24px; border: 0; background: transparent; color: #94a3b8; display: grid; place-items: center; border-radius: 999px; }
.other-cell button:hover { background: #eff6ff; color: var(--blue); }
.breakup-popover { position: absolute; left: 0; top: 30px; z-index: 999; width: 280px; border-radius: 18px; border: 1px solid #dbe3ef; background: white; padding: 12px; box-shadow: 0 18px 50px -20px rgba(15,23,42,.35); }
.breakup-popover.top { top: auto; bottom: 30px; }
.breakup-popover div, .breakup-popover p { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0; }
.breakup-popover div { border-bottom: 1px solid #e2e8f0; padding-bottom: 9px; margin-bottom: 9px; }
.breakup-popover strong, .breakup-popover span { color: #64748b; font-size: 12px; font-weight: 800; }
.breakup-popover b { color: #0f172a; font-size: 12px; font-weight: 900; }
.empty-row { text-align: center; padding: 48px 16px; color: #64748b; }
.price-table-card > small { display: block; margin-top: 9px; color: #94a3b8; font-size: 11px; font-weight: 650; }

.price-side {
  position: sticky;
  top: 0;
  max-height: calc(100dvh - 52px - 74px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-self: start;
  padding-bottom: 4px;
}
.side-card { border-radius: 20px; padding: 14px; }
.side-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
.side-head h3, .side-card h3 { margin: 0; color: #0f172a; font-size: 13px; font-weight: 900; }
.side-head > span:not(.icon-box) { color: #059669; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 900; }
.side-head > span i { width: 8px; height: 8px; border-radius: 999px; background: #10b981; }
.selected-summary h4 { margin: 12px 0 6px; color: #0f172a; font-size: 16.5px; line-height: 1.1; font-weight: 900; }
.side-art { height: 126px; margin-top: 12px; border-radius: 18px; overflow: hidden; background: radial-gradient(circle at 50% 42%, #fff 0%, #f8fafc 38%, #eaf2ff 100%); border: 1px solid #dbe3ef; }
.side-art .price-car-stage-image { max-height: 112px; }
.side-price { margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
.side-price span { display: block; color: #64748b; text-transform: uppercase; letter-spacing: .12em; font-size: 9.5px; font-weight: 900; }
.side-price strong { display: block; margin-top: 7px; color: var(--blue); font-size: 21px; line-height: 1; letter-spacing: -.04em; }
.icon-box { width: 38px; height: 38px; border-radius: 14px; background: #eff6ff; color: var(--blue); display: grid; place-items: center; border: 1px solid #bfdbfe; }
.emi-card .side-head p { margin: 4px 0 0; color: #64748b; font-size: 11px; font-weight: 650; }
.emi-card > strong { display: block; margin-top: 12px; color: #0f172a; font-size: 22px; line-height: 1; letter-spacing: -.04em; }
.emi-card > strong em { margin-left: 5px; color: #64748b; font-size: 12px; font-style: normal; }
.emi-lines { margin-top: 11px; display: flex; flex-direction: column; gap: 7px; }
.emi-lines p { margin: 0; display: flex; justify-content: space-between; gap: 14px; }
.emi-lines span, .emi-lines b { font-size: 11.5px; }
.emi-lines span { color: #64748b; font-weight: 650; }
.emi-lines b { color: #0f172a; font-weight: 900; }
.emi-card button { margin-top: 14px; border: 0; background: transparent; color: var(--blue); display: inline-flex; align-items: center; gap: 4px; padding: 0; font-size: 12px; font-weight: 900; }

.price-fallback-stage { position: relative; width: 100%; height: 100%; min-height: 88px; border-radius: 18px; display: grid; place-items: center; overflow: hidden; background: linear-gradient(135deg, #ffffff 0%, #f4f8ff 54%, #ffffff 100%); border: 1px solid rgba(191,219,254,.68); }
.price-fallback-stage::before { content: ""; position: absolute; width: 58%; height: 34%; left: 21%; top: 40%; border-radius: 70px 70px 48px 48px; background: linear-gradient(90deg, rgba(219,234,254,.78), rgba(255,255,255,.95), rgba(191,219,254,.76)); clip-path: polygon(8% 62%, 20% 35%, 39% 23%, 70% 25%, 84% 43%, 94% 64%, 88% 80%, 14% 80%); }
.price-fallback-stage strong { position: relative; z-index: 2; margin-top: 44px; color: #0f172a; font-size: 11px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.price-fallback-stage small { position: relative; z-index: 2; margin-top: -16px; color: #94a3b8; font-size: 9px; font-weight: 800; }
.price-car-art { width: 100%; height: 100%; display: grid; place-items: center; pointer-events: none; }
.price-car-art .price-car-stage { width: 100%; height: 100%; border-radius: 18px; min-height: 88px; }
.price-car-art .price-car-stage-image { width: 92%; height: 86%; object-fit: contain; }

.aci-live-empty { width: min(560px, 100%); margin: 80px auto; border: 1px solid #dbe3ef; border-radius: 28px; background: rgba(255,255,255,.96); box-shadow: 0 24px 74px -56px rgba(15,23,42,.52); padding: 28px; text-align: center; }
.aci-live-empty h2 { margin: 0; font-family: var(--serif); font-size: 34px; line-height: 1; letter-spacing: -.05em; }
.aci-live-empty p { margin: 14px 0 22px; color: #64748b; line-height: 1.5; }
.aci-live-empty button { height: 44px; border: 0; border-radius: 999px; padding: 0 18px; background: linear-gradient(135deg, var(--blue), var(--blue-dark)); color: white; font-weight: 750; }

@media (max-width: 1180px) {
  .price-desktop-header, .price-desktop-page { display: none; }
  .price-mobile-page {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    padding: 10px 18px calc(104px + env(safe-area-inset-bottom));
    gap: 8px;
    background: #fff;
  }
  .price-mobile-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .price-logo.mobile span { font-size: 30px; }
  .price-logo.mobile strong { font-size: 13px; letter-spacing: 4px; }
  .price-mobile-header > div { display: flex; align-items: center; gap: 8px; }
  .mobile-bell { position: relative; width: 38px; height: 38px; border: 0; background: transparent; display: grid; place-items: center; color: #475569; }
  .mobile-avatar { width: 40px; height: 40px; }
  .mobile-price-title h1 { margin: 0; font-family: var(--serif); font-size: 25px; line-height: 1.02; letter-spacing: -.05em; font-weight: 640; color: #07102b; }
  .mobile-price-title p { margin: 4px 0 0; color: #64748b; font-size: 12.5px; line-height: 1.3; font-weight: 520; }
  .mobile-back-link { border: 0; background: transparent; color: var(--blue); display: inline-flex; align-items: center; gap: 7px; padding: 0; font-size: 11.5px; font-weight: 800; }
  .mobile-price-hero {
    min-height: 118px;
    padding: 12px;
    border-radius: 22px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 108px;
    align-items: center;
    gap: 10px;
    background: #fff;
  }
  .mobile-price-hero h2 { margin: 0; color: #07102b; font-size: 20px; line-height: 1.02; letter-spacing: -.04em; font-weight: 780; }
  .mobile-price-hero strong { display: block; margin-top: 6px; color: var(--blue); font-size: 20px; line-height: 1; letter-spacing: -.04em; }
  .mobile-price-hero p { margin: 5px 0 0; color: #64748b; font-size: 10.8px; font-weight: 680; }
  .mobile-hero-art { width: 108px; height: 88px; }
  .mobile-filter-sticky-wrap {
    position: sticky;
    top: 0;
    z-index: 120;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 8px 0 9px;
    background: linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,.94));
    backdrop-filter: blur(14px);
    box-shadow: 0 16px 24px -28px rgba(15,23,42,.32);
  }
  .mobile-city-pill { width: max-content; height: 31px; padding: 0 11px; font-size: 11.5px; font-weight: 760; }
  .mobile-filters button { height: 27px; padding-inline: 10px; font-size: 10.5px; }
  .mobile-budget-slider { width: 100%; border-radius: 16px; padding: 8px 10px 7px; }
  .mobile-budget-slider-head, .mobile-budget-slider-scale { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .mobile-budget-slider-head span { color: #64748b; font-size: 10px; font-weight: 850; text-transform: uppercase; letter-spacing: .075em; }
  .mobile-budget-slider-head strong { color: var(--blue); font-size: 12px; font-weight: 900; }
  .mobile-budget-slider input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 22px; margin: 5px 0 1px; padding: 0; background: transparent; }
  .mobile-budget-slider input[type="range"]::-webkit-slider-runnable-track { width: 100%; height: 6px; border-radius: 999px; background: linear-gradient(90deg, var(--blue) 0%, var(--blue) var(--budget-progress), #e5e7eb var(--budget-progress), #e5e7eb 100%); }
  .mobile-budget-slider input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 999px; border: 3px solid #fff; background: var(--blue); margin-top: -8px; box-shadow: 0 8px 20px -10px rgba(37,99,235,.75); }
  .mobile-budget-slider-scale span { color: #94a3b8; font-size: 9.8px; font-weight: 800; }
  .mobile-variant-list { display: flex; flex-direction: column; gap: 8px; padding: 2px 0 14px; }
  .mobile-variant-row { min-height: 61px; border-radius: 18px; padding: 9px 12px; display: grid; grid-template-columns: minmax(0, .9fr) minmax(112px, 1.04fr) auto 15px; align-items: center; gap: 7px; text-align: left; }
  .mobile-variant-row.active, .mobile-variant-row.expanded { border-color: rgba(37,99,235,.36); box-shadow: inset 3px 0 0 var(--blue), 0 14px 36px -32px rgba(37,99,235,.42); }
  .mobile-variant-main h3 { margin: 0; color: #0f172a; font-size: 12.6px; line-height: 1.12; font-weight: 830; }
  .mobile-variant-main > span { display: inline-flex; align-items: center; height: 17px; margin-top: 4px; border-radius: 7px; background: #dbeafe; color: var(--blue); padding: 0 6px; font-size: 9px; font-weight: 800; }
  .mobile-variant-meta { min-width: 0; }
  .mobile-variant-price { text-align: right; }
  .mobile-variant-price > strong { display: block; color: var(--blue); font-size: 15.3px; line-height: 1; font-weight: 900; }
  .mobile-variant-price > small { display: block; margin-top: 3px; color: #94a3b8; font-size: 8.8px; font-weight: 800; }
  .mobile-inline-breakup { overflow: hidden; margin-top: -3px; }
  .mobile-inline-breakup-inner { margin-inline: 7px; border-radius: 0 0 20px 20px; padding: 11px; background: #fff; }
  .mobile-inline-breakup header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
  .mobile-inline-breakup header p { margin: 0; color: var(--blue); font-size: 9.5px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
  .mobile-inline-breakup header h4 { margin: 3px 0 2px; font-size: 15px; line-height: 1.05; font-weight: 900; color: #07102b; }
  .mobile-inline-breakup header span { font-size: 11px; color: #64748b; }
  .mobile-inline-breakup-lines { padding: 10px 0 8px; display: flex; flex-direction: column; gap: 8px; }
  .mobile-inline-breakup-lines div, .mobile-inline-breakup-lines footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .mobile-inline-breakup-lines span, .mobile-inline-breakup-lines b { font-size: 11.5px; }
  .mobile-inline-breakup-lines span { color: #64748b; font-weight: 700; }
  .mobile-inline-breakup-lines b { color: #0f172a; font-weight: 900; }
  .mobile-inline-breakup-lines footer { border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .mobile-inline-breakup-lines footer strong { color: var(--blue); font-size: 15.5px; }
  .mobile-inline-breakup-actions { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 10px; }
  .mobile-inline-breakup-actions button { height: 34px; border-radius: 999px; border: 1px solid #dbe3ef; background: #fff; padding: 0 13px; font-size: 11px; font-weight: 850; }
  .mobile-inline-breakup-actions button:first-child { border: 0; background: linear-gradient(135deg, var(--blue), var(--blue-dark)); color: #fff; }
  .mobile-variants-empty { border: 1px solid #dbe3ef; border-radius: 20px; padding: 18px; text-align: center; color: #64748b; }
}

@media (max-width: 390px) {
  .mobile-price-title h1 { font-size: 24px; }
  .mobile-price-hero { grid-template-columns: minmax(0, 1fr) 96px; }
  .mobile-hero-art { width: 96px; }
  .mobile-variant-row { grid-template-columns: minmax(0, .85fr) minmax(100px, 1fr) auto 14px; padding: 9px 10px; }
  .mobile-variant-main h3 { font-size: 12.2px; }
  .fuel-transmission-label.compact { font-size: 10px; gap: 3px; }
  .mobile-variant-price > strong { font-size: 14.5px; }
}



@keyframes aciTableRefresh {
  from { opacity: .55; transform: translateY(6px); filter: blur(3px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@media (min-width: 1181px) {
  .price-desktop-page { grid-template-columns: minmax(0, 1fr) 380px; gap: 20px; }
  .price-hero { min-height: 104px; padding: 16px 190px 15px 24px; }
  .desktop-city-selector { box-shadow: 0 16px 32px -26px rgba(15,23,42,.42); }
  .price-table-card { border-radius: 26px; }
  .price-table-wrap tbody { animation: aciTableRefresh .24s ease both; }
  .price-filter-pills button { transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease, border-color .18s ease; }
  .price-filter-pills button:hover { transform: translateY(-1px); border-color: rgba(37,99,235,.35); }
  .price-filter-pills button.active { box-shadow: 0 14px 30px -22px rgba(37,99,235,.75); transform: translateY(-1px); }
  tr.selected { background: rgba(248,250,252,.92); box-shadow: inset 0 0 0 1px rgba(37,99,235,.20); }
  td em { background: #f1f5f9; color: #475569; }
  .side-art { height: 176px; border-radius: 24px; }
  .side-art .price-car-stage-image { max-height: 158px; }
  .price-fallback-stage { min-height: 130px; border-radius: 24px; }
}

@media (max-width: 1180px) {
  .price-desktop-header, .price-desktop-page { display: none !important; }
  .price-mobile-page { display: flex; }
  .mobile-price-hero { min-height: 156px; grid-template-columns: minmax(0, 1fr) 136px; padding: 15px; border-radius: 28px; }
  .mobile-hero-art { width: 136px; height: 118px; }
  .mobile-hero-art .price-fallback-stage { min-height: 118px; border-radius: 24px; }
  .mobile-filter-sticky-wrap { position: relative; z-index: 140; min-height: var(--mobile-controls-height, auto); background: transparent; box-shadow: none; padding: 0; }
  .mobile-filter-sticky-inner { display: flex; flex-direction: column; gap: 8px; padding: 9px 0 10px; background: linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,.94)); backdrop-filter: blur(18px); border-bottom: 1px solid rgba(219,227,239,.72); }
  .mobile-filter-sticky-wrap.is-fixed .mobile-filter-sticky-inner { position: fixed; top: 0; left: 50%; width: min(430px, calc(100vw - 36px)); transform: translateX(-50%); z-index: 999; border-radius: 0 0 22px 22px; box-shadow: 0 18px 44px -34px rgba(15,23,42,.34); }
  .mobile-budget-slider { border-radius: 20px; box-shadow: 0 18px 40px -36px rgba(15,23,42,.35), inset 0 1px 0 #fff; }
  .mobile-inline-breakup { margin-top: 2px; }
  .mobile-inline-breakup-inner { border-radius: 24px; margin-inline: 0; padding: 15px; box-shadow: 0 18px 44px -35px rgba(37,99,235,.38), inset 0 1px 0 #fff; }
  .mobile-inline-breakup header { border-bottom-color: rgba(226,232,240,.9); }
  .mobile-inline-breakup-actions button:first-child { display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
}

@media (max-width: 390px) {
  .mobile-price-hero { grid-template-columns: minmax(0, 1fr) 110px; }
  .mobile-hero-art { width: 110px; height: 96px; }
}

/* ACI_PRICE_MOBILE_SHELL_LOCK_START */

/*
  Keep mobile UI as a centered phone webapp until desktop layout begins.
  This prevents tablet/small-laptop widths from stretching the mobile canvas.
*/
@media (max-width: 1180px) {
  .aci-price-root {
    background:
      radial-gradient(circle at 50% 100%, rgba(37, 99, 235, 0.055), transparent 34%),
      linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
    min-height: 100dvh !important;
    overflow-x: hidden !important;
  }

  .price-mobile-page {
    width: min(430px, calc(100vw - 28px)) !important;
    max-width: 430px !important;
    margin-inline: auto !important;
    background: #ffffff !important;
    min-height: 100dvh !important;
    box-shadow:
      0 28px 90px -72px rgba(15, 23, 42, 0.55),
      inset 0 1px 0 rgba(255,255,255,0.92) !important;
  }

  .price-mobile-header,
  .mobile-price-title,
  .mobile-price-title + section,
  .mobile-price-hero,
  .mobile-filter-sticky-wrap,
  .mobile-variant-list,
  .aci-price-root .aci-v2-chatdock {
    width: 100% !important;
  }

  .mobile-filter-sticky-wrap.is-fixed .mobile-filter-sticky-inner {
    width: min(430px, calc(100vw - 28px)) !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
  }

  .aci-price-root .aci-v2-chatdock {
    max-width: 430px !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
  }
}

@media (max-width: 460px) {
  .price-mobile-page {
    width: 100% !important;
    max-width: none !important;
    margin-inline: 0 !important;
    box-shadow: none !important;
  }

  .mobile-filter-sticky-wrap.is-fixed .mobile-filter-sticky-inner {
    width: calc(100vw - 36px) !important;
  }

  .aci-price-root .aci-v2-chatdock {
    max-width: calc(100vw - 36px) !important;
  }
}

/* ACI_PRICE_MOBILE_SHELL_LOCK_END */

/* ACI_PRICE_SPACING_TABLE_FIX_START */

/* Mobile/tablet shell: remove dead-looking white gap above chatbar */
@media (max-width: 1180px) {
  .aci-price-root {
    background:
      radial-gradient(circle at 50% 95%, rgba(37, 99, 235, 0.075), transparent 32%),
      linear-gradient(180deg, #ffffff 0%, #fbfdff 56%, #f4f8ff 100%) !important;
  }

  .price-mobile-page {
    background:
      linear-gradient(180deg, #ffffff 0%, #ffffff 62%, #f8fbff 100%) !important;
    padding-bottom: calc(40px + env(safe-area-inset-bottom)) !important;
  }

  .mobile-variant-list {
    padding-bottom: calc(34px + env(safe-area-inset-bottom)) !important;
  }

  .aci-price-root .aci-v2-chatdock {
    bottom: calc(8px + env(safe-area-inset-bottom)) !important;
  }

  .mobile-variant-list::after {
    content: "";
    display: block;
    height: 4px;
  }
}

/* True phone width: keep enough safe bottom space, but not a huge blank band */
@media (max-width: 460px) {
  .price-mobile-page {
    padding-bottom: calc(38px + env(safe-area-inset-bottom)) !important;
  }

  .mobile-variant-list {
    padding-bottom: calc(34px + env(safe-area-inset-bottom)) !important;
  }
}

/* Small laptop / tablet desktop breakpoint: make table breathe */
@media (min-width: 1181px) and (max-width: 1360px) {
  .aci-price-root .price-desktop-page {
    grid-template-columns: minmax(0, 1fr) 320px !important;
    gap: 12px !important;
    padding-left: 28px !important;
    padding-right: 28px !important;
  }

  .aci-price-root .price-table-card {
    padding: 12px !important;
  }

  .aci-price-root .price-table-wrap table {
    table-layout: fixed !important;
  }

  .aci-price-root .price-table-wrap th {
    font-size: 8.5px !important;
    line-height: 1.15 !important;
    padding: 10px 7px !important;
  }

  .aci-price-root .price-table-wrap td {
    padding: 12px 7px !important;
    vertical-align: middle !important;
  }

  .aci-price-root .price-table-wrap tbody tr {
    height: 58px !important;
  }

  .aci-price-root .desktop-fuel-transmission {
    display: inline-grid !important;
    grid-template-columns: 14px minmax(0, 1fr) !important;
    grid-auto-rows: min-content !important;
    align-items: center !important;
    row-gap: 4px !important;
    column-gap: 5px !important;
    white-space: normal !important;
    line-height: 1.05 !important;
    font-size: 11px !important;
    max-width: 94px !important;
  }

  .aci-price-root .desktop-fuel-transmission em {
    display: none !important;
  }

  .aci-price-root .desktop-fuel-transmission svg {
    width: 12px !important;
    height: 12px !important;
  }

  .aci-price-root .price-table-wrap td:nth-child(4) b,
  .aci-price-root .price-table-wrap td:nth-child(8) b {
    font-size: 11.2px !important;
    letter-spacing: -0.02em !important;
  }

  .aci-price-root .price-table-wrap td strong {
    font-size: 11.5px !important;
    line-height: 1.15 !important;
  }

  .aci-price-root .side-card {
    padding: 13px !important;
  }

  .aci-price-root .selected-summary h4 {
    font-size: 16px !important;
  }

  .aci-price-root .side-price strong,
  .aci-price-root .emi-card > strong {
    font-size: 22px !important;
  }
}

/* Even tighter laptop: prioritize neatness over density */
@media (min-width: 1181px) and (max-width: 1260px) {
  .aci-price-root .price-desktop-page {
    grid-template-columns: minmax(0, 1fr) 300px !important;
    padding-left: 22px !important;
    padding-right: 22px !important;
  }

  .aci-price-root .price-table-wrap tbody tr {
    height: 64px !important;
  }

  .aci-price-root .desktop-fuel-transmission {
    max-width: 82px !important;
    font-size: 10.5px !important;
  }

  .aci-price-root .price-table-wrap td {
    padding: 13px 6px !important;
  }
}

/* ACI_PRICE_SPACING_TABLE_FIX_END */

/* ACI_PRICE_LAPTOP_ROW_RAIL_FIX_START */

/* Laptop: give table more width and make rows breathe */
@media (min-width: 1181px) {
  .aci-price-root .price-desktop-page {
    grid-template-columns: minmax(0, 1fr) 300px !important;
    gap: 12px !important;
  }

  .aci-price-root .price-side {
    max-width: 300px !important;
  }

  .aci-price-root .price-table-wrap tbody tr {
    height: 68px !important;
  }

  .aci-price-root .price-table-wrap td {
    padding-top: 15px !important;
    padding-bottom: 15px !important;
    vertical-align: middle !important;
  }

  .aci-price-root .price-table-wrap td strong {
    line-height: 1.2 !important;
  }

  .aci-price-root .desktop-fuel-transmission {
    line-height: 1.18 !important;
  }

  .aci-price-root .side-card {
    padding: 13px !important;
  }

  .aci-price-root .side-price strong,
  .aci-price-root .emi-card > strong {
    font-size: 22px !important;
  }
}

/* Smaller laptop: reduce right rail further and keep rows clean */
@media (min-width: 1181px) and (max-width: 1360px) {
  .aci-price-root .price-desktop-page {
    grid-template-columns: minmax(0, 1fr) 280px !important;
    gap: 10px !important;
    padding-left: 22px !important;
    padding-right: 22px !important;
  }

  .aci-price-root .price-side {
    max-width: 280px !important;
  }

  .aci-price-root .price-table-wrap tbody tr {
    height: 72px !important;
  }

  .aci-price-root .price-table-wrap td {
    padding-top: 16px !important;
    padding-bottom: 16px !important;
  }
}

/* ACI_PRICE_LAPTOP_ROW_RAIL_FIX_END */
`}</style>
  );
}
