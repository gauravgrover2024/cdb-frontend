import React, { useEffect, useState } from "react";
import { Form, Input, Row, Col, Divider, Select } from "antd";
import Icon from "../../../components/AppIcon";

const { Option } = Select;
const { TextArea } = Input;

const ReferenceDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  
  // Watch PINCODES
  const pincode1 = Form.useWatch(["reference1", "pincode"], form);
  const pincode2 = Form.useWatch(["reference2", "pincode"], form);

  const [fetching1, setFetching1] = useState(false);
  const [fetching2, setFetching2] = useState(false);

  // Show in customer module & financed loans
  const showReferences = isFinanced !== "No";

  // FETCH PINCODE 1
  useEffect(() => {
    if (pincode1 && pincode1.length === 6) {
      const fetchCity = async () => {
        try {
          setFetching1(true);
          const response = await fetch(`https://api.postalpincode.in/pincode/${pincode1}`);
          const data = await response.json();
          if (data && data[0]?.Status === "Success") {
             const postOffices = data[0].PostOffice;
             if (postOffices && postOffices.length > 0) {
                form.setFieldsValue({ reference1: { city: postOffices[0].District } });
             }
          }
        } catch (error) {
           console.error("Ref1 Pincode fetch failed", error);
        } finally {
           setFetching1(false);
        }
      };
      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [pincode1, form]);

  // FETCH PINCODE 2
  useEffect(() => {
    if (pincode2 && pincode2.length === 6) {
      const fetchCity = async () => {
        try {
          setFetching2(true);
          const response = await fetch(`https://api.postalpincode.in/pincode/${pincode2}`);
          const data = await response.json();
          if (data && data[0]?.Status === "Success") {
             const postOffices = data[0].PostOffice;
             if (postOffices && postOffices.length > 0) {
                form.setFieldsValue({ reference2: { city: postOffices[0].District } });
             }
          }
        } catch (error) {
           console.error("Ref2 Pincode fetch failed", error);
        } finally {
           setFetching2(false);
        }
      };
      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [pincode2, form]);

  if (!showReferences) {
    return null;
  }

  return (
    <div 
        id="section-other" 
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      {/* SECTION HEADER */}
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
             <Icon name="Users" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">References</span>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* REFERENCE 1 */}
        <Col xs={24} md={12}>
          <div className="rounded-2xl border border-border p-4 h-full bg-foreground/5">
            <Divider plain className="!m-0 !mb-4 border-border">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reference 1</span>
            </Divider>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Form.Item label="Name" name={["reference1", "name"]} normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
                  <Input placeholder="Reference Name" className="rounded-xl border-border placeholder:font-normal" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item 
                  label="Mobile No" 
                  name={["reference1", "mobile"]}
                  rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits required' }]}
                >
                  <Input
                    placeholder="Mobile Number"
                    prefix={<Icon name="Phone" size={14} />}
                    maxLength={10}
                    className="rounded-xl border-border placeholder:font-normal"
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Address" name={["reference1", "address"]} normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
                  <TextArea
                    rows={2}
                    placeholder="House No, Street, Area"
                    className="rounded-xl border-border placeholder:font-normal"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item 
                  label="Pincode" 
                  name={["reference1", "pincode"]}
                  rules={[{ pattern: /^[0-9]{6}$/, message: '6 digits required' }]}
                >
                  <Input placeholder="6-Digit Pincode" maxLength={6} className="rounded-xl border-border placeholder:font-normal" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="City" name={["reference1", "city"]}>
                  <Input placeholder="City (Auto-Filled)" className="rounded-xl border-border placeholder:font-normal" suffix={fetching1 ? <span style={{fontSize: 10, color: '#aaa'}}>...</span> : null} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Relation" name={['reference1', 'relation']}>
                  <Select placeholder="Relation" className="rounded-xl border-border w-full placeholder:font-normal">
                    <Option value="Family">Family</Option>
                    <Option value="Friend">Friend</Option>
                    <Option value="Colleague">Colleague</Option>
                    <Option value="Neighbor">Neighbor</Option>
                    <Option value="Relative">Relative</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              
            </Row>
          </div>
        </Col>

        {/* REFERENCE 2 */}
        <Col xs={24} md={12}>
          <div className="rounded-2xl border border-border p-4 h-full bg-foreground/5">
             <Divider plain className="!m-0 !mb-4 border-border">
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reference 2</span>
             </Divider>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Form.Item label="Name" name={["reference2", "name"]} normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
                  <Input placeholder="Reference Name" className="rounded-xl border-border placeholder:font-normal" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item 
                  label="Mobile No" 
                  name={["reference2", "mobile"]}
                  rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits required' }]}
                >
                  <Input
                    placeholder="Mobile Number"
                    prefix={<Icon name="Phone" size={14} />}
                    maxLength={10}
                    className="rounded-xl border-border placeholder:font-normal"
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Address" name={["reference2", "address"]} normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
                  <TextArea
                    rows={2}
                    placeholder="House No, Street, Area"
                    className="rounded-xl border-border placeholder:font-normal"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item 
                  label="Pincode" 
                  name={["reference2", "pincode"]}
                  rules={[{ pattern: /^[0-9]{6}$/, message: '6 digits required' }]}
                >
                  <Input placeholder="6-Digit Pincode" maxLength={6} className="rounded-xl border-border placeholder:font-normal" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="City" name={["reference2", "city"]}>
                  <Input placeholder="City (Auto-Filled)" className="rounded-xl border-border placeholder:font-normal" suffix={fetching2 ? <span style={{fontSize: 10, color: '#aaa'}}>...</span> : null} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Relation" name={['reference2', 'relation']}>
                  <Select placeholder="Relation" className="rounded-xl border-border w-full placeholder:font-normal">
                    <Option value="Family">Family</Option>
                    <Option value="Friend">Friend</Option>
                    <Option value="Colleague">Colleague</Option>
                    <Option value="Neighbor">Neighbor</Option>
                    <Option value="Relative">Relative</Option>
                    <Option value="Other">Other</Option>
                  </Select>
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
