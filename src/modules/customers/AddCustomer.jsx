import React, { useEffect, useState } from "react";
import { Form, Button, Affix, Space } from "antd";
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

const AddCustomer = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const existingList = location.state?.customers || [];

  const [activeSection, setActiveSection] = useState("personal");
  const [headerInfo, setHeaderInfo] = useState({
    name: "",
    mobile: "",
    city: "",
    pan: "",
  });

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
        const rect = el.getBoundingClientRect();
        return { key: s.key, top: rect.top };
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

  const onValuesChange = (_, allValues) => {
    setHeaderInfo({
      name: allValues.customerName || "",
      mobile: allValues.primaryMobile || "",
      city: allValues.city || "",
      pan: allValues.panNumber || "",
    });
  };

  const handleSave = (exit = true) => {
    const values = form.getFieldsValue(true);

    const flat = {
      id: Date.now(),
      // Personal Details
      customerName: values.customerName,
      sdwOf: values.sdwOf,
      gender: values.gender,
      dob: values.dob,
      motherName: values.motherName,
      residenceAddress: values.residenceAddress,
      pincode: values.pincode,
      city: values.city,
      yearsInCurrentHouse: values.yearsInCurrentHouse,
      houseType: values.houseType,
      education: values.education,
      maritalStatus: values.maritalStatus,
      dependents: values.dependents,
      primaryMobile: values.primaryMobile,
      extraMobiles: values.extraMobiles,
      email: values.email,
      nomineeName: values.nomineeName,
      nomineeDob: values.nomineeDob,
      nomineeRelation: values.nomineeRelation,

      // Employment Details
      occupationType: values.occupationType,
      companyName: values.companyName,
      companyType: values.companyType,
      businessNature: values.businessNature,
      employmentAddress: values.employmentAddress,
      employmentPincode: values.employmentPincode,
      employmentCity: values.employmentCity,
      employmentPhone: values.employmentPhone,
      salaryMonthly: values.salaryMonthly,
      designation: values.designation,
      incorporationYear: values.incorporationYear,

      // Income Details
      panNumber: values.panNumber,
      itrYears: values.itrYears,

      // Banking Details
      bankName: values.bankName,
      accountNumber: values.accountNumber,
      ifsc: values.ifsc,
      branch: values.branch,
      accountSinceYears: values.accountSinceYears,
      accountType: values.accountType,

      // References
      reference1: values.reference1,
      reference2: values.reference2,

      // KYC Details
      aadhaarNumber: values.aadhaarNumber,
      passportNumber: values.passportNumber,
      gstNumber: values.gstNumber,
      dlNumber: values.dlNumber,

      // Standard Fields
      customerType: "New",
      kycStatus: "In Progress",
      createdOn: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    const updatedList = [flat, ...existingList];
    navigate("/customers", { state: { customers: updatedList } });

    if (!exit) {
      form.resetFields();
    }
  };


  return (
    <div>
      {/* Header Affix */}
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
          {/* Row 1: title + actions */}
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
              <Button size="small" onClick={() => handleSave(true)}>
                Save & Exit
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={() => handleSave(false)}
              >
                Save
              </Button>
            </Space>
          </div>

          {/* Row 2: customer info chips */}
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

          {/* Row 3: section nav */}
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
        </div>
      </Affix>

      {/* MAIN FORM */}
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
