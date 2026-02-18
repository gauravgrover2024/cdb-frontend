import React, { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Row, Col, Select, Switch } from "antd";
import Icon from "../../components/AppIcon";

const { Option } = Select;

const VehicleFormModal = ({ open, onClose, onSave, loading, initialValues }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
      form.resetFields();
    } catch (err) {
      // Validation failed
    }
  };

  // Auto-calculate On-Road Price
  const handleValuesChange = (_, allValues) => {
    const ex = Number(allValues.exShowroom || 0);
    const rto = Number(allValues.rto || 0);
    const ins = Number(allValues.insurance || 0);
    const other = Number(allValues.otherCharges || 0);
    const total = ex + rto + ins + other;
    form.setFieldsValue({ onRoadPrice: total });
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="Car" size={18} />
          </div>
          <span>{initialValues ? "Edit Vehicle" : "Add New Vehicle"}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
      okText={initialValues ? "Update" : "Create"}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          exShowroom: 0,
          rto: 0,
          insurance: 0,
          otherCharges: 0,
          onRoadPrice: 0,
          status: "Active",
          isDiscontinued: false
        }}
        onValuesChange={handleValuesChange}
        className="mt-4"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Make"
              name="make"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input placeholder="e.g. Tata, Maruti" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Model"
              name="model"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input placeholder="e.g. Nexon, Swift" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Variant"
              name="variant"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input placeholder="e.g. XZ+, VXI" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Fuel Type"
              name="fuel"
            >
              <Select placeholder="Select Fuel">
                <Option value="Petrol">Petrol</Option>
                <Option value="Diesel">Diesel</Option>
                <Option value="CNG">CNG</Option>
                <Option value="EV">EV</Option>
                <Option value="Hybrid">Hybrid</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="City"
              name="city"
            >
              <Input placeholder="e.g. Gwalior, Indore" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Status"
              name="status"
            >
              <Select>
                <Option value="Active">Active</Option>
                <Option value="Inactive">Inactive</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Discontinued"
              name="isDiscontinued"
              valuePropName="checked"
            >
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>

        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 mt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Icon name="IndianRupee" size={14} />
                Pricing Details
            </h4>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label="Ex-Showroom" name="exShowroom">
                        <InputNumber
                            className="w-full"
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/₹\s?|(,*)/g, '')}
                        />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label="RTO" name="rto">
                        <InputNumber
                            className="w-full"
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/₹\s?|(,*)/g, '')}
                        />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label="Insurance" name="insurance">
                        <InputNumber
                            className="w-full"
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/₹\s?|(,*)/g, '')}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label="Other Charges" name="otherCharges">
                        <InputNumber
                            className="w-full"
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/₹\s?|(,*)/g, '')}
                        />
                    </Form.Item>
                </Col>
                <Col span={16}>
                    <Form.Item label="On-Road Price" name="onRoadPrice">
                        <InputNumber
                            className="w-full bg-primary/5 font-bold text-primary"
                            readOnly
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/₹\s?|(,*)/g, '')}
                        />
                    </Form.Item>
                </Col>
            </Row>
        </div>
      </Form>
    </Modal>
  );
};

export default VehicleFormModal;
