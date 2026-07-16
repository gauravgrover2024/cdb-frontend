import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Car, Check, ChevronRight, Fuel, Settings2 } from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../shared/aciV2Constants";
import { emitAciAction } from "../shared/AciAssistShared";
import CarImageStage from "../shared/CarImageStage";
import { getDisplayCarImage } from "../shared/aciV2Image";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";
import { fetchAciVehicleImage } from "../services/aciAssistV2Api";

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

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

const FUEL_LABELS = {
  mixed: "Mixed",
  petrol: "Petrol",
  diesel: "Diesel",
  cng: "CNG",
  electric: "Electric",
  hybrid: "Hybrid",
};

const fuelKey = (value = "") => {
  const text = cleanText(value).toLowerCase();
  if (/\b(?:electric|bev|ev)\b/.test(text)) return "electric";
  if (/\b(?:hybrid|mhev|hev)\b/.test(text)) return "hybrid";
  if (/\bcng\b/.test(text)) return "cng";
  if (/\bdiesel\b/.test(text)) return "diesel";
  if (/\b(?:petrol|gasoline)\b/.test(text)) return "petrol";
  return "";
};

const rowFuelKeys = (row = {}) => {
  const optionKeys = asArray(row.fuelOptions)
    .map((option) => fuelKey(option.fuelType || option.fuel))
    .filter(Boolean);
  const listedKeys = asArray(row.fuelTypes || row.fuels)
    .map(fuelKey)
    .filter(Boolean);
  const directKey = fuelKey(row.fuelType || row.fuel);
  return [...new Set([...optionKeys, ...listedKeys, directKey].filter(Boolean))];
};

const selectRowFuel = (row = {}, selectedFuel = "mixed") => {
  const options = asArray(row.fuelOptions);
  const availableKeys = rowFuelKeys(row);
  if (selectedFuel !== "mixed" && availableKeys.length && !availableKeys.includes(selectedFuel)) {
    return null;
  }

  const matchingOptions = selectedFuel === "mixed"
    ? options
    : options.filter((option) => fuelKey(option.fuelType || option.fuel) === selectedFuel);
  const option = [...matchingOptions].sort((left, right) => (
    toAmount(left.startsFromPrice || left.exShowroomPrice || left.price) -
    toAmount(right.startsFromPrice || right.exShowroomPrice || right.price)
  ))[0];
  const selectedKey = selectedFuel === "mixed"
    ? fuelKey(option?.fuelType || option?.fuel || row.fuelType || row.fuel || row.fuelTypes?.[0])
    : selectedFuel;

  return {
    ...row,
    fuelType: FUEL_LABELS[selectedKey] || option?.fuelType || row.fuelType || row.fuel,
    startsFromVariant: option?.startsFromVariant || row.startsFromVariant,
    startsFromPrice: option?.startsFromPrice || row.startsFromPrice,
    startsFromPriceLabel: option?.startsFromPriceLabel || row.startsFromPriceLabel,
    bestUnderBudgetVariant: option?.bestUnderBudgetVariant || row.bestUnderBudgetVariant,
    bestUnderBudgetPrice: option?.bestUnderBudgetPrice || row.bestUnderBudgetPrice,
    bestUnderBudgetPriceLabel: option?.bestUnderBudgetPriceLabel || row.bestUnderBudgetPriceLabel,
  };
};

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

const normalizeCards = (widget = {}, vehicle = {}, selectedFuel = "mixed") => {
  const rows = pickRows(widget)
    .map((row) => selectRowFuel(row, selectedFuel))
    .filter(Boolean);
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
      row.startsFromPrice ||
        row.exShowroomPrice ||
        row.ex_showroom_price ||
        row.exShowroom ||
        row.ex_showroom,
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
      exShowroomPrice: cleanText(row.startsFromPriceLabel) || formatCompact(exShowroom),
      priceRange:
        cleanText(row.priceRange) ||
        (onRoad ? formatCompact(onRoad) : ""),
      selectedVariant: cleanText(
        row.startsFromVariant || row.variant || row.variantName || row.trim || "",
      ),
      fuelText: cleanText(
        row.fuelType || row.fuel || row.fuelTypes?.[0] || "",
      ),
      transmission: cleanText(
        row.transmission || row.transmissionType || row.transmissions?.[0] || "",
      ),
      bodyType: cleanText(row.bodyType || row.bodyStyle || row.segment || ""),
      variantCount: Number(row.variantCount || row.count || 0) || undefined,
    };

    cards.push({
      id: nextVehicle.id,
      rank: cards.length,
      title: nextVehicle.displayName,
      subtitle: cleanText(
        row.startsFromVariant || row.reason || row.note || row.summary || row.segment || "",
      ),
      price: nextVehicle.exShowroomPrice || nextVehicle.startingOnRoadPrice || nextVehicle.priceRange || "Price on request",
      priceValue: exShowroom || onRoad || Number.MAX_SAFE_INTEGER,
      vehicle: nextVehicle,
    });
  }

  return cards;
};

