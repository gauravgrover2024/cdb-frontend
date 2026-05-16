import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Car,
  Check,
  ChevronRight,
  Info,
  Palette,
  Sparkles,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../shared/aciV2Constants";
import { AciComposer, emitAciAction } from "../shared/AciAssistShared";
import CarImageStage from "../shared/CarImageStage";

const TOOL_NAME = "vehicle_colors";

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.055,
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

const getColorName = (color = {}) =>
  cleanText(
    color.desktopName ||
      color.mobileName ||
      color.colorName ||
      color.name ||
      color.label,
  ) || "Selected color";

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

const hasMeaningfulObject = (value) =>
  value && typeof value === "object" && Object.keys(value).length > 0;

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

const pickDisplayFrameFallback = (vehicle = {}, widget = {}, data = {}) => {
  const candidates = [
    vehicle?.displayFrameMeta,
    vehicle?.imageFrame,
    vehicle?.frameMeta,
    widget?.displayFrameMeta,
    widget?.vehicle?.displayFrameMeta,
    widget?.vehicle?.imageFrame,
    data?.displayFrameMeta,
    data?.vehicle?.displayFrameMeta,
    data?.selectedVehicle?.displayFrameMeta,
    data?.contextPatch?.selectedVehicle?.displayFrameMeta,
  ];

  return candidates.find(hasMeaningfulObject) || null;
};

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
  const displayFrameFallback = pickDisplayFrameFallback(vehicle, widget, data);

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
        raw.deep,
        raw.darkHex,
        raw.deepHex,
      );

      const id =
        cleanText(raw.id || raw._id) ||
        makeSlug(`${name}-${normalizedImageUrl}`, `color-${index + 1}`);

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
        sourceImageUrl: raw.sourceImageUrl || raw.source_image_url || "",
        imageModeUsed: raw.imageModeUsed || raw.imageMode || "",
        isStudioBackground: raw.isStudioBackground === true,
        imageBackgroundRemoved:
          raw.imageBackgroundRemoved === true
            ? true
            : raw.imageBackgroundRemoved === false
              ? false
              : undefined,
        isStagePhoto: isStagePhotoColor(raw),
        imageFrame: isStagePhotoColor(raw) ? null : pickImageFrame(raw),
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
    color.deep,
  );

  const primary = hexCodes[0] || color.hex || "#E5E7EB";
  const secondary = hexCodes[1] || color.deep || primary;

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
    radial-gradient(circle at 31% 23%, rgba(255,255,255,.95), transparent 18%),
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
  if (!frame || typeof frame !== "object") return {};

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

  const normalizeFocus = (value) => {
    const number = readNumber(value);
    if (!Number.isFinite(number)) return null;
    return number > 1 ? number / 100 : number;
  };

  const cssVars = {
    ...(imageFrame?.cssVars || {}),
    ...(frame?.cssVars || {}),
  };

  const naturalWidth = readNumber(
    frame.naturalWidth,
    frame.imageWidth,
    frame.sourceWidth,
    frame.canvasWidth,
    frame.canvas_width,
    imageFrame?.naturalWidth,
    imageFrame?.imageWidth,
    imageFrame?.sourceWidth,
    imageFrame?.canvasWidth,
    imageFrame?.canvas_width,
  );

  const naturalHeight = readNumber(
    frame.naturalHeight,
    frame.imageHeight,
    frame.sourceHeight,
    frame.canvasHeight,
    frame.canvas_height,
    imageFrame?.naturalHeight,
    imageFrame?.imageHeight,
    imageFrame?.sourceHeight,
    imageFrame?.canvasHeight,
    imageFrame?.canvas_height,
  );

  const bounds =
    frame.bounds || frame.visibleBounds || frame.contentBounds || frame;

  const left = readNumber(bounds.left, bounds.x, bounds.minX);
  const top = readNumber(bounds.top, bounds.y, bounds.minY);
  const width = readNumber(bounds.width, bounds.w);
  const height = readNumber(bounds.height, bounds.h);

  const hasBounds =
    Number.isFinite(naturalWidth) &&
    Number.isFinite(naturalHeight) &&
    naturalWidth > 0 &&
    naturalHeight > 0 &&
    Number.isFinite(left) &&
    Number.isFinite(top) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0;

  const focusX = normalizeFocus(
    frame?.focusX ??
      frame?.focalX ??
      frame?.centerX ??
      imageFrame?.focusX ??
      imageFrame?.focalX,
  );

  const focusY = normalizeFocus(
    frame?.focusY ??
      frame?.focalY ??
      frame?.centerY ??
      imageFrame?.focusY ??
      imageFrame?.focalY,
  );

  const computedX = hasBounds
    ? (0.5 - (left + width / 2) / naturalWidth) * 100
    : Number.isFinite(focusX)
      ? (0.5 - focusX) * 100
      : null;

  const computedY = hasBounds
    ? (0.5 - (top + height / 2) / naturalHeight) * 100
    : Number.isFinite(focusY)
      ? (0.5 - focusY) * 100
      : null;

  const widthRatio = hasBounds ? width / naturalWidth : null;
  const heightRatio = hasBounds ? height / naturalHeight : null;

  const fittedScale = hasBounds
    ? Math.min(
        stageKey === "mobileHero" ? 1.18 : 1.16,
        Math.max(
          1,
          Math.max(
            0.94 / Math.max(widthRatio, 0.01),
            0.72 / Math.max(heightRatio, 0.01),
          ),
        ),
      )
    : null;

  const explicitScale = readNumber(
    cssVars["--car-frame-scale"],
    frame?.scale,
    frame?.zoom,
  );

  const x =
    cssVars["--car-frame-x"] ??
    frame?.translateXPct ??
    frame?.translateXPercent ??
    frame?.translateX ??
    (Number.isFinite(computedX) ? `${computedX}%` : undefined);

  const y =
    cssVars["--car-frame-y"] ??
    frame?.translateYPct ??
    frame?.translateYPercent ??
    frame?.translateY ??
    (Number.isFinite(computedY) ? `${computedY}%` : undefined);

  return {
    ...(explicitScale || fittedScale
      ? { "--aci-car-frame-scale": String(explicitScale || fittedScale) }
      : {}),
    ...(x !== undefined
      ? { "--aci-car-frame-x": typeof x === "number" ? `${x}%` : x }
      : {}),
    ...(y !== undefined
      ? { "--aci-car-frame-y": typeof y === "number" ? `${y}%` : y }
      : {}),
    "--aci-car-frame-origin":
      cssVars["--car-frame-origin"] ||
      frame?.transformOrigin ||
      "center center",
  };
};

