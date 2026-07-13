import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CarFront,
  ListFilter,
  Mic,
  Search,
  SendHorizontal,
  Sparkles,
  Tag,
} from "lucide-react";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";
import { fetchAciAutocomplete } from "../services/aciAssistV2Api";

const buildDefaultPlaceholder = (mobile, selectedVehicle) => {
  if (mobile) {
    return `Ask ACI Assist ${selectedVehicle?.model ? `about ${selectedVehicle.model}` : "anything"}...`;
  }
  return "Ask ACI Assist anything about new cars...";
};

const suggestionText = (suggestion = {}) =>
  String(
    suggestion.autotypeText ||
      suggestion.label ||
      suggestion.title ||
      suggestion.query ||
      "",
  ).trim();

const normalizeToken = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const TYPEAHEAD_OPERATORS = new Set(["vs", "v", "versus"]);

const getActiveTokenRange = (value = "", cursor = null) => {
  const text = String(value || "");
  const safeCursor = Math.max(
    0,
    Math.min(Number.isFinite(cursor) ? cursor : text.length, text.length),
  );
  const beforeCursor = text.slice(0, safeCursor);
  const match = beforeCursor.match(/([^\s,;:/]+)$/);
  if (!match) return { query: "", start: safeCursor, end: safeCursor };

  const raw = match[1];
  const start = safeCursor - raw.length;
  let end = safeCursor;
  while (end < text.length && !/[\s,;:/]/.test(text[end])) end += 1;
  const query = raw.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");

  return {
    query: TYPEAHEAD_OPERATORS.has(normalizeToken(query)) ? "" : query,
    start,
    end,
  };
};

const getReplacementStart = ({ text = "", range = {}, suggestion = {} }) => {
  const labelTokens = suggestionText(suggestion)
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
  const activeKey = normalizeToken(range.query);
  if (!labelTokens.length || !activeKey) return range.start;

  const activeLabelIndex = labelTokens.findIndex((token) =>
    token.startsWith(activeKey),
  );
  if (activeLabelIndex <= 0) return range.start;

  const prefixTokens = labelTokens.slice(0, activeLabelIndex);
  const before = text.slice(0, range.start);
  const beforeMatches = [...before.matchAll(/[^\s,;:/]+/g)];
  const beforeTokens = beforeMatches.map((match) => normalizeToken(match[0]));

  const maxOverlap = Math.min(prefixTokens.length, beforeTokens.length);
  for (let size = maxOverlap; size >= 1; size -= 1) {
    const beforeSlice = beforeTokens.slice(-size);
    const prefixSlice = prefixTokens.slice(-size);
    if (beforeSlice.every((token, index) => token === prefixSlice[index])) {
      return beforeMatches[beforeMatches.length - size]?.index ?? range.start;
    }
  }

  return range.start;
};

const SuggestionIcon = ({ type = "" }) => {
  if (type === "brand") return <Building2 size={17} />;
  if (type === "model") return <CarFront size={17} />;
  if (type === "variant") return <ListFilter size={17} />;
  if (type === "feature") return <Sparkles size={17} />;
  if (type === "context_action" || type === "action") return <Tag size={17} />;
  return <Search size={17} />;
};

const HighlightedLabel = ({ label = "", query = "" }) => {
  const text = String(label || "");
  const needle = String(query || "").trim();
  if (!needle) return text;

  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
};

