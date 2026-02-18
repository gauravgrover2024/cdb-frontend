// src/modules/delivery-orders/components/DeliveryOrderForm.jsx

import React, { useEffect, useRef, useState } from "react";
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
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { loansApi } from "../../../api/loans";

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

const patchDateFieldsToDayjs = (obj = {}) => {
  const patched = { ...(obj || {}) };

  Object.keys(patched).forEach((key) => {
    const val = patched[key];

    if (!val) return;

    if (key.toLowerCase().includes("date")) {
      if (dayjs.isDayjs(val)) return;

      if (typeof val === "string") {
        const d = dayjs(val);
        patched[key] = d.isValid() ? d : undefined;
      }
    }
  });

  return patched;
};

const serializeDatesToISO = (obj = {}) => {
  const out = { ...(obj || {}) };

  Object.keys(out).forEach((key) => {
    const val = out[key];
    if (dayjs.isDayjs(val)) {
      out[key] = val.toISOString();
    }
  });

  return out;
};

const useDebounce = (value, delay = 800) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ---- API helpers for DOs ----
const fetchDOByLoanId = async (loanId) => {
  const res = await deliveryOrdersApi.getByLoanId(loanId);
  return res.data || null;
};

const saveDOByLoanId = async (loanId, payload) => {
  await deliveryOrdersApi.update(loanId, payload);
};

// -------------------------------------
// Main Component
// -------------------------------------
const DeliveryOrderForm = () => {
  const navigate = useNavigate();
  const { loanId } = useParams();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const showCustomerVehicleSection = Form.useWatch(
    "do_showCustomerVehicleSection",
    form
  );

  const [hasLoadedDO, setHasLoadedDO] = useState(false);
  const [existingDO, setExistingDO] = useState(null);

  const lastSaveAtRef = useRef(0);

  const [loanData, setLoanData] = useState(null);

  // Load Loan from API (prefill) with localStorage fallback
  useEffect(() => {
    if (!loanId) return;

    const load = async () => {
      try {
        const res = await loansApi.getById(loanId);
        if (res?.data) {
          setLoanData(res.data);
          return;
        }
      } catch (e) {
        // ignore and fall back
      }

      const editingLoanRaw = localStorage.getItem("editingLoan");
      if (editingLoanRaw) {
        try {
          const parsed = JSON.parse(editingLoanRaw);
          setLoanData(parsed || null);
          return;
        } catch (e) {
          // ignore
        }
      }

      const savedLoansRaw = localStorage.getItem("savedLoans");
      if (savedLoansRaw && loanId) {
        try {
          const saved = JSON.parse(savedLoansRaw || "[]");
          const match = saved.find(
            (x) => x.loanId === loanId || x.id === loanId
          );
          setLoanData(match || null);
          return;
        } catch (e) {
          // ignore
        }
      }

      setLoanData(null);
    };

    load();
  }, [loanId]);

  // -------------------------------------
  // ✅ Load Saved DO from API
  // -------------------------------------
  useEffect(() => {
    if (!loanId) return;

    const load = async () => {
      try {
        const foundDO = await fetchDOByLoanId(loanId);

        if (!foundDO) return;

        setExistingDO(foundDO);

        const patched = patchDateFieldsToDayjs(foundDO);

        form.setFieldsValue({
          ...patched,
          do_loanId: patched?.do_loanId || patched?.loanId || loanId,
          loanId: patched?.loanId || patched?.do_loanId || loanId,
        });
      } catch (err) {
        console.error("Load DO Error:", err);
      } finally {
        setHasLoadedDO(true);
      }
    };

    load();
  }, [loanId, form]);

  // -------------------------------------
  // ✅ Prefill defaults ONLY when empty
  // -------------------------------------
  useEffect(() => {
    if (!loanId) return;

    const existing = form.getFieldsValue(true);

    if (!existing.do_date) form.setFieldsValue({ do_date: dayjs() });

    if (!existing.do_refNo) {
      form.setFieldsValue({ do_refNo: generateDONumber() });
    }

    if (existing.do_showCustomerVehicleSection === undefined) {
      form.setFieldsValue({ do_showCustomerVehicleSection: false });
    }

    if (!existing.do_loanId) {
      form.setFieldsValue({
        do_loanId: loanData?.loanId || loanId || "",
      });
    }

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
  // ✅ Autosave DO (Debounced)
  // -------------------------------------
  const allValues = Form.useWatch([], form);
  const debouncedValues = useDebounce(allValues, 800);

  useEffect(() => {
    if (!loanId) return;
    if (!hasLoadedDO) return;

    const autosave = async () => {
      try {
        // if form has nothing meaningful yet, skip
        if (!debouncedValues || typeof debouncedValues !== "object") return;

        const values = serializeDatesToISO(debouncedValues);

        const finalLoanId =
          values?.do_loanId ||
          existingDO?.do_loanId ||
          loanData?.loanId ||
          loanId;

        const payload = {
          ...(existingDO || {}),
          ...values,
          loanId: finalLoanId,
          do_loanId: finalLoanId,
          updatedAt: new Date().toISOString(),
          createdAt: existingDO?.createdAt || new Date().toISOString(),
        };

        await saveDOByLoanId(finalLoanId, payload);

        setExistingDO(payload);

        const now = Date.now();
        if (now - lastSaveAtRef.current > 5000) {
          lastSaveAtRef.current = now;
          // message.success("Auto-saved DO ✅"); // optional
        }
      } catch (err) {
        console.error("Autosave DO Error:", err);
      }
    };

    autosave();
  }, [loanId, hasLoadedDO, debouncedValues, existingDO, loanData]);

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
      const serialized = serializeDatesToISO(values);

      const finalLoanId =
        serialized?.do_loanId ||
        existingDO?.do_loanId ||
        loanData?.loanId ||
        loanId;

      const payload = {
        ...(existingDO || {}),
        ...serialized,
        loanId: finalLoanId,
        do_loanId: finalLoanId,
        updatedAt: new Date().toISOString(),
        createdAt: existingDO?.createdAt || new Date().toISOString(),
      };

      await saveDOByLoanId(finalLoanId, payload);

      setExistingDO(payload);

      message.success("Delivery Order saved successfully ✅");
    } catch (err) {
      console.error("Save DO Error:", err);
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
        {/* DO DETAILS BLOCK */}
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

        {/* CUSTOMER DETAILS BLOCK */}
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

        {/* SECTION 2 */}
        <Section2DealerDetails form={form} loan={loanData} />

        <div style={{ height: 16 }} />

        {/* SECTION 3 — Showroom Vehicle Details */}
        <Section3VehicleDetailsShowroom loan={loanData} />

        <div style={{ height: 16 }} />

        {/* SECTION 4 — Customer Vehicle Details */}
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

        {/* SECTION 5 — DO DETAILS */}
        <Section5DODetails loan={loanData} />

        <div style={{ height: 20 }} />
      </Form>
    </div>
  );
};

export default DeliveryOrderForm;
