#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const registryPath = path.join(ROOT, "canvas", "aciV2CanvasRegistry.js");
const inlineRendererPath = path.join(ROOT, "chat", "AciV2InlineRenderer.jsx");

const REQUIRED_CANVAS_TYPES = [
  "score_insight_canvas",
  "pricelist_canvas",
  "price_breakup_canvas",
  "features_canvas",
  "feature_answer_canvas",
  "comparison_canvas",
  "recommendation_results_canvas",
  "similar_cars_canvas",
  "color_studio_canvas",
  "emi_calculator_canvas",
  "aci_quotation_canvas",
];

const REQUIRED_INLINE_TYPES = [
  "score_insight_summary",
  "feature_answer_card",
  "price_summary_card",
  "emi_answer_card",
  "quotation_lead_card",
  "recommendation_mini_card",
  "similar_cars_summary",
];

const read = (filePath) => fs.readFileSync(filePath, "utf8");

const extractObjectKeys = (source, objectName) => {
  const start = source.indexOf(objectName);
  if (start < 0) return [];
  const open = source.indexOf("{", start);
  if (open < 0) return [];

  let depth = 0;
  let end = open;
  for (; end < source.length; end += 1) {
    if (source[end] === "{") depth += 1;
    if (source[end] === "}") depth -= 1;
    if (depth === 0) break;
  }

  const body = source.slice(open + 1, end);
  const keys = new Set();
  const keyPattern = /(?:^|[\n,])\s*([A-Za-z0-9_]+)\s*:/g;
  let match;
  while ((match = keyPattern.exec(body))) {
    keys.add(match[1]);
  }
  return [...keys].sort();
};

const registrySource = read(registryPath);
const inlineSource = read(inlineRendererPath);

const canvasMappings = extractObjectKeys(registrySource, "ACI_V2_CANVAS_TYPE_TO_SCREEN");
const inlineRenderers = extractObjectKeys(inlineSource, "INLINE_RENDERERS");

const canvasSet = new Set(canvasMappings);
const inlineSet = new Set(inlineRenderers);

const canvasCoverage = REQUIRED_CANVAS_TYPES.map((type) => ({
  type,
  supported: canvasSet.has(type),
}));

const inlineCoverage = REQUIRED_INLINE_TYPES.map((type) => ({
  type,
  supported: inlineSet.has(type),
}));

const missingCanvas = canvasCoverage.filter((item) => !item.supported);
const missingInline = inlineCoverage.filter((item) => !item.supported);

const report = {
  status: missingCanvas.length || missingInline.length ? "missing" : "ok",
  canvasMappings,
  inlineRenderers,
  required: {
    canvas: canvasCoverage,
    inline: inlineCoverage,
  },
  missing: {
    canvas: missingCanvas.map((item) => item.type),
    inline: missingInline.map((item) => item.type),
  },
};

console.log(JSON.stringify(report, null, 2));

if (missingCanvas.length || missingInline.length) {
  process.exitCode = 1;
}
