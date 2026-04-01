// src/modules/delivery-orders/components/sections/Section2DealerDetails.jsx

import React, { useEffect, useMemo, useCallback } from "react";
import { Form, Input, Row, Col, Divider, Tag, AutoComplete, Spin } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import useShowroomAutoSuggest from "../../../../hooks/useShowroomAutoSuggest";
import { useTheme } from "../../../../context/ThemeContext";

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
      color: "var(--do-chip, #4b5563)",
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
      color: "var(--do-muted, #6b7280)",
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
          color: "var(--do-muted, #6b7280)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
    )}
    <div
      style={{
        borderBottom: "1px solid var(--do-border, #e5e7eb)",
        paddingBottom: 2,
      }}
    >
      {children}
    </div>
  </div>
);

const Section2DealerDetails = ({ form, loan }) => {
  const { isDarkMode } = useTheme();
  const doVehicleMake = Form.useWatch("do_vehicleMake", form);
  const { options, loading, search, getByName } = useShowroomAutoSuggest({
    limit: 25,
    brand: doVehicleMake,
  });

  const pickFirst = useCallback((...values) => {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      const text = String(value).trim();
      if (!text) continue;
      if (["na", "n/a", "null", "undefined", "-", "--"].includes(text.toLowerCase())) {
        continue;
      }
      return value;
    }
    return "";
  }, []);

  const showroomOptions = useMemo(
    () =>
      (options || []).map((opt) => ({
        value: opt?.value || "",
        label: opt?.label || opt?.value || "",
        showroom: opt?.showroom || null,
      })),
    [options],
  );

  const handleShowroomSelect = useCallback(
    (_value, option) => {
      const showroom = option?.showroom || getByName(option?.value || _value);
      if (!showroom) return;
      form.setFieldsValue({
        do_dealerName: showroom?.name || "",
        do_dealerAddress: showroom?.address || "",
        do_dealerPincode: showroom?.pincode || "",
        do_dealerCity: showroom?.city || "",
        do_dealerContactPerson: showroom?.contactPerson || "",
        do_dealerMobile: showroom?.mobile || "",
      });
    },
    [form, getByName],
  );

  // Prefill from Delivery fields
  useEffect(() => {
    if (!form || !loan) return;

    const existing = form.getFieldValue("do_dealerName");
    if (existing) return;

    form.setFieldsValue({
      do_dealerName: pickFirst(
        loan?.delivery_dealerName,
        loan?.showroomDealerName,
        loan?.dealerName,
      ),
      do_dealerAddress: pickFirst(
        loan?.delivery_dealerAddress,
        loan?.showroomAddress,
        loan?.dealerAddress,
      ),
      do_dealerPincode: pickFirst(
        loan?.delivery_dealerPincode,
        loan?.dealerPincode,
      ),
      do_dealerCity: pickFirst(
        loan?.delivery_dealerCity,
        loan?.dealerCity,
      ),
      do_dealerContactPerson: pickFirst(
        loan?.delivery_dealerContactPerson,
        loan?.dealerContactPerson,
      ),
      do_dealerMobile: pickFirst(
        loan?.delivery_dealerContactNumber,
        loan?.dealerMobile,
      ),
    });
  }, [form, loan, pickFirst]);

  return (
    <div
      style={{
        "--do-text": isDarkMode ? "#f3f4f6" : "#111827",
        "--do-muted": isDarkMode ? "#9ca3af" : "#6b7280",
        "--do-chip": isDarkMode ? "#d1d5db" : "#4b5563",
        "--do-border": isDarkMode ? "#303030" : "#e5e7eb",
        marginBottom: 32,
        padding: 18,
        background: isDarkMode ? "#1b1b1b" : "#f9fafb",
        borderRadius: 16,
        border: `1px solid ${isDarkMode ? "#303030" : "#e5e7eb"}`,
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
          <ShopOutlined style={{ color: isDarkMode ? "#f3f4f6" : "#111827" }} />
          <div>
            <HeadingLabel>Dealer details</HeadingLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: isDarkMode ? "#f3f4f6" : "#111827",
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
                  <AutoComplete
                    allowClear
                    options={showroomOptions}
                    onSearch={search}
                    onSelect={handleShowroomSelect}
                    notFoundContent={
                      loading ? (
                        <div style={{ padding: 8, textAlign: "center" }}>
                          <Spin size="small" />
                        </div>
                      ) : null
                    }
                  >
                    <Input
                      bordered={false}
                      size="small"
                      placeholder="Search showroom / dealer"
                    />
                  </AutoComplete>
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

            {/* Row 2: Address */}
            <Col xs={24} md={24}>
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
          </Row>
        </Col>

        {/* Right side left empty for now (no summary for dealers) */}
        <Col xs={24} lg={10} />
      </Row>
    </div>
  );
};

export default Section2DealerDetails;
