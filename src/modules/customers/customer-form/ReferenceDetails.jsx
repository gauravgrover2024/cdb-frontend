import React from "react";
import { Form, Input, Row, Col, Space, Divider } from "antd";
import { TeamOutlined, HomeOutlined, PhoneOutlined } from "@ant-design/icons";

const { TextArea } = Input;

const ReferenceDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  // Show in customer module & financed loans
  const showReferences = isFinanced !== "No";

  if (!showReferences) {
    return null;
  }

  return (
    <div
      id="section-other"
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      {/* SECTION HEADER */}
      <Space
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
        }}
      >
        <TeamOutlined style={{ color: "#13c2c2" }} />
        <span style={{ fontWeight: 600 }}>References</span>
      </Space>

      <Row gutter={[16, 16]}>
        {/* REFERENCE 1 */}
        <Col xs={24} md={12}>
          <div
            style={{
              borderRadius: 10,
              border: "1px solid #f0f0f0",
              padding: 16,
              height: "100%",
              background: "#fafafa",
            }}
          >
            <Divider plain style={{ margin: "0 0 16px" }}>
              Reference 1
            </Divider>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Form.Item label="Name" name={["reference1", "name"]}>
                  <Input placeholder="Reference name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Mobile No" name={["reference1", "mobile"]}>
                  <Input
                    placeholder="Mobile number"
                    prefix={<PhoneOutlined />}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Address" name={["reference1", "address"]}>
                  <TextArea
                    rows={2}
                    placeholder="House no, street, area"
                    prefix={<HomeOutlined />}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Pincode" name={["reference1", "pincode"]}>
                  <Input placeholder="6-digit pincode" maxLength={6} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="City" name={["reference1", "city"]}>
                  <Input placeholder="City" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Col>

        {/* REFERENCE 2 */}
        <Col xs={24} md={12}>
          <div
            style={{
              borderRadius: 10,
              border: "1px solid #f0f0f0",
              padding: 16,
              height: "100%",
              background: "#fafafa",
            }}
          >
            <Divider plain style={{ margin: "0 0 16px" }}>
              Reference 2
            </Divider>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Form.Item label="Name" name={["reference2", "name"]}>
                  <Input placeholder="Reference name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Mobile No" name={["reference2", "mobile"]}>
                  <Input
                    placeholder="Mobile number"
                    prefix={<PhoneOutlined />}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Address" name={["reference2", "address"]}>
                  <TextArea
                    rows={2}
                    placeholder="House no, street, area"
                    prefix={<HomeOutlined />}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Pincode" name={["reference2", "pincode"]}>
                  <Input placeholder="6-digit pincode" maxLength={6} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="City" name={["reference2", "city"]}>
                  <Input placeholder="City" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ReferenceDetails;
