import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Spin,
  Table,
  Tag,
  Timeline,
} from "antd";
import {
  ArrowLeft,
  Banknote,
  CarFront,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  DollarSign,
  FileText,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { customersApi } from "../../api/customers";
import { loansApi } from "../../api/loans";
import { insuranceApi } from "../../api/insurance";
import { paymentsApi } from "../../api/payments";

const getData = (response) =>
  response?.data?.data ?? response?.data ?? response ?? null;
const toArray = (value) => (Array.isArray(value) ? value : []);
const isPresent = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";
const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const firstValue = (...values) => values.find((value) => isPresent(value));
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(asNumber(value));
const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(asNumber(value));
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const getInitials = (name) => {
  const text = String(name || "").trim();
  if (!text) return "?";
  const parts = text.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return text.slice(0, 2).toUpperCase();
};
const nameToHue = (name) => {
  const str = String(name || "?");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
};
const matchesCustomerIdentity = (row = {}, customer = {}) => {
  const customerId = normalizeText(
    customer?._id || customer?.id || customer?.customerId,
  );
  const customerName = normalizeText(customer?.customerName || customer?.name);
  const customerMobile = normalizeText(
    customer?.primaryMobile || customer?.mobile,
  );
  const rowCustomerId = normalizeText(
    row?.customerId || row?.customerSnapshot?.customerId,
  );
  const rowCustomerName = normalizeText(
    row?.customerName || row?.customerSnapshot?.customerName,
  );
  const rowMobile = normalizeText(
    row?.primaryMobile || row?.customerSnapshot?.primaryMobile,
  );
  return (
    (customerId && rowCustomerId === customerId) ||
    (customerName && rowCustomerName.includes(customerName)) ||
    (customerMobile && rowMobile.includes(customerMobile))
  );
};
const buildRiskMeta = (score, loans = []) => {
  const numericScore = asNumber(score);
  if (numericScore >= 780) {
    return { label: "Low Risk", tone: "emerald", score: numericScore || null };
  }
  if (numericScore >= 700) {
    return { label: "Moderate", tone: "amber", score: numericScore || null };
  }
  if (numericScore > 0) {
    return { label: "High Risk", tone: "rose", score: numericScore || null };
  }
  const defaultLabel = loans.some((loan) =>
    /default|overdue|bounced/i.test(String(loan?.status || "")),
  )
    ? "High Risk"
    : loans.some((loan) =>
          /active|pending|approved/i.test(String(loan?.status || "")),
        )
      ? "Moderate"
      : "Standard";
  const tone =
    defaultLabel === "High Risk"
      ? "rose"
      : defaultLabel === "Moderate"
        ? "amber"
        : "sky";
  return { label: defaultLabel, tone, score: null };
};
const statusMeta = (status) => {
  const value = normalizeText(status);
  if (/verified|active|approved|paid|settled|closed/.test(value)) {
    return { label: status || "Active", color: "green" };
  }
  if (/pending|draft|in progress|processing/.test(value)) {
    return { label: status || "Pending", color: "gold" };
  }
  if (/blocked|deactivated|rejected|default/.test(value)) {
    return { label: status || "Blocked", color: "red" };
  }
  return { label: status || "Unknown", color: "blue" };
};
const loanStatusTone = (status) => {
  const value = normalizeText(status);
  if (/active|approved|disbursed|pending/.test(value)) return "blue";
  if (/closed|completed|settled/.test(value)) return "green";
  if (/default|overdue|bounced|failed/.test(value)) return "red";
  return "default";
};
const insuranceTone = (status) => {
  const value = normalizeText(status);
  if (/active|valid|in force|verified/.test(value)) return "green";
  if (/expired|lapsed|inactive/.test(value)) return "red";
  if (/pending|draft|processing/.test(value)) return "gold";
  return "default";
};
const paymentTone = (row = {}) => {
  const text = normalizeText(
    firstValue(row?.status, row?.paymentStatus, row?.overallStatus),
  );
  if (
    /late|pending|missed|overdue|bounced/.test(text) ||
    asNumber(row?.lateFee || row?.lateFees || row?.penalty)
  )
    return "red";
  if (/paid|settled|verified|completed/.test(text)) return "green";
  return "blue";
};
const sum = (items, selector) =>
  items.reduce((total, item) => total + asNumber(selector(item)), 0);
const loanAmountValue = (loan = {}) =>
  firstValue(
    loan?.loanAmount,
    loan?.approval_loanAmountApproved,
    loan?.approvalAmount,
    loan?.approval_loanAmount,
    loan?.financeAmount,
  );
const emiValue = (loan = {}) =>
  firstValue(
    loan?.emiAmount,
    loan?.postfile_emiAmount,
    loan?.approval_emiAmount,
    loan?.monthlyEmi,
  );
const rateValue = (loan = {}) =>
  firstValue(
    loan?.interestRate,
    loan?.rateOfInterest,
    loan?.roi,
    loan?.approval_interestRate,
  );
const vehicleLabel = (loan = {}) =>
  [loan?.vehicleMake, loan?.vehicleModel, loan?.vehicleVariant]
    .filter(Boolean)
    .join(" ") || "Vehicle not set";
const resolveLoanDate = (loan = {}) =>
  firstValue(
    loan?.startDate,
    loan?.disbursement_date,
    loan?.approval_disbursedDate,
    loan?.createdAt,
  );
const resolveLoanEndDate = (loan = {}) =>
  firstValue(
    loan?.endDate,
    loan?.end_date,
    loan?.maturityDate,
    loan?.expectedClosureDate,
  );
const normalizeLoan = (loan = {}, paymentByLoan = new Map()) => {
  const amount = asNumber(loanAmountValue(loan));
  const paid = asNumber(
    paymentByLoan.get(String(loan?.loanId || loan?._id || "")),
  );
  const outstanding = firstValue(
    loan?.pendingAmount,
    loan?.balanceOutstanding,
    loan?.outstandingAmount,
    loan?.balanceAmount,
  );
  return {
    id: String(loan?._id || loan?.loanId || Math.random()),
    loanId: loan?.loanId || loan?.loan_number || loan?._id || "—",
    amount,
    rate: rateValue(loan),
    emi: emiValue(loan),
    startDate: resolveLoanDate(loan),
    endDate: resolveLoanEndDate(loan),
    status:
      firstValue(
        loan?.status,
        loan?.currentStage,
        loan?.loanStatus,
        loan?.approval_status,
      ) || "Unknown",
    vehicle: vehicleLabel(loan),
    registrationNumber:
      firstValue(
        loan?.vehicleRegNo,
        loan?.registrationNumber,
        loan?.rc_redg_no,
      ) || "—",
    bank: firstValue(loan?.bankName, loan?.approval_bankName) || "—",
    loanStage:
      firstValue(loan?.currentStage, loan?.currentStatus, loan?.status) || "—",
    paymentPaid: paid,
    outstanding: asNumber(outstanding || Math.max(amount - paid, 0)),
    approvalAmount: asNumber(
      firstValue(loan?.approval_loanAmountApproved, loan?.approvalAmount),
    ),
    disbursedAmount: asNumber(
      firstValue(
        loan?.approval_loanAmountDisbursed,
        loan?.disburse_amount,
        loan?.disburseAmount,
      ),
    ),
    createdAt: loan?.createdAt,
    updatedAt: loan?.updatedAt,
    raw: loan,
  };
};
const normalizeInsurance = (row = {}) => ({
  id: String(row?._id || row?.caseId || Math.random()),
  policyNumber:
    firstValue(
      row?.policyNumber,
      row?.policyNo,
      row?.caseId,
      row?.insurancePolicyNo,
    ) || "—",
  provider:
    firstValue(
      row?.companyName,
      row?.insurerName,
      row?.providerName,
      row?.insuranceCompany,
    ) || "—",
  coverage: asNumber(
    firstValue(
      row?.coverageAmount,
      row?.sumInsured,
      row?.insuranceAmount,
      row?.insuredDeclaredValue,
    ),
  ),
  expiryDate: firstValue(
    row?.expiryDate,
    row?.policyExpiryDate,
    row?.policyEndDate,
    row?.insuranceExpiryDate,
  ),
  status:
    firstValue(row?.status, row?.policyStatus, row?.insuranceStatus) ||
    "Unknown",
  vehicle:
    firstValue(
      row?.vehicleName,
      row?.vehicleModel,
      row?.registrationNumber,
      row?.vehicleRegNo,
    ) || "—",
  registrationNumber:
    firstValue(row?.registrationNumber, row?.vehicleRegNo, row?.rc_redg_no) ||
    "—",
  loanId: firstValue(row?.loanId, row?.linkedLoanId) || "—",
  customerId: firstValue(row?.customerId) || "",
  customerName:
    firstValue(row?.customerName, row?.customerSnapshot?.customerName) || "",
  raw: row,
});
const normalizePayment = (row = {}) => ({
  id: String(row?._id || row?.paymentId || row?.loanId || Math.random()),
  date: firstValue(
    row?.paymentDate,
    row?.paidDate,
    row?.receiptDate,
    row?.transactionDate,
    row?.createdAt,
  ),
  loanId: firstValue(row?.loanId, row?.do_loanId) || "—",
  amount: asNumber(
    firstValue(
      row?.amount,
      row?.paymentAmount,
      row?.receiptAmount,
      row?.paidAmount,
    ),
  ),
  status:
    firstValue(row?.status, row?.paymentStatus, row?.overallStatus) ||
    "Recorded",
  lateFee: asNumber(
    firstValue(row?.lateFee, row?.lateFees, row?.penalty, row?.lateCharge),
  ),
  remarks:
    firstValue(row?.remarks, row?.note, row?.paymentRemark, row?.reason) || "—",
  mode: firstValue(row?.paymentMode, row?.receiptMode, row?.mode) || "—",
  customerName: firstValue(row?.customerName, row?.do_customerName) || "",
  raw: row,
});

const CustomerProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dashboardLoans, setDashboardLoans] = useState([]);
  const [loans, setLoans] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        console.log("🔍 Loading customer profile for ID:", id);

        const [detailRes, dashboardRes] = await Promise.all([
          customersApi.getById(id),
          customersApi.getDashboard(id),
        ]);

        console.log("📦 Customer Detail Response:", detailRes);
        console.log("📦 Dashboard Response:", dashboardRes);

        const detail = getData(detailRes) || {};
        const dashboard = getData(dashboardRes) || {};
        console.log("📋 Extracted Detail:", detail);
        console.log("📋 Extracted Dashboard:", dashboard);

        const dashboardCustomer =
          dashboard?.customer || dashboard?.data?.customer || {};
        const resolvedCustomer =
          detail && Object.keys(detail).length ? detail : dashboardCustomer;
        const customerName = firstValue(
          resolvedCustomer?.customerName,
          dashboardCustomer?.customerName,
          dashboard?.customerName,
          detail?.customerName,
          "",
        );

        console.log("👤 Customer Name:", customerName);
        console.log("👤 Resolved Customer:", resolvedCustomer);

        const dashboardLoanRows = toArray(
          dashboard?.loans || dashboard?.linkedLoans || detail?.linkedLoans,
        );
        const dashboardSummary = dashboard?.summary || {
          totalLoans: dashboardLoanRows.length,
        };

        console.log("💰 Dashboard Loans:", dashboardLoanRows);
        console.log("📊 Dashboard Summary:", dashboardSummary);

        const [loanRes, insuranceRes, paymentRes] = await Promise.all([
          loansApi.getAll({ search: customerName, limit: 1000, skip: 0 }),
          insuranceApi.getAll({ limit: 1000, skip: 0 }),
          paymentsApi.getAll({ search: customerName, limit: 1000, skip: 0 }),
        ]);

        console.log("📄 Loans Response:", loanRes);
        console.log("🛡️ Insurance Response:", insuranceRes);
        console.log("💳 Payments Response:", paymentRes);

        const fullLoans = toArray(getData(loanRes));
        const insuranceRows = toArray(getData(insuranceRes));
        const paymentRows = toArray(getData(paymentRes));

        console.log("✅ Processed Loans:", fullLoans);
        console.log("✅ Processed Insurance:", insuranceRows);
        console.log("✅ Processed Payments:", paymentRows);

        const paymentRowsNormalized = paymentRows
          .map(normalizePayment)
          .filter(
            (row) =>
              !customerName ||
              normalizeText(row.customerName || "").includes(
                normalizeText(customerName),
              ) ||
              row.loanId !== "—",
          );

        const paymentByLoan = new Map();
        paymentRowsNormalized.forEach((payment) => {
          const loanKey = String(payment?.loanId || "").trim();
          if (!loanKey) return;
          const current = paymentByLoan.get(loanKey) || 0;
          paymentByLoan.set(loanKey, current + payment.amount);
        });

        const mergedLoanMap = new Map();
        [...dashboardLoanRows, ...fullLoans]
          .filter(
            (loan) =>
              loan &&
              (matchesCustomerIdentity(loan, resolvedCustomer) ||
                matchesCustomerIdentity(loan, dashboardCustomer) ||
                !customerName),
          )
          .forEach((loan) => {
            const key = String(
              loan?._id || loan?.loanId || loan?.loan_number || "",
            ).trim();
            if (!key) return;
            if (!mergedLoanMap.has(key)) mergedLoanMap.set(key, loan);
            else mergedLoanMap.set(key, { ...mergedLoanMap.get(key), ...loan });
          });

        const normalizedLoans = [...mergedLoanMap.values()].map((loan) =>
          normalizeLoan(loan, paymentByLoan),
        );
        const normalizedInsurance = insuranceRows
          .map(normalizeInsurance)
          .filter((row) => {
            const idMatch =
              String(row.customerId || "") ===
              String(resolvedCustomer?._id || detail?._id || "");
            const nameMatch =
              customerName &&
              normalizeText(row.customerName).includes(
                normalizeText(customerName),
              );
            return idMatch || nameMatch || !customerName;
          });

        const finalCustomer = {
          ...dashboardCustomer,
          ...detail,
          ...resolvedCustomer,
        };

        console.log("🎯 Final Customer:", finalCustomer);
        console.log("📊 Summary:", dashboardSummary);
        console.log("📋 Normalized Loans:", normalizedLoans);
        console.log("🛡️ Normalized Insurance:", normalizedInsurance);
        console.log("💳 Payment Rows Normalized:", paymentRowsNormalized);

        if (!cancelled) {
          setCustomer(finalCustomer);
          setSummary(dashboardSummary);
          setDashboardLoans(dashboardLoanRows);
          setLoans(normalizedLoans);
          setInsurance(normalizedInsurance);
          setPayments(paymentRowsNormalized);
          console.log("✨ State updated successfully!");
        }
      } catch (err) {
        console.error("❌ Error loading customer profile:", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load customer profile");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          console.log("🏁 Loading complete");
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const customerName = customer?.customerName || customer?.name || "Customer";
  const customerId = customer?.customerId || summary?.customerId || "—";
  const initials = getInitials(customerName);
  const hue = nameToHue(customerName);
  const avatarUrl = String(
    customer?.avatarUrl || customer?.photoUrl || "",
  ).trim();
  const score = firstValue(
    customer?.creditScore,
    customer?.cibilScore,
    customer?.cibil,
    customer?.score,
  );
  const risk = buildRiskMeta(score, loans);
  const kyc = statusMeta(
    customer?.kycStatus || customer?.kyc_status || customer?.kyc,
  );
  const account = statusMeta(
    firstValue(
      customer?.status,
      customer?.accountStatus,
      customer?.customerStatus,
    ),
  );

  const activeLoans = loans.filter((loan) =>
    /active|approved|disbursed|pending/i.test(String(loan.status || "")),
  ).length;
  const closedLoans = loans.filter((loan) =>
    /closed|completed|settled/i.test(String(loan.status || "")),
  ).length;
  const defaultedLoans = loans.filter((loan) =>
    /default|overdue|bounced/i.test(String(loan.status || "")),
  ).length;
  const totalLoanAmount = sum(
    loans,
    (loan) => loan.amount || loan.approvalAmount || loan.disbursedAmount,
  );
  const totalEMIPaid = sum(payments, (row) => row.amount);
  const pendingAmount = sum(loans, (loan) => loan.outstanding);
  const totalInsuranceCoverage = sum(insurance, (row) => row.coverage);
  const activeInsuranceCount = insurance.filter((row) =>
    /active|verified|in force|valid/i.test(String(row.status || "")),
  ).length;
  const paymentLateFees = sum(payments, (row) => row.lateFee);
  const repaymentProgress =
    totalLoanAmount > 0
      ? Math.min(
          100,
          Math.round(
            ((totalLoanAmount - pendingAmount) / totalLoanAmount) * 100,
          ),
        )
      : 0;
  const totalPaymentEvents = payments.length;
  const onTimePayments = payments.filter(
    (row) =>
      !row.lateFee &&
      !/late|missed|overdue|bounced/i.test(String(row.status || "")),
  ).length;
  const paymentConsistency = totalPaymentEvents
    ? Math.round((onTimePayments / totalPaymentEvents) * 100)
    : 0;

  const vehicleCards = useMemo(() => {
    const byKey = new Map();
    loans.forEach((loan) => {
      const key = String(
        loan.registrationNumber || loan.vehicle || loan.loanId || Math.random(),
      );
      if (!byKey.has(key)) {
        const matchingInsurance = insurance.find(
          (item) =>
            normalizeText(item.registrationNumber) ===
              normalizeText(loan.registrationNumber) ||
            normalizeText(item.loanId) === normalizeText(loan.loanId) ||
            (!item.registrationNumber &&
              !loan.registrationNumber &&
              normalizeText(item.customerName).includes(
                normalizeText(customerName),
              )),
        );
        byKey.set(key, {
          id: key,
          vehicle: loan.vehicle,
          registrationNumber: loan.registrationNumber,
          loanId: loan.loanId,
          insuranceStatus: matchingInsurance?.status,
          insuranceExpiry: matchingInsurance?.expiryDate,
        });
      }
    });
    return [...byKey.values()];
  }, [loans, insurance, customerName]);

  const timelineItems = useMemo(() => {
    const items = [];
    loans.forEach((loan) => {
      if (loan.createdAt) {
        items.push({
          key: `${loan.id}-applied`,
          date: loan.createdAt,
          color: "blue",
          label: "Loan applied",
          title: loan.loanId,
          description: `${loan.vehicle} • ${formatCurrency(loan.amount || loan.approvalAmount || loan.disbursedAmount)}`,
        });
      }
      if (
        loan.status &&
        /approved|disbursed|active/i.test(String(loan.status))
      ) {
        items.push({
          key: `${loan.id}-approved`,
          date: loan.updatedAt || loan.createdAt,
          color: "green",
          label: "Loan approved",
          title: loan.loanId,
          description: `${loan.status} • EMI ${loan.emi ? formatCurrency(loan.emi) : "N/A"}`,
        });
      }
      if (loan.outstanding > 0) {
        items.push({
          key: `${loan.id}-pending`,
          date: loan.updatedAt || loan.createdAt,
          color: "gold",
          label: "Pending amount",
          title: loan.loanId,
          description: `${formatCurrency(loan.outstanding)} still outstanding`,
        });
      }
      if (/default|overdue|bounced/i.test(String(loan.status || ""))) {
        items.push({
          key: `${loan.id}-default`,
          date: loan.updatedAt || loan.createdAt,
          color: "red",
          label: "Penalty / default",
          title: loan.loanId,
          description: `Needs attention for ${loan.vehicle}`,
        });
      }
    });

    payments.slice(0, 20).forEach((payment) => {
      items.push({
        key: `${payment.id}-payment`,
        date: payment.date,
        color: paymentTone(payment) === "red" ? "red" : "blue",
        label:
          asNumber(payment.lateFee) > 0 ? "EMI paid with late fee" : "EMI paid",
        title: payment.loanId,
        description: `${formatCurrency(payment.amount)} • ${payment.mode}${asNumber(payment.lateFee) > 0 ? ` • late fee ${formatCurrency(payment.lateFee)}` : ""}`,
      });
    });

    insurance.forEach((policy) => {
      items.push({
        key: `${policy.id}-insurance`,
        date:
          policy.expiryDate || policy.raw?.updatedAt || policy.raw?.createdAt,
        color: insuranceTone(policy.status) === "red" ? "red" : "green",
        label: "Insurance update",
        title: policy.policyNumber,
        description: `${policy.provider} • ${policy.status}`,
      });
    });

    return items
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 18);
  }, [loans, payments, insurance]);

  const analyticsBars = useMemo(() => {
    const months = new Map();
    payments.forEach((payment) => {
      const date = payment.date ? new Date(payment.date) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const key = date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
      months.set(key, (months.get(key) || 0) + payment.amount);
    });
    const entries = [...months.entries()].slice(-6);
    const max = Math.max(...entries.map(([, value]) => value), 1);
    return entries.map(([label, value]) => ({
      label,
      value,
      width: Math.max(8, Math.round((value / max) * 100)),
    }));
  }, [payments]);

  const summaryCards = [
    {
      title: "Total Loan Amount Taken",
      value: formatCurrency(totalLoanAmount),
      subtitle: `${formatNumber(loans.length)} linked loans`,
      icon: DollarSign,
      tone: "from-sky-500 to-indigo-600",
    },
    {
      title: "Active Loans",
      value: formatNumber(activeLoans),
      subtitle: `${formatNumber(closedLoans)} closed`,
      icon: Banknote,
      tone: "from-emerald-500 to-green-600",
    },
    {
      title: "Closed Loans",
      value: formatNumber(closedLoans),
      subtitle: `${formatNumber(defaultedLoans)} defaulted`,
      icon: CheckCircle2,
      tone: "from-violet-500 to-fuchsia-600",
    },
    {
      title: "Total EMI Paid",
      value: formatCurrency(totalEMIPaid),
      subtitle: `${formatNumber(totalPaymentEvents)} payments`,
      icon: CreditCard,
      tone: "from-amber-500 to-orange-600",
    },
    {
      title: "Pending Amount",
      value: formatCurrency(pendingAmount),
      subtitle: `${formatCurrency(paymentLateFees)} late fees`,
      icon: CircleAlert,
      tone: "from-rose-500 to-red-600",
    },
    {
      title: "Insurance Coverage",
      value: formatCurrency(totalInsuranceCoverage),
      subtitle: `${formatNumber(activeInsuranceCount)} active policies`,
      icon: ShieldCheck,
      tone: "from-cyan-500 to-blue-600",
    },
  ];

  const loanColumns = [
    {
      title: "Loan ID",
      dataIndex: "loanId",
      key: "loanId",
      render: (value) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {value}
        </span>
      ),
    },
    {
      title: "Loan Amount",
      dataIndex: "amount",
      key: "amount",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Interest Rate",
      dataIndex: "rate",
      key: "rate",
      render: (value) => (isPresent(value) ? `${value}%` : "—"),
    },
    {
      title: "Start / End",
      key: "duration",
      render: (_, row) => (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <div>{formatDate(row.startDate)}</div>
          <div>{formatDate(row.endDate)}</div>
        </div>
      ),
    },
    {
      title: "EMI",
      dataIndex: "emi",
      key: "emi",
      render: (value) => (value ? formatCurrency(value) : "—"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag color={loanStatusTone(value)}>{value || "Unknown"}</Tag>
      ),
    },
  ];

  const loanExpandedRowRender = (row) => (
    <div className="grid grid-cols-1 gap-3 p-2 md:grid-cols-3">
      {[
        { label: "Vehicle", value: row.vehicle },
        { label: "Registration", value: row.registrationNumber },
        { label: "Bank", value: row.bank },
        { label: "Stage", value: row.loanStage },
        {
          label: "Approved Amount",
          value: row.approvalAmount ? formatCurrency(row.approvalAmount) : "—",
        },
        {
          label: "Disbursed Amount",
          value: row.disbursedAmount
            ? formatCurrency(row.disbursedAmount)
            : "—",
        },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {item.label}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 md:px-6">
        <div className="mb-4 flex items-center gap-3 text-sm text-slate-500">
          <Spin size="small" /> Loading customer profile...
        </div>
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900 xl:col-span-12" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900 xl:col-span-6" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900 xl:col-span-6" />
          <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900 xl:col-span-12" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 md:px-6">
        <Alert
          type="error"
          showIcon
          message="Customer profile could not be loaded"
          description={error}
          action={
            <button
              type="button"
              onClick={() => navigate("/customers")}
              className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
            >
              Back to customers
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 pb-12 pt-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/customers")}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <ArrowLeft size={14} /> Back to Customers
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Customer Profile Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
            {customerName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            A complete overview of identity, loans, vehicles, payments,
            insurance, and activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tag
            color={kyc.color}
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
          >
            KYC {kyc.label}
          </Tag>
          <Tag
            color={account.color}
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
          >
            Account {account.label}
          </Tag>
          <Tag
            color={
              risk.tone === "rose"
                ? "red"
                : risk.tone === "amber"
                  ? "gold"
                  : risk.tone === "emerald"
                    ? "green"
                    : "blue"
            }
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
          >
            {risk.label}
            {risk.score ? ` • ${risk.score}` : ""}
          </Tag>
        </div>
      </div>

      <Card
        className="overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
        styles={{ body: { padding: 0 } }}
      >
        <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-6 py-6 text-white md:px-8 md:py-8">
            <div className="pointer-events-none absolute right-6 top-6 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute left-24 top-12 h-20 w-20 rounded-full bg-cyan-400/10 blur-2xl" />

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <div
                  className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/15 text-4xl font-black text-white shadow-2xl"
                  style={{ backgroundColor: `hsl(${hue}, 55%, 46%)` }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={customerName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    Customer Overview
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                    {customerName}
                  </h2>
                  <p className="mt-1 text-sm text-white/75">
                    Customer ID: {customerId}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                      <UserCircle2 size={14} />{" "}
                      {customer?.primaryMobile || "No mobile"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                      <FileText size={14} /> {customer?.email || "No email"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                      <ShieldCheck size={14} /> {risk.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid min-w-[18rem] gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    Phone
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {customer?.primaryMobile || "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-bold text-white truncate">
                    {customer?.email || "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur-sm sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    Address
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {customer?.residenceAddress ||
                      customer?.permanentAddress ||
                      "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 bg-slate-50 p-4 dark:bg-slate-950 md:grid-cols-2 xl:grid-cols-1 xl:p-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                KYC Status
              </p>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">
                {kyc.label}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Verification and document readiness.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Risk Level
              </p>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">
                {risk.label}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Credit score: {risk.score || "—"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2 xl:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Account Status
              </p>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">
                {account.label}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Customer record and loan lifecycle health.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Col key={card.title} xs={24} sm={12} xl={8}>
              <Card
                className="overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
                styles={{ body: { padding: 0 } }}
              >
                <div
                  className={`relative overflow-hidden bg-gradient-to-br ${card.tone} p-5 text-white`}
                >
                  <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                        {card.title}
                      </p>
                      <p className="mt-1 text-2xl font-black tabular-nums">
                        {card.value}
                      </p>
                      <p className="mt-1 text-xs text-white/80">
                        {card.subtitle}
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-7">
          <Card
            title={
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Loan Details
              </span>
            }
            className="rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
            extra={
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatNumber(loans.length)} records
              </span>
            }
          >
            <Table
              size="middle"
              columns={loanColumns}
              dataSource={loans}
              pagination={false}
              rowKey={(row) => row.id}
              expandable={{ expandedRowRender: loanExpandedRowRender }}
              scroll={{ x: 860 }}
            />
            {!loans.length && (
              <Empty
                className="py-10"
                description="No loan records found for this customer."
              />
            )}
          </Card>

          <Card
            title={
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Vehicle Details
              </span>
            }
            className="rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {vehicleCards.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Vehicle
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {vehicle.vehicle}
                      </p>
                    </div>
                    <CarFront size={18} className="text-slate-400" />
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      Reg No:{" "}
                      <span className="font-semibold">
                        {vehicle.registrationNumber}
                      </span>
                    </div>
                    <div>
                      Linked Loan:{" "}
                      <span className="font-semibold">{vehicle.loanId}</span>
                    </div>
                    <div>
                      Insurance:{" "}
                      <span className="font-semibold">
                        {vehicle.insuranceStatus || "Not linked"}
                      </span>
                    </div>
                    <div>
                      Insurance Expiry:{" "}
                      <span className="font-semibold">
                        {formatDate(vehicle.insuranceExpiry)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {!vehicleCards.length && (
                <Empty
                  className="py-4 sm:col-span-2 xl:col-span-3"
                  description="No vehicle information available."
                />
              )}
            </div>
          </Card>

          <Card
            title={
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Payment History
              </span>
            }
            className="rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
          >
            <Table
              size="middle"
              columns={[
                {
                  title: "Date",
                  dataIndex: "date",
                  key: "date",
                  render: (value) => formatDate(value),
                },
                { title: "Loan ID", dataIndex: "loanId", key: "loanId" },
                {
                  title: "Amount",
                  dataIndex: "amount",
                  key: "amount",
                  render: (value) => formatCurrency(value),
                },
                {
                  title: "Late Fee",
                  dataIndex: "lateFee",
                  key: "lateFee",
                  render: (value) => (value ? formatCurrency(value) : "—"),
                },
                { title: "Mode", dataIndex: "mode", key: "mode" },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (value, row) => (
                    <Tag color={paymentTone(row)}>{value || "Recorded"}</Tag>
                  ),
                },
              ]}
              dataSource={payments}
              pagination={false}
              rowKey={(row) => row.id}
              rowClassName={(row) =>
                asNumber(row.lateFee) > 0
                  ? "bg-rose-50/60 dark:bg-rose-950/20"
                  : ""
              }
              scroll={{ x: 860 }}
            />
            {!payments.length && (
              <Empty
                className="py-10"
                description="No payment history available."
              />
            )}
          </Card>

          <Card
            title={
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Insurance Details
              </span>
            }
            className="rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {insurance.map((policy) => (
                <div
                  key={policy.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Policy Number
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {policy.policyNumber}
                      </p>
                    </div>
                    <Tag color={insuranceTone(policy.status)}>
                      {policy.status}
                    </Tag>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      Provider:{" "}
                      <span className="font-semibold">{policy.provider}</span>
                    </div>
                    <div>
                      Coverage:{" "}
                      <span className="font-semibold">
                        {policy.coverage
                          ? formatCurrency(policy.coverage)
                          : "—"}
                      </span>
                    </div>
                    <div>
                      Expiry:{" "}
                      <span className="font-semibold">
                        {formatDate(policy.expiryDate)}
                      </span>
                    </div>
                    <div>
                      Vehicle:{" "}
                      <span className="font-semibold">{policy.vehicle}</span>
                    </div>
                  </div>
                </div>
              ))}
              {!insurance.length && (
                <Empty
                  className="py-4 sm:col-span-2 xl:col-span-3"
                  description="No insurance records available."
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5 xl:col-span-5">
          <Card
            title={
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Activity Timeline
              </span>
            }
            className="rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
          >
            {timelineItems.length ? (
              <Timeline
                items={timelineItems.map((item) => ({
                  color: item.color,
                  children: (
                    <div className="pb-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {item.label}
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {item.description}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDateTime(item.date)}
                      </div>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="No activity found yet." />
            )}
          </Card>

          <Card
            title={
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Analytics
              </span>
            }
            className="rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
          >
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Repayment Progress</span>
                  <span>{repaymentProgress}%</span>
                </div>
                <Progress
                  percent={repaymentProgress}
                  strokeColor={{ from: "#0ea5e9", to: "#22c55e" }}
                  showInfo={false}
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Payment Consistency</span>
                  <span>{paymentConsistency}%</span>
                </div>
                <Progress
                  percent={paymentConsistency}
                  strokeColor={{ from: "#8b5cf6", to: "#06b6d4" }}
                  showInfo={false}
                />
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Monthly EMI Trends</span>
                  <span>{formatCurrency(totalEMIPaid)}</span>
                </div>
                <div className="space-y-3">
                  {analyticsBars.length ? (
                    analyticsBars.map((bar) => (
                      <div key={bar.label}>
                        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <span>{bar.label}</span>
                          <span>{formatCurrency(bar.value)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                            style={{ width: `${bar.width}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      No payment trend data yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card
            title={
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Quick Snapshot
              </span>
            }
            className="rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-800"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Customer Since",
                  value: formatDate(customer?.createdAt || customer?.createdOn),
                },
                {
                  label: "Profile Updated",
                  value: formatDate(customer?.updatedAt),
                },
                {
                  label: "Dashboard Loans",
                  value: formatNumber(dashboardLoans.length),
                },
                {
                  label: "Profile Completion",
                  value: `${summary?.profileCompletion ?? 0}%`,
                },
                {
                  label: "Active Insurance",
                  value: formatNumber(activeInsuranceCount),
                },
                {
                  label: "Pending Total",
                  value: formatCurrency(pendingAmount),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
