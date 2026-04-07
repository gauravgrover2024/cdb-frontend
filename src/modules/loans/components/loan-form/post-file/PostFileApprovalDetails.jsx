import React, { useMemo, useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { AutoComplete, DatePicker, Form, InputNumber, Radio, Select } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import { formatINR } from "../../../../../utils/currency";
import { loansApi } from "../../../../../api/loans";
import dayjs from "dayjs";
import { lenderHypothecationOptions } from "../../../../../constants/lenderHypothecationOptions";
import {
  DEFAULT_LOAN_BREAKUP_FIELDS,
  DEFAULT_LOAN_BREAKUP_FIELD_KEYS,
  buildLoanBreakupFieldDefinitions,
  normalizeLoanBreakupCustomFields,
  sumLoanBreakupCustomFields,
  toLoanBreakupNumber,
} from "../shared/loanBreakupFields";

const calculateEmi = (principal, annualRate, tenureMonths, type = "Reducing") => {
  const P = Number(String(principal).replace(/[^0-9.]/g, "")) || 0;
  const N = Number(tenureMonths) || 0;
  
  if (!P || !N) return 0;

  if (type === "Flat") {
    // Flat Rate Formula
    const yearlyRate = (Number(annualRate) || 0) / 100;
    const years = N / 12;
    const totalInterest = P * yearlyRate * years;
    const totalAmount = P + totalInterest;
    return Math.round(totalAmount / N);
  }

  const R = (Number(annualRate) || 0) / 12 / 100;
  if (!R) return Math.round(P / N);

  const pow = Math.pow(1 + R, N);
  return Math.round((P * R * pow) / (pow - 1));
};

const controlClass =
  "w-full rounded-lg border border-border/90 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15";
const asDayjs = (value) => {
  if (!value) return null;
  const d = dayjs.isDayjs(value) ? value : dayjs(value);
  return d.isValid() ? d : null;
};

const PostFileApprovalDetails = ({ form }) => {
  const [showBreakupPopup, setShowBreakupPopup] = useState(false);
  const [showDisbursalPopup, setShowDisbursalPopup] = useState(false);
  const [breakupFieldDefs, setBreakupFieldDefs] = useState(DEFAULT_LOAN_BREAKUP_FIELDS);

  useEffect(() => {
    let mounted = true;
    const loadBreakupFields = async () => {
      try {
        const response = await loansApi.getBreakupFields();
        const payload = response?.data ?? response;
        const defs = buildLoanBreakupFieldDefinitions(payload?.data || payload || []);
        if (mounted && defs.length) {
          setBreakupFieldDefs(defs);
        }
      } catch (_) {
        if (mounted) {
          setBreakupFieldDefs(DEFAULT_LOAN_BREAKUP_FIELDS);
        }
      }
    };
    loadBreakupFields();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateBreakupField = useCallback(async (label) => {
    const cleaned = String(label || "").trim();
    if (!cleaned) return null;
    const response = await loansApi.createBreakupField({ label: cleaned });
    const payload = response?.data ?? response;
    const created = payload?.data || null;
    setBreakupFieldDefs((prev) =>
      buildLoanBreakupFieldDefinitions([...(prev || []), ...(created ? [created] : [])]),
    );
    return created;
  }, []);

  const handleDeleteBreakupField = useCallback(
    async (fieldKey) => {
      const safeKey = String(fieldKey || "").trim();
      if (!safeKey) return false;
      await loansApi.deleteBreakupField(safeKey);
      setBreakupFieldDefs((prev) =>
        buildLoanBreakupFieldDefinitions(
          (prev || []).filter((field) => String(field?.key || "").trim() !== safeKey),
        ),
      );

      const stripDeleted = (rows = []) =>
        (Array.isArray(rows) ? rows : []).filter(
          (row) => String(row?.key || "").trim() !== safeKey,
        );

      form.setFieldsValue({
        approval_breakup_custom: stripDeleted(form.getFieldValue("approval_breakup_custom")),
        postfile_disbursed_custom: stripDeleted(form.getFieldValue("postfile_disbursed_custom")),
      });
      return true;
    },
    [form],
  );
  
  // Watch checkbox state from form to ensure persistence
  const isSameAsApproved = Form.useWatch("postfile_sameAsApproved", form);

  // -----------------------------
  // WATCH APPROVAL VALUES (SOURCE)
  // -----------------------------
  const approvalBankName = Form.useWatch("approval_bankName", form);
  const approvalLoanDisbursed = Form.useWatch(
    "approval_loanAmountDisbursed",
    form
  );
  const approvalLoanApproved = Form.useWatch(
    "approval_loanAmountApproved",
    form
  );
  const approvalRoi = Form.useWatch("approval_roi", form);
  const approvalTenureMonths = Form.useWatch("approval_tenureMonths", form);
  const approvalProcessingFees = Form.useWatch("approval_processingFees", form);
  const approvalDisbursedDate = Form.useWatch("approval_disbursedDate", form);
  const approvalStatus = Form.useWatch("approval_status", form);



  // -----------------------------
  // WATCH POSTFILE VALUES (TARGET)
  // -----------------------------
  const postfileRoi = Form.useWatch("postfile_roi", form);
  const postfileRoiType = Form.useWatch("postfile_roiType", form);
  const postfileEmiMode = Form.useWatch("postfile_emiMode", form);
  const postfileTenure = Form.useWatch("postfile_tenureMonths", form);
  const postfileEmiPlan = Form.useWatch("postfile_emiPlan", form);
  const postfileLoanAmountApproved = Form.useWatch("postfile_loanAmountApproved", form);
  const postfileFirstEmiDate = Form.useWatch("postfile_firstEmiDate", form);

  // lock sync after vehicle verification (you will set this later)
  const postfileLocked = Form.useWatch("__postfileLocked", form);

  // -----------------------------
  // WATCH DISBURSAL BREAKUP VALUES
  // -----------------------------
  const disbursedLoan = Number(
    Form.useWatch("postfile_disbursedLoan", form) || 0
  );
  const disbursedCredit = Number(
    Form.useWatch("postfile_disbursedCreditAssured", form) || 0
  );
  const disbursedInsurance = Number(
    Form.useWatch("postfile_disbursedInsurance", form) || 0
  );
  const disbursedEw = Number(Form.useWatch("postfile_disbursedEw", form) || 0);
  const watchedApprovalCustomBreakupRaw = Form.useWatch("approval_breakup_custom", form);
  const watchedDisbursedCustomBreakupRaw = Form.useWatch("postfile_disbursed_custom", form);
  const watchedApprovalCustomBreakup = useMemo(
    () =>
      Array.isArray(watchedApprovalCustomBreakupRaw)
        ? watchedApprovalCustomBreakupRaw
        : [],
    [watchedApprovalCustomBreakupRaw],
  );
  const watchedDisbursedCustomBreakup = useMemo(
    () =>
      Array.isArray(watchedDisbursedCustomBreakupRaw)
        ? watchedDisbursedCustomBreakupRaw
        : [],
    [watchedDisbursedCustomBreakupRaw],
  );
  const approvalCustomBreakup = useMemo(
    () => normalizeLoanBreakupCustomFields(watchedApprovalCustomBreakup, breakupFieldDefs),
    [watchedApprovalCustomBreakup, breakupFieldDefs],
  );
  const disbursedCustomBreakup = useMemo(
    () => normalizeLoanBreakupCustomFields(watchedDisbursedCustomBreakup, breakupFieldDefs),
    [watchedDisbursedCustomBreakup, breakupFieldDefs],
  );
  const approvalCustomTotal = useMemo(
    () => sumLoanBreakupCustomFields(approvalCustomBreakup),
    [approvalCustomBreakup],
  );
  const disbursedCustomTotal = useMemo(
    () => sumLoanBreakupCustomFields(disbursedCustomBreakup),
    [disbursedCustomBreakup],
  );

  const disbursalTotal =
    disbursedLoan + disbursedCredit + disbursedInsurance + disbursedEw + disbursedCustomTotal;

  const toNumSafe = (val) => Number(String(val ?? "").replace(/[^0-9.-]/g, "")) || 0;
  const approvalBreakup = useMemo(() => {
    const rawNet = toNumSafe(form.getFieldValue("approval_breakup_netLoanApproved"));
    const credit = toNumSafe(form.getFieldValue("approval_breakup_creditAssured"));
    const insurance = toNumSafe(form.getFieldValue("approval_breakup_insuranceFinance"));
    const ew = toNumSafe(form.getFieldValue("approval_breakup_ewFinance"));
    const addOns = credit + insurance + ew + approvalCustomTotal;
    const approvedBase = Math.max(
      toNumSafe(approvalLoanApproved),
      toNumSafe(approvalLoanDisbursed),
      0
    );
    const net = rawNet > 0 ? rawNet : approvedBase;
    return { net, credit, insurance, ew, custom: approvalCustomBreakup, addOns, total: net + addOns };
  }, [form, approvalLoanApproved, approvalLoanDisbursed, approvalCustomBreakup, approvalCustomTotal]);
  const approvalBreakupTotal = approvalBreakup.total;

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    if (dayjs.isDayjs(dateStr)) return dateStr.format("YYYY-MM-DD");
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };
  const approvalDateValue =
    form.getFieldValue("postfile_approvalDate") ||
    form.getFieldValue("approval_approvalDate") ||
    form.getFieldValue("approval_disbursedDate");

  const hasFieldChanged = useCallback((field, nextValue) => {
    const currentValue = form.getFieldValue(field);
    if (nextValue === undefined && currentValue === undefined) return false;
    if (nextValue === null && currentValue === null) return false;
    return String(currentValue ?? "") !== String(nextValue ?? "");
  }, [form]);

  const setFieldsIfChanged = useCallback((patch = {}) => {
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([field, value]) =>
        hasFieldChanged(field, value),
      ),
    );
    if (!Object.keys(filtered).length) return;
    form.setFieldsValue(filtered);
  }, [form, hasFieldChanged]);

  /**
   * ✅ MAIN FIX:
   * Keep syncing approval -> postfile AFTER disbursement
   * until postfile is locked (vehicle verification complete).
   */
  useEffect(() => {
    const isApprovedOrDisbursed = ["approved", "disbursed"].includes(
      (approvalStatus || "").toLowerCase()
    );

    if (!isApprovedOrDisbursed) return;
    if (postfileLocked) return;

    const hasApprovalData =
      approvalBankName ||
      approvalLoanApproved ||
      approvalRoi ||
      approvalTenureMonths ||
      approvalProcessingFees;

    if (!hasApprovalData) return;

    const patch = {
      postfile_bankName: approvalBankName || "",
      postfile_approvalDate: formatDateForInput(
        form.getFieldValue("approval_approvalDate")
      ),
      postfile_loanAmountApproved:
        (approvalBreakupTotal > 0 ? approvalBreakupTotal : toNumSafe(approvalLoanApproved)) ??
        form.getFieldValue("postfile_loanAmountApproved") ??
        "",
      postfile_loanAmountDisbursed:
        (toNumSafe(approvalLoanDisbursed) || approvalBreakupTotal) ??
        form.getFieldValue("postfile_loanAmountDisbursed") ??
        "",
      postfile_roi: approvalRoi ?? form.getFieldValue("postfile_roi") ?? "",
      postfile_tenureMonths:
        approvalTenureMonths ?? form.getFieldValue("postfile_tenureMonths") ?? "",
      postfile_processingFees:
        approvalProcessingFees ?? form.getFieldValue("postfile_processingFees") ?? "",
      postfile_emiPlan: postfileEmiPlan || form.getFieldValue("postfile_emiPlan") || "",
      __postfileSeeded: true, // keep for backward compatibility
    };

    setFieldsIfChanged(patch);
  }, [
    approvalStatus,
    postfileLocked,
    approvalBankName,
    approvalLoanApproved,
    approvalLoanDisbursed,
    approvalRoi,
    approvalTenureMonths,
    approvalProcessingFees,
    approvalBreakupTotal,
    postfileEmiPlan,
    form,
    setFieldsIfChanged,
  ]);

  // Auto-fill disbursal from approved if checkbox is checked and calculate EMI
  // Auto-fill disbursal from approved if checkbox is checked and calculate EMI
  useEffect(() => {
    if (isSameAsApproved !== "Yes") return;

    // Helper to safely parse numbers (handles strings with commas)
    const toNum = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const str = String(val).replace(/[^0-9.-]+/g, "");
      return Number(str) || 0;
    };

    // Get derived approved breakup values
    const appNet = toNum(approvalBreakup.net);
    const appCredit = toNum(approvalBreakup.credit);
    const appInsurance = toNum(approvalBreakup.insurance);
    const appEw = toNum(approvalBreakup.ew);
    const appCustom = normalizeLoanBreakupCustomFields(
      approvalBreakup.custom || [],
      breakupFieldDefs,
    );
    const appCustomTotal = sumLoanBreakupCustomFields(appCustom);
    const breakupTotal = appNet + appCredit + appInsurance + appEw + appCustomTotal;
    const approvedTotal = toNum(approvalLoanApproved);

    let patch = {};

    // Logic: If breakup sums to something significant, use it. 
    // Otherwise fallback to the total approved amount.
    // Use a small epsilon for float comparison safety, though simple > 0 is likely fine.
    if (breakupTotal > 0) {
      patch = {
        postfile_disbursedLoan: appNet,
        postfile_disbursedCreditAssured: appCredit,
        postfile_disbursedInsurance: appInsurance,
        postfile_disbursedEw: appEw,
        postfile_disbursed_custom: appCustom,
      };
    } else {
      patch = {
        postfile_disbursedLoan: approvedTotal,
        postfile_disbursedCreditAssured: 0,
        postfile_disbursedInsurance: 0,
        postfile_disbursedEw: 0,
        postfile_disbursed_custom: appCustom.map((row) => ({ ...row, value: 0 })),
      };
    }

    setFieldsIfChanged(patch);

    const totalDisbursed =
      toNum(patch.postfile_disbursedLoan) +
      toNum(patch.postfile_disbursedCreditAssured) +
      toNum(patch.postfile_disbursedInsurance) +
      toNum(patch.postfile_disbursedEw) +
      sumLoanBreakupCustomFields(patch.postfile_disbursed_custom || []);

    const calculatedEmi = calculateEmi(
      totalDisbursed,
      postfileRoi || 0,
      postfileTenure || 0,
      postfileRoiType
    );

    setFieldsIfChanged({
      postfile_emiAmount: calculatedEmi,
      postfile_disbursedLoanTotal: totalDisbursed,
      postfile_loanAmountDisbursed: totalDisbursed, // Keep main DB field in sync
    });
  }, [
    isSameAsApproved,
    approvalLoanApproved,
    approvalBreakup,
    postfileRoi,
    postfileTenure,
    postfileRoiType,
    breakupFieldDefs,
    form,
    setFieldsIfChanged,
  ]);

  // Auto-calculate Loan Maturity Date = Date of 1st EMI + (Tenure - 1) months
  useEffect(() => {
    const tenure = Number(postfileTenure || approvalTenureMonths || 0);
    if (!postfileFirstEmiDate || !tenure) return;

    const firstEmi = dayjs.isDayjs(postfileFirstEmiDate)
      ? postfileFirstEmiDate
      : dayjs(postfileFirstEmiDate);
    if (!firstEmi.isValid()) return;

    const maturity = firstEmi
      .add(Math.max(tenure - 1, 0), "month")
      .format("YYYY-MM-DD");
    if (form.getFieldValue("postfile_maturityDate") !== maturity) {
      form.setFieldsValue({ postfile_maturityDate: maturity });
    }
  }, [postfileFirstEmiDate, postfileTenure, approvalTenureMonths, form]);

  const netLoanForDisbursal =
    disbursedLoan + disbursedCredit + disbursedInsurance + disbursedEw + disbursedCustomTotal;

  const displayedApprovedAmount = Number(
    (approvalBreakupTotal > 0
      ? approvalBreakupTotal
      : postfileLoanAmountApproved || approvalLoanApproved) || 0
  );

  const derivedMaturityDate = useMemo(() => {
    const tenure = Number(postfileTenure || approvalTenureMonths || 0);
    if (!postfileFirstEmiDate || !tenure) return "";
    const firstEmi = dayjs.isDayjs(postfileFirstEmiDate)
      ? postfileFirstEmiDate
      : dayjs(postfileFirstEmiDate);
    if (!firstEmi.isValid()) return "";
    return firstEmi
      .add(Math.max(tenure - 1, 0), "month")
      .format("YYYY-MM-DD");
  }, [postfileFirstEmiDate, postfileTenure, approvalTenureMonths]);

  const maturityValue = form.getFieldValue("postfile_maturityDate") || derivedMaturityDate;
  const parsedMaturity = maturityValue
    ? (dayjs.isDayjs(maturityValue) ? maturityValue : dayjs(maturityValue))
    : null;
  const hasValidMaturity = parsedMaturity?.isValid?.() || false;
  const today = dayjs().startOf("day");
  const isActiveByMaturity = hasValidMaturity
    ? parsedMaturity.isAfter(today, "day")
    : false;
  const showMaturityPill = hasValidMaturity;
  const maturityPill = isActiveByMaturity
    ? {
        label: "Active",
        className:
          "bg-emerald-600 text-white border border-emerald-700 shadow-sm dark:bg-emerald-500 dark:text-white dark:border-emerald-300/60",
      }
    : {
        label: "Closed",
        className:
          "bg-rose-600 text-white border border-rose-700 shadow-sm dark:bg-rose-500 dark:text-white dark:border-rose-300/60",
      };

  const emiAmount = useMemo(
    () =>
      calculateEmi(netLoanForDisbursal, postfileRoi || 0, postfileTenure || 0, postfileRoiType),
    [netLoanForDisbursal, postfileRoi, postfileTenure, postfileRoiType]
  );

  return (
    <div className="bg-card rounded-xl border border-border p-5 md:p-6 h-full flex flex-col">
      {/* header */}
      <div className="section-header flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Stamp" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Approval Details
            </h2>
            <p className="text-sm text-muted-foreground">
              Disbursement verification and approval
            </p>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 text-sm">
        {approvalDisbursedDate && (
          <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-medium text-muted-foreground">Disbursal Date</p>
            <p className="text-sm font-semibold text-foreground">
              {new Date(approvalDisbursedDate).toLocaleDateString("en-IN")}
            </p>
          </div>
        )}
        {/* Basic approval info */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2">
            <Icon name="FileText" size={16} className="text-primary" />
            Core Approval Info
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Date of Approval"
              className="mb-0"
            >
              <DatePicker
                value={asDayjs(approvalDateValue)}
                onChange={(date) =>
                  form.setFieldsValue({
                    postfile_approvalDate: date ? date.format("YYYY-MM-DD") : "",
                  })
                }
                format="DD MMM YYYY"
                className="w-full [&_.ant-picker-input>input]:text-sm"
                size="middle"
                allowClear={false}
              />
            </Form.Item>

            <Form.Item
              label="Bank Name"
              name="postfile_bankName"
              className="mb-0"
            >
              <AutoComplete
                options={lenderHypothecationOptions}
                className="w-full"
                filterOption={(inputValue, option) =>
                  String(option?.value || "")
                    .toUpperCase()
                    .includes(String(inputValue || "").toUpperCase())
                }
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Loan Amount Approved"
              name="postfile_loanAmountApproved"
              className="mb-0"
            >
              <div
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/30 cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => setShowBreakupPopup(true)}
              >
                <span className="font-semibold text-primary">
                  {formatINR(displayedApprovedAmount)}
                </span>
                <Icon name="Info" size={14} className="text-primary" />
              </div>
            </Form.Item>

            <Form.Item
              label="Net Loan Amount for Disbursal"
              name="postfile_disbursedLoanTotal"
              className="mb-0"
              tooltip={isSameAsApproved === "Yes" ? "Set to 'No' to edit this amount" : "Click to edit breakdown"}
            >
              <div className="space-y-1.5">
                <div
                  className={`w-full border border-border rounded-md px-3 py-2 text-sm flex items-center justify-between transition-all ${
                    isSameAsApproved === "Yes"
                      ? "bg-muted/50 cursor-not-allowed opacity-80"
                      : "bg-muted/30 cursor-pointer hover:bg-muted/50"
                  }`}
                  onClick={() => isSameAsApproved !== "Yes" && setShowDisbursalPopup(true)}
                >
                  <span className={`font-semibold ${isSameAsApproved === "Yes" ? "text-muted-foreground" : "text-primary"}`}>
                    {formatINR(disbursalTotal)}
                  </span>
                  {isSameAsApproved !== "Yes" && <Icon name="PenSquare" size={14} className="text-primary" />}
                  {isSameAsApproved === "Yes" && <Icon name="Lock" size={14} className="text-muted-foreground" />}
                </div>
                {isSameAsApproved === "Yes" && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-100/60 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
                    <Icon name="Lock" size={10} />
                    Locked to approved breakup. Select "No" to edit.
                  </div>
                )}
              </div>
            </Form.Item>
          </div>

          {/* Checkbox: Same as Approved */}
            {/* Is Disbursement Same as Approved Check - Radio Option */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground block mb-3">
                Is disbursement amount same as approved amount?
              </span>
              <Form.Item name="postfile_sameAsApproved" className="mb-0">
                <Radio.Group 
                  optionType="button" 
                  buttonStyle="solid"
                  className="w-full grid grid-cols-2 gap-4"
                >
                  <Radio.Button 
                    value="Yes" 
                    className="text-center font-bold h-10 flex items-center justify-center !rounded-lg"
                  >
                    Yes
                  </Radio.Button>
                  <Radio.Button 
                    value="No" 
                    className="text-center font-bold h-10 flex items-center justify-center !rounded-lg"
                  >
                    No
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>
            </div>
        </div>

        {/* Loan breakup + finance components */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2">
            <Icon name="Calculator" size={16} className="text-primary" />
            Loan Components
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Processing Fees"
              name="postfile_processingFees"
              className="mb-0"
            >
              <InputNumber
                className="w-full"
                size="middle"
                min={0}
                placeholder="0"
                formatter={(value) =>
                  value === undefined || value === null || value === ""
                    ? ""
                    : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => (value ? value.replace(/,/g, "") : "")}
              />
            </Form.Item>
          </div>
        </div>

        {/* Rate & EMI information */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2">
            <Icon name="Percent" size={16} className="text-primary" />
            Rate & EMI
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Rate of Interest Type"
              name="postfile_roiType"
              className="mb-0"
            >
              <Select
                className="h-10 rounded-xl"
                placeholder="Select ROI type"
                optionFilterProp="label"
                showSearch
                allowClear
              >
                <Select.Option value="Reducing" label="Reducing">Reducing</Select.Option>
                <Select.Option value="Fixed" label="Fixed">Fixed</Select.Option>
                <Select.Option value="Floating" label="Floating">Floating</Select.Option>
                <Select.Option value="Flat" label="Flat Rate">Flat Rate</Select.Option>
                {postfileRoiType &&
                  !["Reducing", "Fixed", "Floating", "Flat"].includes(postfileRoiType) && (
                    <Select.Option value={postfileRoiType} label={postfileRoiType}>
                      {postfileRoiType}
                    </Select.Option>
                  )}
              </Select>
            </Form.Item>

            <Form.Item
              label="Rate of Interest (%)"
              name="postfile_roi"
              className="mb-0"
            >
              <input
                type="number"
                step="0.01"
                className={controlClass}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="EMI Mode"
              name="postfile_emiMode"
              className="mb-0"
            >
              <Select
                className="h-10 rounded-xl"
                placeholder="Select EMI mode"
                allowClear
              >
                <Select.Option value="Arrear">Arrear</Select.Option>
                <Select.Option value="Advance">Advance</Select.Option>
                {postfileEmiMode &&
                  !["Arrear", "Advance"].includes(postfileEmiMode) && (
                    <Select.Option value={postfileEmiMode}>
                      {postfileEmiMode}
                    </Select.Option>
                  )}
              </Select>
            </Form.Item>

            <Form.Item
              label="EMI Plan"
              name="postfile_emiPlan"
              className="mb-0"
            >
              <Select
                className="h-10 rounded-xl"
                placeholder="Select EMI plan"
                allowClear
              >
                <Select.Option value="Normal">Normal</Select.Option>
                <Select.Option value="1+1">1+1</Select.Option>
                {postfileEmiPlan &&
                  !["Normal", "1+1"].includes(postfileEmiPlan) && (
                    <Select.Option value={postfileEmiPlan}>
                      {postfileEmiPlan}
                    </Select.Option>
                  )}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Tenure (Months)"
              name="postfile_tenureMonths"
              className="mb-0"
            >
              <input
                type="number"
                className={controlClass}
              />
            </Form.Item>

            <Form.Item
              label="Date of 1st EMI"
              className="mb-0"
            >
              <DatePicker
                value={asDayjs(form.getFieldValue("postfile_firstEmiDate"))}
                onChange={(date) =>
                  form.setFieldsValue({
                    postfile_firstEmiDate: date ? date.format("YYYY-MM-DD") : "",
                  })
                }
                format="DD MMM YYYY"
                className="w-full [&_.ant-picker-input>input]:text-sm"
                size="middle"
                allowClear
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Loan Maturity Date"
              className="mb-0"
            >
              <div className="relative">
                <DatePicker
                  value={asDayjs(form.getFieldValue("postfile_maturityDate") || derivedMaturityDate)}
                  format="DD MMM YYYY"
                  className="w-full [&_.ant-picker-input>input]:text-sm"
                  size="middle"
                  suffixIcon={null}
                  disabled
                  allowClear={false}
                />
                {showMaturityPill && (
                  <span
                    className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${maturityPill.className}`}
                  >
                    {maturityPill.label}
                  </span>
                )}
              </div>
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label={`EMI Amount ${
                emiAmount
                  ? `(Calculated: ${formatINR(emiAmount)})`
                  : ""
              }`}
              name="postfile_emiAmount"
              className="mb-0"
            >
              <InputNumber
                className="w-full"
                size="middle"
                min={0}
                placeholder={`Calculated: ${formatINR(emiAmount)}`}
                formatter={(value) =>
                  value === undefined || value === null || value === ""
                    ? ""
                    : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => (value ? value.replace(/,/g, "") : "")}
              />
            </Form.Item>
          </div>

          <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
            <p className="text-xs text-foreground">
              <strong className="text-primary">EMI Calculation:</strong> Net Loan Amount for Disbursal ({formatINR(netLoanForDisbursal)}) with Rate (
              {postfileRoi || 0}%) and Tenure ({postfileTenure || 0} months) = {formatINR(emiAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Hidden fields to ensure useWatch works and syncs correctly */}
      <Form.Item name="postfile_disbursedLoan" hidden><input /></Form.Item>
      <Form.Item name="postfile_disbursedCreditAssured" hidden><input /></Form.Item>
      <Form.Item name="postfile_disbursedInsurance" hidden><input /></Form.Item>
      <Form.Item name="postfile_disbursedEw" hidden><input /></Form.Item>
      <Form.Item name="postfile_disbursed_custom" hidden />

      {/* Render popups using Portal */}
      {showBreakupPopup &&
        ReactDOM.createPortal(
          <LoanBreakupPopup
            netLoanApproved={approvalBreakup.net}
            creditAssuredFinance={approvalBreakup.credit}
            insuranceFinance={approvalBreakup.insurance}
            extendedWarrantyFinance={approvalBreakup.ew}
            customBreakupFields={approvalCustomBreakup}
            onClose={() => setShowBreakupPopup(false)}
          />,
          document.body
        )}

      {showDisbursalPopup &&
        ReactDOM.createPortal(
          <DisbursalBreakupPopup
            form={form}
            breakupFieldDefinitions={breakupFieldDefs}
            onCreateBreakupField={handleCreateBreakupField}
            onDeleteBreakupField={handleDeleteBreakupField}
            onClose={() => setShowDisbursalPopup(false)}
          />,
          document.body
        )}
    </div>
  );
};

const LoanBreakupPopup = ({
  netLoanApproved,
  creditAssuredFinance,
  insuranceFinance,
  extendedWarrantyFinance,
  customBreakupFields = [],
  onClose,
}) => {
  const normalizedCustom = normalizeLoanBreakupCustomFields(customBreakupFields);
  const customTotal = sumLoanBreakupCustomFields(normalizedCustom);
  const total =
    Number(netLoanApproved || 0) +
    Number(creditAssuredFinance || 0) +
    Number(insuranceFinance || 0) +
    Number(extendedWarrantyFinance || 0) +
    customTotal;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-300/25 backdrop-blur-sm p-3">
      <div className="w-full max-w-lg overflow-hidden rounded-[18px] border border-border/70 bg-gradient-to-b from-white/95 via-slate-50/90 to-white/95 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.55)] font-sans dark:from-card dark:via-card dark:to-background">
        <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Icon name="IndianRupee" size={14} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Loan Breakup
              </p>
              <h3 className="text-sm font-semibold text-foreground">
                Approved Amount Breakdown
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="space-y-2.5 px-4 py-3">
          <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Total Approved
            </p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">
              {formatINR(total)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Row label="Net Loan Amount Approved" value={netLoanApproved} />
            <Row label="Credit Assured Finance" value={creditAssuredFinance} />
            <Row label="Insurance Finance" value={insuranceFinance} />
            <Row
              label="Extended Warranty Finance"
              value={extendedWarrantyFinance}
            />
            {normalizedCustom.map((row) => (
              <Row key={row.key} label={row.label} value={row.value} />
            ))}
          </div>

          <div className="mt-1 flex items-center justify-between rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Total Loan Amount
            </span>
            <span className="text-base font-semibold text-primary">
              {formatINR(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-2">
    <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
    <div className="mt-1 w-full rounded-md border border-border bg-card py-1.5 px-2.5 text-right text-sm font-medium text-foreground">
      {formatINR(value)}
    </div>
  </div>
);

const DisbursalBreakupPopup = ({
  form,
  breakupFieldDefinitions = DEFAULT_LOAN_BREAKUP_FIELDS,
  onCreateBreakupField,
  onDeleteBreakupField,
  onClose,
}) => {
  const [net, setNet] = useState(
    form.getFieldValue("postfile_disbursedLoan") || ""
  );
  const [credit, setCredit] = useState(
    form.getFieldValue("postfile_disbursedCreditAssured") || ""
  );
  const [insurance, setInsurance] = useState(
    form.getFieldValue("postfile_disbursedInsurance") || ""
  );
  const [ew, setEw] = useState(
    form.getFieldValue("postfile_disbursedEw") || ""
  );
  const [customBreakupFields, setCustomBreakupFields] = useState(() =>
    normalizeLoanBreakupCustomFields(
      form.getFieldValue("postfile_disbursed_custom") || [],
      breakupFieldDefinitions,
    ),
  );
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [showAddFieldInput, setShowAddFieldInput] = useState(false);
  const [creatingField, setCreatingField] = useState(false);
  const [deletingFieldKey, setDeletingFieldKey] = useState("");
  const [activeInputKey, setActiveInputKey] = useState("");
  const [fieldError, setFieldError] = useState("");

  const toNum = (v) => toLoanBreakupNumber(v);
  const sanitizeAmountInput = (raw) =>
    String(raw ?? "").replace(/[^0-9.]/g, "");
  const formatAmountInput = (value) =>
    toNum(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const rawAmountInput = (value) => {
    const numeric = toNum(value);
    return numeric > 0 ? String(Math.round(numeric)) : "";
  };
  const normalizedCustom = useMemo(
    () => normalizeLoanBreakupCustomFields(customBreakupFields, breakupFieldDefinitions),
    [customBreakupFields, breakupFieldDefinitions],
  );
  const customMap = useMemo(
    () => new Map(normalizedCustom.map((row) => [row.key, row])),
    [normalizedCustom],
  );
  const customRows = useMemo(
    () =>
      (breakupFieldDefinitions || []).filter(
        (field) => !DEFAULT_LOAN_BREAKUP_FIELD_KEYS.has(String(field?.key || "")),
      ),
    [breakupFieldDefinitions],
  );
  const total =
    toNum(net) +
    toNum(credit) +
    toNum(insurance) +
    toNum(ew) +
    sumLoanBreakupCustomFields(normalizedCustom);

  const handleCustomFieldValueChange = (field, rawValue) => {
    const key = String(field?.key || "").trim();
    if (!key) return;
    const nextValue = toNum(rawValue);
    const nextCustom = normalizeLoanBreakupCustomFields(
      [
        ...normalizedCustom.filter((row) => row.key !== key),
        { key, label: field?.label || key, value: nextValue },
      ],
      breakupFieldDefinitions,
    );
    setCustomBreakupFields(nextCustom);
  };

  const handleAddNewField = async () => {
    const cleaned = String(newFieldLabel || "").trim();
    if (!cleaned || !onCreateBreakupField) {
      setFieldError("Enter a field name.");
      return;
    }
    setCreatingField(true);
    setFieldError("");
    try {
      const created = await onCreateBreakupField(cleaned);
      const key = String(created?.key || "").trim();
      if (key) {
        const nextCustom = normalizeLoanBreakupCustomFields(
          [...normalizedCustom, { key, label: created?.label || cleaned, value: 0 }],
          breakupFieldDefinitions,
        );
        setCustomBreakupFields(nextCustom);
      }
      setNewFieldLabel("");
      setShowAddFieldInput(false);
    } catch (error) {
      setFieldError(
        error?.message || "Unable to add this field right now. Please retry.",
      );
    } finally {
      setCreatingField(false);
    }
  };

  const handleDeleteCustomField = async (field) => {
    const key = String(field?.key || "").trim();
    if (!key || !onDeleteBreakupField) return;
    setDeletingFieldKey(key);
    setFieldError("");
    try {
      await onDeleteBreakupField(key);
      setCustomBreakupFields((prev) =>
        normalizeLoanBreakupCustomFields(
          (Array.isArray(prev) ? prev : []).filter(
            (row) => String(row?.key || "").trim() !== key,
          ),
          breakupFieldDefinitions,
        ),
      );
    } catch (error) {
      setFieldError(
        error?.message ||
          "This field cannot be deleted because data exists in one or more loan cases.",
      );
    } finally {
      setDeletingFieldKey("");
    }
  };

  const handleSave = () => {
    form.setFieldsValue({
      postfile_disbursedLoan: toNum(net),
      postfile_disbursedCreditAssured: toNum(credit),
      postfile_disbursedInsurance: toNum(insurance),
      postfile_disbursedEw: toNum(ew),
      postfile_disbursed_custom: normalizedCustom,
      postfile_disbursedLoanTotal: total,
      postfile_loanAmountDisbursed: total, // Sync total
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-300/25 backdrop-blur-sm p-3">
      <div className="w-full max-w-lg overflow-hidden rounded-[18px] border border-border/70 bg-gradient-to-b from-white/95 via-slate-50/90 to-white/95 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.55)] font-sans dark:from-card dark:via-card dark:to-background">
        <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Icon name="Calculator" size={14} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Loan Breakup
              </p>
              <h3 className="text-sm font-semibold text-foreground">
                Net Loan Disbursal Breakdown
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-2.5 px-4 py-3">
          <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Running Total
            </p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">
              {formatINR(total)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              {
                key: "disbursedLoan",
                label: "Loan Amount (Disbursed)",
                value: net,
                onChange: (raw) => setNet(toNum(raw)),
              },
              {
                key: "creditAssuredFinance",
                label: "Credit Assured Finance",
                value: credit,
                onChange: (raw) => setCredit(toNum(raw)),
              },
              {
                key: "insuranceFinance",
                label: "Insurance Finance",
                value: insurance,
                onChange: (raw) => setInsurance(toNum(raw)),
              },
              {
                key: "extendedWarrantyFinance",
                label: "Extended Warranty Finance",
                value: ew,
                onChange: (raw) => setEw(toNum(raw)),
              },
            ].map((field) => (
              <div
                key={field.key}
                className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-2"
              >
                <label className="text-[11px] font-medium text-muted-foreground">
                  {field.label}
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-card py-1.5 pl-6 pr-2.5 text-right text-sm font-medium text-foreground outline-none transition-colors focus:border-primary/55"
                    value={
                      activeInputKey === field.key
                        ? rawAmountInput(field.value)
                        : formatAmountInput(field.value)
                    }
                    onChange={(e) => field.onChange(sanitizeAmountInput(e.target.value))}
                    onFocus={() => setActiveInputKey(field.key)}
                    onBlur={() =>
                      setActiveInputKey((curr) => (curr === field.key ? "" : curr))
                    }
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {customRows.map((field) => {
            const value = customMap.get(field.key)?.value ?? 0;
            return (
              <div
                key={field.key}
                className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    {field.label}
                  </label>
                  {Boolean(field?.canDelete) ? (
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                      onClick={() => handleDeleteCustomField(field)}
                      disabled={deletingFieldKey === field.key}
                      title="Delete this custom field"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-card py-1.5 pl-6 pr-2.5 text-right text-sm font-medium text-foreground outline-none transition-colors focus:border-primary/55"
                    value={
                      activeInputKey === field.key
                        ? rawAmountInput(value)
                        : formatAmountInput(value)
                    }
                    onChange={(e) =>
                      handleCustomFieldValueChange(
                        field,
                        sanitizeAmountInput(e.target.value),
                      )
                    }
                    onFocus={() => setActiveInputKey(field.key)}
                    onBlur={() =>
                      setActiveInputKey((curr) =>
                        curr === field.key ? "" : curr,
                      )
                    }
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
              </div>
            );
          })}
          </div>

          <div className="space-y-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                Add New Component Field
              </span>
              {!showAddFieldInput && (
                <button
                  type="button"
                  className="rounded-md border border-primary/25 bg-card px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                  onClick={() => {
                    setShowAddFieldInput(true);
                    setFieldError("");
                  }}
                >
                  + Add Field
                </button>
              )}
            </div>
            {showAddFieldInput && (
              <div className="space-y-2">
                <input
                  className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/55"
                  placeholder="e.g. Accessory Finance"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                />
                {fieldError ? (
                  <p className="text-[11px] text-red-500">{fieldError}</p>
                ) : null}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddFieldInput(false);
                      setNewFieldLabel("");
                      setFieldError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddNewField} disabled={creatingField}>
                    {creatingField ? "Adding..." : "Save Field"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Total Loan Amount
            </span>
            <span className="text-base font-semibold text-primary">
              {formatINR(total)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/70 bg-background/70 px-4 py-2.5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PostFileApprovalDetails);
