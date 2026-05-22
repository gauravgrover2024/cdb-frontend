import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { AciVehicleVisual } from "../shared/AciAssistShared";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";
import AciV2QuestionIcon from "./AciV2QuestionIcon";
import { getDisplayCarImage, resolveCarImageUrl } from "../shared/aciV2Image";
import {
  buildChatImageFrameStyle,
  buildChatSuggestions,
  buildInlineColorFrameStyle,
  canvasTypeLabel,
  firstValue,
  formatFeaturePreviewPrice,
  formatIndianPrice,
  getFeaturePreviewRows,
  getWidgetRows,
  isFeatureCanvasWidget,
  toArray,
} from "./aciV2ChatWidgetUtils";

const pickText = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
};

const pickAny = (...values) =>
  values.find((value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  }) || null;

const isColorCanvas = (widget = {}, canvasType = "") =>
  widget?.type === "vehicle_colors" ||
  widget?.tool === "vehicle_colors" ||
  widget?.toolName === "vehicle_colors" ||
  widget?.tool_name === "vehicle_colors" ||
  widget?.canvasType === "color_studio_canvas" ||
  widget?.canvasType === "colors_canvas" ||
  widget?.canvasType === "vehicle_colors" ||
  canvasType === "color_studio_canvas" ||
  canvasType === "colors_canvas" ||
  canvasType === "vehicle_colors";

const isPriceCanvas = (widget = {}, canvasType = "") =>
  widget?.type === "vehicle_pricelist" ||
  widget?.type === "vehicle_prices" ||
  widget?.tool === "vehicle_pricelist" ||
  widget?.tool === "vehicle_prices" ||
  widget?.toolName === "vehicle_pricelist" ||
  widget?.toolName === "vehicle_prices" ||
  widget?.tool_name === "vehicle_pricelist" ||
  widget?.tool_name === "vehicle_prices" ||
  widget?.canvasType === "pricelist_canvas" ||
  widget?.canvasType === "price_breakup_canvas" ||
  widget?.canvasType === "vehicle_pricelist" ||
  canvasType === "pricelist_canvas" ||
  canvasType === "price_breakup_canvas" ||
  canvasType === "vehicle_pricelist";

const normalizePriceToRupees = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value > 100000) return value;
    if (value < 1000) return value * 100000;
    return value;
  }

  const text = String(value || "").trim();
  if (!text) return null;

  const firstPart = text
    .replace(/\s+to\s+/gi, " - ")
    .split(/\s*(?:-|–|—)\s*/)
    .filter(Boolean)[0];

  const number = Number(
    String(firstPart || "")
      .replace(/[₹,\s]/g, "")
      .replace(/[^\d.]/g, ""),
  );

  if (!Number.isFinite(number) || number <= 0) return null;

  if (/crore/i.test(text)) return number * 10000000;
  if (/lakh|lac/i.test(text)) return number * 100000;
  if (number < 1000) return number * 100000;

  return number;
};

const getAllPriceRows = (widget = {}, fallbackRows = []) => {
  const rows = toArray(
    widget.rows ||
      widget.variants ||
      widget.items ||
      widget.records ||
      widget.priceRows ||
      widget.prices ||
      widget.versions,
  );

  return rows.length ? rows : toArray(fallbackRows);
};

const getPriceRawValue = (row = {}) =>
  pickAny(
    row.priceValue,
    row.price_numeric,
    row.priceNumeric,
    row.onRoadPriceValue,
    row.onRoadPriceNumeric,
    row.exShowroomPriceValue,
    row.exShowroomPriceNumeric,
    row.price,
    row.priceRange,
    row.onRoadPrice,
    row.exShowroomPrice,
    row.value,
  );

const getPriceNumber = (row = {}) =>
  normalizePriceToRupees(getPriceRawValue(row));

const getPriceLabel = (row = {}) =>
  formatIndianPrice(
    pickText(
      row.priceLabel,
      row.onRoadPriceLabel,
      row.exShowroomPriceLabel,
      row.price,
      row.priceRange,
      row.onRoadPrice,
      row.exShowroomPrice,
      row.value,
    ),
  );

const getPriceVariantLabel = (row = {}, fallback = "Variant") =>
  pickText(
    row.variant,
    row.variantName,
    row.variantLabel,
    row.name,
    row.title,
    row.label,
    fallback,
  );

const getPriceVariantMeta = (row = {}) =>
  pickText(
    row.subtitle,
    row.fuelTransmission,
    [row.fuel, row.transmission].filter(Boolean).join(" · "),
    row.engineTransmission,
    row.engine,
  );

const getPriceHeroVehicle = ({
  widget = {},
  message = {},
  selectedVehicle,
  rows = [],
}) =>
  pickAny(
    widget.vehicle,
    message.vehicle,
    selectedVehicle,
    rows.find((row) => row?.vehicle)?.vehicle,
    rows[0]?.vehicle,
    rows[0],
  ) || {};

const buildPriceOrbit = (rows = []) => {
  const parsed = rows
    .map((row, index) => ({
      row,
      index,
      label: getPriceVariantLabel(row, `Variant ${index + 1}`),
      meta: getPriceVariantMeta(row),
      price: getPriceLabel(row),
      priceNumber: getPriceNumber(row),
      isRecommended:
        row?.isRecommended ||
        row?.recommended ||
        row?.isBestValue ||
        row?.bestValue ||
        /smart|recommended|best value|value/i.test(
          `${row?.tag || ""} ${row?.badge || ""} ${row?.label || ""}`,
        ),
    }))
    .filter((item) => item.label || item.price);

  const sorted = parsed
    .filter((item) => Number.isFinite(item.priceNumber))
    .sort((a, b) => a.priceNumber - b.priceNumber);

  const ordered = sorted.length ? sorted : parsed;

  const entry = ordered[0] || null;
  const top = ordered[ordered.length - 1] || entry;

  const smart =
    ordered.find((item) => item.isRecommended) ||
    ordered[
      Math.min(
        ordered.length - 1,
        Math.max(0, Math.round((ordered.length - 1) * 0.46)),
      )
    ] ||
    entry;

  const minPrice = entry?.priceNumber;
  const maxPrice = top?.priceNumber;

  const percentFor = (item, fallback = 50) => {
    if (
      Number.isFinite(item?.priceNumber) &&
      Number.isFinite(minPrice) &&
      Number.isFinite(maxPrice) &&
      maxPrice > minPrice
    ) {
      return Math.max(
        5,
        Math.min(
          95,
          ((item.priceNumber - minPrice) / (maxPrice - minPrice)) * 100,
        ),
      );
    }

    return fallback;
  };

  const picks = [];
  const seen = new Set();

  [
    { role: "Entry", tone: "entry", item: entry, percent: 5 },
    {
      role: "Sweet spot",
      tone: "smart",
      item: smart,
      percent: percentFor(smart, 52),
    },
    { role: "Top", tone: "top", item: top, percent: 95 },
  ].forEach((pick) => {
    const key = `${pick.item?.label || ""}-${pick.item?.price || ""}`;
    if (!pick.item || seen.has(key)) return;
    seen.add(key);
    picks.push(pick);
  });

  const pickedIndexes = new Set(picks.map((pick) => pick.item?.index));
  const hiddenItems = ordered.filter((item) => !pickedIndexes.has(item.index));

  const dots = hiddenItems.slice(0, 9).map((item, index) => ({
    key: `${item.label}-${index}`,
    percent: percentFor(
      item,
      ((index + 1) / (Math.min(hiddenItems.length, 9) + 1)) * 100,
    ),
  }));

  return {
    entry,
    top,
    picks,
    dots,
    hiddenCount: hiddenItems.length,
  };
};

const priceIsObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const pickPriceImageFrame = (...sources) => {
  for (const source of sources) {
    if (!priceIsObject(source)) continue;

    const frame = pickAny(
      source.displayFrameMeta,
      source.display_frame_meta,
      source.heroFrameMeta,
      source.hero_frame_meta,
      source.imageFrame,
      source.image_frame,
      source.frameMeta,
      source.frame_meta,
      source.carImageFrame,
      source.car_image_frame,
      source.frame,
    );

    if (priceIsObject(frame)) return frame;
  }

  return null;
};

