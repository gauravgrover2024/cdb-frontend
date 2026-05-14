import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Palette,
  Sparkles,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../shared/aciV2Constants";
import { AciComposer, emitAciAction } from "../shared/AciAssistShared";
import CarImageStage from "../shared/CarImageStage";

const FALLBACK_COLORS = [];

const COLOR_STAGE_BG = {
  desktop:
    "radial-gradient(circle at 16% 18%, rgba(255,255,255,.96), transparent 32%), radial-gradient(circle at 82% 30%, rgba(191,219,254,.72), transparent 26%), linear-gradient(135deg,#edf6ff 0%,#ffffff 45%,#eaf2fb 100%)",
  mobile:
    "radial-gradient(circle at 18% 24%, rgba(255,255,255,.96), transparent 32%), radial-gradient(circle at 83% 34%, rgba(191,219,254,.7), transparent 28%), linear-gradient(135deg,#edf6ff 0%,#ffffff 45%,#eaf2fb 100%)",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(7px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

const makeSlug = (value = "", fallback = "item") =>
  String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const getVehicleTitle = (vehicle) =>
  vehicle?.displayName ||
  vehicle?.name ||
  [vehicle?.brand || vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
  "Selected car";

const getVehicleModel = (vehicle) => vehicle?.model || getVehicleTitle(vehicle);

const getVehicleVariant = (vehicle) =>
  vehicle?.selectedVariant ||
  vehicle?.variant ||
  vehicle?.variants?.[0]?.name ||
  "";

const getVehiclePrice = (vehicle) =>
  vehicle?.priceRange ||
  vehicle?.startingOnRoadPrice ||
  vehicle?.price ||
  "Price available on request";

const getVehicleImage = (vehicle, color) =>
  color?.normalizedImageUrl ||
  color?.cleanImageUrl ||
  color?.imageUrl ||
  color?.carImageUrl ||
  vehicle?.selectedColor?.normalizedImageUrl ||
  vehicle?.selectedColor?.imageUrl ||
  "";

const getColorDisplayLabel = (name = "") => {
  const clean = String(name || "").trim();
  if (!clean) return "Color";

  if (/white.*black|black.*white/i.test(clean)) return "White + Black";
  if (/king.*limited.*matte/i.test(clean)) return "King Edition Matte";
  if (/shadow grey.*black roof/i.test(clean)) return "Shadow Grey";
  if (/robust emerald pearl/i.test(clean)) return "Emerald Pearl";

  return clean
    .replace(/\bwith\b.*$/i, "")
    .replace(/\blimited edition\b/gi, "Edition")
    .replace(/\btitanium black matte\b/gi, "Matte")
    .replace(/\s+/g, " ")
    .trim();
};

const pickImageFrame = (raw = {}) =>
  raw.imageFrame ||
  raw.image_frame ||
  raw.carImageFrame ||
  raw.car_image_frame ||
  raw.frame ||
  null;

const normalizeColorImage = (raw = {}) =>
  raw.normalizedImageUrl ||
  raw.cleanImageUrl ||
  raw.stagedImageUrl ||
  raw.imageUrl ||
  raw.carImageUrl ||
  raw.sourceImageUrl ||
  "";

const normalizeColors = (vehicle, widget) => {
  const source =
    widget?.colors ||
    widget?.rows ||
    widget?.records ||
    widget?.items ||
    widget?.data?.colors ||
    vehicle?.colors ||
    vehicle?.availableColors ||
    [];

  if (!Array.isArray(source) || !source.length) return [];

  const seen = new Set();

  return source
    .map((raw, index) => {
      const name =
        raw.colorName ||
        raw.name ||
        raw.desktopName ||
        raw.mobileName ||
        raw.label ||
        `Color ${index + 1}`;

      const normalizedImageUrl = normalizeColorImage(raw);

      if (!normalizedImageUrl) return null;

      const id =
        raw.id ||
        raw._id ||
        makeSlug(`${name}-${normalizedImageUrl}`, `color-${index + 1}`);

      const dedupeKey = `${String(name).toLowerCase()}|${normalizedImageUrl}`;
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);

      const hasPopularity =
        raw.hasPopularity === true ||
        raw.votes !== undefined ||
        raw.popularity !== undefined ||
        raw.popularityScore !== undefined;

      return {
        ...raw,
        id,
        name,
        colorName: name,
        mobileName: raw.mobileName || raw.name || raw.colorName || name,
        desktopName: raw.desktopName || raw.name || raw.colorName || name,
        hex: raw.hex || raw.hexCode || raw.colorHex || "#E5E7EB",
        deep:
          raw.deep ||
          raw.darkHex ||
          raw.deepHex ||
          raw.hex ||
          raw.hexCode ||
          raw.colorHex ||
          "#94A3B8",

        imageUrl: normalizedImageUrl,
        normalizedImageUrl,
        cleanImageUrl: raw.cleanImageUrl || normalizedImageUrl,
        sourceImageUrl: raw.sourceImageUrl || raw.source_image_url || "",
        imageFrame: pickImageFrame(raw),

        hasPopularity,
        votes: hasPopularity
          ? Number(raw.votes ?? raw.popularity ?? raw.popularityScore ?? 0) || 0
          : 0,

        description:
          raw.description ||
          raw.note ||
          raw.summary ||
          "Color availability may vary by variant and city.",
      };
    })
    .filter(Boolean);
};

const getStageFrame = (imageFrame, stageKey = "colorStudio") => {
  if (!imageFrame || typeof imageFrame !== "object") return null;

  return (
    imageFrame.stageFrames?.[stageKey] ||
    imageFrame.stages?.[stageKey] ||
    imageFrame[stageKey] ||
    imageFrame.stageFrames?.colorStudio ||
    imageFrame.stageFrames?.overviewHero ||
    imageFrame.stageFrames?.priceSide ||
    imageFrame.stageFrames?.mobileHero ||
    imageFrame.stageFrames?.chatCard ||
    imageFrame.stageFrames?.default ||
    imageFrame
  );
};

const frameNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const cssPercent = (value, fallback = 0) => {
  if (typeof value === "string" && value.trim().endsWith("%")) {
    return value.trim();
  }

  return `${frameNumber(value, fallback)}%`;
};

const buildImageFrameStyle = (imageFrame, stageKey = "colorStudio") => {
  const frame = getStageFrame(imageFrame, stageKey);

  if (!frame || typeof frame !== "object") return undefined;

  const cssVars = {
    ...(imageFrame?.cssVars || {}),
    ...(frame?.cssVars || {}),
  };

  const scale = cssVars["--car-frame-scale"] || frame.scale || frame.zoom || 1;

  const x =
    cssVars["--car-frame-x"] ||
    (frame.translateXPct ??
      frame.translateXPercent ??
      frame.translateX ??
      frame.x ??
      0);

  const y =
    cssVars["--car-frame-y"] ||
    (frame.translateYPct ??
      frame.translateYPercent ??
      frame.translateY ??
      frame.y ??
      (stageKey === "mobileHero" ? 5 : 7));

  const origin =
    cssVars["--car-frame-origin"] || frame.transformOrigin || "center bottom";

  return {
    "--car-frame-scale": String(scale),
    "--car-frame-x": cssPercent(x, 0),
    "--car-frame-y": cssPercent(y, stageKey === "mobileHero" ? 5 : 7),
    "--car-frame-origin": origin,
  };
};

function fireAction(label, payload = {}, onAction) {
  const vehicle = payload.vehicle || null;
  const color = payload.color || payload.selectedColor || null;
  const query =
    payload.query ||
    (vehicle
      ? `${label} ${getVehicleTitle(vehicle)}${color ? ` ${color.desktopName || color.name}` : ""}`
      : label);

  emitAciAction(
    {
      id:
        payload.id ||
        makeSlug(`${label}-${vehicle?.id || vehicle?.model || ""}`),
      label,
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
        anchorCity: vehicle?.city,
        selectedColor: color,
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
      className={`colors-logo ${mobile ? "mobile" : ""}`}
      onClick={() =>
        fireAction("Home", { type: "go_home", intent: "" }, onAction)
      }
    >
      <span>ACI</span>
      <strong>ASSIST</strong>
      {!mobile ? <Sparkles size={14} /> : null}
    </button>
  );
}

function ColorOrb({ color, selected, large = false }) {
  return (
    <span
      className={`color-orb ${selected ? "selected" : ""} ${large ? "large" : ""}`}
      style={{
        background: `
          radial-gradient(circle at 32% 24%, rgba(255,255,255,.98), transparent 18%),
          radial-gradient(circle at 40% 34%, ${color.hex}, ${color.deep} 78%)
        `,
      }}
    >
      <i />
      {selected ? (
        <b>
          <Check size={large ? 18 : 12} strokeWidth={3.4} />
        </b>
      ) : null}
    </span>
  );
}

function VehicleArtwork({ color, vehicle, size = "desktop" }) {
  const imageUrl = getVehicleImage(vehicle, color);

  const stageKey =
    size === "mobile"
      ? "mobileHero"
      : size === "compact"
        ? "chatCard"
        : "colorStudio";

  const frameStyle = buildImageFrameStyle(color?.imageFrame, stageKey);

  return (
    <div
      className={`safari-vehicle ${size}`}
      style={{
        "--paint": color.hex,
        "--deep": color.deep,
        "--car-frame-scale": "1",
        "--car-frame-x": "0%",
        "--car-frame-y": stageKey === "mobileHero" ? "5%" : "7%",
        "--car-frame-origin": "center bottom",
        ...(frameStyle || {}),
      }}
    >
      <div className="safari-vehicle-inner">
        <CarImageStage
          src={imageUrl}
          alt={`${getVehicleTitle(vehicle)} in ${color.mobileName || color.colorName || color.name}`}
          stageVariant="hero"
          className={`safari-stage ${size}`}
          imageClassName="safari-stage-image"
          fallbackLabel={getVehicleModel(vehicle)}
        />
      </div>
    </div>
  );
}

function DesktopHeader({ data, onAction }) {
  return (
    <motion.header className="colors-desktop-header" variants={fadeUp}>
      <Logo onAction={onAction} />

      <div className="desktop-actions">
        <button
          type="button"
          className="icon-bell"
          onClick={() => fireAction("Notifications", {}, onAction)}
        >
          <Bell size={22} />
          <i />
        </button>

        <button
          type="button"
          className="avatar-button"
          onClick={() => fireAction("Profile", {}, onAction)}
        >
          <img src={data?.avatarUrl} alt="Profile" />
        </button>

        <button
          type="button"
          className="plain-icon"
          onClick={() => fireAction("Profile menu", {}, onAction)}
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </motion.header>
  );
}

function DesktopGallery({ selectedColor, vehicle }) {
  return (
    <motion.section className="desktop-gallery-card" variants={fadeUp}>
      <div
        className="desktop-stage"
        style={{ background: COLOR_STAGE_BG.desktop }}
      >
        <span className="stage-pill">
          <ColorOrb color={selectedColor} selected={false} />
          {selectedColor.desktopName}
        </span>

        <div className="stage-lines" />

        <motion.div
          className="desktop-gallery-angle"
          animate={{ opacity: 1, scale: 1 }}
        >
          <VehicleArtwork
            color={selectedColor}
            vehicle={vehicle}
            size="desktop"
          />
        </motion.div>
      </div>
    </motion.section>
  );
}

function DesktopRail({ colors, selectedColor, vehicle, onAction }) {
  const hasPopularity = colors.some(
    (item) => item.hasPopularity && Number(item.votes || 0) > 0,
  );

  const topChoices = hasPopularity
    ? [...colors]
        .filter((item) => item.hasPopularity && Number(item.votes || 0) > 0)
        .sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0))
        .slice(0, 3)
    : [];

  return (
    <aside className="colors-rail">
      <motion.article
        className="rail-card selected-color-card"
        variants={fadeUp}
      >
        <h3>Selected color</h3>

        <div className="selected-color-summary">
          <ColorOrb color={selectedColor} selected={false} />

          <div>
            <strong>{selectedColor.desktopName}</strong>
            <span>{getVehicleTitle(vehicle)}</span>
          </div>
        </div>

        <p>{selectedColor.description}</p>

        <button
          type="button"
          className="primary-rail-button"
          onClick={() =>
            fireAction(
              "Use this color",
              {
                vehicle: {
                  ...vehicle,
                  selectedColor,
                  colorName: selectedColor.desktopName,
                  imageUrl: selectedColor.imageUrl,
                  normalizedImageUrl: selectedColor.normalizedImageUrl,
                  imageFrame: selectedColor.imageFrame,
                },
                selectedColor,
                color: selectedColor,
                type: "select_color",
                contextPatch: {
                  selectedColor,
                  selectedVehicle: {
                    ...vehicle,
                    selectedColor,
                    colorName: selectedColor.desktopName,
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
          Use this color <ChevronRight size={15} />
        </button>
      </motion.article>

      <motion.article
        className="rail-card available-shades-card"
        variants={fadeUp}
      >
        <div className="rail-title-row">
          <h3>Available shades</h3>
          <Palette size={16} />
        </div>

        <strong>{colors.length}</strong>
        <p>
          Exterior colors found for {getVehicleTitle(vehicle)}. Availability may
          vary by variant and city.
        </p>
      </motion.article>

      {hasPopularity ? (
        <motion.article className="rail-card popular-card" variants={fadeUp}>
          <div className="rail-title-row">
            <h3>Popular choice</h3>
            <Info size={16} />
          </div>

          <div className="popular-choice-list">
            {topChoices.map((item, index) => (
              <div key={item.id}>
                <span>{index + 1}</span>
                <strong>{item.desktopName}</strong>
                <em>{item.votes}%</em>
                <i style={{ width: `${Math.max(48, item.votes * 2.1)}px` }} />
              </div>
            ))}
          </div>
        </motion.article>
      ) : null}
    </aside>
  );
}

function DesktopColorsPage({
  colors,
  selectedColor,
  setSelectedColor,

  vehicle,
  data,
  onAction,
}) {
  return (
    <>
      <DesktopHeader data={data} onAction={onAction} />

      <motion.main
        className="colors-desktop-page"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <section className="desktop-main">
          <motion.div className="desktop-title" variants={fadeUp}>
            <div>
              <button
                type="button"
                onClick={() =>
                  fireAction(
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

              <h1>
                {getVehicleTitle(vehicle)}
                <span>
                  <Check size={14} strokeWidth={4} />
                </span>
              </h1>

              <p>
                Explore all exterior colors available for{" "}
                {getVehicleTitle(vehicle)}.
              </p>
            </div>

            <button
              type="button"
              className="change-model"
              onClick={() =>
                fireAction(
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
              Change model
            </button>
          </motion.div>

          <DesktopGallery selectedColor={selectedColor} vehicle={vehicle} />

          <motion.section className="available-colors" variants={fadeUp}>
            <h2>Available colors</h2>

            <div className="available-grid">
              {colors.map((color) => {
                const active = color.id === selectedColor.id;

                return (
                  <motion.button
                    type="button"
                    key={color.id}
                    className={active ? "active" : ""}
                    onClick={() => {
                      setSelectedColor(color);
                      fireAction(
                        "Color selected",
                        {
                          vehicle,
                          selectedColor: color,
                          color,
                          type: "color_selected",
                          query: `${getVehicleTitle(vehicle)} ${color.desktopName} color`,
                        },
                        onAction,
                      );
                    }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ColorOrb color={color} selected={active} />
                    <span>{color.desktopName}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          <AciComposer
            selectedVehicle={vehicle}
            onAction={onAction}
            placeholder={`Ask ACI Assist anything about ${getVehicleTitle(vehicle)}...`}
          />
        </section>

        <DesktopRail
          colors={colors}
          selectedColor={selectedColor}
          vehicle={vehicle}
          onAction={onAction}
        />
      </motion.main>
    </>
  );
}

function MobileHeader({ data, vehicle, onAction }) {
  return (
    <motion.header className="colors-mobile-header" variants={fadeUp}>
      <button
        type="button"
        className="mobile-back"
        onClick={() =>
          fireAction(
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
        <ArrowLeft size={28} />
      </button>

      <Logo mobile onAction={onAction} />

      <div>
        <button
          type="button"
          className="mobile-bell"
          onClick={() => fireAction("Notifications", {}, onAction)}
        >
          <Bell size={24} />
          <i />
        </button>

        <button
          type="button"
          className="mobile-avatar"
          onClick={() => fireAction("Profile", {}, onAction)}
        >
          <img src={data?.avatarUrl} alt="Profile" />
        </button>
      </div>
    </motion.header>
  );
}

function MobileHero({
  selectedColor,

  vehicle,
  colors,
  onNextColor,
  onPrevColor,
}) {
  return (
    <motion.section className="mobile-hero-section" variants={fadeUp}>
      <div className="mobile-title">
        <h1>Choose your color</h1>
        <p>
          {[getVehicleModel(vehicle), getVehicleVariant(vehicle)]
            .filter(Boolean)
            .join(" ")}
        </p>
      </div>

      <motion.div
        className="mobile-car-card"
        style={{ background: COLOR_STAGE_BG.mobile }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.14}
        onDragEnd={(_, info) => {
          if (info.offset.x < -42) onNextColor();
          if (info.offset.x > 42) onPrevColor();
        }}
      >
        <div className="mobile-card-lines" />

        <div className="mobile-price">
          <strong>{getVehiclePrice(vehicle)}</strong>
          <Info size={15} />
        </div>

        <span className="mobile-count">
          <Palette size={17} />
          {colors.length} colors
        </span>

        <VehicleArtwork color={selectedColor} vehicle={vehicle} size="mobile" />
      </motion.div>
    </motion.section>
  );
}

function MobileColorPicker({
  colors,
  selectedColor,
  setSelectedColor,
  vehicle,
  onAction,
  showAll,
  setShowAll,
}) {
  const visible = showAll ? colors : colors.slice(0, 6);

  return (
    <motion.section className="mobile-color-picker" variants={fadeUp}>
      {visible.map((color) => {
        const active = color.id === selectedColor.id;

        return (
          <motion.button
            type="button"
            key={color.id}
            className={active ? "active" : ""}
            onClick={() => {
              setSelectedColor(color);
              fireAction(
                "Color selected",
                {
                  vehicle,
                  selectedColor: color,
                  color,
                  type: "color_selected",
                  query: `${getVehicleTitle(vehicle)} ${color.mobileName} color`,
                },
                onAction,
              );
            }}
            whileTap={{ scale: 0.95 }}
          >
            <ColorOrb color={color} selected={active} large />
            <span>{getColorDisplayLabel(color.mobileName || color.name)}</span>
          </motion.button>
        );
      })}

      {colors.length > 6 ? (
        <button
          type="button"
          className="mobile-colors-toggle"
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll ? "Show fewer colors" : `View all ${colors.length} colors`}
        </button>
      ) : null}
    </motion.section>
  );
}

function MobileSelectedColorInfo({ selectedColor }) {
  return (
    <motion.section className="mobile-selected-color-info" variants={fadeUp}>
      <p>Selected color</p>
      <strong>{selectedColor.name}</strong>
      <small>Color availability may vary by variant and city.</small>
    </motion.section>
  );
}

function MobileColorsPage({
  colors,
  selectedColor,
  setSelectedColor,

  vehicle,
  data,
  onAction,
}) {
  const currentIndex = colors.findIndex((item) => item.id === selectedColor.id);
  const [showAllColors, setShowAllColors] = useState(false);

  const setByIndex = (nextIndex) => {
    const safeIndex = (nextIndex + colors.length) % colors.length;
    const nextColor = colors[safeIndex];

    setSelectedColor(nextColor);
    fireAction(
      "Color selected",
      {
        vehicle,
        selectedColor: nextColor,
        color: nextColor,
        type: "color_selected",
        query: `${getVehicleTitle(vehicle)} ${nextColor.mobileName} color`,
      },
      onAction,
    );
  };

  return (
    <motion.main
      className="colors-mobile-page"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <MobileHeader data={data} vehicle={vehicle} onAction={onAction} />

      <MobileHero
        colors={colors}
        vehicle={vehicle}
        selectedColor={selectedColor}
        onNextColor={() => setByIndex(currentIndex + 1)}
        onPrevColor={() => setByIndex(currentIndex - 1)}
      />

      <MobileColorPicker
        colors={colors}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        vehicle={vehicle}
        onAction={onAction}
        showAll={showAllColors}
        setShowAll={setShowAllColors}
      />

      <MobileSelectedColorInfo selectedColor={selectedColor} />

      <AciComposer
        mobile
        selectedVehicle={vehicle}
        onAction={onAction}
        placeholder={`Ask ACI Assist about ${getVehicleModel(vehicle)} colors...`}
      />
    </motion.main>
  );
}

export default function AciAssistColorsScreen({
  data,
  vehicle,
  widget,
  onAction,
}) {
  const activeVehicle = useMemo(
    () => vehicle || data?.selectedVehicle || {},
    [vehicle, data?.selectedVehicle],
  );
  const colors = useMemo(
    () => normalizeColors(activeVehicle, widget),
    [activeVehicle, widget],
  );
  const [selectedColorId, setSelectedColorId] = useState(colors[0]?.id || "");

  useEffect(() => {
    if (!colors.some((item) => item.id === selectedColorId)) {
      setSelectedColorId(colors[0]?.id || "");
    }
  }, [colors, selectedColorId]);

  if (!colors.length) {
    return (
      <div className="aci-colors-root">
        <style>{`
          .aci-colors-root {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 28px;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
            color: #0f172a;
          }

          .aci-live-empty {
            width: min(520px, 100%);
            border: 1px solid #dbe3ef;
            border-radius: 28px;
            background: rgba(255,255,255,.96);
            box-shadow: 0 24px 74px -56px rgba(15,23,42,.52);
            padding: 28px;
            text-align: center;
          }

          .aci-live-empty h2 {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 34px;
            line-height: 1;
            letter-spacing: -.05em;
          }

          .aci-live-empty p {
            margin: 14px 0 22px;
            color: #64748b;
            line-height: 1.5;
          }

          .aci-live-empty button {
            height: 44px;
            border: 0;
            border-radius: 999px;
            padding: 0 18px;
            background: linear-gradient(135deg, #2563eb, #1455ef);
            color: white;
            font-weight: 750;
            cursor: pointer;
          }
        `}</style>

        <section className="aci-live-empty">
          <h2>No live color data found</h2>
          <p>
            Backend was reached, but it did not return colors for{" "}
            {getVehicleTitle(activeVehicle)}. I am not showing demo colors here.
          </p>
          <button
            type="button"
            onClick={() =>
              fireAction(
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
    colors.find((item) => item.id === selectedColorId) ||
    colors[0] ||
    FALLBACK_COLORS[0];

  const setSelectedColor = (color) => setSelectedColorId(color.id);

  const meta = {
    color: selectedColor.mobileName,
  };

  return (
    <div className="aci-colors-root" data-color={meta.color}>
      <style>{`
        :root {
          --blue: #2563eb;
          --blue-dark: #1455ef;
          --ink: #080f2b;
          --text: #334155;
          --muted: #64748b;
          --line: #dbe3ef;
          --surface: rgba(255,255,255,.94);
          --shadow: 0 24px 74px -56px rgba(15,23,42,.52);
          --serif: Georgia, "Times New Roman", serif;
        }

        html,
        body,
        #root {
          min-height: 100%;
          margin: 0;
          overflow-x: hidden;
        }

        * {
          box-sizing: border-box;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .aci-colors-root {
          min-height: 100vh;
          padding-bottom: 118px;
          color: var(--ink);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background:
            radial-gradient(circle at 85% -8%, rgba(37,99,235,.08), transparent 28%),
            linear-gradient(180deg, #fff 0%, #f8fbff 100%);
          -webkit-font-smoothing: antialiased;
        }

        .colors-mobile-page {
          display: none;
        }

        .colors-logo {
          border: 0;
          background: transparent;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: var(--ink);
        }

        .colors-logo span {
          color: var(--blue);
          font-size: 34px;
          line-height: .9;
          font-weight: 900;
          letter-spacing: -4px;
          transform: skewX(-9deg);
        }

        .colors-logo strong {
          font-size: 15px;
          line-height: 1;
          letter-spacing: 6px;
          font-weight: 760;
        }

        .colors-logo svg {
          color: var(--blue);
          fill: currentColor;
        }

        .colors-desktop-header,
        .colors-desktop-page {
          width: min(100%, 1510px);
          margin-inline: auto;
        }

        .colors-desktop-header {
          position: sticky;
          top: 0;
          z-index: 80;
          height: 82px;
          padding: 14px 40px 8px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,.97), rgba(255,255,255,.88));
          backdrop-filter: blur(18px);
        }

        .desktop-gallery-card,
        .available-grid button,
        .rail-card,
        .colors-composer,
        .mobile-car-card,
        
        .mobile-back,
        .mobile-color-picker .color-orb {
          border: 1px solid var(--line);
          background: var(--surface);
          box-shadow: var(--shadow), inset 0 1px 0 #fff;
          backdrop-filter: blur(18px);
        }

        .desktop-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 13px;
        }

        .icon-bell,
        .plain-icon {
          position: relative;
          width: 38px;
          height: 38px;
          border: 0;
          background: transparent;
          display: grid;
          place-items: center;
          color: #475569;
        }

        .icon-bell i,
        .mobile-bell i {
          position: absolute;
          top: 5px;
          right: 7px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--blue);
          border: 2px solid #fff;
        }

        .avatar-button,
        .mobile-avatar {
          width: 48px;
          height: 48px;
          border: 0;
          border-radius: 999px;
          padding: 3px;
          background: #fff;
          box-shadow:
            0 0 0 1px #dbe5f2,
            0 10px 24px -14px rgba(37,99,235,.45);
        }

        .avatar-button img,
        .mobile-avatar img {
          width: 100%;
          height: 100%;
          border-radius: inherit;
          object-fit: cover;
          display: block;
        }

        .colors-desktop-page {
          padding: 20px 40px 130px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 24px;
          align-items: start;
        }

        .desktop-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .desktop-title {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
        }

        .desktop-title button {
          border: 0;
          background: transparent;
          color: #334155;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 620;
        }

        .desktop-title h1 {
          margin: 21px 0 8px;
          color: #0b1028;
          font-family: var(--serif);
          font-size: 38px;
          line-height: .95;
          letter-spacing: -.055em;
          font-weight: 610;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .desktop-title h1 span {
          width: 21px;
          height: 21px;
          border-radius: 999px;
          background: var(--blue);
          color: white;
          display: grid;
          place-items: center;
        }

        .desktop-title p {
          margin: 0;
          color: #475569;
          font-size: 14px;
          font-weight: 460;
        }

        .change-model {
          height: 40px;
          padding: 0 17px !important;
          border-radius: 13px !important;
          border: 1px solid #dfe7f2 !important;
          background: #fff !important;
          color: #334155 !important;
          box-shadow: 0 12px 28px -24px rgba(15,23,42,.28);
        }

        .desktop-gallery-card {
          border-radius: 24px;
          overflow: hidden;
        }

        .desktop-stage {
          position: relative;
          min-height: 425px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 23px;
        }

        .desktop-stage::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(165deg, rgba(255,255,255,.24), transparent 42%),
            radial-gradient(circle at 50% 88%, rgba(15,23,42,.13), transparent 36%);
          pointer-events: none;
        }

        .stage-lines,
        .mobile-card-lines {
          position: absolute;
          inset: 0;
          opacity: .78;
          background:
            repeating-radial-gradient(
              ellipse at 78% 36%,
              rgba(255,255,255,.42) 0,
              rgba(255,255,255,.42) 2px,
              transparent 3px,
              transparent 24px
            );
          pointer-events: none;
        }

        .stage-pill {
          position: absolute;
          top: 22px;
          left: 22px;
          z-index: 6;
          height: 36px;
          padding: 0 13px 0 9px;
          border-radius: 12px;
          background: rgba(255,255,255,.93);
          color: #1e293b;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 650;
          box-shadow: 0 14px 30px -24px rgba(15,23,42,.36);
        }

        .stage-pill .color-orb {
          width: 18px;
          height: 18px;
          border: 0;
          box-shadow: inset 0 3px 6px rgba(255,255,255,.32);
        }

        .stage-pill .color-orb i {
          display: none;
        }

        .desktop-gallery-angle {
          width: min(820px, 93%);
          position: relative;
          z-index: 4;
        }

        .safari-vehicle {
          position: relative;
          z-index: 4;
          width: 100%;
          display: grid;
          place-items: center;
          pointer-events: none;
        }

        .safari-vehicle-inner {
          position: relative;
          width: 100%;
          display: grid;
          place-items: center;
        }

        .safari-stage-image {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain;
          user-select: none;
          filter: var(--car-filter) drop-shadow(0 24px 24px rgba(15,23,42,.22));
          mix-blend-mode: multiply;
          transition: filter .34s ease, opacity .34s ease;
        }

        

        .safari-vehicle.desktop {
          width: 100%;
          transform: translateY(24px);
        }

        .safari-stage {
          width: 100%;
          height: 100%;
        }

        .available-colors h2 {
          margin: 0 0 12px;
          color: #1e293b;
          font-size: 15px;
          font-weight: 650;
        }

        .available-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 16px;
        }

        .available-grid button {
          min-height: 136px;
          border-radius: 17px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 13px;
          color: #334155;
          font-size: 12px;
          font-weight: 560;
        }

        .available-grid button.active {
          border-color: var(--blue);
          box-shadow:
            0 0 0 3px rgba(37,99,235,.08),
            0 22px 60px -50px rgba(37,99,235,.7);
        }

        .color-orb {
          position: relative;
          width: 58px;
          height: 58px;
          flex: 0 0 auto;
          border-radius: 999px;
          box-shadow:
            inset 0 8px 16px rgba(255,255,255,.34),
            inset 0 -12px 22px rgba(15,23,42,.24),
            0 14px 28px -20px rgba(15,23,42,.45);
          border: 1px solid rgba(255,255,255,.78);
        }

        .color-orb.large {
          width: 44px;
          height: 44px;
        }

        .color-orb.selected {
          box-shadow:
            0 0 0 3px #fff,
            0 0 0 5px var(--blue),
            inset 0 8px 16px rgba(255,255,255,.32),
            inset 0 -12px 22px rgba(15,23,42,.24),
            0 16px 30px -18px rgba(37,99,235,.45);
        }

        .color-orb i {
          position: absolute;
          left: 21%;
          top: 17%;
          width: 25%;
          height: 25%;
          border-radius: 999px;
          background: rgba(255,255,255,.72);
          filter: blur(2px);
        }

        .color-orb b {
          position: absolute;
          right: -4px;
          top: -4px;
          width: 21px;
          height: 21px;
          border-radius: 999px;
          background: var(--blue);
          color: white;
          display: grid;
          place-items: center;
          border: 2px solid white;
          box-shadow: 0 6px 16px rgba(37,99,235,.38);
        }

        .color-orb.large b {
          width: 23px;
          height: 23px;
          right: -7px;
          top: -7px;
        }

        .colors-rail {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .rail-card {
          border-radius: 20px;
          padding: 16px;
        }

        .rail-card h3,
        .rail-title-row h3 {
          margin: 0;
          color: #0f172a;
          font-size: 16px;
          line-height: 1;
          font-weight: 650;
        }

        .selected-color-banner {
          min-height: 102px;
          margin-top: 16px;
          border-radius: 14px;
          padding: 16px;
          color: white;
          display: flex;
          align-items: center;
          gap: 14px;
          overflow: hidden;
        }

        .selected-color-banner .color-orb {
          width: 54px;
          height: 54px;
          border: 2px solid rgba(255,255,255,.7);
        }

        .selected-color-banner .color-orb b {
          display: none;
        }

        .selected-color-banner strong {
          display: block;
          font-size: 15px;
          line-height: 1.1;
          font-weight: 720;
        }

        .selected-color-banner span {
          display: block;
          margin-top: 5px;
          font-size: 11px;
          line-height: 1.4;
          opacity: .88;
        }

        .selected-color-card p {
          margin: 15px 0 17px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .primary-rail-button,
        .secondary-rail-button {
          width: 100%;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 650;
          margin-top: 10px;
        }

        .primary-rail-button {
          border: 0;
          background: linear-gradient(135deg, var(--blue), var(--blue-dark));
          color: #fff;
        }

        .secondary-rail-button {
          border: 1px solid rgba(37,99,235,.28);
          background: #fff;
          color: var(--blue);
        }

        .rail-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .rail-title-row svg {
          color: #64748b;
        }

        .popular-choice-list {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .popular-choice-list div {
          position: relative;
          display: grid;
          grid-template-columns: 22px 1fr 40px;
          gap: 9px;
          align-items: center;
          padding-bottom: 10px;
        }

        .popular-choice-list span {
          color: #0f172a;
          font-size: 13px;
          font-weight: 700;
        }

        .popular-choice-list strong {
          color: #334155;
          font-size: 12px;
          font-weight: 600;
        }

        .popular-choice-list em {
          color: #64748b;
          font-size: 12px;
          font-style: normal;
          text-align: right;
        }

        .popular-choice-list div::after {
          content: "";
          position: absolute;
          left: 31px;
          right: 42px;
          bottom: 0;
          height: 3px;
          border-radius: 999px;
          background: #e5e7eb;
        }

        .popular-choice-list i {
          position: absolute;
          left: 31px;
          bottom: 0;
          height: 3px;
          border-radius: 999px;
          background: var(--blue);
          z-index: 2;
        }

        .rail-link {
          margin-top: 18px;
          border: 0;
          background: transparent;
          color: var(--blue);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 650;
        }

        

        .rail-note {
          margin: 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.4;
          padding: 0 8px;
        }

        .colors-composer-dock {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 160;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 24px 14px;
          background: linear-gradient(
            180deg,
            rgba(248,251,255,0),
            rgba(248,251,255,.88) 28%,
            rgba(248,251,255,.98) 100%
          );
          backdrop-filter: blur(14px);
        }

        .colors-composer {
          width: min(860px, calc(100vw - 64px));
          min-height: 62px;
          padding: 6px 8px 6px 10px;
          border-radius: 30px;
          display: grid;
          grid-template-columns: 48px 1fr 36px 54px;
          gap: 10px;
          align-items: center;
          border: 1px solid #cbd5e1;
          background: rgba(255,255,255,.97);
          box-shadow: var(--shadow), inset 0 1px 0 #fff;
        }

        .colors-composer button:first-child {
          width: 48px;
          height: 48px;
          border: 1px solid #e0e7f1;
          border-radius: 19px;
          background: radial-gradient(circle at 35% 28%, #fff 0%, #eef5ff 100%);
          color: var(--blue);
          display: grid;
          place-items: center;
        }

        .colors-composer button:first-child svg {
          fill: currentColor;
        }

        .colors-composer input {
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1e293b;
          font-size: 14px;
          font-weight: 460;
        }

        .colors-composer input::placeholder {
          color: #94a3b8;
        }

        .colors-composer button:nth-of-type(2) {
          width: 36px;
          height: 36px;
          border: 0;
          background: transparent;
          color: #526075;
          display: grid;
          place-items: center;
        }

        .colors-composer button:last-child {
          width: 54px;
          height: 48px;
          border: 0;
          border-radius: 18px;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--blue-dark));
          display: grid;
          place-items: center;
          box-shadow: 0 18px 36px -22px rgba(37,99,235,.58);
        }

        .colors-composer-dock p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 460;
        }

        @media (max-width: 1180px) and (min-width: 901px) {
          .colors-desktop-header {
            padding-inline: 24px;
          }

          .colors-desktop-page {
            grid-template-columns: 1fr;
            padding-inline: 24px;
          }

          .colors-rail {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
          }

          .rail-note {
            display: none;
          }
        }

        @media (max-width: 900px) {
          .colors-desktop-header,
          .colors-desktop-page {
            display: none;
          }

          .aci-colors-root {
            padding-bottom: 96px;
            background:
              radial-gradient(circle at 50% 100%, rgba(37,99,235,.11), transparent 26%),
              linear-gradient(180deg, #fff 0%, #fbfcff 55%, #f8fbff 100%);
          }

          .colors-mobile-page {
            width: 100%;
            max-width: 430px;
            min-height: 100vh;
            margin: 0 auto;
            padding: 18px 14px 108px;
            display: flex;
            flex-direction: column;
            gap: 15px;
          }

          .colors-mobile-header {
            display: grid;
            grid-template-columns: 50px minmax(0, 1fr) auto;
            gap: 10px;
            align-items: center;
          }

          .mobile-back {
            width: 50px;
            height: 50px;
            border-radius: 999px;
            border: 0;
            background: #fff;
            color: #0f172a;
            display: grid;
            place-items: center;
          }

          .colors-logo.mobile {
            justify-self: start;
            gap: 10px;
          }

          .colors-logo.mobile span {
            font-size: 31px;
          }

          .colors-logo.mobile strong {
            font-size: 14px;
            letter-spacing: 6px;
          }

          .colors-mobile-header > div {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .mobile-bell {
            position: relative;
            width: 34px;
            height: 34px;
            border: 0;
            background: transparent;
            color: #596174;
            display: grid;
            place-items: center;
          }

          .mobile-avatar {
            width: 44px;
            height: 44px;
          }

          .mobile-title h1 {
            margin: 0 0 7px;
            color: #07102b;
            font-family: var(--serif);
            font-size: 34px;
            line-height: .97;
            letter-spacing: -.06em;
            font-weight: 620;
          }

          .mobile-title p {
            margin: 0 0 14px;
            color: #7b8494;
            font-size: 18px;
            line-height: 1;
            font-weight: 450;
          }

          .mobile-car-card {
            position: relative;
            min-height: 314px;
            border-radius: 27px;
            overflow: hidden;
            display: grid;
            place-items: center;
          }

          .mobile-car-card::after {
            content: "";
            position: absolute;
            inset: 0;
            background:
              linear-gradient(165deg, rgba(255,255,255,.24), transparent 42%),
              radial-gradient(circle at 50% 88%, rgba(15,23,42,.12), transparent 36%);
            pointer-events: none;
          }

          .mobile-card-lines {
            opacity: .82;
          }

          .mobile-price {
            position: absolute;
            z-index: 8;
            left: 15px;
            top: 17px;
            color: #475569;
            display: flex;
            align-items: center;
            gap: 9px;
          }

          .mobile-price strong {
            color: #475569;
            font-size: 16px;
            line-height: 1;
            font-weight: 600;
            letter-spacing: -.02em;
          }

          .mobile-count {
            position: absolute;
            z-index: 8;
            right: 15px;
            top: 14px;
            height: 38px;
            padding: 0 13px;
            border-radius: 999px;
            border: 1px solid #dfe7f2;
            background: rgba(255,255,255,.78);
            color: #475569;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            font-size: 13px;
            font-weight: 540;
          }

          .safari-vehicle.mobile {
            width: 126%;
            transform: translateY(31px);
          }

          .safari-vehicle.mobile .safari-stage-image {
            filter: var(--car-filter) drop-shadow(0 24px 24px rgba(15,23,42,.23));
          }

          .mobile-color-picker {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 10px 8px;
            align-items: start;
            padding: 0 4px;
          }

          .mobile-color-picker button {
            border: 0;
            background: transparent;
            padding: 0;
            color: #475569;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 9px;
            min-width: 0;
          }

          .mobile-color-picker span:not(.color-orb) {
            min-height: 28px;
            color: #475569;
            font-size: 10.5px;
            line-height: 1.15;
            font-weight: 430;
            text-align: center;
          }

          .mobile-color-picker button.active span:not(.color-orb) {
            color: var(--blue);
            font-weight: 560;
          }

          .mobile-colors-toggle {
            grid-column: 1 / -1;
            margin-top: 2px;
            height: 34px;
            border-radius: 999px;
            border: 1px solid #dbe3ef;
            background: rgba(255,255,255,.92);
            color: #2563eb;
            font-size: 12px;
            font-weight: 620;
          }

          .mobile-selected-color-info {
            border: 1px solid #dbe3ef;
            border-radius: 20px;
            padding: 14px;
            background: rgba(255,255,255,.95);
          }

          .mobile-selected-color-info p {
            margin: 0;
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .08em;
            font-weight: 700;
          }

          .mobile-selected-color-info strong {
            display: block;
            margin-top: 6px;
            color: #0f172a;
            font-size: 16px;
            line-height: 1.2;
            font-weight: 700;
          }

          .mobile-selected-color-info small {
            display: block;
            margin-top: 7px;
            color: #64748b;
            font-size: 11px;
            line-height: 1.3;
          }


          .mobile-chat-dock {
            position: fixed;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            z-index: 160;
            width: min(430px, 100vw);
            padding: 10px 14px 14px;
            background: linear-gradient(
              180deg,
              rgba(248,251,255,0),
              rgba(248,251,255,.92) 26%,
              rgba(248,251,255,1) 100%
            );
            backdrop-filter: blur(14px);
          }

          .mobile-chatbar {
            min-height: 60px;
            border-radius: 28px;
            border: 1px solid rgba(37,99,235,.18);
            background: rgba(255,255,255,.97);
            box-shadow:
              0 0 0 5px rgba(37,99,235,.04),
              0 20px 44px -34px rgba(37,99,235,.45),
              inset 0 1px 0 rgba(255,255,255,1);
            display: grid;
            grid-template-columns: 42px 1fr 30px 48px;
            gap: 8px;
            align-items: center;
            padding: 6px 7px 6px 8px;
          }

          .mobile-chatbar button:first-child {
            width: 40px;
            height: 40px;
            border: 1px solid #e0e7f1;
            border-radius: 18px;
            background: radial-gradient(circle at 35% 28%, #fff 0%, #eef5ff 100%);
            color: var(--blue);
            display: grid;
            place-items: center;
          }

          .mobile-chatbar button:first-child svg {
            fill: currentColor;
          }

          .mobile-chatbar input {
            min-width: 0;
            border: 0;
            outline: 0;
            background: transparent;
            color: #1e293b;
            font-size: 13px;
            font-weight: 460;
          }

          .mobile-chatbar input::placeholder {
            color: #94a3b8;
          }

          .mobile-chatbar button:nth-of-type(2) {
            width: 30px;
            height: 36px;
            border: 0;
            background: transparent;
            color: #526075;
            display: grid;
            place-items: center;
          }

          .mobile-chatbar button:last-child {
            width: 48px;
            height: 46px;
            border: 0;
            border-radius: 17px;
            color: #fff;
            background: linear-gradient(135deg, var(--blue), var(--blue-dark));
            display: grid;
            place-items: center;
            box-shadow: 0 18px 36px -22px rgba(37,99,235,.58);
          }
        }

        @media (max-width: 390px) {
          .colors-mobile-page {
            padding-inline: 12px;
          }

          .colors-mobile-header {
            grid-template-columns: 48px minmax(0, 1fr) auto;
          }

          .mobile-back {
            width: 48px;
            height: 48px;
          }

          .colors-logo.mobile span {
            font-size: 29px;
          }

          .colors-logo.mobile strong {
            font-size: 13px;
            letter-spacing: 5.6px;
          }

          .mobile-title h1 {
            font-size: 31px;
          }

          .mobile-title p {
            font-size: 16px;
          }

          .mobile-car-card {
            min-height: 292px;
          }

          .safari-vehicle.mobile {
            width: 136%;
          }

          .color-orb.large {
            width: 42px;
            height: 42px;
          }

          .mobile-color-picker span:not(.color-orb) {
            font-size: 10px;
          }
        }

        /* ACI_COLORS_POLISH_FIXES_START */

        /* Desktop: reduce wasted top space */
        .colors-desktop-header {
          height: 58px !important;
          padding: 8px 40px 4px !important;
        }

        .colors-desktop-page {
          padding-top: 6px !important;
        }

        .desktop-title h1 {
          margin-top: 8px !important;
        }

        .desktop-title p {
          margin-top: 2px !important;
        }

        .desktop-stage {
          min-height: 382px !important;
        }

        .desktop-gallery-angle {
          width: min(760px, 88%) !important;
        }

        .safari-vehicle.desktop {
          transform: translateY(10px) !important;
        }

        /* Mobile: remove horizontal overflow completely */
        @media (max-width: 900px) {
          html,
          body,
          #root,
          .aci-colors-root {
            overflow-x: hidden !important;
          }

          .aci-colors-root {
            padding-bottom: 90px !important;
          }

          .colors-mobile-page {
            max-width: min(430px, 100vw) !important;
            padding: 10px 14px 92px !important;
            gap: 10px !important;
            overflow-x: hidden !important;
          }

          .colors-mobile-header {
            min-height: 46px !important;
          }

          .mobile-back {
            width: 44px !important;
            height: 44px !important;
          }

          .mobile-avatar {
            width: 40px !important;
            height: 40px !important;
          }

          .colors-logo.mobile span {
            font-size: 28px !important;
          }

          .colors-logo.mobile strong {
            font-size: 12px !important;
            letter-spacing: 5px !important;
          }

          .mobile-title h1 {
            margin-top: 0 !important;
            font-size: 30px !important;
          }

          .mobile-title p {
            margin-bottom: 10px !important;
            font-size: 15px !important;
          }

          .mobile-car-card {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 284px !important;
            overflow: hidden !important;
            border-radius: 26px !important;
          }

          .mobile-price {
            left: 14px !important;
            top: 14px !important;
          }

          .mobile-count {
            right: 14px !important;
            top: 12px !important;
          }

          .safari-vehicle.mobile {
            width: 108% !important;
            max-width: 108% !important;
            transform: translateY(18px) !important;
            overflow: hidden !important;
          }

          .safari-vehicle.mobile .safari-vehicle-inner {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }

          .safari-vehicle.mobile img {
            width: 100% !important;
            max-width: 100% !important;
            object-fit: contain !important;
            object-position: center center !important;
          }

          .safari-vehicle.mobile .safari-vector {
            width: 100% !important;
            max-width: 100% !important;
          }

          .mobile-color-picker {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 8px 6px !important;
            padding: 0 !important;
          }

          .mobile-color-picker button {
            min-width: 0 !important;
          }

          .color-orb.large {
            width: 40px !important;
            height: 40px !important;
          }

          .mobile-color-picker span:not(.color-orb) {
            font-size: 10px !important;
            line-height: 1.12 !important;
          }


          /* Mobile chatbar: center it and remove blue glow/blur */
          .mobile-chat-dock {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-width: none !important;
            padding: 8px 14px 12px !important;
            display: flex !important;
            justify-content: center !important;
            background: linear-gradient(
              180deg,
              rgba(248,251,255,0),
              rgba(248,251,255,.88) 30%,
              rgba(248,251,255,.98) 100%
            ) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .mobile-chatbar {
            width: min(402px, 100%) !important;
            min-height: 58px !important;
            border-radius: 27px !important;
            border: 1px solid #dbe3ef !important;
            background: rgba(255,255,255,.98) !important;
            box-shadow:
              0 16px 36px -28px rgba(15,23,42,.26),
              inset 0 1px 0 rgba(255,255,255,1) !important;
          }

          .mobile-chatbar button:first-child {
            box-shadow: none !important;
            background: #f5f8ff !important;
          }

          .mobile-chatbar button:last-child {
            box-shadow: 0 14px 26px -20px rgba(37,99,235,.45) !important;
          }
        }

        @media (max-width: 390px) {
          .colors-mobile-page {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .mobile-car-card {
            min-height: 268px !important;
          }

          .safari-vehicle.mobile {
            width: 112% !important;
            max-width: 112% !important;
          }

          .mobile-chat-dock {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }

        /* ACI_COLORS_POLISH_FIXES_END */


        /* ACI_COLORS_CHATBAR_AND_CAR_SIZE_FIX_START */

        /* Desktop: reduce bottom reserve above fixed chatbar */
        .aci-colors-root {
          padding-bottom: 78px !important;
        }

        .colors-desktop-page {
          padding-bottom: 86px !important;
        }

        .colors-composer-dock {
          padding: 6px 24px 8px !important;
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .colors-composer {
          min-height: 58px !important;
          box-shadow:
            0 14px 34px -28px rgba(15,23,42,.24),
            inset 0 1px 0 rgba(255,255,255,1) !important;
        }

        /* Desktop car should sit inside stage without feeling oversized */
        .desktop-stage {
          min-height: 360px !important;
        }

        .desktop-gallery-angle {
          width: min(650px, 76%) !important;
        }

        .safari-vehicle.desktop {
          width: 100% !important;
          transform: translateY(4px) !important;
        }

        .safari-vehicle.desktop img {
          max-height: 315px !important;
          object-fit: contain !important;
        }

        @media (max-width: 900px) {
          /* Remove the artificial blank reserve above the fixed chatbar */
          .aci-colors-root {
            padding-bottom: 68px !important;
          }

          .colors-mobile-page {
            padding-bottom: 70px !important;
            min-height: auto !important;
          }

          /* Mobile car must fit fully inside the card */
          .mobile-car-card {
            min-height: 276px !important;
            max-height: 276px !important;
            overflow: hidden !important;
            display: grid !important;
            place-items: center !important;
          }

          .safari-vehicle.mobile {
            width: 86% !important;
            max-width: 86% !important;
            transform: translateY(10px) !important;
          }

          .safari-vehicle.mobile .safari-vehicle-inner {
            width: 100% !important;
            max-width: 100% !important;
            display: grid !important;
            place-items: center !important;
          }

          .safari-vehicle.mobile img {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 218px !important;
            object-fit: contain !important;
            object-position: center center !important;
            transform: none !important;
          }

          .safari-vehicle.mobile .safari-vector {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 220px !important;
          }

          

          /* Chatbar: no big gradient/blur area above it */
          .mobile-chat-dock {
            padding: 4px 14px 8px !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .mobile-chatbar {
            min-height: 54px !important;
            border-radius: 25px !important;
            box-shadow:
              0 12px 28px -24px rgba(15,23,42,.24),
              inset 0 1px 0 rgba(255,255,255,1) !important;
          }

          .mobile-chatbar button:first-child {
            width: 38px !important;
            height: 38px !important;
          }

          .mobile-chatbar button:last-child {
            width: 44px !important;
            height: 42px !important;
          }

          .mobile-chatbar input {
            font-size: 12.5px !important;
          }
        }

        @media (max-width: 390px) {
          .mobile-car-card {
            min-height: 258px !important;
            max-height: 258px !important;
          }

          .safari-vehicle.mobile {
            width: 88% !important;
            max-width: 88% !important;
            transform: translateY(8px) !important;
          }

          .safari-vehicle.mobile img {
            max-height: 202px !important;
          }

          .safari-vehicle.mobile .safari-vector {
            max-height: 204px !important;
          }

          .colors-mobile-page {
            padding-bottom: 66px !important;
          }

          .mobile-chat-dock {
            padding-bottom: 7px !important;
          }
        }

        /* ACI_COLORS_CHATBAR_AND_CAR_SIZE_FIX_END */

        @media (max-width: 900px) {
          .colors-mobile-page {
            padding-bottom: calc(112px + env(safe-area-inset-bottom)) !important;
          }

          .mobile-chat-dock {
            left: 16px !important;
            right: 16px !important;
            width: auto !important;
            transform: none !important;
            padding: 0 !important;
            bottom: calc(8px + env(safe-area-inset-bottom)) !important;
            background: transparent !important;
          }

          .mobile-chatbar {
            min-height: 68px !important;
            border-radius: 999px !important;
            grid-template-columns: 48px 1fr 36px 54px !important;
            padding: 7px !important;
          }

          .mobile-chatbar button:first-child {
            width: 48px !important;
            height: 48px !important;
            border-radius: 999px !important;
          }

          .mobile-chatbar button:nth-of-type(2) {
            width: 36px !important;
            height: 36px !important;
          }

          .mobile-chatbar button:last-child {
            width: 54px !important;
            height: 54px !important;
            border-radius: 999px !important;
          }

          .mobile-chatbar input {
            font-size: 14px !important;
          }
        }

        /* ACI_COLORS_BACKEND_IMAGE_FRAME_START */

.safari-vehicle {
  --car-frame-scale: 1;
  --car-frame-x: 0%;
  --car-frame-y: 7%;
  --car-frame-origin: center bottom;
}

.safari-vehicle-inner,
.safari-stage {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  position: relative;
}

.safari-stage-image {
  display: block;
  width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center bottom;
  user-select: none;
  mix-blend-mode: normal;
  filter: drop-shadow(0 24px 24px rgba(15,23,42,.2));
  transform-origin: var(--car-frame-origin);
  transform: translate(var(--car-frame-x), var(--car-frame-y)) scale(var(--car-frame-scale));
}

.safari-vehicle.desktop .safari-stage-image {
  max-height: 340px;
}

.safari-vehicle.mobile .safari-stage-image {
  max-height: 232px;
}

.selected-color-summary {
  margin-top: 16px;
  min-height: 86px;
  border-radius: 18px;
  padding: 14px;
  background:
    radial-gradient(circle at 20% 20%, rgba(255,255,255,.78), transparent 28%),
    linear-gradient(135deg, var(--paint), var(--deep));
  display: flex;
  align-items: center;
  gap: 13px;
  color: #fff;
}

.selected-color-summary .color-orb {
  width: 52px;
  height: 52px;
  border: 2px solid rgba(255,255,255,.72);
}

.selected-color-summary .color-orb b {
  display: none;
}

.selected-color-summary strong {
  display: block;
  font-size: 15px;
  line-height: 1.1;
  font-weight: 760;
}

.selected-color-summary span {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  opacity: .9;
}

.selected-color-card p,
.available-shades-card p {
  margin: 14px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.52;
}

.primary-rail-button {
  width: 100%;
  height: 40px;
  margin-top: 16px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--blue), var(--blue-dark));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 760;
}

.available-shades-card > strong {
  display: block;
  margin-top: 14px;
  color: var(--blue);
  font-size: 42px;
  line-height: .9;
  letter-spacing: -.06em;
  font-weight: 850;
}

/* ACI_COLORS_BACKEND_IMAGE_FRAME_END */

      `}</style>

      <DesktopColorsPage
        colors={colors}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        vehicle={activeVehicle}
        data={data}
        onAction={onAction}
      />

      <MobileColorsPage
        colors={colors}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        vehicle={activeVehicle}
        data={data}
        onAction={onAction}
      />
    </div>
  );
}
