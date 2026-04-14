import React from "react";
import {
  Card,
  Col,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Typography,
} from "antd";

const { Text } = Typography;

const Step3PreviousPolicy = ({
  formData,
  setField,
  handleChange,
  handlePreviousPolicyStartOrDuration,
}) => {
  return (
    <Card size="small" title="Previous Policy Details" bordered>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Text strong>Insurance Company</Text>
          <Input
            value={formData.previousInsuranceCompany}
            onChange={handleChange("previousInsuranceCompany")}
            style={{ marginTop: 6 }}
            placeholder="e.g., Bajaj General Insurance Limited"
          />
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Policy Number</Text>
          <Input
            value={formData.previousPolicyNumber}
            onChange={handleChange("previousPolicyNumber")}
            style={{ marginTop: 6 }}
            placeholder="e.g., OG-25-1102-1801-00004082"
          />
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Policy Type *</Text>
          <Select
            value={formData.previousPolicyType}
            onChange={(v) => {
              setField("previousPolicyType", v);
              setField("previousPolicyDuration", "");
              setField("previousOdExpiryDate", "");
              setField("previousTpExpiryDate", "");
            }}
            style={{ width: "100%", marginTop: 6 }}
            options={[
              { label: "Comprehensive", value: "Comprehensive" },
              { label: "Stand Alone OD", value: "Stand Alone OD" },
              { label: "Third Party", value: "Third Party" },
            ]}
            placeholder="Select policy type"
          />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            {formData.previousPolicyType === "Comprehensive" && "OD + TP combined coverage"}
            {formData.previousPolicyType === "Stand Alone OD" && "OD coverage only"}
            {formData.previousPolicyType === "Third Party" && "TP coverage only"}
          </Text>
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Policy Start Date</Text>
          <Input
            type="date"
            value={formData.previousPolicyStartDate}
            onChange={(e) =>
              handlePreviousPolicyStartOrDuration({
                previousPolicyStartDate: e.target.value,
              })
            }
            style={{ marginTop: 6 }}
          />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            Policy coverage start date
          </Text>
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Policy Duration</Text>
          <Select
            value={formData.previousPolicyDuration}
            onChange={(v) =>
              handlePreviousPolicyStartOrDuration({
                previousPolicyDuration: v,
              })
            }
            style={{ width: "100%", marginTop: 6 }}
            options={
              formData.previousPolicyType === "Comprehensive"
                ? [
                    { label: "1yr OD + 1yr TP", value: "1yr OD + 1yr TP" },
                    { label: "1yr OD + 3yr TP", value: "1yr OD + 3yr TP" },
                    { label: "2yr OD + 3yr TP", value: "2yr OD + 3yr TP" },
                    { label: "3yr OD + 3yr TP", value: "3yr OD + 3yr TP" },
                  ]
                : formData.previousPolicyType === "Stand Alone OD"
                  ? [
                      { label: "1 Year", value: "1 Year" },
                      { label: "2 Years", value: "2 Years" },
                      { label: "3 Years", value: "3 Years" },
                    ]
                  : formData.previousPolicyType === "Third Party"
                    ? [
                        { label: "1 Year", value: "1 Year" },
                        { label: "2 Years", value: "2 Years" },
                        { label: "3 Years", value: "3 Years" },
                      ]
                    : []
            }
            placeholder={
              formData.previousPolicyType === "Comprehensive"
                ? "e.g., 1yr OD + 1yr TP"
                : "e.g., 1 Year"
            }
            disabled={!formData.previousPolicyType}
          />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            {formData.previousPolicyType === "Comprehensive" && "Available: 1yr OD + 1yr TP, 1yr OD + 3yr TP, 2yr OD + 3yr TP, 3yr OD + 3yr TP"}
            {formData.previousPolicyType === "Stand Alone OD" && "Available: 1 Year, 2 Years, 3 Years (OD coverage only)"}
            {formData.previousPolicyType === "Third Party" && "Available: 1 Year, 2 Years, 3 Years (TP coverage only)"}
          </Text>
        </Col>

        {formData.previousPolicyType === "Comprehensive" && (
          <>
            <Col xs={24} md={12}>
              <Text strong>OD Expiry Date</Text>
              <Input
                type="date"
                value={formData.previousOdExpiryDate}
                onChange={handleChange("previousOdExpiryDate")}
                style={{ marginTop: 6 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                Auto-calculated: Start Date + OD Duration - 1 Day
              </Text>
            </Col>
            <Col xs={24} md={12}>
              <Text strong>TP Expiry Date</Text>
              <Input
                type="date"
                value={formData.previousTpExpiryDate}
                onChange={handleChange("previousTpExpiryDate")}
                style={{ marginTop: 6 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                Auto-calculated: Start Date + TP Duration - 1 Day
              </Text>
            </Col>
          </>
        )}

        {formData.previousPolicyType === "Stand Alone OD" && (
          <Col xs={24} md={12}>
            <Text strong>OD Expiry Date</Text>
            <Input
              type="date"
              value={formData.previousOdExpiryDate}
              onChange={handleChange("previousOdExpiryDate")}
              style={{ marginTop: 6 }}
            />
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
              Auto-calculated: Start Date + Duration - 1 Day
            </Text>
          </Col>
        )}

        {formData.previousPolicyType === "Third Party" && (
          <Col xs={24} md={12}>
            <Text strong>TP Expiry Date</Text>
            <Input
              type="date"
              value={formData.previousTpExpiryDate}
              onChange={handleChange("previousTpExpiryDate")}
              style={{ marginTop: 6 }}
            />
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
              Auto-calculated: Start Date + Duration - 1 Day
            </Text>
          </Col>
        )}
        <Col xs={24} md={12}>
          <Text strong>Claim Taken Last Year</Text>
          <div style={{ marginTop: 6 }}>
            <Radio.Group
              value={formData.claimTakenLastYear}
              onChange={(e) =>
                setField("claimTakenLastYear", e.target.value)
              }
              options={[
                { label: "Yes", value: "Yes" },
                { label: "No", value: "No" },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <Text strong>NCB Discount (%)</Text>
          <InputNumber
            min={0}
            max={100}
            value={Number(formData.previousNcbDiscount || 0)}
            onChange={(v) =>
              setField("previousNcbDiscount", Number(v || 0))
            }
            style={{ width: "100%", marginTop: 6 }}
          />
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Hypothecation</Text>
          <Select
            value={formData.previousHypothecation}
            onChange={(v) => setField("previousHypothecation", v)}
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
            value={formData.previousRemarks}
            onChange={handleChange("previousRemarks")}
            style={{ marginTop: 6 }}
            placeholder="Notes for previous policy..."
          />
        </Col>
      </Row>
    </Card>
  );
};

export default Step3PreviousPolicy;
