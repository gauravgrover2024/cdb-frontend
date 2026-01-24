// src/modules/loans/components/loan-form/loan-approval/LoanApprovalStep.jsx
import React, { useState } from "react";
import { Form } from "antd";

import Button from "../../../../../components/ui/Button";
import QuickActionToolbar from "../../../../../components/ui/QuickActionToolbar";
import Icon from "../../../../../components/AppIcon";
import WorkflowProgress from "../../../../../components/ui/WorkflowProgress";
import Section7RecordDetails from "../pre-file/Section7RecordDetails";
import dayjs from "dayjs";

import BankStatusCard from "./components/BankStatusCard";
import ComparisonMatrix from "./components/ComparisonMatrix";
import BankDetailsModal from "./components/BankDetailsModal";
import StatusUpdateModal from "./components/StatusUpdateModal";
import FilterPanel from "./components/FilterPanel";

const RecordDetailsEditable = ({ bankId, bankName, value, onChange }) => {
  if (!value) return null;

  const handleFieldChange = (field, newVal) => {
    onChange(bankId, { ...value, [field]: newVal });
  };

  const {
    receivingDate,
    receivingTime,
    recordSource,
    sourceName,
    dealerMobile,
    dealerAddress,
    payoutApplicable,
    payoutPercentage,
    referenceDetails,
    dealtBy,
    docsPreparedBy,
  } = value;

  return (
    <div className="relative bg-card rounded-lg border border-border p-4 md:p-6">
      <div className="absolute right-4 top-3 z-10 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground">
        {bankName}
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Icon name="FileText" size={18} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Record Details
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        {/* Receiving Date */}
        <div>
          <p className="text-xs text-muted-foreground">Receiving Date</p>
          <input
            type="date"
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={
              receivingDate ? dayjs(receivingDate).format("YYYY-MM-DD") : ""
            }
            onChange={(e) => handleFieldChange("receivingDate", e.target.value)}
          />
        </div>

        {/* Receiving Time */}
        <div>
          <p className="text-xs text-muted-foreground">Receiving Time</p>
          <input
            type="time"
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={receivingTime ? dayjs(receivingTime).format("HH:mm") : ""}
            onChange={(e) => handleFieldChange("receivingTime", e.target.value)}
          />
        </div>

        {/* Source */}
        <div>
          <p className="text-xs text-muted-foreground">Source</p>
          <select
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={recordSource || ""}
            onChange={(e) => handleFieldChange("recordSource", e.target.value)}
          >
            <option value="">Select source</option>
            <option value="Direct">Direct</option>
            <option value="Indirect">Indirect</option>
          </select>
        </div>

        {/* Source Name */}
        <div>
          <p className="text-xs text-muted-foreground">
            {recordSource === "Indirect" ? "Dealer / Channel" : "Source Name"}
          </p>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={sourceName || ""}
            onChange={(e) => handleFieldChange("sourceName", e.target.value)}
          />
        </div>

        {/* Indirect fields */}
        {recordSource === "Indirect" && (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Dealer Mobile</p>
              <input
                className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                value={dealerMobile || ""}
                onChange={(e) =>
                  handleFieldChange("dealerMobile", e.target.value)
                }
              />
            </div>

            <div className="md:col-span-2 lg:col-span-2">
              <p className="text-xs text-muted-foreground">Dealer Address</p>
              <textarea
                rows={2}
                className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                value={dealerAddress || ""}
                onChange={(e) =>
                  handleFieldChange("dealerAddress", e.target.value)
                }
              />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Is Payout Applicable
              </p>
              <div className="mt-1 flex gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`payoutApplicable-${bankId}`}
                    value="Yes"
                    checked={payoutApplicable === "Yes"}
                    onChange={(e) =>
                      handleFieldChange("payoutApplicable", e.target.value)
                    }
                  />
                  Yes
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`payoutApplicable-${bankId}`}
                    value="No"
                    checked={payoutApplicable === "No"}
                    onChange={(e) =>
                      handleFieldChange("payoutApplicable", e.target.value)
                    }
                  />
                  No
                </label>
              </div>
            </div>

            {payoutApplicable === "Yes" && (
              <div>
                <p className="text-xs text-muted-foreground">Payout %</p>
                <input
                  className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                  value={payoutPercentage || ""}
                  onChange={(e) =>
                    handleFieldChange("payoutPercentage", e.target.value)
                  }
                />
              </div>
            )}
          </>
        )}

        {/* Reference */}
        <div>
          <p className="text-xs text-muted-foreground">
            Reference Name &amp; Number
          </p>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={referenceDetails || ""}
            onChange={(e) =>
              handleFieldChange("referenceDetails", e.target.value)
            }
          />
        </div>

        {/* Dealt By */}
        <div>
          <p className="text-xs text-muted-foreground">Dealt By</p>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={dealtBy || ""}
            onChange={(e) => handleFieldChange("dealtBy", e.target.value)}
          />
        </div>

        {/* Docs Prepared By */}
        <div>
          <p className="text-xs text-muted-foreground">Docs Prepared By</p>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={docsPreparedBy || ""}
            onChange={(e) =>
              handleFieldChange("docsPreparedBy", e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
};

const LoanApprovalStep = ({ form, banksData, setBanksData, onNext }) => {
  const [activeView, setActiveView] = useState("cards");
  const [selectedBank, setSelectedBank] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const primaryBank =
    banksData.find((b) => b.status === "Disbursed") ||
    banksData.find((b) => b.status === "Approved") ||
    null;

  // live values from form
  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);
  const vehicleVariant = Form.useWatch("vehicleVariant", form);
  const exShowroomPrice = Form.useWatch("exShowroomPrice", form);
  const loanType = Form.useWatch("typeOfLoan", form);

  const handleBankNameChange = (bankId, newName) => {
    setBanksData((prev) =>
      prev.map((b) => (b.id === bankId ? { ...b, bankName: newName } : b))
    );
  };

  const handleBankUpdate = (bankId, patch) => {
    setBanksData((prev) =>
      prev.map((b) =>
        b.id === bankId
          ? {
              ...b,
              ...patch, // e.g. { loanAmount, interestRate, tenure, processingFee }
            }
          : b
      )
    );
  };

  const handleVehicleFieldChange = (bankId, fieldName, value) => {
    if (form && typeof form.setFieldsValue === "function") {
      form.setFieldsValue({ [fieldName]: value });
    }

    setBanksData((prev) =>
      prev.map((b) => {
        if (b.id !== bankId) return b;
        const vehicle = { ...(b.vehicle || {}) };
        if (fieldName === "vehicleMake") vehicle.make = value;
        if (fieldName === "vehicleModel") vehicle.model = value;
        if (fieldName === "vehicleVariant") vehicle.variant = value;
        vehicle.exShowroomPrice = exShowroomPrice;
        return { ...b, vehicle };
      })
    );
  };

  const updateBankStatus = (updatedBank, newStatus, note) => {
    const now = new Date().toISOString(); // ✅ DEFINE ONCE

    setBanksData((prev) =>
      prev.map((b) => {
        if (b.id !== updatedBank.id) return b;
        const history = b.statusHistory || [];
        return {
          ...b,
          status: newStatus,
          approvalDate:
            (newStatus === "Approved" || newStatus === "Disbursed") &&
            !b.approvalDate
              ? now
              : b.approvalDate,

          statusHistory: [
            ...history,
            {
              status: newStatus,
              changedAt: new Date().toISOString(),
              note: note || "",
            },
          ],
        };
      })
    );
  };

  const handleSaveAndNext = () => {
    if (!primaryBank) {
      onNext && onNext();
      return;
    }

    console.log("💾 Saving bank data:", primaryBank); // ADD THIS
    console.log("💾 Payout %:", primaryBank.payoutPercent); // ADD THIS

    // normalize numeric fields
    const cleanNumber = (val) =>
      Number(String(val || "").replace(/[^0-9.]/g, "")) || 0;

    form.setFieldsValue({
      approval_bankId: primaryBank.id,
      approval_bankName: primaryBank.bankName || "",
      approval_status: primaryBank.status,
      approval_loanAmountApproved: cleanNumber(primaryBank.loanAmount),
      approval_loanAmountDisbursed: cleanNumber(
        primaryBank.disbursedAmount || primaryBank.loanAmount
      ),
      approval_roi: Number(primaryBank.interestRate) || undefined,
      approval_tenureMonths: Number(primaryBank.tenure) || undefined,
      approval_processingFees: cleanNumber(primaryBank.processingFee),
      approval_statusHistory: primaryBank.statusHistory || [],
      approval_approvalDate:
        primaryBank.approvalDate ||
        primaryBank.statusHistory?.find((h) => h.status === "Approved")
          ?.changedAt ||
        primaryBank.statusHistory?.find((h) => h.status === "Disbursed")
          ?.changedAt ||
        null,

      approval_disbursedDate:
        primaryBank.statusHistory?.find((h) => h.status === "Disbursed")
          ?.changedAt || null,
      // NEW: breakup fields
      approval_breakup_netLoanApproved: primaryBank.breakupNetLoanApproved ?? 0,
      approval_breakup_creditAssured: primaryBank.breakupCreditAssured ?? 0,
      approval_breakup_insuranceFinance:
        primaryBank.breakupInsuranceFinance ?? 0,
      approval_breakup_ewFinance: primaryBank.breakupEwFinance ?? 0,
      payoutPercentage: primaryBank.payoutPercent || "", // ADD THIS LINE
    });

    // ✅ allow AntD + React to flush form updates
    requestAnimationFrame(() => {
      onNext && onNext();
    });
  };

  const bankWithLiveVehicle = (bank) => ({
    ...bank,
    loanType,
    vehicle: {
      make: vehicleMake ?? bank.vehicle?.make ?? "",
      model: vehicleModel ?? bank.vehicle?.model ?? "",
      variant: vehicleVariant ?? bank.vehicle?.variant ?? "",
      exShowroomPrice: exShowroomPrice ?? bank.vehicle?.exShowroomPrice ?? "",
    },
  });

  const filteredBanks = banksData;

  // Snapshot of prefile record details (shared for all banks initially)
  const prefileRecordDetails = form?.getFieldsValue([
    "receivingDate",
    "receivingTime",
    "recordSource",
    "sourceName",
    "dealerMobile",
    "dealerAddress",
    "payoutApplicable",
    "payoutPercentage",
    "referenceDetails",
    "dealtBy",
    "docsPreparedBy",
  ]);

  const [recordDetailsByBank, setRecordDetailsByBank] = useState({});

  const statusSummary = {
    total: banksData.length,
    approved: banksData.filter((b) => b.status === "Approved").length,
    pending: banksData.filter(
      (b) => b.status === "Pending" || b.status === "Under Review"
    ).length,
    documentsRequired: banksData.filter(
      (b) => b.status === "Documents Required"
    ).length,
    rejected: banksData.filter((b) => b.status === "Rejected").length,
  };

  const hasDisbursed = banksData.some((b) => b.status === "Disbursed");

  const workflowStages = [
    "Prefill & KYC",
    "Vehicle & Loan Details",
    "Multi-Bank Approval",
    "Documentation",
    "Disbursement",
  ];

  const handleAddBank = () => {
    setBanksData((prev) => {
      const newBank = {
        id: Date.now(),
        bankName: "New Bank",
        applicationId: `ACILLP-Loan-${String(prev.length + 1).padStart(
          4,
          "0"
        )}`,
        status: "Pending",
        interestRate: "0",
        loanAmount: "₹0",
        processingFee: "₹0",
        tenure: "60",
        vehicle: {},
        statusHistory: [
          {
            status: "Pending",
            changedAt: new Date().toISOString(),
            note: "Bank added",
          },
        ],
      };

      setRecordDetailsByBank((old) => {
        if (old[newBank.id]) return old; // do NOT overwrite once created
        return {
          ...old,
          [newBank.id]: { ...prefileRecordDetails },
        };
      });

      return [...prev, newBank];
    });
  };

  return (
    <div className="relative -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Loan Approval
            </h2>
            <p className="text-sm text-muted-foreground">
              Track and manage bank-wise loan approvals
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              iconName="Plus"
              onClick={handleAddBank}
            >
              Add Bank
            </Button>
            <QuickActionToolbar />
          </div>
        </div>

        <WorkflowProgress
          currentStage="Multi-Bank Approval"
          stages={workflowStages}
        />

        {/* Status summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card rounded-lg border border-border p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="Building2" size={20} className="text-primary" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Total Banks
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-foreground">
              {statusSummary.total}
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="CheckCircle2" size={20} className="text-success" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Approved
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-success">
              {statusSummary.approved}
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="Clock" size={20} className="text-warning" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Pending
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-warning">
              {statusSummary.pending}
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="XCircle" size={20} className="text-error" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Rejected
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-error">
              {statusSummary.rejected}
            </p>
          </div>
        </div>

        {/* View toggle + filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card rounded-lg border border-border p-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeView === "cards" ? "default" : "outline"}
              iconName="LayoutGrid"
              onClick={() => setActiveView("cards")}
            >
              Card View
            </Button>
            <Button
              size="sm"
              variant={activeView === "comparison" ? "default" : "outline"}
              iconName="BarChart3"
              onClick={() => setActiveView("comparison")}
            >
              Comparison
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            iconName={showFilters ? "ChevronUp" : "Filter"}
            onClick={() => setShowFilters((s) => !s)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        {showFilters && (
          <FilterPanel
            filters={{}}
            onFilterChange={() => {}}
            onReset={() => {}}
          />
        )}

        {activeView === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBanks.length === 0 && (
              <button
                type="button"
                onClick={handleAddBank}
                className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Icon
                  name="PlusCircle"
                  size={32}
                  className="text-primary mb-2"
                />
                <span className="text-sm font-medium text-foreground">
                  Add first bank
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Start by adding the first lending partner
                </span>
              </button>
            )}

            {filteredBanks.map((bank) => (
              <BankStatusCard
                key={bank.id}
                bank={bankWithLiveVehicle(bank)}
                form={form}
                readOnly={hasDisbursed && bank.status !== "Disbursed"}
                onUpdateStatus={(b) => {
                  setSelectedBank(b);
                  setShowStatusModal(true);
                }}
                onBankNameChange={handleBankNameChange}
                onBankUpdate={(patch) => handleBankUpdate(bank.id, patch)}
                onDeleteBank={() =>
                  setBanksData((prev) => prev.filter((b) => b.id !== bank.id))
                }
              />
            ))}
          </div>
        ) : (
          <ComparisonMatrix banks={filteredBanks.map(bankWithLiveVehicle)} />
        )}
      </div>

      {/* Record Details per additional bank (editable, not wired to prefile form) */}
      {banksData.length > 1 && (
        <div className="mt-6 space-y-4">
          {banksData.slice(1).map((bank) => (
            <RecordDetailsEditable
              key={bank.id}
              bankId={bank.id}
              bankName={bank.bankName || "Bank"}
              value={recordDetailsByBank[bank.id]}
              onChange={(id, newDetails) =>
                setRecordDetailsByBank((prev) => ({
                  ...prev,
                  [id]: newDetails,
                }))
              }
            />
          ))}
        </div>
      )}

      {showStatusModal && (
        <StatusUpdateModal
          bank={selectedBank}
          onClose={() => setShowStatusModal(false)}
          onSave={(updated) => {
            // updated contains at least { id, status, ... }
            updateBankStatus(updated, updated.status, updated.statusNote);
            setShowStatusModal(false);
          }}
        />
      )}
    </div>
  );
};

export default LoanApprovalStep;
