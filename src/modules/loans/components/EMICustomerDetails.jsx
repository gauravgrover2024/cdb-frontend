// src/modules/loans/components/EMICustomerDetails.jsx
import React, { useEffect, useState } from "react";
import { Form, Input, Spin } from "antd";
import { customersApi } from "../../../api/customers";
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const EMICustomerDetails = ({ value, onChange }) => {
  const [form] = Form.useForm();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    if (value && (value.customerId || value._id)) {
      const addr =
        value.residenceAddress ||
        value.currentAddress ||
        value.permanentAddress ||
        "";
      const addrWithCityPin = [
        addr,
        value.city || value.permanentCity || "",
        value.pincode || value.permanentPincode || "",
      ]
        .filter(Boolean)
        .join(", ");

      setSelectedCustomer(value);
      form.setFieldsValue({
        customerName: value.customerName || "",
        primaryMobile: value.primaryMobile || "",
        email: value.email || value.emailAddress || "",
        address: addrWithCityPin,
      });
    }
  }, [value, form]);

  useEffect(() => {
    const q = (searchQuery || "").trim();
    if (q.length < 2) { setSearchResults([]); return; }

    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await customersApi.search(q);
        setSearchResults(toArray(res));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const emitChange = (customer, overrides = {}) => {
    const current = form.getFieldsValue();
    onChange?.({
      customerId: customer?._id || customer?.id || value?.customerId || null,
      customerName: customer?.customerName ?? current.customerName ?? "",
      primaryMobile: customer?.primaryMobile ?? current.primaryMobile ?? "",
      email: customer?.email ?? customer?.emailAddress ?? current.email ?? "",
      residenceAddress:
        customer?.residenceAddress ??
        customer?.currentAddress ??
        customer?.permanentAddress ??
        current.address ??
        "",
      city: customer?.city || customer?.permanentCity || "",
      pincode: customer?.pincode || customer?.permanentPincode || "",
      ...overrides,
    });
  };

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    const addr = c.residenceAddress || c.currentAddress || c.permanentAddress || "";
    const addrWithCityPin = [
      addr,
      c.city || c.permanentCity || "",
      c.pincode || c.permanentPincode || "",
    ]
      .filter(Boolean)
      .join(", ");

    form.setFieldsValue({
      customerName: c.customerName || "",
      primaryMobile: c.primaryMobile || "",
      email: c.email || c.emailAddress || "",
      address: addrWithCityPin,
    });
    emitChange(c);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleFormChange = () => emitChange(selectedCustomer || {});

  const isLinked = !!(value?.customerId);

  return (
    <div className="relative bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-2xl overflow-visible shadow-sm">
      {/* Top accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400 rounded-t-2xl" />

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserOutlined className="text-emerald-600 dark:text-emerald-400 text-[13px]" />
            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
              Customer Details
            </span>
          </div>
          {isLinked && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
              <CheckCircleFilled style={{ fontSize: 9 }} />
              Linked
            </span>
          )}
        </div>

        <Form
          form={form}
          layout="vertical"
          size="small"
          onValuesChange={handleFormChange}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-0">
            {/* Name search */}
            <Form.Item
              className="mb-2"
              label={
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Name / Mobile
                </span>
              }
              name="customerName"
            >
              <div className="relative">
                <SearchOutlined className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] z-10 pointer-events-none" />
                <Input
                  className="pl-7 text-[12px] rounded-lg border-slate-200 dark:border-[#333] hover:border-emerald-400 focus:border-emerald-500"
                  placeholder="Search or enter name..."
                  value={form.getFieldValue("customerName")}
                  style={{ height: 34 }}
                  onChange={(e) => {
                    const v = e.target.value;
                    form.setFieldsValue({ customerName: v });
                    setSearchQuery(v);
                    handleFormChange();
                  }}
                  autoComplete="off"
                />

                {/* Dropdown */}
                {searchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 mt-1 left-0 right-0 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#333] rounded-xl shadow-xl max-h-52 overflow-y-auto">
                    {searchLoading && (
                      <div className="p-3 flex items-center gap-2 text-[11px] text-slate-500">
                        <Spin size="small" />
                        <span>Searching...</span>
                      </div>
                    )}
                    {!searchLoading && searchResults.length === 0 && (
                      <div className="p-3 text-[11px] text-slate-400 italic">
                        No customers found.
                      </div>
                    )}
                    {searchResults.map((c) => (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 text-[11px] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-b last:border-0 border-slate-100 dark:border-[#2a2a2a] transition-colors"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {c.customerName || "—"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {c.primaryMobile || ""}
                          {c.city ? ` · ${c.city}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Form.Item>

            {/* Mobile */}
            <Form.Item
              className="mb-2"
              label={
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Mobile
                </span>
              }
              name="primaryMobile"
            >
              <Input
                prefix={<PhoneOutlined className="text-slate-400 text-[10px]" />}
                className="text-[12px] rounded-lg border-slate-200 dark:border-[#333] hover:border-emerald-400 focus:border-emerald-500"
                placeholder="10-digit mobile"
                maxLength={10}
                style={{ height: 34 }}
              />
            </Form.Item>

            {/* Email */}
            <Form.Item
              className="mb-2"
              label={
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Email
                </span>
              }
              name="email"
            >
              <Input
                prefix={<MailOutlined className="text-slate-400 text-[10px]" />}
                className="text-[12px] rounded-lg border-slate-200 dark:border-[#333] hover:border-emerald-400 focus:border-emerald-500"
                placeholder="Email (optional)"
                style={{ height: 34 }}
              />
            </Form.Item>

            {/* Address */}
            <Form.Item
              className="mb-2"
              label={
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Address
                </span>
              }
              name="address"
            >
              <Input
                prefix={<EnvironmentOutlined className="text-slate-400 text-[10px]" />}
                className="text-[12px] rounded-lg border-slate-200 dark:border-[#333] hover:border-emerald-400 focus:border-emerald-500"
                placeholder="City, Pincode"
                style={{ height: 34 }}
              />
            </Form.Item>
          </div>
        </Form>

        <p className="mt-0.5 text-[9.5px] text-slate-400 dark:text-slate-500">
          Search existing customers or type freely. Details auto‑attach when saving the quotation.
        </p>
      </div>
    </div>
  );
};

export default EMICustomerDetails;
