import React from "react";
import { motion } from "framer-motion";
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
  showDisclaimer = !mobile,
}) {
  const finalPlaceholder =
    placeholder || buildDefaultPlaceholder(mobile, selectedVehicle);
  const fire = (detail) => {
    if (typeof onAction === "function") onAction(detail);
  };

  return (
    <motion.section
      className={`aci-v2-chatdock ${mobile ? "is-mobile" : "is-desktop"} ${className}`.trim()}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.16 }}
    >
      <style>{`
        .aci-v2-chatdock {
          position: fixed;
          left: 16px;
          right: 16px;
          bottom: calc(16px + env(safe-area-inset-bottom));
          z-index: 220;
          pointer-events: none;
        }

        .aci-v2-chatdock > * {
          pointer-events: auto;
        }

        .aci-v2-chatdock .aci-v2-chatbar {
          height: 68px;
          border-radius: 999px;
          border: 1px solid #dbe3ef;
          background: rgba(255,255,255,.96);
          box-shadow: 0 26px 60px -44px rgba(15,23,42,.5), inset 0 1px 0 #fff;
          backdrop-filter: blur(16px);
          display: grid;
          grid-template-columns: 48px 1fr 44px 54px;
          align-items: center;
          gap: 6px;
          padding: 7px;
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
          width: 46px;
          height: 46px;
          background: linear-gradient(135deg, #eef4ff, #f7fbff);
          border: 1px solid #d5e1f5;
          color: #2257df;
        }

        .aci-v2-chatdock .chat-btn.mic {
          width: 42px;
          height: 42px;
          color: #51607a;
        }

        .aci-v2-chatdock .chat-btn.send {
          width: 54px;
          height: 54px;
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
          font-size: 14px;
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
          width: min(860px, calc(100vw - 40px));
          transform: translateX(-50%);
        }

        .aci-v2-chatdock.is-desktop .aci-v2-chatbar {
          height: 70px;
          grid-template-columns: 50px 1fr 46px 56px;
        }
      `}</style>

      <div className="aci-v2-chatbar">
        <button
          type="button"
          className="chat-btn spark"
          onClick={() =>
            fire({
              label: "Open assistant",
              query: "",
              type: "open_assistant",
              vehicle: selectedVehicle || null,
            })
          }
          aria-label="Open assistant"
        >
          <Sparkles size={21} />
        </button>

        <input placeholder={finalPlaceholder} />

        <button
          type="button"
          className="chat-btn mic"
          onClick={() =>
            fire({
              label: "Voice input",
              query: "",
              type: "voice_input",
              vehicle: selectedVehicle || null,
            })
          }
          aria-label="Voice input"
        >
          <Mic size={24} />
        </button>

        <button
          type="button"
          className="chat-btn send"
          onClick={() =>
            fire({
              label: "Send",
              query: "",
              type: "send",
              vehicle: selectedVehicle || null,
            })
          }
          aria-label="Send"
        >
          <SendHorizontal size={23} />
        </button>
      </div>

      {showDisclaimer ? (
        <p className="aci-v2-disclaimer">
          ACI Assist can make mistakes. Please verify important information.
        </p>
      ) : null}
    </motion.section>
  );
}
