// src/modules/loans/components/loan-form/loan-approval/LoanApprovalStep.jsx
import React, { useState, useEffect, useRef } from "react";
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

// API function to fetch banks data
const fetchBanksDataFromAPI = async (loanId) => {
  try {
    const response = await fetch(`/api/loans/${loanId}/banks`);
    if (!response.ok) throw new Error("Failed to fetch banks");
    const data = await response.json();
    return data.banks || [];
  } catch (error) {
    console.error("Error fetching banks:", error);
    return null;
  }
};

// API function to save banks data
const saveBanksDataToAPI = async (loanId, banksData) => {
  try {
    const response = await fetch(`/api/loans/${loanId}/banks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banks: banksData }),
    });
    if (!response.ok) throw new Error("Failed to save banks");
    return await response.json();
  } catch (error) {
    console.error("Error saving banks:", error);
    return null;
  }
};

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
    <div className="relative bg-card rounded-lg border border-border p-4 md:p-6 w-full">
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
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Receiving Date</p>
          <div className="relative">
            <Icon
              name="Calendar"
              size={16}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="date"
              className="w-full bg-background border border-border rounded-md pl-9 pr-2 py-1 text-sm text-foreground"
              value={
                receivingDate ? dayjs(receivingDate).format("YYYY-MM-DD") : ""
              }
              onChange={(e) =>
                handleFieldChange("receivingDate", e.target.value)
              }
            />
          </div>
        </div>

        {/* Receiving Time */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Receiving Time</p>
          <div className="relative">
            <Icon
              name="Clock"
              size={16}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="time"
              className="w-full bg-background border border-border rounded-md pl-9 pr-2 py-1 text-sm text-foreground"
              value={receivingTime ? dayjs(receivingTime).format("HH:mm") : ""}
              onChange={(e) =>
                handleFieldChange("receivingTime", e.target.value)
              }
            />
          </div>
        </div>

        {/* Source */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Source</p>
          <select
            className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
            value={recordSource || ""}
            onChange={(e) => handleFieldChange("recordSource", e.target.value)}
          >
            <option value="">Select source</option>
            <option value="Direct">Direct</option>
            <option value="Indirect">Indirect</option>
          </select>
        </div>

        {/* Source Name */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {recordSource === "Indirect" ? "Dealer / Channel" : "Source Name"}
          </p>
          <input
            className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
            value={sourceName || ""}
            onChange={(e) => handleFieldChange("sourceName", e.target.value)}
          />
        </div>

        {/* Indirect fields */}
        {recordSource === "Indirect" && (
          <>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Dealer Mobile</p>
              <input
                className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
                value={dealerMobile || ""}
                onChange={(e) =>
                  handleFieldChange("dealerMobile", e.target.value)
                }
              />
            </div>

            <div className="md:col-span-2 lg:col-span-2 space-y-1">
              <p className="text-xs text-muted-foreground">Dealer Address</p>
              <textarea
                rows={2}
                className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
                value={dealerAddress || ""}
                onChange={(e) =>
                  handleFieldChange("dealerAddress", e.target.value)
                }
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Is Payout Applicable
              </p>
              <div className="flex gap-3 text-xs">
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
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Payout %</p>
                <input
                  className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
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
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Reference Name &amp; Number
          </p>
          <input
            className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
            value={referenceDetails || ""}
            onChange={(e) =>
              handleFieldChange("referenceDetails", e.target.value)
            }
          />
        </div>

        {/* Dealt By */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Dealt By</p>
          <input
            className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
            value={dealtBy || ""}
            onChange={(e) => handleFieldChange("dealtBy", e.target.value)}
          />
        </div>

        {/* Docs Prepared By */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Docs Prepared By</p>
          <input
            className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
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

const LoanApprovalStep = ({ form, banksData, setBanksData, onNext, loanId }) => {
  const [activeView, setActiveView] = useState("cards");
  const [selectedBank, setSelectedBank] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const initialFetchRef = useRef(false);

  // Fetch banks data on component mount
  useEffect(() => {
    if (!loanId || initialFetchRef.current) return;
    initialFetchRef.current = true;

    const fetchData = async () => {
      setIsLoading(true);
      const fetchedBanks = await fetchBanksDataFromAPI(loanId);
      if (fetchedBanks) {
        setBanksData(fetchedBanks);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [loanId, setBanksData]);

  // Auto-save with debounce
  useEffect(() => {
    if (!loanId || isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      await saveBanksDataToAPI(loanId, banksData);
      setIsSaving(false);
    }, 1500); // Save 1.5 seconds after last change

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [banksData, loanId, isLoading]);

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
      prev.map((b) => (b.id === bankId ? { ...b, bankName: newName } : b)),
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
          : b,
      ),
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
      }),
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
      }),
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
        primaryBank.disbursedAmount || primaryBank.loanAmount,
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

  // Wire new banks' record details to prefile form values if not already set
  useEffect(() => {
    if (!banksData || !Array.isArray(banksData)) return;
    setRecordDetailsByBank((prev) => {
      const updated = { ...prev };
      banksData.forEach((bank, idx) => {
        if (!updated[bank.id]) {
          updated[bank.id] = { ...prefileRecordDetails };
        }
      });
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banksData, JSON.stringify(prefileRecordDetails)]);

  const statusSummary = {
    total: banksData.length,
    approved: banksData.filter((b) => b.status === "Approved").length,
    pending: banksData.filter(
      (b) => b.status === "Pending" || b.status === "Under Review",
    ).length,
    documentsRequired: banksData.filter(
      (b) => b.status === "Documents Required",
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
          "0",
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
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading banks...</p>
          </div>
        </div>
      )}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg px-4 py-2 text-xs text-muted-foreground flex items-center gap-2 z-40">
          <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
          Saving...
        </div>
      )}
      <div className="px-6 lg:px-8 space-y-6">
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
            {!hasDisbursed && (
              <button
                type="button"
                onClick={handleAddBank}
                className="bg-card rounded-lg border border-border p-4 md:p-6 transition-all hover:shadow-md active:scale-95 cursor-pointer relative group max-w-sm mx-auto w-full min-h-[350px]"
              >
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon name="Plus" size={24} className="text-primary" />
                  </div>
                  <div className="flex-1 text-center">
                    <h3 className="font-semibold text-foreground mb-1 ">Add Bank</h3>
                    <p className="text-xs text-muted-foreground">Click to add another bank for approval</p>
                  </div>
                </div>
              </button>
            )}
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
