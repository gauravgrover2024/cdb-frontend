import React, { useEffect, useState } from "react";
import { AutoComplete, Col, Form, Input, InputNumber, Row, Select } from "antd";

import Icon from "../../../components/AppIcon";
import { lookupIfscDetails, normalizeIfsc } from "../../../utils/ifscLookup";
import { useBankDirectoryOptions } from "../../../hooks/useBankDirectoryOptions";

const accountTypeOptions = [
  { label: "Savings", value: "Savings" },
  { label: "Current", value: "Current" },
];

const BankDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  const ifsc = Form.useWatch("ifsc", form);
  const accountSinceYears = Form.useWatch("accountSinceYears", form);
  const [loadingIfsc, setLoadingIfsc] = useState(false);
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();

  // Show in customer module & financed loans
  const showBank = isFinanced !== "No";

  useEffect(() => {
    if (!showBank) return;
    const normalized = normalizeIfsc(ifsc);
    if (normalized.length !== 11) return;
    let cancelled = false;

    const resolveIfsc = async () => {
      try {
        setLoadingIfsc(true);
        const details = await lookupIfscDetails(normalized);
        if (cancelled || !details) return;
        const patch = { ifsc: normalized, ifscCode: normalized };
        if (details.bankName) patch.bankName = details.bankName;
        if (details.branch || details.address) patch.branch = details.branch || details.address;
        form.setFieldsValue(patch);
      } catch (error) {
        console.error("Customer IFSC lookup failed", error);
      } finally {
        if (!cancelled) setLoadingIfsc(false);
      }
    };

    const timer = setTimeout(resolveIfsc, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ifsc, form, showBank]);

  useEffect(() => {
    if (!showBank) return;
    if (typeof accountSinceYears === "number" && accountSinceYears >= 0) {
      const currentYear = new Date().getFullYear();
      form.setFieldsValue({ openedIn: currentYear - accountSinceYears });
      return;
    }
    form.setFieldsValue({ openedIn: undefined });
  }, [accountSinceYears, form, showBank]);

  if (!showBank) {
    return null;
  }

  return (
    <div 
        id="section-bank" 
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      {/* SECTION HEADER */}
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
             <Icon name="Building2" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">Banking Details</span>
        </div>
      </div>

      {/* FORM FIELDS */}
      <Row gutter={[16, 16]}>
        <Form.Item name="ifscCode" hidden>
          <Input />
        </Form.Item>

         {/* IFSC */}
        <Col xs={24} md={8}>
          <Form.Item
            label="IFSC Code"
            name="ifsc"
            normalize={(value) => normalizeIfsc(value)}
          >
            <Input
              placeholder="IFSC Code"
              maxLength={11}
              className="rounded-xl border-border placeholder:font-normal"
              suffix={
                loadingIfsc ? (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Fetching...
                  </span>
                ) : null
              }
            />
          </Form.Item>
        </Col>

        {/* Bank Name */}
        <Col xs={24} md={8}>
          <Form.Item label="Bank Name" name="bankName">
            <AutoComplete
              placeholder="Select or type bank name"
              options={bankDirectoryOptions}
              filterOption={(inputValue, option) =>
                String(option?.value || "")
                  .toUpperCase()
                  .includes(String(inputValue || "").toUpperCase())
              }
              className="rounded-xl border-border w-full placeholder:font-normal"
            />
          </Form.Item>
        </Col>

        {/* Branch */}
        <Col xs={24} md={8}>
          <Form.Item label="Branch" name="branch">
            <Input placeholder="Branch name" className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>
        
        {/* Account Number */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Number" name="accountNumber">
            <Input placeholder="Account number" className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>

      

        {/* Account Since */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Since (Years)" name="accountSinceYears">
            <InputNumber
              placeholder="Number of years"
              min={0}
              className="w-full rounded-xl border-border placeholder:font-normal"
            />
          </Form.Item>
        </Col>

        {/* Account Type */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Type" name="accountType">
            <Select
              placeholder="Select account type"
              options={accountTypeOptions}
              className="rounded-xl border-border w-full placeholder:font-normal"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Opened In" name="openedIn">
            <Input placeholder="Auto-filled year" disabled className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default BankDetails;
