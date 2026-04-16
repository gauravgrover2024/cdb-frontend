import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Steps,
  Typography,
} from "antd";
import { CreditCard } from "lucide-react";
import { insuranceApi } from "../../api/insurance";
import { customersApi } from "../../api/customers";
import { vehiclesApi } from "../../api/vehicles";
import { loansApi } from "../../api/loans";
import { getEmployees } from "../../api/employees";
import Step1CustomerInfo from "./steps/Step1CustomerInfo";
import Step2VehicleDetails from "./steps/Step2VehicleDetails";
import Step3PreviousPolicy from "./steps/Step3PreviousPolicy";
import Step4InsuranceQuotes from "./steps/Step4InsuranceQuotes";
import Step5NewPolicyDetails from "./steps/Step5NewPolicyDetails";
import Step6Documents from "./steps/Step6Documents";
import Step7Payment from "./steps/Step7Payment";
import Step8Payout from "./steps/Step8Payout";
import {
  STEP_TITLES,
  STEP_ICON_MAP,
  durationOptions,
  addOnCatalog,
} from "./steps/allSteps";

const { Text, Title } = Typography;

/** Same response normalization as loan EMI customer search (EMICustomerDetails). */
const normalizeCustomerSearchPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const initialFormState = {
  buyerType: "Individual",
  vehicleType: "New Car",
  policyDoneBy: "Autocredits India LLP",
  brokerName: "",
  employeeName: "",
  employeeUserId: "",
  sourceOrigin: "",
  referenceName: "",
  referencePhone: "",

  customerName: "",
  companyName: "",
  contactPersonName: "",
  mobile: "",
  alternatePhone: "",
  email: "",
  gender: "",
  panNumber: "",
  aadhaarNumber: "",
  gstNumber: "",
  residenceAddress: "",
  pincode: "",
  city: "",

  nomineeName: "",
  nomineeRelationship: "",
  nomineeAge: "",
  referenceName: "",
  referencePhone: "",

  registrationNumber: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleVariant: "",
  cubicCapacity: "",
  engineNumber: "",
  chassisNumber: "",
  typesOfVehicle: "Four Wheeler",
  manufactureYear: "",
  manufactureDate: "",
  regAuthority: "",
  dateOfReg: "",
  fuelType: "",
  batteryNumber: "",
  chargerNumber: "",
  hypothecation: "",

  previousInsuranceCompany: "Bajaj General Insurance Limited",
  previousPolicyNumber: "",
  previousPolicyType: "Comprehensive",
  previousPolicyStartDate: "",
  previousPolicyDuration: "1yr OD + 1yr TP",
  previousOdExpiryDate: "",
  previousTpExpiryDate: "",
  claimTakenLastYear: "No",
  previousNcbDiscount: 50,
  previousHypothecation: "Not Applicable",
  previousRemarks: "",

  newInsuranceCompany: "",
  newPolicyType: "Comprehensive",
  newPolicyNumber: "",
  newIssueDate: "",
  newPolicyStartDate: "",
  newInsuranceDuration: "1yr OD + 1yr TP",
  newOdExpiryDate: "",
  newTpExpiryDate: "",
  newNcbDiscount: 0,
  newIdvAmount: 0,
  newTotalPremium: 0,
  subventionAmount: 0,
  newHypothecation: "Not Applicable",
  newRemarks: "",

  // New fields for upgrade
  exShowroomPrice: 0,
  dateOfSale: "",
  dateOfPurchase: "",
  odometerReading: 0,
  policyPurchaseDate: "",

  // Extended Warranty
  ewCommencementDate: "",
  ewExpiryDate: "",
  kmsCoverage: 0,

  // Payout Details
  insurance_receivables: [],
  insurance_payables: [],

  customerPaymentExpected: 0,
  customerPaymentReceived: 0,
  inhousePaymentExpected: 0,
  inhousePaymentReceived: 0,
};

const initialQuoteDraft = {
  insuranceCompany: "",
  coverageType: "Comprehensive",
  vehicleIdv: 0,
  cngIdv: 0,
  accessoriesIdv: 0,
  policyDuration: "1yr OD + 3yr TP",
  ncbDiscount: 50,
  odAmount: 0,
  thirdPartyAmount: 0,
  addOnsAmount: 0,
  addOns: addOnCatalog.reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
  /** Per catalog add-on: when true, amount counts (₹0 still counts as included). */
  addOnsIncluded: addOnCatalog.reduce(
    (acc, name) => ({ ...acc, [name]: false }),
    {},
  ),
};

/** Stable id for quote rows (saved cases may only have _id). */
const getQuoteRowId = (q, index = 0) =>
  q?.id ?? q?._id ?? q?.quoteId ?? `quote-${index}`;

/**
 * Map a persisted quote row into the Step-4 "Add quote" draft so saved data
 * shows in the builder (not only in the table).
 * @param {Record<string, unknown>} q
 * @returns {typeof initialQuoteDraft}
 */
const mapQuoteToDraft = (q) => {
  if (!q || typeof q !== "object") {
    return {
      ...initialQuoteDraft,
      addOns: { ...initialQuoteDraft.addOns },
      addOnsIncluded: { ...initialQuoteDraft.addOnsIncluded },
    };
  }
  const baseAddOns = addOnCatalog.reduce(
    (acc, name) => ({ ...acc, [name]: 0 }),
    {},
  );
  const incoming =
    q.addOns && typeof q.addOns === "object" && !Array.isArray(q.addOns)
      ? q.addOns
      : {};
  const mergedAddOns = { ...baseAddOns };
  Object.keys(incoming).forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(mergedAddOns, k)) {
      mergedAddOns[k] = Number(incoming[k]) || 0;
    }
  });

  const incomingInc =
    q.addOnsIncluded &&
    typeof q.addOnsIncluded === "object" &&
    !Array.isArray(q.addOnsIncluded)
      ? q.addOnsIncluded
      : {};
  const mergedIncluded = addOnCatalog.reduce((acc, name) => {
    if (typeof incomingInc[name] === "boolean") {
      acc[name] = incomingInc[name];
    } else {
      acc[name] = Number(mergedAddOns[name]) > 0;
    }
    return acc;
  }, {});

  let vehicleIdv = Number(q.vehicleIdv) || 0;
  let cngIdv = Number(q.cngIdv) || 0;
  let accessoriesIdv = Number(q.accessoriesIdv) || 0;
  const sumParts = vehicleIdv + cngIdv + accessoriesIdv;
  const totalIdvStored = Number(q.totalIdv) || 0;
  if (sumParts === 0 && totalIdvStored > 0) {
    vehicleIdv = totalIdvStored;
  }

  return {
    insuranceCompany: String(q.insuranceCompany ?? "").trim(),
    coverageType: String(q.coverageType || "Comprehensive"),
    vehicleIdv,
    cngIdv,
    accessoriesIdv,
    policyDuration: String(
      q.policyDuration || initialQuoteDraft.policyDuration,
    ),
    ncbDiscount: Number(q.ncbDiscount) || 0,
    odAmount: Number(q.odAmount) || 0,
    thirdPartyAmount: Number(q.thirdPartyAmount) || 0,
    addOnsAmount: Number(q.addOnsAmount) || 0,
    addOns: mergedAddOns,
    addOnsIncluded: mergedIncluded,
  };
};

