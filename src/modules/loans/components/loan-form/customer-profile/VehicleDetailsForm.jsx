import React, { useState, useEffect } from "react";
import { Form, Select, Row, Col, Space, Divider } from "antd";
import { CarOutlined } from "@ant-design/icons";
import { carDatabase } from "../../../data/carDatabase";

const VehicleDetailsForm = () => {
  const form = Form.useFormInstance();

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);

  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);

  /* =========================
     LOAD MAKES
  ========================= */
  useEffect(() => {
    if (Array.isArray(carDatabase)) {
      setMakes(carDatabase.map((c) => c.make).sort());
    }
  }, []);

  /* =========================
     LOAD MODELS (EDIT SAFE)
  ========================= */
  useEffect(() => {
    if (!vehicleMake) {
      setModels([]);
      setVariants([]);
      return;
    }

    const makeData = carDatabase.find((c) => c.make === vehicleMake);
    if (makeData?.models) {
      setModels(makeData.models.map((m) => m.name));
    }
  }, [vehicleMake]);

  /* =========================
     LOAD VARIANTS (EDIT SAFE)
  ========================= */
  useEffect(() => {
    if (!vehicleMake || !vehicleModel) {
      setVariants([]);
      return;
    }

    const makeData = carDatabase.find((c) => c.make === vehicleMake);
    const modelData = makeData?.models?.find((m) => m.name === vehicleModel);

    if (modelData?.variants) {
      setVariants(modelData.variants);
    }
  }, [vehicleMake, vehicleModel]);

  return (
    <div
      id="section-vehicle-details"
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      {/* SECTION HEADER */}
      <Space
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
        }}
      >
        <CarOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600 }}>Vehicle Details</span>
      </Space>

      {/* VEHICLE SELECTION */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Form.Item label="Make" name="vehicleMake">
            <Select placeholder="Select make" allowClear>
              {makes.map((make) => (
                <Select.Option key={make} value={make}>
                  {make}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Model" name="vehicleModel">
            <Select
              placeholder={vehicleMake ? "Select model" : "Select make first"}
              disabled={!vehicleMake}
              allowClear
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
          <Form.Item label="Variant" name="vehicleVariant">
            <Select
              placeholder={
                vehicleModel ? "Select variant" : "Select model first"
              }
              disabled={!vehicleModel}
              allowClear
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

      {/* FINANCING DECISION */}
      <Divider style={{ margin: "8px 0 16px" }} />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Form.Item label="Is the vehicle being financed?" name="isFinanced">
            <Select placeholder="Select">
              <Select.Option value="Yes">Yes</Select.Option>
              <Select.Option value="No">No</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default VehicleDetailsForm;
