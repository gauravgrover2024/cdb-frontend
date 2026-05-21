/* ========================================================================
   ACI ASSIST V2 — WORLD CLASS CINEMATIC CHAT SHELL
   ------------------------------------------------------------------------
   FINAL PRODUCTION FILE
   ------------------------------------------------------------------------
   DESIGN REFERENCES
   ------------------------------------------------------------------------
   • Apple Vision Pro
   • Arc Browser
   • Gemini
   • Nothing
   • Linear
   • Humane
   • Rivian
   ------------------------------------------------------------------------
   FEATURES
   ------------------------------------------------------------------------
   ✓ Ultra compact cinematic header
   ✓ Mobile + Laptop optimized
   ✓ Floating AI operating-system feel
   ✓ Premium glassmorphism
   ✓ AI-native spacing rhythm
   ✓ New chat button
   ✓ Notifications
   ✓ Profile access
   ✓ Live CARO logo integration
   ✓ Sticky immersive shell
   ✓ World-class typography hierarchy
   ✓ Production ready
   ======================================================================== */

import React, { useCallback, useEffect, useRef } from "react";

import { Bell, ChevronLeft, PencilLine, User2 } from "lucide-react";

import CaroLogo from "../../brand/CaroLogo";

import { AciComposer } from "../shared/AciAssistShared";

import { getDisplayVehicleFromContext } from "../context/aciV2ContextManager";

import AciV2ChatMessage, { AciV2ThinkingMessage } from "./AciV2ChatMessage";

