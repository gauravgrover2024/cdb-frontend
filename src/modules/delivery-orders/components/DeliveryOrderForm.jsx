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
  Tag,
  Switch,
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

import DOSectionCustomerDetails from "./sections/DOSectionCustomerDetails";
import Section2DealerDetails from "./sections/Section2DealerDetails";
import Section3VehicleDetailsShowroom from "./sections/Section3VehicleDetailsShowroom";
import Section4VehicleDetailsCustomer from "./sections/Section4VehicleDetailsCustomer";
import Section5DODetails from "./sections/Section5DODetails";
import PrintButton from "../../../print/PrintButton";
import { DOPrint } from "../../../print/PrintFormats";

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

const getLoanDisbursementDate = (loan = {}) => {
  const candidates = [
    loan?.latestBusinessDate,
    loan?.delivery_date,
    loan?.deliveryDate,
    loan?.do_date,
    loan?.doDate,
    loan?.invoice_date,
    loan?.invoiceDate,
    loan?.approval_disbursedDate,
    loan?.disbursement_date,
    loan?.disbursementDate,
    loan?.disbursedDate,
    loan?.disburseDate,
    loan?.postfile_disbursementDate,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = dayjs(candidate);
    if (parsed.isValid()) return parsed;
  }
  return null;
};

const LEGACY_CUTOFF = dayjs("2026-02-01T00:00:00.000Z");

