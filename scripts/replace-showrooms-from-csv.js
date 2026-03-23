#!/usr/bin/env node

/* eslint-disable no-console */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const API_BASE = String(
  process.env.CDB_API_BASE_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    "https://cdb-api.vercel.app",
)
  .trim()
  .replace(/\/+$/, "");

const DEFAULT_CSV =
  "/Users/gauravgrover/Scripts for scraping/cardekho_showrooms_pan_india_20260321_221230.csv";

const cleanText = (value) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toTitleCase = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeBrand = (brand) => {
  const b = cleanText(brand).toLowerCase();
  const map = {
    "maruti suzuki": "Maruti",
    maruti: "Maruti",
    bmw: "BMW",
    "mercedes benz": "Mercedes-Benz",
    "mercedes-benz": "Mercedes-Benz",
    mercedes: "Mercedes-Benz",
    "land rover": "Land Rover",
    landrover: "Land Rover",
    mg: "MG",
    "morris garages": "MG",
    volkswagen: "Volkswagen",
    audi: "Audi",
    hyundai: "Hyundai",
    kia: "Kia",
    tata: "Tata",
    mahindra: "Mahindra",
    skoda: "Skoda",
    toyota: "Toyota",
    honda: "Honda",
    nissan: "Nissan",
    renault: "Renault",
    jeep: "Jeep",
  };
  if (map[b]) return map[b];
  return toTitleCase(b);
};