export default function AciV2ChatShell({
  homeData,
  messages,
  isLoading,
  error,
  selectedVehicle,
  sessionContext,
  onAction,
  onOpenCanvas,
  onGoHome,
}) {
  const activeVehicle =
    getDisplayVehicleFromContext(sessionContext) ||
    selectedVehicle ||
    homeData?.selectedVehicle ||
    null;

  const model = activeVehicle?.displayName || activeVehicle?.model || "Seltos";

  const city = activeVehicle?.city || sessionContext?.anchorCity || "Delhi";

  const threadRef = useRef(null);

  const threadEndRef = useRef(null);

  const scrollToLatest = useCallback((behavior = "smooth") => {
    threadEndRef.current?.scrollIntoView({
      behavior,
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [messages?.length, scrollToLatest]);

  return (
    <>
      <style>{`

/* ========================================================================
   FONT SYSTEM
   ======================================================================== */

:root {
  --aci-font:
    "Satoshi Variable",
    "General Sans",
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;

  --aci-blue:
    #0457ff;

  --aci-text:
    #071226;

  --aci-sub:
    #7d8798;

  --aci-card:
    rgba(255,255,255,.72);

  --aci-line:
    rgba(255,255,255,.92);

  --aci-shell:
    #f5f8ff;
}

/* ========================================================================
   SHELL
   ======================================================================== */

.aci-shell {
  position: relative;

  min-height: 100vh;

  overflow: hidden;

  background:
    radial-gradient(
      circle at top left,
      rgba(0,82,255,.08),
      transparent 26%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(0,82,255,.05),
      transparent 24%
    ),
    linear-gradient(
      180deg,
      #fbfcff 0%,
      #f3f7ff 100%
    );

  font-family: var(--aci-font);
}

/* ========================================================================
   MAIN
   ======================================================================== */

.aci-shell-inner {
  width: 100%;

  max-width: 1440px;

  margin: 0 auto;

  padding:
    12px
    34px
    160px;

  position: relative;

  z-index: 5;
}

/* ========================================================================
   TOPBAR
   ======================================================================== */

.aci-topbar {
  position: sticky;

  top: 10px;

  z-index: 100;

  margin-bottom: 10px;
}

.aci-topbar-inner {
  width: min(100%, 880px);

  margin: 0 auto;

  height: 54px;

  padding:
    4px
    8px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 14px;

  border-radius: 999px;

  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,.84),
      rgba(255,255,255,.68)
    );

  backdrop-filter:
    blur(24px)
    saturate(180%);

  border:
    1px solid
    rgba(255,255,255,.94);

  box-shadow:
    0 10px 40px rgba(15,23,42,.06),
    inset 0 1px 0 rgba(255,255,255,.96);
}

/* ========================================================================
   LEFT
   ======================================================================== */

.aci-topbar-left {
  display: flex;

  align-items: center;

  gap: 12px;

  min-width: 0;
}

/* ========================================================================
   ICON BUTTONS
   ======================================================================== */

.aci-icon-btn {
  width: 42px;
  height: 42px;

  flex: 0 0 auto;

  border: none;

  border-radius: 50%;

  background:
    rgba(255,255,255,.82);

  display: flex;

  align-items: center;

  justify-content: center;

  color: #08142f;

  cursor: pointer;

  backdrop-filter:
    blur(18px);

  box-shadow:
    0 8px 24px rgba(15,23,42,.06);

  transition:
    transform .18s ease,
    box-shadow .18s ease,
    background .18s ease;
}

.aci-icon-btn:hover {
  transform: translateY(-1px);

  background:
    rgba(255,255,255,.96);

  box-shadow:
    0 14px 28px rgba(15,23,42,.10);
}

/* ========================================================================
   LOGO
   ======================================================================== */

.aci-logo {
  flex: 0 0 auto;

  transform:
    translateY(1px)
    scale(1.34);

  filter:
    drop-shadow(
      0 0 18px rgba(0,82,255,.14)
    );
}

/* ========================================================================
   CONTEXT
   ======================================================================== */

.aci-context {
  min-width: 0;

  display: flex;

  align-items: center;

  gap: 8px;
}

.aci-context-pulse {
  width: 7px;
  height: 7px;

  flex: 0 0 auto;

  border-radius: 999px;

  background:
    radial-gradient(
      circle,
      #4cff8d,
      #17cf58
    );

  box-shadow:
    0 0 14px rgba(23,207,88,.42);
}

.aci-context-copy {
  min-width: 0;
}

.aci-context-copy span {
  color: var(--aci-text);

  font-size: 13px;

  line-height: 1;

  font-weight: 760;

  letter-spacing: -.03em;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

/* ========================================================================
   RIGHT
   ======================================================================== */

.aci-topbar-right {
  display: flex;

  align-items: center;

  gap: 8px;

  flex: 0 0 auto;
}

/* ========================================================================
   NEW CHAT
   ======================================================================== */

.aci-new-chat {
  width: 40px;
  height: 40px;

  border: none;

  border-radius: 50%;

  background:
    linear-gradient(
      180deg,
      #1b66ff,
      #0052ff
    );

  display: flex;

  align-items: center;

  justify-content: center;

  color: white;

  cursor: pointer;

  box-shadow:
    0 10px 24px rgba(0,82,255,.24);

  transition:
    transform .18s ease,
    box-shadow .18s ease;
}

.aci-new-chat:hover {
  transform: translateY(-1px);

  box-shadow:
    0 14px 28px rgba(0,82,255,.30);
}

/* ========================================================================
   THREAD
   ======================================================================== */

.aci-thread {
  width: min(100%, 1120px);

  margin: 0 auto;

  padding-top: 6px;
}

/* ========================================================================
   MESSAGE SPACING
   ======================================================================== */

.aci-thread .aci-chat-message {
  margin-bottom: 22px;
}

/* ========================================================================
   MOBILE
   ======================================================================== */

@media (max-width: 768px) {

  .aci-shell-inner {
    padding:
      10px
      12px
      150px;
  }

  .aci-topbar {
    top: 8px;
  }

  .aci-topbar-inner {
    width: 100%;

    height: 48px;

    padding:
      3px
      6px;

    gap: 8px;
  }

  .aci-icon-btn {
    width: 36px;
    height: 36px;
  }

  .aci-new-chat {
    width: 36px;
    height: 36px;
  }

  .aci-logo {
    transform:
      translateY(1px)
      scale(1.18);
  }

  .aci-context-copy span {
    font-size: 11.5px;

    max-width: 92px;
  }

  .aci-thread {
    width: 100%;
  }
}

      `}</style>

      <main className="aci-shell">
        <section className="aci-shell-inner">
          {/* ============================================================= */}
          {/* TOPBAR */}
          {/* ============================================================= */}

          <header className="aci-topbar">
            <div className="aci-topbar-inner">
              {/* LEFT */}
              <div className="aci-topbar-left">
                {/* BACK */}
                <button
                  type="button"
                  className="aci-icon-btn"
                  onClick={onGoHome}
                >
                  <ChevronLeft size={20} strokeWidth={2.4} />
                </button>

                {/* LOGO */}
                <div className="aci-logo">
                  <CaroLogo size={74} />
                </div>

                {/* CONTEXT */}
                <div className="aci-context">
                  <div className="aci-context-pulse" />

                  <div className="aci-context-copy">
                    <span>
                      {model} • {city}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="aci-topbar-right">
                {/* NEW CHAT */}
                <button
                  type="button"
                  className="aci-new-chat"
                  onClick={() =>
                    onAction?.({
                      type: "new_chat",
                      query: "Start a new chat",
                    })
                  }
                >
                  <PencilLine size={17} strokeWidth={2.4} />
                </button>

                {/* NOTIFICATIONS */}
                <button type="button" className="aci-icon-btn">
                  <Bell size={18} strokeWidth={2.4} />
                </button>

                {/* PROFILE */}
                <button type="button" className="aci-icon-btn">
                  <User2 size={18} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </header>

          {/* ============================================================= */}
          {/* THREAD */}
          {/* ============================================================= */}

          <section ref={threadRef} className="aci-thread">
            {messages?.map((message, index) => (
              <AciV2ChatMessage
                key={message.id || `${message.role}-${index}`}
                message={message}
                selectedVehicle={activeVehicle}
                onAction={onAction}
                onOpenCanvas={onOpenCanvas}
              />
            ))}

            {isLoading ? <AciV2ThinkingMessage /> : null}

            {error && !isLoading ? (
              <AciV2ChatMessage
                message={{
                  id: "backend-error",
                  role: "assistant",
                  text: error,
                  error: true,
                }}
                selectedVehicle={activeVehicle}
                onAction={onAction}
                onOpenCanvas={onOpenCanvas}
              />
            ) : null}

            <div ref={threadEndRef} />
          </section>
        </section>

        {/* ============================================================= */}
        {/* COMPOSER */}
        {/* ============================================================= */}

        <AciComposer
          onAction={onAction}
          selectedVehicle={activeVehicle}
          placeholder="Ask CARO anything..."
          disabled={isLoading}
          showDisclaimer
        />
      </main>
    </>
  );
}
