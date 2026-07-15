import React, { useMemo } from "react";
import {
  ArrowRight,
  Calculator,
  Compass,
  ListChecks,
  Route,
  SlidersHorizontal,
} from "lucide-react";

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const actionLabel = (action = {}) =>
  String(action.label || action.title || action.query || "").trim();

const actionKey = (action = {}) =>
  String(action.id || action.query || actionLabel(action)).trim().toLowerCase();

const normalize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const capabilityFor = (value = {}) => {
  const source = normalize(
    typeof value === "string"
      ? value
      : [
          value.intent,
          value.canvasType,
          value.inlineType,
          value.label,
          value.query,
          value.text,
          value.answer,
        ].filter(Boolean).join(" "),
  );
  if (/\b(compare|comparison|versus| vs )\b/.test(` ${source} `)) return "comparison";
  if (/\b(price|prices|pricelist|price list|on road|ex showroom)\b/.test(source)) return "price";
  if (/\b(colour|colours|color|colors)\b/.test(source)) return "color";
  if (/\b(emi|loan|finance|down payment)\b/.test(source)) return "finance";
  if (/\b(recommend|recommendation|shortlist|find cars|best car|best suv)\b/.test(source)) return "recommendation";
  if (/\b(feature|features|sunroof|abs|airbag|safety)\b/.test(source)) return "feature";
  if (/\b(variant|variants|trim|trims)\b/.test(source)) return "variant";
  return "";
};

