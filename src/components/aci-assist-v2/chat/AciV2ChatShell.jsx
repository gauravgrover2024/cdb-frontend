/* ========================================================================
   ACI ASSIST V2 — CARO PREMIUM CHAT SHELL
   ------------------------------------------------------------------------
   FINAL SAFE SCROLL + WIDTH VERSION
   ------------------------------------------------------------------------
   ✓ Normal page scroll restored
   ✓ Fixed clear header
   ✓ Context fixed below header
   ✓ Chat starts below header/context
   ✓ No top veil / no overlay
   ✓ No nested scroll container
   ✓ No 100vw right-side clipping
   ✓ Mobile UI remains portrait-width in landscape
   ✓ Only two modes: Mobile UI + Laptop UI
   ✓ Solid vibrant blue plus button
   ✓ Does not change chat message rendering
   ======================================================================== */

import React, { useCallback, useEffect, useRef, useState } from "react";

import { ArrowDown, ChevronDown, Heart, History, X } from "lucide-react";

import { AciComposer } from "../shared/AciAssistShared";
import AciV2PortalHeader from "../shared/AciV2PortalHeader";

import { getDisplayVehicleFromContext } from "../context/aciV2ContextManager";

import AciV2ChatMessage, { AciV2ThinkingMessage } from "./AciV2ChatMessage";
import AciV2ChatExperienceStyles from "./AciV2ChatExperienceStyles";

