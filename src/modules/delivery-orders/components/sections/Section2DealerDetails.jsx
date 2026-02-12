import React, { useEffect } from "react";
import { Card, Form, Input, Row, Col, Typography, Divider } from "antd";
import {
  ShopOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const Section2DealerDetails = ({ form, loan, readOnly = false }) => {
  // Prefill from Delivery fields
  useEffect(() => {
    if (!form || !loan) return;

    const existing = form.getFieldValue("do_dealerName");
    if (existing) return; // don't overwrite if already filled

    form.setFieldsValue({
      do_dealerName: loan?.delivery_dealerName || "",
      do_dealerAddress: loan?.delivery_dealerAddress || "",
      do_dealerPincode: loan?.delivery_dealerPincode || loan?.pincode || "",
      do_dealerCity: loan?.delivery_dealerCity || loan?.city || "",
      do_dealerContactPerson: loan?.delivery_dealerContactPerson || "",
      do_dealerMobile: loan?.delivery_dealerContactNumber || "",
    });
  }, [form, loan]);

  return (
    <Card
      style={{
        borderRadius: 16,
        border: "1px solid #f0f0f0",
        padding: 18,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "#f5f3ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShopOutlined style={{ color: "#722ed1" }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontSize: 18 }}>
              Dealer / Showroom Details
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Branch and contact information where the vehicle will be billed.
            </Text>
          </div>
        </div>
      </div>

      <Divider style={{ margin: "0 0 16px 0" }} />

      {/* Content */}
      <Row gutter={[16, 16]}>
        {/* Left: identity + contact person */}
        <Col xs={24} md={12}>
          <Form.Item label="Dealer Name" name="do_dealerName">
            <Input
              placeholder="Dealer name"
              disabled={readOnly}
              prefix={<ShopOutlined style={{ color: "#bfbfbf" }} />}
            />
          </Form.Item>

          <Form.Item label="Contact Person Name" name="do_dealerContactPerson">
            <Input placeholder="Contact person" disabled={readOnly} />
          </Form.Item>

          <Form.Item label="Mobile Number" name="do_dealerMobile">
            <Input
              placeholder="Mobile number"
              disabled={readOnly}
              prefix={<PhoneOutlined style={{ color: "#bfbfbf" }} />}
            />
          </Form.Item>
        </Col>

        {/* Right: address */}
        <Col xs={24} md={12}>
          <Form.Item label="Address" name="do_dealerAddress">
            <Input.TextArea
              rows={3}
              placeholder="Dealer address"
              disabled={readOnly}
            />
          </Form.Item>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item label="Pincode" name="do_dealerPincode">
                <Input placeholder="Pincode" disabled={readOnly} />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item label="City" name="do_dealerCity">
                <Input
                  placeholder="City"
                  disabled={readOnly}
                  prefix={<EnvironmentOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
};

export default Section2DealerDetails;