const scopeFor = (value = {}) => {
  const candidates = [
    value.vehicle,
    value.widget?.vehicle,
    value.contextPatch?.selectedVehicle,
    value.action?.vehicle,
    value.action?.contextPatch?.selectedVehicle,
  ].filter(Boolean);
  return candidates
    .map((vehicle = {}) =>
      normalize(
        vehicle.fullModel ||
          vehicle.displayName ||
          [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
          vehicle.model,
      ),
    )
    .filter(Boolean);
};

const scopesOverlap = (left = [], right = []) =>
  left.some((a) => right.some((b) => a === b || a.includes(b) || b.includes(a)));

const isLeadAction = (action = {}) =>
  action.type === "lead" ||
  /\b(lead|quotation|quote|callback|enquiry|inquiry|contact|book)\b/i.test(
    [action.intent, action.leadType, action.label, action.query, action.canvasType]
      .filter(Boolean)
      .join(" "),
  );

const iconForAction = (action = {}) => {
  const label = normalize(actionLabel(action));
  if (/\b(variant|variants|trim|trims)\b/.test(label)) return SlidersHorizontal;
  if (/\b(emi|loan|finance)\b/.test(label)) return Calculator;
  if (/\b(feature|features|equipment|specification)\b/.test(label)) return ListChecks;
  if (/\b(compare|comparison)\b/.test(label)) return ListChecks;
  return Compass;
};

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

  const contextualModels = asArray(
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
  if (contextualModels.length >= 2) return contextualModels;

  return asArray(widget.rows || message.rows)
    .map((row = {}) => {
      const vehicle = row.vehicle || row;
      return String(
        vehicle.fullModel ||
          vehicle.displayName ||
          [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
          row.displayName ||
          row.model ||
          "",
      ).trim();
    })
    .filter(Boolean)
    .slice(0, 2);
};

const vehicleLabelFor = (message = {}, widget = {}) => {
  const vehicle =
    message.vehicle ||
    widget.vehicle ||
    message.contextPatch?.selectedVehicle ||
    widget.contextPatch?.selectedVehicle ||
    {};
  return String(
    vehicle.fullModel ||
      vehicle.displayName ||
      [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
      vehicle.model ||
      "",
  ).trim();
};

const buildJourneyActions = ({ message = {}, widget = {}, historyMessages = [] } = {}) => {
  const journey = getJourney(message, widget);
  const stage = String(journey.stage || message.contextPatch?.customerStage || "research").toLowerCase();
  const readinessScore = Number(journey.readinessScore || 0);
  const decisionFlow = ["decision", "enquiry_ready", "enquiry"].includes(stage) && readinessScore >= 55;
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
  const seenLabels = new Set();
  const seenQueries = new Set();
  const actions = [];
  let leadCount = 0;
  const currentScope = scopeFor({ ...message, widget });
  const currentIntent = `${message.intent || ""} ${widget.intent || ""} ${message.canvasType || ""}`;
  const currentCapability = capabilityFor({ ...message, widget });
  const actionLimit = currentCapability === "comparison" ? 3 : 2;
  const currentVehicleLabel = vehicleLabelFor(message, widget);
  const explored = asArray(historyMessages)
    .filter((item) => item?.role === "assistant")
    .map((item) => ({
      capability: capabilityFor({ ...item, widget: item.widget || {} }),
      scope: scopeFor(item),
    }))
    .filter((item) => item.capability);

  for (const candidate of candidates) {
    const action = typeof candidate === "string"
      ? { id: candidate, label: candidate, query: candidate, type: "ask" }
      : candidate;
    const label = actionLabel(action);
    const key = actionKey(action);
    const labelKey = normalize(label);
    const queryKey = normalize(action.query || label);
    const lead = isLeadAction(action);
    const alreadyAnsweredInCompound = compoundAnswer &&
      /vehicle_(colors?|pricelist|price)|color_studio|pricelist_canvas/i.test(
        `${action.intent || ""} ${action.canvasType || ""} ${action.label || ""}`,
      );
    const staleComparisonStep =
      !/comparison|compare/.test(currentIntent) &&
      /compare equivalent variants|match variants|comparable variants/i.test(label);
    const completedComparisonStep =
      /comparison|compare/.test(currentIntent) &&
      /compare equivalent variants|match variants|comparable variants/i.test(label) &&
      resolvedComparisonVehicles.filter((vehicle = {}) => vehicle.variant || vehicle.variantName).length >= 2;
    const candidateCapability = capabilityFor(action);
    const candidateScope = scopeFor(action);
    const targetScope = candidateScope.length ? candidateScope : currentScope;
    const alreadyExplored = Boolean(
      candidateCapability &&
      targetScope.length &&
      explored.some(
        (item) =>
          item.capability === candidateCapability &&
          item.scope.length &&
          scopesOverlap(item.scope, targetScope),
      ),
    );
    const repeatsCurrentAnswer = Boolean(
      candidateCapability &&
      currentCapability &&
      candidateCapability === currentCapability,
    );
    if (!label || !key || seen.has(key) || seenLabels.has(labelKey) || seenQueries.has(queryKey)) continue;
    if (alreadyAnsweredInCompound) continue;
    if (staleComparisonStep) continue;
    if (completedComparisonStep) continue;
    if (alreadyExplored) continue;
    if (repeatsCurrentAnswer) continue;
    if (lead && (!leadAllowed || leadCount >= 1)) continue;
    seen.add(key);
    seenLabels.add(labelKey);
    seenQueries.add(queryKey);
    if (lead) leadCount += 1;
    const isOverviewAction = /open (?:car |vehicle )?overview|view (?:car |vehicle )?overview/i.test(label);
    if (isOverviewAction && !currentVehicleLabel) continue;
    const comparisonQuery =
      /compare equivalent variants|match variants|comparable variants/i.test(label) &&
      comparisonModels.length >= 2
        ? `Compare ${comparisonModels.join(" vs ")}`
        : isOverviewAction
          ? `Show ${currentVehicleLabel} overview`
          : action.query || label;
    actions.push({ ...action, label, query: comparisonQuery, isLead: lead });
    if (actions.length >= actionLimit) break;
  }

  const addFallback = (action) => {
    const key = actionKey(action);
    const labelKey = normalize(actionLabel(action));
    const queryKey = normalize(action.query || actionLabel(action));
    if (
      !key ||
      seen.has(key) ||
      seenLabels.has(labelKey) ||
      seenQueries.has(queryKey) ||
      actions.length >= actionLimit
    ) return;
    seen.add(key);
    seenLabels.add(labelKey);
    seenQueries.add(queryKey);
    actions.push(action);
  };

  if (currentCapability === "comparison" && comparisonModels.length >= 2) {
    addFallback({
      id: "open-full-comparison",
      label: "Full comparison",
      query: `Give me a full comparison of ${comparisonModels.join(" vs ")}`,
      type: "ask",
    });
    addFallback({
      id: "change-comparison-variants",
      label: "Change variants",
      query: `Change variants for ${comparisonModels.join(" vs ")}`,
      type: "ask",
    });
    addFallback({
      id: "compare-emi-difference",
      label: "Check EMI difference",
      query: `Compare EMI for ${comparisonModels.join(" vs ")}`,
      type: "ask",
    });
  }

  if (currentCapability === "recommendation") {
    const recommendationModels = asArray(widget.rows || message.rows)
      .map((row) => String(row.fullModel || row.displayName || [row.make || row.brand, row.model].filter(Boolean).join(" ")).trim())
      .filter(Boolean);
    if (recommendationModels.length >= 2) {
      addFallback({
        id: "compare-top-shortlist",
        label: "Compare top matches",
        query: `Compare ${recommendationModels.slice(0, 2).join(" vs ")}`,
        type: "ask",
      });
    }
    const feature = String(widget.featureName || widget.feature || widget.data?.featureName || "").trim();
    addFallback({
      id: "refine-shortlist-automatic",
      label: "Show automatic options",
      query: feature
        ? `Show automatic cars with ${feature} in this budget`
        : "Show automatic cars in this budget",
      type: "ask",
    });
  }

  return {
    actions,
    flow: decisionFlow ? "decision" : "research",
    stage,
    readinessScore,
  };
};

function AciV2JourneyActions({
  message = {},
  widget = {},
  historyMessages = [],
  onAction,
  compact = false,
}) {
  const presentation = useMemo(
    () => buildJourneyActions({ message, widget, historyMessages }),
    [historyMessages, message, widget],
  );
  const { actions, flow } = presentation;
  if (!actions.length) return null;
  const decisionFlow = flow === "decision";
  const FlowIcon = decisionFlow ? Route : Compass;

  return (
    <nav className={`aci-journey-actions is-${flow} ${compact ? "is-compact" : ""}`} aria-label="Helpful next steps">
      {!compact ? <div className="aci-journey-actions-intro">
        <FlowIcon size={16} strokeWidth={2} aria-hidden="true" />
        <span>
          <strong>{decisionFlow ? "Ready when you are" : "A useful next step"}</strong>
          <small>
            {decisionFlow
              ? "Choose what would make the decision easier."
              : "Keep exploring at your own pace."}
          </small>
        </span>
      </div> : null}
      <div className="aci-journey-actions-list">
        {actions.map((action, index) => {
          const ActionIcon = iconForAction(action);
          return (
            <button
              type="button"
              className={`${index === 0 ? "is-primary" : ""} ${action.isLead ? "is-lead" : ""}`.trim()}
              key={actionKey(action)}
              onClick={() => onAction?.(action)}
            >
              <span className="aci-journey-action-label">
                <ActionIcon size={15} strokeWidth={2} aria-hidden="true" />
                <span>{action.label}</span>
              </span>
              <ArrowRight className="aci-journey-action-arrow" size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default React.memo(AciV2JourneyActions);
export { buildJourneyActions as buildAciJourneyActions, isLeadAction };
