import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Brain,
  Clock3,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import searchApi from "../api/search";

const MIN_QUERY = 2;
const ROTATE_MS = 5000;
const CHUNK_SIZE = 5;

const PROMPTS = [
  "latest insurance of rahul diwan verna 4577",
  "approx loan closure of verna 4577 of rahul diwan",
  "what cars got discontinued in march 2026",
  "how many insurance renewals are there this month",
  "what is expected payout this month from all sources",
  "how many cases are there where payout has not been entered",
  "does verna sx has sunroof",
  "show similar cars to verna",
  "when was verna price updated last",
  "how many cars are there without registration numbers in loan database",
  "how many cases were disbursed this month",
  "show payment pending rahul 4577",
  "find quotations of verna in delhi",
  "show receivables of tata aig",
  "compare three cars verna city slavia",
];

const useDebouncedValue = (value, delay = 320) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const toneClass = (tone) => {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-800";
};

const AssistAnswerCard = ({ answer, onOpen }) => {
  return (
    <button
      type="button"
      onClick={() => answer?.route && onOpen(answer.route)}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:shadow-sm ${toneClass(answer?.tone)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {answer?.title || "Insight"}
          </p>
          <p className="mt-1 text-xl font-black leading-tight">
            {answer?.value || "—"}
          </p>
          <p className="mt-1 text-xs opacity-80 line-clamp-2">
            {answer?.details || "No additional detail."}
          </p>
        </div>
        {answer?.route ? <ArrowRight size={16} className="mt-1 opacity-70" /> : null}
      </div>
    </button>
  );
};

const ResultRow = ({ item, onOpen }) => {
  const matched =
    Array.isArray(item?.matchedFields) && item.matchedFields.length
      ? `Matched: ${item.matchedFields.join(", ")}`
      : "Matched by relevance";
  return (
    <button
      type="button"
      onClick={() => item?.route && onOpen(item.route)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{item?.title || "Record"}</p>
          <p className="truncate text-xs text-slate-600">{item?.subtitle || item?.recordId}</p>
          <p className="mt-1 truncate text-[11px] text-slate-500">{matched}</p>
        </div>
        <div className="shrink-0 text-right">
          {item?.badge ? (
            <p className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {item.badge}
            </p>
          ) : null}
          {item?.status ? (
            <p className="mt-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {item.status}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
};

export default function ACIAssistPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState({
    total: 0,
    groups: [],
    answers: [],
    capabilities: [],
  });
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  const debouncedQuery = useDebouncedValue(query, 320);

  useEffect(() => {
    const timer = setInterval(() => {
      setSuggestionOffset((prev) => (prev + CHUNK_SIZE) % PROMPTS.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const rotatingSuggestions = useMemo(() => {
    const picked = [];
    for (let i = 0; i < CHUNK_SIZE; i += 1) {
      picked.push(PROMPTS[(suggestionOffset + i) % PROMPTS.length]);
    }
    return picked;
  }, [suggestionOffset]);

  const runSearch = async (raw) => {
    const q = String(raw || "").trim();
    if (q.length < MIN_QUERY) {
      setResult({ total: 0, groups: [], answers: [], capabilities: [] });
      setError("");
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const payload = await searchApi.assist(q, {
        limit: 50,
        perEntityLimit: 10,
        signal: controller.signal,
      });
      const data = payload?.data || {};
      setResult({
        total: Number(data.total || 0),
        groups: Array.isArray(data.groups) ? data.groups : [],
        answers: Array.isArray(data.answers) ? data.answers : [],
        capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err?.message || "Search failed");
      setResult({ total: 0, groups: [], answers: [], capabilities: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const openRoute = (route) => {
    if (!route) return;
    navigate(route);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    runSearch(query);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 py-3">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
              <Sparkles size={13} />
              ACI Assist
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Operations AI Search</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ask across loans, insurance, vehicles, payouts, pricing, quotes, features and more.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Live capabilities</p>
            <p className="mt-1 max-w-[360px] leading-relaxed">
              {(result.capabilities || []).slice(0, 2).join(" • ") ||
                "Intent-aware ranking, deep links, and cross-module retrieval."}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6">
          <div className="relative">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask anything... e.g. latest insurance of rahul diwan verna 4577"
              className="h-16 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-40 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : "Search"}
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {rotatingSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      ) : null}

      {query.trim().length >= MIN_QUERY ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Brain size={16} className="text-indigo-600" />
                AI Insights
              </p>
              <p className="text-xs text-slate-500">
                {loading ? "Analyzing..." : `${result.total || 0} matched records`}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {loading && !result.answers.length ? (
                <div className="col-span-full flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Building insights…
                </div>
              ) : null}
              {!loading && !result.answers.length ? (
                <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No special insight was inferred from this query yet. Results are shown below.
                </div>
              ) : null}
              {result.answers.map((answer) => (
                <AssistAnswerCard key={answer.id} answer={answer} onOpen={openRoute} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Bot size={16} className="text-indigo-600" />
                Search Results
              </p>
              <p className="text-xs text-slate-500">{result.total || 0} total</p>
            </div>

            {!loading && !result.groups.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No matches found. Try a broader query with name + vehicle + last 4 digits.
              </div>
            ) : null}

            <div className="space-y-4">
              {result.groups.map((group) => (
                <div key={group.entity} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {group.label}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">{group.count}</p>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {(group.results || []).map((item) => (
                      <ResultRow key={item.id} item={item} onOpen={openRoute} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600">
            Start typing to search the entire CDrive system with intent-aware ranking.
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Clock3 size={13} />
            Suggestions rotate every 5 seconds.
          </div>
        </section>
      )}
    </div>
  );
}

