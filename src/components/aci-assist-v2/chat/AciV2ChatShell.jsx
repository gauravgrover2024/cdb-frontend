import React, { useCallback, useEffect, useRef } from "react";
import {
  AciComposer,
  AciLogo,
} from "../shared/AciAssistShared";
import AciV2ContextPill from "./AciV2ContextPill";
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
  const activeVehicle = selectedVehicle || homeData?.selectedVehicle || null;
  const threadRef = useRef(null);
  const threadEndRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const scrollToLatest = useCallback((behavior = "auto") => {
    const thread = threadRef.current;
    const anchor = threadEndRef.current;
    if (!thread || !anchor) return;

    anchor.scrollIntoView({
      block: "end",
      inline: "nearest",
      behavior,
    });
  }, []);

  const handleThreadScroll = useCallback(() => {
    const thread = threadRef.current;
    if (!thread) return;

    const distanceFromBottom =
      thread.scrollHeight - thread.scrollTop - thread.clientHeight;

    shouldStickToBottomRef.current = distanceFromBottom < 140;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    shouldStickToBottomRef.current = true;
    scrollToLatest("auto");

    const frame = window.requestAnimationFrame(() => {
      scrollToLatest("smooth");
    });

    const timers = [80, 220, 520].map((delay) =>
      window.setTimeout(() => scrollToLatest("auto"), delay),
    );

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [messages.length, scrollToLatest]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const thread = threadRef.current;
    if (!thread) return undefined;

    const keepBottomIfNeeded = () => {
      if (shouldStickToBottomRef.current) {
        scrollToLatest("auto");
      }
    };

    const images = Array.from(thread.querySelectorAll("img"));
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", keepBottomIfNeeded, { once: true });
      }
    });

    const observer = new MutationObserver(keepBottomIfNeeded);
    observer.observe(thread, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      images.forEach((img) =>
        img.removeEventListener("load", keepBottomIfNeeded),
      );
    };
  }, [messages.length, isLoading, error, scrollToLatest]);

  return (
    <main className="aci-chat-shell">
      <section className="aci-chat-app-frame">
        <header className="aci-chat-header">
          <button
            type="button"
            className="aci-chat-back"
            onClick={onGoHome}
            aria-label="Back home"
          >
            <span>&lsaquo;</span>
          </button>

          <AciLogo compact onAction={onAction} />

          <div className="aci-chat-header-actions">
            <button
              type="button"
              className="aci-chat-bell"
              aria-label="Notifications"
            >
              <span />
            </button>

            <button
              type="button"
              className="aci-chat-avatar"
              aria-label="Profile"
            >
              {homeData?.avatarUrl ? (
                <img src={homeData.avatarUrl} alt="Profile" />
              ) : null}
            </button>
          </div>
        </header>

        <AciV2ContextPill
          selectedVehicle={activeVehicle}
          sessionContext={sessionContext}
          onAction={onAction}
        />

        <section
          ref={threadRef}
          className="aci-chat-thread"
          aria-label="ACI Assist conversation"
          onScroll={handleThreadScroll}
        >
          {!hasMessages ? (
            <AciV2ChatMessage
              message={{
                id: "welcome",
                role: "assistant",
                text: "Ask me about price, EMI, colors, features, comparison or quotation. I'll keep the car and city context while answering.",
              }}
              selectedVehicle={activeVehicle}
              onAction={onAction}
              onOpenCanvas={onOpenCanvas}
            />
          ) : null}

          {messages.map((message, index) => (
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

          <div
            ref={threadEndRef}
            className="aci-chat-scroll-anchor"
            aria-hidden="true"
          />
        </section>
      </section>

      <AciComposer
        onAction={onAction}
        selectedVehicle={activeVehicle}
        placeholder="Ask ACI Assist anything..."
        disabled={isLoading}
        showDisclaimer
      />
    </main>
  );
}