/**
 * @param {unknown[]} raw
 * @returns {Array<Record<string, unknown> & { id: string | number }>}
 */
const normalizeQuotesFromApi = (raw) => {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizeQuotesFromApi(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) {
    if (Array.isArray(raw?.data)) return normalizeQuotesFromApi(raw.data);
    if (Array.isArray(raw?.quotes)) return normalizeQuotesFromApi(raw.quotes);
    return [];
  }
  return raw.map((q, idx) => ({
    ...(typeof q === "object" && q ? q : {}),
    id: getQuoteRowId(q, idx),
  }));
};

const toINR = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);

/**
 * Same premium math as `quoteComputed` / addQuote, for a persisted quote row.
 * @param {Record<string, unknown>} q
 */
const computeQuoteBreakupFromRow = (q) => {
  if (!q || typeof q !== "object") {
    return {
      addOnsTotal: 0,
      odAmt: 0,
      tpAmt: 0,
      totalIdv: 0,
      basePremium: 0,
      ncbAmount: 0,
      taxableAmount: 0,
      gstAmount: 0,
      totalPremium: 0,
      addOnLines: [],
    };
  }
  const addOns = q.addOns && typeof q.addOns === "object" ? q.addOns : {};
  const included =
    q.addOnsIncluded && typeof q.addOnsIncluded === "object"
      ? q.addOnsIncluded
      : {};
  const selectedAddOnsTotal = addOnCatalog.reduce((sum, name) => {
    if (!included[name]) return sum;
    return sum + Number(addOns[name] || 0);
  }, 0);
  const addOnsTotal = Number(q.addOnsAmount || 0) + selectedAddOnsTotal;
  const odAmt = Number(q.odAmount || 0);
  const tpAmt = Number(q.thirdPartyAmount || 0);
  const idvParts =
    Number(q.vehicleIdv || 0) +
    Number(q.cngIdv || 0) +
    Number(q.accessoriesIdv || 0);
  const storedIdv = Number(q.totalIdv);
  const totalIdv =
    Number.isFinite(storedIdv) && storedIdv > 0 ? storedIdv : idvParts;
  const basePremium = odAmt + tpAmt + addOnsTotal;
  const ncbPct = Number(q.ncbDiscount || 0);
  const ncbAmount = (basePremium * ncbPct) / 100;
  const taxableAmount = Math.max(basePremium - ncbAmount, 0);
  const gstAmount = taxableAmount * 0.18;
  const storedTotal = Number(q.totalPremium);
  const totalPremium =
    Number.isFinite(storedTotal) && storedTotal > 0
      ? storedTotal
      : taxableAmount + gstAmount;

  const addOnLines = addOnCatalog
    .filter((name) => included[name])
    .map((name) => ({
      name,
      amount: Number(addOns[name] || 0),
    }));

  return {
    addOnsTotal,
    odAmt,
    tpAmt,
    totalIdv,
    basePremium,
    ncbAmount,
    taxableAmount,
    gstAmount,
    totalPremium,
    addOnLines,
  };
};

const formatStoredOrComputedIdv = (row) => {
  const s = Number(row?.totalIdv);
  if (Number.isFinite(s) && s > 0) return toINR(s);
  return toINR(computeQuoteBreakupFromRow(row).totalIdv);
};

const formatStoredOrComputedPremium = (row) => {
  const s = Number(row?.totalPremium);
  if (Number.isFinite(s) && s > 0) return toINR(s);
  return toINR(computeQuoteBreakupFromRow(row).totalPremium);
};

const yearsFromDuration = (duration) => {
  const text = String(duration || "");
  const odMatch = text.match(/(\d)yr\s*OD/i);
  const tpMatch = text.match(/(\d)yr\s*TP/i);
  return {
    odYears: Number(odMatch?.[1] || 1),
    tpYears: Number(tpMatch?.[1] || 1),
  };
};

const calcExpiryDate = (startDate, years) => {
  if (!startDate) return "";
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + Number(years || 1));
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const validateStep1 = (data) => {
  const errors = {};
  const isCompany = data.buyerType === "Company";
  if (!(data.employeeName || "").trim())
    errors.employeeName = "Employee name is required";
  if (!(data.mobile || "").trim()) errors.mobile = "Mobile number is required";
  else if (!/^\d{10}$/.test((data.mobile || "").trim()))
    errors.mobile = "Enter a valid 10-digit mobile number";
  if (
    (data.alternatePhone || "").trim() &&
    !/^\d{10}$/.test((data.alternatePhone || "").trim())
  )
    errors.alternatePhone = "Enter a valid 10-digit alternate number";
  if (!(data.email || "").trim()) errors.email = "Email address is required";
  if (!(data.pincode || "").trim()) errors.pincode = "Pincode is required";
  else if (!/^\d{6}$/.test((data.pincode || "").trim()))
    errors.pincode = "Enter a valid 6-digit pincode";
  if (!(data.city || "").trim()) errors.city = "City is required";
  if (isCompany) {
    if (!(data.companyName || "").trim())
      errors.companyName = "Company name is required";
    if (!(data.contactPersonName || "").trim())
      errors.contactPersonName = "Contact person name is required";
    if (!(data.panNumber || "").trim()) errors.panNumber = "PAN number is required";
    if (!(data.residenceAddress || "").trim())
      errors.residenceAddress = "Residence address is required";
  } else {
    if (!(data.customerName || "").trim())
      errors.customerName = "Customer name is required";
    if (!(data.gender || "").trim()) errors.gender = "Gender is required";
    if (!(data.residenceAddress || "").trim())
      errors.residenceAddress = "Residence address is required";
  }

  if ((data.referenceName || "").trim() && !(data.referencePhone || "").trim()) {
    errors.referencePhone = "Reference mobile is required if name is provided";
  }

  return errors;
};

