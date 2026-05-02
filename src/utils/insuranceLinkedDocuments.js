/**
 * Pull customer + linked-loan documents into the insurance case library with origin labels.
 */

const normalizeDocUrlKey = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return s.split("?")[0].split("#")[0].trim().toLowerCase();
  }
};

const parseTs = (...candidates) => {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    if (typeof c === "number" && Number.isFinite(c)) return c;
    const t = new Date(c).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
};

const loanVehicleLabel = (loan = {}) =>
  [
    loan?.vehicle_make || loan?.vehicleMake,
    loan?.vehicle_model || loan?.vehicleModel,
    loan?.vehicle_variant || loan?.vehicleVariant,
    loan?.registrationNumber || loan?.rc_redg_no,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim() || "";

/** Merge Cloudinary-style array entries into normalized insurance Step6 rows */
const normalizeArrayDoc = (doc = {}, fallbackMeta = {}) => {
  const url = String(doc.secure_url || doc.url || doc.previewUrl || "").trim();
  if (!url) return null;

  const originalName = String(
    doc.original_filename ||
      doc.original_name ||
      doc.name ||
      doc.filename ||
      fallbackMeta.defaultName ||
      "Document",
  ).trim();

  const uploadedAtRaw =
    doc.uploadedAt ||
    doc.uploaded_at ||
    doc.created_at ||
    doc.createdAt ||
    fallbackMeta.uploadedAt ||
    "";

  const sizeBytes =
    typeof doc.bytes === "number"
      ? doc.bytes
      : typeof doc.size === "number"
        ? doc.size
        : Number(doc.sizeBytes || 0) || 0;

  const ts = parseTs(uploadedAtRaw, fallbackMeta.fallbackTs);

  return {
    id: String(doc.public_id || doc.publicId || doc.id || "").trim() || `${normalizeDocUrlKey(url)}`,
    name: originalName,
    originalName,
    original_name: originalName,
    size: sizeBytes,
    sizeBytes,
    type: String(doc.resource_type || doc.format || doc.type || "").trim() || "file",
    format: String(doc.format || "").toLowerCase(),
    url,
    previewUrl: url,
    tag: String(doc.tag || "").trim(),
    uploadedAt: uploadedAtRaw ? String(uploadedAtRaw) : ts ? new Date(ts).toISOString() : "",
    uploadedBy: String(doc.uploadedBy || doc.uploaded_by || fallbackMeta.uploadedBy || "").trim(),
    documentStage: String(doc.documentStage || "").trim(),
    source: fallbackMeta.source || "linked",
    linkedOrigin: fallbackMeta.linkedOrigin || "",
    linkedOriginCategory: fallbackMeta.linkedOriginCategory || "",
    linkedLoanId: fallbackMeta.linkedLoanId || "",
    linkedLoanVehicleLabel: fallbackMeta.linkedLoanVehicleLabel || "",
    linkedSortTime: ts,
    public_id: doc.public_id || doc.publicId || "",
    publicId: doc.public_id || doc.publicId || "",
    storageKey: doc.public_id || doc.publicId || "",
  };
};

const pushScalarUrlDoc = (list, urlRaw, label, meta) => {
  const url = String(urlRaw || "").trim();
  if (!url) return;
  const synthetic = normalizeArrayDoc(
    {
      url,
      secure_url: url,
      original_filename: label,
      name: label,
      bytes: 0,
      uploadedAt: meta.uploadedAt || "",
    },
    {
      ...meta,
      defaultName: label,
      uploadedBy: meta.uploadedBy || "Linked profile",
      fallbackTs: meta.fallbackTs || 0,
    },
  );
  if (synthetic) list.push(synthetic);
};

/**
 * Collect documents from CRM customer profile URLs + all loans for this customer.
 * @returns {Array<object>}
 */
export const collectLinkedDocumentsForInsurance = (customer, loans = []) => {
  const rows = [];
  const cust = customer && typeof customer === "object" ? customer : {};

  const custTs = parseTs(cust.updatedAt, cust.updated_at, cust.createdAt, cust.createdOn);

  const customerProfileFields = [
    ["aadhaarCardDocUrl", "Aadhaar Front", "customer-kyc"],
    ["aadhaarCardBackDocUrl", "Aadhaar Back", "customer-kyc"],
    ["panCardDocUrl", "PAN Card", "customer-kyc"],
    ["passportDocUrl", "Passport", "customer-kyc"],
    ["dlDocUrl", "Driving License", "customer-kyc"],
    ["addressProofDocUrl", "Address Proof", "customer-kyc"],
    ["gstDocUrl", "GST Page 1", "customer-kyc"],
    ["gstDocUrlPage2", "GST Page 2", "customer-kyc"],
    ["gstDocUrlPage3", "GST Page 3", "customer-kyc"],
    ["photoUrl", "Customer Photo", "customer-profile"],
    ["signatureUrl", "Signature", "customer-profile"],
  ];

  customerProfileFields.forEach(([field, label, category]) => {
    pushScalarUrlDoc(rows, cust[field], label, {
      linkedOrigin: "Customer profile",
      linkedOriginCategory: category,
      source: "customer-profile",
      uploadedAt: cust.updatedAt || cust.updated_at || "",
      fallbackTs: custTs,
    });
  });

  const loanList = Array.isArray(loans) ? loans : [];

  loanList.forEach((loan) => {
    if (!loan || typeof loan !== "object") return;
    const loanId = String(loan._id || loan.loanId || loan.id || loan.loan_id || "").trim();
    const vehicleLbl = loanVehicleLabel(loan);
    const loanTs = parseTs(
      loan.updatedAt,
      loan.updated_at,
      loan.createdAt,
      loan.disbursementDate,
      loan.loanApprovalDate,
    );
    const loanMetaBase = {
      linkedLoanId: loanId,
      linkedLoanVehicleLabel: vehicleLbl,
      fallbackTs: loanTs || parseTs(loan.disbursementDate),
    };

    const scalarLoanDocs = [
      ["aadhaarCardDocUrl", "Loan · Aadhaar", "loan-kyc"],
      ["panCardDocUrl", "Loan · PAN", "loan-kyc"],
      ["passportDocUrl", "Loan · Passport", "loan-kyc"],
      ["dlDocUrl", "Loan · Driving License", "loan-kyc"],
      ["addressProofDocUrl", "Loan · Address proof", "loan-kyc"],
      ["gstDocUrl", "Loan · GST", "loan-kyc"],
      ["vehiclePhotoUrl", "Loan · Vehicle photo", "loan-vehicle"],
      ["vehicleRCUrl", "Loan · RC", "loan-vehicle"],
      ["insurancePolicyUrl", "Loan · Insurance policy", "loan-insurance"],
      ["hypothecationDocUrl", "Loan · Hypothecation", "loan-vehicle"],
      ["delivery_invoiceFile", "Loan · Delivery invoice", "loan-delivery"],
      ["delivery_rcFile", "Loan · Delivery RC", "loan-delivery"],
      ["co_aadhaarCardDocUrl", "Loan · Co-applicant Aadhaar", "loan-kyc"],
      ["co_panCardDocUrl", "Loan · Co-applicant PAN", "loan-kyc"],
      ["co_passportDocUrl", "Loan · Co-applicant Passport", "loan-kyc"],
      ["co_dlDocUrl", "Loan · Co-applicant DL", "loan-kyc"],
      ["co_addressProofDocUrl", "Loan · Co-applicant Address", "loan-kyc"],
      ["gu_aadhaarCardDocUrl", "Loan · Guarantor Aadhaar", "loan-kyc"],
      ["gu_panCardDocUrl", "Loan · Guarantor PAN", "loan-kyc"],
      ["gu_passportDocUrl", "Loan · Guarantor Passport", "loan-kyc"],
      ["gu_dlDocUrl", "Loan · Guarantor DL", "loan-kyc"],
      ["gu_addressProofDocUrl", "Loan · Guarantor Address", "loan-kyc"],
    ];

    scalarLoanDocs.forEach(([field, label, category]) => {
      if (!label) return;
      const suffix = vehicleLbl ? ` · ${vehicleLbl}` : loanId ? ` · …${loanId.slice(-6)}` : "";
      const displayName = `${label}${suffix}`;
      pushScalarUrlDoc(rows, loan[field], displayName, {
        ...loanMetaBase,
        linkedOrigin: displayName,
        linkedOriginCategory: category,
        source: "loan-profile",
        uploadedBy: "Loan file",
      });
    });

    const arrayBuckets = [
      { arr: loan.postfile_documents, origin: "Loan · Post-file", category: "loan-postfile" },
      { arr: loan.postfile_documents_ledger, origin: "Loan · Ledger docs", category: "loan-ledger" },
      { arr: loan.kyc_documents, origin: "Loan · KYC uploads", category: "loan-kyc" },
      { arr: loan.primary_documents, origin: "Loan · Primary docs", category: "loan-kyc" },
      { arr: loan.prefile_documents, origin: "Loan · Pre-file", category: "loan-prefile" },
      { arr: loan.pre_file_documents, origin: "Loan · Pre-file", category: "loan-prefile" },
    ];

    arrayBuckets.forEach(({ arr, origin, category }) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((doc, i) => {
        const normalized = normalizeArrayDoc(doc, {
          ...loanMetaBase,
          linkedOrigin: origin + (vehicleLbl ? ` · ${vehicleLbl}` : ""),
          linkedOriginCategory: category,
          source: "loan-array",
          uploadedBy: "Loan file",
          fallbackTs: loanTs + i,
        });
        if (normalized) rows.push(normalized);
      });
    });
  });

  return rows;
};

/**
 * Append linked docs to existing insurance docs without duplicates (by URL key).
 */
export const mergeLinkedIntoExistingDocuments = (existing = [], linked = []) => {
  const prev = Array.isArray(existing) ? existing : [];
  const add = Array.isArray(linked) ? linked : [];

  const seen = new Set(
    prev
      .map((d) => normalizeDocUrlKey(d.url || d.previewUrl || d.rawUrl || d.secure_url))
      .filter(Boolean),
  );

  const out = [...prev];
  add.forEach((doc) => {
    const key = normalizeDocUrlKey(doc.url || doc.previewUrl || doc.rawUrl);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(doc);
  });

  return out;
};

export { normalizeDocUrlKey, parseTs };