const displayShowroomName = (name) => {
  const raw = cleanText(name);
  if (!raw) return "";
  const looksSlug = /^[a-z0-9-]+$/i.test(raw) && raw.includes("-");
  if (!looksSlug) return raw;
  return raw
    .split("-")
    .filter(Boolean)
    .map((word) => {
      if (/^[a-z]{1,2}$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
};

const normalizeShowroomKey = (name) =>
  cleanText(name)
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .replace(/&/g, " and ")
    .replace(/\b(showroom|dealer|dealership)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const showroomKey = (brand, showroomName) =>
  `${normalizeBrand(brand).toLowerCase()}|${normalizeShowroomKey(showroomName)}`;

const sanitizeAddress = (raw) => {
  let s = String(raw ?? "");
  s = s.replace(/<[^>]*>/g, " ");
  s = s.replace(/&amp;/gi, "&");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/[;,\-\s]+$/g, "").trim();
  return s;
};

const inferCityFromAddress = (address) => {
  const raw = cleanText(address);
  if (!raw) return "Unknown";
  const parts = raw
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean);

  if (!parts.length) return "Unknown";

  const stripPin = (text) =>
    cleanText(String(text || "").replace(/\b\d{6}\b/g, ""));

  // Most addresses are "... city, state 560001".
  let candidate = stripPin(parts[Math.max(0, parts.length - 2)]);
  if (!candidate && parts.length >= 3) {
    candidate = stripPin(parts[parts.length - 3]);
  }
  if (!candidate) candidate = stripPin(parts[parts.length - 1]);
  if (!candidate) return "Unknown";

  return toTitleCase(candidate);
};

const hashHex = (value) =>
  crypto.createHash("md5").update(String(value)).digest("hex");

const makeShowroomId = (seed, usedIds) => {
  let counter = 0;
  while (counter < 10000) {
    const digest = hashHex(`${seed}|${counter}`);
    const id = `SH-IND-${digest.slice(0, 10).toUpperCase()}`;
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
    counter += 1;
  }
  throw new Error(`Unable to generate unique showroomId for seed: ${seed}`);
};

const makeMobile = (seed, usedMobiles) => {
  let num =
    (BigInt(`0x${hashHex(seed).slice(0, 12)}`) % 4000000000n) + 6000000000n;

  for (let i = 0; i < 50000; i += 1) {
    const mobile = String(num);
    if (!usedMobiles.has(mobile)) {
      usedMobiles.add(mobile);
      return mobile;
    }
    num += 1n;
    if (num > 9999999999n) num = 6000000000n;
  }
  throw new Error(`Unable to generate unique mobile for seed: ${seed}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url, options = {}, retries = 3) => {
  let attempt = 0;
  while (attempt <= retries) {
    const response = await fetch(url, options);
    const bodyText = await response.text();
    let parsed;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      parsed = { raw: bodyText };
    }

    if (response.ok) return parsed;

    const message =
      parsed?.message ||
      parsed?.error ||
      parsed?.raw ||
      `HTTP ${response.status}`;
    const shouldRetry = response.status >= 500 || response.status === 429;
    if (!shouldRetry || attempt === retries) {
      const error = new Error(message);
      error.status = response.status;
      error.payload = parsed;
      throw error;
    }

    await sleep(300 * (attempt + 1));
    attempt += 1;
  }
  throw new Error("Unexpected fetch retry failure");
};

const fetchAllShowrooms = async () => {
  const all = [];
  const limit = 1000;
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const url = `${API_BASE}/api/showrooms?limit=${limit}&skip=${skip}`;
    const payload = await fetchJson(url, { method: "GET" });
    const data = Array.isArray(payload?.data) ? payload.data : [];
    total = Number(payload?.count || data.length || 0);
    all.push(...data);
    skip += data.length;
    if (!data.length) break;
  }

  return all;
};

const parseCsvRows = (csvPath) => {
  const workbook = xlsx.readFile(csvPath, { raw: false, cellDates: false });
  const sheet = workbook.SheetNames[0];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheet], {
    defval: "",
    raw: false,
    blankrows: false,
  });
};

const normalizeCsvRows = (rows) => {
  const normalized = [];
  const stats = { skippedInvalid: 0 };

  rows.forEach((row, index) => {
    const brand = normalizeBrand(row["Brand Name"] || row.brand || row.Brand || "");
    const showroomNameRaw = row["Showroom Name"] || row.showroomName || row.name || "";
    const showroomName = displayShowroomName(showroomNameRaw);
    const address = sanitizeAddress(row.Address || row.address || "");
    const normalizedKey = normalizeShowroomKey(showroomNameRaw || showroomName);

    if (!brand || !normalizedKey) {
      stats.skippedInvalid += 1;
      return;
    }

    normalized.push({
      rowIndex: index + 1,
      key: `${brand.toLowerCase()}|${normalizedKey}|row:${index + 1}`,
      brand,
      name: showroomName || showroomNameRaw,
      address,
      city: inferCityFromAddress(address),
    });
  });

  return {
    rows: normalized,
    stats,
  };
};

const buildExistingKeyMap = (existingShowrooms) => {
  const byKey = new Map();

  const add = (key, showroom) => {
    if (!key) return;
    const current = byKey.get(key);
    // Prefer active record when duplicates exist.
    const currentActive = String(current?.status || "").toLowerCase() === "active";
    const nextActive = String(showroom?.status || "").toLowerCase() === "active";
    if (!current || (!currentActive && nextActive)) {
      byKey.set(key, showroom);
    }
  };

  existingShowrooms.forEach((showroom) => {
    const showroomBrands = Array.isArray(showroom?.brands) && showroom.brands.length
      ? showroom.brands
      : [showroom?.brand || ""];
    const names = [showroom?.name, showroom?.businessName]
      .map((value) => cleanText(value))
      .filter(Boolean);
    showroomBrands.forEach((brand) => {
      names.forEach((name) => add(showroomKey(brand, name), showroom));
    });
  });

  return byKey;
};

const runConcurrent = async (items, worker, concurrency = 12) => {
  const queue = [...items];
  const results = [];
  const workers = new Array(Math.max(1, concurrency)).fill(null).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) continue;
      const result = await worker(item);
      results.push(result);
    }
  });
  await Promise.all(workers);
  return results;
};

const parseArgs = (argv) => {
  const out = { csv: DEFAULT_CSV, apply: false, concurrency: 12 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--csv" && argv[i + 1]) out.csv = argv[++i];
    else if (arg === "--apply") out.apply = true;
    else if (arg === "--concurrency" && argv[i + 1]) {
      out.concurrency = Number(argv[++i]) || 12;
    }
  }
  return out;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.csv)) {
    throw new Error(`CSV not found: ${args.csv}`);
  }

  console.log(`Using API: ${API_BASE}`);
  console.log(`Reading CSV: ${args.csv}`);
  const parsedRows = parseCsvRows(args.csv);
  const { rows: csvRows, stats: csvStats } = normalizeCsvRows(parsedRows);

  console.log(`CSV rows: ${parsedRows.length} | normalized rows: ${csvRows.length} | skipped invalid: ${csvStats.skippedInvalid}`);

  const existingShowrooms = await fetchAllShowrooms();
  console.log(`Fetched existing showrooms: ${existingShowrooms.length}`);

  const usedShowroomIds = new Set(
    existingShowrooms.map((item) => cleanText(item?.showroomId)).filter(Boolean),
  );
  const usedMobiles = new Set(
    existingShowrooms.map((item) => cleanText(item?.mobile)).filter(Boolean),
  );

  const creates = [];

  csvRows.forEach((row, index) => {
    const seed = `${row.key}|${index}`;
    creates.push({
      key: row.key,
      payload: {
        showroomId: makeShowroomId(seed, usedShowroomIds),
        name: row.name,
        businessName: row.name,
        mobile: makeMobile(seed, usedMobiles),
        address: row.address || `${row.brand} ${row.name}`,
        city: row.city || "Unknown",
        businessType: "Dealership",
        brands: [row.brand],
        commissionRate: 0,
        status: "Active",
      },
    });
  });

  const deactivationCandidates = existingShowrooms.filter((item) => {
    const status = cleanText(item?.status).toLowerCase();
    if (status === "inactive" || status === "deactivated") return false;
    return Boolean(item?._id);
  });
  const deactivations = deactivationCandidates.map((item) => ({
    id: String(item._id),
    showroomId: item.showroomId,
    name: item.name,
  }));

  console.log("Plan:");
  console.log(`- Create new from CSV: ${creates.length}`);
  console.log(`- Deactivate all current non-inactive old: ${deactivations.length}`);

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to execute.");
    return;
  }

  const failures = [];

  console.log("\nDeactivating all current active records...");
  let deactivatedCount = 0;
  await runConcurrent(
    deactivations,
    async (item) => {
      try {
        await fetchJson(`${API_BASE}/api/showrooms/${item.id}`, {
          method: "DELETE",
        });
        deactivatedCount += 1;
      } catch (error) {
        failures.push({
          phase: "deactivate",
          id: item.id,
          showroomId: item.showroomId,
          message: error.message,
        });
      }
      return null;
    },
    args.concurrency,
  );
  console.log(`Deactivated: ${deactivatedCount}/${deactivations.length}`);

  console.log("\nCreating new records...");
  let createdCount = 0;
  await runConcurrent(
    creates,
    async (item, idx) => {
      try {
        await fetchJson(`${API_BASE}/api/showrooms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        createdCount += 1;
      } catch (error) {
        const rawMessage = String(error.message || "");
        // One-time retry with fresh unique IDs in case of unexpected collisions.
        if (
          /showroomId|mobile number already exists/i.test(rawMessage)
        ) {
          const retrySeed = `${item.key}|retry|${Date.now()}|${Math.random()}`;
          const retryPayload = {
            ...item.payload,
            showroomId: makeShowroomId(retrySeed, usedShowroomIds),
            mobile: makeMobile(retrySeed, usedMobiles),
          };
          try {
            await fetchJson(`${API_BASE}/api/showrooms`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(retryPayload),
            });
            createdCount += 1;
            return null;
          } catch (retryError) {
            failures.push({
              phase: "create-retry",
              key: item.key,
              showroomId: retryPayload.showroomId,
              message: retryError.message,
            });
            return null;
          }
        }
        failures.push({
          phase: "create",
          key: item.key,
          showroomId: item.payload.showroomId,
          message: error.message,
        });
      }
      return null;
    },
    args.concurrency,
  );
  console.log(`Created: ${createdCount}/${creates.length}`);

  const summary = {
    csvRows: parsedRows.length,
    csvUniqueRows: csvRows.length,
    createPlanned: creates.length,
    createdCount,
    deactivatePlanned: deactivations.length,
    deactivatedCount,
    failures: failures.length,
  };
  console.log("\nSummary:", summary);

  if (failures.length) {
    const outDir = path.resolve(process.cwd(), "migration_analysis");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
    const outFile = path.join(outDir, `showroom_replace_failures_${stamp}.json`);
    fs.writeFileSync(outFile, JSON.stringify(failures, null, 2), "utf-8");
    console.log(`Failures written to: ${outFile}`);
  }
};

main().catch((error) => {
  console.error("replace-showrooms-from-csv failed:", error.message);
  process.exit(1);
});
