import React, { useState } from "react";
import { motion } from "framer-motion";
import { WalletCards, Banknote, Car, BadgeCheck } from "lucide-react";
import { formatCurrency, formatDate, asArray } from "../utils";
import { ModernCanvasShell, ModernStatCard, ModernTable } from "./BaseComponents";
import { valueFrom, numberFrom } from "../canvas-utils";

export function LoanBusinessReportCanvas({ message, widget, footer }) {
  const summary = widget.summary || widget.data?.summary || {};
  const sections = asArray(widget.sections || widget.data?.sections);
  const recordsBySection =
    widget.recordsBySection || widget.data?.recordsBySection || {};
  const [activeSection, setActiveSection] = useState(
    sections[0]?.key || sections[0]?.id || Object.keys(recordsBySection)[0],
  );

  const totalBusiness =
    summary.totalBusinessAmount ??
    numberFrom(summary.loanDisbursedAmount) +
      numberFrom(summary.cashCarBookValue) +
      numberFrom(summary.insurancePremiumAmount);

  const activeRecords = asArray(
    recordsBySection[activeSection] ||
      sections.find((section) => (section.key || section.id) === activeSection)
        ?.records ||
      widget.records ||
      widget.rows,
  );

  const columns = [
    { key: "customer", label: "Customer", keys: ["customerName", "customer"] },
    {
      key: "vehicle",
      label: "Vehicle",
      render: (row) =>
        [
          row.vehicleMake,
          row.vehicleModel,
          row.vehicleVariant,
          row.make,
          row.model,
        ]
          .filter(Boolean)
          .join(" ") || "—",
    },
    {
      key: "date",
      label: "Date",
      render: (row) =>
        formatDate(
          valueFrom(row, [
            "businessDate",
            "disbursedDate",
            "deliveryDate",
            "newIssueDate",
            "updatedAt",
          ]),
        ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) =>
        formatCurrency(
          valueFrom(row, [
            "amount",
            "businessAmount",
            "loanAmount",
            "premium",
            "bookValue",
          ]),
        ),
    },
  ];

  return (
    <ModernCanvasShell
      title="Business Report"
      subtitle="Summary of all business transactions this month"
      icon={WalletCards}
      footer={footer}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModernStatCard
          icon={WalletCards}
          label="Total Business"
          value={formatCurrency(totalBusiness)}
          tone="success"
        />
        <ModernStatCard
          icon={Banknote}
          label="Loans"
          value={formatCurrency(summary.loanDisbursedAmount || 0)}
          tone="default"
        />
        <ModernStatCard
          icon={Car}
          label="Cash Cars"
          value={formatCurrency(summary.cashCarBookValue || 0)}
          tone="warning"
        />
        <ModernStatCard
          icon={BadgeCheck}
          label="Insurance"
          value={formatCurrency(summary.insurancePremiumAmount || 0)}
          tone="purple"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const key = section.key || section.id;
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              onClick={() => setActiveSection(key)}
              className={`
                px-6 py-2.5 rounded-xl font-bold transition-all
                ${
                  activeSection === key
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/50"
                    : "bg-white/50 border border-slate-200/30 text-slate-700 hover:bg-white"
                }
              `}
            >
              {section.title || section.label}
            </motion.button>
          );
        })}
      </div>

      <ModernTable columns={columns} rows={activeRecords} />
    </ModernCanvasShell>
  );
}
