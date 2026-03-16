import React, { useState, useEffect } from "react";
import { AutoComplete, Modal, Select, Timeline } from "antd";
import Icon from "../../../../../../components/AppIcon";
import Button from "../../../../../../components/ui/Button";
import { lenderHypothecationOptions } from "../../../../../../constants/lenderHypothecationOptions";

const BANK_LOGO_DOMAIN_MAP = {
  hdfc: "hdfcbank.com",
  "hdfc bank": "hdfcbank.com",
  icici: "icicibank.com",
  "icici bank": "icicibank.com",
  sbi: "sbi.co.in",
  "state bank of india": "sbi.co.in",
  axis: "axisbank.com",
  "axis bank": "axisbank.com",
  kotak: "kotak.com",
  "kotak mahindra bank": "kotak.com",
  federal: "federalbank.co.in",
  "federal bank": "federalbank.co.in",
  pnb: "pnbindia.in",
  "punjab national bank": "pnbindia.in",
  bob: "bankofbaroda.in",
  "bank of baroda": "bankofbaroda.in",
  boi: "bankofindia.co.in",
  "bank of india": "bankofindia.co.in",
  canara: "canarabank.com",
  "canara bank": "canarabank.com",
  indusind: "indusind.com",
  "indusind bank": "indusind.com",
  idfc: "idfcfirstbank.com",
  "idfc first bank": "idfcfirstbank.com",
  idbi: "idbibank.in",
  "idbi bank": "idbibank.in",
  yes: "yesbank.in",
  "yes bank": "yesbank.in",
  rbl: "rblbank.com",
  "rbl bank": "rblbank.com",
  union: "unionbankofindia.co.in",
  "union bank of india": "unionbankofindia.co.in",
  iob: "iob.in",
  "indian bank": "indianbank.in",
  "indian overseas bank": "iob.in",
  "uco bank": "ucobank.com",
  "jammu & kashmir bank": "jkbank.com",
  "karur vysya bank": "kvb.co.in",
  "karnataka bank": "ktkbank.com",
  "city union bank": "cityunionbank.com",
  "bandhan bank": "bandhanbank.com",
  "dbs bank india": "dbs.com",
  "dbs bank india limited": "dbs.com",
  "paytm payments bank": "paytmbank.com",
  "paytm payments bank limited": "paytmbank.com",
  "airtel payments bank": "airtel.in",
  "airtel payments bank limited": "airtel.in",
  "india post payments bank": "ippbonline.com",
  "india post payments bank limited": "ippbonline.com",
  "fino payments bank": "finobank.com",
  "fino payments bank limited": "finobank.com",
  "jio payments bank": "jio.com",
  "jio payments bank limited": "jio.com",
  "nsdl payments bank": "nsdlbank.co.in",
  "nsdl payments bank limited": "nsdlbank.co.in",
  "bajaj finance": "bajajfinserv.in",
  "bajaj finance limited": "bajajfinserv.in",
  "tata capital": "tatacapital.com",
  "tata capital financial services": "tatacapital.com",
  "tata capital financial services limited": "tatacapital.com",
  "hdb financial services": "hdbfs.com",
  "mahindra & mahindra financial services": "mahindrafinance.com",
  "mmfsl": "mahindrafinance.com",
  "shriram finance": "shriramfinance.in",
  "cholamandalam investment & finance": "cholamandalam.com",
  "cholamandalam finance": "chola.ms",
  "hero fincorp": "herofincorp.com",
  "aditya birla finance": "adityabirlacapital.com",
  "l&t finance": "ltfs.com",
  "lt finance": "ltfs.com",
  "sbi general insurance company limited": "sbigeneral.in",
  "sbi life insurance company limited": "sbilife.co.in",
};

const SIMPLE_ICON_SLUG_MAP = {
  hdfc: "hdfcbank",
  "hdfc bank": "hdfcbank",
  icici: "icicibank",
  "icici bank": "icicibank",
  axis: "axisbank",
  "axis bank": "axisbank",
  paytm: "paytm",
  "paytm payments bank": "paytm",
  airtel: "airtel",
  "airtel payments bank": "airtel",
  "idfc first bank": "idfcfirstbank",
  indusind: "indusindbank",
  "indusind bank": "indusindbank",
  yes: "yesbank",
  "yes bank": "yesbank",
  "bajaj finance": "bajajfinserv",
  "bajaj finance limited": "bajajfinserv",
};

