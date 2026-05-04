import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImageIcon,
  Palette,
} from "lucide-react";
import { formatDate } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { rowsFrom, valueFrom } from "../canvas-utils";

const clampIndex = (index, length) => {
  if (!length) return 0;
  return ((index % length) + length) % length;
};

const normalizeHex = (value) => {
  if (!value || typeof value !== "string") return "";

  const cleaned = value.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toUpperCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned}`.toUpperCase();
  }

  return "";
};

const isLightHex = (hex) => {
  const value = normalizeHex(hex);
  if (!value) return true;

  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);

  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
};

const getColorName = (color, fallback = "Color") =>
  valueFrom(color, ["colorName", "color_name", "name", "label"], fallback);

const getColorHex = (color) =>
  normalizeHex(
    valueFrom(color, ["hex", "hexCode", "hex_code", "colorHex"], ""),
  );

const getColorImage = (color) =>
  valueFrom(
    color,
    [
      "imageUrl",
      "image_url",
      "image",
      "heroImage",
      "heroImageUrl",
      "vehicleImage",
      "vehicleImageUrl",
      "thumbnail",
      "thumbnailUrl",
      "url",
      "src",
    ],
    "",
  );

function ColorOrb({ hex, name, selected = false, dense = false }) {
  const safeHex = hex || "#E2E8F0";
  const light = isLightHex(safeHex);

  return (
    <div
      className={`relative shrink-0 rounded-full border ${
        dense ? "h-7 w-7 sm:h-9 sm:w-9" : "h-10 w-10 sm:h-12 sm:w-12"
      } ${
        light ? "border-[#dbe3ef]" : "border-white/50"
      } shadow-[inset_0_8px_16px_rgba(255,255,255,0.34),inset_0_-12px_20px_rgba(15,23,42,0.22),0_14px_28px_-20px_rgba(15,23,42,0.45)]`}
      style={{
        background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.94), ${safeHex} 34%, ${safeHex} 62%, rgba(15,23,42,0.38) 140%)`,
      }}
      title={name}
    >
      <div className="absolute left-[22%] top-[18%] h-[24%] w-[24%] rounded-full bg-white/70 blur-[2px]" />

      {selected ? (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-lg ring-2 ring-white">
          <Check size={12} strokeWidth={3} />
        </div>
      ) : null}
    </div>
  );
}

function EmptyColorsState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-[#dbe3ef] bg-white/90 p-10 text-center shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)]"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
        <Palette size={26} />
      </div>

      <h3 className="mt-5 text-xl font-black text-[#0f172a]">
        No colors available
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#64748b]">
        I could not find color images or swatches for this vehicle yet.
      </p>
    </motion.div>
  );
}

