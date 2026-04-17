import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildUrl } from "../../../../api/client";
import {
  PHOTO_BUCKETS,
  INSPECTION_SECTIONS,
  calcOverallScore,
  isPositiveInspectionStatus,
  normalizeStatusList,
} from "./constants";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 36;

function safeText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function sanitizeFileName(value = "report") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "report";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStoredFileSrc(file) {
  return file?.url || file?.thumbUrl || file?.preview || "";
}

function getEvidenceTagLabel(file = {}) {
  if (String(file.evidenceTag || "").toLowerCase() === "others") {
    return file.customTagName || "Others";
  }
  return file.evidenceTag || "";
}

function getTaggedEvidenceFile(files = [], aliases = []) {
  const aliasSet = new Set(
    aliases.map((entry) =>
      String(entry || "")
        .trim()
        .toLowerCase(),
    ),
  );
  return files.find((file) =>
    aliasSet.has(
      String(file.evidenceTag || "")
        .trim()
        .toLowerCase(),
    ),
  );
}

function uniqueBy(items = [], getKey) {
  const map = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    if (!key || map.has(key)) return;
    map.set(key, item);
  });
  return Array.from(map.values());
}

function statusLabel(status) {
  const statuses = normalizeStatusList(status);
  if (!statuses.length) return "Not marked";
  return statuses.join(", ");
}

function chunk(items = [], size = 2) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function drawWrappedText(page, text, options) {
  const {
    font,
    x,
    y,
    maxWidth,
    size = 11,
    lineHeight = 14,
    color = rgb(0.12, 0.16, 0.22),
  } = options;
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return y;

  const lines = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[index];
    }
  }
  lines.push(currentLine);

  let currentY = y;
  lines.forEach((line) => {
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  });

  return currentY;
}

