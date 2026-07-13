import React, { useEffect, useRef } from "react";
import { MapPin, X } from "lucide-react";

const cityLabel = (city = {}) =>
  String(city.city || city.label || city.name || city.citySlug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

export default function AciV2CityPicker({
  cities = [],
  vehicle,
  loading = false,
  onClose,
  onSelect,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="aci-v2-city-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="aci-v2-city-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aci-city-picker-title"
      >
        <header>
          <div>
            <h2 id="aci-city-picker-title">Choose pricing city</h2>
            <p>{vehicle?.displayName || vehicle?.fullModel || vehicle?.model || "Selected car"}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close city picker">
            <X size={19} />
          </button>
        </header>

        <div className="aci-v2-city-options">
          {loading ? <p className="aci-v2-city-status">Loading available cities...</p> : null}
          {!loading && !cities.length ? (
            <p className="aci-v2-city-status">Pricing cities are unavailable right now.</p>
          ) : null}
          {!loading
            ? cities.map((city) => {
                const label = cityLabel(city);
                if (!label) return null;
                return (
                  <button
                    key={city.citySlug || label}
                    type="button"
                    onClick={() => onSelect?.({ ...city, city: label })}
                  >
                    <MapPin size={18} />
                    <span>{label}</span>
                  </button>
                );
              })
            : null}
        </div>
      </section>

      <style>{`
        .aci-v2-city-overlay {
          position: fixed;
          inset: 0;
          z-index: 520;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15, 23, 42, .34);
          backdrop-filter: blur(5px);
        }

        .aci-v2-city-dialog {
          width: min(420px, calc(100vw - 32px));
          border: 1px solid #dbe3ef;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 30px 80px -42px rgba(15, 23, 42, .72);
          overflow: hidden;
        }

        .aci-v2-city-dialog header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 18px 14px;
          border-bottom: 1px solid #e7edf5;
        }

        .aci-v2-city-dialog h2,
        .aci-v2-city-dialog p { margin: 0; }

        .aci-v2-city-dialog h2 {
          color: #0f172a;
          font-size: 17px;
          line-height: 1.3;
          letter-spacing: 0;
        }

        .aci-v2-city-dialog header p {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
        }

        .aci-v2-city-dialog header button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #475569;
          background: #f1f5f9;
          cursor: pointer;
        }

        .aci-v2-city-options {
          display: grid;
          gap: 4px;
          padding: 8px;
        }

        .aci-v2-city-options > button {
          min-height: 48px;
          display: grid;
          grid-template-columns: 28px 1fr;
          align-items: center;
          gap: 8px;
          border: 0;
          border-radius: 6px;
          padding: 8px 12px;
          color: #0f172a;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }

        .aci-v2-city-options > button:hover,
        .aci-v2-city-options > button:focus-visible {
          background: #eff6ff;
          color: #1d4ed8;
          outline: none;
        }

        .aci-v2-city-status {
          padding: 18px 12px;
          color: #64748b;
          font-size: 13px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
