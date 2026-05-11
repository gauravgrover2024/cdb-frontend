import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../data/homeScreenData";
import { emitAciAction } from "../shared/AciAssistShared";
import CarImageStage from "../shared/CarImageStage";
import { getDisplayCarImage } from "../shared/aciV2Image";

const fadeUp = {
  hidden: { opacity: 0, y: 12, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const toAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const text = String(value || "").replace(/,/g, "").trim();
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const num = Number(match[0]);
  if (!Number.isFinite(num)) return 0;
  if (/crore|cr\b/i.test(text)) return Math.round(num * 10000000);
  if (/lakh|lac|l\b/i.test(text) || (num > 0 && num < 250)) return Math.round(num * 100000);
  return Math.round(num);
};

const formatCompact = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  return `₹${(amount / 100000).toFixed(2)}L`;
};

const cleanText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const pickRows = (widget = {}) => {
  const direct = [
    widget.rows,
    widget.items,
    widget.cars,
    widget.recommendations,
    widget.data?.rows,
    widget.data?.items,
    widget.data?.cars,
    widget.data?.recommendations,
  ];

  for (const value of direct) {
    if (Array.isArray(value) && value.length) return value;
  }

  const seen = new WeakSet();
  const found = [];

  const walk = (value, depth = 0) => {
    if (!value || depth > 7) return;

    if (Array.isArray(value)) {
      for (const row of value) {
        if (row && typeof row === "object") {
          const model = cleanText(row.model || row.displayName || row.name || "");
          if (model) found.push(row);
        }
      }

      for (const row of value) walk(row, depth + 1);
      return;
    }

    if (typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);

    for (const nested of Object.values(value)) {
      walk(nested, depth + 1);
    }
  };

  walk(widget);
  return found;
};

const normalizeCards = (widget = {}, vehicle = {}) => {
  const rows = pickRows(widget);
  const cards = [];
  const seen = new Set();

  for (const row of rows) {
    const make = cleanText(row.make || row.brand || row.manufacturer || "");
    const model = cleanText(row.model || row.displayName || row.name || "");
    if (!model) continue;

    const key = `${make.toLowerCase()}|${model.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const onRoad = toAmount(
      row.onRoadPrice || row.on_road_price || row.total_on_road_with_accessories || row.price,
    );
    const exShowroom = toAmount(
      row.exShowroomPrice || row.ex_showroom_price || row.exShowroom || row.ex_showroom,
    );

    const nextVehicle = {
      ...row,
      id: row.id || row._id || `${make || vehicle.make || "car"}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      make: make || vehicle.make || vehicle.brand || "",
      brand: make || vehicle.brand || vehicle.make || "",
      model,
      displayName: cleanText(row.displayName || row.name || `${make} ${model}`) || model,
      city: cleanText(row.city || vehicle.city || "Delhi") || "Delhi",
      imageUrl: getDisplayCarImage(row),
      normalizedImageUrl: row.normalizedImageUrl || row.cleanImageUrl || "",
      startingOnRoadPrice: formatCompact(onRoad),
      exShowroomPrice: formatCompact(exShowroom),
      priceRange:
        cleanText(row.priceRange) ||
        (onRoad ? formatCompact(onRoad) : ""),
      selectedVariant: cleanText(row.variant || row.variantName || row.trim || ""),
      variantCount: Number(row.variantCount || row.count || 0) || undefined,
    };

    cards.push({
      id: nextVehicle.id,
      title: nextVehicle.displayName,
      subtitle: cleanText(row.reason || row.note || row.summary || row.segment || ""),
      price: nextVehicle.startingOnRoadPrice || nextVehicle.exShowroomPrice || nextVehicle.priceRange || "Price on request",
      vehicle: nextVehicle,
    });
  }

  return cards;
};

