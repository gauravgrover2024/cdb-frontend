#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const DEFAULT_CLEAN = '/Users/gauravgrover/Scripts for scraping/cardekho_showrooms_pan_india_20260314_120827.csv';
const DEFAULT_COMPLETE = '/Users/gauravgrover/Scripts for scraping/cardekho_showrooms_pan_india_20260314_115317.csv';

const cleanText = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toTitleCase = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeBrand = (brand) => {
  const b = cleanText(brand).toLowerCase();
  const map = {
    'maruti suzuki': 'Maruti',
    maruti: 'Maruti',
    bmw: 'Bmw',
    'mercedes benz': 'Mercedes-Benz',
    mercedes: 'Mercedes-Benz',
    'land rover': 'Land Rover',
    volkswagen: 'Volkswagen',
  };
  if (map[b]) return map[b];
  return toTitleCase(b);
};

const displayShowroomName = (name) => {
  const raw = cleanText(name);
  if (!raw) return '';
  const looksSlug = /^[a-z0-9-]+$/i.test(raw) && raw.includes('-');
  if (!looksSlug) return raw;
  return raw
    .split('-')
    .filter(Boolean)
    .map((w) => {
      if (/^[a-z]{1,2}$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
};

const normalizeShowroomKey = (name) =>
  cleanText(name)
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\b(showroom|dealer|dealership)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const BAD_ADDRESS_PATTERNS = [
  /<\/?meta/i,
  /st\.json/i,
  /content\s*=\s*"/i,
  /<[^>]+>/i,
  /\bscript\b/i,
  /https?:\/\//i,
  /www\./i,
  /\{.*\}/,
];

const sanitizeAddress = (raw, brand = '') => {
  let s = String(raw ?? '');
  s = s.replace(/<[^>]*>/g, ' ');
  s = s.replace(/&amp;/gi, '&');
  s = s.replace(/&nbsp;/gi, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  // Scraper artifact cleanups
  s = s.replace(/st\.json.*$/i, '').trim();
  s = s.replace(/\bmeta\b.*$/i, '').trim();
  s = s.replace(/\bcontent\s*=\s*".*$/i, '').trim();

  // Keep left part when scraper appended brand showroom descriptor
  const brandPart = cleanText(brand).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  if (brandPart) {
    const re = new RegExp(`\\s*-\\s*${brandPart}\\s+showroom.*$`, 'i');
    s = s.replace(re, '').trim();
  }
  s = s.replace(/\s*-\s*[A-Za-z\s&.-]+showroom.*$/i, '').trim();

  // Trim trailing punctuation noise
  s = s.replace(/[;,\-\s]+$/g, '').trim();
  return s;
};

const isBadAddress = (address) => {
  const a = cleanText(address);
  if (!a) return true;
  if (BAD_ADDRESS_PATTERNS.some((re) => re.test(a))) return true;
  if (a.length < 12) return true;
  if (!/[a-z]/i.test(a)) return true;
  return false;
};

const scoreAddress = (address) => {
  if (isBadAddress(address)) return 0;
  const a = cleanText(address);
  let score = 10;
  if (/\b\d{6}\b/.test(a)) score += 3;
  const commas = (a.match(/,/g) || []).length;
  score += Math.min(commas, 5);
  if (a.length > 40) score += 2;
  if (/\b(road|rd|street|st|sector|phase|nagar|colony|city|district|state)\b/i.test(a)) score += 2;
  return score;
};

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--clean' && argv[i + 1]) out.clean = argv[++i];
    else if (arg === '--complete' && argv[i + 1]) out.complete = argv[++i];
    else if (arg === '--out' && argv[i + 1]) out.out = argv[++i];
  }
  return out;
};

const readRows = (filePath) => {
  const wb = xlsx.readFile(filePath, { raw: false, cellDates: false });
  const sheet = wb.SheetNames[0];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(wb.Sheets[sheet], {
    defval: '',
    raw: false,
    blankrows: false,
  });
};

const keyOf = (brand, showroomName) => `${normalizeBrand(brand).toLowerCase()}|${normalizeShowroomKey(showroomName)}`;

const run = () => {
  const args = parseArgs(process.argv.slice(2));
  const cleanPath = args.clean || DEFAULT_CLEAN;
  const completePath = args.complete || DEFAULT_COMPLETE;

  if (!fs.existsSync(cleanPath)) throw new Error(`Clean file not found: ${cleanPath}`);
  if (!fs.existsSync(completePath)) throw new Error(`Complete file not found: ${completePath}`);

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const outPath = args.out || path.resolve(process.cwd(), `migration_analysis/cardekho_showrooms_pan_india_merged_${timestamp}.csv`);
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const cleanRows = readRows(cleanPath);
  const completeRows = readRows(completePath);

  const merged = new Map();
  const bestAddressByKey = new Map();
  const stats = {
    cleanRows: cleanRows.length,
    completeRows: completeRows.length,
    seededFromClean: 0,
    addedFromComplete: 0,
    recoveredAddressFromComplete: 0,
    badAddressesFromCompleteIgnored: 0,
    blankAddressAfterMerge: 0,
  };

  const setBestAddress = (key, address) => {
    const score = scoreAddress(address);
    if (!score) return;
    const current = bestAddressByKey.get(key);
    if (!current || score > current.score) {
      bestAddressByKey.set(key, { address: cleanText(address), score });
    }
  };

  for (const row of cleanRows) {
    const brand = normalizeBrand(row['Brand Name'] || row.brand || row.Brand || '');
    const showroomNameRaw = row['Showroom Name'] || row.showroomName || row.name || '';
    const showroomName = displayShowroomName(showroomNameRaw);
    const address = sanitizeAddress(row.Address || row.address || '', brand);
    const key = keyOf(brand, showroomNameRaw || showroomName);
    if (!brand || !normalizeShowroomKey(showroomNameRaw || showroomName)) continue;

    merged.set(key, {
      'Brand Name': brand,
      'Showroom Name': showroomName || showroomNameRaw,
      Address: address,
      _source: 'clean',
      _score: scoreAddress(address),
    });
    setBestAddress(key, address);
    stats.seededFromClean += 1;
  }

  // Build best address candidates from complete rows
  const completeBestByKey = new Map();
  for (const row of completeRows) {
    const brand = normalizeBrand(row['Brand Name'] || row.brand || row.Brand || '');
    const showroomNameRaw = row['Showroom Name'] || row.showroomName || row.name || '';
    const showroomName = displayShowroomName(showroomNameRaw);
    const key = keyOf(brand, showroomNameRaw || showroomName);
    if (!brand || !normalizeShowroomKey(showroomNameRaw || showroomName)) continue;

    const rawAddress = row.Address || row.address || '';
    const address = sanitizeAddress(rawAddress, brand);
    const score = scoreAddress(address);

    const current = completeBestByKey.get(key);
    if (!current || score > current.score) {
      completeBestByKey.set(key, {
        brand,
        showroomName: showroomName || showroomNameRaw,
        address,
        score,
      });
    }

    if (!score) stats.badAddressesFromCompleteIgnored += 1;
    if (score) setBestAddress(key, address);
  }

  // Add only missing showrooms from complete file
  for (const [key, item] of completeBestByKey.entries()) {
    if (merged.has(key)) continue;

    let address = item.address;
    let score = item.score;
    if (!score) {
      const recovered = bestAddressByKey.get(key);
      if (recovered) {
        address = recovered.address;
        score = recovered.score;
        stats.recoveredAddressFromComplete += 1;
      }
    }

    merged.set(key, {
      'Brand Name': item.brand,
      'Showroom Name': item.showroomName,
      Address: score ? address : '',
      _source: 'complete',
      _score: score,
    });
    stats.addedFromComplete += 1;
  }

  const outputRows = [...merged.values()]
    .map((row) => {
      if (!cleanText(row.Address)) {
        stats.blankAddressAfterMerge += 1;
      }
      const fallbackAddress = `${row['Brand Name']} ${row['Showroom Name']}`.trim();
      return {
        'Brand Name': row['Brand Name'],
        'Showroom Name': row['Showroom Name'],
        Address: cleanText(row.Address) || fallbackAddress,
      };
    })
    .sort((a, b) => {
      const br = String(a['Brand Name']).localeCompare(String(b['Brand Name']));
      if (br !== 0) return br;
      return String(a['Showroom Name']).localeCompare(String(b['Showroom Name']));
    });

  const ws = xlsx.utils.json_to_sheet(outputRows, {
    header: ['Brand Name', 'Showroom Name', 'Address'],
  });
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Showrooms');
  xlsx.writeFile(wb, outPath, { bookType: 'csv' });

  const brandCounter = new Map();
  for (const row of outputRows) {
    const b = row['Brand Name'];
    brandCounter.set(b, (brandCounter.get(b) || 0) + 1);
  }

  const topBrands = [...brandCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([brand, count]) => ({ brand, count }));

  console.log('Merged CSV created:', outPath);
  console.log({
    ...stats,
    finalRows: outputRows.length,
    totalBrands: brandCounter.size,
    marutiRows: brandCounter.get('Maruti') || 0,
    mahindraRows: brandCounter.get('Mahindra') || 0,
  });
  console.log('Top brands:', topBrands);
};

try {
  run();
} catch (error) {
  console.error('mergeCardekhoShowroomsCsv failed:', error.message);
  process.exit(1);
}
