import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
ArrowLeft,
Banknote,
Bell,
Car,
Check,
ChevronDown,
ChevronRight,
DatabaseZap,
Info,
MapPin,
ShieldCheck,
Sparkles,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../data/homeScreenData";
import { AciComposer, emitAciAction } from "../shared/AciAssistShared";
import CarImageStage from "../shared/CarImageStage";

const FALLBACK_VARIANT_NAMES = [];
const FALLBACK_NOTES = [];

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
hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
visible: {
opacity: 1,
y: 0,
filter: "blur(0px)",
transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
},
};

const stagger = {
hidden: {},
visible: {
transition: {
staggerChildren: 0.055,
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

const compactText = (value) =>
String(value ?? "")
.replace(/\s+/g, " ")
.trim();

const humanize = (value) =>
compactText(value || "")
.replace(/[-_]+/g, " ")
.replace(/\b\w/g, (match) => match.toUpperCase());

const asArray = (value) => {
if (!value) return [];
return Array.isArray(value) ? value : [value];
};

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

const getVehicleTitle = (vehicle) =>
vehicle?.displayName ||
vehicle?.name ||
[vehicle?.brand || vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
"Selected car";

const getVehicleModel = (vehicle) =>
vehicle?.model ||
getVehicleTitle(vehicle).split(" ").slice(-1)[0] ||
"Vehicle";

const getVehicleCity = (vehicle, widget) =>
widget?.city ||
widget?.data?.city ||
vehicle?.city ||
"Delhi";

const getVehicleImage = (vehicle, widget, rows) => {
const searchValue = (value, depth = 0) => {
if (!value || depth > 6) return "";

if (typeof value === "string") {
const text = value.trim();

if (
/^(data:image\/|blob:)/i.test(text) ||
 /^(https?:)?\/\//i.test(text) ||
/\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text) ||
/cloudinary|imgix|googleusercontent|cardekho|carwale|acko|spinny|cars24|cdn|uploads/i.test(text)
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

const direct =
searchValue(vehicle) ||
searchValue(widget) ||
searchValue(rows);

if (direct) return direct;

return "";
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

const getFuelTransmission = (row) => {
const fuel =
row.fuel ||
row.fuelType ||
row.fuel_type ||
row.engineType ||
"";

const transmission =
row.transmission ||
row.transmissionType ||
row.gearbox ||
row.transmission_type ||
"";

const text = [fuel, transmission].filter(Boolean).join(" · ");
if (text) return text;

const name = compactText(row.variant || row.name || "").toLowerCase();

const inferredFuel = name.includes("diesel")
? "Diesel"
: name.includes("cng")
? "CNG"
: name.includes("electric") || name.includes("ev")
? "Electric"
: "Petrol";

const inferredTransmission =
name.includes("dct")
? "DCT"
: name.includes("ivt")
? "IVT"
: name.includes("cvt")
? "CVT"
: name.includes("amt")
? "AMT"
: name.includes("automatic") || /\bat\b/.test(name)
? "Automatic"
: "Manual";

return `${inferredFuel} · ${inferredTransmission}`;
};

const pricePartsFromRow = (row) => {
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
parseMoney(row.rto ?? row.roadTax ?? row.road_tax ?? row.registration ?? row.rtoAmount) || 0;

const insurance =
parseMoney(row.insurance ?? row.insuranceCost ?? row.insurance_cost ?? row.insuranceAmount) || 0;

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
label: item.label || item.name || item.title || `Other charge ${index + 1}`,
amount: parseMoney(item.amount ?? item.value ?? item.price ?? item.cost),
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
parseMoney(row.other ?? row.otherAmount ?? row.otherChargesTotal ?? row.miscCharges) ||
listItems.reduce((sum, item) => sum + item.amount, 0);

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

return {
exShowroom,
rto,
insurance,
listItems,
listTotal,
onRoad,
};
};

const normalizeRows = ({ vehicle, widget, message }) => {
const rawRows = getRawRows({ vehicle, widget, message });
const sourceRows = rawRows.length ? rawRows : [];

const normalizedRows = sourceRows.map((row, index) => {
const parts = pricePartsFromRow(row);
const variant = getVariantName(row, index, vehicle);

return {
...row,
id: row.id || row._id || row.variantId || `${makeSlug(variant)}-${index}`,
variant,
fuelTransmission: getFuelTransmission(row),
exShowroomPrice: parts.exShowroom,
onRoadPrice: parts.onRoad,
rto: parts.rto,
insurance: parts.insurance,
otherChargesTotal: parts.listTotal,
otherItems: parts.listItems,
note: row.note || row.summary || row.description || row.reason || "Variant details",
recommended:
row.recommended ||
row.bestValue ||
row.popular ||
index === Math.min(3, sourceRows.length - 1),
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

const rowKeyOf = (row, index) => row.id || row._id || row.variantId || `${row.variant}-${index}`;

const MOBILE_VARIANT_FILTERS = [
{ id: "all", label: "All" },
{ id: "petrol", label: "Petrol" },
{ id: "diesel", label: "Diesel" },
{ id: "manual", label: "Manual" },
{ id: "automatic", label: "Automatic" },
{ id: "under_12l", label: "Under ₹12L" },
];

const rowMatchesFilter = (row, filterId) => {
if (!row || filterId === "all") return true;

const parts = pricePartsFromRow(row);
const searchable = `${row.variant || ""} ${row.fuelTransmission || ""}`.toLowerCase();

switch (filterId) {
case "petrol":
return searchable.includes("petrol");
case "diesel":
return searchable.includes("diesel");
case "manual":
return searchable.includes("manual") || searchable.includes("mt");
case "automatic":
return /(automatic|amt|cvt|dct|ivt|at)\b/.test(searchable);
case "under_12l":
return (parts.exShowroom || parts.onRoad || 0) > 0 && (parts.exShowroom || parts.onRoad) <= 1200000;
default:
return true;
}
};

const calculateEmi = (amount) => {
const principal = Math.round((Number(amount || 0) || 0) * 0.9);
const annualRate = 8.75;
const tenureMonths = 36;

if (!principal) {
return {
principal: 0,
emi: 0,
totalPayable: 0,
totalInterest: 0,
};
}

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
id: payload.id || makeSlug(`${label}-${vehicle?.id || vehicle?.model || ""}-${variant}`),
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
onClick={() => firePriceAction("Home", { type: "go_home", intent: "" }, onAction)}
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
<button type="button" className="icon-bell" onClick={() => firePriceAction("Notifications", {}, onAction)}>
<Bell size={22} />
<i />
</button>

<button type="button" className="avatar-button" onClick={() => firePriceAction("Profile", {}, onAction)}>
<img src={data?.avatarUrl} alt="Profile" />
</button>

<button type="button" className="plain-icon" onClick={() => firePriceAction("Profile menu", {}, onAction)}>
<ChevronDown size={16} />
</button>
</div>
</motion.header>
);
}

function VehicleArtwork({ image, imageFailed, vehicle, className = "" }) {
return (
<div className={`price-car-art ${className}`}>
<motion.div
initial={{ opacity: 0, scale: 0.98, y: 8 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
transition={{ type: "spring", stiffness: 220, damping: 22 }}
>
<CarImageStage
src={imageFailed ? "" : image}
alt={getVehicleTitle(vehicle)}
stageVariant={className.includes("mobile") ? "compact" : "hero"}
className="price-car-stage"
fallbackLabel={getVehicleModel(vehicle)}
imageClassName="price-car-stage-image"
/>
</motion.div>
</div>
);
}

function DesktopHero({
vehicle,
rows,
selectedRow,
selectedParts,
minPrice,
maxPrice,
city,
image,
imageFailed,
setImageFailed,
onAction,
}) {
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
<ArrowLeft size={17} />
Back to {getVehicleTitle(vehicle)}
</button>

<h1>{getVehicleTitle(vehicle)} price list</h1>

<p>
{humanize(city)} prices · {rows.length} variants · select a variant to
update breakup, EMI and recommendation.
</p>

<div className="hero-price-range">
<span>Ex-showroom range</span>
<strong>
{formatAmount(minPrice, true)} – {formatAmount(maxPrice, true)}
</strong>
</div>
</div>

<div className="price-hero-stage">
<VehicleArtwork
image={image}
imageFailed={imageFailed}
vehicle={vehicle}
className="hero-art"
/>
</div>

<div className="price-live-card">
<span>
<ShieldCheck size={15} />
Selected variant
</span>

<strong>{selectedRow.variant}</strong>
<p>{selectedRow.fuelTransmission}</p>

<div>
<em>On-road {humanize(city)}</em>
<b>{formatAmount(selectedParts.onRoad)}</b>
</div>

<button
type="button"
onClick={() =>
firePriceAction(
"Get quotation",
{
vehicle,
variant: selectedRow.variant,
type: "lead",
intent: ACI_INTENTS.QUOTATION,
canvasType: ACI_CANVAS_TYPES.QUOTATION,
query: `Get quotation for ${getVehicleTitle(vehicle)} ${selectedRow.variant}`,
},
onAction,
)
}
>
Get quotation <ChevronRight size={16} />
</button>
</div>
</motion.section>
);
}

function PriceTabs() {
return (
<div className="price-tabs">
{["Ex-showroom", "On-road", "EMI"].map((tab, index) => (
<span key={tab} className={index === 0 ? "active" : ""}>
{tab}
{index === 0 ? <motion.i layoutId="active-price-tab-v2" /> : null}
</span>
))}
</div>
);
}

function DesktopPriceTable({
rows,
selectedRowKey,
setSelectedRowKey,
openBreakupKey,
setOpenBreakupKey,
}) {
return (
<motion.section className="price-table-card" variants={fadeUp}>
<div className="table-head">
<PriceTabs />
<p>{rows.length} variants · prices are indicative</p>
</div>

<div className="price-table-wrap">
<table>
<colgroup>
<col style={{ width: "4%" }} />
<col style={{ width: "17%" }} />
<col style={{ width: "10%" }} />
<col style={{ width: "14%" }} />
<col style={{ width: "11%" }} />
<col style={{ width: "11%" }} />
<col style={{ width: "10%" }} />
<col style={{ width: "8%" }} />
</colgroup>

<thead>
<tr>
<th />
{["Variant", "Fuel / transmission", "Ex-showroom", "RTO", "Insurance", "Other", "On-road"].map((heading) => (
<th key={heading}>{heading}</th>
))}
</tr>
</thead>

<tbody>
{rows.length ? (
rows.map((row, index) => {
const rowKey = rowKeyOf(row, index);
const isSelected = rowKey === selectedRowKey;
const parts = pricePartsFromRow(row);

return (
<motion.tr
key={rowKey}
onClick={() => setSelectedRowKey(rowKey)}
whileHover={{ backgroundColor: "rgba(239,246,255,0.72)" }}
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
<span>{row.fuelTransmission || "—"}</span>
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
setOpenBreakupKey(openBreakupKey === rowKey ? null : rowKey);
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
: [{ label: "Other charges", amount: parts.listTotal }]
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
Prices may vary based on offers, dealer and city.
</small>
</motion.section>
);
}

function PriceBreakupCard({ selectedRow, selectedParts, city }) {
const items = [
["Ex-showroom price", selectedParts.exShowroom],
["RTO charges", selectedParts.rto],
["Insurance", selectedParts.insurance],
...(selectedParts.listItems.length
? selectedParts.listItems.map((item) => [item.label, item.amount])
: selectedParts.listTotal
? [["Other charges", selectedParts.listTotal]]
: []),
].filter(([, value]) => value !== undefined && value !== null);

return (
<motion.section className="mini-panel" variants={fadeUp}>
<h3>
Price breakup <span>({selectedRow.variant})</span>
</h3>

<p className="panel-sub">{humanize(city)}</p>

<AnimatePresence mode="wait">
<motion.div
key={selectedRow.id}
className="breakup-list"
initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
transition={{ duration: 0.2 }}
>
{items.map(([label, value]) => (
<div key={label}>
<span>{label}</span>
<strong>{formatAmount(value)}</strong>
</div>
))}

<footer>
<b>Est. on-road price</b>
<strong>{formatAmount(selectedParts.onRoad)}</strong>
</footer>

<aside>
<Info size={15} />
<p>On-road price is an estimate and may vary at the time of purchase.</p>
</aside>
</motion.div>
</AnimatePresence>
</motion.section>
);
}

function PriceRangeCard({
rows,
selectedRow,
selectedRowKey,
setSelectedRowKey,
minRange,
maxRange,
}) {
const rangeValue = (row) => pricePartsFromRow(row).onRoad || pricePartsFromRow(row).exShowroom;

const percent = (row) => {
const value = rangeValue(row);
if (!minRange || !maxRange || minRange === maxRange) return 50;
return Math.min(94, Math.max(6, ((value - minRange) / (maxRange - minRange)) * 100));
};

const baseRow = rows[0] || {};
const topRow = rows[rows.length - 1] || {};
const selectedIndex = Math.max(0, rows.findIndex((row, index) => rowKeyOf(row, index) === selectedRowKey));

const rangeCard = (label, row, index, align) => {
const key = rowKeyOf(row, index);
const parts = pricePartsFromRow(row);

return (
<button
type="button"
className={key === selectedRowKey ? `active ${align}` : align}
onClick={() => setSelectedRowKey(key)}
>
<strong>{formatAmount(parts.onRoad || parts.exShowroom)}</strong>
<span>{row.variant}</span>
<em>{label}</em>
</button>
);
};

return (
<motion.section className="mini-panel range-panel" variants={fadeUp}>
<div className="range-title">
<div>
<h3>Price range</h3>
<p>Base, selected and top variant context.</p>
</div>

<span>{rows.length} variants</span>
</div>

<div className="range-track-wrap">
<div className="range-track">
<i />

<button
type="button"
className="range-pin small"
style={{ left: `${percent(baseRow)}%` }}
onClick={() => setSelectedRowKey(rowKeyOf(baseRow, 0))}
/>

<motion.button
type="button"
className="range-pin selected"
animate={{ left: `${percent(selectedRow)}%` }}
transition={{ type: "spring", stiffness: 360, damping: 28 }}
onClick={() => setSelectedRowKey(rowKeyOf(selectedRow, selectedIndex))}
/>

<button
type="button"
className="range-pin small top"
style={{ left: `${percent(topRow)}%` }}
onClick={() => setSelectedRowKey(rowKeyOf(topRow, rows.length - 1))}
/>
</div>
</div>

<div className="range-cards">
{rangeCard("Base", baseRow, 0, "left")}
{rangeCard("Selected", selectedRow, selectedIndex, "center")}
{rangeCard("Top", topRow, rows.length - 1, "right")}
</div>
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
setImageFailed,
onAction,
}) {
const emi = calculateEmi(selectedParts.onRoad);
const features = asArray(
selectedRow.keyFeatures ||
selectedRow.features ||
selectedRow.highlights ||
selectedRow.usp,
)
.map(compactText)
.filter(Boolean);

const fallbackFeatures = [
"Balanced performance, features and efficiency for daily use.",
"Premium comfort and convenience features for city and highway drives.",
"Strong safety package with confidence-focused ownership value.",
];

const finalFeatures = [...features, ...fallbackFeatures].slice(0, 4);

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
<p>{selectedRow.fuelTransmission}</p>

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

<motion.section className="side-card why-card" variants={fadeUp}>
<h3>Why this variant stands out</h3>

<div>
{finalFeatures.map((feature, index) => {
const icons = [Sparkles, Car, ShieldCheck, Check];
const Icon = icons[index % icons.length];

return (
<article key={`${feature}-${index}`}>
<span>
<Icon size={18} />
</span>

<p>{feature}</p>
</article>
);
})}
</div>

<button
type="button"
onClick={() =>
firePriceAction(
"View full features",
{
vehicle,
variant: selectedRow.variant,
intent: ACI_INTENTS.FEATURES,
canvasType: ACI_CANVAS_TYPES.FEATURES,
query: `Show full features for ${getVehicleTitle(vehicle)} ${selectedRow.variant}`,
},
onAction,
)
}
>
View full features <ChevronRight size={14} />
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
<button type="button" className="mobile-bell" onClick={() => firePriceAction("Notifications", {}, onAction)}>
<Bell size={24} />
<i />
</button>

<button type="button" className="mobile-avatar" onClick={() => firePriceAction("Profile", {}, onAction)}>
<img src={data?.avatarUrl} alt="Profile" />
</button>
</div>
</header>
);
}

function MobileVariantFilters({ activeFilter, setActiveFilter }) {
return (
<div className="mobile-filters">
{MOBILE_VARIANT_FILTERS.map((filter) => (
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
<h2>{getVehicleTitle(vehicle)} price list</h2>
<strong>
{formatAmount(minPrice, true)} – {formatAmount(maxPrice, true)}
</strong>
<p>{humanize(city)} · {count} variants · Ex-showroom</p>
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

function MobileVariantRow({ row, index, active, onClick }) {
const parts = pricePartsFromRow(row);

return (
<motion.button
type="button"
layout
whileTap={{ scale: 0.986 }}
onClick={onClick}
className={`mobile-variant-row ${active ? "active" : ""}`}
>
<div className="mobile-variant-main">
<h3>{row.variant || FALLBACK_VARIANT_NAMES[index] || "Variant"}</h3>
{row.recommended ? <span>Most popular</span> : null}
</div>

<article className="mobile-variant-meta">
<p>{row.fuelTransmission || "Petrol · Manual"}</p>
<small>{row.note || FALLBACK_NOTES[index] || "Variant details"}</small>
</article>

<div className="mobile-variant-price">
<strong>{formatAmount(parts.exShowroom || parts.onRoad, true)}</strong>
<small>Ex-showroom</small>
</div>

<ChevronRight size={20} />
</motion.button>
);
}

function MobilePage({
data,
vehicle,
rows,
selectedRowKey,
setSelectedRowKey,
activeFilter,
setActiveFilter,
minPrice,
maxPrice,
city,
image,
imageFailed,
onAction,
}) {
return (
<motion.main
className="price-mobile-page"
variants={stagger}
initial="hidden"
animate="visible"
>
<MobileHeader data={data} onAction={onAction} />

<motion.section variants={fadeUp}>
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
</motion.section>

<MobileHero
vehicle={vehicle}
minPrice={minPrice}
maxPrice={maxPrice}
city={city}
count={rows.length}
image={image}
imageFailed={imageFailed}
/>

<motion.div variants={fadeUp} className="mobile-filter-sticky-wrap">
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
<MobileVariantFilters activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
</motion.div>

<motion.div className="mobile-variant-list" variants={fadeUp}>
{rows.length ? rows.map((row, index) => {
const rowKey = rowKeyOf(row, index);

return (
<MobileVariantRow
key={rowKey}
row={row}
index={index}
active={rowKey === selectedRowKey}
onClick={() => setSelectedRowKey(rowKey)}
/>
);
}) : (
<div className="mobile-variants-empty">
<h3>No variants in this filter</h3>
<p>Try a different fuel, transmission, or budget filter.</p>
</div>
)}
</motion.div>

<AciComposer
mobile
selectedVehicle={vehicle}
onAction={onAction}
placeholder={`Ask ACI Assist about ${getVehicleModel(vehicle)} prices...`}
/>
</motion.main>
);
}

function DesktopPage({
data,
vehicle,
rows,
selectedRow,
selectedRowKey,
setSelectedRowKey,
selectedParts,
minPrice,
maxPrice,
minRange,
maxRange,
city,
image,
imageFailed,
setImageFailed,
openBreakupKey,
setOpenBreakupKey,
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
rows={rows}
selectedRow={selectedRow}
selectedParts={selectedParts}
minPrice={minPrice}
maxPrice={maxPrice}
city={city}
image={image}
imageFailed={imageFailed}
setImageFailed={setImageFailed}
onAction={onAction}
/>

<DesktopPriceTable
rows={rows}
selectedRowKey={selectedRowKey}
setSelectedRowKey={setSelectedRowKey}
openBreakupKey={openBreakupKey}
setOpenBreakupKey={setOpenBreakupKey}
/>

<div className="bottom-grid">
<PriceBreakupCard
selectedRow={selectedRow}
selectedParts={selectedParts}
city={city}
/>

<PriceRangeCard
rows={rows}
selectedRow={selectedRow}
selectedRowKey={selectedRowKey}
setSelectedRowKey={setSelectedRowKey}
minRange={minRange}
maxRange={maxRange}
/>
</div>

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
setImageFailed={setImageFailed}
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
normalizeRows({
vehicle: activeVehicle,
widget,
message,
}).sort((a, b) => {
const aPrice = pricePartsFromRow(a).exShowroom || Number.MAX_SAFE_INTEGER;
const bPrice = pricePartsFromRow(b).exShowroom || Number.MAX_SAFE_INTEGER;
return aPrice - bPrice;
}),
[activeVehicle, widget, message],
);

const recommendedIndex = Math.max(
0,
rows.findIndex((row) => row.recommended || /popular|best|value/i.test(row.variant || "")),
);

const defaultSelectedKey = rowKeyOf(rows[recommendedIndex] || rows[0] || {}, recommendedIndex);
const [selectedRowKey, setSelectedRowKey] = useState(defaultSelectedKey);
const [openBreakupKey, setOpenBreakupKey] = useState(null);
const [imageFailed, setImageFailed] = useState(false);
const [mobileFilter, setMobileFilter] = useState("all");

useEffect(() => {
if (!rows.length) return;

const exists = rows.some((row, index) => rowKeyOf(row, index) === selectedRowKey);
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
const mobileRows = useMemo(
() => rows.filter((row) => rowMatchesFilter(row, mobileFilter)),
[rows, mobileFilter],
);

useEffect(() => {
if (!mobileRows.length) return;
const existsInMobile = mobileRows.some((row, index) => rowKeyOf(row, index) === selectedRowKey);
if (!existsInMobile) {
setSelectedRowKey(rowKeyOf(mobileRows[0], 0));
}
}, [mobileRows, selectedRowKey]);

useEffect(() => {
setImageFailed(false);
}, [image]);

if (backendLiveMode && !rows.length) {
return (
<div className="aci-price-root">
<style>{`
.aci-price-root {
min-height: 100vh;
display: grid;
place-items: center;
padding: 28px;
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
color: #0f172a;
}

.aci-live-empty {
width: min(560px, 100%);
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
.map((row) => pricePartsFromRow(row).exShowroom || pricePartsFromRow(row).onRoad)
.filter(Boolean);

const rangeValues = rows
.map((row) => pricePartsFromRow(row).onRoad || pricePartsFromRow(row).exShowroom)
.filter(Boolean);

const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
const minRange = rangeValues.length ? Math.min(...rangeValues) : 0;
const maxRange = rangeValues.length ? Math.max(...rangeValues) : 0;

return (
<div className="aci-price-root">
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

.aci-price-root {
min-height: 100vh;
padding-bottom: 82px;
color: var(--ink);
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
background:
radial-gradient(circle at 85% -8%, rgba(37,99,235,.08), transparent 28%),
linear-gradient(180deg, #fff 0%, #f8fbff 100%);
-webkit-font-smoothing: antialiased;
}

.price-mobile-page {
display: none;
}

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
font-size: 34px;
line-height: .9;
font-weight: 900;
letter-spacing: -4px;
transform: skewX(-9deg);
}

.price-logo strong {
font-size: 15px;
line-height: 1;
letter-spacing: 6px;
font-weight: 760;
}

.price-logo svg {
color: var(--blue);
fill: currentColor;
}

.price-desktop-header,
.price-desktop-page {
width: min(100%, 1510px);
margin-inline: auto;
}

.price-desktop-header {
position: sticky;
top: 0;
z-index: 80;
height: 62px;
padding: 8px 40px 4px;
display: grid;
grid-template-columns: 1fr auto;
align-items: center;
gap: 20px;
background: linear-gradient(180deg, rgba(255,255,255,.97), rgba(255,255,255,.88));
backdrop-filter: blur(18px);
}

.price-hero,
.price-table-card,
.mini-panel,
.side-card,
.price-composer,
.mobile-price-hero,
.mobile-variant-row,
.price-mobile-chatbar {
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
box-shadow: 0 0 0 1px #dbe5f2, 0 10px 24px -14px rgba(37,99,235,.45);
}

.avatar-button img,
.mobile-avatar img {
width: 100%;
height: 100%;
border-radius: inherit;
object-fit: cover;
display: block;
}

.price-desktop-page {
padding: 8px 40px 88px;
display: grid;
grid-template-columns: minmax(0, 1fr) 370px;
gap: 18px;
align-items: start;
}

.price-desktop-main {
min-width: 0;
display: flex;
flex-direction: column;
gap: 14px;
}

.price-hero {
min-height: 278px;
border-radius: 28px;
padding: 28px 32px;
display: grid;
grid-template-columns: minmax(360px, .9fr) minmax(300px, 440px) 230px;
gap: 18px;
align-items: center;
overflow: hidden;
background: linear-gradient(135deg, #fff 0%, #f4f8ff 100%);
}

.price-hero-copy button {
border: 0;
background: transparent;
color: var(--blue);
display: inline-flex;
align-items: center;
gap: 8px;
padding: 0;
font-size: 13px;
font-weight: 700;
}

.price-hero-copy h1 {
margin: 18px 0 8px;
color: #07102b;
font-family: var(--serif);
font-size: clamp(34px, 3.7vw, 58px);
line-height: .95;
letter-spacing: -.065em;
font-weight: 660;
}

.price-hero-copy p {
margin: 0;
color: #475569;
font-size: 14px;
line-height: 1.5;
font-weight: 500;
max-width: 520px;
}

.hero-price-range {
margin-top: 22px;
width: max-content;
min-width: 250px;
border-radius: 18px;
border: 1px solid #dbe3ef;
background: rgba(255,255,255,.82);
padding: 14px 16px;
}

.hero-price-range span {
display: block;
color: #64748b;
font-size: 11px;
text-transform: uppercase;
letter-spacing: .12em;
font-weight: 750;
}

.hero-price-range strong {
display: block;
margin-top: 6px;
color: var(--blue);
font-size: 27px;
line-height: 1;
letter-spacing: -.045em;
}

.price-hero-stage {
min-width: 0;
display: grid;
place-items: center;
min-height: 220px;
border-radius: 24px;
background:
repeating-radial-gradient(ellipse at 82% 26%, rgba(255,255,255,.55) 0, rgba(255,255,255,.55) 2px, transparent 3px, transparent 20px),
radial-gradient(circle at 50% 65%, rgba(15,23,42,.10), transparent 38%),
linear-gradient(135deg, #f8fbff 0%, #ffffff 46%, #edf4ff 100%);
overflow: hidden;
}

.price-car-art {
width: 100%;
height: 100%;
display: grid;
place-items: center;
pointer-events: none;
}

.price-car-art .price-car-stage {
width: 100%;
height: 100%;
border-radius: 24px;
min-height: 92px;
}

.price-car-art .price-car-stage-image {
width: 92%;
height: 86%;
max-height: 220px;
}

.price-live-card {
min-width: 0;
border-radius: 24px;
border: 1px solid #dbe3ef;
background: rgba(255,255,255,.92);
padding: 18px;
box-shadow: 0 20px 58px -48px rgba(15,23,42,.45);
}

.price-live-card > span {
color: var(--blue);
display: flex;
align-items: center;
gap: 7px;
font-size: 11px;
font-weight: 800;
text-transform: uppercase;
letter-spacing: .08em;
}

.price-live-card strong {
display: block;
margin-top: 15px;
color: #0f172a;
font-size: 20px;
line-height: 1.1;
}

.price-live-card p {
margin: 6px 0 15px;
color: #64748b;
font-size: 12px;
font-weight: 600;
}

.price-live-card div {
border-top: 1px solid #e2e8f0;
padding-top: 15px;
}

.price-live-card em {
display: block;
color: #64748b;
font-size: 10px;
text-transform: uppercase;
letter-spacing: .12em;
font-style: normal;
font-weight: 800;
}

.price-live-card b {
display: block;
margin-top: 6px;
color: var(--blue);
font-size: 24px;
line-height: 1;
}

.price-live-card button {
width: 100%;
height: 42px;
margin-top: 16px;
border: 0;
border-radius: 14px;
background: linear-gradient(135deg, var(--blue), var(--blue-dark));
color: #fff;
display: flex;
align-items: center;
justify-content: center;
gap: 6px;
font-size: 13px;
font-weight: 750;
}

.price-table-card {
border-radius: 26px;
padding: 14px;
overflow: visible;
}

.table-head {
margin-bottom: 13px;
display: flex;
flex-wrap: wrap;
align-items: center;
justify-content: space-between;
gap: 12px;
}

.price-tabs {
display: grid;
overflow: hidden;
border-radius: 18px;
border: 1px solid #dbe3ef;
background: #fff;
grid-template-columns: repeat(3, minmax(110px, 1fr));
text-align: center;
color: #64748b;
font-size: 13px;
font-weight: 850;
}

.price-tabs span {
position: relative;
padding: 12px 18px;
}

.price-tabs span.active {
color: var(--blue);
}

.price-tabs i {
position: absolute;
left: 0;
right: 0;
bottom: 0;
height: 3px;
background: var(--blue);
}

.table-head p {
margin: 0;
color: #94a3b8;
font-size: 12px;
font-weight: 700;
}

.price-table-wrap {
overflow: visible;
border-radius: 22px;
border: 1px solid #dbe3ef;
background: #fff;
}

table {
width: 100%;
border-collapse: collapse;
table-layout: fixed;
font-size: 12px;
}

th {
border-bottom: 1px solid #e2e8f0;
background: #f8fafc;
color: #64748b;
padding: 14px 9px;
text-align: left;
text-transform: uppercase;
letter-spacing: .08em;
font-size: 10px;
font-weight: 900;
}

td {
border-bottom: 1px solid #eef2f7;
padding: 13px 9px;
color: #475569;
font-weight: 650;
position: relative;
}

tr {
cursor: pointer;
transition: background .2s ease;
}

tr.selected {
background: #eff6ff;
box-shadow: inset 0 0 0 1px #93c5fd;
}

td strong {
display: block;
color: #0f172a;
font-weight: 900;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

td em {
display: inline-flex;
margin-top: 5px;
height: 21px;
align-items: center;
border-radius: 7px;
background: #dbeafe;
color: var(--blue);
padding: 0 7px;
font-size: 10px;
font-style: normal;
font-weight: 800;
}

td b {
color: #0f172a;
font-weight: 900;
}

td .on-road {
color: var(--blue);
}

.muted {
color: #94a3b8;
}

.row-dot {
width: 16px;
height: 16px;
border-radius: 999px;
border: 1px solid #94a3b8;
background: #fff;
display: grid;
place-items: center;
}

.row-dot.active {
border-color: var(--blue);
background: var(--blue);
}

.row-dot i {
width: 6px;
height: 6px;
border-radius: 999px;
background: #fff;
}

.other-cell {
position: relative;
display: inline-flex;
align-items: center;
gap: 3px;
}

.other-cell button {
width: 24px;
height: 24px;
border: 0;
background: transparent;
color: #94a3b8;
display: grid;
place-items: center;
border-radius: 999px;
}

.other-cell button:hover {
background: #eff6ff;
color: var(--blue);
}

.breakup-popover {
position: absolute;
left: 0;
top: 30px;
z-index: 999;
width: 280px;
border-radius: 18px;
border: 1px solid #dbe3ef;
background: white;
padding: 12px;
box-shadow: 0 18px 50px -20px rgba(15,23,42,.35);
}

.breakup-popover.top {
top: auto;
bottom: 30px;
}

.breakup-popover div,
.breakup-popover p {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
margin: 0;
}

.breakup-popover div {
border-bottom: 1px solid #e2e8f0;
padding-bottom: 9px;
margin-bottom: 9px;
}

.breakup-popover strong,
.breakup-popover span {
color: #64748b;
font-size: 12px;
font-weight: 800;
}

.breakup-popover b {
color: #0f172a;
font-size: 12px;
font-weight: 900;
}

.breakup-popover p {
padding: 4px 0;
}

.empty-row {
text-align: center;
padding: 48px 16px;
color: #64748b;
}

.empty-row svg {
margin: 0 auto 8px;
color: #cbd5e1;
}

.price-table-card > small {
display: block;
margin-top: 12px;
color: #94a3b8;
font-size: 12px;
font-weight: 650;
line-height: 1.5;
}

.bottom-grid {
display: grid;
grid-template-columns: .9fr 1.1fr;
gap: 14px;
}

.mini-panel {
border-radius: 26px;
padding: 18px;
}

.mini-panel h3 {
margin: 0;
color: #0f172a;
font-size: 16px;
font-weight: 900;
}

.mini-panel h3 span {
color: #64748b;
font-weight: 650;
}

.panel-sub {
margin: 4px 0 0;
color: #64748b;
font-size: 12px;
font-weight: 700;
}

.breakup-list {
margin-top: 18px;
display: flex;
flex-direction: column;
gap: 12px;
}

.breakup-list div,
.breakup-list footer {
display: flex;
align-items: center;
justify-content: space-between;
gap: 14px;
}

.breakup-list span {
color: #64748b;
font-size: 14px;
font-weight: 650;
}

.breakup-list strong {
color: #0f172a;
font-size: 14px;
font-weight: 900;
}

.breakup-list footer {
border-top: 1px solid #e2e8f0;
padding-top: 14px;
}

.breakup-list footer b {
color: #0f172a;
font-size: 15px;
}

.breakup-list footer strong {
color: var(--blue);
font-size: 18px;
}

.breakup-list aside {
margin-top: 4px;
border-radius: 16px;
border: 1px solid #bfdbfe;
background: #eff6ff;
padding: 12px;
display: flex;
gap: 8px;
color: #475569;
}

.breakup-list aside svg {
color: var(--blue);
flex: 0 0 auto;
margin-top: 2px;
}

.breakup-list aside p {
margin: 0;
font-size: 12px;
font-weight: 650;
line-height: 1.5;
}

.range-title {
display: flex;
justify-content: space-between;
gap: 16px;
align-items: flex-start;
}

.range-title p {
margin: 5px 0 0;
color: #64748b;
font-size: 13px;
font-weight: 650;
}

.range-title span {
border-radius: 999px;
border: 1px solid #bfdbfe;
background: #eff6ff;
color: #1e40af;
padding: 6px 10px;
font-size: 11px;
font-weight: 900;
}

.range-track-wrap {
margin-top: 24px;
border-radius: 22px;
border: 1px solid #e2e8f0;
background: #f8fafc;
padding: 22px;
}

.range-track {
position: relative;
height: 11px;
border-radius: 999px;
background: #dbe3ef;
}

.range-track > i {
position: absolute;
inset: 0;
border-radius: 999px;
background: linear-gradient(90deg, #94a3b8 0%, var(--blue) 50%, #1e293b 100%);
}

.range-pin {
position: absolute;
top: 50%;
transform: translate(-50%, -50%);
border-radius: 999px;
border: 2px solid white;
background: #64748b;
box-shadow: 0 6px 14px rgba(15,23,42,.18);
}

.range-pin.small {
width: 16px;
height: 16px;
}

.range-pin.top {
background: #1e293b;
}

.range-pin.selected {
width: 32px;
height: 32px;
border: 7px solid white;
background: var(--blue);
box-shadow: 0 14px 34px -14px rgba(37,99,235,.95);
}

.range-cards {
margin-top: 14px;
display: grid;
grid-template-columns: repeat(3, minmax(0, 1fr));
gap: 10px;
}

.range-cards button {
min-width: 0;
border-radius: 17px;
border: 1px solid #dbe3ef;
background: #f8fafc;
padding: 12px;
}

.range-cards button.active {
border-color: #bfdbfe;
background: #eff6ff;
box-shadow: 0 18px 40px -28px rgba(37,99,235,.45);
}

.range-cards .left {
text-align: left;
}

.range-cards .center {
text-align: center;
}

.range-cards .right {
text-align: right;
}

.range-cards strong,
.range-cards span,
.range-cards em {
display: block;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

.range-cards strong {
color: #64748b;
font-size: 13px;
font-weight: 900;
}

.range-cards button.active strong {
color: var(--blue);
}

.range-cards span {
margin-top: 6px;
color: #64748b;
font-size: 12px;
font-weight: 700;
}

.range-cards em {
margin-top: 6px;
color: #94a3b8;
font-size: 10px;
text-transform: uppercase;
letter-spacing: .08em;
font-style: normal;
font-weight: 900;
}

.price-side {
position: sticky;
top: 76px;
display: flex;
flex-direction: column;
gap: 14px;
align-self: start;
padding-bottom: 20px;
}

.side-card {
border-radius: 26px;
padding: 18px;
}

.side-head {
display: flex;
justify-content: space-between;
align-items: flex-start;
gap: 14px;
}

.side-head h3,
.side-card h3 {
margin: 0;
color: #0f172a;
font-size: 15px;
font-weight: 900;
}

.side-head > span:not(.icon-box) {
color: #059669;
display: inline-flex;
align-items: center;
gap: 6px;
font-size: 12px;
font-weight: 900;
}

.side-head > span i {
width: 8px;
height: 8px;
border-radius: 999px;
background: #10b981;
}

.selected-summary h4 {
margin: 18px 0 5px;
color: #0f172a;
font-size: 20px;
line-height: 1.1;
font-weight: 900;
}

.selected-summary > p {
margin: 0;
color: #64748b;
font-size: 13px;
font-weight: 650;
}

.side-art {
height: 190px;
margin-top: 16px;
border-radius: 22px;
overflow: hidden;
background: radial-gradient(circle at 50% 42%, #fff 0%, #f8fafc 38%, #eaf2ff 100%);
border: 1px solid #dbe3ef;
}

.side-art .price-car-stage-image {
max-height: 170px;
}

.side-price {
margin-top: 17px;
border-top: 1px solid #e2e8f0;
padding-top: 17px;
}

.side-price span {
display: block;
color: #64748b;
text-transform: uppercase;
letter-spacing: .12em;
font-size: 10px;
font-weight: 900;
}

.side-price strong {
display: block;
margin-top: 8px;
color: var(--blue);
font-size: 29px;
line-height: 1;
letter-spacing: -.04em;
}

.icon-box {
width: 40px;
height: 40px;
border-radius: 15px;
background: #eff6ff;
color: var(--blue);
display: grid;
place-items: center;
border: 1px solid #bfdbfe;
}

.emi-card .side-head p {
margin: 4px 0 0;
color: #64748b;
font-size: 12px;
font-weight: 650;
}

.emi-card > strong {
display: block;
margin-top: 18px;
color: #0f172a;
font-size: 30px;
line-height: 1;
letter-spacing: -.04em;
}

.emi-card > strong em {
margin-left: 5px;
color: #64748b;
font-size: 13px;
font-style: normal;
}

.emi-lines {
margin-top: 16px;
display: flex;
flex-direction: column;
gap: 9px;
}

.emi-lines p {
margin: 0;
display: flex;
justify-content: space-between;
gap: 14px;
}

.emi-lines span {
color: #64748b;
font-size: 13px;
font-weight: 650;
}

.emi-lines b {
color: #0f172a;
font-size: 13px;
font-weight: 900;
}

.emi-card button,
.why-card button {
margin-top: 17px;
border: 0;
background: transparent;
color: var(--blue);
display: inline-flex;
align-items: center;
gap: 4px;
padding: 0;
font-size: 13px;
font-weight: 900;
}

.why-card > div {
margin-top: 16px;
display: flex;
flex-direction: column;
gap: 14px;
}

.why-card article {
display: flex;
gap: 12px;
}

.why-card article span {
width: 38px;
height: 38px;
border-radius: 14px;
background: #eff6ff;
color: var(--blue);
display: grid;
place-items: center;
border: 1px solid #bfdbfe;
flex: 0 0 auto;
}

.why-card article p {
margin: 0;
color: #64748b;
font-size: 13px;
line-height: 1.5;
font-weight: 650;
}

.price-composer-dock {
position: fixed;
left: 0;
right: 0;
bottom: 0;
z-index: 160;
display: flex;
flex-direction: column;
align-items: center;
padding: 6px 24px 8px;
background: transparent;
}

.price-composer {
width: min(860px, calc(100vw - 64px));
min-height: 58px;
padding: 6px 8px 6px 10px;
border-radius: 30px;
display: grid;
grid-template-columns: 48px 1fr 36px 54px;
gap: 10px;
align-items: center;
background: rgba(255,255,255,.97);
border: 1px solid #cbd5e1;
box-shadow: 0 14px 34px -28px rgba(15,23,42,.24), inset 0 1px 0 rgba(255,255,255,1);
}

.price-composer button:first-child,
.price-mobile-chatbar button:first-child {
border: 1px solid #e0e7f1;
background: #f5f8ff;
color: var(--blue);
display: grid;
place-items: center;
}

.price-composer button:first-child {
width: 48px;
height: 48px;
border-radius: 19px;
}

.price-composer button:first-child svg,
.price-mobile-chatbar button:first-child svg {
fill: currentColor;
}

.price-composer input,
.price-mobile-chatbar input {
min-width: 0;
border: 0;
outline: 0;
background: transparent;
color: #1e293b;
font-weight: 460;
}

.price-composer input {
font-size: 14px;
}

.price-composer input::placeholder,
.price-mobile-chatbar input::placeholder {
color: #94a3b8;
}

.price-composer button:nth-of-type(2) {
width: 36px;
height: 36px;
border: 0;
background: transparent;
color: #526075;
display: grid;
place-items: center;
}

.price-composer button:last-child {
width: 54px;
height: 48px;
border: 0;
border-radius: 18px;
color: #fff;
background: linear-gradient(135deg, var(--blue), var(--blue-dark));
display: grid;
place-items: center;
box-shadow: 0 14px 26px -20px rgba(37,99,235,.45);
}

.price-composer-dock p {
margin: 7px 0 0;
color: #94a3b8;
font-size: 10px;
font-weight: 460;
}

@media (max-width: 1240px) and (min-width: 901px) {
.price-desktop-page {
grid-template-columns: 1fr;
}

.price-side {
display: none;
}

.price-hero {
grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
}

.price-live-card {
display: none;
}
}

@media (max-width: 900px) {
.price-desktop-header,
.price-desktop-page {
display: none;
}

.aci-price-root {
padding-bottom: 68px;
background:
radial-gradient(circle at 50% 100%, rgba(37,99,235,.10), transparent 26%),
linear-gradient(180deg, #fff 0%, #fbfcff 55%, #f8fbff 100%);
}

.price-mobile-page {
width: 100%;
max-width: 430px;
min-height: 100vh;
margin: 0 auto;
padding: 14px 14px 72px;
display: flex;
flex-direction: column;
gap: 14px;
}

.price-mobile-header {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
}

.price-logo.mobile {
gap: 10px;
}

.price-logo.mobile span {
font-size: 29px;
}

.price-logo.mobile strong {
font-size: 13px;
letter-spacing: 5.6px;
}

.price-mobile-header > div {
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
width: 42px;
height: 42px;
}

.mobile-back-link {
border: 0;
background: transparent;
padding: 0;
color: var(--blue);
display: inline-flex;
align-items: center;
gap: 6px;
font-size: 12px;
font-weight: 800;
}

.price-mobile-page h1 {
margin: 10px 0 0;
color: #07102b;
font-family: var(--serif);
font-size: 31px;
line-height: .98;
letter-spacing: -.06em;
font-weight: 630;
}

.price-mobile-page section > p {
margin: 9px 0 0;
color: #667085;
font-size: 15px;
line-height: 1.35;
}

.mobile-filter-sticky-wrap {
position: sticky;
top: 10px;
z-index: 12;
display: flex;
flex-direction: column;
gap: 9px;
padding-top: 2px;
}

.mobile-city-pill {
height: 34px;
width: max-content;
border-radius: 999px;
border: 1px solid #dbe3ef;
background: rgba(255,255,255,.95);
padding: 0 11px;
color: #334155;
display: inline-flex;
align-items: center;
gap: 6px;
font-size: 12px;
font-weight: 620;
}

.mobile-filters {
display: flex;
gap: 8px;
overflow-x: auto;
padding-bottom: 1px;
scrollbar-width: none;
}

.mobile-filters::-webkit-scrollbar {
display: none;
}

.mobile-filters button {
height: 34px;
flex: 0 0 auto;
border-radius: 999px;
border: 1px solid #dbe3ef;
background: rgba(255,255,255,.95);
padding: 0 12px;
color: #475569;
font-size: 13px;
font-weight: 590;
white-space: nowrap;
}

.mobile-filters button.active {
background: linear-gradient(135deg, #2563eb, #1d4ed8);
border-color: #2563eb;
color: #fff;
box-shadow: 0 14px 26px -20px rgba(37,99,235,.58);
}

.mobile-price-hero {
position: relative;
min-height: 224px;
border-radius: 26px;
overflow: hidden;
padding: 16px;
display: flex;
flex-direction: column;
justify-content: space-between;
gap: 10px;
}

.mobile-price-hero > div:first-child {
position: relative;
z-index: 3;
max-width: 72%;
}

.mobile-price-hero h2 {
margin: 0;
color: #07102b;
font-family: var(--serif);
font-size: 34px;
line-height: 1.04;
letter-spacing: -.045em;
font-weight: 630;
}

.mobile-price-hero strong {
display: block;
margin-top: 10px;
color: var(--blue);
font-size: 28px;
line-height: 1;
letter-spacing: -.04em;
}

.mobile-price-hero p {
margin: 8px 0 0;
color: #667085;
font-size: 12px;
line-height: 1.3;
}

.mobile-hero-art {
position: relative;
right: auto;
bottom: auto;
width: 100%;
height: 118px;
z-index: 2;
}

.mobile-variant-list {
display: flex;
flex-direction: column;
gap: 12px;
}

.mobile-variant-row {
min-height: 92px;
width: 100%;
border-radius: 24px;
padding: 14px 16px;
display: grid;
grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) auto 18px;
gap: 8px;
align-items: center;
text-align: left;
background: rgba(255,255,255,.96);
}

.mobile-variant-row.active {
border-color: #90b8ff;
background: rgba(239,246,255,.86);
box-shadow: 0 0 0 2px rgba(37,99,235,.09);
}

.mobile-variant-main h3 {
margin: 0;
color: #07102b;
font-size: 16px;
line-height: 1.14;
letter-spacing: -.01em;
font-weight: 740;
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
}

.mobile-variant-main > span {
display: inline-flex;
align-items: center;
height: 21px;
margin-top: 7px;
border-radius: 7px;
background: #dbeafe;
color: var(--blue);
padding: 0 7px;
font-size: 11px;
font-weight: 800;
}

.mobile-variant-meta p {
margin: 0;
color: #667085;
font-size: 12px;
font-weight: 620;
}

.mobile-variant-meta small {
display: block;
margin-top: 4px;
color: #667085;
font-size: 11px;
line-height: 1.24;
}

.mobile-variant-price {
display: flex;
flex-direction: column;
align-items: flex-end;
gap: 2px;
}

.mobile-variant-price > strong {
color: var(--blue);
font-size: 20px;
line-height: 1;
letter-spacing: -.04em;
white-space: nowrap;
}

.mobile-variant-price > small {
color: #94a3b8;
font-size: 11px;
font-weight: 620;
}

.mobile-variant-row > svg {
color: var(--blue);
}

.mobile-variants-empty {
padding: 18px;
border: 1px solid #dbe3ef;
border-radius: 22px;
background: rgba(255,255,255,.95);
}

.mobile-variants-empty h3 {
margin: 0;
font-size: 16px;
font-weight: 680;
color: #0f172a;
}

.mobile-variants-empty p {
margin: 8px 0 0;
font-size: 13px;
line-height: 1.35;
color: #64748b;
}

.price-mobile-chat-dock {
position: fixed;
left: 16px;
right: 16px;
bottom: calc(8px + env(safe-area-inset-bottom));
z-index: 160;
padding: 0;
display: block;
background: transparent;
}

.price-mobile-chatbar {
width: 100%;
min-height: 68px;
border-radius: 999px;
border: 1px solid #dbe3ef;
background: rgba(255,255,255,.98);
box-shadow: 0 12px 28px -24px rgba(15,23,42,.24), inset 0 1px 0 rgba(255,255,255,1);
display: grid;
grid-template-columns: 48px 1fr 36px 54px;
gap: 8px;
align-items: center;
padding: 7px;
}

.price-mobile-chatbar button:first-child {
width: 48px;
height: 48px;
border-radius: 999px;
}

.price-mobile-chatbar input {
font-size: 14px;
}

.price-mobile-chatbar button:nth-of-type(2) {
width: 30px;
height: 36px;
border: 0;
background: transparent;
color: #526075;
display: grid;
place-items: center;
}

.price-mobile-chatbar button:last-child {
width: 54px;
height: 54px;
border: 0;
border-radius: 999px;
color: #fff;
background: linear-gradient(135deg, var(--blue), var(--blue-dark));
display: grid;
place-items: center;
box-shadow: 0 14px 26px -20px rgba(37,99,235,.45);
}
}

@media (max-width: 390px) {
.price-mobile-page {
padding-inline: 12px;
}

.price-mobile-page h1 {
font-size: 28px;
}

.mobile-variant-row {
grid-template-columns: minmax(0, 1fr) minmax(0, .95fr) auto 16px;
padding: 12px;
}

.mobile-variant-main h3 {
font-size: 15px;
}

.mobile-variant-price > strong {
font-size: 18px;
}
}
`}</style>

<DesktopPage
data={data}
vehicle={activeVehicle}
rows={rows}
selectedRow={selectedRow}
selectedRowKey={selectedRowKey}
setSelectedRowKey={setSelectedRowKey}
selectedParts={selectedParts}
minPrice={minPrice}
maxPrice={maxPrice}
minRange={minRange}
maxRange={maxRange}
city={city}
image={image}
imageFailed={imageFailed}
setImageFailed={setImageFailed}
openBreakupKey={openBreakupKey}
setOpenBreakupKey={setOpenBreakupKey}
onAction={onAction}
/>

      <MobilePage
        data={data}
        vehicle={activeVehicle}
        rows={mobileRows}
        selectedRowKey={selectedRowKey}
        setSelectedRowKey={setSelectedRowKey}
        activeFilter={mobileFilter}
        setActiveFilter={setMobileFilter}
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
