import React, { useEffect, useMemo } from "react";
import {
  Form,
  Input,
  Row,
  Col,
  Card,
  Divider,
  InputNumber,
  Button,
  Select,
  Spin,
} from "antd";
import { CarOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useVehicleData } from "../../../../hooks/useVehicleData";

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

// show only if value > 0
const hasValue = (val) => asInt(val) > 0;

const Section3VehicleDetailsShowroom = ({ loan }) => {
  const form = Form.useFormInstance();

  // Use centralized vehicle data hook
  const {
    makes,
    models,
    variants,
    loading: vehicleLoading,
    handleMakeChange,
    handleModelChange,
    handleVariantChange,
  } = useVehicleData(form, {
    makeFieldName: "do_vehicleMake",
    modelFieldName: "do_vehicleModel",
    variantFieldName: "do_vehicleVariant",
    autofillPricing: true,
    onVehicleSelect: (vehicleData) => {
      console.log("Vehicle selected from master data:", vehicleData);
      // Auto-populate pricing if available
      if (vehicleData) {
        const currentValues = form.getFieldsValue();
        const fieldsToUpdate = {};

        if (!currentValues.do_exShowroomPrice && vehicleData.exShowroom) {
          fieldsToUpdate.do_exShowroomPrice = vehicleData.exShowroom;
        }
        if (!currentValues.do_insuranceCost && vehicleData.insurance) {
          fieldsToUpdate.do_insuranceCost = vehicleData.insurance;
        }
        if (!currentValues.do_roadTax && vehicleData.rto) {
          fieldsToUpdate.do_roadTax = vehicleData.rto;
        }

        if (Object.keys(fieldsToUpdate).length > 0) {
          form.setFieldsValue(fieldsToUpdate);
        }
      }
    },
  });

  const do_vehicleMake = Form.useWatch("do_vehicleMake", form);
  const do_vehicleModel = Form.useWatch("do_vehicleModel", form);

  // ---------------------------
  // Prefill from Loan (read only fetch)
  // ---------------------------
  useEffect(() => {
    if (!form) return;

    const existing = form.getFieldsValue(true);

    if (!existing?.do_vehicleMake)
      form.setFieldsValue({ do_vehicleMake: safeText(loan?.vehicleMake) });

    if (!existing?.do_vehicleModel)
      form.setFieldsValue({ do_vehicleModel: safeText(loan?.vehicleModel) });

    if (!existing?.do_vehicleVariant)
      form.setFieldsValue({
        do_vehicleVariant: safeText(loan?.vehicleVariant),
      });

    if (
      existing?.do_exShowroomPrice === undefined ||
      existing?.do_exShowroomPrice === ""
    ) {
      form.setFieldsValue({
        do_exShowroomPrice: loan?.exShowroomPrice ?? "",
      });
    }
  }, [form, loan]);

  // ---------------------------
  // Watch all values for calc
  // ---------------------------
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
    0
  );

  const discountsOthers = Array.isArray(v.do_discounts_others)
    ? v.do_discounts_others
    : [];
  const discountsOthersTotal = discountsOthers.reduce(
    (sum, x) => sum + asInt(x?.amount),
    0
  );

  const dealerDiscount = asInt(v.do_dealerDiscount);
  const schemeDiscount = asInt(v.do_schemeDiscount);
  const insuranceCashback = asInt(v.do_insuranceCashback);
  const exchange = asInt(v.do_exchange);
  const exchangeVehiclePrice = asInt(v.do_exchangeVehiclePrice);
  const loyalty = asInt(v.do_loyalty);
  const corporate = asInt(v.do_corporate);

  // ---------------------------
  // CALCULATIONS (as per your rules)
  // ---------------------------
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

  // ✅ Gross DO = OnRoad Vehicle Cost - Margin Money Paid
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

  // write computed values into form
  useEffect(() => {
    if (!form) return;

    form.setFieldsValue({
      do_onRoadVehicleCost: onRoadVehicleCost,
      do_grossDO: grossDO,
      do_totalDiscount: totalDiscount,
      do_netOnRoadVehicleCost: netOnRoadVehicleCost,
    });
  }, [form, onRoadVehicleCost, grossDO, totalDiscount, netOnRoadVehicleCost]);

  // ---------------------------
  // Summary card (sticky + show only non-zero)
  // ---------------------------
  const SummaryCard = useMemo(() => {
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
      { label: "Ex-Showroom Price", value: exShowroom },
      { label: "+ TCS", value: tcs },
      { label: "+ EPC", value: epc },
      { label: "+ Insurance Cost", value: insuranceCost },
      { label: "+ Road Tax", value: roadTax },
      { label: "+ Accessories Amount", value: accessoriesAmount },
      { label: "+ Fastag", value: fastag },
      { label: "+ Extended Warranty", value: extendedWarranty },
    ].filter((r) => hasValue(r.value));

    const discountRows = [
      { label: "- Margin Money Paid", value: marginMoneyPaid },
      { label: "- Dealer Discount", value: dealerDiscount },
      { label: "- Scheme Discount", value: schemeDiscount },
      { label: "- Insurance Cashback", value: insuranceCashback },
      { label: "- Exchange", value: exchange },
      { label: "- Exchange Vehicle Price", value: exchangeVehiclePrice },

      { label: "- Loyalty", value: loyalty },
      { label: "- Corporate", value: corporate },
    ].filter((r) => hasValue(r.value));

    return (
      <Card
        style={{
          position: "sticky",
          top: 16,
          borderRadius: 12,
          background: "#fafafa",
          border: "1px solid #f0f0f0",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          {make || "-"} {model || ""} {variant || ""}
        </div>

        <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
          Vehicle Summary
        </div>

        <Divider style={{ margin: "8px 0" }} />

        {/* ADDITIONS */}
        {additionsRows.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              Additions
            </div>
            {additionsRows.map((r) => (
              <SummaryRow key={r.label} label={r.label} value={r.value} />
            ))}
            {additionsList.length > 0 && (
              <>
                <Divider style={{ margin: "10px 0" }} />
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Others (Additions)
                </div>
                {additionsList.map((x) => (
                  <SummaryRow
                    key={x.key}
                    label={`+ ${x.label}`}
                    value={x.amount}
                    compact
                  />
                ))}
              </>
            )}
            <Divider style={{ margin: "10px 0" }} />
          </>
        )}

        {/* ALWAYS SHOW */}
        <SummaryRow
          label="OnRoad Vehicle Cost"
          value={onRoadVehicleCost}
          highlight
        />

        {/* DISCOUNTS */}
        {(discountRows.length > 0 || discountsList.length > 0) && (
          <>
            <Divider style={{ margin: "12px 0" }} />
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              Deductions / Discounts
            </div>

            {discountRows.map((r) => (
              <SummaryRow key={r.label} label={r.label} value={r.value} />
            ))}

            {discountsList.length > 0 && (
              <>
                <Divider style={{ margin: "10px 0" }} />
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Others (Discounts)
                </div>
                {discountsList.map((x) => (
                  <SummaryRow
                    key={x.key}
                    label={`- ${x.label}`}
                    value={x.amount}
                    compact
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ALWAYS SHOW */}
        <Divider style={{ margin: "10px 0" }} />
        <SummaryRow label="Total Discount" value={totalDiscount} highlight />

        <Divider style={{ margin: "10px 0" }} />
        <SummaryRow label="Gross DO" value={grossDO} highlight />
        <SummaryRow
          label="Net OnRoad Vehicle Cost"
          value={netOnRoadVehicleCost}
          final
        />
      </Card>
    );
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
    additionsOthers,
    discountsOthers,
    onRoadVehicleCost,
    marginMoneyPaid,
    dealerDiscount,
    schemeDiscount,
    insuranceCashback,
    exchange,
    exchangeVehiclePrice,
    loyalty,
    corporate,
    totalDiscount,
    grossDO,
    netOnRoadVehicleCost,
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
          marginBottom: 16,
        }}
      >
        <CarOutlined style={{ color: "#1418faff" }} />
        <span>Vehicle Details (Showroom Account)</span>
      </div>

      <Row gutter={16}>
        {/* Left form */}
        <Col xs={24} lg={15}>
          <Card style={{ borderRadius: 12 }}>
            <Row gutter={[16, 12]}>
              {/* Make / Model / Variant */}
              <Col xs={24} md={8}>
                <Form.Item label="Make" name="do_vehicleMake">
                  <Select
                    placeholder="Select make"
                    allowClear
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleMakeChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No makes available
                        </div>
                      )
                    }
                  >
                    {makes.map((make) => (
                      <Select.Option key={make} value={make}>
                        {make}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Model" name="do_vehicleModel">
                  <Select
                    placeholder={do_vehicleMake ? "Select model" : "Select make first"}
                    disabled={!do_vehicleMake}
                    allowClear
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleModelChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No models available
                        </div>
                      )
                    }
                  >
                    {models.map((model) => (
                      <Select.Option key={model} value={model}>
                        {model}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Variant" name="do_vehicleVariant">
                  <Select
                    placeholder={do_vehicleModel ? "Select variant" : "Select model first"}
                    disabled={!do_vehicleModel}
                    allowClear
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleVariantChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No variants available
                        </div>
                      )
                    }
                  >
                    {variants.map((variant) => (
                      <Select.Option key={variant} value={variant}>
                        {variant}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {/* Colour */}
              <Col xs={24} md={8}>
                <Form.Item label="Colour" name="do_colour">
                  <Input placeholder="Enter colour" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Ex-Showroom Price" name="do_exShowroomPrice">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="+ TCS" name="do_tcs">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="+ EPC" name="do_epc">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="+ Insurance Cost" name="do_insuranceCost">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="+ Road Tax" name="do_roadTax">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="+ Accessories Amount"
                  name="do_accessoriesAmount"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="+ Fastag" name="do_fastag">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="+ Extended Warranty"
                  name="do_extendedWarranty"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              {/* Additions Others */}
              <Col xs={24}>
                <Divider style={{ margin: "10px 0" }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  + Others (Additions)
                </div>

                <Form.List name="do_additions_others">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.length === 0 && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#666",
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
                              label=""
                              name={[name, "label"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="e.g., Handling Charges" />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              label=""
                              name={[name, "amount"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={2}>
                            <Form.Item style={{ marginBottom: 0 }}>
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
                            </Form.Item>
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
                <Form.Item
                  label="= OnRoad Vehicle Cost"
                  name="do_onRoadVehicleCost"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="- Margin Money Paid"
                  name="do_marginMoneyPaid"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Gross DO" name="do_grossDO">
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              {/* Discounts */}
              <Col xs={24}>
                <Divider style={{ margin: "10px 0" }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Discounts / Deductions
                </div>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="- Dealer Discount" name="do_dealerDiscount">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="- Scheme Discount" name="do_schemeDiscount">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="- Insurance Cashback"
                  name="do_insuranceCashback"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="- Exchange" name="do_exchange">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="- Exchange Vehicle Price"
                  name="do_exchangeVehiclePrice"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="- Loyalty" name="do_loyalty">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="- Corporate" name="do_corporate">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              {/* Discounts Others */}
              <Col xs={24}>
                <div style={{ fontWeight: 600, marginTop: 4, marginBottom: 8 }}>
                  - Others (Discounts)
                </div>

                <Form.List name="do_discounts_others">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.length === 0 && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#666",
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
                              label=""
                              name={[name, "label"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="e.g., Special Offer" />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              label=""
                              name={[name, "amount"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={2}>
                            <Form.Item style={{ marginBottom: 0 }}>
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
                            </Form.Item>
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
                <Form.Item label="= Total Discount" name="do_totalDiscount">
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="= Net OnRoad Vehicle Cost"
                  name="do_netOnRoadVehicleCost"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Right sticky summary */}
        <Col xs={24} lg={9}>
          {SummaryCard}
        </Col>
      </Row>
    </div>
  );
};

const SummaryRow = ({ label, value = 0, highlight, final, compact }) => {
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
      <span>₹ {display.toLocaleString("en-IN")}</span>
    </div>
  );
};

export default Section3VehicleDetailsShowroom;