function RecommendationResultCard({ card, index = 0, onAction }) {
  const cardRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(card.vehicle.imageUrl || "");

  useEffect(() => {
    setImageUrl(card.vehicle.imageUrl || "");

    const controller = new AbortController();
    const load = async () => {
      const result = await fetchAciVehicleImage({
        make: card.vehicle.make || card.vehicle.brand,
        model: card.vehicle.model,
        signal: controller.signal,
      });
      const nextImageUrl = typeof result === "string" ? result : result?.imageUrl;
      if (nextImageUrl) setImageUrl(nextImageUrl);
    };

    const node = cardRef.current;
    if (!node || typeof IntersectionObserver !== "function") {
      load().catch(() => {});
      return () => controller.abort();
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load().catch(() => {});
    }, { rootMargin: "900px 0px" });
    observer.observe(node);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [card.vehicle.brand, card.vehicle.imageUrl, card.vehicle.make, card.vehicle.model]);

  const chips = [
    card.vehicle.fuelText ? { label: card.vehicle.fuelText, Icon: Fuel } : null,
    card.vehicle.transmission ? { label: card.vehicle.transmission, Icon: Settings2 } : null,
    card.vehicle.bodyType ? { label: card.vehicle.bodyType, Icon: Car } : null,
  ].filter(Boolean);

  return (
    <button
      ref={cardRef}
      type="button"
      className="aci-v2-reco-card"
      onClick={() =>
        emitAciAction(
          {
            id: `open-${card.id}`,
            type: "open_vehicle",
            label: card.title,
            query: card.title,
            intent: ACI_INTENTS.OPEN_VEHICLE,
            canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
            vehicle: { ...card.vehicle, imageUrl, normalizedImageUrl: imageUrl },
            contextPatch: buildVehicleContextPatch({
              vehicle: { ...card.vehicle, imageUrl, normalizedImageUrl: imageUrl },
            }),
          },
          onAction,
        )
      }
    >
      <CarImageStage
        src={imageUrl}
        alt={card.title}
        stageVariant="compact"
        fallbackLabel={card.vehicle.model || "CAR"}
        loading={index < 4 ? "eager" : "lazy"}
        fetchPriority={index < 2 ? "high" : "auto"}
      />
      <div className="aci-v2-reco-card-copy">
        <h3>{card.title}</h3>
        {chips.length ? (
          <div className="aci-v2-reco-chips">
            {chips.map(({ label, Icon }) => (
              <span key={`${card.id}-${label}`}><Icon size={12} />{label}</span>
            ))}
          </div>
        ) : null}
        <p>{card.subtitle || "Open overview, variants, colors and EMI."}</p>
        <div className="aci-v2-reco-price">
          <span><small>Ex-showroom from</small>{card.price}</span>
          <span className="aci-v2-reco-open">Overview <ChevronRight size={16} /></span>
        </div>
      </div>
    </button>
  );
}

