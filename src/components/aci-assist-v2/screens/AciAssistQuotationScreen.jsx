import React, { useState } from "react";
import { Check, ChevronLeft, FileText, MapPin, Phone, User } from "lucide-react";
import { AciVehicleVisual, emitAciAction } from "../shared/AciAssistShared";

const titleOf = (vehicle = {}) =>
  vehicle.displayName ||
  [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
  "Selected car";

const cityLabel = (value = "") =>
  String(value || "Delhi")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export default function AciAssistQuotationScreen({ vehicle = {}, onAction }) {
  const title = titleOf(vehicle);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(
    cityLabel(vehicle.city || vehicle.citySlug || "Delhi"),
  );

  const submit = (event) => {
    event.preventDefault();
    emitAciAction(
      {
        id: `request-quote-${vehicle.model || "car"}`,
        label: `Request quotation for ${title}`,
        query: `Request a quotation for ${title} in ${city}`,
        type: "submit_quotation",
        intent: "aci_new_car_quotation",
        canvasType: "aci_quotation_canvas",
        vehicle: { ...vehicle, city },
        payload: { name: name.trim(), phone: phone.trim(), city },
      },
      onAction,
    );
  };

  return (
    <main className="aci-quote-screen">
      <style>{quoteStyles}</style>
      <header>
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
        <span>Dealer quotation</span>
        <h1>Get a clear quote for {title}</h1>
        <p>Share only the basics. A dealer can then confirm the exact variant, city price and availability.</p>
      </header>

      <section className="quote-layout">
        <div className="quote-car">
          <AciVehicleVisual vehicle={vehicle} height={250} stage stageVariant="hero" />
          <strong>{title}</strong>
          <span>{vehicle.variant || "Variant can be chosen before enquiry"}</span>
          <ul>
            <li><Check size={15} /> Exact city quotation</li>
            <li><Check size={15} /> Variant and color availability</li>
            <li><Check size={15} /> Current dealer offers</li>
          </ul>
        </div>

        <form onSubmit={submit}>
          <div className="quote-form-title"><FileText size={20} /><strong>Your enquiry</strong></div>
          <label>
            <span><User size={15} /> Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
          </label>
          <label>
            <span><Phone size={15} /> Mobile number</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} required minLength={10} inputMode="numeric" autoComplete="tel" />
          </label>
          <label>
            <span><MapPin size={15} /> City</span>
            <input value={city} onChange={(event) => setCity(event.target.value)} required autoComplete="address-level2" />
          </label>
          <button type="submit">Request dealer quote</button>
          <small>Your details are used only to help with this car enquiry.</small>
        </form>
      </section>
    </main>
  );
}

const quoteStyles = `
  .aci-quote-screen { min-height:100vh; padding:32px max(24px,calc((100vw - 1080px)/2)) 90px; color:#0f172a; background:#fff; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
  .aci-quote-screen > header { padding:8px 0 24px; border-bottom:1px solid #e4e9f1; }
  .aci-quote-screen > header > button { border:0; padding:0; background:transparent; color:#475569; display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; }
  .aci-quote-screen > header > span { display:block; margin-top:24px; color:#0758f8; font-size:11px; font-weight:800; text-transform:uppercase; }
  .aci-quote-screen h1 { margin:7px 0 6px; font-size:34px; line-height:1.08; letter-spacing:0; }
  .aci-quote-screen header p { max-width:720px; margin:0; color:#64748b; font-size:14px; line-height:1.5; }
  .quote-layout { padding:28px 0; display:grid; grid-template-columns:1.15fr .85fr; gap:46px; align-items:start; }
  .quote-car { min-height:440px; padding:28px; border-radius:16px; background:#f6f8fb; box-shadow:inset 0 0 0 1px #e8edf4; }
  .quote-car > strong { display:block; margin-top:8px; font-size:24px; }
  .quote-car > span { display:block; margin-top:5px; color:#64748b; font-size:12px; }
  .quote-car ul { margin:24px 0 0; padding:18px 0 0; border-top:1px solid #dfe5ed; list-style:none; display:grid; gap:10px; }
  .quote-car li { color:#334155; display:flex; align-items:center; gap:8px; font-size:12px; font-weight:650; }
  .quote-car li svg { color:#15803d; }
  .quote-layout form { padding:10px 0; display:grid; gap:15px; }
  .quote-form-title { margin-bottom:5px; display:flex; align-items:center; gap:9px; font-size:18px; }
  .quote-form-title svg { color:#0758f8; }
  .quote-layout label { display:grid; gap:7px; }
  .quote-layout label span { color:#475569; display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; }
  .quote-layout input { height:48px; padding:0 13px; border:1px solid #d9e1ec; border-radius:10px; font-size:15px; outline:none; }
  .quote-layout input:focus { border-color:#0758f8; box-shadow:0 0 0 3px rgba(7,88,248,.1); }
  .quote-layout form > button { height:48px; margin-top:4px; border:0; border-radius:10px; background:#0758f8; color:#fff; font-weight:780; }
  .quote-layout form > small { color:#7c8aa0; font-size:10px; text-align:center; }
  @media(max-width:1180px){
    .aci-quote-screen { width:min(100%,430px); margin:0 auto; padding:20px 18px 90px; }
    .aci-quote-screen h1 { font-size:28px; }
    .quote-layout { padding:20px 0; grid-template-columns:1fr; gap:20px; }
    .quote-car { min-height:300px; padding:18px; }
  }
`;
