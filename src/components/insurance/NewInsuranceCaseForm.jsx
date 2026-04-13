import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
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
  Table,
  Typography,
  Upload,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { insuranceApi } from "../../api/insurance";
import { customersApi } from "../../api/customers";
import { vehiclesApi } from "../../api/vehicles";
import { loansApi } from "../../api/loans";
import { getEmployees } from "../../api/employees";
import PlanFeaturesModalBody from "./PlanFeaturesModalBody";

const { Text, Title } = Typography;
const { Dragger } = Upload;

/** Same response normalization as loan EMI customer search (EMICustomerDetails). */
const normalizeCustomerSearchPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const STEP_TITLES = [
  "Step 1: Customer Information",
  "Step 2: Vehicle Details",
  "Step 3: Previous Policy Details",
  "Step 4: Insurance Quotes",
  "Step 5: New Policy Details",
  "Step 6: Documents",
  "Step 7: Payment",
];

const durationOptions = [
  "1yr OD + 1yr TP",
  "1yr OD + 3yr TP",
  "2yr OD + 3yr TP",
  "3yr OD + 3yr TP",
];

const addOnCatalog = [
  "Zero Depreciation",
  "Consumables",
  "Engine Protection",
  "Roadside Assistance",
  "No Claim Bonus (NCB) Protection",
  "Key Replacement",
  "Tyre Protection",
  "Return to Invoice",
  "Driver Cover",
  "Personal Accident Cover for Passengers",
  "Loss of Personal Belongings",
  "Outstation Emergency Cover",
  "Battery Cover",
];

const requiredDocumentTags = [
  "RC",
  "Form 29",
  "Form 30 page 1",
  "Form 30 page 2",
  "Pan Number",
  "GST/Adhaar Card",
  "Previous Year Policy",
  "New Year Policy",
];