function fireColorAction(label, payload = {}, onAction) {
  const vehicle = payload.vehicle || null;
  const color = payload.color || payload.selectedColor || null;
  const vehicleTitle = getVehicleTitle(vehicle);
  const colorName = getColorName(color);

  const query =
    payload.query ||
    (vehicle
      ? `${label} ${vehicleTitle}${color ? ` ${colorName}` : ""}`
      : label);

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
        selectedVehicle: vehicle,
        anchorModel: vehicle?.model,
        anchorMake: vehicle?.make || vehicle?.brand,
        anchorCity: vehicle?.citySlug || vehicle?.anchorCity || vehicle?.city,
        selectedColor: color,
        ...(payload.contextPatch || {}),
      },
    },
    onAction,
  );
}

function AciMark() {
  return (
    <span className="aci-color-logo">
      <strong>ACI</strong>
      <em>ASSIST</em>
    </span>
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
  const frameStyle = color?.isStagePhoto
    ? {}
    : buildImageFrameStyle(color?.imageFrame, stageKey);

  const isStagePhoto =
    color.isStagePhoto === true ||
    color.isStudioBackground === true ||
    color.imageModeUsed === "stage-only" ||
    color.imageBackgroundRemoved === false;

  const defaultScale = isStagePhoto
    ? mode === "mobile"
      ? "1.48"
      : "1.42"
    : mode === "mobile"
      ? "1.08"
      : "1.08";

  const defaultY = isStagePhoto ? (mode === "mobile" ? "-7%" : "-7%") : "0%";

  return (
    <div
      className={`aci-color-car ${mode} ${
        isStagePhoto ? "is-stage-photo" : "is-cutout"
      }`}
      style={{
        "--aci-car-frame-scale": defaultScale,
        "--aci-car-frame-x": "0%",
        "--aci-car-frame-y": defaultY,
        "--aci-car-frame-origin": "center center",
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
  const colorName = getColorName(selectedColor);

  return (
    <section className="aci-color-card aci-ask-card">
      <div className="aci-card-head">
        <h3>Ask next</h3>
        <Info size={16} />
      </div>

      <div className="aci-ask-list">
        <AskRow
          icon="✨"
          title="Which color looks best?"
          sub="Get an ACI recommendation"
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
          icon="🧼"
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
          icon="₹"
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

        <AskRow
          icon="▣"
          title="Get quotation"
          sub={`Quote in ${colorName}`}
          onClick={() =>
            fireColorAction(
              "Get quotation",
              {
                vehicle,
                selectedColor,
                color: selectedColor,
                type: "get_quotation",
                intent: ACI_INTENTS.QUOTATION,
                canvasType: ACI_CANVAS_TYPES.QUOTATION,
                query: `Get quotation for ${vehicleTitle} in ${colorName}`,
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
                <Check size={17} strokeWidth={4} />
              </span>
            </h1>
            <p>Explore all exterior colors available for {vehicleTitle}.</p>
          </div>

          <button
            type="button"
            className="aci-change-model"
            onClick={() =>
              fireColorAction(
                "Change model",
                {
                  vehicle,
                  type: "change_model",
                  query: "Change model for colors",
                },
                onAction,
              )
            }
          >
            <Car size={17} />
            Change model
          </button>
        </motion.header>

        <motion.section className="aci-hero-stage" variants={fadeUp}>
          <span className="aci-stage-pill">
            <ColorOrb color={selectedColor} size="xs" />
            {colorName}
          </span>

          <div className="aci-stage-bg-ring" />
          <div className="aci-stage-plate" />

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
            <Sparkles size={16} />
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
            <ChevronRight size={17} />
          </button>
        </motion.section>

        <motion.section
          className="aci-color-card shades-card"
          variants={fadeUp}
        >
          <div className="aci-card-head">
            <h3>Available shades</h3>
            <Palette size={16} />
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
          <ArrowLeft size={28} />
        </button>

        <AciMark />

        <div>
          <button
            type="button"
            onClick={() => fireColorAction("Notifications", {}, onAction)}
          >
            <Bell size={24} />
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
            <Palette size={17} />
            {colors.length} colors
          </span>
        </div>

        <div className="aci-stage-bg-ring mobile" />
        <div className="aci-stage-plate mobile" />

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

        <button
          type="button"
          onClick={() =>
            fireColorAction(
              "Get quotation",
              {
                vehicle,
                selectedColor,
                color: selectedColor,
                query: `Get quotation for ${vehicleTitle} in ${colorName}`,
                intent: ACI_INTENTS.QUOTATION,
                canvasType: ACI_CANVAS_TYPES.QUOTATION,
                type: "get_quotation",
              },
              onAction,
            )
          }
        >
          Get quote
          <ChevronRight size={18} />
        </button>
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
  const resolvedWidget = useMemo(
    () => getResolvedWidget(widget, data),
    [widget, data],
  );

  const activeVehicle = useMemo(
    () =>
      vehicle ||
      resolvedWidget?.vehicle ||
      resolvedWidget?.data?.vehicle ||
      data?.vehicle ||
      data?.selectedVehicle ||
      data?.contextPatch?.selectedVehicle ||
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
      <div className="aci-colors-root">
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
    --aci-shadow: 0 24px 72px -58px rgba(15, 23, 42, .54);
    --aci-shadow-strong: 0 34px 100px -72px rgba(15, 23, 42, .74);
    --aci-serif: "New York", "Bodoni 72", "Playfair Display", Georgia, "Times New Roman", serif;
    --aci-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  .aci-colors-root {
    min-height: 100vh;
    width: 100%;
    color: var(--aci-ink);
    font-family: var(--aci-sans);
    background:
      radial-gradient(circle at 72% -12%, rgba(37, 99, 235, .075), transparent 28%),
      radial-gradient(circle at 10% 18%, rgba(219, 234, 254, .48), transparent 28%),
      linear-gradient(180deg, #ffffff 0%, #fbfdff 52%, #f7fbff 100%);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
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
    padding: 46px 48px 110px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 34px;
    align-items: start;
  }

  .aci-colors-main {
    min-width: 0;
  }

  .aci-desktop-header {
    min-height: 108px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 28px;
    padding-bottom: 12px;
  }

  .aci-desktop-header h1 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #02081f;
    font-family: var(--aci-serif);
    font-size: clamp(52px, 4.7vw, 76px);
    line-height: .86;
    letter-spacing: -.075em;
    font-weight: 620;
    text-wrap: balance;
  }

  .aci-desktop-header h1 span {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, #3b82f6, #1455ef);
    box-shadow: 0 10px 22px -12px rgba(37, 99, 235, .7);
  }

  .aci-desktop-header p {
    margin: 16px 0 0;
    color: #526174;
    font-size: 15px;
    line-height: 1.35;
    font-weight: 470;
  }

  .aci-change-model {
    height: 44px;
    margin-top: 10px;
    padding: 0 18px;
    border-radius: 15px;
    border: 1px solid rgba(203, 213, 225, .88);
    background:
      linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,251,255,.9));
    color: #445166;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    font-weight: 720;
    box-shadow:
      0 18px 42px -34px rgba(15, 23, 42, .38),
      inset 0 1px 0 #fff;
  }

    .aci-hero-stage {
    position: relative;
    min-height: 470px;
    border-radius: 32px;
    overflow: hidden;
    border: 1px solid rgba(211, 224, 241, .88);
    background:
      radial-gradient(circle at 52% 38%, rgba(255,255,255,.98), transparent 33%),
      radial-gradient(circle at 78% 24%, rgba(219,234,254,.52), transparent 34%),
      radial-gradient(circle at 18% 22%, rgba(255,255,255,.98), transparent 32%),
      linear-gradient(145deg, #ffffff 0%, #f7fbff 47%, #edf6ff 100%);
    box-shadow:
      0 36px 96px -72px rgba(15,23,42,.54),
      inset 0 1px 0 rgba(255,255,255,.96);
  }

  .aci-hero-stage::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 50% 88%, rgba(15,23,42,.10), transparent 31%),
      linear-gradient(120deg, rgba(255,255,255,.40), transparent 38%);
  }

  .aci-hero-stage::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background:
      linear-gradient(118deg, transparent 0 7%, rgba(255,255,255,.62) 12%, transparent 25%),
      linear-gradient(245deg, transparent 0 8%, rgba(255,255,255,.55) 14%, transparent 28%),
      radial-gradient(ellipse at 8% 72%, rgba(219,234,254,.38), transparent 38%),
      radial-gradient(ellipse at 94% 70%, rgba(219,234,254,.34), transparent 36%);
    opacity: .88;
  }

  .aci-stage-bg-ring {
    position: absolute;
    left: 10%;
    right: 8%;
    bottom: 12%;
    height: 60%;
    border-radius: 999px 999px 0 0;
    background:
      radial-gradient(ellipse at 50% 100%, rgba(255,255,255,.98), rgba(255,255,255,.68) 48%, transparent 72%);
    opacity: .84;
    pointer-events: none;
    z-index: 1;
  }

  .aci-stage-bg-ring::before,
  .aci-stage-bg-ring::after {
    content: "";
    position: absolute;
    inset: auto 6% 0;
    height: 78%;
    border-radius: 999px 999px 0 0;
    border: 2px solid rgba(255,255,255,.76);
    border-bottom: 0;
    transform: translateY(25%);
    opacity: .72;
  }

  .aci-stage-bg-ring::after {
    inset: auto 18% 0;
    opacity: .48;
    transform: translateY(35%);
  }

  .aci-stage-plate {
    position: absolute;
    left: 19%;
    right: 13%;
    bottom: 40px;
    height: 88px;
    border-radius: 999px;
    background:
      radial-gradient(ellipse at 50% 18%, rgba(255,255,255,.99), rgba(238,246,255,.92) 50%, rgba(203,216,233,.46) 100%);
    box-shadow:
      0 24px 34px -28px rgba(15,23,42,.42),
      inset 0 1px 0 rgba(255,255,255,.98),
      inset 0 -12px 18px rgba(148,163,184,.13);
    opacity: .72;
    pointer-events: none;
    z-index: 1;
  }

  .aci-stage-pill {
    position: absolute;
    z-index: 8;
    top: 26px;
    left: 28px;
    height: 42px;
    padding: 0 16px 0 9px;
    border-radius: 999px;
    border: 1px solid rgba(216, 226, 240, .92);
    background: rgba(255,255,255,.88);
    backdrop-filter: blur(16px);
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 820;
    box-shadow:
      0 16px 36px -30px rgba(15,23,42,.42),
      inset 0 1px 0 #fff;
  }

  .aci-color-car {
    position: absolute;
    z-index: 4;
    left: 1.8%;
    right: 1.8%;
    top: 72px;
    bottom: 20px;
    display: grid;
    place-items: center;
    pointer-events: none;
    overflow: visible;
  }

  .aci-color-car-photo-window {
    position: relative;
    width: min(100%, 1060px);
    height: min(100%, 390px);
    aspect-ratio: 930 / 620;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 30px;
    background:
      radial-gradient(circle at 52% 48%, rgba(255,255,255,.98), transparent 36%),
      linear-gradient(180deg, #ffffff 0%, #f8fbff 52%, #edf6ff 100%);
    -webkit-mask-image:
      linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%),
      linear-gradient(180deg, #000 0%, #000 92%, transparent 100%);
    -webkit-mask-composite: source-in;
    mask-image:
      linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%),
      linear-gradient(180deg, #000 0%, #000 92%, transparent 100%);
    z-index: 4;
  }

  .aci-color-car-photo-window::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(255,255,255,.76) 0%, rgba(255,255,255,0) 10%, rgba(255,255,255,0) 90%, rgba(255,255,255,.72) 100%),
      linear-gradient(180deg, rgba(255,255,255,.34) 0%, rgba(255,255,255,0) 24%, rgba(255,255,255,.18) 100%);
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
    user-select: none;
    mix-blend-mode: normal !important;
    filter: drop-shadow(0 30px 28px rgba(15,23,42,.18)) !important;
    transform-origin: var(--aci-car-frame-origin, center center) !important;
    transform:
      translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, 0%))
      scale(var(--aci-car-frame-scale, 1.16)) !important;
  }

  .aci-color-car.is-cutout .aci-color-car-photo-window {
    background: transparent;
    -webkit-mask-image: none;
    mask-image: none;
  }

  .aci-color-car.is-cutout .aci-color-car-photo-window::before {
    display: none;
  }

  .aci-color-car.is-cutout .aci-color-car-image {
    width: min(96%, 980px) !important;
    object-fit: contain !important;
  }

  .aci-color-swatches.desktop {
    margin-top: 26px;
  }

  .aci-color-swatches h2 {
    margin: 0 0 15px;
    color: #0f172a;
    font-size: 14px;
    line-height: 1;
    font-weight: 820;
    letter-spacing: -.01em;
  }

  .aci-swatch-row {
    display: grid;
    grid-template-columns: repeat(9, minmax(78px, 1fr));
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
    gap: 10px;
  }

  .aci-swatch-row button span:not(.aci-color-orb),
  .aci-mobile-swatch-grid button span:not(.aci-color-orb) {
    max-width: 104px;
    color: #475569;
    text-align: center;
    font-size: 12px;
    line-height: 1.16;
    font-weight: 620;
  }

  .aci-swatch-row button.active span:not(.aci-color-orb),
  .aci-mobile-swatch-grid button.active span:not(.aci-color-orb) {
    color: #08132f;
    font-weight: 860;
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
    width: 22px;
    height: 22px;
  }

  .aci-color-orb.md {
    width: 44px;
    height: 44px;
  }

  .aci-color-orb.lg {
    width: 66px;
    height: 66px;
  }

  .aci-color-orb.xl {
    width: 70px;
    height: 70px;
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
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: linear-gradient(135deg, #3b82f6, #1455ef);
    color: #fff;
    display: grid;
    place-items: center;
    border: 2px solid #fff;
    box-shadow: 0 10px 18px -10px rgba(37,99,235,.7);
  }

  .aci-view-all-colors {
    margin: 16px auto 0;
    height: 38px;
    border-radius: 999px;
    border: 1px solid rgba(203, 213, 225, .9);
    background:
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.94));
    color: #334155;
    font-size: 13px;
    font-weight: 820;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
    box-shadow:
      0 16px 36px -30px rgba(15,23,42,.36),
      inset 0 1px 0 #fff;
  }

  .aci-view-all-colors.desktop {
    display: flex;
  }

  .aci-view-all-colors.mobile {
    display: inline-flex;
    width: fit-content;
    min-width: 148px;
  }

  .aci-colors-rail {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 10px;
  }

  .aci-color-card {
    border-radius: 24px;
    border: 1px solid rgba(219, 230, 244, .88);
    background:
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,252,255,.94));
    box-shadow:
      0 28px 80px -64px rgba(15,23,42,.52),
      inset 0 1px 0 rgba(255,255,255,.95);
    padding: 18px;
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
    font-size: 15px;
    line-height: 1;
    font-weight: 860;
    letter-spacing: -.01em;
  }

  .aci-card-head svg {
    color: #557197;
  }

  .selected-color-layout {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 76px 1fr;
    gap: 14px;
    align-items: center;
  }

  .selected-color-layout strong {
    display: block;
    color: #08132f;
    font-size: 19px;
    line-height: 1.05;
    letter-spacing: -.035em;
    font-weight: 900;
  }

  .selected-color-layout p {
    margin: 7px 0 0;
    color: #617088;
    font-size: 12px;
    line-height: 1.38;
    font-weight: 470;
  }

  .aci-primary-button {
    width: 100%;
    height: 43px;
    margin-top: 18px;
    border: 0;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--aci-blue), var(--aci-blue-dark));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 850;
    box-shadow: 0 18px 42px -30px rgba(37,99,235,.82);
  }

  .shades-card > strong {
    display: block;
    margin-top: 18px;
    color: var(--aci-blue);
    font-size: 47px;
    line-height: .9;
    letter-spacing: -.07em;
    font-weight: 940;
  }

  .shades-card p {
    margin: 14px 0 0;
    color: #617088;
    font-size: 12px;
    line-height: 1.48;
  }

  .aci-ask-card {
    padding-bottom: 14px;
  }

  .aci-ask-list {
    margin-top: 14px;
    display: grid;
    gap: 9px;
  }

  .aci-color-ask-row {
    width: 100%;
    min-height: 58px;
    border: 1px solid rgba(219, 230, 244, .88);
    border-radius: 17px;
    background: rgba(255,255,255,.86);
    display: grid;
    grid-template-columns: 36px 1fr auto;
    align-items: center;
    gap: 11px;
    padding: 10px 12px;
    color: #0f172a;
    text-align: left;
    box-shadow: 0 16px 38px -34px rgba(15,23,42,.42);
  }

  .aci-color-ask-row > span {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 30% 18%, #fff, rgba(219,234,254,.86));
    box-shadow: inset 0 0 0 1px rgba(37,99,235,.1);
    font-size: 15px;
  }

  .aci-color-ask-row strong {
    display: block;
    color: #111b36;
    font-size: 12px;
    line-height: 1.1;
    font-weight: 840;
  }

  .aci-color-ask-row small {
    display: block;
    margin-top: 3px;
    color: #718096;
    font-size: 10.5px;
    line-height: 1.2;
    font-weight: 520;
  }

  .aci-color-ask-row svg {
    color: #64748b;
  }

  .aci-desktop-chatbar-wrap {
    position: fixed;
    left: 50%;
    bottom: 18px;
    z-index: 80;
    width: min(700px, calc(100vw - 56px));
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

  @media (max-width: 1180px) and (min-width: 901px) {
    .aci-colors-desktop {
      grid-template-columns: 1fr;
      padding-inline: 34px;
    }

    .aci-colors-rail {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .aci-swatch-row {
      grid-template-columns: repeat(6, minmax(78px, 1fr));
    }
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
      gap: 15px;
    }

    .aci-mobile-topbar {
      height: 54px;
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
      gap: 10px;
    }

    .aci-mobile-topbar > div button {
      position: relative;
      width: 36px;
      height: 36px;
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

    .aci-color-logo {
      justify-self: center;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #07112e;
    }

    .aci-color-logo strong {
      color: var(--aci-blue);
      font-size: 29px;
      line-height: .85;
      font-weight: 950;
      letter-spacing: -3px;
      transform: skewX(-8deg);
    }

    .aci-color-logo em {
      color: #07112e;
      font-size: 13px;
      line-height: 1;
      font-style: normal;
      letter-spacing: 6px;
      font-weight: 800;
    }

    .aci-mobile-title {
      padding: 8px 2px 0;
    }

    .aci-mobile-title span {
      display: block;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: .28em;
      font-size: 11px;
      font-weight: 860;
    }

    .aci-mobile-title h1 {
      margin: 10px 0 6px;
      color: #050b22;
      font-family: var(--aci-serif);
      font-size: 46px;
      line-height: .88;
      letter-spacing: -.075em;
      font-weight: 620;
      text-wrap: balance;
    }

    .aci-mobile-title p {
      margin: 0;
      color: #738198;
      font-size: 22px;
      line-height: 1.05;
      font-weight: 460;
    }

    .aci-mobile-hero {
      position: relative;
      min-height: 408px;
      border-radius: 29px;
      overflow: hidden;
      border: 1px solid rgba(211,224,241,.92);
      background:
        radial-gradient(circle at 54% 38%, rgba(255,255,255,.98), transparent 34%),
        radial-gradient(circle at 78% 28%, rgba(219,234,254,.50), transparent 34%),
        radial-gradient(circle at 18% 18%, rgba(255,255,255,.98), transparent 34%),
        linear-gradient(145deg, #ffffff 0%, #f8fbff 48%, #edf6ff 100%);
      box-shadow:
        0 28px 78px -62px rgba(15,23,42,.58),
        inset 0 1px 0 #fff;
    }
        .aci-mobile-hero::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      background:
        linear-gradient(120deg, transparent 0 5%, rgba(255,255,255,.62) 12%, transparent 28%),
        linear-gradient(242deg, transparent 0 7%, rgba(255,255,255,.56) 15%, transparent 30%),
        radial-gradient(ellipse at 6% 72%, rgba(219,234,254,.34), transparent 38%),
        radial-gradient(ellipse at 94% 70%, rgba(219,234,254,.32), transparent 36%);
      opacity: .88;
    }



    .aci-mobile-hero-copy {
      position: relative;
      z-index: 7;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 24px 22px 0;
    }

    .aci-mobile-hero-copy h2 {
      margin: 0;
      color: #07112e;
      font-size: 22px;
      line-height: 1.05;
      letter-spacing: -.04em;
      font-weight: 900;
    }

    .aci-mobile-hero-copy p {
      margin: 5px 0 0;
      color: #617088;
      font-size: 14px;
      font-weight: 660;
    }

    .aci-mobile-hero-copy > span {
      height: 39px;
      padding: 0 13px;
      border-radius: 999px;
      border: 1px solid rgba(219,230,244,.92);
      background: rgba(255,255,255,.82);
      backdrop-filter: blur(14px);
      color: #445166;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: inset 0 1px 0 #fff;
    }

    .aci-mobile-hero .aci-stage-bg-ring.mobile {
      left: 8%;
      right: 8%;
      bottom: 20%;
      height: 50%;
    }

    .aci-mobile-hero .aci-stage-plate.mobile {
      left: 14%;
      right: 12%;
      bottom: 46px;
      height: 64px;
    }

    .aci-color-car.mobile {
      left: 0;
      right: 0;
      top: 102px;
      bottom: 28px;
      overflow: visible;
    }

    .aci-color-car.mobile .aci-color-car-photo-window {
      width: 108%;
      max-width: 108%;
      height: min(100%, 278px);
      border-radius: 24px;
      aspect-ratio: 930 / 620;
      -webkit-mask-image:
        linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%),
        linear-gradient(180deg, #000 0%, #000 92%, transparent 100%);
      -webkit-mask-composite: source-in;
      mask-image:
        linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%),
        linear-gradient(180deg, #000 0%, #000 92%, transparent 100%);
    }

    .aci-color-car.mobile .aci-color-car-image {
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      object-position: center center !important;
      mix-blend-mode: normal !important;
      filter: drop-shadow(0 26px 22px rgba(15,23,42,.18)) !important;
      transform:
        translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, 0%))
        scale(var(--aci-car-frame-scale, 1.14)) !important;
    }

    .aci-color-swatches.mobile {
      margin-top: 2px;
    }

    .aci-color-swatches.mobile h2 {
      margin: 0 0 14px;
      font-size: 14px;
    }

    .aci-mobile-swatch-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px 10px;
    }

    .aci-mobile-swatch-grid button {
      padding: 0;
      gap: 9px;
    }

    .aci-mobile-swatch-grid .aci-color-orb.lg {
      width: 58px;
      height: 58px;
    }

    .aci-mobile-swatch-grid button span:not(.aci-color-orb) {
      max-width: 82px;
      min-height: 28px;
      color: #526174;
      font-size: 12px;
      line-height: 1.15;
      font-weight: 600;
    }

    .aci-view-all-colors.mobile {
      margin-top: 14px;
    }

    .aci-mobile-selected-card {
      min-height: 96px;
      border-radius: 24px;
      border: 1px solid rgba(219,230,244,.9);
      background:
        linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,252,255,.94));
      box-shadow:
        0 24px 70px -58px rgba(15,23,42,.6),
        inset 0 1px 0 #fff;
      padding: 14px;
      display: grid;
      grid-template-columns: 58px 1fr auto;
      align-items: center;
      gap: 12px;
    }

    .aci-mobile-selected-card .aci-color-orb.lg {
      width: 54px;
      height: 54px;
    }

    .aci-mobile-selected-card strong {
      display: block;
      color: #07112e;
      font-size: 16px;
      line-height: 1.12;
      letter-spacing: -.025em;
      font-weight: 900;
    }

    .aci-mobile-selected-card p {
      margin: 4px 0 0;
      color: #617088;
      font-size: 12px;
      line-height: 1.25;
      font-weight: 500;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .aci-mobile-selected-card button {
      height: 46px;
      min-width: 112px;
      border: 0;
      border-radius: 16px;
      padding: 0 14px;
      background: linear-gradient(135deg, var(--aci-blue), var(--aci-blue-dark));
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 900;
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
      min-height: 68px !important;
      grid-template-columns: 48px 1fr 36px 54px !important;
      padding: 7px !important;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar button:first-child,
    .aci-mobile-chatbar-wrap .mobile-chatbar button:last-child {
      border-radius: 999px !important;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar button:first-child {
      width: 48px !important;
      height: 48px !important;
      background: #f6f9ff !important;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar button:last-child {
      width: 54px !important;
      height: 54px !important;
      background: linear-gradient(135deg, var(--aci-blue), var(--aci-blue-dark)) !important;
      box-shadow: 0 16px 32px -22px rgba(37,99,235,.65) !important;
    }

    .aci-mobile-chatbar-wrap .mobile-chatbar input {
      font-size: 14px !important;
    }

    .aci-ask-card {
      border-radius: 24px;
      padding: 16px;
    }
  }

  @media (max-width: 390px) {
    .aci-colors-mobile {
      padding-inline: 12px;
    }

    .aci-mobile-title h1 {
      font-size: 39px;
    }

        .aci-mobile-hero {
      min-height: 382px;
    }

    .aci-color-car.mobile {
      top: 100px;
      bottom: 30px;
    }

    .aci-color-car.mobile .aci-color-car-photo-window {
      height: min(100%, 252px);
    }

    .aci-mobile-swatch-grid {
      gap: 14px 8px;
    }

    .aci-mobile-swatch-grid .aci-color-orb.lg {
      width: 54px;
      height: 54px;
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

  /* ACI_COLORS_PREMIUM_STAGE_FINAL_FIX_START */

.aci-desktop-header {
  min-height: 88px !important;
  padding-bottom: 8px !important;
}

.aci-desktop-header h1 {
  font-family: var(--aci-serif) !important;
  font-size: clamp(44px, 4vw, 62px) !important;
  line-height: .88 !important;
  letter-spacing: -.065em !important;
  font-weight: 560 !important;
}

.aci-desktop-header p {
  margin-top: 12px !important;
  font-size: 14px !important;
}

.aci-change-model {
  height: 40px !important;
  font-size: 12.5px !important;
  font-weight: 650 !important;
}

.aci-hero-stage {
  min-height: 420px !important;
  border-radius: 30px !important;
  background:
    radial-gradient(circle at 52% 38%, rgba(255,255,255,.98), transparent 33%),
    radial-gradient(circle at 78% 25%, rgba(219,234,254,.48), transparent 34%),
    radial-gradient(circle at 18% 22%, rgba(255,255,255,.98), transparent 32%),
    linear-gradient(145deg, #ffffff 0%, #f8fbff 48%, #edf6ff 100%) !important;
}

.aci-hero-stage::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    linear-gradient(118deg, transparent 0 7%, rgba(255,255,255,.58) 13%, transparent 26%),
    linear-gradient(245deg, transparent 0 8%, rgba(255,255,255,.52) 15%, transparent 29%),
    radial-gradient(ellipse at 5% 72%, rgba(219,234,254,.32), transparent 38%),
    radial-gradient(ellipse at 96% 72%, rgba(219,234,254,.30), transparent 36%);
  opacity: .9;
}

.aci-stage-bg-ring {
  left: 8% !important;
  right: 8% !important;
  bottom: 10% !important;
  height: 62% !important;
  opacity: .78 !important;
}

.aci-stage-plate {
  left: 20% !important;
  right: 14% !important;
  bottom: 35px !important;
  height: 82px !important;
  opacity: .62 !important;
}

.aci-color-car {
  top: 42px !important;
  bottom: 10px !important;
  left: 1.5% !important;
  right: 1.5% !important;
  overflow: visible !important;
}

.aci-color-car-photo-window {
  position: relative;
  width: min(100%, 1080px);
  height: min(100%, 390px);
  aspect-ratio: 930 / 620;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 28px;
  background:
    radial-gradient(circle at 52% 46%, rgba(255,255,255,.98), transparent 36%),
    linear-gradient(180deg, #ffffff 0%, #f9fcff 52%, #edf6ff 100%);
  z-index: 4;
}

.aci-color-car-photo-window::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255,255,255,.82) 0%, rgba(255,255,255,0) 8%, rgba(255,255,255,0) 92%, rgba(255,255,255,.78) 100%),
    linear-gradient(180deg, rgba(255,255,255,.42) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,.18) 100%);
}

.aci-color-car-photo-window::after {
  content: "";
  position: absolute;
  left: 11%;
  right: 11%;
  bottom: 6%;
  height: 13%;
  border-radius: 999px;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(15,23,42,.13), transparent 68%);
  filter: blur(12px);
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
  user-select: none;
  mix-blend-mode: normal !important;
  filter: drop-shadow(0 30px 28px rgba(15,23,42,.17)) !important;
  transform-origin: var(--aci-car-frame-origin, center center) !important;
  transform:
    translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, -7%))
    scale(var(--aci-car-frame-scale, 1.42)) !important;
}