const safePriceHeroImage = (source) => {
  if (!source) return "";

  try {
    if (priceIsObject(source)) {
      const explicit = pickText(
        source.displayImageUrl,
        source.displayNormalizedImageUrl,
        source.normalizedImageUrl,
        source.stagedImageUrl,
        source.cleanImageUrl,
        source.heroImageUrl,
        source.imageUrl,
        source.image_url,
        source.url,
        source.src,
        source.thumbnail,
        source.photo,
        source.vehicle?.displayImageUrl,
        source.vehicle?.displayNormalizedImageUrl,
        source.vehicle?.normalizedImageUrl,
        source.vehicle?.heroImageUrl,
        source.vehicle?.imageUrl,
        source.selectedVehicle?.displayImageUrl,
        source.selectedVehicle?.displayNormalizedImageUrl,
        source.selectedVehicle?.normalizedImageUrl,
        source.selectedVehicle?.heroImageUrl,
        source.selectedVehicle?.imageUrl,
        source.car?.displayImageUrl,
        source.car?.normalizedImageUrl,
        source.car?.heroImageUrl,
        source.car?.imageUrl,
        source.media?.displayImageUrl,
        source.media?.imageUrl,
      );

      const resolvedExplicit = resolveCarImageUrl(explicit);
      if (resolvedExplicit) return resolvedExplicit;
    }

    return getDisplayCarImage(source) || "";
  } catch {
    return "";
  }
};

const pickPriceHeroImage = (...sources) => {
  for (const source of sources) {
    const image = safePriceHeroImage(source);
    if (image) return image;
  }

  return "";
};

const readPriceFrameNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    if (typeof value === "string" && value.trim().endsWith("%")) {
      const parsed = Number(value.trim().slice(0, -1));
      if (Number.isFinite(parsed)) return parsed / 100;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

const clampPriceNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizedPriceFrameBounds = (frame = {}) => {
  if (!priceIsObject(frame)) return null;

  const stageFrame =
    frame.stageFrames?.featureInlineHero ||
    frame.stages?.featureInlineHero ||
    frame.featureInlineHero ||
    frame.stageFrames?.priceInlineHero ||
    frame.stages?.priceInlineHero ||
    frame.priceInlineHero ||
    frame.stageFrames?.chatCard ||
    frame.stages?.chatCard ||
    frame.chatCard ||
    frame.stageFrames?.priceSide ||
    frame.stages?.priceSide ||
    frame.priceSide ||
    frame;

  const bounds =
    stageFrame.bounds ||
    stageFrame.visibleBounds ||
    stageFrame.contentBounds ||
    stageFrame.subjectBounds ||
    stageFrame.carBounds ||
    stageFrame.trimBounds ||
    stageFrame.bbox ||
    stageFrame;

  const canvasWidth = readPriceFrameNumber(
    stageFrame.canvas_width,
    stageFrame.canvasWidth,
    stageFrame.naturalWidth,
    stageFrame.imageWidth,
    frame.canvas_width,
    frame.canvasWidth,
    frame.naturalWidth,
    frame.imageWidth,
  );

  const canvasHeight = readPriceFrameNumber(
    stageFrame.canvas_height,
    stageFrame.canvasHeight,
    stageFrame.naturalHeight,
    stageFrame.imageHeight,
    frame.canvas_height,
    frame.canvasHeight,
    frame.naturalHeight,
    frame.imageHeight,
  );

  const rawLeft = readPriceFrameNumber(bounds.left, bounds.x, bounds.minX);
  const rawTop = readPriceFrameNumber(bounds.top, bounds.y, bounds.minY);
  const rawWidth = readPriceFrameNumber(bounds.width, bounds.w);
  const rawHeight = readPriceFrameNumber(bounds.height, bounds.h);

  if (![rawLeft, rawTop, rawWidth, rawHeight].every(Number.isFinite)) {
    return null;
  }

  if (
    rawLeft >= 0 &&
    rawTop >= 0 &&
    rawWidth > 0 &&
    rawHeight > 0 &&
    rawLeft <= 1 &&
    rawTop <= 1 &&
    rawWidth <= 1 &&
    rawHeight <= 1
  ) {
    return {
      left: rawLeft,
      top: rawTop,
      width: rawWidth,
      height: rawHeight,
    };
  }

  if (
    Number.isFinite(canvasWidth) &&
    Number.isFinite(canvasHeight) &&
    canvasWidth > 0 &&
    canvasHeight > 0 &&
    rawWidth > 0 &&
    rawHeight > 0
  ) {
    return {
      left: rawLeft / canvasWidth,
      top: rawTop / canvasHeight,
      width: rawWidth / canvasWidth,
      height: rawHeight / canvasHeight,
    };
  }

  return null;
};

const buildPriceHeroFrameStyle = (frame) => {
  const bounds = normalizedPriceFrameBounds(frame);

  if (!bounds) return {};

  const width = clampPriceNumber(bounds.width, 0.01, 1, 1);
  const height = clampPriceNumber(bounds.height, 0.01, 1, 1);
  const left = clampPriceNumber(bounds.left, 0, 1, 0);
  const top = clampPriceNumber(bounds.top, 0, 1, 0);
  const centerX = left + width / 2;
  const centerY = top + height / 2;

  return {
    "--price-car-position-x": `${clampPriceNumber(centerX * 100, 38, 62, 50).toFixed(1)}%`,
    "--price-car-position-y": `${clampPriceNumber(centerY * 100, 42, 60, 50).toFixed(1)}%`,
  };
};

const getExShowroomPriceLabel = (row = {}) =>
  formatIndianPrice(
    pickText(
      row.exShowroomPriceLabel,
      row.ex_showroom_price_label,
      row.exShowroomLabel,
      row.ex_showroom_label,
      row.exShowroomPrice,
      row.ex_showroom_price,
      row.exShowroom,
      row.ex_showroom,
      row.price,
    ),
  );

function AciV2PricePreviewArea({
  message = {},
  widget = {},
  rows = [],
  selectedVehicle,
  hasCanvas = false,
  openCanvasLabel = "Open Pricelist",
  actions = [],
  onOpen,
  onAction,
}) {
  const allRows = getAllPriceRows(widget, rows);
  const { entry, top, picks } = buildPriceOrbit(allRows);

  const heroVehicle = getPriceHeroVehicle({
    widget,
    message,
    selectedVehicle,
    rows: allRows,
  });

  const heroFrame = pickPriceImageFrame(
    heroVehicle,
    widget.vehicle,
    message.vehicle,
    selectedVehicle,
    widget,
    message,
    allRows[0],
    allRows[0]?.vehicle,
  );

  const heroImage = pickPriceHeroImage(
    heroVehicle,
    widget.vehicle,
    message.vehicle,
    selectedVehicle,
    widget,
    message,
    allRows[0],
    allRows[0]?.vehicle,
  );

  const heroFrameStyle = buildPriceHeroFrameStyle(heroFrame);

  const vehicleName = pickText(
    widget.vehicle?.displayName,
    widget.vehicle?.fullModel,
    widget.vehicle?.model,
    widget.displayName,
    widget.model,
    widget.title,
    message.contextPatch?.selectedVehicle?.displayName,
    message.contextPatch?.selectedVehicle?.model,
    message.contextPatch?.anchorModel,
    selectedVehicle?.displayName,
    selectedVehicle?.fullModel,
    selectedVehicle?.model,
    "Selected car",
  );

  const city = pickText(
    widget.city,
    widget.location,
    widget.selectedCity,
    message.city,
    message.contextPatch?.city,
    message.contextPatch?.anchorCity,
    selectedVehicle?.city,
    "Delhi",
  );

  const compactPrice = (number, fallback = "") => {
    const amount = Number(number || 0);
    if (!amount) return fallback || "";

    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    }

    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  const rangeLabel =
    compactPrice(entry?.priceNumber, getExShowroomPriceLabel(entry?.row)) &&
    compactPrice(top?.priceNumber, getExShowroomPriceLabel(top?.row)) &&
    compactPrice(entry?.priceNumber, getExShowroomPriceLabel(entry?.row)) !==
      compactPrice(top?.priceNumber, getExShowroomPriceLabel(top?.row))
      ? `${compactPrice(entry?.priceNumber, getExShowroomPriceLabel(entry?.row))} – ${compactPrice(
          top?.priceNumber,
          getExShowroomPriceLabel(top?.row),
        )}`
      : compactPrice(entry?.priceNumber, getExShowroomPriceLabel(entry?.row)) ||
        compactPrice(top?.priceNumber, getExShowroomPriceLabel(top?.row)) ||
        "Price available";

  const handleOpenCanvas = () => {
    if (!hasCanvas || typeof onOpen !== "function") return;
    onOpen(message);
  };

  const handlePickOpen = (pick, index) => {
    if (!pick?.item?.row || typeof onOpen !== "function") return;

    onOpen({
      ...message,
      widget: {
        ...widget,
        selectedRow: pick.item.row,
        selectedRowIndex: pick.item.index ?? index,
      },
    });
  };

  const leadItems = [
    hasCanvas
      ? {
          id: "open-pricelist",
          label: openCanvasLabel,
          iconIndex: 0,
          onClick: handleOpenCanvas,
        }
      : null,
    ...actions.map((item, index) => ({
      ...item,
      iconIndex: index + 1,
      onClick: () => onAction?.(item),
    })),
  ].filter(Boolean);

  return (
    <>
      <style>{`
        .aci-price-feature-card {
          width: min(100%, 760px);
          color: #071142;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .aci-price-feature-main {
          position: relative;
          overflow: clip;
          border: 1px solid rgba(213, 223, 239, 0.86);
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.99), rgba(247,250,255,0.97));
          box-shadow:
            0 30px 88px -60px rgba(8, 26, 66, 0.58),
            0 14px 36px -34px rgba(7, 88, 248, 0.38),
            inset 0 1px 0 rgba(255,255,255,0.98);
          padding: 17px;
        }

        .aci-price-feature-answer {
          position: relative;
          z-index: 2;
          margin: 0 0 12px;
        }

        .aci-price-feature-kicker {
          display: inline-flex;
          margin-bottom: 7px;
          color: #0758f8;
          font-size: 10px;
          line-height: 1;
          font-weight: 780;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .aci-price-feature-answer strong {
          display: block;
          max-width: 560px;
          color: #071142;
          font-size: clamp(19px, 2.1vw, 25px);
          line-height: 1.08;
          font-weight: 780;
          letter-spacing: -0.035em;
        }

        .aci-price-feature-answer p {
          margin: 8px 0 0;
          max-width: 560px;
          color: #53627f;
          font-size: 13.2px;
          line-height: 1.45;
          font-weight: 590;
          letter-spacing: 0;
        }

        .aci-price-feature-hero {
          margin: 6px 0 15px;
        }

        .aci-price-feature-car {
          position: relative;
          height: clamp(196px, 26vw, 260px);
          display: grid;
          place-items: center;
          overflow: visible;
          border-radius: 24px;
          background: transparent;
          isolation: isolate;
        }

        .aci-price-feature-car::after {
          content: "";
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: 3%;
          height: 12px;
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(15, 23, 42, 0.13), transparent 72%);
          filter: blur(6px);
        }

        .aci-price-feature-car img {
          position: relative;
          z-index: 1;
          width: min(98%, 455px);
          height: auto;
          max-height: 94%;
          object-fit: contain;
          object-position:
            var(--price-car-position-x, center)
            var(--price-car-position-y, center);
          transform: none;
          filter: drop-shadow(0 18px 16px rgba(15, 23, 42, 0.14));
          max-width: 100%;
          min-width: 0;
        }

        .aci-price-feature-car > .aci-price-fallback-visual {
          position: relative;
          z-index: 1;
          transform: scale(1.05);
        }

        .aci-price-feature-table {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
          margin: 0;
        }

        .aci-price-feature-row {
  min-width: 0;
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 11px;
  border: 1px solid rgba(217, 226, 241, 0.86);
  border-radius: 17px;
  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,0.97),
      rgba(248,251,255,0.94)
    );
  box-shadow:
    0 12px 28px -30px rgba(8, 26, 66, 0.34),
    inset 0 1px 0 rgba(255,255,255,0.92);
  cursor: pointer;
  text-align: left;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.aci-price-feature-row:hover,
.aci-price-feature-row:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(7, 88, 248, 0.22);
  box-shadow:
    0 18px 38px -34px rgba(7, 88, 248, 0.34),
    inset 0 1px 0 rgba(255,255,255,0.96);
  outline: none;
}

/* Entry and Top now match feature inline card tone */
.aci-price-feature-row.is-entry,
.aci-price-feature-row.is-top {
  border-color: rgba(217, 226, 241, 0.86);
  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,0.97),
      rgba(248,251,255,0.94)
    );
  box-shadow:
    0 12px 28px -30px rgba(8, 26, 66, 0.34),
    inset 0 1px 0 rgba(255,255,255,0.92);
}

.aci-price-feature-row.is-entry {
  opacity: 0.96;
}

/* Only the smart pick gets the subtle blue highlight like feature "starts here" */
.aci-price-feature-row.is-smart {
  border-color: rgba(7, 88, 248, 0.28);
  background:
    radial-gradient(
      circle at top right,
      rgba(7,88,248,0.08),
      transparent 46%
    ),
    linear-gradient(
      180deg,
      rgba(255,255,255,0.99),
      rgba(244,248,255,0.98)
    );
  box-shadow:
    0 20px 46px -38px rgba(7, 88, 248, 0.36),
    inset 0 1px 0 rgba(255,255,255,0.96);
}

.aci-price-feature-row-copy {
  min-width: 0;
}

.aci-price-feature-row-label {
  display: block;
  margin-bottom: 5px;
  color: #0758f8;
  font-size: 9.5px;
  line-height: 1;
  font-weight: 780;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aci-price-feature-row strong {
  display: block;
  min-width: 0;
  color: #071142;
  font-size: 13.2px;
  line-height: 1.18;
  font-weight: 760;
  letter-spacing: -0.01em;
  overflow: visible;
  white-space: normal;
  word-break: normal;
}

.aci-price-feature-row small {
  display: block;
  margin-top: 5px;
  color: #687694;
  font-size: 10.8px;
  line-height: 1.22;
  font-weight: 620;
}

/* New premium price text — no pill */
.aci-price-feature-row-price {
  justify-self: end;
  align-self: center;
  display: block;
  color: #0758f8;
  font-size: 12.2px;
  line-height: 1;
  font-weight: 820;
  letter-spacing: -0.025em;
  white-space: nowrap;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.aci-price-feature-row.is-top .aci-price-feature-row-price,
.aci-price-feature-row.is-entry .aci-price-feature-row-price,
.aci-price-feature-row.is-smart .aci-price-feature-row-price {
  color: #0758f8;
}

        .aci-price-feature-leads {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          overflow: visible;
        }

        .aci-price-feature-lead {
          width: auto;
          max-width: 100%;
          min-width: 0;
          min-height: 36px;
          flex: 0 0 auto;
          border: 1px solid rgba(214, 224, 240, 0.82);
          border-radius: 999px;
          padding: 6px 10px 6px 6px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.96));
          color: #071142;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          font-size: 12px;
          line-height: 1;
          font-weight: 710;
          letter-spacing: -0.01em;
          cursor: pointer;
          white-space: nowrap;
          text-align: left;
          box-shadow:
            0 12px 28px -28px rgba(7, 88, 248, 0.38);
        }

        .aci-price-feature-lead-icon {
          flex: 0 0 auto;
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #0758f8;
          background:
            radial-gradient(circle at 32% 22%, #ffffff 0 12%, transparent 34%),
            #eef5ff;
        }

        .aci-price-feature-lead-arrow {
          flex: 0 0 auto;
          margin-left: 2px;
          color: #71809d;
          font-size: 16px;
          line-height: 1;
        }

        @media (min-width: 900px) {
          .aci-price-feature-main {
            display: grid;
            grid-template-columns: minmax(270px, 0.9fr) minmax(300px, 1.1fr);
            grid-template-areas:
              "answer answer"
              "rows hero";
            column-gap: 18px;
            row-gap: 8px;
            align-items: center;
            padding: 18px 22px;
          }

          .aci-price-feature-answer {
            grid-area: answer;
            margin-bottom: 0;
          }

          .aci-price-feature-answer strong {
            font-size: 20px;
          }

          .aci-price-feature-hero {
            grid-area: hero;
            margin: 0;
          }

          .aci-price-feature-car {
            height: 232px;
          }

          .aci-price-feature-car img {
            width: min(98%, 455px);
            max-height: 94%;
          }

          .aci-price-feature-table {
            grid-area: rows;
            grid-template-columns: minmax(0, 1fr);
            align-self: center;
            gap: 7px;
          }

          .aci-price-feature-row {
            min-height: 51px;
            padding: 8px 11px;
          }
        }

        @media (max-width: 720px) {
          .aci-price-feature-card {
            width: 100%;
          }

          .aci-price-feature-main {
            border-radius: 26px;
            padding: 14px;
          }

          .aci-price-feature-hero {
            margin: 6px 0 24px;
          }

          .aci-price-feature-car {
            height: 192px;
          }

          .aci-price-feature-table {
            gap: 6px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .aci-price-feature-answer {
            margin-bottom: 4px;
          }

          .aci-price-feature-answer strong {
            font-size: 23px;
            line-height: 1.08;
            letter-spacing: -0.04em;
          }

          .aci-price-feature-answer p {
            font-size: 13px;
          }

          .aci-price-feature-row {
  min-height: 68px;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 3px;
  padding: 9px 9px 8px;
  border-radius: 17px;
}

          .aci-price-feature-row-label {
            margin-bottom: 4px;
            color: #6f7f9d;
            font-size: 8.4px;
            letter-spacing: 0.105em;
          }

          .aci-price-feature-row.is-smart .aci-price-feature-row-label {
            color: #0758f8;
          }

          .aci-price-feature-row strong {
            font-size: 11.7px;
            line-height: 1.14;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .aci-price-feature-row small {
            display: none;
          }

          .aci-price-feature-row-price {
  justify-self: start;
  margin-top: 1px;
  color: #0758f8;
  font-size: 10.4px;
  line-height: 1.05;
  font-weight: 820;
  letter-spacing: -0.015em;
  white-space: nowrap;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

          .aci-price-feature-leads {
            gap: 6px;
          }
        }

        @media (max-width: 420px) {
          .aci-price-feature-main {
            padding: 13px;
          }

          .aci-price-feature-car {
            height: 178px;
          }

          .aci-price-feature-answer strong {
            font-size: 21px;
            line-height: 1.1;
          }

          .aci-price-feature-table {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .aci-price-feature-row {
            min-height: 70px;
            padding: 9px 7px;
          }

          .aci-price-feature-row strong {
            font-size: 11.2px;
          }
        }
      `}</style>

      <article className="aci-price-feature-card">
        <section className="aci-price-feature-main">
          <div className="aci-price-feature-answer">
            <span className="aci-price-feature-kicker">
              {city} · Ex-showroom
            </span>

            <strong>{vehicleName} price list</strong>

            <p>{rangeLabel}</p>
          </div>

          <div className="aci-price-feature-hero">
            <div className="aci-price-feature-car" style={heroFrameStyle}>
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={vehicleName}
                  loading="lazy"
                  draggable="false"
                />
              ) : (
                <div className="aci-price-fallback-visual">
                  <AciVehicleVisual
                    vehicle={heroVehicle}
                    height={180}
                    stage
                    stageVariant="compact"
                  />
                </div>
              )}
            </div>
          </div>

          {picks.length ? (
            <div className="aci-price-feature-table">
              {picks.map((pick, index) => {
                const exPrice =
                  getExShowroomPriceLabel(pick.item?.row) ||
                  pick.item?.price ||
                  "";

                return (
                  <button
                    type="button"
                    className={`aci-price-feature-row is-${pick.tone}`}
                    key={`${pick.role}-${pick.item?.label || index}`}
                    onClick={() => handlePickOpen(pick, index)}
                  >
                    <div className="aci-price-feature-row-copy">
                      <span className="aci-price-feature-row-label">
                        {pick.role === "Sweet spot" ? "Smart pick" : pick.role}
                      </span>

                      <strong>{pick.item?.label}</strong>

                      {pick.item?.meta ? <small>{pick.item.meta}</small> : null}
                    </div>

                    {exPrice ? (
                      <span className="aci-price-feature-row-price">
                        {exPrice}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        {leadItems.length ? (
          <div className="aci-price-feature-leads">
            {leadItems.map((item, index) => {
              const label =
                item.label || item.title || item.query || `Next ${index + 1}`;

              return (
                <button
                  className="aci-price-feature-lead"
                  type="button"
                  key={item.id || item.label || item.query || index}
                  onClick={item.onClick}
                >
                  <span className="aci-price-feature-lead-icon">
                    <AciV2QuestionIcon
                      label={label}
                      index={item.iconIndex ?? index}
                    />
                  </span>
                  <span>{label}</span>
                  <span
                    className="aci-price-feature-lead-arrow"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </article>
    </>
  );
}

const cleanInlineColorText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeInlineHexValue = (value = "") => {
  const text = cleanInlineColorText(value).replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(text) || /^[0-9a-f]{6}$/i.test(text)) {
    return `#${text}`;
  }

  return "";
};

const normalizeInlineHexCodes = (...values) => {
  const output = [];

  const push = (value) => {
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }

    cleanInlineColorText(value)
      .split(/[,\s/|]+/)
      .map(normalizeInlineHexValue)
      .filter(Boolean)
      .forEach((hex) => {
        const key = hex.toLowerCase();

        if (!output.some((item) => item.toLowerCase() === key)) {
          output.push(hex);
        }
      });
  };

  values.forEach(push);
  return output;
};

const getInlineColorName = (color = {}, fallback = "Color") =>
  pickText(
    color.desktopName,
    color.mobileName,
    color.colorName,
    color.name,
    color.label,
    color.title,
    fallback,
  );

const getInlineColorLabel = (name = "") => {
  const clean = cleanInlineColorText(name);

  return (
    clean
      .replace(/\bwith\b.*$/i, "")
      .replace(/\blimited edition\b/gi, "Edition")
      .replace(/\btitanium black matte\b/gi, "Matte")
      .replace(/\s+/g, " ")
      .trim() || "Color"
  );
};

const getInlineColorImage = (color = {}, selectedVehicle = {}) =>
  resolveCarImageUrl(
    pickText(
      color.displayNormalizedImageUrl,
      color.display_normalized_image_url,
      color.normalizedImageUrl,
      color.cleanImageUrl,
      color.normalizedImagePngUrl,
      color.stagedImageUrl,
      color.imageUrl,
      color.carImageUrl,
      color.sourceImageUrl,
      color.vehicle?.displayNormalizedImageUrl,
      color.vehicle?.display_normalized_image_url,
      color.vehicle?.normalizedImageUrl,
      color.vehicle?.cleanImageUrl,
      color.vehicle?.stagedImageUrl,
      color.vehicle?.imageUrl,
      selectedVehicle?.displayNormalizedImageUrl,
      selectedVehicle?.normalizedImageUrl,
      selectedVehicle?.imageUrl,
    ),
  );

const getInlineColorFrame = (color = {}, selectedVehicle = {}) =>
  pickAny(
    color.imageFrame,
    color.frameMeta,
    color.displayFrameMeta,
    color.image_frame,
    color.frame_meta,
    color.carImageFrame,
    color.car_image_frame,
    color.frame,
    color.vehicle?.imageFrame,
    color.vehicle?.frameMeta,
    color.vehicle?.displayFrameMeta,
    selectedVehicle?.imageFrame,
    selectedVehicle?.frameMeta,
    selectedVehicle?.displayFrameMeta,
  );

const normalizeInlineColorRows = (rows = [], selectedVehicle = {}) => {
  const seen = new Set();

  return toArray(rows)
    .map((raw = {}, index) => {
      const name = getInlineColorName(raw, `Color ${index + 1}`);
      const imageUrl = getInlineColorImage(raw, selectedVehicle);

      if (!name || !imageUrl || /display-hero/i.test(imageUrl)) return null;

      const key = cleanInlineColorText(name).toLowerCase();
      if (!key || seen.has(key)) return null;

      seen.add(key);

      const hexCodes = normalizeInlineHexCodes(
        raw.hexCodes,
        raw.hex_codes,
        raw.dualHexCodes,
        raw.dual_hex_codes,
        raw.hex,
        raw.hexCode,
        raw.colorHex,
        raw.color_hex,
        raw.secondaryHex,
        raw.secondary_hex,
        raw.deep,
        raw.darkHex,
        raw.deepHex,
      );

      return {
        ...raw,
        id:
          pickText(raw.id, raw._id) ||
          `${key.replace(/[^a-z0-9]+/g, "-")}-${index}`,
        name,
        colorName: name,
        hex: hexCodes[0] || raw.hex || raw.hexCode || raw.colorHex || "#E5E7EB",
        deep:
          hexCodes[1] ||
          raw.secondaryHex ||
          raw.secondary_hex ||
          raw.deep ||
          raw.darkHex ||
          raw.deepHex ||
          raw.hex ||
          raw.hexCode ||
          raw.colorHex ||
          "#94A3B8",
        hexCodes,
        imageUrl,
        normalizedImageUrl: imageUrl,
        imageFrame: getInlineColorFrame(raw, selectedVehicle),
      };
    })
    .filter(Boolean);
};

const buildInlineColorOrbBackground = (color = {}) => {
  const hexCodes = normalizeInlineHexCodes(
    color.hexCodes,
    color.hex_codes,
    color.dualHexCodes,
    color.dual_hex_codes,
    color.hex,
    color.secondaryHex,
    color.deep,
  );

  const primary = hexCodes[0] || color.hex || "#E5E7EB";
  const secondary = hexCodes[1] || color.deep || color.secondaryHex || primary;

  if (
    hexCodes.length > 1 &&
    primary.toLowerCase() !== secondary.toLowerCase()
  ) {
    return `
      radial-gradient(circle at 30% 22%, rgba(255,255,255,.96), transparent 18%),
      linear-gradient(90deg, ${primary} 0 50%, ${secondary} 50% 100%)
    `;
  }

  return `
    radial-gradient(circle at 28% 20%, rgba(255,255,255,.92), transparent 18%),
    radial-gradient(circle at 42% 34%, ${primary}, ${secondary} 82%)
  `;
};

const getInlineStageFrame = (imageFrame, stageKey = "colorStudio") => {
  if (!imageFrame || typeof imageFrame !== "object") return null;

  return (
    imageFrame.stageFrames?.[stageKey] ||
    imageFrame.stages?.[stageKey] ||
    imageFrame[stageKey] ||
    imageFrame.stageFrames?.colorStudio ||
    imageFrame.stageFrames?.mobileHero ||
    imageFrame.stageFrames?.chatCard ||
    imageFrame.stageFrames?.default ||
    imageFrame
  );
};

const buildInlineColorStudioFrameStyle = (
  imageFrame,
  stageKey = "colorStudio",
) => {
  const frame = getInlineStageFrame(imageFrame, stageKey);

  const fallback = {
    "--aci-color-inline-scale": stageKey === "mobileHero" ? "1.18" : "1.12",
    "--aci-color-inline-x": "0%",
    "--aci-color-inline-y": "0%",
    "--aci-color-inline-origin": "center center",
    "--aci-color-inline-aspect": "1400 / 787",
  };

  if (!frame || typeof frame !== "object") return fallback;

  const readNumber = (...values) => {
    const value = values.find(
      (item) => item !== undefined && item !== null && item !== "",
    );

    if (typeof value === "string" && value.trim().endsWith("%")) {
      const parsed = Number(value.trim().slice(0, -1));
      return Number.isFinite(parsed) ? parsed / 100 : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, Number(value) || 0));

  const cssVars = {
    ...(imageFrame?.cssVars || {}),
    ...(frame?.cssVars || {}),
  };

  const canvasWidth = readNumber(
    frame.canvas_width,
    frame.canvasWidth,
    frame.naturalWidth,
    frame.imageWidth,
    imageFrame?.canvas_width,
    imageFrame?.canvasWidth,
    imageFrame?.naturalWidth,
    imageFrame?.imageWidth,
  );

  const canvasHeight = readNumber(
    frame.canvas_height,
    frame.canvasHeight,
    frame.naturalHeight,
    frame.imageHeight,
    imageFrame?.canvas_height,
    imageFrame?.canvasHeight,
    imageFrame?.naturalHeight,
    imageFrame?.imageHeight,
  );

  const bounds =
    frame.bounds ||
    frame.visibleBounds ||
    frame.contentBounds ||
    frame.subjectBounds ||
    frame.carBounds ||
    frame.trimBounds ||
    frame.bbox ||
    frame;

  const rawLeft = readNumber(bounds.left, bounds.x, bounds.minX);
  const rawTop = readNumber(bounds.top, bounds.y, bounds.minY);
  const rawWidth = readNumber(bounds.width, bounds.w);
  const rawHeight = readNumber(bounds.height, bounds.h);

  const looksNormalized =
    [rawLeft, rawTop, rawWidth, rawHeight].every(Number.isFinite) &&
    rawLeft >= 0 &&
    rawTop >= 0 &&
    rawWidth > 0 &&
    rawHeight > 0 &&
    rawLeft <= 1 &&
    rawTop <= 1 &&
    rawWidth <= 1 &&
    rawHeight <= 1;

  const hasPixelBounds =
    Number.isFinite(canvasWidth) &&
    Number.isFinite(canvasHeight) &&
    canvasWidth > 0 &&
    canvasHeight > 0 &&
    [rawLeft, rawTop, rawWidth, rawHeight].every(Number.isFinite) &&
    rawWidth > 0 &&
    rawHeight > 0;

  let centerX = null;
  let centerY = null;
  let widthRatio = null;
  let heightRatio = null;

  if (looksNormalized) {
    centerX = rawLeft + rawWidth / 2;
    centerY = rawTop + rawHeight / 2;
    widthRatio = rawWidth;
    heightRatio = rawHeight;
  } else if (hasPixelBounds) {
    centerX = (rawLeft + rawWidth / 2) / canvasWidth;
    centerY = (rawTop + rawHeight / 2) / canvasHeight;
    widthRatio = rawWidth / canvasWidth;
    heightRatio = rawHeight / canvasHeight;
  }

  const imageAspect =
    Number.isFinite(canvasWidth) && Number.isFinite(canvasHeight)
      ? `${canvasWidth} / ${canvasHeight}`
      : "1400 / 787";

  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(widthRatio) ||
    !Number.isFinite(heightRatio) ||
    widthRatio <= 0 ||
    heightRatio <= 0
  ) {
    return {
      ...fallback,
      "--aci-color-inline-aspect": imageAspect,
    };
  }

  const isMobile = stageKey === "mobileHero";
  const safeWidthFill = isMobile ? 0.88 : 0.94;
  const safeHeightFill = isMobile ? 0.72 : 0.82;

  const fittedScale = clamp(
    Math.min(safeWidthFill / widthRatio, safeHeightFill / heightRatio) *
      (isMobile ? 1.06 : 1.1),
    isMobile ? 0.88 : 0.92,
    isMobile ? 1.95 : 2.22,
  );

  const computedX = (0.5 - 0.5 - fittedScale * (centerX - 0.5)) * 100;
  const computedY = (0.54 - 0.5 - fittedScale * (centerY - 0.5)) * 100;

  const explicitScale = readNumber(
    cssVars["--car-frame-scale"],
    frame.scale,
    frame.zoom,
  );

  return {
    "--aci-color-inline-scale": String(explicitScale || fittedScale),
    "--aci-color-inline-x":
      cssVars["--car-frame-x"] ||
      frame.translateXPct ||
      frame.translateXPercent ||
      frame.translateX ||
      `${clamp(computedX, -36, 36)}%`,
    "--aci-color-inline-y":
      cssVars["--car-frame-y"] ||
      frame.translateYPct ||
      frame.translateYPercent ||
      frame.translateY ||
      `${clamp(computedY, -34, 28)}%`,
    "--aci-color-inline-origin":
      cssVars["--car-frame-origin"] || frame.transformOrigin || "center center",
    "--aci-color-inline-aspect": imageAspect,
  };
};

function AciInlineColorOrb({ color = {}, selected = false }) {
  return (
    <span
      className={`aci-inline-color-orb ${selected ? "is-selected" : ""}`}
      style={{ background: buildInlineColorOrbBackground(color) }}
    >
      <i />
      {selected ? <b>✓</b> : null}
    </span>
  );
}

function AciV2ColorPreviewArea({
  message = {},
  widget = {},
  rows = [],
  selectedVehicle,
  hasCanvas = false,
  actions = [],
  onOpen,
  onAction,
}) {
  const vehicle =
    pickAny(
      widget.vehicle,
      message.vehicle,
      selectedVehicle,
      rows.find((row) => row?.vehicle)?.vehicle,
      rows[0]?.vehicle,
    ) || {};

  const allColors = normalizeInlineColorRows(rows, selectedVehicle || vehicle);
  const previewColors = allColors.slice(0, 3);

  const [selectedColorId, setSelectedColorId] = useState(
    previewColors[0]?.id || allColors[0]?.id || "",
  );

  if (!allColors.length) return null;

  const selectedColor =
    allColors.find((item) => item.id === selectedColorId) ||
    previewColors[0] ||
    allColors[0];

  const selectedColorName = getInlineColorName(selectedColor);

  const vehicleName = pickText(
    widget.vehicle?.displayName,
    widget.vehicle?.fullModel,
    widget.vehicle?.model,
    widget.displayName,
    widget.model,
    widget.title,
    message.contextPatch?.selectedVehicle?.displayName,
    message.contextPatch?.selectedVehicle?.model,
    message.contextPatch?.anchorModel,
    selectedVehicle?.displayName,
    selectedVehicle?.fullModel,
    selectedVehicle?.model,
    vehicle.displayName,
    vehicle.fullModel,
    vehicle.model,
    "Selected car",
  );

  const selectedFrameStyle = buildInlineColorStudioFrameStyle(
    selectedColor.imageFrame,
    "colorStudio",
  );

  const selectedVehicleWithColor = {
    ...(selectedVehicle || vehicle || {}),
    selectedColor,
    colorName: selectedColorName,
    imageUrl: selectedColor.imageUrl,
    normalizedImageUrl: selectedColor.imageUrl,
    imageFrame: selectedColor.imageFrame,
  };

  const handleOpenColors = () => {
    if (!hasCanvas || typeof onOpen !== "function") return;

    onOpen({
      ...message,
      widget: {
        ...widget,
        selectedColor,
      },
      contextPatch: {
        ...(message.contextPatch || {}),
        selectedColor,
        selectedVehicle: selectedVehicleWithColor,
      },
    });
  };

  const defaultColorActions = [
    {
      id: "color-best",
      label: "Which color looks best?",
      query: `Which ${vehicleName} color looks best?`,
    },
    {
      id: "color-maintain",
      label: "Easiest to maintain?",
      query: `Which ${vehicleName} color is easiest to maintain?`,
    },
    {
      id: "color-quote",
      label: "Get quotation",
      query: `Get quotation for ${vehicleName} in ${selectedColorName}`,
    },
  ];

  const leadItems = (actions.length ? actions : defaultColorActions)
    .slice(0, 4)
    .map((item, index) => ({
      ...item,
      iconIndex: index,
      onClick: () =>
        onAction?.({
          ...item,
          label: item.label || item.title || item.query,
          query: item.query || item.label || item.title,
          vehicle: selectedVehicleWithColor,
          contextPatch: {
            ...buildVehicleContextPatch({
              vehicle: selectedVehicleWithColor,
              includeVariant: false,
            }),
            ...(message.contextPatch || {}),
            selectedColor,
          },
        }),
    }));

  return (
    <>
      <style>{`
        .aci-color-inline-card {
          width: min(100%, 760px);
          color: #071142;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .aci-color-inline-main {
          position: relative;
          overflow: clip;
          border: 1px solid rgba(213, 223, 239, 0.86);
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.99), rgba(247,250,255,0.97));
          box-shadow:
            0 30px 88px -60px rgba(8, 26, 66, 0.58),
            0 14px 36px -34px rgba(7, 88, 248, 0.38),
            inset 0 1px 0 rgba(255,255,255,0.98);
          padding: 17px;
        }

        .aci-color-inline-answer {
          position: relative;
          z-index: 2;
          margin: 0 0 12px;
        }

        .aci-color-inline-kicker {
          display: inline-flex;
          margin-bottom: 7px;
          color: #0758f8;
          font-size: 10px;
          line-height: 1;
          font-weight: 780;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .aci-color-inline-answer strong {
          display: block;
          color: #071142;
          font-size: clamp(19px, 2.1vw, 25px);
          line-height: 1.08;
          font-weight: 780;
          letter-spacing: -0.035em;
        }

        .aci-color-inline-answer p {
          margin: 8px 0 0;
          color: #53627f;
          font-size: 13.2px;
          line-height: 1.45;
          font-weight: 590;
        }

        .aci-color-inline-hero {
  margin: 2px 0 10px;
}

.aci-color-inline-car {
  position: relative;
  height: clamp(228px, 31vw, 292px);
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 26px;
  background:
    radial-gradient(circle at 58% 44%, rgba(255,255,255,.62), transparent 28%),
    radial-gradient(circle at 50% 78%, rgba(220,232,249,.34), transparent 30%),
    linear-gradient(180deg, rgba(247,250,255,.52), rgba(247,250,255,.12));
  isolation: isolate;
}

.aci-color-inline-car::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 100%, rgba(173,189,214,.13), transparent 24%);
}

.aci-color-inline-car::after {
  content: "";
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 4%;
  height: 14px;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(15, 23, 42, 0.14), transparent 72%);
  filter: blur(7px);
}

.aci-color-inline-car-window {
  position: relative;
  z-index: 1;
  width: min(112%, 560px);
  max-width: 112%;
  height: 100%;
  max-height: 278px;
  aspect-ratio: var(--aci-color-inline-aspect, 1400 / 787);
  display: grid;
  place-items: center;
  overflow: hidden;
  -webkit-mask-image: radial-gradient(
    ellipse at center,
    rgba(0,0,0,1) 68%,
    rgba(0,0,0,.96) 82%,
    rgba(0,0,0,0) 100%
  );
  mask-image: radial-gradient(
    ellipse at center,
    rgba(0,0,0,1) 68%,
    rgba(0,0,0,.96) 82%,
    rgba(0,0,0,0) 100%
  );
}

.aci-color-inline-car img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center center;
  transform-origin: var(--aci-color-inline-origin, center center);
  transform:
    translate(var(--aci-color-inline-x, 0%), var(--aci-color-inline-y, 0%))
    scale(var(--aci-color-inline-scale, 1.12));
  filter: drop-shadow(0 20px 18px rgba(15, 23, 42, 0.13));
  user-select: none;
  will-change: opacity, filter;
}

.aci-color-inline-swatches {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 13px;
  margin: 2px 0 0;
}

.aci-color-inline-row {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  text-align: left;
  transition: transform 180ms ease, opacity 180ms ease;
}

.aci-color-inline-row:hover,
.aci-color-inline-row:focus-visible {
  transform: translateY(-1px);
  opacity: 1;
  outline: none;
  border: 0;
  box-shadow: none;
}

.aci-color-inline-row.is-active {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.aci-color-inline-row-label {
  display: none;
}

.aci-color-inline-row strong {
  display: block;
  min-width: 0;
  color: #071142;
  font-size: 14px;
  line-height: 1.16;
  font-weight: 730;
  letter-spacing: -0.012em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.aci-color-inline-row.is-active strong {
  font-weight: 800;
}

        .aci-inline-color-orb {
          position: relative;
          width: 35px;
          height: 35px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.86);
          box-shadow:
            inset 0 8px 13px rgba(255,255,255,.30),
            inset 0 -12px 20px rgba(15,23,42,.30),
            0 18px 34px -25px rgba(15,23,42,.72);
        }

        .aci-inline-color-orb i {
          position: absolute;
          left: 18%;
          top: 13%;
          width: 28%;
          height: 28%;
          border-radius: 999px;
          background: rgba(255,255,255,.78);
          filter: blur(1.8px);
        }

        .aci-inline-color-orb.is-selected {
          box-shadow:
            0 0 0 3px #fff,
            0 0 0 5px #0758f8,
            inset 0 8px 16px rgba(255,255,255,.35),
            inset 0 -13px 22px rgba(15,23,42,.24),
            0 20px 44px -28px rgba(37,99,235,.8);
        }

        .aci-inline-color-orb b {
          position: absolute;
          right: -6px;
          bottom: -5px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #3b82f6, #1455ef);
          color: #fff;
          display: grid;
          place-items: center;
          border: 2px solid #fff;
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          box-shadow: 0 10px 18px -10px rgba(37,99,235,.7);
        }

        .aci-color-inline-row-copy {
          min-width: 0;
        }

        
        .aci-color-inline-view-all {
          margin: 10px 0 0;
          width: 100%;
          min-height: 34px;
          border: 1px solid rgba(214, 224, 240, 0.82);
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.96));
          color: #0758f8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          line-height: 1;
          font-weight: 780;
          letter-spacing: -0.01em;
          cursor: pointer;
          box-shadow: 0 12px 28px -28px rgba(7, 88, 248, 0.38);
        }

        .aci-price-feature-leads {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          overflow: visible;
        }

        .aci-price-feature-lead {
          width: auto;
          max-width: 100%;
          min-width: 0;
          min-height: 36px;
          flex: 0 0 auto;
          border: 1px solid rgba(214, 224, 240, 0.82);
          border-radius: 999px;
          padding: 6px 10px 6px 6px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.96));
          color: #071142;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          font-size: 12px;
          line-height: 1;
          font-weight: 710;
          letter-spacing: -0.01em;
          cursor: pointer;
          white-space: nowrap;
          text-align: left;
          box-shadow:
            0 12px 28px -28px rgba(7, 88, 248, 0.38);
        }

        .aci-price-feature-lead-icon {
          flex: 0 0 auto;
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #0758f8;
          background:
            radial-gradient(circle at 32% 22%, #ffffff 0 12%, transparent 34%),
            #eef5ff;
        }

        .aci-price-feature-lead-arrow {
          flex: 0 0 auto;
          margin-left: 2px;
          color: #71809d;
          font-size: 16px;
          line-height: 1;
        }

        @media (min-width: 900px) {
          .aci-color-inline-main {
            display: grid;
            grid-template-columns: minmax(270px, 0.9fr) minmax(300px, 1.1fr);
            grid-template-areas:
              "answer answer"
              "swatches hero";
            column-gap: 18px;
            row-gap: 8px;
            align-items: center;
            padding: 18px 22px;
          }

          .aci-color-inline-answer {
            grid-area: answer;
            margin-bottom: 0;
          }

          .aci-color-inline-answer strong {
            font-size: 20px;
          }

          .aci-color-inline-hero {
            grid-area: hero;
            margin: 0;
          }

          .aci-color-inline-car {
            height: 232px;
          }

          .aci-color-inline-swatches-wrap {
            grid-area: swatches;
          }
        }

        @media (max-width: 720px) {
          .aci-color-inline-card {
            width: 100%;
          }

          .aci-color-inline-main {
            border-radius: 26px;
            padding: 14px;
          }

          .aci-color-inline-answer {
            margin-bottom: 4px;
          }

          .aci-color-inline-answer strong {
            font-size: 23px;
            line-height: 1.08;
            letter-spacing: -0.04em;
          }

          .aci-color-inline-answer p {
            font-size: 13px;
          }

          .aci-color-inline-hero {
  margin: 0 0 6px;
}

.aci-color-inline-car {
  height: 196px;
  align-items: end;
  border-radius: 24px;
}

.aci-color-inline-car-window {
  width: min(118%, 410px);
  max-width: 118%;
  max-height: 196px;
}

.aci-color-inline-car img {
  transform:
    translate(var(--aci-color-inline-x, 0%), var(--aci-color-inline-y, 0%))
    scale(var(--aci-color-inline-scale, 1.18));
}

.aci-color-inline-swatches {
  gap: 10px 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 6px;
}

.aci-color-inline-row {
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  text-align: center;
  gap: 8px;
  padding: 0;
}

.aci-inline-color-orb {
  width: 34px;
  height: 34px;
}

.aci-color-inline-row-label {
  display: none;
}

.aci-color-inline-row strong {
  font-size: 11.3px;
  line-height: 1.14;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

          .aci-color-inline-view-all {
            min-height: 33px;
            margin-top: 9px;
            font-size: 11.5px;
          }

          .aci-price-feature-leads {
            gap: 7px;
          }

          .aci-price-feature-lead {
            min-height: 34px;
            padding: 6px 9px 6px 6px;
            font-size: 11.5px;
          }
        }

        @media (max-width: 390px) {
          .aci-color-inline-car {
  height: 184px;
}

.aci-color-inline-car-window {
  max-height: 184px;
}

.aci-color-inline-row {
  padding: 0;
}

.aci-color-inline-row strong {
  font-size: 10.8px;
}
        }
      `}</style>

      <article className="aci-color-inline-card">
        <section className="aci-color-inline-main">
          <div className="aci-color-inline-answer">
            <span className="aci-color-inline-kicker">Exterior colors</span>

            <strong>{vehicleName} colors</strong>

            <p>
              {selectedColorName} selected · {allColors.length} live colors
            </p>
          </div>

          <div className="aci-color-inline-hero">
            <div className="aci-color-inline-car" style={selectedFrameStyle}>
              <motion.div
                key={selectedColor.id}
                className="aci-color-inline-car-window"
                initial={{
                  opacity: 0.78,
                  filter: "blur(2px)",
                }}
                animate={{
                  opacity: 1,
                  filter: "blur(0px)",
                }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <img
                  src={selectedColor.imageUrl}
                  alt={`${vehicleName} in ${selectedColorName}`}
                  loading="lazy"
                  draggable="false"
                />
              </motion.div>
            </div>
          </div>

          <div className="aci-color-inline-swatches-wrap">
            <div className="aci-color-inline-swatches">
              {previewColors.map((color, index) => {
                const active = color.id === selectedColor.id;
                const colorName = getInlineColorName(
                  color,
                  `Color ${index + 1}`,
                );

                return (
                  <motion.button
                    type="button"
                    key={color.id || colorName || index}
                    className={`aci-color-inline-row ${
                      active ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedColorId(color.id)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <AciInlineColorOrb color={color} selected={active} />

                    <span className="aci-color-inline-row-copy">
                      <strong>{getInlineColorLabel(colorName)}</strong>
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {hasCanvas ? (
              <button
                type="button"
                className="aci-color-inline-view-all"
                onClick={handleOpenColors}
              >
                View all {allColors.length} colors
                <span aria-hidden="true">›</span>
              </button>
            ) : null}
          </div>
        </section>

        {leadItems.length ? (
          <div className="aci-price-feature-leads">
            {leadItems.map((item, index) => {
              const label =
                item.label || item.title || item.query || `Next ${index + 1}`;

              return (
                <button
                  className="aci-price-feature-lead"
                  type="button"
                  key={item.id || item.label || item.query || index}
                  onClick={item.onClick}
                >
                  <span className="aci-price-feature-lead-icon">
                    <AciV2QuestionIcon
                      label={label}
                      index={item.iconIndex ?? index}
                    />
                  </span>

                  <span>{label}</span>

                  <span
                    className="aci-price-feature-lead-arrow"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </article>
    </>
  );
}


  const getCanvasRows = ({
    widget,
    canvasType,
    isColorResult,
    isFeatureResult,
  }) => {
    if (isColorResult) {
      return toArray(
        widget.colors || widget.rows || widget.items || widget.records,
      );
    }

    if (isFeatureResult) {
      return getFeaturePreviewRows(widget, canvasType);
    }

    return getWidgetRows(widget);
  };

  

export default function AciV2CanvasPreviewCard({
  message = {},
  selectedVehicle,
  onAction,
  onOpen,
}) {
  const widget = message.widget || {};
  const canvasType =
    message.canvasType || widget.canvasType || widget.__rawCanvasType || "";
  const isColorResult = isColorCanvas(widget, canvasType);
  const isPriceResult = isPriceCanvas(widget, canvasType);
  const isFeatureResult = isFeatureCanvasWidget(widget, canvasType);
  const rows = getCanvasRows({
    widget,
    canvasType,
    isColorResult,
    isFeatureResult,
  });
  const hasCanvas = Boolean(canvasType);
  const openCanvasLabel =
    canvasType === "pricelist_canvas" || canvasType === "price_breakup_canvas"
      ? "Open Pricelist"
      : `Open ${canvasTypeLabel(canvasType)}`;
  const actions = buildChatSuggestions({ widget, message, limit: 4 });
  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const maxCarouselIndex = Math.max(0, rows.length - 1);
  const carouselProgress =
    maxCarouselIndex > 0 ? carouselIndex / maxCarouselIndex : 0;

  const getCarouselStep = () => {
    const scroller = carouselRef.current;
    if (!scroller) return 0;

    const firstCard = scroller.querySelector(".aci-chat-preview-card");
    if (!firstCard) return 0;

    const styles = window.getComputedStyle(scroller);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;

    return firstCard.getBoundingClientRect().width + gap;
  };

  const handleCarouselScroll = () => {
    const scroller = carouselRef.current;
    if (!scroller) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = Math.max(
      0,
      Math.min(maxCarouselIndex, Math.round(scroller.scrollLeft / step)),
    );

    setCarouselIndex(nextIndex);
  };

  const snapCarouselToNearest = () => {
    const scroller = carouselRef.current;
    if (!scroller) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = Math.max(
      0,
      Math.min(maxCarouselIndex, Math.round(scroller.scrollLeft / step)),
    );

    scroller.scrollTo({
      left: step * nextIndex,
      behavior: "smooth",
    });

    setCarouselIndex(nextIndex);
  };

  const handleCarouselIndicatorClick = () => {
    const scroller = carouselRef.current;
    if (!scroller || maxCarouselIndex <= 0) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = carouselIndex >= maxCarouselIndex ? 0 : carouselIndex + 1;

    scroller.scrollTo({
      left: step * nextIndex,
      behavior: "smooth",
    });

    setCarouselIndex(nextIndex);
  };

  const handleOpenCanvas = () => {
    if (!hasCanvas || typeof onOpen !== "function") return;
    onOpen(message);
  };

  return (
    <article
      className={`aci-chat-result-card ${
        isColorResult ? "aci-chat-color-result-card" : ""
      }`}
    >
      {rows.length ? (
        <>
          {isPriceResult ? (
            <AciV2PricePreviewArea
              message={message}
              widget={widget}
              rows={rows}
              selectedVehicle={selectedVehicle}
              hasCanvas={hasCanvas}
              openCanvasLabel={openCanvasLabel}
              actions={actions}
              onOpen={onOpen}
              onAction={onAction}
            />
          ) : isColorResult ? (
            <AciV2ColorPreviewArea
              message={message}
              widget={widget}
              rows={rows}
              selectedVehicle={selectedVehicle}
              hasCanvas={hasCanvas}
              actions={actions}
              onOpen={onOpen}
              onAction={onAction}
            />
          ) : (
            <>
              <div
                className="aci-chat-result-rows"
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                onTouchEnd={snapCarouselToNearest}
                onMouseUp={snapCarouselToNearest}
              >
                {rows.map((row, index) => {
                  const rowTitle = isColorResult
                    ? pickText(
                        row.colorName,
                        row.name,
                        row.desktopName,
                        row.mobileName,
                        row.title,
                        row.label,
                        `Color ${index + 1}`,
                      )
                    : isFeatureResult
                      ? pickText(
                          row.variant,
                          row.variantName,
                          row.label,
                          row.name,
                          row.matchedFeature,
                          row.feature,
                          `Feature option ${index + 1}`,
                        )
                      : pickText(
                          row.variant,
                          row.name,
                          row.title,
                          row.label,
                          row.model,
                          `Option ${index + 1}`,
                        );

                  const rowSub = isColorResult
                    ? ""
                    : isFeatureResult
                      ? pickText(
                          row.section,
                          row.feature,
                          row.matchedFeature,
                          [
                            row.availableCount
                              ? `${row.availableCount} available`
                              : "",
                            row.featureCount
                              ? `${row.featureCount} features`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" / "),
                        )
                      : pickText(
                          row.subtitle,
                          row.fuelTransmission,
                          [row.fuel, row.transmission]
                            .filter(Boolean)
                            .join(" / "),
                        );

                  const rowPrice = isColorResult
                    ? ""
                    : isFeatureResult
                      ? formatFeaturePreviewPrice(row)
                      : pickText(
                          row.price,
                          row.priceRange,
                          row.onRoadPrice,
                          row.exShowroomPrice,
                          row.value,
                        );

                  const rowImageFrame = isColorResult
                    ? pickAny(
                        row.displayFrameMeta,
                        row.display_frame_meta,
                        row.imageFrame,
                        row.frameMeta,
                        row.frame_meta,
                        row.image_frame,
                        row.carImageFrame,
                        row.car_image_frame,
                        row.frame,
                        row.vehicle?.displayFrameMeta,
                        row.vehicle?.display_frame_meta,
                        row.vehicle?.imageFrame,
                        row.vehicle?.frameMeta,
                        row.vehicle?.frame_meta,
                        row.vehicle?.carImageFrame,
                        row.vehicle?.frame,
                        selectedVehicle?.displayFrameMeta,
                        selectedVehicle?.imageFrame,
                        selectedVehicle?.frameMeta,
                      )
                    : pickAny(
                        row.vehicle?.imageFrame,
                        row.vehicle?.frameMeta,
                        row.vehicle?.frame_meta,
                        row.imageFrame,
                        row.frameMeta,
                        row.frame_meta,
                        row.frame,
                        selectedVehicle?.imageFrame,
                        selectedVehicle?.frameMeta,
                        selectedVehicle?.displayFrameMeta,
                      );

                  const rowImageUrl = isColorResult
                    ? pickText(
                        row.displayNormalizedImageUrl,
                        row.display_normalized_image_url,
                        row.vehicle?.displayNormalizedImageUrl,
                        row.vehicle?.display_normalized_image_url,
                        row.normalizedImageUrl,
                        row.cleanImageUrl,
                        row.normalizedImagePngUrl,
                        row.stagedImageUrl,
                        row.imageUrl,
                        row.carImageUrl,
                        row.sourceImageUrl,
                        row.vehicle?.normalizedImageUrl,
                        row.vehicle?.cleanImageUrl,
                        row.vehicle?.normalizedImagePngUrl,
                        row.vehicle?.stagedImageUrl,
                        row.vehicle?.imageUrl,
                        selectedVehicle?.displayNormalizedImageUrl,
                        selectedVehicle?.normalizedImageUrl,
                        selectedVehicle?.imageUrl,
                      )
                    : "";

                  const frameStyle = isColorResult
                    ? buildInlineColorFrameStyle(rowImageFrame || {})
                    : rowImageFrame
                      ? buildChatImageFrameStyle(rowImageFrame, "chatCard")
                      : {};

                  const priceContext =
                    row.exShowroomPrice &&
                    !row.onRoadPrice &&
                    !row.price &&
                    !row.priceRange &&
                    !row.value
                      ? "Ex-showroom"
                      : "On-road";

                  return (
                    <motion.button
                      type="button"
                      className={`aci-chat-preview-card ${
                        isColorResult ? "is-color-card" : ""
                      } ${isFeatureResult ? "is-feature-card" : ""}`}
                      key={row.id || row._id || rowTitle || index}
                      aria-label={`View ${rowTitle}`}
                      initial={{ opacity: 0, y: 12, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      whileHover={{ y: -3, scale: 1.012 }}
                      whileTap={{ scale: 0.985 }}
                      transition={{
                        duration: 0.38,
                        ease: [0.22, 1, 0.36, 1],
                        delay: Math.min(index * 0.045, 0.12),
                      }}
                      onClick={() => {
                        if (hasCanvas && typeof onOpen === "function") {
                          onOpen({
                            ...message,
                            widget: {
                              ...widget,
                              selectedRow: row,
                              selectedRowIndex: index,
                            },
                          });
                          return;
                        }

                        const nextVehicle = isColorResult
                          ? {
                              ...(selectedVehicle || {}),
                              selectedColor: row,
                              colorName: rowTitle,
                              imageUrl: rowImageUrl,
                              normalizedImageUrl: rowImageUrl,
                              imageFrame: rowImageFrame,
                            }
                          : row.vehicle || selectedVehicle;

                        onAction?.({
                          id: `chat-preview-row-${index}`,
                          label: rowTitle,
                          query: row.query || rowTitle,
                          vehicle: nextVehicle,
                          contextPatch: {
                            ...buildVehicleContextPatch({
                              vehicle: nextVehicle,
                              includeVariant: false,
                            }),
                            selectedColor: isColorResult ? row : undefined,
                          },
                        });
                      }}
                    >
                      <div className="aci-chat-row-visual" style={frameStyle}>
                        <motion.div
                          className="aci-chat-row-car-motion"
                          initial={{ opacity: 0, y: 10, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.52,
                            ease: [0.19, 1, 0.22, 1],
                            delay: Math.min(index * 0.055, 0.16),
                          }}
                        >
                          {isColorResult && rowImageUrl ? (
                            <img
                              className="aci-chat-color-card-image"
                              src={rowImageUrl}
                              alt={rowTitle}
                              loading="lazy"
                              draggable="false"
                            />
                          ) : isFeatureResult ? (
                            <div className="aci-chat-feature-preview-icon">
                              <AciV2QuestionIcon
                                label={rowTitle}
                                index={index}
                              />
                              <strong>
                                {firstValue(
                                  row.availableCount,
                                  row.matchedVariantCount,
                                  row.featureCount,
                                  "Y",
                                )}
                              </strong>
                            </div>
                          ) : (
                            <AciVehicleVisual
                              vehicle={row.vehicle || row}
                              height={112}
                              stage
                              stageVariant="compact"
                            />
                          )}
                        </motion.div>
                      </div>

                      <div className="aci-chat-row-copy">
                        <strong>{rowTitle}</strong>

                        {!isColorResult && rowSub ? (
                          <span>{rowSub}</span>
                        ) : null}

                        {!isColorResult && rowPrice ? (
                          <b className="aci-chat-row-price">
                            <span className="aci-chat-price-context">
                              {priceContext}
                            </span>
                            <span className="aci-chat-price-amount">
                              {formatIndianPrice(rowPrice)}
                            </span>
                          </b>
                        ) : null}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {rows.length > 2 ? (
                <button
                  type="button"
                  className="aci-chat-carousel-indicator"
                  style={{ "--aci-carousel-progress": carouselProgress }}
                  onClick={handleCarouselIndicatorClick}
                  aria-label="Show more car options"
                >
                  <span />
                  <i />
                </button>
              ) : null}
            </>
          )}
        </>
      ) : (
        <div className="aci-chat-result-skeleton">
          <i />
          <i />
          <i />
        </div>
      )}

      {!isPriceResult && !isColorResult && (hasCanvas || actions.length) ? (
        <footer>
          {hasCanvas ? (
            <button
              type="button"
              className="aci-chat-open-canvas-pill"
              onClick={handleOpenCanvas}
            >
              <AciV2QuestionIcon label={openCanvasLabel} index={0} />
              <span>{openCanvasLabel}</span>
            </button>
          ) : null}

          {actions.map((item, index) => {
            const label =
              item.label || item.title || item.query || `Next ${index + 1}`;

            return (
              <button
                type="button"
                key={item.id || item.label || item.query || index}
                onClick={() => onAction?.(item)}
              >
                <AciV2QuestionIcon label={label} index={index + 1} />
                <span>{label}</span>
              </button>
            );
          })}
        </footer>
      ) : null}
    </article>
  );
}
