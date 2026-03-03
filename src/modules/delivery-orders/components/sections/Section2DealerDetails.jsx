// src/modules/delivery-orders/components/sections/Section2DealerDetails.jsx

import React, { useEffect } from "react";
import { Form, Input, Row, Col, Divider, Tag } from "antd";
import { ShopOutlined } from "@ant-design/icons";

const SectionChip = ({ icon, label }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: "#4b5563",
    }}
  >
    {icon}
    <span>{label}</span>
  </div>
);

const HeadingLabel = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: "#6b7280",
    }}
  >
    {children}
  </div>
);

const InlineField = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    {label && (
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
    )}
    <div
      style={{
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: 2,
      }}
    >
      {children}
    </div>
  </div>
);

const Section2DealerDetails = ({ form, loan }) => {
  // Prefill from Delivery fields
  useEffect(() => {
    if (!form || !loan) return;

    const existing = form.getFieldValue("do_dealerName");
    if (existing) return;

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
    <div
      style={{
        marginBottom: 32,
        padding: 18,
        background: "#f9fafb",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
      }}
    >
      {/* Top strip to match Sections 3–5 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ShopOutlined style={{ color: "#111827" }} />
          <div>
            <HeadingLabel>Dealer details</HeadingLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Showroom / dealer information
            </div>
          </div>
          <Tag
            color="purple"
            style={{ borderRadius: 999, fontSize: 11, borderColor: "#7c3aed" }}
          >
            Dealer
          </Tag>
        </div>
      </div>

      <Divider style={{ margin: "8px 0 14px" }} />

      <Row gutter={[32, 12]}>
        <Col xs={24} lg={24}>
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<ShopOutlined style={{ color: "#7c3aed" }} />}
              label="Primary dealer details"
            />
          </div>

          <Row gutter={[16, 8]}>
            {/* Row 1: Dealer + Contact + Mobile */}
            <Col xs={24} md={10}>
              <InlineField label="Dealer Name">
                <Form.Item name="do_dealerName" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="Dealer name"
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={7}>
              <InlineField label="Contact Person Name">
                <Form.Item
                  name="do_dealerContactPerson"
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="Contact person"
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={7}>
              <InlineField label="Mobile Number">
                <Form.Item name="do_dealerMobile" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="Mobile number"
                  />
                </Form.Item>
              </InlineField>
            </Col>

            {/* Row 2: Address + Pincode + City */}
            <Col xs={24} md={10}>
              <InlineField label="Address">
                <Form.Item name="do_dealerAddress" style={{ marginBottom: 0 }}>
                  <Input.TextArea
                    rows={1}
                    bordered={false}
                    placeholder="Dealer address"
                    style={{ padding: 0, resize: "none" }}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={7}>
              <InlineField label="Pincode">
                <Form.Item name="do_dealerPincode" style={{ marginBottom: 0 }}>
                  <Input bordered={false} size="small" placeholder="Pincode" />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={7}>
              <InlineField label="City">
                <Form.Item name="do_dealerCity" style={{ marginBottom: 0 }}>
                  <Input bordered={false} size="small" placeholder="City" />
                </Form.Item>
              </InlineField>
            </Col>
          </Row>
        </Col>

        {/* Right side left empty for now (no summary for dealers) */}
        <Col xs={24} lg={10} />
      </Row>
    </div>
  );
};

export default Section2DealerDetails;