.aci-color-car.is-stage-photo .aci-color-car-image {
  object-fit: contain !important;
  transform:
    translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, -7%))
    scale(var(--aci-car-frame-scale, 1.42)) !important;
}

.aci-color-car.is-cutout .aci-color-car-photo-window {
  background: transparent !important;
}

.aci-color-car.is-cutout .aci-color-car-photo-window::before,
.aci-color-car.is-cutout .aci-color-car-photo-window::after {
  display: none !important;
}

.aci-color-car.is-cutout .aci-color-car-image {
  width: min(96%, 980px) !important;
  object-fit: contain !important;
  transform:
    translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, 0%))
    scale(var(--aci-car-frame-scale, 1.08)) !important;
}

.aci-swatch-row button span:not(.aci-color-orb),
.aci-mobile-swatch-grid button span:not(.aci-color-orb) {
  font-size: 11.2px !important;
  font-weight: 560 !important;
  line-height: 1.14 !important;
}

.aci-swatch-row button.active span:not(.aci-color-orb),
.aci-mobile-swatch-grid button.active span:not(.aci-color-orb) {
  font-weight: 760 !important;
}

.aci-color-card {
  padding: 16px !important;
}

.aci-card-head h3 {
  font-size: 13.5px !important;
  font-weight: 760 !important;
}

