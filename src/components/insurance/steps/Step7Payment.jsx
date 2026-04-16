import React from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from "antd";

const { Text } = Typography;

const Step7Payment = ({
  formData,
  setField,
  setFormData,
  paymentForm,
  setPaymentForm,
  paymentHistory,
  setPaymentHistory,
  schedulePersist,
}) => {
  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: Payment Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">Payment Summary</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <Text type="secondary" className="text-xs">Final Premium</Text>
              <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                ₹{(formData.newTotalPremium || 0).toLocaleString("en-IN")}
              </div>
              <Text type="secondary" className="text-[10px]">From accepted quote</Text>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
              <Text type="secondary" className="text-xs">Subvention</Text>
              <div className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">
                ₹{(formData.subventionAmount || 0).toLocaleString("en-IN")}
              </div>
              <Button
                size="small"
                type="link"
                onClick={() => {
                  const amount = prompt("Enter subvention amount:", formData.subventionAmount || 0);
                  if (amount !== null) setField("subventionAmount", Number(amount));
                }}
                className="p-0 text-[10px]"
              >
                + Add Subvention
              </Button>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
              <Text type="secondary" className="text-xs">Net Premium</Text>
              <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                ₹{Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0)).toLocaleString("en-IN")}
              </div>
              <Text type="secondary" className="text-[10px]">After subvention</Text>
            </div>
          </Col>
        </Row>

        <Divider />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <Text strong>Payment Progress (After Subvention)</Text>
          <div className="mt-2 text-2xl font-bold">
            {(() => {
              const netPremium = Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0));
              const totalPaid = (formData.customerPaymentReceived || 0);
              const progress = netPremium > 0 ? (totalPaid / netPremium) * 100 : 0;
              return `${progress.toFixed(1)}%`;
            })()}
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${(() => {
                  const netPremium = Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0));
                  const totalPaid = (formData.customerPaymentReceived || 0);
                  const progress = netPremium > 0 ? (totalPaid / netPremium) * 100 : 0;
                  return Math.min(100, progress);
                })()}%`,
              }}
            />
          </div>
          <Text type="secondary" className="mt-1 text-xs">
            Progress: ₹{(formData.customerPaymentReceived || 0).toLocaleString("en-IN")} / ₹
            {Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0)).toLocaleString("en-IN")}
          </Text>
        </div>
      </div>

      {/* Section 2: In House Payment */}
      <div className="rounded-xl border border-amber-200/50 bg-amber-50/20 p-6 dark:border-amber-900/30 dark:bg-amber-900/10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600/70">In House Payment</h3>
          <Text type="secondary" className="text-[11px] uppercase tracking-wider">AC to Insurance Co</Text>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Text strong>Amount (₹) *</Text>
              <InputNumber
                min={0}
                value={paymentForm.paymentType === "inhouse" ? paymentForm.amount : 0}
                onChange={(v) => setPaymentForm((p) => ({ ...p, amount: v, paymentType: "inhouse" }))}
                style={{ width: "100%", marginTop: 6 }}
                placeholder="₹ 0.00"
                prefix="₹"
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Payment Mode *</Text>
              <Select
                value={paymentForm.paymentType === "inhouse" ? paymentForm.paymentMode : "Cash"}
                onChange={(v) => setPaymentForm((p) => ({ ...p, paymentMode: v, paymentType: "inhouse" }))}
                style={{ width: "100%", marginTop: 6 }}
                placeholder="Mode"
                options={[
                  { label: "Cash", value: "Cash" },
                  { label: "Cheque", value: "Cheque" },
                  { label: "NEFT", value: "NEFT" },
                  { label: "RTGS", value: "RTGS" },
                  { label: "UPI", value: "UPI" },
                  { label: "Card", value: "Card" },
                  { label: "Other", value: "Other" },
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Payment Date *</Text>
              <Input
                type="date"
                value={paymentForm.paymentType === "inhouse" ? paymentForm.date : new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value, paymentType: "inhouse" }))}
                style={{ marginTop: 6 }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Transaction ID</Text>
              <Input
                value={paymentForm.paymentType === "inhouse" ? paymentForm.transactionRef : ""}
                onChange={(e) => setPaymentForm((p) => ({ ...p, transactionRef: e.target.value, paymentType: "inhouse" }))}
                style={{ marginTop: 6 }}
                placeholder="Ref #"
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Bank Name</Text>
              <Input
                value={paymentForm.paymentType === "inhouse" ? (paymentForm.bankName || "") : ""}
                onChange={(e) => setPaymentForm((p) => ({ ...p, bankName: e.target.value, paymentType: "inhouse" }))}
                style={{ marginTop: 6 }}
                placeholder="Bank Name"
              />
            </Col>
          </Row>
        </div>
      </div>

      {/* Section 3: Customer Payment */}
      <div className="rounded-xl border border-sky-200/50 bg-sky-50/20 p-6 dark:border-sky-900/30 dark:bg-sky-900/10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-600/70">Customer Payment</h3>
          <Text type="secondary" className="text-[11px] uppercase tracking-wider">Track customer-side payments</Text>
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Text strong>Payment Amount (₹)</Text>
              <InputNumber
                min={0}
                value={paymentForm.paymentType === "customer" ? paymentForm.amount : 0}
                onChange={(v) => setPaymentForm((p) => ({ ...p, amount: v, paymentType: "customer" }))}
                style={{ width: "100%", marginTop: 6 }}
                placeholder="0"
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Payment Mode</Text>
              <Select
                value={paymentForm.paymentType === "customer" ? paymentForm.paymentMode : undefined}
                onChange={(v) => setPaymentForm((p) => ({ ...p, paymentMode: v, paymentType: "customer" }))}
                style={{ width: "100%", marginTop: 6 }}
                placeholder="Mode"
                options={[
                  { label: "Cash", value: "Cash" },
                  { label: "Cheque", value: "Cheque" },
                  { label: "NEFT", value: "NEFT" },
                  { label: "RTGS", value: "RTGS" },
                  { label: "UPI", value: "UPI" },
                  { label: "Card", value: "Card" },
                  { label: "Other", value: "Other" },
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Payment Date</Text>
              <Input
                type="date"
                value={paymentForm.paymentType === "customer" ? paymentForm.date : ""}
                onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value, paymentType: "customer" }))}
                style={{ marginTop: 6 }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Transaction ID</Text>
              <Input
                value={paymentForm.paymentType === "customer" ? paymentForm.transactionRef : ""}
                onChange={(e) => setPaymentForm((p) => ({ ...p, transactionRef: e.target.value, paymentType: "customer" }))}
                style={{ marginTop: 6 }}
                placeholder="Ref #"
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Bank Name</Text>
              <Input
                value={paymentForm.paymentType === "customer" ? (paymentForm.bankName || "") : ""}
                onChange={(e) => setPaymentForm((p) => ({ ...p, bankName: e.target.value, paymentType: "customer" }))}
                style={{ marginTop: 6 }}
                placeholder="Bank Name"
              />
            </Col>
          </Row>
        </div>

        <Button
          type="primary"
          block
          className="mt-4"
          onClick={() => {
            if (!paymentForm.amount || paymentForm.amount <= 0) {
              message.error("Please enter a valid amount");
              return;
            }
            const newPayment = {
              _id: `payment-${Date.now()}`,
              ...paymentForm,
              amount: Number(paymentForm.amount),
              recordedAt: new Date().toISOString(),
            };
            setPaymentHistory((prev) => [...prev, newPayment]);

            if (paymentForm.paymentType === "customer") {
              setFormData((prev) => ({
                ...prev,
                customerPaymentReceived: Number(prev.customerPaymentReceived || 0) + Number(paymentForm.amount),
              }));
            } else {
              setFormData((prev) => ({
                ...prev,
                inhousePaymentReceived: Number(prev.inhousePaymentReceived || 0) + Number(paymentForm.amount),
              }));
            }

            setPaymentForm({
              amount: 0,
              date: new Date().toISOString().slice(0, 10),
              paymentType: "inhouse",
              paymentMode: "Cash",
              transactionRef: "",
              remarks: "",
              bankName: "",
            });
            // schedulePersist(250);
            message.success("Payment added to ledger");
          }}
        >
          Add Payment to Ledger
        </Button>
      </div>

      {/* Section 4: Ledger */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Payment Ledger</h3>
            <Text type="secondary" className="text-xs italic">({paymentHistory.length} records)</Text>
          </div>
          {(() => {
            const netPremium = Math.max(0, (formData.newTotalPremium || 0) - (formData.subventionAmount || 0));
            const totalPaid = formData.customerPaymentReceived || 0;
            return totalPaid >= netPremium && netPremium > 0 ? (
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                Fully Paid
              </div>
            ) : null;
          })()}
        </div>
        {paymentHistory.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text type="secondary">No payment records found</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  Add payments using the form above
                </Text>
              </div>
            }
          />
        ) : (
          <Table
            size="small"
            dataSource={paymentHistory.map((p, idx) => ({ key: p._id || idx, ...p }))}
            pagination={false}
            columns={[
              {
                title: "Date",
                dataIndex: "date",
                width: 110,
                render: (d) => (d ? dayjs(d).format("DD MMM YYYY") : "—"),
              },
              {
                title: "Type",
                dataIndex: "paymentType",
                width: 100,
                render: (t) => (
                  <span className={t === "customer" ? "text-sky-600" : "text-amber-600"}>
                    {t === "customer" ? "Customer" : "In-house"}
                  </span>
                ),
              },
              {
                title: "Amount",
                dataIndex: "amount",
                width: 120,
                render: (a) => <span className="font-semibold">₹{a.toLocaleString("en-IN")}</span>,
              },
              {
                title: "Mode",
                dataIndex: "paymentMode",
                width: 90,
              },
              {
                title: "Transaction Ref",
                dataIndex: "transactionRef",
                width: 140,
              },
              {
                title: "Bank",
                dataIndex: "bankName",
                width: 120,
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default Step7Payment;
