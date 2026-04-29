import React from "react";
import { DatabaseZap, Lock, RotateCw } from "lucide-react";
import { asArray, formatDate, humanize, pick } from "./utils";

export default function SourceTransparencyBar({ sourceTransparency }) {
  const source = sourceTransparency;
  if (!source) return null;

  const modules = asArray(source.modulesChecked || source.modules || source.sources);
  const filters = asArray(source.filtersApplied || source.filters);
  const restrictions = asArray(source.accessRestrictions || source.restrictions);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
          <DatabaseZap size={14} className="text-indigo-600" />
          {modules.length ? modules.map((item) => humanize(pick(item, ["label", "name", "module"], item))).join(", ") : "Sources checked"}
        </span>
        {source.recordsScanned !== undefined || source.recordsFound !== undefined ? (
          <span>{source.recordsFound ?? "—"} found / {source.recordsScanned ?? "—"} scanned</span>
        ) : null}
        {filters.length ? <span>Filters: {filters.map((item) => pick(item, ["label", "name", "value"], item)).join(", ")}</span> : null}
        {source.lastRefreshed || source.refreshedAt ? (
          <span className="inline-flex items-center gap-1.5">
            <RotateCw size={13} />
            {formatDate(source.lastRefreshed || source.refreshedAt)}
          </span>
        ) : null}
        {source.liveStatus || source.status ? <span>{humanize(source.liveStatus || source.status)}</span> : null}
        {restrictions.length ? (
          <span className="inline-flex items-center gap-1.5 text-amber-700">
            <Lock size={13} />
            {restrictions.join(", ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
