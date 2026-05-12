import React, { useRef, useState } from "react";
import { Mic, SendHorizontal, Sparkles } from "lucide-react";

const buildDefaultPlaceholder = (mobile, selectedVehicle) => {
  if (mobile) {
    return `Ask ACI Assist ${selectedVehicle?.model ? `about ${selectedVehicle.model}` : "anything"}...`;
  }
  return "Ask ACI Assist anything about new cars...";
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
  const submitLockRef = useRef(0);
  const composingRef = useRef(false);

  const fire = (detail) => {
    if (typeof onAction === "function") onAction(detail);
  };

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
      contextPatch: selectedVehicle
        ? {
            selectedVehicle,
            anchorMake: selectedVehicle.make || selectedVehicle.brand || "",
            anchorModel: selectedVehicle.model || "",
            anchorVariant:
              selectedVehicle.variant ||
              selectedVehicle.selectedVariant ||
              selectedVehicle.variantName ||
              "",
            anchorCity: selectedVehicle.city || "Delhi",
          }
        : {},
      source: "aci_v2_sticky_chatbar",
    });

    setText("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || composingRef.current) return;
    event.preventDefault();
    submit();
  };

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

        .aci-v2-chatdock > * {
          pointer-events: auto;
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

        .aci-v2-chatdock input {
          width: 100%;
          border: 0;
          background: transparent;
          outline: none;
          color: #0f172a;
          font-size: 13px;
          font-weight: 530;
          min-width: 0;
        }

        .aci-v2-chatdock input::placeholder {
          color: #90a1bc;
        }

        .aci-v2-chatdock .aci-v2-disclaimer {
          margin: 8px 0 0;
          text-align: center;
          font-size: 11px;
          color: #8a99af;
          font-weight: 540;
        }

        .aci-v2-chatdock.is-desktop {
          left: 50%;
          right: auto;
          width: min(640px, calc(100vw - 56px));
          bottom: calc(2px + env(safe-area-inset-bottom));
          transform: translateX(-50%);
        }

        .aci-v2-chatdock.is-desktop .aci-v2-chatbar {
          height: 56px;
          grid-template-columns: 38px 1fr 36px 42px;
          gap: 4px;
          padding: 5px;
        }

        .aci-v2-chatdock.is-desktop .chat-btn.spark {
          width: 36px;
          height: 36px;
        }

        .aci-v2-chatdock.is-desktop .chat-btn.mic {
          width: 32px;
          height: 32px;
        }

        .aci-v2-chatdock.is-desktop .chat-btn.send {
          width: 42px;
          height: 42px;
        }

        .aci-v2-chatdock.is-desktop input {
          font-size: 13px;
        }
      `}</style>

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
              contextPatch: selectedVehicle ? { selectedVehicle } : {},
              source: "aci_v2_sticky_chatbar",
            })
          }
          aria-label="Open assistant"
        >
          <Sparkles size={21} />
        </button>

        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
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
              contextPatch: selectedVehicle ? { selectedVehicle } : {},
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