const normalizeBankNameKey = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[.,&/()-]/g, " ")
    .replace(/\b(ltd|limited|banking|co|company)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const bankLogoSources = (bankName) => {
  const rawKey = String(bankName || "").toLowerCase().trim();
  const normalized = normalizeBankNameKey(bankName);
  const simpleExact = SIMPLE_ICON_SLUG_MAP[rawKey] || SIMPLE_ICON_SLUG_MAP[normalized];
  const simpleHit = Object.entries(SIMPLE_ICON_SLUG_MAP).find(([key]) =>
    normalized.includes(normalizeBankNameKey(key)),
  );
  const simpleSlug = simpleExact || simpleHit?.[1] || "";
  const byExact = BANK_LOGO_DOMAIN_MAP[rawKey] || BANK_LOGO_DOMAIN_MAP[normalized];
  const entries = Object.entries(BANK_LOGO_DOMAIN_MAP);
  const fallbackHit = entries.find(([key]) => normalized.includes(normalizeBankNameKey(key)));
  const domain = byExact || fallbackHit?.[1] || "";
  const sources = [];
  if (domain) {
    sources.push(
      // Prefer full-color logo providers first.
      `https://logo.clearbit.com/${domain}?size=256`,
      `https://logo.clearbit.com/${domain}?size=128`,
      `https://www.google.com/s2/favicons?sz=256&domain=${domain}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    );
  }
  if (simpleSlug) {
    // Last fallback only; many simpleicons render monochrome.
    sources.push(`https://cdn.simpleicons.org/${simpleSlug}`);
  }
  return sources;
};

const initialsFromBankName = (bankName) => {
  const tokens = String(bankName || "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !["bank", "limited", "ltd", "finance", "financial", "services"].includes(t.toLowerCase()));

  if (!tokens.length) return "BK";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] || ""}${tokens[1][0] || ""}`.toUpperCase();
};

const BankLogoBadge = ({ bankName }) => {
  const [logoIndex, setLogoIndex] = useState(0);
  const logoUrls = React.useMemo(() => bankLogoSources(bankName), [bankName]);
  const logoUrl = logoUrls[logoIndex] || "";
  const isSimpleIcon = logoUrl.includes("cdn.simpleicons.org");
  const isFaviconFallback =
    logoUrl.includes("google.com/s2/favicons") ||
    logoUrl.includes("icons.duckduckgo.com");

  useEffect(() => {
    setLogoIndex(0);
  }, [bankName]);

  const canShowImage = Boolean(logoUrl);

  return (
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-slate-950">
      {canShowImage ? (
        <img
          src={logoUrl}
          alt={bankName || "Bank"}
          className={`object-contain ${
            isSimpleIcon
              ? "h-8 w-8"
              : isFaviconFallback
                ? "h-7 w-7"
                : "h-9 w-9"
          }`}
          loading="lazy"
          onError={() => setLogoIndex((prev) => prev + 1)}
        />
      ) : (
        <span className="text-[11px] font-black tracking-wide text-primary">
          {initialsFromBankName(bankName)}
        </span>
      )}
    </div>
  );
};

const getStatusClasses = (status) => {
  const s = (status || "").toLowerCase();

  if (s === "approved")
    return "border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (s === "disbursed")
    return "border border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/45 dark:text-teal-300";
  if (s === "documents required")
    return "border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/45 dark:text-amber-300";
  if (s === "rejected")
    return "border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-300";
  if (s === "pending" || s === "under review")
    return "border border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/45 dark:text-yellow-300";

  return "border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
};

const getStatusIcon = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "BadgeCheck";
  if (s === "disbursed") return "WalletCards";
  if (s === "documents required") return "FileWarning";
  if (s === "rejected") return "ShieldX";
  if (s === "pending" || s === "under review") return "Clock3";
  return "CircleDot";
};

const parseInr = (val) => {
  if (val === "" || val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const formatInr = (val) =>
  parseInr(val).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// EMI formula
const calculateEmi = (principal, annualRate, tenureMonths) => {
  const P = parseInr(principal);
  const N = tenureMonths || 0;
  const R = (annualRate || 0) / 12 / 100;
  if (!P || !N || !R) return 0;
  const pow = Math.pow(1 + R, N);
  const emi = (P * R * pow) / (pow - 1);
  return Math.round(emi);
};

// LTV formula
const calculateLtv = (loanAmount, carValue) => {
  const loan = parseInr(loanAmount);
  const value = parseInr(carValue);
  if (!loan || !value) return 0;
  return (loan / value) * 100;
};

const clamp = (val, min, max) => Math.min(max, Math.max(min, val || 0));

const BankStatusCard = ({
  bank,
  form,
  onUpdateStatus,
  onBankNameChange,
  onDeleteBank,
  readOnly = false,
  allowDetailsInReadOnly = false,
  onBankUpdate, // NEW: parent updater
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showBreakup, setShowBreakup] = useState(false);
  const [breakupReadOnly, setBreakupReadOnly] = useState(false);
  const [showHistoryTimeline, setShowHistoryTimeline] = useState(false);

  // breakup fields
  const [netLoanApproved, setNetLoanApproved] = useState(0);

  const [creditAssuredFinance, setCreditAssuredFinance] = useState(
    bank.breakupCreditAssured ?? ""
  );

  const [insuranceFinance, setInsuranceFinance] = useState(
    bank.breakupInsuranceFinance ?? ""
  );

  const [extendedWarrantyFinance, setExtendedWarrantyFinance] = useState(
    bank.breakupEwFinance ?? ""
  );

  // vehicle + price + rate/fee/tenure + extra fields
  const vehicleMake = form?.getFieldValue("vehicleMake");
  const vehicleModel = form?.getFieldValue("vehicleModel");
  const vehicleVariant = form?.getFieldValue("vehicleVariant");
  const exShowroomPrice = form?.getFieldValue("exShowroomPrice");
  const loanType = form?.getFieldValue("typeOfLoan");
  const isNewCar = loanType === "New Car";

  const [tenureMonths, setTenureMonths] = useState(
    Number(bank.tenure) ||
      Number(form?.getFieldValue?.("approval_tenureMonths")) ||
      60
  );
  const [interestRate, setInterestRate] = useState(
    bank.interestRate?.toString() || ""
  );

  const [processingFee, setProcessingFee] = useState(bank.processingFee || "");
  const [cibilScore, setCibilScore] = useState(750);
  const [loanBookedIn, setLoanBookedIn] = useState(
    bank?.loanBookedIn || form?.getFieldValue("approval_loanBookedIn") || "Direct Code",
  );
  const [brokerName, setBrokerName] = useState(
    bank?.brokerName || form?.getFieldValue("approval_brokerName") || "",
  );
  const [dsaCode, setDsaCode] = useState(bank?.dsaCode || form?.getFieldValue("dsaCode") || "");
  const [payoutPercent, setPayoutPercent] = useState(bank.payoutPercent || "");

  const netFromBreakup = parseInr(netLoanApproved);
  const addOnTotal =
    parseInr(creditAssuredFinance) +
    parseInr(insuranceFinance) +
    parseInr(extendedWarrantyFinance);
  const loanAmountFromBank = parseInr(bank.loanAmount);
  const approvedFromForm = parseInr(form?.getFieldValue?.("approval_loanAmountApproved"));
  const disbursedFromForm = parseInr(form?.getFieldValue?.("approval_loanAmountDisbursed"));
  const topLevelBase = Math.max(approvedFromForm, disbursedFromForm, 0);

  let displayLoanAmount = 0;
  if (netFromBreakup > 0) {
    displayLoanAmount = netFromBreakup + addOnTotal;
  } else if (loanAmountFromBank > 0) {
    if (addOnTotal > 0 && loanAmountFromBank <= addOnTotal && topLevelBase > 0) {
      displayLoanAmount = topLevelBase + addOnTotal;
    } else {
      displayLoanAmount = loanAmountFromBank;
    }
  } else if (topLevelBase > 0) {
    displayLoanAmount = topLevelBase + addOnTotal;
  } else {
    displayLoanAmount = addOnTotal;
  }

  const topLevelTenure = Number(form?.getFieldValue?.("approval_tenureMonths")) || 0;
  const bankTenure = Number(bank?.tenure) || 0;
  const tenureDisplay = bankTenure || topLevelTenure || Number(tenureMonths) || 0;

  const emi = calculateEmi(
    displayLoanAmount,
    parseFloat(interestRate) || 0,
    tenureMonths
  );

  const ltv = calculateLtv(displayLoanAmount, exShowroomPrice);
  const cardSurfaceClass =
    (bank.status || "").toLowerCase() === "approved"
      ? "bg-emerald-50/65 dark:bg-emerald-950/28"
      : (bank.status || "").toLowerCase() === "disbursed"
        ? "bg-teal-50/75 dark:bg-teal-950/30"
        : (bank.status || "").toLowerCase() === "pending" ||
            (bank.status || "").toLowerCase() === "under review" ||
            (bank.status || "").toLowerCase() === "documents required"
          ? "bg-amber-50/80 dark:bg-amber-950/30"
        : (bank.status || "").toLowerCase() === "rejected"
          ? "bg-rose-50/65 dark:bg-rose-950/28"
          : "bg-card dark:bg-zinc-950/85";

  // EXPANDED loan amount (styled like other fields, opens popup editable)
  const ExpandedLoanAmount = (
    <div
      className="cursor-pointer"
      onClick={() => {
        setBreakupReadOnly(Boolean(readOnly));
        setShowBreakup(true);
      }}
    >
      <label className="text-xs text-muted-foreground">Loan Amount</label>
      <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
        <span className="font-semibold">₹ {formatInr(displayLoanAmount)}</span>
      </div>
    </div>
  );

  const handleTenureInputChange = (val) => {
    if (val === "") {
      setTenureMonths("");
      return;
    }
    const num = parseInt(val, 10);
    if (Number.isNaN(num)) return;
    setTenureMonths(num);
  };

  const handleTenureInputBlur = () => {
    if (tenureMonths === "") return;
    const num = clamp(parseInt(tenureMonths, 10) || 0, 12, 120);
    setTenureMonths(num);
    onBankUpdate && onBankUpdate({ tenure: num });
  };

  const handleTenureSliderChange = (e) => {
    const num = parseInt(e.target.value, 10);
    setTenureMonths(num);
    onBankUpdate && onBankUpdate({ tenure: num });
  };

  useEffect(() => {
    const bankLoan = parseInr(bank.loanAmount);
    const breakupNet = parseInr(bank.breakupNetLoanApproved);
    const breakupCredit = parseInr(bank.breakupCreditAssured);
    const breakupInsurance = parseInr(bank.breakupInsuranceFinance);
    const breakupEw = parseInr(bank.breakupEwFinance);
    const addons = breakupCredit + breakupInsurance + breakupEw;
    const formApproved = parseInr(form?.getFieldValue?.("approval_loanAmountApproved"));
    const formDisbursed = parseInr(form?.getFieldValue?.("approval_loanAmountDisbursed"));
    const baseFromForm = Math.max(formApproved, formDisbursed, 0);

    let resolvedNet = 0;
    if (breakupNet > 0) {
      resolvedNet = breakupNet;
    } else if (baseFromForm > 0) {
      resolvedNet = baseFromForm;
    } else if (bankLoan > 0) {
      resolvedNet = bankLoan > addons ? bankLoan - addons : bankLoan;
    }

    setNetLoanApproved(resolvedNet);
    setCreditAssuredFinance(breakupCredit);
    setInsuranceFinance(breakupInsurance);
    setExtendedWarrantyFinance(breakupEw);
  }, [
    bank.breakupNetLoanApproved,
    bank.breakupCreditAssured,
    bank.breakupInsuranceFinance,
    bank.breakupEwFinance,
    bank.loanAmount,
    form,
  ]);

  useEffect(() => {
    const nextTenure =
      Number(bank?.tenure) ||
      Number(form?.getFieldValue?.("approval_tenureMonths")) ||
      60;
    setTenureMonths(nextTenure);
  }, [bank?.tenure, form]);

  useEffect(() => {
    if (!form) return;
    const existing = bank?.dsaCode || form.getFieldValue("dsaCode");
    if (existing !== undefined && existing !== dsaCode) {
      setDsaCode(existing || "");
    }
  }, [bank?.dsaCode, form, dsaCode]);

  useEffect(() => {
    if (!form) return;
    const existingLoanBookedIn =
      bank?.loanBookedIn || form.getFieldValue("approval_loanBookedIn");
    if (existingLoanBookedIn && existingLoanBookedIn !== loanBookedIn) {
      setLoanBookedIn(existingLoanBookedIn);
    }
  }, [bank?.loanBookedIn, form, loanBookedIn]);

  useEffect(() => {
    if (!form) return;
    const existingBrokerName =
      bank?.brokerName || form.getFieldValue("approval_brokerName");
    if (existingBrokerName !== undefined && existingBrokerName !== brokerName) {
      setBrokerName(existingBrokerName || "");
    }
  }, [bank?.brokerName, form, brokerName]);

  return (
      <div
      className={`relative mx-auto flex min-h-[380px] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border/70 p-4 shadow-sm transition-all md:p-5 dark:border-zinc-800 ${cardSurfaceClass}`}
    >
      {/* SUMMARY */}
      {!expanded && (
        <>
          <div className="relative mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BankLogoBadge bankName={bank.bankName} />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {bank.bankName}
                </h3>
                {loanBookedIn === "Indirect Code" && brokerName && (
                  <p className="text-[12px] font-bold text-foreground">
                    {brokerName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Application:
                  {" "}
                  <span>{bank.applicationId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start pt-0.5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${getStatusClasses(
                  bank.status
                )}`}
              >
                <Icon name={getStatusIcon(bank.status)} size={12} className="mr-1" />
                {bank.status || "Status N/A"}
              </span>
              {onDeleteBank && (
                <button
                  type="button"
                  className="ml-2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-error"
                  onClick={onDeleteBank}
                  disabled={readOnly}
                >
                  <Icon name="Trash2" size={16} />
                </button>
              )}
            </div>
          </div>

          <div
            className="relative mb-3 cursor-pointer rounded-xl border border-border/70 bg-background p-3"
            onClick={() => {
              setBreakupReadOnly(true);
              setShowBreakup(true);
            }}
          >
            <p className="mb-1 text-xs text-muted-foreground">Loan Amount</p>
            <p className="text-2xl font-semibold leading-tight text-foreground">
              ₹ {formatInr(displayLoanAmount)}
            </p>
          </div>

          <div className="relative mb-3 rounded-xl border border-border/70 bg-background p-3 dark:bg-black/45">
            <div className="grid grid-cols-3 gap-2 text-left">
              <div>
                <p className="text-xs font-medium text-muted-foreground">EMI</p>
                <p className="text-sm font-semibold text-foreground">
                  ₹ {emi ? formatInr(emi) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">LTV</p>
                <p className="text-sm font-semibold text-foreground">
                  {ltv ? ltv.toFixed(1) : "0.0"}%
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tenure</p>
                <p className="text-sm font-semibold text-foreground">
                  {tenureDisplay ? `${tenureDisplay}m` : "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid flex-1 content-start grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border/60 bg-background/70 p-2.5">
              <p className="text-xs text-muted-foreground">Interest Rate</p>
              <p className="text-sm font-semibold">
                {bank.interestRate ? `${bank.interestRate}%` : "-"}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-2.5">
              <p className="text-xs text-muted-foreground">Status History</p>
              <button
                type="button"
                className="text-sm font-semibold text-primary hover:underline"
                onClick={() => setShowHistoryTimeline(true)}
              >
                {(bank.statusHistory || []).length} updates
              </button>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-2.5">
              <p className="text-xs text-muted-foreground">Processing Fee</p>
              <p className="text-sm font-semibold">
                {bank.processingFee || "0"}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-2.5">
              <p className="text-xs text-muted-foreground">CIBIL Score</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="relative w-10 h-10">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="#E4E4E7"
                      strokeWidth="3"
                      fill="none"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke={
                        cibilScore >= 750
                          ? "#16a34a"
                          : cibilScore >= 650
                          ? "#f59e0b"
                          : "#ef4444"
                      }
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${
                        (clamp(cibilScore, 300, 900) / 900) * 63
                      } 63`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`text-xs font-bold ${
                        cibilScore >= 750
                          ? "text-success"
                          : cibilScore >= 650
                          ? "text-warning"
                          : "text-error"
                      }`}
                    >
                      {cibilScore || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
            <Button
              size="sm"
              fullWidth
              onClick={() => setExpanded(true)}
              disabled={readOnly && !allowDetailsInReadOnly}
              iconName="FileText"
            >
              Loan Details
            </Button>
            <Button
              size="sm"
              variant="outline"
              fullWidth
              onClick={() => {
                if (typeof onUpdateStatus === "function") onUpdateStatus(bank);
              }}
              disabled={readOnly || typeof onUpdateStatus !== "function"}
              iconName="RefreshCw"
            >
              Update Status
            </Button>
          </div>
        </>
      )}
      {/* EXPANDED */}
      {expanded && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Loan Details</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded(false)}
            >
              Back
            </Button>
          </div>

          {/* Bank Name */}
          <div>
            <label className="text-xs text-muted-foreground">Bank Name</label>
            <AutoComplete
              className="w-full mt-1"
              value={bank.bankName}
              options={lenderHypothecationOptions}
              onChange={(value) => onBankNameChange(bank.id, value)}
              filterOption={(inputValue, option) =>
                String(option?.value || "")
                  .toUpperCase()
                  .includes(String(inputValue || "").toUpperCase())
              }
              placeholder="Select lender"
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Loan Booked In</label>
            <Select
              className="w-full mt-1 h-10 rounded-xl"
              value={loanBookedIn}
              disabled={readOnly}
              onChange={(value) => {
                const next = value || "Direct Code";
                setLoanBookedIn(next);
                form?.setFieldsValue({ approval_loanBookedIn: next });
                if (next === "Direct Code") {
                  form?.setFieldsValue({ approval_brokerName: "" });
                  setBrokerName("");
                } else {
                  form?.setFieldsValue({ dsaCode: "" });
                  setDsaCode("");
                }
                onBankUpdate &&
                  onBankUpdate({
                    loanBookedIn: next,
                    brokerName: next === "Direct Code" ? "" : brokerName,
                    dsaCode: next === "Direct Code" ? dsaCode : "",
                  });
              }}
              placeholder="Select booking type"
            >
              <Select.Option value="Direct Code">Direct Code</Select.Option>
              <Select.Option value="Indirect Code">Indirect Code</Select.Option>
            </Select>
          </div>

          {loanBookedIn === "Indirect Code" && (
            <div>
              <label className="text-xs text-muted-foreground">
                Broker / Corporate DSA Name
              </label>
              <input
                className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={brokerName}
                readOnly={readOnly}
                onChange={(e) => {
                  const value = e.target.value;
                  setBrokerName(value);
                  form?.setFieldsValue({ approval_brokerName: value });
                  onBankUpdate && onBankUpdate({ brokerName: value });
                }}
                placeholder="Enter broker / corporate DSA name"
              />
            </div>
          )}

          {/* Make / Model / Variant */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Make</label>
              <input
                className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={vehicleMake || ""}
                readOnly={readOnly}
                onChange={(e) =>
                  form?.setFieldsValue({ vehicleMake: e.target.value })
                }
                placeholder="Enter make"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Model</label>
              <input
                className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={vehicleModel || ""}
                readOnly={readOnly}
                onChange={(e) =>
                  form?.setFieldsValue({ vehicleModel: e.target.value })
                }
                placeholder="Enter model"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Variant</label>
              <input
                className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={vehicleVariant || ""}
                readOnly={readOnly}
                onChange={(e) =>
                  form?.setFieldsValue({ vehicleVariant: e.target.value })
                }
                placeholder="Enter variant"
              />
            </div>
          </div>

          {/* Ex-showroom */}
          {isNewCar && (
            <div>
              <label className="text-xs text-muted-foreground">
                Ex-Showroom Price
              </label>
              <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
                ₹{" "}
                {exShowroomPrice
                  ? Number(exShowroomPrice).toLocaleString("en-IN")
                  : "-"}
              </div>
            </div>
          )}

          {/* Loan Amount (breakup) */}
          {ExpandedLoanAmount}

          {/* LTV */}
          <div>
            <label className="text-xs text-muted-foreground">
              LTV (Loan to Value)
            </label>
            <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
              <span className="font-semibold">
                {ltv ? ltv.toFixed(2) : "0.00"}%
              </span>
            </div>
          </div>

          {/* Tenure: slider + textbox */}
          <div>
            <label className="text-xs text-muted-foreground">
              Tenure (Months)
            </label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="range"
                min={12}
                max={120}
                step={3}
                value={clamp(tenureMonths, 12, 120)}
                onChange={handleTenureSliderChange}
                className="flex-1"
                disabled={readOnly}
              />
              <input
                type="number"
                className="w-20 bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
                value={tenureMonths}
                readOnly={readOnly}
                onChange={(e) => handleTenureInputChange(e.target.value)}
                onBlur={handleTenureInputBlur}
              />
            </div>
          </div>

          {/* Rate of Interest */}
          <div>
            <label className="text-xs text-muted-foreground">
              Rate of Interest (% p.a.)
            </label>
            <input
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              value={interestRate}
              readOnly={readOnly}
              onChange={(e) => {
                const val = e.target.value;
                setInterestRate(val);
              }}
              onBlur={() => {
                if (interestRate === "") return;
                const num = parseFloat(interestRate);
                if (Number.isNaN(num)) {
                  setInterestRate("");
                  return;
                }
                const normalized = num.toFixed(2);
                setInterestRate(normalized);
                onBankUpdate &&
                  onBankUpdate({ interestRate: Number(normalized) });
              }}
            />
          </div>

          {/* Processing Fee */}
          <div>
            <label className="text-xs text-muted-foreground">
              Processing Fee
            </label>
            <input
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              value={processingFee}
              readOnly={readOnly}
              onChange={(e) => {
                const val = e.target.value;
                setProcessingFee(val);
                onBankUpdate && onBankUpdate({ processingFee: val });
              }}
            />
          </div>

          {/* EMI */}
          <div>
            <label className="text-xs text-muted-foreground">Monthly EMI</label>
            <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
              <span className="font-semibold">
                ₹ {emi ? emi.toLocaleString("en-IN") : "-"}
              </span>
            </div>
          </div>

          {/* CIBIL Score */}
          <div>
            <label className="text-xs text-muted-foreground">CIBIL Score</label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-24 bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
                    value={cibilScore}
                    readOnly={readOnly}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setCibilScore("");
                        return;
                      }
                      const num = parseInt(val, 10);
                      if (Number.isNaN(num)) return;
                      setCibilScore(num);
                    }}
                    onBlur={() => {
                      if (cibilScore === "") return;
                      setCibilScore(
                        clamp(parseInt(cibilScore, 10) || 0, 300, 900)
                      );
                    }}
                  />

                  <span className="text-xs text-muted-foreground">
                    Enter score (300–900)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Visual indicator updates as you change the score.
                </p>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24 md:w-28 md:h-28">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="#E4E4E7"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke={
                        cibilScore >= 750
                          ? "#16a34a"
                          : cibilScore >= 650
                          ? "#f59e0b"
                          : "#ef4444"
                      }
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${
                        (clamp(cibilScore, 300, 900) / 900) * 283
                      } 283`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={`text-xl md:text-2xl font-bold ${
                        cibilScore >= 750
                          ? "text-success"
                          : cibilScore >= 650
                          ? "text-warning"
                          : "text-error"
                      }`}
                    >
                      {cibilScore}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      out of 900
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DSA Code */}
          {loanBookedIn !== "Indirect Code" && (
            <div>
              <label className="text-xs text-muted-foreground">DSA Code</label>
              <input
                className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={dsaCode}
                readOnly={readOnly}
                onChange={(e) => {
                  const value = e.target.value;
                  setDsaCode(value);
                  form?.setFieldsValue({ dsaCode: value });
                  onBankUpdate && onBankUpdate({ dsaCode: value });
                }}
                placeholder="Enter DSA code"
              />
            </div>
          )}

          {/* Payout % */}
          <div>
            <label className="text-xs text-muted-foreground">Payout %</label>
            <input
              type="number"
              step="0.01"
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              value={payoutPercent}
              readOnly={readOnly}
              onChange={(e) => {
                const val = e.target.value;
                setPayoutPercent(val);
                onBankUpdate && onBankUpdate({ payoutPercent: val });
              }}
              placeholder="Enter payout percentage"
            />
          </div>
        </div>
      )}

      {/* Popup for breakup */}
      {showBreakup && (
        <LoanBreakupPopup
          netLoanApproved={netLoanApproved}
          creditAssuredFinance={creditAssuredFinance}
          insuranceFinance={insuranceFinance}
          extendedWarrantyFinance={extendedWarrantyFinance}
          setNetLoanApproved={setNetLoanApproved}
          setCreditAssuredFinance={setCreditAssuredFinance}
          setInsuranceFinance={setInsuranceFinance}
          setExtendedWarrantyFinance={setExtendedWarrantyFinance}
          readOnly={breakupReadOnly}
          onClose={() => setShowBreakup(false)}
          onBankUpdate={onBankUpdate} // NEW
        />
      )}

      <Modal
        title="Status Timeline"
        open={showHistoryTimeline}
        onCancel={() => setShowHistoryTimeline(false)}
        footer={null}
        width={560}
      >
        {(bank.statusHistory || []).length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No status history available
          </div>
        ) : (
          <Timeline
            items={[...(bank.statusHistory || [])]
              .reverse()
              .map((entry) => ({
                // Use status-specific date fallbacks for legacy rows.
                // Some historical entries have note/status but no changedAt.
                ts:
                  entry.changedAt ||
                  entry.timestamp ||
                  ((entry.status || "").toLowerCase() === "approved"
                    ? bank.approvalDate
                    : null) ||
                  ((entry.status || "").toLowerCase() === "disbursed"
                    ? bank.disbursalDate || bank.approvalDate
                    : null),
                children: (
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {entry.status || "Status Updated"}
                    </div>
                    {entry.note ? (
                      <div className="text-xs text-muted-foreground">
                        {entry.note}
                      </div>
                    ) : null}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {(entry.changedAt ||
                        entry.timestamp ||
                        ((entry.status || "").toLowerCase() === "approved"
                          ? bank.approvalDate
                          : null) ||
                        ((entry.status || "").toLowerCase() === "disbursed"
                          ? bank.disbursalDate || bank.approvalDate
                          : null))
                        ? new Date(
                            entry.changedAt ||
                              entry.timestamp ||
                              ((entry.status || "").toLowerCase() === "approved"
                                ? bank.approvalDate
                                : null) ||
                              ((entry.status || "").toLowerCase() === "disbursed"
                                ? bank.disbursalDate || bank.approvalDate
                                : null),
                          ).toLocaleString("en-IN")
                        : "NA"}
                    </div>
                  </div>
                ),
              }))}
          />
        )}
      </Modal>
    </div>
  );
};