const validateStep2 = (data) => {
  const errors = {};
  if (!(data.registrationNumber || "").trim())
    errors.registrationNumber = "Registration number is required";
  if (!(data.vehicleMake || "").trim()) errors.vehicleMake = "Vehicle make is required";
  if (!(data.vehicleModel || "").trim())
    errors.vehicleModel = "Vehicle model is required";
  if (!(data.vehicleVariant || "").trim())
    errors.vehicleVariant = "Vehicle variant is required";
  if (!(data.engineNumber || "").trim())
    errors.engineNumber = "Engine number is required";
  if (!(data.chassisNumber || "").trim())
    errors.chassisNumber = "Chassis number is required";
  if (!(data.manufactureYear || "").trim())
    errors.manufactureYear = "Manufacture year is required";
  // Updated to use manufactureDate instead of manufactureMonth
  if (!(data.manufactureDate || "").trim())
    errors.manufactureDate = "Manufacture date is required";

  return errors;
};

const NewInsuranceCaseForm = ({
  onCancel,
  onSubmit,
  mode = "create",
  initialValues = null,
  onDelete,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ...initialFormState,
    ...(initialValues || {}),
  });
  const [quoteDraft, setQuoteDraft] = useState(initialQuoteDraft);
  const [deleting, setDeleting] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [acceptedQuoteId, setAcceptedQuoteId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [planFeaturesModal, setPlanFeaturesModal] = useState({
    open: false,
    row: null,
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    paymentType: "customer",
    paymentMode: "Cash",
    transactionRef: "",
    remarks: "",
  });

  const [insuranceDbId, setInsuranceDbId] = useState(
    initialValues?._id || initialValues?.id || null,
  );
  const [saving, setSaving] = useState(false);
  const persistTimerRef = React.useRef(null);
  const persistInFlightRef = React.useRef(false);
  const persistQueuedRef = React.useRef(false);

  // Customer search (for Employee Name / Step-1 auto-fill)
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const customerSearchDebounceRef = React.useRef(null);

  /** Staff / users from DB for Employee field (not customer records) */
  const [employeesList, setEmployeesList] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Vehicle search (for Registration Number / Step-2 auto-fill)
  const [vehicleSearchLoading, setVehicleSearchLoading] = useState(false);
  const vehicleSearchDebounceRef = React.useRef(null);

  // Vehicle search (for searching by Make/Model) - like EMI Calculator
  const [vehicleSearchInput, setVehicleSearchInput] = useState("");
  const [vehicleSearchLoading2, setVehicleSearchLoading2] = useState(false);
  const [vehicleSearchOptions, setVehicleSearchOptions] = useState([]);
  const [, setVehiclesLoading] = useState(false);
  const [makeOptions, setMakeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [variantOptions, setVariantOptions] = useState([]);
  const vehicleSearchDebounceRef2 = React.useRef(null);

  const getCustomerId = (c) => c?._id || c?.id || null;

  // Helper: Calculate age from DOB
  const getAgeFromDob = (dob) => {
    if (!dob) return "";
    try {
      const birthDate = dayjs(dob);
      if (!birthDate.isValid()) return "";
      const age = dayjs().diff(birthDate, "year");
      return age > 0 && age < 150 ? String(age) : "";
    } catch {
      return "";
    }
  };

  const applyCustomerToForm = useCallback(
    (customer) => {
      if (!customer) return;

      const firstAltMobile =
        Array.isArray(customer?.extraMobiles) && customer.extraMobiles.length
          ? customer.extraMobiles[0]
          : "";

      setFormData((prev) => ({
        ...prev,
        // Link for backend snapshots
        customerId: getCustomerId(customer),

        // === PERSONAL DETAILS ===
        // Customer search must not overwrite employee (staff) — employee comes from users API
        customerName: customer?.customerName || prev.customerName,
        companyName: customer?.companyName || prev.companyName,
        contactPersonName:
          customer?.contactPersonName || prev.contactPersonName,

        // === CONTACT DETAILS ===
        mobile: customer?.primaryMobile || prev.mobile,
        alternatePhone: firstAltMobile || prev.alternatePhone,
        email: customer?.email || customer?.emailAddress || prev.email,

        // === ID PROOFS ===
        panNumber: customer?.panNumber || prev.panNumber,
        gstNumber: customer?.gstNumber || prev.gstNumber,
        aadhaarNumber:
          customer?.aadhaarNumber ||
          customer?.aadharNumber ||
          prev.aadhaarNumber,

        // === DEMOGRAPHICS ===
        gender: customer?.gender || prev.gender,
        residenceAddress: customer?.residenceAddress || prev.residenceAddress,
        pincode: customer?.pincode || prev.pincode,
        city: customer?.city || prev.city,

        // === NOMINEE DETAILS (Auto-fill from customer) ===
        nomineeName: customer?.nomineeName || prev.nomineeName,
        nomineeRelationship:
          customer?.nomineeRelation || prev.nomineeRelationship,
        nomineeAge: getAgeFromDob(customer?.nomineeDob) || prev.nomineeAge,

        // === REFERENCE DETAILS (Auto-fill from first reference in customer) ===
        referenceName:
          customer?.reference1_name ||
          customer?.reference2_name ||
          prev.referenceName,
        referencePhone:
          customer?.reference1_mobile ||
          customer?.reference2_mobile ||
          prev.referencePhone,
      }));

      // === FETCH AND AUTO-POPULATE CUSTOMER'S DOCUMENTS ===
      const customerId = getCustomerId(customer);
      if (customerId) {
        // Try to fetch customer's associated loans to get documents
        loansApi
          .getAll({ customerId, limit: 50 })
          .then((res) => {
            const loans = Array.isArray(res?.data) ? res.data : [];
            const extractedDocs = [];

            loans.forEach((loan) => {
              // Extract documents from each loan
              const docFields = [
                loan.postfile_documents,
                loan.kyc_documents,
                loan.primary_documents,
              ];

              docFields.forEach((docArray) => {
                if (Array.isArray(docArray)) {
                  docArray.forEach((doc) => {
                    if (doc && doc.url) {
                      extractedDocs.push({
                        id: doc.public_id || doc.id || Math.random().toString(),
                        name: doc.original_filename || doc.name || "Document",
                        size: doc.bytes || 0,
                        type: doc.resource_type || "file",
                        url: doc.secure_url || doc.url,
                        tag: "", // User can tag if needed
                      });
                    }
                  });
                }
              });
            });

            // Add extracted documents to the form (avoid duplicates)
            if (extractedDocs.length > 0) {
              setDocuments((prev) => {
                const existingUrls = new Set(prev.map((d) => d.url));
                const newDocs = extractedDocs.filter(
                  (d) => !existingUrls.has(d.url),
                );
                return [...prev, ...newDocs];
              });
            }
          })
          .catch((err) => {
            console.error(
              "[Insurance][CustomerDocs] Failed to fetch documents:",
              err,
            );
          });
      }

      // Persist latest customer-applied fields (debounced so React has updated state)
      schedulePersist(250);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const searchCustomers = useCallback(
    (q) => {
      const query = String(q || "").trim();
      if (customerSearchDebounceRef.current) {
        clearTimeout(customerSearchDebounceRef.current);
      }

      // Debounce to prevent flooding backend
      customerSearchDebounceRef.current = setTimeout(async () => {
        if (!query || query.length < 2) {
          setCustomerSearchResults([]);
          return;
        }

        setCustomerSearchLoading(true);
        try {
          const res = await customersApi.search(query);
          const rows = normalizeCustomerSearchPayload(res);
          setCustomerSearchResults(rows);
        } catch (err) {
          console.error("[Insurance][CustomerSearch] error:", err);
          setCustomerSearchResults([]);
        } finally {
          setCustomerSearchLoading(false);
        }
      }, 280);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEmployeesLoading(true);
      try {
        const list = await getEmployees();
        if (cancelled) return;
        setEmployeesList(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("[Insurance][Employees] load failed:", err);
        if (!cancelled) setEmployeesList([]);
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const employeeOptions = useMemo(() => {
    const q = String(formData.employeeName || "")
      .trim()
      .toLowerCase();
    return (employeesList || [])
      .filter((emp) => {
        if (!q) return true;
        const name = String(emp?.name || "").toLowerCase();
        const email = String(emp?.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, 12)
      .map((emp) => ({
        value: String(emp._id || emp.id || ""),
        label: (
          <div>
            <div style={{ fontWeight: 500 }}>{emp.name || "User"}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {emp.email || "—"}
              {emp.role ? ` · ${emp.role}` : ""}
            </div>
          </div>
        ),
      }))
      .filter((opt) => opt.value);
  }, [employeesList, formData.employeeName]);

  const applyVehicleToForm = useCallback(
    (vehicle) => {
      if (!vehicle) return;

      setFormData((prev) => ({
        ...prev,
        registrationNumber:
          vehicle.registrationNumber ||
          vehicle.regNo ||
          vehicle.registration ||
          prev.registrationNumber,
        vehicleMake: vehicle.vehicleMake || vehicle.make || prev.vehicleMake,
        vehicleModel:
          vehicle.vehicleModel || vehicle.model || prev.vehicleModel,
        vehicleVariant:
          vehicle.vehicleVariant ||
          vehicle.variant ||
          vehicle.variantName ||
          prev.vehicleVariant,
        cubicCapacity:
          vehicle.cubicCapacity ||
          vehicle.cc ||
          vehicle.engineCC ||
          prev.cubicCapacity,
        engineNumber:
          vehicle.engineNumber || vehicle.engineNo || prev.engineNumber,
        chassisNumber:
          vehicle.chassisNumber || vehicle.chasisNo || prev.chassisNumber,
        typesOfVehicle:
          vehicle.typesOfVehicle ||
          vehicle.vehicleType ||
          vehicle.type ||
          prev.typesOfVehicle,
        manufactureMonth:
          vehicle.manufactureMonth ||
          vehicle.mfgMonth ||
          vehicle.month ||
          prev.manufactureMonth,
        manufactureYear:
          vehicle.manufactureYear ||
          vehicle.mfgYear ||
          vehicle.year ||
          prev.manufactureYear,
      }));

      // Persist vehicle-applied fields (debounced so React has updated state)
      schedulePersist(250);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Search vehicles by make/model (like EMI Calculator using getAll)
  const handleVehicleSearch = useCallback(
    (q) => {
      const query = String(q || "").trim();
      setVehicleSearchInput(query);

      if (vehicleSearchDebounceRef2.current) {
        clearTimeout(vehicleSearchDebounceRef2.current);
      }

      // Debounce to prevent flooding backend
      vehicleSearchDebounceRef2.current = setTimeout(async () => {
        if (!query || query.length < 2) {
          setVehicleSearchOptions([]);
          return;
        }

        setVehicleSearchLoading2(true);
        try {
          // Search vehicles using getAll like EMI Calculator
          const res = await vehiclesApi.getAll({ q: query, limit: 200 });
          const rows = Array.isArray(res?.data) ? res.data : [];

          // Extract unique make+model combinations
          const seen = new Set();
          const options = [];
          rows.forEach((row) => {
            const make = String(row.vehicleMake || row.make || "").trim();
            const model = String(row.vehicleModel || row.model || "").trim();
            if (!make || !model) return;
            const key = `${make}|${model}`;
            if (seen.has(key)) return;
            seen.add(key);
            options.push({
              value: `${make} ${model}`,
              label: `${make} ${model}`,
              data: row,
            });
          });

          setVehicleSearchOptions(options.slice(0, 10));
        } catch (err) {
          console.error("[Insurance][VehicleSearch] error:", err);
          setVehicleSearchOptions([]);
        } finally {
          setVehicleSearchLoading2(false);
        }
      }, 450);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Fetch unique makes (like EMI Calculator)
  useEffect(() => {
    let ignore = false;

    const fetchMakes = async () => {
      if (vehicleSearchInput.length < 2) {
        setMakeOptions([]);
        return;
      }

      setVehiclesLoading(true);
      try {
        const res = await vehiclesApi.getUniqueMakes(null, false);
        const makes = Array.isArray(res?.data) ? res.data : [];
        if (!ignore) {
          setMakeOptions(makes);
        }
      } catch (err) {
        console.error("[Insurance][FetchMakes] error:", err);
        if (!ignore) setMakeOptions([]);
      } finally {
        if (!ignore) setVehiclesLoading(false);
      }
    };

    fetchMakes();
    return () => {
      ignore = true;
    };
  }, [vehicleSearchInput]);

  // Fetch unique models when make is selected (like EMI Calculator)
  useEffect(() => {
    let ignore = false;

    const fetchModels = async () => {
      if (!formData.vehicleMake) {
        setModelOptions([]);
        return;
      }

      setVehiclesLoading(true);
      try {
        const res = await vehiclesApi.getUniqueModels(
          formData.vehicleMake,
          null,
          false,
        );
        const models = Array.isArray(res?.data) ? res.data : [];
        if (!ignore) {
          setModelOptions(models);
        }
      } catch (err) {
        console.error("[Insurance][FetchModels] error:", err);
        if (!ignore) setModelOptions([]);
      } finally {
        if (!ignore) setVehiclesLoading(false);
      }
    };

    fetchModels();
    return () => {
      ignore = true;
    };
  }, [formData.vehicleMake]);

  // Fetch unique variants when make+model selected (like EMI Calculator)
  useEffect(() => {
    let ignore = false;

    const fetchVariants = async () => {
      if (!formData.vehicleMake || !formData.vehicleModel) {
        setVariantOptions([]);
        return;
      }

      setVehiclesLoading(true);
      try {
        const res = await vehiclesApi.getUniqueVariants(
          formData.vehicleMake,
          formData.vehicleModel,
          null,
          false,
        );
        const variants = Array.isArray(res?.data) ? res.data : [];
        if (!ignore) {
          setVariantOptions(variants);
        }
      } catch (err) {
        console.error("[Insurance][FetchVariants] error:", err);
        if (!ignore) setVariantOptions([]);
      } finally {
        if (!ignore) setVehiclesLoading(false);
      }
    };

    fetchVariants();
    return () => {
      ignore = true;
    };
  }, [formData.vehicleMake, formData.vehicleModel]);

  useEffect(() => {
    if (step !== 4) {
      setPlanFeaturesModal({ open: false, row: null });
    }
  }, [step]);

  useEffect(() => {
    if (!initialValues) return;
    setFormData((prev) => ({ ...prev, ...initialValues }));
    const normalizedQuotes = normalizeQuotesFromApi(initialValues?.quotes);
    if (normalizedQuotes.length) {
      setQuotes(normalizedQuotes);
      const accId = initialValues.acceptedQuoteId;
      const picked =
        normalizedQuotes.find(
          (q) =>
            accId !== undefined &&
            accId !== null &&
            String(getQuoteRowId(q)) === String(accId),
        ) ||
        normalizedQuotes.find((q) => q.isAccepted) ||
        normalizedQuotes[0];
      setQuoteDraft(mapQuoteToDraft(picked));
    } else {
      setQuotes([]);
      setQuoteDraft({
        ...initialQuoteDraft,
        addOns: { ...initialQuoteDraft.addOns },
      });
    }
    if (Array.isArray(initialValues?.documents))
      setDocuments(initialValues.documents);
    if (Array.isArray(initialValues?.paymentHistory))
      setPaymentHistory(initialValues.paymentHistory);
    if (initialValues?.acceptedQuoteId !== undefined)
      setAcceptedQuoteId(initialValues.acceptedQuoteId);
    if (initialValues?.currentStep)
      setStep(Number(initialValues.currentStep || 1));
    if (initialValues?._id || initialValues?.id)
      setInsuranceDbId(initialValues._id || initialValues.id);
  }, [initialValues]);

  const isCompany = formData.buyerType === "Company";
  const isNewCar = formData.vehicleType === "New Car";
  const step1Errors = useMemo(() => validateStep1(formData), [formData]);
  const step2Errors = useMemo(() => validateStep2(formData), [formData]);
  const acceptedQuote =
    quotes.find(
      (q) => String(getQuoteRowId(q)) === String(acceptedQuoteId ?? ""),
    ) || null;
  const docsTaggedCount = documents.filter((d) => d.tag).length;
  const allUploadedDocsTagged =
    documents.length > 0 && docsTaggedCount === documents.length;

  useEffect(() => {
    if (isNewCar && step === 3) {
      setStep(4);
    }
  }, [isNewCar, step]);

  const quoteComputed = useMemo(() => {
    const selectedAddOnsTotal = addOnCatalog.reduce((sum, name) => {
      if (!quoteDraft.addOnsIncluded?.[name]) return sum;
      return sum + Number(quoteDraft.addOns?.[name] || 0);
    }, 0);
    const addOnsTotal =
      Number(quoteDraft.addOnsAmount || 0) + selectedAddOnsTotal;
    const odAmt = Number(quoteDraft.odAmount || 0);
    const tpAmt = Number(quoteDraft.thirdPartyAmount || 0);
    const totalIdv =
      Number(quoteDraft.vehicleIdv || 0) +
      Number(quoteDraft.cngIdv || 0) +
      Number(quoteDraft.accessoriesIdv || 0);
    const basePremium = odAmt + tpAmt + addOnsTotal;
    const ncbAmount = (basePremium * Number(quoteDraft.ncbDiscount || 0)) / 100;
    const taxableAmount = Math.max(basePremium - ncbAmount, 0);
    const gstAmount = taxableAmount * 0.18;
    const totalPremium = taxableAmount + gstAmount;
    return {
      selectedAddOnsTotal,
      addOnsTotal,
      odAmt,
      tpAmt,
      totalIdv,
      basePremium,
      ncbAmount,
      taxableAmount,
      gstAmount,
      totalPremium,
    };
  }, [quoteDraft]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event?.target?.value }));
    schedulePersist();
  };

  const buildPersistPayload = useCallback(
    (patch = {}) => {
      return {
        ...formData,
        quotes,
        acceptedQuoteId,
        documents,
        paymentHistory,
        status: patch.status || "draft",
        currentStep: step,
        ...patch,
      };
    },
    [acceptedQuoteId, documents, formData, paymentHistory, quotes, step],
  );

  const persistNow = useCallback(
    async ({ silent = true, patch = {} } = {}) => {
      if (persistInFlightRef.current) {
        persistQueuedRef.current = true;
        return;
      }

      persistInFlightRef.current = true;
      persistQueuedRef.current = false;
      setSaving(true);

      try {
        const payload = buildPersistPayload(patch);
        if (!insuranceDbId) {
          const res = await insuranceApi.create(payload);
          const created = res?.data || res;
          const id = created?._id || created?.id || created?.data?._id;
          if (id) setInsuranceDbId(id);
          return created;
        } else {
          const res = await insuranceApi.update(insuranceDbId, payload);
          return res?.data || res;
        }
      } catch (err) {
        console.error("[Insurance] Persist failed:", err);
        if (!silent) {
          message.error(err?.message || "Failed to autosave insurance case");
        }
        return null;
      } finally {
        persistInFlightRef.current = false;
        setSaving(false);
        if (persistQueuedRef.current) {
          // One extra flush to capture latest changes.
          persistQueuedRef.current = false;
          persistNow({ silent: true });
        }
      }
    },
    [buildPersistPayload, insuranceDbId],
  );

  const schedulePersist = useCallback(
    (ms = 700) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistNow({ silent: true });
      }, ms);
    },
    [persistNow],
  );

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Auto-save is disabled - user must manually click Save
    // schedulePersist();
  };

  const handleStepValidation = () => {
    if (step === 1) return Object.keys(step1Errors).length === 0;
    if (step === 2) return Object.keys(step2Errors).length === 0;
    if (step === 4) return quotes.length > 0;
    return true;
  };

  const handleDelete = async () => {
    if (!insuranceDbId) {
      message.warning("Cannot delete an unsaved case");
      return;
    }

    setDeleting(true);
    try {
      await insuranceApi.delete(insuranceDbId);
      message.success("Insurance case deleted successfully");
      onDelete?.();
      onCancel();
    } catch (err) {
      console.error("[Insurance] Delete failed:", err);
      message.error(err?.message || "Failed to delete case");
    } finally {
      setDeleting(false);
    }
  };

  const goNext = () => {
    setShowErrors(true);
    if (!handleStepValidation()) return;
    setStep((prev) => {
      if (isNewCar && prev === 2) return 4;
      return Math.min(prev + 1, 8);
    });
    setShowErrors(false);
    // persistNow({ silent: true }); // Auto-save disabled
  };

  const goBack = () => {
    setStep((prev) => {
      if (isNewCar && prev === 4) return 2;
      return Math.max(prev - 1, 1);
    });
    setShowErrors(false);
    persistNow({ silent: true });
  };

  const addQuote = () => {
    if (!quoteDraft.insuranceCompany.trim()) return;
    const newQuote = {
      id: Date.now(),
      ...quoteDraft,
      totalIdv: quoteComputed.totalIdv,
      addOnsTotal: quoteComputed.addOnsTotal,
      taxableAmount: quoteComputed.taxableAmount,
      gstAmount: quoteComputed.gstAmount,
      totalPremium: quoteComputed.totalPremium,
      isAccepted: quotes.length === 0,
    };
    setQuotes((prev) => [...prev, newQuote]);
    if (quotes.length === 0) setAcceptedQuoteId(newQuote.id);
    setQuoteDraft({
      ...initialQuoteDraft,
      addOns: { ...initialQuoteDraft.addOns },
      addOnsIncluded: { ...initialQuoteDraft.addOnsIncluded },
    });
    persistNow({ silent: true });
  };

  const acceptQuote = (id) => {
    setAcceptedQuoteId(id);
    const q = quotes.find((x) => String(getQuoteRowId(x)) === String(id));
    if (!q) return;
    setFormData((prev) => {
      const odTp = yearsFromDuration(q.policyDuration);
      const startDate =
        prev.newPolicyStartDate || new Date().toISOString().slice(0, 10);
      return {
        ...prev,
        newInsuranceCompany: q.insuranceCompany,
        newPolicyType: q.coverageType,
        newInsuranceDuration: q.policyDuration,
        newNcbDiscount: q.ncbDiscount,
        newIdvAmount: q.totalIdv,
        newTotalPremium: Math.round(q.totalPremium),
        newPolicyStartDate: startDate,
        newOdExpiryDate: calcExpiryDate(startDate, odTp.odYears),
        newTpExpiryDate: calcExpiryDate(startDate, odTp.tpYears),
      };
    });
    persistNow({ silent: true });
  };

  const handlePreviousPolicyStartOrDuration = (updated) => {
    setFormData((prev) => {
      const next = { ...prev, ...updated };
      const policyType = next.previousPolicyType;
      const duration = next.previousPolicyDuration;
      const startDate = next.previousPolicyStartDate;

      if (policyType === "Comprehensive") {
        const y = yearsFromDuration(duration);
        next.previousOdExpiryDate = calcExpiryDate(startDate, y.odYears);
        next.previousTpExpiryDate = calcExpiryDate(startDate, y.tpYears);
      } else if (policyType === "Stand Alone OD") {
        const years =
          duration === "1 Year"
            ? 1
            : duration === "2 Years"
              ? 2
              : duration === "3 Years"
                ? 3
                : 0;
        next.previousOdExpiryDate = calcExpiryDate(startDate, years);
        next.previousTpExpiryDate = "";
      } else if (policyType === "Third Party") {
        const years =
          duration === "1 Year"
            ? 1
            : duration === "2 Years"
              ? 2
              : duration === "3 Years"
                ? 3
                : 0;
        next.previousTpExpiryDate = calcExpiryDate(startDate, years);
        next.previousOdExpiryDate = "";
      }

      return next;
    });
    schedulePersist();
  };

  const handleNewPolicyStartOrDuration = (updated) => {
    setFormData((prev) => {
      const next = { ...prev, ...updated };
      const policyType = next.newPolicyType;
      const duration = next.newInsuranceDuration;
      const startDate = next.newPolicyStartDate;

      if (policyType === "Comprehensive") {
        const y = yearsFromDuration(duration);
        next.newOdExpiryDate = calcExpiryDate(startDate, y.odYears);
        next.newTpExpiryDate = calcExpiryDate(startDate, y.tpYears);
      } else if (policyType === "Stand Alone OD") {
        const years =
          duration === "1 Year"
            ? 1
            : duration === "2 Years"
              ? 2
              : duration === "3 Years"
                ? 3
                : 0;
        next.newOdExpiryDate = calcExpiryDate(startDate, years);
        next.newTpExpiryDate = "";
      } else if (policyType === "Third Party") {
        const years =
          duration === "1 Year"
            ? 1
            : duration === "2 Years"
              ? 2
              : duration === "3 Years"
                ? 3
                : 0;
        next.newTpExpiryDate = calcExpiryDate(startDate, years);
        next.newOdExpiryDate = "";
      }

      return next;
    });
    schedulePersist();
  };

  const handleSubmitFinal = async (event) => {
    event.preventDefault();
    const lastStep = visibleSteps[visibleSteps.length - 1]?.originalStep;
    if (step !== lastStep) return;
    const saved = await persistNow({
      silent: false,
      patch: { status: "submitted" },
    });
    onSubmit?.(saved || buildPersistPayload({ status: "submitted" }));
  };

  const visibleSteps = useMemo(() => {
    // If New Car, we skip "Previous Policy Details" (step 3 in original)
    const rows = STEP_TITLES.map((title, idx) => ({
      originalStep: idx + 1,
      title,
    })).filter((s) => !(isNewCar && s.originalStep === 3));
    return rows;
  }, [isNewCar]);

  const stepIndex = useMemo(() => {
    return Math.max(
      0,
      visibleSteps.findIndex((s) => s.originalStep === step),
    );
  }, [visibleSteps, step]);

  const currentStepTitle = useMemo(() => {
    if (isNewCar && step === 4) return "Step 3: Insurance Quotes";
    return STEP_TITLES[step - 1];
  }, [isNewCar, step]);

  const CurrentStepIcon = STEP_ICON_MAP[step] || CreditCard;

  const stepHelpText = useMemo(() => {
    if (step === 1) return "Fill personal, contact and nominee details.";
    if (step === 2) return "Provide accurate vehicle information.";
    if (step === 3 && !isNewCar)
      return "For renewal cases & policy already expired cases.";
    if (step === 4)
      return "Add and manage quote options (at least 1 quote required).";
    if (step === 5) return "Policy details (auto-filled from accepted quote).";
    if (step === 6) return "Upload and tag documents (recommended).";
    return "";
  }, [step, isNewCar]);

  const stepErrorsAlert = useMemo(() => {
    if (!showErrors) return null;
    if (step === 1 && Object.keys(step1Errors).length) {
      return (
        <Alert
          type="error"
          showIcon
          message="Please fix required fields in Customer Information."
          description="Some mandatory fields are missing or invalid."
        />
      );
    }
    if (step === 2 && Object.keys(step2Errors).length) {
      return (
        <Alert
          type="error"
          showIcon
          message="Please fix required fields in Vehicle Details."
          description="Some mandatory fields are missing or invalid."
        />
      );
    }
    if (step === 4 && quotes.length === 0) {
      return (
        <Alert
          type="error"
          showIcon
          message="At least 1 quote is required to continue."
        />
      );
    }
    return null;
  }, [showErrors, step, step1Errors, step2Errors, quotes.length]);

  const docRows = useMemo(() => {
    return (documents || []).map((d) => ({
      key: d.id,
      ...d,
      sizeKb: Math.round(Number(d.size || 0) / 1024 || 0),
    }));
  }, [documents]);

  const quoteRows = useMemo(() => {
    return (quotes || []).map((q, idx) => ({
      key: getQuoteRowId(q, idx),
      ...q,
      id: getQuoteRowId(q, idx),
    }));
  }, [quotes]);

  return (
    <Card bordered>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white/50 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
        <Row gutter={[16, 16]} align="middle">
          <Col flex="48px">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-sm dark:bg-sky-900/30 dark:text-sky-400">
              <CurrentStepIcon size={24} />
            </div>
          </Col>
          <Col flex="auto">
            <h1 className="m-0 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {currentStepTitle}
            </h1>
            <Text type="secondary" className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {stepHelpText}
            </Text>
          </Col>
          <Col xs={24} md={12}>
            <div className="flex items-center justify-end rounded-lg bg-slate-100/50 p-1 dark:bg-slate-800/50">
              {/* Optional progress indicator or global status can go here */}
              <div className="px-3">
                <Text type="secondary" className="text-[10px] font-bold uppercase tracking-widest">
                  Step {step} of {visibleSteps.length + (isNewCar ? 0 : 1)}
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Steps
          type="navigation"
          size="small"
          current={stepIndex}
          className="custom-steps-nav"
          items={visibleSteps.map((s) => {
            const StepIcon = STEP_ICON_MAP[s.originalStep] || CreditCard;
            return {
              title: (
                <span className="text-[11px] font-bold uppercase tracking-tight">
                  {s.title.replace(/^Step\s*\d+\s*:\s*/i, "")}
                </span>
              ),
              icon: <StepIcon size={14} />,
              onClick: () => setStep(s.originalStep),
              status: step === s.originalStep ? "process" : step > s.originalStep ? "finish" : "wait",
            };
          })}
          style={{ paddingBlock: 4 }}
        />
      </div>

        {stepErrorsAlert}

        <form onSubmit={handleSubmitFinal}>
          {step === 1 && (
            <Step1CustomerInfo
              formData={formData}
              setField={setField}
              handleChange={handleChange}
              showErrors={showErrors}
              step1Errors={step1Errors}
              isCompany={isCompany}
              employeeOptions={employeeOptions}
              employeesLoading={employeesLoading}
              employeesList={employeesList}
              customerSearchResults={customerSearchResults}
              customerSearchLoading={customerSearchLoading}
              searchCustomers={searchCustomers}
              applyCustomerToForm={applyCustomerToForm}
              getCustomerId={getCustomerId}
            />
          )}

          {step === 2 && (
            <Step2VehicleDetails
              formData={formData}
              setField={setField}
              handleChange={handleChange}
              showErrors={showErrors}
              step2Errors={step2Errors}
              vehicleSearchLoading={vehicleSearchLoading}
              vehicleSearchInput={vehicleSearchInput}
              setVehicleSearchInput={setVehicleSearchInput}
              vehicleSearchLoading2={vehicleSearchLoading2}
              vehicleSearchOptions={vehicleSearchOptions}
              handleVehicleSearch={handleVehicleSearch}
              applyVehicleToForm={applyVehicleToForm}
              makeOptions={makeOptions}
              modelOptions={modelOptions}
              variantOptions={variantOptions}
              vehicleSearchDebounceRef={vehicleSearchDebounceRef}
              setVehicleSearchLoading={setVehicleSearchLoading}
              vehiclesApi={vehiclesApi}
            />
          )}

          {step === 3 && !isNewCar && (
            <Step3PreviousPolicy
              formData={formData}
              setField={setField}
              handleChange={handleChange}
              handlePreviousPolicyStartOrDuration={
                handlePreviousPolicyStartOrDuration
              }
            />
          )}

          {step === 4 && (
            <Step4InsuranceQuotes
              quoteDraft={quoteDraft}
              setQuoteDraft={setQuoteDraft}
              quoteComputed={quoteComputed}
              quotes={quotes}
              quoteRows={quoteRows}
              acceptedQuoteId={acceptedQuoteId}
              acceptedQuote={acceptedQuote}
              showErrors={showErrors}
              addQuote={addQuote}
              acceptQuote={acceptQuote}
              initialQuoteDraft={initialQuoteDraft}
              mapQuoteToDraft={mapQuoteToDraft}
              durationOptions={durationOptions}
              toINR={toINR}
              getQuoteRowId={getQuoteRowId}
              computeQuoteBreakupFromRow={computeQuoteBreakupFromRow}
              formatStoredOrComputedIdv={formatStoredOrComputedIdv}
              formatStoredOrComputedPremium={formatStoredOrComputedPremium}
              planFeaturesModal={planFeaturesModal}
              setPlanFeaturesModal={setPlanFeaturesModal}
            />
          )}

          {step === 5 && (
            <Step5NewPolicyDetails
              formData={formData}
              setField={setField}
              handleChange={handleChange}
              handleNewPolicyStartOrDuration={handleNewPolicyStartOrDuration}
              acceptedQuote={acceptedQuote}
              durationOptions={durationOptions}
              paymentHistory={paymentHistory}
              setPaymentModalVisible={setPaymentModalVisible}
              insuranceDbId={insuranceDbId}
              toINR={toINR}
              insuranceApi={insuranceApi}
            />
          )}

          {step === 7 && (
            <Step7Payment
              formData={formData}
              setField={setField}
              setFormData={setFormData}
              paymentForm={paymentForm}
              setPaymentForm={setPaymentForm}
              paymentHistory={paymentHistory}
              setPaymentHistory={setPaymentHistory}
              schedulePersist={schedulePersist}
            />
          )}

          {step === 8 && (
            <Step8Payout
              formData={formData}
              setField={setField}
              setFormData={setFormData}
              schedulePersist={schedulePersist}
            />
          )}

          {step === 6 && (
            <Step6Documents
              documents={documents}
              setDocuments={setDocuments}
              schedulePersist={schedulePersist}
              docRows={docRows}
              docsTaggedCount={docsTaggedCount}
              allUploadedDocsTagged={allUploadedDocsTagged}
            />
          )}

          <Divider />
          <Row justify="space-between" align="middle" gutter={[12, 12]}>
            <Col>
              {mode === "edit" && (
                <Popconfirm
                  title="Delete Case"
                  description="Are you sure you want to delete this insurance case? This action cannot be undone."
                  onConfirm={handleDelete}
                  okText="Delete"
                  okType="danger"
                  cancelText="Cancel"
                >
                  <Button danger loading={deleting}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </Col>
            <Col>
              <Button onClick={step === 1 ? onCancel : goBack}>
                {step === 1 ? "Cancel" : "Previous"}
              </Button>
            </Col>
            <Col>
              <Space size={10}>
                <Text type="secondary">
                  Step {stepIndex + 1} of {visibleSteps.length}
                </Text>
                {saving ? <Text type="secondary">Saving…</Text> : null}
              </Space>
            </Col>
            <Col>
              {step < 8 ? (
                <Button type="primary" onClick={goNext}>
                  Next
                </Button>
              ) : (
                <Button type="primary" htmlType="submit" loading={saving}>
                  {mode === "edit" ? "Save Changes" : "Create Case"}
                </Button>
              )}
            </Col>
          </Row>
        </form>

        <Modal
          title="Record Payment"
          open={paymentModalVisible}
          onCancel={() => {
            setPaymentModalVisible(false);
            setPaymentForm({
              amount: 0,
              date: new Date().toISOString().slice(0, 10),
              paymentType: "customer",
              paymentMode: "Cash",
              transactionRef: "",
              remarks: "",
            });
          }}
          onOk={() => {
            if (paymentForm.amount <= 0) {
              message.error("Amount must be greater than 0");
              return;
            }
            const newPayment = {
              _id: `payment-${Date.now()}`,
              ...paymentForm,
              amount: Number(paymentForm.amount),
              recordedAt: new Date().toISOString(),
            };
            setPaymentHistory((prev) => [...prev, newPayment]);

            if (paymentForm.paymentType === "customer") {
              setFormData((prev) => ({
                ...prev,
                customerPaymentReceived:
                  Number(prev.customerPaymentReceived || 0) +
                  Number(paymentForm.amount),
              }));
            } else {
              setFormData((prev) => ({
                ...prev,
                inhousePaymentReceived:
                  Number(prev.inhousePaymentReceived || 0) +
                  Number(paymentForm.amount),
              }));
            }

            setPaymentModalVisible(false);
            setPaymentForm({
              amount: 0,
              date: new Date().toISOString().slice(0, 10),
              paymentType: "customer",
              paymentMode: "Cash",
              transactionRef: "",
              remarks: "",
            });
            schedulePersist(250);
            message.success("Payment recorded successfully");
          }}
          okText="Record Payment"
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <div>
              <Text strong>Payment Type *</Text>
              <Radio.Group
                value={paymentForm.paymentType}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    paymentType: e.target.value,
                  }))
                }
                style={{ marginTop: 6, display: "block" }}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="customer">
                  Customer → AutoCredit
                </Radio.Button>
                <Radio.Button value="inhouse">
                  AutoCredit → Insurance Co.
                </Radio.Button>
              </Radio.Group>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Text strong>Amount (₹) *</Text>
                <InputNumber
                  min={0}
                  value={paymentForm.amount}
                  onChange={(v) =>
                    setPaymentForm((prev) => ({ ...prev, amount: v }))
                  }
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder="Enter amount"
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Date *</Text>
                <Input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Payment Mode *</Text>
                <Select
                  value={paymentForm.paymentMode}
                  onChange={(v) =>
                    setPaymentForm((prev) => ({ ...prev, paymentMode: v }))
                  }
                  style={{ width: "100%", marginTop: 6 }}
                  options={[
                    { label: "Cash", value: "Cash" },
                    { label: "Cheque", value: "Cheque" },
                    { label: "NEFT", value: "NEFT" },
                    { label: "RTGS", value: "RTGS" },
                    { label: "UPI", value: "UPI" },
                    { label: "Card", value: "Card" },
                    { label: "Other", value: "Other" },
                  ]}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Transaction Ref</Text>
                <Input
                  value={paymentForm.transactionRef}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      transactionRef: e.target.value,
                    }))
                  }
                  style={{ marginTop: 6 }}
                  placeholder="UTR / Cheque no."
                />
              </Col>
              <Col xs={24}>
                <Text strong>Remarks</Text>
                <Input.TextArea
                  rows={2}
                  value={paymentForm.remarks}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  style={{ marginTop: 6 }}
                  placeholder="Optional notes"
                />
              </Col>
            </Row>
          </Space>
        </Modal>
      </Space>
    </Card>
  );
};

export default NewInsuranceCaseForm;
