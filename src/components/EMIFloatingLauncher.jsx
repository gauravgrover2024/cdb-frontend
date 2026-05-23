import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FeaturesEmiCompareModal from "../modules/loans/components/FeaturesEmiCompareModal";
import { useNavigate } from "react-router-dom";

/**
 * Collapsible EMI launcher with:
 * - Arrow button on middle-right edge
 * - Expands to show EMI floating button
 * - Opens calculator modal when clicked
 */
const EMIFloatingLauncher = () => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setIsExpanded(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleOpenCalculator = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenFullCalculator = () => {
    setIsModalOpen(false);
    setIsExpanded(false);
    navigate("/loans/emi-calculator");
  };

  if (!isVisible) return null;

  return createPortal(
    <>
      <div className="fixed right-0 z-50 bottom-24">
        {/* Expanded menu (EMI button) */}
        {isExpanded && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="relative group">
              <div className="absolute -bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
                EMI Calculator
                <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-900" />
              </div>

              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping pointer-events-none"
              />

              <button
                type="button"
                onClick={handleOpenCalculator}
                aria-label="Open EMI Calculator"
                className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-110 active:scale-95 transition-all duration-200 ring-2 ring-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Toggle arrow button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Collapse menu" : "Expand EMI menu"}
          className="flex items-center justify-center w-10 h-10 rounded-l-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ring-1 ring-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 group"
        >
          {isExpanded ? (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          ) : (
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          )}
        </button>
      </div>

      {/* EMI Calculator Modal */}
      <FeaturesEmiCompareModal
        open={isModalOpen}
        variant={null}
        assumedOnRoadPrice={1200000}
        onClose={handleCloseModal}
        onOpenFullCalculator={handleOpenFullCalculator}
      />
    </>,
    document.body,
  );
};

export default EMIFloatingLauncher;
