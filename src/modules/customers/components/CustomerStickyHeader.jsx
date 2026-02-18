import React from "react";
import { Tag } from "antd";
import Icon from "../../../components/AppIcon";
import { AutoSaveIndicator } from "../../../utils/formDataProtection";

const InfoChip = ({ icon, value, label, colorClass = "bg-muted/20" }) => (
  <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border/50 transition-all ${colorClass}`}>
    <Icon name={icon} size={14} className="text-muted-foreground" />
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold leading-none mb-1">{label}</span>
      <span className="text-xs font-bold text-foreground leading-none">{value || "—"}</span>
    </div>
  </div>
);

const CustomerStickyHeader = ({
  headerInfo,
  mode = "Add",
  displayId,
  customerId,
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
    <div ref={innerRef} className="sticky top-16 z-[100] bg-card/80 backdrop-blur-xl border-b border-border shadow-sm border-t-2 border-t-primary">
      <div className="w-full pt-4 pb-2 px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          
          {/* Left: Customer Info */}
          <div className="flex items-center gap-4 min-w-0">


            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0">
              <Icon name={mode === "Add" ? "UserPlus" : "User"} size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-base font-bold text-foreground leading-none break-words">
                  {headerInfo.name || (mode === "Add" ? "New Customer" : "Untitled Profile")}
                </h1>
                <Tag 
                  className={`rounded-full px-2 py-0.5 border-none text-[9px] font-bold uppercase tracking-wider h-4 flex items-center ${
                    mode === "Add" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                  }`}
                >
                  {mode}
                </Tag>
                <AutoSaveIndicator status={autoSaveStatus} />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground leading-none">
                 <span className="font-medium opacity-70">Customer Master</span>
              </div>
            </div>
          </div>

          {/* Center: Live Data Chips */}
          <div className="hidden lg:flex items-center gap-2">
             <InfoChip icon="Phone" label="Mobile" value={headerInfo.mobile} colorClass="bg-blue-500/5 border-blue-500/10" />
             <InfoChip icon="MapPin" label="City" value={headerInfo.city} colorClass="bg-amber-500/5 border-amber-500/10" />
             <InfoChip icon="CreditCard" label="PAN" value={headerInfo.pan} colorClass="bg-indigo-500/5 border-indigo-500/10" />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
             {/* Saving Status Indicator */}
             {saving && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-pulse">
                 <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-spin" />
                 <span className="text-xs font-semibold text-blue-600">Saving to database...</span>
               </div>
             )}

             <button
                type="button"
                onClick={onSaveAndExit}
                className="px-5 py-2 rounded-xl border border-border bg-background text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex items-center gap-2 active:scale-95"
             >
                <Icon name="ArrowLeft" size={14} />
                <span>Discard & Exit</span>
             </button>
             <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 min-w-[140px] justify-center"
             >
                {saving ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="Save" size={14} />
                )}
                <span>{saving ? 'Processing...' : (mode === 'Add' ? 'Create Profile' : 'Save Changes')}</span>
             </button>
          </div>
        </div>

      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default CustomerStickyHeader;
