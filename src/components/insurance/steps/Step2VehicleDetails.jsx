import React from "react";
import dayjs from "dayjs";
import {
  Alert,
  AutoComplete,
  Button,
  Checkbox,
  Col,
  Collapse,
  Input,
  Radio,
  Row,
  Select,
  Tag,
  Typography,
} from "antd";
import {
  CarOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from "@ant-design/icons";

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

const microHintClass = "mt-1 text-[11px] text-slate-400";

const fieldWrapClass =
  "[&_.ant-input]:!h-[44px] [&_.ant-input]:!rounded-[14px] [&_.ant-input]:!text-[14px] [&_.ant-input]:!py-0 [&_.ant-input]:!leading-[44px] [&_.ant-select-selector]:!h-[44px] [&_.ant-select-selector]:!rounded-[14px] [&_.ant-select-selector]:!px-[11px] [&_.ant-select-selector]:!py-0 [&_.ant-select-selection-item]:!leading-[42px] [&_.ant-select-selection-placeholder]:!leading-[42px] [&_.ant-select-clear]:!inset-inline-end-[10px] [&_.ant-select-arrow]:!inset-inline-end-[11px] [&_.ant-radio-button-wrapper]:!h-[38px] [&_.ant-radio-button-wrapper]:!leading-[36px]";

const CleanField = ({ label, required, hint, children, extra }) => (
  <div className="pb-1">
    <div className={labelClass}>
      {label} {required ? <span className="text-[#D8B8B4]">*</span> : null}
    </div>
    {children}
    {hint ? <div className={microHintClass}>{hint}</div> : null}
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
  bankOptions,
  isGeneratingTempReg,
  vehiclePotentialMatch,
  vehiclePotentialMatches,
  vehicleMatchLoading,
  vehicleMergeLoading,
  onMergeVehicleMatch,
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

  const hypothecationOptions = [
    { label: "Not applicable", value: "Not applicable" },
    ...(Array.isArray(bankOptions)
      ? bankOptions
          .map((name) => String(name || "").trim())
          .filter(Boolean)
          .filter((name, index, arr) => arr.indexOf(name) === index)
          .map((name) => ({ label: name, value: name }))
      : []),
  ];

  const collapseItems = [
    {
      key: "1",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF3EF] text-slate-700 ring-1 ring-[#D6E6DF]">
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
                    <Radio.Group
                      value={formData.registrationAllotted || "Yes"}
                      onChange={(e) => {
                        const nextValue = e?.target?.value || "Yes";
                        setField("registrationAllotted", nextValue);
                        if (nextValue === "Yes") {
                          if (
                            String(formData.registrationNumber || "")
                              .trim()
                              .toUpperCase()
                              .startsWith("TEMP_REDG_")
                          ) {
                            setField("registrationNumber", "");
                          }
                        }
                      }}
                      optionType="button"
                      buttonStyle="solid"
                      style={{ marginTop: 8 }}
                    >
                      <Radio.Button value="Yes">Yes</Radio.Button>
                      <Radio.Button value="No">No</Radio.Button>
                    </Radio.Group>
                  </CleanField>
                </div>
              </Col>
            ) : null}

            <Col xs={24} md={isNewCar ? 16 : 24}>
              <div className={fieldWrapClass}>
                <CleanField
                  label="Registration Number"
                  required
                  hint={
                    regDisabled
                      ? isGeneratingTempReg
                        ? "Generating temporary registration..."
                        : "Temporary registration assigned automatically"
                      : registrationLookupLoading
                        ? "Searching vehicle records..."
                        : "Searches vehicle_master_records"
                  }
                >
                  {regDisabled ? (
                    <Input
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
                      onSelect={(value, option) => {
                        const normalized = String(value || "").toUpperCase();
                        setField("registrationNumber", normalized);
                        if (option?.vehicleData) {
                          applyVehicleToForm(option.vehicleData);
                        }
                      }}
                      style={{ marginTop: 8, width: "100%" }}
                      notFoundContent={
                        registrationLookupLoading
                          ? "Searching..."
                          : "No matching registration"
                      }
                    >
                      <Input
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
                      <Input
                        value={formData.regAuthority}
                        onChange={handleChange("regAuthority")}
                        style={inputControlStyle}
                        placeholder="e.g. DL-01"
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Date of Reg">
                      <Input
                        type="date"
                        value={formData.dateOfReg}
                        onChange={handleChange("dateOfReg")}
                        style={inputControlStyle}
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
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF8F1] text-slate-700 ring-1 ring-[#FAF8F1]">
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
                    onChange={(val) => setField("vehicleVariant", val || "")}
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
                <CleanField
                  label="Fuel Type"
                  hint="Auto-filled from selected make/model/variant"
                >
                  <Select
                    value={formData.fuelType || undefined}
                    onChange={(v) => setField("fuelType", v || "")}
                    style={controlStyle}
                    placeholder="Fuel type"
                    options={FUEL_OPTIONS}
                    allowClear
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField
                  label="Cubic Capacity (cc)"
                  hint="Fetched from Engine & Transmission | Displacement"
                >
                  <Input
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
                  <Select
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
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF3EF] text-slate-700 ring-1 ring-[#D6E6DF]">
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
                  <Input
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
                  <Input
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
                  <Input
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
                  <Input
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

            <Col xs={24} md={16}>
              <div className={fieldWrapClass}>
                <CleanField label="Hypothecation">
                  <Select
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

            {shouldShowEwExtra ? (
              <>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Battery Number">
                      <Input
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
                      <Input
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
      <div className="rounded-[30px] bg-gradient-to-r from-[#EEF3EF] via-white to-[#FAF8F1] p-5 ring-1 ring-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.06)] md:p-6">
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
                background: "#EEF3EF",
                borderColor: "#D6E6DF",
                color: "#1f2937",
              }}
            >
              {formData.fuelType || "Fuel pending"}
            </Tag>
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#FAF8F1",
                borderColor: "#FAF8F1",
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
            <div className="relative overflow-hidden rounded-[28px] bg-white ring-1 ring-[#D6E6DF] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6E6DF]/70 text-xs font-black text-slate-800 ring-1 ring-[#D6E6DF]">
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
                  label="Hypothecation"
                  value={formData.hypothecation || "Not applicable"}
                />

                {shouldShowEwExtra ? (
                  <>
                    <SummaryRow
                      label="Reg Authority"
                      value={formData.regAuthority}
                    />
                    <SummaryRow
                      label="Date of Reg"
                      value={formatDisplayDate(formData.dateOfReg)}
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

            <div className={`${shellStyle} p-4`}>
              <Alert
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                message="Vehicle details must match registration/records and are used for quote + policy issuance."
              />
            </div>
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
    </div>
  );
};

export default Step2VehicleDetails;
