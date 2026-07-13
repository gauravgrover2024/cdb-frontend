import React, { useEffect, useMemo, useState } from "react";
import { AciAssistantOrb } from "../shared/AciAssistShared";
import AciV2FeatureInlineCard from "../inline/AciV2FeatureInlineCard";
import AciV2CanvasPreviewCard from "./AciV2CanvasPreviewCard";
import AciV2InlineRenderer from "./AciV2InlineRenderer";
import AciV2AnswerLead from "./AciV2AnswerLead";
import AciV2JourneyActions from "./AciV2JourneyActions";
import {
  AciV2CompoundInlineCard,
  AciV2ScoreInsightInlineCard,
} from "./AciV2SpecialInlineCards";
import {
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

function AciV2ChatMessage({
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
  const answerBlocks = Array.isArray(message.answerBlocks)
    ? message.answerBlocks.filter(Boolean)
    : [];
  const hasCompoundAnswer = answerBlocks.length > 1;
  const isScoreInsight = /score_insight/.test(
    `${message.intent || widget.intent || ""} ${message.canvasType || widget.canvasType || ""} ${inlineType}`,
  );
  const hasGeneralInline =
    Boolean(inlineType) &&
    !hasCanvas &&
    !hasFeatureInline &&
    !hasCompoundAnswer &&
    !isScoreInsight;
  const hasRichContent = hasCanvas || hasFeatureInline || hasGeneralInline;
  const inlinePayload = useMemo(
    () => ({ ...widget, ...message, data: widget.data || message.data || {} }),
    [message, widget],
  );

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
        <AciV2AnswerLead
          message={message}
          widget={widget}
          hasRichContent={hasRichContent}
        />

        {hasCompoundAnswer ? (
          <AciV2CompoundInlineCard blocks={answerBlocks} onOpen={onOpenCanvas} />
        ) : null}

        {isScoreInsight && !hasCompoundAnswer ? (
          <AciV2ScoreInsightInlineCard
            message={message}
            widget={widget}
          />
        ) : null}

        {hasFeatureInline && !hasCompoundAnswer && !isScoreInsight ? (
          <AciV2FeatureInlineCard
            message={message}
            selectedVehicle={selectedVehicle}
            onAction={onAction}
            showJourneyActions={false}
          />
        ) : null}

        {hasGeneralInline ? (
          <AciV2InlineRenderer
            inlineType={inlineType}
            payload={inlinePayload}
            onAction={onAction}
          />
        ) : null}

        {hasCanvas && !hasCompoundAnswer && !isScoreInsight ? (
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

        {!message.error ? (
          <AciV2JourneyActions message={message} widget={widget} onAction={onAction} />
        ) : null}
      </div>
    </article>
  );
}

export default React.memo(AciV2ChatMessage);
