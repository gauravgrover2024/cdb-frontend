// src/modules/delivery-orders/components/sections/Section5DODetails.jsx

import React, { useEffect, useMemo } from "react";
import {
  Row,
  Col,
  Form,
  Input,
  Select,
  Divider,
  InputNumber,
  DatePicker,
  Tag,
  Checkbox,
} from "antd";
import {
  FileTextOutlined,
  SwapOutlined,
  BankOutlined,
  CarOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

const { Option } = Select;

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const safeText = (v) => (v === undefined || v === null ? "" : String(v));
const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const SectionChip = ({ icon, label }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: "#4b5563",
    }}
  >
    {icon}
    <span>{label}</span>
  </div>
);

const HeadingLabel = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: "#6b7280",
    }}
  >
    {children}
  </div>
);

const SoftValue = ({ children, strong, color }) => (
  <div
    style={{
      fontSize: strong ? 18 : 13,
      fontWeight: strong ? 800 : 600,
      color: color || "#111827",
      lineHeight: 1.2,
    }}
  >
    {children}
  </div>
);

const InlineField = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    {label && (
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
    )}
    <div
      style={{
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: 2,
      }}
    >
      {children}
    </div>
  </div>
);

// Summary row with semantic colors (now negative also blue)
const SummaryRow = ({
  label,
  value,
  intent = "neutral", // "positive" | "negative" | "discount" | "deduction" | "neutral"
  strong = false,
}) => {
  let color = "#4b5563";

  if (intent === "positive") color = "#15803d"; // green
  if (intent === "discount") color = "#1d4ed8"; // blue
  if (intent === "deduction") color = "#b45309"; // amber
  if (intent === "negative") color = "#1d4ed8"; // blue

  if (strong && intent === "neutral") color = "#111827";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        marginBottom: 4,
        fontWeight: strong ? 700 : 500,
        color,
      }}
    >
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
};

const PillAmount = ({ label, value, danger }) => (
  <div
    style={{
      padding: "6px 16px",
      borderRadius: 999,
      border: "1px solid #d1d5db",
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "flex-start",
      minWidth: 170,
      background: "#fff",
    }}
  >
    <span
      style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        color: "#6b7280",
        marginBottom: 2,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 18,
        fontWeight: 800,
        color: danger ? "#1d4ed8" : "#111827", // negative also blue now
      }}
    >
      {money(value)}
    </span>
  </div>
);

