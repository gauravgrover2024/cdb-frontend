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
    <div className="relative bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#252525] rounded-2xl overflow-visible shadow-sm">

      <div className="px-4 pt-3 pb-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <UserOutlined className="text-violet-600 dark:text-violet-400 text-[11px]" />
            </div>
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Customer Details
            </span>
          </div>
          {isLinked ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-full">
              <CheckCircleFilled style={{ fontSize: 9 }} />
              Linked
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Optional — search or type freely
            </span>
          )}
        </div>

        <Form
          form={form}
          layout="vertical"
          size="small"
          onValuesChange={handleFormChange}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

            {/* Name / Search */}
            <Form.Item className="mb-0" name="customerName" label={
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Name / Mobile</span>
            }>
              <div className="relative">
                <SearchOutlined className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[11px] z-10 pointer-events-none" />
                <Input
                  className="pl-7 text-[12px] rounded-xl"
                  placeholder="Search customer…"
                  value={form.getFieldValue("customerName")}
                  style={{ height: 36 }}
                  onChange={(e) => {
                    const v = e.target.value;
                    form.setFieldsValue({ customerName: v });
                    setSearchQuery(v);
                    handleFormChange();
                  }}
                  autoComplete="off"
                />

                {/* Search dropdown */}
                {searchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 mt-1.5 left-0 right-0 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl shadow-2xl shadow-black/10 max-h-56 overflow-y-auto">
                    {searchLoading && (
                      <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <Spin size="small" />
                        Searching…
                      </div>
                    )}
                    {!searchLoading && searchResults.length === 0 && (
                      <div className="px-4 py-3 text-[11px] text-slate-400 dark:text-slate-500 italic">
                        No customers found
                      </div>
                    )}
                    {searchResults.map((c) => (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-b last:border-0 border-slate-100 dark:border-[#262626] transition-colors"
                      >
                        <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                          {c.customerName || "—"}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
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
            <Form.Item className="mb-0" name="primaryMobile" label={
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mobile</span>
            }>
              <Input
                prefix={<PhoneOutlined className="text-slate-400 dark:text-slate-500 text-[11px]" />}
                className="text-[12px] rounded-xl"
                placeholder="10-digit number"
                maxLength={10}
                style={{ height: 36 }}
              />
            </Form.Item>

            {/* Email */}
            <Form.Item className="mb-0" name="email" label={
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email</span>
            }>
              <Input
                prefix={<MailOutlined className="text-slate-400 dark:text-slate-500 text-[11px]" />}
                className="text-[12px] rounded-xl"
                placeholder="Optional"
                style={{ height: 36 }}
              />
            </Form.Item>

            {/* Address */}
            <Form.Item className="mb-0" name="address" label={
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Address</span>
            }>
              <Input
                prefix={<EnvironmentOutlined className="text-slate-400 dark:text-slate-500 text-[11px]" />}
                className="text-[12px] rounded-xl"
                placeholder="City, Pincode"
                style={{ height: 36 }}
              />
            </Form.Item>

          </div>
        </Form>
      </div>
    </div>
  );
};

export default EMICustomerDetails;
