import React, { useEffect, useMemo, useState } from "react";
import { AciAssistantOrb } from "../shared/AciAssistShared";
import AciV2FeatureInlineCard from "../inline/AciV2FeatureInlineCard";
import AciV2CanvasPreviewCard from "./AciV2CanvasPreviewCard";
import AciV2InlineRenderer from "./AciV2InlineRenderer";
import AciV2AnswerLead from "./AciV2AnswerLead";
import AciV2JourneyActions, { buildAciJourneyActions } from "./AciV2JourneyActions";
import {
  AciV2ComparisonInlineCard,
  AciV2CompoundInlineCard,
  AciV2RecommendationInlineCard,
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
  historyMessages = [],
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
  const isRecommendation = /vehicle_recommendation|recommendation_results|feature_match_builder/.test(
    `${message.intent || widget.intent || ""} ${message.canvasType || widget.canvasType || ""}`,
  );
  const messageRows = Array.isArray(message.rows) && message.rows.length
    ? message.rows
    : Array.isArray(widget.rows)
      ? widget.rows
      : [];
  const isDirectComparison =
    !hasCompoundAnswer &&
    messageRows.length >= 2 &&
    /comparison|compare/.test(
      `${message.intent || widget.intent || ""} ${message.canvasType || widget.canvasType || ""}`,
    );
  const isPriceOrColorCanvas = /price|pricelist|color|colour/.test(
    `${message.intent || widget.intent || ""} ${message.canvasType || widget.canvasType || ""}`,
  );
  const hasGeneralInline =
    Boolean(inlineType) &&
    !hasCanvas &&
    !hasFeatureInline &&
    !hasCompoundAnswer &&
    !isScoreInsight &&
    !isDirectComparison;
  const hasRichContent = hasCanvas || hasFeatureInline || hasGeneralInline || isRecommendation || isDirectComparison;
  const inlinePayload = useMemo(
    () => ({ ...widget, ...message, data: widget.data || message.data || {} }),
    [message, widget],
  );
  const journeyPresentation = useMemo(
    () => buildAciJourneyActions({ message, widget, historyMessages }),
    [historyMessages, message, widget],
  );
  const suppressAnswerLead = Boolean(
    hasCompoundAnswer ||
      isScoreInsight ||
      isRecommendation ||
      hasFeatureInline ||
      isPriceOrColorCanvas ||
      isDirectComparison,
  );
  const mergeJourneyIntoCanvas = hasCanvas && isPriceOrColorCanvas && !hasCompoundAnswer;

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
        {!suppressAnswerLead ? (
          <AciV2AnswerLead
            message={message}
            widget={widget}
            hasRichContent={hasRichContent}
          />
        ) : null}

        {hasCompoundAnswer ? (
          <AciV2CompoundInlineCard blocks={answerBlocks} onOpen={onOpenCanvas} />
        ) : null}

        {isScoreInsight && !hasCompoundAnswer ? (
          <AciV2ScoreInsightInlineCard
            message={message}
            widget={widget}
          />
        ) : null}

        {isRecommendation && !hasCompoundAnswer && !isScoreInsight ? (
          <AciV2RecommendationInlineCard
            message={message}
            widget={widget}
            actions={journeyPresentation.actions}
            onAction={onAction}
            onOpen={onOpenCanvas}
          />
        ) : null}

        {isDirectComparison && !isRecommendation && !isScoreInsight ? (
          <AciV2ComparisonInlineCard
            message={message}
            widget={widget}
            onOpen={onOpenCanvas}
            onAction={onAction}
          />
        ) : null}

        {hasFeatureInline && !hasCompoundAnswer && !isScoreInsight && !isRecommendation && !isDirectComparison ? (
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

        {hasCanvas && !hasCompoundAnswer && !isScoreInsight && !isRecommendation && !isDirectComparison ? (
          <AciV2CanvasPreviewCard
            message={message}
            selectedVehicle={selectedVehicle}
            onOpen={onOpenCanvas}
            onAction={onAction}
            actions={mergeJourneyIntoCanvas ? journeyPresentation.actions : []}
          />
        ) : null}

        {message.error ? (
          <div className="aci-chat-error-note">
            Live backend not reached. Please try again.
          </div>
        ) : null}

        {!message.error && !mergeJourneyIntoCanvas && !isRecommendation ? (
          <AciV2JourneyActions
            message={message}
            widget={widget}
            historyMessages={historyMessages}
            onAction={onAction}
            compact
          />
        ) : null}
      </div>
    </article>
  );
}

export default React.memo(AciV2ChatMessage);
