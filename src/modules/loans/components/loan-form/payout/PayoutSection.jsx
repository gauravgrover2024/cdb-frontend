// src/modules/loans/components/loan-form/payout/PayoutSection.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";

const PayoutSection = ({ form, readOnly = false }) => {
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);

  // =========================
  // WATCH REQUIRED FIELDS (ALWAYS TOP LEVEL)
  // =========================
  const approvalStatus = Form.useWatch("approval_status", form);
  const disbursedBankName = Form.useWatch("approval_bankName", form);
  const disbursedAmount = Form.useWatch("approval_loanAmountDisbursed", form);

  const netLoanApproved = Form.useWatch(
    "approval_breakup_netLoanApproved",
    form
  );

  const recordSource = Form.useWatch("recordSource", form);
  const sourceName = Form.useWatch("sourceName", form);

  const payoutApplicablePrefile = Form.useWatch("payoutApplicable", form);

  // Prefile payout %
  const prefileSourcePayout = Form.useWatch(
    "prefile_sourcePayoutPercentage",
    form
  );

  // Bank payout % (approval)
  const approvalPayoutPercentage = Form.useWatch("payoutPercentage", form);

  // derived flags
  const isDisbursed =
    (approvalStatus || "").toLowerCase().trim() === "disbursed";

  // Dealer/Channel name comes from Record Details (sourceName)
  const dealerName = sourceName || "";

  // =========================
  // HELPERS
  // =========================
  const generatePayoutId = (type) => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999999)
      .toString()
      .padStart(6, "0");
    const prefix = type === "receivable" ? "PR" : "PP";
    return `${prefix}-${year}-${random}`;
  };

  const calculatePayoutAmount = (percentage) => {
    const baseAmount = parseFloat(netLoanApproved) || 0;
    const perc = parseFloat(percentage) || 0;
    return (baseAmount * perc) / 100;
  };

  const calculateTdsAmount = (payoutAmount, tdsApplicable, tdsPercentage) => {
    if (tdsApplicable !== "Yes") return 0;
    const tdsPerc = parseFloat(tdsPercentage) || 0;
    return (parseFloat(payoutAmount || 0) * tdsPerc) / 100;
  };

  // =========================
  // SAVE payouts back to form
  // =========================
  useEffect(() => {
    form.setFieldsValue({
      loan_receivables: receivables,
      loan_payables: payables,
    });
  }, [receivables, payables, form]);

  // =========================
  // INITIAL LOAD from form (only once)
  // =========================
  useEffect(() => {
    const existingReceivables = form.getFieldValue("loan_receivables") || [];
    const existingPayables = form.getFieldValue("loan_payables") || [];

    if (existingReceivables.length > 0) setReceivables(existingReceivables);
    if (existingPayables.length > 0) setPayables(existingPayables);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // AUTO CREATE RECEIVABLES / PAYABLES
  // This runs when required fields become available
  // but will NOT overwrite if user already has rows
  // =========================
  useEffect(() => {
    if (!isDisbursed) return;
    if (readOnly) return;

    // -------------------------
    // Auto Receivables (only if empty)
    // -------------------------
    if (receivables.length === 0) {
      const autoReceivables = [];

      // Bank Receivable
      if (disbursedBankName) {
        const bankPercent = approvalPayoutPercentage || "";
        const payoutAmount = bankPercent
          ? calculatePayoutAmount(bankPercent)
          : 0;

        const tdsPerc = 5;
        const tdsAmount = calculateTdsAmount(payoutAmount, "Yes", tdsPerc);

        autoReceivables.push({
          id: Date.now(),
          payoutId: generatePayoutId("receivable"),
          payout_createdAt: new Date().toISOString(),

          payout_applicable: "Yes",
          payout_type: "Bank",
          payout_party_name: disbursedBankName,
          payout_percentage: bankPercent,
          payout_amount: payoutAmount,

          tds_applicable: "Yes",
          tds_percentage: tdsPerc,
          tds_amount: tdsAmount,

          payout_remarks: "Auto-generated from disbursed bank",
        });
      }

      if (autoReceivables.length > 0) setReceivables(autoReceivables);
    }

    // -------------------------
    // Auto Payables (only if empty)
    // -------------------------
    if (payables.length === 0) {
      const autoPayables = [];

      const shouldCreateDealerPayable =
        recordSource === "Indirect" &&
        payoutApplicablePrefile === "Yes" &&
        dealerName &&
        prefileSourcePayout;

      if (shouldCreateDealerPayable) {
        const sourcePercent = prefileSourcePayout || "";
        const payoutAmount = sourcePercent
          ? calculatePayoutAmount(sourcePercent)
          : 0;

        const tdsPerc = 5;
        const tdsAmount = calculateTdsAmount(payoutAmount, "Yes", tdsPerc);

        autoPayables.push({
          id: Date.now() + 1,
          payoutId: generatePayoutId("payable"),
          payout_createdAt: new Date().toISOString(),

          payout_applicable: "Yes",
          payout_type: "Source",
          payout_party_name: dealerName,
          payout_percentage: sourcePercent,
          payout_amount: payoutAmount,

          tds_applicable: "Yes",
          tds_percentage: tdsPerc,
          tds_amount: tdsAmount,

          payout_remarks:
            "Auto-generated from pre-file source payout (indirect)",
        });
      }

      if (autoPayables.length > 0) setPayables(autoPayables);
    }
  }, [
    isDisbursed,
    disbursedBankName,

    approvalPayoutPercentage,
    recordSource,
    payoutApplicablePrefile,
    dealerName,
    prefileSourcePayout,
    netLoanApproved,
    receivables.length,
    payables.length,
  ]);

  // =========================
  // ADD payout rows
  // =========================
  const addReceivable = () => {
    setReceivables((prev) => [
      ...prev,
      {
        id: Date.now(),
        payoutId: generatePayoutId("receivable"),
        payout_createdAt: new Date().toISOString(),

        payout_applicable: "Yes",
        payout_type: "",
        payout_party_name: "",
        payout_percentage: "",
        payout_amount: 0,

        tds_applicable: "Yes",
        tds_percentage: 5,
        tds_amount: 0,

        payout_remarks: "",
      },
    ]);
  };

  const addPayable = () => {
    setPayables((prev) => [
      ...prev,
      {
        id: Date.now(),
        payoutId: generatePayoutId("payable"),
        payout_createdAt: new Date().toISOString(),

        payout_applicable: "Yes",
        payout_type: "",
        payout_party_name: "",
        payout_percentage: "",
        payout_amount: 0,

        tds_applicable: "Yes",
        tds_percentage: 5,
        tds_amount: 0,

        payout_remarks: "",
      },
    ]);
  };

  // =========================
  // UPDATE payout rows
  // =========================
  const applyUpdateRules = (updated, field, value, direction) => {
    if (field === "payout_percentage") {
      updated.payout_amount = calculatePayoutAmount(value);

      if (updated.tds_applicable === "Yes") {
        updated.tds_amount = calculateTdsAmount(
          updated.payout_amount,
          "Yes",
          updated.tds_percentage
        );
      } else {
        updated.tds_amount = 0;
      }
    }

    if (field === "tds_percentage" || field === "tds_applicable") {
      if (updated.tds_applicable === "Yes") {
        updated.tds_amount = calculateTdsAmount(
          updated.payout_amount,
          "Yes",
          updated.tds_percentage
        );
      } else {
        updated.tds_amount = 0;
      }
    }

    if (field === "payout_type") {
      if (direction === "Receivable") {
        if (value === "Bank")
          updated.payout_party_name = disbursedBankName || "";
      }

      if (direction === "Payable") {
        // Dealer/Source both map to same party name here
        if (value === "Dealer") updated.payout_party_name = dealerName || "";
        if (value === "Source") updated.payout_party_name = dealerName || "";
      }
    }

    return updated;
  };

  const updateReceivable = (id, field, value) => {
    setReceivables((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        let updated = { ...p, [field]: value };
        return applyUpdateRules(updated, field, value, "Receivable");
      })
    );
  };

  const updatePayable = (id, field, value) => {
    setPayables((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        let updated = { ...p, [field]: value };
        return applyUpdateRules(updated, field, value, "Payable");
      })
    );
  };

  const deleteReceivable = (id) => {
    setReceivables((prev) => prev.filter((p) => p.id !== id));
  };

  const deletePayable = (id) => {
    setPayables((prev) => prev.filter((p) => p.id !== id));
  };

  // =========================
  // TOTALS
  // =========================
  const totalReceivables = useMemo(
    () =>
      receivables.reduce(
        (sum, p) => sum + (parseFloat(p.payout_amount) || 0),
        0
      ),
    [receivables]
  );

  const totalPayables = useMemo(
    () =>
      payables.reduce((sum, p) => sum + (parseFloat(p.payout_amount) || 0), 0),
    [payables]
  );

  const totalTdsReceivables = useMemo(
    () =>
      receivables.reduce((sum, p) => sum + (parseFloat(p.tds_amount) || 0), 0),
    [receivables]
  );

  const totalTdsPayables = useMemo(
    () => payables.reduce((sum, p) => sum + (parseFloat(p.tds_amount) || 0), 0),
    [payables]
  );

  const netReceivables = totalReceivables - totalTdsReceivables;
  const netPayables = totalPayables - totalTdsPayables;

  // =========================
  // UI (RETURN AFTER HOOKS)
  // =========================
  if (!isDisbursed) {
    return (
      <div className="bg-card rounded-lg shadow-elevation-2 p-8 text-center">
        <Icon
          name="Lock"
          size={48}
          className="text-muted-foreground mx-auto mb-4"
        />
        <p className="text-base font-medium text-foreground">
          Payout section is only available after loan disbursement
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Current status: {approvalStatus || "Not disbursed"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Summary */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-success/10 flex items-center justify-center">
            <Icon name="Wallet" size={20} className="text-success" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Payout Receipt (Case Level)
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Only recording payout structure here. Tracking will happen in
              dashboards.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-primary/5 rounded-lg p-4 border border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Disbursed Bank</p>
            <p className="text-sm font-semibold text-foreground">
              {disbursedBankName || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Total Disbursed Amount
            </p>
            <p className="text-sm font-semibold text-foreground">
              ₹{Number(disbursedAmount || 0).toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Net Loan (Payout Base)
            </p>
            <p className="text-sm font-semibold text-primary">
              ₹{Number(netLoanApproved || 0).toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {recordSource
                ? recordSource === "Indirect"
                  ? `Indirect (${sourceName || "-"})`
                  : "Direct"
                : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* RECEIVABLES */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Icon name="TrendingUp" size={20} className="text-success" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">
                Receivables
              </h3>
              <p className="text-xs text-muted-foreground">Bank / Insurance</p>
            </div>
          </div>

          {!readOnly && (
            <Button
              variant="default"
              iconName="Plus"
              iconPosition="left"
              size="sm"
              onClick={addReceivable}
            >
              Add Receivable
            </Button>
          )}
        </div>

        {receivables.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
            <Icon
              name="Inbox"
              size={32}
              className="text-muted-foreground mx-auto mb-2"
            />
            <p className="text-sm text-muted-foreground">
              No receivables added
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {receivables.map((payout, index) => (
              <PayoutCard
                key={payout.id}
                payout={payout}
                index={index}
                onUpdate={(field, value) =>
                  updateReceivable(payout.id, field, value)
                }
                onDelete={() => deleteReceivable(payout.id)}
                type="receivable"
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>

      {/* PAYABLES */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
              <Icon name="TrendingDown" size={20} className="text-error" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">
                Payables
              </h3>
              <p className="text-xs text-muted-foreground">Dealer / Source</p>
            </div>
          </div>

          {!readOnly && (
            <Button
              variant="outline"
              iconName="Plus"
              iconPosition="left"
              size="sm"
              onClick={addPayable}
            >
              Add Payable
            </Button>
          )}
        </div>

        {payables.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
            <Icon
              name="Inbox"
              size={32}
              className="text-muted-foreground mx-auto mb-2"
            />
            <p className="text-sm text-muted-foreground">No payables added</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payables.map((payout, index) => (
              <PayoutCard
                key={payout.id}
                payout={payout}
                index={index}
                onUpdate={(field, value) =>
                  updatePayable(payout.id, field, value)
                }
                onDelete={() => deletePayable(payout.id)}
                type="payable"
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>

      {/* NET SUMMARY */}
      {(receivables.length > 0 || payables.length > 0) && (
        <div className="bg-white rounded-lg p-6 border border-border shadow-elevation-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Net Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-success/10 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Net Receivable
              </p>
              <p className="text-lg font-semibold text-success">
                ₹{netReceivables.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-error/10 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Net Payable</p>
              <p className="text-lg font-semibold text-error">
                ₹{netPayables.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Net Position</p>
              <p className="text-lg font-semibold text-primary">
                ₹
                {Math.abs(netReceivables - netPayables).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {netReceivables - netPayables >= 0
                  ? "Net Receivable"
                  : "Net Payable"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PayoutCard = ({
  payout,
  index,
  onUpdate,
  onDelete,
  type,
  readOnly = false,
}) => {
  const netAfterTds =
    parseFloat(payout.payout_amount || 0) - parseFloat(payout.tds_amount || 0);

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              type === "receivable" ? "bg-success/10" : "bg-error/10"
            }`}
          >
            <span
              className={`text-sm font-semibold ${
                type === "receivable" ? "text-success" : "text-error"
              }`}
            >
              {index + 1}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {type === "receivable" ? "Receivable" : "Payable"} #
              {payout.payoutId}
            </p>
            <p className="text-xs text-muted-foreground">
              {payout.payout_type || "Type not selected"}
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={onDelete}
            className="p-2 hover:bg-error/10 rounded-lg transition-colors"
          >
            <Icon name="Trash2" size={18} className="text-error" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Payout Type *
            </label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              value={payout.payout_type}
              onChange={(e) => onUpdate("payout_type", e.target.value)}
            >
              <option value="">Select Type</option>
              {type === "receivable" ? (
                <>
                  <option value="Bank">Bank</option>
                </>
              ) : (
                <>
                  <option value="Dealer">Dealer</option>
                  <option value="Source">Source</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Party Name *
            </label>
            <input
              type="text"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              value={payout.payout_party_name}
              onChange={(e) => onUpdate("payout_party_name", e.target.value)}
              placeholder="Party name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Payout Percentage *
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              value={payout.payout_percentage}
              onChange={(e) => onUpdate("payout_percentage", e.target.value)}
              placeholder="Enter percentage"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Payout Amount (Auto)
            </label>
            <div className="w-full border border-dashed border-primary/40 rounded-md px-3 py-2 text-sm bg-primary/5 flex items-center justify-between">
              <span className="font-semibold text-primary">
                ₹{Number(payout.payout_amount || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              TDS Applicable
            </label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              value={payout.tds_applicable}
              onChange={(e) => onUpdate("tds_applicable", e.target.value)}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {payout.tds_applicable === "Yes" && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  TDS %
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  value={payout.tds_percentage}
                  onChange={(e) => onUpdate("tds_percentage", e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  TDS Amount (Auto)
                </label>
                <div className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40">
                  ₹{Number(payout.tds_amount || 0).toLocaleString("en-IN")}
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Remarks
          </label>
          <textarea
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            rows={2}
            value={payout.payout_remarks}
            onChange={(e) => onUpdate("payout_remarks", e.target.value)}
            placeholder="Add any remarks..."
          />
        </div>

        <div
          className={`${
            type === "receivable"
              ? "bg-success/10 border-success/20"
              : "bg-error/10 border-error/20"
          } rounded-lg p-4 border`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Net {type === "receivable" ? "Receivable" : "Payable"} (After
                TDS)
              </p>
              <p
                className={`text-xl font-semibold ${
                  type === "receivable" ? "text-success" : "text-error"
                }`}
              >
                ₹{netAfterTds.toLocaleString("en-IN")}
              </p>
            </div>
            <Icon
              name={type === "receivable" ? "TrendingUp" : "TrendingDown"}
              size={24}
              className={type === "receivable" ? "text-success" : "text-error"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutSection;
