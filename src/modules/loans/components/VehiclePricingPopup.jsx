// src/modules/loans/components/VehiclePricingPopup.jsx
import React, { useEffect, useState } from "react";
import { Input, Button, Row, Col, Divider, Form, Tag } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const parseNumber = (str) => Number(String(str).replace(/[^0-9]/g, "")) || 0;

const formatINR = (num) =>
  isNaN(num) ? "₹0" : `₹${Math.round(num).toLocaleString("en-IN")}`;

const formatINRNoSymbol = (num) =>
  isNaN(num) ? "" : Math.round(num).toLocaleString("en-IN");

const formatDisplay = (num) =>
  num ? `₹${Math.round(num).toLocaleString("en-IN")}` : "";

// NOTE: props changed: vehicle, value, onChange
const VehiclePricingPopup = ({ vehicle, value, onChange }) => {
  const selectedVehicle = vehicle;
  const [form] = Form.useForm();
  const [totals, setTotals] = useState({
    onRoadBeforeDiscount: 0,
    totalDiscount: 0,
    netOnRoad: 0,
  });

  // Prefill form from last value if present, else from vehicle
  useEffect(() => {
    if (!selectedVehicle) return;

    const base = {
      exShowroom: selectedVehicle.exShowroom || 0,
      insurance: selectedVehicle.insurance || 0,
      tcs: selectedVehicle.tcs ?? selectedVehicle.otherCharges ?? 0,
      roadTax: selectedVehicle.rto || 0,
      epc: 0,
      accessories: 0,
      fastag: 0,
      extendedWarranty: 0,
      additionsOthers: [],
      dealerDiscount: 0,
      schemeDiscount: 0,
      insuranceCashback: 0,
      exchange: 0,
      loyalty: 0,
      corporate: 0,
      discountsOthers: [],
    };

    const existing = value || {};

    form.setFieldsValue({
      ...base,
      ...existing,
      roadTax: existing.rto ?? existing.roadTax ?? base.roadTax,
      tcs: existing.tcs ?? base.tcs,
    });

    // compute initial totals from these values
    const v = form.getFieldsValue(true);

    const exShowroom = Number(v.exShowroom) || 0;
    const insurance = Number(v.insurance) || 0;
    const tcs = Number(v.tcs) || 0;
    const roadTax = Number(v.roadTax) || 0;
    const epc = Number(v.epc) || 0;
    const accessories = Number(v.accessories) || 0;
    const fastag = Number(v.fastag) || 0;
    const extendedWarranty = Number(v.extendedWarranty) || 0;

    const additionsOthers = Array.isArray(v.additionsOthers)
      ? v.additionsOthers
      : [];
    const additionsOthersTotal = additionsOthers.reduce(
      (sum, x) => sum + (Number(x?.amount) || 0),
      0,
    );

    const dealerDiscount = Number(v.dealerDiscount) || 0;
    const schemeDiscount = Number(v.schemeDiscount) || 0;
    const insuranceCashback = Number(v.insuranceCashback) || 0;
    const exchange = Number(v.exchange) || 0;
    const loyalty = Number(v.loyalty) || 0;
    const corporate = Number(v.corporate) || 0;
    const discountsOthers = Array.isArray(v.discountsOthers)
      ? v.discountsOthers
      : [];
    const discountsOthersTotal = discountsOthers.reduce(
      (sum, x) => sum + (Number(x?.amount) || 0),
      0,
    );

    const onRoadBeforeDiscount =
      exShowroom +
      insurance +
      tcs +
      roadTax +
      epc +
      accessories +
      fastag +
      extendedWarranty +
      additionsOthersTotal;

    const totalDiscount =
      dealerDiscount +
      schemeDiscount +
      insuranceCashback +
      exchange +
      loyalty +
      corporate +
      discountsOthersTotal;

    const netOnRoad = onRoadBeforeDiscount - totalDiscount;

    setTotals({ onRoadBeforeDiscount, totalDiscount, netOnRoad });
  }, [selectedVehicle, value, form]);

  const recomputeTotals = () => {
    const v = form.getFieldsValue(true);

    const exShowroom = Number(v.exShowroom) || 0;
    const insurance = Number(v.insurance) || 0;
    const tcs = Number(v.tcs) || 0;
    const roadTax = Number(v.roadTax) || 0;
    const epc = Number(v.epc) || 0;
    const accessories = Number(v.accessories) || 0;
    const fastag = Number(v.fastag) || 0;
    const extendedWarranty = Number(v.extendedWarranty) || 0;

    const additionsOthers = Array.isArray(v.additionsOthers)
      ? v.additionsOthers
      : [];
    const additionsOthersTotal = additionsOthers.reduce(
      (sum, x) => sum + (Number(x?.amount) || 0),
      0,
    );

    const dealerDiscount = Number(v.dealerDiscount) || 0;
    const schemeDiscount = Number(v.schemeDiscount) || 0;
    const insuranceCashback = Number(v.insuranceCashback) || 0;
    const exchange = Number(v.exchange) || 0;

    const loyalty = Number(v.loyalty) || 0;
    const corporate = Number(v.corporate) || 0;
    const discountsOthers = Array.isArray(v.discountsOthers)
      ? v.discountsOthers
      : [];
    const discountsOthersTotal = discountsOthers.reduce(
      (sum, x) => sum + (Number(x?.amount) || 0),
      0,
    );

    const onRoadBeforeDiscount =
      exShowroom +
      insurance +
      tcs +
      roadTax +
      epc +
      accessories +
      fastag +
      extendedWarranty +
      additionsOthersTotal;

    const totalDiscount =
      dealerDiscount +
      schemeDiscount +
      insuranceCashback +
      exchange +
      loyalty +
      corporate +
      discountsOthersTotal;

    const netOnRoad = onRoadBeforeDiscount - totalDiscount;

    const newTotals = { onRoadBeforeDiscount, totalDiscount, netOnRoad };
    setTotals(newTotals);

    onChange?.({
      netOnRoad,
      onRoadBeforeDiscount,
      totalDiscount,
      exShowroom,
      insurance,
      tcs,
      rto: roadTax,
      epc,
      accessories,
      fastag,
      extendedWarranty,
      additionsOthers,
      dealerDiscount,
      schemeDiscount,
      insuranceCashback,
      exchange,

      loyalty,
      corporate,
      discountsOthers,
    });
  };

  const handleValuesChange = () => {
    recomputeTotals();
  };

  const [activeAdditions, setActiveAdditions] = useState([
    "exShowroom",
    "roadTax",
    "insurance",
    "tcs",
  ]);
  const [activeDiscounts, setActiveDiscounts] = useState([]);

  const toggleAddition = (key) => {
    setActiveAdditions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleDiscount = (key) => {
    setActiveDiscounts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const additionPills = [
    { key: "exShowroom", label: "Ex‑showroom" },
    { key: "roadTax", label: "RTO / Road tax" },
    { key: "insurance", label: "Insurance" },
    { key: "tcs", label: "TCS / Other" },
    { key: "epc", label: "EPC" },
    { key: "accessories", label: "Accessories" },
    { key: "fastag", label: "Fastag" },
    { key: "extendedWarranty", label: "Extended warranty" },
  ];

  const discountPills = [
    { key: "dealerDiscount", label: "Dealer discount" },
    { key: "schemeDiscount", label: "Scheme discount" },
    { key: "insuranceCashback", label: "Insurance cashback" },
    { key: "exchange", label: "Exchange bonus" },

    { key: "loyalty", label: "Loyalty" },
    { key: "corporate", label: "Corporate" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Vehicle pricing builder
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Use pills to add charges and discounts. Net on‑road updates live.
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
        {/* Pills */}
        <Row gutter={12} className="mb-2">
          <Col xs={24} md={12}>
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Additions
            </div>
            <div className="flex flex-wrap gap-2">
              {additionPills.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => toggleAddition(pill.key)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    activeAdditions.includes(pill.key)
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-100 dark:bg-[#262626] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#262626]"
                  }`}
                >
                  {activeAdditions.includes(pill.key) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {pill.label}
                </button>
              ))}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Discounts
            </div>
            <div className="flex flex-wrap gap-2">
              {discountPills.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => toggleDiscount(pill.key)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    activeDiscounts.includes(pill.key)
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-100 dark:bg-[#262626] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#262626]"
                  }`}
                >
                  {activeDiscounts.includes(pill.key) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {pill.label}
                </button>
              ))}
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: "10px 0" }} />

        <Row gutter={16}>
          {/* Additions */}
          <Col xs={24} md={12}>
            <div className="text-[11px] font-semibold text-slate-500 mb-2">
              Additions
            </div>
            <div className="space-y-2">
              {activeAdditions.includes("exShowroom") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Ex‑showroom</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="exShowroom"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeAdditions.includes("roadTax") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">RTO / Road tax</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="roadTax"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeAdditions.includes("insurance") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Insurance</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="insurance"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeAdditions.includes("tcs") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">TCS / Other</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="tcs"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeAdditions.includes("epc") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">EPC</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="epc"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeAdditions.includes("accessories") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Accessories</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="accessories"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeAdditions.includes("fastag") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Fastag</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="fastag"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeAdditions.includes("extendedWarranty") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Extended warranty</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="extendedWarranty"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
            </div>

            <Divider style={{ margin: "10px 0" }} />
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              + Other additions
            </div>
            <Form.List name="additionsOthers">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Row
                      key={key}
                      gutter={8}
                      align="middle"
                      style={{ marginBottom: 6 }}
                    >
                      <Col xs={11}>
                        <Form.Item
                          name={[name, "label"]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input
                            size="small"
                            placeholder="Label (e.g. Handling)"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={11}>
                        <Form.Item
                          name={[name, "amount"]}
                          style={{ marginBottom: 0 }}
                          getValueFromEvent={(e) => parseNumber(e.target.value)}
                          getValueProps={(value) => ({
                            value: formatDisplay(value),
                          })}
                        >
                          <Input
                            size="small"
                            placeholder="Amount"
                            onChange={(e) => {
                              const list = [
                                ...(form.getFieldValue("additionsOthers") ||
                                  []),
                              ];
                              const n = parseNumber(e.target.value);
                              list[name] = {
                                ...(list[name] || {}),
                                amount: n,
                              };
                              form.setFieldsValue({
                                additionsOthers: list,
                              });
                              recomputeTotals();
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={2}>
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            remove(name);
                            recomputeTotals();
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      add({ label: "", amount: 0 });
                      recomputeTotals();
                    }}
                  >
                    Add addition
                  </Button>
                </>
              )}
            </Form.List>
          </Col>

          {/* Discounts */}
          <Col xs={24} md={12}>
            <div className="text-[11px] font-semibold text-slate-500 mb-2">
              Discounts
            </div>
            <div className="space-y-2">
              {activeDiscounts.includes("dealerDiscount") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Dealer discount</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="dealerDiscount"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeDiscounts.includes("schemeDiscount") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Scheme discount</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="schemeDiscount"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeDiscounts.includes("insuranceCashback") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Insurance cashback</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="insuranceCashback"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeDiscounts.includes("exchange") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Exchange bonus</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="exchange"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}

              {activeDiscounts.includes("loyalty") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Loyalty</Tag>
                  <div className="flex-1">
                    {/* if you want only one field, you can remove this first Form.Item block */}
                    <Form.Item
                      name="loyalty"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
              {activeDiscounts.includes("corporate") && (
                <div className="flex items-center justify-between gap-2">
                  <Tag className="text-[11px] px-2">Corporate</Tag>
                  <div className="flex-1">
                    <Form.Item
                      name="corporate"
                      style={{ marginBottom: 0 }}
                      getValueFromEvent={(e) => parseNumber(e.target.value)}
                      getValueProps={(value) => ({
                        value: formatDisplay(value),
                      })}
                    >
                      <Input size="small" type="text" />
                    </Form.Item>
                  </div>
                </div>
              )}
            </div>

            <Divider style={{ margin: "10px 0" }} />
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              – Other discounts
            </div>
            <Form.List name="discountsOthers">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Row
                      key={key}
                      gutter={8}
                      align="middle"
                      style={{ marginBottom: 6 }}
                    >
                      <Col xs={11}>
                        <Form.Item
                          name={[name, "label"]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input
                            size="small"
                            placeholder="Label (e.g. Festive offer)"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={11}>
                        <Form.Item
                          name={[name, "amount"]}
                          style={{ marginBottom: 0 }}
                          getValueFromEvent={(e) => parseNumber(e.target.value)}
                          getValueProps={(value) => ({
                            value: formatDisplay(value),
                          })}
                        >
                          <Input
                            size="small"
                            placeholder="Amount"
                            onChange={(e) => {
                              const list = [
                                ...(form.getFieldValue("discountsOthers") ||
                                  []),
                              ];
                              const n = parseNumber(e.target.value);
                              list[name] = {
                                ...(list[name] || {}),
                                amount: n,
                              };
                              form.setFieldsValue({
                                discountsOthers: list,
                              });
                              recomputeTotals();
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={2}>
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            remove(name);
                            recomputeTotals();
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      add({ label: "", amount: 0 });
                      recomputeTotals();
                    }}
                  >
                    Add discount
                  </Button>
                </>
              )}
            </Form.List>
          </Col>
        </Row>

        <Divider style={{ margin: "12px 0" }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-[#262626] rounded-2xl px-3 py-2">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              On‑road before discount
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatINR(totals.onRoadBeforeDiscount)}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-[#262626] rounded-2xl px-3 py-2">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Total discounts
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatINR(totals.totalDiscount)}
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-[#022c22] rounded-2xl px-3 py-2">
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              Net on‑road (quoted)
            </div>
            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {formatINR(totals.netOnRoad)}
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default VehiclePricingPopup;
