const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const LOAN_ROOT = path.join(ROOT, "src/modules/loans/components");

const FILES = [
  path.join(LOAN_ROOT, "LoanFormWithSteps.jsx"),
  ...walk(path.join(LOAN_ROOT, "loan-form")).filter((file) => file.endsWith(".jsx")),
];

const STAGE_RULES = [
  { match: "/customer-profile/", stage: "customer-profile", order: 1 },
  { match: "/pre-file/", stage: "pre-file", order: 2 },
  { match: "/loan-approval/", stage: "loan-approval", order: 3 },
  { match: "/post-file/", stage: "post-file", order: 4 },
  { match: "/vehicle-delivery/", stage: "vehicle-delivery", order: 5 },
  { match: "/payout/", stage: "payout", order: 6 },
  { match: "/LoanFormWithSteps.jsx", stage: "system-hidden", order: 7 },
];

const INPUT_PATTERNS = [
  { pattern: /<Select\b/, type: "select" },
  { pattern: /<DatePicker\b/, type: "date" },
  { pattern: /<TimePicker\b/, type: "time" },
  { pattern: /<InputNumber\b/, type: "number" },
  { pattern: /<AutoComplete\b/, type: "autocomplete" },
  { pattern: /<Switch\b/, type: "switch" },
  { pattern: /<Checkbox\b/, type: "checkbox" },
  { pattern: /<Radio(?:\.Group)?\b/, type: "radio" },
  { pattern: /<Upload\b/, type: "upload" },
  { pattern: /<TextArea\b/, type: "textarea" },
  { pattern: /<textarea\b/, type: "textarea" },
  { pattern: /<Input\b/, type: "input" },
  { pattern: /<input\b/, type: "input" },
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

function getStage(filePath) {
  const normalized = filePath.replaceAll(path.sep, "/");
  return STAGE_RULES.find((rule) => normalized.includes(rule.match)) || {
    stage: "unassigned",
    order: 999,
  };
}

function getComponentName(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function getLabel(attrs, name) {
  const quoted = attrs.match(/\blabel\s*=\s*"([^"]+)"/);
  if (quoted) return quoted[1];

  const braceString = attrs.match(/\blabel\s*=\s*\{\s*"([^"]+)"\s*\}/);
  if (braceString) return braceString[1];

  const block = attrs.match(/\blabel\s*=\s*\{([\s\S]*?)\}/);
  if (!block) return name;

  const text = block[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]+\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text || name;
}

function getInputType(snippet, attrs) {
  if (/\bhidden\b/.test(attrs)) return "hidden";
  for (const entry of INPUT_PATTERNS) {
    if (entry.pattern.test(snippet)) return entry.type;
  }
  return "unknown";
}

function getOptions(snippet) {
  const options = new Set();
  let match;

  const optionTag = /<Select\.Option[^>]*value="([^"]+)"[^>]*>([\s\S]*?)<\/Select\.Option>/g;
  while ((match = optionTag.exec(snippet))) {
    options.add(match[1] || match[2].replace(/<[^>]+>/g, " ").trim());
  }

  const optionObject = /label:\s*"([^"]+)"\s*,\s*value:\s*"([^"]+)"/g;
  while ((match = optionObject.exec(snippet))) {
    options.add(match[2] || match[1]);
  }

  return Array.from(options);
}

function extractItems(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const items = [];
  const formItemRegex = /<Form\.Item\b([\s\S]*?)>/g;
  let match;

  while ((match = formItemRegex.exec(content))) {
    const attrs = match[1];
    const nameMatch = attrs.match(/\bname\s*=\s*"([^"]+)"/);
    if (!nameMatch) continue;

    const name = nameMatch[1];
    const start = match.index;
    const line = content.slice(0, start).split("\n").length;
    const tail = content.slice(start, start + 800);
    const stage = getStage(filePath);

    items.push({
      field: name,
      label: getLabel(attrs, name),
      stage: stage.stage,
      stageOrder: stage.order,
      component: getComponentName(filePath),
      file: filePath,
      line,
      inputType: getInputType(tail, attrs),
      hidden: /\bhidden\b/.test(attrs),
      options: getOptions(tail),
    });
  }

  return items;
}

const fields = FILES.flatMap(extractItems)
  .sort((a, b) => {
    if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder;
    if (a.component !== b.component) return a.component.localeCompare(b.component);
    return a.field.localeCompare(b.field);
  });

const uniqueFields = new Map();
for (const entry of fields) {
  if (!uniqueFields.has(entry.field)) {
    uniqueFields.set(entry.field, {
      field: entry.field,
      primaryLabel: entry.label,
      stages: [entry.stage],
      components: [entry.component],
      files: [entry.file],
      inputTypes: entry.inputType === "unknown" ? [] : [entry.inputType],
      hidden: entry.hidden,
      options: entry.options,
      firstSeenAt: `${entry.file}:${entry.line}`,
    });
    continue;
  }

  const existing = uniqueFields.get(entry.field);
  existing.stages = uniq(existing.stages.concat(entry.stage));
  existing.components = uniq(existing.components.concat(entry.component));
  existing.files = uniq(existing.files.concat(entry.file));
  existing.inputTypes = uniq(existing.inputTypes.concat(entry.inputType === "unknown" ? [] : [entry.inputType]));
  existing.options = uniq(existing.options.concat(entry.options));
  existing.hidden = existing.hidden && entry.hidden;
}

const byStage = groupBy(fields, (item) => item.stage);
const output = {
  generatedAt: new Date().toISOString(),
  totals: {
    fieldOccurrences: fields.length,
    uniqueFields: uniqueFields.size,
    byStage: Object.fromEntries(
      Object.entries(byStage).map(([stage, items]) => [stage, items.length]),
    ),
  },
  fields,
  uniqueFields: Array.from(uniqueFields.values()),
};

const outDir = path.join(ROOT, "migration_analysis");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "loan_field_catalog.json"),
  JSON.stringify(output, null, 2),
);

const lines = [];
lines.push("# Loan Field Catalog");
lines.push("");
lines.push(`Generated: ${output.generatedAt}`);
lines.push("");
lines.push(`- Field occurrences: ${output.totals.fieldOccurrences}`);
lines.push(`- Unique fields: ${output.totals.uniqueFields}`);
for (const [stage, count] of Object.entries(output.totals.byStage)) {
  lines.push(`- ${stage}: ${count}`);
}
lines.push("");

for (const [stage, items] of Object.entries(byStage).sort((a, b) => {
  const ao = itemsOrder(a[0]);
  const bo = itemsOrder(b[0]);
  return ao - bo;
})) {
  lines.push(`## ${stage}`);
  for (const item of items) {
    const meta = [
      item.component,
      item.inputType,
      item.hidden ? "hidden" : null,
      item.options.length ? `options=${item.options.join(" | ")}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`- ${item.field} | ${item.label} | ${meta} | ${item.file}:${item.line}`);
  }
  lines.push("");
}

fs.writeFileSync(path.join(outDir, "loan_field_catalog.md"), lines.join("\n"));

console.log(
  JSON.stringify(
    {
      output: path.join(outDir, "loan_field_catalog.json"),
      uniqueFields: output.totals.uniqueFields,
      occurrences: output.totals.fieldOccurrences,
      byStage: output.totals.byStage,
    },
    null,
    2,
  ),
);

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function itemsOrder(stage) {
  const found = STAGE_RULES.find((rule) => rule.stage === stage);
  return found ? found.order : 999;
}
