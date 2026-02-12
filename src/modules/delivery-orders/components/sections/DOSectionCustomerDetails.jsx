// src/modules/delivery-orders/components/sections/DOSectionCustomerDetails.jsx

import React, { useEffect } from "react";
import { Card, Form, Row, Col, DatePicker, Input, Typography } from "antd";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const DOSectionCustomerDetails = ({ form, readOnly = false }) => {
  // Prefill from loan profile fields (watched for display)
  const customerName = Form.useWatch("customerName", form);
  const residenceAddress = Form.useWatch("residenceAddress", form);
  const pincode = Form.useWatch("pincode", form);
  const city = Form.useWatch("city", form);

  const recordSource = Form.useWatch("recordSource", form);
  const sourceName = Form.useWatch("sourceName", form);

  // DO fields
  const doDate = Form.useWatch("do_date", form);
  const doRefNo = Form.useWatch("do_refNo", form);

  // Auto-set DO date/ref only if missing
  useEffect(() => {
    if (!form) return;

    const existingRef = form.getFieldValue("do_refNo");
    if (!existingRef) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 999999)
        .toString()
        .padStart(6, "0");
      form.setFieldsValue({
        do_refNo: `DO-${year}-${random}`,
      });
    }

    const existingDate = form.getFieldValue("do_date");
    if (!existingDate) {
      form.setFieldsValue({
        do_date: dayjs(),
      });
    }
  }, [form]);

  const sourceText = recordSource
    ? recordSource === "Indirect"
      ? `Indirect • ${sourceName || "-"}`
      : "Direct"
    : "-";

  return (
    <Card
      style={{
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
        border: "1px solid #f0f0f0",
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
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>
            DO & Customer Details
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Core DO information and the primary customer snapshot.
          </Text>
        </div>
        <div
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            color: "#6b7280",
          }}
        >
          Read-only customer data is pulled from the loan.
        </div>
      </div>

      {/* Top: DO summary bar */}
      <div
        style={{
          background: "#f9fafb",
          borderRadius: 12,
          padding: 12,
          border: "1px solid #e5e7eb",
          marginBottom: 16,
        }}
      >
        <Row gutter={[16, 12]}>
          <Col xs={24} md={8}>
            <Text
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 4,
                letterSpacing: 0.4,
              }}
            >
              DO date
            </Text>
            <Form.Item name="do_date" style={{ marginBottom: 0 }}>
              <DatePicker
                style={{ width: "100%" }}
                format="DD-MM-YYYY"
                disabled={readOnly}
                value={doDate ? dayjs(doDate) : null}
                onChange={(d) => form.setFieldsValue({ do_date: d })}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Text
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 4,
                letterSpacing: 0.4,
              }}
            >
              DO number
            </Text>
            <Form.Item name="do_refNo" style={{ marginBottom: 0 }}>
              <Input
                placeholder="Auto generated"
                disabled={readOnly}
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Text
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 4,
                letterSpacing: 0.4,
              }}
            >
              Loan ID
            </Text>
            <Form.Item name="do_loanId" style={{ marginBottom: 0 }}>
              <Input placeholder="Loan ID" disabled={readOnly} />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* Bottom: Left = Customer, Right = Source */}
      <Row gutter={[16, 16]}>
        {/* Customer block */}
        <Col xs={24} lg={16}>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: 12,
            }}
          >
            <Row gutter={[16, 12]}>
              <Col xs={24} md={12}>
                <Form.Item label="Customer Name" name="customerName">
                  <Input
                    placeholder="Customer name"
                    value={customerName}
                    disabled
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="City" name="city">
                  <Input placeholder="City" value={city} disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={18}>
                <Form.Item label="Address" name="residenceAddress">
                  <Input
                    placeholder="Customer address"
                    value={residenceAddress}
                    disabled
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item label="Pincode" name="pincode">
                  <Input placeholder="Pincode" value={pincode} disabled />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Col>

        {/* Source block */}
        <Col xs={24} lg={8}>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: 12,
              background: "#f9fafb",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Source Details
            </Text>

            <div
              style={{
                fontSize: 12,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#6b7280" }}>Source Type</span>
              <span style={{ fontWeight: 500, color: "#111827" }}>
                {sourceText}
              </span>
            </div>

            <Form.Item
              label="Source (raw)"
              name="recordSource"
              style={{ marginBottom: 4, marginTop: 8 }}
            >
              <Input
                placeholder="Direct / Indirect"
                value={recordSource}
                disabled
              />
            </Form.Item>

            <Form.Item
              label="Dealer / Channel Name"
              name="sourceName"
              style={{ marginBottom: 0 }}
            >
              <Input
                placeholder="Dealer / Channel"
                value={sourceName}
                disabled
              />
            </Form.Item>

            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#6b7280",
                borderRadius: 8,
                border: "1px dashed #e5e7eb",
                padding: "6px 8px",
                background: "#ffffff",
              }}
            >
              This information comes from the loan record. Update the loan if
              customer/source details change.
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default DOSectionCustomerDetails;
