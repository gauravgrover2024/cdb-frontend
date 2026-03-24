import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AutoComplete, Checkbox, Form, Input, InputNumber, Select } from "antd";
import Icon from "../../../../../components/AppIcon";
import { formatINR } from "../../../../../utils/currency";
import { useVehicleData } from "../../../../../hooks/useVehicleData";
import useShowroomAutoSuggest from "../../../../../hooks/useShowroomAutoSuggest";

const { Option } = Select;

const asAmount = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SummaryRow = ({ label, value, isDeduction = false }) => (
  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span
      className={`text-sm font-semibold ${
        isDeduction ? "text-rose-700 dark:text-rose-300" : "text-foreground"
      }`}
    >
      {isDeduction ? "-" : ""}
      {formatINR(Math.abs(asAmount(value)))}
    </span>
  </div>
);

const normalizeYesNo = (val) => {
  const v = String(val ?? "")
    .trim()
    .toLowerCase();
  if (["yes", "y", "true", "1"].includes(v)) return "Yes";
  if (["no", "n", "false", "0"].includes(v)) return "No";
  return "";
};

const firstFilled = (...values) =>
  values.find(
    (v) =>
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v.trim() === ""),
    );

const formatIndianNumber = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-IN");
};

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
  const mk = String(make || "").trim();
  const md = String(model || "").trim();
  const prefix = [mk, md].filter(Boolean).join(" ").trim();
  if (prefix) cleaned = stripLeadingPhrase(cleaned, prefix);
  if (md) cleaned = stripLeadingPhrase(cleaned, md);
  if (mk) cleaned = stripLeadingPhrase(cleaned, mk);
  return cleaned || raw;
};

