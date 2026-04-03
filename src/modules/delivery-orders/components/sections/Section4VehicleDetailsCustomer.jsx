// src/modules/delivery-orders/components/sections/Section4VehicleDetailsCustomer.jsx

import React, { useEffect, useMemo, useRef } from "react";
import dayjs from "dayjs";
import {
  Row,
  Col,
  Form,
  Input,
  AutoComplete,
  DatePicker,
  Select,
  Divider,
  Button,
  Spin,
  Tag,
  Checkbox,
} from "antd";
import {
  CarOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useVehicleData } from "../../../../hooks/useVehicleData";
import { useTheme } from "../../../../context/ThemeContext";
import BreakdownSummaryCard from "../shared/BreakdownSummaryCard";
import DOAmountInput from "../shared/DOAmountInput";
import { IRDAI_INSURANCE_COMPANIES } from "../../../../constants/irdaiInsuranceCompanies";

const { Option } = Select;
const POLICY_DURATION_OPTIONS = [
  { value: "1", label: "1yr OD + 3yr TP" },
  { value: "2", label: "2yr OD + 3yr TP" },
  { value: "3", label: "3yr OD + 3yr TP" },
];

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const isMeaningfulText = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const lc = text.toLowerCase();
  return !["na", "n/a", "null", "undefined", "-", "--", "not set"].includes(lc);
};

const pickFirstMeaningfulText = (...values) => {
  for (const value of values) {
    if (isMeaningfulText(value)) return String(value).trim();
  }
  return "";
};

const hasValue = (val) => asInt(val) > 0;

// Shared UI helpers (same style as Section 5)
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

