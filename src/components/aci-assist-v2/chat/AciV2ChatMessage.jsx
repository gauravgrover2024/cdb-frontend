import React from "react";
import { AciAssistantOrb } from "../shared/AciAssistShared";
import AciV2FeatureInlineCard from "../inline/AciV2FeatureInlineCard";
import AciV2CanvasPreviewCard from "./AciV2CanvasPreviewCard";
import AciV2QuestionIcon from "./AciV2QuestionIcon";
import {
  buildChatSuggestions,
  isFeatureAnswerWidget,
  safeWidget,
} from "./aciV2ChatWidgetUtils";

export function AciV2ThinkingMessage() {
  return (
    <article className="aci-chat-message is-assistant">
      <div className="aci-chat-orb">
        <AciAssistantOrb small />
      </div>

      <div className="aci-chat-bubble aci-chat-thinking">
        <span />
        <span />
        <span />
        <p>Checking live ACI data...</p>
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

        {followups.length && !hasCanvas && !hasFeatureInline ? (
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
