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
} from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const StatBox = ({ label, value, bold, danger }) => (
  <div
    style={{
      padding: 12,
      borderRadius: 12,
      border: "1px solid #f0f0f0",
      background: "#fff",
      minHeight: 72,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{label}</div>
    <div
      style={{
        fontSize: 16,
        fontWeight: bold ? 800 : 700,
        color: danger ? "#cf1322" : "#111",
      }}
    >
      {money(value)}
    </div>
  </div>
);

const Section5DODetails = ({ loan }) => {
  const form = Form.useFormInstance();
  const v = Form.useWatch([], form) || {};

  // -----------------------------------
  // DO account type (Showroom / Customer)
  // -----------------------------------
  const doAccountType = v.do_accountType || "Showroom";

  // -----------------------------------
  // FINANCE / CASH detection
  // -----------------------------------
  const isFinanced =
    safeText(loan?.isFinanced).toLowerCase() === "yes" ||
    safeText(loan?.loanType).toLowerCase() === "financed";

  // -----------------------------------
  // SECTION 3 (Showroom Account) values
  // -----------------------------------
  const showroom_vehicleCost = asInt(v.do_onRoadVehicleCost);
  const showroom_grossDO = asInt(v.do_grossDO);
  const showroom_totalDiscount = asInt(v.do_totalDiscount);
  const showroom_insuranceCost = asInt(v.do_insuranceCost);
  const showroom_vehicleValue = asInt(v.do_exchangeVehiclePrice);
  const showroom_marginMoney = asInt(v.do_marginMoneyPaid);

  // -----------------------------------
  // SECTION 4 (Customer Account) values
  // -----------------------------------
  const customer_vehicleCost = asInt(v.do_onRoadVehicleCost); // shared till gross
  const customer_grossDO = asInt(v.do_grossDO); // shared till gross
  const customer_totalDiscount = asInt(v.do_customer_totalDiscount);
  const customer_insuranceCost = asInt(v.do_insuranceCost); // shared
  const customer_vehicleValue = asInt(v.do_exchangeVehiclePrice);

  const customer_marginMoney = asInt(v.do_marginMoneyPaid); // shared

  // -----------------------------------
  // Selected based on account type
  // -----------------------------------
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

  // -----------------------------------
  // Discount excluding vehicle value
  // (because vehicle value is treated separately in Net DO if showroom exchange)
  // -----------------------------------
  const discountExcludingVehicleValue = Math.max(
    0,
    selectedTotalDiscount - selectedVehicleValue
  );

  // -----------------------------------
  // Insurance rule (UPDATED as per you)
  // If insurance by showroom => NO deduction
  // Else => insurance is deducted (not payable to showroom)
  // -----------------------------------
  const insuranceBy = safeText(v.do_insuranceBy);
  const insuranceDeductForNet =
    insuranceBy.toLowerCase() === "showroom" ? 0 : selectedInsuranceCost;

  // -----------------------------------
  // Exchange Purchased By rule
  // If showroom => vehicle value deducted
  // If autocredits => not deducted
  // -----------------------------------
  const exchangePurchasedBy = safeText(v.do_exchangePurchasedBy);
  const vehicleValueDeductForNet =
    exchangePurchasedBy.toLowerCase() === "showroom" ? selectedVehicleValue : 0;

  // -----------------------------------
  // Finance Deduction:
  // Loan Amount - Processing Fees deducted from Net DO if financed
  // -----------------------------------
  const loanAmount = asInt(v.do_loanAmount);
  const processingFees = asInt(v.do_processingFees);

  const financeNetValue = isFinanced
    ? Math.max(0, loanAmount - processingFees)
    : 0;

  // -----------------------------------
  // Sticky Summary always based on Showroom OnRoad cost
  // -----------------------------------
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

  // -----------------------------------
  // Prefill from Loan (read-only)
  // -----------------------------------
  useEffect(() => {
    if (!form) return;

    const existing = form.getFieldsValue(true);

    // Default account type
    if (!existing?.do_accountType) {
      form.setFieldsValue({ do_accountType: "Showroom" });
    }

    // Default DO booking date = today
    if (!existing?.do_bookingDate) {
      form.setFieldsValue({ do_bookingDate: dayjs() });
    }

    // Insurance By (if any)
    if (!existing?.do_insuranceBy) {
      form.setFieldsValue({
        do_insuranceBy: safeText(loan?.insuranceBy || loan?.insurance_by || ""),
      });
    }

    // Hypothecation Bank fallback
    // We will store bank name in do_hypothecation (text field)
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

    // Loan Amount (Postfile disbursed)
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

    // Processing Fees (Postfile)
    if (
      existing?.do_processingFees === undefined ||
      existing?.do_processingFees === ""
    ) {
      form.setFieldsValue({
        do_processingFees:
          loan?.postfile_processingFees ?? loan?.processingFees ?? "",
      });
    }

    // Redg Required / City from prefile (fallback)
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

  // -----------------------------------
  // Write computed values into form
  // -----------------------------------
  useEffect(() => {
    if (!form) return;

    form.setFieldsValue({
      // selected based on dropdown
      do_selectedVehicleCost: selectedVehicleCost,
      do_selectedGrossDO: selectedGrossDO,
      do_selectedTotalDiscount: selectedTotalDiscount,
      do_selectedDiscountExclVehicleValue: discountExcludingVehicleValue,
      do_selectedInsuranceCost: selectedInsuranceCost,
      do_selectedVehicleValue: selectedVehicleValue,
      do_selectedMarginMoney: selectedMarginMoney,

      // deductions used in net
      do_insuranceDeduction: insuranceDeductForNet,
      do_vehicleValueDeduction: vehicleValueDeductForNet,
      do_financeDeduction: financeNetValue,

      // final net do
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

  // -----------------------------------
  // Sticky Net Summary UI
  // -----------------------------------
  const StickyNetSummary = useMemo(() => {
    return (
      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 10,
          background: "#f5f7fa",
          paddingBottom: 12,
        }}
      >
        <Card
          style={{
            borderRadius: 14,
            border: "1px solid #f0f0f0",
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              NET DO Summary (Payable to Showroom)
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Tag color="blue">Showroom Account</Tag>
              <Tag color={isFinanced ? "geekblue" : "green"}>
                {isFinanced ? "Financed" : "Cash"}
              </Tag>
            </div>
          </div>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={4}>
              <StatBox
                label="Total Payable to Showroom"
                value={showroomOnRoadPayable}
                bold
              />
            </Col>

            <Col xs={24} md={4}>
              <StatBox label="Margin Money" value={showroomMarginMoneyPaid} />
            </Col>

            <Col xs={24} md={4}>
              <StatBox
                label="Discount (Excl. Vehicle Value)"
                value={discountExcludingVehicleValue}
              />
            </Col>

            <Col xs={24} md={5}>
              <StatBox label="Loan Amount - PF" value={financeNetValue} />
            </Col>

            <Col xs={24} md={4}>
              <StatBox label="Insurance" value={insuranceDeductForNet} />
            </Col>

            <Col xs={24} md={4}>
              <StatBox label="Vehicle Value" value={vehicleValueDeductForNet} />
            </Col>

            <Col xs={24} md={3}>
              <StatBox
                label="Net DO Amount"
                value={netDOAmountFinal}
                bold
                danger={netDOAmountFinal < 0}
              />
            </Col>
          </Row>
        </Card>
      </div>
    );
  }, [
    showroomOnRoadPayable,
    showroomMarginMoneyPaid,
    discountExcludingVehicleValue,
    financeNetValue,
    insuranceDeductForNet,
    vehicleValueDeductForNet,
    netDOAmountFinal,
    isFinanced,
  ]);

  return (
    <div
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        <FileTextOutlined style={{ color: "#1418faff" }} />
        <span>DO Details</span>
      </div>

      {/* Sticky summary */}
      {StickyNetSummary}

      <Card style={{ borderRadius: 12 }}>
        <Row gutter={[16, 12]}>
          {/* DO Account Type */}
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

          {/* Vehicle Cost */}
          <Col xs={24} md={8}>
            <Form.Item label="Vehicle Cost" name="do_selectedVehicleCost">
              <InputNumber style={{ width: "100%" }} disabled />
            </Form.Item>
          </Col>

          {/* Margin Money */}
          <Col xs={24} md={8}>
            <Form.Item label="Margin Money Paid" name="do_selectedMarginMoney">
              <InputNumber style={{ width: "100%" }} disabled />
            </Form.Item>
          </Col>

          {/* Gross DO */}
          <Col xs={24} md={8}>
            <Form.Item label="Gross DO Amount" name="do_selectedGrossDO">
              <InputNumber style={{ width: "100%" }} disabled />
            </Form.Item>
          </Col>

          {/* Total Discount (raw) */}
          <Col xs={24} md={8}>
            <Form.Item
              label="Total Discount (From Vehicle Section)"
              name="do_selectedTotalDiscount"
            >
              <InputNumber style={{ width: "100%" }} disabled />
            </Form.Item>
          </Col>

          {/* Discount excluding vehicle value */}
          <Col xs={24} md={8}>
            <Form.Item
              label="Discount Excl. Vehicle Value"
              name="do_selectedDiscountExclVehicleValue"
            >
              <InputNumber style={{ width: "100%" }} disabled />
            </Form.Item>
          </Col>

          {/* Insurance By */}
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

          {/* Insurance Amount */}
          <Col xs={24} md={8}>
            <Form.Item
              label="Insurance Amount (From Vehicle Section)"
              name="do_selectedInsuranceCost"
            >
              <InputNumber style={{ width: "100%" }} disabled />
            </Form.Item>
          </Col>

          {/* Exchange Purchased By */}
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

          {/* Exchange details */}
          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Exchange Vehicle Details (if applicable)
            </div>
          </Col>

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

          {/* Finance */}
          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Finance Details
            </div>
          </Col>

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

          {/* Registration */}
          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Registration & Booking
            </div>
          </Col>

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

          {/* Deductions */}
          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Net DO Calculation (Auto)
            </div>
          </Col>

          <Col xs={24} md={6}>
            <Form.Item label="Insurance Deduction" name="do_insuranceDeduction">
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
    </div>
  );
};

export default Section5DODetails;