function triggerPdfDownload(pdfBytes, fileName) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function convertBlobToPngBytes(blob) {
  if (!blob) return null;

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pngBlob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    return pngBlob ? await pngBlob.arrayBuffer() : null;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image-load-failed"));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const pngBlob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    return pngBlob ? await pngBlob.arrayBuffer() : null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchDocumentBlob(documentLike = {}) {
  if (documentLike?.file instanceof Blob) {
    return documentLike.file;
  }
  const source = documentLike?.url || documentLike?.href || documentLike?.src;
  if (!source) return null;

  const fetchBlobOrThrow = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to fetch file (${response.status})`);
    }
    return response.blob();
  };

  if (String(source).startsWith("data:")) {
    return fetchBlobOrThrow(source);
  }

  try {
    return await fetchBlobOrThrow(source);
  } catch {
    const proxyUrl = buildUrl("/api/upload/file", { url: source });
    return fetchBlobOrThrow(proxyUrl);
  }
}

async function embedImageFromBlob(pdfDoc, blob) {
  if (!blob) return null;
  const mimeType = String(blob.type || "").toLowerCase();
  const rawBytes = await blob.arrayBuffer();

  if (mimeType.includes("png")) {
    return await pdfDoc.embedPng(rawBytes);
  }
  if (mimeType.includes("jpg") || mimeType.includes("jpeg")) {
    return await pdfDoc.embedJpg(rawBytes);
  }

  const converted = await convertBlobToPngBytes(blob);
  if (converted) {
    return await pdfDoc.embedPng(converted);
  }

  return null;
}

function drawImageContained(page, image, frame) {
  const { x, y, width, height } = frame;
  const imageWidth = image.width;
  const imageHeight = image.height;
  const ratio = Math.min(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * ratio;
  const drawHeight = imageHeight * ratio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  page.drawImage(image, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  });
}

function collectReportPhotos(reportLead = {}) {
  const report = reportLead?.inspection?.report || {};
  const itemValues = report.items || {};
  const photoBuckets = report.photoBuckets || {};
  const bulkEvidence = report.bulkEvidence || [];

  const mandatory = PHOTO_BUCKETS.map((bucket) => {
    const bucketFile = (photoBuckets[bucket.key] || [])[0];
    const fallback = getTaggedEvidenceFile(bulkEvidence, [
      bucket.labelEn,
      bucket.key,
    ]);
    const file = bucketFile || fallback || null;
    if (!file) return null;
    return {
      title: bucket.labelEn,
      tag: bucket.labelEn,
      source: getStoredFileSrc(file),
      file,
    };
  }).filter(Boolean);

  const mandatoryTags = new Set(
    PHOTO_BUCKETS.flatMap((bucket) => [
      String(bucket.labelEn || "")
        .trim()
        .toLowerCase(),
      String(bucket.key || "")
        .trim()
        .toLowerCase(),
    ]),
  );

  const fromItems = INSPECTION_SECTIONS.flatMap((section) =>
    section.items.flatMap((item) => {
      const value = itemValues?.[item.key] || {};
      if (
        !normalizeStatusList(value.status).length ||
        isPositiveInspectionStatus(value.status)
      ) {
        return [];
      }
      return (value.photos || [])
        .filter(Boolean)
        .map((file) => ({
          title: item.labelEn,
          tag: item.labelEn,
          source: getStoredFileSrc(file),
          file,
        }));
    }),
  );

  const fromBulk = (bulkEvidence || [])
    .filter(Boolean)
    .map((file) => {
      const tag = String(getEvidenceTagLabel(file) || "")
        .trim()
        .toLowerCase();
      if (!tag || mandatoryTags.has(tag)) return null;
      return {
        title: getEvidenceTagLabel(file),
        tag: getEvidenceTagLabel(file),
        source: getStoredFileSrc(file),
        file,
      };
    })
    .filter(Boolean);

  const defects = uniqueBy([...fromItems, ...fromBulk], (entry) =>
    String(
      entry.file?.publicId ||
        entry.file?.url ||
        entry.file?.preview ||
        `${entry.title}-${entry.tag}`,
    ),
  );

  return {
    mandatory,
    defects,
  };
}

async function addPhotoPages(pdfDoc, title, photos = []) {
  if (!photos.length) return;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const rows = chunk(photos, 2);

  for (const pair of rows) {
    const page = pdfDoc.addPage([A4.width, A4.height]);

    page.drawText(title, {
      x: MARGIN,
      y: A4.height - MARGIN,
      size: 16,
      font: bold,
      color: rgb(0.07, 0.11, 0.16),
    });

    const topOffset = 66;
    const availableHeight = A4.height - MARGIN - topOffset - MARGIN;
    const cardHeight = (availableHeight - 16) / 2;
    const cardWidth = A4.width - MARGIN * 2;

    for (let index = 0; index < pair.length; index += 1) {
      const photo = pair[index];
      const cardTop = A4.height - MARGIN - topOffset - index * (cardHeight + 16);
      const cardBottom = cardTop - cardHeight;

      page.drawRectangle({
        x: MARGIN,
        y: cardBottom,
        width: cardWidth,
        height: cardHeight,
        borderWidth: 1,
        borderColor: rgb(0.82, 0.86, 0.92),
      });

      const imageFrame = {
        x: MARGIN + 12,
        y: cardBottom + 38,
        width: cardWidth - 24,
        height: cardHeight - 70,
      };

      const source = photo.source || getStoredFileSrc(photo.file);
      if (source) {
        try {
          const blob = await fetchDocumentBlob({ url: source });
          const embedded = await embedImageFromBlob(pdfDoc, blob);
          if (embedded) {
            drawImageContained(page, embedded, imageFrame);
          }
        } catch (error) {
          page.drawText("Image unavailable", {
            x: imageFrame.x,
            y: imageFrame.y + imageFrame.height / 2,
            size: 10,
            font,
            color: rgb(0.52, 0.57, 0.64),
          });
        }
      }

      page.drawText(safeText(photo.title, "Photo"), {
        x: MARGIN + 12,
        y: cardBottom + 16,
        size: 11,
        font: bold,
        color: rgb(0.1, 0.15, 0.2),
      });

      if (photo.tag && photo.tag !== photo.title) {
        page.drawText(`Tag: ${photo.tag}`, {
          x: MARGIN + 12,
          y: cardBottom + 4,
          size: 9,
          font,
          color: rgb(0.35, 0.42, 0.5),
        });
      }
    }
  }
}

function addSectionRows(pdfDoc, sectionTitle, rows = [], fonts) {
  if (!rows.length) return;

  let page = pdfDoc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;

  const newPage = () => {
    page = pdfDoc.addPage([A4.width, A4.height]);
    y = A4.height - MARGIN;
  };

  const ensureSpace = (minY = MARGIN + 80) => {
    if (y < minY) {
      newPage();
    }
  };

  page.drawText(sectionTitle, {
    x: MARGIN,
    y,
    size: 15,
    font: fonts.bold,
    color: rgb(0.08, 0.12, 0.18),
  });
  y -= 24;

  rows.forEach((row, index) => {
    ensureSpace(MARGIN + 60);

    if (index % 2 === 0) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 12,
        width: A4.width - MARGIN * 2,
        height: 26,
        color: rgb(0.97, 0.98, 1),
      });
    }

    const labelY = drawWrappedText(page, safeText(row.label), {
      font: fonts.regular,
      x: MARGIN + 8,
      y,
      maxWidth: 292,
      size: 10,
      lineHeight: 12,
      color: rgb(0.13, 0.18, 0.24),
    });

    drawWrappedText(page, safeText(row.status), {
      font: fonts.bold,
      x: MARGIN + 306,
      y,
      maxWidth: 172,
      size: 10,
      lineHeight: 12,
      color: rgb(0.1, 0.14, 0.2),
    });

    drawWrappedText(page, safeText(row.severity), {
      font: fonts.regular,
      x: MARGIN + 485,
      y,
      maxWidth: 70,
      size: 10,
      lineHeight: 12,
      color: rgb(0.28, 0.34, 0.42),
    });

    const consumed = y - labelY;
    y -= Math.max(22, consumed + 8);
  });
}

export async function downloadInspectionReportPdf(reportLead, options = {}) {
  const report = reportLead?.inspection?.report || {};
  const itemValues = report.items || {};
  const inspectionId =
    reportLead?.inspection?.inspectionId || `INS-${Date.now().toString(36)}`;
  const fileName =
    options.fileName || `${sanitizeFileName(inspectionId)}-report.pdf`;

  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const summaryPage = pdfDoc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;

  summaryPage.drawText("Comprehensive Car Inspection Report", {
    x: MARGIN,
    y,
    size: 22,
    font: bold,
    color: rgb(0.06, 0.11, 0.19),
  });
  y -= 30;

  summaryPage.drawText(`Inspection ID: ${inspectionId}`, {
    x: MARGIN,
    y,
    size: 11,
    font: regular,
    color: rgb(0.36, 0.43, 0.53),
  });
  y -= 16;

  const vehicleName = [
    report.makeConfirmation || reportLead?.make,
    report.modelConfirmation || reportLead?.model,
    report.variantConfirmation || reportLead?.variant,
  ]
    .filter(Boolean)
    .join(" ");

  const detailRows = [
    ["Customer", report.customerName || reportLead?.name],
    ["Mobile", reportLead?.mobile],
    ["Vehicle", vehicleName],
    ["Registration", report.registrationNumber || reportLead?.regNo],
    ["Insurance", report.insuranceType || reportLead?.insuranceCategory],
    ["Inspection Date", formatDate(report.generatedAt || reportLead?.updatedAt)],
    ["Verdict", report.verdict || reportLead?.inspection?.verdict || "-"],
    ["Score", `${calcOverallScore(itemValues)}%`],
    [
      "Estimated Refurb",
      `INR ${Number(report.estimatedRefurbCost || 0).toLocaleString("en-IN")}`,
    ],
    [
      "Suggested Buy Price",
      `INR ${Number(report.suggestedBuyPrice || 0).toLocaleString("en-IN")}`,
    ],
  ];

  detailRows.forEach(([label, value]) => {
    summaryPage.drawText(`${label}:`, {
      x: MARGIN,
      y,
      size: 10,
      font: bold,
      color: rgb(0.2, 0.27, 0.37),
    });
    drawWrappedText(summaryPage, safeText(value), {
      font: regular,
      x: MARGIN + 140,
      y,
      maxWidth: A4.width - MARGIN * 2 - 140,
      size: 10,
      lineHeight: 12,
      color: rgb(0.16, 0.2, 0.28),
    });
    y -= 16;
  });

  y -= 6;
  summaryPage.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4.width - MARGIN, y },
    thickness: 1,
    color: rgb(0.83, 0.87, 0.93),
  });
  y -= 18;

  summaryPage.drawText("Overall Remarks", {
    x: MARGIN,
    y,
    size: 12,
    font: bold,
    color: rgb(0.1, 0.14, 0.2),
  });
  y -= 16;

  y = drawWrappedText(
    summaryPage,
    safeText(report.overallRemarks, "No additional remarks."),
    {
      font: regular,
      x: MARGIN,
      y,
      maxWidth: A4.width - MARGIN * 2,
      size: 10,
      lineHeight: 13,
      color: rgb(0.2, 0.25, 0.32),
    },
  );

  const sectionRows = INSPECTION_SECTIONS.map((section) => {
    const rows = section.items
      .map((item) => {
        const value = itemValues?.[item.key] || {};
        if (!normalizeStatusList(value.status).length) return null;
        return {
          label: item.labelEn,
          status: statusLabel(value.status),
          severity: safeText(value.severity || "-"),
        };
      })
      .filter(Boolean);
    return {
      title: section.titleEn,
      rows,
    };
  }).filter((section) => section.rows.length > 0);

  sectionRows.forEach((section) => {
    addSectionRows(pdfDoc, section.title, section.rows, {
      regular,
      bold,
    });
  });

  const photos = collectReportPhotos(reportLead);
  await addPhotoPages(pdfDoc, "Mandatory Photo Pack", photos.mandatory);
  await addPhotoPages(pdfDoc, "Defect Evidence Pack", photos.defects);

  const pdfBytes = await pdfDoc.save();
  triggerPdfDownload(pdfBytes, fileName);
}

function isPdfDocument(documentLike = {}, blob = null) {
  const mimeType = String(
    documentLike.mimeType || blob?.type || "",
  ).toLowerCase();
  if (mimeType.includes("pdf")) return true;

  const name = String(
    documentLike.name || documentLike.fileName || documentLike.url || "",
  ).toLowerCase();
  return name.endsWith(".pdf");
}

export async function downloadDocumentPackPdf({
  title = "Documents",
  documents = [],
  fileName = "document-pack.pdf",
}) {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cover = pdfDoc.addPage([A4.width, A4.height]);
  cover.drawText(title, {
    x: MARGIN,
    y: A4.height - MARGIN,
    size: 24,
    font: bold,
    color: rgb(0.08, 0.12, 0.18),
  });
  cover.drawText(`Generated: ${formatDate(new Date().toISOString())}`, {
    x: MARGIN,
    y: A4.height - MARGIN - 30,
    size: 11,
    font: regular,
    color: rgb(0.35, 0.41, 0.5),
  });

  for (const doc of documents) {
    try {
      const blob = await fetchDocumentBlob(doc);
      if (!blob) continue;

      if (isPdfDocument(doc, blob)) {
        const sourcePdf = await PDFDocument.load(await blob.arrayBuffer());
        const pageIndexes = sourcePdf.getPageIndices();
        const copiedPages = await pdfDoc.copyPages(sourcePdf, pageIndexes);
        copiedPages.forEach((page) => pdfDoc.addPage(page));
        continue;
      }

      const embedded = await embedImageFromBlob(pdfDoc, blob);
      const page = pdfDoc.addPage([A4.width, A4.height]);

      const label = safeText(doc.label || doc.name || doc.fileName, "Document");
      page.drawText(label, {
        x: MARGIN,
        y: A4.height - MARGIN,
        size: 14,
        font: bold,
        color: rgb(0.1, 0.15, 0.2),
      });

      if (embedded) {
        drawImageContained(page, embedded, {
          x: MARGIN,
          y: MARGIN + 10,
          width: A4.width - MARGIN * 2,
          height: A4.height - MARGIN * 2 - 30,
        });
      } else {
        page.drawText("Preview unavailable for this file type.", {
          x: MARGIN,
          y: A4.height - MARGIN - 28,
          size: 10,
          font: regular,
          color: rgb(0.4, 0.46, 0.55),
        });
      }
    } catch (error) {
      const page = pdfDoc.addPage([A4.width, A4.height]);
      page.drawText(safeText(doc.label || doc.name || "Document"), {
        x: MARGIN,
        y: A4.height - MARGIN,
        size: 14,
        font: bold,
        color: rgb(0.1, 0.15, 0.2),
      });
      page.drawText(`Failed to fetch this file. ${safeText(error?.message, "")}`, {
        x: MARGIN,
        y: A4.height - MARGIN - 24,
        size: 10,
        font: regular,
        color: rgb(0.66, 0.2, 0.2),
      });
    }
  }

  const bytes = await pdfDoc.save();
  triggerPdfDownload(bytes, sanitizeFileName(fileName).endsWith(".pdf")
    ? sanitizeFileName(fileName)
    : `${sanitizeFileName(fileName)}.pdf`);
}

function collectPrintableStyleText() {
  const cssChunks = [];
  const sheets = Array.from(document.styleSheets || []);

  sheets.forEach((sheet) => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      if (!rules.length) return;
      cssChunks.push(rules.map((rule) => rule.cssText).join("\n"));
    } catch {
      // Ignore cross-origin stylesheets that cannot be read.
    }
  });

  return cssChunks.join("\n");
}

export async function printInspectionReportElementToPdf(element, options = {}) {
  if (!element) {
    throw new Error("Printable report view not available.");
  }

  const docTitle = safeText(
    options.fileName || options.title || "inspection-report",
    "inspection-report",
  );
  const styleText = collectPrintableStyleText();
  const clonedHtml = element.outerHTML;

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups and try again.");
  }

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${docTitle}</title>
    <style>
      ${styleText}
      @page {
        size: A4;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .inspection-report-pages {
        margin: 0 auto !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .inspection-report-pages section {
        break-inside: avoid;
        page-break-inside: avoid;
        page-break-after: always;
        break-after: page;
        box-shadow: none !important;
        margin: 0 !important;
      }
      .inspection-report-pages section:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      img {
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    ${clonedHtml}
  </body>
</html>`);
  printWindow.document.close();

  await new Promise((resolve) => {
    const images = Array.from(printWindow.document.images || []);
    if (!images.length) {
      setTimeout(resolve, 120);
      return;
    }
    let pending = images.length;
    const done = () => {
      pending -= 1;
      if (pending <= 0) resolve();
    };
    images.forEach((img) => {
      if (img.complete) {
        done();
      } else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });
  });

  await new Promise((resolve) => setTimeout(resolve, 180));
  printWindow.focus();
  printWindow.print();

  setTimeout(() => {
    try {
      printWindow.close();
    } catch {}
  }, 300);
}
