/* ========================================================================
   ACI ASSIST V2 — CARO PREMIUM FIXED CHAT SHELL
   ------------------------------------------------------------------------
   FINAL HEADER VERSION
   ------------------------------------------------------------------------
   ✓ Clear fixed header
   ✓ No top veil / no overlay
   ✓ Separate floating context line below header
   ✓ Solid vibrant blue plus button
   ✓ Restores old chat-shell compatibility classes
   ✓ Does not change chat message rendering
   ✓ Mobile + laptop optimized
   ======================================================================== */

import React, { useCallback, useEffect, useRef } from "react";

import { Bell, ChevronDown, Plus, User2 } from "lucide-react";

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
  const hasMessages = Array.isArray(messages) && messages.length > 0;

  const activeVehicle =
    getDisplayVehicleFromContext(sessionContext) ||
    selectedVehicle ||
    homeData?.selectedVehicle ||
    null;

  const model =
    activeVehicle?.displayName ||
    activeVehicle?.model ||
    sessionContext?.anchorModel ||
    "New car";

  const city = activeVehicle?.city || sessionContext?.anchorCity || "Delhi";

  const contextLabel = `${model} • ${city}`;

  const threadEndRef = useRef(null);

  const scrollToLatest = useCallback((behavior = "smooth") => {
    threadEndRef.current?.scrollIntoView({
      behavior,
      block: "end",
      inline: "nearest",
    });
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [messages?.length, isLoading, error, scrollToLatest]);

  const handleLogoClick = () => {
    if (typeof onGoHome === "function") {
      onGoHome();
      return;
    }

    onAction?.({
      id: "go-home",
      type: "go_home",
      label: "Home",
    });
  };

  const handleChangeContext = () => {
    onAction?.({
      id: "change-chat-context",
      type: "change_context",
      label: "Change context",
      query: "Change my car search context",
    });
  };

  const handleNewChat = () => {
    const payload = {
      id: "reset-session",
      type: "reset_session",
      action: "RESET_SESSION",
      label: "New chat",
      preserveHome: true,
      clearMessages: true,
      clearContext: true,
      resetConversation: true,
      startFresh: true,
    };

    onAction?.(payload);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aci-assist:new-chat", {
          detail: payload,
        }),
      );
    }
  };

  const handleNotifications = () => {
    onAction?.({
      id: "open-notifications",
      type: "open_notifications",
      label: "Notifications",
    });
  };

  const handleProfile = () => {
    onAction?.({
      id: "open-profile",
      type: "open_profile",
      label: "Profile",
    });
  };

  return (
    <>
      <style>{`
:root {
  --caro-font:
    "Satoshi Variable",
    "General Sans",
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "SF Pro Text",
    sans-serif;

  --caro-blue: #0457ff;
  --caro-blue-soft: rgba(4, 87, 255, .08);
  --caro-ink: #071226;
  --caro-muted: #7c8798;

  --caro-header-top: 8px;
  --caro-header-h: 44px;
  --caro-context-gap: 7px;
  --caro-context-h: 28px;
  --caro-after-context-gap: 22px;

  --caro-content-top: calc(
    var(--caro-header-top) +
    var(--caro-header-h) +
    var(--caro-context-gap) +
    var(--caro-context-h) +
    var(--caro-after-context-gap)
  );
}
/* ========================================================================
   SHELL
   ======================================================================== */

.aci-shell,
.aci-chat-shell {
  position: relative;

  min-height: 100vh;

  overflow-x: hidden;

  font-family: var(--caro-font);

  color: var(--caro-ink);

  background:
    radial-gradient(
      circle at 18% -14%,
      rgba(4,87,255,.055),
      transparent 30%
    ),
    radial-gradient(
      circle at 88% -10%,
      rgba(100,145,255,.045),
      transparent 28%
    ),
    linear-gradient(
      180deg,
      #fbfcff 0%,
      #ffffff 26%,
      #ffffff 100%
    );
}

/* IMPORTANT: remove old veil / overlay completely */
.aci-shell::before,
.aci-chat-shell::before {
  display: none !important;
  content: none !important;
}

/* ========================================================================
   FIXED TOP AREA
   ======================================================================== */

.aci-fixed-top {
  position: fixed;

  top: 0;
  left: 0;
  right: 0;

  z-index: 9999;

  pointer-events: none;

  padding-top: var(--caro-header-top);

  background: transparent;
}

/* ========================================================================
   HEADER
   ======================================================================== */

.aci-header {
  pointer-events: auto;

  width: min(calc(100vw - 20px), 760px);

  height: var(--caro-header-h);

  margin: 0 auto;

  padding:
    0
    5px
    0
    12px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  border-radius: 999px;

  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,.98),
      rgba(255,255,255,.92)
    );

  border:
    1px solid rgba(207,222,248,.78);

  backdrop-filter:
    blur(16px)
    saturate(170%);

  -webkit-backdrop-filter:
    blur(16px)
    saturate(170%);

  box-shadow:
    0 10px 30px rgba(15,23,42,.055),
    0 2px 8px rgba(15,23,42,.025),
    inset 0 1px 0 rgba(255,255,255,.98);
}

/* ========================================================================
   LOGO
   ======================================================================== */

.aci-logo-button {
  appearance: none;

  border: none;

  background: transparent;

  padding: 0;
  margin: 0;

  height: 100%;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  cursor: pointer;
}

.aci-logo-wrap {
  display: flex;

  align-items: center;

  justify-content: center;

  transform:
    translateY(1px)
    scale(1.14);

  transform-origin: left center;

  filter:
    drop-shadow(0 0 16px rgba(4,87,255,.10));
}

/* ========================================================================
   ACTIONS
   ======================================================================== */

.aci-actions {
  height: 34px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 2px;

  padding:
    1px;

  border-radius: 999px;

  background:
    rgba(255,255,255,.46);

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.92);
}

.aci-action-btn {
  width: 31px;
  height: 31px;

  appearance: none;

  border: none;

  border-radius: 999px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  color: #071226;

  background: transparent;

  cursor: pointer;

  transition:
    transform .16s ease,
    background .16s ease,
    box-shadow .16s ease;
}

.aci-action-btn:hover {
  transform: translateY(-1px);

  background:
    rgba(255,255,255,.86);

  box-shadow:
    0 8px 18px rgba(15,23,42,.06);
}

.aci-action-btn--primary {
  color: #ffffff;

  background: #0457ff;

  box-shadow:
    0 8px 20px rgba(4,87,255,.30),
    inset 0 1px 0 rgba(255,255,255,.22);
}

.aci-action-btn--primary:hover {
  background: #0457ff;

  box-shadow:
    0 10px 24px rgba(4,87,255,.34),
    inset 0 1px 0 rgba(255,255,255,.24);
}

/* ========================================================================
   FLOATING CONTEXT LINE
   ======================================================================== */

.aci-floating-context {
  pointer-events: none;

  width: 100%;

  height: var(--caro-context-h);

  margin-top: 7px;

  display: flex;

  align-items: center;

  justify-content: center;
}

.aci-floating-context-inner {
  pointer-events: auto;

  appearance: none;

  border: none;

  min-width: 0;

  height: var(--caro-context-h);

  max-width: calc(100vw - 36px);

  padding:
    0
    9px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  border-radius: 999px;

  background:
    rgba(255,255,255,.76);

  backdrop-filter:
    blur(14px)
    saturate(160%);

  -webkit-backdrop-filter:
    blur(14px)
    saturate(160%);

  box-shadow:
    0 7px 18px rgba(15,23,42,.035),
    inset 0 1px 0 rgba(255,255,255,.88);

  cursor: pointer;
}

.aci-context-aura {
  width: 6px;
  height: 6px;

  flex: 0 0 auto;

  border-radius: 999px;

  background:
    radial-gradient(
      circle at 30% 24%,
      #ffffff 0%,
      #7edaff 34%,
      #0457ff 100%
    );

  box-shadow:
    0 0 0 4px rgba(4,87,255,.07),
    0 0 15px rgba(4,87,255,.24);
}

.aci-floating-context-text {
  min-width: 0;

  max-width: 190px;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color: #071226;

  font-size: 11.5px;

  line-height: 1;

  font-weight: 780;

  letter-spacing: -.025em;
}

.aci-floating-context-change {
  flex: 0 0 auto;

  color: #0457ff;

  font-size: 10.25px;

  line-height: 1;

  font-weight: 760;

  letter-spacing: -.01em;
}

/* ========================================================================
   CONTENT
   ======================================================================== */

.aci-shell-inner {
  width: 100%;

  max-width: 1480px;

  margin: 0 auto;

  padding:
    var(--caro-content-top)
    32px
    160px;

  position: relative;

  z-index: 1;
}

/* ========================================================================
   THREAD — DO NOT CHANGE CHAT RENDERING
   ======================================================================== */

.aci-thread,
.aci-chat-thread {
  width: min(100%, 1120px);

  margin: 0 auto;

  padding-top: 0;
}

.aci-thread .aci-chat-message,
.aci-chat-thread .aci-chat-message {
  margin-bottom: 22px;
}

/* ========================================================================
   MOBILE
   ======================================================================== */

@media (max-width: 768px) {
  :root {
    --caro-header-top: 8px;
    --caro-header-h: 44px;
    --caro-context-gap: 6px;
    --caro-context-h: 27px;
    --caro-after-context-gap: 18px;
  }

  .aci-shell-inner {
    padding:
      var(--caro-content-top)
      12px
      150px;
  }
}

  .aci-header {
    width: calc(100vw - 20px);

    height: var(--caro-header-h);

    padding:
      0
      4px
      0
      10px;
  }

  .aci-logo-wrap {
    transform:
      translateY(1px)
      scale(1.02);
  }

  .aci-actions {
    height: 33px;

    gap: 1px;

    padding: 1px;
  }

  .aci-action-btn {
    width: 30px;
    height: 30px;
  }

  .aci-floating-context {
    margin-top: 6px;
  }

  .aci-floating-context-inner {
    height: var(--caro-context-h);

    padding:
      0
      8px;

    gap: 6px;
  }

  .aci-floating-context-text {
    max-width: 160px;

    font-size: 11px;
  }

  .aci-floating-context-change {
    font-size: 10px;
  }

  .aci-shell-inner {
    padding:
      var(--caro-content-top)
      12px
      150px;
  }

  .aci-thread,
.aci-chat-thread {
  width: min(100%, 1120px);

  margin: 0 auto;

  padding-top: 0;

}

/* ========================================================================
   SMALL MOBILE
   ======================================================================== */

@media (max-width: 390px) {
  .aci-logo-wrap {
    transform:
      translateY(1px)
      scale(.96);
  }

  .aci-action-btn {
    width: 29px;
    height: 29px;
  }

  .aci-floating-context-text {
    max-width: 130px;
  }
}

      `}</style>

      <main className="aci-chat-shell aci-shell">
        {/* FIXED HEADER + CONTEXT */}
        <div className="aci-fixed-top">
          <header className="aci-header" aria-label="CARO header">
            <button
              type="button"
              className="aci-logo-button"
              onClick={handleLogoClick}
              aria-label="Go home"
            >
              <div className="aci-logo-wrap">
                <CaroLogo size={58} />
              </div>
            </button>

            <div className="aci-actions">
              <button
                type="button"
                className="aci-action-btn aci-action-btn--primary"
                onClick={handleNewChat}
                aria-label="Start new chat"
                title="Start new chat"
              >
                <Plus size={15} strokeWidth={2.7} />
              </button>

              <button
                type="button"
                className="aci-action-btn"
                onClick={handleNotifications}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} strokeWidth={2.15} />
              </button>

              <button
                type="button"
                className="aci-action-btn"
                onClick={handleProfile}
                aria-label="Profile"
                title="Profile"
              >
                <User2 size={16} strokeWidth={2.15} />
              </button>
            </div>
          </header>

          <div className="aci-floating-context">
            <button
              type="button"
              className="aci-floating-context-inner"
              onClick={handleChangeContext}
              aria-label="Change car context"
            >
              <span className="aci-context-aura" />

              <span className="aci-floating-context-text">{contextLabel}</span>

              <ChevronDown size={11} strokeWidth={2.4} color="#8d97ab" />

              <span className="aci-floating-context-change">Change</span>
            </button>
          </div>
        </div>

        <section className="aci-shell-inner">
          {/* THREAD */}

          <section
            className="aci-chat-thread aci-thread"
            aria-label="CARO conversation"
          >
            {!hasMessages ? (
              <AciV2ChatMessage
                message={{
                  id: "welcome",
                  role: "assistant",
                  text: "Ask me about price, EMI, colors, features, comparison or quotation.",
                }}
                selectedVehicle={activeVehicle}
                onAction={onAction}
                onOpenCanvas={onOpenCanvas}
              />
            ) : null}

            {messages?.map((message, index) => (
              <AciV2ChatMessage
                key={message.id || `${message.role || "assistant"}-${index}`}
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
