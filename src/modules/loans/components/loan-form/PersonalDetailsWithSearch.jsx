import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Form,
  Input,
  Row,
  Col,
  Space,
  Tag,
  List,
  Card,
  Empty,
  Spin,
} from "antd";
import { UserOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import PersonalDetails from "../../../customers/customer-form/PersonalDetails";

const safeText = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return "";
};

const toDayjsSafe = (val) => {
  if (!val) return undefined;
  if (dayjs.isDayjs(val)) return val;
  const d = dayjs(val);
  return d.isValid() ? d : undefined;
};

const PersonalDetailsWithSearch = ({ excludeFields = false }) => {
  const form = Form.useFormInstance();

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const abortRef = useRef(null);

  const query = useMemo(() => searchTerm.trim(), [searchTerm]);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const fetchCustomers = async (q) => {
    if (!q) {
      setFilteredCustomers([]);
      setApiError("");
      setLoading(false);
      return;
    }

    // cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setApiError("");

    try {
      const res = await fetch(
        `api/customers/search?q=${encodeURIComponent(q)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: abortRef.current.signal,
        }
      );

      // protect against HTML response
      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("❌ Customer Search API returned non-JSON:", text);
        throw new Error(
          "Customer Search API is not returning JSON. Check API route or proxy."
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch customers");
      }

      const list = Array.isArray(data) ? data : data?.data || [];
      setFilteredCustomers(list);
    } catch (e) {
      // ignore abort errors
      if (e?.name === "AbortError") return;

      console.error("❌ Customer search error:", e);
      setFilteredCustomers([]);
      setApiError(e?.message || "Customer search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query) {
      setFilteredCustomers([]);
      setApiError("");
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchCustomers(query);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleCustomerSelect = (customer) => {
    if (!customer) return;

    const fieldValues = {
      // 🔹 PERSONAL DETAILS
      customerName: customer.customerName || customer.name || "",
      customerNumber: customer.customerNumber || customer.customerId || "",
      sdwOf: customer.sdwOf || "",
      gender: customer.gender || "",
      dob: toDayjsSafe(customer.dob),
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
      nomineeDob: toDayjsSafe(customer.nomineeDob),
      nomineeRelation: customer.nomineeRelation || "",

      // 🔹 EMPLOYMENT DETAILS
      occupationType: customer.occupationType || "",
      companyName: customer.companyName || "",
      companyType: customer.companyType || "",
      designation: customer.designation || "",
      businessNature: Array.isArray(customer.businessNature)
        ? customer.businessNature
        : [],

      employmentAddress:
        customer.employmentAddress || customer.officeAddress || "",
      employmentPincode:
        customer.employmentPincode || customer.officePincode || "",
      employmentCity: customer.employmentCity || customer.officeCity || "",
      employmentPhone: customer.employmentPhone || customer.officePhone || "",

      salaryMonthly: customer.salaryMonthly || "",
      incorporationYear: customer.incorporationYear || "",

      // 🔹 INCOME DETAILS
      panNumber: customer.panNumber || "",
      itrYears: customer.itrYears || "",

      // 🔹 BANK DETAILS
      bankName: customer.bankName || "",
      accountNumber: customer.accountNumber || "",
      ifsc: customer.ifsc || customer.ifscCode || "",
      branch: customer.branch || "",
      accountType: customer.accountType || "",
      accountSinceYears: customer.accountSinceYears || "",

      // 🔹 REFERENCES
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

      // 🔹 KYC
      aadhaarNumber: customer.aadhaarNumber || "",
      passportNumber: customer.passportNumber || "",
      gstNumber: customer.gstNumber || "",
      dlNumber: customer.dlNumber || "",
    };

    const current = form.getFieldsValue(true);

    // keep only meaningful values (don’t overwrite with blanks)
    const merged = Object.fromEntries(
      Object.entries(fieldValues).filter(([_, v]) => {
        if (v === "" || v === null || v === undefined) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    );

    form.setFieldsValue({
      ...current,
      ...merged,
    });

    // close dropdown
    setSearchTerm("");
    setFilteredCustomers([]);
    setIsOpen(false);
  };

  return (
    <>
      {/* SEARCH CUSTOMER */}
      <div
        ref={dropdownRef}
        style={{
          marginBottom: 24,
          padding: 20,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #f0f0f0",
        }}
      >
        <Space
          style={{
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <UserOutlined style={{ color: "#722ed1" }} />
            <span style={{ fontWeight: 600 }}>Search & Select Customer</span>
          </Space>

          <Tag color="blue">Mongo Search</Tag>
        </Space>

        <Row>
          <Col span={24}>
            <div style={{ position: "relative" }}>
              <Input
                placeholder="Search by customer name, mobile, or customer number"
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => {
                  if (query) setIsOpen(true);
                }}
                allowClear
              />

              {isOpen && query && (
                <Card
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 6,
                    zIndex: 50,
                    maxHeight: 320,
                    overflowY: "auto",
                    borderRadius: 10,
                  }}
                >
                  {loading ? (
                    <div className="py-6 flex items-center justify-center gap-2">
                      <Spin size="small" />
                      <span style={{ fontSize: 12, color: "#666" }}>
                        Searching customers...
                      </span>
                    </div>
                  ) : apiError ? (
                    <div style={{ padding: 12 }}>
                      <div style={{ fontSize: 12, color: "#ff4d4f" }}>
                        {apiError}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#888", marginTop: 6 }}
                      >
                        Tip: Check your API route: <b>/api/customers/search</b>
                      </div>
                    </div>
                  ) : filteredCustomers.length ? (
                    <List
                      dataSource={filteredCustomers}
                      renderItem={(customer) => (
                        <List.Item
                          onClick={() => handleCustomerSelect(customer)}
                          style={{
                            cursor: "pointer",
                            padding: "10px 12px",
                            borderRadius: 8,
                          }}
                        >
                          <List.Item.Meta
                            title={
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>
                                  {safeText(
                                    customer.customerName || customer.name
                                  ) || "Unnamed Customer"}
                                </span>

                                {(customer.customerNumber ||
                                  customer.customerId) && (
                                  <span style={{ fontSize: 12, color: "#999" }}>
                                    #
                                    {safeText(
                                      customer.customerNumber ||
                                        customer.customerId
                                    )}
                                  </span>
                                )}
                              </div>
                            }
                            description={
                              <div style={{ fontSize: 12, color: "#666" }}>
                                {safeText(
                                  customer.primaryMobile ||
                                    customer.phone ||
                                    customer.email
                                )}
                              </div>
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
