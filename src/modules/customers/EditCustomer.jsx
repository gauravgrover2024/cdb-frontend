// src/modules/customers/EditCustomer.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form, Button, Space, message, Divider, Spin } from "antd";
import dayjs from "dayjs";
import {
  IdcardOutlined,
  SolutionOutlined,
  ProfileOutlined,
  FileProtectOutlined,
  BankOutlined,
  TeamOutlined,
  PhoneOutlined,
  HomeOutlined,
  SaveOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import PersonalDetails from "./customer-form/PersonalDetails";
import EmploymentDetails from "./customer-form/EmploymentDetails";
import IncomeDetails from "./customer-form/IncomeDetails";
import KycDetails from "./customer-form/KycDetails";
import BankDetails from "./customer-form/BankDetails";
import ReferenceDetails from "./customer-form/ReferenceDetails";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

const sectionsConfig = [
  {
    key: "personal",
    label: "Personal",
    targetId: "section-personal",
    icon: <IdcardOutlined />,
  },
  {
    key: "employment",
    label: "Employment",
    targetId: "section-employment",
    icon: <SolutionOutlined />,
  },
  {
    key: "income",
    label: "Income",
    targetId: "section-income",
    icon: <ProfileOutlined />,
  },
  {
    key: "bank",
    label: "Bank",
    targetId: "section-bank",
    icon: <BankOutlined />,
  },
  {
    key: "references",
    label: "References",
    targetId: "section-other",
    icon: <TeamOutlined />,
  },
  {
    key: "kyc",
    label: "KYC",
    targetId: "section-kyc",
    icon: <FileProtectOutlined />,
  },
];

// -----------------------------
// API helpers
// -----------------------------
const fetchCustomerById = async (id) => {
  // ✅ Correct Next.js API path
  const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("❌ /api/customers/[id] returned non-JSON:", text);
    throw new Error("Customer API returned invalid response (not JSON)");
  }

  if (!res.ok) {
    throw new Error(data?.error || "Failed to load customer");
  }

  return data?.data || null;
};

const updateCustomerById = async (id, payload) => {
  // ✅ Correct Next.js API path
  const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("❌ PUT /api/customers/[id] returned non-JSON:", text);
    throw new Error("Customer API returned invalid response (not JSON)");
  }

  if (!res.ok) {
    throw new Error(data?.error || "Failed to update customer");
  }

  return data?.data || null;
};

