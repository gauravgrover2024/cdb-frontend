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
import { useLocation, useNavigate } from "react-router-dom";

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

const EditCustomer = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const [customer, setCustomer] = useState(null);
  const [existingList, setExistingList] = useState([]);
  const [activeSection, setActiveSection] = useState("personal");
  const [headerInfo, setHeaderInfo] = useState({
    name: "",
    mobile: "",
    city: "",
    pan: "",
  });

  /* =========================
     LOAD CUSTOMER DATA
  ========================= */
  useEffect(() => {
    if (!location.state?.customer || !location.state?.customers) return;

    const cust = location.state.customer;
    setCustomer(cust);
    setExistingList(location.state.customers);

    setHeaderInfo({
      name: cust.customerName || cust.name || "",
      mobile: cust.primaryMobile || cust.mobile || "",
      city: cust.city || "",
      pan: cust.panNumber || "",
    });

    form.setFieldsValue({
      customerName: cust.customerName || cust.name || "",
      sdwOf: cust.sdwOf || "",
      gender: cust.gender || "",
      dob: cust.dob ? dayjs(cust.dob) : null,
      motherName: cust.motherName || "",
      residenceAddress: cust.residenceAddress || "",
      pincode: cust.pincode || "",
      city: cust.city || "",
      yearsInCurrentHouse: cust.yearsInCurrentHouse || "",
      houseType: cust.houseType || "",
      education: cust.education || "",
      maritalStatus: cust.maritalStatus || "",
      dependents: cust.dependents || "",
      primaryMobile: cust.primaryMobile || "",
      extraMobiles: cust.extraMobiles || [],
      email: cust.email || "",
      nomineeName: cust.nomineeName || "",
      nomineeDob: cust.nomineeDob ? dayjs(cust.nomineeDob) : null,
      nomineeRelation: cust.nomineeRelation || "",

      occupationType: cust.occupationType || "",
      companyName: cust.companyName || "",
      companyType: cust.companyType || "",
      businessNature: cust.businessNature || [],
      employmentAddress: cust.employmentAddress || "",
      employmentPincode: cust.employmentPincode || "",
      employmentCity: cust.employmentCity || "",
      employmentPhone: cust.employmentPhone || "",
      salaryMonthly: cust.salaryMonthly || "",
      designation: cust.designation || "",
      incorporationYear: cust.incorporationYear || "",

      panNumber: cust.panNumber || "",
      itrYears: cust.itrYears || "",

      bankName: cust.bankName || "",
      accountNumber: cust.accountNumber || "",
      ifsc: cust.ifsc || "",
      branch: cust.branch || "",
      accountSinceYears: cust.accountSinceYears || "",
      accountType: cust.accountType || "",

      reference1: cust.reference1 || null,
      reference2: cust.reference2 || null,

      aadhaarNumber: cust.aadhaarNumber || "",
      passportNumber: cust.passportNumber || "",
      gstNumber: cust.gstNumber || "",
      dlNumber: cust.dlNumber || "",
    });
  }, [location, form]);

  /* =========================
     SCROLL SPY
  ========================= */
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

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const onValuesChange = (_, allValues) => {
    setHeaderInfo({
      name: allValues.customerName || "",
      mobile: allValues.primaryMobile || "",
      city: allValues.city || "",
      pan: allValues.panNumber || "",
    });
  };

  /* =========================
     SAVE
  ========================= */
  const handleSave = () => {
    if (!customer) return;

    const values = form.getFieldsValue(true);

    const updatedCustomer = {
      ...customer,
      ...values,
      dob: values.dob ? values.dob.format("YYYY-MM-DD") : "",
      nomineeDob: values.nomineeDob
        ? values.nomineeDob.format("YYYY-MM-DD")
        : "",
      name: values.customerName,
      mobile: values.primaryMobile,
    };

    const updatedList = existingList.map((c) =>
      c.id === customer.id ? updatedCustomer : c
    );

    navigate("/customers", { state: { customers: updatedList } });
    message.success("Customer updated successfully");
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
              Edit Customer – {customer.customerName || customer.name}
            </div>
            <Button type="primary" size="small" onClick={handleSave}>
              Save
            </Button>
          </div>

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
