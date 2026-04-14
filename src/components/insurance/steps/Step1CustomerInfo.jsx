import React from "react";
import {
  AutoComplete,
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

const Step1CustomerInfo = ({
  formData,
  setField,
  handleChange,
  showErrors,
  step1Errors,
  isCompany,
  employeeOptions,
  employeesLoading,
  employeesList,
  customerSearchResults,
  customerSearchLoading,
  searchCustomers,
  applyCustomerToForm,
  getCustomerId,
}) => {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="Basic Setup" bordered>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Text strong>Buyer Type *</Text>
            <div style={{ marginTop: 6 }}>
              <Radio.Group
                value={formData.buyerType}
                onChange={(e) => setField("buyerType", e.target.value)}
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: "Individual", value: "Individual" },
                  { label: "Company", value: "Company" },
                ]}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Vehicle Type *</Text>
            <div style={{ marginTop: 6 }}>
              <Radio.Group
                value={formData.vehicleType}
                onChange={(e) =>
                  setField("vehicleType", e.target.value)
                }
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: "New Car", value: "New Car" },
                  { label: "Used Car", value: "Used Car" },
                ]}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Policy Done By *</Text>
            <Input
              value={formData.policyDoneBy}
              onChange={handleChange("policyDoneBy")}
              placeholder="Autocredits India LLP"
              style={{ marginTop: 6 }}
            />
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Broker Name</Text>
            <Input
              value={formData.brokerName}
              onChange={handleChange("brokerName")}
              placeholder="Broker (optional)"
              style={{ marginTop: 6 }}
            />
          </Col>
          <Col xs={24}>
            <Text strong>Source Origin</Text>
            <Input
              value={formData.sourceOrigin}
              onChange={handleChange("sourceOrigin")}
              placeholder="From where we got the policy client"
              style={{ marginTop: 6 }}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small" title="Customer Information" bordered>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Text strong>Employee (staff) *</Text>
            <Text
              type="secondary"
              style={{ display: "block", marginTop: 4, fontSize: 12 }}
            >
              Search and pick from system users (database). This is not
              the policy customer.
            </Text>
            <AutoComplete
              value={formData.employeeName}
              onSearch={(val) => {
                setField("employeeName", val);
                setField("employeeUserId", "");
              }}
              onChange={(val) => {
                setField("employeeName", val);
                setField("employeeUserId", "");
              }}
              options={employeeOptions}
              loading={employeesLoading}
              placeholder="Search staff by name or email"
              style={{ width: "100%", marginTop: 6 }}
              onSelect={(id) => {
                const emp = employeesList.find(
                  (e) => String(e._id || e.id) === String(id),
                );
                if (emp) {
                  setField("employeeName", emp.name || "");
                  setField("employeeUserId", emp._id || emp.id || "");
                }
              }}
              status={
                showErrors && step1Errors.employeeName ? "error" : ""
              }
            />
            {showErrors && step1Errors.employeeName ? (
              <Text
                type="danger"
                style={{ marginTop: 4, display: "block" }}
              >
                {step1Errors.employeeName}
              </Text>
            ) : null}
          </Col>
          {isCompany ? (
            <>
              <Col xs={24} md={12}>
                <Text strong>Company Name *</Text>
                <Input
                  value={formData.companyName}
                  onChange={handleChange("companyName")}
                  style={{ marginTop: 6 }}
                  status={
                    showErrors && step1Errors.companyName ? "error" : ""
                  }
                  placeholder="Enter company name"
                />
                {showErrors && step1Errors.companyName ? (
                  <Text type="danger">{step1Errors.companyName}</Text>
                ) : null}
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Contact Person Name *</Text>
                <Input
                  value={formData.contactPersonName}
                  onChange={handleChange("contactPersonName")}
                  style={{ marginTop: 6 }}
                  status={
                    showErrors && step1Errors.contactPersonName
                      ? "error"
                      : ""
                  }
                  placeholder="Enter contact person name"
                />
                {showErrors && step1Errors.contactPersonName ? (
                  <Text type="danger">
                    {step1Errors.contactPersonName}
                  </Text>
                ) : null}
              </Col>
            </>
          ) : (
            <Col xs={24} md={12}>
              <Text strong>Customer Name * — search CRM</Text>
              <Text
                type="secondary"
                style={{
                  display: "block",
                  marginTop: 4,
                  fontSize: 12,
                }}
              >
                Same as loan form: type name, mobile, or PAN — select a
                customer to auto-fill all fields below.
              </Text>
              <AutoComplete
                value={formData.customerName}
                onSearch={(val) => {
                  setField("customerName", val);
                  searchCustomers(val);
                }}
                onChange={(val) => {
                  const v = String(val ?? "");
                  // Option values are customer ids; ignore so input does not show ObjectId
                  if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                  setField("customerName", v);
                }}
                options={customerSearchResults
                  .slice(0, 12)
                  .map((c) => ({
                    value: getCustomerId(c),
                    label: (
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {c?.customerName || c?.companyName || "—"}
                        </div>
                        <div
                          style={{ fontSize: 12, color: "#666" }}
                        >
                          {c?.primaryMobile &&
                            `📱 ${c.primaryMobile}`}
                          {c?.panNumber && ` · PAN ${c.panNumber}`}
                          {c?.city && ` · ${c.city}`}
                        </div>
                      </div>
                    ),
                  }))
                  .filter((opt) => Boolean(opt.value))}
                onSelect={(customerId) => {
                  const selected = customerSearchResults.find(
                    (c) =>
                      String(getCustomerId(c)) ===
                      String(customerId),
                  );
                  if (selected) applyCustomerToForm(selected);
                }}
                style={{ width: "100%", marginTop: 6 }}
                notFoundContent={
                  customerSearchLoading ? (
                    <span>Searching…</span>
                  ) : (
                    <span>No customers</span>
                  )
                }
              >
                <Input
                  prefix={
                    <SearchOutlined style={{ color: "#94a3b8" }} />
                  }
                  placeholder="Search customer by name or mobile…"
                  allowClear
                  status={
                    showErrors && step1Errors.customerName
                      ? "error"
                      : ""
                  }
                  autoComplete="off"
                />
              </AutoComplete>
              {showErrors && step1Errors.customerName ? (
                <Text type="danger">{step1Errors.customerName}</Text>
              ) : null}
            </Col>
          )}
          <Col xs={24} md={12}>
            <Text strong>Customer mobile * — search CRM</Text>
            <Text
              type="secondary"
              style={{ display: "block", marginTop: 4, fontSize: 12 }}
            >
              Type mobile number to search customers; pick a row to
              auto-fill customer details from the Customers module.
            </Text>
            <AutoComplete
              value={formData.mobile}
              onSearch={(raw) => {
                const digits = String(raw || "")
                  .replace(/\D/g, "")
                  .slice(0, 10);
                setField("mobile", digits);
                searchCustomers(digits);
              }}
              onChange={(val) => {
                const v = String(val ?? "");
                if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                const digits = v.replace(/\D/g, "").slice(0, 10);
                setField("mobile", digits);
              }}
              onSelect={(customerId) => {
                const selected = customerSearchResults.find(
                  (c) =>
                    String(getCustomerId(c)) === String(customerId),
                );
                if (selected) applyCustomerToForm(selected);
              }}
              options={customerSearchResults
                .slice(0, 10)
                .map((c) => ({
                  value: getCustomerId(c),
                  label: (
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {c?.customerName || "Customer"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {c?.primaryMobile &&
                          `📱 ${c.primaryMobile}`}
                        {c?.panNumber && ` · PAN ${c.panNumber}`}
                        {c?.city && ` · ${c.city}`}
                      </div>
                    </div>
                  ),
                }))
                .filter((opt) => Boolean(opt.value))}
              style={{ width: "100%", marginTop: 6 }}
              notFoundContent={
                customerSearchLoading ? "Searching…" : null
              }
            >
              <Input
                addonBefore="+91"
                maxLength={10}
                placeholder="10-digit mobile — search & select customer"
                status={
                  showErrors && step1Errors.mobile ? "error" : ""
                }
                suffix={customerSearchLoading ? "…" : null}
              />
            </AutoComplete>
            {showErrors && step1Errors.mobile ? (
              <Text type="danger">{step1Errors.mobile}</Text>
            ) : null}
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Alternate Phone Number</Text>
            <Input
              addonBefore="+91"
              value={formData.alternatePhone}
              onChange={handleChange("alternatePhone")}
              maxLength={10}
              style={{ marginTop: 6 }}
              placeholder="Optional"
            />
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Email Address *</Text>
            <Input
              value={formData.email}
              onChange={handleChange("email")}
              style={{ marginTop: 6 }}
              status={showErrors && step1Errors.email ? "error" : ""}
              placeholder={
                isCompany ? "Company email address" : "Email address"
              }
            />
            {showErrors && step1Errors.email ? (
              <Text type="danger">{step1Errors.email}</Text>
            ) : null}
          </Col>
          {!isCompany ? (
            <Col xs={24} md={12}>
              <Text strong>Gender *</Text>
              <Select
                value={formData.gender || undefined}
                onChange={(v) => setField("gender", v)}
                style={{ width: "100%", marginTop: 6 }}
                status={showErrors && step1Errors.gender ? "error" : ""}
                options={[
                  { label: "Male", value: "Male" },
                  { label: "Female", value: "Female" },
                  { label: "Other", value: "Other" },
                ]}
                placeholder="Select gender"
              />
              {showErrors && step1Errors.gender ? (
                <Text type="danger">{step1Errors.gender}</Text>
              ) : null}
            </Col>
          ) : null}
          <Col xs={24} md={12}>
            <Text strong>PAN Number {isCompany ? "*" : ""}</Text>
            <Input
              value={formData.panNumber}
              onChange={handleChange("panNumber")}
              style={{ marginTop: 6 }}
              status={
                showErrors && step1Errors.panNumber ? "error" : ""
              }
              placeholder="ABCDE1234F"
            />
            {showErrors && step1Errors.panNumber ? (
              <Text type="danger">{step1Errors.panNumber}</Text>
            ) : null}
          </Col>
          {isCompany ? (
            <Col xs={24} md={12}>
              <Text strong>GST Number</Text>
              <Input
                value={formData.gstNumber}
                onChange={handleChange("gstNumber")}
                style={{ marginTop: 6 }}
                placeholder="Optional"
              />
            </Col>
          ) : (
            <Col xs={24} md={12}>
              <Text strong>Aadhaar Number</Text>
              <Input
                value={formData.aadhaarNumber}
                onChange={handleChange("aadhaarNumber")}
                style={{ marginTop: 6 }}
                placeholder="Optional"
              />
            </Col>
          )}
          <Col xs={24} md={12}>
            <Text strong>
              {isCompany ? "Office Address *" : "Residence Address *"}
            </Text>
            <Input.TextArea
              rows={2}
              value={formData.residenceAddress}
              onChange={handleChange("residenceAddress")}
              style={{ marginTop: 6 }}
              status={
                showErrors && step1Errors.residenceAddress
                  ? "error"
                  : ""
              }
              placeholder="Enter complete address"
            />
            {showErrors && step1Errors.residenceAddress ? (
              <Text type="danger">{step1Errors.residenceAddress}</Text>
            ) : null}
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Pincode *</Text>
            <Input
              value={formData.pincode}
              onChange={handleChange("pincode")}
              maxLength={6}
              style={{ marginTop: 6 }}
              status={showErrors && step1Errors.pincode ? "error" : ""}
              placeholder="6-digit pincode"
            />
            {showErrors && step1Errors.pincode ? (
              <Text type="danger">{step1Errors.pincode}</Text>
            ) : null}
          </Col>
          <Col xs={24} md={12}>
            <Text strong>City *</Text>
            <Input
              value={formData.city}
              onChange={handleChange("city")}
              style={{ marginTop: 6 }}
              status={showErrors && step1Errors.city ? "error" : ""}
              placeholder="City"
            />
            {showErrors && step1Errors.city ? (
              <Text type="danger">{step1Errors.city}</Text>
            ) : null}
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card size="small" title="Nominee (Optional)" bordered>
            <Row gutter={[12, 12]}>
              <Col span={24}>
                <Input
                  value={formData.nomineeName}
                  onChange={handleChange("nomineeName")}
                  placeholder="Nominee Name"
                />
              </Col>
              <Col span={24}>
                <Input
                  value={formData.nomineeRelationship}
                  onChange={handleChange("nomineeRelationship")}
                  placeholder="Relationship"
                />
              </Col>
              <Col span={24}>
                <InputNumber
                  min={0}
                  value={Number(formData.nomineeAge || 0) || 0}
                  onChange={(v) =>
                    setField("nomineeAge", String(v ?? ""))
                  }
                  style={{ width: "100%" }}
                  placeholder="Nominee Age"
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="Reference (Optional)" bordered>
            <Row gutter={[12, 12]}>
              <Col span={24}>
                <Input
                  value={formData.referenceName}
                  onChange={handleChange("referenceName")}
                  placeholder="Reference Name"
                />
              </Col>
              <Col span={24}>
                <Input
                  value={formData.referencePhone}
                  onChange={handleChange("referencePhone")}
                  placeholder="Reference Phone"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default Step1CustomerInfo;
