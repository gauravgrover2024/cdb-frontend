import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Form,
  Input,
  Select,
  Row,
  Col,
  DatePicker,
  TimePicker,
  Radio,
  AutoComplete,
} from "antd";


import Icon from "../../../../../components/AppIcon";

const LeadDetails = () => {
  const form = Form.useFormInstance();
  
  // Showroom/Dealer autocomplete options
  const [showroomOptions] = useState([
    { value: "Landmark Motors" },
    { value: "Elite Auto Showroom" },
    { value: "Prime Vehicles" },
    { value: "Royal Motors" },
    { value: "City Car Showroom" },
  ]);

  const applicantType = Form.useWatch("applicantType", form);
  const source = Form.useWatch("source", form);

  const dealerName = Form.useWatch("dealerName", form);
  const dealerAddress = Form.useWatch("dealerAddress", form);
  const dealerMobile = Form.useWatch("dealerMobile", form);

  const sourceDetails = Form.useWatch("sourceDetails", form);

  // Set default date and time
  useEffect(() => {
    const currentLeadDate = form.getFieldValue("leadDate");
    const currentLeadTime = form.getFieldValue("leadTime");
    
    if (!currentLeadDate) {
      form.setFieldValue("leadDate", dayjs());
    }
    if (!currentLeadTime) {
      form.setFieldValue("leadTime", dayjs());
    }
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
    <div id="section-lead-details" className="form-section">
      {/* SECTION HEADER */}
      <div className="section-header mb-6">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="UserRoundSearch" size={20} />
          </div>
          <span className="text-lg font-medium text-foreground">Lead Details</span>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* TOP CARD: PRIMARY LEAD INFO */}
        <Col xs={24}>
           <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Icon name="Calendar" size={12} className="text-primary" />
                Primary Lead Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Form.Item label="Lead Date" name="leadDate" className="mb-0">
                  <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" className="rounded-xl h-10" />
                </Form.Item>

                <Form.Item label="Lead Time" name="leadTime" className="mb-0">
                  <TimePicker style={{ width: "100%" }} format="HH:mm" className="rounded-xl h-10" />
                </Form.Item>

                <Form.Item label="Lead Source Type" name="source" className="mb-0">
                  <Select placeholder="Select source" className="h-10 rounded-xl">
                    <Select.Option value="Direct">Direct</Select.Option>
                    <Select.Option value="Indirect">Indirect</Select.Option>
                  </Select>
                </Form.Item>
              </div>
           </div>
        </Col>

        {source && (
          <Col xs={24}>
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 shadow-sm">
               <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {source} Source Information
               </div>
              <Row gutter={[16, 16]}>
                {source === "Indirect" && (
                  <>
                    <Col xs={24} md={8}>
                      <Form.Item label="Dealer Name" name="dealerName" className="mb-0">
                        <AutoComplete
                          options={showroomOptions}
                          placeholder="Enter dealer name"
                          filterOption={(inputValue, option) =>
                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                          }
                          className="rounded-xl"
                        >
                          <Input className="rounded-xl h-10" prefix={<Icon name="Building2" size={14} className="text-muted-foreground" />} />
                        </AutoComplete>
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Dealer Address" name="dealerAddress" className="mb-0">
                        <Input placeholder="Enter dealer address" className="rounded-xl h-10" prefix={<Icon name="MapPin" size={14} className="text-muted-foreground" />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item 
                        label="Dealer Mobile" 
                        name="dealerMobile" 
                        className="mb-0"
                        rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits required' }]}
                      >
                        <Input placeholder="Enter dealer contact" className="rounded-xl h-10" prefix={<Icon name="Phone" size={14} className="text-muted-foreground" />} maxLength={10} />
                      </Form.Item>
                    </Col>
                  </>
                )}

                {source === "Direct" && (
                  <Col xs={24} md={12}>
                    <Form.Item label="Direct Reference / Source Name" name="sourceDetails" className="mb-0">
                      <Input placeholder="e.g. Friend, Social Media, etc." className="rounded-xl h-10" prefix={<Icon name="User" size={14} className="text-muted-foreground" />} />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </div>
          </Col>
        )}

        <Col xs={24}>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Icon name="ShieldCheck" size={12} className="text-primary" />
              Ownership & Workflow
            </div>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <Form.Item label="Assigned Employee" name="dealtBy" className="mb-0">
                  <Input placeholder="Enter handling agent name" className="rounded-xl h-10" prefix={<Icon name="UserCheck" size={14} className="text-muted-foreground" />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Applicant Category" name="applicantType" className="mb-0">
                  <Radio.Group buttonStyle="solid" className="w-full flex">
                    <Radio.Button value="Individual" className="flex-1 text-center h-10 flex items-center justify-center">
                      <div className="flex items-center gap-2 justify-center w-full">
                        <Icon name="User" size={14} />
                        <span>Individual</span>
                      </div>
                    </Radio.Button>
                    <Radio.Button value="Company" className="flex-1 text-center h-10 flex items-center justify-center">
                      <div className="flex items-center gap-2 justify-center w-full">
                        <Icon name="Building" size={14} />
                        <span>Company</span>
                      </div>
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                {applicantType === "Company" && (
                  <Form.Item label="Is MSME Registered?" name="isMSME" className="mb-0">
                    <Select placeholder="Select status" className="h-10 rounded-xl">
                      <Select.Option value="Yes">Yes, Registered</Select.Option>
                      <Select.Option value="No">No</Select.Option>
                    </Select>
                  </Form.Item>
                )}
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default LeadDetails;
