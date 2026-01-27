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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

/* ---------------- helpers ---------------- */

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

/* ---------------- component ---------------- */

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

  /* close dropdown on outside click */
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /* cleanup */
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /* fetch customers */
  const fetchCustomers = async (q) => {
    if (!q) {
      setFilteredCustomers([]);
      setApiError("");
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setApiError("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/customers/search?q=${encodeURIComponent(q)}`,
        {
          headers: { Accept: "application/json" },
          signal: abortRef.current.signal,
        },
      );

      const text = await res.text();
      let json;

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Customer search API returned non-JSON");
      }

      if (!res.ok) {
        throw new Error(json?.error || "Failed to search customers");
      }

      setFilteredCustomers(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error("Customer search error:", e);
      setFilteredCustomers([]);
      setApiError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* debounce search */
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

    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  /* select customer */
  const handleCustomerSelect = (customer) => {
    if (!customer) return;

    const fieldValues = {
      /* 🔑 link loan → customer */
      customerId: customer._id,

      /* PERSONAL */
      customerName: customer.customerName || "",
      sdwOf: customer.sdwOf || "",
      gender: customer.gender || "",
      dob: toDayjsSafe(customer.dob),
      motherName: customer.motherName || "",
      residenceAddress: customer.residenceAddress || "",
      pincode: customer.pincode || "",
      city: customer.city || "",
      yearsInCurrentHouse: customer.yearsInCurrentHouse || "",
      houseType: customer.houseType || "",
      education: customer.education || "",
      maritalStatus: customer.maritalStatus || "",
      dependents: customer.dependents || "",
      primaryMobile: customer.primaryMobile || "",
      email: customer.email || "",

      nomineeName: customer.nomineeName || "",
      nomineeDob: toDayjsSafe(customer.nomineeDob),
      nomineeRelation: customer.nomineeRelation || "",

      /* EMPLOYMENT */
      occupationType: customer.occupationType || "",
      companyName: customer.companyName || "",
      companyType: customer.companyType || "",
      designation: customer.designation || "",
      businessNature: Array.isArray(customer.businessNature)
        ? customer.businessNature
        : [],

      employmentAddress: customer.employmentAddress || "",
      employmentPincode: customer.employmentPincode || "",
      employmentCity: customer.employmentCity || "",
      employmentPhone: customer.employmentPhone || "",

      salaryMonthly: customer.salaryMonthly || "",
      incorporationYear: customer.incorporationYear || "",

      /* INCOME */
      panNumber: customer.panNumber || "",
      itrYears: customer.itrYears || "",

      /* BANK */
      bankName: customer.bankName || "",
      accountNumber: customer.accountNumber || "",
      ifsc: customer.ifsc || "",
      branch: customer.branch || "",
      accountType: customer.accountType || "",
      accountSinceYears: customer.accountSinceYears || "",

      /* REFERENCES */
      reference1: customer.reference1 || {},
      reference2: customer.reference2 || {},

      /* KYC */
      aadhaarNumber: customer.aadhaarNumber || "",
      passportNumber: customer.passportNumber || "",
      gstNumber: customer.gstNumber || "",
      dlNumber: customer.dlNumber || "",
    };

    const merged = Object.fromEntries(
      Object.entries(fieldValues).filter(([_, v]) => {
        if (v === "" || v === null || v === undefined) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      }),
    );

    form.setFieldsValue({
      ...form.getFieldsValue(true),
      ...merged,
    });

    setSearchTerm("");
    setFilteredCustomers([]);
    setIsOpen(false);
  };

  /* UI */
  return (
    <>
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
        <Space style={{ marginBottom: 14 }}>
          <UserOutlined style={{ color: "#722ed1" }} />
          <b>Search & Select Customer</b>
          <Tag color="blue">Mongo</Tag>
        </Space>

        <Input
          placeholder="Search by name or mobile"
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          allowClear
        />

        {isOpen && query && (
          <Card style={{ marginTop: 6, maxHeight: 320, overflowY: "auto" }}>
            {loading ? (
              <Spin />
            ) : apiError ? (
              <div style={{ color: "red", fontSize: 12 }}>{apiError}</div>
            ) : filteredCustomers.length ? (
              <List
                dataSource={filteredCustomers}
                renderItem={(customer) => (
                  <List.Item
                    onClick={() => handleCustomerSelect(customer)}
                    style={{ cursor: "pointer" }}
                  >
                    <List.Item.Meta
                      title={customer.customerName || "Unnamed"}
                      description={customer.primaryMobile || ""}
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

      <PersonalDetails excludeFields={excludeFields} />
    </>
  );
};

export default PersonalDetailsWithSearch;