const PostFileVehicleVerification = ({ form }) => {
  const [isVehicleEdit, setIsVehicleEdit] = useState(false);
  const [isShowroomEdit, setIsShowroomEdit] = useState(false);
  const [isPricingEdit, setIsPricingEdit] = useState(false);
  const hasFieldChanged = useCallback(
    (field, nextValue) =>
      String(form.getFieldValue(field) ?? "") !== String(nextValue ?? ""),
    [form],
  );

  const setFieldsIfChanged = useCallback(
    (patch = {}) => {
      const filtered = Object.fromEntries(
        Object.entries(patch).filter(([field, value]) =>
          hasFieldChanged(field, value),
        ),
      );
      if (!Object.keys(filtered).length) return;
      form.setFieldsValue(filtered);
    },
    [form, hasFieldChanged],
  );

  const applicantType = Form.useWatch("applicantType", form);
  const customerType = Form.useWatch("customerType", form);
  const companyType = Form.useWatch("companyType", form);
  const gstNumber = Form.useWatch("gstNumber", form);
  const cinNumber = Form.useWatch("cinNumber", form);
  const businessName = Form.useWatch("businessName", form);
  const applicantTypeValue = String(
    firstFilled(applicantType, form.getFieldValue("applicantType"), ""),
  ).trim();
  const customerTypeValue = String(
    firstFilled(customerType, form.getFieldValue("customerType"), ""),
  ).trim();
  const isCompany =
    applicantTypeValue.toLowerCase() === "company" ||
    customerTypeValue.toLowerCase() === "company" ||
    /company|corporate|firm|llp|partnership|proprietor/i.test(
      `${applicantTypeValue} ${customerTypeValue} ${String(companyType || "")}`,
    ) ||
    Boolean(companyType) ||
    Boolean(gstNumber) ||
    Boolean(cinNumber) ||
    Boolean(businessName);

  const vehicleMakeRaw = Form.useWatch("vehicleMake", form);
  const typeOfLoanRaw = Form.useWatch("typeOfLoan", form);
  const loanTypeRaw = Form.useWatch("loanType", form);
  const vehicleModelRaw = Form.useWatch("vehicleModel", form);
  const vehicleVariantRaw = Form.useWatch("vehicleVariant", form);
  const vehicleFuelTypeRaw = Form.useWatch("vehicleFuelType", form);
  const { options: showroomOptions, search: searchShowrooms } =
    useShowroomAutoSuggest({ limit: 25, brand: vehicleMakeRaw });

  const registerSameAsAadhaarRaw = Form.useWatch("registerSameAsAadhaar", form);
  const registerSameAsPermanentRaw = Form.useWatch(
    "registerSameAsPermanent",
    form,
  );
  const registrationAddress = Form.useWatch("registrationAddress", form);
  const registrationPincode = Form.useWatch("registrationPincode", form);
  const registrationCity = Form.useWatch("registrationCity", form);
  const watchedPostfileRegdCity = Form.useWatch("postfile_regd_city", form);
  const city = Form.useWatch("city", form);
  const permanentCity = Form.useWatch("permanentCity", form);

  const showroomDealerNameRaw = Form.useWatch("showroomDealerName", form);
  const showroomDealerContactPerson = Form.useWatch(
    "showroomDealerContactPerson",
    form,
  );
  const showroomDealerContactNumber = Form.useWatch(
    "showroomDealerContactNumber",
    form,
  );
  const showroomDealerAddress = Form.useWatch("showroomDealerAddress", form);

  const exShowroomPriceRaw = Form.useWatch("exShowroomPrice", form);
  const insuranceCostRaw = Form.useWatch("insuranceCost", form);
  const roadTaxRaw = Form.useWatch("roadTax", form);
  const accessoriesAmountRaw = Form.useWatch("accessoriesAmount", form);
  const dealerDiscountRaw = Form.useWatch("dealerDiscount", form);
  const manufacturerDiscountRaw = Form.useWatch("manufacturerDiscount", form);
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
    makeFieldName: "vehicleMake",
    modelFieldName: "vehicleModel",
    variantFieldName: "vehicleVariant",
    autofillPricing: true,
    onVehicleSelect: () => {},
  });

  const vehicleMake = firstFilled(
    vehicleMakeRaw,
    form.getFieldValue("vehicleMake"),
    "",
  );
  const vehicleModel = firstFilled(
    vehicleModelRaw,
    form.getFieldValue("vehicleModel"),
    "",
  );
  const vehicleVariant = firstFilled(
    vehicleVariantRaw,
    form.getFieldValue("vehicleVariant"),
    "",
  );
  const vehicleFuelType = firstFilled(
    vehicleFuelTypeRaw,
    form.getFieldValue("vehicleFuelType"),
    "",
  );

  const registerSameAsAadhaar = normalizeYesNo(
    firstFilled(
      registerSameAsAadhaarRaw,
      form.getFieldValue("registerSameAsAadhaar"),
      form.getFieldValue("registerSameAsAadhar"),
      "",
    ),
  );
  const registerSameAsPermanent = normalizeYesNo(
    firstFilled(
      registerSameAsPermanentRaw,
      form.getFieldValue("registerSameAsPermanent"),
      "",
    ),
  );

  const showroomDealerName = firstFilled(
    showroomDealerNameRaw,
    form.getFieldValue("showroomDealerName"),
    "",
  );
  const filteredShowroomOptions = useMemo(() => {
    const tokens = String(showroomDealerName || "")
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!tokens.length) return showroomOptions;
    return (showroomOptions || []).filter((option) => {
      const name = String(option?.showroom?.name || option?.value || "")
        .toLowerCase()
        .trim();
      return tokens.every((token) => name.includes(token));
    });
  }, [showroomDealerName, showroomOptions]);
  const normalizedLoanType = String(
    firstFilled(typeOfLoanRaw, loanTypeRaw, form.getFieldValue("typeOfLoan"), form.getFieldValue("loanType"), ""),
  )
    .trim()
    .toLowerCase();
  const isNewCarCase = normalizedLoanType === "new car";
  const showroomSectionTitle = isNewCarCase ? "Showroom" : "Loan Payment Favouring";

  useEffect(() => {
    if (!isNewCarCase) {
      setIsShowroomEdit(true);
    }
  }, [isNewCarCase]);
  const syncDealerFields = (patch = {}) => {
    const next = { ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, "showroomDealerName")) {
      next.delivery_dealerName = patch.showroomDealerName;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "showroomDealerAddress")) {
      next.delivery_dealerAddress = patch.showroomDealerAddress;
    }
    setFieldsIfChanged(next);
  };
  const handleShowroomSelect = (_, option) => {
    const showroom = option?.showroom;
    if (!showroom) return;
    syncDealerFields({
      showroomDealerName: showroom.name || "",
      showroomDealerAddress: showroom.address || "",
    });
  };

  const exShowroomPrice = firstFilled(
    exShowroomPriceRaw,
    form.getFieldValue("exShowroomPrice"),
    0,
  );
  const insuranceCost = firstFilled(
    insuranceCostRaw,
    form.getFieldValue("insuranceCost"),
    0,
  );
  const roadTax = firstFilled(
    roadTaxRaw,
    form.getFieldValue("roadTax"),
    0,
  );
  const accessoriesAmount = firstFilled(
    accessoriesAmountRaw,
    form.getFieldValue("accessoriesAmount"),
    0,
  );
  const dealerDiscount = firstFilled(
    dealerDiscountRaw,
    form.getFieldValue("dealerDiscount"),
    0,
  );
  const manufacturerDiscount = firstFilled(
    manufacturerDiscountRaw,
    form.getFieldValue("manufacturerDiscount"),
    0,
  );

  const netVehicleQuote = useMemo(() => {
    return (
      asAmount(exShowroomPrice) +
      asAmount(insuranceCost) +
      asAmount(roadTax) +
      asAmount(accessoriesAmount) -
      asAmount(dealerDiscount) -
      asAmount(manufacturerDiscount)
    );
  }, [
    exShowroomPrice,
    insuranceCost,
    roadTax,
    accessoriesAmount,
    dealerDiscount,
    manufacturerDiscount,
  ]);
  const loadingMakes = vehicleLoading && makes.length === 0;
  const loadingModels = vehicleLoading && Boolean(vehicleMake) && models.length === 0;
  const loadingVariants =
    vehicleLoading && Boolean(vehicleModel) && variants.length === 0;
  const registrationCityValue = firstFilled(
    registrationCity,
    watchedPostfileRegdCity,
    city,
    permanentCity,
    form.getFieldValue("registrationCity"),
    form.getFieldValue("postfile_regd_city"),
    form.getFieldValue("city"),
    form.getFieldValue("permanentCity"),
    "-",
  );

  useEffect(() => {
    const resolvedCity = firstFilled(
      registrationCity,
      watchedPostfileRegdCity,
      city,
      permanentCity,
      "",
    );
    if (resolvedCity && !watchedPostfileRegdCity) {
      setFieldsIfChanged({ postfile_regd_city: resolvedCity });
    }
  }, [
    registrationCity,
    watchedPostfileRegdCity,
    city,
    permanentCity,
    setFieldsIfChanged,
  ]);

  return (
    <div className="bg-card rounded-xl border border-border/70 p-5 md:p-6 h-full flex flex-col shadow-sm">
      <div className="section-header flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Car" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Vehicle Verification</h2>
            <p className="text-sm text-muted-foreground">
              Post-file validation against pre-file pricing and registration details
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 text-sm">
        <div className="rounded-[24px] border border-border/70 bg-background/80 p-4 shadow-sm dark:bg-slate-950/45">
          <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Quote Summary
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Net Vehicle Quote
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              {formatINR(netVehicleQuote)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Ex-showroom + insurance + road tax + accessories - discounts
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Vehicle
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  Reg City: {registrationCityValue}
                </div>
                <button
                  type="button"
                  onClick={() => setIsVehicleEdit((v) => !v)}
                  className="rounded-md border border-border/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/30"
                >
                  {isVehicleEdit ? "Done" : "Edit"}
                </button>
              </div>
            </div>
            {!isVehicleEdit ? (
              <div className="text-sm font-semibold text-foreground">
                {[vehicleMake, vehicleModel, vehicleVariant].filter(Boolean).join(" ") ||
                  "Vehicle not tagged"}
                {vehicleFuelType ? ` • ${vehicleFuelType}` : ""}
              </div>
            ) : (
              <div>
                <Form.Item style={{ marginBottom: 12 }}>
                  <Checkbox
                    checked={showDiscontinuedCars}
                    onChange={(event) =>
                      setShowDiscontinuedCars(event?.target?.checked)
                    }
                  >
                    Show discontinued cars
                  </Checkbox>
                </Form.Item>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Form.Item label="Make" name="vehicleMake" style={{ marginBottom: 0 }}>
                  <Select
                    placeholder="Select Make"
                    showSearch
                    optionFilterProp="children"
                    loading={loadingMakes}
                    onChange={(value) => {
                      form.setFieldsValue({
                        vehicleMake: value,
                        vehicleModel: undefined,
                        vehicleVariant: undefined,
                      });
                      handleMakeChange(value);
                    }}
                  >
                    {vehicleMake && !makes.includes(vehicleMake) && (
                      <Option value={vehicleMake}>{vehicleMake}</Option>
                    )}
                    {makes.map((make) => (
                      <Option key={make} value={make}>
                        {make}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label="Model" name="vehicleModel" style={{ marginBottom: 0 }}>
                  <Select
                    placeholder={vehicleMake ? "Select Model" : "Select Make First"}
                    showSearch
                    optionFilterProp="children"
                    disabled={!vehicleMake}
                    loading={loadingModels}
                    onChange={(value) => {
                      form.setFieldsValue({
                        vehicleModel: value,
                        vehicleVariant: undefined,
                      });
                      handleModelChange(value);
                    }}
                  >
                    {vehicleModel && !models.includes(vehicleModel) && (
                      <Option value={vehicleModel}>{vehicleModel}</Option>
                    )}
                    {models.map((model) => (
                      <Option key={model} value={model}>
                        {model}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label="Variant" name="vehicleVariant" style={{ marginBottom: 0 }}>
                  <Select
                    placeholder={vehicleModel ? "Select Variant" : "Select Model First"}
                    showSearch
                    optionFilterProp="children"
                    disabled={!vehicleModel}
                    loading={loadingVariants}
                    onChange={(value) => {
                      form.setFieldsValue({ vehicleVariant: value });
                      handleVariantChange(value);
                    }}
                  >
                    {vehicleVariant && !variants.includes(vehicleVariant) && (
                      <Option value={vehicleVariant}>
                        {cleanVariantDisplay(vehicleVariant, vehicleMake, vehicleModel)}
                      </Option>
                    )}
                    {variants.map((variant) => (
                      <Option key={variant} value={variant}>
                        {variant}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label="Fuel Type" name="vehicleFuelType" style={{ marginBottom: 0 }}>
                  <Select placeholder="Select Fuel Type" showSearch optionFilterProp="children">
                    <Option value="Petrol">Petrol</Option>
                    <Option value="Diesel">Diesel</Option>
                    <Option value="CNG">CNG</Option>
                    <Option value="Hybrid">Hybrid</Option>
                    <Option value="Electric">Electric</Option>
                  </Select>
                </Form.Item>
              </div>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {showroomSectionTitle}
              </div>
              {isNewCarCase && (
                <button
                  type="button"
                  onClick={() => setIsShowroomEdit((v) => !v)}
                  className="rounded-md border border-border/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/30"
                >
                  {isShowroomEdit ? "Done" : "Edit"}
                </button>
              )}
            </div>
            {!isShowroomEdit ? (
              <>
                <div className="text-sm font-semibold text-foreground">
                  {showroomDealerName || "Not Selected"}
                </div>
                {isNewCarCase &&
                (firstFilled(
                  showroomDealerContactPerson,
                  "",
                ) ||
                firstFilled(showroomDealerContactNumber, "")) ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {showroomDealerContactPerson}
                    {showroomDealerContactPerson &&
                    showroomDealerContactNumber
                      ? " • "
                      : ""}
                    {showroomDealerContactNumber}
                  </div>
                ) : null}
                {isNewCarCase && showroomDealerAddress && (
                  <div className="mt-1 text-xs text-muted-foreground/90">
                    {showroomDealerAddress}
                  </div>
                )}
              </>
            ) : isNewCarCase ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Form.Item
                  label="Dealer Name"
                  name="showroomDealerName"
                  style={{ marginBottom: 0 }}
                >
                  <AutoComplete
                    options={filteredShowroomOptions}
                    popupMatchSelectWidth={false}
                    onSearch={searchShowrooms}
                    onSelect={handleShowroomSelect}
                    onChange={(value) => {
                      searchShowrooms(value);
                      syncDealerFields({ showroomDealerName: value || "" });
                    }}
                    filterOption={(inputValue, option) =>
                      String(option?.showroom?.name || option?.value || "")
                        .toLowerCase()
                        .includes(String(inputValue || "").toLowerCase().trim())
                    }
                  >
                    <Input placeholder="Enter dealer name" />
                  </AutoComplete>
                </Form.Item>
                <>
                  <Form.Item
                    label="Contact Person"
                    name="showroomDealerContactPerson"
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Enter contact person" />
                  </Form.Item>
                  <Form.Item
                    label="Contact Number"
                    name="showroomDealerContactNumber"
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Enter contact number" />
                  </Form.Item>
                  <Form.Item
                    label="Dealer Address"
                    name="showroomDealerAddress"
                    style={{ marginBottom: 0 }}
                  >
                    <Input.TextArea
                      autoSize={{ minRows: 2, maxRows: 5 }}
                      placeholder="Enter dealer address"
                      onChange={(e) =>
                        syncDealerFields({
                          showroomDealerAddress: e.target.value || "",
                        })
                      }
                    />
                  </Form.Item>
                </>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 pb-1 md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:gap-3">
                <div className="text-sm font-semibold text-foreground">
                  Loan Payment Favouring
                </div>
                <Form.Item
                  name="showroomDealerName"
                  style={{ marginBottom: 0 }}
                  className="!mb-0"
                >
                  <Input
                    placeholder="Enter loan payment favouring"
                    className="h-10 !py-0"
                    style={{ lineHeight: "40px" }}
                    onChange={(e) =>
                      syncDealerFields({ showroomDealerName: e.target.value || "" })
                    }
                  />
                </Form.Item>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Pricing Stack
              </div>
              <button
                type="button"
                onClick={() => setIsPricingEdit((v) => !v)}
                className="rounded-md border border-border/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/30"
              >
                {isPricingEdit ? "Done" : "Edit"}
              </button>
            </div>
            {isPricingEdit && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-3">
                <Form.Item
                  label="Ex-Showroom Price"
                  name="exShowroomPrice"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `₹ ${formatIndianNumber(value)}`}
                    parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                  />
                </Form.Item>
                <Form.Item
                  label="Insurance Cost"
                  name="insuranceCost"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `₹ ${formatIndianNumber(value)}`}
                    parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                  />
                </Form.Item>
                <Form.Item
                  label="Road Tax"
                  name="roadTax"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `₹ ${formatIndianNumber(value)}`}
                    parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                  />
                </Form.Item>
                <Form.Item
                  label="Accessories Amount"
                  name="accessoriesAmount"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `₹ ${formatIndianNumber(value)}`}
                    parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                  />
                </Form.Item>
                <Form.Item
                  label="Dealer Discount"
                  name="dealerDiscount"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `₹ ${formatIndianNumber(value)}`}
                    parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                  />
                </Form.Item>
                <Form.Item
                  label="Manufacturer Discount"
                  name="manufacturerDiscount"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `₹ ${formatIndianNumber(value)}`}
                    parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                  />
                </Form.Item>
              </div>
            )}
            <div className="space-y-2">
              <SummaryRow label="Ex-Showroom Price" value={exShowroomPrice} />
              <SummaryRow label="Insurance" value={insuranceCost} />
              <SummaryRow label="Road Tax" value={roadTax} />
              <SummaryRow label="Accessories" value={accessoriesAmount} />
              <SummaryRow
                label="Dealer Discount"
                value={dealerDiscount}
                isDeduction
              />
              <SummaryRow
                label="Manufacturer Discount"
                value={manufacturerDiscount}
                isDeduction
              />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-border/70 bg-background/80 p-4 shadow-sm dark:bg-slate-950/45">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2">
            <Icon name="MapPin" size={16} className="text-primary" />
            Registration Details
          </h3>
          <div className="mt-3 space-y-3">
            <div
              className={`rounded-xl border px-3 py-3 ${
                registerSameAsAadhaar === "Yes"
                  ? "border-emerald-500/35 bg-emerald-500/12"
                  : registerSameAsAadhaar === "No"
                    ? "border-rose-500/35 bg-rose-500/12"
                    : "border-border/60 bg-muted/20"
              }`}
            >
              <div className="text-xs font-semibold text-foreground">
                {isCompany
                  ? "Is vehicle registered at GST/office address?"
                  : "Is vehicle registered at Aadhaar address?"}
              </div>
              <div
                className={`mt-1 text-xs font-semibold ${
                  registerSameAsAadhaar === "Yes"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : registerSameAsAadhaar === "No"
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-muted-foreground"
                }`}
              >
                {registerSameAsAadhaar || "-"}
              </div>
            </div>

            {registerSameAsAadhaar === "No" && (
              <>
                <div
                  className={`rounded-xl border px-3 py-3 ${
                    registerSameAsPermanent === "Yes"
                      ? "border-emerald-500/35 bg-emerald-500/12"
                      : "border-rose-500/35 bg-rose-500/12"
                  }`}
                >
                  <div className="text-xs font-semibold text-foreground">
                    Is vehicle registered at permanent address?
                  </div>
                  <div
                    className={`mt-1 text-xs font-semibold ${
                      registerSameAsPermanent === "Yes"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : registerSameAsPermanent === "No"
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-muted-foreground"
                    }`}
                  >
                    {registerSameAsPermanent || "-"}
                  </div>
                </div>

                {registerSameAsPermanent === "No" && (
                  <div className="rounded-xl border border-rose-500/35 bg-rose-500/12 px-3 py-3">
                    <div className="text-xs font-semibold text-foreground mb-2">
                      Registration Address Details
                    </div>
                    <div className="space-y-1 text-xs text-rose-800 dark:text-rose-200">
                      <div>Address: {registrationAddress || "-"}</div>
                      <div>Pincode: {registrationPincode || "-"}</div>
                      <div>City: {registrationCityValue}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostFileVehicleVerification;