export default function AciV2StickyChatBar({
  mobile = false,
  onAction,
  placeholder,
  selectedVehicle,
  className = "",
  showDisclaimer = false,
  disabled = false,
}) {
  const finalPlaceholder =
    placeholder || buildDefaultPlaceholder(mobile, selectedVehicle);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const submitLockRef = useRef(0);
  const composingRef = useRef(false);
  const inputRef = useRef(null);
  const suppressAutocompleteRef = useRef(false);

  const activeToken = useMemo(
    () => getActiveTokenRange(text, cursorPosition),
    [cursorPosition, text],
  );

  const autocompleteContext = useMemo(
    () =>
      selectedVehicle
        ? {
            selectedVehicle: {
              make: selectedVehicle.make || selectedVehicle.brand || "",
              brand: selectedVehicle.brand || selectedVehicle.make || "",
              model: selectedVehicle.model || "",
              fullModel:
                selectedVehicle.fullModel || selectedVehicle.displayName || "",
              variant:
                selectedVehicle.variant || selectedVehicle.variantName || "",
            },
          }
        : {},
    [selectedVehicle],
  );

  const fire = (detail) => {
    if (typeof onAction === "function") onAction(detail);
  };

  const selectedVehicleContextPatch = () =>
    buildVehicleContextPatch({ vehicle: selectedVehicle });

  useEffect(() => {
    const query = String(activeToken.query || "").trim();
    if (
      disabled ||
      query.length < 2 ||
      composingRef.current ||
      suppressAutocompleteRef.current
    ) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setActiveSuggestion(-1);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await fetchAciAutocomplete({
          query,
          context: autocompleteContext,
          limit: 8,
          signal: controller.signal,
        });
        setSuggestions(response.suggestions || []);
        setActiveSuggestion(-1);
      } catch (error) {
        if (error?.name !== "AbortError") setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeToken.query, autocompleteContext, disabled]);

  const submit = () => {
    const query = String(text || "").trim();
    if (!query || disabled) return;

    const now = Date.now();
    if (now - submitLockRef.current < 280) return;
    submitLockRef.current = now;

    fire({
      id: `sticky-chat-${now}`,
      label: query,
      query,
      type: "ask",
      vehicle: selectedVehicle || null,
      contextPatch: selectedVehicle ? selectedVehicleContextPatch() : {},
      source: "aci_v2_sticky_chatbar",
    });

    setText("");
    setCursorPosition(0);
    suppressAutocompleteRef.current = false;
    setSuggestions([]);
    setActiveSuggestion(-1);
  };

  const acceptSuggestion = (suggestion) => {
    const nextText = suggestionText(suggestion);
    if (!nextText) return;
    const replacementStart = getReplacementStart({
      text,
      range: activeToken,
      suggestion,
    });
    const prefix = text.slice(0, replacementStart);
    const suffix = text.slice(activeToken.end);
    const needsSpaceBefore = prefix && !/\s$/.test(prefix);
    const needsSpaceAfter = suffix && !/^\s/.test(suffix);
    const nextValue = `${prefix}${needsSpaceBefore ? " " : ""}${nextText}${needsSpaceAfter ? " " : ""}${suffix}`;
    const nextCursor =
      prefix.length + (needsSpaceBefore ? 1 : 0) + nextText.length;
    suppressAutocompleteRef.current = true;
    setText(nextValue);
    setCursorPosition(nextCursor);
    setSuggestions([]);
    setActiveSuggestion(-1);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Escape") {
      setSuggestions([]);
      setActiveSuggestion(-1);
      return;
    }

    if (
      (event.key === "Tab" || event.key === "Enter") &&
      activeSuggestion >= 0 &&
      suggestions[activeSuggestion]
    ) {
      event.preventDefault();
      acceptSuggestion(suggestions[activeSuggestion]);
      return;
    }

    if (event.key !== "Enter" || event.shiftKey || composingRef.current) return;
    event.preventDefault();
    submit();
  };

  const showSuggestions =
    focused &&
    String(activeToken.query || "").trim().length >= 2 &&
    (suggestionsLoading || suggestions.length > 0);

  return (
    <section
      className={`aci-v2-chatdock ${mobile ? "is-mobile" : "is-desktop"} ${className}`.trim()}
    >
      <style>{`
        .aci-v2-chatdock {
          position: fixed;
          left: 50%;
          right: auto;
          width: min(430px, calc(100vw - 32px));
          transform: translateX(-50%);
          bottom: calc(10px + env(safe-area-inset-bottom));
          z-index: 220;
          pointer-events: none;
          animation: aciV2ChatFadeIn .32s ease;
        }

        @keyframes aciV2ChatFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .aci-v2-chatdock > * { pointer-events: auto; }

        .aci-v2-chatdock .aci-v2-typeahead {
          position: absolute;
          left: 0;
          right: 0;
          bottom: calc(100% + 9px);
          max-height: min(330px, 45vh);
          overflow-y: auto;
          border: 1px solid #dbe3ef;
          border-radius: 8px;
          background: rgba(255,255,255,.98);
          box-shadow: 0 24px 55px -30px rgba(15,23,42,.55);
          backdrop-filter: blur(16px);
          padding: 6px;
        }

        .aci-v2-chatdock .aci-v2-typeahead-status {
          min-height: 48px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          color: #64748b;
          font-size: 12px;
        }

        .aci-v2-chatdock .aci-v2-typeahead-option {
          width: 100%;
          min-height: 48px;
          display: grid;
          grid-template-columns: 32px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border: 0;
          border-radius: 6px;
          padding: 6px 10px;
          background: transparent;
          color: #0f172a;
          text-align: left;
          cursor: pointer;
        }

        .aci-v2-chatdock .aci-v2-typeahead-option:hover,
        .aci-v2-chatdock .aci-v2-typeahead-option.is-active {
          background: #f1f5f9;
        }

        .aci-v2-chatdock .aci-v2-typeahead-icon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          color: #2563eb;
        }

        .aci-v2-chatdock .aci-v2-typeahead-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .aci-v2-chatdock .aci-v2-typeahead-copy strong,
        .aci-v2-chatdock .aci-v2-typeahead-copy small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .aci-v2-chatdock .aci-v2-typeahead-copy strong {
          font-size: 13px;
          font-weight: 650;
        }

        .aci-v2-chatdock .aci-v2-typeahead-copy small {
          color: #64748b;
          font-size: 11px;
        }

        .aci-v2-chatdock .aci-v2-typeahead-copy mark {
          color: #1455ef;
          background: transparent;
          font-weight: 750;
        }

        .aci-v2-chatdock .aci-v2-typeahead-kind {
          color: #94a3b8;
          font-size: 10px;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .aci-v2-chatdock .aci-v2-chatbar {
          height: 58px;
          border-radius: 999px;
          border: 1px solid #dbe3ef;
          background: rgba(255,255,255,.96);
          box-shadow: 0 26px 60px -44px rgba(15,23,42,.5), inset 0 1px 0 #fff;
          backdrop-filter: blur(16px);
          display: grid;
          grid-template-columns: 40px 1fr 36px 44px;
          align-items: center;
          gap: 4px;
          padding: 5px;
        }

        .aci-v2-chatdock .chat-btn {
          border: 0;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #2563eb;
          background: transparent;
        }

        .aci-v2-chatdock .chat-btn.spark {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #eef4ff, #f7fbff);
          border: 1px solid #d5e1f5;
          color: #2257df;
        }

        .aci-v2-chatdock .chat-btn.mic {
          width: 32px;
          height: 32px;
          color: #51607a;
        }

        .aci-v2-chatdock .chat-btn.send {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #2563eb, #1455ef);
          color: white;
          box-shadow: 0 14px 34px -20px rgba(37,99,235,.75);
        }

        .aci-v2-chatdock textarea {
          width: 100%;
          height: 36px;
          min-height: 36px;
          max-height: 36px;
          border: 0;
          padding: 9px 0 7px;
          resize: none;
          overflow: hidden;
          background: transparent;
          outline: none;
          color: #0f172a;
          font: inherit;
          font-size: 13px;
          font-weight: 530;
          line-height: 20px;
          letter-spacing: 0;
          min-width: 0;
        }

        .aci-v2-chatdock textarea::placeholder { color: #90a1bc; }

        .aci-v2-chatdock .aci-v2-disclaimer {
          margin: 8px 0 0;
          text-align: center;
          font-size: 11px;
          color: #8a99af;
          font-weight: 540;
        }

        .aci-v2-chatdock.is-desktop {
          width: min(640px, calc(100vw - 56px));
          bottom: calc(2px + env(safe-area-inset-bottom));
        }

        .aci-v2-chatdock.is-desktop .aci-v2-chatbar {
          height: 56px;
          grid-template-columns: 38px 1fr 36px 42px;
        }

        .aci-v2-chatdock.is-desktop .chat-btn.send {
          width: 42px;
          height: 42px;
        }

        @media (max-width: 520px) {
          .aci-v2-chatdock .aci-v2-typeahead-kind { display: none; }
          .aci-v2-chatdock .aci-v2-typeahead { max-height: min(286px, 42vh); }
        }
      `}</style>

      {showSuggestions ? (
        <div
          className="aci-v2-typeahead"
          role="listbox"
          id="aci-v2-chat-suggestions"
          aria-label="Search suggestions"
        >
          {suggestionsLoading && !suggestions.length ? (
            <div className="aci-v2-typeahead-status">Finding matches...</div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id || `${suggestion.type}-${suggestion.label}`}
                id={`aci-v2-suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeSuggestion}
                className={`aci-v2-typeahead-option ${index === activeSuggestion ? "is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveSuggestion(index)}
                onClick={() => acceptSuggestion(suggestion)}
              >
                <span className="aci-v2-typeahead-icon">
                  <SuggestionIcon type={suggestion.type} />
                </span>
                <span className="aci-v2-typeahead-copy">
                  <strong>
                    <HighlightedLabel
                      label={suggestion.label || suggestionText(suggestion)}
                      query={activeToken.query}
                    />
                  </strong>
                  {suggestion.subLabel ? <small>{suggestion.subLabel}</small> : null}
                </span>
                <span className="aci-v2-typeahead-kind">
                  {String(suggestion.type || "suggestion").replace(/_/g, " ")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      <form className="aci-v2-chatbar" onSubmit={handleSubmit}>
        <button
          type="button"
          className="chat-btn spark"
          disabled={disabled}
          onClick={() =>
            fire({
              label: "Open assistant",
              query: "",
              type: "open_assistant",
              vehicle: selectedVehicle || null,
              contextPatch: selectedVehicle ? selectedVehicleContextPatch() : {},
              source: "aci_v2_sticky_chatbar",
            })
          }
          aria-label="Open assistant"
        >
          <Sparkles size={21} />
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[\r\n]+/g, " ");
            suppressAutocompleteRef.current = false;
            setText(nextValue);
            setCursorPosition(event.target.selectionStart ?? nextValue.length);
          }}
          onSelect={(event) =>
            setCursorPosition(event.currentTarget.selectionStart ?? text.length)
          }
          onClick={(event) =>
            setCursorPosition(event.currentTarget.selectionStart ?? text.length)
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          onKeyDown={handleKeyDown}
          placeholder={finalPlaceholder}
          disabled={disabled}
          aria-label="Ask ACI Assist"
          aria-autocomplete="list"
          aria-controls="aci-v2-chat-suggestions"
          aria-expanded={showSuggestions}
          aria-activedescendant={
            activeSuggestion >= 0 ? `aci-v2-suggestion-${activeSuggestion}` : undefined
          }
          role="combobox"
          spellCheck="true"
          lang="en-IN"
          autoCorrect="on"
          autoCapitalize="sentences"
        />

        <button
          type="button"
          className="chat-btn mic"
          disabled={disabled}
          onClick={() =>
            fire({
              label: "Voice input",
              query: "",
              type: "voice_input",
              vehicle: selectedVehicle || null,
              contextPatch: selectedVehicle ? selectedVehicleContextPatch() : {},
              source: "aci_v2_sticky_chatbar",
            })
          }
          aria-label="Voice input"
        >
          <Mic size={24} />
        </button>

        <button
          type="submit"
          className="chat-btn send"
          disabled={disabled || !String(text || "").trim()}
          aria-label="Send"
        >
          <SendHorizontal size={23} />
        </button>
      </form>

      {showDisclaimer ? (
        <p className="aci-v2-disclaimer">
          ACI Assist can make mistakes. Please verify important information.
        </p>
      ) : null}
    </section>
  );
}
