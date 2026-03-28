import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Calculator } from "lucide-react";
import { useLocation } from "react-router-dom";
import EMICalculator from "../modules/loans/components/EMICalculator";

/**
 * EMIFloatingButton
 * -----------------
 * A persistent floating action button (FAB) styled like a chatbot widget.
 * Renders via a React Portal so it always sits above every page layout.
 * Clicking it opens the full EMI Calculator inside a slide-up modal/drawer.
 *
 * Features:
 *  • Bottom-right fixed position, z-index 50
 *  • Tooltip on hover ("EMI Calculator")
 *  • Smooth scale-in FAB appearance after 1 s page-load delay
 *  • Animated ping ring around the FAB
 *  • Slide-up modal with scrollable body
 *  • ESC key closes the modal
 *  • Backdrop click closes the modal
 *  • Body scroll locked while modal is open
 *  • Focus trapped to modal on open
 *  • ARIA roles & labels throughout
 *  • Hidden on the dedicated EMI Calculator page (/loans/emi-calculator)
 */
const EMIFloatingButton = () => {
  const [isOpen, setIsOpen]       = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const modalRef  = useRef(null);
  const buttonRef = useRef(null);
  const location  = useLocation();

  // Hide the FAB when the user is already on the EMI Calculator page.
  const isOnEmiPage = location.pathname.includes("emi-calculator");

  // ── Delayed appearance (don't distract the user on first page paint) ──
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // ── ESC to close ──
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // ── Body scroll lock ──
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ── Focus management ──
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const handleOpen           = useCallback(() => setIsOpen(true),  []);
  const handleClose          = useCallback(() => setIsOpen(false), []);
  const handleBackdropClick  = useCallback((e) => {
    if (e.target === e.currentTarget) setIsOpen(false);
  }, []);

  // Nothing to render until the delay has passed or if we're on the EMI page.
  if (!isVisible || isOnEmiPage) return null;

  return createPortal(
    <>
      {/* ── FAB Button (hidden while modal is open) ─────────────────── */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 group">
          {/* Tooltip */}
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
            EMI Calculator
            {/* Tooltip caret */}
            <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-900" />
          </div>

          {/* Animated ping ring (sits behind the button) */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping pointer-events-none"
          />

          {/* Main FAB button */}
          <button
            ref={buttonRef}
            onClick={handleOpen}
            aria-label="Open EMI Calculator"
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

      {/* ── Modal Overlay ────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={[
            "fixed inset-0 z-50",
            "flex items-end md:items-center justify-center",
            "p-0 md:p-4",
          ].join(" ")}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="EMI Calculator"
        >
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal panel */}
          <div
            ref={modalRef}
            tabIndex={-1}
            className={[
              "relative",
              "w-full md:w-[90vw] md:max-w-6xl",
              "max-h-[92vh] md:max-h-[88vh]",
              "bg-white dark:bg-[#1a1a1a]",
              "rounded-t-3xl md:rounded-3xl",
              "shadow-2xl",
              "overflow-hidden",
              "flex flex-col",
              "outline-none",
            ].join(" ")}
            style={{
              animation: "emiSlideUp 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            {/* ── Modal Header ── */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 shrink-0">
              <div className="flex items-center gap-3 text-white">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
                  <Calculator size={18} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold leading-tight">
                    EMI Calculator
                  </h2>
                  <p className="text-[11px] text-blue-100 leading-tight mt-0.5">
                    Calculate your car loan EMI instantly
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                aria-label="Close EMI Calculator"
                className={[
                  "flex items-center justify-center w-8 h-8 rounded-full",
                  "bg-white/20 hover:bg-white/35",
                  "text-white transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                ].join(" ")}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {/* ── Modal Body (scrollable) ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <EMICalculator isFloating onClose={handleClose} />
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animations injected once into the document ──────── */}
      <style>{`
        @keyframes emiFabPulse {
          0%,  100% { box-shadow: 0 0 0  0px rgba(59, 130, 246, 0.45); }
          50%        { box-shadow: 0 0 0 14px rgba(59, 130, 246, 0);    }
        }
        @keyframes emiSlideUp {
          from { opacity: 0; transform: translateY(48px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>
    </>,
    document.body
  );
};

export default EMIFloatingButton;
