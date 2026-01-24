import React, { useMemo, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";

const calculateEmi = (principal, annualRate, tenureMonths) => {
  const P = Number(String(principal).replace(/[^0-9.]/g, "")) || 0;
  const N = Number(tenureMonths) || 0;
  const R = (Number(annualRate) || 0) / 12 / 100;

  if (!P || !N || !R) return 0;

  const pow = Math.pow(1 + R, N);
  return Math.round((P * R * pow) / (pow - 1));
};

const PostFileApprovalDetails = ({ form }) => {
  const [showBreakupPopup, setShowBreakupPopup] = useState(false);
  const [showDisbursalPopup, setShowDisbursalPopup] = useState(false);
  const [isSameAsApproved, setIsSameAsApproved] = useState(false);

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

  const isDisbursed = approvalStatus === "Disbursed";

  // -----------------------------
  // WATCH POSTFILE VALUES (TARGET)
  // -----------------------------
  const postfileRoi = Form.useWatch("postfile_roi", form);
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

  const approvalBreakup = {
    net: form.getFieldValue("approval_breakup_netLoanApproved") || 0,
    credit: form.getFieldValue("approval_breakup_creditAssured") || 0,
    insurance: form.getFieldValue("approval_breakup_insuranceFinance") || 0,
    ew: form.getFieldValue("approval_breakup_ewFinance") || 0,
  };

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
    if (!isDisbursed) return;
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
      postfile_loanAmountDisbursed: approvalLoanDisbursed || "",
      postfile_roi: approvalRoi || "",
      postfile_tenureMonths: approvalTenureMonths || "",
      postfile_processingFees: approvalProcessingFees || "",
      __postfileSeeded: true, // keep for backward compatibility
    };

    form.setFieldsValue(patch);
  }, [
    isDisbursed,
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
  useEffect(() => {
    if (!isSameAsApproved) return;

    const patch = {
      postfile_disbursedLoan: approvalBreakup.net,
      postfile_disbursedCreditAssured: approvalBreakup.credit,
      postfile_disbursedInsurance: approvalBreakup.insurance,
      postfile_disbursedEw: approvalBreakup.ew,
    };

    form.setFieldsValue(patch);

    const totalDisbursed =
      Number(approvalBreakup.net || 0) +
      Number(approvalBreakup.credit || 0) +
      Number(approvalBreakup.insurance || 0) +
      Number(approvalBreakup.ew || 0);

    const calculatedEmi = calculateEmi(
      totalDisbursed,
      postfileRoi || 0,
      postfileTenure || 0
    );

    form.setFieldsValue({
      postfile_emiAmount: calculatedEmi,
    });
  }, [isSameAsApproved, approvalBreakup, postfileRoi, postfileTenure, form]);

  const netLoanForDisbursal =
    disbursedLoan + disbursedCredit + disbursedInsurance + disbursedEw;

  const emiAmount = useMemo(
    () =>
      calculateEmi(netLoanForDisbursal, postfileRoi || 0, postfileTenure || 0),
    [netLoanForDisbursal, postfileRoi, postfileTenure]
  );

  return (
    <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6 h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Stamp" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Approval Details
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Pre-filled from disbursed bank and editable till vehicle
              verification
            </p>
          </div>
        </div>
        {approvalDisbursedDate && (
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Disbursed on</p>
            <p className="text-xs font-medium text-foreground">
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
            <Icon name="FileText" size={16} />
            Core Approval Info
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Date of Approval"
              name="postfile_approvalDate"
              className="mb-0"
            >
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
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
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40 cursor-pointer flex items-center justify-between"
                onClick={() => setShowBreakupPopup(true)}
              >
                <span className="font-semibold font-mono text-foreground">
                  ₹ {Number(approvalLoanApproved || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </Form.Item>

            <Form.Item
              label="Net Loan Amount for Disbursal"
              name="postfile_disbursedLoanTotal"
              className="mb-0"
            >
              <div
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40 cursor-pointer flex items-center justify-between"
                onClick={() => setShowDisbursalPopup(true)}
              >
                <span className="font-semibold font-mono text-foreground">
                  ₹ {disbursalTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </Form.Item>
          </div>

          {/* Checkbox: Same as Approved */}
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md border border-primary/20">
            <input
              type="checkbox"
              id="sameAsApproved"
              checked={isSameAsApproved}
              onChange={(e) => setIsSameAsApproved(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor="sameAsApproved"
              className="text-sm text-foreground cursor-pointer"
            >
              Use same disbursement as approved loan amount
            </label>
          </div>
        </div>

        {/* Loan breakup + finance components */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon name="Calculator" size={16} />
            Loan Components
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Processing Fees"
              name="postfile_processingFees"
              className="mb-0"
            >
              <input
                type="number"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>
          </div>
        </div>

        {/* Rate & EMI information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon name="Percent" size={16} />
            Rate & EMI
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item
              label="Rate of Interest Type"
              name="postfile_roiType"
              className="mb-0"
            >
              <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                <option value="">Select</option>
                <option value="Fixed">Fixed</option>
                <option value="Floating">Floating</option>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label={`EMI Amount ${
                emiAmount
                  ? `(Calculated: ₹${emiAmount.toLocaleString("en-IN")})`
                  : ""
              }`}
              name="postfile_emiAmount"
              className="mb-0"
            >
              <input
                type="number"
                placeholder={`Calculated: ₹${emiAmount || 0}`}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </Form.Item>
          </div>

          <div className="p-3 bg-info/10 rounded-md border border-info/20">
            <p className="text-xs text-info">
              <strong>EMI Calculation:</strong> Net Loan Amount for Disbursal (₹
              {netLoanForDisbursal.toLocaleString("en-IN")}) with Rate (
              {postfileRoi || 0}%) and Tenure ({postfileTenure || 0} months) = ₹
              {emiAmount ? emiAmount.toLocaleString("en-IN") : 0}
            </p>
          </div>
        </div>
      </div>

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
              ₹ {total.toLocaleString("en-IN")}
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
      ₹ {Number(value || 0).toLocaleString("en-IN")}
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
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">
            Net Loan Disbursal Breakup
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Loan Amount (Disbursed)
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={net}
              onChange={(e) => setNet(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Credit Assured Finance
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Insurance Finance
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Extended Warranty Finance
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={ew}
              onChange={(e) => setEw(e.target.value)}
            />
          </div>

          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Total Loan Amount
            </span>
            <span className="text-sm font-semibold font-mono">
              ₹ {total.toLocaleString("en-IN")}
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