const initialFormState = {
  buyerType: "Individual",
  vehicleType: "New Car",
  policyDoneBy: "Autocredits India LLP",
  brokerName: "",
  sourceOrigin: "",
  employeeName: "",
  /** Selected system user id when picked from employees list */
  employeeUserId: "",

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
  manufactureMonth: "",
  manufactureYear: "",

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
  addOnsIncluded: addOnCatalog.reduce((acc, name) => ({ ...acc, [name]: false }), {}),
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
    policyDuration: String(q.policyDuration || initialQuoteDraft.policyDuration),
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

const mapDurationToKey = (duration) =>
  String(duration || "")
    .toLowerCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_");

const validateStep1 = (data) => {
  const errors = {};
  const isCompany = data.buyerType === "Company";
  if (!data.employeeName.trim())
    errors.employeeName = "Employee name is required";
  if (!data.mobile.trim()) errors.mobile = "Mobile number is required";
  else if (!/^\d{10}$/.test(data.mobile.trim()))
    errors.mobile = "Enter a valid 10-digit mobile number";
  if (
    data.alternatePhone.trim() &&
    !/^\d{10}$/.test(data.alternatePhone.trim())
  )
    errors.alternatePhone = "Enter a valid 10-digit alternate number";
  if (!data.email.trim()) errors.email = "Email address is required";
  if (!data.pincode.trim()) errors.pincode = "Pincode is required";
  else if (!/^\d{6}$/.test(data.pincode.trim()))
    errors.pincode = "Enter a valid 6-digit pincode";
  if (!data.city.trim()) errors.city = "City is required";
  if (isCompany) {
    if (!data.companyName.trim())
      errors.companyName = "Company name is required";
    if (!data.contactPersonName.trim())
      errors.contactPersonName = "Contact person name is required";
    if (!data.panNumber.trim()) errors.panNumber = "PAN number is required";
    if (!data.residenceAddress.trim())
      errors.residenceAddress = "Residence address is required";
  } else {
    if (!data.customerName.trim())
      errors.customerName = "Customer name is required";
    if (!data.gender.trim()) errors.gender = "Gender is required";
    if (!data.residenceAddress.trim())
      errors.residenceAddress = "Residence address is required";
  }
  return errors;
};

const validateStep2 = (data) => {
  const errors = {};
  if (!data.registrationNumber.trim())
    errors.registrationNumber = "Registration number is required";
  if (!data.vehicleMake.trim()) errors.vehicleMake = "Vehicle make is required";
  if (!data.vehicleModel.trim())
    errors.vehicleModel = "Vehicle model is required";
  if (!data.vehicleVariant.trim())
    errors.vehicleVariant = "Vehicle variant is required";
  if (!data.engineNumber.trim())
    errors.engineNumber = "Engine number is required";
  if (!data.chassisNumber.trim())
    errors.chassisNumber = "Chassis number is required";
  if (!data.manufactureMonth.trim())
    errors.manufactureMonth = "Manufacture month is required";
  if (!data.manufactureYear.trim())
    errors.manufactureYear = "Manufacture year is required";
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
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
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
  const [vehicleSearchResults, setVehicleSearchResults] = useState([]);
  const vehicleSearchDebounceRef = React.useRef(null);

  // Vehicle search (for searching by Make/Model) - like EMI Calculator
  const [vehicleSearchInput, setVehicleSearchInput] = useState("");
  const [vehicleSearchLoading2, setVehicleSearchLoading2] = useState(false);
  const [vehicleSearchOptions, setVehicleSearchOptions] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
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

  const searchVehicles = useCallback(
    (q) => {
      const query = String(q || "").trim();
      if (vehicleSearchDebounceRef.current) {
        clearTimeout(vehicleSearchDebounceRef.current);
      }

      // Debounce to prevent flooding backend
      vehicleSearchDebounceRef.current = setTimeout(async () => {
        if (!query || query.length < 2) {
          setVehicleSearchResults([]);
          return;
        }

        setVehicleSearchLoading(true);
        try {
          // Try to search vehicles by registration number or details
          const res = await vehiclesApi.searchMasterRecords(query, 10);
          const rows = Array.isArray(res?.data) ? res.data : [];
          setVehicleSearchResults(rows);
        } catch (err) {
          console.error("[Insurance][VehicleSearch] error:", err);
          setVehicleSearchResults([]);
        } finally {
          setVehicleSearchLoading(false);
        }
      }, 450);
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
      return Math.min(prev + 1, 6);
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
        const years = duration === "1 Year" ? 1 : duration === "2 Years" ? 2 : duration === "3 Years" ? 3 : 0;
        next.previousOdExpiryDate = calcExpiryDate(startDate, years);
        next.previousTpExpiryDate = "";
      } else if (policyType === "Third Party") {
        const years = duration === "1 Year" ? 1 : duration === "2 Years" ? 2 : duration === "3 Years" ? 3 : 0;
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
        const years = duration === "1 Year" ? 1 : duration === "2 Years" ? 2 : duration === "3 Years" ? 3 : 0;
        next.newOdExpiryDate = calcExpiryDate(startDate, years);
        next.newTpExpiryDate = "";
      } else if (policyType === "Third Party") {
        const years = duration === "1 Year" ? 1 : duration === "2 Years" ? 2 : duration === "3 Years" ? 3 : 0;
        next.newTpExpiryDate = calcExpiryDate(startDate, years);
        next.newOdExpiryDate = "";
      }

      return next;
    });
    schedulePersist();
  };

  const handleFilesUpload = (fileList) => {
    const incoming = Array.from(fileList || []).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      tag: "",
    }));
    setDocuments((prev) => [...prev, ...incoming]);
    persistNow({ silent: true });
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
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {currentStepTitle}
          </Title>
          <Text type="secondary">{stepHelpText}</Text>
        </div>

        <Steps
          current={stepIndex}
          items={visibleSteps.map((s) => ({
            title: s.title.replace(/^Step\s*\d+\s*:\s*/i, ""),
            onClick: () => setStep(s.originalStep),
          }))}
        />

        {stepErrorsAlert}

        <form onSubmit={handleSubmitFinal}>
          {step === 1 && (
            <>
              <Card size="small" title="Basic Setup" bordered>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Text strong>Buyer Type *</Text>
                    <div style={{ marginTop: 6 }}>
                      <Radio.Group
                        value={formData.buyerType}
                        onChange={(e) => setField("buyerType", e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                        options={[
                          { label: "Individual", value: "Individual" },
                          { label: "Company", value: "Company" },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Vehicle Type *</Text>
                    <div style={{ marginTop: 6 }}>
                      <Radio.Group
                        value={formData.vehicleType}
                        onChange={(e) =>
                          setField("vehicleType", e.target.value)
                        }
                        optionType="button"
                        buttonStyle="solid"
                        options={[
                          { label: "New Car", value: "New Car" },
                          { label: "Used Car", value: "Used Car" },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Policy Done By *</Text>
                    <Input
                      value={formData.policyDoneBy}
                      onChange={handleChange("policyDoneBy")}
                      placeholder="Autocredits India LLP"
                      style={{ marginTop: 6 }}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Broker Name</Text>
                    <Input
                      value={formData.brokerName}
                      onChange={handleChange("brokerName")}
                      placeholder="Broker (optional)"
                      style={{ marginTop: 6 }}
                    />
                  </Col>
                  <Col xs={24}>
                    <Text strong>Source Origin</Text>
                    <Input
                      value={formData.sourceOrigin}
                      onChange={handleChange("sourceOrigin")}
                      placeholder="From where we got the policy client"
                      style={{ marginTop: 6 }}
                    />
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="Customer Information" bordered>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Text strong>Employee (staff) *</Text>
                    <Text
                      type="secondary"
                      style={{ display: "block", marginTop: 4, fontSize: 12 }}
                    >
                      Search and pick from system users (database). This is not
                      the policy customer.
                    </Text>
                    <AutoComplete
                      value={formData.employeeName}
                      onSearch={(val) => {
                        setField("employeeName", val);
                        setField("employeeUserId", "");
                      }}
                      onChange={(val) => {
                        setField("employeeName", val);
                        setField("employeeUserId", "");
                      }}
                      options={employeeOptions}
                      loading={employeesLoading}
                      placeholder="Search staff by name or email"
                      style={{ width: "100%", marginTop: 6 }}
                      onSelect={(id) => {
                        const emp = employeesList.find(
                          (e) => String(e._id || e.id) === String(id),
                        );
                        if (emp) {
                          setField("employeeName", emp.name || "");
                          setField("employeeUserId", emp._id || emp.id || "");
                        }
                      }}
                      status={
                        showErrors && step1Errors.employeeName ? "error" : ""
                      }
                    />
                    {showErrors && step1Errors.employeeName ? (
                      <Text
                        type="danger"
                        style={{ marginTop: 4, display: "block" }}
                      >
                        {step1Errors.employeeName}
                      </Text>
                    ) : null}
                  </Col>
                  {isCompany ? (
                    <>
                      <Col xs={24} md={12}>
                        <Text strong>Company Name *</Text>
                        <Input
                          value={formData.companyName}
                          onChange={handleChange("companyName")}
                          style={{ marginTop: 6 }}
                          status={
                            showErrors && step1Errors.companyName ? "error" : ""
                          }
                          placeholder="Enter company name"
                        />
                        {showErrors && step1Errors.companyName ? (
                          <Text type="danger">{step1Errors.companyName}</Text>
                        ) : null}
                      </Col>
                      <Col xs={24} md={12}>
                        <Text strong>Contact Person Name *</Text>
                        <Input
                          value={formData.contactPersonName}
                          onChange={handleChange("contactPersonName")}
                          style={{ marginTop: 6 }}
                          status={
                            showErrors && step1Errors.contactPersonName
                              ? "error"
                              : ""
                          }
                          placeholder="Enter contact person name"
                        />
                        {showErrors && step1Errors.contactPersonName ? (
                          <Text type="danger">
                            {step1Errors.contactPersonName}
                          </Text>
                        ) : null}
                      </Col>
                    </>
                  ) : (
                    <Col xs={24} md={12}>
                      <Text strong>Customer Name * — search CRM</Text>
                      <Text
                        type="secondary"
                        style={{
                          display: "block",
                          marginTop: 4,
                          fontSize: 12,
                        }}
                      >
                        Same as loan form: type name, mobile, or PAN — select a
                        customer to auto-fill all fields below.
                      </Text>
                      <AutoComplete
                        value={formData.customerName}
                        onSearch={(val) => {
                          setField("customerName", val);
                          searchCustomers(val);
                        }}
                        onChange={(val) => {
                          const v = String(val ?? "");
                          // Option values are customer ids; ignore so input does not show ObjectId
                          if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                          setField("customerName", v);
                        }}
                        options={customerSearchResults
                          .slice(0, 12)
                          .map((c) => ({
                            value: getCustomerId(c),
                            label: (
                              <div>
                                <div style={{ fontWeight: 600 }}>
                                  {c?.customerName || c?.companyName || "—"}
                                </div>
                                <div
                                  style={{ fontSize: 12, color: "#666" }}
                                >
                                  {c?.primaryMobile &&
                                    `📱 ${c.primaryMobile}`}
                                  {c?.panNumber && ` · PAN ${c.panNumber}`}
                                  {c?.city && ` · ${c.city}`}
                                </div>
                              </div>
                            ),
                          }))
                          .filter((opt) => Boolean(opt.value))}
                        onSelect={(customerId) => {
                          const selected = customerSearchResults.find(
                            (c) =>
                              String(getCustomerId(c)) ===
                              String(customerId),
                          );
                          if (selected) applyCustomerToForm(selected);
                        }}
                        style={{ width: "100%", marginTop: 6 }}
                        notFoundContent={
                          customerSearchLoading ? (
                            <span>Searching…</span>
                          ) : (
                            <span>No customers</span>
                          )
                        }
                      >
                        <Input
                          prefix={
                            <SearchOutlined style={{ color: "#94a3b8" }} />
                          }
                          placeholder="Search customer by name or mobile…"
                          allowClear
                          status={
                            showErrors && step1Errors.customerName
                              ? "error"
                              : ""
                          }
                          autoComplete="off"
                        />
                      </AutoComplete>
                      {showErrors && step1Errors.customerName ? (
                        <Text type="danger">{step1Errors.customerName}</Text>
                      ) : null}
                    </Col>
                  )}
                  <Col xs={24} md={12}>
                    <Text strong>Customer mobile * — search CRM</Text>
                    <Text
                      type="secondary"
                      style={{ display: "block", marginTop: 4, fontSize: 12 }}
                    >
                      Type mobile number to search customers; pick a row to
                      auto-fill customer details from the Customers module.
                    </Text>
                    <AutoComplete
                      value={formData.mobile}
                      onSearch={(raw) => {
                        const digits = String(raw || "")
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setField("mobile", digits);
                        searchCustomers(digits);
                      }}
                      onChange={(val) => {
                        const v = String(val ?? "");
                        if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                        const digits = v.replace(/\D/g, "").slice(0, 10);
                        setField("mobile", digits);
                      }}
                      onSelect={(customerId) => {
                        const selected = customerSearchResults.find(
                          (c) =>
                            String(getCustomerId(c)) === String(customerId),
                        );
                        if (selected) applyCustomerToForm(selected);
                      }}
                      options={customerSearchResults
                        .slice(0, 10)
                        .map((c) => ({
                          value: getCustomerId(c),
                          label: (
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {c?.customerName || "Customer"}
                              </div>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                {c?.primaryMobile &&
                                  `📱 ${c.primaryMobile}`}
                                {c?.panNumber && ` · PAN ${c.panNumber}`}
                                {c?.city && ` · ${c.city}`}
                              </div>
                            </div>
                          ),
                        }))
                        .filter((opt) => Boolean(opt.value))}
                      style={{ width: "100%", marginTop: 6 }}
                      notFoundContent={
                        customerSearchLoading ? "Searching…" : null
                      }
                    >
                      <Input
                        addonBefore="+91"
                        maxLength={10}
                        placeholder="10-digit mobile — search & select customer"
                        status={
                          showErrors && step1Errors.mobile ? "error" : ""
                        }
                        suffix={customerSearchLoading ? "…" : null}
                      />
                    </AutoComplete>
                    {showErrors && step1Errors.mobile ? (
                      <Text type="danger">{step1Errors.mobile}</Text>
                    ) : null}
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Alternate Phone Number</Text>
                    <Input
                      addonBefore="+91"
                      value={formData.alternatePhone}
                      onChange={handleChange("alternatePhone")}
                      maxLength={10}
                      style={{ marginTop: 6 }}
                      placeholder="Optional"
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Email Address *</Text>
                    <Input
                      value={formData.email}
                      onChange={handleChange("email")}
                      style={{ marginTop: 6 }}
                      status={showErrors && step1Errors.email ? "error" : ""}
                      placeholder={
                        isCompany ? "Company email address" : "Email address"
                      }
                    />
                    {showErrors && step1Errors.email ? (
                      <Text type="danger">{step1Errors.email}</Text>
                    ) : null}
                  </Col>
                  {!isCompany ? (
                    <Col xs={24} md={12}>
                      <Text strong>Gender *</Text>
                      <Select
                        value={formData.gender || undefined}
                        onChange={(v) => setField("gender", v)}
                        style={{ width: "100%", marginTop: 6 }}
                        status={showErrors && step1Errors.gender ? "error" : ""}
                        options={[
                          { label: "Male", value: "Male" },
                          { label: "Female", value: "Female" },
                          { label: "Other", value: "Other" },
                        ]}
                        placeholder="Select gender"
                      />
                      {showErrors && step1Errors.gender ? (
                        <Text type="danger">{step1Errors.gender}</Text>
                      ) : null}
                    </Col>
                  ) : null}
                  <Col xs={24} md={12}>
                    <Text strong>PAN Number {isCompany ? "*" : ""}</Text>
                    <Input
                      value={formData.panNumber}
                      onChange={handleChange("panNumber")}
                      style={{ marginTop: 6 }}
                      status={
                        showErrors && step1Errors.panNumber ? "error" : ""
                      }
                      placeholder="ABCDE1234F"
                    />
                    {showErrors && step1Errors.panNumber ? (
                      <Text type="danger">{step1Errors.panNumber}</Text>
                    ) : null}
                  </Col>
                  {isCompany ? (
                    <Col xs={24} md={12}>
                      <Text strong>GST Number</Text>
                      <Input
                        value={formData.gstNumber}
                        onChange={handleChange("gstNumber")}
                        style={{ marginTop: 6 }}
                        placeholder="Optional"
                      />
                    </Col>
                  ) : (
                    <Col xs={24} md={12}>
                      <Text strong>Aadhaar Number</Text>
                      <Input
                        value={formData.aadhaarNumber}
                        onChange={handleChange("aadhaarNumber")}
                        style={{ marginTop: 6 }}
                        placeholder="Optional"
                      />
                    </Col>
                  )}
                  <Col xs={24} md={12}>
                    <Text strong>
                      {isCompany ? "Office Address *" : "Residence Address *"}
                    </Text>
                    <Input.TextArea
                      rows={2}
                      value={formData.residenceAddress}
                      onChange={handleChange("residenceAddress")}
                      style={{ marginTop: 6 }}
                      status={
                        showErrors && step1Errors.residenceAddress
                          ? "error"
                          : ""
                      }
                      placeholder="Enter complete address"
                    />
                    {showErrors && step1Errors.residenceAddress ? (
                      <Text type="danger">{step1Errors.residenceAddress}</Text>
                    ) : null}
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Pincode *</Text>
                    <Input
                      value={formData.pincode}
                      onChange={handleChange("pincode")}
                      maxLength={6}
                      style={{ marginTop: 6 }}
                      status={showErrors && step1Errors.pincode ? "error" : ""}
                      placeholder="6-digit pincode"
                    />
                    {showErrors && step1Errors.pincode ? (
                      <Text type="danger">{step1Errors.pincode}</Text>
                    ) : null}
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>City *</Text>
                    <Input
                      value={formData.city}
                      onChange={handleChange("city")}
                      style={{ marginTop: 6 }}
                      status={showErrors && step1Errors.city ? "error" : ""}
                      placeholder="City"
                    />
                    {showErrors && step1Errors.city ? (
                      <Text type="danger">{step1Errors.city}</Text>
                    ) : null}
                  </Col>
                </Row>
              </Card>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card size="small" title="Nominee (Optional)" bordered>
                    <Row gutter={[12, 12]}>
                      <Col span={24}>
                        <Input
                          value={formData.nomineeName}
                          onChange={handleChange("nomineeName")}
                          placeholder="Nominee Name"
                        />
                      </Col>
                      <Col span={24}>
                        <Input
                          value={formData.nomineeRelationship}
                          onChange={handleChange("nomineeRelationship")}
                          placeholder="Relationship"
                        />
                      </Col>
                      <Col span={24}>
                        <InputNumber
                          min={0}
                          value={Number(formData.nomineeAge || 0) || 0}
                          onChange={(v) =>
                            setField("nomineeAge", String(v ?? ""))
                          }
                          style={{ width: "100%" }}
                          placeholder="Nominee Age"
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card size="small" title="Reference (Optional)" bordered>
                    <Row gutter={[12, 12]}>
                      <Col span={24}>
                        <Input
                          value={formData.referenceName}
                          onChange={handleChange("referenceName")}
                          placeholder="Reference Name"
                        />
                      </Col>
                      <Col span={24}>
                        <Input
                          value={formData.referencePhone}
                          onChange={handleChange("referencePhone")}
                          placeholder="Reference Phone"
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            </>
          )}

          {step === 2 && (
            <Card
              size="small"
              title="Vehicle Details - Search & Auto-Fill"
              bordered
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text strong>Registration Number *</Text>
                  <Input
                    value={formData.registrationNumber}
                    onChange={(e) => {
                      const regNum = e.target.value;
                      setField("registrationNumber", regNum);

                      // Debounced search - auto-fetch vehicle data
                      if (vehicleSearchDebounceRef.current) {
                        clearTimeout(vehicleSearchDebounceRef.current);
                      }

                      if (regNum && regNum.length >= 3) {
                        vehicleSearchDebounceRef.current = setTimeout(
                          async () => {
                            try {
                              setVehicleSearchLoading(true);
                              const res = await vehiclesApi.searchMasterRecords(
                                regNum,
                                1,
                              );
                              const vehicles = Array.isArray(res?.data)
                                ? res.data
                                : [];

                              // Auto-apply if exact registration match found
                              if (vehicles.length > 0) {
                                const vehicle = vehicles[0];
                                const vehicleReg = (
                                  vehicle.registrationNumber ||
                                  vehicle.regNo ||
                                  ""
                                ).toUpperCase();
                                const inputReg = regNum.toUpperCase();

                                if (vehicleReg === inputReg) {
                                  applyVehicleToForm(vehicle);
                                }
                              }
                            } catch (err) {
                              console.error(
                                "[Insurance][AutoFetchVehicle] error:",
                                err,
                              );
                            } finally {
                              setVehicleSearchLoading(false);
                            }
                          },
                          800,
                        );
                      }
                    }}
                    style={{ marginTop: 6 }}
                    status={
                      showErrors && step2Errors.registrationNumber
                        ? "error"
                        : ""
                    }
                    placeholder="e.g. DL01AB1234"
                  />
                  {vehicleSearchLoading && (
                    <Text style={{ fontSize: 12, color: "#999" }}>
                      🔍 Fetching vehicle data...
                    </Text>
                  )}
                  {showErrors && step2Errors.registrationNumber ? (
                    <Text type="danger">{step2Errors.registrationNumber}</Text>
                  ) : null}
                </Col>
                <Col xs={24}>
                  <Text strong>Search Car (Make / Model)</Text>
                  <AutoComplete
                    value={vehicleSearchInput}
                    onSearch={handleVehicleSearch}
                    onChange={(val) => setVehicleSearchInput(val)}
                    placeholder="Type make/model (e.g. Hyundai Creta, Maruti Swift)..."
                    style={{ marginTop: 6, width: "100%" }}
                    loading={vehicleSearchLoading2}
                    notFoundContent={
                      vehicleSearchInput.length < 2
                        ? "Type at least 2 letters"
                        : vehicleSearchLoading2
                          ? "Searching..."
                          : "No matching cars"
                    }
                    options={vehicleSearchOptions.map((option) => ({
                      value: option.value,
                      label: (
                        <div>
                          <div style={{ fontWeight: 500 }}>{option.label}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {option.data?.registrationNumber ||
                              option.data?.regNo ||
                              ""}
                            {option.data?.vehicleVariant || option.data?.variant
                              ? ` • ${option.data.vehicleVariant || option.data.variant}`
                              : ""}
                            {option.data?.cubicCapacity || option.data?.cc
                              ? ` • ${option.data.cubicCapacity || option.data.cc} CC`
                              : ""}
                            {option.data?.manufactureYear ||
                            option.data?.mfgYear ||
                            option.data?.year
                              ? ` • ${option.data.manufactureYear || option.data.mfgYear || option.data.year}`
                              : ""}
                          </div>
                        </div>
                      ),
                      data: option.data,
                    }))}
                    onSelect={(_, option) => {
                      if (option?.data) {
                        applyVehicleToForm(option.data);
                        setVehicleSearchInput(option.value || "");
                      }
                    }}
                  />
                </Col>

                <Col xs={24} md={12}>
                  <Text strong>Brand *</Text>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Select
                      value={formData.vehicleMake || undefined}
                      placeholder="Select brand"
                      allowClear
                      onChange={(val) => {
                        setField("vehicleMake", val || "");
                        setField("vehicleModel", "");
                        setField("vehicleVariant", "");
                      }}
                      style={{ marginTop: 6, width: "100%" }}
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.children || "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      status={
                        showErrors && step2Errors.vehicleMake ? "error" : ""
                      }
                    >
                      {makeOptions.map((make) => (
                        <Select.Option key={make} value={make}>
                          {make}
                        </Select.Option>
                      ))}
                    </Select>
                    {formData.vehicleMake &&
                      vehicleSearchOptions.length > 0 && (
                        <Text type="success" style={{ fontSize: 12 }}>
                          ✓ Auto-filled from search
                        </Text>
                      )}
                  </Space>
                  {showErrors && step2Errors.vehicleMake ? (
                    <Text type="danger">{step2Errors.vehicleMake}</Text>
                  ) : null}
                </Col>

                <Col xs={24} md={12}>
                  <Text strong>Model *</Text>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Select
                      value={formData.vehicleModel || undefined}
                      placeholder="Select model"
                      allowClear
                      onChange={(val) => {
                        setField("vehicleModel", val || "");
                        setField("vehicleVariant", "");
                      }}
                      disabled={!formData.vehicleMake}
                      style={{ marginTop: 6, width: "100%" }}
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.children || "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      status={
                        showErrors && step2Errors.vehicleModel ? "error" : ""
                      }
                    >
                      {modelOptions.map((model) => (
                        <Select.Option key={model} value={model}>
                          {model}
                        </Select.Option>
                      ))}
                    </Select>
                    {formData.vehicleModel &&
                      vehicleSearchOptions.length > 0 && (
                        <Text type="success" style={{ fontSize: 12 }}>
                          ✓ Auto-filled from search
                        </Text>
                      )}
                  </Space>
                  {showErrors && step2Errors.vehicleModel ? (
                    <Text type="danger">{step2Errors.vehicleModel}</Text>
                  ) : null}
                </Col>

                <Col xs={24} md={12}>
                  <Text strong>Vehicle Variant *</Text>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Select
                      value={formData.vehicleVariant || undefined}
                      placeholder="Select variant"
                      allowClear
                      onChange={(val) => setField("vehicleVariant", val || "")}
                      disabled={!formData.vehicleMake || !formData.vehicleModel}
                      style={{ marginTop: 6, width: "100%" }}
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.children || "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      status={
                        showErrors && step2Errors.vehicleVariant ? "error" : ""
                      }
                    >
                      {variantOptions.map((variant) => (
                        <Select.Option key={variant} value={variant}>
                          {variant}
                        </Select.Option>
                      ))}
                    </Select>
                    {formData.vehicleVariant &&
                      vehicleSearchOptions.length > 0 && (
                        <Text type="success" style={{ fontSize: 12 }}>
                          ✓ Auto-filled from search
                        </Text>
                      )}
                  </Space>
                  {showErrors && step2Errors.vehicleVariant ? (
                    <Text type="danger">{step2Errors.vehicleVariant}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Cubic Capacity (cc)</Text>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Input
                      value={formData.cubicCapacity}
                      onChange={handleChange("cubicCapacity")}
                      style={{ marginTop: 6 }}
                      placeholder="Optional"
                    />
                    {formData.cubicCapacity &&
                      vehicleSearchOptions.length > 0 && (
                        <Text type="success" style={{ fontSize: 12 }}>
                          ✓ Auto-filled from search
                        </Text>
                      )}
                  </Space>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Engine Number *</Text>
                  <Input
                    value={formData.engineNumber}
                    onChange={handleChange("engineNumber")}
                    style={{ marginTop: 6 }}
                    status={
                      showErrors && step2Errors.engineNumber ? "error" : ""
                    }
                    placeholder="Engine number"
                  />
                  {showErrors && step2Errors.engineNumber ? (
                    <Text type="danger">{step2Errors.engineNumber}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Chassis Number *</Text>
                  <Input
                    value={formData.chassisNumber}
                    onChange={handleChange("chassisNumber")}
                    style={{ marginTop: 6 }}
                    status={
                      showErrors && step2Errors.chassisNumber ? "error" : ""
                    }
                    placeholder="Chassis number"
                  />
                  {showErrors && step2Errors.chassisNumber ? (
                    <Text type="danger">{step2Errors.chassisNumber}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Types of Vehicle</Text>
                  <Select
                    value={formData.typesOfVehicle || "Four Wheeler"}
                    onChange={(v) => setField("typesOfVehicle", v)}
                    style={{ width: "100%", marginTop: 6 }}
                    options={[{ label: "Four Wheeler", value: "Four Wheeler" }]}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Manufacture Month *</Text>
                  <Input
                    value={formData.manufactureMonth}
                    onChange={handleChange("manufactureMonth")}
                    style={{ marginTop: 6 }}
                    status={
                      showErrors && step2Errors.manufactureMonth ? "error" : ""
                    }
                    placeholder="e.g. 07"
                  />
                  {showErrors && step2Errors.manufactureMonth ? (
                    <Text type="danger">{step2Errors.manufactureMonth}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Manufacture Year *</Text>
                  <Input
                    value={formData.manufactureYear}
                    onChange={handleChange("manufactureYear")}
                    style={{ marginTop: 6 }}
                    status={
                      showErrors && step2Errors.manufactureYear ? "error" : ""
                    }
                    placeholder="e.g. 2026"
                  />
                  {showErrors && step2Errors.manufactureYear ? (
                    <Text type="danger">{step2Errors.manufactureYear}</Text>
                  ) : null}
                </Col>
              </Row>
              <Divider style={{ marginBlock: 12 }} />
              <Alert
                type="info"
                showIcon
                message="All vehicle details must be accurate and will be verified during policy issuance."
              />
            </Card>
          )}

          {step === 3 && !isNewCar && (
            <Card size="small" title="Previous Policy Details" bordered>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text strong>Insurance Company</Text>
                  <Input
                    value={formData.previousInsuranceCompany}
                    onChange={handleChange("previousInsuranceCompany")}
                    style={{ marginTop: 6 }}
                    placeholder="e.g., Bajaj General Insurance Limited"
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Number</Text>
                  <Input
                    value={formData.previousPolicyNumber}
                    onChange={handleChange("previousPolicyNumber")}
                    style={{ marginTop: 6 }}
                    placeholder="e.g., OG-25-1102-1801-00004082"
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Type *</Text>
                  <Select
                    value={formData.previousPolicyType}
                    onChange={(v) => {
                      setField("previousPolicyType", v);
                      setField("previousPolicyDuration", "");
                      setField("previousOdExpiryDate", "");
                      setField("previousTpExpiryDate", "");
                    }}
                    style={{ width: "100%", marginTop: 6 }}
                    options={[
                      { label: "Comprehensive", value: "Comprehensive" },
                      { label: "Stand Alone OD", value: "Stand Alone OD" },
                      { label: "Third Party", value: "Third Party" },
                    ]}
                    placeholder="Select policy type"
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    {formData.previousPolicyType === "Comprehensive" && "OD + TP combined coverage"}
                    {formData.previousPolicyType === "Stand Alone OD" && "OD coverage only"}
                    {formData.previousPolicyType === "Third Party" && "TP coverage only"}
                  </Text>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Start Date</Text>
                  <Input
                    type="date"
                    value={formData.previousPolicyStartDate}
                    onChange={(e) =>
                      handlePreviousPolicyStartOrDuration({
                        previousPolicyStartDate: e.target.value,
                      })
                    }
                    style={{ marginTop: 6 }}
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    Policy coverage start date
                  </Text>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Duration</Text>
                  <Select
                    value={formData.previousPolicyDuration}
                    onChange={(v) =>
                      handlePreviousPolicyStartOrDuration({
                        previousPolicyDuration: v,
                      })
                    }
                    style={{ width: "100%", marginTop: 6 }}
                    options={
                      formData.previousPolicyType === "Comprehensive"
                        ? [
                            { label: "1yr OD + 1yr TP", value: "1yr OD + 1yr TP" },
                            { label: "1yr OD + 3yr TP", value: "1yr OD + 3yr TP" },
                            { label: "2yr OD + 3yr TP", value: "2yr OD + 3yr TP" },
                            { label: "3yr OD + 3yr TP", value: "3yr OD + 3yr TP" },
                          ]
                        : formData.previousPolicyType === "Stand Alone OD"
                          ? [
                              { label: "1 Year", value: "1 Year" },
                              { label: "2 Years", value: "2 Years" },
                              { label: "3 Years", value: "3 Years" },
                            ]
                          : formData.previousPolicyType === "Third Party"
                            ? [
                                { label: "1 Year", value: "1 Year" },
                                { label: "2 Years", value: "2 Years" },
                                { label: "3 Years", value: "3 Years" },
                              ]
                            : []
                    }
                    placeholder={
                      formData.previousPolicyType === "Comprehensive"
                        ? "e.g., 1yr OD + 1yr TP"
                        : "e.g., 1 Year"
                    }
                    disabled={!formData.previousPolicyType}
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    {formData.previousPolicyType === "Comprehensive" && "Available: 1yr OD + 1yr TP, 1yr OD + 3yr TP, 2yr OD + 3yr TP, 3yr OD + 3yr TP"}
                    {formData.previousPolicyType === "Stand Alone OD" && "Available: 1 Year, 2 Years, 3 Years (OD coverage only)"}
                    {formData.previousPolicyType === "Third Party" && "Available: 1 Year, 2 Years, 3 Years (TP coverage only)"}
                  </Text>
                </Col>
                
                {formData.previousPolicyType === "Comprehensive" && (
                  <>
                    <Col xs={24} md={12}>
                      <Text strong>OD Expiry Date</Text>
                      <Input
                        type="date"
                        value={formData.previousOdExpiryDate}
                        onChange={handleChange("previousOdExpiryDate")}
                        style={{ marginTop: 6 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                        Auto-calculated: Start Date + OD Duration - 1 Day
                      </Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>TP Expiry Date</Text>
                      <Input
                        type="date"
                        value={formData.previousTpExpiryDate}
                        onChange={handleChange("previousTpExpiryDate")}
                        style={{ marginTop: 6 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                        Auto-calculated: Start Date + TP Duration - 1 Day
                      </Text>
                    </Col>
                  </>
                )}
                
                {formData.previousPolicyType === "Stand Alone OD" && (
                  <Col xs={24} md={12}>
                    <Text strong>OD Expiry Date</Text>
                    <Input
                      type="date"
                      value={formData.previousOdExpiryDate}
                      onChange={handleChange("previousOdExpiryDate")}
                      style={{ marginTop: 6 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                      Auto-calculated: Start Date + Duration - 1 Day
                    </Text>
                  </Col>
                )}
                
                {formData.previousPolicyType === "Third Party" && (
                  <Col xs={24} md={12}>
                    <Text strong>TP Expiry Date</Text>
                    <Input
                      type="date"
                      value={formData.previousTpExpiryDate}
                      onChange={handleChange("previousTpExpiryDate")}
                      style={{ marginTop: 6 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                      Auto-calculated: Start Date + Duration - 1 Day
                    </Text>
                  </Col>
                )}
                <Col xs={24} md={12}>
                  <Text strong>Claim Taken Last Year</Text>
                  <div style={{ marginTop: 6 }}>
                    <Radio.Group
                      value={formData.claimTakenLastYear}
                      onChange={(e) =>
                        setField("claimTakenLastYear", e.target.value)
                      }
                      options={[
                        { label: "Yes", value: "Yes" },
                        { label: "No", value: "No" },
                      ]}
                      optionType="button"
                      buttonStyle="solid"
                    />
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>NCB Discount (%)</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    value={Number(formData.previousNcbDiscount || 0)}
                    onChange={(v) =>
                      setField("previousNcbDiscount", Number(v || 0))
                    }
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Hypothecation</Text>
                  <Select
                    value={formData.previousHypothecation}
                    onChange={(v) => setField("previousHypothecation", v)}
                    style={{ width: "100%", marginTop: 6 }}
                    options={[
                      { label: "Not Applicable", value: "Not Applicable" },
                      { label: "HDFC Bank", value: "HDFC Bank" },
                      { label: "ICICI Bank", value: "ICICI Bank" },
                      { label: "SBI", value: "SBI" },
                    ]}
                  />
                </Col>
                <Col xs={24}>
                  <Text strong>Remarks</Text>
                  <Input.TextArea
                    rows={3}
                    value={formData.previousRemarks}
                    onChange={handleChange("previousRemarks")}
                    style={{ marginTop: 6 }}
                    placeholder="Notes for previous policy..."
                  />
                </Col>
              </Row>
            </Card>
          )}

          {step === 4 && (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Card
                size="small"
                title="Add New Quote"
                bordered
                className="border-slate-200 dark:border-slate-700 dark:bg-slate-950/30 [&_.ant-card-head]:border-slate-200 dark:[&_.ant-card-head]:border-slate-700 [&_.ant-card-head-title]:text-slate-900 dark:[&_.ant-card-head-title]:text-slate-100"
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Text strong>Insurance Company *</Text>
                    <Input
                      value={quoteDraft.insuranceCompany}
                      onChange={(e) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          insuranceCompany: e.target.value,
                        }))
                      }
                      style={{ marginTop: 6 }}
                      placeholder="Insurance Company"
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Coverage Type *</Text>
                    <Select
                      value={quoteDraft.coverageType}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({ ...p, coverageType: v }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                      options={[
                        { label: "Comprehensive", value: "Comprehensive" },
                        { label: "Third Party", value: "Third Party" },
                        { label: "Own Damage", value: "Own Damage" },
                      ]}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong>Vehicle IDV (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(quoteDraft.vehicleIdv || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          vehicleIdv: Number(v || 0),
                        }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong>CNG IDV (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(quoteDraft.cngIdv || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({ ...p, cngIdv: Number(v || 0) }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong>Accessories IDV (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(quoteDraft.accessoriesIdv || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          accessoriesIdv: Number(v || 0),
                        }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Policy Duration *</Text>
                    <Select
                      value={quoteDraft.policyDuration}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({ ...p, policyDuration: v }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                      options={durationOptions.map((d) => ({
                        label: d,
                        value: d,
                      }))}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>NCB Discount (%)</Text>
                    <InputNumber
                      min={0}
                      max={100}
                      value={Number(quoteDraft.ncbDiscount || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          ncbDiscount: Number(v || 0),
                        }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong>OD Amount (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(quoteDraft.odAmount || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          odAmount: Number(v || 0),
                        }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong>3rd Party Amount (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(quoteDraft.thirdPartyAmount || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          thirdPartyAmount: Number(v || 0),
                        }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong>Add-ons Amount (₹)</Text>
                    <Text
                      type="secondary"
                      style={{ display: "block", fontSize: 11, marginTop: 2 }}
                    >
                      Bulk add-on ₹ (also counts in base premium)
                    </Text>
                    <InputNumber
                      min={0}
                      value={Number(quoteDraft.addOnsAmount || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          addOnsAmount: Number(v || 0),
                        }))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                    />
                  </Col>
                </Row>

                <Divider className="border-slate-200 dark:border-slate-700/80" style={{ marginBlock: 16 }} />

                <Card
                  size="small"
                  className="rounded-[10px] border border-slate-200 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-900/60"
                  styles={{ body: { padding: "16px 16px 8px" } }}
                  title={
                    <Text
                      strong
                      className="text-[14px] text-slate-900 dark:text-slate-100"
                    >
                      Additional Add-ons (Optional)
                    </Text>
                  }
                  extra={
                    <Space size="small" wrap>
                      <Button
                        size="small"
                        type="primary"
                        className="!border-emerald-600 !bg-emerald-600 hover:!bg-emerald-700 dark:!border-emerald-500 dark:!bg-emerald-600 dark:hover:!bg-emerald-500"
                        onClick={() =>
                          setQuoteDraft((p) => ({
                            ...p,
                            addOns: addOnCatalog.reduce(
                              (acc, n) => ({ ...acc, [n]: 0 }),
                              {},
                            ),
                            addOnsIncluded: addOnCatalog.reduce(
                              (acc, n) => ({ ...acc, [n]: true }),
                              {},
                            ),
                          }))
                        }
                      >
                        Select All (₹0)
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={() =>
                          setQuoteDraft((p) => ({
                            ...p,
                            addOns: addOnCatalog.reduce(
                              (acc, n) => ({ ...acc, [n]: 0 }),
                              {},
                            ),
                            addOnsIncluded: addOnCatalog.reduce(
                              (acc, n) => ({ ...acc, [n]: false }),
                              {},
                            ),
                          }))
                        }
                      >
                        Deselect All
                      </Button>
                    </Space>
                  }
                >
                  <Alert
                    type="info"
                    showIcon
                    message={
                      <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                        Select add-ons with ₹0 amount to include them without
                        charges, or enter custom amounts for premium calculation.
                      </span>
                    }
                    className="mb-3.5 border-sky-200/80 bg-sky-50/90 dark:border-slate-600 dark:bg-slate-950/80 [&_.anticon]:text-sky-600 dark:[&_.anticon]:text-sky-400"
                  />

                  <Row gutter={[12, 12]}>
                    {addOnCatalog.map((name) => {
                      const included = Boolean(
                        quoteDraft.addOnsIncluded?.[name],
                      );
                      const amt = Number(quoteDraft.addOns?.[name] || 0);
                      return (
                        <Col xs={24} sm={12} lg={8} key={name}>
                          <div
                            className={`h-full rounded-lg border p-2.5 transition-colors ${
                              included
                                ? "border-violet-400 bg-white shadow-sm dark:border-violet-600 dark:bg-slate-950 dark:shadow-none"
                                : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
                            }`}
                          >
                            <Checkbox
                              checked={included}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setQuoteDraft((p) => ({
                                  ...p,
                                  addOnsIncluded: {
                                    ...p.addOnsIncluded,
                                    [name]: on,
                                  },
                                  addOns: {
                                    ...p.addOns,
                                    [name]: on
                                      ? Number(p.addOns?.[name] || 0)
                                      : 0,
                                  },
                                }));
                              }}
                              className="items-start [&_.ant-checkbox]:mt-0.5"
                            >
                              <Text
                                className="text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100"
                              >
                                {name}
                              </Text>
                            </Checkbox>
                            <div className="mt-2 ml-6">
                              <Text
                                className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400"
                              >
                                Amount (₹)
                              </Text>
                              <InputNumber
                                min={0}
                                size="middle"
                                disabled={!included}
                                value={amt}
                                addonBefore="₹"
                                controls={false}
                                placeholder="0"
                                onChange={(v) =>
                                  setQuoteDraft((p) => ({
                                    ...p,
                                    addOns: {
                                      ...p.addOns,
                                      [name]: Number(v ?? 0),
                                    },
                                  }))
                                }
                                className="w-full max-w-full dark:[&_.ant-input-number-group-addon]:border-slate-600 dark:[&_.ant-input-number-group-addon]:bg-slate-800 dark:[&_.ant-input-number-input]:text-slate-100"
                              />
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </Card>

                <div className="mt-4 rounded-lg border border-purple-200/90 bg-purple-50/95 p-4 dark:border-purple-900/60 dark:bg-purple-950/40">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        Base Premium
                      </Text>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {toINR(quoteComputed.basePremium)}
                      </div>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        OD: {toINR(quoteComputed.odAmt)} + 3P:{" "}
                        {toINR(quoteComputed.tpAmt)} + Add-ons:{" "}
                        {toINR(quoteComputed.addOnsTotal)}
                      </Text>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        Add-ons Total
                      </Text>
                      <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                        {toINR(quoteComputed.addOnsTotal)}
                      </div>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        (Bulk field + selected rows)
                      </Text>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        NCB Discount
                      </Text>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        -{toINR(quoteComputed.ncbAmount)}
                      </div>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        ({Number(quoteDraft.ncbDiscount || 0)}% on base)
                      </Text>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        GST (18%)
                      </Text>
                      <div className="text-lg font-bold text-sky-600 dark:text-sky-400">
                        {toINR(quoteComputed.gstAmount)}
                      </div>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        On {toINR(quoteComputed.taxableAmount)}
                      </Text>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        Total Premium
                      </Text>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {toINR(quoteComputed.totalPremium)}
                      </div>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        (Taxable + GST)
                      </Text>
                    </Col>
                  </Row>

                  <Divider className="border-slate-200 dark:border-slate-700/80" style={{ margin: "16px 0" }} />

                  <Text
                    strong
                    className="mb-3 block text-purple-800 dark:text-purple-200"
                  >
                    IDV Breakdown
                  </Text>
                  <Row gutter={[12, 8]}>
                    <Col xs={12} sm={6}>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        Vehicle IDV
                      </Text>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {toINR(quoteDraft.vehicleIdv || 0)}
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        CNG IDV
                      </Text>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {toINR(quoteDraft.cngIdv || 0)}
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        Accessories IDV
                      </Text>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {toINR(quoteDraft.accessoriesIdv || 0)}
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        Total IDV
                      </Text>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {toINR(quoteComputed.totalIdv)}
                      </div>
                    </Col>
                  </Row>

                  <Divider className="border-slate-200 dark:border-slate-700/80" style={{ margin: "12px 0" }} />

                  <Row gutter={[12, 8]}>
                    <Col xs={12} sm={6}>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        OD Amount
                      </Text>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {toINR(quoteComputed.odAmt)}
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        3rd Party Amount
                      </Text>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {toINR(quoteComputed.tpAmt)}
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        Add-ons Total
                      </Text>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {toINR(quoteComputed.addOnsTotal)}
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        Taxable Amount
                      </Text>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {toINR(quoteComputed.taxableAmount)}
                      </div>
                    </Col>
                  </Row>
                </div>

                <Divider style={{ marginBlock: 16 }} />
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} md={12}>
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<span className="text-base leading-none">+</span>}
                        onClick={addQuote}
                        disabled={!quoteDraft.insuranceCompany.trim()}
                      >
                        Add Quote
                      </Button>
                      <Button
                        onClick={() =>
                          setQuoteDraft({
                            ...initialQuoteDraft,
                            addOns: { ...initialQuoteDraft.addOns },
                            addOnsIncluded: {
                              ...initialQuoteDraft.addOnsIncluded,
                            },
                          })
                        }
                      >
                        Reset
                      </Button>
                    </Space>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tip: fill company & premiums above, tune add-ons, then Add
                      Quote to save this row to the list.
                    </Text>
                  </Col>
                </Row>
              </Card>

              <Card
                size="small"
                title={`Generated Quotes (${quotes.length})`}
                extra={
                  acceptedQuote ? (
                    <Text type="success">
                      Accepted: {acceptedQuote.insuranceCompany}
                    </Text>
                  ) : (
                    <Text type="secondary">No accepted quote</Text>
                  )
                }
                bordered
                className="border-slate-200 dark:border-slate-700 dark:bg-slate-950/20 [&_.ant-card-head]:border-slate-200 dark:[&_.ant-card-head]:border-slate-700"
              >
                {quoteRows.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className="text-slate-500 dark:text-slate-400">
                        No quotes yet. Add one using the form above.
                      </span>
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {quoteRows.map((row) => {
                      const rid = getQuoteRowId(row);
                      const isAccepted =
                        String(acceptedQuoteId) === String(rid);
                      return (
                        <div
                          key={String(rid)}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold uppercase text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {(row.insuranceCompany || "?")
                                  .toString()
                                  .slice(0, 1)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                                  {row.insuranceCompany || "—"}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {row.coverageType || "—"} ·{" "}
                                  {row.policyDuration || "—"}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-end gap-6 sm:gap-8">
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  IDV — Cover value
                                </div>
                                <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                  {formatStoredOrComputedIdv(row)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Total premium
                                </div>
                                <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                  {formatStoredOrComputedPremium(row)}
                                </div>
                              </div>
                              <Space wrap size={[8, 8]}>
                                <Button
                                  type="primary"
                                  onClick={() =>
                                    setPlanFeaturesModal({
                                      open: true,
                                      row,
                                    })
                                  }
                                >
                                  Plan features
                                </Button>
                                <Button
                                  type={isAccepted ? "primary" : "default"}
                                  onClick={() => acceptQuote(rid)}
                                >
                                  {isAccepted ? "Accepted" : "Accept"}
                                </Button>
                                <Button
                                  type="link"
                                  className="px-1"
                                  onClick={() =>
                                    setQuoteDraft(mapQuoteToDraft(row))
                                  }
                                >
                                  Load in form
                                </Button>
                              </Space>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showErrors && quotes.length === 0 ? (
                  <div className="mt-2">
                    <Text type="danger">At least 1 quote is required.</Text>
                  </div>
                ) : null}
              </Card>
            </Space>
          )}

          {step === 5 && (
            <Card size="small" title="New Policy Details" bordered>
              {!acceptedQuote ? (
                <Alert
                  type="warning"
                  showIcon
                  message="No accepted quote selected yet."
                  description="Please accept a quote in Step 4 to auto-fill policy details."
                  style={{ marginBottom: 12 }}
                />
              ) : null}
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text strong>Insurance Company *</Text>
                  <Input
                    value={formData.newInsuranceCompany}
                    onChange={handleChange("newInsuranceCompany")}
                    style={{ marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Type *</Text>
                  <Select
                    value={formData.newPolicyType}
                    onChange={(v) => {
                      setField("newPolicyType", v);
                      setField("newInsuranceDuration", "");
                      setField("newOdExpiryDate", "");
                      setField("newTpExpiryDate", "");
                    }}
                    style={{ width: "100%", marginTop: 6 }}
                    options={[
                      { label: "Comprehensive", value: "Comprehensive" },
                      { label: "Stand Alone OD", value: "Stand Alone OD" },
                      { label: "Third Party", value: "Third Party" },
                    ]}
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    {formData.newPolicyType === "Comprehensive" && "OD + TP combined coverage"}
                    {formData.newPolicyType === "Stand Alone OD" && "OD coverage only"}
                    {formData.newPolicyType === "Third Party" && "TP coverage only"}
                  </Text>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Number</Text>
                  <Input
                    value={formData.newPolicyNumber}
                    onChange={handleChange("newPolicyNumber")}
                    style={{ marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Issue Date *</Text>
                  <Input
                    type="date"
                    value={formData.newIssueDate}
                    onChange={handleChange("newIssueDate")}
                    style={{ marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Start Date *</Text>
                  <Input
                    type="date"
                    value={formData.newPolicyStartDate}
                    onChange={(e) =>
                      handleNewPolicyStartOrDuration({
                        newPolicyStartDate: e.target.value,
                      })
                    }
                    style={{ marginTop: 6 }}
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    Policy coverage start date
                  </Text>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Insurance Duration *</Text>
                  <Select
                    value={formData.newInsuranceDuration}
                    onChange={(v) =>
                      handleNewPolicyStartOrDuration({
                        newInsuranceDuration: v,
                      })
                    }
                    style={{ width: "100%", marginTop: 6 }}
                    options={
                      formData.newPolicyType === "Comprehensive"
                        ? [
                            { label: "1yr OD + 1yr TP", value: "1yr OD + 1yr TP" },
                            { label: "1yr OD + 3yr TP", value: "1yr OD + 3yr TP" },
                            { label: "2yr OD + 3yr TP", value: "2yr OD + 3yr TP" },
                            { label: "3yr OD + 3yr TP", value: "3yr OD + 3yr TP" },
                          ]
                        : formData.newPolicyType === "Stand Alone OD"
                          ? [
                              { label: "1 Year", value: "1 Year" },
                              { label: "2 Years", value: "2 Years" },
                              { label: "3 Years", value: "3 Years" },
                            ]
                          : formData.newPolicyType === "Third Party"
                            ? [
                                { label: "1 Year", value: "1 Year" },
                                { label: "2 Years", value: "2 Years" },
                                { label: "3 Years", value: "3 Years" },
                              ]
                            : durationOptions.map((d) => ({
                                label: d,
                                value: d,
                              }))
                    }
                    placeholder={
                      formData.newPolicyType === "Comprehensive"
                        ? "e.g., 1yr OD + 1yr TP"
                        : "e.g., 1 Year"
                    }
                    disabled={!formData.newPolicyType}
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    {formData.newPolicyType === "Comprehensive" && "Available: 1yr OD + 1yr TP, 1yr OD + 3yr TP, 2yr OD + 3yr TP, 3yr OD + 3yr TP"}
                    {formData.newPolicyType === "Stand Alone OD" && "Available: 1 Year, 2 Years, 3 Years (OD coverage only)"}
                    {formData.newPolicyType === "Third Party" && "Available: 1 Year, 2 Years, 3 Years (TP coverage only)"}
                  </Text>
                </Col>
                
                {formData.newPolicyType === "Comprehensive" && (
                  <>
                    <Col xs={24} md={12}>
                      <Text strong>OD Expiry Date *</Text>
                      <Input
                        type="date"
                        value={formData.newOdExpiryDate}
                        onChange={handleChange("newOdExpiryDate")}
                        style={{ marginTop: 6 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                        Auto-calculated: Start Date + OD Duration - 1 Day
                      </Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>TP Expiry Date *</Text>
                      <Input
                        type="date"
                        value={formData.newTpExpiryDate}
                        onChange={handleChange("newTpExpiryDate")}
                        style={{ marginTop: 6 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                        Auto-calculated: Start Date + TP Duration - 1 Day
                      </Text>
                    </Col>
                  </>
                )}
                
                {formData.newPolicyType === "Stand Alone OD" && (
                  <Col xs={24} md={12}>
                    <Text strong>OD Expiry Date *</Text>
                    <Input
                      type="date"
                      value={formData.newOdExpiryDate}
                      onChange={handleChange("newOdExpiryDate")}
                      style={{ marginTop: 6 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                      Auto-calculated: Start Date + Duration - 1 Day
                    </Text>
                  </Col>
                )}
                
                {formData.newPolicyType === "Third Party" && (
                  <Col xs={24} md={12}>
                    <Text strong>TP Expiry Date *</Text>
                    <Input
                      type="date"
                      value={formData.newTpExpiryDate}
                      onChange={handleChange("newTpExpiryDate")}
                      style={{ marginTop: 6 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                      Auto-calculated: Start Date + Duration - 1 Day
                    </Text>
                  </Col>
                )}
                <Col xs={24} md={12}>
                  <Text strong>NCB Discount (%)</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    value={Number(formData.newNcbDiscount || 0)}
                    onChange={(v) => setField("newNcbDiscount", Number(v || 0))}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>IDV Amount (₹) *</Text>
                  <InputNumber
                    min={0}
                    value={Number(formData.newIdvAmount || 0)}
                    onChange={(v) => setField("newIdvAmount", Number(v || 0))}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Total Premium (₹) *</Text>
                  <InputNumber
                    min={0}
                    value={Number(formData.newTotalPremium || 0)}
                    onChange={(v) =>
                      setField("newTotalPremium", Number(v || 0))
                    }
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Hypothecation</Text>
                  <Select
                    value={formData.newHypothecation}
                    onChange={(v) => setField("newHypothecation", v)}
                    style={{ width: "100%", marginTop: 6 }}
                    options={[
                      { label: "Not Applicable", value: "Not Applicable" },
                      { label: "HDFC Bank", value: "HDFC Bank" },
                      { label: "ICICI Bank", value: "ICICI Bank" },
                      { label: "SBI", value: "SBI" },
                    ]}
                  />
                </Col>
                <Col xs={24}>
                  <Text strong>Remarks</Text>
                  <Input.TextArea
                    rows={3}
                    value={formData.newRemarks}
                    onChange={handleChange("newRemarks")}
                    style={{ marginTop: 6 }}
                  />
                </Col>
              </Row>

              <Divider style={{ marginBlock: 16 }} />

              <Card
                size="small"
                title="Payment Tracking (Optional)"
                bordered={false}
                className="bg-slate-50/50 dark:bg-slate-900/30"
              >
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 12, fontSize: 12 }}
                >
                  Track customer and in-house payments. Leave at 0 if not
                  applicable. Used for "Fully Paid" vs "Payment Due" filters.
                </Text>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Text strong>Customer Payment Expected (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(formData.customerPaymentExpected || 0)}
                      onChange={(v) =>
                        setField("customerPaymentExpected", Number(v || 0))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                      placeholder="0"
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Customer Payment Received (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(formData.customerPaymentReceived || 0)}
                      onChange={(v) =>
                        setField("customerPaymentReceived", Number(v || 0))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                      placeholder="0"
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>In-house Payment Expected (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(formData.inhousePaymentExpected || 0)}
                      onChange={(v) =>
                        setField("inhousePaymentExpected", Number(v || 0))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                      placeholder="0"
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>In-house Payment Received (₹)</Text>
                    <InputNumber
                      min={0}
                      value={Number(formData.inhousePaymentReceived || 0)}
                      onChange={(v) =>
                        setField("inhousePaymentReceived", Number(v || 0))
                      }
                      style={{ width: "100%", marginTop: 6 }}
                      placeholder="0"
                    />
                  </Col>
                </Row>
                {paymentHistory.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      Payment History ({paymentHistory.length})
                    </Text>
                    <Table
                      size="small"
                      dataSource={paymentHistory.map((p, idx) => ({
                        key: p._id || idx,
                        ...p,
                      }))}
                      pagination={false}
                      columns={[
                        {
                          title: "Date",
                          dataIndex: "date",
                          key: "date",
                          width: 120,
                          render: (d) =>
                            d
                              ? dayjs(d).format("DD MMM YYYY")
                              : "—",
                        },
                        {
                          title: "Type",
                          dataIndex: "paymentType",
                          key: "type",
                          width: 100,
                          render: (t) =>
                            t === "customer" ? "Customer" : "In-house",
                        },
                        {
                          title: "Amount",
                          dataIndex: "amount",
                          key: "amount",
                          width: 120,
                          render: (a) => toINR(a),
                        },
                        {
                          title: "Mode",
                          dataIndex: "paymentMode",
                          key: "mode",
                          width: 100,
                        },
                        {
                          title: "Ref",
                          dataIndex: "transactionRef",
                          key: "ref",
                          width: 140,
                        },
                        {
                          title: "Remarks",
                          dataIndex: "remarks",
                          key: "remarks",
                        },
                      ]}
                    />
                  </div>
                )}
                <Space style={{ marginTop: 12, width: "100%" }} direction="vertical">
                  <Button
                    type="dashed"
                    block
                    onClick={() => setPaymentModalVisible(true)}
                  >
                    + Record Payment
                  </Button>
                  {insuranceDbId && formData.customerPaymentExpected > 0 && (
                    <Button
                      block
                      onClick={async () => {
                        try {
                          await insuranceApi.syncReceivable(insuranceDbId);
                          message.success(
                            "Customer payment synced to Receivables module"
                          );
                        } catch (err) {
                          message.error(
                            err?.message || "Failed to sync receivable"
                          );
                        }
                      }}
                    >
                      Sync to Receivables Module
                    </Button>
                  )}
                </Space>
              </Card>
            </Card>
          )}

          {step === 7 && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card size="small" title="Payment Summary" bordered>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                      <Text type="secondary" className="text-xs">Final Premium</Text>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        ₹{(formData.newTotalPremium || 0).toLocaleString("en-IN")}
                      </div>
                      <Text type="secondary" className="text-[10px]">From accepted quote</Text>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                      <Text type="secondary" className="text-xs">Subvention</Text>
                      <div className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">
                        ₹{(formData.subventionAmount || 0).toLocaleString("en-IN")}
                      </div>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          const amount = prompt("Enter subvention amount:", formData.subventionAmount || 0);
                          if (amount !== null) setField("subventionAmount", Number(amount));
                        }}
                        className="p-0 text-[10px]"
                      >
                        + Add Subvention
                      </Button>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
                      <Text type="secondary" className="text-xs">Net Premium</Text>
                      <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                        ₹{Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0)).toLocaleString("en-IN")}
                      </div>
                      <Text type="secondary" className="text-[10px]">After subvention</Text>
                    </div>
                  </Col>
                </Row>

                <Divider />

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <Text strong>Payment Progress (After Subvention)</Text>
                  <div className="mt-2 text-2xl font-bold">
                    {(() => {
                      const netPremium = Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0));
                      const totalPaid = (formData.customerPaymentReceived || 0);
                      const progress = netPremium > 0 ? (totalPaid / netPremium) * 100 : 0;
                      return `${progress.toFixed(1)}%`;
                    })()}
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${(() => {
                          const netPremium = Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0));
                          const totalPaid = (formData.customerPaymentReceived || 0);
                          const progress = netPremium > 0 ? (totalPaid / netPremium) * 100 : 0;
                          return Math.min(100, progress);
                        })()}%`,
                      }}
                    />
                  </div>
                  <Text type="secondary" className="mt-1 text-xs">
                    Progress: ₹{(formData.customerPaymentReceived || 0).toLocaleString("en-IN")} / ₹
                    {Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0)).toLocaleString("en-IN")}
                  </Text>
                </div>
              </Card>

              <Card size="small" title="In House Payment" bordered extra={<Text type="secondary" className="text-xs">Auto Credit to Insurance Company</Text>}>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Text strong>Amount (₹) *</Text>
                      <InputNumber
                        min={0}
                        value={paymentForm.paymentType === "inhouse" ? paymentForm.amount : 0}
                        onChange={(v) => setPaymentForm((p) => ({ ...p, amount: v, paymentType: "inhouse" }))}
                        style={{ width: "100%", marginTop: 6 }}
                        placeholder="₹ 0.00"
                        prefix="₹"
                      />
                      <Text type="secondary" className="text-[10px]">
                        Auto credit amount: ₹{(formData.newTotalPremium || 0).toLocaleString("en-IN")} (Final Premium)
                      </Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Payment Mode *</Text>
                      <Select
                        value={paymentForm.paymentType === "inhouse" ? paymentForm.paymentMode : "Cash"}
                        onChange={(v) => setPaymentForm((p) => ({ ...p, paymentMode: v, paymentType: "inhouse" }))}
                        style={{ width: "100%", marginTop: 6 }}
                        placeholder="Select payment mode"
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
                      <Text strong>Payment Date *</Text>
                      <Input
                        type="date"
                        value={paymentForm.paymentType === "inhouse" ? paymentForm.date : new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value, paymentType: "inhouse" }))}
                        style={{ marginTop: 6 }}
                        placeholder="mm/dd/yyyy"
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Transaction ID</Text>
                      <Input
                        value={paymentForm.paymentType === "inhouse" ? paymentForm.transactionRef : ""}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, transactionRef: e.target.value, paymentType: "inhouse" }))}
                        style={{ marginTop: 6 }}
                        placeholder="Enter transaction ID (optional)"
                      />
                      <Text type="secondary" className="text-[10px]">Optional for cash payments</Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Bank Name</Text>
                      <Input
                        value={paymentForm.paymentType === "inhouse" ? (paymentForm.bankName || "") : ""}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, bankName: e.target.value, paymentType: "inhouse" }))}
                        style={{ marginTop: 6 }}
                        placeholder="Select Bank Name"
                      />
                      <Text type="secondary" className="text-[10px]">Required for bank transfers</Text>
                    </Col>
                  </Row>
                </div>
              </Card>

              <Card 
                size="small" 
                title="Payment Made by Customer (Optional)" 
                bordered 
                extra={<Text type="secondary" className="text-xs">Fill only if customer has made payment</Text>}
              >
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Text strong>Payment Mode</Text>
                      <Select
                        value={paymentForm.paymentType === "customer" ? paymentForm.paymentMode : undefined}
                        onChange={(v) => setPaymentForm((p) => ({ ...p, paymentMode: v, paymentType: "customer" }))}
                        style={{ width: "100%", marginTop: 6 }}
                        placeholder="Select payment mode"
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
                      <Text strong>Payment Amount (₹)</Text>
                      <InputNumber
                        min={0}
                        value={paymentForm.paymentType === "customer" ? paymentForm.amount : 0}
                        onChange={(v) => setPaymentForm((p) => ({ ...p, amount: v, paymentType: "customer" }))}
                        style={{ width: "100%", marginTop: 6 }}
                        placeholder="0"
                      />
                      <Text type="secondary" className="text-[10px]">
                        Maximum: ₹{Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0)).toLocaleString("en-IN")} (Customer can pay up to ₹{Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0)).toLocaleString("en-IN")} total)
                      </Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Payment Date</Text>
                      <Input
                        type="date"
                        value={paymentForm.paymentType === "customer" ? paymentForm.date : ""}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value, paymentType: "customer" }))}
                        style={{ marginTop: 6 }}
                        placeholder="mm/dd/yyyy"
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Transaction ID</Text>
                      <Input
                        value={paymentForm.paymentType === "customer" ? paymentForm.transactionRef : ""}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, transactionRef: e.target.value, paymentType: "customer" }))}
                        style={{ marginTop: 6 }}
                        placeholder="Enter transaction ID (optional)"
                      />
                      <Text type="secondary" className="text-[10px]">Optional for cash payments</Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Bank Name</Text>
                      <Input
                        value={paymentForm.paymentType === "customer" ? (paymentForm.bankName || "") : ""}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, bankName: e.target.value, paymentType: "customer" }))}
                        style={{ marginTop: 6 }}
                        placeholder="Select Bank Name"
                      />
                      <Text type="secondary" className="text-[10px]">Required for bank transfers</Text>
                    </Col>
                  </Row>
                </div>

                <Button
                  type="primary"
                  block
                  className="mt-4"
                  onClick={() => {
                    if (!paymentForm.amount || paymentForm.amount <= 0) {
                      message.error("Please enter a valid amount");
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
                        customerPaymentReceived: Number(prev.customerPaymentReceived || 0) + Number(paymentForm.amount),
                      }));
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        inhousePaymentReceived: Number(prev.inhousePaymentReceived || 0) + Number(paymentForm.amount),
                      }));
                    }

                    setPaymentForm({
                      amount: 0,
                      date: new Date().toISOString().slice(0, 10),
                      paymentType: "inhouse",
                      paymentMode: "Cash",
                      transactionRef: "",
                      remarks: "",
                      bankName: "",
                    });
                    schedulePersist(250);
                    message.success("Payment added to ledger");
                  }}
                >
                  Add Payment to Ledger
                </Button>
              </Card>

              <Card
                size="small"
                title={
                  <Space>
                    <span>Payment Ledger</span>
                    <Text type="secondary" className="text-xs">
                      {paymentHistory.length} payment(s) recorded
                    </Text>
                    {(() => {
                      const netPremium = Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0));
                      const totalPaid = formData.customerPaymentReceived || 0;
                      return totalPaid >= netPremium && netPremium > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          Fully Paid
                        </span>
                      ) : null;
                    })()}
                  </Space>
                }
                bordered
              >
                {paymentHistory.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div>
                        <Text type="secondary">No payment records found</Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          Add payments using the form above
                        </Text>
                      </div>
                    }
                  />
                ) : (
                  <Table
                    size="small"
                    dataSource={paymentHistory.map((p, idx) => ({ key: p._id || idx, ...p }))}
                    pagination={false}
                    columns={[
                      {
                        title: "Date",
                        dataIndex: "date",
                        width: 110,
                        render: (d) => (d ? dayjs(d).format("DD MMM YYYY") : "—"),
                      },
                      {
                        title: "Type",
                        dataIndex: "paymentType",
                        width: 100,
                        render: (t) => (
                          <span className={t === "customer" ? "text-sky-600" : "text-amber-600"}>
                            {t === "customer" ? "Customer" : "In-house"}
                          </span>
                        ),
                      },
                      {
                        title: "Amount",
                        dataIndex: "amount",
                        width: 120,
                        render: (a) => <span className="font-semibold">₹{a.toLocaleString("en-IN")}</span>,
                      },
                      {
                        title: "Mode",
                        dataIndex: "paymentMode",
                        width: 90,
                      },
                      {
                        title: "Transaction Ref",
                        dataIndex: "transactionRef",
                        width: 140,
                      },
                      {
                        title: "Bank",
                        dataIndex: "bankName",
                        width: 120,
                      },
                    ]}
                  />
                )}
              </Card>
            </Space>
          )}

          {step === 6 && (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Card
                size="small"
                title="Documents"
                extra={
                  <Space>
                    <Text
                      type={allUploadedDocsTagged ? "success" : "secondary"}
                    >
                      Tagged {docsTaggedCount}/{documents.length}
                    </Text>
                    <Button
                      danger
                      onClick={() => {
                        setDocuments([]);
                        schedulePersist(250);
                      }}
                      disabled={!documents.length}
                    >
                      Clear All
                    </Button>
                  </Space>
                }
                bordered
              >
                <Text type="secondary">
                  Upload files and tag them (RC, Forms, PAN, Aadhaar/GST,
                  policies, etc.).
                </Text>
                <Divider style={{ marginBlock: 12 }} />
                <Dragger
                  multiple
                  beforeUpload={() => false}
                  showUploadList={false}
                  onChange={(info) => {
                    const files = info?.fileList || [];
                    const incoming = files
                      .map((f) => f.originFileObj)
                      .filter(Boolean)
                      .map((file) => ({
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        tag: "",
                      }));
                    if (incoming.length) {
                      setDocuments((prev) => [...prev, ...incoming]);
                      schedulePersist(250);
                    }
                  }}
                >
                  <p className="ant-upload-drag-icon" />
                  <p className="ant-upload-text">
                    Click or drag files to upload
                  </p>
                  <p className="ant-upload-hint">Multiple files supported</p>
                </Dragger>
              </Card>

              <Card size="small" title="Uploaded Files" bordered>
                <Table
                  size="small"
                  dataSource={docRows}
                  pagination={false}
                  columns={[
                    { title: "File", dataIndex: "name", key: "name" },
                    {
                      title: "Size (KB)",
                      dataIndex: "sizeKb",
                      key: "size",
                      width: 120,
                    },
                    {
                      title: "Tag",
                      key: "tag",
                      width: 220,
                      render: (_, row) => (
                        <Select
                          value={row.tag || undefined}
                          placeholder="Select tag"
                          style={{ width: "100%" }}
                          options={requiredDocumentTags.map((t) => ({
                            label: t,
                            value: t,
                          }))}
                          onChange={(v) => {
                            setDocuments((prev) =>
                              prev.map((x) =>
                                x.id === row.id ? { ...x, tag: v } : x,
                              ),
                            );
                            schedulePersist(250);
                          }}
                        />
                      ),
                    },
                  ]}
                />
                {!documents.length ? (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">No documents uploaded yet.</Text>
                  </div>
                ) : null}
              </Card>
            </Space>
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
              {step < 6 ? (
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
          title={
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Plan features
            </span>
          }
          open={planFeaturesModal.open}
          onCancel={() => setPlanFeaturesModal({ open: false, row: null })}
          footer={null}
          width={960}
          centered
          destroyOnClose
          zIndex={1100}
          getContainer={() => document.body}
          styles={{
            body: {
              padding: 0,
              maxHeight: "min(85vh, 900px)",
              overflowY: "auto",
            },
            header: { marginBottom: 0 },
            content: { padding: 0 },
          }}
          className="[&_.ant-modal-content]:rounded-2xl [&_.ant-modal-header]:border-slate-200 [&_.ant-modal-header]:px-6 [&_.ant-modal-header]:py-4 dark:[&_.ant-modal-header]:border-slate-700"
        >
          {planFeaturesModal.row ? (
            <PlanFeaturesModalBody
              key={String(getQuoteRowId(planFeaturesModal.row))}
              row={planFeaturesModal.row}
              acceptedQuoteId={acceptedQuoteId}
              onAcceptAndClose={(rid) => {
                acceptQuote(rid);
                setPlanFeaturesModal({ open: false, row: null });
                message.success("Quote accepted");
              }}
              getQuoteRowId={getQuoteRowId}
              computeQuoteBreakupFromRow={computeQuoteBreakupFromRow}
              toINR={toINR}
            />
          ) : (
            <div className="px-8 py-10 text-center">
              <Text type="secondary">No quote selected.</Text>
            </div>
          )}
        </Modal>

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
