// src/modules/delivery-orders/components/DeliveryOrderForm.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  DatePicker,
  Input,
  message,
  Checkbox,
} from "antd";
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

// ✅ SECTIONS
import Section2DealerDetails from "./sections/Section2DealerDetails";
import Section3VehicleDetailsShowroom from "./sections/Section3VehicleDetailsShowroom";
import Section4VehicleDetailsCustomer from "./sections/Section4VehicleDetailsCustomer";
import Section5DODetails from "./sections/Section5DODetails";

// -------------------------------------
// Helpers
// -------------------------------------
const generateDONumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0");
  return `DO-${year}-${random}`;
};

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const toDayjs = (v) => {
  if (!v) return undefined;
  if (dayjs.isDayjs(v)) return v;
  const d = dayjs(v);
  return d.isValid() ? d : undefined;
};

// -------------------------------------
// Main Component
// -------------------------------------
const DeliveryOrderForm = () => {
  const navigate = useNavigate();
  const { loanId } = useParams();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // Watch checkbox for Section 4
  // -----------------------------
  const showCustomerVehicleSection = Form.useWatch(
    "do_showCustomerVehicleSection",
    form
  );

  // -------------------------------------
  // Load Loan from localStorage (prefill)
  // -------------------------------------
  const loanData = useMemo(() => {
    const editingLoanRaw = localStorage.getItem("editingLoan");
    if (editingLoanRaw) {
      try {
        const parsed = JSON.parse(editingLoanRaw);
        return parsed || null;
      } catch (e) {
        return null;
      }
    }

    const savedLoansRaw = localStorage.getItem("savedLoans");
    if (savedLoansRaw && loanId) {
      try {
        const saved = JSON.parse(savedLoansRaw || "[]");
        const match = saved.find((x) => x.loanId === loanId || x.id === loanId);
        return match || null;
      } catch (e) {
        return null;
      }
    }

    return null;
  }, [loanId]);

  // -------------------------------------
  // ✅ Load Saved DO (Edit/View populate)
  // -------------------------------------
  useEffect(() => {
    if (!loanId) return;

    const savedDOs = JSON.parse(localStorage.getItem("savedDOs") || "[]");

    const foundDO =
      (savedDOs || []).find((d) => d?.loanId === loanId) ||
      (savedDOs || []).find((d) => d?.do_loanId === loanId);

    // ✅ If DO exists → populate form from saved DO and STOP
    if (foundDO) {
      const patched = { ...foundDO };

      // ✅ convert any ISO string date fields to dayjs
      Object.keys(patched).forEach((key) => {
        if (
          key.toLowerCase().includes("date") &&
          typeof patched[key] === "string"
        ) {
          const d = dayjs(patched[key]);
          patched[key] = d.isValid() ? d : undefined;
        }
      });

      form.setFieldsValue({
        ...patched,
        do_loanId: patched?.do_loanId || patched?.loanId || loanId,
        loanId: patched?.loanId || patched?.do_loanId || loanId,
      });

      return;
    }

    // ❌ If no DO exists, do nothing here (new DO will be handled in next effect)
  }, [loanId, form]);

  // -------------------------------------
  // ✅ Prefill ONLY when DO not found
  // -------------------------------------
  useEffect(() => {
    if (!loanId) return;

    const savedDOs = JSON.parse(localStorage.getItem("savedDOs") || "[]");

    const foundDO =
      (savedDOs || []).find((d) => d?.loanId === loanId) ||
      (savedDOs || []).find((d) => d?.do_loanId === loanId);

    // ✅ DO exists → don't overwrite it
    if (foundDO) return;

    const existing = form.getFieldsValue(true);

    // DO meta
    if (!existing.do_date) form.setFieldsValue({ do_date: dayjs() });

    if (!existing.do_refNo) {
      form.setFieldsValue({ do_refNo: generateDONumber() });
    }

    // Default checkbox OFF
    if (existing.do_showCustomerVehicleSection === undefined) {
      form.setFieldsValue({ do_showCustomerVehicleSection: false });
    }

    // Loan Id
    if (!existing.do_loanId) {
      form.setFieldsValue({
        do_loanId: loanData?.loanId || loanId || "",
      });
    }

    // Customer Details (from Customer Profile)
    form.setFieldsValue({
      customerName: safeText(loanData?.customerName),
      residenceAddress: safeText(loanData?.residenceAddress),
      pincode: safeText(loanData?.pincode),
      city: safeText(loanData?.city),

      recordSource: safeText(loanData?.recordSource),
      sourceName: safeText(loanData?.sourceName),
      dealerMobile: safeText(loanData?.dealerMobile),
      dealerAddress: safeText(loanData?.dealerAddress),
    });
  }, [form, loanData, loanId]);

  // -------------------------------------
  // Actions
  // -------------------------------------
  const handleDiscardAndExit = () => {
    form.resetFields();
    navigate("/delivery-orders");
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const allDOs = JSON.parse(localStorage.getItem("savedDOs") || "[]");

      const payload = {
        ...values,
        loanId: values.do_loanId || loanData?.loanId || loanId,
        updatedAt: new Date().toISOString(),
        createdAt: values?.createdAt || new Date().toISOString(),
      };

      const idx = allDOs.findIndex(
        (x) => x.loanId === payload.loanId || x.do_loanId === payload.loanId
      );

      if (idx >= 0) {
        allDOs[idx] = { ...allDOs[idx], ...payload };
      } else {
        allDOs.push(payload);
      }

      localStorage.setItem("savedDOs", JSON.stringify(allDOs));
      message.success("Delivery Order saved successfully");
    } catch (err) {
      // validation errors
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // -------------------------------------
  // UI
  // -------------------------------------
  return (
    <div style={{ padding: 20 }}>
      {/* TOP ACTION BAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/delivery-orders")}
        >
          Back
        </Button>

        <div style={{ display: "flex", gap: 10 }}>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print DO
          </Button>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={loading}
            onClick={handleSave}
          >
            Save
          </Button>

          <Button danger onClick={handleDiscardAndExit}>
            Discard & Exit DO
          </Button>
        </div>
      </div>

      <Form form={form} layout="vertical">
        {/* ========================= */}
        {/* DO DETAILS BLOCK */}
        {/* ========================= */}
        <Card style={{ borderRadius: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            Delivery Order Details
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item label="DO Date" name="do_date">
                <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="DO Ref No" name="do_refNo">
                <Input placeholder="Auto generated" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Loan ID" name="do_loanId">
                <Input placeholder="Loan ID" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <div style={{ height: 16 }} />

        {/* ========================= */}
        {/* CUSTOMER DETAILS BLOCK */}
        {/* ========================= */}
        <Card style={{ borderRadius: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            Customer Details
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item label="Customer Name" name="customerName">
                <Input placeholder="Customer name" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Address" name="residenceAddress">
                <Input placeholder="Customer address" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Pincode" name="pincode">
                <Input placeholder="Pincode" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="City" name="city">
                <Input placeholder="City" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Source" name="recordSource">
                <Input placeholder="Direct / Indirect" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 10,
                  background: "#fafafa",
                  border: "1px dashed #e0e0e0",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Source Details
                </div>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer / Channel Name" name="sourceName">
                      <Input placeholder="Dealer / Channel" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer Mobile" name="dealerMobile">
                      <Input placeholder="Dealer mobile" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer Address" name="dealerAddress">
                      <Input placeholder="Dealer address" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Card>

        <div style={{ height: 16 }} />

        {/* ========================= */}
        {/* SECTION 2 */}
        {/* ========================= */}
        <Section2DealerDetails form={form} loan={loanData} />

        <div style={{ height: 16 }} />

        {/* ========================= */}
        {/* SECTION 3 — Showroom Vehicle Details */}
        {/* ========================= */}
        <Section3VehicleDetailsShowroom loan={loanData} />

        <div style={{ height: 16 }} />

        {/* ========================= */}
        {/* SECTION 4 — Customer Vehicle Details */}
        {/* ========================= */}
        <Card style={{ borderRadius: 12 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                Vehicle Details (Customer Account)
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                Enable this only if you want DO calculation based on customer
                account pricing.
              </div>
            </Col>

            <Col>
              <Form.Item
                name="do_showCustomerVehicleSection"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox>Enable</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {showCustomerVehicleSection && (
          <>
            <div style={{ height: 16 }} />
            <Section4VehicleDetailsCustomer loan={loanData} />
          </>
        )}

        <div style={{ height: 16 }} />

        {/* ========================= */}
        {/* SECTION 5 — DO DETAILS */}
        {/* ========================= */}
        <Section5DODetails loan={loanData} />

        <div style={{ height: 20 }} />
      </Form>
    </div>
  );
};

export default DeliveryOrderForm;
