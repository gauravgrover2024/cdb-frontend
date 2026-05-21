import React from "react";
import {
  buildVehicleContextPatch,
  firstValue,
  getDisplayVehicleFromContext,
  hasOwn,
} from "../context/aciV2ContextManager";

export default function AciV2ContextPill({
  selectedVehicle,
  sessionContext,
  onAction,
}) {
  const displayVehicle =
    getDisplayVehicleFromContext(sessionContext) || selectedVehicle;

  const model = firstValue(
    sessionContext?.anchorModel,
    displayVehicle?.displayName,
    displayVehicle?.model,
  );

  const variant = hasOwn(sessionContext, "anchorVariant")
    ? String(sessionContext.anchorVariant || "")
    : firstValue(displayVehicle?.variant, displayVehicle?.variantName);

  const city = firstValue(
    displayVehicle?.city,
    sessionContext?.anchorCity,
    "Delhi",
  );

  const workingLabel = model
    ? `${model}${variant ? ` ${variant}` : ""}`
    : "Finding your next car";

  return (
    <section className="aci-premium-context-shell">
      <style>{`

/*
|--------------------------------------------------------------------------
| PREMIUM CONTEXT SYSTEM
|--------------------------------------------------------------------------
| GOAL:
| - feels like Apple / Arc / Rivian
| - NOT a random floating pill
| - integrated intelligence rail
|--------------------------------------------------------------------------
*/

.aci-premium-context-shell {
  position: relative;

  width: fit-content;

  max-width: min(100%, 920px);

  margin: 0 auto 26px;

  display: flex;

  align-items: center;

  justify-content: center;
}

/*
|--------------------------------------------------------------------------
| MAIN CONTEXT BAR
|--------------------------------------------------------------------------
*/

.aci-premium-context-bar {
  position: relative;

  display: inline-flex;

  align-items: center;

  gap: 14px;

  min-height: 58px;

  padding:
    10px
    12px
    10px
    14px;

  border-radius: 999px;

  backdrop-filter: blur(24px);

  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,.88),
      rgba(255,255,255,.72)
    );

  border:
    1px solid
    rgba(255,255,255,.92);

  box-shadow:
    0 14px 40px rgba(20,40,90,.08),
    inset 0 1px 0 rgba(255,255,255,.92);
}

/*
|--------------------------------------------------------------------------
| ACTIVE INDICATOR
|--------------------------------------------------------------------------
*/

.aci-premium-context-status {
  position: relative;

  width: 11px;

  height: 11px;

  border-radius: 999px;

  flex: 0 0 auto;

  background:
    radial-gradient(
      circle,
      #6aff8d 0%,
      #1ed760 100%
    );

  box-shadow:
    0 0 0 6px rgba(46, 255, 113, .08),
    0 0 22px rgba(46, 255, 113, .42);
}

.aci-premium-context-status::after {
  content: "";

  position: absolute;

  inset: -9px;

  border-radius: inherit;

  border:
    1px solid
    rgba(70,255,120,.12);
}

/*
|--------------------------------------------------------------------------
| TEXT STACK
|--------------------------------------------------------------------------
*/

.aci-premium-context-copy {
  min-width: 0;

  display: flex;

  align-items: baseline;

  gap: 10px;
}

.aci-premium-context-copy h3 {
  margin: 0;

  color: #07142f;

  font-size: 15px;

  line-height: 1;

  font-weight: 760;

  letter-spacing: -.02em;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.aci-premium-context-copy p {
  margin: 0;

  color: #8b96ab;

  font-size: 12.5px;

  line-height: 1;

  font-weight: 650;

  white-space: nowrap;
}

/*
|--------------------------------------------------------------------------
| CHANGE BUTTON
|--------------------------------------------------------------------------
*/

.aci-premium-context-action {
  appearance: none;

  border: none;

  min-height: 38px;

  padding:
    0
    16px;

  border-radius: 999px;

  background:
    linear-gradient(
      180deg,
      #1b66ff,
      #004cff
    );

  color: white;

  font-size: 12.5px;

  font-weight: 760;

  letter-spacing: -.01em;

  cursor: pointer;

  box-shadow:
    0 10px 20px rgba(0,76,255,.22);

  transition:
    transform .18s ease,
    box-shadow .18s ease,
    opacity .18s ease;
}

.aci-premium-context-action:hover {
  transform: translateY(-1px);

  box-shadow:
    0 14px 26px rgba(0,76,255,.28);
}

/*
|--------------------------------------------------------------------------
| DESKTOP SPACING
|--------------------------------------------------------------------------
*/

@media (min-width: 1024px) {

  .aci-premium-context-bar {
    min-height: 62px;

    padding:
      12px
      14px
      12px
      16px;
  }

  .aci-premium-context-copy h3 {
    font-size: 15.5px;
  }

  .aci-premium-context-copy p {
    font-size: 13px;
  }
}

/*
|--------------------------------------------------------------------------
| MOBILE
|--------------------------------------------------------------------------
*/

@media (max-width: 768px) {

  .aci-premium-context-shell {
    width: 100%;

    justify-content: center;

    margin-bottom: 18px;
  }

  .aci-premium-context-bar {
    width: 100%;

    justify-content: space-between;

    min-height: 52px;

    padding:
      10px
      10px
      10px
      12px;
  }

  .aci-premium-context-copy {
    gap: 8px;
  }

  .aci-premium-context-copy h3 {
    font-size: 13px;

    max-width: 150px;
  }

  .aci-premium-context-copy p {
    font-size: 11.5px;
  }

  .aci-premium-context-action {
    min-height: 34px;

    padding:
      0
      14px;

    font-size: 11.5px;
  }
}

      `}</style>

      <div className="aci-premium-context-bar">
        {/* STATUS */}
        <div className="aci-premium-context-status" />

        {/* TEXT */}
        <div className="aci-premium-context-copy">
          <h3>{workingLabel}</h3>
          <p>{city}</p>
        </div>

        {/* ACTION */}
        <button
          type="button"
          className="aci-premium-context-action"
          onClick={() =>
            onAction?.({
              id: "change-chat-context",
              label: "Change",
              query: "Change my car search context",
              type: "change_context",
              contextPatch: displayVehicle
                ? buildVehicleContextPatch({
                    vehicle: displayVehicle,
                    variant,
                  })
                : {},
            })
          }
        >
          Change
        </button>
      </div>
    </section>
  );
}
