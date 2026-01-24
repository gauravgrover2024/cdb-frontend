// src/modules/loans/components/loan-form/prefile/Section7RecordDetails.jsx
import React, { useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Row,
  Col,
  Card,
  Radio,
  DatePicker,
  TimePicker,
  AutoComplete,
} from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;

/* Dummy employee list (replace with API later) */
const EMPLOYEES = [
  { value: "Amit Sharma" },
  { value: "Neha Verma" },
  { value: "Rahul Singh" },
  { value: "Pooja Mehta" },
];

const Section7RecordDetails = () => {
  const form = Form.useFormInstance();

  const source = Form.useWatch("recordSource", form);
  const payoutApplicable = Form.useWatch("payoutApplicable", form);

  // ✅ Default Receiving Date & Time = NOW (only if empty)
  useEffect(() => {
    const receivingDate = form.getFieldValue("receivingDate");
    const receivingTime = form.getFieldValue("receivingTime");

    if (!receivingDate) form.setFieldsValue({ receivingDate: dayjs() });
    if (!receivingTime) form.setFieldsValue({ receivingTime: dayjs() });
  }, [form]);

  return (
    <Card
      title={
        <span>
          <FileTextOutlined style={{ marginRight: 8, color: "#722ed1" }} />
          Record Details
        </span>
      }
      style={{
        marginBottom: 24,
        borderRadius: 12,
      }}
    >
      <Row gutter={[16, 12]}>
        {/* Receiving Date */}
        <Col xs={24} md={6}>
          <Form.Item
            label="Receiving Date"
            name="receivingDate"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        {/* Receiving Time */}
        <Col xs={24} md={6}>
          <Form.Item
            label="Receiving Time"
            name="receivingTime"
            rules={[{ required: true }]}
          >
            <TimePicker style={{ width: "100%" }} format="HH:mm" />
          </Form.Item>
        </Col>

        {/* BREAK ROW */}
        <Col span={24} />

        {/* Source */}
        <Col xs={24} md={6}>
          <Form.Item
            label="Source"
            name="recordSource"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select source">
              <Option value="Direct">Direct</Option>
              <Option value="Indirect">Indirect</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Source Name */}
        {source && (
          <Col xs={24} md={6}>
            <Form.Item
              label={source === "Direct" ? "Source Name" : "Dealer / Channel"}
              name="sourceName"
              rules={[{ required: true }]}
            >
              <Input placeholder="Enter name" />
            </Form.Item>
          </Col>
        )}

        {/* INDIRECT FLOW */}
        {source === "Indirect" && (
          <>
            <Col xs={24} md={6}>
              <Form.Item
                label="Dealer Mobile"
                name="dealerMobile"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label="Dealer Address"
                name="dealerAddress"
                rules={[{ required: true }]}
              >
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>

            {/* Payout */}
            <Col xs={24} md={6}>
              <Form.Item
                label="Is Payout Applicable"
                name="payoutApplicable"
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Radio value="Yes">Yes</Radio>
                  <Radio value="No">No</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            {payoutApplicable === "Yes" && (
              <Col xs={24} md={6}>
                <Form.Item
                  label="Source Payout % (To be given)"
                  name="prefile_sourcePayoutPercentage"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Eg: 1.5" />
                </Form.Item>
              </Col>
            )}
          </>
        )}

        {/* Reference */}
        <Col xs={24} md={6}>
          <Form.Item label="Reference Name & Number" name="referenceDetails">
            <Input />
          </Form.Item>
        </Col>

        {/* Dealt By – Auto-suggest */}
        <Col xs={24} md={6}>
          <Form.Item
            label="Dealt By"
            name="dealtBy"
            rules={[{ required: true }]}
          >
            <AutoComplete
              options={EMPLOYEES}
              placeholder="Select employee"
              filterOption={(input, option) =>
                option.value.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Col>

        {/* Docs Prepared By – Auto-suggest */}
        <Col xs={24} md={6}>
          <Form.Item
            label="Docs Prepared By"
            name="docsPreparedBy"
            rules={[{ required: true }]}
          >
            <AutoComplete
              options={EMPLOYEES}
              placeholder="Select employee"
              filterOption={(input, option) =>
                option.value.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
};

export default Section7RecordDetails;