const Section5DODetails = ({ loan }) => {
  const form = Form.useFormInstance();
  const v = Form.useWatch([], form) || {};

  const doAccountType = v.do_accountType || "Showroom";
  const isFinanced =
    safeText(loan?.isFinanced).toLowerCase() === "yes" ||
    safeText(loan?.loanType).toLowerCase() === "financed";
  const netOffDiscount = !!v.do_netOffDiscount;

  const showroom_vehicleCost = asInt(v.do_onRoadVehicleCost);
  const showroom_grossDO = asInt(v.do_grossDO);
  const showroom_totalDiscount = asInt(v.do_totalDiscount);
  const showroom_insuranceCost = asInt(v.do_insuranceCost);
  const showroom_vehicleValue = asInt(v.do_exchangeVehiclePrice);
  const showroom_marginMoney = asInt(v.do_marginMoneyPaid);

  const customer_vehicleCost = asInt(v.do_onRoadVehicleCost);
  const customer_grossDO = asInt(v.do_grossDO);
  const customer_totalDiscount = asInt(v.do_customer_totalDiscount);
  const customer_insuranceCost = asInt(v.do_insuranceCost);
  const customer_vehicleValue = asInt(v.do_exchangeVehiclePrice);
  const customer_marginMoney = asInt(v.do_marginMoneyPaid);

  const selectedVehicleCost =
    doAccountType === "Customer" ? customer_vehicleCost : showroom_vehicleCost;
  const selectedGrossDO =
    doAccountType === "Customer" ? customer_grossDO : showroom_grossDO;
  const selectedTotalDiscount =
    doAccountType === "Customer"
      ? customer_totalDiscount
      : showroom_totalDiscount;
  const selectedInsuranceCost =
    doAccountType === "Customer"
      ? customer_insuranceCost
      : showroom_insuranceCost;
  const selectedVehicleValue =
    doAccountType === "Customer"
      ? customer_vehicleValue
      : showroom_vehicleValue;
  const selectedMarginMoney =
    doAccountType === "Customer" ? customer_marginMoney : showroom_marginMoney;

  const effectiveTotalDiscount = netOffDiscount ? 0 : selectedTotalDiscount;
  const discountExcludingVehicleValue = Math.max(
    0,
    effectiveTotalDiscount - selectedVehicleValue,
  );

  const insuranceBy = safeText(v.do_insuranceBy);
  const insuranceDeductForNet =
    insuranceBy.toLowerCase() === "showroom" ? 0 : selectedInsuranceCost;

  const exchangePurchasedBy = safeText(v.do_exchangePurchasedBy);
  const vehicleValueDeductForNet =
    exchangePurchasedBy.toLowerCase() === "showroom" ? selectedVehicleValue : 0;

  const loanAmount = asInt(v.do_loanAmount);
  const processingFees = asInt(v.do_processingFees);
  const financeNetValue = isFinanced
    ? Math.max(0, loanAmount - processingFees)
    : 0;

  const showroomOnRoadPayable = asInt(v.do_onRoadVehicleCost);
  const showroomMarginMoneyPaid = asInt(v.do_marginMoneyPaid);

  const netDOAmountFinal =
    showroomOnRoadPayable -
    showroomMarginMoneyPaid -
    discountExcludingVehicleValue -
    financeNetValue -
    insuranceDeductForNet -
    vehicleValueDeductForNet;

  useEffect(() => {
    if (!form) return;

    const existing = form.getFieldsValue(true);

    if (!existing?.do_accountType) {
      form.setFieldsValue({ do_accountType: "Showroom" });
    }

    if (!existing?.do_bookingDate) {
      form.setFieldsValue({ do_bookingDate: dayjs() });
    }

    if (!existing?.do_insuranceBy) {
      form.setFieldsValue({
        do_insuranceBy: safeText(loan?.insuranceBy || loan?.insurance_by || ""),
      });
    }

    if (!existing?.do_hypothecation) {
      const hypBank =
        loan?.delivery_hypothecationBank ||
        loan?.hypothecationBank ||
        loan?.approvalBankName ||
        loan?.bankName ||
        "";
      form.setFieldsValue({
        do_hypothecation: safeText(hypBank),
      });
    }

    if (
      existing?.do_loanAmount === undefined ||
      existing?.do_loanAmount === ""
    ) {
      form.setFieldsValue({
        do_loanAmount:
          loan?.postfile_disbursedLoan ??
          loan?.disbursedLoanAmount ??
          loan?.loanAmount ??
          "",
      });
    }

    if (
      existing?.do_processingFees === undefined ||
      existing?.do_processingFees === ""
    ) {
      form.setFieldsValue({
        do_processingFees:
          loan?.postfile_processingFees ?? loan?.processingFees ?? "",
      });
    }

    if (!existing?.do_redgRequired) {
      form.setFieldsValue({
        do_redgRequired: safeText(loan?.redgRequired || loan?.usage || ""),
      });
    }

    if (!existing?.do_redgCity) {
      form.setFieldsValue({
        do_redgCity: safeText(loan?.redgCity || loan?.city || ""),
      });
    }
  }, [form, loan]);

  useEffect(() => {
    if (!form) return;

    form.setFieldsValue({
      do_selectedVehicleCost: selectedVehicleCost,
      do_selectedGrossDO: selectedGrossDO,
      do_selectedTotalDiscount: selectedTotalDiscount,
      do_selectedEffectiveTotalDiscount: effectiveTotalDiscount,
      do_selectedDiscountExclVehicleValue: discountExcludingVehicleValue,
      do_selectedInsuranceCost: selectedInsuranceCost,
      do_selectedVehicleValue: selectedVehicleValue,
      do_selectedMarginMoney: selectedMarginMoney,

      do_insuranceDeduction: insuranceDeductForNet,
      do_vehicleValueDeduction: vehicleValueDeductForNet,
      do_financeDeduction: financeNetValue,

      do_netDOAmount: netDOAmountFinal,
    });
  }, [
    form,
    selectedVehicleCost,
    selectedGrossDO,
    selectedTotalDiscount,
    effectiveTotalDiscount,
    discountExcludingVehicleValue,
    selectedInsuranceCost,
    selectedVehicleValue,
    selectedMarginMoney,
    insuranceDeductForNet,
    vehicleValueDeductForNet,
    financeNetValue,
    netDOAmountFinal,
  ]);

  const TopStrip = useMemo(() => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <FileTextOutlined style={{ color: "#111827" }} />
          <div>
            <HeadingLabel>Delivery order</HeadingLabel>
            <SoftValue>Net payable summary</SoftValue>
          </div>
          <Tag
            color="blue"
            style={{ borderRadius: 999, fontSize: 11, borderColor: "#1d4ed8" }}
          >
            {doAccountType === "Customer"
              ? "Customer account view"
              : "Showroom account"}
          </Tag>
          <Tag
            color={isFinanced ? "geekblue" : "green"}
            style={{
              borderRadius: 999,
              fontSize: 11,
              borderColor: isFinanced ? "#1e40af" : "#15803d",
            }}
          >
            {isFinanced ? "Financed" : "Cash"}
          </Tag>
        </div>

        <PillAmount
          label="Net DO Amount (Payable to Showroom)"
          value={netDOAmountFinal}
          danger={netDOAmountFinal < 0}
        />
      </div>
    );
  }, [doAccountType, isFinanced, netDOAmountFinal]);

  return (
    <div
      style={{
        marginBottom: 32,
        padding: 18,
        background: "#f9fafb",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
      }}
    >
      {TopStrip}

      <Divider style={{ margin: "8px 0 14px" }} />

      <Row gutter={[32, 12]}>
        {/* LEFT: INPUTS */}
        <Col
          xs={24}
          lg={14}
          style={{
            borderRight: "1px solid #e5e7eb",
            paddingRight: 24,
          }}
        >
          {/* Mode & Discount */}
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<AuditOutlined style={{ color: "#1d4ed8" }} />}
              label="Mode & discount"
            />
          </div>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <InlineField label="DO Account Type">
                <Form.Item
                  name="do_accountType"
                  initialValue="Showroom"
                  style={{ marginBottom: 0 }}
                  rules={[{ required: true }]}
                >
                  <Select
                    bordered={false}
                    size="small"
                    dropdownMatchSelectWidth={220}
                  >
                    <Option value="Showroom">Showroom Account</Option>
                    <Option value="Customer">Customer Account</Option>
                  </Select>
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <Form.Item
                    name="do_netOffDiscount"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Checkbox size="small">
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>Net-off Discount</span>
                        <Tooltip title="Ignore all discounts in DO calculation (used when discount is borne externally).">
                          <InfoCircleOutlined
                            style={{ fontSize: 11, color: "#9ca3af" }}
                          />
                        </Tooltip>
                      </span>
                    </Checkbox>
                  </Form.Item>

                  {/* spacer to push the underline down to align with other fields */}
                  <div style={{ height: 17.5 }} />
                </div>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Insurance By">
                <Form.Item name="do_insuranceBy" style={{ marginBottom: 0 }}>
                  <Select
                    bordered={false}
                    size="small"
                    placeholder="Select"
                    dropdownMatchSelectWidth={220}
                  >
                    <Option value="Autocredits India LLP">
                      Autocredits India LLP
                    </Option>
                    <Option value="Customer">Customer</Option>
                    <Option value="Showroom">Showroom</Option>
                    <Option value="Broker">Broker</Option>
                  </Select>
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Exchange Purchased By">
                <Form.Item
                  name="do_exchangePurchasedBy"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    bordered={false}
                    size="small"
                    placeholder="Select"
                    dropdownMatchSelectWidth={220}
                  >
                    <Option value="Showroom">Showroom</Option>
                    <Option value="Autocredits">Autocredits</Option>
                  </Select>
                </Form.Item>
              </InlineField>
            </Col>
          </Row>

          <Divider style={{ margin: "10px 0" }} />

          {/* Finance & Registration */}
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<BankOutlined style={{ color: "#047857" }} />}
              label="Finance & registration"
            />
          </div>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <InlineField label="Hypothecation Bank">
                <Form.Item name="do_hypothecation" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="From delivery"
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={12} md={6}>
              <InlineField label="Loan Amount">
                <Form.Item name="do_loanAmount" style={{ marginBottom: 0 }}>
                  <InputNumber
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={12} md={6}>
              <InlineField label="Processing Fees">
                <Form.Item name="do_processingFees" style={{ marginBottom: 0 }}>
                  <InputNumber
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Registration Type">
                <Form.Item name="do_redgRequired" style={{ marginBottom: 0 }}>
                  <Select
                    bordered={false}
                    size="small"
                    placeholder="Select"
                    dropdownMatchSelectWidth={180}
                  >
                    <Option value="Private">Private</Option>
                    <Option value="Commercial">Commercial</Option>
                  </Select>
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Registration City">
                <Form.Item name="do_redgCity" style={{ marginBottom: 0 }}>
                  <Input bordered={false} size="small" placeholder="City" />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="DO Booking Date">
                <Form.Item name="do_bookingDate" style={{ marginBottom: 0 }}>
                  <DatePicker
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    format="DD-MM-YYYY"
                  />
                </Form.Item>
              </InlineField>
            </Col>
          </Row>

          <Divider style={{ margin: "10px 0" }} />

          {/* Exchange Vehicle (inputs only) */}
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<CarOutlined style={{ color: "#dc2626" }} />}
              label="Exchange vehicle (optional)"
            />
          </div>

          <Row gutter={[16, 6]}>
            <Col xs={24} md={12}>
              <InlineField label="Make">
                <Form.Item name="do_exchangeMake" style={{ marginBottom: 0 }}>
                  <Input bordered={false} size="small" />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Model">
                <Form.Item name="do_exchangeModel" style={{ marginBottom: 0 }}>
                  <Input bordered={false} size="small" />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Variant">
                <Form.Item
                  name="do_exchangeVariant"
                  style={{ marginBottom: 0 }}
                >
                  <Input bordered={false} size="small" />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={6} md={4}>
              <InlineField label="Year">
                <Form.Item name="do_exchangeYear" style={{ marginBottom: 0 }}>
                  <Input bordered={false} size="small" placeholder="YYYY" />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={18} md={8}>
              <InlineField label="Vehicle Price">
                <Form.Item
                  name="do_exchangeVehiclePrice"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="RC Owner Name">
                <Form.Item
                  name="do_exchangeRcOwnerName"
                  style={{ marginBottom: 0 }}
                >
                  <Input bordered={false} size="small" />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Regd Number">
                <Form.Item
                  name="do_exchangeRegdNumber"
                  style={{ marginBottom: 0 }}
                >
                  <Input bordered={false} size="small" />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Purchase Date">
                <Form.Item
                  name="do_exchangePurchaseDate"
                  style={{ marginBottom: 0 }}
                >
                  <DatePicker
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    format="DD-MM-YYYY"
                  />
                </Form.Item>
              </InlineField>
            </Col>
          </Row>
        </Col>

        {/* RIGHT: READ-ONLY SUMMARY */}
        <Col
          xs={24}
          lg={10}
          style={{
            paddingLeft: 24,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<SwapOutlined style={{ color: "#7c3aed" }} />}
              label="Net DO breakdown"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <SummaryRow
              label="On-road Payable (Showroom)"
              value={showroomOnRoadPayable}
              intent="positive"
            />
            <SummaryRow
              label="Margin Money Paid"
              value={showroomMarginMoneyPaid}
              intent="discount"
            />
            <SummaryRow
              label={
                netOffDiscount
                  ? "Discount Used (net-off applied)"
                  : "Discount Used (after vehicle value)"
              }
              value={discountExcludingVehicleValue}
              intent="discount"
              strong={netOffDiscount}
            />
            <SummaryRow
              label="Net finance (Loan − PF)"
              value={financeNetValue}
              intent="deduction"
            />
            <SummaryRow
              label="Insurance Deduction"
              value={insuranceDeductForNet}
              intent="deduction"
            />
            <SummaryRow
              label="Vehicle Value Deduction"
              value={vehicleValueDeductForNet}
              intent="deduction"
            />
          </div>

          <Divider style={{ margin: "8px 0" }} />

          <div style={{ marginBottom: 8 }}>
            <HeadingLabel>Net DO amount</HeadingLabel>
          </div>

          <SummaryRow
            label="Net DO Amount (Final)"
            value={netDOAmountFinal}
            intent={netDOAmountFinal < 0 ? "negative" : "positive"}
            strong
          />

          {/* Bind Net DO and Effective Discount to form (hidden controls) */}
          <Form.Item
            name="do_netDOAmount"
            style={{ marginBottom: 0, height: 0, visibility: "hidden" }}
          >
            <InputNumber />
          </Form.Item>

          <Form.Item
            name="do_selectedEffectiveTotalDiscount"
            style={{ marginBottom: 0, height: 0, visibility: "hidden" }}
          >
            <InputNumber />
          </Form.Item>
        </Col>
      </Row>

      {/* Hidden advanced block can stay here if you decide to keep it */}
      {false && <div>{/* advanced debug fields */}</div>}
    </div>
  );
};

export default Section5DODetails;
