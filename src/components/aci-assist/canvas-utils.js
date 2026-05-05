import { asArray, humanize, pick, formatCurrency } from "./utils";
import { toPriceNumber } from "../../utils/vehiclePricingBreakup";

export { asArray };

export const getWidgetType = (widget = {}) =>
  widget.type || widget.widgetType || widget.name || "";

export const widgetMatches = (widget, type) =>
  String(getWidgetType(widget)).toLowerCase() === String(type).toLowerCase();

export const findWidget = (message, type) =>
  asArray(message?.widgets).find((widget) => widgetMatches(widget, type));

export const findAnyWidget = (message, types = []) =>
  asArray(message?.widgets).find((widget) =>
    types.some((type) => widgetMatches(widget, type)),
  );

export const rowsFrom = (widget = {}) =>
  asArray(
    widget.rows ||
      widget.records ||
      widget.colors ||
      widget.evidenceRows ||
      widget.data?.rows ||
      widget.data?.records ||
      widget.data?.variants ||
      widget.data?.colors ||
      widget.data?.evidenceRows,
  );

export const valueFrom = (source, keys, fallback = "—") =>
  pick(source, keys, fallback);

export const numberFrom = (value) => {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

export const compactText = (value, fallback = "—") => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.map(v => compactText(v)).join(", ");
    return String(value.label || value.name || value.variant || value.title || value.displayText || "Object");
  }
  return String(value);
};

export const getVariantName = (row = {}) =>
  compactText(
    valueFrom(row, ["variant", "variant_short", "variantName", "name"]),
    "Variant",
  );

export const getFuelTransmission = (row = {}) =>
  [
    valueFrom(row, ["fuel_type", "fuel", "fuelType"], ""),
    valueFrom(row, ["transmission", "gearbox"], ""),
  ]
    .filter(Boolean)
    .join(" · ");

export const getRowKey = (row = {}, index = 0) =>
  row.id ||
  row._id ||
  row.variantId ||
  row.variant_id ||
  `${getVariantName(row)}-${valueFrom(row, ["fuel_type", "fuel", "fuelType"], "")}-${index}`;

export const formatAmount = (amount, fallback = "—") => {
  const value = toPriceNumber(amount);
  return value > 0 ? formatCurrency(value) : fallback;
};

export const getPriceParts = (row = {}) => {
  const readAmount = (r, keys = []) => {
    for (const key of keys) {
      const amount = toPriceNumber(r?.[key]);
      if (amount > 0) return amount;
    }
    return 0;
  };

  const listItemsFrom = (value, fallbackLabel = "Item") => {
    const amountKeys = ["amount", "value", "price", "cost", "charge", "charges", "amountInRs", "amount_in_rs", "priceInRs", "price_in_rs", "inr", "rs"];
    const labelKeys = ["label", "name", "title", "text", "description", "chargeName", "charge_name", "key", "type"];

    const readLooseAmount = (item) => {
      if (item === null || item === undefined) return 0;
      if (typeof item === "number" || typeof item === "string") return toPriceNumber(item);
      if (typeof item !== "object") return 0;
      for (const key of amountKeys) {
        const amount = toPriceNumber(item[key]);
        if (amount > 0) return amount;
      }
      return 0;
    };

    const readLooseLabel = (item, index) => {
      if (typeof item === "string") {
        return item.replace(/₹\s*[\d,]+(?:\.\d+)?/g, "").trim() || `${fallbackLabel} ${index + 1}`;
      }
      if (!item || typeof item !== "object") return `${fallbackLabel} ${index + 1}`;
      for (const key of labelKeys) {
        if (item[key]) return humanize(item[key]);
      }
      return `${fallbackLabel} ${index + 1}`;
    };

    if (Array.isArray(value)) {
      return value.map((item, index) => ({
        label: readLooseLabel(item, index),
        amount: readLooseAmount(item),
      })).filter((item) => item.label && item.amount > 0);
    }
    return [];
  };

  const exShowroom = readAmount(row, ["ex_showroom", "exShowroom", "exShowroomPrice", "price"]);
  const rto = readAmount(row, ["rto", "roadTax"]);
  const insurance = readAmount(row, ["insurance", "insuranceCost"]);
  const listItems = listItemsFrom(row.optionalOtherItems || row.optional_other_items, "Optional / other item");
  const listTotal = listItems.reduce((sum, item) => sum + toPriceNumber(item.amount), 0);
  const onRoad = readAmount(row, ["onRoadPrice", "on_road_price"]) || (exShowroom + rto + insurance + listTotal);

  return { exShowroom, rto, insurance, listItems, listTotal, onRoad };
};

export const calculateEmi = (row = {}) => {
  const parts = getPriceParts(row);
  const baseAmount = parts.onRoad || parts.exShowroom;
  const principal = baseAmount * 0.9;
  const annualRate = 8.75 / 100;
  const monthlyRate = annualRate / 12;
  const months = 36;

  if (!principal || principal <= 0) return { emi: 0, principal: 0, totalPayable: 0, totalInterest: 0 };

  const power = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * power) / (power - 1);
  const totalPayable = emi * months;
  const totalInterest = totalPayable - principal;

  return { emi, principal, totalPayable, totalInterest };
};
