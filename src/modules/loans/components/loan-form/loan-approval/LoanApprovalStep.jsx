// src/modules/loans/components/loan-form/loan-approval/LoanApprovalStep.jsx
import React, { useEffect, useRef, useState } from "react";
import { Form } from "antd";
import { apiClient } from "../../../../../api/client";

import Button from "../../../../../components/ui/Button";
import Icon from "../../../../../components/AppIcon";
import dayjs from "dayjs";

import BankStatusCard from "./components/BankStatusCard";
import ComparisonMatrix from "./components/ComparisonMatrix";
import StatusUpdateModal from "./components/StatusUpdateModal";

// API function to fetch banks data
const fetchBanksDataFromAPI = async (loanId) => {
  try {
    const data = await apiClient.get(`/api/loans/${loanId}/banks`);
    return data?.banks || [];
  } catch (error) {
    console.error("Error fetching banks:", error);
    return null;
  }
};

// API function to save banks data
const saveBanksDataToAPI = async (loanId, banksData) => {
  try {
    return await apiClient.put(`/api/loans/${loanId}/banks`, {
      banks: banksData,
    });
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

  // live values from form
  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);
  const vehicleVariant = Form.useWatch("vehicleVariant", form);
  const vehicleFuelType = Form.useWatch("vehicleFuelType", form);
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
          disbursalDate:
            newStatus === "Disbursed" && !b.disbursalDate ? now : b.disbursalDate,

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

  const bankWithLiveVehicle = (bank) => ({
    ...bank,
    vehicleFuelType: vehicleFuelType ?? bank.vehicleFuelType ?? bank.vehicle?.fuel ?? "",
    loanType,
    vehicle: {
      make: vehicleMake ?? bank.vehicle?.make ?? "",
      model: vehicleModel ?? bank.vehicle?.model ?? "",
      variant: vehicleVariant ?? bank.vehicle?.variant ?? "",
      fuel: vehicleFuelType ?? bank.vehicle?.fuel ?? "",
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
    approved: banksData.filter(
      (b) => b.status === "Approved" || b.status === "Disbursed",
    ).length,
    pending: banksData.filter(
      (b) => b.status === "Pending" || b.status === "Under Review",
    ).length,
    rejected: banksData.filter((b) => b.status === "Rejected").length,
  };
  const underProcess =
    statusSummary.pending +
    banksData.filter((b) => b.status === "Documents Required").length;

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
    <div className="relative space-y-5 font-sans md:space-y-6">
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
      <div className="relative overflow-hidden rounded-[18px] border border-border/70 bg-card p-2.5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.42)] md:p-3 dark:bg-black/85 dark:shadow-[0_18px_40px_-34px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.18),transparent_35%)]" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Icon name="ShieldCheck" size={12} />
              Approval Desk
            </div>
            <h2 className="text-lg font-semibold text-foreground md:text-xl">
              Bank Decision Center
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/70 p-2 dark:bg-black/55">
            <Button
              size="sm"
              variant={activeView === "cards" ? "default" : "outline"}
              iconName="LayoutGrid"
              onClick={() => setActiveView("cards")}
            >
              Cards
            </Button>
            <Button
              size="sm"
              variant={activeView === "comparison" ? "default" : "outline"}
              iconName="BarChart3"
              onClick={() => setActiveView("comparison")}
            >
              Matrix
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-sky-200/70 bg-sky-50/90 p-4 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/20">
          <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="Building2" size={16} />
          </div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Total Banks</div>
          <div className="text-3xl font-semibold leading-none text-foreground">{statusSummary.total}</div>
        </div>
        <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <Icon name="BadgeCheck" size={16} />
          </div>
          <div className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">Approved / Disbursed</div>
          <div className="text-3xl font-semibold leading-none text-emerald-700 dark:text-emerald-300">{statusSummary.approved}</div>
        </div>
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50/90 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <Icon name="Clock3" size={16} />
          </div>
          <div className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-300">In Progress</div>
          <div className="text-3xl font-semibold leading-none text-amber-700 dark:text-amber-300">{underProcess}</div>
        </div>
        <div className="rounded-2xl border border-rose-300/60 bg-rose-50/90 p-4 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/20">
          <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300">
            <Icon name="ShieldX" size={16} />
          </div>
          <div className="mb-1 text-xs font-medium text-rose-700 dark:text-rose-300">Rejected</div>
          <div className="text-3xl font-semibold leading-none text-rose-700 dark:text-rose-300">{statusSummary.rejected}</div>
        </div>
      </div>

      <div className="rounded-[26px] border border-border/70 bg-card/95 p-4 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.4)] md:p-5 dark:bg-black/75 dark:shadow-[0_20px_55px_-38px_rgba(0,0,0,0.9)]">
        {activeView === "cards" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-2.5 text-xs text-muted-foreground dark:bg-black/45">
              Offers board: {filteredBanks.length} bank{filteredBanks.length === 1 ? "" : "s"} active
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredBanks.map((bank) => (
                <div
                  key={bank.id}
                  className="rounded-2xl bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-black/70"
                >
                  <BankStatusCard
                    bank={bankWithLiveVehicle(bank)}
                    form={form}
                    readOnly={false}
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
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddBank}
                className="group relative mx-auto min-h-[380px] w-full max-w-sm cursor-pointer rounded-2xl border border-dashed border-primary/45 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 md:p-6 dark:border-primary/45 dark:from-primary/15 dark:via-primary/10 dark:to-transparent"
              >
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 transition-colors group-hover:bg-primary/25">
                    <Icon name="Plus" size={24} className="text-primary" />
                  </div>
                  <div className="flex-1 text-center">
                    <h3 className="mb-1 text-base font-semibold text-foreground">Add Bank</h3>
                    <p className="text-xs text-muted-foreground">Add another lender for comparison.</p>
                  </div>
                </div>
              </button>
            </div>
            {filteredBanks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-10 text-center text-sm text-muted-foreground">
                No banks added yet. Use <span className="font-semibold text-foreground">Add Bank</span> to begin comparison.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-background/70 p-3 md:p-4 dark:bg-black/50">
            <ComparisonMatrix banks={filteredBanks.map(bankWithLiveVehicle)} />
          </div>
        )}
      </div>

      {/* Record Details per additional bank (editable, not wired to prefile form) */}
      {banksData.length > 1 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card/95 px-4 py-3 dark:bg-black/65">
            <div className="flex items-center gap-2">
              <Icon name="FilePenLine" size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Bank-Specific Record Details</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Secondary banks can keep individual receiving and reference notes here.
            </p>
          </div>
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
