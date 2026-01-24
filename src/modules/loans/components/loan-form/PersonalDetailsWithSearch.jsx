import React, { useState, useEffect } from "react";
import { Form, Input, Row, Col, Space, Tag, List, Card, Empty } from "antd";
import { UserOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import PersonalDetails from "../../../customers/customer-form/PersonalDetails";
import demoCustomers from "../../../customers/demoCustomers";

const PersonalDetailsWithSearch = ({ excludeFields = false }) => {
  const form = Form.useFormInstance();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers([]);
      return;
    }

    const results = demoCustomers.filter(
      (customer) =>
        customer.customerName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerNumber?.toString().includes(searchTerm)
    );

    setFilteredCustomers(results);
  }, [searchTerm]);

  const handleCustomerSelect = (customer) => {
    const fieldValues = {
      /* ========================
       PERSONAL DETAILS
    ======================== */
      customerName: customer.customerName || customer.name || "",
      customerNumber: customer.customerNumber || "",
      sdwOf: customer.sdwOf || "",
      gender: customer.gender || "",
      dob: customer.dob ? dayjs(customer.dob) : undefined,
      motherName: customer.motherName || "",
      residenceAddress: customer.residenceAddress || customer.address || "",
      pincode: customer.pincode || "",
      city: customer.city || "",
      yearsInCurrentHouse: customer.yearsInCurrentHouse || "",
      houseType: customer.houseType || "",
      education: customer.education || "",
      maritalStatus: customer.maritalStatus || "",
      dependents: customer.dependents || "",
      primaryMobile: customer.primaryMobile || customer.phone || "",
      email: customer.email || "",

      nomineeName: customer.nomineeName || "",
      nomineeDob: customer.nomineeDob ? dayjs(customer.nomineeDob) : undefined,
      nomineeRelation: customer.nomineeRelation || "",

      /* ========================
       EMPLOYMENT DETAILS
       ✅ MUST MATCH EmploymentDetails.jsx
    ======================== */
      occupationType: customer.occupationType || "",
      companyName: customer.companyName || "",
      companyType: customer.companyType || "",
      designation: customer.designation || "",
      businessNature: customer.businessNature || [],

      employmentAddress:
        customer.employmentAddress || customer.officeAddress || "",

      employmentPincode:
        customer.employmentPincode || customer.officePincode || "",

      employmentCity: customer.employmentCity || customer.officeCity || "",

      employmentPhone: customer.employmentPhone || customer.officePhone || "",

      salaryMonthly: customer.salaryMonthly || "",
      incorporationYear: customer.incorporationYear || "",

      /* ========================
       INCOME DETAILS
    ======================== */
      panNumber: customer.panNumber || "",
      itrYears: customer.itrYears || "",

      /* ========================
       BANK DETAILS
    ======================== */
      bankName: customer.bankName || "",
      accountNumber: customer.accountNumber || "",
      ifsc: customer.ifsc || customer.ifscCode || "",
      branch: customer.branch || "",
      accountType: customer.accountType || "",
      accountSinceYears: customer.accountSinceYears || "",

      /* ========================
       REFERENCES
    ======================== */
      reference1: customer.reference1 || {
        name: "",
        mobile: "",
        address: "",
        pincode: "",
        city: "",
      },

      reference2: customer.reference2 || {
        name: "",
        mobile: "",
        address: "",
        pincode: "",
        city: "",
      },

      /* ========================
       KYC
    ======================== */
      aadhaarNumber: customer.aadhaarNumber || "",
      passportNumber: customer.passportNumber || "",
      gstNumber: customer.gstNumber || "",
      dlNumber: customer.dlNumber || "",
    };

    const current = form.getFieldsValue(true);

    const merged = Object.fromEntries(
      Object.entries(fieldValues).filter(([_, v]) => {
        // keep only meaningful values
        if (v === "" || v === null || v === undefined) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    );

    form.setFieldsValue({
      ...current,
      ...merged,
    });

    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <>
      {/* SEARCH CUSTOMER */}
      <div
        style={{
          marginBottom: 32,
          padding: 20,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #f0f0f0",
        }}
      >
        <Space
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <UserOutlined style={{ color: "#722ed1" }} />
            <span style={{ fontWeight: 600 }}>Search & Select Customer</span>
          </Space>
          <Tag color="blue">Quick Fill</Tag>
        </Space>

        <Row>
          <Col span={24}>
            <div style={{ position: "relative" }}>
              <Input
                placeholder="Search by customer name or number"
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
              />

              {isOpen && searchTerm && (
                <Card
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    zIndex: 10,
                    maxHeight: 300,
                    overflowY: "auto",
                  }}
                >
                  {filteredCustomers.length ? (
                    <List
                      dataSource={filteredCustomers}
                      renderItem={(customer) => (
                        <List.Item
                          onClick={() => handleCustomerSelect(customer)}
                          style={{
                            cursor: "pointer",
                            padding: 12,
                          }}
                        >
                          <List.Item.Meta
                            title={
                              <>
                                {customer.customerName || customer.name}
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 12,
                                    color: "#999",
                                  }}
                                >
                                  #{customer.customerNumber}
                                </span>
                              </>
                            }
                            description={
                              customer.email || customer.primaryMobile
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="No customers found" />
                  )}
                </Card>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* PERSONAL DETAILS FORM */}
      <PersonalDetails excludeFields={excludeFields} />
    </>
  );
};

export default PersonalDetailsWithSearch;
