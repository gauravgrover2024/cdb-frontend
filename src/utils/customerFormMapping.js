/**
 * Shared Customer API → form field mapping for Insurance & Loan.
 * Only maps fields present on the customer record; callers merge with fill-empty-only.
 */

export const digits10 = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

export const normalizeCustomerSearchPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export const extractReferenceFromCustomer = (raw = {}) => {
  const ref1 =
    raw.reference1 && typeof raw.reference1 === "object" ? raw.reference1 : {};

  const referenceName = String(
    ref1.name || raw.reference1_name || raw.referenceName || "",
  ).trim();

  const referencePhone = digits10(
    ref1.mobile || raw.reference1_mobile || raw.referencePhone || "",
  );

  return { referenceName, referencePhone };
};

/** Map Customer API row → insurance Step 1 fields */
export const mapCustomerToInsuranceFields = (raw) => {
  if (!raw || typeof raw !== "object") return {};

  const primaryMobile = digits10(
    raw.primaryMobile ??
      raw.mobile ??
      raw.phone ??
      raw.primary_mobile ??
      raw.contactNumber,
  );

  const customerName = String(
    raw.customerName || raw.name || raw.fullName || "",
  ).trim();

  const companyName = String(
    raw.companyName || raw.company || raw.businessName || "",
  ).trim();

  const contactPersonName = String(
    raw.contactPersonName || raw.contactName || "",
  ).trim();

  const extraMobiles = Array.isArray(raw.extraMobiles)
    ? raw.extraMobiles
    : Array.isArray(raw.alternateMobiles)
      ? raw.alternateMobiles
      : [];

  const { referenceName, referencePhone } = extractReferenceFromCustomer(raw);

  return {
    customerId: raw._id || raw.id || raw.customerId || "",
    customerName,
    companyName,
    contactPersonName,
    mobile: primaryMobile,
    alternatePhone: extraMobiles.length ? digits10(extraMobiles[0]) : "",
    email: String(raw.email || raw.emailAddress || raw.primaryEmail || "").trim(),
    panNumber: String(raw.panNumber || raw.pan || "").trim(),
    aadhaarNumber: String(
      raw.aadhaarNumber || raw.aadharNumber || raw.aadhaar || "",
    ).trim(),
    gstNumber: String(raw.gstNumber || raw.gstin || raw.gst || "").trim(),
    gender: String(raw.gender || "").trim(),
    residenceAddress: String(
      raw.residenceAddress ||
        raw.currentAddress ||
        raw.address ||
        raw.permanentAddress ||
        "",
    ).trim(),
    pincode: String(raw.pincode || raw.permanentPincode || "")
      .replace(/\D/g, "")
      .slice(0, 6),
    city: String(raw.city || raw.permanentCity || raw.district || "").trim(),
    nomineeName: String(raw.nomineeName || raw.nominee || "").trim(),
    nomineeRelationship: String(
      raw.nomineeRelation || raw.nomineeRelationship || "",
    ).trim(),
    nomineeDob: raw.nomineeDob || raw.nomineeDateOfBirth || "",
    referenceName,
    referencePhone,
  };
};

const hasValue = (value) => String(value ?? "").trim().length > 0;

/**
 * Merge customer fields into existing form state.
 * fillEmptyOnly: true → keep manual edits; only fill blanks from API.
 */
export const mergeInsuranceCustomerFields = (
  prev,
  incoming,
  { fillEmptyOnly = true } = {},
) => {
  const mapped = mapCustomerToInsuranceFields(incoming);
  const next = { ...prev };

  const setField = (key, value) => {
    if (!hasValue(value)) return;
    if (fillEmptyOnly) {
      if (!hasValue(next[key])) next[key] = value;
    } else {
      next[key] = value;
    }
  };

  Object.entries(mapped).forEach(([key, value]) => setField(key, value));

  if (mapped.nomineeDob) {
    try {
      const birth = new Date(mapped.nomineeDob);
      if (!Number.isNaN(birth.getTime())) {
        const age = Math.floor(
          (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
        if (age > 0 && age < 150) {
          setField("nomineeAge", String(age));
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (mapped.companyName && !hasValue(prev.customerName)) {
    setField("buyerType", "Company");
  }

  return next;
};

/** Reference-only merge (reference picker in Step 1) */
export const mergeInsuranceReferenceFields = (
  prev,
  incoming,
  { fillEmptyOnly = true } = {},
) => {
  const { referenceName, referencePhone } =
    extractReferenceFromCustomer(incoming);
  const next = { ...prev };

  if (referenceName) {
    if (!fillEmptyOnly || !hasValue(next.referenceName)) {
      next.referenceName = referenceName;
    }
  }
  if (referencePhone) {
    if (!fillEmptyOnly || !hasValue(next.referencePhone)) {
      next.referencePhone = referencePhone;
    }
  }

  return next;
};
