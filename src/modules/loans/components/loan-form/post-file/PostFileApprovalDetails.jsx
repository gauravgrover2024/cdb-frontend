import React, { useMemo, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Form, Radio, Input } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import { formatINR } from "../../../../../utils/currency";

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

const PostFileApprovalDetails = ({ form }) => {
  const [showBreakupPopup, setShowBreakupPopup] = useState(false);
  const [showDisbursalPopup, setShowDisbursalPopup] = useState(false);
  
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
  const postfileTenure = Form.useWatch("postfile_tenureMonths", form);

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

  const disbursalTotal =
    disbursedLoan + disbursedCredit + disbursedInsurance + disbursedEw;

  const approvalBreakup = useMemo(() => ({
    net: form.getFieldValue("approval_breakup_netLoanApproved") || 0,
    credit: form.getFieldValue("approval_breakup_creditAssured") || 0,
    insurance: form.getFieldValue("approval_breakup_insuranceFinance") || 0,
    ew: form.getFieldValue("approval_breakup_ewFinance") || 0,
  }), [form]);

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
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
      postfile_loanAmountApproved: approvalLoanApproved || "",
      postfile_loanAmountDisbursed: approvalLoanDisbursed || "",
      postfile_roi: approvalRoi || "",
      postfile_tenureMonths: approvalTenureMonths || "",
      postfile_processingFees: approvalProcessingFees || "",
      __postfileSeeded: true, // keep for backward compatibility
    };

    form.setFieldsValue(patch);
  }, [
    approvalStatus,
    postfileLocked,
    approvalBankName,
    approvalLoanApproved,
    approvalLoanDisbursed,
    approvalRoi,
    approvalTenureMonths,
    approvalProcessingFees,
    form,
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

    // Get approval breakup values directly
    const appNet = toNum(form.getFieldValue("approval_breakup_netLoanApproved"));
    const appCredit = toNum(form.getFieldValue("approval_breakup_creditAssured"));
    const appInsurance = toNum(form.getFieldValue("approval_breakup_insuranceFinance"));
    const appEw = toNum(form.getFieldValue("approval_breakup_ewFinance"));

    const breakupTotal = appNet + appCredit + appInsurance + appEw;
    // Use approvalLoanApproved from useWatch (source of truth for the display that is working)
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
      };
    } else {
      patch = {
        postfile_disbursedLoan: approvedTotal,
        postfile_disbursedCreditAssured: 0,
        postfile_disbursedInsurance: 0,
        postfile_disbursedEw: 0,
      };
    }

    form.setFieldsValue(patch);

    const totalDisbursed =
      toNum(patch.postfile_disbursedLoan) +
      toNum(patch.postfile_disbursedCreditAssured) +
      toNum(patch.postfile_disbursedInsurance) +
      toNum(patch.postfile_disbursedEw);

    const calculatedEmi = calculateEmi(
      totalDisbursed,
      postfileRoi || 0,
      postfileTenure || 0,
      postfileRoiType
    );

    form.setFieldsValue({
      postfile_emiAmount: calculatedEmi,
      postfile_disbursedLoanTotal: totalDisbursed,
      postfile_loanAmountDisbursed: totalDisbursed, // Keep main DB field in sync
    });
  }, [isSameAsApproved, approvalLoanApproved, postfileRoi, postfileTenure, postfileRoiType, form]);

  const netLoanForDisbursal =
    disbursedLoan + disbursedCredit + disbursedInsurance + disbursedEw;

  const emiAmount = useMemo(
    () =>
      calculateEmi(netLoanForDisbursal, postfileRoi || 0, postfileTenure || 0, postfileRoiType),
    [netLoanForDisbursal, postfileRoi, postfileTenure, postfileRoiType]
  );

  return (
    <div className="bg-card rounded-xl border border-border p-5 md:p-6 h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between mb-5">
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
        {approvalDisbursedDate && (
          <div className="text-right bg-muted/30 px-3 py-2 rounded-lg border border-border">
            <p className="text-[11px] font-medium text-muted-foreground">Disbursed on</p>
            <p className="text-xs font-semibold text-foreground">
              {new Date(approvalDisbursedDate).toLocaleDateString("en-IN")}
            </p>
          </div>
        )}
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 text-sm">
        {/* Basic approval info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon name="FileText" size={16} className="text-primary" />
            Core Approval Info
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Date of Approval"
              name="postfile_approvalDate"
              className="mb-0"
            >
                <div className="relative">
                  <Icon
                    name="Calendar"
                    size={16}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="date"
                    className="w-full border border-border rounded-md pl-9 pr-2 py-1 text-sm bg-background text-foreground"
                  />
                </div>
            </Form.Item>

            <Form.Item
              label="Bank Name"
              name="postfile_bankName"
              className="mb-0"
            >
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
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
                <span className="font-semibold font-mono text-primary">
                  {formatINR(approvalLoanApproved)}
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
              <div
                className={`w-full border border-border rounded-md px-3 py-2 text-sm flex items-center justify-between transition-all ${
                  isSameAsApproved === "Yes"
                    ? "bg-muted/50 cursor-not-allowed opacity-80"
                    : "bg-muted/30 cursor-pointer hover:bg-muted/50"
                }`}
                onClick={() => isSameAsApproved !== "Yes" && setShowDisbursalPopup(true)}
              >
                <span className={`font-semibold font-mono ${isSameAsApproved === "Yes" ? "text-muted-foreground" : "text-primary"}`}>
                  {formatINR(disbursalTotal)}
                </span>
                {isSameAsApproved !== "Yes" && <Icon name="PenSquare" size={14} className="text-primary" />}
                {isSameAsApproved === "Yes" && <Icon name="Lock" size={14} className="text-muted-foreground" />}
              </div>
            </Form.Item>
          </div>

          {/* Checkbox: Same as Approved */}
            {/* Is Disbursement Same as Approved Check - Radio Option */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <span className="text-sm font-semibold text-foreground block mb-3">
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
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon name="Calculator" size={16} className="text-primary" />
            Loan Components
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Processing Fees"
              name="postfile_processingFees"
              className="mb-0"
            >
              <Input
                type="number"
                placeholder="0"
              />
            </Form.Item>
          </div>
        </div>

        {/* Rate & EMI information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon name="Percent" size={16} className="text-primary" />
            Rate & EMI
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Rate of Interest Type"
              name="postfile_roiType"
              className="mb-0"
            >
              <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                <option value="">Select</option>
                <option value="Fixed">Fixed</option>
                <option value="Floating">Floating</option>
                <option value="Flat">Flat Rate</option>
              </select>
            </Form.Item>

            <Form.Item
              label="Rate of Interest (%)"
              name="postfile_roi"
              className="mb-0"
            >
              <input
                type="number"
                step="0.01"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="EMI Mode"
              name="postfile_emiMode"
              className="mb-0"
            >
              <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                <option value="">Select</option>
                <option value="Arrear">Arrear</option>
                <option value="Advance">Advance</option>
              </select>
            </Form.Item>

            <Form.Item
              label="EMI Plan"
              name="postfile_emiPlan"
              className="mb-0"
            >
              <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                <option value="">Select</option>
                <option value="Normal">Normal</option>
                <option value="1+1">1+1</option>
              </select>
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
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item
              label="Date of 1st EMI"
              name="postfile_firstEmiDate"
              className="mb-0"
            >
                <div className="relative">
                  <Icon
                    name="Calendar"
                    size={16}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="date"
                    className="w-full border border-border rounded-md pl-9 pr-2 py-1 text-sm bg-background text-foreground"
                  />
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
              <input
                type="number"
                placeholder={`Calculated: ${formatINR(emiAmount)}`}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
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

      {/* Render popups using Portal */}
      {showBreakupPopup &&
        ReactDOM.createPortal(
          <LoanBreakupPopup
            netLoanApproved={approvalBreakup.net}
            creditAssuredFinance={approvalBreakup.credit}
            insuranceFinance={approvalBreakup.insurance}
            extendedWarrantyFinance={approvalBreakup.ew}
            onClose={() => setShowBreakupPopup(false)}
          />,
          document.body
        )}

      {showDisbursalPopup &&
        ReactDOM.createPortal(
          <DisbursalBreakupPopup
            form={form}
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
  onClose,
}) => {
  const total =
    Number(netLoanApproved || 0) +
    Number(creditAssuredFinance || 0) +
    Number(insuranceFinance || 0) +
    Number(extendedWarrantyFinance || 0);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="IndianRupee" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Loan Amount Breakdown (Approved)
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <Row label="Net Loan Amount Approved" value={netLoanApproved} />
          <Row label="Credit Assured Finance" value={creditAssuredFinance} />
          <Row label="Insurance Finance" value={insuranceFinance} />
          <Row
            label="Extended Warranty Finance"
            value={extendedWarrantyFinance}
          />

          <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
            <span className="text-xs text-muted-foreground">
              Total Loan Amount
            </span>
            <span className="text-sm font-semibold font-mono">
              {formatINR(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div>
    <label className="text-xs text-muted-foreground">{label}</label>
    <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
      {formatINR(value)}
    </div>
  </div>
);

const DisbursalBreakupPopup = ({ form, onClose }) => {
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

  const toNum = (v) => Number(v || 0);
  const total = toNum(net) + toNum(credit) + toNum(insurance) + toNum(ew);

  const handleSave = () => {
    form.setFieldsValue({
      postfile_disbursedLoan: toNum(net),
      postfile_disbursedCreditAssured: toNum(credit),
      postfile_disbursedInsurance: toNum(insurance),
      postfile_disbursedEw: toNum(ew),
      postfile_loanAmountDisbursed: total, // Sync total
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="Calculator" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Net Loan Disbursal Breakup
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Loan Amount (Disbursed)
            </label>
            <input
              type="number"
              className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              value={net}
              onChange={(e) => setNet(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Credit Assured Finance
            </label>
            <input
              type="number"
              className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Insurance Finance
            </label>
            <input
              type="number"
              className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Extended Warranty Finance
            </label>
            <input
              type="number"
              className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              value={ew}
              onChange={(e) => setEw(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="flex justify-between items-center pt-3 mt-1 border-t border-border bg-muted/30 px-3 py-2 rounded-md">
            <span className="text-xs text-muted-foreground font-semibold">
              Total Loan Amount
            </span>
            <span className="text-base font-bold font-mono text-primary">
              {formatINR(total)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
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

export default PostFileApprovalDetails;
