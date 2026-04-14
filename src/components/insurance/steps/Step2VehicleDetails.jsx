import React from "react";
import {
  Alert,
  AutoComplete,
  Card,
  Col,
  Divider,
  Input,
  Row,
  Select,
  Space,
  Typography,
} from "antd";

const { Text } = Typography;

const Step2VehicleDetails = ({
  formData,
  setField,
  handleChange,
  showErrors,
  step2Errors,
  vehicleSearchLoading,
  vehicleSearchInput,
  setVehicleSearchInput,
  vehicleSearchLoading2,
  vehicleSearchOptions,
  handleVehicleSearch,
  applyVehicleToForm,
  makeOptions,
  modelOptions,
  variantOptions,
  vehicleSearchDebounceRef,
  setVehicleSearchLoading,
  vehiclesApi,
}) => {
  return (
    <Card
      size="small"
      title="Vehicle Details - Search & Auto-Fill"
      bordered
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Text strong>Registration Number *</Text>
          <Input
            value={formData.registrationNumber}
            onChange={(e) => {
              const regNum = e.target.value;
              setField("registrationNumber", regNum);

              // Debounced search - auto-fetch vehicle data
              if (vehicleSearchDebounceRef.current) {
                clearTimeout(vehicleSearchDebounceRef.current);
              }

              if (regNum && regNum.length >= 3) {
                vehicleSearchDebounceRef.current = setTimeout(
                  async () => {
                    try {
                      setVehicleSearchLoading(true);
                      const res = await vehiclesApi.searchMasterRecords(
                        regNum,
                        1,
                      );
                      const vehicles = Array.isArray(res?.data)
                        ? res.data
                        : [];

                      // Auto-apply if exact registration match found
                      if (vehicles.length > 0) {
                        const vehicle = vehicles[0];
                        const vehicleReg = (
                          vehicle.registrationNumber ||
                          vehicle.regNo ||
                          ""
                        ).toUpperCase();
                        const inputReg = regNum.toUpperCase();

                        if (vehicleReg === inputReg) {
                          applyVehicleToForm(vehicle);
                        }
                      }
                    } catch (err) {
                      console.error(
                        "[Insurance][AutoFetchVehicle] error:",
                        err,
                      );
                    } finally {
                      setVehicleSearchLoading(false);
                    }
                  },
                  800,
                );
              }
            }}
            style={{ marginTop: 6 }}
            status={
              showErrors && step2Errors.registrationNumber
                ? "error"
                : ""
            }
            placeholder="e.g. DL01AB1234"
          />
          {vehicleSearchLoading && (
            <Text style={{ fontSize: 12, color: "#999" }}>
              🔍 Fetching vehicle data...
            </Text>
          )}
          {showErrors && step2Errors.registrationNumber ? (
            <Text type="danger">{step2Errors.registrationNumber}</Text>
          ) : null}
        </Col>
        <Col xs={24}>
          <Text strong>Search Car (Make / Model)</Text>
          <AutoComplete
            value={vehicleSearchInput}
            onSearch={handleVehicleSearch}
            onChange={(val) => setVehicleSearchInput(val)}
            placeholder="Type make/model (e.g. Hyundai Creta, Maruti Swift)..."
            style={{ marginTop: 6, width: "100%" }}
            loading={vehicleSearchLoading2}
            notFoundContent={
              vehicleSearchInput.length < 2
                ? "Type at least 2 letters"
                : vehicleSearchLoading2
                  ? "Searching..."
                  : "No matching cars"
            }
            options={vehicleSearchOptions.map((option) => ({
              value: option.value,
              label: (
                <div>
                  <div style={{ fontWeight: 500 }}>{option.label}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {option.data?.registrationNumber ||
                      option.data?.regNo ||
                      ""}
                    {option.data?.vehicleVariant || option.data?.variant
                      ? ` • ${option.data.vehicleVariant || option.data.variant}`
                      : ""}
                    {option.data?.cubicCapacity || option.data?.cc
                      ? ` • ${option.data.cubicCapacity || option.data.cc} CC`
                      : ""}
                    {option.data?.manufactureYear ||
                    option.data?.mfgYear ||
                    option.data?.year
                      ? ` • ${option.data.manufactureYear || option.data.mfgYear || option.data.year}`
                      : ""}
                  </div>
                </div>
              ),
              data: option.data,
            }))}
            onSelect={(_, option) => {
              if (option?.data) {
                applyVehicleToForm(option.data);
                setVehicleSearchInput(option.value || "");
              }
            }}
          />
        </Col>

        <Col xs={24} md={12}>
          <Text strong>Brand *</Text>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Select
              value={formData.vehicleMake || undefined}
              placeholder="Select brand"
              allowClear
              onChange={(val) => {
                setField("vehicleMake", val || "");
                setField("vehicleModel", "");
                setField("vehicleVariant", "");
              }}
              style={{ marginTop: 6, width: "100%" }}
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
            {formData.vehicleMake &&
              vehicleSearchOptions.length > 0 && (
                <Text type="success" style={{ fontSize: 12 }}>
                  ✓ Auto-filled from search
                </Text>
              )}
          </Space>
          {showErrors && step2Errors.vehicleMake ? (
            <Text type="danger">{step2Errors.vehicleMake}</Text>
          ) : null}
        </Col>

        <Col xs={24} md={12}>
          <Text strong>Model *</Text>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Select
              value={formData.vehicleModel || undefined}
              placeholder="Select model"
              allowClear
              onChange={(val) => {
                setField("vehicleModel", val || "");
                setField("vehicleVariant", "");
              }}
              disabled={!formData.vehicleMake}
              style={{ marginTop: 6, width: "100%" }}
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
            {formData.vehicleModel &&
              vehicleSearchOptions.length > 0 && (
                <Text type="success" style={{ fontSize: 12 }}>
                  ✓ Auto-filled from search
                </Text>
              )}
          </Space>
          {showErrors && step2Errors.vehicleModel ? (
            <Text type="danger">{step2Errors.vehicleModel}</Text>
          ) : null}
        </Col>

        <Col xs={24} md={12}>
          <Text strong>Vehicle Variant *</Text>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Select
              value={formData.vehicleVariant || undefined}
              placeholder="Select variant"
              allowClear
              onChange={(val) => setField("vehicleVariant", val || "")}
              disabled={!formData.vehicleMake || !formData.vehicleModel}
              style={{ marginTop: 6, width: "100%" }}
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
            {formData.vehicleVariant &&
              vehicleSearchOptions.length > 0 && (
                <Text type="success" style={{ fontSize: 12 }}>
                  ✓ Auto-filled from search
                </Text>
              )}
          </Space>
          {showErrors && step2Errors.vehicleVariant ? (
            <Text type="danger">{step2Errors.vehicleVariant}</Text>
          ) : null}
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Cubic Capacity (cc)</Text>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input
              value={formData.cubicCapacity}
              onChange={handleChange("cubicCapacity")}
              style={{ marginTop: 6 }}
              placeholder="Optional"
            />
            {formData.cubicCapacity &&
              vehicleSearchOptions.length > 0 && (
                <Text type="success" style={{ fontSize: 12 }}>
                  ✓ Auto-filled from search
                </Text>
              )}
          </Space>
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Engine Number *</Text>
          <Input
            value={formData.engineNumber}
            onChange={handleChange("engineNumber")}
            style={{ marginTop: 6 }}
            status={
              showErrors && step2Errors.engineNumber ? "error" : ""
            }
            placeholder="Engine number"
          />
          {showErrors && step2Errors.engineNumber ? (
            <Text type="danger">{step2Errors.engineNumber}</Text>
          ) : null}
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Chassis Number *</Text>
          <Input
            value={formData.chassisNumber}
            onChange={handleChange("chassisNumber")}
            style={{ marginTop: 6 }}
            status={
              showErrors && step2Errors.chassisNumber ? "error" : ""
            }
            placeholder="Chassis number"
          />
          {showErrors && step2Errors.chassisNumber ? (
            <Text type="danger">{step2Errors.chassisNumber}</Text>
          ) : null}
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Types of Vehicle</Text>
          <Select
            value={formData.typesOfVehicle || "Four Wheeler"}
            onChange={(v) => setField("typesOfVehicle", v)}
            style={{ width: "100%", marginTop: 6 }}
            options={[{ label: "Four Wheeler", value: "Four Wheeler" }]}
          />
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Manufacture Month *</Text>
          <Input
            value={formData.manufactureMonth}
            onChange={handleChange("manufactureMonth")}
            style={{ marginTop: 6 }}
            status={
              showErrors && step2Errors.manufactureMonth ? "error" : ""
            }
            placeholder="e.g. 07"
          />
          {showErrors && step2Errors.manufactureMonth ? (
            <Text type="danger">{step2Errors.manufactureMonth}</Text>
          ) : null}
        </Col>
        <Col xs={24} md={12}>
          <Text strong>Manufacture Year *</Text>
          <Input
            value={formData.manufactureYear}
            onChange={handleChange("manufactureYear")}
            style={{ marginTop: 6 }}
            status={
              showErrors && step2Errors.manufactureYear ? "error" : ""
            }
            placeholder="e.g. 2026"
          />
          {showErrors && step2Errors.manufactureYear ? (
            <Text type="danger">{step2Errors.manufactureYear}</Text>
          ) : null}
        </Col>
      </Row>
      <Divider style={{ marginBlock: 12 }} />
      <Alert
        type="info"
        showIcon
        message="All vehicle details must be accurate and will be verified during policy issuance."
      />
    </Card>
  );
};

export default Step2VehicleDetails;
