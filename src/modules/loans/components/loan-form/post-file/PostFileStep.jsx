import React from "react";
import Icon from "../../../../../components/AppIcon";
import PostFileApprovalDetails from "./PostFileApprovalDetails";
import PostFileVehicleVerification from "./PostFileVehicleVerification";
import PostFileInstrumentDetails from "./PostFileInstrumentDetails";
import PostFileDocumentManagement from "./PostFileDocumentManagement";
import PostFileDispatchAndRecords from "./PostFileDispatchAndRecords";
import RepaymentIntelligencePanel from "./RepaymentIntelligencePanel";
import DocumentsList from "./DocumentsList";

const withFallback = (Comp, name) => {
  if (Comp) return Comp;
  return () => (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      {name} failed to load
    </div>
  );
};

const SafePostFileApprovalDetails = withFallback(PostFileApprovalDetails, "PostFileApprovalDetails");
const SafePostFileVehicleVerification = withFallback(PostFileVehicleVerification, "PostFileVehicleVerification");
const SafePostFileInstrumentDetails = withFallback(PostFileInstrumentDetails, "PostFileInstrumentDetails");
const SafePostFileDocumentManagement = withFallback(PostFileDocumentManagement, "PostFileDocumentManagement");
const SafePostFileDispatchAndRecords = withFallback(PostFileDispatchAndRecords, "PostFileDispatchAndRecords");
const SafeRepaymentIntelligencePanel = withFallback(RepaymentIntelligencePanel, "RepaymentIntelligencePanel");
const SafeDocumentsList = withFallback(DocumentsList, "DocumentsList");

const POSTFILE_SECTIONS = [
  {
    id: "postfile_approval",
    title: "Approval Reconciliation",
    description:
      "Approved vs disbursed structure, rate, tenure and core approval controls.",
    icon: "BadgeCheck",
    accent:
      "from-emerald-500/16 via-teal-500/8 to-transparent dark:from-emerald-400/16 dark:via-teal-400/8 dark:to-transparent",
    chip:
      "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/12 dark:text-emerald-200 dark:ring-emerald-400/20",
    panel: "border-emerald-200/70 dark:border-emerald-900/70",
    iconWrap: "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950",
    glow:
      "shadow-[0_16px_40px_-24px_rgba(16,185,129,0.36)] dark:shadow-[0_20px_48px_-26px_rgba(52,211,153,0.3)]",
  },
  {
    id: "postfile_vehicle",
    title: "Vehicle Verification",
    description: "Validate delivered vehicle details against approved structure.",
    icon: "CarFront",
    accent:
      "from-sky-500/16 via-cyan-500/8 to-transparent dark:from-sky-400/16 dark:via-cyan-400/8 dark:to-transparent",
    chip:
      "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:bg-sky-400/12 dark:text-sky-200 dark:ring-sky-400/20",
    panel: "border-sky-200/70 dark:border-sky-900/70",
    iconWrap: "bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950",
    glow:
      "shadow-[0_16px_40px_-24px_rgba(14,165,233,0.34)] dark:shadow-[0_20px_48px_-26px_rgba(56,189,248,0.28)]",
  },
  {
    id: "postfile_instruments",
    title: "Instrument Controls",
    description: "Track PDC/NACH/SI instruments and compliance readiness.",
    icon: "ReceiptText",
    accent:
      "from-violet-500/16 via-fuchsia-500/8 to-transparent dark:from-violet-400/16 dark:via-fuchsia-400/8 dark:to-transparent",
    chip:
      "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:bg-violet-400/12 dark:text-violet-200 dark:ring-violet-400/20",
    panel: "border-violet-200/70 dark:border-violet-900/70",
    iconWrap:
      "bg-violet-500 text-white dark:bg-violet-400 dark:text-slate-950",
    glow:
      "shadow-[0_16px_40px_-24px_rgba(139,92,246,0.34)] dark:shadow-[0_20px_48px_-26px_rgba(167,139,250,0.28)]",
  },
  {
    id: "postfile_repayment",
    title: "Repayment Intelligence",
    description:
      "Live principal outstanding, interest payable and full repayment schedule.",
    icon: "Calculator",
    accent:
      "from-amber-500/18 via-orange-500/8 to-transparent dark:from-amber-400/18 dark:via-orange-400/8 dark:to-transparent",
    chip:
      "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:bg-amber-400/12 dark:text-amber-200 dark:ring-amber-400/20",
    panel: "border-amber-200/70 dark:border-amber-900/70",
    iconWrap: "bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950",
    glow:
      "shadow-[0_16px_40px_-24px_rgba(245,158,11,0.34)] dark:shadow-[0_20px_48px_-26px_rgba(251,191,36,0.28)]",
  },
  {
    id: "postfile_docs",
    title: "Document Management",
    description: "Post-file document upload, verification and records check.",
    icon: "FolderOpen",
    accent:
      "from-rose-500/16 via-pink-500/8 to-transparent dark:from-rose-400/16 dark:via-pink-400/8 dark:to-transparent",
    chip:
      "bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:bg-rose-400/12 dark:text-rose-200 dark:ring-rose-400/20",
    panel: "border-rose-200/70 dark:border-rose-900/70",
    iconWrap: "bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950",
    glow:
      "shadow-[0_16px_40px_-24px_rgba(244,63,94,0.34)] dark:shadow-[0_20px_48px_-26px_rgba(251,113,133,0.28)]",
  },
  {
    id: "postfile_dispatch",
    title: "Dispatch & Records",
    description: "Dispatch movement, disbursal records and handoff details.",
    icon: "Send",
    accent:
      "from-cyan-500/16 via-sky-500/8 to-transparent dark:from-cyan-400/16 dark:via-sky-400/8 dark:to-transparent",
    chip:
      "bg-cyan-500/12 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-400/12 dark:text-cyan-200 dark:ring-cyan-400/20",
    panel: "border-cyan-200/70 dark:border-cyan-900/70",
    iconWrap: "bg-cyan-500 text-white dark:bg-cyan-400 dark:text-slate-950",
    glow:
      "shadow-[0_16px_40px_-24px_rgba(6,182,212,0.32)] dark:shadow-[0_20px_48px_-26px_rgba(34,211,238,0.28)]",
  },
  {
    id: "postfile_docs_list",
    title: "Documents Ledger",
    description: "Consolidated post-file document list and verification status.",
    icon: "Files",
    accent:
      "from-slate-500/14 via-zinc-500/8 to-transparent dark:from-slate-400/14 dark:via-zinc-400/8 dark:to-transparent",
    chip:
      "bg-slate-500/12 text-slate-700 ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-200 dark:ring-slate-400/20",
    panel: "border-slate-200/70 dark:border-slate-800/70",
    iconWrap: "bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-950",
    glow:
      "shadow-[0_16px_40px_-24px_rgba(71,85,105,0.28)] dark:shadow-[0_20px_48px_-26px_rgba(148,163,184,0.22)]",
  },
];