export default function AciV2ChatShell({
  homeData,
  messages,
  isLoading,
  error,
  selectedVehicle,
  sessionContext,
  recentVehicles = [],
  savedVehicles = [],
  onAction,
  onOpenCanvas,
  onGoHome,
}) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const contextMenuRef = useRef(null);
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

  const comparisonVehicles =
    sessionContext?.activeComparison?.vehicles ||
    sessionContext?.selectedComparisonSet?.vehicles ||
    sessionContext?.contextState?.activeComparison?.vehicles ||
    [];
  const comparisonLabel = Array.isArray(comparisonVehicles) && comparisonVehicles.length > 1
    ? comparisonVehicles
        .slice(0, 2)
        .map((vehicle) => vehicle?.model || vehicle?.fullModel)
        .filter(Boolean)
        .join(" vs ")
    : "";
  const contextLabel = `${comparisonLabel || model} • ${city}`;

  const threadRef = useRef(null);
  const latestExchangeRef = useRef(null);
  const threadEndRef = useRef(null);
  const autoFollowRef = useRef(true);
  const pinLatestAnswerRef = useRef(false);

  const scrollToLatest = useCallback((behavior = "smooth", force = false) => {
    const thread = threadRef.current;
    if (!thread || (!force && !autoFollowRef.current)) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const latestTarget = latestExchangeRef.current;
    const latestTargetTop = latestTarget
      ? thread.scrollTop +
        latestTarget.getBoundingClientRect().top -
        thread.getBoundingClientRect().top
      : 0;
    const top = pinLatestAnswerRef.current && latestTarget
      ? Math.max(0, latestTargetTop - 8)
      : thread.scrollHeight;
    thread.scrollTo({
      top,
      behavior: reducedMotion ? "auto" : behavior,
    });
    autoFollowRef.current = true;
    setShowJumpToLatest(false);
  }, []);

  const handleThreadScroll = useCallback(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    const nearBottom = distanceFromBottom < 96;
    const latestTarget = latestExchangeRef.current;
    const latestTop = latestTarget
      ? thread.scrollTop +
        latestTarget.getBoundingClientRect().top -
        thread.getBoundingClientRect().top
      : Number.NaN;
    const nearPinnedAnswer = pinLatestAnswerRef.current && Number.isFinite(latestTop)
      ? Math.abs(thread.scrollTop - Math.max(0, latestTop - 8)) < 32
      : false;
    const followsConversation = nearBottom || nearPinnedAnswer;
    autoFollowRef.current = followsConversation;
    setShowJumpToLatest(!followsConversation);
  }, []);

  const latestMessage = hasMessages ? messages[messages.length - 1] : null;
  const latestMessageKey = `${latestMessage?.id || messages?.length || 0}:${isLoading ? 1 : 0}:${error || ""}`;

  useEffect(() => {
    pinLatestAnswerRef.current = latestMessage?.role === "assistant";
    if (latestMessage?.role === "user") autoFollowRef.current = true;
    if (!autoFollowRef.current) {
      setShowJumpToLatest(true);
      return undefined;
    }

    let followTimer;
    const frame = window.requestAnimationFrame(() => {
      scrollToLatest();
      followTimer = window.setTimeout(() => scrollToLatest(), 140);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(followTimer);
    };
  }, [latestMessage?.role, latestMessageKey, scrollToLatest]);

  useEffect(() => {
    const target = latestExchangeRef.current;
    if (!target || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      if (autoFollowRef.current) scrollToLatest("auto");
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [latestMessageKey, scrollToLatest]);

  useEffect(() => {
    if (!contextMenuOpen) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!contextMenuRef.current?.contains(event.target)) setContextMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setContextMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenuOpen]);

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
    setContextMenuOpen((open) => !open);
  };

  const chooseContext = (vehicle) => {
    setContextMenuOpen(false);
    onAction?.({
      id: `select-context-${vehicle?.id || vehicle?.model || "vehicle"}`,
      type: "select_context",
      label: `Continue with ${vehicle?.displayName || vehicle?.model || "this car"}`,
      query: "",
      vehicle,
    });
  };

  const clearContext = () => {
    setContextMenuOpen(false);
    onAction?.({ id: "clear-chat-context", type: "clear_context", label: "Context cleared", query: "" });
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

  const latestExchangeIndex = hasMessages ? messages.length - 1 : -1;

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
  --caro-ink: #071226;
  --caro-muted: #7c8798;

  --caro-stage-w: 1480px;

  --caro-header-top: 8px;
  --caro-header-h: 44px;
  --caro-context-gap: 7px;
  --caro-context-h: 28px;
  --caro-after-context-gap: 22px;
  --caro-composer-space: calc(108px + env(safe-area-inset-bottom));

  --caro-top-space: calc(
    var(--caro-header-top) +
    var(--caro-header-h) +
    var(--caro-context-gap) +
    var(--caro-context-h) +
    var(--caro-after-context-gap)
  );
}

/* ========================================================================
   SHELL — NORMAL PAGE SCROLL
   ======================================================================== */

.aci-shell,
.aci-chat-shell {
  position: relative;

  width: 100%;

  height: 100vh !important;
  height: 100dvh !important;
  min-height: 100vh !important;
  min-height: 100dvh !important;
  max-height: 100dvh !important;

  overflow: hidden !important;

  display: block !important;

  padding: 0 !important;

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

/* remove any previous veil */
.aci-shell::before,
.aci-chat-shell::before {
  display: none !important;
  content: none !important;
}

.aci-chat-shell::after {
  content: "";
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 180;
  height: calc(82px + env(safe-area-inset-bottom));
  pointer-events: none;
  background: #ffffff;
  border-top: 1px solid rgba(226, 232, 240, .7);
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

  height: var(--caro-top-space);
  background: #ffffff;
  border-bottom: 1px solid rgba(226, 232, 240, .62);
}

.aci-fixed-top-stage {
  width: min(100%, var(--caro-stage-w));

  margin: 0 auto;

  padding-top: var(--caro-header-top);

  pointer-events: none;
}

/* ========================================================================
   HEADER
   ======================================================================== */

.aci-header {
  pointer-events: auto;

  width: min(calc(100% - 20px), 760px);

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

  padding: 1px;

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

.aci-action-btn:active,
.aci-logo-button:active,
.aci-floating-context-inner:active {
  transform: scale(.96);
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

  position: relative;

  width: 100%;

  height: var(--caro-context-h);

  margin-top: var(--caro-context-gap);

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

  max-width: min(calc(100% - 44px), 360px);

  padding:
    0
    9px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  border-radius: 999px;

  background:
    rgba(255,255,255,.72);

  backdrop-filter:
    blur(14px)
    saturate(160%);

  -webkit-backdrop-filter:
    blur(14px)
    saturate(160%);

  box-shadow:
    0 6px 16px rgba(15,23,42,.03),
    inset 0 1px 0 rgba(255,255,255,.86);

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

.aci-context-menu {
  pointer-events: auto;
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  width: min(calc(100vw - 32px), 390px);
  padding: 10px;
  border: 1px solid rgba(15, 35, 70, .1);
  border-radius: 8px;
  background: rgba(255, 255, 255, .98);
  box-shadow: 0 16px 36px rgba(18, 43, 82, .14);
}

.aci-context-menu-section + .aci-context-menu-section {
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px solid #edf1f7;
}

.aci-context-menu-title {
  margin: 0 0 7px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #687386;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.aci-context-menu-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.aci-context-menu-item,
.aci-context-menu-clear {
  min-height: 34px;
  border: 1px solid #dce5f2;
  border-radius: 7px;
  background: #fff;
  color: #15233a;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}

.aci-context-menu-item {
  max-width: 100%;
  padding: 7px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aci-context-menu-item:hover,
.aci-context-menu-item:focus-visible {
  border-color: #0457ff;
  background: #f4f8ff;
  outline: none;
}

.aci-context-menu-clear {
  width: 100%;
  margin-top: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #5f6b7c;
  background: #f8fafc;
}

/* ========================================================================
   CONTENT
   ======================================================================== */

.aci-shell-inner {
  width: min(100%, var(--caro-stage-w));

  margin: 0 auto;

  padding:
    var(--caro-top-space)
    32px
    0;

  position: relative;

  z-index: 1;

  height: 100%;
  height: 100dvh;

  display: flex;
  flex-direction: column;

  min-height: 0;

  overflow: hidden;
}

/* ========================================================================
   THREAD — DO NOT CHANGE MESSAGE LOGIC
   ======================================================================== */

.aci-thread,
.aci-chat-thread {
  width: min(100%, 760px);

  max-width: 100%;

  margin: 0 auto;

  padding:
    0
    0
    var(--caro-composer-space) !important;

  scroll-padding:
    14px
    0
    var(--caro-composer-space) !important;

  flex: 1 1 auto !important;

  min-height: 0 !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;

  overscroll-behavior: contain;

  scrollbar-width: none;
}

.aci-thread::-webkit-scrollbar,
.aci-chat-thread::-webkit-scrollbar {
  display: none;
}

.aci-thread .aci-chat-message,
.aci-chat-thread .aci-chat-message {
  max-width: 100%;

  margin-bottom: 14px;

  scroll-margin-top: 14px;
}

.aci-chat-message-scroll-target {
  min-width: 0;
  max-width: 100%;
  scroll-margin-top: 14px;
}

/* ========================================================================
   BOX SIZING ONLY — NO GLOBAL MAX-WIDTH CLIPPING
   ======================================================================== */

.aci-chat-shell,
.aci-shell,
.aci-shell-inner,
.aci-thread,
.aci-chat-thread,
.aci-chat-shell *,
.aci-shell * {
  box-sizing: border-box;
}

/* keep direct message wrappers inside the phone width */
.aci-chat-thread .aci-chat-message,
.aci-thread .aci-chat-message,
.aci-chat-thread .aci-chat-message > *,
.aci-thread .aci-chat-message > * {
  min-width: 0;

  max-width: 100%;
}

/* user bubble visibility safety */
.aci-chat-shell .aci-chat-message--user .aci-chat-bubble,
.aci-chat-shell .aci-chat-message[data-role="user"] .aci-chat-bubble,
.aci-chat-shell .aci-chat-message.user .aci-chat-bubble {
  background: #0457ff !important;

  color: #ffffff !important;

  border-color: rgba(4,87,255,.18) !important;

  box-shadow:
    0 10px 26px rgba(4,87,255,.22) !important;
}

.aci-chat-shell .aci-chat-message--user *,
.aci-chat-shell .aci-chat-message[data-role="user"] *,
.aci-chat-shell .aci-chat-message.user * {
  color: inherit;
}

/* Full-width cards should use the chat rail, not 100vw math. */
.aci-chat-shell .aci-chat-message.is-assistant {
  width: 100% !important;
  min-width: 0 !important;
}

.aci-chat-shell .aci-chat-message.is-assistant .aci-chat-assistant-stack {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  max-width: calc(100% - 52px) !important;
}

.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-chat-result-card),
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4),
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-compound-card),
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-score-inline-card) {
  position: relative;
  display: block !important;
}

.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-chat-result-card) .aci-chat-orb,
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-chat-orb,
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-compound-card) .aci-chat-orb,
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-score-inline-card) .aci-chat-orb {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
}

