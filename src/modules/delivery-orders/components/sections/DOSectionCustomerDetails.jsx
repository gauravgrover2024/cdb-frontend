// src/modules/delivery-orders/components/sections/Section1CustomerDetails.jsx

import React, { useEffect, useMemo } from "react";
import { Row, Col, Form, Tag, Divider, Input, DatePicker } from "antd";
import { UserOutlined, IdcardOutlined, HomeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import Icon from "../../../../components/AppIcon";

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

const SoftValue = ({ children, strong, color }) => (
  <div
    style={{
      fontSize: strong ? 18 : 13,
      fontWeight: strong ? 800 : 600,
      color: color || "#111827",
      lineHeight: 1.2,
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

const ReadonlyInput = ({ value, multiline }) =>
  multiline ? (
    <Input.TextArea
      bordered={false}
      size="small"
      value={value || "-"}
      autoSize={{ minRows: 2, maxRows: 4 }}
      readOnly
      style={{ padding: 0, resize: "none", background: "transparent" }}
    />
  ) : (
    <Input
      bordered={false}
      size="small"
      value={value || "-"}
      readOnly
      style={{ padding: 0, background: "transparent" }}
    />
  );

const DOSectionCustomerDetails = ({ form, readOnly = false }) => {
  const customerName = Form.useWatch("customerName", form);
  const doCustomerName = Form.useWatch("do_customerName", form);
  const residenceAddress = Form.useWatch("residenceAddress", form);
  const doResidenceAddress = Form.useWatch("do_residenceAddress", form);
  const pincode = Form.useWatch("pincode", form);
  const doPincode = Form.useWatch("do_pincode", form);
  const city = Form.useWatch("city", form);
  const doCity = Form.useWatch("do_city", form);

  const recordSource = Form.useWatch("recordSource", form);
  const doRecordSource = Form.useWatch("do_recordSource", form);
  const sourceName = Form.useWatch("sourceName", form);
  const doSourceName = Form.useWatch("do_sourceName", form);

  const doDate = Form.useWatch("do_date", form);
  const doRefNo = Form.useWatch("do_refNo", form);

  // Auto-generate DO ref and date only if missing
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

  const resolvedCustomerName = customerName || doCustomerName || "-";
  const resolvedAddress = residenceAddress || doResidenceAddress || "-";
  const resolvedPincode = pincode || doPincode || "-";
  const resolvedCity = city || doCity || "-";
  const resolvedRecordSource = recordSource || doRecordSource || "";
  const resolvedSourceName = sourceName || doSourceName || "";

  const sourceText = resolvedRecordSource
    ? resolvedRecordSource === "Indirect"
      ? `Indirect (${resolvedSourceName || "-"})`
      : "Direct"
    : "-";

  const TopStrip = useMemo(
    () => (
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
          <UserOutlined style={{ color: "#111827" }} />
          <div>
            <HeadingLabel>Customer details</HeadingLabel>
            <SoftValue>Customer & DO header</SoftValue>
          </div>
          <Tag
            color="blue"
            style={{ borderRadius: 999, fontSize: 11, borderColor: "#1d4ed8" }}
          >
            Customer
          </Tag>
        </div>

        <div
          style={{
            padding: "6px 16px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: "#fff",
            minWidth: 170,
          }}
        >
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: "#6b7280",
              marginBottom: 2,
            }}
          >
            DO Number
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {doRefNo || "Auto-generated"}
          </div>
        </div>
      </div>
    ),
    [doRefNo],
  );

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
      {TopStrip}

      <Divider style={{ margin: "8px 0 14px" }} />

      <Row gutter={[32, 12]}>
        {/* LEFT: DO header fields */}
        <Col
          xs={24}
          lg={14}
          style={{
            borderRight: "1px solid #e5e7eb",
            paddingRight: 24,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<IdcardOutlined style={{ color: "#1d4ed8" }} />}
              label="DO header"
            />
          </div>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <InlineField label="DO Date">
                <Form.Item name="do_date" style={{ marginBottom: 0 }}>
                  <DatePicker
                    className="h-9 w-full"
                    format="DD/MM/YYYY"
                    value={doDate ? dayjs(doDate) : null}
                    onChange={(date) => form.setFieldsValue({ do_date: date || null })}
                    allowClear
                    disabled={readOnly}
                    suffixIcon={<Icon name="Calendar" size={14} />}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Ref No (DO Number)">
                <Form.Item name="do_refNo" style={{ marginBottom: 0 }}>
                  <ReadonlyInput value={doRefNo} />
                </Form.Item>
              </InlineField>
            </Col>
          </Row>

          <Divider style={{ margin: "10px 0" }} />

          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<UserOutlined style={{ color: "#0ea5e9" }} />}
              label="Customer summary"
            />
          </div>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <InlineField label="Customer Name">
                <ReadonlyInput value={resolvedCustomerName} />
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Source">
                <ReadonlyInput value={sourceText} />
              </InlineField>
            </Col>
          </Row>
        </Col>

        {/* RIGHT: Address block */}
        <Col
          xs={24}
          lg={10}
          style={{
            paddingLeft: 24,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <SectionChip
              icon={<HomeOutlined style={{ color: "#7c3aed" }} />}
              label="Address & location"
            />
          </div>

          <InlineField label="Address">
            <ReadonlyInput value={resolvedAddress} multiline />
          </InlineField>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <InlineField label="City">
                <ReadonlyInput value={resolvedCity} />
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Pincode">
                <ReadonlyInput value={resolvedPincode} />
              </InlineField>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default DOSectionCustomerDetails;
