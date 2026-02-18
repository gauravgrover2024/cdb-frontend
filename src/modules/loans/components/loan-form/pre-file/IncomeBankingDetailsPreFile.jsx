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
} from "antd";
import { BankOutlined, DollarOutlined } from "@ant-design/icons";
import { banksApi } from "../../../../../api/banks";

const { Option } = Select;

const IncomeBankingDetailsPreFile = () => {
  const accountSinceYears = Form.useWatch("accountSinceYears");
  const form = Form.useFormInstance();

  const [bankOptions, setBankOptions] = useState([]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await banksApi.getAll();
        const data = Array.isArray(response) ? response : response?.data || [];
        setBankOptions(
          data.map((b) => ({ value: b.name, label: b.name, ...b })),
        );
      } catch (error) {
        console.error("Error fetching banks:", error);
      }
    };
    fetchBanks();
  }, []);

  const handleBankSelect = (value, option) => {
    if (option) {
      form.setFieldsValue({
        ifscCode: option.ifsc || "",
        branch: option.address || "",
      });
    }
  };

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
      <Space style={{ marginBottom: 20, display: "flex", gap: 8 }}>
        <DollarOutlined style={{ color: "#13c2c2" }} />
        <span style={{ fontWeight: 600 }}>Banking Details</span>
      </Space>

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
      </Row>

      {/* =====================
          BANKING DETAILS
      ====================== */}
      <Space style={{ margin: "24px 0 16px", display: "flex", gap: 8 }}>
        <BankOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600 }}>Banking Details</span>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Form.Item label="IFSC Code" name="ifsc">
            <Input
              placeholder="IFSC Code"
              className="rounded-xl border-border"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Bank Name" name="bankName">
            <AutoComplete
              placeholder="Select or enter Bank Name"
              options={bankOptions}
              onSelect={handleBankSelect}
              className="rounded-xl border-border w-full"
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
            <Input
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
          <Form.Item label="Customer ID" name="customerId">
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
