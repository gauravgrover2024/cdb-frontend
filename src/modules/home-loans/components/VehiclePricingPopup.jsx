import React, { useEffect, useRef, useState } from "react";
import { Input, Button, Row, Col, Divider, Form, Tag } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  buildVehiclePricingSnapshot,
  PRICING_ADDITION_FIELDS,
  PRICING_DISCOUNT_FIELDS,
} from "../../../utils/vehiclePricingBreakup";

const parseNumber = (str) => Number(String(str).replace(/[^0-9]/g, "")) || 0;

const formatINR = (num) =>
  Number(num) ? `₹${Math.round(num).toLocaleString("en-IN")}` : "₹0";

const formatDisplay = (num) =>
  Number(num) ? `₹${Math.round(num).toLocaleString("en-IN")}` : "";

const DEFAULT_ACTIVE_ADDITIONS = ["exShowroom", "roadTax", "insurance", "tcs"];
const ADDITION_KEY_TO_FORM_KEY = { rto: "roadTax" };

const toAdditionFormKey = (fieldKey) =>
  ADDITION_KEY_TO_FORM_KEY[fieldKey] || fieldKey;

const additionFields = PRICING_ADDITION_FIELDS.map((field) => ({
  ...field,
  formKey: toAdditionFormKey(field.key),
}));

const discountFields = PRICING_DISCOUNT_FIELDS.map((field) => ({
  ...field,
  formKey: field.key,
}));

const buildFormPatchFromSnapshot = (snapshot = {}) => ({
  exShowroom: Number(snapshot.exShowroom) || 0,
  roadTax: Number(snapshot.rto) || 0,
  insurance: Number(snapshot.insurance) || 0,
  tcs: Number(snapshot.tcs) || 0,
  epc: Number(snapshot.epc) || 0,
  accessories: Number(snapshot.accessories) || 0,
  fastag: Number(snapshot.fastag) || 0,
  extendedWarranty: Number(snapshot.extendedWarranty) || 0,
  dealerDiscount: Number(snapshot.dealerDiscount) || 0,
  schemeDiscount: Number(snapshot.schemeDiscount) || 0,
  insuranceCashback: Number(snapshot.insuranceCashback) || 0,
  exchange: Number(snapshot.exchange) || 0,
  exchangeVehiclePrice: Number(snapshot.exchangeVehiclePrice) || 0,
  loyalty: Number(snapshot.loyalty) || 0,
  corporate: Number(snapshot.corporate) || 0,
  additionsOthers: Array.isArray(snapshot.additionsOthers)
    ? snapshot.additionsOthers
    : [],
  discountsOthers: Array.isArray(snapshot.discountsOthers)
    ? snapshot.discountsOthers
    : [],
});

const buildPricingOverridesFromFormValues = (values = {}) => ({
  exShowroom: Number(values.exShowroom) || 0,
  rto: Number(values.roadTax) || 0,
  roadTax: Number(values.roadTax) || 0,
  insurance: Number(values.insurance) || 0,
  tcs: Number(values.tcs) || 0,
  epc: Number(values.epc) || 0,
  accessories: Number(values.accessories) || 0,
  fastag: Number(values.fastag) || 0,
  extendedWarranty: Number(values.extendedWarranty) || 0,
  dealerDiscount: Number(values.dealerDiscount) || 0,
  schemeDiscount: Number(values.schemeDiscount) || 0,
  insuranceCashback: Number(values.insuranceCashback) || 0,
  exchange: Number(values.exchange) || 0,
  exchangeVehiclePrice: Number(values.exchangeVehiclePrice) || 0,
  loyalty: Number(values.loyalty) || 0,
  corporate: Number(values.corporate) || 0,
  additionsOthers: values.additionsOthers || [],
  discountsOthers: values.discountsOthers || [],
});

