import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ModuleFrame from '../../../components/ui/ModuleFrame';
import Icon from '../../../components/AppIcon';
import {
  TONE_CLASS,
  USED_CAR_JOURNEY_CASES,
  USED_CAR_JOURNEY_PHASES,
  USED_CAR_MODULE_BLUEPRINT,
  USED_CARS_CONTENT,
  USED_CARS_NAV,
} from './usedCarsConfig';
import UsedCarProcurementStudio from './UsedCarProcurementStudio';
import UsedCarLeadIntakeDesk from './UsedCarLeadIntakeDesk';
import UsedCarInspectionDesk from './UsedCarInspectionDesk';

const severityClass = {
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900',
};

function StageTab({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-[150px] flex-col gap-1 rounded-2xl border px-3 py-3 text-left transition-all duration-200 ${
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-white/15 dark:bg-slate-200/70' : 'bg-slate-100 dark:bg-white/10'}`}>
          <Icon name={item.icon} size={16} />
        </span>
        <span className="text-sm font-bold tracking-tight">{item.label}</span>
      </div>
      <p className={`line-clamp-2 text-[11px] font-medium ${active ? 'text-white/75 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
        {item.description}
      </p>
    </button>
  );
}

function MetricStrip({ metric }) {
  const theme = TONE_CLASS[metric.tone] || TONE_CLASS.slate;
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${theme.glow}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{metric.label}</p>
          <p className={`mt-1 text-2xl font-black leading-none md:text-[30px] ${theme.value}`}>{metric.value}</p>
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{metric.delta}</p>
        </div>
      </div>
    </div>
  );
}

function FlowStage({ stage }) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">{stage.name}</p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{stage.subtext}</p>
        </div>
        <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{stage.count}</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${stage.accent}`} style={{ width: `${stage.progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        <span>Progress</span>
        <span>{stage.progress}%</span>
      </div>
    </div>
  );
}

function SignalRow({ item }) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">{item.title}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.detail}</p>
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${severityClass[item.severity] || severityClass.info}`}>
          {item.severity}
        </span>
      </div>
    </div>
  );
}

function BoardLane({ lane }) {
  return (
    <div className="min-w-[230px] flex-1 rounded-[24px] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700 dark:text-slate-200">{lane.lane}</h3>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{lane.items.length} items</span>
      </div>
      <div className="space-y-2.5">
        {lane.items.map((item) => (
          <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-200">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function LedgerRow({ row }) {
  return (
    <div className="grid gap-3 border-b border-slate-100 py-4 last:border-b-0 md:grid-cols-[1.5fr_1fr_1fr_1fr] dark:border-white/10">
      <div>
        <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">{row.unit}</p>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{row.note}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Stage</p>
        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{row.stage}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Owner</p>
        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{row.owner}</p>
      </div>
      <div className="text-left md:text-right">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Age / value</p>
        <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{row.age}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{row.value}</p>
      </div>
    </div>
  );
}

function JourneyStageCard({ stage, accent, active }) {
  const tone = TONE_CLASS[accent] || TONE_CLASS.sky;
  return (
    <div
      className={`rounded-[22px] border px-4 py-4 transition-all ${
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950'
          : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${active ? 'text-white/65 dark:text-slate-700' : 'text-slate-400 dark:text-slate-500'}`}>
            Step {stage.step}
          </p>
          <h4 className="mt-1 text-sm font-black tracking-tight">{stage.title}</h4>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
            active ? 'bg-white/12 text-white dark:bg-slate-100 dark:text-slate-900' : `bg-slate-100 dark:bg-white/10 ${tone.value}`
          }`}
        >
          {stage.owner}
        </span>
      </div>
      <p className={`mt-3 text-xs font-medium leading-5 ${active ? 'text-white/72 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
        {stage.gate}
      </p>
    </div>
  );
}

function JourneyPhase({ phase, moduleKey }) {
  const tone = TONE_CLASS[phase.accent] || TONE_CLASS.sky;
  const active = moduleKey === 'overview' || phase.modules.includes(moduleKey);

  return (
    <div className={`rounded-[28px] border p-4 md:p-5 ${
      active
        ? 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'
        : 'border-slate-200/70 bg-slate-50/60 dark:border-white/5 dark:bg-white/[0.02]'
    }`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            <span className={`inline-flex h-2 w-2 rounded-full ${tone.chip}`} />
            {phase.title}
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
            {phase.description}
          </p>
        </div>
        <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
          {phase.stages.length} stages
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {phase.stages.map((stage) => (
          <JourneyStageCard
            key={stage.id}
            stage={stage}
            accent={phase.accent}
            active={active}
          />
        ))}
      </div>

      {phase.overlay ? (
        <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50/80 px-4 py-4 dark:border-amber-400/20 dark:bg-amber-400/10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
            {phase.overlay.title}
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
            {phase.overlay.detail}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function BlueprintRow({ item, active }) {
  return (
    <div className={`rounded-[22px] border px-4 py-4 ${
      active
        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
        : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-black tracking-tight">{item.label}</h4>
        <div className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
          active ? 'bg-white/12 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
        }`}>
          {item.stages.join(' • ')}
        </div>
      </div>
      <p className={`mt-2 text-xs font-medium leading-5 ${active ? 'text-white/75 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
        {item.summary}
      </p>
    </div>
  );
}

function CaseTrackRow({ item, active }) {
  return (
    <div className={`rounded-[24px] border px-4 py-4 ${
      active
        ? 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'
        : 'border-slate-200/70 bg-slate-50/70 dark:border-white/5 dark:bg-white/[0.02]'
    }`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            {item.unit}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {item.source}
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          {item.activeStage}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="rounded-[18px] bg-slate-50 px-3 py-3 dark:bg-white/[0.04]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Next action
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {item.nextAction}
          </p>
        </div>
        <div className="rounded-[18px] bg-slate-50 px-3 py-3 dark:bg-white/[0.04]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Desk owner
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {item.owner}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UsedCarsWorkspace({ moduleKey = 'overview' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const content = USED_CARS_CONTENT[moduleKey] || USED_CARS_CONTENT.overview;
  const accentTone = TONE_CLASS[content.accent] || TONE_CLASS.sky;
  const [procurementView, setProcurementView] = useState('lead-intake');
  const filteredJourneyCases = USED_CAR_JOURNEY_CASES.filter(
    (item) => moduleKey === 'overview' || item.module === moduleKey,
  );
  const showProcurementOverview =
    moduleKey !== 'procurement' || procurementView === 'journey-studio';

  return (
    <ModuleFrame>
      <div className="space-y-4 md:space-y-5 xl:space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0e1014]">
          <div className={`relative overflow-hidden border-b border-slate-200 px-4 py-5 dark:border-white/10 md:px-5 md:py-6 xl:px-6 ${moduleKey === 'overview' ? 'bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.08),_transparent_34%)]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.10),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(30,41,59,0.06),_transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.05),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_28%)]'}`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <span className={`inline-flex h-2 w-2 rounded-full ${accentTone.chip}`} />
                  {content.kicker}
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-[32px] xl:text-[38px]">
                  {content.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300 md:text-[15px]">
                  {content.subtitle}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px] xl:max-w-[400px] xl:flex-none">
                <div className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Focus today</p>
                  <p className="mt-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">Clear workshop blockers and protect buy-side margin.</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Operating cadence</p>
                  <p className="mt-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">Daily sourcing, same-day approvals, twice-daily retail review.</p>
                </div>
                {moduleKey === "procurement" ? (
                  <button
                    type="button"
                    onClick={() => navigate("/used-cars/procurement/agreement")}
                    className="sm:col-span-2 rounded-[22px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                          Agreement workflow
                        </p>
                        <p className="mt-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                          Open Agreement Studio
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          Capture the legal form, upload supporting documents, and collect signatures online.
                        </p>
                      </div>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-300">
                        <Icon name="FileSignature" size={18} />
                      </span>
                    </div>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-4 py-4 md:px-5 xl:px-6">
            <div className="flex min-w-max gap-3">
              {USED_CARS_NAV.map((item) => (
                <StageTab
                  key={item.key}
                  item={item}
                  active={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {content.metrics.map((metric) => (
            <MetricStrip key={metric.label} metric={metric} />
          ))}
        </section>

        {moduleKey === 'procurement' ? (
          <section className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0e1014]">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'lead-intake', label: 'Lead Intake' },
                  { key: 'inspection-desk', label: 'Inspection' },
                  { key: 'journey-studio', label: 'Journey Studio' },
                ].map((item) => {
                  const active = procurementView === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setProcurementView(item.key)}
                      className={`rounded-full px-4 py-2 text-sm font-bold tracking-tight transition-all ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {procurementView === 'lead-intake' ? (
              <UsedCarLeadIntakeDesk />
            ) : procurementView === 'inspection-desk' ? (
              <UsedCarInspectionDesk />
            ) : (
              <UsedCarProcurementStudio />
            )}
          </section>
        ) : null}

        {showProcurementOverview ? (
          <>
        <section className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Journey architecture</p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">The full used-car journey from lead to closure</h3>
              </div>
              <p className="max-w-xl text-sm font-medium text-slate-500 dark:text-slate-400">
                This module is now framed around the actual lifecycle you outlined: lead capture, inspection, negotiation, agreement, payment, stock movement, RC transfer, and closure.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {USED_CAR_JOURNEY_PHASES.map((phase) => (
                <JourneyPhase key={phase.key} phase={phase} moduleKey={moduleKey} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Module ownership</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">Who owns which part of the journey</h3>
              <div className="mt-4 space-y-3">
                {USED_CAR_MODULE_BLUEPRINT.map((item) => (
                  <BlueprintRow
                    key={item.key}
                    item={item}
                    active={moduleKey === 'overview' ? false : item.key === moduleKey}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Stage movement</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">How live cases are moving</h3>
              <div className="mt-4 space-y-3">
                {filteredJourneyCases.map((item) => (
                  <CaseTrackRow
                    key={`${item.unit}-${item.activeStage}`}
                    item={item}
                    active={moduleKey === 'overview' || item.module === moduleKey}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Operational flow</p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">Where work is moving now</h3>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-300">Continuous dashboard</div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {content.flow.map((stage) => (
                <FlowStage key={stage.name} stage={stage} />
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Signals</p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">What needs attention</h3>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
              {content.attention.map((item) => (
                <SignalRow key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Desk alignment</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">Shared operating board</h3>
            </div>
            <p className="max-w-xl text-sm font-medium text-slate-500 dark:text-slate-400">The module is structured to let sourcing, workshop, stock, and sales work from one system instead of separate sheets and follow-ups.</p>
          </div>
          <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
            {content.board.map((lane) => (
              <BoardLane key={lane.lane} lane={lane} />
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Live inventory ledger</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">Cars that are shaping the desk right now</h3>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">This is ready for API wiring later, but the structure already reflects the unified used-car workflow.</p>
          </div>
          <div className="mt-5 divide-y divide-slate-100 dark:divide-white/10">
            {content.ledger.map((row) => (
              <LedgerRow key={`${row.unit}-${row.stage}`} row={row} />
            ))}
          </div>
        </section>
          </>
        ) : null}
      </div>
    </ModuleFrame>
  );
}
