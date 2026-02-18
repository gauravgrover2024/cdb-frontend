import React, { useState, useEffect, useMemo } from "react";
import { Modal, Table, Tag, Input, Button, Spin, Switch } from "antd";
import dayjs from "dayjs";
import Icon from "../../../../components/AppIcon";
import { loansApi } from "../../../../api/loans";

const PendencyTracker = ({ isModalOpen, handleClose, selectedCustomer, singleLoan }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await loansApi.getAll();
      setLoans(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // When opened from grid with singleLoan, use that loan only (no fetch). Otherwise load all loans (page or modal).
  const loansToUse = singleLoan ? [singleLoan] : loans;

  useEffect(() => {
    if (singleLoan) return;
    if (isModalOpen !== false) {
      loadLoans();
    }
  }, [singleLoan, isModalOpen]);

  // Define the workflow steps and their completion logic
  const WORKFLOW_STEPS = [
    {
      key: "profile",
      label: "Profile Created",
      isComplete: (loan) => !!loan.createdAt || !!loan.receivingDate,
      date: (loan) => loan.createdAt || loan.receivingDate,
    },
    {
      key: "disbursement",
      label: "Disbursement",
      isComplete: (loan) => !!(loan.approval_disbursedDate || loan.disbursement_date),
      date: (loan) => loan.approval_disbursedDate || loan.disbursement_date,
    },
    {
      key: "rc",
      label: "RC Received",
      isComplete: (loan) => !!loan.rc_received_date,
      date: (loan) => loan.rc_received_date,
    },
    {
      key: "invoice",
      label: "Invoice Received",
      isComplete: (loan) => !!loan.invoice_received_date,
      date: (loan) => loan.invoice_received_date,
    },
    {
      key: "loanNo",
      label: "Loan Number Assigned",
      isComplete: (loan) => !!loan.loan_number,
      date: (loan) =>
        loan.loan_number ? loan.approval_disbursedDate || loan.disbursement_date : null,
    },
  ];

  // Memoize helper function to get unique loan identifiers
  const getUniqueLoanKey = (loanId, customer) => `${loanId}||${customer}`;

  // Build pendency data from loansToUse (single loan from grid or full list from page)
  const pendencyData = useMemo(() => {
    const data = [];
    (loansToUse || []).forEach((loan) => {
      const loanId = loan.loanId || loan.loan_number || loan._id || "N/A";
      const customer = loan.customerName || (loan.customerId && (loan.customerId.customerName || loan.customerId.name)) || "Unknown Customer";
      if (selectedCustomer && String(customer).toLowerCase() !== String(selectedCustomer).toLowerCase()) return;
      WORKFLOW_STEPS.forEach((step) => {
        const complete = step.isComplete(loan);
        data.push({
          key: `${loanId}-${step.key}`,
          loanId,
          customer,
          step: step.label,
          completed: complete,
          date: step.date(loan),
          loanKey: getUniqueLoanKey(loanId, customer),
        });
      });
    });
    return data;
  }, [loansToUse, selectedCustomer]);

  // Filter logic
  const filteredData = useMemo(() => {
    let data = pendencyData;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      data = data.filter((item) =>
        `${item.loanId} ${item.customer}`.toLowerCase().includes(searchLower)
      );
    }
    const uniqueLoanKeys = Array.from(new Set(data.map((d) => d.loanKey)));
    if (uniqueLoanKeys.length === 1) {
      if (search.trim()) {
        return pendencyData.filter(
          (d) => d.loanKey === uniqueLoanKeys[0] && (!showOnlyPending || !d.completed)
        );
      }
      return showOnlyPending
        ? data.filter((d) => !d.completed)
        : data;
    }
    return showOnlyPending ? data.filter((d) => !d.completed) : data;
  }, [pendencyData, search, showOnlyPending]);

  // Extract common logic for finding unique loans
  const uniqueLoanKeysInFiltered = useMemo(() => {
    return Array.from(new Set(filteredData.map((d) => d.loanKey)));
  }, [filteredData]);

  const isSingleLoan = uniqueLoanKeysInFiltered.length === 1;

  // Get loan details for single loan view
  const singleLoanDetails = useMemo(() => {
    if (!isSingleLoan) return null;
    const [loanId, customer] = uniqueLoanKeysInFiltered[0].split("||");
    return { loanId, customer };
  }, [isSingleLoan, uniqueLoanKeysInFiltered]);

  // Get pending steps for summary (from all steps of single loan, not just filtered)
  const pendingStepsSummary = useMemo(() => {
    if (!isSingleLoan || !singleLoanDetails) return [];
    const allStepsForLoan = pendencyData.filter(
      (d) => d.loanKey === uniqueLoanKeysInFiltered[0]
    );
    return allStepsForLoan.filter((d) => !d.completed).map((d) => d.step);
  }, [isSingleLoan, singleLoanDetails, pendencyData, uniqueLoanKeysInFiltered]);

  const columns = [
    {
      title: "Loan",
      dataIndex: "loanId",
      render: (_, r) => (
        <div>
          <div className="font-bold text-slate-800 text-sm">{r.loanId || ""}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-tight">
            {r.customer || ""}
          </div>
        </div>
      ),
    },
    {
      title: "Step",
      dataIndex: "step",
      render: (step) => <span className="text-xs text-slate-700">{step || ""}</span>,
    },
    {
      title: "Status",
      dataIndex: "completed",
      render: (completed) =>
        completed === undefined || completed === null ? (
          <span className="text-xs"> </span>
        ) : completed ? (
          <Tag color="green" className="text-xs">
            Completed
          </Tag>
        ) : (
          <Tag color="red" className="text-xs">
            Pending
          </Tag>
        ),
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) =>
        date ? (
          dayjs(date).format("DD MMM YYYY")
        ) : (
          <span className="text-slate-400 text-xs"> </span>
        ),
    },
  ];

  const content = (
    <>
      {/* Header - only when not embedded (no singleLoan prop); grid modal has its own header */}
      {!singleLoan && (
        isSingleLoan && singleLoanDetails ? (
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800 m-0">Loan Pendency</h2>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {singleLoanDetails.customer}
              <span className="text-slate-400 mx-1">·</span>
              {singleLoanDetails.loanId}
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800 m-0">Pendency Tracker</h2>
            <p className="text-xs text-slate-400">
              Showing workflow steps and their completion status
            </p>
          </div>
        )
      )}

      {/* Search, Refresh, and Filter Controls - hide search when single loan embedded */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        {!singleLoan && (
          <Input
            placeholder="Search loan or customer..."
            variant="filled"
            prefix={<Icon name="Search" size={14} className="text-slate-400" />}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg max-w-[200px]"
          />
        )}
        {!singleLoan && (
          <Button
            icon={<Icon name="RefreshCw" size={14} />}
            onClick={loadLoans}
            type="text"
            className="text-slate-400"
          />
        )}
        <div className="ml-2 flex items-center gap-1">
          <Switch checked={showOnlyPending} onChange={setShowOnlyPending} size="small" />
          <span className="text-xs text-slate-500">Show only pending</span>
        </div>
      </div>

      {/* Pending Steps Summary - what is pending to complete this loan */}
      {isSingleLoan && pendingStepsSummary.length > 0 && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm font-medium">
          <span className="font-semibold">Pending to complete this loan:</span> {pendingStepsSummary.join(", ")}
        </div>
      )}
      {isSingleLoan && pendingStepsSummary.length === 0 && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 text-sm font-medium">
          All steps completed for this loan.
        </div>
      )}

      {/* Table or Loading State */}
      <div className="max-h-[400px] overflow-auto">
        {loading ? (
          <div className="py-10 text-center">
            <Spin />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            No workflow steps found.
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredData}
            pagination={false}
            showHeader={true}
            size="small"
            className="minimal-table"
            rowClassName="hover:bg-slate-50 cursor-default"
          />
        )}
      </div>
    </>
  );

  // When embedded in grid modal, render content only; otherwise wrap in Modal (e.g. /loans/pendency page)
  if (singleLoan) {
    return <div className="pendency-embed">{content}</div>;
  }
  return (
    <Modal
      title={null}
      open={isModalOpen !== false}
      onCancel={handleClose}
      footer={null}
      width={600}
      centered
      bodyStyle={{ padding: "20px" }}
    >
      {content}
    </Modal>
  );
};

export default PendencyTracker;
