import React, { useState } from "react";
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
  userRole,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: "aging",
    direction: "desc",
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-success/10 text-success border-success/20";
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

  const sortedLoans = [...loans]?.sort((a, b) => {
    if (sortConfig?.key === "aging") {
      return sortConfig?.direction === "asc"
        ? a?.aging - b?.aging
        : b?.aging - a?.aging;
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

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "Cash Sale";
    return `₹${amount?.toLocaleString("en-IN")}`;
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

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              Loans ({loans?.length})
            </h2>
            {selectedLoans?.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedLoans?.length} selected
              </span>
            )}
          </div>

          {selectedLoans?.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                iconName="FileText"
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

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-muted z-10">
            <tr>
              <th className="p-3 md:p-4 text-left">
                <Checkbox
                  checked={
                    selectedLoans?.length === loans?.length && loans?.length > 0
                  }
                  indeterminate={
                    selectedLoans?.length > 0 &&
                    selectedLoans?.length < loans?.length
                  }
                  onChange={(e) => onSelectAll(e?.target?.checked)}
                />
              </th>
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Loan ID
              </th>
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer
              </th>
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Vehicle
              </th>
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Loan Type
              </th>
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Bank
              </th>
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Stage
              </th>
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("aging")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
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
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("loanAmount")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
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
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </th>
              <th className="p-3 md:p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLoans?.map((loan) => (
              <tr
                key={loan?.id}
                className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onLoanClick(loan)}
              >
                <td
                  className="p-3 md:p-4"
                  onClick={(e) => e?.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedLoans?.includes(loan?.id)}
                    onChange={(e) => onSelectLoan(loan?.id, e?.target?.checked)}
                  />
                </td>
                <td className="p-3 md:p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground data-text">
                      {loan?.loanId}
                    </span>
                    {loan?.priority === "high" && (
                      <Icon
                        name="AlertCircle"
                        size={14}
                        className="text-error"
                      />
                    )}
                  </div>
                </td>
                <td className="p-3 md:p-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {loan?.customerName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {loan?.primaryMobile}
                    </span>
                  </div>
                </td>
                <td className="p-3 md:p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">
                      {loan?.vehicleMake} {loan?.vehicleModel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {loan?.vehicleVariant}
                    </span>
                  </div>
                </td>
                <td className="p-3 md:p-4">
                  <span className="text-sm text-foreground">
                    {loan?.typeOfLoan || loan?.loanType}
                  </span>
                </td>
                <td className="p-3 md:p-4">
                  <span className="text-sm text-foreground">
                    {loan?.bankName || loan?.approval_bankName || "-"}
                  </span>
                </td>
                <td className="p-3 md:p-4">
                  <span className="text-sm text-foreground">
                    {getStageLabel(loan?.currentStage)}
                  </span>
                </td>
                <td className="p-3 md:p-4">
                  <span
                    className={`text-sm font-medium data-text ${getAgingColor(
                      loan?.aging
                    )}`}
                  >
                    {loan?.aging} days
                  </span>
                </td>
                <td className="p-3 md:p-4">
                  <span className="text-sm font-medium text-foreground data-text whitespace-nowrap">
                    {formatCurrency(loan?.loanAmount)}
                  </span>
                </td>
                <td className="p-3 md:p-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                      loan?.status
                    )}`}
                  >
                    <Icon name="Circle" size={6} />
                    {loan?.status}
                  </span>
                </td>
                <td
                  className="p-3 md:p-4"
                  onClick={(e) => e?.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {loans?.length === 0 && (
          <div className="text-center py-12">
            <Icon
              name="FileText"
              size={48}
              className="text-muted-foreground mx-auto mb-4"
            />
            <p className="text-base font-medium text-foreground">
              No loans found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new loan to get started
            </p>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {sortedLoans?.length} of {loans?.length} loans
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconName="ChevronLeft" disabled>
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="default" size="sm">
                1
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoansDataGrid;
