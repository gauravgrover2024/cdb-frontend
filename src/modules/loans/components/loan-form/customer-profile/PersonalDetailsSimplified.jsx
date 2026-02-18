import React, { useState, useEffect } from "react";
import {
  Form,
  Row,
  Col,
  Space,
  Tag,
  Input,
  List,
  Card,
  Empty,
  Select,
} from "antd";
import { UserOutlined, SearchOutlined } from "@ant-design/icons";
import demoCustomers from "../../../../customers/demoCustomers";

const PersonalDetailsSimplified = ({ excludeFields = false }) => {
  const form = Form.useFormInstance();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCustomers([]);
      return;
    }

    const results = demoCustomers.filter(
      (customer) =>
        customer.customerName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.customerNumber &&
          customer.customerNumber.toString().includes(searchTerm))
    );

    setFilteredCustomers(results);
  }, [searchTerm]);

  const handleCustomerSelect = (customer) => {
    const fieldValues = {
      customerName: customer.customerName || customer.name || "",
      customerNumber: customer.customerNumber || "",
      email: customer.email || "",
      primaryMobile: customer.primaryMobile || customer.phone || "",
      ...(excludeFields === false && {
        maritalStatus: customer.maritalStatus || "",
        dependents: customer.dependents || "",
        houseType: customer.houseType || "",
        yearsInCurrentHouse: customer.yearsInCurrentHouse || "",
      }),
    };

    form.setFieldsValue(fieldValues);
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <>
      {/* Search box */}
      <div
        id="section-personal-search"
        style={{
          marginBottom: 32,
          padding: 16,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #f0f0f0",
        }}
      >
        <Space
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <UserOutlined style={{ color: "#722ed1" }} />
            <span style={{ fontWeight: 600 }}>Search & Select Customer</span>
          </Space>
          <Tag color="blue">Quick Fill</Tag>
        </Space>

        <Row gutter={[16, 0]}>
          <Col xs={24}>
            <div style={{ position: "relative" }}>
              <Input
                placeholder="Search by customer name or number..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                style={{ width: "100%" }}
              />

              {isOpen && searchTerm && (
                <Card
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "4px",
                    zIndex: 10,
                    maxHeight: "300px",
                    overflowY: "auto",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  {filteredCustomers.length > 0 ? (
                    <List
                      dataSource={filteredCustomers}
                      renderItem={(customer) => (
                        <List.Item
                          onClick={() => handleCustomerSelect(customer)}
                          style={{
                            padding: "12px",
                            cursor: "pointer",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          <List.Item.Meta
                            title={
                              <span>
                                {customer.customerName || customer.name}
                                <span
                                  style={{
                                    marginLeft: "12px",
                                    color: "#999",
                                    fontSize: "12px",
                                  }}
                                >
                                  #{customer.customerNumber}
                                </span>
                              </span>
                            }
                            description={customer.email || customer.phone}
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="No customers found" />
                  )}
                </Card>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* Form */}
      <div
        style={{
          marginBottom: 32,
          padding: 16,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #f0f0f0",
        }}
      >
        <Space
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <UserOutlined style={{ color: "#722ed1" }} />
            <span style={{ fontWeight: 600 }}>Personal Details</span>
          </Space>
          <Tag color="blue">Core KYC</Tag>
        </Space>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={8}>
            <Form.Item 
              label="Customer Name" 
              name="customerName"
              rules={[
                { required: true, message: 'Customer name is required' }
              ]}
            >
              <Input placeholder="Enter full name" prefix={<UserOutlined />} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Email" name="email">
              <Input placeholder="Enter email" type="email" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item 
              label="Primary Mobile" 
              name="primaryMobile"
              rules={[
                { required: true, message: 'Mobile number is required' },
                { pattern: /^[0-9]{10}$/, message: 'Must be 10 digits' }
              ]}
            >
              <Input placeholder="Enter mobile number" maxLength={10} />
            </Form.Item>
          </Col>

          {!excludeFields && (
            <>
              <Col xs={24} md={8}>
                <Form.Item preserve label="Marital Status" name="maritalStatus">
                  <Select placeholder="Select status">
                    <Select.Option value="Single">Single</Select.Option>
                    <Select.Option value="Married">Married</Select.Option>
                    <Select.Option value="Divorced">Divorced</Select.Option>
                    <Select.Option value="Widowed">Widowed</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item preserve label="Dependents" name="dependents">
                  <Input placeholder="Enter number of dependents" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item preserve label="House Type" name="houseType">
                  <Select placeholder="Select house type">
                    <Select.Option value="owned">Owned</Select.Option>
                    <Select.Option value="rented">Rented</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  preserve
                  label="Years in Current House"
                  name="yearsInCurrentHouse"
                >
                  <Input placeholder="Enter years" />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </div>
    </>
  );
};

export default PersonalDetailsSimplified;
