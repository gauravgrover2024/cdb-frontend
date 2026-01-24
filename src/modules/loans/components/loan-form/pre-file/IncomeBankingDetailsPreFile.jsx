import React, { useEffect } from "react";
import { Form, Input, InputNumber, Select, Row, Col, Space } from "antd";
import { BankOutlined, DollarOutlined } from "@ant-design/icons";
import demoCustomers from "../../../../customers/demoCustomers";

const { Option } = Select;

const IncomeBankingDetailsPreFile = () => {
  const occupationType = Form.useWatch("occupationType");
  const accountSinceYears = Form.useWatch("accountSinceYears");
  const customerName = Form.useWatch("customerName");
  const primaryMobile = Form.useWatch("primaryMobile");
  const form = Form.useFormInstance();

  const isSalaried = occupationType === "Salaried";
  const isSelfEmployed =
    occupationType === "Self Employed" ||
    occupationType === "Self Employed Professional";

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

  /* ----------------------------------------------------------
     AUTOFILL income + banking from demoCustomers
     ---------------------------------------------------------- */
  useEffect(() => {
    if (!customerName && !primaryMobile) return;

    const match = demoCustomers.find((c) => {
      if (primaryMobile && c.primaryMobile === primaryMobile) return true;
      if (customerName && c.customerName === customerName) return true;
      return false;
    });

    if (!match) return;

    const setIfEmpty = (field, value) => {
      const cur = form.getFieldValue(field);
      if (cur === undefined || cur === null || cur === "") {
        form.setFieldsValue({ [field]: value });
      }
    };

    /* =====================
       INCOME (CORRECT MAP)
    ===================== */

    // Salaried
    setIfEmpty(
      "monthlySalary",
      match.salaryMonthly ??
        match.monthlyIncome ??
        match.grossMonthlyIncome ??
        ""
    );

    // Self Employed
    setIfEmpty("annualTurnover", match.annualIncome ?? "");
    setIfEmpty("netProfit", match.netMonthlyIncome ?? "");

    // Other income
    setIfEmpty("otherIncome", match.otherIncomeAmount ?? "");
    setIfEmpty("otherIncomeSource", match.otherIncomeSource ?? "");

    /* =====================
       BANKING
    ===================== */

    setIfEmpty("accountNumber", match.accountNumber ?? "");
    setIfEmpty("bankName", match.bankName ?? "");
    setIfEmpty("branch", match.branch ?? "");

    if (typeof match.accountSinceYears === "number") {
      setIfEmpty("accountSinceYears", match.accountSinceYears);
    }

    setIfEmpty("accountType", match.accountType ?? "");
  }, [customerName, primaryMobile, form]);

  return (
    <div
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      {/* HEADER */}
      <Space style={{ marginBottom: 20, display: "flex", gap: 8 }}>
        <DollarOutlined style={{ color: "#13c2c2" }} />
        <span style={{ fontWeight: 600 }}>Income and Banking Details</span>
      </Space>

      {/* =====================
          INCOME DETAILS
      ====================== */}
      <Row gutter={[16, 16]}>
        {isSalaried && (
          <Col xs={24} md={8}>
            <Form.Item label="Monthly Salary" name="monthlySalary">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        )}

        {isSelfEmployed && (
          <Col xs={24} md={8}>
            <Form.Item label="Annual Turnover" name="annualTurnover">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        )}

        {isSelfEmployed && (
          <Col xs={24} md={8}>
            <Form.Item label="Net Profit" name="netProfit">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} md={8}>
          <Form.Item label="Other Income" name="otherIncome">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Other Income Source" name="otherIncomeSource">
            <Select allowClear>
              <Option value="Rental">Rental</Option>
              <Option value="Agriculture">Agriculture</Option>
              <Option value="Other">Other</Option>
            </Select>
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
        <Col xs={24} md={8}>
          <Form.Item label="Applicant Account Number" name="accountNumber">
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Bank Name" name="bankName">
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Branch" name="branch">
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Account Since (Years)" name="accountSinceYears">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Opened In" name="openedIn">
            <Input disabled />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Account Type" name="accountType">
            <Select>
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