// -----------------------------
// Component
// -----------------------------
const EditCustomer = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState("personal");

  const [headerInfo, setHeaderInfo] = useState({
    name: "",
    mobile: "",
    city: "",
    pan: "",
  });

  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Header height (for correct scroll offset)
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(180);

  // Autosave timer
  const autosaveTimer = useRef(null);

  // -----------------------------
  // Measure header height
  // -----------------------------
  useEffect(() => {
    const measure = () => {
      if (!headerRef.current) return;
      const h = headerRef.current.getBoundingClientRect().height;
      if (h && h > 100) setHeaderHeight(h);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // -----------------------------
  // Load customer from Mongo
  // -----------------------------
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);

        const found = await fetchCustomerById(id);

        if (!found) {
          message.error("Customer not found");
          navigate("/customers");
          return;
        }

        setCustomer(found);

        // Patch dates into dayjs
        form.setFieldsValue({
          customerName: found.customerName || "",
          sdwOf: found.sdwOf || "",
          gender: found.gender || "",
          dob: found.dob ? dayjs(found.dob) : null,
          motherName: found.motherName || "",
          residenceAddress: found.residenceAddress || "",
          pincode: found.pincode || "",
          city: found.city || "",
          yearsInCurrentHouse: found.yearsInCurrentHouse || "",
          houseType: found.houseType || "",
          education: found.education || "",
          maritalStatus: found.maritalStatus || "",
          dependents: found.dependents || "",
          primaryMobile: found.primaryMobile || "",
          extraMobiles: found.extraMobiles || [],
          email: found.email || "",
          nomineeName: found.nomineeName || "",
          nomineeDob: found.nomineeDob ? dayjs(found.nomineeDob) : null,
          nomineeRelation: found.nomineeRelation || "",

          occupationType: found.occupationType || "",
          companyName: found.companyName || "",
          companyType: found.companyType || "",
          businessNature: found.businessNature || [],
          employmentAddress: found.employmentAddress || "",
          employmentPincode: found.employmentPincode || "",
          employmentCity: found.employmentCity || "",
          employmentPhone: found.employmentPhone || "",
          salaryMonthly: found.salaryMonthly || "",
          designation: found.designation || "",
          incorporationYear: found.incorporationYear || "",

          panNumber: found.panNumber || "",
          itrYears: found.itrYears || "",

          bankName: found.bankName || "",
          accountNumber: found.accountNumber || "",
          ifsc: found.ifsc || "",
          branch: found.branch || "",
          accountSinceYears: found.accountSinceYears || "",
          accountType: found.accountType || "",

          reference1: found.reference1 || null,
          reference2: found.reference2 || null,

          aadhaarNumber: found.aadhaarNumber || "",
          passportNumber: found.passportNumber || "",
          gstNumber: found.gstNumber || "",
          dlNumber: found.dlNumber || "",
        });

        setHeaderInfo({
          name: found.customerName || "",
          mobile: found.primaryMobile || "",
          city: found.city || "",
          pan: found.panNumber || "",
        });

        setHasLoaded(true);
      } catch (err) {
        console.error("Load Customer Error:", err);
        message.error("Failed to load customer ❌");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, form, navigate]);

  // -----------------------------
  // Scroll helper (scroll inside #app-scroll-container)
  // -----------------------------
  const scrollToSection = (targetId) => {
    const container = document.getElementById("app-scroll-container");
    const el = document.getElementById(targetId);

    if (!container || !el) return;

    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;

    const SCROLL_OFFSET = headerHeight + 16;

    const scrollTop =
      container.scrollTop + (elTop - containerTop) - SCROLL_OFFSET;

    container.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
  };

  // -----------------------------
  // Scroll Spy (active pill highlight)
  // -----------------------------
  useEffect(() => {
    const container = document.getElementById("app-scroll-container");
    if (!container) return;

    const onScroll = () => {
      const OFFSET = headerHeight + 16;

      const offsets = sectionsConfig.map((s) => {
        const el = document.getElementById(s.targetId);
        if (!el) return { key: s.key, top: Infinity };
        return { key: s.key, top: el.getBoundingClientRect().top };
      });

      const visible = offsets.reduce((prev, curr) =>
        Math.abs(curr.top - OFFSET) < Math.abs(prev.top - OFFSET) ? curr : prev,
      );

      if (visible.key && visible.key !== activeSection) {
        setActiveSection(visible.key);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => container.removeEventListener("scroll", onScroll);
  }, [activeSection, headerHeight]);

  // -----------------------------
  // Header live update
  // -----------------------------
  const onValuesChange = (_, allValues) => {
    setHeaderInfo({
      name: allValues.customerName || "",
      mobile: allValues.primaryMobile || "",
      city: allValues.city || "",
      pan: allValues.panNumber || "",
    });
  };

  // -----------------------------
  // Autosave (debounced) - only after initial load
  // -----------------------------
  const valuesSnapshot = Form.useWatch([], form);

  const autosavePayload = useMemo(() => {
    if (!valuesSnapshot) return null;

    return {
      ...valuesSnapshot,
      dob: valuesSnapshot?.dob ? valuesSnapshot.dob.format("YYYY-MM-DD") : "",
      nomineeDob: valuesSnapshot?.nomineeDob
        ? valuesSnapshot.nomineeDob.format("YYYY-MM-DD")
        : "",
      updatedAt: new Date().toISOString(),
    };
  }, [valuesSnapshot]);

  useEffect(() => {
    if (!id) return;
    if (!hasLoaded) return;
    if (!autosavePayload) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(async () => {
      try {
        await updateCustomerById(id, autosavePayload);
      } catch (err) {
        console.error("Autosave Error:", err);
      }
    }, 800);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [id, hasLoaded, autosavePayload]);

  // -----------------------------
  // Manual Save buttons
  // -----------------------------
  const handleSaveOnly = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const values = await form.validateFields();

      const payload = {
        ...values,
        dob: values?.dob ? values.dob.format("YYYY-MM-DD") : "",
        nomineeDob: values?.nomineeDob
          ? values.nomineeDob.format("YYYY-MM-DD")
          : "",
        updatedAt: new Date().toISOString(),
      };

      await updateCustomerById(id, payload);

      message.success("Saved ✅");
    } catch (err) {
      console.error("Save Error:", err);
      message.error("Save failed ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    try {
      await handleSaveOnly();
      navigate("/customers");
    } catch (err) {
      // already handled
    }
  };

  // -----------------------------
  // UI helper chip
  // -----------------------------
  const InfoChip = ({ icon, value, placeholder }) => (
    <Space
      size={6}
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: "#ffffff",
        border: "1px solid #f0f0f0",
        fontSize: 12,
      }}
    >
      {icon}
      <span style={{ color: value ? "#262626" : "#8c8c8c" }}>
        {value || placeholder}
      </span>
    </Space>
  );

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!customer) {
    return <div style={{ padding: 24 }}>Customer not found</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Same width wrapper for header + form */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Sticky Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "transparent",
          }}
        >
          <div
            ref={headerRef}
            style={{
              background: "#ffffff",
              border: "1px solid #f0f0f0",
              borderRadius: 14,
              padding: "12px 14px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  Customer Master
                </div>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                  Edit Customer
                </div>
              </div>

              <Space wrap>
                <Button
                  icon={<LogoutOutlined />}
                  size="small"
                  onClick={handleSaveAndExit}
                >
                  Save & Exit
                </Button>

                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  size="small"
                  loading={saving}
                  onClick={handleSaveOnly}
                >
                  Save
                </Button>
              </Space>
            </div>

            <Divider style={{ margin: "10px 0" }} />

            {/* Info row */}
            <Space wrap>
              <InfoChip
                icon={<IdcardOutlined style={{ color: "#8c8c8c" }} />}
                value={headerInfo.name}
                placeholder="Name"
              />
              <InfoChip
                icon={<PhoneOutlined style={{ color: "#8c8c8c" }} />}
                value={headerInfo.mobile}
                placeholder="Mobile"
              />
              <InfoChip
                icon={<HomeOutlined style={{ color: "#8c8c8c" }} />}
                value={headerInfo.city}
                placeholder="City"
              />
              <InfoChip
                icon={<ProfileOutlined style={{ color: "#8c8c8c" }} />}
                value={headerInfo.pan}
                placeholder="PAN"
              />

              <div style={{ fontSize: 12, color: "#8c8c8c", marginLeft: 8 }}>
                ID: <b>{id}</b>
              </div>
            </Space>

            {/* Section pills */}
            <div style={{ marginTop: 10 }}>
              <Space size={8} wrap>
                {sectionsConfig.map((s) => {
                  const active = activeSection === s.key;

                  return (
                    <div
                      key={s.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => scrollToSection(s.targetId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") scrollToSection(s.targetId);
                      }}
                      style={{
                        cursor: "pointer",
                        userSelect: "none",
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: active ? "#f0f5ff" : "#fafafa",
                        border: active
                          ? "1px solid #adc6ff"
                          : "1px solid #f0f0f0",
                        color: active ? "#1d39c4" : "#595959",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {React.cloneElement(s.icon, {
                        style: {
                          fontSize: 14,
                          color: active ? "#1d39c4" : "#8c8c8c",
                        },
                      })}
                      {s.label}
                    </div>
                  );
                })}
              </Space>
            </div>
          </div>
        </div>

        {/* Form starts below header */}
        <div style={{ paddingTop: 14 }}>
          <Form
            id="customer-form"
            form={form}
            layout="vertical"
            onValuesChange={onValuesChange}
          >
            <PersonalDetails />
            <EmploymentDetails />
            <IncomeDetails />
            <BankDetails />
            <ReferenceDetails />
            <KycDetails />
          </Form>
        </div>
      </div>
    </div>
  );
};

export default EditCustomer;