export function VehicleColorsCanvas({ message, widget, footer }) {
  const colors = rowsFrom(widget);
  const pointerStartX = useRef(null);

  const model =
    widget.model ||
    widget.data?.model ||
    valueFrom(colors[0], ["model"], message?.entities?.model || "Vehicle");

  const brand =
    widget.brand ||
    widget.data?.brand ||
    valueFrom(colors[0], ["brand", "make"], "");

  const titleModel = [brand, model].filter(Boolean).join(" ") || "Vehicle";

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [copiedHex, setCopiedHex] = useState(false);

  const selectedColor = colors[selectedColorIndex] || colors[0];

  const colorName = selectedColor
    ? getColorName(selectedColor, `Color ${selectedColorIndex + 1}`)
    : "";

  const colorHex = selectedColor ? getColorHex(selectedColor) : "";
  const colorImageUrl = selectedColor ? getColorImage(selectedColor) : "";

  const colorUpdated = selectedColor
    ? valueFrom(selectedColor, ["lastUpdated", "last_updated", "updatedAt"], "")
    : "";

  const denseSwatches = colors.length > 8;
  const ultraDenseSwatches = colors.length > 12;
  const mobileSwatchColumns = Math.min(Math.max(colors.length, 1), 5);

  const goToColor = useCallback(
    (index) => {
      if (!colors.length) return;

      setDirection(index >= selectedColorIndex ? 1 : -1);
      setSelectedColorIndex(clampIndex(index, colors.length));
      setCopiedHex(false);
    },
    [colors.length, selectedColorIndex],
  );

  const nextColor = useCallback(() => {
    if (!colors.length) return;

    setDirection(1);
    setSelectedColorIndex((prev) => clampIndex(prev + 1, colors.length));
    setCopiedHex(false);
  }, [colors.length]);

  const prevColor = useCallback(() => {
    if (!colors.length) return;

    setDirection(-1);
    setSelectedColorIndex((prev) => clampIndex(prev - 1, colors.length));
    setCopiedHex(false);
  }, [colors.length]);

  const copyHex = async () => {
    if (!colorHex) return;

    try {
      await navigator.clipboard?.writeText(colorHex);
      setCopiedHex(true);
      window.setTimeout(() => setCopiedHex(false), 1300);
    } catch {
      setCopiedHex(false);
    }
  };

  useEffect(() => {
    if (!colors.length) return;
    setSelectedColorIndex((prev) => clampIndex(prev, colors.length));
  }, [colors.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!colors.length) return;

      if (event.key === "ArrowRight") nextColor();
      if (event.key === "ArrowLeft") prevColor();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [colors.length, nextColor, prevColor]);

  const heroVariants = {
    enter: (dir) => ({
      opacity: 0,
      x: dir > 0 ? 36 : -36,
      scale: 0.985,
      filter: "blur(5px)",
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: (dir) => ({
      opacity: 0,
      x: dir > 0 ? -36 : 36,
      scale: 0.985,
      filter: "blur(5px)",
    }),
  };

  return (
    <ModernCanvasShell
      title={titleModel}
      subtitle={`Explore ${colors.length || "all"} exterior color options${
        model ? ` for ${model}` : ""
      }.`}
      icon={Palette}
      footer={footer}
      eyebrow="Color studio"
      fullBleed
      compact
      className="!overflow-visible w-full max-w-none"
      bodyClassName="space-y-3 !overflow-visible"
      headerClassName="hidden xl:flex"
    >
      {colors.length > 0 ? (
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3">
          <section className="rounded-[26px] border border-[#dbe3ef] bg-white/92 p-2 shadow-[0_26px_78px_-62px_rgba(15,23,42,0.48)] backdrop-blur-xl sm:rounded-[30px] sm:p-3">
            <div
              className="relative overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-[radial-gradient(circle_at_50%_20%,#ffffff_0%,#f8fafc_42%,#eaf2ff_100%)] sm:rounded-[26px]"
              onPointerDown={(event) => {
                pointerStartX.current = event.clientX;
              }}
              onPointerUp={(event) => {
                if (pointerStartX.current === null) return;

                const delta = event.clientX - pointerStartX.current;
                pointerStartX.current = null;

                if (Math.abs(delta) < 48) return;
                if (delta < 0) nextColor();
                else prevColor();
              }}
              onPointerCancel={() => {
                pointerStartX.current = null;
              }}
            >
              <div
                className="absolute inset-0 opacity-80"
                style={{
                  background: colorHex
                    ? `linear-gradient(135deg, ${colorHex}1F, transparent 42%, ${colorHex}14)`
                    : "linear-gradient(135deg, #2563eb14, transparent 42%, #bfdbfe33)",
                }}
              />

              <div className="absolute left-2 top-2 z-20 flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-[15px] border border-white/75 bg-white/88 px-2 py-1.5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:left-4 sm:top-4 sm:gap-3 sm:rounded-[18px] sm:px-3 sm:py-2">
                <ColorOrb
                  hex={colorHex}
                  name={colorName}
                  selected
                  dense={denseSwatches}
                />

                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-[#0f172a] sm:text-sm">
                    {colorName}
                  </p>
                  <button
                    type="button"
                    onClick={copyHex}
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] font-black text-[#2563eb] sm:text-[11px]"
                  >
                    {colorHex || "HEX unavailable"}
                    {colorHex ? (
                      copiedHex ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )
                    ) : null}
                  </button>
                </div>
              </div>

              <div className="absolute right-3 top-3 z-20 hidden rounded-[16px] border border-white/75 bg-white/88 px-3 py-2 text-right shadow-[0_16px_36px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl md:block">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748b]">
                  Updated
                </p>
                <p className="mt-0.5 text-xs font-black text-[#0f172a]">
                  {formatDate(colorUpdated) || "Recently"}
                </p>
              </div>

              <AnimatePresence custom={direction} mode="wait">
                <motion.div
                  key={`${selectedColorIndex}-${colorName}`}
                  custom={direction}
                  variants={heroVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 230, damping: 28 }}
                  className="relative z-10 flex h-[38vh] min-h-[260px] max-h-[430px] items-center justify-center sm:h-[42vh] sm:min-h-[320px] sm:max-h-[500px] lg:h-[48vh] lg:min-h-[380px] lg:max-h-[580px]"
                >
                  {colorImageUrl ? (
                    <img
                      src={colorImageUrl}
                      alt={`${titleModel} in ${colorName}`}
                      className="h-full w-full object-contain object-center p-2 mix-blend-multiply sm:p-3 lg:p-5"
                      loading="eager"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-5">
                      <ColorOrb
                        hex={colorHex}
                        name={colorName}
                        selected
                        dense={false}
                      />
                      <p className="text-sm font-black text-[#64748b]">
                        Image unavailable for {colorName}
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                onClick={prevColor}
                className="absolute left-2 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[#0f172a] shadow-[0_18px_42px_-26px_rgba(15,23,42,0.55)] backdrop-blur-xl transition hover:scale-105 hover:text-[#2563eb] sm:left-3 sm:h-10 sm:w-10"
                aria-label="Previous color"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={nextColor}
                className="absolute right-2 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[#0f172a] shadow-[0_18px_42px_-26px_rgba(15,23,42,0.55)] backdrop-blur-xl transition hover:scale-105 hover:text-[#2563eb] sm:right-3 sm:h-10 sm:w-10"
                aria-label="Next color"
              >
                <ChevronRight size={20} />
              </button>

              <div className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/86 px-3 py-1.5 text-[11px] font-black text-[#475569] shadow-[0_18px_44px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:bottom-3 sm:py-2 sm:text-xs">
                <ImageIcon size={13} className="text-[#2563eb]" />
                {selectedColorIndex + 1} / {colors.length}
              </div>
            </div>

            <div className="mt-2 rounded-[20px] border border-[#dbe3ef] bg-[#f8fafc]/90 p-1.5 sm:mt-3 sm:rounded-[22px] sm:p-2">
              <div
                className="grid gap-1.5 [grid-template-columns:repeat(var(--mobile-cols),minmax(0,1fr))] xl:[grid-template-columns:repeat(var(--desktop-cols),minmax(0,1fr))] sm:gap-2"
                style={{
                  "--mobile-cols": `${mobileSwatchColumns}`,
                  "--desktop-cols": `${colors.length}`,
                }}
              >
                {colors.map((color, index) => {
                  const swatchName = getColorName(color, `Color ${index + 1}`);
                  const swatchHex = getColorHex(color);
                  const isSelected = selectedColorIndex === index;

                  return (
                    <motion.button
                      key={`${swatchName}-${index}-swatch`}
                      type="button"
                      onClick={() => goToColor(index)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      className={`group relative min-w-0 rounded-[14px] border bg-white p-1.5 transition sm:rounded-[16px] sm:p-2 ${
                        isSelected
                          ? "border-[#2563eb] ring-2 ring-[#bfdbfe] shadow-[0_18px_42px_-30px_rgba(37,99,235,0.7)]"
                          : "border-[#dbe3ef] hover:border-[#93c5fd] hover:bg-[#eff6ff]/55"
                      }`}
                      title={`${swatchName}${swatchHex ? ` · ${swatchHex}` : ""}`}
                    >
                      <div className="flex justify-center">
                        <ColorOrb
                          hex={swatchHex}
                          name={swatchName}
                          selected={isSelected}
                          dense={denseSwatches || ultraDenseSwatches}
                        />
                      </div>

                      <p
                        className={`mt-1 truncate text-center text-[10px] font-black leading-tight ${
                          isSelected ? "text-[#2563eb]" : "text-[#0f172a]"
                        } ${denseSwatches ? "hidden xl:block" : "hidden sm:block"}`}
                      >
                        {swatchName}
                      </p>

                      <p className="mt-0.5 hidden truncate text-center font-mono text-[9px] font-black text-[#64748b] md:block">
                        {swatchHex || "—"}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </section>

          <p className="hidden text-center text-[11px] font-semibold text-[#94a3b8] sm:block">
            Swipe the image, use arrows, press ← →, or click any swatch.
          </p>
        </div>
      ) : (
        <EmptyColorsState />
      )}
    </ModernCanvasShell>
  );
}
