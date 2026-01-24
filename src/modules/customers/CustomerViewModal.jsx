// src/modules/customers/CustomerViewModal.jsx

import React from "react";
import {
  Modal,
  Descriptions,
  Button,
  Table,
  Row,
  Col,
  Card,
  Space,
  Tag,
  Divider,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  ProfileOutlined,
  IdcardOutlined,
  BankOutlined,
  FileDoneOutlined,
  TeamOutlined,
  MailOutlined,
} from "@ant-design/icons";

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13 }}>
    {icon && <span style={{ color: "#8c8c8c", minWidth: 20 }}>{icon}</span>}
    <div style={{ flex: 1 }}>
      <div style={{ color: "#595959", fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 500, color: "#000" }}>{value || "—"}</div>
    </div>
  </div>
);

const SectionCard = ({ title, icon, children, color }) => (
  <Card
    size="small"
    style={{
      marginBottom: 12,
      borderRadius: 10,
      border: "1px solid #f0f0f0",
      boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    }}
    headStyle={{ padding: "10px 12px", borderBottom: "1px solid #f0f0f0" }}
    bodyStyle={{ padding: "12px" }}
    title={
      <Space size={8}>
        <span style={{ color: color, fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
      </Space>
    }
  >
    {children}
  </Card>
);

const CustomerViewModal = ({ open, customer, onClose, onEdit }) => {
  if (!customer) return null;

  const kycColor =
    customer.kycStatus === "Completed"
      ? "green"
      : customer.kycStatus === "In Progress"
      ? "blue"
      : "orange";

  // Helper function to safely get nested values
  const getValue = (obj, path, fallback = null) => {
    if (!obj) return fallback;
    const keys = path.split(".");
    let value = obj;
    for (let key of keys) {
      value = value?.[key];
      if (value === undefined || value === null) return fallback;
    }
    return value;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      bodyStyle={{ padding: 0 }}
      centered
    >
      {/* Header Strip */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          background: "#faf5ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Space size={12}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "#f0e6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserOutlined style={{ color: "#722ed1", fontSize: 24 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {customer.customerName || customer.name}
            </div>
            <Space size={12} style={{ fontSize: 12, color: "#595959" }}>
              {(customer.primaryMobile || customer.mobile) && (
                <span>
                  <PhoneOutlined /> {customer.primaryMobile || customer.mobile}
                </span>
              )}
              {customer.city && (
                <span>
                  <HomeOutlined /> {customer.city}
                </span>
              )}
            </Space>
          </div>
        </Space>

        <Space size={8}>
          {customer.customerType && (
            <Tag color={customer.customerType === "Repeat" ? "purple" : "blue"}>
              {customer.customerType}
            </Tag>
          )}
          {customer.kycStatus && (
            <Tag color={kycColor} icon={<FileDoneOutlined />}>
              {customer.kycStatus}
            </Tag>
          )}
        </Space>
      </div>

      {/* Main Content */}
      <div
        style={{
          padding: "16px 20px",
          background: "#fafafa",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {/* Personal Details */}
        <SectionCard
          title="Personal Details"
          icon={<UserOutlined />}
          color="#722ed1"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow
                label="Customer Name"
                value={customer.personalInfo?.name || customer.name}
              />
              <InfoRow
                label="S/D/W of"
                value={customer.personalInfo?.fatherSpouseName}
              />
              <InfoRow
                label="Date of Birth"
                value={customer.personalInfo?.dateOfBirth}
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Mother's Name"
                value={customer.personalInfo?.motherName}
              />
              <InfoRow label="Gender" value={customer.gender} />
              <InfoRow label="Marital Status" value={customer.maritalStatus} />
            </Col>
          </Row>
          {customer.residentialInfo?.residenceAddress && (
            <>
              <Divider style={{ margin: "8px 0" }} />
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: "#595959", fontSize: 12 }}>
                  Residence Address
                </div>
                <div style={{ fontWeight: 500, color: "#000", fontSize: 13 }}>
                  {customer.residentialInfo?.residenceAddress}
                </div>
              </div>
            </>
          )}
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow
                label="Pincode"
                value={customer.residentialInfo?.pincode}
              />
              <InfoRow
                label="City"
                value={customer.residentialInfo?.city || customer.city}
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Location"
                value={customer.residentialInfo?.location}
              />
              <InfoRow
                label="House Type"
                value={customer.residentialInfo?.houseType}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24}>
              <InfoRow
                label="Staying Since (years)"
                value={customer.residentialInfo?.stayingSince}
              />
            </Col>
          </Row>
        </SectionCard>

        {/* Contact Details */}
        <SectionCard
          title="Contact Details"
          icon={<MailOutlined />}
          color="#52c41a"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow
                icon={<PhoneOutlined />}
                label="Primary Mobile"
                value={
                  customer.personalInfo?.phone ||
                  customer.primaryMobile ||
                  customer.mobile
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                icon={<MailOutlined />}
                label="Email ID"
                value={customer.email}
              />
            </Col>
          </Row>
        </SectionCard>

        {/* Employment Details */}
        <SectionCard
          title="Employment / Business Details"
          icon={<ProfileOutlined />}
          color="#1890ff"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow
                label="Occupation Type"
                value={
                  customer.employmentInfo?.employmentType ||
                  customer.occupationType
                }
              />
              <InfoRow
                label="Company Name"
                value={
                  customer.employmentInfo?.companyName || customer.companyName
                }
              />
              <InfoRow
                label="Designation"
                value={customer.employmentInfo?.designation}
              />
              <InfoRow
                label="Employment Duration (years)"
                value={customer.employmentInfo?.employmentDuration}
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Monthly Salary"
                value={
                  customer.employmentInfo?.monthlySalary
                    ? `₹ ${customer.employmentInfo.monthlySalary.toLocaleString(
                        "en-IN"
                      )}`
                    : "N/A"
                }
              />
              <InfoRow label="Company Type" value={customer.companyType} />
              <InfoRow
                label="Nature of Business"
                value={customer.businessNature?.join(", ")}
              />
              <InfoRow
                label="Incorporation Year"
                value={customer.incorporationYear}
              />
            </Col>
          </Row>
        </SectionCard>

        {/* Income Details */}
        <SectionCard
          title="Income Details"
          icon={<ProfileOutlined />}
          color="#faad14"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow
                label="Total Monthly Income"
                value={
                  customer.incomeInfo?.totalMonthlyIncome
                    ? `₹ ${customer.incomeInfo.totalMonthlyIncome.toLocaleString(
                        "en-IN"
                      )}`
                    : "N/A"
                }
              />
              <InfoRow
                label="Other Income"
                value={
                  customer.incomeInfo?.otherIncome
                    ? `₹ ${customer.incomeInfo.otherIncome.toLocaleString(
                        "en-IN"
                      )}`
                    : "N/A"
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Income Source"
                value={customer.incomeInfo?.incomeSource}
              />
              <InfoRow
                label="PAN Number"
                value={customer.residentialInfo?.panNumber}
              />
            </Col>
          </Row>
        </SectionCard>

        {/* Banking Details */}
        <SectionCard
          title="Banking Details"
          icon={<BankOutlined />}
          color="#13c2c2"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow
                label="Bank Name"
                value={customer.bankInfo?.bankName || customer.bankName}
              />
              <InfoRow
                label="Account Type"
                value={customer.bankInfo?.accountType || customer.accountType}
              />
              <InfoRow
                label="Account Number"
                value={customer.bankInfo?.accountNumber}
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow label="IFSC Code" value={customer.bankInfo?.ifscCode} />
              <InfoRow
                label="Monthly Balance"
                value={
                  customer.bankInfo?.monthlyBalance
                    ? `₹ ${customer.bankInfo.monthlyBalance.toLocaleString(
                        "en-IN"
                      )}`
                    : "N/A"
                }
              />
            </Col>
          </Row>
        </SectionCard>

        {/* References */}
        {customer.references && customer.references.length > 0 && (
          <SectionCard
            title="References"
            icon={<TeamOutlined />}
            color="#13c2c2"
          >
            <Row gutter={16}>
              {customer.references.map((ref, index) => (
                <Col xs={24} md={12} key={ref.id || index}>
                  <div
                    style={{
                      padding: 10,
                      background: "#f5f5f5",
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}
                    >
                      Reference {index + 1}
                    </div>
                    <InfoRow label="Name" value={ref.name} />
                    <InfoRow label="Phone" value={ref.phone} />
                    <InfoRow label="Relationship" value={ref.relationship} />
                    <InfoRow label="Years Known" value={ref.yearsKnown} />
                  </div>
                </Col>
              ))}
            </Row>
          </SectionCard>
        )}

        {/* KYC Details */}
        <SectionCard
          title="KYC / Identity Proofs"
          icon={<IdcardOutlined />}
          color="#722ed1"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow label="PAN Number" value={customer.kycInfo?.panNumber} />
              <InfoRow
                label="Aadhar Number"
                value={customer.kycInfo?.aadharNumber}
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Driving License"
                value={customer.kycInfo?.drivingLicense}
              />
              <InfoRow label="Voter ID" value={customer.kycInfo?.voterID} />
            </Col>
          </Row>
        </SectionCard>
      </div>

      {/* Footer Buttons */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          background: "#ffffff",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            padding: "6px 16px",
            fontSize: 13,
            background: "#fff",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => onEdit(customer)}
          style={{
            border: "none",
            borderRadius: 6,
            padding: "6px 18px",
            fontSize: 13,
            background: "#722ed1",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Edit Customer
        </button>
      </div>
    </Modal>
  );
};

export default CustomerViewModal;
