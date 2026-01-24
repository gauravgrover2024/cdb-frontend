import React, { useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Row,
  Col,
  Space,
  DatePicker,
  TimePicker,
  Radio,
} from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const LeadDetails = () => {
  const form = Form.useFormInstance();

  const applicantType = Form.useWatch("applicantType", form);
  const source = Form.useWatch("source", form);

  const dealerName = Form.useWatch("dealerName", form);
  const dealerAddress = Form.useWatch("dealerAddress", form);
  const dealerMobile = Form.useWatch("dealerMobile", form);

  const sourceDetails = Form.useWatch("sourceDetails", form);

  // ✅ 1) Default Lead Date & Time = NOW (only if empty)
  useEffect(() => {
    const leadDate = form.getFieldValue("leadDate");
    const leadTime = form.getFieldValue("leadTime");

    if (!leadDate) form.setFieldsValue({ leadDate: dayjs() });
    if (!leadTime) form.setFieldsValue({ leadTime: dayjs() });
  }, [form]);

  // ✅ 2) Wire LeadDetails -> Section7 Record Details (safe sync)
  useEffect(() => {
    if (!source) return;

    const currentRecordSource = form.getFieldValue("recordSource");

    // If user already selected recordSource manually and it conflicts, allow LeadDetails to update it
    // (LeadDetails acts as the source of truth)
    if (source === "Indirect") {
      form.setFieldsValue({
        recordSource: "Indirect",

        // Dealer / Channel name must be in sourceName (Section7)
        sourceName: dealerName || "",

        dealerAddress: dealerAddress || "",
        dealerMobile: dealerMobile || "",

        // Clear direct-only field
        sourceDetails: "",
      });

      // OPTIONAL: if switching from Direct -> Indirect, clear old direct mapping
      if (currentRecordSource === "Direct") {
        form.setFieldsValue({
          sourceName: dealerName || "",
        });
      }
    }

    if (source === "Direct") {
      form.setFieldsValue({
        recordSource: "Direct",

        // Direct source name should go into sourceName for Section7
        sourceName: sourceDetails || "",

        // Clear indirect-only fields
        dealerName: "",
        dealerAddress: "",
        dealerMobile: "",
      });

      // OPTIONAL: if switching from Indirect -> Direct, clear old indirect mapping
      if (currentRecordSource === "Indirect") {
        form.setFieldsValue({
          sourceName: sourceDetails || "",
        });
      }
    }
  }, [form, source, dealerName, dealerAddress, dealerMobile, sourceDetails]);

  return (
    <div
      id="section-lead-details"
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
        <FileTextOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600 }}>Lead Details</span>
      </Space>

      <Row gutter={[16, 16]}>
        {/* DATE */}
        <Col xs={24} md={8}>
          <Form.Item label="Lead Date" name="leadDate">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
        </Col>

        {/* TIME */}
        <Col xs={24} md={8}>
          <Form.Item label="Lead Time" name="leadTime">
            <TimePicker style={{ width: "100%" }} format="HH:mm" />
          </Form.Item>
        </Col>

        {/* SOURCE */}
        <Col xs={24} md={8}>
          <Form.Item label="Source" name="source">
            <Select placeholder="Select source">
              <Select.Option value="Direct">Direct</Select.Option>
              <Select.Option value="Indirect">Indirect</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        {/* SOURCE DETAILS */}
        {source && (
          <Col xs={24}>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                background: "#fafafa",
                border: "1px dashed #e0e0e0",
              }}
            >
              <Row gutter={[16, 16]}>
                {source === "Indirect" && (
                  <>
                    <Col xs={24} md={8}>
                      <Form.Item label="Dealer Name" name="dealerName">
                        <Input placeholder="Dealer name" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Dealer Address" name="dealerAddress">
                        <Input placeholder="Dealer address" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Dealer Mobile" name="dealerMobile">
                        <Input placeholder="Dealer mobile number" />
                      </Form.Item>
                    </Col>
                  </>
                )}

                {source === "Direct" && (
                  <Col xs={24} md={12}>
                    <Form.Item label="Source Name" name="sourceDetails">
                      <Input placeholder="Source / reference name" />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </div>
          </Col>
        )}

        {/* DEALT BY */}
        <Col xs={24} md={8}>
          <Form.Item label="Dealt By" name="dealtBy">
            <Input placeholder="Employee / agent name" />
          </Form.Item>
        </Col>

        {/* APPLICANT TYPE */}
        <Col xs={24} md={8}>
          <Form.Item label="Applicant Type" name="applicantType">
            <Radio.Group>
              <Radio value="Individual">Individual</Radio>
              <Radio value="Company">Company</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>

        {/* IS MSME */}
        <Col xs={24} md={8}>
          {applicantType === "Company" && (
            <Form.Item label="Is MSME" name="isMSME">
              <Select placeholder="Select">
                <Select.Option value="Yes">Yes</Select.Option>
                <Select.Option value="No">No</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default LeadDetails;