const Section4VehicleDetailsCustomer = () => {
  const form = Form.useFormInstance();
  const { isDarkMode } = useTheme();
  const customerSeededRef = useRef(false);

  // Centralized vehicle data
  const {
    makes,
    models,
    variants,
    loading: vehicleLoading,
    handleMakeChange,
    handleModelChange,
    handleVariantChange,
    showDiscontinuedCars,
    setShowDiscontinuedCars,
  } = useVehicleData(form, {
    makeFieldName: "do_customer_vehicleMake",
    modelFieldName: "do_customer_vehicleModel",
    variantFieldName: "do_customer_vehicleVariant",
    autofillPricing: false,
  });

  const do_vehicleMake = Form.useWatch("do_customer_vehicleMake", form);
  const do_vehicleModel = Form.useWatch("do_customer_vehicleModel", form);
  const insuranceStartDate = Form.useWatch(
    "do_customer_insurancePolicyStartDate",
    form,
  );
  const insurancePolicyDuration = Form.useWatch(
    "do_customer_insurancePolicyDurationOD",
    form,
  );

  const v = Form.useWatch([], form) || {};
  const customerAccountEnabled = !!v.do_showCustomerVehicleSection;

  const make = v.do_customer_vehicleMake;
  const model = v.do_customer_vehicleModel;
  const variant = v.do_customer_vehicleVariant;

  // Pricing inputs
  const exShowroom = asInt(v.do_customer_exShowroomPrice);
  const tcs = asInt(v.do_customer_tcs);
  const epc = asInt(v.do_customer_epc);
  const insuranceCost = asInt(v.do_customer_insuranceCost);
  const roadTax = asInt(v.do_customer_roadTax);
  const accessoriesAmount = asInt(v.do_customer_accessoriesAmount);
  const fastag = asInt(v.do_customer_fastag);
  const extendedWarranty = asInt(v.do_customer_extendedWarranty);

  const marginMoneyPaid = asInt(v.do_customer_marginMoneyPaid);

  const additionsOthers = Array.isArray(v.do_customer_additions_others)
    ? v.do_customer_additions_others
    : [];
  const additionsOthersTotal = additionsOthers.reduce(
    (sum, x) => sum + asInt(x?.amount),
    0,
  );

  // Customer discount fields
  const discountsOthers = Array.isArray(v.do_customer_discounts_others)
    ? v.do_customer_discounts_others
    : [];
  const discountsOthersTotal = discountsOthers.reduce(
    (sum, x) => sum + asInt(x?.amount),
    0,
  );

  const dealerDiscount = asInt(v.do_customer_dealerDiscount);
  const schemeDiscount = asInt(v.do_customer_schemeDiscount);
  const insuranceCashback = asInt(v.do_customer_insuranceCashback);
  const exchange = asInt(v.do_customer_exchange);
  const vehicleValue = asInt(v.do_customer_vehicleValue);
  const loyalty = asInt(v.do_customer_loyalty);
  const corporate = asInt(v.do_customer_corporate);

  // Calculations
  const onRoadVehicleCost =
    exShowroom +
    tcs +
    epc +
    insuranceCost +
    roadTax +
    accessoriesAmount +
    fastag +
    extendedWarranty +
    additionsOthersTotal;

  const totalDiscount =
    dealerDiscount +
    schemeDiscount +
    insuranceCashback +
    exchange +
    vehicleValue +
    loyalty +
    corporate +
    discountsOthersTotal;

  const netOnRoadVehicleCost = onRoadVehicleCost - totalDiscount;
  const grossDO = onRoadVehicleCost - marginMoneyPaid;

  useEffect(() => {
    if (!customerAccountEnabled) {
      customerSeededRef.current = false;
      return;
    }
    if (!form || customerSeededRef.current) return;

    const current = form.getFieldsValue(true);
    const patch = {};
    const copyIfEmpty = (targetKey, sourceValue) => {
      const targetValue = current?.[targetKey];
      const isEmptyArray =
        Array.isArray(targetValue) && targetValue.length === 0;
      const isEmptyValue =
        targetValue === undefined ||
        targetValue === null ||
        targetValue === "" ||
        isEmptyArray;
      if (isEmptyValue) {
        patch[targetKey] = sourceValue;
      }
    };

    copyIfEmpty("do_customer_vehicleMake", current?.do_vehicleMake || "");
    copyIfEmpty("do_customer_vehicleModel", current?.do_vehicleModel || "");
    copyIfEmpty("do_customer_vehicleVariant", current?.do_vehicleVariant || "");
    copyIfEmpty("do_customer_colour", current?.do_colour || "");
    copyIfEmpty("do_customer_exShowroomPrice", current?.do_exShowroomPrice ?? "");
    copyIfEmpty("do_customer_tcs", current?.do_tcs ?? "");
    copyIfEmpty("do_customer_epc", current?.do_epc ?? "");
    copyIfEmpty("do_customer_insuranceCost", current?.do_insuranceCost ?? "");
    copyIfEmpty("do_customer_roadTax", current?.do_roadTax ?? "");
    copyIfEmpty(
      "do_customer_accessoriesAmount",
      current?.do_accessoriesAmount ?? "",
    );
    copyIfEmpty("do_customer_fastag", current?.do_fastag ?? "");
    copyIfEmpty(
      "do_customer_extendedWarranty",
      current?.do_extendedWarranty ?? "",
    );
    copyIfEmpty(
      "do_customer_additions_others",
      Array.isArray(current?.do_additions_others)
        ? current.do_additions_others.map((item) => ({ ...item }))
        : [],
    );
    copyIfEmpty("do_customer_marginMoneyPaid", current?.do_marginMoneyPaid ?? "");
    copyIfEmpty(
      "do_customer_insuranceBy",
      pickFirstMeaningfulText(
        current?.do_insuranceBy,
        current?.insuranceBy,
        current?.insurance_by,
      ),
    );
    copyIfEmpty(
      "do_customer_insuranceCompanyName",
      pickFirstMeaningfulText(
        current?.do_customer_insuranceCompanyName,
        current?.insurance_company_name,
        current?.insuranceCompanyName,
      ),
    );
    copyIfEmpty(
      "do_customer_insurancePolicyNumber",
      pickFirstMeaningfulText(
        current?.do_customer_insurancePolicyNumber,
        current?.insurance_policy_number,
        current?.insurancePolicyNumber,
      ),
    );
    copyIfEmpty(
      "do_customer_actualInsurancePremium",
      current?.do_customer_actualInsurancePremium ??
        current?.insurance_premium ??
        "",
    );
    copyIfEmpty(
      "do_customer_insurancePolicyStartDate",
      current?.do_customer_insurancePolicyStartDate ||
        current?.insurance_policy_start_date ||
        "",
    );
    copyIfEmpty(
      "do_customer_insurancePolicyDurationOD",
      pickFirstMeaningfulText(
        current?.do_customer_insurancePolicyDurationOD,
        current?.insurance_policy_duration_od,
      ),
    );
    copyIfEmpty(
      "do_customer_insurancePolicyEndDateOD",
      current?.do_customer_insurancePolicyEndDateOD ||
        current?.insurance_policy_end_date_od ||
        "",
    );

    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
    customerSeededRef.current = true;
  }, [form, customerAccountEnabled]);

  useEffect(() => {
    if (!form || !customerAccountEnabled) return;
    const current = form.getFieldsValue(true);
    const patch = {};
    const isEmpty = (value) => value === undefined || value === null || value === "";

    const insuranceBySource = pickFirstMeaningfulText(
      current?.do_insuranceBy,
      current?.insuranceBy,
      current?.insurance_by,
    );
    if (isEmpty(current?.do_customer_insuranceBy) && insuranceBySource) {
      patch.do_customer_insuranceBy = insuranceBySource;
    }

    const companySource = pickFirstMeaningfulText(
      current?.insurance_company_name,
      current?.insuranceCompanyName,
    );
    if (isEmpty(current?.do_customer_insuranceCompanyName) && companySource) {
      patch.do_customer_insuranceCompanyName = companySource;
    }

    const policyNumberSource = pickFirstMeaningfulText(
      current?.insurance_policy_number,
      current?.insurancePolicyNumber,
    );
    if (isEmpty(current?.do_customer_insurancePolicyNumber) && policyNumberSource) {
      patch.do_customer_insurancePolicyNumber = policyNumberSource;
    }

    if (
      isEmpty(current?.do_customer_actualInsurancePremium) &&
      current?.insurance_premium !== undefined &&
      current?.insurance_premium !== null &&
      current?.insurance_premium !== ""
    ) {
      patch.do_customer_actualInsurancePremium = current.insurance_premium;
    }

    if (
      isEmpty(current?.do_customer_insurancePolicyStartDate) &&
      current?.insurance_policy_start_date
    ) {
      patch.do_customer_insurancePolicyStartDate =
        current.insurance_policy_start_date;
    }

    const policyDurationSource = pickFirstMeaningfulText(
      current?.insurance_policy_duration_od,
    );
    if (
      isEmpty(current?.do_customer_insurancePolicyDurationOD) &&
      policyDurationSource
    ) {
      patch.do_customer_insurancePolicyDurationOD = policyDurationSource;
    }

    if (
      isEmpty(current?.do_customer_insurancePolicyEndDateOD) &&
      current?.insurance_policy_end_date_od
    ) {
      patch.do_customer_insurancePolicyEndDateOD =
        current.insurance_policy_end_date_od;
    }

    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
  }, [
    form,
    customerAccountEnabled,
    v?.do_insuranceBy,
    v?.insuranceBy,
    v?.insurance_by,
    v?.insurance_company_name,
    v?.insuranceCompanyName,
    v?.insurance_policy_number,
    v?.insurancePolicyNumber,
    v?.insurance_premium,
    v?.insurance_policy_start_date,
    v?.insurance_policy_duration_od,
    v?.insurance_policy_end_date_od,
  ]);

  useEffect(() => {
    if (!form) return;
    if (!insuranceStartDate || !insurancePolicyDuration) {
      if (form.getFieldValue("do_customer_insurancePolicyEndDateOD")) {
        form.setFieldValue("do_customer_insurancePolicyEndDateOD", null);
      }
      return;
    }
    const start = dayjs(insuranceStartDate);
    if (!start.isValid()) return;

    const nextEndDate = start
      .add(Number(insurancePolicyDuration || 0), "year")
      .subtract(1, "day");
    if (!nextEndDate.isValid()) return;

    const existingEnd = form.getFieldValue("do_customer_insurancePolicyEndDateOD");
    const existingEndDay = existingEnd ? dayjs(existingEnd) : null;
    if (
      !existingEndDay ||
      !existingEndDay.isValid() ||
      !existingEndDay.isSame(nextEndDate, "day")
    ) {
      form.setFieldValue("do_customer_insurancePolicyEndDateOD", nextEndDate);
    }
  }, [form, insuranceStartDate, insurancePolicyDuration]);

  // Write computed values
  useEffect(() => {
    if (!form) return;
    form.setFieldsValue({
      do_customer_onRoadVehicleCost: onRoadVehicleCost,
      do_customer_grossDO: grossDO,
      do_customer_totalDiscount: totalDiscount,
      do_customer_netOnRoadVehicleCost: netOnRoadVehicleCost,
    });
  }, [form, onRoadVehicleCost, grossDO, totalDiscount, netOnRoadVehicleCost]);

  // Right-side summary
  const summarySections = useMemo(() => {
    const additionsList = additionsOthers
      .filter((x) => (x?.label || x?.amount) && hasValue(x?.amount))
      .map((x, idx) => ({
        key: `add-${idx}`,
        label: x?.label || "Others",
        amount: asInt(x?.amount),
      }));

    const discountsList = discountsOthers
      .filter((x) => (x?.label || x?.amount) && hasValue(x?.amount))
      .map((x, idx) => ({
        key: `disc-${idx}`,
        label: x?.label || "Others",
        amount: asInt(x?.amount),
      }));

    const additionsRows = [
      { label: "Ex-Showroom Price", value: exShowroom, intent: "addition" },
      { label: "TCS", value: tcs, intent: "addition" },
      { label: "EPC", value: epc, intent: "addition" },
      { label: "Insurance Cost", value: insuranceCost, intent: "addition" },
      { label: "Road Tax", value: roadTax, intent: "addition" },
      { label: "Accessories Amount", value: accessoriesAmount, intent: "addition" },
      { label: "Fastag", value: fastag, intent: "addition" },
      { label: "Extended Warranty", value: extendedWarranty, intent: "addition" },
      ...additionsList.map((item) => ({
        label: item.label,
        value: item.amount,
        intent: "addition",
      })),
    ].filter((r) => hasValue(r.value));

    const discountRows = [
      { label: "Margin Money Paid", value: marginMoneyPaid, intent: "discount" },
      { label: "Dealer Discount", value: dealerDiscount, intent: "discount" },
      { label: "Scheme Discount", value: schemeDiscount, intent: "discount" },
      { label: "Insurance Cashback", value: insuranceCashback, intent: "discount" },
      { label: "Exchange", value: exchange, intent: "discount" },
      { label: "Vehicle Value", value: vehicleValue, intent: "discount" },
      { label: "Loyalty", value: loyalty, intent: "discount" },
      { label: "Corporate", value: corporate, intent: "discount" },
      ...discountsList.map((item) => ({
        label: item.label,
        value: item.amount,
        intent: "discount",
      })),
    ].filter((r) => hasValue(r.value));

    return [
      { title: "On-road build-up", rows: additionsRows },
      { title: "Discounts / deductions", rows: discountRows },
      {
        title: "Customer on-road summary",
        rows: [
          { label: "OnRoad Vehicle Cost", value: onRoadVehicleCost, intent: "total", strong: true },
          { label: "Gross DO", value: grossDO, intent: "total", strong: true },
          { label: "Total Discount", value: totalDiscount, intent: "discount", strong: true },
          { label: "Net OnRoad Vehicle Cost", value: netOnRoadVehicleCost, intent: "total", strong: true },
          {
            label: "Net Payable to Showroom",
            value: netOnRoadVehicleCost - marginMoneyPaid,
            intent: "total",
            strong: true,
          },
        ],
      },
    ];
  }, [
    make,
    model,
    variant,
    exShowroom,
    tcs,
    epc,
    insuranceCost,
    roadTax,
    accessoriesAmount,
    fastag,
    extendedWarranty,
    additionsOthersTotal,
    discountsOthersTotal,
    additionsOthers,
    discountsOthers,
    onRoadVehicleCost,
    grossDO,
    marginMoneyPaid,
    dealerDiscount,
    schemeDiscount,
    insuranceCashback,
    exchange,
    vehicleValue,
    loyalty,
    corporate,
    totalDiscount,
    netOnRoadVehicleCost,
  ]);


  return (
    <div
      style={{
        "--do-text": isDarkMode ? "#f3f4f6" : "#111827",
        "--do-muted": isDarkMode ? "#9ca3af" : "#6b7280",
        "--do-chip": isDarkMode ? "#d1d5db" : "#4b5563",
        "--do-border": isDarkMode ? "#303030" : "#e5e7eb",
        marginBottom: 32,
        padding: 18,
        background: isDarkMode
          ? "linear-gradient(180deg, rgba(27,27,27,0.98) 0%, rgba(19,19,19,0.98) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
        borderRadius: 24,
        border: `1px solid ${isDarkMode ? "#303030" : "#dbe7f4"}`,
        boxShadow: isDarkMode
          ? "0 22px 48px rgba(0,0,0,0.24)"
          : "0 22px 48px rgba(37,99,235,0.08)",
      }}
    >
      {/* Top strip same pattern as Section 5 */}
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
          <CarOutlined style={{ color: isDarkMode ? "#f3f4f6" : "#111827" }} />
          <div>
            <HeadingLabel>Vehicle details</HeadingLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: isDarkMode ? "#f3f4f6" : "#111827",
              }}
            >
              Customer account pricing
            </div>
          </div>
          <Tag
            color="blue"
            style={{ borderRadius: 999, fontSize: 11, borderColor: "#1d4ed8" }}
          >
            Customer account
          </Tag>
        </div>
      </div>

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
          {/* Vehicle & pricing */}
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<CarOutlined style={{ color: "#1d4ed8" }} />}
              label="Vehicle & pricing"
            />
          </div>

          <Row gutter={[16, 8]}>
            {/* Make / Model / Variant / Colour */}
            <Col xs={24} md={8}>
              <InlineField label="Make">
                <Form.Item
                  name="do_customer_vehicleMake"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    bordered={false}
                    size="small"
                    placeholder="Select make"
                    allowClear
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleMakeChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs">
                          No makes available
                        </div>
                      )
                    }
                  >
                    {makes.map((m) => (
                      <Option key={m} value={m}>
                        {m}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Model">
                <Form.Item
                  name="do_customer_vehicleModel"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    bordered={false}
                    size="small"
                    placeholder={
                      do_vehicleMake ? "Select model" : "Select make first"
                    }
                    disabled={!do_vehicleMake}
                    allowClear
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleModelChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs">
                          No models available
                        </div>
                      )
                    }
                  >
                    {models.map((m) => (
                      <Option key={m} value={m}>
                        {m}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Variant">
                <Form.Item
                  name="do_customer_vehicleVariant"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    bordered={false}
                    size="small"
                    placeholder={
                      do_vehicleModel ? "Select variant" : "Select model first"
                    }
                    disabled={!do_vehicleModel}
                    allowClear
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleVariantChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs">
                          No variants available
                        </div>
                      )
                    }
                  >
                    {variants.map((vName) => (
                      <Option key={vName} value={vName}>
                        {vName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </InlineField>
            </Col>
            <Col xs={24}>
              <Form.Item style={{ marginBottom: 6 }}>
                <Checkbox
                  checked={showDiscontinuedCars}
                  onChange={(event) =>
                    setShowDiscontinuedCars(event?.target?.checked)
                  }
                >
                  Show discontinued cars
                </Checkbox>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Colour">
                <Form.Item name="do_customer_colour" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="Enter colour"
                  />
                </Form.Item>
              </InlineField>
            </Col>

            {/* Pricing additions */}
            <Col xs={24} md={8}>
              <InlineField label="Ex-Showroom Price">
                <Form.Item
                  name="do_customer_exShowroomPrice"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="TCS">
                <Form.Item name="do_customer_tcs" style={{ marginBottom: 0 }}>
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="EPC">
                <Form.Item name="do_customer_epc" style={{ marginBottom: 0 }}>
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Insurance Cost">
                <Form.Item
                  name="do_customer_insuranceCost"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Road Tax">
                <Form.Item
                  name="do_customer_roadTax"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Accessories Amount">
                <Form.Item
                  name="do_customer_accessoriesAmount"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Fastag">
                <Form.Item name="do_customer_fastag" style={{ marginBottom: 0 }}>
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Extended Warranty">
                <Form.Item
                  name="do_customer_extendedWarranty"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            {/* Others (additions) */}
            <Col xs={24}>
              <Divider style={{ margin: "10px 0" }} />
              <SectionChip
                icon={<PlusOutlined style={{ fontSize: 11 }} />}
                label="Others (additions)"
              />
            </Col>

            <Col xs={24}>
              <Form.List name="do_customer_additions_others">
                {(fields, { add, remove }) => (
                  <>
                    {fields.length === 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginBottom: 8,
                        }}
                      >
                        No addition items added.
                      </div>
                    )}

                    {fields.map(({ key, name }) => (
                      <Row
                        key={key}
                        gutter={[12, 12]}
                        align="middle"
                        style={{ marginBottom: 8 }}
                      >
                        <Col xs={24} md={14}>
                          <Form.Item
                            name={[name, "label"]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input
                              bordered={false}
                              size="small"
                              placeholder="e.g., Handling Charges"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            name={[name, "amount"]}
                            style={{ marginBottom: 0 }}
                          >
                            <DOAmountInput
                              bordered={false}
                              size="small"
                              style={{ width: "100%" }}
                              controls={false}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={2}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              height: 32,
                            }}
                          >
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                            />
                          </div>
                        </Col>
                      </Row>
                    ))}

                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => add({ label: "", amount: "" })}
                    >
                      Add Others (Additions)
                    </Button>
                  </>
                )}
              </Form.List>
            </Col>

            {/* Computed base values */}
            <Col xs={24} md={8}>
              <InlineField label="OnRoad Vehicle Cost">
                <Form.Item
                  name="do_customer_onRoadVehicleCost"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                    disabled
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Margin Money Paid">
                <Form.Item
                  name="do_customer_marginMoneyPaid"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Gross DO">
                <Form.Item
                  name="do_customer_grossDO"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                    disabled
                  />
                </Form.Item>
              </InlineField>
            </Col>

            {/* Discounts / Deductions */}
            <Col xs={24}>
              <Divider style={{ margin: "10px 0" }} />
              <SectionChip
                icon={<InfoCircleOutlined style={{ fontSize: 11 }} />}
                label="Discounts / deductions (customer)"
              />
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Dealer Discount">
                <Form.Item
                  name="do_customer_dealerDiscount"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Scheme Discount">
                <Form.Item
                  name="do_customer_schemeDiscount"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Insurance Cashback">
                <Form.Item
                  name="do_customer_insuranceCashback"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Exchange">
                <Form.Item
                  name="do_customer_exchange"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Vehicle Value">
                <Form.Item
                  name="do_customer_vehicleValue"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Loyalty">
                <Form.Item
                  name="do_customer_loyalty"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Corporate">
                <Form.Item
                  name="do_customer_corporate"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            {/* Others (discounts) */}
            <Col xs={24}>
              <div style={{ fontWeight: 600, marginTop: 4, marginBottom: 8 }}>
                Others (Discounts)
              </div>
              <Form.List name="do_customer_discounts_others">
                {(fields, { add, remove }) => (
                  <>
                    {fields.length === 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginBottom: 8,
                        }}
                      >
                        No discount items added.
                      </div>
                    )}

                    {fields.map(({ key, name }) => (
                      <Row
                        key={key}
                        gutter={[12, 12]}
                        align="middle"
                        style={{ marginBottom: 8 }}
                      >
                        <Col xs={24} md={14}>
                          <Form.Item
                            name={[name, "label"]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input
                              bordered={false}
                              size="small"
                              placeholder="e.g., Special Offer"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            name={[name, "amount"]}
                            style={{ marginBottom: 0 }}
                          >
                            <DOAmountInput
                              bordered={false}
                              size="small"
                              style={{ width: "100%" }}
                              controls={false}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={2}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              height: 32,
                            }}
                          >
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                            />
                          </div>
                        </Col>
                      </Row>
                    ))}

                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => add({ label: "", amount: "" })}
                    >
                      Add Others (Discounts)
                    </Button>
                  </>
                )}
              </Form.List>
            </Col>

            {/* Computed customer totals */}
            <Col xs={24} md={8}>
              <InlineField label="Total Discount">
                <Form.Item
                  name="do_customer_totalDiscount"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                    disabled
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Net OnRoad Vehicle Cost">
                <Form.Item
                  name="do_customer_netOnRoadVehicleCost"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                    disabled
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24}>
              <Divider style={{ margin: "10px 0" }} />
              <SectionChip
                icon={<InfoCircleOutlined style={{ fontSize: 11 }} />}
                label="Insurance details (customer)"
              />
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Insurance By">
                <Form.Item name="do_customer_insuranceBy" style={{ marginBottom: 0 }}>
                  <Select
                    bordered={false}
                    size="small"
                    placeholder="Select"
                    allowClear
                    options={[
                      { label: "Autocredits India LLP", value: "Autocredits India LLP" },
                      { label: "Customer", value: "Customer" },
                      { label: "Showroom", value: "Showroom" },
                      { label: "Broker", value: "Broker" },
                    ]}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Insurance Company Name">
                <Form.Item
                  name="do_customer_insuranceCompanyName"
                  style={{ marginBottom: 0 }}
                >
                  <AutoComplete
                    options={IRDAI_INSURANCE_COMPANIES.map((company) => ({
                      value: company,
                      label: company,
                    }))}
                    filterOption={(input, option) =>
                      String(option?.value || "")
                        .toLowerCase()
                        .includes(String(input || "").toLowerCase())
                    }
                  >
                    <Input
                      bordered={false}
                      size="small"
                      placeholder="Start typing insurer name"
                    />
                  </AutoComplete>
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Policy Number">
                <Form.Item
                  name="do_customer_insurancePolicyNumber"
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="e.g., POL123456"
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Actual Insurance Premium">
                <Form.Item
                  name="do_customer_actualInsurancePremium"
                  style={{ marginBottom: 0 }}
                >
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Policy Start Date">
                <Form.Item
                  name="do_customer_insurancePolicyStartDate"
                  style={{ marginBottom: 0 }}
                >
                  <DatePicker
                    bordered={false}
                    size="small"
                    format="DD/MM/YYYY"
                    style={{ width: "100%" }}
                    allowClear
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Policy Duration">
                <Form.Item
                  name="do_customer_insurancePolicyDurationOD"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    bordered={false}
                    size="small"
                    placeholder="Select duration"
                    allowClear
                    options={POLICY_DURATION_OPTIONS}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Policy End Date (OD)">
                <Form.Item
                  name="do_customer_insurancePolicyEndDateOD"
                  style={{ marginBottom: 0 }}
                >
                  <DatePicker
                    bordered={false}
                    size="small"
                    format="DD/MM/YYYY"
                    style={{ width: "100%" }}
                    allowClear
                    disabled
                  />
                </Form.Item>
              </InlineField>
            </Col>
          </Row>
        </Col>

        {/* RIGHT: SUMMARY */}
        <Col
          xs={24}
          lg={10}
          style={{
            paddingLeft: 24,
            alignSelf: "flex-start",
          }}
        >
          <BreakdownSummaryCard
            isDarkMode={isDarkMode}
            eyebrow="Customer on-road breakdown"
            title={`${make || "-"} ${model || ""} ${variant || ""}`.trim()}
            subtitle="Customer account"
            chipLabel="Customer"
            chipTone="purple"
            sections={summarySections}
            sticky
          />
        </Col>
      </Row>
    </div>
  );
};

export default Section4VehicleDetailsCustomer;
