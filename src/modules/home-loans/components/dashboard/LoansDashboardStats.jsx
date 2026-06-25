import React, { useMemo } from "react";
import Icon from "../../../../components/AppIcon";

const LoansDashboardStats = ({ loans, loading, onStatClick }) => {
  const stats = useMemo(() => {
    const toText = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();
    const parseAmount = (value) => {
      if (value === null || value === undefined || value === "") return 0;
      if (typeof value === "number") return Number.isFinite(value) ? value : 0;
      const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const isCashCase = (loan) => {
      if (loan?.isCashCase === true) return true;
      const loanType = toText(loan?.typeOfLoan || loan?.loanType || loan?.caseType);
      const financed = toText(loan?.isFinanced);
      const bankText = toText(
        loan?.approval_bankName || loan?.postfile_bankName || loan?.bankName,
      );
      if (bankText.includes("cash sale bank")) return true;
      if (loanType.includes("cash-in") || loanType.includes("cash in")) return false;
      if (financed === "no" || financed === "false") return !loanType.includes("refinance");
      if (!loanType) return false;
      return (
        loanType === "cash" ||
        loanType.includes("cash car") ||
        loanType.includes("cash sale")
      );
    };
    const isDisbursed = (loan) => {
      const statusText = toText(loan?.status || loan?.approval_status || "");
      const disburseStatusText = toText(
        loan?.disburse_status || loan?.disbursementStatus || loan?.disbursement_status || "",
      );
      const hasDisburseAmount =
        parseAmount(
          loan?.disburse_amount ?? loan?.disburseAmount ?? 0,
        ) > 0;
      const hasDisburseDate = Boolean(
        loan?.disbursement_date ||
          loan?.approval_disbursedDate ||
          loan?.disburse_date ||
          loan?.disbursedDate ||
          loan?.disbursementDate,
      );
      return (
        statusText.includes("disburs") ||
        disburseStatusText.includes("disburs") ||
        hasDisburseAmount ||
        hasDisburseDate
      );
    };
    const isApproved = (loan) => {
      const statusText = toText(loan?.status || loan?.approval_status || "");
      return (
        statusText.includes("approv") ||
        parseAmount(loan?.approval_loanAmountApproved) > 0 ||
        Boolean(loan?.approval_approvalDate)
      );
    };

    const total = loans.length;

    const pending = loans.filter(
      (l) =>
        toText(l.currentStage) === "approval" &&
        !isApproved(l) &&
        !isDisbursed(l),
    ).length;

    const pendingDisbursal = loans.filter(
      (l) => isApproved(l) && !isDisbursed(l) && !isCashCase(l),
    ).length;

    const disbursed = loans.filter((l) => isDisbursed(l) && !isCashCase(l)).length;
    const cashCars = loans.filter((l) => isCashCase(l)).length;

    const bookValue = loans.reduce((sum, loan) => {
      if (isCashCase(loan)) {
        return (
          sum +
          parseAmount(
            loan?.exShowroom ?? loan?.exShowroomPrice ?? loan?.ex_showroom ?? 0,
          )
        );
      }
      if (isDisbursed(loan)) {
        return (
          sum +
          parseAmount(
            loan?.disburse_amount ??
              loan?.disburseAmount ??
              loan?.approval_loanAmountDisbursed ??
              0,
          )
        );
      }
      return sum;
    }, 0);

    return [
      {
        id: "total",
        label: "Total Cases",
        value: total,
        icon: "FileText",
        color: "text-blue-600",
        bg: "bg-blue-50",
        borderColor: "border-blue-100",
      },
      {
        id: "pending",
        label: "Pending Approval",
        value: pending,
        icon: "Clock",
        color: "text-amber-600",
        bg: "bg-amber-50",
        borderColor: "border-amber-100",
      },
      {
        id: "pendingDisbursal",
        label: "Pending Disbursal",
        value: pendingDisbursal,
        icon: "CheckCircle2",
        color: "text-green-600",
        bg: "bg-green-50",
        borderColor: "border-green-100",
      },
      {
        id: "disbursed",
        label: "Disbursed",
        value: disbursed,
        icon: "TrendingUp",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        borderColor: "border-emerald-100",
      },
      {
        id: "cashCars",
        label: "Cash Cars",
        value: cashCars,
        icon: "CarFront",
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        borderColor: "border-cyan-100",
      },
      {
        id: "bookValue",
        label: "Book Value",
        value: `\u20b9${bookValue.toLocaleString("en-IN")}`,
        icon: "IndianRupee",
        color: "text-violet-600",
        bg: "bg-violet-50",
        borderColor: "border-violet-100",
      },
    ];
  }, [loans]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      {stats.map((s) => (
        <div
          key={s.id}
          onClick={() => onStatClick?.(s.id)}
          className={`bg-card border rounded-2xl p-4 cursor-pointer hover:shadow-md transition ${s.borderColor}`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${s.bg} ${s.borderColor}`}>
                <Icon name={s.icon} size={18} className={s.color} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-semibold">
                  {loading ? "—" : s.value}
                </div>
              </div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-gray-400" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoansDashboardStats;
