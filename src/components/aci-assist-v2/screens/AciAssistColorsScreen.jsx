import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Droplets,
  Info,
  ListChecks,
  Palette,
  Sparkles,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../shared/aciV2Constants";
import { AciComposer, AciLogo, emitAciAction } from "../shared/AciAssistShared";
import CarImageStage from "../shared/CarImageStage";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";

const TOOL_NAME = "vehicle_colors";

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(7px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.052,
      delayChildren: 0.02,
    },
  },
};

const cleanText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const makeSlug = (value = "", fallback = "item") =>
  cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const hasMeaningfulObject = (value) =>
  value && typeof value === "object" && Object.keys(value).length > 0;

const prettifyVehicleTitle = (value = "") =>
  cleanText(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bI20\b/g, "i20")
    .replace(/\s+/g, " ")
    .trim();

const getVehicleTitle = (vehicle = {}) => {
  const display = cleanText(vehicle.displayName || vehicle.name);
  if (display) return prettifyVehicleTitle(display);

  const joined = [vehicle.brand || vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");

  return prettifyVehicleTitle(joined) || "Selected car";
};

const getVehicleModel = (vehicle = {}) =>
  cleanText(vehicle.model || vehicle.modelName || getVehicleTitle(vehicle)) ||
  "Selected car";

const getColorName = (color = {}) => {
  const safeColor = hasMeaningfulObject(color) ? color : {};

  return (
    cleanText(
      safeColor.desktopName ||
        safeColor.mobileName ||
        safeColor.colorName ||
        safeColor.name ||
        safeColor.label,
    ) || "Selected color"
  );
};

const getColorLabel = (name = "") => {
  const clean = cleanText(name);
  if (!clean) return "Color";

  return clean
    .replace(/\bwith\b.*$/i, "")
    .replace(/\blimited edition\b/gi, "Edition")
    .replace(/\btitanium black matte\b/gi, "Matte")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeHexValue = (value = "") => {
  const text = cleanText(value).replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(text) || /^[0-9a-f]{6}$/i.test(text)) {
    return `#${text}`;
  }

  return "";
};

const normalizeHexCodes = (...values) => {
  const output = [];

  const push = (value) => {
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }

    cleanText(value)
      .split(/[,\s/|]+/)
      .map(normalizeHexValue)
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

const normalizeImageUrl = (raw = {}) =>
  raw.displayNormalizedImageUrl ||
  raw.normalizedImageUrl ||
  raw.cleanImageUrl ||
  raw.stagedImageUrl ||
  raw.normalizedImagePngUrl ||
  raw.imageUrl ||
  raw.carImageUrl ||
  "";

const pickImageFrame = (raw = {}) => {
  const frame =
    raw.imageFrame ||
    raw.frameMeta ||
    raw.displayFrameMeta ||
    raw.image_frame ||
    raw.carImageFrame ||
    raw.car_image_frame ||
    raw.frame ||
    null;

  return hasMeaningfulObject(frame) ? frame : null;
};

const isStagePhotoColor = (raw = {}) =>
  raw.isStudioBackground === true ||
  raw.imageModeUsed === "stage-only" ||
  raw.imageMode === "stage-only" ||
  raw.imageBackgroundRemoved === false ||
  raw.imageProcessingMethod === "aci-stage-original";

const isHeroImage = (url = "") => /display-hero/i.test(String(url || ""));

const normalizeColors = (vehicle = {}, widget = {}, data = {}) => {
  const source =
    widget?.colors ||
    widget?.rows ||
    widget?.records ||
    widget?.items ||
    widget?.data?.colors ||
    data?.colors ||
    data?.rows ||
    data?.records ||
    data?.items ||
    data?.visualGallery ||
    data?.widget?.colors ||
    data?.widgets?.[0]?.colors ||
    vehicle?.colors ||
    vehicle?.availableColors ||
    [];

  if (!Array.isArray(source) || !source.length) return [];

  const seen = new Set();

  return source
    .map((raw = {}, index) => {
      const name =
        cleanText(
          raw.colorName ||
            raw.name ||
            raw.desktopName ||
            raw.mobileName ||
            raw.label,
        ) || `Color ${index + 1}`;

      const normalizedImageUrl = normalizeImageUrl(raw);

      if (!normalizedImageUrl || isHeroImage(normalizedImageUrl)) return null;

      const dedupeKey = name.toLowerCase();

      if (!dedupeKey || dedupeKey === "display") return null;
      if (seen.has(dedupeKey)) return null;

      seen.add(dedupeKey);

      const hexCodes = normalizeHexCodes(
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

      const id =
        cleanText(raw.id || raw._id) ||
        makeSlug(`${name}-${normalizedImageUrl}`, `color-${index + 1}`);

      const imageFrame = pickImageFrame(raw);

      return {
        ...raw,

        id,
        name,
        colorName: name,
        mobileName: raw.mobileName || raw.name || raw.colorName || name,
        desktopName: raw.desktopName || raw.name || raw.colorName || name,

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

        imageUrl: normalizedImageUrl,
        normalizedImageUrl,
        cleanImageUrl: raw.cleanImageUrl || normalizedImageUrl,
        stagedImageUrl: raw.stagedImageUrl || normalizedImageUrl,
        sourceImageUrl: raw.sourceImageUrl || raw.source_image_url || "",

        imageFrame,
        frameMeta: raw.frameMeta || raw.imageFrame || imageFrame || null,
        frameMethod:
          raw.frameMethod ||
          raw.frameMeta?.frameMethod ||
          raw.imageFrame?.frameMethod ||
          raw.imageFrame?.bounds?.frameMethod ||
          "",

        imageModeUsed: raw.imageModeUsed || raw.imageMode || "",
        imageProcessingMethod: raw.imageProcessingMethod || "",
        isStudioBackground: raw.isStudioBackground === true,
        imageBackgroundRemoved:
          raw.imageBackgroundRemoved === true
            ? true
            : raw.imageBackgroundRemoved === false
              ? false
              : undefined,
        isStagePhoto: isStagePhotoColor(raw),
        imageQualityWarnings: Array.isArray(raw.imageQualityWarnings)
          ? raw.imageQualityWarnings
          : [],

        description:
          raw.description ||
          raw.note ||
          raw.summary ||
          "Color availability may vary by variant and city.",

        hasPopularity:
          raw.hasPopularity === true ||
          raw.votes !== undefined ||
          raw.popularity !== undefined ||
          raw.popularityScore !== undefined,
        votes:
          Number(raw.votes ?? raw.popularity ?? raw.popularityScore ?? 0) || 0,
      };
    })
    .filter(Boolean);
};

const getResolvedWidget = (widget, data) =>
  widget || data?.widget || data?.widgets?.[0] || data?.payload?.widget || {};

const findPreferredSelectedColorId = (colors = [], widget = {}, data = {}) => {
  const selected =
    widget?.selectedColor ||
    widget?.vehicle?.selectedColor ||
    data?.selectedColor ||
    data?.vehicle?.selectedColor ||
    data?.contextPatch?.selectedColor ||
    null;

  if (!selected) return colors[0]?.id || "";

  const selectedId = cleanText(selected.id || selected._id);

  if (selectedId) {
    const byId = colors.find((item) => String(item.id) === selectedId);
    if (byId) return byId.id;
  }

  const selectedName = cleanText(
    selected.colorName ||
      selected.name ||
      selected.desktopName ||
      selected.mobileName,
  ).toLowerCase();

  if (selectedName) {
    const byName = colors.find(
      (item) =>
        cleanText(
          item.colorName || item.name || item.desktopName || item.mobileName,
        ).toLowerCase() === selectedName,
    );

    if (byName) return byName.id;
  }

  return colors[0]?.id || "";
};

const buildOrbBackground = (color = {}) => {
  const hexCodes = normalizeHexCodes(
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

const getStageFrame = (imageFrame, stageKey = "colorStudio") => {
  if (!imageFrame || typeof imageFrame !== "object") return null;

  return (
    imageFrame.stageFrames?.[stageKey] ||
    imageFrame.stages?.[stageKey] ||
    imageFrame[stageKey] ||
    imageFrame.stageFrames?.colorStudio ||
    imageFrame.stageFrames?.overviewHero ||
    imageFrame.stageFrames?.mobileHero ||
    imageFrame.stageFrames?.chatCard ||
    imageFrame.stageFrames?.default ||
    imageFrame
  );
};

const buildImageFrameStyle = (imageFrame, stageKey = "colorStudio") => {
  const frame = getStageFrame(imageFrame, stageKey);

  if (!frame || typeof frame !== "object") {
    return {};
  }

  const pickFirst = (...values) =>
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    );

  const readNumber = (...values) => {
    const value = pickFirst(...values);

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
    frame.sourceWidth,
    imageFrame?.canvas_width,
    imageFrame?.canvasWidth,
    imageFrame?.naturalWidth,
    imageFrame?.imageWidth,
    imageFrame?.sourceWidth,
  );

  const canvasHeight = readNumber(
    frame.canvas_height,
    frame.canvasHeight,
    frame.naturalHeight,
    frame.imageHeight,
    frame.sourceHeight,
    imageFrame?.canvas_height,
    imageFrame?.canvasHeight,
    imageFrame?.naturalHeight,
    imageFrame?.imageHeight,
    imageFrame?.sourceHeight,
  );

  const bounds =
    frame.bounds ||
    frame.visibleBounds ||
    frame.visibleBox ||
    frame.contentBounds ||
    frame.contentBox ||
    frame.subjectBounds ||
    frame.carBounds ||
    frame;

  const rawLeft = readNumber(bounds.left, bounds.x, bounds.minX);
  const rawTop = readNumber(bounds.top, bounds.y, bounds.minY);
  const rawWidth = readNumber(bounds.width, bounds.w);
  const rawHeight = readNumber(bounds.height, bounds.h);

  const hasPixelBounds =
    Number.isFinite(canvasWidth) &&
    Number.isFinite(canvasHeight) &&
    canvasWidth > 0 &&
    canvasHeight > 0 &&
    Number.isFinite(rawLeft) &&
    Number.isFinite(rawTop) &&
    Number.isFinite(rawWidth) &&
    Number.isFinite(rawHeight) &&
    rawWidth > 0 &&
    rawHeight > 0;

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

  const hasBounds =
    Number.isFinite(centerX) &&
    Number.isFinite(centerY) &&
    Number.isFinite(widthRatio) &&
    Number.isFinite(heightRatio) &&
    widthRatio > 0 &&
    heightRatio > 0;

  const imageAspect =
    Number.isFinite(canvasWidth) && Number.isFinite(canvasHeight)
      ? `${canvasWidth} / ${canvasHeight}`
      : "1400 / 787";

  if (!hasBounds) {
    return {
      "--aci-car-frame-scale": stageKey === "mobileHero" ? "1.18" : "1.12",
      "--aci-car-frame-x": "0%",
      "--aci-car-frame-y": "0%",
      "--aci-car-frame-origin": "center center",
      "--aci-image-aspect": imageAspect,
    };
  }

  const isMobile = stageKey === "mobileHero";

  const targetCenterX = 0.5;
  const targetCenterY = isMobile ? 0.54 : 0.54;

  /*
  Safe contain logic:
  - Laptop should feel large but stay inside the card.
  - Mobile must never overflow the rounded container.
  - FrameMeta still controls the real subject fit.
*/
  const safeWidthFill = isMobile ? 0.88 : 0.94;
  const safeHeightFill = isMobile ? 0.72 : 0.82;

  const widthScale = safeWidthFill / widthRatio;
  const heightScale = safeHeightFill / heightRatio;

  const fittedScale = clamp(
    Math.min(widthScale, heightScale),
    isMobile ? 0.82 : 0.86,
    isMobile ? 1.82 : 2.05,
  );

  const computedX = (targetCenterX - 0.5 - fittedScale * (centerX - 0.5)) * 100;
  const computedY = (targetCenterY - 0.5 - fittedScale * (centerY - 0.5)) * 100;

  const explicitScale = readNumber(
    cssVars["--car-frame-scale"],
    frame.scale,
    frame.zoom,
  );

  const x =
    cssVars["--car-frame-x"] ??
    frame.translateXPct ??
    frame.translateXPercent ??
    frame.translateX ??
    `${clamp(computedX, -36, 36)}%`;

  const y =
    cssVars["--car-frame-y"] ??
    frame.translateYPct ??
    frame.translateYPercent ??
    frame.translateY ??
    `${clamp(computedY, -34, 28)}%`;

  return {
    "--aci-car-frame-scale": String(explicitScale || fittedScale),
    "--aci-car-frame-x": typeof x === "number" ? `${x}%` : x,
    "--aci-car-frame-y": typeof y === "number" ? `${y}%` : y,
    "--aci-car-frame-origin":
      cssVars["--car-frame-origin"] || frame.transformOrigin || "center center",
    "--aci-image-aspect": imageAspect,
  };
};

function fireColorAction(label, payload = {}, onAction) {
  const vehicle = payload.vehicle || null;
  const color = payload.color || payload.selectedColor || null;
  const vehicleTitle = getVehicleTitle(vehicle);
  const colorName = color ? getColorName(color) : "";

  const query =
    payload.query ||
    (vehicle
      ? `${label} ${vehicleTitle}${color ? ` ${colorName}` : ""}`
      : label);
  const contextVehicle = payload.contextPatch?.selectedVehicle || vehicle;

  emitAciAction(
    {
      id:
        payload.id ||
        makeSlug(`${label}-${vehicle?.id || vehicle?.model || ""}`),
      label,
      title: label,
      query,
      type: payload.type || "colors_action",
      intent: payload.intent || ACI_INTENTS.COLORS,
      canvasType: payload.canvasType || ACI_CANVAS_TYPES.COLORS,
      vehicle,
      payload: {
        ...payload,
        color,
      },
      contextPatch: {
        ...buildVehicleContextPatch({ vehicle: contextVehicle }),
        selectedColor: color,
        ...(payload.contextPatch || {}),
      },
    },
    onAction,
  );
}

function ColorOrb({ color = {}, selected = false, size = "md" }) {
  return (
    <span
      className={`aci-color-orb ${selected ? "is-selected" : ""} ${size}`}
      style={{ background: buildOrbBackground(color) }}
    >
      <i />
      {selected ? (
        <b>
          <Check size={size === "lg" ? 17 : 13} strokeWidth={3.5} />
        </b>
      ) : null}
    </span>
  );
}

function VehicleArtwork({ color = {}, vehicle = {}, mode = "desktop" }) {
  const stageKey = mode === "mobile" ? "mobileHero" : "colorStudio";
  const hasFrame = hasMeaningfulObject(color?.imageFrame);

  const frameStyle = hasFrame
    ? buildImageFrameStyle(color?.imageFrame, stageKey)
    : {};

  const isStagePhoto =
    color.isStagePhoto === true ||
    color.isStudioBackground === true ||
    color.imageModeUsed === "stage-only" ||
    color.imageBackgroundRemoved === false;

  const fallbackScale = mode === "mobile" ? "1.18" : "1.12";

  return (
    <div
      className={`aci-color-car ${mode} ${
        isStagePhoto ? "is-stage-photo" : "is-cutout"
      } ${hasFrame ? "has-frame" : "no-frame"}`}
      style={{
        "--aci-car-frame-scale": fallbackScale,
        "--aci-car-frame-x": "0%",
        "--aci-car-frame-y": "0%",
        "--aci-car-frame-origin": "center center",
        "--aci-image-aspect": "1400 / 787",
        ...frameStyle,
      }}
    >
      <div className="aci-color-car-photo-window">
        <CarImageStage
          src={
            color.normalizedImageUrl ||
            color.imageUrl ||
            vehicle.normalizedImageUrl ||
            vehicle.imageUrl
          }
          alt={`${getVehicleTitle(vehicle)} in ${getColorName(color)}`}
          stageVariant="hero"
          className="aci-color-car-stage"
          imageClassName="aci-color-car-image"
          fallbackLabel={getVehicleModel(vehicle)}
        />
      </div>
    </div>
  );
}

function AskRow({ icon, title, sub, onClick }) {
  return (
    <motion.button
      type="button"
      className="aci-color-ask-row"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
    >
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>
        <small>{sub}</small>
      </div>

      <ChevronRight size={17} />
    </motion.button>
  );
}

function AskNextCard({ vehicle, selectedColor, onAction }) {
  const vehicleTitle = getVehicleTitle(vehicle);

  return (
    <section className="aci-color-card aci-ask-card">
      <div className="aci-card-head">
        <h3>Ask next</h3>
        <Info size={16} />
      </div>

      <div className="aci-ask-list">
        <AskRow
          icon={<Sparkles size={17} />}
          title="Which color looks best?"
          sub="See the strongest visual picks"
          onClick={() =>
            fireColorAction(
              "Which color looks best?",
              {
                vehicle,
                selectedColor,
                color: selectedColor,
                type: "color_advice",
                query: `Which color looks best for ${vehicleTitle}?`,
              },
              onAction,
            )
          }
        />

        <AskRow
          icon={<Droplets size={17} />}
          title="Easiest to maintain?"
          sub="Dust, scratches and resale"
          onClick={() =>
            fireColorAction(
              "Which color is easiest to maintain?",
              {
                vehicle,
                selectedColor,
                color: selectedColor,
                type: "color_maintenance",
                query: `Which ${vehicleTitle} color is easiest to maintain?`,
              },
              onAction,
            )
          }
        />

        <AskRow
          icon={<ListChecks size={17} />}
          title="Open pricelist"
          sub="See variants and on-road price"
          onClick={() =>
            fireColorAction(
              "Open pricelist",
              {
                vehicle,
                selectedColor,
                color: selectedColor,
                type: "open_pricelist",
                intent: "vehicle_pricelist",
                canvasType: "pricelist_canvas",
                query: `Show ${vehicleTitle} price list`,
              },
              onAction,
            )
          }
        />

      </div>
    </section>
  );
}

function DesktopScreen({
  colors,
  selectedColor,
  setSelectedColor,
  vehicle,
  onAction,
}) {
  const [showAllDesktopColors, setShowAllDesktopColors] = useState(false);

  const vehicleTitle = getVehicleTitle(vehicle);
  const colorName = getColorName(selectedColor);
  const desktopVisibleColors = showAllDesktopColors
    ? colors
    : colors.slice(0, 9);

  return (
    <motion.main
      className="aci-colors-desktop"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <section className="aci-colors-main">
        <motion.header className="aci-desktop-header" variants={fadeUp}>
          <div>
            <h1>
              {vehicleTitle}
              <span>
                <Check size={15} strokeWidth={4} />
              </span>
            </h1>

            <p>Explore all exterior colors available for {vehicleTitle}.</p>
          </div>
        </motion.header>

        <motion.section className="aci-hero-stage" variants={fadeUp}>
          <span className="aci-stage-pill">
            <ColorOrb color={selectedColor} size="xs" />
            {colorName}
          </span>

          <VehicleArtwork
            color={selectedColor}
            vehicle={vehicle}
            mode="desktop"
          />
        </motion.section>

        <motion.section
          className="aci-color-swatches desktop"
          variants={fadeUp}
        >
          <h2>Available colors</h2>

          <div className="aci-swatch-row">
            {desktopVisibleColors.map((color) => {
              const active = color.id === selectedColor.id;

              return (
                <motion.button
                  key={color.id}
                  type="button"
                  className={active ? "active" : ""}
                  onClick={() => {
                    setSelectedColor(color);

                    fireColorAction(
                      "Color selected",
                      {
                        vehicle,
                        selectedColor: color,
                        color,
                        type: "color_selected",
                        query: `${vehicleTitle} ${getColorName(color)} color`,
                      },
                      onAction,
                    );
                  }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.965 }}
                >
                  <ColorOrb color={color} selected={active} size="lg" />
                  <span>{getColorName(color)}</span>
                </motion.button>
              );
            })}
          </div>

          {colors.length > 9 ? (
            <button
              type="button"
              className="aci-view-all-colors desktop"
              onClick={() => setShowAllDesktopColors((prev) => !prev)}
            >
              {showAllDesktopColors
                ? "Show fewer colors"
                : `View all ${colors.length} colors`}
            </button>
          ) : null}
        </motion.section>
      </section>

      <motion.aside className="aci-colors-rail" variants={stagger}>
        <motion.section
          className="aci-color-card selected-card"
          variants={fadeUp}
        >
          <div className="aci-card-head">
            <h3>Selected color</h3>
            <Sparkles size={15} />
          </div>

          <div className="selected-color-layout">
            <ColorOrb color={selectedColor} size="xl" />

            <div>
              <strong>{colorName}</strong>
              <p>{selectedColor.description}</p>
            </div>
          </div>

          <button
            type="button"
            className="aci-primary-button"
            onClick={() =>
              fireColorAction(
                "Use this color",
                {
                  vehicle: {
                    ...vehicle,
                    selectedColor,
                    colorName,
                    imageUrl: selectedColor.imageUrl,
                    normalizedImageUrl: selectedColor.normalizedImageUrl,
                    imageFrame: selectedColor.imageFrame,
                  },
                  selectedColor,
                  color: selectedColor,
                  type: "select_color",
                  query: `Use ${colorName} for ${vehicleTitle}`,
                  contextPatch: {
                    selectedColor,
                    selectedVehicle: {
                      ...vehicle,
                      selectedColor,
                      colorName,
                      imageUrl: selectedColor.imageUrl,
                      normalizedImageUrl: selectedColor.normalizedImageUrl,
                      imageFrame: selectedColor.imageFrame,
                    },
                  },
                },
                onAction,
              )
            }
          >
            Use this color
            <ChevronRight size={16} />
          </button>
        </motion.section>

        <motion.section
          className="aci-color-card shades-card"
          variants={fadeUp}
        >
          <div className="aci-card-head">
            <h3>Available shades</h3>
            <Palette size={15} />
          </div>

          <strong>{String(colors.length).padStart(2, "0")}</strong>

          <p>
            Real exterior color images available for {vehicleTitle}. No
            simulated paint tinting is being used.
          </p>
        </motion.section>

        <motion.div variants={fadeUp}>
          <AskNextCard
            vehicle={vehicle}
            selectedColor={selectedColor}
            onAction={onAction}
          />
        </motion.div>
      </motion.aside>

      <div className="aci-desktop-chatbar-wrap">
        <AciComposer
          selectedVehicle={vehicle}
          onAction={onAction}
          placeholder={`Ask ACI Assist anything about ${vehicleTitle}...`}
        />
      </div>
    </motion.main>
  );
}

function MobileScreen({
  colors,
  selectedColor,
  setSelectedColor,
  vehicle,
  data,
  onAction,
}) {
  const [showAllMobileColors, setShowAllMobileColors] = useState(false);

  const vehicleTitle = getVehicleTitle(vehicle);
  const modelName = getVehicleModel(vehicle);
  const colorName = getColorName(selectedColor);

  const mobileVisibleColors = showAllMobileColors ? colors : colors.slice(0, 4);
  const currentIndex = colors.findIndex((item) => item.id === selectedColor.id);

  const setByIndex = (nextIndex) => {
    const safeIndex = (nextIndex + colors.length) % colors.length;
    const nextColor = colors[safeIndex];

    setSelectedColor(nextColor);

    fireColorAction(
      "Color selected",
      {
        vehicle,
        selectedColor: nextColor,
        color: nextColor,
        type: "color_selected",
        query: `${vehicleTitle} ${getColorName(nextColor)} color`,
      },
      onAction,
    );
  };

  return (
    <motion.main
      className="aci-colors-mobile"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.header className="aci-mobile-topbar" variants={fadeUp}>
        <button
          type="button"
          onClick={() =>
            fireColorAction(
              `Back to ${vehicleTitle}`,
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
          <ArrowLeft size={27} />
        </button>

        <AciLogo mobile compact onAction={onAction} />

        <div>
          <button
            type="button"
            onClick={() => fireColorAction("Notifications", {}, onAction)}
          >
            <Bell size={23} />
            <i />
          </button>

          <button
            type="button"
            className="aci-mobile-avatar"
            onClick={() => fireColorAction("Profile", {}, onAction)}
          >
            {data?.avatarUrl ? (
              <img src={data.avatarUrl} alt="Profile" />
            ) : null}
          </button>
        </div>
      </motion.header>

      <motion.section className="aci-mobile-title" variants={fadeUp}>
        <span>Color Studio</span>
        <h1>Choose your color</h1>
        <p>{modelName}</p>
      </motion.section>

      <motion.section
        className="aci-mobile-hero"
        variants={fadeUp}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.13}
        onDragEnd={(_, info) => {
          if (info.offset.x < -42) setByIndex(currentIndex + 1);
          if (info.offset.x > 42) setByIndex(currentIndex - 1);
        }}
      >
        <div className="aci-mobile-hero-copy">
          <div>
            <h2>{colorName}</h2>
            <p>Exterior shade selected</p>
          </div>

          <span>
            <Palette size={16} />
            {colors.length} colors
          </span>
        </div>

        <VehicleArtwork color={selectedColor} vehicle={vehicle} mode="mobile" />
      </motion.section>

      <motion.section className="aci-color-swatches mobile" variants={fadeUp}>
        <h2>Available colors</h2>

        <div className="aci-mobile-swatch-grid">
          {mobileVisibleColors.map((color) => {
            const active = color.id === selectedColor.id;

            return (
              <button
                type="button"
                key={color.id}
                className={active ? "active" : ""}
                onClick={() => {
                  setSelectedColor(color);

                  fireColorAction(
                    "Color selected",
                    {
                      vehicle,
                      selectedColor: color,
                      color,
                      type: "color_selected",
                      query: `${vehicleTitle} ${getColorName(color)} color`,
                    },
                    onAction,
                  );
                }}
              >
                <ColorOrb color={color} selected={active} size="lg" />
                <span>{getColorLabel(getColorName(color))}</span>
              </button>
            );
          })}
        </div>

        {colors.length > 4 ? (
          <button
            type="button"
            className="aci-view-all-colors mobile"
            onClick={() => setShowAllMobileColors((prev) => !prev)}
          >
            {showAllMobileColors
              ? "Show fewer colors"
              : `View all ${colors.length} colors`}
          </button>
        ) : null}
      </motion.section>

      <motion.section className="aci-mobile-selected-card" variants={fadeUp}>
        <ColorOrb color={selectedColor} size="lg" />

        <div>
          <strong>{colorName}</strong>
          <p>{selectedColor.description}</p>
        </div>

      </motion.section>

      <motion.div variants={fadeUp}>
        <AskNextCard
          vehicle={vehicle}
          selectedColor={selectedColor}
          onAction={onAction}
        />
      </motion.div>

      <div className="aci-mobile-chatbar-wrap">
        <AciComposer
          mobile
          selectedVehicle={vehicle}
          onAction={onAction}
          placeholder={`Ask ACI Assist anything about ${modelName}...`}
        />
      </div>
    </motion.main>
  );
}

export default function AciAssistColorsScreen({
  data,
  vehicle,
  widget,
  onAction,
}) {
  const rootRef = useRef(null);

  const resolvedWidget = useMemo(
    () => getResolvedWidget(widget, data),
    [widget, data],
  );

  const activeVehicle = useMemo(
    () =>
      resolvedWidget?.contextPatch?.selectedVehicle ||
      resolvedWidget?.vehicle ||
      resolvedWidget?.data?.vehicle ||
      data?.vehicle ||
      data?.selectedVehicle ||
      data?.contextPatch?.selectedVehicle ||
      vehicle ||
      {},
    [vehicle, resolvedWidget, data],
  );

  const colors = useMemo(
    () => normalizeColors(activeVehicle, resolvedWidget, data),
    [activeVehicle, resolvedWidget, data],
  );

  const preferredSelectedColorId = useMemo(
    () => findPreferredSelectedColorId(colors, resolvedWidget, data),
    [colors, resolvedWidget, data],
  );

  const [selectedColorId, setSelectedColorId] = useState("");

  useEffect(() => {
    const scrollToTop = () => {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }

      if (typeof document !== "undefined") {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }

      let node = rootRef.current?.parentElement || null;

      while (node) {
        if (node.scrollHeight > node.clientHeight) {
          node.scrollTop = 0;
        }

        node = node.parentElement;
      }
    };

    scrollToTop();

    const frameOne = requestAnimationFrame(scrollToTop);
    const timeout = window.setTimeout(scrollToTop, 80);

    return () => {
      cancelAnimationFrame(frameOne);
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!colors.length) {
      setSelectedColorId("");
      return;
    }

    setSelectedColorId((current) => {
      if (current && colors.some((item) => item.id === current)) {
        return current;
      }

      return preferredSelectedColorId || colors[0]?.id || "";
    });
  }, [colors, preferredSelectedColorId]);

  if (!colors.length) {
    return (
      <div ref={rootRef} className="aci-colors-root">
        <style>{baseStyles}</style>

        <section className="aci-colors-empty">
          <h2>No live color data found</h2>

          <p>
            Backend was reached, but it did not return colors for{" "}
            {getVehicleTitle(activeVehicle)}. No demo colors are being shown.
          </p>

          <button
            type="button"
            onClick={() =>
              fireColorAction(
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

  const selectedColor =
    colors.find((item) => item.id === selectedColorId) || colors[0];

  const setSelectedColor = (color) => setSelectedColorId(color.id);

  const selectedVehicle = {
    ...activeVehicle,
    selectedColor,
    colorName: getColorName(selectedColor),
    imageUrl: selectedColor.imageUrl,
    normalizedImageUrl: selectedColor.normalizedImageUrl,
    imageFrame: selectedColor.imageFrame,
  };

  return (
    <div
      ref={rootRef}
      className="aci-colors-root"
      data-tool={TOOL_NAME}
      data-color={getColorName(selectedColor)}
    >
      <style>{baseStyles}</style>

      <DesktopScreen
        colors={colors}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        vehicle={selectedVehicle}
        onAction={onAction}
      />

      <MobileScreen
        colors={colors}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        vehicle={selectedVehicle}
        data={data}
        onAction={onAction}
      />
    </div>
  );
}

const baseStyles = `
  :root {
    --aci-blue: #2563eb;
    --aci-blue-dark: #1555ef;
    --aci-ink: #07112e;
    --aci-text: #334155;
    --aci-muted: #738198;
    --aci-line: #dbe6f4;
    --aci-soft-line: rgba(219, 230, 244, .82);
    --aci-surface: rgba(255, 255, 255, .94);
    --aci-serif: "Iowan Old Style", "Apple Garamond", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif;
    --aci-sans: Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  }

  .aci-colors-root,
  .aci-colors-root * {
    box-sizing: border-box;
  }

  .aci-colors-root {
    min-height: 100vh;
    width: 100%;
    color: var(--aci-ink);
    font-family: var(--aci-sans);
    background:
      radial-gradient(circle at 72% -12%, rgba(37, 99, 235, .06), transparent 28%),
      radial-gradient(circle at 10% 18%, rgba(219, 234, 254, .36), transparent 28%),
      linear-gradient(180deg, #ffffff 0%, #fbfdff 52%, #f7fbff 100%);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    scroll-margin-top: 0;
  }

  .aci-colors-root button {
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .aci-colors-mobile {
    display: none;
  }

  .aci-colors-desktop {
    width: min(100%, 1536px);
    min-height: 100vh;
    margin: 0 auto;
    padding: 38px 46px 104px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 306px;
    gap: 32px;
    align-items: start;
  }

  .aci-colors-main {
    min-width: 0;
  }

  .aci-desktop-header {
    min-height: 88px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 28px;
    padding-bottom: 8px;
  }

  .aci-desktop-header h1 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 11px;
    color: #02081f;
    font-family: var(--aci-serif);
    font-size: clamp(42px, 3.7vw, 58px);
    line-height: .9;
    letter-spacing: -.058em;
    font-weight: 520;
    text-wrap: balance;
  }

  .aci-desktop-header h1 span {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, #3b82f6, #1455ef);
    box-shadow: 0 10px 22px -12px rgba(37, 99, 235, .7);
  }

  .aci-desktop-header p {
    margin: 12px 0 0;
    color: #526174;
    font-size: 13.5px;
    line-height: 1.35;
    font-weight: 430;
  }

  .aci-hero-stage {
  position: relative;
  min-height: 520px;
  border-radius: 32px;
  overflow: hidden;
  border: 1px solid rgba(211, 224, 241, .88);
  background:
    radial-gradient(circle at 50% 30%, rgba(255,255,255,.98), transparent 36%),
    linear-gradient(180deg, #ffffff 0%, #fbfdff 48%, #eef6ff 100%);
  box-shadow:
    0 30px 80px -62px rgba(15,23,42,.30),
    inset 0 1px 0 rgba(255,255,255,.96);
}
  .aci-hero-stage::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 52%, rgba(255,255,255,.72), transparent 42%),
      radial-gradient(circle at 50% 86%, rgba(219,234,254,.38), transparent 36%);
  }

  .aci-stage-pill {
    position: absolute;
    z-index: 8;
    top: 24px;
    left: 26px;
    height: 39px;
    padding: 0 15px 0 8px;
    border-radius: 999px;
    border: 1px solid rgba(216, 226, 240, .92);
    background: rgba(255,255,255,.88);
    backdrop-filter: blur(16px);
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    font-weight: 780;
    box-shadow:
      0 16px 36px -30px rgba(15,23,42,.42),
      inset 0 1px 0 #fff;
  }

  .aci-color-car {
  position: absolute;
  z-index: 5;
  top: 36px;
  bottom: 16px;
  left: 0;
  right: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: none;
}

.aci-color-car-photo-window {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 1180px;
  max-height: 455px;
  aspect-ratio: var(--aci-image-aspect, 1400 / 787);
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 28px;
  background: transparent;
  box-shadow: none;
  -webkit-mask-image: none;
  mask-image: none;
}

.aci-color-car-photo-window::before,
.aci-color-car-photo-window::after {
  display: none;
}

  .aci-color-car-stage,
  .aci-color-car-stage.aci-car-stage,
  .aci-color-car .aci-car-stage,
  .aci-color-car .aci-car-stage-inner,
  .aci-color-car .aci-car-stage-shell {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: visible !important;
    display: grid !important;
    place-items: center !important;
  }

  .aci-color-car-image {
  display: block;
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  opacity: 1 !important;
  filter: none !important;
  mix-blend-mode: normal !important;
  image-rendering: auto !important;
  user-select: none;
  transform-origin: var(--aci-car-frame-origin, center center) !important;
  transform:
    translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, 0%))
    scale(var(--aci-car-frame-scale, 1)) !important;
}

  .aci-color-swatches.desktop {
    margin-top: 22px;
  }

  .aci-color-swatches h2 {
    margin: 0 0 15px;
    color: #0f172a;
    font-size: 13px;
    line-height: 1;
    font-weight: 720;
    letter-spacing: -.01em;
  }

  .aci-swatch-row {
    display: grid;
    grid-template-columns: repeat(9, minmax(76px, 1fr));
    gap: 14px;
    align-items: start;
  }

  .aci-swatch-row button,
  .aci-mobile-swatch-grid button {
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 4px 4px 0;
    color: #475569;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
  }

  .aci-swatch-row button span:not(.aci-color-orb),
  .aci-mobile-swatch-grid button span:not(.aci-color-orb) {
    max-width: 104px;
    color: #475569;
    text-align: center;
    font-size: 11.2px;
    line-height: 1.14;
    font-weight: 560;
  }

  .aci-swatch-row button.active span:not(.aci-color-orb),
  .aci-mobile-swatch-grid button.active span:not(.aci-color-orb) {
    color: #08132f;
    font-weight: 760;
  }

  .aci-color-orb {
    position: relative;
    flex: 0 0 auto;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,.86);
    box-shadow:
      inset 0 8px 13px rgba(255,255,255,.30),
      inset 0 -12px 20px rgba(15,23,42,.30),
      0 18px 34px -25px rgba(15,23,42,.72);
  }

  .aci-color-orb.xs {
    width: 21px;
    height: 21px;
  }

  .aci-color-orb.md {
    width: 44px;
    height: 44px;
  }

  .aci-color-orb.lg {
    width: 62px;
    height: 62px;
  }

  .aci-color-orb.xl {
    width: 64px;
    height: 64px;
  }

  .aci-color-orb i {
    position: absolute;
    left: 18%;
    top: 13%;
    width: 28%;
    height: 28%;
    border-radius: 999px;
    background: rgba(255,255,255,.78);
    filter: blur(1.8px);
  }

  .aci-color-orb.is-selected {
    box-shadow:
      0 0 0 4px #fff,
      0 0 0 6px var(--aci-blue),
      inset 0 8px 16px rgba(255,255,255,.35),
      inset 0 -13px 22px rgba(15,23,42,.24),
      0 20px 44px -28px rgba(37,99,235,.8);
  }

  .aci-color-orb b {
    position: absolute;
    right: -7px;
    bottom: -5px;
    width: 23px;
    height: 23px;
    border-radius: 999px;
    background: linear-gradient(135deg, #3b82f6, #1455ef);
    color: #fff;
    display: grid;
    place-items: center;
    border: 2px solid #fff;
    box-shadow: 0 10px 18px -10px rgba(37,99,235,.7);
  }

  .aci-view-all-colors {
  margin: 18px auto 0 !important;
  min-height: 40px !important;

  border: 1px solid rgba(37, 99, 235, .22) !important;
  border-radius: 999px !important;

  background:
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,250,255,.96)) !important;

  color: #1555ef !important;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  width: fit-content !important;
  min-width: 158px !important;

  padding: 0 20px !important;

  text-align: center !important;

  font-size: 12.5px !important;
  line-height: 1 !important;
  font-weight: 780 !important;
  letter-spacing: -.01em !important;

  box-shadow:
    0 16px 36px -30px rgba(37,99,235,.55),
    0 8px 24px -22px rgba(15,23,42,.26),
    inset 0 1px 0 rgba(255,255,255,1) !important;

  transition:
    transform .2s ease,
    box-shadow .2s ease,
    border-color .2s ease,
    background .2s ease !important;
}

.aci-view-all-colors::before {
  content: none !important;
  display: none !important;
}

.aci-view-all-colors:hover {
  transform: translateY(-1px) !important;
  border-color: rgba(37,99,235,.34) !important;
  background:
    linear-gradient(180deg, #ffffff, #f3f8ff) !important;
  box-shadow:
    0 20px 44px -32px rgba(37,99,235,.62),
    0 10px 26px -22px rgba(15,23,42,.28),
    inset 0 1px 0 rgba(255,255,255,1) !important;
}

.aci-view-all-colors:active {
  transform: scale(.985) !important;
}

.aci-view-all-colors.desktop {
  display: flex !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

.aci-view-all-colors.mobile {
  display: flex !important;
  width: fit-content !important;
  min-width: 154px !important;
  min-height: 40px !important;
  margin: 16px auto 0 !important;
  border-radius: 999px !important;
  font-size: 12.5px !important;
}

@media (max-width: 390px) {
  .aci-view-all-colors.mobile {
    min-height: 39px !important;
    font-size: 12.2px !important;
  }
}

  .aci-colors-rail {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding-top: 45px;
  }

  .aci-color-card {
    border-radius: 23px;
    border: 1px solid rgba(219, 230, 244, .88);
    background:
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,252,255,.94));
    box-shadow:
      0 28px 80px -64px rgba(15,23,42,.52),
      inset 0 1px 0 rgba(255,255,255,.95);
    padding: 16px;
  }

  .aci-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .aci-card-head h3 {
    margin: 0;
    color: #0f172a;
    font-size: 13px;
    line-height: 1;
    font-weight: 720;
    letter-spacing: -.01em;
  }

  .aci-card-head svg {
    color: #557197;
  }

  .selected-color-layout {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 68px 1fr;
    gap: 13px;
    align-items: center;
  }

  .selected-color-layout strong {
    display: block;
    color: #08132f;
    font-size: 16px;
    line-height: 1.05;
    letter-spacing: -.035em;
    font-weight: 760;
  }

  .selected-color-layout p {
    margin: 6px 0 0;
    color: #617088;
    font-size: 10.8px;
    line-height: 1.38;
    font-weight: 470;
  }

  .aci-primary-button {
    width: 100%;
    height: 41px;
    margin-top: 17px;
    border: 0;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--aci-blue), var(--aci-blue-dark));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 800;
    box-shadow: 0 18px 42px -30px rgba(37,99,235,.82);
  }

  .shades-card > strong {
    display: block;
    margin-top: 16px;
    color: var(--aci-blue);
    font-size: 38px;
    line-height: .92;
    letter-spacing: -.045em;
    font-weight: 760;
  }

  .shades-card p {
    margin: 13px 0 0;
    color: #617088;
    font-size: 10.8px;
    line-height: 1.48;
  }

  .aci-ask-card {
    padding-bottom: 13px;
  }

  .aci-ask-list {
    margin-top: 13px;
    display: grid;
    gap: 8px;
  }

  .aci-color-ask-row {
    width: 100%;
    min-height: 56px;
    border: 1px solid rgba(219, 230, 244, .88);
    border-radius: 16px;
    background: rgba(255,255,255,.86);
    display: grid;
    grid-template-columns: 35px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 9px 11px;
    color: #0f172a;
    text-align: left;
    box-shadow: 0 16px 38px -34px rgba(15,23,42,.42);
  }

  .aci-color-ask-row > span {
    width: 35px;
    height: 35px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 30% 18%, #fff, rgba(219,234,254,.86));
    box-shadow: inset 0 0 0 1px rgba(37,99,235,.1);
    font-size: 14px;
  }

  .aci-color-ask-row strong {
    display: block;
    color: #111b36;
    font-size: 11.2px;
    line-height: 1.1;
    font-weight: 720;
  }

  .aci-color-ask-row small {
    display: block;
    margin-top: 3px;
    color: #718096;
    font-size: 10.8px;
    line-height: 1.2;
    font-weight: 500;
  }

  .aci-color-ask-row svg {
    color: #64748b;
  }

  .aci-desktop-chatbar-wrap {
    position: fixed;
    left: 50%;
    bottom: 17px;
    z-index: 80;
    width: min(690px, calc(100vw - 56px));
    transform: translateX(-50%);
  }

  .aci-desktop-chatbar-wrap .colors-composer-dock,
  .aci-mobile-chatbar-wrap .mobile-chat-dock {
    position: static !important;
    transform: none !important;
    width: 100% !important;
    padding: 0 !important;
    background: transparent !important;
    backdrop-filter: none !important;
  }

  .aci-desktop-chatbar-wrap .colors-composer,
  .aci-mobile-chatbar-wrap .mobile-chatbar {
    width: 100% !important;
    border-radius: 999px !important;
    border: 1px solid rgba(203, 213, 225, .88) !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow:
      0 22px 58px -42px rgba(15,23,42,.4),
      inset 0 1px 0 rgba(255,255,255,1) !important;
  }

  .aci-colors-empty {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 28px;
    text-align: center;
  }

  .aci-colors-empty h2 {
    margin: 0;
    color: #07112e;
    font-family: var(--aci-serif);
    font-size: 36px;
    line-height: .96;
    letter-spacing: -.05em;
  }

  .aci-colors-empty p {
    width: min(520px, 100%);
    margin: 14px auto 22px;
    color: #64748b;
    line-height: 1.5;
  }

  .aci-colors-empty button {
    height: 44px;
    border: 0;
    border-radius: 999px;
    padding: 0 18px;
    color: #fff;
    background: linear-gradient(135deg, var(--aci-blue), var(--aci-blue-dark));
    font-weight: 800;
  }

  @media (max-width: 900px) {
    .aci-colors-desktop {
      display: none;
    }

    .aci-colors-mobile {
      width: 100%;
      max-width: 430px;
      min-height: 100vh;
      margin: 0 auto;
      padding: 16px 14px calc(112px + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .aci-mobile-topbar {
      height: 52px;
      display: grid;
      grid-template-columns: 44px 1fr auto;
      align-items: center;
      gap: 10px;
    }

    .aci-mobile-topbar button {
      border: 0;
      background: transparent;
      color: #334155;
      display: grid;
      place-items: center;
      padding: 0;
    }

    .aci-mobile-topbar > button:first-child {
      justify-self: start;
    }

    .aci-mobile-topbar > div {
      justify-self: end;
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .aci-mobile-topbar > div button {
      position: relative;
      width: 35px;
      height: 35px;
      border-radius: 999px;
    }

    .aci-mobile-topbar i {
      position: absolute;
      right: 6px;
      top: 5px;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--aci-blue);
      border: 2px solid #fff;
    }

    .aci-mobile-avatar {
      border: 1px solid #dbe6f4 !important;
      background: #fff !important;
      overflow: hidden;
    }

    .aci-mobile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
      display: block;
    }

    .aci-mobile-title {
      padding: 8px 2px 0;
    }

    .aci-mobile-title span {
      display: block;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: .28em;
      font-size: 10.5px;
      font-weight: 780;
    }

    .aci-mobile-title h1 {
      margin: 10px 0 6px;
      color: #050b22;
      font-family: var(--aci-serif);
      font-size: 39px;
      line-height: .9;
      letter-spacing: -.058em;
      font-weight: 520;
      text-wrap: balance;
    }

    .aci-mobile-title p {
      margin: 0;
      color: #738198;
      font-size: 18px;
      line-height: 1.05;
      font-weight: 420;
    }

    .aci-mobile-hero {
  position: relative;
  min-height: 430px;
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(211,224,241,.92);
  background:
    radial-gradient(circle at 50% 30%, rgba(255,255,255,.98), transparent 36%),
    linear-gradient(180deg, #ffffff 0%, #fbfdff 50%, #eef7ff 100%);
  box-shadow:
    0 28px 78px -62px rgba(15,23,42,.30),
    inset 0 1px 0 #fff;
}

    .aci-mobile-hero::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background:
        radial-gradient(circle at 50% 52%, rgba(255,255,255,.62), transparent 42%),
        radial-gradient(circle at 50% 86%, rgba(219,234,254,.38), transparent 36%);
    }

    .aci-mobile-hero-copy {
      position: relative;
      z-index: 8;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 22px 21px 0;
    }

    .aci-mobile-hero-copy h2 {
      margin: 0;
      color: #07112e;
      font-size: 20px;
      line-height: 1.05;
      letter-spacing: -.04em;
      font-weight: 800;
    }

    .aci-mobile-hero-copy p {
      margin: 5px 0 0;
      color: #617088;
      font-size: 13px;
      font-weight: 600;
    }

    .aci-mobile-hero-copy > span {
      height: 37px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(219,230,244,.92);
      background: rgba(255,255,255,.82);
      backdrop-filter: blur(14px);
      color: #445166;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12.5px;
      font-weight: 760;
      white-space: nowrap;
      box-shadow: inset 0 1px 0 #fff;
    }

    .aci-color-car.mobile {
      top: 74px;
      bottom: 2px;
      left: -12%;
      right: -12%;
      overflow: visible;
      z-index: 5;
    }

    .aci-color-car.mobile .aci-color-car-photo-window {
      width: 136%;
      max-width: 136%;
      height: auto;
      aspect-ratio: var(--aci-image-aspect, 1400 / 787);
      max-height: 356px;
      border-radius: 24px;
      background: transparent;
    }

    .aci-color-car.mobile .aci-color-car-image {
      object-fit: contain !important;
      object-position: center center !important;
      filter: none !important;
      transform:
        translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, 0%))
        scale(var(--aci-car-frame-scale, 1.18)) !important;
    }

    .aci-color-swatches.mobile {
      margin-top: 2px;
    }

    .aci-color-swatches.mobile h2 {
      margin: 0 0 13px;
      font-size: 13.5px;
    }

    .aci-mobile-swatch-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 15px 10px;
    }

    .aci-mobile-swatch-grid button {
      padding: 0;
      gap: 8px;
    }

    .aci-mobile-swatch-grid .aci-color-orb.lg {
      width: 54px;
      height: 54px;
    }

    .aci-mobile-swatch-grid button span:not(.aci-color-orb) {
      max-width: 82px;
      min-height: 28px;
      color: #526174;
      font-size: 11.2px;
      line-height: 1.14;
      font-weight: 560;
    }

    .aci-view-all-colors.mobile {
      margin-top: 14px;
    }

    .aci-mobile-selected-card {
      min-height: 94px;
      border-radius: 23px;
      border: 1px solid rgba(219,230,244,.9);
      background:
        linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,252,255,.94));
      box-shadow:
        0 24px 70px -58px rgba(15,23,42,.6),
        inset 0 1px 0 #fff;
      padding: 14px;
      display: grid;
      grid-template-columns: 56px 1fr auto;
      align-items: center;
      gap: 12px;
    }

    .aci-mobile-selected-card .aci-color-orb.lg {
      width: 52px;
      height: 52px;
    }

    .aci-mobile-selected-card strong {
      display: block;
      color: #07112e;
      font-size: 15.5px;
      line-height: 1.12;
      letter-spacing: -.025em;
      font-weight: 820;
    }

    .aci-mobile-selected-card p {
      margin: 4px 0 0;
      color: #617088;
      font-size: 11.2px;
      line-height: 1.25;
      font-weight: 470;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .aci-mobile-selected-card button {
      height: 44px;
      min-width: 108px;
      border: 0;
      border-radius: 16px;
      padding: 0 13px;
      background: linear-gradient(135deg, var(--aci-blue), var(--aci-blue-dark));
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 820;
      box-shadow: 0 18px 42px -30px rgba(37,99,235,.82);
    }

    .aci-mobile-chatbar-wrap {
      position: fixed;
      left: 14px;
      right: 14px;
      bottom: calc(10px + env(safe-area-inset-bottom));
      z-index: 100;
      max-width: 402px;
      margin: 0 auto;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar {
      min-height: 66px !important;
      grid-template-columns: 47px 1fr 35px 52px !important;
      padding: 7px !important;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar button:first-child,
    .aci-mobile-chatbar-wrap .mobile-chatbar button:last-child {
      border-radius: 999px !important;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar button:first-child {
      width: 47px !important;
      height: 47px !important;
      background: #f6f9ff !important;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar button:last-child {
      width: 52px !important;
      height: 52px !important;
      background: linear-gradient(135deg, var(--aci-blue), var(--aci-blue-dark)) !important;
      box-shadow: 0 16px 32px -22px rgba(37,99,235,.65) !important;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar input {
      font-size: 13.5px !important;
    }

    .aci-ask-card {
      border-radius: 23px;
      padding: 15px;
    }
  }

  @media (max-width: 390px) {
    .aci-colors-mobile {
      padding-inline: 12px;
    }

    .aci-mobile-title h1 {
      font-size: 36px;
    }

    .aci-mobile-hero {
      min-height: 408px;
    }

    .aci-color-car.mobile {
      top: 74px;
      bottom: 4px;
      left: -13%;
      right: -13%;
    }

    .aci-color-car.mobile .aci-color-car-photo-window {
      width: 138%;
      max-width: 138%;
      max-height: 334px;
    }

    .aci-mobile-swatch-grid {
      gap: 14px 8px;
    }

    .aci-mobile-swatch-grid .aci-color-orb.lg {
      width: 52px;
      height: 52px;
    }

    .aci-mobile-selected-card {
      grid-template-columns: 54px 1fr;
    }

    .aci-mobile-selected-card button {
      grid-column: 1 / -1;
      width: 100%;
      margin-top: 2px;
    }
  }
`;