const isLegacyNewCarAutoCreateBlocked = (loan = {}) => {
  const loanType = safeText(loan?.typeOfLoan || loan?.loanType)
    .trim()
    .toLowerCase();
  if (loanType !== "new car") return false;
  const disbDate = getLoanDisbursementDate(loan);
  if (!disbDate) return false;
  return disbDate.isBefore(LEGACY_CUTOFF);
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
  return await deliveryOrdersApi.update(loanId, payload);
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
  const [hasLoadedLoanContext, setHasLoadedLoanContext] = useState(false);
  const [existingDO, setExistingDO] = useState(null);
  const lastSaveAtRef = useRef(0);
  const legacyAutoCreateNoticeShownRef = useRef(false);
  const [loanData, setLoanData] = useState(null);

  // Load Loan from API (prefill) with sessionStorage fallback
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

      const editingLoanRaw = sessionStorage.getItem("editingLoan");
      if (editingLoanRaw) {
        try {
          const parsed = JSON.parse(editingLoanRaw);
          setLoanData(parsed || null);
          return;
        } catch (e) {
          // ignore
        }
      }

      const savedLoansRaw = sessionStorage.getItem("savedLoans");
      if (savedLoansRaw && loanId) {
        try {
          const saved = JSON.parse(savedLoansRaw || "[]");
          const match = saved.find(
            (x) => x.loanId === loanId || x.id === loanId,
          );
          setLoanData(match || null);
          return;
        } catch (e) {
          // ignore
        }
      }

      setLoanData(null);
    };

    load().finally(() => {
      setHasLoadedLoanContext(true);
    });
  }, [loanId]);

  // Load existing DO
  useEffect(() => {
    if (!loanId) return;
    if (!hasLoadedLoanContext) return;

    if (!loanData) {
      setHasLoadedDO(true);
      return;
    }

    if (isLegacyNewCarAutoCreateBlocked(loanData || {})) {
      setHasLoadedDO(true);
      return;
    }

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
  }, [loanId, form, hasLoadedLoanContext, loanData]);

  // Prefill defaults ONLY when empty
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

  // Autosave DO (Debounced)
  const allValues = Form.useWatch([], form);
  const debouncedValues = useDebounce(allValues, 800);

  useEffect(() => {
    if (!loanId) return;
    if (!hasLoadedLoanContext) return;
    if (!hasLoadedDO) return;

    const autosave = async () => {
      try {
        const hasExistingDODoc = Boolean(
          existingDO?._id || existingDO?.loanId || existingDO?.do_loanId,
        );
        if (!hasExistingDODoc && !loanData) return;
        const blockLegacyAutoCreate =
          !hasExistingDODoc && isLegacyNewCarAutoCreateBlocked(loanData || {});
        if (blockLegacyAutoCreate) {
          if (!legacyAutoCreateNoticeShownRef.current) {
            legacyAutoCreateNoticeShownRef.current = true;
            message.info(
              "Auto DO creation is paused for New Car loans delivered/disbursed before 1 Feb 2026.",
            );
          }
          return;
        }

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

        const saveRes = await saveDOByLoanId(finalLoanId, payload);
        if (saveRes?.skipped || saveRes?.data === null) return;
        setExistingDO(payload);

        const now = Date.now();
        if (now - lastSaveAtRef.current > 5000) {
          lastSaveAtRef.current = now;
        }
      } catch (err) {
        console.error("Autosave DO Error:", err);
      }
    };

    autosave();
  }, [loanId, hasLoadedLoanContext, hasLoadedDO, debouncedValues, existingDO, loanData]);

  // Actions
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

      const saveRes = await saveDOByLoanId(finalLoanId, payload);
      if (saveRes?.skipped || saveRes?.data === null) {
        message.warning(
          "DO creation is paused for New Car loans delivered/disbursed before 1 Feb 2026.",
        );
        return;
      }
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

  // UI
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "16px 16px 32px",
      }}
    >
      {/* full width, no maxWidth container */}
      <div>
        {/* TOP ACTION BAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/delivery-orders")}
          >
            Back
          </Button>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
          {/* HEADER BANNER */}
          <Card
            style={{
              borderRadius: 16,
              marginBottom: 16,
              border: "1px solid #e5e7eb",
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Row align="middle" justify="space-between">
              <Col>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: "#6b7280",
                  }}
                >
                  Delivery order
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 18,
                    marginTop: 2,
                    color: "#111827",
                  }}
                >
                  Delivery Order for Loan #{loanId}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 4,
                  }}
                >
                  Review dealer, vehicle and delivery details before handing
                  over the vehicle.
                </div>
              </Col>

              <Col>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  <Tag color="blue">Loan ID: {loanId}</Tag>
                  {existingDO && <Tag color="green">Existing DO</Tag>}
                </div>
              </Col>
            </Row>
          </Card>
          {/* SECTION 1 — Customer & DO Header */}
          <DOSectionCustomerDetails form={form} readOnly={false} />
          {/* SECTION 2 */}
          <Section2DealerDetails form={form} loan={loanData} />
          {/* SECTION 3 — Showroom Vehicle Details */}
          <Section3VehicleDetailsShowroom loan={loanData} />
          {/* SECTION 4 — Customer account vehicle section toggle */}
          <Card
            style={{ borderRadius: 16, marginTop: 16 }}
            bodyStyle={{ padding: 16 }}
          >
            <Row align="middle" justify="space-between" gutter={[16, 8]}>
              <Col xs={24} md={18}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Customer account
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#111827",
                  }}
                >
                  Enable customer account vehicle details
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 4,
                    maxWidth: 520,
                  }}
                >
                  Turn this on only when Delivery Order calculations should be
                  based on customer account pricing instead of showroom pricing.
                </div>
              </Col>

              <Col
                xs={24}
                md={6}
                style={{ display: "flex", justifyContent: "flex-end" }}
              >
                <Form.Item
                  name="do_showCustomerVehicleSection"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Enable customer account section</Checkbox>
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

          <div style={{ height: 32 }} />

          {/* SECTION 5 — DO DETAILS */}
          <Section5DODetails loan={loanData} />
          <div style={{ height: 24 }} />

          {/* Point 9: Hidden print area — rendered for window.print() */}
          <div style={{ display: "none" }} className="print-area">
            <DOPrint doData={existingDO || {}} loan={loanData || {}} />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default DeliveryOrderForm;