const PostFileSectionShell = ({
  id,
  title,
  description,
  icon,
  index,
  accent,
  chip,
  panel,
  iconWrap,
  glow,
  children,
}) => (
  <section
    id={id}
    className={`group relative overflow-hidden rounded-2xl border bg-card/95 dark:bg-black/90 backdrop-blur-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-36px_rgba(15,23,42,0.35)] ${panel} ${glow}`}
  >
    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
    <div className="relative border-b border-border/50 px-4 py-3 md:px-5 md:py-3.5">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ${iconWrap}`}>
          <Icon name={icon} size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground md:text-base">{title}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${chip}`}>
              S{String(index || 0).padStart(2, "0")}
            </span>
          </div>
          <p className="mt-0.5 max-w-3xl text-[11px] leading-5 text-muted-foreground md:text-xs">{description}</p>
        </div>
      </div>
    </div>
    <div className="relative p-2 md:p-2.5">{children}</div>
  </section>
);

const PostFileStep = ({ form, loanId, isEditMode }) => {
  const contentConsistencyClass =
    "[&_.section-header]:hidden [&_.section-header]:mb-0 [&_input:not([type='hidden'])]:h-10 [&_input:not([type='hidden'])]:rounded-xl [&_input:not([type='hidden'])]:border-border/90 [&_input:not([type='hidden'])]:text-sm [&_textarea]:rounded-xl [&_textarea]:border-border/90 [&_.ant-picker]:!h-10 [&_.ant-picker]:!rounded-xl [&_.ant-picker]:!border-border/90 [&_.ant-picker-input>input]:!text-sm [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-border/90 [&_.ant-select-selection-item]:!leading-9 [&_.ant-select-selection-placeholder]:!leading-9 [&_.bg-card]:border-border/70 [&_.bg-card]:rounded-xl";

  return (
    <div className="postfile-workbench relative space-y-3 md:space-y-4">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-24 bg-gradient-to-b from-amber-500/6 via-orange-500/4 to-transparent dark:from-zinc-900 dark:via-amber-900/18 dark:to-transparent" />

      <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-2">
        <PostFileSectionShell {...POSTFILE_SECTIONS[0]} index={1}>
          <div className={contentConsistencyClass}><SafePostFileApprovalDetails form={form} /></div>
        </PostFileSectionShell>

        <PostFileSectionShell {...POSTFILE_SECTIONS[1]} index={2}>
          <div className={contentConsistencyClass}><SafePostFileVehicleVerification form={form} /></div>
        </PostFileSectionShell>
      </div>

      <PostFileSectionShell {...POSTFILE_SECTIONS[2]} index={3}>
        <div className={contentConsistencyClass}><SafePostFileInstrumentDetails form={form} /></div>
      </PostFileSectionShell>

      <PostFileSectionShell {...POSTFILE_SECTIONS[3]} index={4}>
        <div className={contentConsistencyClass}><SafeRepaymentIntelligencePanel form={form} /></div>
      </PostFileSectionShell>

      <PostFileSectionShell {...POSTFILE_SECTIONS[4]} index={5}>
        <div className={contentConsistencyClass}>
          <SafePostFileDocumentManagement form={form} loanId={loanId} isEditMode={isEditMode} />
        </div>
      </PostFileSectionShell>

      <PostFileSectionShell {...POSTFILE_SECTIONS[5]} index={6}>
        <div className={contentConsistencyClass}><SafePostFileDispatchAndRecords form={form} /></div>
      </PostFileSectionShell>

      <PostFileSectionShell {...POSTFILE_SECTIONS[6]} index={7}>
        <div className={contentConsistencyClass}><SafeDocumentsList form={form} /></div>
      </PostFileSectionShell>
    </div>
  );
};

export default PostFileStep;
