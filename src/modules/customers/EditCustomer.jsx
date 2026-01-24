// src/modules/customers/EditCustomer.jsx

import React, { useEffect, useState } from "react";
import { Form, Button, Affix, Space, message } from "antd";
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
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import PersonalDetails from "./customer-form/PersonalDetails";
import EmploymentDetails from "./customer-form/EmploymentDetails";
import IncomeDetails from "./customer-form/IncomeDetails";
import KycDetails from "./customer-form/KycDetails";
import BankDetails from "./customer-form/BankDetails";
import ReferenceDetails from "./customer-form/ReferenceDetails";

// -----------------------------
// Sections config
// -----------------------------
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
  const res = await fetch(`/api/customers/${id}`);
  if (!res.ok) throw new Error("Failed to load customer");
  return res.json();
};

const updateCustomerById = async (id, payload) => {
  const res = await fetch(`/api/customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update customer");
  return res.json();
};

// -----------------------------
// Component
// -----------------------------
const EditCustomer = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [activeSection, setActiveSection] = useState("personal");

  const [headerInfo, setHeaderInfo] = useState({
    name: "",
    mobile: "",
    city: "",
    pan: "",
  });

  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // -----------------------------
  // Load customer from Mongo
  // -----------------------------
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const found = await fetchCustomerById(id);
        if (!found) {
          message.error("Customer not found");
          return;
        }

        setCustomer(found);

        // Fill form
        form.setFieldsValue({
          // Personal
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

          // Employment
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

          // Income
          panNumber: found.panNumber || "",
          itrYears: found.itrYears || "",

          // Bank
          bankName: found.bankName || "",
          accountNumber: found.accountNumber || "",
          ifsc: found.ifsc || "",
          branch: found.branch || "",
          accountSinceYears: found.accountSinceYears || "",
          accountType: found.accountType || "",

          // References
          reference1: found.reference1 || null,
          reference2: found.reference2 || null,

          // KYC
          aadhaarNumber: found.aadhaarNumber || "",
          passportNumber: found.passportNumber || "",
          gstNumber: found.gstNumber || "",
          dlNumber: found.dlNumber || "",
        });

        // Header chips
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
      }
    };

    load();
  }, [id, form]);

  // -----------------------------
  // Scroll Spy
  // -----------------------------
  useEffect(() => {
    const onScroll = () => {
      const offsets = sectionsConfig.map((s) => {
        const el = document.getElementById(s.targetId);
        if (!el) return { key: s.key, top: Infinity };
        return { key: s.key, top: el.getBoundingClientRect().top };
      });

      const visible = offsets.reduce((a, b) =>
        Math.abs(b.top - 96) < Math.abs(a.top - 96) ? b : a
      );

      if (visible.key && visible.key !== activeSection) {
        setActiveSection(visible.key);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeSection]);

  const scrollToSection = (targetId) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

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
  // Autosave (debounced + safe)
  // -----------------------------
  const valuesSnapshot = Form.useWatch([], form);

  useEffect(() => {
    if (!id) return;
    if (!hasLoaded) return;
    if (!valuesSnapshot) return;
    if (saving) return;

    const timer = setTimeout(async () => {
      try {
        const payload = {
          ...valuesSnapshot,

          // IMPORTANT: store null instead of "" so DB doesn't get corrupted
          dob: valuesSnapshot?.dob
            ? valuesSnapshot.dob.format("YYYY-MM-DD")
            : null,

          nomineeDob: valuesSnapshot?.nomineeDob
            ? valuesSnapshot.nomineeDob.format("YYYY-MM-DD")
            : null,

          updatedAt: new Date().toISOString(),
        };

        await updateCustomerById(id, payload);
      } catch (err) {
        console.error("Autosave Customer Error:", err);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [id, hasLoaded, valuesSnapshot, saving]);

  // -----------------------------
  // Manual Save (validate + exit)
  // -----------------------------
  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const values = await form.validateFields();

      const payload = {
        ...values,
        dob: values?.dob ? values.dob.format("YYYY-MM-DD") : null,
        nomineeDob: values?.nomineeDob
          ? values.nomineeDob.format("YYYY-MM-DD")
          : null,
        updatedAt: new Date().toISOString(),
      };

      await updateCustomerById(id, payload);

      message.success("Customer updated successfully ✅");
      navigate("/customers");
    } catch (err) {
      console.error("Save Customer Error:", err);
      message.error("Save failed ❌");
    } finally {
      setSaving(false);
    }
  };

  if (!customer) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  return (
    <div>
      {/* HEADER */}
      <Affix offsetTop={64}>
        <div
          style={{
            background: "#f8f3ff",
            padding: "10px 18px 12px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 600 }}>
              Edit Customer – {customer.customerName || "Customer"}
            </div>

            <Button
              type="primary"
              size="small"
              loading={saving}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>

          {/* Header Chips */}
          <Space size={12} wrap style={{ fontSize: 12 }}>
            <Space>
              <IdcardOutlined /> {headerInfo.name || "Name"}
            </Space>
            <Space>
              <PhoneOutlined /> {headerInfo.mobile || "Mobile"}
            </Space>
            <Space>
              <HomeOutlined /> {headerInfo.city || "City"}
            </Space>
            <Space>
              <ProfileOutlined /> {headerInfo.pan || "PAN"}
            </Space>
          </Space>

          {/* Section Nav */}
          <Space size={6} wrap>
            {sectionsConfig.map((s) => (
              <div
                key={s.key}
                onClick={() => scrollToSection(s.targetId)}
                style={{
                  cursor: "pointer",
                  padding: "4px 10px",
                  borderRadius: 16,
                  fontSize: 12,
                  background: activeSection === s.key ? "#fff" : "#f4f0ff",
                }}
              >
                {s.label}
              </div>
            ))}
          </Space>
        </div>
      </Affix>

      {/* FORM */}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        style={{
          maxWidth: 1200,
          margin: "16px auto 0",
          width: "100%",
        }}
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

export default EditCustomer;
