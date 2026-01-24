import React, { useEffect, useRef, useState } from "react";
import { Form, Button, Affix, Space, message } from "antd";
import {
  IdcardOutlined,
  SolutionOutlined,
  ProfileOutlined,
  FileProtectOutlined,
  BankOutlined,
  TeamOutlined,
  PhoneOutlined,
  HomeOutlined,
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

  const scrollToSection = (targetId) => {
    const el = document.getElementById(targetId);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const onScroll = () => {
      const offsets = sectionsConfig.map((s) => {
        const el = document.getElementById(s.targetId);
        if (!el) return { key: s.key, top: Infinity };
        return { key: s.key, top: el.getBoundingClientRect().top };
      });

      const visible = offsets.reduce((prev, curr) =>
        Math.abs(curr.top - 96) < Math.abs(prev.top - 96) ? curr : prev
      );

      if (visible.key && visible.key !== activeSection) {
        setActiveSection(visible.key);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeSection]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

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

    if (!res.ok) {
      throw new Error("Failed to save customer");
    }
  };

  const onValuesChange = (_, allValues) => {
    setHeaderInfo({
      name: allValues.customerName || "",
      mobile: allValues.primaryMobile || "",
      city: allValues.city || "",
      pan: allValues.panNumber || "",
    });

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(() => {
      saveToMongo(allValues).catch((err) => {
        console.error("Customer Autosave Error:", err);
      });
    }, 600);
  };

  const handleSaveAndExit = async () => {
    try {
      const values = form.getFieldsValue(true);
      await saveToMongo(values);
      message.success("Customer saved ✅");
      navigate("/customers");
    } catch (err) {
      console.error("Save & Exit Error:", err);
      message.error("Save failed ❌");
    }
  };

  const handleSaveOnly = async () => {
    try {
      const values = form.getFieldsValue(true);
      await saveToMongo(values);
      message.success("Saved ✅");
    } catch (err) {
      console.error("Save Error:", err);
      message.error("Save failed ❌");
    }
  };

  return (
    <div>
      <Affix offsetTop={64}>
        <div
          style={{
            background: "#f8f3ff",
            padding: "10px 18px 12px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16 }}>Customer Master</div>

            <Space>
              <Button size="small" onClick={handleSaveAndExit}>
                Save & Exit
              </Button>

              <Button size="small" type="primary" onClick={handleSaveOnly}>
                Save
              </Button>
            </Space>
          </div>

          <Space size={12} style={{ fontSize: 12, color: "#595959" }} wrap>
            <Space
              size={6}
              style={{
                padding: "2px 8px",
                borderRadius: 12,
                background: "#ffffff",
              }}
            >
              <IdcardOutlined style={{ color: "#8c8c8c" }} />
              <span>{headerInfo.name || "Name not set"}</span>
            </Space>

            <Space
              size={6}
              style={{
                padding: "2px 8px",
                borderRadius: 12,
                background: "#ffffff",
              }}
            >
              <PhoneOutlined style={{ color: "#8c8c8c" }} />
              <span>{headerInfo.mobile || "Mobile"}</span>
            </Space>

            <Space
              size={6}
              style={{
                padding: "2px 8px",
                borderRadius: 12,
                background: "#ffffff",
              }}
            >
              <HomeOutlined style={{ color: "#8c8c8c" }} />
              <span>{headerInfo.city || "City"}</span>
            </Space>

            <Space
              size={6}
              style={{
                padding: "2px 8px",
                borderRadius: 12,
                background: "#ffffff",
              }}
            >
              <ProfileOutlined style={{ color: "#8c8c8c" }} />
              <span>{headerInfo.pan || "PAN"}</span>
            </Space>
          </Space>

          <Space size={6} wrap>
            {sectionsConfig.map((section) => {
              const active = activeSection === section.key;
              return (
                <div
                  key={section.key}
                  onClick={() => scrollToSection(section.targetId)}
                  style={{
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: 16,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: active ? "#ffffff" : "#f4f0ff",
                    color: active ? "#1d39c4" : "#595959",
                    border: active
                      ? "1px solid #adc6ff"
                      : "1px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  {React.cloneElement(section.icon, {
                    style: {
                      fontSize: 14,
                      color: active ? "#1d39c4" : "#8c8c8c",
                    },
                  })}
                  <span>{section.label}</span>
                </div>
              );
            })}
          </Space>

          <div style={{ fontSize: 11, color: "#8c8c8c" }}>
            Mongo ID: <b>{customerId || "not created yet"}</b>
          </div>
        </div>
      </Affix>

      <Form
        id="customer-form"
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        style={{ maxWidth: 1200, marginTop: 16 }}
      >
        <PersonalDetails />
        <EmploymentDetails />
        <IncomeDetails />
        <BankDetails />
        <ReferenceDetails />
        <KycDetails />
      </Form>
    </div>
  );
};

export default AddCustomer;
