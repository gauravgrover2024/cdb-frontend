import React from "react";
import {
  buildVehicleContextPatch,
  firstValue,
  hasOwn,
} from "../context/aciV2ContextManager";

export default function AciV2ContextPill({
  selectedVehicle,
  sessionContext,
  onAction,
}) {
  const model = firstValue(
    selectedVehicle?.displayName,
    selectedVehicle?.model,
    sessionContext?.anchorModel,
  );

  const variant = hasOwn(sessionContext, "anchorVariant")
    ? String(sessionContext.anchorVariant || "")
    : firstValue(selectedVehicle?.variant, selectedVehicle?.variantName);

  const city = firstValue(selectedVehicle?.city, sessionContext?.anchorCity, "Delhi");
  const workingLabel = model
    ? `Working on ${model}${variant ? ` ${variant}` : ""}`
    : "Looking for a new car";

  return (
    <section className="aci-chat-context-pill">
      <style>{`
        .aci-chat-context-pill {
          min-height: 48px;
          margin: 0 auto 22px;
          padding: 7px 8px 7px 13px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(208, 221, 240, 0.76);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.76);
          box-shadow:
            0 14px 38px -34px rgba(15, 23, 42, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.94);
          flex: 0 0 auto;
        }

        .aci-chat-context-pill > div {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .aci-chat-context-pill > div::before {
          content: "";
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
        }

        .aci-chat-context-pill span {
          min-width: 0;
          color: #111827;
          font-size: 13.5px;
          line-height: 1.15;
          font-weight: 760;
          letter-spacing: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .aci-chat-context-pill em {
          color: #7b8496;
          font-size: 12px;
          line-height: 1;
          font-style: normal;
          font-weight: 680;
        }

        .aci-chat-context-pill button {
          appearance: none;
          min-height: 32px;
          border: 1px solid rgba(190, 211, 244, 0.74);
          border-radius: 999px;
          padding: 0 13px;
          background: #f4f8ff;
          color: var(--aci-blue, #0758f8);
          font-size: 12px;
          font-weight: 820;
        }

        .aci-chat-context-pill button:hover {
          border-color: rgba(7, 88, 248, 0.32);
          background: #edf5ff;
        }

        @media (max-width: 640px) {
          .aci-chat-context-pill {
            margin-bottom: 16px;
          }

          .aci-chat-context-pill span {
            font-size: 12.5px;
          }

          .aci-chat-context-pill em {
            display: none;
          }

          .aci-chat-context-pill button {
            min-height: 30px;
            padding: 0 11px;
          }
        }
      `}</style>

      <div>
        <span>{workingLabel}</span>
        <em>{city}</em>
      </div>

      <button
        type="button"
        onClick={() =>
          onAction?.({
            id: "change-chat-context",
            label: "Change",
            query: "Change my car search context",
            type: "change_context",
            contextPatch: selectedVehicle
              ? buildVehicleContextPatch({
                  vehicle: selectedVehicle,
                  variant,
                })
              : {},
          })
        }
      >
        Change
      </button>
    </section>
  );
}