const VehiclePricingPopup = ({ vehicle, value, onChange }) => {
  const selectedVehicle = vehicle;
  const [form] = Form.useForm();
  const isInitializingRef = useRef(false);

  const [totals, setTotals] = useState({
    onRoadBeforeDiscount: 0,
    totalDiscount: 0,
    netOnRoad: 0,
  });

  const [activeAdditions, setActiveAdditions] = useState(
    DEFAULT_ACTIVE_ADDITIONS,
  );
  const [activeDiscounts, setActiveDiscounts] = useState([]);

  const recomputeTotals = ({ notifyParent = true } = {}) => {
    const values = form.getFieldsValue(true);
    const snapshot = buildVehiclePricingSnapshot(
      selectedVehicle || {},
      buildPricingOverridesFromFormValues(values),
    );

    const nextTotals = {
      onRoadBeforeDiscount: Number(snapshot.onRoadBeforeDiscount) || 0,
      totalDiscount: Number(snapshot.totalDiscount) || 0,
      netOnRoad: Number(snapshot.netOnRoad) || 0,
    };
    setTotals(nextTotals);

    if (notifyParent) {
      onChange?.({
        ...snapshot,
        rto: Number(snapshot.rto) || 0,
        roadTax: Number(snapshot.rto) || 0,
      });
    }
  };

  // Reinitialize only when selected vehicle changes to avoid input reset on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedVehicle) return;

    const snapshot = buildVehiclePricingSnapshot(selectedVehicle, value || {});
    const formPatch = buildFormPatchFromSnapshot(snapshot);

    isInitializingRef.current = true;
    form.setFieldsValue(formPatch);

    const nextActiveAdditions = new Set(DEFAULT_ACTIVE_ADDITIONS);
    additionFields.forEach((field) => {
      if ((Number(formPatch[field.formKey]) || 0) > 0) {
        nextActiveAdditions.add(field.formKey);
      }
    });

    const nextActiveDiscounts = new Set();
    discountFields.forEach((field) => {
      if ((Number(formPatch[field.formKey]) || 0) > 0) {
        nextActiveDiscounts.add(field.formKey);
      }
    });

    setActiveAdditions(Array.from(nextActiveAdditions));
    setActiveDiscounts(Array.from(nextActiveDiscounts));

    setTimeout(() => {
      recomputeTotals({ notifyParent: false });
      isInitializingRef.current = false;
    }, 0);
  }, [selectedVehicle?._id, selectedVehicle?.id, form]);

  const handleValuesChange = () => {
    if (isInitializingRef.current) return;
    recomputeTotals();
  };

  const toggleAddition = (formKey) => {
    setActiveAdditions((prev) => {
      const next = prev.includes(formKey)
        ? prev.filter((key) => key !== formKey)
        : [...prev, formKey];
      if (!next.includes(formKey)) {
        form.setFieldsValue({ [formKey]: 0 });
        recomputeTotals();
      }
      return next;
    });
  };

  const toggleDiscount = (formKey) => {
    setActiveDiscounts((prev) => {
      const next = prev.includes(formKey)
        ? prev.filter((key) => key !== formKey)
        : [...prev, formKey];
      if (!next.includes(formKey)) {
        form.setFieldsValue({ [formKey]: 0 });
        recomputeTotals();
      }
      return next;
    });
  };

  const renderAmountField = (name) => (
    <Form.Item
      name={name}
      style={{ marginBottom: 0 }}
      getValueFromEvent={(e) => parseNumber(e.target.value)}
      getValueProps={(fieldValue) => ({ value: formatDisplay(fieldValue) })}
    >
      <Input size="small" type="text" />
    </Form.Item>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Vehicle pricing builder
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Add or remove charges and discounts. Net on-road updates live.
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
        <Row gutter={12} className="mb-2">
          <Col xs={24} md={12}>
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Additions
            </div>
            <div className="flex flex-wrap gap-2">
              {additionFields.map((field) => (
                <button
                  key={field.formKey}
                  type="button"
                  onClick={() => toggleAddition(field.formKey)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    activeAdditions.includes(field.formKey)
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-100 dark:bg-[#262626] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#262626]"
                  }`}
                >
                  {activeAdditions.includes(field.formKey) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {field.label}
                </button>
              ))}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Discounts
            </div>
            <div className="flex flex-wrap gap-2">
              {discountFields.map((field) => (
                <button
                  key={field.formKey}
                  type="button"
                  onClick={() => toggleDiscount(field.formKey)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    activeDiscounts.includes(field.formKey)
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-100 dark:bg-[#262626] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#262626]"
                  }`}
                >
                  {activeDiscounts.includes(field.formKey) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {field.label}
                </button>
              ))}
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: "10px 0" }} />

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <div className="text-[11px] font-semibold text-slate-500 mb-2">
              Additions
            </div>
            <div className="space-y-2">
              {additionFields
                .filter((field) => activeAdditions.includes(field.formKey))
                .map((field) => (
                  <div
                    key={field.formKey}
                    className="flex items-center justify-between gap-2"
                  >
                    <Tag className="text-[11px] px-2">{field.label}</Tag>
                    <div className="flex-1">{renderAmountField(field.formKey)}</div>
                  </div>
                ))}
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
                          <Input size="small" placeholder="Label" />
                        </Form.Item>
                      </Col>
                      <Col xs={11}>
                        <Form.Item
                          name={[name, "amount"]}
                          style={{ marginBottom: 0 }}
                          getValueFromEvent={(e) => parseNumber(e.target.value)}
                          getValueProps={(fieldValue) => ({
                            value: formatDisplay(fieldValue),
                          })}
                        >
                          <Input
                            size="small"
                            placeholder="Amount"
                            onChange={(e) => {
                              const list = [
                                ...(form.getFieldValue("additionsOthers") || []),
                              ];
                              list[name] = {
                                ...(list[name] || {}),
                                amount: parseNumber(e.target.value),
                              };
                              form.setFieldsValue({ additionsOthers: list });
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

          <Col xs={24} md={12}>
            <div className="text-[11px] font-semibold text-slate-500 mb-2">
              Discounts
            </div>
            <div className="space-y-2">
              {discountFields
                .filter((field) => activeDiscounts.includes(field.formKey))
                .map((field) => (
                  <div
                    key={field.formKey}
                    className="flex items-center justify-between gap-2"
                  >
                    <Tag className="text-[11px] px-2">{field.label}</Tag>
                    <div className="flex-1">{renderAmountField(field.formKey)}</div>
                  </div>
                ))}
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
                          <Input size="small" placeholder="Label" />
                        </Form.Item>
                      </Col>
                      <Col xs={11}>
                        <Form.Item
                          name={[name, "amount"]}
                          style={{ marginBottom: 0 }}
                          getValueFromEvent={(e) => parseNumber(e.target.value)}
                          getValueProps={(fieldValue) => ({
                            value: formatDisplay(fieldValue),
                          })}
                        >
                          <Input
                            size="small"
                            placeholder="Amount"
                            onChange={(e) => {
                              const list = [
                                ...(form.getFieldValue("discountsOthers") || []),
                              ];
                              list[name] = {
                                ...(list[name] || {}),
                                amount: parseNumber(e.target.value),
                              };
                              form.setFieldsValue({ discountsOthers: list });
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
              On-road before discount
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
              Net on-road (quoted)
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
