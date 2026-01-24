// src/modules/loans/components/loan-form/prefile/Section4VehiclePricing.jsx
import React, { useEffect } from "react";

import {
  Form,
  Input,
  Select,
  Row,
  Col,
  Card,
  Divider,
  Radio,
  InputNumber,
} from "antd";
import { CarOutlined } from "@ant-design/icons";

const { Option } = Select;

/**
 * Section4VehiclePricing
 * - Make / Model / Variant are shown for ALL loan types
 * - New Car => full pricing + sticky summary on the right
 * - Used / Cash-in / Refinance => minimal fields (plus usage/purpose where required)
 * - Hypothecation = Yes => Bank Name required
 * - Dealer now includes Contact Person + Contact Number
 *
 * Copy-paste safe.
 */

const Section4VehiclePricing = () => {
  const form = Form.useFormInstance();
  useEffect(() => {
    const make = form.getFieldValue("vehicleMake");
    const model = form.getFieldValue("vehicleModel");
    const variant = form.getFieldValue("vehicleVariant");

    form.setFieldsValue({
      vehicleMake: make,
      vehicleModel: model,
      vehicleVariant: variant,
    });
  }, [form]);

  const loanType = Form.useWatch("typeOfLoan", form);
  const hypothecation = Form.useWatch("hypothecation", form);
  const aadhaarSame = Form.useWatch("registerSameAsAadhaar", form);

  const v = Form.useWatch([], form) || {};

  // numeric helpers (coerce to integers; no decimals as requested)
  const asInt = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.trunc(n);
  };

  const exShowroom = asInt(v.exShowroomPrice);
  const insurance = asInt(v.insuranceCost);
  const roadTax = asInt(v.roadTax);
  const accessories = asInt(v.accessoriesAmount);
  const dealerDiscount = asInt(v.dealerDiscount);
  const manufacturerDiscount = asInt(v.manufacturerDiscount);
  const marginMoney = asInt(v.marginMoney);
  const advanceEmi = asInt(v.advanceEmi);
  const tradeInValue = asInt(v.tradeInValue);
  const otherDiscounts = asInt(v.otherDiscounts);

  const onRoad =
    exShowroom +
    insurance +
    roadTax +
    accessories -
    dealerDiscount -
    manufacturerDiscount;

  const grossLoan = onRoad - marginMoney - advanceEmi - tradeInValue;
  const netLoan = grossLoan - otherDiscounts;

  const isNewCar = loanType === "New Car";
  const isUsedCar = loanType === "Used Car";
  const isCashIn = loanType === "Car Cash-in";
  const isRefinance = loanType === "Refinance";

  /* Summary card (only for New Car) */
  const SummaryCard = () =>
    isNewCar && (
      <Card
        style={{
          position: "sticky",
          top: 16,
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          {v.vehicleMake || "-"} {v.vehicleModel || ""} {v.vehicleVariant || ""}
        </div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
          {loanType || "New Car"}
        </div>

        <Divider style={{ margin: "8px 0" }} />

        <div style={{ fontSize: 13, marginBottom: 6 }}>
          <strong>Dealer</strong>
        </div>
        <div style={{ fontSize: 12, color: "#333" }}>
          <div>{v.dealerName || "-"}</div>
          <div style={{ color: "#666", marginTop: 4 }}>
            {v.dealerContactPerson ? `${v.dealerContactPerson} • ` : ""}
            {v.dealerContactNumber || "-"}
          </div>
          <div style={{ marginTop: 6 }}>{v.dealerAddress || "-"}</div>
        </div>

        <Divider style={{ margin: "12px 0" }} />

        <SummaryRow label="Ex-Showroom Price" value={exShowroom} />
        <SummaryRow label="Insurance" value={insurance} />
        <SummaryRow label="Road Tax" value={roadTax} />
        <SummaryRow label="Accessories" value={accessories} />
        <SummaryRow label="Dealer Discount" value={-dealerDiscount} />
        <SummaryRow
          label="Manufacturer Discount"
          value={-manufacturerDiscount}
        />

        <Divider style={{ margin: "10px 0" }} />

        <SummaryRow label="On-Road Price" value={onRoad} highlight />

        <SummaryRow label="Margin Money" value={-marginMoney} />
        <SummaryRow label="Advance EMI" value={-advanceEmi} />
        <SummaryRow label="Trade-In Value" value={-tradeInValue} />

        <Divider style={{ margin: "10px 0" }} />

        <SummaryRow label="Gross Loan" value={grossLoan} highlight />
        <SummaryRow label="Other Discounts" value={-otherDiscounts} />

        <Divider style={{ margin: "10px 0" }} />
        <SummaryRow label="Net Loan Amount" value={netLoan} final />
      </Card>
    );

  return (
    // <-- ADDED: top-level section wrapper & header only (no other changes)
    <div
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        <CarOutlined style={{ color: "#1418faff" }} />
        <span>Vehicle Pricing & Loan Details</span>
      </div>

      <Row gutter={16}>
        <Col span={isNewCar ? 15 : 24}>
          <Card style={{ borderRadius: 12 }}>
            <Row gutter={[16, 12]}>
              {/* Make / Model / Variant — COMMON to all types */}
              <Col xs={24} md={8}>
                <Form.Item label="Make" name="vehicleMake">
                  <Input placeholder="e.g., Toyota" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Model" name="vehicleModel">
                  <Input placeholder="e.g., Corolla" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Variant" name="vehicleVariant">
                  <Input placeholder="e.g., 1.8 E CVT" />
                </Form.Item>
              </Col>

              {/* Type of Loan */}
              <Col xs={24} md={8}>
                <Form.Item label="Type of Loan" name="typeOfLoan">
                  <Select placeholder="Select loan type">
                    <Option value="New Car">New Car</Option>
                    <Option value="Used Car">Used Car</Option>
                    <Option value="Car Cash-in">Car Cash-in</Option>
                    <Option value="Refinance">Refinance</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Usage"
                  name="usage"
                  rules={[{ required: true, message: "Select usage" }]}
                >
                  <Select placeholder="Select usage">
                    <Select.Option value="Private">Private</Select.Option>
                    <Select.Option value="Commercial">Commercial</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* USED / CASH-IN / REFINANCE — minimal fields */}
              {(isUsedCar || isCashIn || isRefinance) && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item label="Bought In (Year)" name="boughtInYear">
                      <Input placeholder="YYYY" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Hypothecation" name="hypothecation">
                      <Radio.Group>
                        <Radio value="Yes">Yes</Radio>
                        <Radio value="No">No</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>

                  {hypothecation === "Yes" && (
                    <Col xs={24} md={8}>
                      <Form.Item
                        label="Hypothecation Bank"
                        name="hypothecationBank"
                        rules={[{ required: true, message: "Bank required" }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  )}

                  {/* Usage & Purpose only for Cash-in / Refinance */}
                  {(isCashIn || isRefinance) && (
                    <>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Purpose of Loan"
                          name="purposeOfLoan"
                          rules={[{ required: true }]}
                        >
                          <Select placeholder="Select purpose">
                            <Option value="Home Renovation">
                              Home Renovation
                            </Option>
                            <Option value="Marriage">Marriage</Option>
                            <Option value="Travel">Travel</Option>
                            <Option value="Education">Education</Option>
                            <Option value="Business">Business</Option>
                            <Option value="Agriculture">Agriculture</Option>
                            <Option value="Other">Other</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </>
              )}

              {/* NEW CAR — full pricing */}
              {isNewCar && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item label="Ex-Showroom Price" name="exShowroomPrice">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Insurance Cost" name="insuranceCost">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Road Tax" name="roadTax">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Accessories Amount"
                      name="accessoriesAmount"
                    >
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer Discount" name="dealerDiscount">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Manufacturer Discount"
                      name="manufacturerDiscount"
                    >
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Margin Money" name="marginMoney">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Advance EMI" name="advanceEmi">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Trade-in Value" name="tradeInValue">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Other Discounts" name="otherDiscounts">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>

                  {/* Dealer fields */}
                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer Name" name="dealerName">
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Contact Person"
                      name="dealerContactPerson"
                    >
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Contact Number"
                      name="dealerContactNumber"
                    >
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="Dealer Address" name="dealerAddress">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item
                      label="Is vehicle registered at Aadhaar address?"
                      name="registerSameAsAadhaar"
                    >
                      <Radio.Group>
                        <Radio value="Yes">Yes</Radio>
                        <Radio value="No">No</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>

                  {aadhaarSame === "No" && (
                    <Col xs={24}>
                      <Form.Item
                        label="Registration Address"
                        name="registrationAddress"
                        rules={[{ required: true }]}
                      >
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </Col>
                  )}
                </>
              )}
            </Row>
          </Card>
        </Col>

        {/* Summary on right for New Car */}
        {isNewCar && (
          <Col span={9}>
            <SummaryCard />
          </Col>
        )}
      </Row>
    </div>
  );
};

/* Small SummaryRow component */
const SummaryRow = ({ label, value = 0, highlight, final }) => {
  const display = Number.isFinite(Number(value))
    ? Math.trunc(Number(value))
    : 0;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: highlight || final ? 700 : 500,
        color: final ? "#1d39c4" : highlight ? "#237804" : "#111",
        marginBottom: 6,
      }}
    >
      <span>{label}</span>
      <span>₹ {display.toLocaleString("en-IN")}</span>
    </div>
  );
};

export default Section4VehiclePricing;
