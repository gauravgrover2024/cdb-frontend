import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Space,
  AutoComplete,
  Skeleton,
  Spin,
} from "antd";
import { BankOutlined, DollarOutlined } from "@ant-design/icons";
import { banksApi } from "../../../../../api/banks";
import { lookupIfscDetails, normalizeIfsc } from "../../../../../utils/ifscLookup";

const { Option } = Select;

const IncomeBankingDetailsPreFile = () => {
  const form = Form.useFormInstance();
  const accountSinceYears = Form.useWatch("accountSinceYears", form);
  const ifsc = Form.useWatch("ifsc", form);

  const [bankOptions, setBankOptions] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingIfsc, setLoadingIfsc] = useState(false);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setLoadingBanks(true);
        const response = await banksApi.getAll();
        const data = Array.isArray(response) ? response : response?.data || [];
        setBankOptions(
          data.map((b) => ({ value: b.name, label: b.name, ...b })),
        );
      } catch (error) {
        console.error("Error fetching banks:", error);
      } finally {
        setLoadingBanks(false);
      }
    };
    fetchBanks();
  }, []);

  const handleBankSelect = (value, option) => {
    if (option) {
      form.setFieldsValue({
        ifsc: option.ifsc || "",
        ifscCode: option.ifsc || "",
        branch: option.address || option.branch || "",
      });
    }
  };

  useEffect(() => {
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
        console.error("IFSC lookup failed", error);
      } finally {
        if (!cancelled) setLoadingIfsc(false);
      }
    };

    const timer = setTimeout(resolveIfsc, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ifsc, form]);

  /* ------------------------------
     AUTO CALCULATE "OPENED IN"
  ------------------------------ */
  useEffect(() => {
    if (typeof accountSinceYears === "number" && accountSinceYears >= 0) {
      const currentYear = new Date().getFullYear();
      form.setFieldsValue({
        openedIn: currentYear - accountSinceYears,
      });
    } else {
      form.setFieldsValue({ openedIn: undefined });
    }
  }, [accountSinceYears, form]);

  return (
    <div
      className="bg-card border-2 border-border dark:border-border/60 rounded-xl p-5 mb-6 shadow-sm"
      style={{
        marginBottom: 32,
        padding: 20,
        background: "var(--card)",
        borderRadius: 12,
        border: "2px solid var(--border)",
      }}
    >
      {/* HEADER */}
      <Space className="section-header" style={{ marginBottom: 20, display: "flex", gap: 8 }}>
        <DollarOutlined style={{ color: "#13c2c2" }} />
        <span style={{ fontWeight: 600 }}>Banking Details</span>
      </Space>
      {loadingBanks && (
        <div className="mb-4 rounded-xl border border-border/70 bg-muted/30 p-3 dark:border-zinc-700 dark:bg-slate-900/50">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Loading bank master data
          </div>
          <Skeleton active paragraph={{ rows: 1 }} title={{ width: "42%" }} />
        </div>
      )}

      {/* =====================
          INCOME DETAILS
      ====================== */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Form.Item label="Total Income (as per ITR)" name="totalIncomeITR">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              placeholder="Enter Total Income (as per ITR)"
              className="rounded-xl border-border"
              formatter={(value) => {
                if (!value) return "";
                const numValue = Number(value);
                return `₹ ${numValue.toLocaleString("en-IN")}`;
              }}
              parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="PAN Number" name="panNumber">
            <Input
              placeholder="Enter PAN Number"
              className="rounded-xl border-border"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* =====================
          BANKING DETAILS
      ====================== */}
      <Space style={{ margin: "24px 0 16px", display: "flex", gap: 8 }}>
        <BankOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600 }}>Banking Inputs</span>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Form.Item
            label="IFSC Code"
            name="ifsc"
            normalize={(value) => normalizeIfsc(value)}
          >
            <Input
              placeholder="IFSC Code"
              maxLength={11}
              className="rounded-xl border-border"
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

        <Col xs={24} md={6}>
          <Form.Item label="Bank Name" name="bankName">
            <AutoComplete
              placeholder="Select or enter Bank Name"
              options={bankOptions}
              onSelect={handleBankSelect}
              className="w-full rounded-xl border-border font-medium"
              notFoundContent={
                loadingBanks ? (
                  <div className="p-3 text-center">
                    <Spin size="small" />
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No bank found
                  </div>
                )
              }
              filterOption={(inputValue, option) =>
                (option?.value ?? "")
                  .toUpperCase()
                  .indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Branch / Address" name="branch">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Enter Branch / Address"
              className="rounded-xl border-border"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Applicant Account Number" name="accountNumber">
            <Input
              placeholder="Enter Account Number"
              className="rounded-xl border-border"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Customer ID" name="customerIdDisplay">
            <Input
              placeholder="Customer ID"
              className="rounded-xl border-border"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Account Since (Years)" name="accountSinceYears">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              placeholder="Years"
              className="rounded-xl border-border"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Opened In" name="openedIn">
            <Input
              disabled
              placeholder="Auto-filled Year"
              className="rounded-xl border-border"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Account Type" name="accountType">
            <Select
              placeholder="Select Type"
              className="rounded-xl border-border"
            >
              <Option value="Savings">Savings</Option>
              <Option value="Current">Current</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default IncomeBankingDetailsPreFile;
