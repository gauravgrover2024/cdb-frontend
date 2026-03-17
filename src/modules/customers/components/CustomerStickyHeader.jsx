import React from "react";
import { Tag } from "antd";
import Icon from "../../../components/AppIcon";
import { AutoSaveIndicator } from "../../../utils/formDataProtection";

const CompactInfo = ({ icon, label, value }) => (
  <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/70 bg-white/70 px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900/70">
    <Icon name={icon} size={12} className="text-slate-500 dark:text-slate-400" />
    <span className="text-slate-500 dark:text-slate-400">{label}:</span>
    <span className="font-semibold text-slate-800 dark:text-slate-200">{value || "—"}</span>
  </div>
);

const CustomerStickyHeader = ({
  headerInfo,
  mode = "Add",
  displayId,
  onSave,
  onSaveAndExit,
  activeSection,
  sectionsConfig = [],
  onSectionClick,
  saving = false,
  innerRef,
  autoSaveStatus = null,
}) => {
  return (
    <div
      ref={innerRef}
      className="sticky top-16 z-[100] border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-black/90"
    >
      <div className="px-3 py-3 md:px-5 md:py-4">
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-3 py-3 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
                Customer Form
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {headerInfo.name || (mode === "Add" ? "New Customer" : "Untitled Profile")}
                </h1>
                <Tag className="m-0 rounded-full border-none bg-sky-500/12 px-2 py-0 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:bg-sky-400/12 dark:text-sky-200">
                  {mode}
                </Tag>
                <AutoSaveIndicator status={autoSaveStatus} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CompactInfo icon="Hash" label="ID" value={displayId} />
                <CompactInfo icon="Phone" label="Mobile" value={headerInfo.mobile} />
                <CompactInfo icon="MapPin" label="City" value={headerInfo.city} />
                <CompactInfo icon="CreditCard" label="PAN" value={headerInfo.pan} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saving && (
                <div className="hidden md:flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  Saving...
                </div>
              )}

              <button
                type="button"
                onClick={onSaveAndExit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Icon name="ArrowLeft" size={13} />
                Exit
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex min-w-[126px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Icon name="Save" size={13} />}
                {saving ? "Saving" : mode === "Add" ? "Create Profile" : "Save Changes"}
              </button>
            </div>
          </div>

          {sectionsConfig.length > 0 && (
            <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                {sectionsConfig.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => onSectionClick?.(section.targetId)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      activeSection === section.key
                        ? "border-sky-400 bg-sky-500/15 text-sky-700 dark:border-sky-500 dark:bg-sky-500/20 dark:text-sky-200"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <Icon name={section.icon || "Circle"} size={12} />
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerStickyHeader;
