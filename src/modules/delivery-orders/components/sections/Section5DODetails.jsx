import React, { useEffect, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Select,
  Divider,
  InputNumber,
  DatePicker,
  Tag,
  Typography,
} from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;
const { Text, Title } = Typography;

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const Section5DODetails = ({ loan }) => {
  const form = Form.useFormInstance();
  const v = Form.useWatch([], form) || {};

  // DO account type
  const doAccountType = v.do_accountType || "Showroom";

  // Finance / cash detection
  const isFinanced =
    safeText(loan?.isFinanced).toLowerCase() === "yes" ||
    safeText(loan?.loanType).toLowerCase() === "financed";

  // Section 3 (Showroom) values
  const showroom_vehicleCost = asInt(v.do_onRoadVehicleCost);
  const showroom_grossDO = asInt(v.do_grossDO);
  const showroom_totalDiscount = asInt(v.do_totalDiscount);
  const showroom_insuranceCost = asInt(v.do_insuranceCost);
  const showroom_vehicleValue = asInt(v.do_exchangeVehiclePrice);
  const showroom_marginMoney = asInt(v.do_marginMoneyPaid);

  // Section 4 (Customer) values
  const customer_vehicleCost = asInt(v.do_onRoadVehicleCost);
  const customer_grossDO = asInt(v.do_grossDO);
  const customer_totalDiscount = asInt(v.do_customer_totalDiscount);
  const customer_insuranceCost = asInt(v.do_insuranceCost);
  const customer_vehicleValue = asInt(v.do_exchangeVehiclePrice);
  const customer_marginMoney = asInt(v.do_marginMoneyPaid);

  // Selected based on account type
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

  // Discount excluding vehicle value
  const discountExcludingVehicleValue = Math.max(
    0,
    selectedTotalDiscount - selectedVehicleValue,
  );

  // Insurance rule
  const insuranceBy = safeText(v.do_insuranceBy);
  const insuranceDeductForNet =
    insuranceBy.toLowerCase() === "showroom" ? 0 : selectedInsuranceCost;

  // Exchange Purchased By rule
  const exchangePurchasedBy = safeText(v.do_exchangePurchasedBy);
  const vehicleValueDeductForNet =
    exchangePurchasedBy.toLowerCase() === "showroom" ? selectedVehicleValue : 0;

  // Finance deduction
  const loanAmount = asInt(v.do_loanAmount);
  const processingFees = asInt(v.do_processingFees);
  const financeNetValue = isFinanced
    ? Math.max(0, loanAmount - processingFees)
    : 0;

  // Always based on showroom cost
  const showroomOnRoadPayable = asInt(v.do_onRoadVehicleCost);
  const showroomMarginMoneyPaid = asInt(v.do_marginMoneyPaid);

  // FINAL NET DO
  const netDOAmountFinal =
    showroomOnRoadPayable -
    showroomMarginMoneyPaid -
    discountExcludingVehicleValue -
    financeNetValue -
    insuranceDeductForNet -
    vehicleValueDeductForNet;

  // Prefill from Loan
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

  // Write computed values into form
  useEffect(() => {
    if (!form) return;

    form.setFieldsValue({
      do_selectedVehicleCost: selectedVehicleCost,
      do_selectedGrossDO: selectedGrossDO,
      do_selectedTotalDiscount: selectedTotalDiscount,
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
    discountExcludingVehicleValue,
    selectedInsuranceCost,
    selectedVehicleValue,
    selectedMarginMoney,
    insuranceDeductForNet,
    vehicleValueDeductForNet,
    financeNetValue,
    netDOAmountFinal,
  ]);

  const SummaryRow = ({
    label,
    value = 0,
    highlight,
    final,
    compact,
    sign,
  }) => {
    const display = Number.isFinite(Number(value))
      ? Math.trunc(Number(value))
      : 0;

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: compact ? 12 : 13,
          fontWeight: highlight || final ? 700 : 500,
          color: final ? "#1d39c4" : highlight ? "#237804" : "#111",
          marginBottom: compact ? 4 : 6,
        }}
      >
        <span style={{ color: compact ? "#444" : undefined }}>{label}</span>
        <span>
          {sign ? `${sign} ` : ""}₹ {display.toLocaleString("en-IN")}
        </span>
      </div>
    );
  };

  // Sticky Net Summary – simple stacked math lines like Section 3
  const StickyNetSummary = useMemo(() => {
    const rows = [
      { label: "Total Payable to Showroom", value: showroomOnRoadPayable },
      {
        label: "Less: Discount (Excl. Vehicle Value)",
        value: discountExcludingVehicleValue,
      },
      { label: "Less: Insurance Adjustment", value: insuranceDeductForNet },
      {
        label: "Less: Exchange Vehicle Adjustment",
        value: vehicleValueDeductForNet,
      },
      { label: "Less: Loan Disbursed", value: financeNetValue },
      { label: "Less: Margin Money Paid", value: showroomMarginMoneyPaid },
    ];

    return (
      <Card
        style={{
          position: "sticky",
          top: 16,
          borderRadius: 16,
          border: "1px solid #f0f0f0", // same as Section 4
          background: "#fafafa", // same as Section 4 SummaryCard
        }}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text strong>Net DO Amount (Showroom)</Text>
          <div style={{ fontSize: 12, color: "#666" }}>
            Total Payable − Discount − Insurance Adj. − Exchange Adj. − Loan
            Disbursed − Margin Paid
          </div>
        </div>

        <Divider style={{ margin: "8px 0" }} />

        {/* Step 1: Base amount */}
        <Text style={{ fontSize: 12, fontWeight: 600 }}>1. Base</Text>
        <div style={{ marginTop: 6 }}>
          <SummaryRow
            label="Total Payable to Showroom"
            value={showroomOnRoadPayable}
            highlight
          />
        </div>

        {/* Step 2: Deductions */}
        <Divider style={{ margin: "10px 0" }} />
        <Text style={{ fontSize: 12, fontWeight: 600 }}>2. Deductions</Text>
        <div style={{ marginTop: 6 }}>
          {rows.slice(1).map((r) => (
            <SummaryRow
              key={r.label}
              label={r.label}
              value={r.value}
              sign="-"
            />
          ))}
        </div>

        {/* Final Net DO – styled like “Net On‑road Vehicle Cost” & final row */}
        <Divider style={{ margin: "10px 0" }} />
        <SummaryRow label="Net DO Amount" value={netDOAmountFinal} final />
      </Card>
    );
  }, [
    showroomOnRoadPayable,
    discountExcludingVehicleValue,
    insuranceDeductForNet,
    vehicleValueDeductForNet,
    financeNetValue,
    showroomMarginMoneyPaid,
    netDOAmountFinal,
  ]);

  return (
    <div
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #f0f0f0",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FileTextOutlined style={{ color: "#1d4ed8" }} />
        </div>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            DO Details & Net Payable
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Choose account type, configure insurance/exchange/finance, and see
            final DO.
          </Text>
        </div>
      </div>

      <Row gutter={16}>
        {/* Left: DO details form */}
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 14 }} bodyStyle={{ padding: 16 }}>
            {/* Account & Gross DO - 3 columns */}
            <Text strong style={{ fontSize: 13 }}>
              Account & Gross DO
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="DO Account Type"
                  name="do_accountType"
                  initialValue="Showroom"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="Showroom">Showroom Account</Option>
                    <Option value="Customer">Customer Account</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Vehicle Cost" name="do_selectedVehicleCost">
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Margin Money Paid"
                  name="do_selectedMarginMoney"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Gross DO Amount" name="do_selectedGrossDO">
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Total Discount (Vehicle Section)"
                  name="do_selectedTotalDiscount"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Discount Excl. Vehicle Value"
                  name="do_selectedDiscountExclVehicleValue"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "12px 0" }} />

            {/* Insurance & Exchange - 3 columns */}
            <Text strong style={{ fontSize: 13 }}>
              Insurance & Exchange
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item label="Insurance By" name="do_insuranceBy">
                  <Select placeholder="Select">
                    <Option value="Autocredits India LLP">
                      Autocredits India LLP
                    </Option>
                    <Option value="Customer">Customer</Option>
                    <Option value="Showroom">Showroom</Option>
                    <Option value="Broker">Broker</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Insurance Amount (Vehicle Section)"
                  name="do_selectedInsuranceCost"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Vehicle Exchange (Purchased By)"
                  name="do_exchangePurchasedBy"
                >
                  <Select placeholder="Select">
                    <Option value="Showroom">Showroom</Option>
                    <Option value="Autocredits">Autocredits</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "12px 0" }} />

            {/* Exchange Vehicle Details - 4 columns for smaller fields */}
            <Text strong style={{ fontSize: 13 }}>
              Exchange Vehicle Details
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item label="Make" name="do_exchangeMake">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Model" name="do_exchangeModel">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Variant" name="do_exchangeVariant">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item label="Year" name="do_exchangeYear">
                  <Input placeholder="YYYY" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item label="RC Owner Name" name="do_exchangeRcOwnerName">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item label="Regd Number" name="do_exchangeRegdNumber">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item label="Purchase Date" name="do_exchangePurchaseDate">
                  <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Vehicle Price" name="do_exchangeVehiclePrice">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "12px 0" }} />

            {/* Finance Details - 3 columns */}
            <Text strong style={{ fontSize: 13 }}>
              Finance Details
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item label="Hypothecation Bank" name="do_hypothecation">
                  <Input placeholder="From Delivery" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Loan Amount" name="do_loanAmount">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Processing Fees" name="do_processingFees">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "12px 0" }} />

            {/* Registration & Booking - 3 columns */}
            <Text strong style={{ fontSize: 13 }}>
              Registration & Booking
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item label="Redg Required" name="do_redgRequired">
                  <Select placeholder="Select">
                    <Option value="Private">Private</Option>
                    <Option value="Commercial">Commercial</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Redg City" name="do_redgCity">
                  <Input placeholder="City" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="DO Booking Date" name="do_bookingDate">
                  <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "12px 0" }} />

            {/* Net DO Calculation (Auto) - 4 columns */}
            <Text strong style={{ fontSize: 13 }}>
              Net DO Calculation (Auto)
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={6}>
                <Form.Item
                  label="Insurance Deduction"
                  name="do_insuranceDeduction"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  label="Vehicle Value Deduction"
                  name="do_vehicleValueDeduction"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item label="Finance Deduction" name="do_financeDeduction">
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item label="Net DO Amount" name="do_netDOAmount">
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Right: sticky summary */}
        <Col xs={24} lg={8}>
          {StickyNetSummary}
        </Col>
      </Row>
    </div>
  );
};

export default Section5DODetails;
