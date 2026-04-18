import React from "react";
import { Modal, Table, Tag, Button, Empty } from "antd";
import { Download, Shield } from "lucide-react";

const toINR = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);

const InsurancePreview = ({ visible, onClose, data }) => {
  if (!data) return null;

  const receivables = Array.isArray(data.insurance_receivables)
    ? data.insurance_receivables
    : [];
  const payables = Array.isArray(data.insurance_payables)
    ? data.insurance_payables
    : [];
  const payoutReceivable = receivables.reduce(
    (sum, r) => sum + Number(r.net_payout_amount || 0),
    0,
  );
  const payoutPayable = payables.reduce(
    (sum, p) => sum + Number(p.net_payout_amount || 0),
    0,
  );
  const payoutMargin = payoutReceivable - payoutPayable;
  const payoutPercent = Number(data.payoutPercentage ?? 0);
  const subventionAmount = Number(data.subventionAmount || 0);

  // Quote columns
  const quoteColumns = [
    {
      title: "Company",
      dataIndex: "insuranceCompany",
      key: "insuranceCompany",
      width: 150,
    },
    {
      title: "Vehicle IDV",
      dataIndex: "vehicleIdv",
      key: "vehicleIdv",
      render: (val) => toINR(val),
      width: 120,
    },
    {
      title: "OD Amount",
      dataIndex: "odAmount",
      key: "odAmount",
      render: (val) => toINR(val),
      width: 120,
    },
    {
      title: "TP Amount",
      dataIndex: "thirdPartyAmount",
      key: "thirdPartyAmount",
      render: (val) => toINR(val),
      width: 120,
    },
    {
      title: "Total Premium",
      dataIndex: "totalPremium",
      key: "totalPremium",
      render: (val, record) => (
        <div>
          <strong>{toINR(val)}</strong>
          {record.isAccepted && (
            <Tag color="green" style={{ marginLeft: 8 }}>
              ACCEPTED
            </Tag>
          )}
        </div>
      ),
      width: 200,
    },
  ];

  // Documents columns
  const docColumns = [
    {
      title: "Document",
      dataIndex: "name",
      key: "name",
      width: 250,
    },
    {
      title: "Tag",
      dataIndex: "tag",
      key: "tag",
      render: (tag) => <Tag color="blue">{tag}</Tag>,
      width: 150,
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      render: (size) => `${(size / (1024 * 1024)).toFixed(2)} MB`,
      width: 100,
    },
  ];

  // Field display component - like Customer Dashboard
  const Field = ({ label, value, highlight = false }) => (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-bold ${highlight ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-slate-100"} truncate`}
      >
        {value || "—"}
      </p>
    </div>
  );

  // Section header component
  const SectionHeader = ({ icon, title }) => (
    <div className="mb-4 flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
    </div>
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Shield size={24} className="text-blue-600" />
          <span>Insurance Case Preview</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width="95%"
      style={{ maxHeight: "90vh" }}
      bodyStyle={{ maxHeight: "calc(90vh - 200px)", overflowY: "auto" }}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button key="download" type="primary" icon={<Download size={16} />}>
          Download PDF
        </Button>,
      ]}
    >
      <div className="space-y-5 py-4">
        {/* Header Section */}
        <div className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Case ID" value={data.caseId} />
            <Field label="Status" value={data.status?.toUpperCase()} />
            <Field
              label="Premium Amount"
              value={toINR(data.newTotalPremium)}
              highlight={true}
            />
            <Field
              label="Policy Status"
              value={data.newPolicyNumber ? "ACTIVE" : "DRAFT"}
            />
          </div>
        </div>

        {/* Step 1: Customer Information */}
        <section className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <SectionHeader icon="📋" title="Step 1: Customer Information" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field label="Name" value={data.customerName} />
            <Field label="Mobile" value={data.mobile} />
            <Field label="Email" value={data.email} />
            <Field label="PAN" value={data.panNumber} />
            <Field label="Address" value={data.residenceAddress} />
            <Field
              label="City / Pincode"
              value={`${data.city} - ${data.pincode}`}
            />
            <Field
              label="Nominee"
              value={`${data.nomineeName} (${data.nomineeRelationship})`}
            />
            <Field
              label="Source"
              value={[
                data.sourceOrigin,
                data.referenceName ? `(${data.referenceName})` : "",
              ]
                .filter(Boolean)
                .join(" ")
                .trim()}
            />
            {data.referencePhone ? (
              <Field label="Reference phone" value={data.referencePhone} />
            ) : null}
          </div>
        </section>

        {/* Step 2: Vehicle Details */}
        <section className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <SectionHeader icon="🚗" title="Step 2: Vehicle Details" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field
              label="Registration"
              value={data.registrationNumber}
              highlight={true}
            />
            <Field
              label="Vehicle"
              value={`${data.vehicleMake} ${data.vehicleModel}`}
            />
            <Field label="Variant" value={data.vehicleVariant} />
            <Field label="CC" value={data.cubicCapacity} />
            <Field label="Engine No." value={data.engineNumber} />
            <Field label="Chassis No." value={data.chassisNumber} />
            <Field
              label="Manufactured"
              value={`${data.manufactureMonth}/${data.manufactureYear}`}
            />
            <Field label="Type" value={data.typesOfVehicle} />
          </div>
        </section>

        {/* Step 3: Previous Policy */}
        <section className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <SectionHeader icon="📄" title="Step 3: Previous Policy" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field
              label="Insurance Company"
              value={data.previousInsuranceCompany}
            />
            <Field label="Policy Number" value={data.previousPolicyNumber} />
            <Field label="Policy Type" value={data.previousPolicyType} />
            <Field label="Duration" value={data.previousPolicyDuration} />
            <Field
              label="NCB Discount"
              value={`${data.previousNcbDiscount}%`}
            />
            <Field label="Claim Last Year" value={data.claimTakenLastYear} />
          </div>
        </section>

        {/* Step 4: Insurance Quotes */}
        <section className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <SectionHeader icon="💰" title="Step 4: Insurance Quotes" />
          {data.quotes && data.quotes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table
                columns={quoteColumns}
                dataSource={data.quotes.map((q) => ({ ...q, key: q.id }))}
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
                className="dark:bg-slate-800"
              />
            </div>
          ) : (
            <Empty description="No quotes available" />
          )}
        </section>

        {/* Step 5: Premium Breakup */}
        {data.acceptedQuote && (
          <section className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <SectionHeader icon="💰" title="Step 5: Premium Breakup" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Field
                label="Insurance Company"
                value={data.acceptedQuote.insuranceCompany}
              />
              <Field label="Zone" value={data.acceptedQuote.zone || "N/A"} />
              <Field
                label="IDV Amount"
                value={toINR(data.acceptedQuote.totalIdv)}
              />
              <Field
                label="OD Amount"
                value={toINR(data.acceptedQuote.odAmount)}
              />
              <Field
                label="TP Amount"
                value={toINR(data.acceptedQuote.thirdPartyAmount)}
              />
              <Field
                label="Add-ons Amount"
                value={toINR(data.acceptedQuote.addOnsAmount)}
              />
              <Field
                label="NCB Discount"
                value={`${data.acceptedQuote.ncbDiscount || 0}%`}
              />
              <Field
                label="Total Premium"
                value={toINR(data.acceptedQuote.totalPremium)}
                highlight={true}
              />
              <Field
                label="GST (18%)"
                value={toINR(
                  data.acceptedQuote.totalPremium -
                    data.acceptedQuote.taxableAmount || 0,
                )}
              />
            </div>
          </section>
        )}

        {/* Step 6: New Policy */}
        <section className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <SectionHeader icon="✨" title="Step 6: New Policy Details" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field label="Insurance Company" value={data.newInsuranceCompany} />
            <Field
              label="Policy Number"
              value={data.newPolicyNumber || "N/A"}
            />
            <Field label="Policy Type" value={data.newPolicyType} />
            <Field label="Duration" value={data.newInsuranceDuration} />
            <Field label="Issue Date" value={data.newIssueDate} />
            <Field label="Start Date" value={data.newPolicyStartDate} />
            <Field label="IDV Amount" value={toINR(data.newIdvAmount)} />
            <Field
              label="Total Premium"
              value={toINR(data.newTotalPremium)}
              highlight={true}
            />
            <Field label="NCB Discount" value={`${data.newNcbDiscount}%`} />
            <Field label="OD Expiry" value={data.newOdExpiryDate} />
            <Field label="TP Expiry" value={data.newTpExpiryDate} />
            <Field label="Hypothecation" value={data.newHypothecation} />
          </div>
          {data.newRemarks && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">
                Remarks
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {data.newRemarks}
              </p>
            </div>
          )}
        </section>

        {/* Step 9: Payout */}
        <section className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <SectionHeader icon="📈" title="Step 9: Payout Details" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field label="Payout Percentage" value={`${payoutPercent}%`} />
            <Field label="Subvention" value={toINR(subventionAmount)} />
            <Field label="Receivables (Net)" value={toINR(payoutReceivable)} />
            <Field label="Payables (Net)" value={toINR(payoutPayable)} />
            <Field
              label="Payout Margin"
              value={toINR(payoutMargin)}
              highlight={payoutMargin >= 0}
            />
            <Field label="Receivable Rows" value={String(receivables.length)} />
            <Field label="Payable Rows" value={String(payables.length)} />
          </div>
        </section>

        {/* Step 7: Documents */}
        <section className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <SectionHeader icon="📎" title="Step 7: Documents" />
          {data.documents && data.documents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table
                columns={docColumns}
                dataSource={data.documents.map((d) => ({ ...d, key: d.id }))}
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
                className="dark:bg-slate-800"
              />
            </div>
          ) : (
            <Empty description="No documents uploaded" />
          )}
        </section>
      </div>
    </Modal>
  );
};

export default InsurancePreview;