.selected-color-layout strong {
  font-size: 17px !important;
  font-weight: 820 !important;
}

.selected-color-layout p,
.shades-card p {
  font-size: 11.2px !important;
}

.aci-color-ask-row strong {
  font-size: 11.5px !important;
  font-weight: 760 !important;
}

.aci-color-ask-row small {
  font-size: 10px !important;
}

@media (max-width: 900px) {
  .aci-mobile-title h1 {
    font-family: var(--aci-serif) !important;
    font-size: 40px !important;
    line-height: .9 !important;
    letter-spacing: -.065em !important;
    font-weight: 560 !important;
  }

  .aci-mobile-title p {
    font-size: 19px !important;
  }

  .aci-mobile-hero {
    min-height: 418px !important;
    border-radius: 28px !important;
    background:
      radial-gradient(circle at 54% 38%, rgba(255,255,255,.98), transparent 34%),
      radial-gradient(circle at 78% 28%, rgba(219,234,254,.46), transparent 34%),
      radial-gradient(circle at 18% 18%, rgba(255,255,255,.98), transparent 34%),
      linear-gradient(145deg, #ffffff 0%, #f9fcff 48%, #eef7ff 100%) !important;
  }

  .aci-mobile-hero::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    background:
      linear-gradient(120deg, transparent 0 5%, rgba(255,255,255,.60) 12%, transparent 28%),
      linear-gradient(242deg, transparent 0 7%, rgba(255,255,255,.54) 15%, transparent 30%),
      radial-gradient(ellipse at 6% 72%, rgba(219,234,254,.30), transparent 38%),
      radial-gradient(ellipse at 94% 70%, rgba(219,234,254,.30), transparent 36%);
    opacity: .9;
  }

  .aci-color-car.mobile {
    top: 90px !important;
    bottom: 18px !important;
    left: -5% !important;
    right: -5% !important;
    overflow: visible !important;
  }

  .aci-color-car.mobile .aci-color-car-photo-window {
    width: 120% !important;
    max-width: 120% !important;
    height: min(100%, 306px) !important;
    border-radius: 24px !important;
  }

  .aci-color-car.mobile .aci-color-car-image {
    object-fit: contain !important;
    object-position: center center !important;
    mix-blend-mode: normal !important;
    filter: drop-shadow(0 26px 22px rgba(15,23,42,.16)) !important;
    transform:
      translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, -7%))
      scale(var(--aci-car-frame-scale, 1.48)) !important;
  }

  .aci-color-car.mobile.is-stage-photo .aci-color-car-image {
    transform:
      translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, -7%))
      scale(var(--aci-car-frame-scale, 1.48)) !important;
  }

  .aci-mobile-hero-copy h2 {
    font-size: 20px !important;
    font-weight: 800 !important;
  }

  .aci-mobile-hero-copy p {
    font-size: 13px !important;
  }

  .aci-mobile-swatch-grid .aci-color-orb.lg {
    width: 54px !important;
    height: 54px !important;
  }
}

@media (max-width: 390px) {
  .aci-mobile-title h1 {
    font-size: 37px !important;
  }

  .aci-mobile-hero {
    min-height: 390px !important;
  }

  .aci-color-car.mobile {
    top: 88px !important;
    bottom: 20px !important;
  }

  .aci-color-car.mobile .aci-color-car-photo-window {
    height: min(100%, 278px) !important;
  }

  .aci-color-car.mobile .aci-color-car-image {
    transform:
      translate(var(--aci-car-frame-x, 0%), var(--aci-car-frame-y, -7%))
      scale(var(--aci-car-frame-scale, 1.44)) !important;
  }
}

/* ACI_COLORS_PREMIUM_STAGE_FINAL_FIX_END */
`;
