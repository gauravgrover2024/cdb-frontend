import React from "react";
import dayjs from "dayjs";
import {
  AutoComplete,
  Button,
  Checkbox,
  Col,
  Collapse,
  Drawer,
  Empty,
  Input,
  Row,
  Select,
  Tag,
  Typography,
} from "antd";
import {
  CarOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { lenderHypothecationOptions } from "../../../constants/lenderHypothecationOptions";

const { Text } = Typography;

const shellStyle =
  "rounded-[28px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const controlStyle = {
  width: "100%",
  marginTop: 8,
  height: 44,
  borderRadius: 14,
};

const inputControlStyle = {
  ...controlStyle,
  paddingTop: 0,
  paddingBottom: 0,
  lineHeight: "44px",
};

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500";

const fieldWrapClass =
  "[&_.ant-input]:!h-[44px] [&_.ant-input]:!rounded-[14px] [&_.ant-input]:!text-[14px] [&_.ant-input]:!py-0 [&_.ant-input]:!leading-[44px] [&_.ant-select-selector]:!h-[44px] [&_.ant-select-selector]:!rounded-[14px] [&_.ant-select-selector]:!px-[11px] [&_.ant-select-selector]:!py-0 [&_.ant-select-selection-item]:!leading-[42px] [&_.ant-select-selection-placeholder]:!leading-[42px] [&_.ant-select-clear]:!inset-inline-end-[10px] [&_.ant-select-arrow]:!inset-inline-end-[11px] [&_.ant-radio-button-wrapper]:!h-[38px] [&_.ant-radio-button-wrapper]:!leading-[36px]";

const CleanField = ({ label, required, children, extra }) => (
  <div className="pb-1 insurance-field-block" data-ins-field="true">
    <div className={labelClass}>
      {label} {required ? <span className="text-[#FF8EAD]">*</span> : null}
    </div>
    {children}
    {extra ? <div className="mt-1">{extra}</div> : null}
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2">
    <span className="text-[12px] text-slate-500">{label}</span>
    <span className="text-right text-[12px] font-semibold text-slate-800">
      {value || "—"}
    </span>
  </div>
);

const formatDisplayDate = (value) =>
  value ? dayjs(value).format("DD MMM YYYY") : "—";

const getInitial = (name) => (name || "?").toString().slice(0, 2).toUpperCase();

const TYPE_OF_VEHICLE_OPTIONS = [
  { label: "Two Wheeler", value: "Two Wheeler" },
  { label: "Four Wheeler", value: "Four Wheeler" },
  { label: "Commercial", value: "Commercial" },
];

const normalizeVehicleToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeVehicleMakeToken = (value) => {
  const token = normalizeVehicleToken(value);
  if (!token) return "";
  if (token === "marutisuzuki" || token === "marutisuzukiindia") return "maruti";
  if (token === "bmwindia" || token === "bayerischemotorenwerke") return "bmw";
  return token;
};

const FUEL_OPTIONS = [
  { label: "Petrol", value: "Petrol" },
  { label: "Diesel", value: "Diesel" },
  { label: "Petrol + CNG", value: "Petrol + CNG" },
  { label: "CNG", value: "CNG" },
  { label: "EV", value: "EV" },
  { label: "Hybrid", value: "Hybrid" },
  { label: "Other", value: "Other" },
];