.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-chat-result-card) .aci-chat-assistant-stack,
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-chat-assistant-stack,
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-compound-card) .aci-chat-assistant-stack,
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-score-inline-card) .aci-chat-assistant-stack {
  width: 100% !important;
  max-width: 100% !important;
  padding-left: 0 !important;
}

.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-chat-result-card) .aci-chat-bubble,
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-chat-bubble {
  max-width: calc(100% - 52px) !important;
  margin-left: 52px !important;
}

.aci-chat-shell .aci-chat-result-card,
.aci-chat-shell .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-feature-inline-card-v4 {
  width: 100% !important;
  max-width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.aci-chat-shell .aci-chat-scroll-anchor {
  width: 100%;
  height: var(--caro-composer-space) !important;
  min-height: var(--caro-composer-space) !important;
  flex: 0 0 var(--caro-composer-space) !important;
  pointer-events: none;
}

/* ========================================================================
   MOBILE UI
   Mobile portrait + mobile landscape both stay portrait-width.
   ======================================================================== */

@media (max-width: 768px),
  (hover: none) and (pointer: coarse) and (max-width: 1024px),
  (max-width: 950px) and (max-height: 500px) {
  :root {
    --caro-stage-w: 414px;

    --caro-header-top: 8px;
    --caro-header-h: 44px;
    --caro-context-gap: 6px;
    --caro-context-h: 27px;
    --caro-after-context-gap: 18px;
    --caro-composer-space: calc(112px + env(safe-area-inset-bottom));
  }

  .aci-fixed-top-stage,
  .aci-shell-inner {
    width: min(100%, var(--caro-stage-w));
  }

  .aci-header {
    width: calc(100% - 20px);

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

  .aci-floating-context-inner {
    height: var(--caro-context-h);

    max-width: calc(100% - 44px);

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
      var(--caro-top-space)
      12px
      0;
  }

  .aci-thread,
  .aci-chat-thread {
    width: 100%;

    max-width: 100%;

    margin: 0 auto;

    padding-top: 0;

    overflow-x: hidden;
  }

  .aci-chat-shell .aci-chat-result-card,
  .aci-chat-shell .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-feature-inline-card-v4 {
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}

/* ========================================================================
   SMALL MOBILE
   ======================================================================== */

@media (max-width: 390px) {
  :root {
    --caro-stage-w: 100%;
  }

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
      <AciV2ChatExperienceStyles />

      <main className="aci-chat-shell aci-shell">
        {/* FIXED HEADER + CONTEXT */}
        <div className="aci-fixed-top">
          <div className="aci-fixed-top-stage">
            <AciV2PortalHeader
              onLogoClick={handleLogoClick}
              logoLabel="Go home"
              logoTitle="Go home"
              onNewChat={handleNewChat}
              onNotifications={handleNotifications}
              onProfile={handleProfile}
            />

            <div className="aci-floating-context" ref={contextMenuRef}>
              <button
                type="button"
                className="aci-floating-context-inner"
                onClick={handleChangeContext}
                aria-label="Change car context"
                aria-haspopup="dialog"
                aria-expanded={contextMenuOpen}
                aria-controls="aci-car-context-menu"
              >
                <span className="aci-context-aura" />

                <span className="aci-floating-context-text">
                  {contextLabel}
                </span>

                <ChevronDown size={11} strokeWidth={2.4} color="#8d97ab" />

                <span className="aci-floating-context-change">Change</span>
              </button>
              {contextMenuOpen ? (
                <div id="aci-car-context-menu" className="aci-context-menu" role="dialog" aria-label="Car context">
                  {recentVehicles.length ? (
                    <section className="aci-context-menu-section">
                      <p className="aci-context-menu-title"><History size={12} /> Recent</p>
                      <div className="aci-context-menu-list">
                        {recentVehicles.slice(0, 5).map((vehicle, index) => (
                          <button
                            type="button"
                            className="aci-context-menu-item"
                            key={vehicle.id || `${vehicle.model}-${index}`}
                            onClick={() => chooseContext(vehicle)}
                          >
                            {vehicle.displayName || vehicle.model}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  {savedVehicles.length ? (
                    <section className="aci-context-menu-section">
                      <p className="aci-context-menu-title"><Heart size={12} /> Saved</p>
                      <div className="aci-context-menu-list">
                        {savedVehicles.slice(0, 6).map((vehicle, index) => (
                          <button
                            type="button"
                            className="aci-context-menu-item"
                            key={vehicle.id || `${vehicle.model}-${index}`}
                            onClick={() => chooseContext(vehicle)}
                          >
                            {vehicle.displayName || vehicle.model}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <button type="button" className="aci-context-menu-clear" onClick={clearContext}>
                    <X size={13} /> Clear current car
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <section className="aci-shell-inner">
          <section
            className="aci-chat-thread aci-thread"
            aria-label="CARO conversation"
            ref={threadRef}
            onScroll={handleThreadScroll}
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
              <div
                key={message.id || `${message.role || "assistant"}-${index}`}
                ref={index === latestExchangeIndex ? latestExchangeRef : null}
                className="aci-chat-message-scroll-target"
              >
                <AciV2ChatMessage
                  message={message}
                  selectedVehicle={activeVehicle}
                  onAction={onAction}
                  onOpenCanvas={onOpenCanvas}
                />
              </div>
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

            <div ref={threadEndRef} className="aci-chat-scroll-anchor" />
          </section>
        </section>

        {showJumpToLatest ? (
          <button
            type="button"
            className="aci-chat-jump-latest"
            onClick={() => scrollToLatest("smooth", true)}
            aria-label="Jump to latest answer"
            title="Jump to latest"
          >
            <ArrowDown size={18} strokeWidth={2.2} />
          </button>
        ) : null}

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
