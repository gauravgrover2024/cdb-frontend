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
} from "antd";
import { CarOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

// show only if value > 0
const hasValue = (val) => asInt(val) > 0;

const Section4VehicleDetailsCustomer = () => {
  const form = Form.useFormInstance();

  // ---------------------------
  // Watch all values for calc
  // ---------------------------
  const v = Form.useWatch([], form) || {};

  const make = v.do_vehicleMake;
  const model = v.do_vehicleModel;
  const variant = v.do_vehicleVariant;

  // Shared (same keys as Section 3)
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

  // Section 4 discount fields (NEW KEYS)
  const discountsOthers = Array.isArray(v.do_customer_discounts_others)
    ? v.do_customer_discounts_others
    : [];
  const discountsOthersTotal = discountsOthers.reduce(
    (sum, x) => sum + asInt(x?.amount),
    0
  );

  const dealerDiscount = asInt(v.do_customer_dealerDiscount);
  const schemeDiscount = asInt(v.do_customer_schemeDiscount);
  const insuranceCashback = asInt(v.do_customer_insuranceCashback);
  const exchange = asInt(v.do_customer_exchange);
  const vehicleValue = asInt(v.do_customer_vehicleValue);
  const loyalty = asInt(v.do_customer_loyalty);
  const corporate = asInt(v.do_customer_corporate);

  // ---------------------------
  // CALCULATIONS
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
    vehicleValue +
    loyalty +
    corporate +
    discountsOthersTotal;

  const netOnRoadVehicleCost = onRoadVehicleCost - totalDiscount;

  // write computed values into form (only customer totals here)
  useEffect(() => {
    if (!form) return;

    form.setFieldsValue({
      do_customer_totalDiscount: totalDiscount,
      do_customer_netOnRoadVehicleCost: netOnRoadVehicleCost,
    });
  }, [form, totalDiscount, netOnRoadVehicleCost]);

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
      { label: "- Vehicle Value", value: vehicleValue },
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
    vehicleValue,
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
        <span>Vehicle Details (Customer Account)</span>
      </div>

      <Row gutter={16}>
        {/* Left form */}
        <Col xs={24} lg={15}>
          <Card style={{ borderRadius: 12 }}>
            <Row gutter={[16, 12]}>
              {/* Shared fields till Gross DO (same keys as Section 3) */}
              <Col xs={24} md={8}>
                <Form.Item label="Make" name="do_vehicleMake">
                  <Input placeholder="From Post-File / Profile" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Model" name="do_vehicleModel">
                  <Input placeholder="From Post-File / Profile" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Variant" name="do_vehicleVariant">
                  <Input placeholder="From Post-File / Profile" />
                </Form.Item>
              </Col>

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

              {/* Additions Others (shared) */}
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
                              name={[name, "label"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="e.g., Handling Charges" />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              name={[name, "amount"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber style={{ width: "100%" }} />
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

              {/* Shared computed */}
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

              {/* NEW Discount section for Customer Account */}
              <Col xs={24}>
                <Divider style={{ margin: "10px 0" }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Discounts / Deductions (Customer Account)
                </div>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="- Dealer Discount"
                  name="do_customer_dealerDiscount"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="- Scheme Discount"
                  name="do_customer_schemeDiscount"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="- Insurance Cashback"
                  name="do_customer_insuranceCashback"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="- Exchange" name="do_customer_exchange">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="- Vehicle Value"
                  name="do_customer_vehicleValue"
                >
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="- Loyalty" name="do_customer_loyalty">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="- Corporate" name="do_customer_corporate">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              {/* Customer Discounts Others */}
              <Col xs={24}>
                <div style={{ fontWeight: 600, marginTop: 4, marginBottom: 8 }}>
                  - Others (Discounts)
                </div>

                <Form.List name="do_customer_discounts_others">
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
                              name={[name, "label"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="e.g., Special Offer" />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              name={[name, "amount"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber style={{ width: "100%" }} />
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

              {/* Customer computed totals */}
              <Col xs={24} md={8}>
                <Form.Item
                  label="= Total Discount"
                  name="do_customer_totalDiscount"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="= Net OnRoad Vehicle Cost"
                  name="do_customer_netOnRoadVehicleCost"
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

export default Section4VehicleDetailsCustomer;
