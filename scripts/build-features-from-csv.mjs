// scripts/build-features-from-csv.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ADJUST THIS if your CSV folder is different
const CSV_DIR = "/Users/gauravgrover/variant_features";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, "..", "src", "data", "features");
const VARIANTS_OUT = path.join(OUTPUT_DIR, "features_variants.json");
const DETAILS_OUT = path.join(OUTPUT_DIR, "features_details.json");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// naive CSV parser (good enough for your files: no quoted commas)
function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferMakeAndModel(filename) {
  // e.g. maruti_swift.csv → Maruti / Swift
  const base = path.basename(filename).replace(/\.csv$/i, "");
  const parts = base.split("_");
  if (parts.length >= 2) {
    const make = parts[0];
    const model = parts.slice(1).join(" ");
    return {
      make: make.charAt(0).toUpperCase() + make.slice(1),
      model: model
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" "),
    };
  }
  return { make: "Unknown", model: base };
}

function inferFuel(variantName) {
  const v = variantName.toLowerCase();
  if (v.includes("cng")) return "CNG";
  if (v.includes("strong hybrid")) return "Strong Hybrid";
  return "Petrol"; // reasonable default for your current data
}

function inferTransmission(variantName) {
  const v = variantName.toUpperCase();
  if (v.includes("AMT")) return "AMT";
  if (v.includes(" AT")) return "AT";
  return "MT";
}

function extractNumber(str) {
  if (!str) return null;
  const m = String(str).match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

function buildVariantDataFromCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { headers, rows } = parseCsv(raw);
  if (headers.length < 2) return { variants: [], details: [] };

  const { make, model } = inferMakeAndModel(filePath);

  // first column is Feature, rest are variants
  const featureCol = headers[0];
  const variantHeaders = headers.slice(1);

  const variantDetailsMap = new Map(); // id -> { ...VariantDetail }
  const variantSummaryMap = new Map(); // id -> summary

  // init structures
  variantHeaders.forEach((vh) => {
    const id = slugify(vh);
    const fuel = inferFuel(vh);
    const transmission = inferTransmission(vh);

    variantDetailsMap.set(id, {
      id,
      make,
      model,
      variant: vh,
      features: [],
    });

    variantSummaryMap.set(id, {
      id,
      make,
      model,
      variant: vh,
      fuel,
      transmission,
      tags: [],
    });
  });

  // helper to map feature name → category
  function mapCategory(featureName) {
    const f = featureName.toLowerCase();
    if (
      f.includes("airbag") ||
      f.includes("abs") ||
      f.includes("ebd") ||
      f.includes("ncap") ||
      f.includes("tpms") ||
      f.includes("stability") ||
      f.includes("hill") ||
      f.includes("brake") ||
      f.includes("isofix") ||
      f.includes("impact sensing") ||
      f.includes("traction")
    ) {
      return "Safety";
    }
    if (
      f.includes("air conditioner") ||
      f.includes("climate") ||
      f.includes("ac vents") ||
      f.includes("power window") ||
      f.includes("steering") ||
      f.includes("cruise") ||
      f.includes("seat") ||
      f.includes("arm rest") ||
      f.includes("rear curtain") ||
      f.includes("ventilated") ||
      f.includes("keyless") ||
      f.includes("engine start")
    ) {
      return "Comfort & Convenience";
    }
    if (
      f.includes("alloy") ||
      f.includes("wheel size") ||
      f.includes("tyre") ||
      f.includes("sunroof") ||
      f.includes("roof rail") ||
      f.includes("spoiler") ||
      f.includes("headlamp") ||
      f.includes("lamp") ||
      f.includes("drls") ||
      f.includes("fog") ||
      f.includes("wiper") ||
      f.includes("defogger")
    ) {
      return "Exterior";
    }
    if (
      f.includes("radio") ||
      f.includes("speaker") ||
      f.includes("touchscreen") ||
      f.includes("android auto") ||
      f.includes("apple carplay") ||
      f.includes("bluetooth") ||
      f.includes("audio") ||
      f.includes("infotainment")
    ) {
      return "Infotainment";
    }
    if (
      f.includes("live location") ||
      f.includes("ota") ||
      f.includes("google alexa") ||
      f.includes("smartwatch") ||
      f.includes("geo-fence") ||
      f.includes("remote") ||
      f.includes("connected") ||
      f.includes("sos") ||
      f.includes("e-call") ||
      f.includes("valet") ||
      f.includes("tow away")
    ) {
      return "Connected";
    }
    return "Others";
  }

  rows.forEach((row) => {
    const featureName = row[featureCol];
    if (!featureName) return;
    const category = mapCategory(featureName);

    variantHeaders.forEach((vh, idx) => {
      const id = slugify(vh);
      const detail = variantDetailsMap.get(id);
      if (!detail) return;
      const value = row[vh] ?? row[headers[idx + 1]] ?? "";
      const trimmedValue = String(value || "").trim();
      if (!trimmedValue) return;

      detail.features.push({
        category,
        name: featureName,
        value: trimmedValue,
      });
    });

    // tags: some important rows
    variantHeaders.forEach((vh) => {
      const id = slugify(vh);
      const summary = variantSummaryMap.get(id);
      if (!summary) return;
      const value = (row[vh] ?? "").toString().trim();
      const lowName = featureName.toLowerCase();

      if (
        lowName.includes("no. of airbags") ||
        lowName.includes("no. of airbag")
      ) {
        const n = extractNumber(value);
        if (n) summary.tags.push(`${n} Airbags`);
      }

      if (lowName.includes("global ncap safety rating")) {
        summary.tags.push(`NCAP ${value}`);
      }

      if (lowName.includes("touchscreen size")) {
        summary.tags.push(`${value} Touchscreen`);
      }

      if (
        lowName.includes("panoramic sunroof") ||
        lowName.includes("sunroof")
      ) {
        if (!summary.tags.includes("Sunroof")) summary.tags.push("Sunroof");
      }

      if (
        lowName.includes("android auto") &&
        lowName.includes("apple carplay")
      ) {
        summary.tags.push("Android Auto & CarPlay");
      }

      if (
        lowName.includes("live location") ||
        lowName.includes("ota") ||
        lowName.includes("google alexa")
      ) {
        if (!summary.tags.includes("Connected Car")) {
          summary.tags.push("Connected Car");
        }
      }
    });
  });

  return {
    variants: Array.from(variantSummaryMap.values()),
    details: Array.from(variantDetailsMap.values()),
  };
}

