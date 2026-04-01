// src/modules/delivery-orders/components/sections/Section3VehicleDetailsShowroom.jsx

import React, { useEffect, useMemo, useRef, useCallback } from "react";
import {
  Form,
  Input,
  Row,
  Col,
  Divider,
  Button,
  Select,
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

const { Option } = Select;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const pickFirst = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const t = String(value).trim();
    if (!t) continue;
    if (["na", "n/a", "null", "undefined", "-", "--"].includes(t.toLowerCase())) continue;
    return value;
  }
  return "";
};

// show only if value > 0
const hasValue = (val) => asInt(val) > 0;

// Shared UI helpers (same style as Section 4 & 5)
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

const Section3VehicleDetailsShowroom = ({ loan }) => {
  const form = Form.useFormInstance();
  const { isDarkMode } = useTheme();
  const initialLoanPrefillDoneRef = useRef(false);
  const handleVehicleSelect = useCallback(
    (vehicleData) => {
      if (!vehicleData) return;
      const currentValues = form.getFieldsValue();
      const fieldsToUpdate = {};

      // Only hydrate when truly uninitialized. If user cleared a value (null/""),
      // we keep it cleared and never auto-reinsert.
      if (
        currentValues.do_exShowroomPrice === undefined &&
        vehicleData.exShowroom
      ) {
        fieldsToUpdate.do_exShowroomPrice = vehicleData.exShowroom;
      }
      if (
        currentValues.do_insuranceCost === undefined &&
        vehicleData.insurance
      ) {
        fieldsToUpdate.do_insuranceCost = vehicleData.insurance;
      }
      if (currentValues.do_roadTax === undefined && vehicleData.rto) {
        fieldsToUpdate.do_roadTax = vehicleData.rto;
      }

      if (Object.keys(fieldsToUpdate).length > 0) {
        form.setFieldsValue(fieldsToUpdate);
      }
    },
    [form],
  );

  // Vehicle data hook
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
    makeFieldName: "do_vehicleMake",
    modelFieldName: "do_vehicleModel",
    variantFieldName: "do_vehicleVariant",
    autofillPricing: true,
    onVehicleSelect: handleVehicleSelect,
  });

  const do_vehicleMake = Form.useWatch("do_vehicleMake", form);
  const do_vehicleModel = Form.useWatch("do_vehicleModel", form);

  // Prefill from loan
  useEffect(() => {
    if (!form) return;
    if (initialLoanPrefillDoneRef.current) return;

    const existing = form.getFieldsValue(true);
    const patch = {};

    if (!existing?.do_vehicleMake)
      patch.do_vehicleMake = safeText(loan?.vehicleMake);

    if (!existing?.do_vehicleModel)
      patch.do_vehicleModel = safeText(loan?.vehicleModel);

    if (!existing?.do_vehicleVariant)
      patch.do_vehicleVariant = safeText(loan?.vehicleVariant);

    if (existing?.do_exShowroomPrice === undefined) {
      patch.do_exShowroomPrice = pickFirst(
        loan?.exShowroomPrice,
        loan?.ex_showroom,
        loan?.exShowroom,
        loan?.vehiclePricing?.exShowroom,
        loan?.pricing?.exShowroom,
        "",
      );
    }

    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
    initialLoanPrefillDoneRef.current = true;
  }, [form, loan]);

  // Watch all values
  const v = Form.useWatch([], form) || {};

  const make = v.do_vehicleMake;
  const model = v.do_vehicleModel;
  const variant = v.do_vehicleVariant;

  const exShowroom = asInt(v.do_exShowroomPrice);
  const tcs = asInt(v.do_tcs);
  const epc = asInt(v.do_epc);
  const insuranceCost = asInt(v.do_insuranceCost);
  const roadTax = asInt(v.do_roadTax);
  const accessoriesAmount = asInt(v.do_accessoriesAmount);
  const fastag = asInt(v.do_fastag);
  const extendedWarranty = asInt(v.do_extendedWarranty);

  const marginMoneyPaid = asInt(v.do_marginMoneyPaid);

  const additionsOthers = Array.isArray(v.do_additions_others)
    ? v.do_additions_others
    : [];
  const additionsOthersTotal = additionsOthers.reduce(
    (sum, x) => sum + asInt(x?.amount),
    0,
  );

  const discountsOthers = Array.isArray(v.do_discounts_others)
    ? v.do_discounts_others
    : [];
  const discountsOthersTotal = discountsOthers.reduce(
    (sum, x) => sum + asInt(x?.amount),
    0,
  );

  const dealerDiscount = asInt(v.do_dealerDiscount);
  const schemeDiscount = asInt(v.do_schemeDiscount);
  const insuranceCashback = asInt(v.do_insuranceCashback);
  const exchange = asInt(v.do_exchange);
  const exchangeVehiclePrice = asInt(v.do_exchangeVehiclePrice);
  const loyalty = asInt(v.do_loyalty);
  const corporate = asInt(v.do_corporate);

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

  const grossDO = onRoadVehicleCost - marginMoneyPaid;

  const totalDiscount =
    dealerDiscount +
    schemeDiscount +
    insuranceCashback +
    exchange +
    exchangeVehiclePrice +
    loyalty +
    corporate +
    discountsOthersTotal;

  const netOnRoadVehicleCost = onRoadVehicleCost - totalDiscount;

  // Write computed values into form
  useEffect(() => {
    if (!form) return;

    form.setFieldsValue({
      do_onRoadVehicleCost: onRoadVehicleCost,
      do_grossDO: grossDO,
      do_totalDiscount: totalDiscount,
      do_netOnRoadVehicleCost: netOnRoadVehicleCost,
    });
  }, [form, onRoadVehicleCost, grossDO, totalDiscount, netOnRoadVehicleCost]);

  // Right summary – same pattern as Section 4/5
  const summarySections = useMemo(() => {
    const additionsList = additionsOthers
      .filter((x) => (x?.label || x?.amount) && hasValue(x?.amount))
      .map((x, idx) => ({
        key: `add-${idx}`,
        label: x?.label || `Addition ${idx + 1}`,
        amount: asInt(x?.amount),
      }));

    const discountsList = discountsOthers
      .filter((x) => (x?.label || x?.amount) && hasValue(x?.amount))
      .map((x, idx) => ({
        key: `disc-${idx}`,
        label: x?.label || `Discount ${idx + 1}`,
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
      { label: "Exchange Vehicle Price", value: exchangeVehiclePrice, intent: "discount" },
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
        title: "Showroom on-road summary",
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
    onRoadVehicleCost,
    grossDO,
    marginMoneyPaid,
    dealerDiscount,
    schemeDiscount,
    insuranceCashback,
    exchange,
    exchangeVehiclePrice,
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
      {/* Top strip – same pattern as Section 4/5 */}
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
              Showroom account pricing
            </div>
          </div>
          <Tag
            color="blue"
            style={{ borderRadius: 999, fontSize: 11, borderColor: "#1d4ed8" }}
          >
            Showroom account
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
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<CarOutlined style={{ color: "#1d4ed8" }} />}
              label="Vehicle & pricing"
            />
          </div>

          <Row gutter={[16, 8]}>
            {/* Make / Model / Variant */}
            <Col xs={24} md={8}>
              <InlineField label="Make">
                <Form.Item name="do_vehicleMake" style={{ marginBottom: 0 }}>
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
                <Form.Item name="do_vehicleModel" style={{ marginBottom: 0 }}>
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
                <Form.Item name="do_vehicleVariant" style={{ marginBottom: 0 }}>
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

            {/* Colour */}
            <Col xs={24} md={8}>
              <InlineField label="Colour">
                <Form.Item name="do_colour" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="Enter colour"
                  />
                </Form.Item>
              </InlineField>
            </Col>

            {/* Pricing inputs */}
            <Col xs={24} md={8}>
              <InlineField label="Ex-Showroom Price">
                <Form.Item
                  name="do_exShowroomPrice"
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
                <Form.Item name="do_tcs" style={{ marginBottom: 0 }}>
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
                <Form.Item name="do_epc" style={{ marginBottom: 0 }}>
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
                <Form.Item name="do_insuranceCost" style={{ marginBottom: 0 }}>
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
                <Form.Item name="do_roadTax" style={{ marginBottom: 0 }}>
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
                  name="do_accessoriesAmount"
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
                <Form.Item name="do_fastag" style={{ marginBottom: 0 }}>
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
                  name="do_extendedWarranty"
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

            {/* Others (Additions) */}
            <Col xs={24}>
              <Divider style={{ margin: "10px 0" }} />
              <SectionChip
                icon={<PlusOutlined style={{ fontSize: 11 }} />}
                label="Others (additions)"
              />
            </Col>

            <Col xs={24}>
              <Form.List name="do_additions_others">
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

            {/* Computed */}
            <Col xs={24} md={8}>
              <InlineField label="OnRoad Vehicle Cost">
                <Form.Item
                  name="do_onRoadVehicleCost"
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
                  name="do_marginMoneyPaid"
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
                <Form.Item name="do_grossDO" style={{ marginBottom: 0 }}>
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

            {/* Discounts */}
            <Col xs={24}>
              <Divider style={{ margin: "10px 0" }} />
              <SectionChip
                icon={<InfoCircleOutlined style={{ fontSize: 11 }} />}
                label="Discounts / deductions (showroom)"
              />
            </Col>

            <Col xs={24} md={8}>
              <InlineField label="Dealer Discount">
                <Form.Item name="do_dealerDiscount" style={{ marginBottom: 0 }}>
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
                <Form.Item name="do_schemeDiscount" style={{ marginBottom: 0 }}>
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
                  name="do_insuranceCashback"
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
                <Form.Item name="do_exchange" style={{ marginBottom: 0 }}>
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
              <InlineField label="Exchange Vehicle Price">
                <Form.Item
                  name="do_exchangeVehiclePrice"
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
                <Form.Item name="do_loyalty" style={{ marginBottom: 0 }}>
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
                <Form.Item name="do_corporate" style={{ marginBottom: 0 }}>
                  <DOAmountInput
                    bordered={false}
                    size="small"
                    style={{ width: "100%" }}
                    controls={false}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            {/* Others (Discounts) */}
            <Col xs={24}>
              <div style={{ fontWeight: 600, marginTop: 4, marginBottom: 8 }}>
                Others (Discounts)
              </div>
              <Form.List name="do_discounts_others">
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

            {/* Computed totals */}
            <Col xs={24} md={8}>
              <InlineField label="Total Discount">
                <Form.Item name="do_totalDiscount" style={{ marginBottom: 0 }}>
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
                  name="do_netOnRoadVehicleCost"
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
            eyebrow="Showroom on-road breakdown"
            title={`${make || "-"} ${model || ""} ${variant || ""}`.trim()}
            subtitle="Showroom account"
            chipLabel="Showroom"
            chipTone="blue"
            sections={summarySections}
            sticky
          />
        </Col>
      </Row>
    </div>
  );
};

export default Section3VehicleDetailsShowroom;
