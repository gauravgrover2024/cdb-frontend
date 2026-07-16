import React from "react";
import { ChevronLeft } from "lucide-react";
import { AciComposer, emitAciAction } from "../shared/AciAssistShared";
import { AciV2ComparisonInlineCard } from "../chat/AciV2SpecialInlineCards";

const titleOf = (vehicle = {}) =>
  vehicle.displayName ||
  [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
  "Selected car";

export default function AciAssistCompareScreen({
  data = {},
  vehicle = {},
  widget = {},
  onAction,
}) {
  const title = titleOf(vehicle);
  const rows = widget.rows || widget.items || widget.data?.rows || [];
  const hasComparison = rows.length >= 2 || widget.left || widget.right;

  return (
    <main className="aci-compare-screen">
      <style>{compareStyles}</style>
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
        <span>Side-by-side comparison</span>
        <h1>{hasComparison ? "Compare the details that matter" : `Choose a rival for ${title}`}</h1>
        <p>Prices, variants and equipment stay grouped by car for a clean decision.</p>
      </header>

      <section className="compare-canvas-content">
        {hasComparison ? (
          <AciV2ComparisonInlineCard
            message={{ ...data, widget, vehicle }}
            widget={widget}
            onAction={onAction}
          />
        ) : (
          <div className="compare-empty">
            <strong>No second car selected yet</strong>
            <p>Open similar cars and choose the closest alternative to compare.</p>
            <button
              type="button"
              onClick={() =>
                emitAciAction(
                  {
                    label: `Find cars similar to ${vehicle.model || title}`,
                    query: `Suggest cars similar to ${vehicle.model || title}`,
                    intent: "vehicle_recommendations",
                    canvasType: "recommendation_results_canvas",
                    vehicle,
                  },
                  onAction,
                )
              }
            >
              Find similar cars
            </button>
          </div>
        )}
      </section>

      <AciComposer
        onAction={onAction}
        selectedVehicle={vehicle}
        placeholder={`Ask a comparison question about ${vehicle.model || "this car"}...`}
      />
    </main>
  );
}

const compareStyles = `
  .aci-compare-screen { min-height:100vh; padding:32px max(24px,calc((100vw - 1180px)/2)) 110px; color:#0f172a; background:#fff; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
  .aci-compare-screen > header { padding:8px 0 24px; border-bottom:1px solid #e4e9f1; }
  .aci-compare-screen > header > button { border:0; padding:0; background:transparent; color:#475569; display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; }
  .aci-compare-screen > header > span { display:block; margin-top:24px; color:#0758f8; font-size:11px; font-weight:800; text-transform:uppercase; }
  .aci-compare-screen h1 { margin:7px 0 6px; font-size:34px; line-height:1.08; letter-spacing:0; }
  .aci-compare-screen header p { margin:0; color:#64748b; font-size:14px; }
  .compare-canvas-content { padding:28px 0; }
  .compare-canvas-content .aci-comparison-inline-card { width:100%; max-width:none; }
  .compare-empty { min-height:280px; display:grid; place-items:center; align-content:center; gap:8px; text-align:center; background:#f7f9fc; border-radius:16px; }
  .compare-empty strong { font-size:20px; }
  .compare-empty p { margin:0; color:#64748b; font-size:13px; }
  .compare-empty button { height:42px; margin-top:12px; padding:0 16px; border:0; border-radius:10px; background:#0758f8; color:#fff; font-weight:750; }
  @media(max-width:1180px){
    .aci-compare-screen { width:min(100%,430px); margin:0 auto; padding:20px 18px 92px; }
    .aci-compare-screen h1 { font-size:28px; }
  }
`;
