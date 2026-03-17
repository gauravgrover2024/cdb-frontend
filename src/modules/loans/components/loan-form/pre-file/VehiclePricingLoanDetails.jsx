// src/modules/loans/components/loan-form/prefile/Section4VehiclePricing.jsx
import React, { useEffect, useState } from "react";

import {
  Form,
  Input,
  Select,
  Row,
  Col,
  Card,
  Divider,
  Radio,
  InputNumber,
  Tag,
  AutoComplete,
  Skeleton,
} from "antd";
import { CarOutlined } from "@ant-design/icons";
import { useVehicleData } from "../../../../../hooks/useVehicleData";
import useShowroomAutoSuggest from "../../../../../hooks/useShowroomAutoSuggest";
import { lookupCityByPincode, normalizePincode } from "./pincodeCityLookup";
import { lenderHypothecationOptions } from "../../../../../constants/lenderHypothecationOptions";
import {
  INDIAN_CITY_OPTIONS,
  normalizeCityAlias,
  resolveVehiclePricingCity,
} from "./registrationCityPricing";

const { Option } = Select;
const SHOWROOM_AUTOSUGGEST_POPUP_WIDTH = 520;

const cleanVariantDisplay = (variant, make, model) => {
  const raw = String(variant || "").trim();
  if (!raw) return "";
  const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripLeadingPhrase = (text, phrase) => {
    const rawText = String(text || "").trim();
    const rawPhrase = String(phrase || "").trim();
    if (!rawText || !rawPhrase) return rawText;
    const pattern = new RegExp(
      `^${escapeRegex(rawPhrase).replace(/\s+/g, "[\\s\\-]*")}[\\s\\-:]*`,
      "i",
    );
    return rawText.replace(pattern, "").trim();
  };
  let cleaned = raw;
  const m = String(make || "").trim();
  const md = String(model || "").trim();
  const composedPrefix = [m, md].filter(Boolean).join(" ").trim();
  if (composedPrefix) cleaned = stripLeadingPhrase(cleaned, composedPrefix);
  if (md) cleaned = stripLeadingPhrase(cleaned, md);
  if (m) cleaned = stripLeadingPhrase(cleaned, m);
  return cleaned || raw;
};


/**
 * Section4VehiclePricing
 * - Make / Model / Variant are shown for ALL loan types
 * - New Car => full pricing + sticky summary on the right
 * - Used / Cash-in / Refinance => minimal fields (plus usage/purpose where required)
 * - Hypothecation = Yes => Bank Name required
 * - Dealer now includes Contact Person + Contact Number
 *
 * Copy-paste safe.
 */

