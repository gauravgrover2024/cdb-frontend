import React from "react";
import { Form, Select, Row, Col, Segmented, Spin, Checkbox, AutoComplete } from "antd";
import Icon from "../../../../../components/AppIcon";
import { useVehicleData } from "../../../../../hooks/useVehicleData";
import { usedCarsDbApi } from "../../../../../api/usedCars";

const VehicleDetailsForm = () => {
  const form = Form.useFormInstance();
  const typeOfLoan = Form.useWatch("typeOfLoan", form) || form?.getFieldValue("typeOfLoan") || "New Car";

  const [usedCarDbSearchValue, setUsedCarDbSearchValue] = React.useState("");
  const [usedCarDbOptions, setUsedCarDbOptions] = React.useState([]);
  const [usedCarDbLoading, setUsedCarDbLoading] = React.useState(false);
  const usedCarDbSearchDebounceRef = React.useRef(null);

  const onUsedCarDbSearch = React.useCallback((q) => {
    setUsedCarDbSearchValue(q);
    const query = String(q || "").trim();

    if (usedCarDbSearchDebounceRef.current) {
      clearTimeout(usedCarDbSearchDebounceRef.current);
    }

    if (!query || query.length < 2) {
      setUsedCarDbOptions([]);
      return;
    }

    usedCarDbSearchDebounceRef.current = setTimeout(async () => {
      setUsedCarDbLoading(true);
      try {
        const res = await usedCarsDbApi.getUsedCars({ q: query, limit: 20 });
        if (res?.success && Array.isArray(res.data)) {
          const options = res.data.map((car) => ({
            value: `${car.make} ${car.model} ${car.variant} (${car.year})`,
            label: (
              <div>
                <div style={{ fontWeight: 600 }}>
                  {car.make} {car.model} {car.variant}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Year: {car.year} | Fuel: {car.fuel_type || "N/A"} | CC: {car.cc || "N/A"}
                </div>
              </div>
            ),
            carData: car,
          }));
          setUsedCarDbOptions(options);
        } else {
          setUsedCarDbOptions([]);
        }
      } catch (err) {
        console.error("Error searching used cars db:", err);
        setUsedCarDbOptions([]);
      } finally {
        setUsedCarDbLoading(false);
      }
    }, 280);
  }, []);

  const handleSelectUsedCar = React.useCallback((car) => {
    if (!car) return;
    form.setFieldsValue({
      vehicleMake: car.make || "",
      vehicleModel: car.model || "",
      vehicleVariant: car.variant || "",
      vehicleFuelType: car.fuel_type || "Petrol",
      boughtInYear: car.year ? String(car.year) : "",
      valuation: car.ex_showroom_price || undefined,
    });
    setUsedCarDbSearchValue(`${car.make} ${car.model} ${car.variant} (${car.year})`);
  }, [form]);

  React.useEffect(() => {
    const make = form?.getFieldValue("vehicleMake");
    const model = form?.getFieldValue("vehicleModel");
    const variant = form?.getFieldValue("vehicleVariant");
    const year = form?.getFieldValue("boughtInYear") || form?.getFieldValue("manufacturingYear");
    if (make && model && variant) {
      setUsedCarDbSearchValue(`${make} ${model} ${variant}${year ? ` (${year})` : ""}`);
    }
  }, [form]);

  // Use centralized vehicle data hook
  const {
    makes,
    models,
    variants,
    loading,
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

  const vehicleMake = form?.getFieldValue("vehicleMake");
  const vehicleModel = form?.getFieldValue("vehicleModel");

  // IMPORTANT: do not auto-force isFinanced here.
  // Value must come from existing loan data / user choice / migration payload.

  const cleanModelLabel = (model) => {
    if (!model) return "";
    let v = String(model);

    // Remove make prefix if present
    if (vehicleMake) {
      v = v.replace(new RegExp(`^${vehicleMake}\\s+`, "i"), "");
    }

    return v.replace(/\s+/g, " ").trim();
  };

  const cleanVariantLabel = (variant) => {
    if (!variant) return "";
    let v = String(variant);

    // Remove make prefix if present
    if (vehicleMake) {
      v = v.replace(new RegExp(`^${vehicleMake}\\s+`, "i"), "");
    }

    // Remove model prefix if present (even if it still includes make)
    if (vehicleModel) {
      v = v.replace(new RegExp(`^${vehicleModel}\\s+`, "i"), "");
    }

    return v.replace(/\s+/g, " ").trim();
  };

  const normalize = (v) => String(v || "").trim().toLowerCase();
  const hasValue = (list, value) =>
    Array.isArray(list) && list.some((item) => normalize(item) === normalize(value));

  return (
    <div id="section-vehicle-details" className="form-section">
      {/* SECTION HEADER */}
      <div className="section-header mb-6">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="Car" size={20} />
          </div>
          <span className="text-lg font-medium text-foreground">
            Vehicle Details
          </span>
          {loading && <Spin size="small" />}
        </div>
      </div>

      {/* TYPE OF LOAN SELECTION */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm mb-6">
        <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <Icon name="Banknote" size={12} className="text-primary" />
          Loan Type Configuration
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Type of Loan"
              name="typeOfLoan"
              rules={[{ required: true, message: "Select type of loan" }]}
              className="mb-0"
            >
              <Select placeholder="Select type of loan" className="h-10 rounded-xl">
                <Select.Option value="New Car">New Car</Select.Option>
                <Select.Option value="Used Car">Used Car</Select.Option>
                <Select.Option value="Car Cash-in">Car Cash-in</Select.Option>
                <Select.Option value="Refinance">Refinance</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* VEHICLE SELECTION */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm mb-6">
        <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <Icon name="Search" size={12} className="text-primary" />
          Asset Configuration
        </div>
        <Row gutter={[16, 16]}>
          {typeOfLoan !== "New Car" && (
            <Col xs={24}>
              <Form.Item label="Select Used Car (Master DB)" className="mb-2">
                <AutoComplete
                  value={usedCarDbSearchValue}
                  options={usedCarDbOptions}
                  onSearch={onUsedCarDbSearch}
                  allowClear
                  className="h-10 rounded-xl"
                  placeholder="Search Used Car (e.g. Maruti Swift)"
                  onSelect={(value, option) => {
                    handleSelectUsedCar(option.carData);
                  }}
                  onChange={(value) => {
                    setUsedCarDbSearchValue(value);
                    if (!value) {
                      setUsedCarDbOptions([]);
                    }
                  }}
                  notFoundContent={
                    usedCarDbLoading ? (
                      <div className="p-4 text-center"><Spin size="small" /></div>
                    ) : (
                      "No matching used cars"
                    )
                  }
                />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} md={8}>
            <Form.Item label="Make" name="vehicleMake" className="mb-0">
              <Select
                placeholder="Select make"
                allowClear
                className="h-10 rounded-xl"
                showSearch
                loading={loading}
                onChange={handleMakeChange}
                filterOption={(input, option) =>
                  (
                    option?.children?.props?.children?.[1] ||
                    option?.value ||
                    ""
                  )
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                notFoundContent={
                  loading ? (
                    <div className="p-4 text-center">
                      <Spin size="small" />
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      <Icon name="Search" size={16} className="mb-2" />
                      <div>No make found</div>
                    </div>
                  )
                }
              >
                {vehicleMake && !hasValue(makes, vehicleMake) && (
                  <Select.Option key={`legacy-make-${vehicleMake}`} value={vehicleMake}>
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center font-bold text-[10px]">
                        {String(vehicleMake).charAt(0)}
                      </div>
                      {vehicleMake} (Legacy)
                    </div>
                  </Select.Option>
                )}
                {makes.map((make) => (
                  <Select.Option key={make} value={make}>
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center font-bold text-[10px]">
                        {make.charAt(0)}
                      </div>
                      {make}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Model" name="vehicleModel" className="mb-0">
              <Select
                placeholder={vehicleMake ? "Select model" : "Select make first"}
                disabled={!vehicleMake}
                allowClear
                className="h-10 rounded-xl"
                showSearch
                loading={loading}
                onChange={handleModelChange}
                filterOption={(input, option) =>
                  (option?.children || option?.value || "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                notFoundContent={
                  loading ? (
                    <div className="p-4 text-center">
                      <Spin size="small" />
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      <Icon name="Search" size={16} className="mb-2" />
                      <div>No model found</div>
                    </div>
                  )
                }
              >
                {vehicleModel && !hasValue(models, vehicleModel) && (
                  <Select.Option key={`legacy-model-${vehicleModel}`} value={vehicleModel}>
                    {cleanModelLabel(vehicleModel)} (Legacy)
                  </Select.Option>
                )}
                {models.map((model) => (
                  <Select.Option key={model} value={model}>
                    {cleanModelLabel(model)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Variant" name="vehicleVariant" className="mb-0">
              <Select
                placeholder={
                  vehicleModel ? "Select variant" : "Select model first"
                }
                disabled={!vehicleModel}
                allowClear
                className="h-10 rounded-xl"
                showSearch
                loading={loading}
                onChange={handleVariantChange}
                filterOption={(input, option) =>
                  (option?.children || option?.value || "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                notFoundContent={
                  loading ? (
                    <div className="p-4 text-center">
                      <Spin size="small" />
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      <Icon name="Search" size={16} className="mb-2" />
                      <div>No variant found</div>
                    </div>
                  )
                }
              >
                {form?.getFieldValue("vehicleVariant") &&
                  !hasValue(variants, form?.getFieldValue("vehicleVariant")) && (
                    <Select.Option
                      key={`legacy-variant-${form?.getFieldValue("vehicleVariant")}`}
                      value={form?.getFieldValue("vehicleVariant")}
                    >
                      {cleanVariantLabel(form?.getFieldValue("vehicleVariant"))} (Legacy)
                    </Select.Option>
                  )}
                {variants.map((variant) => (
                  <Select.Option key={variant} value={variant}>
                    {cleanVariantLabel(variant)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item className="mb-0">
              <Checkbox
                checked={showDiscontinuedCars}
                onChange={(event) =>
                  setShowDiscontinuedCars(event?.target?.checked)
                }
              >
                Show discontinued cars
              </Checkbox>
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* FINANCING DECISION */}
      <div className="flex flex-col md:flex-row items-center justify-between p-5 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Icon name="HandCoins" size={20} />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              Loan Financing Requirement
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Is the customer requesting credit for this vehicle?
            </div>
          </div>
        </div>

        <div className="w-full md:w-48 shrink-0">
          <Form.Item name="isFinanced" className="mb-0">
            <Segmented
              block
              options={[
                { label: "Yes", value: "Yes" },
                { label: "No", value: "No" },
              ]}
              className="rounded-xl p-1 bg-background shadow-sm"
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsForm;
