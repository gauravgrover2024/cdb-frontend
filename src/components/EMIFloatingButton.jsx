import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FeaturesEmiCompareModal from "../modules/loans/components/FeaturesEmiCompareModal";

/**
 * Global floating EMI launcher.
 * Visible across authenticated pages and opens Scenario A+B popup.
 */
const EMIFloatingButton = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleOpenFullCalculator = useCallback(() => {
    setIsOpen(false);
    navigate("/loans/emi-calculator");
  }, [navigate]);

  if (!isVisible) return null;

  return createPortal(
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <div
            role="tooltip"
            className={[
              "absolute bottom-full right-0 mb-2.5",
              "px-3 py-1.5 rounded-lg",
              "bg-slate-900 text-white text-xs font-medium whitespace-nowrap",
              "opacity-0 group-hover:opacity-100",
              "transition-opacity duration-200 pointer-events-none",
              "shadow-lg",
            ].join(" ")}
          >
            EMI Scenarios
            <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-900" />
          </div>

          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping pointer-events-none"
          />

          <button
            type="button"
            onClick={handleOpen}
            aria-label="Open EMI Scenarios"
            aria-haspopup="dialog"
            className={[
              "relative flex items-center justify-center",
              "w-14 h-14 rounded-full",
              "bg-gradient-to-br from-blue-600 to-indigo-700",
              "text-white",
              "shadow-2xl shadow-blue-500/40",
              "hover:shadow-blue-500/60 hover:scale-110",
              "active:scale-95",
              "transition-all duration-200",
              "ring-2 ring-white/20",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400",
            ].join(" ")}
            style={{ animation: "emiFabPulse 3s ease-in-out infinite" }}
          >
            <Calculator size={24} aria-hidden="true" />
          </button>
        </div>
      )}

      <FeaturesEmiCompareModal
        open={isOpen}
        variant={null}
        assumedOnRoadPrice={1200000}
        onClose={handleClose}
        onOpenFullCalculator={handleOpenFullCalculator}
      />

      <style>{`
        @keyframes emiFabPulse {
          0%,  100% { box-shadow: 0 0 0  0px rgba(59, 130, 246, 0.45); }
          50%        { box-shadow: 0 0 0 14px rgba(59, 130, 246, 0);    }
        }
      `}</style>
    </>,
    document.body,
  );
};

export default EMIFloatingButton;
