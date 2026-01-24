import React, { useEffect, useRef, useState } from "react";
import { Form, Button, Space, message, Divider } from "antd";
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
import { useNavigate } from "react-router-dom";

import PersonalDetails from "./customer-form/PersonalDetails";
import EmploymentDetails from "./customer-form/EmploymentDetails";
import IncomeDetails from "./customer-form/IncomeDetails";
import KycDetails from "./customer-form/KycDetails";
import BankDetails from "./customer-form/BankDetails";
import ReferenceDetails from "./customer-form/ReferenceDetails";

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

const AddCustomer = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("personal");

  const [headerInfo, setHeaderInfo] = useState({
    name: "",
    mobile: "",
    city: "",
    pan: "",
  });

  const [customerId, setCustomerId] = useState(null);

  const creatingRef = useRef(false);
  const autosaveTimer = useRef(null);

  // Header height (used to ensure form starts below sticky header)
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(180);

  // -----------------------------
  // Measure header height (so form starts below it)
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
  // Scroll helper (scroll inside #app-scroll-container)
  // -----------------------------
  const scrollToSection = (targetId) => {
    const container = document.getElementById("app-scroll-container");
    const el = document.getElementById(targetId);

    if (!container || !el) return;

    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;

    // dynamic offset = sticky header height + small gap
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

        const rect = el.getBoundingClientRect();
        return { key: s.key, top: rect.top };
      });

      const visible = offsets.reduce((prev, curr) =>
        Math.abs(curr.top - OFFSET) < Math.abs(prev.top - OFFSET) ? curr : prev
      );

      if (visible.key && visible.key !== activeSection) {
        setActiveSection(visible.key);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on load

    return () => container.removeEventListener("scroll", onScroll);
  }, [activeSection, headerHeight]);

  // -----------------------------
  // Cleanup autosave timer
  // -----------------------------
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  // -----------------------------
  // Create customer ONLY when required
  // -----------------------------
  const createCustomerIfNeeded = async () => {
    if (customerId) return customerId;
    if (creatingRef.current) return null;

    creatingRef.current = true;

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerType: "New",
          kycStatus: "In Progress",
          createdOn: new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        }),
      });

      if (!res.ok) throw new Error("Failed to create customer");

      const data = await res.json();
      const id = data?._id;

      if (!id) throw new Error("Customer id missing from response");

      setCustomerId(id);
      return id;
    } catch (err) {
      console.error("Create Customer Error:", err);
      message.error("Failed to create customer ❌");
      return null;
    } finally {
      creatingRef.current = false;
    }
  };

  // -----------------------------
  // Save to mongo (PUT)
  // -----------------------------
  const saveToMongo = async (values) => {
    const id = await createCustomerIfNeeded();
    if (!id) throw new Error("Customer ID not available");

    const payload = {
      ...values,
      customerType: "New",
      kycStatus: values?.kycStatus || "In Progress",
      createdOn:
        values?.createdOn ||
        new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    };

    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to save customer");
  };

  // -----------------------------
  // Check meaningful input
  // -----------------------------
  const hasMeaningfulData = (values) => {
    return (
      (values?.customerName && values.customerName.trim()) ||
      (values?.primaryMobile && values.primaryMobile.trim()) ||
      (values?.panNumber && values.panNumber.trim())
    );
  };

  // -----------------------------
  // Header live update + autosave debounce
  // -----------------------------
  const onValuesChange = (_, allValues) => {
    setHeaderInfo({
      name: allValues.customerName || "",
      mobile: allValues.primaryMobile || "",
      city: allValues.city || "",
      pan: allValues.panNumber || "",
    });

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(() => {
      if (!hasMeaningfulData(allValues)) return;

      saveToMongo(allValues).catch((err) => {
        console.error("Customer Autosave Error:", err);
      });
    }, 700);
  };

  // -----------------------------
  // Save buttons
  // -----------------------------
  const handleSaveOnly = async () => {
    try {
      const values = form.getFieldsValue(true);

      if (!hasMeaningfulData(values)) {
        message.warning("Please enter Name / Mobile / PAN before saving");
        return;
      }

      await saveToMongo(values);
      message.success("Saved ✅");
    } catch (err) {
      console.error("Save Error:", err);
      message.error("Save failed ❌");
    }
  };

  const handleSaveAndExit = async () => {
    try {
      const values = form.getFieldsValue(true);

      if (!hasMeaningfulData(values)) {
        message.warning("Please enter Name / Mobile / PAN before saving");
        return;
      }

      await saveToMongo(values);
      message.success("Customer saved ✅");
      navigate("/customers");
    } catch (err) {
      console.error("Save & Exit Error:", err);
      message.error("Save failed ❌");
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

  return (
    <div style={{ padding: 16 }}>
      {/* Same width wrapper for header + form */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ✅ Sticky Header (works in scroll container) */}
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
                  Add New Customer
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
                ID: <b>{customerId || "Not created yet"}</b>
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

        {/* ✅ Form starts BELOW sticky header always */}
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

export default AddCustomer;