const LoanBreakupPopup = ({
  netLoanApproved,
  creditAssuredFinance,
  insuranceFinance,
  extendedWarrantyFinance,
  setNetLoanApproved,
  setCreditAssuredFinance,
  setInsuranceFinance,
  setExtendedWarrantyFinance,
  readOnly,
  onClose,
  onBankUpdate, // NEW
}) => {
  const recomputeTotal = (n, c, i, e) =>
    parseInr(n) + parseInr(c) + parseInr(i) + parseInr(e);

  const toNum = (v) => (v === "" || v == null ? 0 : Number(v));

  const handleChangeAndUpdate = (field, value) => {
    if (readOnly) return;

    if (field === "netLoanApproved") {
      const nextNet = toNum(value);
      const total = recomputeTotal(
        nextNet,
        creditAssuredFinance,
        insuranceFinance,
        extendedWarrantyFinance
      );
      setNetLoanApproved(nextNet);
      onBankUpdate &&
        onBankUpdate({
          loanAmount: total,
          breakupNetLoanApproved: nextNet,
          breakupCreditAssured: creditAssuredFinance,
          breakupInsuranceFinance: insuranceFinance,
          breakupEwFinance: extendedWarrantyFinance,
        });
    }
    if (field === "creditAssuredFinance") {
      const nextCredit = toNum(value);
      const total = recomputeTotal(
        netLoanApproved,
        nextCredit,
        insuranceFinance,
        extendedWarrantyFinance
      );
      setCreditAssuredFinance(nextCredit);
      onBankUpdate &&
        onBankUpdate({
          loanAmount: total,
          breakupNetLoanApproved: netLoanApproved,
          breakupCreditAssured: nextCredit,
          breakupInsuranceFinance: insuranceFinance,
          breakupEwFinance: extendedWarrantyFinance,
        });
    }
    if (field === "insuranceFinance") {
      const nextIns = toNum(value);
      const total = recomputeTotal(
        netLoanApproved,
        creditAssuredFinance,
        nextIns,
        extendedWarrantyFinance
      );
      setInsuranceFinance(nextIns);
      onBankUpdate &&
        onBankUpdate({
          loanAmount: total,
          breakupNetLoanApproved: netLoanApproved,
          breakupCreditAssured: creditAssuredFinance,
          breakupInsuranceFinance: nextIns,
          breakupEwFinance: extendedWarrantyFinance,
        });
    }
    if (field === "extendedWarrantyFinance") {
      const nextEw = toNum(value);
      const total = recomputeTotal(
        netLoanApproved,
        creditAssuredFinance,
        insuranceFinance,
        nextEw
      );
      setExtendedWarrantyFinance(nextEw);
      onBankUpdate &&
        onBankUpdate({
          loanAmount: total,
          breakupNetLoanApproved: netLoanApproved,
          breakupCreditAssured: creditAssuredFinance,
          breakupInsuranceFinance: insuranceFinance,
          breakupEwFinance: nextEw,
        });
    }
  };

  const total = recomputeTotal(
    netLoanApproved,
    creditAssuredFinance,
    insuranceFinance,
    extendedWarrantyFinance
  );

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="IndianRupee" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Loan Amount Breakdown
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Net Loan Amount Approved
            </label>
            <input
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground text-right"
              value={readOnly ? formatInr(netLoanApproved) : netLoanApproved}
              readOnly={readOnly}
              onChange={(e) => {
                // Remove commas for input
                const raw = e.target.value.replace(/,/g, "");
                handleChangeAndUpdate("netLoanApproved", raw);
              }}
              placeholder="Enter amount"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Credit Assured Finance
            </label>
            <input
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground text-right"
              value={readOnly ? formatInr(creditAssuredFinance) : creditAssuredFinance}
              readOnly={readOnly}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                handleChangeAndUpdate("creditAssuredFinance", raw);
              }}
              placeholder="Enter amount"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Insurance Finance
            </label>
            <input
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground text-right"
              value={readOnly ? formatInr(insuranceFinance) : insuranceFinance}
              readOnly={readOnly}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                handleChangeAndUpdate("insuranceFinance", raw);
              }}
              placeholder="Enter amount"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Extended Warranty Finance
            </label>
            <input
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground text-right"
              value={readOnly ? formatInr(extendedWarrantyFinance) : extendedWarrantyFinance}
              readOnly={readOnly}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                handleChangeAndUpdate("extendedWarrantyFinance", raw);
              }}
              placeholder="Enter amount"
              inputMode="numeric"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
            <span className="text-xs text-muted-foreground">
              Total Loan Amount
            </span>
            <span className="text-sm font-semibold">
              ₹ {formatInr(total)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BankStatusCard;
