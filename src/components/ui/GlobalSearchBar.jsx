import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Loader2, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import searchApi from "../../api/search";

const MIN_QUERY = 2;

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const flattenResults = (groups = []) =>
  groups.flatMap((group) =>
    (group.results || []).map((item) => ({
      ...item,
      entityLabel: group.label || item.entityLabel,
    })),
  );

const GlobalSearchBar = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState({
    total: 0,
    groups: [],
    results: [],
  });
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebouncedValue(query, 280);
  const flatResults = useMemo(() => flattenResults(response.groups), [response.groups]);

  useEffect(() => {
    const onOutsideClick = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const runSearch = async (raw) => {
    const q = String(raw || "").trim();
    if (q.length < MIN_QUERY) {
      setResponse({ total: 0, groups: [], results: [] });
      setLoading(false);
      setError("");
      setActiveIndex(-1);
      return;
    }

    if (requestRef.current) requestRef.current.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const payload = await searchApi.global(q, {
        limit: 40,
        perEntityLimit: 8,
        signal: controller.signal,
      });
      const data = payload?.data || {};
      setResponse({
        total: Number(data.total || 0),
        groups: Array.isArray(data.groups) ? data.groups : [],
        results: Array.isArray(data.results) ? data.results : [],
      });
      setActiveIndex(-1);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err?.message || "Search failed");
      setResponse({ total: 0, groups: [], results: [] });
      setActiveIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch(debouncedQuery);
    if (debouncedQuery.trim().length >= MIN_QUERY) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const openResult = (item) => {
    if (!item) return;
    if (!item.route) return;
    navigate(item.route);
    setOpen(false);
    setQuery("");
    setResponse({ total: 0, groups: [], results: [] });
    setActiveIndex(-1);
  };

  const onInputKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= flatResults.length ? 0 : next;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? flatResults.length - 1 : next;
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        runSearch(query);
        return;
      }
      if (flatResults.length && activeIndex >= 0) {
        openResult(flatResults[activeIndex]);
        return;
      }
      if (flatResults.length) {
        openResult(flatResults[0]);
        return;
      }
      runSearch(query);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const highlightMatch = (item) => {
    const fields = Array.isArray(item?.matchedFields) ? item.matchedFields : [];
    if (!fields.length) return "Matched by text relevance";
    return `Matched: ${fields.join(", ")}`;
  };

  return (
    <div ref={wrapperRef} className="relative group/nav">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="AI Search"
          aria-label="Global Search"
          className="h-9 w-[220px] rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[12px] font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-black/70 dark:text-slate-200 dark:focus:border-sky-500/50 dark:focus:ring-sky-500/20 xl:h-10 xl:w-[260px] xl:text-[13px]"
        />
        {loading ? (
          <Loader2
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        ) : (
          <Sparkles
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-hover/nav:text-slate-400"
          />
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-[1200] mt-2 w-[min(88vw,760px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_45px_-24px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-black">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Global Search
            </p>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {response.total} results
            </p>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-2 py-2">
            {!query.trim() || query.trim().length < MIN_QUERY ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Type at least {MIN_QUERY} characters to search customers, vehicles,
                policies, loans, payments, challans and more.
              </div>
            ) : null}

            {error ? (
              <div className="mx-1 my-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            ) : null}

            {!loading && !error && query.trim().length >= MIN_QUERY && !response.total ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No matching records found.
              </div>
            ) : null}

            {response.groups.map((group) => (
              <div key={group.entity} className="mb-2">
                <div className="sticky top-0 z-[1] bg-white/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:bg-black/90 dark:text-slate-400">
                  {group.label} • {group.count}
                </div>
                <div className="space-y-1">
                  {(group.results || []).map((item) => {
                    const index = flatResults.findIndex((i) => i.id === item.id);
                    const selected = index === activeIndex;
                    const hasRoute = Boolean(item.route);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => hasRoute && openResult(item)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                          selected
                            ? "border-sky-200 bg-sky-50/80 dark:border-sky-500/40 dark:bg-sky-500/15"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 dark:border-slate-900 dark:bg-black dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </p>
                            <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                              {item.subtitle || item.recordId}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500">
                              {highlightMatch(item)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.badge ? (
                              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                {item.badge}
                              </span>
                            ) : null}
                            {item.status ? (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {item.status}
                              </span>
                            ) : null}
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                hasRoute
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              <Link2 size={10} />
                              {hasRoute ? "Open" : "No route"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearchBar;
