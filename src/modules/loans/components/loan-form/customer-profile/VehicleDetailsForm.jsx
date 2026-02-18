import React from "react";
import { Form, Select, Row, Col, Segmented, Spin } from "antd";
import Icon from "../../../../../components/AppIcon";
import { useVehicleData } from "../../../../../hooks/useVehicleData";

const VehicleDetailsForm = () => {
  const form = Form.useFormInstance();

  // Use centralized vehicle data hook
  const {
    makes,
    models,
    variants,
    loading,
    handleMakeChange,
    handleModelChange,
    handleVariantChange,
    createCustomVehicle,
  } = useVehicleData(form, {
    makeFieldName: "vehicleMake",
    modelFieldName: "vehicleModel",
    variantFieldName: "vehicleVariant",
    autofillPricing: true,
    onVehicleSelect: (vehicleData) => {
      console.log("Vehicle selected:", vehicleData);
    },
  });

  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);

  return (
    <div id="section-vehicle-details" className="form-section">
      {/* SECTION HEADER */}
      <div className="section-header mb-6">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="Car" size={20} />
          </div>
          <span className="text-lg font-medium text-foreground">Vehicle Details</span>
          {loading && <Spin size="small" />}
        </div>
      </div>

      {/* VEHICLE SELECTION */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm mb-6">
        <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
           <Icon name="Search" size={12} className="text-primary" />
           Asset Configuration
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Form.Item label="Make" name="vehicleMake" className="mb-0">
              <Select 
                placeholder="Select make" 
                allowClear 
                className="h-10 rounded-xl" 
                showSearch
                loading={loading}
                onChange={handleMakeChange}
                onSearch={(value) => {
                  // Allow custom input
                  if (value && !makes.includes(value)) {
                    createCustomVehicle('make', value);
                  }
                }}
                filterOption={(input, option) =>
                  (option?.children?.props?.children?.[1] || option?.value || '')
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
                      <Icon name="Plus" size={16} className="mb-2" />
                      <div>Type to add new make</div>
                    </div>
                  )
                }
              >
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
                onSearch={(value) => {
                  // Allow custom input
                  if (value && vehicleMake && !models.includes(value)) {
                    createCustomVehicle('model', value);
                  }
                }}
                filterOption={(input, option) =>
                  (option?.children || option?.value || '')
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
                      <Icon name="Plus" size={16} className="mb-2" />
                      <div>Type to add new model</div>
                    </div>
                  )
                }
              >
                {models.map((model) => (
                  <Select.Option key={model} value={model}>
                    {model}
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
                onSearch={(value) => {
                  // Allow custom input
                  if (value && vehicleMake && vehicleModel && !variants.includes(value)) {
                    createCustomVehicle('variant', value);
                  }
                }}
                filterOption={(input, option) =>
                  (option?.children || option?.value || '')
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
                      <Icon name="Plus" size={16} className="mb-2" />
                      <div>Type to add new variant</div>
                    </div>
                  )
                }
              >
                {variants.map((variant) => (
                  <Select.Option key={variant} value={variant}>
                    {variant}
                  </Select.Option>
                ))}
              </Select>
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
            <div className="text-sm font-medium text-foreground">Loan Financing Requirement</div>
            <div className="text-xs text-muted-foreground mt-0.5">Is the customer requesting credit for this vehicle?</div>
          </div>
        </div>
        
        <div className="w-full md:w-48 shrink-0">
          <Form.Item name="isFinanced" className="mb-0">
            <Segmented
              block
              options={[
                { label: 'Yes', value: 'Yes' },
                { label: 'No', value: 'No' },
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
