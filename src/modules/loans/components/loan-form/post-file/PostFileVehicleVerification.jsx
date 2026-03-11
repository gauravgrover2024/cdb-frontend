import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, InputNumber, Select } from "antd";
import Icon from "../../../../../components/AppIcon";
import { formatINR } from "../../../../../utils/currency";
import { useVehicleData } from "../../../../../hooks/useVehicleData";

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

const PostFileVehicleVerification = ({ form }) => {
  const [isVehicleEdit, setIsVehicleEdit] = useState(false);
  const [isShowroomEdit, setIsShowroomEdit] = useState(false);
  const [isPricingEdit, setIsPricingEdit] = useState(false);

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

  const approvalBankId = Form.useWatch("approval_bankId", form);
  const approvalBanksDataRaw = Form.useWatch("approval_banksData", form);

  const vehicleMakeRaw = Form.useWatch("vehicleMake", form);
  const vehicleModelRaw = Form.useWatch("vehicleModel", form);
  const vehicleVariantRaw = Form.useWatch("vehicleVariant", form);
  const vehicleFuelTypeRaw = Form.useWatch("vehicleFuelType", form);

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
  const deliveryDealerName = Form.useWatch("delivery_dealerName", form);

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
  } = useVehicleData(form, {
    makeFieldName: "vehicleMake",
    modelFieldName: "vehicleModel",
    variantFieldName: "vehicleVariant",
    autofillPricing: true,
    onVehicleSelect: () => {},
  });

  const primaryBank = useMemo(() => {
    const approvalBanksData = Array.isArray(approvalBanksDataRaw)
      ? approvalBanksDataRaw
      : [];
    if (!Array.isArray(approvalBanksData) || approvalBanksData.length === 0) {
      return null;
    }
    const selected = approvalBanksData.find(
      (b) => String(b?.id ?? "") === String(approvalBankId ?? ""),
    );
    if (selected) return selected;
    return (
      approvalBanksData.find((b) => b?.status === "Disbursed") ||
      approvalBanksData.find((b) => b?.status === "Approved") ||
      approvalBanksData[0]
    );
  }, [approvalBanksDataRaw, approvalBankId]);

  const bankVehicle = primaryBank?.vehicle || {};

  const vehicleMake = firstFilled(
    vehicleMakeRaw,
    primaryBank?.vehicleMake,
    bankVehicle?.make,
    "",
  );
  const vehicleModel = firstFilled(
    vehicleModelRaw,
    primaryBank?.vehicleModel,
    bankVehicle?.model,
    "",
  );
  const vehicleVariant = firstFilled(
    vehicleVariantRaw,
    primaryBank?.vehicleVariant,
    bankVehicle?.variant,
    "",
  );
  const vehicleFuelType = firstFilled(
    vehicleFuelTypeRaw,
    primaryBank?.vehicleFuelType,
    bankVehicle?.fuel,
    bankVehicle?.fuel_type,
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
    deliveryDealerName,
    "",
  );

  const exShowroomPrice = firstFilled(
    exShowroomPriceRaw,
    primaryBank?.exShowroomPrice,
    bankVehicle?.exShowroomPrice,
    bankVehicle?.exShowroom,
    0,
  );
  const insuranceCost = firstFilled(
    insuranceCostRaw,
    primaryBank?.insuranceCost,
    primaryBank?.insurance,
    0,
  );
  const roadTax = firstFilled(
    roadTaxRaw,
    primaryBank?.roadTax,
    primaryBank?.rto,
    0,
  );
  const accessoriesAmount = firstFilled(
    accessoriesAmountRaw,
    primaryBank?.accessoriesAmount,
    primaryBank?.accessories,
    0,
  );
  const dealerDiscount = firstFilled(
    dealerDiscountRaw,
    primaryBank?.dealerDiscount,
    0,
  );
  const manufacturerDiscount = firstFilled(
    manufacturerDiscountRaw,
    primaryBank?.manufacturerDiscount,
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
      form.setFieldsValue({ postfile_regd_city: resolvedCity });
    }
  }, [registrationCity, watchedPostfileRegdCity, city, permanentCity, form]);

  useEffect(() => {
    const patch = {};
    if (!vehicleMakeRaw && vehicleMake) patch.vehicleMake = vehicleMake;
    if (!vehicleModelRaw && vehicleModel) patch.vehicleModel = vehicleModel;
    if (!vehicleVariantRaw && vehicleVariant) patch.vehicleVariant = vehicleVariant;
    if (!vehicleFuelTypeRaw && vehicleFuelType) patch.vehicleFuelType = vehicleFuelType;
    if (Object.keys(patch).length) form.setFieldsValue(patch);
  }, [
    form,
    vehicleMakeRaw,
    vehicleModelRaw,
    vehicleVariantRaw,
    vehicleFuelTypeRaw,
    vehicleMake,
    vehicleModel,
    vehicleVariant,
    vehicleFuelType,
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
                      <Option value={vehicleVariant}>{vehicleVariant}</Option>
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
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Showroom
              </div>
              <button
                type="button"
                onClick={() => setIsShowroomEdit((v) => !v)}
                className="rounded-md border border-border/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/30"
              >
                {isShowroomEdit ? "Done" : "Edit"}
              </button>
            </div>
            {!isShowroomEdit ? (
              <>
                <div className="text-sm font-semibold text-foreground">
                  {showroomDealerName || "Not Selected"}
                </div>
                {firstFilled(
                  form.getFieldValue("showroomDealerContactPerson"),
                  "",
                ) ||
                firstFilled(form.getFieldValue("showroomDealerContactNumber"), "") ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {form.getFieldValue("showroomDealerContactPerson")}
                    {form.getFieldValue("showroomDealerContactPerson") &&
                    form.getFieldValue("showroomDealerContactNumber")
                      ? " • "
                      : ""}
                    {form.getFieldValue("showroomDealerContactNumber")}
                  </div>
                ) : null}
                {form.getFieldValue("showroomDealerAddress") && (
                  <div className="mt-1 text-xs text-muted-foreground/90">
                    {form.getFieldValue("showroomDealerAddress")}
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Form.Item
                  label="Dealer Name"
                  name="showroomDealerName"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="Enter dealer name" />
                </Form.Item>
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
                  <Input.TextArea rows={2} placeholder="Enter dealer address" />
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
