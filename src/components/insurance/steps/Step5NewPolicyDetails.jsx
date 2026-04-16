import React from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
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

const Step5NewPolicyDetails = ({
  formData,
  setField,
  handleChange,
  handleNewPolicyStartOrDuration,
  acceptedQuote,
  durationOptions,
  paymentHistory,
  setPaymentModalVisible,
  insuranceDbId,
  toINR,
  insuranceApi,
}) => {
  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: Vehicle Pricing */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
        <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">Vehicle Pricing Info</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text strong>Ex-Showroom Price (₹) *</Text>
            <InputNumber
              min={0}
              value={Number(formData.exShowroomPrice || 0)}
              onChange={(v) => setField("exShowroomPrice", Number(v || 0))}
              style={{ width: "100%", marginTop: 6 }}
              placeholder="0.00"
            />
          </Col>
          {formData.vehicleType === "New Car" ? (
            <Col xs={24} md={8}>
              <Text strong>Date of Sale *</Text>
              <Input
                type="date"
                value={formData.dateOfSale}
                onChange={handleChange("dateOfSale")}
                style={{ marginTop: 6 }}
              />
            </Col>
          ) : (
            <>
              <Col xs={24} md={8}>
                <Text strong>Date of Purchase *</Text>
                <Input
                  type="date"
                  value={formData.dateOfPurchase}
                  onChange={handleChange("dateOfPurchase")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={8}>
                <Text strong>Current Odometer Reading *</Text>
                <InputNumber
                  min={0}
                  value={Number(formData.odometerReading || 0)}
                  onChange={(v) => setField("odometerReading", Number(v || 0))}
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder="Kms"
                />
              </Col>
            </>
          )}
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Text strong>Insurance Company *</Text>
          <Input
            value={formData.newInsuranceCompany}
            onChange={handleChange("newInsuranceCompany")}
            style={{ marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Policy Type *</Text>
          <Select
            value={formData.newPolicyType}
            onChange={(v) => {
              setField("newPolicyType", v);
              setField("newInsuranceDuration", "");
              setField("newOdExpiryDate", "");
              setField("newTpExpiryDate", "");
            }}
            style={{ width: "100%", marginTop: 6 }}
            options={[
              { label: "Comprehensive", value: "Comprehensive" },
              { label: "Stand Alone OD", value: "Stand Alone OD" },
              { label: "Third Party", value: "Third Party" },
            ]}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Policy Number</Text>
          <Input
            value={formData.newPolicyNumber}
            onChange={handleChange("newPolicyNumber")}
            style={{ marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Issue Date *</Text>
          <Input
            type="date"
            value={formData.newIssueDate}
            onChange={handleChange("newIssueDate")}
            style={{ marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Start Date *</Text>
          <Input
            type="date"
            value={formData.newPolicyStartDate}
            onChange={(e) =>
              handleNewPolicyStartOrDuration({
                newPolicyStartDate: e.target.value,
              })
            }
            style={{ marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Insurance Duration *</Text>
          <Select
            value={formData.newInsuranceDuration}
            onChange={(v) =>
              handleNewPolicyStartOrDuration({
                newInsuranceDuration: v,
              })
            }
            style={{ width: "100%", marginTop: 6 }}
            options={
              formData.newPolicyType === "Comprehensive"
                ? [
                    { label: "1yr OD + 1yr TP", value: "1yr OD + 1yr TP" },
                    { label: "1yr OD + 3yr TP", value: "1yr OD + 3yr TP" },
                    { label: "2yr OD + 3yr TP", value: "2yr OD + 3yr TP" },
                    { label: "3yr OD + 3yr TP", value: "3yr OD + 3yr TP" },
                  ]
                : formData.newPolicyType === "Stand Alone OD"
                  ? [
                      { label: "1 Year", value: "1 Year" },
                      { label: "2 Years", value: "2 Years" },
                      { label: "3 Years", value: "3 Years" },
                    ]
                  : formData.newPolicyType === "Third Party"
                    ? [
                        { label: "1 Year", value: "1 Year" },
                        { label: "2 Years", value: "2 Years" },
                        { label: "3 Years", value: "3 Years" },
                      ]
                    : durationOptions.map((d) => ({
                        label: d,
                        value: d,
                      }))
            }
            placeholder="Duration"
            disabled={!formData.newPolicyType}
          />
        </Col>

        {formData.newPolicyType === "Comprehensive" && (
          <>
            <Col xs={24} md={8}>
              <Text strong>OD Expiry Date *</Text>
              <Input
                type="date"
                value={formData.newOdExpiryDate}
                onChange={handleChange("newOdExpiryDate")}
                style={{ marginTop: 6 }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>TP Expiry Date *</Text>
              <Input
                type="date"
                value={formData.newTpExpiryDate}
                onChange={handleChange("newTpExpiryDate")}
                style={{ marginTop: 6 }}
              />
            </Col>
          </>
        )}

        {formData.newPolicyType === "Stand Alone OD" && (
          <Col xs={24} md={8}>
            <Text strong>OD Expiry Date *</Text>
            <Input
              type="date"
              value={formData.newOdExpiryDate}
              onChange={handleChange("newOdExpiryDate")}
              style={{ marginTop: 6 }}
            />
          </Col>
        )}

        {formData.newPolicyType === "Third Party" && (
          <Col xs={24} md={8}>
            <Text strong>TP Expiry Date *</Text>
            <Input
              type="date"
              value={formData.newTpExpiryDate}
              onChange={handleChange("newTpExpiryDate")}
              style={{ marginTop: 6 }}
            />
          </Col>
        )}
        <Col xs={24} md={8}>
          <Text strong>NCB Discount (%)</Text>
          <InputNumber
            min={0}
            max={100}
            value={Number(formData.newNcbDiscount || 0)}
            onChange={(v) => setField("newNcbDiscount", Number(v || 0))}
            style={{ width: "100%", marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>IDV Amount (₹) *</Text>
          <InputNumber
            min={0}
            value={Number(formData.newIdvAmount || 0)}
            onChange={(v) => setField("newIdvAmount", Number(v || 0))}
            style={{ width: "100%", marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Total Premium (₹) *</Text>
          <InputNumber
            min={0}
            value={Number(formData.newTotalPremium || 0)}
            onChange={(v) =>
              setField("newTotalPremium", Number(v || 0))
            }
            style={{ width: "100%", marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Hypothecation</Text>
          <Select
            value={formData.newHypothecation}
            onChange={(v) => setField("newHypothecation", v)}
            style={{ width: "100%", marginTop: 6 }}
            options={[
              { label: "Not Applicable", value: "Not Applicable" },
              { label: "HDFC Bank", value: "HDFC Bank" },
              { label: "ICICI Bank", value: "ICICI Bank" },
              { label: "SBI", value: "SBI" },
            ]}
          />
        </Col>
        <Col xs={24} md={16}>
          <Text strong>Remarks</Text>
          <Input.TextArea
            rows={1}
            value={formData.newRemarks}
            onChange={handleChange("newRemarks")}
            style={{ marginTop: 6 }}
            placeholder="Notes..."
          />
        </Col>
      </Row>

      {/* Section 2: Extended Warranty */}
      <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 p-6 dark:border-amber-900/30 dark:bg-amber-900/10">
        <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/50">Extended Warranty Details</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text strong>EW Commencement Date</Text>
            <Input
              type="date"
              value={formData.ewCommencementDate}
              onChange={handleChange("ewCommencementDate")}
              style={{ marginTop: 6 }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>EW Expiry Date</Text>
            <Input
              type="date"
              value={formData.ewExpiryDate}
              onChange={handleChange("ewExpiryDate")}
              style={{ marginTop: 6 }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Kms Coverage</Text>
            <InputNumber
              min={0}
              value={Number(formData.kmsCoverage || 0)}
              onChange={(v) => setField("kmsCoverage", Number(v || 0))}
              style={{ width: "100%", marginTop: 6 }}
              placeholder="e.g. 100000"
            />
          </Col>
        </Row>
      </div>

      {/* Section 3: Payment Tracking */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Payment Tracking</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Text strong className="text-[11px] uppercase text-slate-500">Cust. Expected (₹)</Text>
            <InputNumber
              min={0}
              value={Number(formData.customerPaymentExpected || 0)}
              onChange={(v) =>
                setField("customerPaymentExpected", Number(v || 0))
              }
              style={{ width: "100%", marginTop: 6 }}
              placeholder="0"
            />
          </Col>
          <Col xs={24} md={6}>
            <Text strong className="text-[11px] uppercase text-slate-500">Cust. Received (₹)</Text>
            <InputNumber
              min={0}
              value={Number(formData.customerPaymentReceived || 0)}
              onChange={(v) =>
                setField("customerPaymentReceived", Number(v || 0))
              }
              style={{ width: "100%", marginTop: 6 }}
              placeholder="0"
            />
          </Col>
          <Col xs={24} md={6}>
            <Text strong className="text-[11px] uppercase text-slate-500">In-house Expected (₹)</Text>
            <InputNumber
              min={0}
              value={Number(formData.inhousePaymentExpected || 0)}
              onChange={(v) =>
                setField("inhousePaymentExpected", Number(v || 0))
              }
              style={{ width: "100%", marginTop: 6 }}
              placeholder="0"
            />
          </Col>
          <Col xs={24} md={6}>
            <Text strong className="text-[11px] uppercase text-slate-500">In-house Received (₹)</Text>
            <InputNumber
              min={0}
              value={Number(formData.inhousePaymentReceived || 0)}
              onChange={(v) =>
                setField("inhousePaymentReceived", Number(v || 0))
              }
              style={{ width: "100%", marginTop: 6 }}
              placeholder="0"
            />
          </Col>
        </Row>
        {paymentHistory.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Payment History ({paymentHistory.length})
            </Text>
            <Table
              size="small"
              dataSource={paymentHistory.map((p, idx) => ({
                key: p._id || idx,
                ...p,
              }))}
              pagination={false}
              columns={[
                {
                  title: "Date",
                  dataIndex: "date",
                  key: "date",
                  width: 120,
                  render: (d) =>
                    d
                      ? dayjs(d).format("DD MMM YYYY")
                      : "—",
                },
                {
                  title: "Type",
                  dataIndex: "paymentType",
                  key: "type",
                  width: 100,
                  render: (t) =>
                    t === "customer" ? "Customer" : "In-house",
                },
                {
                  title: "Amount",
                  dataIndex: "amount",
                  key: "amount",
                  width: 120,
                  render: (a) => toINR(a),
                },
                {
                  title: "Mode",
                  dataIndex: "paymentMode",
                  key: "mode",
                  width: 100,
                },
                {
                  title: "Ref",
                  dataIndex: "transactionRef",
                  key: "ref",
                  width: 140,
                },
                {
                  title: "Remarks",
                  dataIndex: "remarks",
                  key: "remarks",
                },
              ]}
            />
          </div>
        )}
        <Space style={{ marginTop: 12, width: "100%" }} direction="vertical">
          <Button
            type="dashed"
            block
            onClick={() => setPaymentModalVisible(true)}
          >
            + Record Payment
          </Button>
          {insuranceDbId && formData.customerPaymentExpected > 0 && (
            <Button
              block
              onClick={async () => {
                try {
                  await insuranceApi.syncReceivable(insuranceDbId);
                  message.success(
                    "Customer payment synced to Receivables module"
                  );
                } catch (err) {
                  message.error(
                    err?.message || "Failed to sync receivable"
                  );
                }
              }}
            >
              Sync to Receivables Module
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default Step5NewPolicyDetails;