export default function AciAssistRecommendationScreen({
  vehicle,
  widget,
  onAction,
}) {
  const sourceRows = useMemo(() => pickRows(widget || {}), [widget]);
  const availableFuelKeys = useMemo(() => {
    const keys = new Set(sourceRows.flatMap(rowFuelKeys));
    return Object.keys(FUEL_LABELS).filter((key) => key !== "mixed" && keys.has(key));
  }, [sourceRows]);
  const requestedInitialFuel = fuelKey(
    widget?.initialFuel ||
      widget?.data?.initialFuel ||
      widget?.filters?.fuelType ||
      widget?.data?.filters?.fuelType,
  );
  const [activeFuel, setActiveFuel] = useState(
    requestedInitialFuel && availableFuelKeys.includes(requestedInitialFuel)
      ? requestedInitialFuel
      : "mixed",
  );
  const [sortDirection, setSortDirection] = useState(
    widget?.initialSortDirection || widget?.data?.initialSortDirection || "asc",
  );
  const cards = useMemo(() => normalizeCards(widget || {}, vehicle || {}, activeFuel)
    .sort((left, right) => sortDirection === "relevance"
      ? left.rank - right.rank
      : sortDirection === "asc"
        ? left.priceValue - right.priceValue
        : right.priceValue - left.priceValue), [activeFuel, sortDirection, vehicle, widget]);

  const filters = widget?.filters || widget?.data?.filters || {};
  const budget = Number(filters.budgetMax || filters.maxBudget || filters.maxPrice || 0);
  const bodyType = /suv/i.test(filters.bodyType || filters.bodyStyle || "") ? "SUVs" : "cars";
  const fuelLabel = FUEL_LABELS[activeFuel] || "Mixed";
  const isRivalMode = cleanText(
    widget?.resultMode || widget?.data?.resultMode,
  ).toLowerCase() === "rivals";
  const anchorVehicle = widget?.anchorVehicle || widget?.data?.anchorVehicle || vehicle || {};
  const anchorModel = cleanText(
    anchorVehicle.model || anchorVehicle.name || anchorVehicle.displayName,
  );
  const title = isRivalMode
    ? `${cards.length} rivals${anchorModel ? ` to ${anchorModel}` : ""}`
    : `${cards.length} ${activeFuel === "mixed" ? "matching" : fuelLabel.toLowerCase()} ${bodyType}${budget ? ` under ${formatCompact(budget)}` : ""}`;
  const subtitle = isRivalMode
    ? activeFuel === "mixed"
      ? "Live alternatives ranked by relationship, price overlap and configuration fit."
      : `Showing ${fuelLabel.toLowerCase()} rivals only. Change the fuel filter anytime.`
    : activeFuel === "mixed"
      ? "All matching passenger-car options across available fuel types."
      : `Showing ${fuelLabel.toLowerCase()} matches only. Change the fuel filter anytime.`;
  const eyebrow = isRivalMode ? "Similar cars" : "All matching cars";
  const sortLabel = sortDirection === "relevance"
    ? "Recommended"
    : sortDirection === "asc"
      ? "Price: Low to high"
      : "Price: High to low";
  const fuelFilters = ["mixed", ...availableFuelKeys];

  return (
    <div className="aci-v2-reco-root">
      <style>{`
        .aci-v2-reco-root{width:min(980px,100%);margin:0 auto;padding:22px 20px calc(118px + env(safe-area-inset-bottom));background:#fff;min-height:100vh;color:#101828;font-family:Inter,system-ui,sans-serif}
        .aci-v2-reco-top{padding:2px 2px 4px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
        .aci-v2-reco-eyebrow{margin:0 0 6px;color:#667085;font-size:11px;line-height:1;font-weight:780;text-transform:uppercase;letter-spacing:0}
        .aci-v2-reco-heading{margin:0;font-size:28px;line-height:1.08;font-weight:820;letter-spacing:0;color:#07194b}
        .aci-v2-reco-count{flex:0 0 auto;padding:7px 10px;border:1px solid #d9e0ea;border-radius:999px;color:#344054;background:#fff;font-size:11px;font-weight:720}
        .aci-v2-reco-sub{max-width:700px;margin:7px 2px 12px;font-size:12px;line-height:1.45;font-weight:520;color:#667085}
        .aci-v2-reco-controls{margin:0 0 16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
        .aci-v2-reco-fuels{min-width:0;display:flex;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none}
        .aci-v2-reco-fuels::-webkit-scrollbar{display:none}
        .aci-v2-reco-fuels button,.aci-v2-reco-sort{min-height:34px;padding:7px 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #d9e0ea;border-radius:8px;color:#475467;background:#fff;font:inherit;font-size:10px;font-weight:700;white-space:nowrap;cursor:pointer;transition:border-color 150ms ease,background 150ms ease,color 150ms ease}
        .aci-v2-reco-fuels button:hover,.aci-v2-reco-fuels button:focus-visible,.aci-v2-reco-sort:hover,.aci-v2-reco-sort:focus-visible{border-color:#aebfd7;background:#f8fafc;outline:none}
        .aci-v2-reco-fuels button.is-active{border-color:#b8c7da;color:#07194b;background:#f2f6fb}
        .aci-v2-reco-sort{flex:0 0 auto}
        .aci-v2-reco-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .aci-v2-reco-card{min-width:0;min-height:176px;padding:12px;display:grid;grid-template-columns:152px minmax(0,1fr);gap:12px;align-items:center;border:1px solid #d7e1ef;border-radius:16px;color:inherit;background:linear-gradient(180deg,#fff,#fafcff);font:inherit;text-align:left;cursor:pointer;box-shadow:none;transition:border-color 160ms ease,background 160ms ease}
        .aci-v2-reco-card:hover,.aci-v2-reco-card:focus-visible{border-color:#aebfd7;background:#f8fafc;outline:none}
        .aci-v2-reco-card .aci-car-image-stage{min-height:145px;border:0;background:radial-gradient(ellipse at 50% 78%,rgba(99,150,230,.1),transparent 62%);box-shadow:none}
        .aci-v2-reco-card-copy{min-width:0}
        .aci-v2-reco-card h3{margin:0;font-size:19px;line-height:1.16;font-weight:820;letter-spacing:0;color:#07194b}
        .aci-v2-reco-card p{margin:9px 0 0;overflow:hidden;color:#667085;font-size:11px;line-height:1.35;font-weight:560;text-overflow:ellipsis;white-space:nowrap}
        .aci-v2-reco-chips{margin-top:8px;display:flex;gap:5px;flex-wrap:wrap}
        .aci-v2-reco-chips span{min-height:25px;padding:4px 7px;display:inline-flex;align-items:center;gap:4px;border:1px solid #d9e0ea;border-radius:7px;color:#475467;background:#fff;font-size:9px;font-weight:680}
        .aci-v2-reco-price{margin-top:11px;padding-top:10px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;border-top:1px solid #e4e7ec;color:#101828}
        .aci-v2-reco-price>span:first-child{font-size:17px;line-height:1;font-weight:820;white-space:nowrap}
        .aci-v2-reco-price small{margin-bottom:4px;display:block;color:#667085;font-size:8px;line-height:1;font-weight:620}
        .aci-v2-reco-open{display:inline-flex;align-items:center;gap:3px;color:#475467;font-size:9px;font-weight:720;white-space:nowrap}
        .aci-v2-reco-empty{padding:24px 18px;border-radius:16px;border:1px solid #dbe6f3;background:#fff;text-align:center}
        .aci-v2-reco-empty h4{margin:0 0 8px;font-size:22px;line-height:1.1;font-weight:780;color:#0f172a}
        .aci-v2-reco-empty p{margin:0;font-size:13px;line-height:1.5;font-weight:500;color:#64748b}
        @media(max-width:760px){.aci-v2-reco-root{padding:16px 12px calc(112px + env(safe-area-inset-bottom))}.aci-v2-reco-heading{font-size:24px}.aci-v2-reco-controls{align-items:stretch;flex-direction:column}.aci-v2-reco-sort{align-self:flex-start}.aci-v2-reco-list{grid-template-columns:minmax(0,1fr)}.aci-v2-reco-card{grid-template-columns:128px minmax(0,1fr);min-height:154px}.aci-v2-reco-card .aci-car-image-stage{min-height:126px}}
        @media(max-width:390px){.aci-v2-reco-card{grid-template-columns:112px minmax(0,1fr);padding:10px;gap:9px}.aci-v2-reco-card h3{font-size:17px}.aci-v2-reco-chips span:nth-child(n+3){display:none}}
      `}</style>

      <div className="aci-v2-reco-top">
        <div>
          <p className="aci-v2-reco-eyebrow">{eyebrow}</p>
          <h2 className="aci-v2-reco-heading">{title}</h2>
        </div>
        <span className="aci-v2-reco-count">{cards.length} cars</span>
      </div>

      <p className="aci-v2-reco-sub">{subtitle}</p>

      <div className="aci-v2-reco-controls" aria-label="Result filters">
        <div className="aci-v2-reco-fuels" role="group" aria-label="Filter results by fuel">
          {fuelFilters.map((key) => (
            <button
              key={key}
              type="button"
              className={activeFuel === key ? "is-active" : ""}
              aria-pressed={activeFuel === key}
              onClick={() => setActiveFuel(key)}
            >
              {activeFuel === key ? <Check size={13} aria-hidden="true" /> : null}
              <span>{FUEL_LABELS[key]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="aci-v2-reco-sort"
          aria-label={sortDirection === "relevance"
            ? "Sort by price low to high"
            : `Sort price ${sortDirection === "asc" ? "high to low" : "low to high"}`}
          onClick={() => setSortDirection((current) => (
            current === "relevance" ? "asc" : current === "asc" ? "desc" : "asc"
          ))}
        >
          <ArrowDownUp size={14} aria-hidden="true" />
          <span>{sortLabel}</span>
        </button>
      </div>

      {cards.length ? (
        <div className="aci-v2-reco-list">
          {cards.map((card, index) => (
            <RecommendationResultCard
              key={card.id}
              card={card}
              index={index}
              onAction={onAction}
            />
          ))}
        </div>
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