export default function AciAssistRecommendationScreen({
  vehicle,
  widget,
  onAction,
}) {
  const cards = useMemo(() => normalizeCards(widget || {}, vehicle || {}), [widget, vehicle]);

  const title =
    cleanText(widget?.title || widget?.data?.title || widget?.answerTitle) ||
    "Live car results";
  const subtitle =
    cleanText(widget?.answer || widget?.data?.summary || widget?.description) ||
    "Tap any car to open live overview.";

  return (
    <div className="aci-v2-reco-root">
      <style>{`
        .aci-v2-reco-root{padding:14px 14px calc(118px + env(safe-area-inset-bottom));background:#f2f6fc;min-height:100vh}
        .aci-v2-reco-top{display:flex;align-items:center;gap:8px;padding:4px 2px 10px}
        .aci-v2-reco-back{border:0;background:#fff;border-radius:14px;width:38px;height:38px;display:grid;place-items:center;color:#1d4ed8;box-shadow:0 10px 24px -20px rgba(15,23,42,.45)}
        .aci-v2-reco-heading{margin:0;font:700 28px/1.06 "Canela", "Times New Roman", serif;color:#0f172a}
        .aci-v2-reco-sub{margin:6px 0 14px;font:500 13px/1.45 "Inter", system-ui, sans-serif;color:#5b677a}
        .aci-v2-reco-list{display:grid;gap:12px}
        .aci-v2-reco-card{background:rgba(255,255,255,.93);border:1px solid #dbe6f3;border-radius:24px;padding:12px;display:grid;grid-template-columns:130px 1fr;gap:10px;align-items:center;box-shadow:0 22px 36px -34px rgba(15,23,42,.45)}
        .aci-v2-reco-card h3{margin:0 0 6px;font:700 18px/1.2 "Inter", system-ui, sans-serif;color:#0f172a}
        .aci-v2-reco-card p{margin:0;font:500 12px/1.45 "Inter", system-ui, sans-serif;color:#6b7280}
        .aci-v2-reco-price{margin-top:8px;display:flex;align-items:center;justify-content:space-between;font:800 18px/1 "Inter", system-ui, sans-serif;color:#1d4ed8}
        .aci-v2-reco-empty{padding:24px 18px;border-radius:24px;border:1px solid #dbe6f3;background:rgba(255,255,255,.96);text-align:center}
        .aci-v2-reco-empty h4{margin:0 0 8px;font:700 22px/1.1 "Canela", "Times New Roman", serif;color:#0f172a}
        .aci-v2-reco-empty p{margin:0;font:500 13px/1.5 "Inter", system-ui, sans-serif;color:#64748b}
      `}</style>

      <div className="aci-v2-reco-top">
        <button
          type="button"
          className="aci-v2-reco-back"
          onClick={() =>
            emitAciAction(
              {
                type: "back_to_car",
                label: vehicle?.displayName ? `Back to ${vehicle.displayName}` : "Back to car",
                query: "Back to car page",
                vehicle,
              },
              onAction,
            )
          }
        >
          <ArrowLeft size={17} />
        </button>

        <h2 className="aci-v2-reco-heading">{title}</h2>
      </div>

      <p className="aci-v2-reco-sub">{subtitle}</p>

      {cards.length ? (
        <motion.div className="aci-v2-reco-list" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}>
          {cards.map((card) => (
            <motion.button
              key={card.id}
              type="button"
              className="aci-v2-reco-card"
              variants={fadeUp}
              onClick={() =>
                emitAciAction(
                  {
                    id: `open-${card.id}`,
                    type: "open_vehicle",
                    label: card.title,
                    query: card.title,
                    intent: ACI_INTENTS.OPEN_VEHICLE,
                    canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
                    vehicle: card.vehicle,
                    contextPatch: {
                      selectedVehicle: card.vehicle,
                      anchorModel: card.vehicle.model,
                      anchorMake: card.vehicle.make || card.vehicle.brand,
                      anchorCity: card.vehicle.city,
                    },
                  },
                  onAction,
                )
              }
            >
              <CarImageStage
                src={card.vehicle.imageUrl}
                alt={card.title}
                stageVariant="compact"
                fallbackLabel={card.vehicle.model || "CAR"}
              />

              <div>
                <h3>{card.title}</h3>
                <p>{card.subtitle || "Open car overview, colors, variants and EMI."}</p>
                <div className="aci-v2-reco-price">
                  <span>{card.price}</span>
                  <ChevronRight size={18} />
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <section className="aci-v2-reco-empty">
          <h4>No live cars found</h4>
          <p>
            I did not get live cards for this query yet. Try another brand or ask a more specific budget/model query.
          </p>
        </section>
      )}
    </div>
  );
}
