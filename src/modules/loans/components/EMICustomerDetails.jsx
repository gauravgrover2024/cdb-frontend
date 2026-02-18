// src/modules/loans/components/EMICustomerDetails.jsx
import React, { useEffect, useState } from "react";
import { Card, Form, Input, Spin } from "antd";
import { customersApi } from "../../../api/customers";
import Icon from "../../../components/AppIcon";

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
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await customersApi.search(q);
        const list = Array.isArray(res?.data) ? res.data : [];
        setSearchResults(list);
      } catch (err) {
        console.error("Customer search error:", err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [searchQuery]);

  const emitChange = (customer, overrides = {}) => {
    const current = form.getFieldsValue();
    const payload = {
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
    };
    onChange && onChange(payload);
  };

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);

    const addr =
      c.residenceAddress || c.currentAddress || c.permanentAddress || "";
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

  const handleFormChange = () => {
    emitChange(selectedCustomer || {});
  };

  return (
    <Card
      className="rounded-[24px] border border-slate-100 dark:border-[#262626] bg-white dark:bg-[#1f1f1f] shadow-sm"
      bodyStyle={{ padding: 14 }}
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        onValuesChange={handleFormChange}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-3 gap-y-2">
          {/* Name or mobile with inline search */}
          <Form.Item
            className="mb-1"
            label={
              <span className="text-[11px] font-semibold">
                Customer name or mobile
              </span>
            }
            name="customerName"
          >
            <div className="relative">
              <Icon
                name="Search"
                size={13}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <Input
                className="pl-6 text-[11px] h-8"
                placeholder="Type to search or add..."
                value={form.getFieldValue("customerName")}
                onChange={(e) => {
                  const v = e.target.value;
                  form.setFieldsValue({ customerName: v });
                  setSearchQuery(v);
                  handleFormChange();
                }}
                autoComplete="off"
              />

              {searchQuery.trim().length >= 2 && (
                <div className="absolute z-30 mt-1 left-0 right-0 max-h-48 overflow-y-auto border border-slate-200 dark:border-[#262626] rounded-2xl bg-white dark:bg-[#111111] shadow-lg divide-y divide-slate-100 dark:divide-[#262626]">
                  {searchLoading && (
                    <div className="p-2.5 flex items-center justify-center text-[11px] text-slate-500">
                      <Spin size="small" />
                      <span className="ml-2">Searching customers...</span>
                    </div>
                  )}
                  {!searchLoading && searchResults.length === 0 && (
                    <div className="p-2.5 text-[11px] text-slate-500">
                      No customers found. Continue typing to add a new one.
                    </div>
                  )}
                  {searchResults.map((c) => (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 dark:hover:bg-[#1f2937] transition-colors"
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {c.customerName || "—"}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {c.primaryMobile || "N/A"}
                        {c.city ? ` • ${c.city}` : ""}
                        {c.panNumber ? ` • PAN: ${c.panNumber}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Form.Item>

          {/* Mobile */}
          <Form.Item
            className="mb-1"
            label={<span className="text-[11px] font-semibold">Mobile</span>}
            name="primaryMobile"
          >
            <Input
              className="text-[11px] h-8"
              placeholder="10-digit mobile"
              maxLength={10}
            />
          </Form.Item>

          {/* Email */}
          <Form.Item
            className="mb-1"
            label={<span className="text-[11px] font-semibold">Email</span>}
            name="email"
          >
            <Input className="text-[11px] h-8" placeholder="Email (optional)" />
          </Form.Item>

          {/* Address full width */}
          <Form.Item
            className="mb-0 lg:col-span-3"
            label={<span className="text-[11px] font-semibold">Address</span>}
            name="address"
          >
            <Input
              className="text-[11px] h-8"
              placeholder="House / street / locality, City, Pincode"
            />
          </Form.Item>
        </div>
      </Form>

      <p className="mt-1 text-[9px] text-slate-500 dark:text-slate-400">
        These details will be used to auto‑create or link the customer when you
        save this quotation or loan.
      </p>
    </Card>
  );
};

export default EMICustomerDetails;
