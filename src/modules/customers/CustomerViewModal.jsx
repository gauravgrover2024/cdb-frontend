import React from "react";
import { Modal, Row, Col, Card, Space, Tag, Divider } from "antd";
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

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 13 }}>
    {icon && <span style={{ color: "#8c8c8c", minWidth: 20 }}>{icon}</span>}
    <div style={{ flex: 1 }}>
      <div style={{ color: "#595959", fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "#000" }}>
        {safeText(value) || "—"}
      </div>
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
        <span style={{ fontWeight: 700, fontSize: 13 }}>{title}</span>
      </Space>
    }
  >
    {children}
  </Card>
);

const formatDate = (v) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return safeText(v);
    return d.toLocaleDateString("en-GB");
  } catch {
    return safeText(v);
  }
};

const CustomerViewModal = ({ open, customer, onClose, onEdit }) => {
  if (!customer) return null;

  const kycStatus = safeText(customer.kycStatus);
  const kycColor =
    kycStatus === "Completed"
      ? "green"
      : kycStatus === "In Progress"
      ? "blue"
      : kycStatus
      ? "orange"
      : "default";

  const createdAtText =
    customer.createdAt || customer.createdOn
      ? formatDate(customer.createdAt || customer.createdOn)
      : "";

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
          gap: 12,
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
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {customer.customerName || "—"}
            </div>

            <Space size={12} style={{ fontSize: 12, color: "#595959" }}>
              {customer.primaryMobile && (
                <span>
                  <PhoneOutlined /> {customer.primaryMobile}
                </span>
              )}
              {customer.city && (
                <span>
                  <HomeOutlined /> {customer.city}
                </span>
              )}
              {createdAtText && <span>Created: {createdAtText}</span>}
            </Space>
          </div>
        </Space>

        <Space size={8}>
          {customer.customerType && (
            <Tag color={customer.customerType === "Repeat" ? "purple" : "blue"}>
              {customer.customerType}
            </Tag>
          )}
          {kycStatus && (
            <Tag color={kycColor} icon={<FileDoneOutlined />}>
              {kycStatus}
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
              <InfoRow label="Customer Name" value={customer.customerName} />
              <InfoRow label="S/D/W of" value={customer.sdwOf} />
              <InfoRow label="Mother's Name" value={customer.motherName} />
            </Col>

            <Col xs={24} md={12}>
              <InfoRow label="Gender" value={customer.gender} />
              <InfoRow label="Date of Birth" value={formatDate(customer.dob)} />
              <InfoRow label="Marital Status" value={customer.maritalStatus} />
            </Col>
          </Row>

          {(customer.residenceAddress || customer.pincode || customer.city) && (
            <>
              <Divider style={{ margin: "10px 0" }} />
              <InfoRow
                icon={<HomeOutlined />}
                label="Residence Address"
                value={customer.residenceAddress}
              />
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <InfoRow label="Pincode" value={customer.pincode} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoRow label="City" value={customer.city} />
                </Col>
              </Row>
            </>
          )}

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow
                label="Staying in current house since (years)"
                value={customer.yearsInCurrentHouse}
              />
              <InfoRow label="House Type" value={customer.houseType} />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow label="Education" value={customer.education} />
              <InfoRow label="Dependents" value={customer.dependents} />
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
                value={customer.primaryMobile}
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Extra Mobiles"
                value={(customer.extraMobiles || []).join(", ")}
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

        {/* Employment / Business */}
        <SectionCard
          title="Employment / Business Details"
          icon={<ProfileOutlined />}
          color="#1890ff"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow
                label="Occupation Type"
                value={customer.occupationType}
              />
              <InfoRow
                label="Company / Business Name"
                value={customer.companyName}
              />
              <InfoRow label="Company Type" value={customer.companyType} />
              <InfoRow label="Designation" value={customer.designation} />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Nature of Business"
                value={(customer.businessNature || []).join(", ")}
              />
              <InfoRow label="Monthly Salary" value={customer.salaryMonthly} />
              <InfoRow
                label="Incorporation Year"
                value={customer.incorporationYear}
              />
              <InfoRow label="Office Phone" value={customer.employmentPhone} />
            </Col>
          </Row>

          {(customer.employmentAddress ||
            customer.employmentPincode ||
            customer.employmentCity) && (
            <>
              <Divider style={{ margin: "10px 0" }} />
              <InfoRow
                label="Office Address"
                value={customer.employmentAddress}
              />
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <InfoRow
                    label="Office Pincode"
                    value={customer.employmentPincode}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <InfoRow
                    label="Office City"
                    value={customer.employmentCity}
                  />
                </Col>
              </Row>
            </>
          )}
        </SectionCard>

        {/* Income Details */}
        <SectionCard
          title="Income Details"
          icon={<ProfileOutlined />}
          color="#faad14"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow label="PAN Number" value={customer.panNumber} />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Total Income (as per ITR)"
                value={customer.itrYears}
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
              <InfoRow label="Bank Name" value={customer.bankName} />
              <InfoRow label="Account Type" value={customer.accountType} />
              <InfoRow label="Account Number" value={customer.accountNumber} />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow label="IFSC Code" value={customer.ifsc} />
              <InfoRow label="Branch" value={customer.branch} />
              <InfoRow
                label="Account Since (Years)"
                value={customer.accountSinceYears}
              />
            </Col>
          </Row>
        </SectionCard>

        {/* References */}
        <SectionCard title="References" icon={<TeamOutlined />} color="#13c2c2">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <div
                style={{
                  padding: 10,
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Reference 1
                </div>
                <InfoRow label="Name" value={customer?.reference1?.name} />
                <InfoRow label="Mobile" value={customer?.reference1?.mobile} />
                <InfoRow
                  label="Address"
                  value={customer?.reference1?.address}
                />
                <InfoRow
                  label="Pincode"
                  value={customer?.reference1?.pincode}
                />
                <InfoRow label="City" value={customer?.reference1?.city} />
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div
                style={{
                  padding: 10,
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Reference 2
                </div>
                <InfoRow label="Name" value={customer?.reference2?.name} />
                <InfoRow label="Mobile" value={customer?.reference2?.mobile} />
                <InfoRow
                  label="Address"
                  value={customer?.reference2?.address}
                />
                <InfoRow
                  label="Pincode"
                  value={customer?.reference2?.pincode}
                />
                <InfoRow label="City" value={customer?.reference2?.city} />
              </div>
            </Col>
          </Row>
        </SectionCard>

        {/* KYC Details */}
        <SectionCard
          title="KYC / Identity Proofs"
          icon={<IdcardOutlined />}
          color="#722ed1"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow label="Aadhaar Number" value={customer.aadhaarNumber} />
              <InfoRow
                label="Passport Number"
                value={customer.passportNumber}
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow label="GST Number" value={customer.gstNumber} />
              <InfoRow
                label="Driving License Number"
                value={customer.dlNumber}
              />
            </Col>
          </Row>
        </SectionCard>

        {/* Nominee */}
        <SectionCard
          title="Nominee Details"
          icon={<UserOutlined />}
          color="#9254de"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <InfoRow label="Nominee Name" value={customer.nomineeName} />
              <InfoRow
                label="Nominee Relation"
                value={customer.nomineeRelation}
              />
            </Col>
            <Col xs={24} md={12}>
              <InfoRow
                label="Nominee DOB"
                value={formatDate(customer.nomineeDob)}
              />
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
            fontWeight: 600,
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
            fontWeight: 700,
          }}
        >
          Edit Customer
        </button>
      </div>
    </Modal>
  );
};

export default CustomerViewModal;
