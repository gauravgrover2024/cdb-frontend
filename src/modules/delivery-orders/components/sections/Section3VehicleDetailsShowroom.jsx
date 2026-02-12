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
  Typography,
} from "antd";
import { CarOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));
const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};
const hasValue = (val) => asInt(val) > 0;

const Section3VehicleDetailsShowroom = ({ loan, readOnly = false }) => {
  const form = Form.useFormInstance();

  // Prefill from Loan
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

  // Watch values
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

  useEffect(() => {
    if (!form) return;
    form.setFieldsValue({
      do_onRoadVehicleCost: onRoadVehicleCost,
      do_grossDO: grossDO,
      do_totalDiscount: totalDiscount,
      do_netOnRoadVehicleCost: netOnRoadVehicleCost,
    });
  }, [form, onRoadVehicleCost, grossDO, totalDiscount, netOnRoadVehicleCost]);

  // Right summary
  const SummaryCard = useMemo(() => {
    const additionsRows = [
      { label: "Ex‑Showroom Price", value: exShowroom },
      { label: "TCS", value: tcs },
      { label: "EPC", value: epc },
      { label: "Insurance", value: insuranceCost },
      { label: "Road Tax", value: roadTax },
      { label: "Accessories", value: accessoriesAmount },
      { label: "Fastag", value: fastag },
      { label: "Extended Warranty", value: extendedWarranty },
    ].filter((r) => hasValue(r.value));

    const additionsList = additionsOthers
      .filter((x) => (x?.label || x?.amount) && hasValue(x?.amount))
      .map((x, idx) => ({
        key: `add-${idx}`,
        label: x?.label || "Other addition",
        amount: asInt(x?.amount),
      }));

    const discountRows = [
      { label: "Margin Money Paid", value: marginMoneyPaid },
      { label: "Dealer Discount", value: dealerDiscount },
      { label: "Scheme Discount", value: schemeDiscount },
      { label: "Insurance Cashback", value: insuranceCashback },
      { label: "Exchange", value: exchange },
      { label: "Exchange Vehicle Price", value: exchangeVehiclePrice },
      { label: "Loyalty", value: loyalty },
      { label: "Corporate", value: corporate },
    ].filter((r) => hasValue(r.value));

    const discountsList = discountsOthers
      .filter((x) => (x?.label || x?.amount) && hasValue(x?.amount))
      .map((x, idx) => ({
        key: `disc-${idx}`,
        label: x?.label || "Other discount",
        amount: asInt(x?.amount),
      }));

    return (
      <Card
        style={{
          position: "sticky",
          top: 16,
          borderRadius: 16,
          border: "1px solid #f0f0f0",
          background: "#fafafa",
        }}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text strong>
            {make || "-"} {model || ""} {variant || ""}
          </Text>
          <div style={{ fontSize: 12, color: "#666" }}>
            Showroom quotation summary
          </div>
        </div>

        {/* Step 1 */}
        <Divider style={{ margin: "8px 0" }} />
        <Text style={{ fontSize: 12, fontWeight: 600 }}>
          1. Base & Additions
        </Text>
        <div style={{ marginTop: 6 }}>
          {additionsRows.map((r) => (
            <SummaryRow key={r.label} label={r.label} value={r.value} />
          ))}
          {additionsList.length > 0 && (
            <>
              <Divider style={{ margin: "8px 0" }} />
              <Text style={{ fontSize: 12, fontWeight: 500 }}>
                Other additions
              </Text>
              {additionsList.map((x) => (
                <SummaryRow
                  key={x.key}
                  label={x.label}
                  value={x.amount}
                  compact
                />
              ))}
            </>
          )}
        </div>

        <Divider style={{ margin: "10px 0" }} />
        <SummaryRow
          label="On‑road Vehicle Cost"
          value={onRoadVehicleCost}
          highlight
        />

        {/* Step 2 */}
        <Divider style={{ margin: "10px 0" }} />
        <Text style={{ fontSize: 12, fontWeight: 600 }}>
          2. Discounts & Deductions
        </Text>
        <div style={{ marginTop: 6 }}>
          {discountRows.map((r) => (
            <SummaryRow
              key={r.label}
              label={r.label}
              value={r.value}
              sign="-"
            />
          ))}
          {discountsList.length > 0 && (
            <>
              <Divider style={{ margin: "8px 0" }} />
              <Text style={{ fontSize: 12, fontWeight: 500 }}>
                Other discounts
              </Text>
              {discountsList.map((x) => (
                <SummaryRow
                  key={x.key}
                  label={x.label}
                  value={x.amount}
                  compact
                  sign="-"
                />
              ))}
            </>
          )}
        </div>

        <Divider style={{ margin: "10px 0" }} />
        <SummaryRow label="Total Discount" value={totalDiscount} highlight />

        {/* Step 3 */}
        <Divider style={{ margin: "10px 0" }} />
        <Text style={{ fontSize: 12, fontWeight: 600 }}>3. Gross & Net</Text>
        <SummaryRow label="Gross DO" value={grossDO} highlight />
        <SummaryRow
          label="Net On‑road Vehicle Cost"
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
          <CarOutlined style={{ color: "#1d4ed8" }} />
        </div>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Showroom Vehicle Quote
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Fill showroom pricing on the left, see the full quote on the right.
          </Text>
        </div>
      </div>

      <Row gutter={16}>
        {/* Left side: structured form */}
        <Col xs={24} lg={15}>
          <Card style={{ borderRadius: 14 }} bodyStyle={{ padding: 16 }}>
            {/* Vehicle identity */}
            <Text strong style={{ fontSize: 13 }}>
              Vehicle identity
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item label="Make" name="do_vehicleMake">
                  <Input
                    placeholder="From Post-File / Profile"
                    disabled={readOnly}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Model" name="do_vehicleModel">
                  <Input
                    placeholder="From Post-File / Profile"
                    disabled={readOnly}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Variant" name="do_vehicleVariant">
                  <Input
                    placeholder="From Post-File / Profile"
                    disabled={readOnly}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Colour" name="do_colour">
                  <Input placeholder="Enter colour" disabled={readOnly} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "8px 0 12px" }} />

            {/* Base & taxes */}
            <Text strong style={{ fontSize: 13 }}>
              Base & taxes
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item label="Ex‑Showroom Price" name="do_exShowroomPrice">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="TCS" name="do_tcs">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="EPC" name="do_epc">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Insurance" name="do_insuranceCost">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Road Tax" name="do_roadTax">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "8px 0 12px" }} />

            {/* Additions */}
            <Text strong style={{ fontSize: 13 }}>
              Additions
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Accessories Amount"
                  name="do_accessoriesAmount"
                >
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Fastag" name="do_fastag">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Extended Warranty" name="do_extendedWarranty">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>

              {/* Other additions */}
              <Col xs={24}>
                <Divider style={{ margin: "8px 0" }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Other additions
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
                          No additional items added.
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
                                placeholder="e.g., Handling Charges"
                                disabled={readOnly}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={8}>
                            <Form.Item
                              name={[name, "amount"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                disabled={readOnly}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={2}>
                            {!readOnly && (
                              <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            )}
                          </Col>
                        </Row>
                      ))}
                      {!readOnly && (
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => add({ label: "", amount: "" })}
                        >
                          Add other addition
                        </Button>
                      )}
                    </>
                  )}
                </Form.List>
              </Col>
            </Row>

            {/* Totals before discounts */}
            <Divider style={{ margin: "10px 0" }} />
            <Row gutter={[16, 12]}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="On‑road Vehicle Cost"
                  name="do_onRoadVehicleCost"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Margin Money Paid" name="do_marginMoneyPaid">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Gross DO" name="do_grossDO">
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
            </Row>

            {/* Discounts */}
            <Divider style={{ margin: "10px 0" }} />
            <Text strong style={{ fontSize: 13 }}>
              Discounts / Deductions
            </Text>
            <Row gutter={[16, 12]} style={{ marginTop: 6 }}>
              <Col xs={24} md={8}>
                <Form.Item label="Dealer Discount" name="do_dealerDiscount">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Scheme Discount" name="do_schemeDiscount">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Insurance Cashback"
                  name="do_insuranceCashback"
                >
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Exchange" name="do_exchange">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Exchange Vehicle Price"
                  name="do_exchangeVehiclePrice"
                >
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Loyalty" name="do_loyalty">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Corporate" name="do_corporate">
                  <InputNumber style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              </Col>

              {/* Other discounts */}
              <Col xs={24}>
                <div style={{ fontWeight: 600, marginTop: 4, marginBottom: 8 }}>
                  Other discounts
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
                              name={[name, "label"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input
                                placeholder="e.g., Special Offer"
                                disabled={readOnly}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={8}>
                            <Form.Item
                              name={[name, "amount"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                disabled={readOnly}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={2}>
                            {!readOnly && (
                              <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            )}
                          </Col>
                        </Row>
                      ))}
                      {!readOnly && (
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => add({ label: "", amount: "" })}
                        >
                          Add other discount
                        </Button>
                      )}
                    </>
                  )}
                </Form.List>
              </Col>

              {/* Computed totals */}
              <Col xs={24} md={8}>
                <Form.Item label="Total Discount" name="do_totalDiscount">
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Net On‑road Vehicle Cost"
                  name="do_netOnRoadVehicleCost"
                >
                  <InputNumber style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Right: quote summary */}
        <Col xs={24} lg={9}>
          {SummaryCard}
        </Col>
      </Row>
    </div>
  );
};

const SummaryRow = ({ label, value = 0, highlight, final, compact, sign }) => {
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

export default Section3VehicleDetailsShowroom;
