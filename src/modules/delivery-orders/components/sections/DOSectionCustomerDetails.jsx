// src/modules/delivery-orders/components/sections/Section1CustomerDetails.jsx

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Row, Col, Form, Tag, Divider, Input, DatePicker, AutoComplete, Select, Spin } from "antd";
import { UserOutlined, IdcardOutlined, HomeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import Icon from "../../../../components/AppIcon";
import { customersApi } from "../../../../api/customers";
import { useTheme } from "../../../../context/ThemeContext";

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

const SoftValue = ({ children, strong, color }) => (
  <div
    style={{
      fontSize: strong ? 18 : 13,
      fontWeight: strong ? 800 : 600,
      color: color || "var(--do-text, #111827)",
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

const ReadonlyInput = ({ value, multiline }) =>
  multiline ? (
    <Input.TextArea
      bordered={false}
      size="small"
      value={value || "-"}
      autoSize={{ minRows: 2, maxRows: 4 }}
      readOnly
      style={{ padding: 0, resize: "none", background: "transparent", color: "var(--do-text, #111827)" }}
    />
  ) : (
    <Input
      bordered={false}
      size="small"
      value={value || "-"}
      readOnly
      style={{ padding: 0, background: "transparent", color: "var(--do-text, #111827)" }}
    />
  );

const DOSectionCustomerDetails = ({ form, readOnly = false }) => {
  const { isDarkMode } = useTheme();
  const customerName = Form.useWatch("customerName", form);
  const doCustomerName = Form.useWatch("do_customerName", form);
  const primaryMobile = Form.useWatch("primaryMobile", form);
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
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const customerSearchTimerRef = useRef(null);
  const customerSearchReqRef = useRef(0);

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

  const pick = useCallback((...values) => {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      const text = String(value).trim();
      if (!text) continue;
      if (
        ["n/a", "na", "null", "undefined", "-", "--", "not set"].includes(
          text.toLowerCase(),
        )
      ) {
        continue;
      }
      return value;
    }
    return "";
  }, []);

  const applyCustomerAutofill = useCallback(
    async (seedCustomer = {}) => {
      let customer = seedCustomer || {};
      try {
        const customerId = customer?._id || customer?.id;
        if (customerId) {
          const fullRes = await customersApi.getById(customerId);
          customer = fullRes?.data || customer;
        }
      } catch (error) {
        console.error("Failed to load full customer during DO autofill:", error);
      }

      form.setFieldsValue({
        customerName: pick(customer?.customerName, customer?.name, customerName),
        do_customerName: pick(customer?.customerName, customer?.name, doCustomerName),
        primaryMobile: pick(customer?.primaryMobile, customer?.mobile, primaryMobile),
        residenceAddress: pick(
          customer?.residenceAddress,
          customer?.currentAddress,
          customer?.address,
          residenceAddress,
        ),
        do_residenceAddress: pick(
          customer?.residenceAddress,
          customer?.currentAddress,
          customer?.address,
          doResidenceAddress,
        ),
        city: pick(customer?.city, customer?.currentCity, customer?.permanentCity, city),
        do_city: pick(
          customer?.city,
          customer?.currentCity,
          customer?.permanentCity,
          doCity,
        ),
        pincode: pick(
          customer?.pincode,
          customer?.currentPincode,
          customer?.permanentPincode,
          pincode,
        ),
        do_pincode: pick(
          customer?.pincode,
          customer?.currentPincode,
          customer?.permanentPincode,
          doPincode,
        ),
        recordSource: pick(customer?.recordSource, customer?.source, recordSource),
        do_recordSource: pick(
          customer?.recordSource,
          customer?.source,
          doRecordSource,
        ),
        sourceName: pick(customer?.sourceName, customer?.dealerName, sourceName),
        do_sourceName: pick(
          customer?.sourceName,
          customer?.dealerName,
          doSourceName,
        ),
      });
    },
    [
      city,
      customerName,
      doCity,
      doCustomerName,
      doPincode,
      doRecordSource,
      doResidenceAddress,
      doSourceName,
      form,
      pick,
      pincode,
      primaryMobile,
      recordSource,
      residenceAddress,
      sourceName,
    ],
  );

  const runCustomerSearch = useCallback(async (term) => {
    const q = String(term || "").trim();
    if (q.length < 2) {
      setCustomerOptions([]);
      setCustomerSearchLoading(false);
      return;
    }

    const reqId = ++customerSearchReqRef.current;
    setCustomerSearchLoading(true);
    try {
      const res = await customersApi.search(q, { limit: 20 });
      if (reqId !== customerSearchReqRef.current) return;
      const rows = Array.isArray(res?.data) ? res.data : [];
      const opts = rows.map((customer) => ({
        value: customer?.customerName || "",
        label: `${customer?.customerName || "Unknown"}${
          customer?.primaryMobile ? ` • ${customer.primaryMobile}` : ""
        }${customer?.panNumber ? ` • ${customer.panNumber}` : ""}`,
        customer,
      }));
      setCustomerOptions(opts);
    } catch (error) {
      if (reqId !== customerSearchReqRef.current) return;
      console.error("Customer autosuggest failed in DO:", error);
      setCustomerOptions([]);
    } finally {
      if (reqId === customerSearchReqRef.current) {
        setCustomerSearchLoading(false);
      }
    }
  }, []);

  const handleCustomerSearch = useCallback(
    (term) => {
      const q = String(term || "").trim();
      if (customerSearchTimerRef.current) {
        clearTimeout(customerSearchTimerRef.current);
      }
      if (q.length < 2) {
        setCustomerOptions([]);
        setCustomerSearchLoading(false);
        return;
      }
      customerSearchTimerRef.current = setTimeout(() => {
        runCustomerSearch(q);
      }, 220);
    },
    [runCustomerSearch],
  );

  useEffect(
    () => () => {
      if (customerSearchTimerRef.current) {
        clearTimeout(customerSearchTimerRef.current);
      }
    },
    [],
  );


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
          <UserOutlined style={{ color: isDarkMode ? "#f3f4f6" : "#111827" }} />
          <div>
            <HeadingLabel>Customer details</HeadingLabel>
            <SoftValue color={isDarkMode ? "#f3f4f6" : "#111827"}>Customer & DO header</SoftValue>
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
            border: `1px solid ${isDarkMode ? "#3a3a3a" : "#d1d5db"}`,
            background: isDarkMode ? "#202020" : "#fff",
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
              color: isDarkMode ? "#f3f4f6" : "#111827",
            }}
          >
            {doRefNo || "Auto-generated"}
          </div>
        </div>
      </div>
    ),
    [doRefNo, isDarkMode],
  );

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
      {TopStrip}

      <Divider style={{ margin: "8px 0 14px" }} />

      <Row gutter={[32, 12]}>
        {/* LEFT: DO header fields */}
        <Col
          xs={24}
          lg={14}
          style={{
            borderRight: `1px solid ${isDarkMode ? "#303030" : "#e5e7eb"}`,
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
                <Form.Item name="customerName" style={{ marginBottom: 0 }}>
                  <AutoComplete
                    allowClear
                    options={customerOptions}
                    onSearch={handleCustomerSearch}
                    onSelect={(_, option) => applyCustomerAutofill(option?.customer || {})}
                    notFoundContent={
                      customerSearchLoading ? (
                        <div style={{ padding: 8, textAlign: "center" }}>
                          <Spin size="small" />
                        </div>
                      ) : null
                    }
                  >
                    <Input
                      bordered={false}
                      size="small"
                      placeholder="Search customer by name / mobile / PAN"
                      disabled={readOnly}
                    />
                  </AutoComplete>
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Mobile Number">
                <Form.Item name="primaryMobile" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="Primary mobile"
                    disabled={readOnly}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Source">
                <Form.Item name="recordSource" style={{ marginBottom: 0 }}>
                  <Select
                    bordered={false}
                    size="small"
                    disabled={readOnly}
                    options={[
                      { value: "Direct", label: "Direct" },
                      { value: "Indirect", label: "Indirect" },
                    ]}
                    placeholder="Select source"
                    allowClear
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Source Name">
                <Form.Item name="sourceName" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="Source / showroom / channel name"
                    disabled={readOnly}
                  />
                </Form.Item>
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
            <Form.Item name="residenceAddress" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={2}
                bordered={false}
                placeholder="Customer address"
                disabled={readOnly}
                style={{ padding: 0, resize: "none", background: "transparent" }}
              />
            </Form.Item>
          </InlineField>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <InlineField label="City">
                <Form.Item name="city" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="City"
                    disabled={readOnly}
                  />
                </Form.Item>
              </InlineField>
            </Col>

            <Col xs={24} md={12}>
              <InlineField label="Pincode">
                <Form.Item name="pincode" style={{ marginBottom: 0 }}>
                  <Input
                    bordered={false}
                    size="small"
                    placeholder="Pincode"
                    disabled={readOnly}
                  />
                </Form.Item>
              </InlineField>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default DOSectionCustomerDetails;
