import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { message, Modal, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { loansApi } from "../../api/loans";
import Icon from "../../components/AppIcon";
import LoansDataGrid from "../loans/components/dashboard/LoansDataGrid";
import LoanViewModal from "../loans/components/dashboard/LoanViewModal";
import DashboardNotesModal from "../loans/components/dashboard/DashboardNotesModal";

const hasValue = (v) =>
  v !== undefined &&
  v !== null &&
  !(typeof v === "string" && v.trim() === "");

const asText = (v) => {
  if (!hasValue(v)) return "—";
  if (Array.isArray(v)) {
    const parts = v.map((x) => String(x ?? "").trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  return String(v);
};

const asDate = (v) => {
  if (!hasValue(v)) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD MMM YYYY") : String(v);
};

const asMoney = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const asYesNo = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (!hasValue(value)) return "—";
  return asText(value);
};

const normalizeIdentityValue = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizePhoneValue = (value) => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const normalizePanValue = (value) =>
  String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();

const getLoanId = (loan) =>
  String(loan?._id || loan?.loanId || loan?.loan_number || loan?.id || "").trim();

const toLoanRows = (response) => {
  const direct = Array.isArray(response) ? response : [];
  if (direct.length) return direct;

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.loans)) return response.loans;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const scoreLoanRichness = (loan) => {
  if (!loan || typeof loan !== "object") return 0;
  return Object.values(loan).reduce(
    (count, value) => (hasMeaningfulValue(value) ? count + 1 : count),
    0,
  );
};

const mergeLoanRecord = (existing, incoming) => {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const merged = { ...existing };
  Object.entries(incoming).forEach(([key, value]) => {
    if (!hasMeaningfulValue(value)) return;
    merged[key] = value;
  });
  return merged;
};

const firstMeaningfulText = (...values) => {
  for (const value of values) {
    if (!hasMeaningfulValue(value)) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const normalizeLinkedLoanForGrid = (loan) => {
  const normalizedLoanId = String(
    loan?.loan_number ||
      loan?.loanNumber ||
      loan?.loan_no ||
      loan?.loanId ||
      loan?.caseId ||
      loan?._id ||
      "",
  ).trim();

  const typeOfLoan = firstMeaningfulText(
    loan?.typeOfLoan,
    loan?.loanType,
    loan?.caseType,
    loan?.loan_type,
  );

  const approvalBank = firstMeaningfulText(
    loan?.approval_bankName,
    loan?.bankName,
    loan?.approval_banksData?.[0]?.bankName,
    loan?.approval_banksData?.[0]?.name,
  );

  const approvalAmountApproved =
    loan?.approval_loanAmountApproved ??
    loan?.approval_banksData?.[0]?.loanAmount ??
    loan?.loanAmount ??
    loan?.financeExpectation ??
    0;

  const approvalAmountDisbursed =
    loan?.approval_loanAmountDisbursed ??
    loan?.disbursedAmount ??
    loan?.approval_banksData?.[0]?.disbursedAmount ??
    0;

  const emiAmount =
    loan?.postfile_emiAmount ??
    loan?.emiAmount ??
    loan?.approval_banksData?.[0]?.emiAmount ??
    loan?.approval_banksData?.[0]?.emi ??
    0;

  const isFinancedRaw = loan?.isFinanced ?? loan?.isFinanceRequired;
  const inferredIsFinanced = (() => {
    if (isFinancedRaw !== undefined && isFinancedRaw !== null && String(isFinancedRaw).trim() !== "") {
      return isFinancedRaw;
    }
    if (String(typeOfLoan).toLowerCase().includes("cash")) return "No";
    if (
      hasMeaningfulValue(approvalBank) ||
      Number(approvalAmountApproved || 0) > 0 ||
      Number(approvalAmountDisbursed || 0) > 0
    ) {
      return "Yes";
    }
    return "";
  })();

  return {
    ...loan,
    loanId: normalizedLoanId,
    loan_number: firstMeaningfulText(loan?.loan_number, normalizedLoanId),
    typeOfLoan,
    customerName: firstMeaningfulText(
      loan?.customerName,
      loan?.applicant_name,
      loan?.applicantName,
      loan?.leadName,
      "Unknown",
    ),
    primaryMobile: firstMeaningfulText(
      loan?.primaryMobile,
      loan?.mobile,
      loan?.phone,
      loan?.phoneNumber,
    ),
    approval_bankName: approvalBank,
    bankName: firstMeaningfulText(loan?.bankName, approvalBank),
    approval_loanAmountApproved: approvalAmountApproved,
    approval_loanAmountDisbursed: approvalAmountDisbursed,
    postfile_emiAmount: emiAmount,
    vehicleMake: firstMeaningfulText(loan?.vehicleMake, loan?.make),
    vehicleModel: firstMeaningfulText(loan?.vehicleModel, loan?.model),
    vehicleVariant: firstMeaningfulText(loan?.vehicleVariant, loan?.variant),
    vehicleRegNo: firstMeaningfulText(
      loan?.vehicleRegNo,
      loan?.vehicleRegdNumber,
      loan?.registrationNumber,
      loan?.vehicleNumber,
      loan?.rc_redg_no,
      loan?.regNo,
    ),
    registrationNumber: firstMeaningfulText(
      loan?.registrationNumber,
      loan?.vehicleRegNo,
      loan?.vehicleNumber,
      loan?.rc_redg_no,
      loan?.regNo,
    ),
    registrationCity: firstMeaningfulText(
      loan?.registrationCity,
      loan?.postfile_regd_city,
      loan?.city,
    ),
    postfile_regd_city: firstMeaningfulText(
      loan?.postfile_regd_city,
      loan?.registrationCity,
      loan?.city,
    ),
    rc_redg_no: firstMeaningfulText(
      loan?.rc_redg_no,
      loan?.vehicleRegNo,
      loan?.vehicleRegdNumber,
      loan?.registrationNumber,
      loan?.regNo,
    ),
    source: firstMeaningfulText(
      loan?.source,
      loan?.sourcingChannel,
      loan?.recordSource,
    ),
    sourceName: firstMeaningfulText(
      loan?.sourceName,
      loan?.source_name,
      loan?.dealerName,
      loan?.showroomDealerName,
      loan?.delivery_dealerName,
      loan?.showroomName,
      loan?.showroom,
      loan?.showroom_name,
      loan?.paymentFavouring,
      loan?.loanPaymentFavouring,
      loan?.loan_payment_favouring,
    ),
    dealerName: firstMeaningfulText(
      loan?.dealerName,
      loan?.showroomDealerName,
      loan?.delivery_dealerName,
      loan?.showroomName,
      loan?.showroom,
      loan?.showroom_name,
    ),
    showroomDealerName: firstMeaningfulText(
      loan?.showroomDealerName,
      loan?.delivery_dealerName,
      loan?.dealerName,
      loan?.showroomName,
      loan?.showroom,
      loan?.showroom_name,
      loan?.paymentFavouring,
      loan?.loanPaymentFavouring,
      loan?.loan_payment_favouring,
    ),
    delivery_dealerName: firstMeaningfulText(
      loan?.delivery_dealerName,
      loan?.showroomDealerName,
      loan?.dealerName,
      loan?.showroomName,
      loan?.showroom,
      loan?.showroom_name,
    ),
    approval_disbursedDate: firstMeaningfulText(
      loan?.approval_disbursedDate,
      loan?.disbursement_date,
      loan?.disbursementDate,
      loan?.disbursedDate,
    ),
    disbursement_date: firstMeaningfulText(
      loan?.disbursement_date,
      loan?.approval_disbursedDate,
      loan?.disbursementDate,
      loan?.disbursedDate,
    ),
    dispatch_date: firstMeaningfulText(loan?.dispatch_date, loan?.dispatchDate),
    delivery_date: firstMeaningfulText(
      loan?.delivery_date,
      loan?.deliveryDate,
      loan?.delivery_done_at,
      loan?.vehicleDeliveryDate,
    ),
    status: firstMeaningfulText(
      loan?.approval_status,
      loan?.approvalStatus,
      loan?.status,
      loan?.loanStatus,
      "New",
    ),
    currentStage: firstMeaningfulText(
      loan?.currentStage,
      loan?.stage,
      loan?.workflowStage,
      "profile",
    ),
    residenceAddress: firstMeaningfulText(
      loan?.residenceAddress,
      loan?.currentAddress,
      loan?.address,
    ),
    permanentAddress: firstMeaningfulText(loan?.permanentAddress),
    city: firstMeaningfulText(loan?.city, loan?.permanentCity),
    pincode: firstMeaningfulText(loan?.pincode, loan?.permanentPincode),
    postfile_currentOutstanding:
      loan?.postfile_currentOutstanding ??
      loan?.postfile_current_outstanding ??
      loan?.currentOutstanding ??
      loan?.livePrincipalOutstanding ??
      loan?.principalOutstanding ??
      null,
    approval_roi: loan?.approval_roi ?? loan?.roi ?? null,
    approval_tenureMonths:
      loan?.approval_tenureMonths ?? loan?.loanTenureMonths ?? loan?.tenure ?? null,
    isFinanced: inferredIsFinanced,
    createdAt: loan?.createdAt || loan?.receivingDate || null,
    updatedAt: loan?.updatedAt || null,
  };
};

const needsLinkedLoanHydration = (loan) => {
  const hasBank = hasMeaningfulValue(
    loan?.approval_bankName || loan?.approval_banksData?.[0]?.bankName || loan?.bankName,
  );
  const hasVehicle = hasMeaningfulValue(
    loan?.vehicleVariant || loan?.vehicleModel || loan?.vehicleMake,
  );
  const hasFinance = hasMeaningfulValue(
    loan?.approval_loanAmountApproved || loan?.approval_loanAmountDisbursed || loan?.loanAmount,
  );
  const hasSource = hasMeaningfulValue(
    loan?.sourceName || loan?.dealerName || loan?.showroomDealerName,
  );
  return !(hasBank && hasVehicle && hasFinance && hasSource);
};

const hasCustomerIdentityMatch = (loan, customer) => {
  const customerName = normalizeIdentityValue(customer?.customerName);
  const customerMobile = normalizePhoneValue(customer?.primaryMobile);
  const customerPan = normalizePanValue(customer?.panNumber);

  const loanName = normalizeIdentityValue(loan?.customerName || loan?.applicantName);
  const loanMobile = normalizePhoneValue(loan?.primaryMobile || loan?.mobile || loan?.phone);
  const loanPan = normalizePanValue(loan?.panNumber || loan?.pan);
  const customerDbId = String(customer?._id || customer?.id || "").trim();
  const linkedCustomerId = String(loan?.customerId || "").trim();

  if (customerDbId && linkedCustomerId && customerDbId === linkedCustomerId) {
    return true;
  }

  const nameMobileMatch = Boolean(
    customerName && loanName && customerName === loanName && customerMobile && loanMobile && customerMobile === loanMobile,
  );
  const namePanMatch = Boolean(
    customerName && loanName && customerName === loanName && customerPan && loanPan && customerPan === loanPan,
  );
  const panMobileMatch = Boolean(
    customerPan && loanPan && customerPan === loanPan && customerMobile && loanMobile && customerMobile === loanMobile,
  );

  return nameMobileMatch || namePanMatch || panMobileMatch;
};

const matchesLoanSearch = (loan, query) => {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;

  const fields = [
    loan?.loanId,
    loan?.loan_number,
    loan?.customerName,
    loan?.primaryMobile,
    loan?.typeOfLoan,
    loan?.loanType,
    loan?.currentStage,
    loan?.status,
    loan?.approval_status,
    loan?.approval_bankName,
    loan?.bankName,
    loan?.vehicleMake,
    loan?.vehicleModel,
    loan?.vehicleVariant,
  ];

  return fields.some((field) => String(field || "").toLowerCase().includes(q));
};

const parseAmount = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickAmountForSort = (loan) =>
  parseAmount(
    loan?.approval_loanAmountDisbursed ||
      loan?.approval_loanAmountApproved ||
      loan?.loanAmount ||
      loan?.financeExpectation ||
      loan?.approval_banksData?.[0]?.loanAmount,
  );

const pickEmiForSort = (loan) =>
  parseAmount(
    loan?.postfile_emiAmount ||
      loan?.emiAmount ||
      loan?.approval_banksData?.[0]?.emiAmount ||
      loan?.approval_banksData?.[0]?.emi,
  );

const pickVehicleForSort = (loan) =>
  [loan?.vehicleMake, loan?.vehicleModel, loan?.vehicleVariant]
    .filter((item) => hasValue(item))
    .join(" ")
    .trim();

const getLoanRowId = (loan) =>
  String(loan?.loanId || loan?.loan_number || loan?._id || "").trim();

const compareText = (a, b) =>
  String(a || "").localeCompare(String(b || ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });

const calculateAgingDays = (dateValue) => {
  if (!dateValue) return 0;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return 0;
  const now = new Date();
  const diff = Math.abs(now.getTime() - d.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const sortLinkedLoans = (rows, sortConfig) => {
  const key = sortConfig?.key || "createdAt";
  const direction = sortConfig?.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (key === "loanAmount") {
      return (pickAmountForSort(a) - pickAmountForSort(b)) * direction;
    }
    if (key === "emi") {
      return (pickEmiForSort(a) - pickEmiForSort(b)) * direction;
    }
    if (key === "aging") {
      return (
        (calculateAgingDays(a?.createdAt) - calculateAgingDays(b?.createdAt)) *
        direction
      );
    }
    if (key === "customer") {
      return compareText(a?.customerName, b?.customerName) * direction;
    }
    if (key === "vehicle") {
      return (
        compareText(pickVehicleForSort(a), pickVehicleForSort(b)) * direction
      );
    }

    const aTs = Math.max(
      Date.parse(a?.updatedAt || "") || 0,
      Date.parse(a?.createdAt || "") || 0,
    );
    const bTs = Math.max(
      Date.parse(b?.updatedAt || "") || 0,
      Date.parse(b?.createdAt || "") || 0,
    );
    return (aTs - bTs) * direction;
  });
};

const getKycClasses = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "bg-emerald-500/12 text-emerald-700 border-emerald-400/30 dark:bg-emerald-400/12 dark:text-emerald-300";
  if (s === "in progress") return "bg-sky-500/12 text-sky-700 border-sky-400/30 dark:bg-sky-400/12 dark:text-sky-300";
  if (s === "pending docs") return "bg-amber-500/12 text-amber-700 border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-300";
  if (s === "rejected") return "bg-rose-500/12 text-rose-700 border-rose-400/30 dark:bg-rose-400/12 dark:text-rose-300";
  return "bg-slate-500/12 text-slate-700 border-slate-400/30 dark:bg-slate-400/12 dark:text-slate-300";
};

const sectionTone = {
  profile: {
    border: "border-sky-200/70 dark:border-sky-900/60",
    bg: "bg-sky-50/50 dark:bg-sky-950/20",
    icon: "bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950",
  },
  employment: {
    border: "border-emerald-200/70 dark:border-emerald-900/60",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    icon: "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950",
  },
  banking: {
    border: "border-indigo-200/70 dark:border-indigo-900/60",
    bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
    icon: "bg-indigo-500 text-white dark:bg-indigo-400 dark:text-slate-950",
  },
  references: {
    border: "border-amber-200/70 dark:border-amber-900/60",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    icon: "bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950",
  },
  loans: {
    border: "border-violet-200/70 dark:border-violet-900/60",
    bg: "bg-violet-50/50 dark:bg-violet-950/20",
    icon: "bg-violet-500 text-white dark:bg-violet-400 dark:text-slate-950",
  },
};

const LabeledValue = ({ label, value, mono = false }) => (
  <div className="flex items-start gap-3 py-1.5">
    <div className="w-[170px] shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
      {label}
    </div>
    <div className={`min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100 ${mono ? "font-mono" : ""}`}>
      {value}
    </div>
  </div>
);

const hasDisplayValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.some((entry) => hasDisplayValue(entry));
  if (typeof value === "object") {
    return Object.values(value).some((entry) => hasDisplayValue(entry));
  }
  return true;
};

const LabeledValueIf = ({ label, value, mono = false, format = "text" }) => {
  if (!hasDisplayValue(value)) return null;

  const renderedValue =
    format === "date"
      ? asDate(value)
      : format === "money"
        ? asMoney(value)
        : format === "yesno"
          ? asYesNo(value)
          : asText(value);

  return <LabeledValue label={label} value={renderedValue} mono={mono} />;
};

const SectionCard = ({ tone = "profile", title, icon, children }) => {
  const t = sectionTone[tone] || sectionTone.profile;
  return (
    <section className={`rounded-2xl border ${t.border} ${t.bg} p-4`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.icon}`}>
          <Icon name={icon} size={15} />
        </div>
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      {children}
    </section>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "border-sky-400 bg-sky-500/12 text-sky-700 dark:border-sky-500 dark:bg-sky-500/20 dark:text-sky-200"
        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    }`}
  >
    <Icon name={icon} size={12} />
    {label}
  </button>
);

const CustomerViewModal = ({ open, customer, onClose, onEdit }) => {
  const navigate = useNavigate();
  const userRole = "admin";

  const [activeTab, setActiveTab] = useState("profile");
  const [viewLoan, setViewLoan] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [initialViewTab, setInitialViewTab] = useState(null);
  const [notesLoan, setNotesLoan] = useState(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const [linkedLoans, setLinkedLoans] = useState([]);
  const [linkedLoanSearch, setLinkedLoanSearch] = useState("");
  const [linkedLoansLoading, setLinkedLoansLoading] = useState(false);
  const [linkedLoansError, setLinkedLoansError] = useState("");
  const [linkedLoansReloadKey, setLinkedLoansReloadKey] = useState(0);

  const [linkedLoansPage, setLinkedLoansPage] = useState(1);
  const linkedLoansPageSize = 25;
  const [linkedLoansSortConfig, setLinkedLoansSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [selectedLinkedLoanIds, setSelectedLinkedLoanIds] = useState([]);
  const linkedLoanHydrationCacheRef = useRef(new Map());

  const c = useMemo(() => {
    if (!customer) return null;
    return {
      ...customer,
      aadhaarNumber: customer.aadhaarNumber || customer.aadharNumber || "",
      secondaryMobile:
        customer.secondaryMobile ||
        (Array.isArray(customer.extraMobiles) ? customer.extraMobiles[0] : ""),
      reference1:
        customer.reference1 ||
        (customer.reference1_name
          ? {
              name: customer.reference1_name,
              mobile: customer.reference1_mobile,
              address: customer.reference1_address,
              pincode: customer.reference1_pincode,
              city: customer.reference1_city,
              relation: customer.reference1_relation,
            }
          : null),
      reference2:
        customer.reference2 ||
        (customer.reference2_name
          ? {
              name: customer.reference2_name,
              mobile: customer.reference2_mobile,
              address: customer.reference2_address,
              pincode: customer.reference2_pincode,
              city: customer.reference2_city,
              relation: customer.reference2_relation,
            }
          : null),
      linkedLoans: Array.isArray(customer?.linkedLoans) ? customer.linkedLoans : [],
    };
  }, [customer]);

  const customerIdentityKey = useMemo(
    () => String(c?._id || c?.id || c?.customerId || c?.customerName || ""),
    [c],
  );

  useEffect(() => {
    if (!open || !c) return;
    setActiveTab("profile");
    setLinkedLoanSearch("");
    setLinkedLoansPage(1);
    setLinkedLoansSortConfig({
      key: "createdAt",
      direction: "desc",
    });
    setSelectedLinkedLoanIds([]);
    setLinkedLoansError("");
  }, [open, customerIdentityKey, c]);

  useEffect(() => {
    if (open) return;
    setIsViewModalOpen(false);
    setViewLoan(null);
    setInitialViewTab(null);
    setIsNotesModalOpen(false);
    setNotesLoan(null);
  }, [open]);

  const refreshLinkedLoans = useCallback(() => {
    setLinkedLoansReloadKey((prev) => prev + 1);
  }, []);

  const hydrateLinkedLoansById = useCallback(async (rows = []) => {
    if (!Array.isArray(rows) || !rows.length) return;

    const candidates = rows
      .filter((loan) => {
        const id = String(loan?._id || loan?.loanId || loan?.loan_number || "").trim();
        return id && needsLinkedLoanHydration(loan);
      })
      .slice(0, 20);

    if (!candidates.length) return;

    const updates = await Promise.all(
      candidates.map(async (loan) => {
        const lookupIds = Array.from(
          new Set(
            [loan?._id, loan?.loanId, loan?.loan_number]
              .map((id) => String(id || "").trim())
              .filter(Boolean),
          ),
        );
        if (!lookupIds.length) return null;

        for (const lookupId of lookupIds) {
          const cacheHit = linkedLoanHydrationCacheRef.current.get(lookupId);
          if (cacheHit) {
            return {
              key: getLoanId(loan) || lookupId,
              patch: normalizeLinkedLoanForGrid(cacheHit),
            };
          }

          try {
            const res = await loansApi.getById(lookupId);
            const body = res?.data ?? res;
            const fetched = body?.data ?? body?.loan ?? body;
            if (!fetched || typeof fetched !== "object") continue;
            lookupIds.forEach((id) => linkedLoanHydrationCacheRef.current.set(id, fetched));
            return {
              key: getLoanId(loan) || getLoanId(fetched) || lookupId,
              patch: normalizeLinkedLoanForGrid(fetched),
            };
          } catch {
            // try the next identifier for this loan
          }
        }

        return null;
      }),
    );

    const patchMap = new Map(updates.filter(Boolean).map((item) => [item.key, item.patch]));
    if (!patchMap.size) return;

    setLinkedLoans((prev) =>
      (prev || []).map((loan) => {
        const key = getLoanId(loan);
        const patch = patchMap.get(key);
        if (!patch) return loan;
        return mergeLoanRecord(loan, patch);
      }),
    );
  }, []);

  useEffect(() => {
    if (!open || !c) return;

    let cancelled = false;

    const loadLinkedLoans = async () => {
      const cachedLinkedLoans = Array.isArray(c.linkedLoans) ? c.linkedLoans : [];
      setLinkedLoans(cachedLinkedLoans);
      setLinkedLoansError("");

      const customerName = String(c.customerName || "").trim();
      const customerMobile = normalizePhoneValue(c.primaryMobile);
      const customerPan = normalizePanValue(c.panNumber);
      const customerIdRef = String(c._id || c.id || c.customerId || "").trim();

      if (!customerName && !customerMobile && !customerPan && !customerIdRef) {
        return;
      }

      setLinkedLoansLoading(true);
      try {
        const PAGE_SIZE = 250;
        const MAX_PAGES_PRIMARY = 2;
        const MAX_PAGES_FALLBACK = 1;
        const REQUEST_TIMEOUT_MS = 12000;
        const FAST_PATH_MIN_LIMIT = 50;

        const primaryQuery = customerIdRef
          ? {
            customerId: customerIdRef,
            limit: PAGE_SIZE,
            sortBy: "updatedAt",
            sortOrder: "desc",
          }
          : null;

        const fallbackQueries = [];
        if (customerName.length >= 2) {
          fallbackQueries.push({
            customerName,
            limit: PAGE_SIZE,
            sortBy: "updatedAt",
            sortOrder: "desc",
          });
        }
        if (customerMobile.length >= 10) {
          fallbackQueries.push({
            primaryMobile: customerMobile,
            limit: PAGE_SIZE,
            sortBy: "updatedAt",
            sortOrder: "desc",
          });
        }
        if (customerPan.length >= 10) {
          fallbackQueries.push({
            panNumber: customerPan,
            limit: PAGE_SIZE,
            sortBy: "updatedAt",
            sortOrder: "desc",
          });
        }

        const merged = new Map();
        const ingest = (rows) => {
          let progress = 0;
          rows.forEach((loan) => {
            const id = getLoanId(loan);
            if (!id) return;
            const existing = merged.get(id);
            const beforeScore = scoreLoanRichness(existing);
            const combined = mergeLoanRecord(existing, loan);
            const afterScore = scoreLoanRichness(combined);
            merged.set(id, combined);

            if (!existing || afterScore > beforeScore) {
              progress += 1;
            }
          });
          return progress;
        };

        ingest(cachedLinkedLoans);

        const linkedLoanIdRefs = Array.from(
          new Set(
            cachedLinkedLoans
              .map((loan) =>
                String(loan?._id || loan?.loanId || loan?.loan_number || "").trim(),
              )
              .filter(Boolean),
          ),
        ).slice(0, 500);

        const loadPagedQuery = async (query, maxPages) => {
          if (!query) return;
          let skip = 0;
          let pages = 0;
          while (pages < maxPages) {
            let timeoutId;
            const response = await Promise.race([
              loansApi.getAll({ ...query, skip }),
              new Promise((_, reject) => {
                timeoutId = setTimeout(
                  () => reject(new Error("Linked loans request timed out")),
                  REQUEST_TIMEOUT_MS,
                );
              }),
            ]).finally(() => {
              if (timeoutId) clearTimeout(timeoutId);
            });
            const rows = toLoanRows(response);
            if (!rows.length) break;

            const progress = ingest(rows);

            const total = Number(
              response?.count ?? response?.total ?? response?.pagination?.total,
            );
            const hasMore = Boolean(response?.hasMore ?? response?.pagination?.hasMore);

            skip += rows.length;
            pages += 1;

            // Stop early when API returns fewer rows than requested or no new unique rows.
            // This prevents long loading loops on APIs that over-report totals or repeat pages.
            if (rows.length < PAGE_SIZE || progress === 0) {
              break;
            }

            if (!hasMore && (!Number.isFinite(total) || skip >= total)) {
              break;
            }
          }
        };

        // Fast path: if customer already carries linked loan ids, fetch all in one indexed query
        // and skip expensive count-driven pagination.
        const beforeFastPathSize = merged.size;
        if (linkedLoanIdRefs.length) {
          await loadPagedQuery(
            {
              view: "dashboard",
              loanIds: linkedLoanIdRefs.join(","),
              noCount: true,
              limit: Math.max(FAST_PATH_MIN_LIMIT, linkedLoanIdRefs.length),
              sortBy: "updatedAt",
              sortOrder: "desc",
            },
            1,
          );
        }
        const hasFastPathRows = merged.size > beforeFastPathSize;

        // If fast path already returned rows, don't block modal with slower fallback scans.
        if (primaryQuery && !hasFastPathRows) {
          await loadPagedQuery(primaryQuery, MAX_PAGES_PRIMARY);
        }

        // Fallback identity lookups are expensive; run them only when customerId query
        // doesn't return any rows and we still need to find legacy unlinked loans.
        if (!merged.size) {
          for (const query of fallbackQueries) {
            await loadPagedQuery(query, MAX_PAGES_FALLBACK);
          }
        }

        if (cancelled) return;

        const strictMatches = [...merged.values()]
          .filter((loan) => hasCustomerIdentityMatch(loan, c))
          .sort((a, b) => {
            const aTs = Math.max(
              Date.parse(a?.updatedAt || "") || 0,
              Date.parse(a?.createdAt || "") || 0,
            );
            const bTs = Math.max(
              Date.parse(b?.updatedAt || "") || 0,
              Date.parse(b?.createdAt || "") || 0,
            );
            return bTs - aTs;
          });

        const normalized = strictMatches.map((loan) => normalizeLinkedLoanForGrid(loan));
        setLinkedLoans(normalized);
        void hydrateLinkedLoansById(normalized);
      } catch (error) {
        if (!cancelled) {
          const hasFallbackRows = cachedLinkedLoans.length > 0;
          setLinkedLoansError(
            hasFallbackRows ? "" : error?.message || "Failed to load linked loans",
          );
          if (hasFallbackRows) {
            const normalizedFallback = cachedLinkedLoans.map((loan) =>
              normalizeLinkedLoanForGrid(loan),
            );
            setLinkedLoans(normalizedFallback);
            void hydrateLinkedLoansById(normalizedFallback);
          }
        }
      } finally {
        if (!cancelled) {
          setLinkedLoansLoading(false);
        }
      }
    };

    loadLinkedLoans();

    return () => {
      cancelled = true;
    };
  }, [open, c, linkedLoansReloadKey, hydrateLinkedLoansById]);

  const normalizedLinkedLoans = useMemo(
    () =>
      linkedLoans.map((loan, index) => {
        const normalized = normalizeLinkedLoanForGrid(loan);
        const rowId = getLoanRowId(loan) || `linked-loan-${index + 1}`;
        return {
          ...normalized,
          loanId: normalized?.loanId || normalized?.loan_number || normalized?._id || rowId,
        };
      }),
    [linkedLoans],
  );

  const filteredLinkedLoans = useMemo(
    () =>
      normalizedLinkedLoans.filter((loan) =>
        matchesLoanSearch(loan, linkedLoanSearch),
      ),
    [normalizedLinkedLoans, linkedLoanSearch],
  );

  const sortedLinkedLoans = useMemo(
    () => sortLinkedLoans(filteredLinkedLoans, linkedLoansSortConfig),
    [filteredLinkedLoans, linkedLoansSortConfig],
  );

  const linkedLoansTotalCount = sortedLinkedLoans.length;
  const linkedLoansTotalPages = Math.max(
    1,
    Math.ceil(linkedLoansTotalCount / linkedLoansPageSize),
  );

  useEffect(() => {
    if (linkedLoansPage > linkedLoansTotalPages) {
      setLinkedLoansPage(linkedLoansTotalPages);
    }
  }, [linkedLoansPage, linkedLoansTotalPages]);

  useEffect(() => {
    setLinkedLoansPage(1);
    setSelectedLinkedLoanIds([]);
  }, [linkedLoanSearch, linkedLoansSortConfig.key, linkedLoansSortConfig.direction]);

  const pagedLinkedLoans = useMemo(() => {
    const start = (linkedLoansPage - 1) * linkedLoansPageSize;
    return sortedLinkedLoans.slice(start, start + linkedLoansPageSize);
  }, [sortedLinkedLoans, linkedLoansPage, linkedLoansPageSize]);

  const handleSelectLoan = useCallback((loanId, checked) => {
    const id = String(loanId || "").trim();
    if (!id) return;
    setSelectedLinkedLoanIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter((item) => item !== id);
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked) => {
      if (!checked) {
        setSelectedLinkedLoanIds([]);
        return;
      }
      const ids = pagedLinkedLoans
        .map((loan) => String(loan?.loanId || "").trim())
        .filter(Boolean);
      setSelectedLinkedLoanIds(ids);
    },
    [pagedLinkedLoans],
  );

  const handleLoanClick = useCallback(
    (loan, mode) => {
      if (mode === "edit") {
        navigate(`/loans/edit/${loan?._id || loan?.loanId}`);
        return;
      }
      if (mode === "approval") {
        setInitialViewTab("approval");
        setViewLoan(loan);
        setIsViewModalOpen(true);
        return;
      }
      setInitialViewTab(null);
      setViewLoan(loan);
      setIsViewModalOpen(true);
    },
    [navigate],
  );

  const handleBulkAction = useCallback(
    async (action) => {
      switch (action) {
        case "export":
          message.success(`Exporting ${selectedLinkedLoanIds.length} cases...`);
          break;
        case "dispatch":
          message.info(`Dispatching ${selectedLinkedLoanIds.length} cases...`);
          break;
        case "approve":
          message.success(`Approving ${selectedLinkedLoanIds.length} cases...`);
          refreshLinkedLoans();
          break;
        case "delete":
          if (!selectedLinkedLoanIds.length) return;
          if (
            !window.confirm(
              `Are you sure you want to delete ${selectedLinkedLoanIds.length} cases?`,
            )
          ) {
            return;
          }
          try {
            message.loading({ content: "Deleting...", key: "customer_bulk_delete" });
            await Promise.all(
              selectedLinkedLoanIds.map((loanId) => loansApi.delete(loanId)),
            );
            message.success({
              content: "Deleted successfully",
              key: "customer_bulk_delete",
            });
            setSelectedLinkedLoanIds([]);
            refreshLinkedLoans();
          } catch (error) {
            message.error({
              content: "Failed to delete some cases",
              key: "customer_bulk_delete",
            });
          }
          break;
        default:
          break;
      }
    },
    [selectedLinkedLoanIds, refreshLinkedLoans],
  );

  const handleDeleteLoan = useCallback(
    async (loan) => {
      if (!loan) return;
      const id = loan?._id || loan?.loanId;
      if (!id) return;
      if (!window.confirm(`Delete ${loan?.loan_number || loan?.loanId}?`)) return;
      try {
        await loansApi.delete(id);
        message.success("Loan deleted successfully.");
        refreshLinkedLoans();
      } catch (error) {
        message.error(error?.message || "Failed to delete loan.");
      }
    },
    [refreshLinkedLoans],
  );

  const handleUpdateStatus = useCallback((loan) => {
    setInitialViewTab("approval");
    setViewLoan(loan);
    setIsViewModalOpen(true);
  }, []);

  const handleShowOtherBanks = useCallback((loan) => {
    setInitialViewTab("approval");
    setViewLoan(loan);
    setIsViewModalOpen(true);
  }, []);

  const handleNotesClick = useCallback((loan) => {
    setNotesLoan(loan);
    setIsNotesModalOpen(true);
  }, []);

  const handleShareLoan = useCallback((loan) => {
    const loanId = loan?._id || loan?.loanId;
    if (!loanId) {
      message.warning("Loan ID not found.");
      return;
    }
    const base = window.location.pathname.split("/loans")[0] || "";
    const url = `${window.location.origin}${base}/loans/edit/${loanId}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => message.success("Loan link copied to clipboard."))
        .catch(() => message.error("Could not copy link."));
      return;
    }
    message.info(`Copy link: ${url}`);
  }, []);

  const handleLinkedLoansPageChange = useCallback((nextPage) => {
    setLinkedLoansPage(nextPage);
    setSelectedLinkedLoanIds([]);
  }, []);

  const handleLinkedLoansSortChange = useCallback((nextSort) => {
    setLinkedLoansSortConfig((prev) =>
      typeof nextSort === "function" ? nextSort(prev) : nextSort,
    );
  }, []);

  const handleLinkedLoansRefresh = useCallback(() => {
    refreshLinkedLoans();
  }, [refreshLinkedLoans]);

  const handleNotesRefresh = useCallback(() => {
    refreshLinkedLoans();
  }, [refreshLinkedLoans]);

  const handleLinkedLoansSelectionChange = useCallback((ids) => {
    setSelectedLinkedLoanIds(Array.isArray(ids) ? ids : []);
  }, []);

  const linkedLoansCountLabel = linkedLoansLoading
    ? linkedLoansTotalCount > 0
      ? "Refreshing linked loans..."
      : "Loading linked loans..."
    : `${linkedLoansTotalCount} loan${linkedLoansTotalCount === 1 ? "" : "s"} shown`;

  const linkedLoansSearchPlaceholder =
    "Search linked loans by loan id, customer, mobile, bank, status...";

  const linkedGridLoading = linkedLoansLoading && linkedLoansTotalCount === 0;

  const isCompanyCustomer = useMemo(() => {
    const applicantType = String(
      c?.applicantType || c?.customerType || "",
    ).toLowerCase();
    return (
      applicantType.includes("company") ||
      applicantType.includes("corporate") ||
      hasDisplayValue(c?.companyType) ||
      hasDisplayValue(c?.gstNumber)
    );
  }, [c]);

  if (!c) return null;

  const tabs = [
    { key: "profile", label: "Profile", icon: "User" },
    { key: "employment", label: "Employment", icon: "Briefcase" },
    { key: "banking", label: "Banking & KYC", icon: "Shield" },
    { key: "references", label: "References", icon: "Users" },
    { key: "loans", label: "Linked Loans", icon: "FileStack" },
  ];

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={1240}
        centered
        destroyOnHidden
        className="theme-modal"
        styles={{ body: { padding: 0 } }}
      >
        <div className="border-b border-slate-200/70 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">
                Customer View
              </div>
              <h2 className="truncate text-2xl font-black text-slate-900 dark:text-slate-100">
                {c.customerName || "Untitled Customer"}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Tag className="m-0 rounded-full border-none bg-slate-500/12 px-2 py-0 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-400/12 dark:text-slate-200">
                  {c.customerType || "New"}
                </Tag>
                <Tag className={`m-0 rounded-full border px-2 py-0 text-[10px] font-bold uppercase ${getKycClasses(c.kycStatus)}`}>
                  {c.kycStatus || "Unknown"}
                </Tag>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ID: <span className="font-semibold text-slate-700 dark:text-slate-200">{asText(c.customerId)}</span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Created: <span className="font-semibold text-slate-700 dark:text-slate-200">{asDate(c.createdAt || c.createdOn)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {typeof onEdit === "function" && (
                <button
                  type="button"
                  onClick={() => onEdit?.()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-100 px-2.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-200 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                >
                  <Icon name="Pencil" size={12} />
                  Open Customer
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
                aria-label="Close"
              >
                <Icon name="X" size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-y-auto bg-background px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              icon={tab.icon}
              label={tab.label}
            />
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="space-y-4">
            <SectionCard tone="profile" title="Personal Details" icon="User">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValueIf label="Applicant Type" value={c.applicantType || c.customerType} />
                  <LabeledValueIf label="Primary Mobile" value={c.primaryMobile} mono />
                  <LabeledValueIf label="Extra Mobiles" value={c.extraMobiles} mono />
                  <LabeledValueIf label="Email" value={c.email || c.emailAddress} />
                  <LabeledValueIf
                    label={isCompanyCustomer ? "Date of Incorporation" : "Date of Birth"}
                    value={c.dob}
                    format="date"
                  />
                  {!isCompanyCustomer && <LabeledValueIf label="Gender" value={c.gender} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Marital Status" value={c.maritalStatus} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Mother's Name" value={c.motherName} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Father / Husband Name" value={c.sdwOf || c.fatherName} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Dependents" value={c.dependents} />}
                  <LabeledValueIf label="Education" value={c.education} />
                </div>
                <div>
                  {!isCompanyCustomer && <LabeledValueIf label="House Type" value={c.houseType} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Address Type" value={c.addressType} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Identity Proof Type" value={c.identityProofType} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Identity Proof Number" value={c.identityProofNumber} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Address Proof Type" value={c.addressProofType} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Address Proof Number" value={c.addressProofNumber} />}
                  {isCompanyCustomer && <LabeledValueIf label="Contact Person Name" value={c.contactPersonName} />}
                  {isCompanyCustomer && <LabeledValueIf label="Contact Person Mobile" value={c.contactPersonMobile} mono />}
                  <LabeledValueIf label="PAN" value={c.panNumber} mono />
                  {!isCompanyCustomer && <LabeledValueIf label="Aadhaar" value={c.aadhaarNumber || c.aadharNumber} mono />}
                  {isCompanyCustomer && <LabeledValueIf label="GST Number" value={c.gstNumber} mono />}
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="profile" title="Address Details" icon="MapPin">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValueIf label="Present Address" value={c.residenceAddress || c.currentAddress} />
                  <LabeledValueIf label="Present Pincode" value={c.pincode} mono />
                  <LabeledValueIf label="Present City" value={c.city} />
                  <LabeledValueIf label="Years in Current City" value={c.yearsInCurrentCity} />
                  <LabeledValueIf label="Years in Current Residence" value={c.yearsInCurrentHouse} />
                </div>
                <div>
                  <LabeledValueIf label="Permanent Same as Current" value={c.sameAsCurrentAddress} format="yesno" />
                  <LabeledValueIf label="Permanent Address" value={c.permanentAddress} />
                  <LabeledValueIf label="Permanent Pincode" value={c.permanentPincode} mono />
                  <LabeledValueIf label="Permanent City" value={c.permanentCity} />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "employment" && (
          <div className="space-y-4">
            <SectionCard tone="employment" title="Employment Details" icon="Briefcase">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValueIf label="Occupation" value={c.occupationType} />
                  <LabeledValueIf label="Is MSME" value={c.isMSME} format="yesno" />
                  <LabeledValueIf label="Professional Type" value={c.professionalType} />
                  <LabeledValueIf label="Company Type" value={c.companyType} />
                  <LabeledValueIf label="Business Nature" value={c.businessNature} />
                  <LabeledValueIf label="Current Experience" value={c.experienceCurrent || c.currentExp} />
                  <LabeledValueIf label="Total Experience" value={c.totalExperience || c.totalExp} />
                  <LabeledValueIf label="Designation" value={c.designation} />
                </div>
                <div>
                  <LabeledValueIf label="Company Name" value={c.companyName} />
                  <LabeledValueIf label="Employment Address" value={c.employmentAddress || c.companyAddress} />
                  <LabeledValueIf label="Employment Pincode" value={c.employmentPincode || c.companyPincode} mono />
                  <LabeledValueIf label="Employment City" value={c.employmentCity || c.companyCity} />
                  <LabeledValueIf label="Employment Phone" value={c.employmentPhone || c.companyPhone} mono />
                  <LabeledValueIf label="Official Email" value={c.officialEmail} />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="employment" title="Income Details" icon="Wallet">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-1">
                <div>
                  <LabeledValueIf label="Total Income (ITR)" value={c.totalIncomeITR || c.itrYears} format="money" />
                  <LabeledValueIf label="Monthly Income" value={c.monthlyIncome} format="money" />
                  <LabeledValueIf label="Monthly Salary" value={c.salaryMonthly} format="money" />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "banking" && (
          <div className="space-y-4">
            <SectionCard tone="banking" title="Banking Details" icon="Building2">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValueIf label="IFSC" value={c.ifsc || c.ifscCode} mono />
                  <LabeledValueIf label="Bank Name" value={c.bankName} />
                  <LabeledValueIf label="Branch / Address" value={c.branch} />
                  <LabeledValueIf label="Applicant Account Number" value={c.accountNumber} mono />
                </div>
                <div>
                  <LabeledValueIf label="Account Since (Years)" value={c.accountSinceYears} />
                  <LabeledValueIf label="Opened In" value={c.openedIn} />
                  <LabeledValueIf label="Account Type" value={c.accountType} />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="banking" title="KYC & Proofs" icon="ShieldCheck">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValueIf label="PAN" value={c.panNumber} mono />
                  {!isCompanyCustomer && <LabeledValueIf label="Aadhaar" value={c.aadhaarNumber || c.aadharNumber} mono />}
                  {isCompanyCustomer && <LabeledValueIf label="GST Number" value={c.gstNumber} mono />}
                </div>
                <div>
                  {!isCompanyCustomer && <LabeledValueIf label="Identity Proof Type" value={c.identityProofType} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Identity Proof Number" value={c.identityProofNumber} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Address Proof Type" value={c.addressProofType} />}
                  {!isCompanyCustomer && <LabeledValueIf label="Address Proof Number" value={c.addressProofNumber} />}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "references" && (
          <div className="space-y-4">
            <SectionCard tone="references" title="Reference 1" icon="UserCheck">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValueIf label="Reference 1 Name" value={c.reference1?.name || c.reference1_name} />
                  <LabeledValueIf label="Reference 1 Mobile" value={c.reference1?.mobile || c.reference1_mobile} mono />
                  <LabeledValueIf label="Reference 1 Relation" value={c.reference1?.relation || c.reference1_relation} />
                </div>
                <div>
                  <LabeledValueIf label="Reference 1 Address" value={c.reference1?.address || c.reference1_address} />
                  <LabeledValueIf label="Reference 1 City" value={c.reference1?.city || c.reference1_city} />
                  <LabeledValueIf label="Reference 1 Pincode" value={c.reference1?.pincode || c.reference1_pincode} mono />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="references" title="Reference 2" icon="Users">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValueIf label="Reference 2 Name" value={c.reference2?.name || c.reference2_name} />
                  <LabeledValueIf label="Reference 2 Mobile" value={c.reference2?.mobile || c.reference2_mobile} mono />
                  <LabeledValueIf label="Reference 2 Relation" value={c.reference2?.relation || c.reference2_relation} />
                </div>
                <div>
                  <LabeledValueIf label="Reference 2 Address" value={c.reference2?.address || c.reference2_address} />
                  <LabeledValueIf label="Reference 2 City" value={c.reference2?.city || c.reference2_city} />
                  <LabeledValueIf label="Reference 2 Pincode" value={c.reference2?.pincode || c.reference2_pincode} mono />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "loans" && (
          <div className="space-y-3">
            <SectionCard tone="loans" title="Linked Loans" icon="FileStack">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {linkedLoansCountLabel}
                </div>
                <div className="relative w-full md:max-w-xs">
                  <Icon
                    name="Search"
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={linkedLoanSearch}
                    onChange={(e) => setLinkedLoanSearch(e.target.value)}
                    placeholder={linkedLoansSearchPlaceholder}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>

              {linkedLoansError && (
                <div className="mb-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                  {linkedLoansError}
                </div>
              )}

              <div className="h-[62vh] min-h-[420px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <LoansDataGrid
                  loans={pagedLinkedLoans}
                  totalCount={linkedLoansTotalCount}
                  currentPage={linkedLoansPage}
                  pageSize={linkedLoansPageSize}
                  onPageChange={handleLinkedLoansPageChange}
                  sortConfig={linkedLoansSortConfig}
                  onSortChange={handleLinkedLoansSortChange}
                  selectedLoans={selectedLinkedLoanIds}
                  onSelectLoan={handleSelectLoan}
                  onSelectAll={handleSelectAll}
                  onSelectionChange={handleLinkedLoansSelectionChange}
                  onLoanClick={handleLoanClick}
                  onBulkAction={handleBulkAction}
                  onDeleteLoan={handleDeleteLoan}
                  onUpdateStatus={handleUpdateStatus}
                  onShareLoan={handleShareLoan}
                  onShowOtherBanks={handleShowOtherBanks}
                  onRefreshLoans={handleLinkedLoansRefresh}
                  onNotesClick={handleNotesClick}
                  userRole={userRole}
                  loading={linkedGridLoading}
                />
              </div>
            </SectionCard>
          </div>
        )}
        </div>
      </Modal>

      <LoanViewModal
        open={isViewModalOpen}
        loan={viewLoan}
        initialTab={initialViewTab}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewLoan(null);
          setInitialViewTab(null);
        }}
        onEdit={() => {
          if (viewLoan) {
            navigate(`/loans/edit/${viewLoan._id || viewLoan.loanId}`);
          }
        }}
      />

      <DashboardNotesModal
        open={isNotesModalOpen}
        loan={notesLoan}
        onClose={() => {
          setIsNotesModalOpen(false);
          setNotesLoan(null);
        }}
        onRefresh={handleNotesRefresh}
      />
    </>
  );
};

export default CustomerViewModal;
