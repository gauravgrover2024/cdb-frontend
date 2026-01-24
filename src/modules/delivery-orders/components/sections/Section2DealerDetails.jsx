import React, { useEffect } from "react";
import { Card, Form, Input, Row, Col } from "antd";
import { ShopOutlined } from "@ant-design/icons";

const Section2DealerDetails = ({ form, loan }) => {
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
        borderRadius: 12,
        marginTop: 16,
        border: "1px solid #f0f0f0",
      }}
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShopOutlined style={{ color: "#722ed1" }} />
          SECTION — Dealer Details
        </span>
      }
    >
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Dealer Name" name="do_dealerName">
            <Input placeholder="Dealer name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Contact Person Name" name="do_dealerContactPerson">
            <Input placeholder="Contact person" />
          </Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item label="Address" name="do_dealerAddress">
            <Input.TextArea rows={2} placeholder="Dealer address" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Pincode" name="do_dealerPincode">
            <Input placeholder="Pincode" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="City" name="do_dealerCity">
            <Input placeholder="City" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Mobile Number" name="do_dealerMobile">
            <Input placeholder="Mobile number" />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
};

export default Section2DealerDetails;
