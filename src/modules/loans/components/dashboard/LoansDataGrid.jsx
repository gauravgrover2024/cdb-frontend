import React, { useMemo, useState } from "react";
import Icon from "../../../../components/AppIcon";
import Button from "../../../../components/ui/Button";
import { Checkbox } from "../../../../components/ui/Checkbox";

const LoansDataGrid = ({
  loans,
  selectedLoans,
  onSelectLoan,
  onSelectAll,
  onLoanClick,
  onBulkAction,
  onDeleteLoan,
  userRole,
  loading,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: "aging",
    direction: "desc",
  });

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "approved":
      case "disbursed":
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "in progress":
        return "bg-primary/10 text-primary border-primary/20";
      case "pending":
        return "bg-warning/10 text-warning border-warning/20";
      case "rejected":
        return "bg-error/10 text-error border-error/20";
      case "on hold":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getAgingColor = (days) => {
    if (days <= 7) return "text-success";
    if (days <= 15) return "text-primary";
    if (days <= 30) return "text-warning";
    return "text-error";
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key && prev?.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedLoans = useMemo(() => {
    return [...(loans || [])].sort((a, b) => {
      if (sortConfig?.key === "aging") {
        return sortConfig?.direction === "asc"
          ? (a?.aging || 0) - (b?.aging || 0)
          : (b?.aging || 0) - (a?.aging || 0);
      }
      if (sortConfig?.key === "loanAmount") {
        const aAmount = a?.loanAmount || 0;
        const bAmount = b?.loanAmount || 0;
        return sortConfig?.direction === "asc"
          ? aAmount - bAmount
          : bAmount - aAmount;
      }
      return 0;
    });
  }, [loans, sortConfig]);

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "Cash Sale";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getStageLabel = (stage) => {
    const stageMap = {
      profile: "Customer Profile",
      prefile: "Pre-File",
      approval: "Loan Approval",
      postfile: "Post-File",
      delivery: "Vehicle Delivery",
    };
    return stageMap[stage] || stage;
  };

  const allChecked =
    selectedLoans?.length === loans?.length && loans?.length > 0;
  const someChecked =
    selectedLoans?.length > 0 && selectedLoans?.length < loans?.length;

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl border border-border overflow-hidden">
      {/* Top bar */}
      <div className="px-4 py-3 md:px-5 md:py-4 border-b border-border bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center border border-border">
              <Icon name="Table2" size={16} className="text-foreground" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-semibold text-foreground">
                  Cases
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                  {loans?.length || 0}
                </span>
              </div>

              {selectedLoans?.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {selectedLoans.length} selected
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Click any row to preview
                </span>
              )}
            </div>
          </div>

          {/* Bulk actions */}
          {selectedLoans?.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                iconName="FileDown"
                onClick={() => onBulkAction("export")}
              >
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                iconName="Send"
                onClick={() => onBulkAction("dispatch")}
              >
                Dispatch
              </Button>

              {userRole === "admin" && (
                <Button
                  variant="default"
                  size="sm"
                  iconName="CheckCircle2"
                  onClick={() => onBulkAction("approve")}
                >
                  Approve
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur border-b border-border">
            <tr>
              <th className="p-3 text-left w-[44px]">
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={(e) => onSelectAll(e?.target?.checked)}
                />
              </th>

              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Loan
              </th>

              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Customer
              </th>

              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Vehicle
              </th>

              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Bank
              </th>

              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Stage
              </th>

              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("aging")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Aging
                  <Icon
                    name={
                      sortConfig?.key === "aging" &&
                      sortConfig?.direction === "asc"
                        ? "ChevronUp"
                        : "ChevronDown"
                    }
                    size={14}
                  />
                </button>
              </th>

              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("loanAmount")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Amount
                  <Icon
                    name={
                      sortConfig?.key === "loanAmount" &&
                      sortConfig?.direction === "asc"
                        ? "ChevronUp"
                        : "ChevronDown"
                    }
                    size={14}
                  />
                </button>
              </th>

              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>

              <th className="p-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-[140px]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedLoans?.map((loan) => {
              const loanKey = loan?.loanId || loan?._id;

              return (
                <tr
                  key={loanKey}
                  className="border-b border-border hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => onLoanClick(loan)}
                >
                  <td className="p-3" onClick={(e) => e?.stopPropagation()}>
                    <Checkbox
                      checked={selectedLoans?.includes(loan?.loanId)}
                      onChange={(e) =>
                        onSelectLoan(loan?.loanId, e?.target?.checked)
                      }
                    />
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {loan?.loanId || "-"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {loan?.typeOfLoan || loan?.loanType || "—"}
                        </span>
                      </div>

                      {loan?.priority === "high" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-error/10 text-error border border-error/20">
                          <Icon name="AlertCircle" size={12} />
                          High
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {loan?.customerName || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {loan?.primaryMobile || "—"}
                      </span>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="text-foreground">
                        {(loan?.vehicleMake || "") +
                          " " +
                          (loan?.vehicleModel || "")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {loan?.vehicleVariant || "—"}
                      </span>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className="text-foreground">
                      {loan?.bankName || loan?.approval_bankName || "—"}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="text-foreground">
                      {getStageLabel(loan?.currentStage)}
                    </span>
                  </td>

                  <td className="p-3">
                    <span
                      className={`font-semibold ${getAgingColor(
                        loan?.aging || 0
                      )}`}
                    >
                      {loan?.aging || 0}d
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="font-semibold text-foreground whitespace-nowrap">
                      {formatCurrency(loan?.loanAmount)}
                    </span>
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(
                        loan?.status
                      )}`}
                    >
                      <Icon name="Circle" size={6} />
                      {loan?.status || "—"}
                    </span>
                  </td>

                  <td className="p-3" onClick={(e) => e?.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Eye"
                        onClick={() => onLoanClick(loan)}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoanClick(loan, "edit");
                        }}
                      />

                      {userRole === "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="Trash2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLoan?.(loan);
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Loading / Empty */}
        {loading && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Loading loans...
          </div>
        )}

        {!loading && loans?.length === 0 && (
          <div className="text-center py-14">
            <Icon
              name="FileText"
              size={46}
              className="text-muted-foreground mx-auto mb-4"
            />
            <p className="text-base font-semibold text-foreground">
              No loans found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new loan to get started
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold">{sortedLoans?.length}</span>{" "}
            loan(s)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconName="ChevronLeft" disabled>
              Previous
            </Button>
            <Button variant="default" size="sm">
              1
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoansDataGrid;
