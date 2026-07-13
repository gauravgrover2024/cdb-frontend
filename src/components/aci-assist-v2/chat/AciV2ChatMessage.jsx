import React, { useEffect, useState } from "react";
import { AciAssistantOrb } from "../shared/AciAssistShared";
import AciV2FeatureInlineCard from "../inline/AciV2FeatureInlineCard";
import AciV2CanvasPreviewCard from "./AciV2CanvasPreviewCard";
import AciV2QuestionIcon from "./AciV2QuestionIcon";
import AciV2InlineRenderer from "./AciV2InlineRenderer";
import {
  buildChatSuggestions,
  isFeatureAnswerWidget,
  safeWidget,
} from "./aciV2ChatWidgetUtils";

export function AciV2ThinkingMessage() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const matchingTimer = window.setTimeout(() => setStage(1), 650);
    const composingTimer = window.setTimeout(() => setStage(2), 1800);
    return () => {
      window.clearTimeout(matchingTimer);
      window.clearTimeout(composingTimer);
    };
  }, []);

  const labels = [
    "Understanding your question...",
    "Matching the right cars and details...",
    "Bringing the useful parts together...",
  ];

  return (
    <article className="aci-chat-message is-assistant">
      <div className="aci-chat-orb">
        <AciAssistantOrb small />
      </div>

      <div className="aci-chat-bubble aci-chat-thinking">
        <span />
        <span />
        <span />
        <p aria-live="polite">{labels[stage]}</p>
      </div>
    </article>
  );
}

export default function AciV2ChatMessage({
  message = {},
  selectedVehicle,
  onAction,
  onOpenCanvas,
}) {
  const isUser = message.role === "user";
  const widget = safeWidget(message.widget || {});
  const hasCanvas = Boolean(
    message.canvasType ||
      widget.canvasType ||
      widget.__rawCanvasType,
  );
  const hasFeatureInline = isFeatureAnswerWidget(message, widget);
  const inlineType = message.inlineType || widget.inlineType || "";
  const hasGeneralInline = ["clarification_card", "finance_faq_card"].includes(
    String(inlineType).toLowerCase(),
  );
  const followups = buildChatSuggestions({
    widget,
    message,
    limit: 4,
  });

  if (isUser) {
    return (
      <article className="aci-chat-message is-user">
        <div className="aci-chat-bubble">
          {message.text ? <p>{message.text}</p> : null}
        </div>
      </article>
    );
  }

  return (
    <article className="aci-chat-message is-assistant">
      <div className="aci-chat-orb">
        <AciAssistantOrb small />
      </div>

      <div className="aci-chat-assistant-stack">
        {message.text ? (
          <div className="aci-chat-bubble">
            <p>{message.text}</p>
          </div>
        ) : null}

        {hasFeatureInline ? (
          <AciV2FeatureInlineCard
            message={message}
            selectedVehicle={selectedVehicle}
            onAction={onAction}
          />
        ) : null}

        {hasGeneralInline ? (
          <AciV2InlineRenderer
            inlineType={inlineType}
            payload={{ ...widget, ...message, data: widget.data || message.data || {} }}
            onAction={onAction}
          />
        ) : null}

        {hasCanvas ? (
          <AciV2CanvasPreviewCard
            message={message}
            selectedVehicle={selectedVehicle}
            onOpen={onOpenCanvas}
            onAction={onAction}
          />
        ) : null}

        {message.error ? (
          <div className="aci-chat-error-note">
            Live backend not reached. Please try again.
          </div>
        ) : null}

        {followups.length && !hasCanvas && !hasFeatureInline && !hasGeneralInline ? (
          <div className="aci-chat-followups">
            {followups.map((item, index) => {
              const label =
                item.label ||
                item.title ||
                item.query ||
                `Suggestion ${index + 1}`;

              return (
                <button
                  type="button"
                  key={item.id || item.label || item.query || index}
                  onClick={() => onAction?.(item)}
                >
                  <AciV2QuestionIcon label={label} index={index} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}
