import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Filter,
  Layers3,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";

const STATUS_META = {
  ready: { label: "Ready / Working", shortLabel: "Ready", score: 100, icon: CheckCircle2 },
  mostly_ready: { label: "Mostly Ready", shortLabel: "Mostly Ready", score: 80, icon: ShieldCheck },
  partial: { label: "Partial", shortLabel: "Partial", score: 50, icon: Clock3 },
  planned: { label: "Planned / Locked", shortLabel: "Planned", score: 25, icon: CircleDot },
  pending: { label: "Pending", shortLabel: "Pending", score: 0, icon: XCircle },
  deferred: { label: "Deferred", shortLabel: "Deferred", score: 10, icon: AlertTriangle },
};

const PRIORITY_META = {
  P0: "Launch Critical",
  P1: "Next Business Layer",
  P2: "Expansion",
  P3: "Future / Optional",
};

const FALLBACK_MODULES = [
  {
    id: "local-fallback",
    title: "ACI Progress API Fallback",
    group: "System",
    priority: "P0",
    owner: "Frontend",
    status: "partial",
    summary: "Backend progress API is not available yet, so the tracker is showing fallback data.",
    whatWillWork: "Once GET /api/aci-assist/progress works, this page will show live backend-owned progress data.",
    currentState: "Waiting for backend API response.",
    pending: "Start backend server and confirm /api/aci-assist/progress returns JSON.",
    items: [
      { name: "Frontend tracker page", status: "ready" },
      { name: "Backend API connection", status: "partial" },
    ],
  },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getModuleProgress(module) {
  if (!module.items?.length) return STATUS_META[module.status]?.score || 0;
  const total = module.items.reduce((sum, item) => sum + (STATUS_META[item.status]?.score || 0), 0);
  return Math.round(total / module.items.length);
}

function getOverallProgress(modules) {
  if (!modules.length) return 0;
  const weighted = modules.reduce((sum, module) => {
    const weight = module.priority === "P0" ? 1.4 : module.priority === "P1" ? 1 : 0.65;
    return sum + getModuleProgress(module) * weight;
  }, 0);
  const weights = modules.reduce((sum, module) => {
    const weight = module.priority === "P0" ? 1.4 : module.priority === "P1" ? 1 : 0.65;
    return sum + weight;
  }, 0);
  return Math.round(weighted / weights);
}

function getStatusCounts(modules) {
  const counts = Object.keys(STATUS_META).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  modules.forEach((module) => {
    counts[module.status] = (counts[module.status] || 0) + 1;
  });
  return counts;
}

function StatusPill({ status, compact = false }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;

  return (
    <span className={cx("aci-status-pill", `aci-status-pill--${status}`, compact && "is-compact")}>
      <Icon size={compact ? 13 : 15} />
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}

function ProgressRing({ value }) {
  return (
    <div className="aci-ring">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" className="aci-ring-track" />
        <circle
          cx="60"
          cy="60"
          r="52"
          className="aci-ring-value"
          strokeDasharray={326.73}
          strokeDashoffset={326.73 - (value / 100) * 326.73}
        />
      </svg>
      <div>
        <strong>{value}%</strong>
        <span>overall</span>
      </div>
    </div>
  );
}

function ModuleCard({ module, isOpen, onToggle }) {
  const progress = getModuleProgress(module);

  return (
    <article className="aci-module-card">
      <button type="button" className="aci-module-top" onClick={onToggle}>
        <div className="aci-module-title">
          <div className="aci-module-icon">
            <Layers3 size={18} />
          </div>
          <div>
            <div className="aci-eyebrow">
              {module.group} · {module.owner} · {module.priority} {PRIORITY_META[module.priority]}
            </div>
            <h3>{module.title}</h3>
          </div>
        </div>

        <div className="aci-module-side">
          <StatusPill status={module.status} compact />
          <div className="aci-mini-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <strong>{progress}%</strong>
          <ChevronDown className={cx(isOpen && "is-open")} size={18} />
        </div>
      </button>

      <p className="aci-module-summary">{module.summary}</p>

      {isOpen && (
        <div className="aci-module-details">
          <div className="aci-detail-grid">
            <div>
              <span>When completely ready</span>
              <p>{module.whatWillWork}</p>
            </div>
            <div>
              <span>Current status</span>
              <p>{module.currentState}</p>
            </div>
            <div>
              <span>Pending work</span>
              <p>{module.pending}</p>
            </div>
          </div>

          <div className="aci-subfeatures">
            {(module.items || []).map((item) => (
              <div className="aci-subfeature" key={`${module.id}-${item.name}`}>
                <span>{item.name}</span>
                <StatusPill status={item.status} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function AciAssistProgressTracker({
  apiUrl = "/api/aci-assist/progress",
  refreshMs = 60000,
}) {
  const [modules, setModules] = useState(FALLBACK_MODULES);
  const [lastUpdated, setLastUpdated] = useState("Local fallback");
  const [meta, setMeta] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [openModuleId, setOpenModuleId] = useState("intelligence-core");

  useEffect(() => {
    let cancelled = false;
    let timerId;

    const loadProgress = async () => {
      try {
        setLoadState((current) => (current === "ready" ? "refreshing" : "loading"));
        const response = await fetch(apiUrl, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = await response.json();
        const nextModules = Array.isArray(payload) ? payload : payload.modules;

        if (!Array.isArray(nextModules)) throw new Error("Progress API did not return modules array");

        if (!cancelled) {
          setModules(nextModules);
          setLastUpdated(payload.lastUpdated || payload.updatedAt || "Live");
          setMeta(payload.meta || null);
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[ACI Progress Tracker] API unavailable; using fallback.", error);
          setMeta({ error: error.message });
          setLoadState("error");
        }
      }
    };

    loadProgress();
    if (refreshMs > 0) timerId = window.setInterval(loadProgress, refreshMs);

    return () => {
      cancelled = true;
      if (timerId) window.clearInterval(timerId);
    };
  }, [apiUrl, refreshMs]);

  const groups = useMemo(() => Array.from(new Set(modules.map((module) => module.group))).sort(), [modules]);

  const filteredModules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return modules.filter((module) => {
      const haystack = [
        module.title,
        module.group,
        module.owner,
        module.summary,
        module.whatWillWork,
        module.currentState,
        module.pending,
        ...(module.items || []).map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (statusFilter === "all" || module.status === statusFilter) &&
        (priorityFilter === "all" || module.priority === priorityFilter) &&
        (groupFilter === "all" || module.group === groupFilter)
      );
    });
  }, [modules, query, statusFilter, priorityFilter, groupFilter]);

  const overallProgress = useMemo(() => getOverallProgress(modules), [modules]);
  const filteredProgress = useMemo(() => getOverallProgress(filteredModules), [filteredModules]);
  const statusCounts = useMemo(() => getStatusCounts(modules), [modules]);
  const launchCriticalModules = modules.filter((module) => module.priority === "P0");
  const launchCriticalProgress = getOverallProgress(launchCriticalModules);
  const readyModules = modules.filter((module) => ["ready", "mostly_ready"].includes(module.status)).length;
  const blockedModules = modules.filter((module) => ["pending", "planned", "deferred"].includes(module.status)).length;

  return (
    <section className="aci-progress-page">
      <style>{styles}</style>

      <div className="aci-progress-shell">
        <header className="aci-hero">
          <div>
            <div className="aci-badge">
              <Sparkles size={15} />
              ACI Assist Product Readiness Tracker
            </div>
            <h1>Live progress view for the complete ACI Assist roadmap.</h1>
            <p>
              Track what is ready, mostly ready, partial, planned and pending. Backend owns the truth; this page auto-refreshes from the progress API.
            </p>
            <div className="aci-meta-row">
              <span>Last updated: {lastUpdated}</span>
              <span>•</span>
              <span>{loadState === "ready" ? "Live API" : loadState === "refreshing" ? "Refreshing" : loadState === "error" ? "API fallback" : "Loading API"}</span>
              <span>•</span>
              <span>{modules.length} modules tracked</span>
              <span>•</span>
              <span>{launchCriticalModules.length} launch-critical modules</span>
            </div>
          </div>

          <div className="aci-score-card">
            <ProgressRing value={overallProgress} />
            <div>
              <span>Current product state</span>
              <strong>{overallProgress < 45 ? "Foundation Stage" : overallProgress < 70 ? "Build & Hardening Stage" : "Launch Preparation Stage"}</strong>
              <p>
                Launch-critical core is at <b>{launchCriticalProgress}%</b>. Keep public launch blocked until the P0 core is genuinely green.
              </p>
            </div>
          </div>
        </header>

        <div className="aci-kpi-grid">
          <div className="aci-kpi-card">
            <span><Rocket size={16} /> Launch Core</span>
            <strong>{launchCriticalProgress}%</strong>
            <p>P0 modules only</p>
          </div>
          <div className="aci-kpi-card">
            <span><CheckCircle2 size={16} /> Ready / Mostly Ready</span>
            <strong>{readyModules}</strong>
            <p>Modules that can be built on</p>
          </div>
          <div className="aci-kpi-card">
            <span><AlertTriangle size={16} /> Planned / Pending</span>
            <strong>{blockedModules}</strong>
            <p>Needs focused execution</p>
          </div>
          <div className="aci-kpi-card">
            <span><BarChart3 size={16} /> Filtered View</span>
            <strong>{filteredProgress || 0}%</strong>
            <p>{filteredModules.length} modules visible</p>
          </div>
        </div>

        <div className="aci-status-strip">
          {Object.entries(STATUS_META).map(([key, status]) => {
            const Icon = status.icon;
            return (
              <button
                key={key}
                type="button"
                className={cx("aci-status-stat", statusFilter === key && "is-active")}
                onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              >
                <Icon size={15} />
                <span>{status.shortLabel}</span>
                <strong>{statusCounts[key] || 0}</strong>
              </button>
            );
          })}
        </div>

        <div className="aci-tracker-layout">
          <aside className="aci-control-panel">
            <div className="aci-control-title">
              <Filter size={16} />
              Tracker controls
            </div>

            <label className="aci-search-box">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search feature, module, owner..." />
            </label>

            <div className="aci-filter-field">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {Object.entries(STATUS_META).map(([key, status]) => (
                  <option key={key} value={key}>{status.label}</option>
                ))}
              </select>
            </div>

            <div className="aci-filter-field">
              <span>Priority</span>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="all">All priorities</option>
                {Object.entries(PRIORITY_META).map(([key, label]) => (
                  <option key={key} value={key}>{key} · {label}</option>
                ))}
              </select>
            </div>

            <div className="aci-filter-field">
              <span>Group</span>
              <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
                <option value="all">All groups</option>
                {groups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            <div className="aci-warning">
              <AlertTriangle size={17} />
              <div>
                <strong>Blunt launch note</strong>
                <p>
                  Do not treat this as launch-ready until ACI Core, lead capture, security/legal, canvas consistency and stress evals are green.
                  {meta?.source ? ` Source: ${meta.source}.` : ""}
                </p>
              </div>
            </div>
          </aside>

          <main className="aci-module-list">
            <div className="aci-module-head">
              <div>
                <span><Layers3 size={16} /> Product modules</span>
                <h2>{filteredModules.length} visible modules</h2>
              </div>
              <div className="aci-legend">
                <span><Activity size={14} /> Weighted progress</span>
                <span><Target size={14} /> P0 has higher weight</span>
                <span><TrendingUp size={14} /> Auto-refreshing</span>
              </div>
            </div>

            {filteredModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                isOpen={openModuleId === module.id}
                onToggle={() => setOpenModuleId(openModuleId === module.id ? null : module.id)}
              />
            ))}

            {!filteredModules.length && (
              <div className="aci-empty">
                <Search size={24} />
                <strong>No modules found</strong>
                <p>Try clearing filters or searching a broader feature name.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}

const styles = `
  .aci-progress-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 14% 8%, rgba(0, 91, 255, 0.10), transparent 34%),
      radial-gradient(circle at 90% 2%, rgba(199, 153, 74, 0.12), transparent 28%),
      linear-gradient(180deg, #ffffff 0%, #f7f9fc 52%, #ffffff 100%);
    color: #111827;
    padding: 28px;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .aci-progress-shell {
    width: min(1440px, 100%);
    margin: 0 auto;
  }

  .aci-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: stretch;
    padding: 26px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 34px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 26px 80px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(20px);
  }

  .aci-badge {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #0f3d91;
    background: rgba(0, 91, 255, 0.08);
    border: 1px solid rgba(0, 91, 255, 0.10);
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .aci-hero h1 {
    max-width: 900px;
    margin: 18px 0 10px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(34px, 5vw, 66px);
    line-height: 0.96;
    letter-spacing: -0.055em;
    color: #07111f;
  }

  .aci-hero p {
    max-width: 780px;
    margin: 0;
    color: #5d6677;
    font-size: 16px;
    line-height: 1.65;
  }

  .aci-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 22px;
    color: #7b8495;
    font-size: 12px;
    font-weight: 700;
  }

  .aci-score-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 18px;
    padding: 22px;
    border-radius: 28px;
    background: linear-gradient(145deg, rgba(8, 20, 38, 0.96), rgba(16, 41, 82, 0.94));
    color: #ffffff;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
  }

  .aci-score-card span {
    color: rgba(255,255,255,0.62);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .aci-score-card strong {
    display: block;
    margin-top: 6px;
    font-size: 23px;
    letter-spacing: -0.03em;
  }

  .aci-score-card p {
    margin-top: 8px;
    color: rgba(255,255,255,0.72);
    font-size: 13px;
    line-height: 1.55;
  }

  .aci-ring {
    position: relative;
    width: 116px;
    height: 116px;
    display: grid;
    place-items: center;
  }

  .aci-ring svg {
    width: 116px;
    height: 116px;
    transform: rotate(-90deg);
  }

  .aci-ring-track,
  .aci-ring-value {
    fill: none;
    stroke-width: 10;
  }

  .aci-ring-track {
    stroke: rgba(255,255,255,0.14);
  }

  .aci-ring-value {
    stroke: #ffffff;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.35s ease;
  }

  .aci-ring > div {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    text-align: center;
  }

  .aci-ring strong {
    display: block;
    font-size: 28px;
    letter-spacing: -0.05em;
  }

  .aci-ring span {
    display: block;
    margin-top: -20px;
    color: rgba(255,255,255,0.64);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .aci-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin: 18px 0;
  }

  .aci-kpi-card {
    border: 1px solid rgba(15, 23, 42, 0.07);
    border-radius: 24px;
    background: rgba(255,255,255,0.82);
    padding: 18px;
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05);
  }

  .aci-kpi-card span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #657084;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .aci-kpi-card strong {
    display: block;
    margin-top: 10px;
    font-size: 34px;
    letter-spacing: -0.06em;
    color: #0b1320;
  }

  .aci-kpi-card p {
    margin: 2px 0 0;
    color: #7c8494;
    font-size: 13px;
  }

  .aci-status-strip {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }

  .aci-status-stat {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1px solid rgba(15, 23, 42, 0.07);
    border-radius: 18px;
    background: rgba(255,255,255,0.76);
    color: #344054;
    padding: 12px 13px;
    cursor: pointer;
  }

  .aci-status-stat.is-active {
    border-color: rgba(0, 91, 255, 0.22);
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
  }

  .aci-status-stat span {
    flex: 1;
    text-align: left;
    font-size: 12px;
    font-weight: 750;
  }

  .aci-status-stat strong {
    font-size: 18px;
    letter-spacing: -0.04em;
  }

  .aci-tracker-layout {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .aci-control-panel {
    position: sticky;
    top: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 28px;
    background: rgba(255,255,255,0.84);
    padding: 18px;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06);
  }

  .aci-control-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #111827;
    font-size: 14px;
    font-weight: 850;
  }

  .aci-search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 16px;
    background: #ffffff;
    padding: 0 12px;
    height: 44px;
  }

  .aci-search-box input {
    width: 100%;
    border: 0;
    outline: none;
    font: inherit;
    color: #101828;
    background: transparent;
  }

  .aci-filter-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .aci-filter-field span {
    color: #667085;
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .aci-filter-field select {
    width: 100%;
    height: 42px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 15px;
    background: #ffffff;
    color: #111827;
    padding: 0 10px;
    font: inherit;
    outline: none;
  }

  .aci-warning {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    border-radius: 20px;
    background: linear-gradient(145deg, rgba(255, 248, 235, 0.96), rgba(255, 255, 255, 0.92));
    border: 1px solid rgba(184, 115, 31, 0.15);
    padding: 14px;
    color: #7a4b16;
  }

  .aci-warning strong {
    display: block;
    color: #5c360a;
    font-size: 13px;
  }

  .aci-warning p {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.45;
  }

  .aci-module-list {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .aci-module-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 18px;
    padding: 4px 4px 8px;
  }

  .aci-module-head span,
  .aci-legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #667085;
    font-size: 12px;
    font-weight: 800;
  }

  .aci-module-head h2 {
    margin: 4px 0 0;
    font-size: 26px;
    letter-spacing: -0.05em;
  }

  .aci-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px 14px;
  }

  .aci-module-card {
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 26px;
    background: rgba(255,255,255,0.88);
    box-shadow: 0 20px 55px rgba(15, 23, 42, 0.055);
  }

  .aci-module-top {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center;
    border: 0;
    background: transparent;
    padding: 18px 18px 8px;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .aci-module-title {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 13px;
  }

  .aci-module-icon {
    flex: 0 0 auto;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: rgba(0, 91, 255, 0.10);
    color: #0f55c7;
  }

  .aci-eyebrow {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    color: #7b8495;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .aci-module-card h3 {
    margin: 4px 0 0;
    color: #101828;
    font-size: 20px;
    letter-spacing: -0.045em;
  }

  .aci-module-side {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: auto 100px 42px 20px;
    gap: 10px;
    align-items: center;
  }

  .aci-module-side strong {
    color: #101828;
    font-size: 15px;
    text-align: right;
  }

  .aci-module-side svg.is-open {
    transform: rotate(180deg);
  }

  .aci-module-summary {
    margin: 0;
    padding: 0 18px 16px 73px;
    color: #667085;
    font-size: 14px;
    line-height: 1.55;
  }

  .aci-module-details {
    overflow: hidden;
    border-top: 1px solid rgba(15, 23, 42, 0.06);
  }

  .aci-detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding: 16px 18px 14px;
  }

  .aci-detail-grid div {
    border-radius: 18px;
    background: #f8fafc;
    padding: 14px;
  }

  .aci-detail-grid span {
    display: block;
    color: #344054;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .aci-detail-grid p {
    margin: 7px 0 0;
    color: #667085;
    font-size: 13px;
    line-height: 1.55;
  }

  .aci-subfeatures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 0 18px 18px;
  }

  .aci-subfeature {
    min-width: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 16px;
    background: #ffffff;
    padding: 10px 11px;
  }

  .aci-subfeature > span {
    min-width: 0;
    color: #344054;
    font-size: 13px;
    font-weight: 700;
  }

  .aci-mini-bar {
    height: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #edf1f7;
  }

  .aci-mini-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #0b5cff, #10b981);
  }

  .aci-status-pill {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 12px;
    font-weight: 850;
    white-space: nowrap;
  }

  .aci-status-pill.is-compact {
    padding: 5px 8px;
    font-size: 11px;
  }

  .aci-status-pill--ready,
  .aci-status-pill--mostly_ready {
    color: #047857;
    background: rgba(16, 185, 129, 0.10);
  }

  .aci-status-pill--partial {
    color: #0f55c7;
    background: rgba(0, 91, 255, 0.10);
  }

  .aci-status-pill--planned {
    color: #a15c03;
    background: rgba(245, 158, 11, 0.13);
  }

  .aci-status-pill--pending {
    color: #b42318;
    background: rgba(239, 68, 68, 0.10);
  }

  .aci-status-pill--deferred {
    color: #4b5563;
    background: rgba(107, 114, 128, 0.10);
  }

  .aci-empty {
    display: grid;
    place-items: center;
    gap: 8px;
    min-height: 260px;
    border: 1px dashed rgba(15, 23, 42, 0.16);
    border-radius: 28px;
    background: rgba(255,255,255,0.62);
    color: #667085;
    text-align: center;
  }

  @media (max-width: 1100px) {
    .aci-hero {
      grid-template-columns: 1fr;
    }

    .aci-score-card {
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
    }

    .aci-kpi-grid,
    .aci-status-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .aci-tracker-layout {
      grid-template-columns: 1fr;
    }

    .aci-control-panel {
      position: relative;
      top: auto;
    }
  }

  @media (max-width: 720px) {
    .aci-progress-page {
      padding: 14px;
    }

    .aci-hero {
      padding: 18px;
      border-radius: 26px;
    }

    .aci-hero h1 {
      font-size: 36px;
    }

    .aci-score-card {
      align-items: flex-start;
      flex-direction: column;
    }

    .aci-kpi-grid,
    .aci-status-strip {
      grid-template-columns: 1fr;
    }

    .aci-module-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .aci-legend {
      justify-content: flex-start;
    }

    .aci-module-top {
      align-items: flex-start;
      flex-direction: column;
    }

    .aci-module-side {
      width: 100%;
      grid-template-columns: auto 1fr 42px 20px;
    }

    .aci-module-summary {
      padding-left: 18px;
    }

    .aci-detail-grid,
    .aci-subfeatures {
      grid-template-columns: 1fr;
    }
  }
`;
