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
    <Card size="small" title="New Policy Details" bordered>
      {!acceptedQuote ? (
        <Alert
          type="warning"
          showIcon
          message="No accepted quote selected yet."
          description="Please accept a quote in Step 4 to auto-fill policy details."
          style={{ marginBottom: 12 }}
        />
      ) : null}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Text strong>Insurance Company *</Text>
          <Input
            value={formData.newInsuranceCompany}
            onChange={handleChange("newInsuranceCompany")}
            style={{ marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={12}>
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
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            {formData.newPolicyType === "Comprehensive" && "OD + TP combined coverage"}
            {formData.newPolicyType === "Stand Alone OD" && "OD coverage only"}
            {formData.newPolicyType === "Third Party" && "TP coverage only"}
          </Text>
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Policy Number</Text>
          <Input
            value={formData.newPolicyNumber}
            onChange={handleChange("newPolicyNumber")}
            style={{ marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Issue Date *</Text>
          <Input
            type="date"
            value={formData.newIssueDate}
            onChange={handleChange("newIssueDate")}
            style={{ marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Policy Start Date *</Text>
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
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            Policy coverage start date
          </Text>
        </Col>
        <Col xs={24} md={12}>
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
            placeholder={
              formData.newPolicyType === "Comprehensive"
                ? "e.g., 1yr OD + 1yr TP"
                : "e.g., 1 Year"
            }
            disabled={!formData.newPolicyType}
          />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            {formData.newPolicyType === "Comprehensive" && "Available: 1yr OD + 1yr TP, 1yr OD + 3yr TP, 2yr OD + 3yr TP, 3yr OD + 3yr TP"}
            {formData.newPolicyType === "Stand Alone OD" && "Available: 1 Year, 2 Years, 3 Years (OD coverage only)"}
            {formData.newPolicyType === "Third Party" && "Available: 1 Year, 2 Years, 3 Years (TP coverage only)"}
          </Text>
        </Col>

        {formData.newPolicyType === "Comprehensive" && (
          <>
            <Col xs={24} md={12}>
              <Text strong>OD Expiry Date *</Text>
              <Input
                type="date"
                value={formData.newOdExpiryDate}
                onChange={handleChange("newOdExpiryDate")}
                style={{ marginTop: 6 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                Auto-calculated: Start Date + OD Duration - 1 Day
              </Text>
            </Col>
            <Col xs={24} md={12}>
              <Text strong>TP Expiry Date *</Text>
              <Input
                type="date"
                value={formData.newTpExpiryDate}
                onChange={handleChange("newTpExpiryDate")}
                style={{ marginTop: 6 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                Auto-calculated: Start Date + TP Duration - 1 Day
              </Text>
            </Col>
          </>
        )}

        {formData.newPolicyType === "Stand Alone OD" && (
          <Col xs={24} md={12}>
            <Text strong>OD Expiry Date *</Text>
            <Input
              type="date"
              value={formData.newOdExpiryDate}
              onChange={handleChange("newOdExpiryDate")}
              style={{ marginTop: 6 }}
            />
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
              Auto-calculated: Start Date + Duration - 1 Day
            </Text>
          </Col>
        )}

        {formData.newPolicyType === "Third Party" && (
          <Col xs={24} md={12}>
            <Text strong>TP Expiry Date *</Text>
            <Input
              type="date"
              value={formData.newTpExpiryDate}
              onChange={handleChange("newTpExpiryDate")}
              style={{ marginTop: 6 }}
            />
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
              Auto-calculated: Start Date + Duration - 1 Day
            </Text>
          </Col>
        )}
        <Col xs={24} md={12}>
          <Text strong>NCB Discount (%)</Text>
          <InputNumber
            min={0}
            max={100}
            value={Number(formData.newNcbDiscount || 0)}
            onChange={(v) => setField("newNcbDiscount", Number(v || 0))}
            style={{ width: "100%", marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={12}>
          <Text strong>IDV Amount (₹) *</Text>
          <InputNumber
            min={0}
            value={Number(formData.newIdvAmount || 0)}
            onChange={(v) => setField("newIdvAmount", Number(v || 0))}
            style={{ width: "100%", marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={12}>
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
        <Col xs={24} md={12}>
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
        <Col xs={24}>
          <Text strong>Remarks</Text>
          <Input.TextArea
            rows={3}
            value={formData.newRemarks}
            onChange={handleChange("newRemarks")}
            style={{ marginTop: 6 }}
          />
        </Col>
      </Row>

      <Divider style={{ marginBlock: 16 }} />

      <Card
        size="small"
        title="Payment Tracking (Optional)"
        bordered={false}
        className="bg-slate-50/50 dark:bg-slate-900/30"
      >
        <Text
          type="secondary"
          style={{ display: "block", marginBottom: 12, fontSize: 12 }}
        >
          Track customer and in-house payments. Leave at 0 if not
          applicable. Used for "Fully Paid" vs "Payment Due" filters.
        </Text>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Text strong>Customer Payment Expected (₹)</Text>
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
          <Col xs={24} md={12}>
            <Text strong>Customer Payment Received (₹)</Text>
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
          <Col xs={24} md={12}>
            <Text strong>In-house Payment Expected (₹)</Text>
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
          <Col xs={24} md={12}>
            <Text strong>In-house Payment Received (₹)</Text>
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
      </Card>
    </Card>
  );
};

export default Step5NewPolicyDetails;