const Step2VehicleDetails = ({
  formData,
  setField,
  handleChange,
  showErrors,
  step2Errors,
  isNewCar,
  isExtendedWarranty,
  registrationLookupLoading,
  registrationLookupOptions,
  handleRegistrationSearch,
  applyVehicleToForm,
  includeDiscontinuedVehicles,
  setIncludeDiscontinuedVehicles,
  makeOptions,
  modelOptions,
  variantOptions,
  isGeneratingTempReg,
  vehiclePotentialMatch,
  vehiclePotentialMatches,
  vehicleMatchLoading,
  vehicleMergeLoading,
  onMergeVehicleMatch,
  customerVehicleRows,
  customerVehicleLoading,
  onRefreshVehicleDerivedFields,
  onHydrateVehicleSelectionOptions,
}) => {
  const registrationPreview = formData.registrationNumber || "Pending";

  const vehicleTitle =
    [formData.vehicleMake, formData.vehicleModel].filter(Boolean).join(" ") ||
    "Vehicle details";

  const vehicleVariant = formData.vehicleVariant || "Variant pending";
  const vehicleInitial = getInitial(formData.vehicleMake || "VH");

  const regDisabled =
    isNewCar && String(formData.registrationAllotted) === "No";
  const shouldShowEwExtra = Boolean(isExtendedWarranty);
  const filteredCustomerVehicleRows = Array.isArray(customerVehicleRows)
    ? customerVehicleRows.filter((row) => {
        const mk = normalizeVehicleMakeToken(row?.make || row?.vehicleMake);
        const md = normalizeVehicleToken(row?.model || row?.vehicleModel);
        const vr = normalizeVehicleToken(row?.variant || row?.vehicleVariant);
        const selectedMake = normalizeVehicleMakeToken(formData.vehicleMake);
        const selectedModel = normalizeVehicleToken(formData.vehicleModel);
        const selectedVariant = normalizeVehicleToken(formData.vehicleVariant);

        if (
          selectedMake &&
          !(mk.includes(selectedMake) || selectedMake.includes(mk))
        ) {
          return false;
        }
        if (
          selectedModel &&
          !(md.includes(selectedModel) || selectedModel.includes(md))
        ) {
          return false;
        }
        if (
          selectedVariant &&
          !(vr.includes(selectedVariant) || selectedVariant.includes(vr))
        )
          return false;
        return true;
      })
    : [];
  const [showAllCustomerVehicles, setShowAllCustomerVehicles] =
    React.useState(false);
  const [isVehicleListDrawerOpen, setIsVehicleListDrawerOpen] =
    React.useState(false);
  const visibleCustomerVehicleRows = showAllCustomerVehicles
    ? filteredCustomerVehicleRows
    : filteredCustomerVehicleRows.slice(0, 4);
  React.useEffect(() => {
    setShowAllCustomerVehicles(false);
  }, [formData.vehicleMake, formData.vehicleModel, formData.vehicleVariant]);

  const hypothecationOptions = [
    { label: "Not applicable", value: "Not applicable" },
    ...lenderHypothecationOptions.map((option) => ({
      label: option.value,
      value: option.value,
    })),
  ];

  const handleUseCustomerVehicle = React.useCallback(
    async (row) => {
      const rawMake = row?.make || row?.vehicleMake;
      const rawModel = row?.model || row?.vehicleModel;
      const rawVariant = row?.variant || row?.vehicleVariant;
      const resolved = await onHydrateVehicleSelectionOptions?.({
        make: rawMake,
        model: rawModel,
        variant: rawVariant,
      });
      const nextMake = resolved?.make || rawMake;
      const nextModel = resolved?.model || rawModel;
      const nextVariant = resolved?.variant || rawVariant;
      applyVehicleToForm({
        ...row,
        make: nextMake,
        model: nextModel,
        variant: nextVariant,
        vehicleMake: nextMake,
        vehicleModel: nextModel,
        vehicleVariant: nextVariant,
      });
      setField("registrationAllotted", "Yes");
      onRefreshVehicleDerivedFields?.({
        make: nextMake,
        model: nextModel,
        variant: nextVariant,
        registrationNumber: row?.registrationNumber || row?.regNo,
        seedRow: row,
        preserveExistingOnMiss: false,
      });
    },
    [
      applyVehicleToForm,
      onHydrateVehicleSelectionOptions,
      onRefreshVehicleDerivedFields,
      setField,
    ],
  );

  const collapseItems = [
    {
      key: "1",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DAF3FF] text-slate-700 ring-1 ring-[#9FC0FF]">
            <SearchOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              Registration & vehicle mapping
            </div>
            <div className="text-xs text-slate-500">
              Search by registration or auto-assign temp registration for new
              cars
            </div>
          </div>
        </div>
      ),
      children: (
        <div className="pt-3">
          <Row gutter={[22, 20]}>
            {isNewCar ? (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Registration Allotted?" required>
                    <Select allowClear
                      value={formData.registrationAllotted || "Yes"}
                      onChange={(nextValue) => {
                        const resolved = nextValue || "Yes";
                        setField("registrationAllotted", resolved);
                        if (
                          resolved === "Yes" &&
                          String(formData.registrationNumber || "")
                            .trim()
                            .toUpperCase()
                            .startsWith("TEMP_REDG_")
                        ) {
                          setField("registrationNumber", "");
                        }
                      }}
                      style={controlStyle}
                      options={[
                        { label: "Yes", value: "Yes" },
                        { label: "No", value: "No" },
                      ]}
                    />
                  </CleanField>
                </div>
              </Col>
            ) : null}

            <Col xs={24} md={isNewCar ? 16 : 24}>
              <div className={fieldWrapClass}>
                <CleanField
                  label="Registration Number"
                  required
                >
                  {regDisabled ? (
                    <Input allowClear
                      value={formData.registrationNumber}
                      readOnly
                      style={inputControlStyle}
                      status={
                        showErrors && step2Errors.registrationNumber
                          ? "error"
                          : ""
                      }
                      placeholder="TEMP_REDG_0001"
                    />
                  ) : (
                    <AutoComplete
                      value={formData.registrationNumber}
                      options={registrationLookupOptions}
                      onSearch={handleRegistrationSearch}
                      onChange={(value) =>
                        setField(
                          "registrationNumber",
                          String(value || "").toUpperCase(),
                        )
                      }
                      onSelect={async (value, option) => {
                        const normalized = String(value || "").toUpperCase();
                        setField("registrationNumber", normalized);
                        if (option?.vehicleData) {
                          const nextMake =
                            option?.vehicleData?.make ||
                            option?.vehicleData?.vehicleMake;
                          const nextModel =
                            option?.vehicleData?.model ||
                            option?.vehicleData?.vehicleModel;
                          const nextVariant =
                            option?.vehicleData?.variant ||
                            option?.vehicleData?.vehicleVariant;
                          const resolved =
                            (await onHydrateVehicleSelectionOptions?.({
                              make: nextMake,
                              model: nextModel,
                              variant: nextVariant,
                            })) || {};
                          const resolvedMake = resolved?.make || nextMake;
                          const resolvedModel = resolved?.model || nextModel;
                          const resolvedVariant =
                            resolved?.variant || nextVariant;
                          applyVehicleToForm({
                            ...option.vehicleData,
                            make: resolvedMake,
                            model: resolvedModel,
                            variant: resolvedVariant,
                            vehicleMake: resolvedMake,
                            vehicleModel: resolvedModel,
                            vehicleVariant: resolvedVariant,
                          });
                          onRefreshVehicleDerivedFields?.({
                            make: resolvedMake,
                            model: resolvedModel,
                            variant: resolvedVariant,
                            registrationNumber:
                              option?.vehicleData?.registrationNumber ||
                              normalized,
                            seedRow: option?.vehicleData,
                            preserveExistingOnMiss: false,
                          });
                        }
                      }}
                      style={{ marginTop: 8, width: "100%" }}
                      notFoundContent={
                        registrationLookupLoading
                          ? "Searching..."
                          : "No matching registration"
                      }
                    >
                      <Input allowClear
                        style={inputControlStyle}
                        status={
                          showErrors && step2Errors.registrationNumber
                            ? "error"
                            : ""
                        }
                        placeholder="e.g. DL01AB1234"
                      />
                    </AutoComplete>
                  )}
                </CleanField>
              </div>
              {showErrors && step2Errors.registrationNumber ? (
                <Text type="danger">{step2Errors.registrationNumber}</Text>
              ) : null}
            </Col>

            {shouldShowEwExtra ? (
              <>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Reg Authority">
                      <Input allowClear
                        value={formData.regAuthority}
                        onChange={handleChange("regAuthority")}
                        style={inputControlStyle}
                        placeholder="e.g. DL-01"
                      />
                    </CleanField>
                  </div>
                </Col>
              </>
            ) : null}
          </Row>
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFE6C6] text-slate-700 ring-1 ring-[#FFE6C6]">
            <CarOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              Vehicle profile
            </div>
            <div className="text-xs text-slate-500">
              Make, model, variant mapping with fuel and cubic capacity autofill
            </div>
          </div>
        </div>
      ),
      children: (
        <div className="pt-3">
          <Row gutter={[22, 20]}>
            <Col xs={24}>
              <Checkbox
                checked={Boolean(includeDiscontinuedVehicles)}
                onChange={(e) =>
                  setIncludeDiscontinuedVehicles(Boolean(e?.target?.checked))
                }
                style={{ marginBottom: 4 }}
              >
                Include discontinued
              </Checkbox>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Vehicle Make" required>
                  <Select
                    value={formData.vehicleMake || undefined}
                    placeholder="Select make"
                    allowClear
                    onChange={(val) => {
                      setField("vehicleMake", val || "");
                      setField("vehicleModel", "");
                      setField("vehicleVariant", "");
                      setField("fuelType", "");
                      setField("cubicCapacity", "");
                    }}
                    style={controlStyle}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.children || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    status={
                      showErrors && step2Errors.vehicleMake ? "error" : ""
                    }
                  >
                    {makeOptions.map((make) => (
                      <Select.Option key={make} value={make}>
                        {make}
                      </Select.Option>
                    ))}
                  </Select>
                </CleanField>
              </div>
              {showErrors && step2Errors.vehicleMake ? (
                <Text type="danger">{step2Errors.vehicleMake}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Vehicle Model" required>
                  <Select
                    value={formData.vehicleModel || undefined}
                    placeholder="Select model"
                    allowClear
                    onChange={(val) => {
                      setField("vehicleModel", val || "");
                      setField("vehicleVariant", "");
                      setField("fuelType", "");
                      setField("cubicCapacity", "");
                    }}
                    disabled={!formData.vehicleMake}
                    style={controlStyle}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.children || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    status={
                      showErrors && step2Errors.vehicleModel ? "error" : ""
                    }
                  >
                    {modelOptions.map((model) => (
                      <Select.Option key={model} value={model}>
                        {model}
                      </Select.Option>
                    ))}
                  </Select>
                </CleanField>
              </div>
              {showErrors && step2Errors.vehicleModel ? (
                <Text type="danger">{step2Errors.vehicleModel}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Vehicle Variant" required>
                  <Select
                    value={formData.vehicleVariant || undefined}
                    placeholder="Select variant"
                    allowClear
                    onChange={(val) => {
                      setField("vehicleVariant", val || "");
                      setField("fuelType", "");
                      setField("cubicCapacity", "");
                      if (val) {
                        onRefreshVehicleDerivedFields?.({
                          make: formData.vehicleMake,
                          model: formData.vehicleModel,
                          variant: val,
                          registrationNumber: formData.registrationNumber,
                          preserveExistingOnMiss: false,
                        });
                      }
                    }}
                    disabled={!formData.vehicleMake || !formData.vehicleModel}
                    style={controlStyle}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.children || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    status={
                      showErrors && step2Errors.vehicleVariant ? "error" : ""
                    }
                  >
                    {variantOptions.map((variant) => (
                      <Select.Option key={variant} value={variant}>
                        {variant}
                      </Select.Option>
                    ))}
                  </Select>
                </CleanField>
              </div>
              {showErrors && step2Errors.vehicleVariant ? (
                <Text type="danger">{step2Errors.vehicleVariant}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Fuel Type">
                  <Select allowClear
                    value={formData.fuelType || undefined}
                    onChange={(v) => setField("fuelType", v || "")}
                    style={controlStyle}
                    placeholder="Fuel type"
                    options={FUEL_OPTIONS}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Cubic Capacity (cc)">
                  <Input allowClear
                    value={formData.cubicCapacity}
                    onChange={handleChange("cubicCapacity")}
                    style={inputControlStyle}
                    placeholder="Auto-filled"
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Type of Vehicle">
                  <Select allowClear
                    value={formData.typesOfVehicle || "Four Wheeler"}
                    onChange={(v) =>
                      setField("typesOfVehicle", v || "Four Wheeler")
                    }
                    style={controlStyle}
                    options={TYPE_OF_VEHICLE_OPTIONS}
                  />
                </CleanField>
              </div>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: "3",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DAF3FF] text-slate-700 ring-1 ring-[#9FC0FF]">
            <SafetyCertificateOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              Identity & registration
            </div>
            <div className="text-xs text-slate-500">
              Engine, chassis, manufacture and hypothecation details
            </div>
          </div>
        </div>
      ),
      children: (
        <div className="pt-3">
          <Row gutter={[22, 20]}>
            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Engine Number" required>
                  <Input allowClear
                    value={formData.engineNumber}
                    onChange={handleChange("engineNumber")}
                    style={inputControlStyle}
                    status={
                      showErrors && step2Errors.engineNumber ? "error" : ""
                    }
                    placeholder="Engine #"
                  />
                </CleanField>
              </div>
              {showErrors && step2Errors.engineNumber ? (
                <Text type="danger">{step2Errors.engineNumber}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Chassis Number" required>
                  <Input allowClear
                    value={formData.chassisNumber}
                    onChange={handleChange("chassisNumber")}
                    style={inputControlStyle}
                    status={
                      showErrors && step2Errors.chassisNumber ? "error" : ""
                    }
                    placeholder="Chassis #"
                  />
                </CleanField>
              </div>
              {showErrors && step2Errors.chassisNumber ? (
                <Text type="danger">{step2Errors.chassisNumber}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Manufacture Month" required>
                  <Input allowClear
                    value={formData.manufactureMonth}
                    onChange={handleChange("manufactureMonth")}
                    style={inputControlStyle}
                    status={
                      showErrors && step2Errors.manufactureMonth ? "error" : ""
                    }
                    placeholder="e.g. 07"
                  />
                </CleanField>
              </div>
              {showErrors && step2Errors.manufactureMonth ? (
                <Text type="danger">{step2Errors.manufactureMonth}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Manufacture Year" required>
                  <Input allowClear
                    value={formData.manufactureYear}
                    onChange={handleChange("manufactureYear")}
                    style={inputControlStyle}
                    status={
                      showErrors && step2Errors.manufactureYear ? "error" : ""
                    }
                    placeholder="e.g. 2026"
                  />
                </CleanField>
              </div>
              {showErrors && step2Errors.manufactureYear ? (
                <Text type="danger">{step2Errors.manufactureYear}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Date of Reg">
                  <Input allowClear
                    type="date"
                    value={formData.dateOfReg}
                    onChange={handleChange("dateOfReg")}
                    style={inputControlStyle}
                  />
                </CleanField>
              </div>
            </Col>

            {shouldShowEwExtra ? (
              <Col xs={24} md={16}>
                <div className={fieldWrapClass}>
                  <CleanField label="Hypothecation">
                    <Select allowClear
                      value={formData.hypothecation || "Not applicable"}
                      onChange={(v) =>
                        setField("hypothecation", v || "Not applicable")
                      }
                      style={controlStyle}
                      options={hypothecationOptions}
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.label || "")
                          .toLowerCase()
                          .includes(String(input || "").toLowerCase())
                      }
                    />
                  </CleanField>
                </div>
              </Col>
            ) : null}

            {shouldShowEwExtra ? (
              <>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Battery Number">
                      <Input allowClear
                        value={formData.batteryNumber}
                        onChange={handleChange("batteryNumber")}
                        style={inputControlStyle}
                        placeholder="Battery number"
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Charger Number">
                      <Input allowClear
                        value={formData.chargerNumber}
                        onChange={handleChange("chargerNumber")}
                        style={inputControlStyle}
                        placeholder="Charger number"
                      />
                    </CleanField>
                  </div>
                </Col>
              </>
            ) : null}
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[30px] bg-gradient-to-r from-[#DAF3FF] via-white to-[#FFE6C6] p-5 ring-1 ring-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.06)] md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className={sectionHeaderLabel}>Vehicle information</div>
            <div className="mt-1 text-[24px] font-black tracking-tight text-slate-800">
              Vehicle details
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Registration-first capture with make/model autofill and
              policy-safe identity fields
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              color="default"
            >
              Reg No: {registrationPreview}
            </Tag>
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#DAF3FF",
                borderColor: "#9FC0FF",
                color: "#1f2937",
              }}
            >
              {formData.fuelType || "Fuel pending"}
            </Tag>
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#FFE6C6",
                borderColor: "#FFE6C6",
                color: "#1f2937",
              }}
            >
              {formData.typesOfVehicle || "Four Wheeler"}
            </Tag>
          </div>
        </div>
      </div>

      <Row gutter={[20, 20]} align="stretch">
        <Col xs={24} xl={8} className="xl:self-stretch">
          <div className="flex flex-col gap-4 xl:sticky xl:top-[150px]">
            <div className="relative overflow-hidden rounded-[28px] bg-white ring-1 ring-[#9FC0FF] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9FC0FF]/70 text-xs font-black text-slate-800 ring-1 ring-[#9FC0FF]">
                      {vehicleInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-bold leading-tight text-slate-800">
                        {vehicleTitle}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">
                          {vehicleVariant}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Policy Type
                    </p>
                    <p className="m-0 max-w-[120px] truncate text-sm font-black text-slate-800">
                      {isExtendedWarranty ? "EW Policy" : "Insurance"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mx-5 border-t border-slate-100" />

              <div className="px-5 pt-5 pb-3">
                <p className="m-0 mb-3 text-sm font-black text-slate-800">
                  Vehicle Snapshot
                </p>

                <SummaryRow
                  label="Registration Number"
                  value={formData.registrationNumber}
                />
                <SummaryRow
                  label="Reg Allotted"
                  value={formData.registrationAllotted || "Yes"}
                />
                <SummaryRow label="Make" value={formData.vehicleMake} />
                <SummaryRow label="Model" value={formData.vehicleModel} />
                <SummaryRow label="Variant" value={formData.vehicleVariant} />
                <SummaryRow label="Fuel" value={formData.fuelType} />
                <SummaryRow
                  label="Cubic Capacity"
                  value={formData.cubicCapacity}
                />
                <SummaryRow
                  label="Engine Number"
                  value={formData.engineNumber}
                />
                <SummaryRow
                  label="Chassis Number"
                  value={formData.chassisNumber}
                />
                <SummaryRow label="Type" value={formData.typesOfVehicle} />
                <SummaryRow
                  label="Manufacture"
                  value={
                    formData.manufactureMonth && formData.manufactureYear
                      ? `${formData.manufactureMonth}/${formData.manufactureYear}`
                      : "—"
                  }
                />
                <SummaryRow
                  label="Date of Reg"
                  value={formatDisplayDate(formData.dateOfReg)}
                />
                {shouldShowEwExtra ? (
                  <SummaryRow
                    label="Hypothecation"
                    value={formData.hypothecation || "Not applicable"}
                  />
                ) : null}

                {shouldShowEwExtra ? (
                  <>
                    <SummaryRow
                      label="Reg Authority"
                      value={formData.regAuthority}
                    />
                    <SummaryRow
                      label="Battery Number"
                      value={formData.batteryNumber}
                    />
                    <SummaryRow
                      label="Charger Number"
                      value={formData.chargerNumber}
                    />
                  </>
                ) : null}
              </div>
            </div>

            {!isNewCar &&
            (customerVehicleLoading || filteredCustomerVehicleRows.length > 0) ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Customer Vehicles
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {filteredCustomerVehicleRows.length > 0 ? (
                      <Tag className="!m-0 !rounded-full" color="default">
                        {filteredCustomerVehicleRows.length} match
                        {filteredCustomerVehicleRows.length > 1 ? "es" : ""}
                      </Tag>
                    ) : null}
                    {filteredCustomerVehicleRows.length > 0 ? (
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600 transition hover:border-slate-300"
                        onClick={() => setIsVehicleListDrawerOpen(true)}
                      >
                        See list of all cars
                      </button>
                    ) : null}
                    {filteredCustomerVehicleRows.length > 4 ? (
                      <button
                        type="button"
                        className="rounded-full border border-[#9FC0FF] bg-[#DAF3FF] px-2 py-0.5 font-semibold text-slate-700 transition hover:border-[#BFD8CD]"
                        onClick={() =>
                          setShowAllCustomerVehicles((prev) => !prev)
                        }
                      >
                        {showAllCustomerVehicles ? "Show less" : "View more"}
                      </button>
                    ) : null}
                  </div>
                </div>
                {customerVehicleLoading ? (
                  <p className="m-0 text-xs text-slate-500">
                    Loading vehicles linked to this customer...
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {visibleCustomerVehicleRows.map((row) => (
                      <button
                        key={String(row?._id || row?.registrationNumber || "")}
                        type="button"
                        onClick={() => handleUseCustomerVehicle(row)}
                        className="group w-full rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="m-0 text-xs font-semibold text-slate-800">
                              {row?.registrationNumber || "—"}
                            </p>
                            <p className="m-0 text-[11px] text-slate-500">
                              {[row?.make, row?.model, row?.variant]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                            <p className="m-0 text-[10px] text-slate-400">
                              {[row?.customerName, row?.primaryMobile]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-700 opacity-80 transition group-hover:opacity-100">
                            Use this
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {(vehicleMatchLoading ||
              vehiclePotentialMatch ||
              (Array.isArray(vehiclePotentialMatches) &&
                vehiclePotentialMatches.length > 0)) && (
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                    Potential Vehicle Match
                  </p>
                  {vehiclePotentialMatch ? (
                    <Tag className="!m-0 !rounded-full" color="gold">
                      Score {vehiclePotentialMatch.score || 0}
                    </Tag>
                  ) : null}
                </div>

                {vehicleMatchLoading ? (
                  <p className="m-0 text-xs text-slate-500">
                    Scanning vehicle_master_records...
                  </p>
                ) : vehiclePotentialMatch ? (
                  <>
                    <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="m-0 text-sm font-bold text-slate-800">
                            {vehiclePotentialMatch.registrationNumber || "—"}
                          </p>
                          <p className="m-0 text-xs text-slate-500">
                            {[
                              vehiclePotentialMatch.make,
                              vehiclePotentialMatch.model,
                              vehiclePotentialMatch.variant,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                          <p className="m-0 text-[11px] text-slate-400">
                            {vehiclePotentialMatch.customerName ||
                              "Customer unavailable"}
                            {vehiclePotentialMatch.primaryMobile
                              ? ` · ${vehiclePotentialMatch.primaryMobile}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          type="primary"
                          size="small"
                          loading={vehicleMergeLoading}
                          onClick={() => onMergeVehicleMatch?.(vehiclePotentialMatch)}
                        >
                          Merge
                        </Button>
                      </div>
                    </div>

                    {Array.isArray(vehiclePotentialMatches) &&
                    vehiclePotentialMatches.length > 1 ? (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {vehiclePotentialMatches.slice(1, 3).map((row) => (
                          <button
                            type="button"
                            key={String(
                              row?._id || row?.registrationNumber || "",
                            )}
                            onClick={() => onMergeVehicleMatch?.(row)}
                            className="w-full rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-left transition hover:border-amber-300"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="m-0 text-xs font-semibold text-slate-700">
                                  {row?.registrationNumber || "—"}
                                </p>
                                <p className="m-0 text-[11px] text-slate-500">
                                  {[row?.make, row?.model, row?.variant]
                                    .filter(Boolean)
                                    .join(" ")}
                                </p>
                              </div>
                              <span className="text-[10px] text-amber-700">
                                Merge this
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="m-0 text-xs text-slate-500">
                    No historical match found yet.
                  </p>
                )}
              </div>
            )}

          </div>
        </Col>

        <Col xs={24} xl={16}>
          <div className={`${shellStyle} p-2 md:p-3`}>
            <Collapse
              ghost
              defaultActiveKey={["1", "2", "3"]}
              expandIconPosition="end"
              items={collapseItems}
            />
          </div>
        </Col>
      </Row>
      <Drawer
        title="Customer vehicles"
        placement="right"
        width={520}
        open={isVehicleListDrawerOpen}
        onClose={() => setIsVehicleListDrawerOpen(false)}
      >
        {filteredCustomerVehicleRows.length ? (
          <div className="flex flex-col gap-2">
            {filteredCustomerVehicleRows.map((row) => (
              <button
                key={`drawer-${String(row?._id || row?.registrationNumber || "")}`}
                type="button"
                onClick={() => {
                  handleUseCustomerVehicle(row);
                  setIsVehicleListDrawerOpen(false);
                }}
                className="group w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="m-0 text-xs font-semibold text-slate-800">
                      {row?.registrationNumber || "—"}
                    </p>
                    <p className="m-0 text-[11px] text-slate-500">
                      {[row?.make, row?.model, row?.variant]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    <p className="m-0 text-[10px] text-slate-400">
                      {[row?.customerName, row?.primaryMobile]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 opacity-80 group-hover:opacity-100">
                    Use this
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty
            description="No customer vehicles available for current make/model filters."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Drawer>
    </div>
  );
};

export default Step2VehicleDetails;
