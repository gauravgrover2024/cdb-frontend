import React, { useMemo } from "react";
import { ArrowRight, Compass, Route } from "lucide-react";

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const actionLabel = (action = {}) =>
  String(action.label || action.title || action.query || "").trim();

const actionKey = (action = {}) =>
  String(action.id || action.query || actionLabel(action)).trim().toLowerCase();

const isLeadAction = (action = {}) =>
  action.type === "lead" ||
  /\b(lead|quotation|quote|callback|enquiry|inquiry|contact|book)\b/i.test(
    [action.intent, action.leadType, action.label, action.query, action.canvasType]
      .filter(Boolean)
      .join(" "),
  );

const getJourney = (message = {}, widget = {}) =>
  message.journeyGuidance ||
  widget.journeyGuidance ||
  message.contextPatch?.customerJourney ||
  widget.contextPatch?.customerJourney ||
  {};

const comparisonModelsFor = (message = {}, widget = {}) => {
  const models = asArray(
    message.compoundRequest?.models ||
      message.contextPatch?.compoundRequest?.models ||
      widget.contextPatch?.compoundRequest?.models,
  );
  if (models.length >= 2) return models.slice(0, 2);

  return asArray(
    message.contextPatch?.activeComparison?.vehicles ||
      widget.contextPatch?.activeComparison?.vehicles,
  )
    .map((vehicle = {}) =>
      String(
        vehicle.fullModel ||
          [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" "),
      ).trim(),
    )
    .filter(Boolean)
    .slice(0, 2);
};

const buildJourneyActions = ({ message = {}, widget = {} } = {}) => {
  const journey = getJourney(message, widget);
  const stage = String(journey.stage || message.contextPatch?.customerStage || "research").toLowerCase();
  const decisionFlow = ["decision", "enquiry_ready", "enquiry"].includes(stage);
  const leadAllowed = decisionFlow && journey.leadMode !== "hidden";
  const candidates = [
    ...asArray(message.actions),
    ...asArray(message.leadingQuestions),
    ...asArray(widget.actions),
    ...asArray(widget.leadingQuestions),
    journey.nextBestAction,
  ].filter(Boolean);
  const compoundAnswer = asArray(message.answerBlocks).length > 1;
  const comparisonModels = comparisonModelsFor(message, widget);
  const resolvedComparisonVehicles = asArray(
    message.contextPatch?.activeComparison?.vehicles ||
      widget.contextPatch?.activeComparison?.vehicles,
  );
  const seen = new Set();
  const actions = [];
  let leadCount = 0;

  for (const candidate of candidates) {
    const action = typeof candidate === "string"
      ? { id: candidate, label: candidate, query: candidate, type: "ask" }
      : candidate;
    const label = actionLabel(action);
    const key = actionKey(action);
    const lead = isLeadAction(action);
    const alreadyAnsweredInCompound = compoundAnswer &&
      /vehicle_(colors?|pricelist|price)|color_studio|pricelist_canvas/i.test(
        `${action.intent || ""} ${action.canvasType || ""} ${action.label || ""}`,
      );
    const currentIntent = `${message.intent || ""} ${widget.intent || ""} ${message.canvasType || ""}`;
    const staleComparisonStep =
      !/comparison|compare/.test(currentIntent) &&
      /compare equivalent variants|match variants|comparable variants/i.test(label);
    const completedComparisonStep =
      /comparison|compare/.test(currentIntent) &&
      /compare equivalent variants|match variants|comparable variants/i.test(label) &&
      resolvedComparisonVehicles.filter((vehicle = {}) => vehicle.variant || vehicle.variantName).length >= 2;
    if (!label || !key || seen.has(key)) continue;
    if (alreadyAnsweredInCompound) continue;
    if (staleComparisonStep) continue;
    if (completedComparisonStep) continue;
    if (lead && (!leadAllowed || leadCount >= 1)) continue;
    seen.add(key);
    if (lead) leadCount += 1;
    const comparisonQuery =
      /compare equivalent variants|match variants|comparable variants/i.test(label) &&
      comparisonModels.length >= 2
        ? `Compare ${comparisonModels.join(" vs ")}`
        : action.query || label;
    actions.push({ ...action, label, query: comparisonQuery, isLead: lead });
    if (actions.length >= 2) break;
  }

  return {
    actions,
    flow: decisionFlow ? "decision" : "research",
    stage,
    readinessScore: Number(journey.readinessScore || 0),
  };
};

function AciV2JourneyActions({ message = {}, widget = {}, onAction }) {
  const presentation = useMemo(
    () => buildJourneyActions({ message, widget }),
    [message, widget],
  );
  const { actions, flow } = presentation;
  if (!actions.length) return null;
  const decisionFlow = flow === "decision";
  const FlowIcon = decisionFlow ? Route : Compass;

  return (
    <nav className={`aci-journey-actions is-${flow}`} aria-label="Helpful next steps">
      <div className="aci-journey-actions-intro">
        <FlowIcon size={16} strokeWidth={2} aria-hidden="true" />
        <span>
          <strong>{decisionFlow ? "Ready when you are" : "A useful next step"}</strong>
          <small>
            {decisionFlow
              ? "Choose what would make the decision easier."
              : "Keep exploring at your own pace."}
          </small>
        </span>
      </div>
      <div className="aci-journey-actions-list">
        {actions.map((action, index) => (
          <button
            type="button"
            className={`${index === 0 ? "is-primary" : ""} ${action.isLead ? "is-lead" : ""}`.trim()}
            key={actionKey(action)}
            onClick={() => onAction?.(action)}
          >
            <span>{action.label}</span>
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        ))}
      </div>
    </nav>
  );
}

export default React.memo(AciV2JourneyActions);
export { buildJourneyActions as buildAciJourneyActions, isLeadAction };
