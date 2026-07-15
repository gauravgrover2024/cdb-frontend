// Home Loan module only - references section with a Personal/Trade reference
// type toggle. This is a fork of modules/customers/customer-form/ReferenceDetails.jsx
// kept separate on purpose: the car-loan module and Customer module use the
// shared component as-is (personal references only), and home-loans has its
// own backend (HomeLoan.js/homeLoanService.js) that stores the extra Trade
// fields (firmName/contactPersonName/contactNumber) - the shared component/
// car-loan backend does not.
import { lookupCityByPincode } from "./pincodeCityLookup";
import React, { useEffect, useState } from "react";
import { Form, Input, Row, Col, Divider, Select } from "antd";
import Icon from "../../../../../components/AppIcon";

const { Option } = Select;
const { TextArea } = Input;

const titleCase = (value) => value?.replace(/\b\w/g, (c) => c.toUpperCase());

const ReferenceBlock = ({ label, prefix, fetching }) => {
  const form = Form.useFormInstance();
  const referenceType = Form.useWatch([prefix, "referenceType"], form) || "Personal";
  const isTrade = referenceType === "Trade";

  return (
    <div className="rounded-2xl border border-border p-4 h-full bg-foreground/5">
      <Divider plain className="!m-0 !mb-4 border-border">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
      </Divider>

      <Row gutter={[12, 12]}>
        <Col xs={24}>
          <Form.Item label="Reference Type" name={[prefix, "referenceType"]} initialValue="Personal">
            <Select className="rounded-xl border-border w-full placeholder:font-normal">
              <Option value="Personal">Personal</Option>
              <Option value="Trade">Trade</Option>
            </Select>
          </Form.Item>
        </Col>

        {isTrade ? (
          <>
            <Col xs={24} md={12}>
              <Form.Item
                label="Firm Name"
                name={[prefix, "firmName"]}
                normalize={titleCase}
              >
                <Input placeholder="Firm Name" className="rounded-xl border-border placeholder:font-normal" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Contact Person Name"
                name={[prefix, "contactPersonName"]}
                normalize={titleCase}
              >
                <Input placeholder="Contact Person Name" className="rounded-xl border-border placeholder:font-normal" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Contact Number"
                name={[prefix, "contactNumber"]}
                rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits required" }]}
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
              <Form.Item
                label="Address"
                name={[prefix, "address"]}
                normalize={titleCase}
              >
                <TextArea
                  rows={2}
                  placeholder="House No, Street, Area"
                  className="rounded-xl border-border placeholder:font-normal"
                />
              </Form.Item>
            </Col>
          </>
        ) : (
          <>
            <Col xs={24} md={12}>
              <Form.Item label="Name" name={[prefix, "name"]} normalize={titleCase}>
                <Input placeholder="Reference Name" className="rounded-xl border-border placeholder:font-normal" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Mobile No"
                name={[prefix, "mobile"]}
                rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits required" }]}
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
              <Form.Item label="Address" name={[prefix, "address"]} normalize={titleCase}>
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
                name={[prefix, "pincode"]}
                rules={[{ pattern: /^[0-9]{6}$/, message: "6 digits required" }]}
              >
                <Input placeholder="6-Digit Pincode" maxLength={6} className="rounded-xl border-border placeholder:font-normal" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="City" name={[prefix, "city"]}>
                <Input
                  placeholder="City (Auto-Filled)"
                  className="rounded-xl border-border placeholder:font-normal"
                  suffix={fetching ? <span style={{ fontSize: 10, color: "#aaa" }}>...</span> : null}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Relation" name={[prefix, "relation"]}>
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
          </>
        )}
      </Row>
    </div>
  );
};

const HomeLoanReferenceDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  const pincode1 = Form.useWatch(["reference1", "pincode"], form);
  const pincode2 = Form.useWatch(["reference2", "pincode"], form);

  const [fetching1, setFetching1] = useState(false);
  const [fetching2, setFetching2] = useState(false);

  const showReferences = isFinanced !== "No";

  useEffect(() => {
    if (pincode1 && pincode1.length === 6) {
      const fetchCity = async () => {
        setFetching1(true);
        const city = await lookupCityByPincode(pincode1);
        if (city) {
          form.setFieldsValue({ reference1: { city } });
        }
        setFetching1(false);
      };
      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [pincode1, form]);

  useEffect(() => {
    if (pincode2 && pincode2.length === 6) {
      const fetchCity = async () => {
        setFetching2(true);
        const city = await lookupCityByPincode(pincode2);
        if (city) {
          form.setFieldsValue({ reference2: { city } });
        }
        setFetching2(false);
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
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
             <Icon name="Users" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">References</span>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <ReferenceBlock label="Reference 1" prefix="reference1" fetching={fetching1} />
        </Col>
        <Col xs={24} md={12}>
          <ReferenceBlock label="Reference 2" prefix="reference2" fetching={fetching2} />
        </Col>
      </Row>
    </div>
  );
};

export default HomeLoanReferenceDetails;