function main() {
  const files = fs
    .readdirSync(CSV_DIR)
    .filter((f) => f.toLowerCase().endsWith(".csv"));

  const allVariants = [];
  const allDetails = [];

  files.forEach((file) => {
    const fullPath = path.join(CSV_DIR, file);
    console.log("Processing:", fullPath);
    const { variants, details } = buildVariantDataFromCsv(fullPath);
    allVariants.push(...variants);
    allDetails.push(...details);
  });

  // Group variants by model key (like our DUMMY_VARIANTS keys)
  const variantsByModel = {};
  allVariants.forEach((v) => {
    const key = v.model.toLowerCase().replace(/\s+/g, "-");
    if (!variantsByModel[key]) variantsByModel[key] = [];
    variantsByModel[key].push(v);
  });

  // Sort variants within each model alphabetically by variant name
  Object.values(variantsByModel).forEach((arr) => {
    arr.sort((a, b) => a.variant.localeCompare(b.variant));
  });

  // Details as id -> detail map
  const detailsById = {};
  allDetails.forEach((d) => {
    detailsById[d.id] = d;
  });

  fs.writeFileSync(
    VARIANTS_OUT,
    JSON.stringify(variantsByModel, null, 2),
    "utf8",
  );
  fs.writeFileSync(DETAILS_OUT, JSON.stringify(detailsById, null, 2), "utf8");

  console.log("Written:");
  console.log("  ", VARIANTS_OUT);
  console.log("  ", DETAILS_OUT);
}

main();
