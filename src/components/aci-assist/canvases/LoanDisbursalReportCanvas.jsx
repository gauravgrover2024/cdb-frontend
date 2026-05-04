import React from "react";
import { motion } from "framer-motion";
import { Banknote, TrendingUp } from "lucide-react";
import { formatCurrency, humanize, asArray } from "../utils";
import { ModernCanvasShell, ModernStatCard, ModernTable } from "./BaseComponents";
import { rowsFrom, valueFrom } from "../canvas-utils";

export function LoanDisbursalReportCanvas({
  message,
  reportWidget,
  countWidget,
  onAction,
  footer,
}) {
  const rows = rowsFrom(reportWidget);
  const total =
    reportWidget.total ||
    reportWidget.summary?.total ||
    reportWidget.data?.total ||
    countWidget?.total ||
    countWidget?.summary?.total ||
    rows.length;
  const buckets = asArray(
    reportWidget.buckets ||
      reportWidget.data?.buckets ||
      reportWidget.summary?.buckets,
  );
  const shown = reportWidget.shown || reportWidget.data?.shown || rows.length;

  const columns = [
    { key: "customer", label: "Customer", keys: ["customerName", "customer"] },
    {
      key: "vehicle",
      label: "Vehicle",
      render: (row) =>
        [row.vehicleMake, row.vehicleModel, row.vehicleVariant]
          .filter(Boolean)
          .join(" ") || valueFrom(row, ["vehicle"], "—"),
    },
    {
      key: "bank",
      label: "Bank",
      keys: ["approval_bankName", "bankName", "bank"],
    },
    {
      key: "approved",
      label: "Approved",
      render: (row) =>
        formatCurrency(
          valueFrom(row, [
            "approval_loanAmountApproved",
            "approvedAmount",
            "loanAmount",
          ]),
        ),
    },
    {
      key: "disbursed",
      label: "Disbursed",
      render: (row) =>
        formatCurrency(
          valueFrom(row, ["approval_loanAmountDisbursed", "disbursedAmount"]),
        ),
    },
    {
      key: "status",
      label: "Status",
      keys: ["approval_status", "status", "currentStage"],
    },
  ];

  return (
    <ModernCanvasShell
      title="Loan Disbursals"
      subtitle="Approved but not yet disbursed loans"
      icon={Banknote}
      footer={footer}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModernStatCard
          icon={Banknote}
          label="Total Pending"
          value={total}
          tone="warning"
          subtext="Awaiting disbursal"
        />
        <ModernStatCard
          icon={TrendingUp}
          label="Shown"
          value={shown}
          tone="default"
          subtext={`of ${total} total`}
        />
        <ModernStatCard
          label="Complete"
          value={`${Math.round((shown / total) * 100)}%`}
          tone="success"
        />
        <ModernStatCard
          label="Actions Needed"
          value={total - shown}
          tone="danger"
        />
      </div>

      {buckets.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {buckets.slice(0, 3).map((bucket) => (
            <motion.div
              key={bucket.key || bucket.label}
              whileHover={{ y: -4 }}
              className="rounded-xl border border-slate-200/30 bg-gradient-to-br from-slate-50/50 to-slate-100/50 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {humanize(bucket.label || bucket.name || bucket.key)}
              </p>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {bucket.count ?? bucket.total ?? 0}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <ModernTable columns={columns} rows={rows} />
    </ModernCanvasShell>
  );
}
