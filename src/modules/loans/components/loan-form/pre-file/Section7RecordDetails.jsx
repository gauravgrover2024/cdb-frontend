// src/modules/loans/components/loan-form/prefile/Section7RecordDetails.jsx
import React, { useEffect, useState } from "react";
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
  Spin,
} from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getEmployees, formatEmployeesForAutocomplete } from "../../../../../api/employees";

const { Option } = Select;

const Section7RecordDetails = () => {
  const form = Form.useFormInstance();
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Watch fields from LeadDetails
  const leadSource = Form.useWatch("source", form);
  const dealerName = Form.useWatch("dealerName", form);
  const dealerAddress = Form.useWatch("dealerAddress", form);
  const dealerMobile = Form.useWatch("dealerMobile", form);
  const sourceDetails = Form.useWatch("sourceDetails", form);

  // Watch fields from RecordDetails
  const recordSource = Form.useWatch("recordSource", form);
  const payoutApplicable = Form.useWatch("payoutApplicable", form);

  // ✅ Fetch employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const data = await getEmployees();
        const formatted = formatEmployeesForAutocomplete(data);
        setEmployees(formatted);
      } catch (error) {
        console.error('Failed to load employees:', error);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    
    fetchEmployees();
  }, []);

  // ✅ Default Receiving Date & Time = NOW (only if empty)
  useEffect(() => {
    const receivingDate = form.getFieldValue("receivingDate");
    const receivingTime = form.getFieldValue("receivingTime");

    if (!receivingDate) form.setFieldsValue({ receivingDate: dayjs() });
    if (!receivingTime) form.setFieldsValue({ receivingTime: dayjs() });
  }, [form]);

  // ✅ Auto-sync recordSource from LeadDetails.source
  useEffect(() => {
    if (!leadSource) return;

    // Only update if not manually set yet or if it conflicts
    const currentRecordSource = form.getFieldValue("recordSource");
    if (!currentRecordSource || currentRecordSource !== leadSource) {
      form.setFieldsValue({
        recordSource: leadSource,
      });

      // Pre-populate source-specific fields based on leadSource
      if (leadSource === "Indirect") {
        form.setFieldsValue({
          sourceName: dealerName || "",
          dealerMobile: dealerMobile || "",
          dealerAddress: dealerAddress || "",
        });
      } else if (leadSource === "Direct") {
        form.setFieldsValue({
          sourceName: sourceDetails || "",
        });
      }
    }
  }, [leadSource, dealerName, dealerAddress, dealerMobile, sourceDetails, form]);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <FileTextOutlined className="text-purple-600" />
          </div>
          <span className="text-base">Record Details</span>
        </div>
      }
      className="border border-border/60 shadow-sm hover:shadow-md transition-shadow"
      styles={{
        header: { borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '12px 24px' },
        body: { padding: '24px' }
      }}
      style={{
        marginBottom: 24,
        borderRadius: 16,
      }}
    >
      <Row gutter={[24, 0]}>
        {/* Row 1: Date, Time, Source Type */}
        <Col xs={24} md={8}>
          <Form.Item
            label="Receiving Date"
            name="receivingDate"
            rules={[{ required: true, message: 'Select date' }]}
          >
            <DatePicker style={{ width: "100%" }} className="h-10 rounded-lg" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label="Receiving Time"
            name="receivingTime"
            rules={[{ required: true, message: 'Select time' }]}
          >
            <TimePicker style={{ width: "100%" }} className="h-10 rounded-lg" format="HH:mm" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label="Source"
            name="recordSource"
            rules={[{ required: true, message: 'Select source' }]}
          >
            <Select 
              placeholder="Select source type" 
              className="h-10"
              dropdownStyle={{ borderRadius: '8px' }}
            >
              <Option value="Direct">Direct</Option>
              <Option value="Indirect">Indirect</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Row 2: Source Name, Reference Name, Reference Number */}
        {recordSource && (
          <Col xs={24} md={8}>
            <Form.Item
              label={recordSource === "Direct" ? "Source Name" : "Dealer / Channel"}
              name="sourceName"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="Enter name" className="h-10 rounded-lg" />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} md={8}>
          <Form.Item
            label="Reference Name"
            name="referenceName"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Enter reference name" className="h-10 rounded-lg" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label="Reference Number"
            name="referenceNumber"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Enter mobile/phone" className="h-10 rounded-lg" />
          </Form.Item>
        </Col>

        {/* Row 3 (Indirect Flow): Mobile, Payout Choice, Payout %, Address */}
        {recordSource === "Indirect" && (
          <>
            <Col xs={24} md={6}>
              <Form.Item
                label="Dealer Mobile"
                name="dealerMobile"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="Mobile No." className="h-10 rounded-lg" />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                label="Payout Applicable"
                name="payoutApplicable"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Radio.Group className="h-10 flex items-center">
                  <Radio value="Yes">Yes</Radio>
                  <Radio value="No">No</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            {payoutApplicable === "Yes" ? (
              <>
                <Col xs={24} md={4}>
                  <Form.Item
                    label="Payout %"
                    name="prefile_sourcePayoutPercentage"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder="%" className="h-10 rounded-lg" suffix="%" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Dealer Address"
                    name="dealerAddress"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input className="h-10 rounded-lg" placeholder="Enter dealer address" />
                  </Form.Item>
                </Col>
              </>
            ) : (
              <Col xs={24} md={12}>
                <Form.Item
                  label="Dealer Address"
                  name="dealerAddress"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input className="h-10 rounded-lg" placeholder="Enter full dealer address" />
                </Form.Item>
              </Col>
            )}
          </>
        )}

        {/* Row 4: Assignment Info */}
        <Col xs={24} md={12}>
          <Form.Item
            label="Dealt By"
            name="dealtBy"
            rules={[{ required: true, message: 'Required' }]}
          >
            <AutoComplete
              options={employees}
              className="w-full h-10"
              placeholder="Select employee"
              filterOption={(input, option) =>
                option?.value?.toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={loadingEmployees ? <Spin size="small" /> : null}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Docs Prepared By"
            name="docsPreparedBy"
            rules={[{ required: true, message: 'Required' }]}
          >
            <AutoComplete
              options={employees}
              className="w-full h-10"
              placeholder="Select employee"
              filterOption={(input, option) =>
                option?.value?.toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={loadingEmployees ? <Spin size="small" /> : null}
            />
          </Form.Item>
        </Col>
      </Row>

    </Card>
  );
};

export default Section7RecordDetails;

