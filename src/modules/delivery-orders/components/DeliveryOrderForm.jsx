// src/modules/delivery-orders/components/DeliveryOrderForm.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
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

import DOSectionCustomerDetails from "./sections/DOSectionCustomerDetails";
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
  const res = await fetch(`/api/do/${loanId}`);
  if (!res.ok) throw new Error("Failed to fetch DO");
  return res.json(); // can be null
};

const saveDOByLoanId = async (loanId, payload) => {
  const res = await fetch(`/api/do/${loanId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save DO");
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
    form,
  );

  const [hasLoadedDO, setHasLoadedDO] = useState(false);
  const [existingDO, setExistingDO] = useState(null);

  const lastSaveAtRef = useRef(0);

  // Load Loan from localStorage (prefill)
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
  // ✅ Load Saved DO from API
  // -------------------------------------
  useEffect(() => {
    if (!loanId) return;

    const load = async () => {
      try {
        const foundDO = await fetchDOByLoanId(loanId);

        if (!foundDO) {
          setHasLoadedDO(true);
          return;
        }

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
        {/* NEW: Section 1 – DO + Customer (same data, moved into component) */}
        <DOSectionCustomerDetails form={form} readOnly={false} />

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