const Section4VehiclePricing = ({ cashPrefileMode = false }) => {
  const form = Form.useFormInstance();
  const selectedBrandForShowroom = Form.useWatch("vehicleMake", form);
  const [fetchingRegistrationPincode, setFetchingRegistrationPincode] =
    useState(false);

  // Use centralized vehicle data hook
  const {
    makes,
    models,
    variants,
    selectedVehicle,
    loading: vehicleLoading,
    handleMakeChange,
    handleModelChange,
    handleVariantChange,
  } = useVehicleData(form, {
    makeFieldName: "vehicleMake",
    modelFieldName: "vehicleModel",
    variantFieldName: "vehicleVariant",
    cityFieldName: "registrationCity",
    cityResolver: resolveVehiclePricingCity,
    autofillPricing: true,
    onVehicleSelect: (vehicleData) => {
      // Auto-populate pricing once, but never override manual edits.
      if (!vehicleData || loanType !== "New Car") return;

      const current = form.getFieldsValue([
        "exShowroomPrice",
        "insuranceCost",
        "roadTax",
      ]);
      const candidate = {
        exShowroomPrice: vehicleData.exShowroom ?? 0,
        insuranceCost: vehicleData.insurance ?? 0,
        roadTax: vehicleData.rto ?? 0,
      };
      const next = {};

      ["exShowroomPrice", "insuranceCost", "roadTax"].forEach((name) => {
        const touched = form.isFieldTouched(name);
        const hasExistingValue =
          current?.[name] !== undefined &&
          current?.[name] !== null &&
          String(current?.[name]).trim() !== "";
        if (!touched && !hasExistingValue) {
          next[name] = candidate[name];
        }
      });

      if (Object.keys(next).length > 0) {
        form.setFieldsValue(next);
      }
    },
  });
  const { options: showroomOptions, search: searchShowrooms } =
    useShowroomAutoSuggest({ limit: 25, brand: selectedBrandForShowroom });

  useEffect(() => {
    const make = form.getFieldValue("vehicleMake");
    const model = form.getFieldValue("vehicleModel");
    const variant = form.getFieldValue("vehicleVariant");
    const fuel = form.getFieldValue("vehicleFuelType");

    form.setFieldsValue({
      vehicleMake: make,
      vehicleModel: model,
      vehicleVariant: variant,
      vehicleFuelType: fuel,
    });
  }, [form]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const rawFuel =
      selectedVehicle.fuel ||
      selectedVehicle.fuel_type ||
      selectedVehicle.fuelType ||
      "";
    const v = String(rawFuel).trim().toLowerCase();
    let normalized = "";
    if (v.includes("petrol")) normalized = "Petrol";
    else if (v.includes("diesel") || v.includes("dsl")) normalized = "Diesel";
    else if (v.includes("cng")) normalized = "CNG";
    else if (v.includes("hybrid") || v.includes("hev") || v.includes("mhev")) normalized = "Hybrid";
    else if (v.includes("electric") || v === "ev") normalized = "Electric";
    if (normalized && normalize(form.getFieldValue("vehicleFuelType")) !== normalize(normalized)) {
      form.setFieldsValue({ vehicleFuelType: normalized });
    }
  }, [selectedVehicle, form]);

  const loanType = Form.useWatch("typeOfLoan", form);
  const hypothecation = Form.useWatch("hypothecation", form);
  const aadhaarSame = Form.useWatch("registerSameAsAadhaar", form);
  const registerSameAsPermanent = Form.useWatch(
    "registerSameAsPermanent",
    form,
  );
  const applicantType = Form.useWatch("applicantType", form);
  const registrationPincode = Form.useWatch("registrationPincode", form);

  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);
  const vehicleVariantValue = Form.useWatch("vehicleVariant", form);
  const vehicleFuelType = Form.useWatch("vehicleFuelType", form);
  const normalize = (val) => String(val || "").trim().toLowerCase();
  const inList = (list, value) =>
    Array.isArray(list) && list.some((item) => normalize(item) === normalize(value));

  const v = Form.useWatch([], form) || {};

  // numeric helpers (coerce to integers; no decimals as requested)
  const asInt = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.trunc(n);
  };

  const exShowroom = asInt(v.exShowroomPrice);
  const insurance = asInt(v.insuranceCost);
  const roadTax = asInt(v.roadTax);
  const accessories = asInt(v.accessoriesAmount);
  const dealerDiscount = asInt(v.dealerDiscount);
  const manufacturerDiscount = asInt(v.manufacturerDiscount);
  const marginMoney = asInt(v.marginMoney);
  const advanceEmi = asInt(v.advanceEmi);
  const tradeInValue = asInt(v.tradeInValue);
  const otherDiscounts = asInt(v.otherDiscounts);

  const onRoad =
    exShowroom +
    insurance +
    roadTax +
    accessories -
    dealerDiscount -
    manufacturerDiscount;

  const grossLoan = onRoad - marginMoney - advanceEmi - tradeInValue;
  const netLoan = grossLoan - otherDiscounts;

  const isNewCar = loanType === "New Car";
  const isUsedCar = loanType === "Used Car";
  const isCashIn = loanType === "Car Cash-in";
  const isRefinance = loanType === "Refinance";
  const isCompany = applicantType === "Company";
  const loadingMakes = vehicleLoading && makes.length === 0;
  const loadingModels = vehicleLoading && Boolean(vehicleMake) && models.length === 0;
  const loadingVariants = vehicleLoading && Boolean(vehicleModel) && variants.length === 0;

  const handleShowroomSelect = (_, option) => {
    const showroom = option?.showroom;
    if (!showroom) return;
    syncDealerFields({
      showroomDealerName: showroom.name || "",
      showroomDealerAddress: showroom.address || "",
    });
  };
  const syncDealerFields = (patch = {}) => {
    const next = { ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, "showroomDealerName")) {
      next.delivery_dealerName = patch.showroomDealerName;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "showroomDealerAddress")) {
      next.delivery_dealerAddress = patch.showroomDealerAddress;
    }
    form.setFieldsValue(next);
  };

  useEffect(() => {
    const pin = normalizePincode(registrationPincode);
    if (!pin) return;
    let cancelled = false;

    const fetchCity = async () => {
      try {
        setFetchingRegistrationPincode(true);
        const city = await lookupCityByPincode(pin);
        if (!cancelled && city) {
          form.setFieldsValue({ registrationCity: normalizeCityAlias(city) });
        }
      } finally {
        if (!cancelled) setFetchingRegistrationPincode(false);
      }
    };

    const timer = setTimeout(fetchCity, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [registrationPincode, form]);

  useEffect(() => {
    if (!isNewCar) return;

    if (aadhaarSame === "Yes") {
      form.setFieldsValue({
        registerSameAsPermanent: undefined,
        registrationAddress:
          form.getFieldValue("residenceAddress") || "",
        registrationPincode: form.getFieldValue("pincode") || "",
        registrationCity:
          form.getFieldValue("registrationCity") || form.getFieldValue("city") || "",
      });
      return;
    }

    if (aadhaarSame === "No" && registerSameAsPermanent === "Yes") {
      form.setFieldsValue({
        registrationAddress:
          form.getFieldValue("permanentAddress") || "",
        registrationPincode: form.getFieldValue("permanentPincode") || "",
        registrationCity:
          form.getFieldValue("registrationCity") ||
          form.getFieldValue("permanentCity") ||
          "",
      });
    }
  }, [aadhaarSame, registerSameAsPermanent, isNewCar, form]);

  // Cash-in/Refinance: variant can include model year (e.g. "E 220 D 2018")
  // Move trailing year into Bought In (Year) and keep variant clean.
  useEffect(() => {
    if (!(isCashIn || isRefinance)) return;
    const rawVariant = String(vehicleVariantValue || "").trim();
    if (!rawVariant) return;
    const match = rawVariant.match(/^(.*?)(?:\s+)(19\d{2}|20\d{2})$/);
    if (!match) return;
    const cleanedVariant = match[1].trim();
    const detectedYear = match[2];
    form.setFieldsValue({
      vehicleVariant: cleanedVariant,
      boughtInYear: form.getFieldValue("boughtInYear") || detectedYear,
    });
  }, [isCashIn, isRefinance, vehicleVariantValue, form]);

  const formatMoney = (amount) =>
    `₹ ${Math.abs(Math.trunc(Number(amount) || 0)).toLocaleString("en-IN")}`;

  /* Summary card (only for New Car) */
  const SummaryCard = () =>
    isNewCar && (
      <Card
        variant="borderless"
        style={{
          position: "sticky",
          top: 80,
          borderRadius: 24,
          border: "1px solid rgba(var(--border),0.8)",
          overflow: "hidden",
        }}
        className="prefile-quote-card shadow-[0_24px_70px_-32px_rgba(15,23,42,0.28)] dark:shadow-[0_24px_70px_-34px_rgba(2,6,23,0.85)]"
        styles={{ body: { padding: 24 } }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.12),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_36%)]" />
        <div className="relative">
          <div className="mb-5 overflow-hidden rounded-[28px] border border-border/70 bg-background/75 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.25)] backdrop-blur dark:border-border/80 dark:bg-slate-950/70 dark:shadow-[0_22px_55px_-34px_rgba(2,6,23,0.9)]">
            <div className="border-b border-border/70 px-5 py-4">
              <div className="mb-1 text-[11px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Quote Summary
              </div>
              <div className="text-xl font-semibold text-foreground">
                {v.vehicleMake || "Unknown Make"} {v.vehicleModel || ""} {v.vehicleVariant || ""}
                {vehicleFuelType ? ` • ${vehicleFuelType}` : ""}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag className="m-0 rounded-full border-none bg-sky-500/12 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-400/12 dark:text-sky-200">
                  {loanType || "New Car"}
                </Tag>
                {v.usage && (
                  <Tag className="m-0 rounded-full border-none bg-muted/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {v.usage}
                  </Tag>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-border/70">
              <div className="px-5 py-4">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  On-Road Price
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {formatMoney(onRoad)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Price after insurance, road tax and pricing discounts
                </div>
              </div>
              <div className="border-l border-border/70 bg-emerald-500/10 px-5 py-4 dark:bg-emerald-400/10">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">
                  Recommended Finance
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-100">
                  {formatMoney(netLoan)}
                </div>
                <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-100/80">
                  Final quoted loan amount after deductions and offsets
                </div>
              </div>
            </div>
            {!cashPrefileMode && (
              <div className="grid grid-cols-3 gap-0">
                <div className="px-5 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Margin
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {formatMoney(marginMoney)}
                  </div>
                </div>
                <div className="border-l border-border/70 px-5 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Advance EMI
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {formatMoney(advanceEmi)}
                  </div>
                </div>
                <div className="border-l border-border/70 px-5 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Gross Loan
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {formatMoney(grossLoan)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm dark:bg-slate-950/50">
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Showroom
            </div>
            <div className="text-sm font-semibold text-foreground">
              {v.showroomDealerName || "Not Selected"}
            </div>
            {(v.showroomDealerContactPerson || v.showroomDealerContactNumber) && (
              <div className="mt-1 text-xs text-muted-foreground">
                {v.showroomDealerContactPerson}
                {v.showroomDealerContactPerson && v.showroomDealerContactNumber ? " • " : ""}
                {v.showroomDealerContactNumber}
              </div>
            )}
            {v.showroomDealerAddress && (
              <div className="mt-1 text-xs text-muted-foreground/90">
                {v.showroomDealerAddress}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-[24px] border border-border/70 bg-background/75 p-4 dark:bg-slate-950/50">
              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Pricing Stack
              </div>
              <SummaryRow label="Ex-Showroom Price" value={exShowroom} />
              <SummaryRow label="Insurance" value={insurance} />
              <SummaryRow label="Road Tax" value={roadTax} />
              <SummaryRow label="Accessories" value={accessories} />
              <SummaryRow label="Dealer Discount" value={-dealerDiscount} isDeduction />
              <SummaryRow label="Manufacturer Discount" value={-manufacturerDiscount} isDeduction />
            </div>

            {!cashPrefileMode && (
              <div className="rounded-[24px] border border-border/70 bg-background/75 p-4 dark:bg-slate-950/50">
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Finance Position
                </div>
                <SummaryRow label="Margin Money" value={-marginMoney} isDeduction />
                <SummaryRow label="Advance EMI" value={-advanceEmi} isDeduction />
                <SummaryRow label="Trade-In Value" value={-tradeInValue} isDeduction />
                <Divider className="my-3 border-border/70" />
                <SummaryRow label="Other Discounts" value={-otherDiscounts} isDeduction />
              </div>
            )}
          </div>
        </div>
      </Card>
    );

  return (
    <div
        id="section-vehicle"
        className="form-section rounded-[26px] border border-border/60 bg-card/95 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:bg-slate-950/55 dark:shadow-[0_24px_70px_-36px_rgba(2,6,23,0.85)] mb-6"
        style={{ background: "var(--card)" }}
    >
      <div className="section-header mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="section-title flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_16px_35px_-18px_rgba(249,115,22,0.65)] dark:from-amber-400 dark:to-orange-400 dark:text-slate-950">
             <CarOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Vehicle Quote
            </div>
            <span className="text-lg font-semibold text-foreground">Vehicle Pricing & Loan Details</span>
          </div>
        </div>
        <Tag className="m-0 rounded-full border-none bg-amber-500/12 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-400/12 dark:text-amber-200">
           Asset
        </Tag>
      </div>

      <Row gutter={24}>
        <Col span={isNewCar ? 15 : 24}>
            <Row gutter={[16, 12]}>
              {/* Make / Model / Variant / Fuel — COMMON to all types */}
              <Col xs={24} md={6}>
                <Form.Item label="Make" name="vehicleMake">
                  <Select 
                    placeholder="Select Make" 
                    allowClear 
                    showSearch
                    className="font-medium"
                    loading={vehicleLoading}
                    onChange={handleMakeChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      loadingMakes ? (
                        <div className="p-3">
                          <Skeleton active paragraph={false} title={{ width: "78%" }} />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No makes available
                        </div>
                      )
                    }
                  >
                    {vehicleMake && !inList(makes, vehicleMake) && (
                      <Select.Option key={`legacy-make-${vehicleMake}`} value={vehicleMake}>
                        {vehicleMake} (Legacy)
                      </Select.Option>
                    )}
                    {makes.map((make) => (
                      <Select.Option key={make} value={make}>
                        {make}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Model" name="vehicleModel">
                  <Select
                    placeholder={vehicleMake ? "Select Model" : "Select Make First"}
                    disabled={!vehicleMake}
                    allowClear
                    showSearch
                    className="font-medium"
                    loading={vehicleLoading}
                    onChange={handleModelChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      loadingModels ? (
                        <div className="p-3">
                          <Skeleton active paragraph={false} title={{ width: "76%" }} />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No models available
                        </div>
                      )
                    }
                  >
                    {vehicleModel && !inList(models, vehicleModel) && (
                      <Select.Option key={`legacy-model-${vehicleModel}`} value={vehicleModel}>
                        {vehicleModel} (Legacy)
                      </Select.Option>
                    )}
                    {models.map((model) => (
                      <Select.Option key={model} value={model}>
                        {model}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Variant" name="vehicleVariant">
                  <Select
                    placeholder={vehicleModel ? "Select Variant" : "Select Model First"}
                    disabled={!vehicleModel}
                    allowClear
                    showSearch
                    className="font-medium"
                    loading={vehicleLoading}
                    onChange={handleVariantChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      loadingVariants ? (
                        <div className="p-3">
                          <Skeleton active paragraph={false} title={{ width: "74%" }} />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No variants available
                        </div>
                      )
                    }
                  >
                    {vehicleVariantValue && !inList(variants, vehicleVariantValue) && (
                      <Select.Option
                        key={`legacy-variant-${vehicleVariantValue}`}
                        value={vehicleVariantValue}
                      >
                        {cleanVariantDisplay(
                          vehicleVariantValue,
                          form?.getFieldValue?.("vehicleMake"),
                          form?.getFieldValue?.("vehicleModel"),
                        )}{" "}
                        (Legacy)
                      </Select.Option>
                    )}
                    {variants.map((variant) => (
                      <Select.Option key={variant} value={variant}>
                        {variant}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>  
              <Col xs={24} md={6}>
                <Form.Item label="Fuel Type" name="vehicleFuelType">
                  <Select placeholder="Select Fuel Type" allowClear>
                    <Select.Option value="Petrol">Petrol</Select.Option>
                    <Select.Option value="Diesel">Diesel</Select.Option>
                    <Select.Option value="CNG">CNG</Select.Option>
                    <Select.Option value="Hybrid">Hybrid</Select.Option>
                    <Select.Option value="Electric">Electric</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              {(loadingMakes || loadingModels || loadingVariants) && (
                <Col xs={24}>
                  <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-[11px] font-medium text-muted-foreground dark:border-zinc-700 dark:bg-slate-900/50">
                    Loading master data for vehicle dropdowns...
                  </div>
                </Col>
              )}
              {/* Type of Loan */}
              <Col xs={24} md={8}>
                <Form.Item label="Type of Loan" name="typeOfLoan">
                  <Select placeholder="Select Type of Loan">
                    <Option value="New Car">New Car</Option>
                    <Option value="Used Car">Used Car</Option>
                    <Option value="Car Cash-in">Car Cash-in</Option>
                    <Option value="Refinance">Refinance</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Usage"
                  name="usage"
                  rules={[{ required: true, message: "Select usage" }]}
                >
                  <Select placeholder="Select Vehicle Usage">
                    <Select.Option value="Private">Private</Select.Option>
                    <Select.Option value="Commercial">Commercial</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              {(isUsedCar || isCashIn || isRefinance) && (
                <Col xs={24} md={8}>
                  <Form.Item label="Vehicle Regd Number" name="vehicleRegNo">
                    <Input placeholder="e.g., DL01AB1234" />
                  </Form.Item>
                </Col>
              )}

              {(isUsedCar || isCashIn || isRefinance) && (
                <Col xs={24} md={8}>
                  <Form.Item label="Valuation" name="valuation">
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      placeholder="Enter valuation amount"
                    />
                  </Form.Item>
                </Col>
              )}

              {/* Registration City - Only for New Car */}
              {isNewCar &&
                !(aadhaarSame === "No" && registerSameAsPermanent === "No") && (
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Registration City"
                    name="registrationCity"
                    rules={[{ required: true, message: "Select registration city" }]}
                  >
                    <AutoComplete
                      options={INDIAN_CITY_OPTIONS}
                      placeholder="Search or Select City"
                      filterOption={(inputValue, option) =>
                        option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                      }
                      allowClear
                      showSearch
                    />
                  </Form.Item>
                </Col>
              )}
              
              {/* USED / CASH-IN / REFINANCE — minimal fields */}
              {(isUsedCar || isCashIn || isRefinance) && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item label="Bought In (Year)" name="boughtInYear">
                      <Input placeholder="Enter Year (e.g., 2020)" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Hypothecation" name="hypothecation">
                      <Radio.Group>
                        <Radio value="Yes">Yes</Radio>
                        <Radio value="No">No</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  {hypothecation === "Yes" && (
                    <Col xs={24} md={8}>
                      <Form.Item
                        label="Hypothecation Bank"
                        name="hypothecationBank"
                        rules={[{ required: true, message: "Bank required" }]}
                      >
                        <AutoComplete
                          options={lenderHypothecationOptions}
                          placeholder="Select lender / hypothecation bank"
                          filterOption={(inputValue, option) =>
                            String(option?.value || "")
                              .toUpperCase()
                              .includes(String(inputValue || "").toUpperCase())
                          }
                          allowClear
                        />
                      </Form.Item>
                    </Col>
                  )}

                  {/* Usage & Purpose only for Cash-in / Refinance */}
                  {(isCashIn || isRefinance) && (
                    <>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Purpose of Loan"
                          name="purposeOfLoan"
                          rules={[{ required: true }]}
                        >
                          <Select placeholder="Select Purpose of Loan">
                            <Option value="Home Renovation">
                              Home Renovation
                            </Option>
                            <Option value="Marriage">Marriage</Option>
                            <Option value="Travel">Travel</Option>
                            <Option value="Education">Education</Option>
                            <Option value="Business">Business</Option>
                            <Option value="Agriculture">Agriculture</Option>
                            <Option value="Other">Other</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </>
              )}

              {/* NEW CAR — full pricing */}
              {isNewCar && (
                <>
                  {/* Pricing Section Header */}
                  <Col xs={24}>
                    <div className="mt-6 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Vehicle Pricing</span>
                      </div>
                      <div className="h-px bg-border"></div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Ex-Showroom Price" name="exShowroomPrice">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Ex-Showroom Price"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Insurance Cost" name="insuranceCost">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Insurance Cost"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Road Tax" name="roadTax">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Road Tax"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Accessories Amount" name="accessoriesAmount">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Accessories Amount"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  {/* Discounts Section Header */}
                  <Col xs={24}>
                    <div className="mt-2 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Discounts & Deductions</span>
                      </div>
                      <div className="h-px bg-border"></div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer Discount" name="dealerDiscount">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Dealer Discount"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Manufacturer Discount" name="manufacturerDiscount">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Manufacturer Discount"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  {/* Loan Components Section Header */}
                  <Col xs={24}>
                    <div className="mt-2 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Loan Components</span>
                      </div>
                      <div className="h-px bg-border"></div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Margin Money" name="marginMoney">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Margin Money"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Advance EMI" name="advanceEmi">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Advance EMI"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Trade-in Value" name="tradeInValue">
                      <InputNumber style={{ width: "100%" }} formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/₹\s?|(,*)/g, '')} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Other Discounts" name="otherDiscounts">
                      <InputNumber style={{ width: "100%" }} formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/₹\s?|(,*)/g, '')} />
                    </Form.Item>
                  </Col>

                  {!cashPrefileMode && (
                    <>
                      {/* Dealer fields */}
                      <Col xs={24}>
                         <div className="h-px bg-border my-4" />
                         <span className="text-xs text-muted-foreground block mb-4">Dealer Details</span>
                      </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer Name" name="showroomDealerName">
                      <AutoComplete
                        options={showroomOptions}
                        popupMatchSelectWidth={false}
                        popupStyle={{
                          width: SHOWROOM_AUTOSUGGEST_POPUP_WIDTH,
                          maxWidth: "92vw",
                        }}
                        onSearch={searchShowrooms}
                        onChange={(value) =>
                          syncDealerFields({ showroomDealerName: value || "" })
                        }
                        onSelect={handleShowroomSelect}
                        filterOption={(inputValue, option) =>
                          String(option?.label || "")
                            .toUpperCase()
                            .includes(inputValue.toUpperCase())
                        }
                      >
                        <Input placeholder="Enter Dealer Name" />
                      </AutoComplete>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Contact Person"
                      name="showroomDealerContactPerson"
                    >
                      <Input placeholder="Enter Contact Person" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Contact Number"
                      name="showroomDealerContactNumber"
                    >
                      <Input placeholder="Enter Contact Number" />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="Dealer Address" name="showroomDealerAddress">
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 5 }}
                        placeholder="Enter Dealer Address"
                        onChange={(e) =>
                          syncDealerFields({
                            showroomDealerAddress: e.target.value || "",
                          })
                        }
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                     <div className="h-px bg-border my-4" />
                     <span className="text-xs text-muted-foreground block mb-4">Registration Details</span>
                  </Col>

                  <Col xs={24}>
                    <Form.Item
                      label={
                        isCompany
                          ? "Is vehicle registered at GST/office address?"
                          : "Is vehicle registered at Aadhaar address?"
                      }
                      name="registerSameAsAadhaar"
                    >
                      <Radio.Group>
                        <Radio value="Yes">Yes</Radio>
                        <Radio value="No">No</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>

                      {aadhaarSame === "No" && (
                        <>
                          <Col xs={24}>
                            <Form.Item
                              label="Is vehicle registered at permanent address?"
                              name="registerSameAsPermanent"
                            >
                              <Radio.Group>
                                <Radio value="Yes">Yes</Radio>
                                <Radio value="No">No</Radio>
                              </Radio.Group>
                            </Form.Item>
                          </Col>

                          {registerSameAsPermanent === "No" && (
                            <>
                              <Col xs={24}>
                                <Form.Item
                                  label="Registration Address"
                                  name="registrationAddress"
                                  rules={[{ required: true, message: "Enter registration address" }]}
                                >
                                  <Input.TextArea
                                    autoSize={{ minRows: 2, maxRows: 5 }}
                                    placeholder="Enter Registration Address"
                                  />
                                </Form.Item>
                              </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              label="Registration Pincode"
                              name="registrationPincode"
                              rules={[{ required: true, message: "Enter registration pincode" }]}
                            >
                              <Input maxLength={6} placeholder="Enter Pincode" />
                            </Form.Item>
                          </Col>

                              <Col xs={24} md={8}>
                                <Form.Item
                                  label="Registration City"
                                  name="registrationCity"
                                  rules={[{ required: true, message: "Select registration city" }]}
                                >
                                  <AutoComplete
                                    options={INDIAN_CITY_OPTIONS}
                                    placeholder={
                                      fetchingRegistrationPincode
                                        ? "Fetching city..."
                                        : "Search or Select City"
                                    }
                                    filterOption={(inputValue, option) =>
                                      String(option?.value || "")
                                        .toUpperCase()
                                        .includes(String(inputValue || "").toUpperCase())
                                    }
                                    allowClear
                                    showSearch
                                  />
                                </Form.Item>
                              </Col>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </Row>
        </Col>

        {/* Summary on right for New Car */}
        {isNewCar && (
          <Col span={9}>
            <SummaryCard />
          </Col>
        )}
      </Row>
    </div>
  );
};

/* Small SummaryRow component */
const SummaryRow = ({ label, value = 0, highlight, isDeduction }) => {
  const display = Number.isFinite(Number(value))
    ? Math.abs(Math.trunc(Number(value)))
    : 0;

  return (
    <div
      className={`flex justify-between text-sm mb-1.5 ${highlight ? 'font-bold' : 'font-medium'}`}
    >
      <span className={highlight ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`${isDeduction ? 'text-error' : highlight ? 'text-foreground' : 'text-foreground'}`}>
        {isDeduction ? "- " : ""}₹ {display.toLocaleString("en-IN")}
      </span>
    </div>
  );
};

export default Section4VehiclePricing;
