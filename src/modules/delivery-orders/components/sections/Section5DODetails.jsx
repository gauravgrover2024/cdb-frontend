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
  BankOutlined,
  CarOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useTheme } from "../../../../context/ThemeContext";
import BreakdownSummaryCard from "../shared/BreakdownSummaryCard";

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
      color: "var(--do-chip, #4b5563)",
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
      color: "var(--do-muted, #6b7280)",
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
      color: color || "var(--do-text, #111827)",
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
          color: "var(--do-muted, #6b7280)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
    )}
    <div
      style={{
        borderBottom: "1px solid var(--do-border, #e5e7eb)",
        paddingBottom: 2,
      }}
    >
      {children}
    </div>
  </div>
);

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
  const { isDarkMode } = useTheme();
  const watchedValues = Form.useWatch([], form);
  const v = useMemo(() => watchedValues || {}, [watchedValues]);

  const doAccountType = v.do_accountType || "Showroom";
  const isFinanced =
    safeText(loan?.isFinanced).toLowerCase() === "yes" ||
    safeText(loan?.loanType).toLowerCase() === "financed";
  const netOffDiscount = !!v.do_netOffDiscount;

  // ── Source values based on account type ──────────────────────────────────
  const selectedOnRoad = asInt(v.do_onRoadVehicleCost);
  const selectedGrossDO = asInt(v.do_grossDO);
  const selectedMarginMoney = asInt(v.do_marginMoneyPaid);
  const selectedInsuranceCost = asInt(v.do_insuranceCost);
  const exchangeVehiclePrice = asInt(v.do_exchangeVehiclePrice);

  // Total discount from the active account section
  // Section3 totalDiscount already includes exchangeVehiclePrice — we must NOT deduct it again
  const rawTotalDiscount =
    doAccountType === "Customer"
      ? asInt(v.do_customer_totalDiscount)
      : asInt(v.do_totalDiscount);

  // ── Adjustment entry logic ────────────────────────────────────────────────
  // Insurance deduction: only deduct if insurance is NOT paid by showroom
  // (if showroom pays insurance, it's already in their cost — no separate deduction)
  const insuranceBy = safeText(v.do_insuranceBy);
  const insuranceDeductForNet =
    insuranceBy.toLowerCase() === "showroom" ? 0 : selectedInsuranceCost;

  // Exchange vehicle: Section3 already includes exchangeVehiclePrice in totalDiscount.
  // In Section5 we only need to handle the case where exchange is purchased by Autocredits
  // (not showroom) — in that case the vehicle value should NOT be in the discount at all,
  // so we add it back (cancel the discount) and don't deduct it separately.
  const exchangePurchasedBy = safeText(v.do_exchangePurchasedBy);
  // If purchased by Autocredits: exchange value was wrongly included in discount → add back
  // If purchased by Showroom: exchange value stays in discount (showroom absorbs it)
  const exchangeAddBack =
    exchangePurchasedBy.toLowerCase() === "showroom" ? 0 : exchangeVehiclePrice;

  // Effective discount applied to Net DO
  // netOffDiscount = ignore all discounts (borne externally)
  const effectiveDiscount = netOffDiscount ? 0 : Math.max(0, rawTotalDiscount - exchangeAddBack);

  // Finance deduction: net loan disbursed minus processing fees
  const loanAmount = asInt(v.do_loanAmount);
  const processingFees = asInt(v.do_processingFees);
  const financeNetValue = isFinanced ? Math.max(0, loanAmount - processingFees) : 0;

  // ── Final Net DO ──────────────────────────────────────────────────────────
  // Net DO = OnRoad - MarginMoney - EffectiveDiscount - FinanceNet - InsuranceDeduction
  const netDOAmountFinal =
    selectedOnRoad -
    selectedMarginMoney -
    effectiveDiscount -
    financeNetValue -
    insuranceDeductForNet;

  // Keep legacy aliases for hidden form fields & summary rows
  const showroomOnRoadPayable = selectedOnRoad;
  const showroomMarginMoneyPaid = selectedMarginMoney;
  const discountExcludingVehicleValue = effectiveDiscount;
  const vehicleValueDeductForNet = exchangeAddBack;
  const selectedVehicleCost = selectedOnRoad;
  const selectedTotalDiscount = rawTotalDiscount;
  const selectedVehicleValue = exchangeVehiclePrice;

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
          loan?.postfile_loanAmountDisbursed ??
          loan?.postfile_netLoanAmount ??
          loan?.postFile?.loanAmountDisbursed ??
          loan?.postFile?.netLoanAmount ??
          loan?.postfile_disbursedLoan ??
          loan?.disbursedLoanAmount ??
          loan?.loanAmount ??
          "",
      });
    }

    // PF is always manually editable — only prefill if completely empty on first load
    if (
      existing?.do_processingFees === undefined ||
      existing?.do_processingFees === null
    ) {
      form.setFieldsValue({
        do_processingFees:
          loan?.postFile?.processingFees ??
          loan?.postFile?.postfile_processingFees ??
          loan?.postfile?.processingFees ??
          loan?.postfile?.postfile_processingFees ??
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
      do_selectedEffectiveTotalDiscount: effectiveDiscount,
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
    effectiveDiscount,
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

  const doSummarySections = useMemo(
    () => [
      {
        title: "DO header",
        rows: [
          { label: "Account Type", value: doAccountType || "Showroom", raw: true },
          {
            label: "Booking Date",
            value: v?.do_bookingDate
              ? dayjs(v.do_bookingDate).format("DD/MM/YYYY")
              : "—",
            raw: true,
          },
          {
            label: "Insurance By",
            value: safeText(insuranceBy) || "—",
            raw: true,
          },
          {
            label: "Exchange Purchased By",
            value: safeText(exchangePurchasedBy) || "—",
            raw: true,
          },
        ],
      },
      {
        title: "Finance & registration",
        rows: [
          { label: "Loan Amount", value: loanAmount, intent: "addition" },
          { label: "Processing Fees", value: processingFees, intent: "warning" },
          {
            label: "Hypothecation Bank",
            value: safeText(v?.do_hypothecation) || "—",
            raw: true,
          },
          {
            label: "Registration Type",
            value: safeText(v?.do_redgRequired) || "—",
            raw: true,
          },
          {
            label: "Registration City",
            value: safeText(v?.do_redgCity) || "—",
            raw: true,
          },
        ],
      },
      {
        title: "Net DO breakdown",
        rows: [
          { label: "On-road Payable (Showroom)", value: showroomOnRoadPayable, intent: "addition" },
          { label: "Margin Money Paid", value: showroomMarginMoneyPaid, intent: "discount" },
          {
            label: netOffDiscount
              ? "Discount (net-off applied)"
              : exchangeAddBack > 0
                ? `Discount Applied (excl. exchange)`
                : "Discount Applied",
            value: discountExcludingVehicleValue,
            intent: "discount",
            strong: netOffDiscount,
          },
          { label: "Net Finance (Loan − PF)", value: financeNetValue, intent: "warning" },
          {
            label:
              insuranceBy.toLowerCase() === "showroom"
                ? "Insurance (by Showroom — not deducted)"
                : "Insurance Deduction",
            value: insuranceDeductForNet,
            intent: "warning",
          },
          {
            label: "Net DO Amount (Final)",
            value: netDOAmountFinal,
            intent: netDOAmountFinal < 0 ? "discount" : "total",
            strong: true,
          },
        ],
      },
    ],
    [
      discountExcludingVehicleValue,
      doAccountType,
      exchangeAddBack,
      exchangePurchasedBy,
      financeNetValue,
      insuranceBy,
      insuranceDeductForNet,
      loanAmount,
      netDOAmountFinal,
      netOffDiscount,
      processingFees,
      showroomMarginMoneyPaid,
      showroomOnRoadPayable,
      v,
    ],
  );

  return (
    <div
      style={{
        "--do-text": isDarkMode ? "#f3f4f6" : "#111827",
        "--do-muted": isDarkMode ? "#9ca3af" : "#6b7280",
        "--do-chip": isDarkMode ? "#d1d5db" : "#4b5563",
        "--do-border": isDarkMode ? "#303030" : "#e5e7eb",
        marginBottom: 32,
        padding: 18,
        background: isDarkMode ? "#1b1b1b" : "#f9fafb",
        borderRadius: 16,
        border: `1px solid ${isDarkMode ? "#303030" : "#e5e7eb"}`,
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
            borderRight: `1px solid ${isDarkMode ? "#303030" : "#e5e7eb"}`,
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
                    popupMatchSelectWidth={220}
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
                    popupMatchSelectWidth={220}
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
                    popupMatchSelectWidth={220}
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
              <InlineField label="Processing Fees (manual / editable)">
                <Form.Item name="do_processingFees" style={{ marginBottom: 0 }}>
                  <InputNumber
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                    placeholder="Enter PF manually"
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
                    popupMatchSelectWidth={180}
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
                    format="DD/MM/YYYY"
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
                    format="DD/MM/YYYY"
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
          <BreakdownSummaryCard
            isDarkMode={isDarkMode}
            eyebrow="Net DO breakdown"
            title={safeText(v?.do_refNo) || "Delivery Order"}
            subtitle={
              doAccountType === "Customer"
                ? "Customer account view"
                : "Showroom account view"
            }
            chipLabel={isFinanced ? "Financed" : "Cash"}
            chipTone={isFinanced ? "blue" : "green"}
            sections={doSummarySections}
            sticky
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
