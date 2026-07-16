import React, { useMemo, useState } from "react";
import { Calculator, ChevronLeft, IndianRupee, Percent, Timer } from "lucide-react";
import {
  AciComposer,
  AciVehicleVisual,
  emitAciAction,
} from "../shared/AciAssistShared";

const parseMoney = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value || "").replace(/,/g, "").trim();
  const number = Number(text.match(/[\d.]+/)?.[0] || 0);
  if (!number) return 0;
  if (/crore|cr\b/i.test(text)) return number * 10000000;
  if (/lakh|lac|l\b/i.test(text)) return number * 100000;
  return number;
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number(value || 0)));

const getVehicleTitle = (vehicle = {}) =>
  vehicle.displayName ||
  [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
  "Selected car";

const getDefaultPrice = (vehicle = {}, widget = {}) => {
  const rows = vehicle.variants || widget.rows || widget.variants || [];
  return (
    parseMoney(vehicle.startingOnRoadPrice || vehicle.priceRange) ||
    parseMoney(rows[0]?.onRoadPrice || rows[0]?.onRoad || rows[0]?.price) ||
    1000000
  );
};

export default function AciAssistEmiScreen({ vehicle = {}, widget = {}, onAction }) {
  const title = getVehicleTitle(vehicle);
  const defaultPrice = getDefaultPrice(vehicle, widget);
  const [carPrice, setCarPrice] = useState(defaultPrice);
  const [downPayment, setDownPayment] = useState(
    Math.round(defaultPrice * 0.2),
  );
  const [interest, setInterest] = useState(9.5);
  const [tenure, setTenure] = useState(5);

  const result = useMemo(() => {
    const principal = Math.max(0, carPrice - downPayment);
    const months = Math.max(1, tenure * 12);
    const monthlyRate = Math.max(0, interest) / 1200;
    const emi = monthlyRate
      ? (principal * monthlyRate * (1 + monthlyRate) ** months) /
        ((1 + monthlyRate) ** months - 1)
      : principal / months;
    const total = emi * months;

    return {
      principal,
      emi: Math.round(emi),
      interestPaid: Math.round(Math.max(0, total - principal)),
      total: Math.round(total),
    };
  }, [carPrice, downPayment, interest, tenure]);

  return (
    <main className="aci-emi-screen">
      <style>{emiStyles}</style>

      <section className="emi-heading">
        <button
          type="button"
          onClick={() =>
            emitAciAction(
              { type: "back_to_car", label: `Back to ${title}`, vehicle },
              onAction,
            )
          }
        >
          <ChevronLeft size={17} /> Overview
        </button>
        <span>Finance planner</span>
        <h1>Plan the EMI for {title}</h1>
        <p>Adjust the numbers below. The estimate updates instantly.</p>
      </section>

      <section className="emi-workspace">
        <div className="emi-vehicle">
          <AciVehicleVisual vehicle={vehicle} height={230} stage stageVariant="hero" />
          <strong>{title}</strong>
          <span>On-road amount used: {money(carPrice)}</span>
        </div>

        <div className="emi-controls">
          <label>
            <span><IndianRupee size={16} /> On-road price</span>
            <input
              type="number"
              min="100000"
              step="10000"
              value={carPrice}
              onChange={(event) => setCarPrice(Number(event.target.value) || 0)}
            />
          </label>
          <label>
            <span><IndianRupee size={16} /> Down payment</span>
            <input
              type="number"
              min="0"
              max={carPrice}
              step="10000"
              value={downPayment}
              onChange={(event) =>
                setDownPayment(Math.min(carPrice, Number(event.target.value) || 0))
              }
            />
          </label>
          <label>
            <span><Percent size={16} /> Interest rate</span>
            <input
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={interest}
              onChange={(event) => setInterest(Number(event.target.value) || 0)}
            />
          </label>
          <label>
            <span><Timer size={16} /> Tenure</span>
            <select value={tenure} onChange={(event) => setTenure(Number(event.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7].map((year) => (
                <option key={year} value={year}>{year} year{year > 1 ? "s" : ""}</option>
              ))}
            </select>
          </label>
        </div>

        <aside className="emi-result">
          <Calculator size={22} />
          <span>Estimated monthly EMI</span>
          <strong>{money(result.emi)}</strong>
          <dl>
            <div><dt>Loan amount</dt><dd>{money(result.principal)}</dd></div>
            <div><dt>Total interest</dt><dd>{money(result.interestPaid)}</dd></div>
            <div><dt>Total repayment</dt><dd>{money(result.total)}</dd></div>
          </dl>
          <small>Indicative estimate. Your lender may use a different rate or fee structure.</small>
        </aside>
      </section>

      <AciComposer
        onAction={onAction}
        selectedVehicle={vehicle}
        placeholder={`Ask about financing ${vehicle.model || "this car"}...`}
      />
    </main>
  );
}

const emiStyles = `
  .aci-emi-screen { min-height:100vh; padding:32px max(24px, calc((100vw - 1180px)/2)) 110px; color:#0f172a; background:#fff; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
  .emi-heading { padding:8px 0 24px; border-bottom:1px solid #e4e9f1; }
  .emi-heading > button { border:0; padding:0; background:transparent; color:#475569; display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; }
  .emi-heading > span { display:block; margin-top:24px; color:#0758f8; font-size:11px; font-weight:800; text-transform:uppercase; }
  .emi-heading h1 { margin:7px 0 6px; font-size:34px; line-height:1.08; font-weight:780; letter-spacing:0; }
  .emi-heading p { margin:0; color:#64748b; font-size:14px; }
  .emi-workspace { padding:28px 0; display:grid; grid-template-columns:1fr .85fr .9fr; gap:28px; align-items:start; }
  .emi-vehicle { min-height:320px; padding:22px; border-radius:16px; background:#f6f8fb; display:flex; flex-direction:column; justify-content:flex-end; box-shadow:inset 0 0 0 1px #e8edf4; }
  .emi-vehicle strong { font-size:22px; }
  .emi-vehicle span { margin-top:5px; color:#64748b; font-size:12px; }
  .emi-controls { display:grid; gap:14px; }
  .emi-controls label { display:grid; gap:7px; }
  .emi-controls label > span { color:#475569; display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; }
  .emi-controls input,.emi-controls select { width:100%; height:48px; padding:0 13px; border:1px solid #d9e1ec; border-radius:10px; background:#fff; color:#0f172a; font-size:15px; font-weight:650; outline:none; }
  .emi-controls input:focus,.emi-controls select:focus { border-color:#0758f8; box-shadow:0 0 0 3px rgba(7,88,248,.1); }
  .emi-result { min-height:320px; padding:24px; border-left:1px solid #e4e9f1; }
  .emi-result > svg { color:#0758f8; }
  .emi-result > span { display:block; margin-top:18px; color:#64748b; font-size:11px; font-weight:750; text-transform:uppercase; }
  .emi-result > strong { display:block; margin-top:7px; color:#0758f8; font-size:38px; line-height:1; }
  .emi-result dl { margin:26px 0 16px; display:grid; gap:11px; }
  .emi-result dl div { display:flex; justify-content:space-between; gap:12px; padding-bottom:11px; border-bottom:1px solid #edf1f6; }
  .emi-result dt { color:#64748b; font-size:12px; }
  .emi-result dd { margin:0; font-size:12px; font-weight:750; }
  .emi-result small { color:#7c8aa0; font-size:10px; line-height:1.45; }
  @media(max-width:1180px){
    .aci-emi-screen { width:min(100%,430px); margin:0 auto; padding:20px 18px 92px; }
    .emi-heading h1 { font-size:28px; }
    .emi-workspace { padding:20px 0; grid-template-columns:1fr; gap:20px; }
    .emi-vehicle { min-height:240px; padding:16px; }
    .emi-result { min-height:0; padding:22px 0 0; border-left:0; border-top:1px solid #e4e9f1; }
  }
`;
