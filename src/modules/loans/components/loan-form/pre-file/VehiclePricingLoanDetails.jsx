// src/modules/loans/components/loan-form/prefile/Section4VehiclePricing.jsx
import React, { useEffect } from "react";

import {
  Form,
  Input,
  Select,
  Row,
  Col,
  Card,
  Divider,
  Radio,
  InputNumber,
  Tag,
  Spin,
  AutoComplete,
} from "antd";
import { CarOutlined } from "@ant-design/icons";
import { useVehicleData } from "../../../../../hooks/useVehicleData";

const { Option } = Select;

// Comprehensive list of Indian cities (100+ major cities)
const INDIAN_CITIES = [
  // Metro Cities
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
  
  // Tier 1 Cities
  "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
  "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana",
  "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivali",
  
  // Tier 2 Cities
  "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
  "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur",
  "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota",
  
  // State Capitals & Important Cities
  "Chandigarh", "Guwahati", "Thiruvananthapuram", "Solapur", "Hubli-Dharwad",
  "Tiruchirappalli", "Tiruppur", "Moradabad", "Mysore", "Bareilly", "Gurgaon",
  "Aligarh", "Jalandhar", "Bhubaneswar", "Salem", "Mira-Bhayandar", "Warangal",
  "Guntur", "Bhiwandi", "Saharanpur", "Gorakhpur", "Bikaner", "Amravati",
  "Noida", "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi",
  
  // Other Major Cities
  "Dehradun", "Durgapur", "Asansol", "Nanded", "Kolhapur", "Ajmer",
  "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri",
  "Jhansi", "Ulhasnagar", "Jammu", "Sangli-Miraj-Kupwad", "Mangalore",
  "Erode", "Belgaum", "Ambattur", "Tirunelveli", "Malegaon", "Gaya",
  "Jalgaon", "Udaipur", "Maheshtala", "Davanagere", "Kozhikode", "Kurnool",
  "Rajahmundry", "Bokaro", "South Dumdum", "Bellary", "Patiala", "Gopalpur",
  "Agartala", "Bhagalpur", "Muzaffarnagar", "Bhatpara", "Panihati", "Latur",
  "Dhule", "Tirupati", "Rohtak", "Korba", "Bhilwara", "Berhampur", "Muzaffarpur",
  "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa", "Kamarhati",
  "Sambalpur", "Bilaspur", "Shahjahanpur", "Satara", "Bijapur", "Rampur",
  "Shimoga", "Chandrapur", "Junagadh", "Thrissur", "Alwar", "Bardhaman",
  "Kulti", "Kakinada", "Nizamabad", "Parbhani", "Tumkur", "Khammam",
  "Ozhukarai", "Bihar Sharif", "Panipat", "Darbhanga", "Bally", "Aizawl",
  "Dewas", "Ichalkaranji", "Karnal", "Bathinda", "Jalna", "Eluru",
  "Kirari Suleman Nagar", "Barasat", "Purnia", "Satna", "Mau", "Sonipat",
  "Farrukhabad", "Sagar", "Rourkela", "Durg", "Imphal", "Ratlam",
  "Hapur", "Arrah", "Karimnagar", "Anantapur", "Etawah", "Ambernath",
  "North Dumdum", "Bharatpur", "Begusarai", "New Delhi", "Gandhidham",
  "Baranagar", "Tiruvottiyur", "Puducherry", "Sikar", "Thoothukudi",
  "Raigarh", "Gonder", "Habra", "Bhusawal", "Orai", "Bahraich",
  "Vellore", "Mahesana", "Sambalpur", "Raiganj", "Sirsa", "Danapur",
  "Serampore", "Sultan Pur Majra", "Guna", "Jaunpur", "Panvel", "Shivpuri",
  "Surendranagar Dudhrej", "Unnao", "Hugli and Chinsurah", "Alappuzha",
  "Kottayam", "Machilipatnam", "Shimla", "Adoni", "Udupi", "Katihar",
  "Proddatur", "Mahbubnagar", "Saharsa", "Dibrugarh", "Jorhat", "Hazaribagh"
];

/**
 * Section4VehiclePricing
 * - Make / Model / Variant are shown for ALL loan types
 * - New Car => full pricing + sticky summary on the right
 * - Used / Cash-in / Refinance => minimal fields (plus usage/purpose where required)
 * - Hypothecation = Yes => Bank Name required
 * - Dealer now includes Contact Person + Contact Number
 *
 * Copy-paste safe.
 */

const Section4VehiclePricing = () => {
  const form = Form.useFormInstance();

  // Use centralized vehicle data hook
  const {
    makes,
    models,
    variants,
    loading: vehicleLoading,
    handleMakeChange,
    handleModelChange,
    handleVariantChange,
  } = useVehicleData(form, {
    makeFieldName: "vehicleMake",
    modelFieldName: "vehicleModel",
    variantFieldName: "vehicleVariant",
    autofillPricing: true,
    onVehicleSelect: (vehicleData) => {
      console.log("Vehicle selected from master data:", vehicleData);
      // Auto-populate pricing if needed
      if (vehicleData && loanType === "New Car") {
        const currentValues = form.getFieldsValue();
        const fieldsToUpdate = {};

        if (!currentValues.exShowroomPrice && vehicleData.exShowroom) {
          fieldsToUpdate.exShowroomPrice = vehicleData.exShowroom;
        }
        if (!currentValues.insuranceCost && vehicleData.insurance) {
          fieldsToUpdate.insuranceCost = vehicleData.insurance;
        }
        if (!currentValues.roadTax && vehicleData.rto) {
          fieldsToUpdate.roadTax = vehicleData.rto;
        }

        if (Object.keys(fieldsToUpdate).length > 0) {
          form.setFieldsValue(fieldsToUpdate);
        }
      }
    },
  });

  useEffect(() => {
    const make = form.getFieldValue("vehicleMake");
    const model = form.getFieldValue("vehicleModel");
    const variant = form.getFieldValue("vehicleVariant");

    form.setFieldsValue({
      vehicleMake: make,
      vehicleModel: model,
      vehicleVariant: variant,
    });
  }, [form]);

  const loanType = Form.useWatch("typeOfLoan", form);
  const hypothecation = Form.useWatch("hypothecation", form);
  const aadhaarSame = Form.useWatch("registerSameAsAadhaar", form);

  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);

  const v = Form.useWatch([], form) || {};

  // numeric helpers (coerce to integers; no decimals as requested)
  const asInt = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.trunc(n);
  };

  const exShowroom = asInt(v.exShowroomPrice);
  const insurance = asInt(v.insuranceCost);
  const roadTax = asInt(v.roadTax);
  const accessories = asInt(v.accessoriesAmount);
  const dealerDiscount = asInt(v.dealerDiscount);
  const manufacturerDiscount = asInt(v.manufacturerDiscount);
  const marginMoney = asInt(v.marginMoney);
  const advanceEmi = asInt(v.advanceEmi);
  const tradeInValue = asInt(v.tradeInValue);
  const otherDiscounts = asInt(v.otherDiscounts);

  const onRoad =
    exShowroom +
    insurance +
    roadTax +
    accessories -
    dealerDiscount -
    manufacturerDiscount;

  const grossLoan = onRoad - marginMoney - advanceEmi - tradeInValue;
  const netLoan = grossLoan - otherDiscounts;

  const isNewCar = loanType === "New Car";
  const isUsedCar = loanType === "Used Car";
  const isCashIn = loanType === "Car Cash-in";
  const isRefinance = loanType === "Refinance";

  /* Summary card (only for New Car) */
  const SummaryCard = () =>
    isNewCar && (
      <Card
        variant="borderless"
        style={{
          position: "sticky",
          top: 80,
          borderRadius: 16,
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
        styles={{ body: { padding: 20 } }}
      >
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
          {v.vehicleMake || "Unknown Make"} {v.vehicleModel || ""} {v.vehicleVariant || ""}
        </div>
        <Tag className="mb-4 border-none bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold uppercase text-[10px] tracking-wider px-2 rounded-full">
           {loanType || "New Car"}
        </Tag>

        <div className="bg-background rounded-xl p-3 border border-border/50 mb-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Dealer Info</div>
            <div className="text-sm text-foreground">{v.dealerName || "Not Selected"}</div>
            {(v.dealerContactPerson || v.dealerContactNumber) && (
                 <div className="text-xs text-muted-foreground mt-1">
                    {v.dealerContactPerson} {v.dealerContactPerson && v.dealerContactNumber ? "•" : ""} {v.dealerContactNumber}
                 </div>
            )}
            {v.dealerAddress && <div className="text-xs text-muted-foreground mt-1 opacity-80">{v.dealerAddress}</div>}
        </div>

        <SummaryRow label="Ex-Showroom Price" value={exShowroom} />
        <SummaryRow label="Insurance" value={insurance} />
        <SummaryRow label="Road Tax" value={roadTax} />
        <SummaryRow label="Accessories" value={accessories} />
        <SummaryRow label="Dealer Discount" value={-dealerDiscount} isDeduction />
        <SummaryRow
          label="Manufacturer Discount"
          value={-manufacturerDiscount}
          isDeduction
        />

        <Divider className="my-3 border-border" />

        <SummaryRow label="On-Road Price" value={onRoad} highlight />

        <SummaryRow label="Margin Money" value={-marginMoney} isDeduction />
        <SummaryRow label="Advance EMI" value={-advanceEmi} isDeduction />
        <SummaryRow label="Trade-In Value" value={-tradeInValue} isDeduction />

        <Divider className="my-3 border-border" />

        <SummaryRow label="Gross Loan" value={grossLoan} highlight />
        <SummaryRow label="Other Discounts" value={-otherDiscounts} isDeduction />

        <div className="mt-4 p-4 rounded-lg bg-muted/40 border">
            <div className="flex justify-between items-end">
                <span className="text-xs text-muted-foreground">Net Loan Amount</span>
                <span className="text-xl">₹ {netLoan.toLocaleString("en-IN")}</span>
            </div>
        </div>
      </Card>
    );

  return (
    <div
        id="section-vehicle"
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
             <CarOutlined style={{ fontSize: 20 }} />
          </div>
          <span className="text-lg font-medium">Vehicle Pricing & Loan Details</span>
        </div>
        <Tag className="m-0 border bg-muted text-muted-foreground uppercase text-[10px] px-2 py-0.5 rounded">
           Asset
        </Tag>
      </div>

      <Row gutter={24}>
        <Col span={isNewCar ? 15 : 24}>
            <Row gutter={[16, 12]}>
              {/* Make / Model / Variant — COMMON to all types */}
              <Col xs={24} md={8}>
                <Form.Item label="Make" name="vehicleMake">
                  <Select 
                    placeholder="Select Make" 
                    allowClear 
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleMakeChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No makes available
                        </div>
                      )
                    }
                  >
                    {makes.map((make) => (
                      <Select.Option key={make} value={make}>
                        {make}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Model" name="vehicleModel">
                  <Select
                    placeholder={vehicleMake ? "Select Model" : "Select Make First"}
                    disabled={!vehicleMake}
                    allowClear
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleModelChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No models available
                        </div>
                      )
                    }
                  >
                    {models.map((model) => (
                      <Select.Option key={model} value={model}>
                        {model}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Variant" name="vehicleVariant">
                  <Select
                    placeholder={vehicleModel ? "Select Variant" : "Select Model First"}
                    disabled={!vehicleModel}
                    allowClear
                    showSearch
                    loading={vehicleLoading}
                    onChange={handleVariantChange}
                    filterOption={(input, option) =>
                      (option?.children || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    notFoundContent={
                      vehicleLoading ? (
                        <div className="p-4 text-center">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No variants available
                        </div>
                      )
                    }
                  >
                    {variants.map((variant) => (
                      <Select.Option key={variant} value={variant}>
                        {variant}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>  
              {/* Type of Loan */}
              <Col xs={24} md={8}>
                <Form.Item label="Type of Loan" name="typeOfLoan">
                  <Select placeholder="Select Type of Loan">
                    <Option value="New Car">New Car</Option>
                    <Option value="Used Car">Used Car</Option>
                    <Option value="Car Cash-in">Car Cash-in</Option>
                    <Option value="Refinance">Refinance</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Usage"
                  name="usage"
                  rules={[{ required: true, message: "Select usage" }]}
                >
                  <Select placeholder="Select Vehicle Usage">
                    <Select.Option value="Private">Private</Select.Option>
                    <Select.Option value="Commercial">Commercial</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* Registration City - Only for New Car */}
              {isNewCar && (
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Registration City"
                    name="registrationCity"
                    rules={[{ required: true, message: "Select registration city" }]}
                  >
                    <AutoComplete
                      options={INDIAN_CITIES.sort().map((city) => ({
                        value: city,
                        label: city,
                      }))}
                      placeholder="Search or Select City"
                      filterOption={(inputValue, option) =>
                        option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                      }
                      allowClear
                      showSearch
                    />
                  </Form.Item>
                </Col>
              )}
              
              {/* USED / CASH-IN / REFINANCE — minimal fields */}
              {(isUsedCar || isCashIn || isRefinance) && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item label="Bought In (Year)" name="boughtInYear">
                      <Input placeholder="Enter Year (e.g., 2020)" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Hypothecation" name="hypothecation">
                      <Radio.Group>
                        <Radio value="Yes">Yes</Radio>
                        <Radio value="No">No</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  {hypothecation === "Yes" && (
                    <Col xs={24} md={8}>
                      <Form.Item
                        label="Hypothecation Bank"
                        name="hypothecationBank"
                        rules={[{ required: true, message: "Bank required" }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  )}

                  {/* Usage & Purpose only for Cash-in / Refinance */}
                  {(isCashIn || isRefinance) && (
                    <>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Purpose of Loan"
                          name="purposeOfLoan"
                          rules={[{ required: true }]}
                        >
                          <Select placeholder="Select Purpose of Loan">
                            <Option value="Home Renovation">
                              Home Renovation
                            </Option>
                            <Option value="Marriage">Marriage</Option>
                            <Option value="Travel">Travel</Option>
                            <Option value="Education">Education</Option>
                            <Option value="Business">Business</Option>
                            <Option value="Agriculture">Agriculture</Option>
                            <Option value="Other">Other</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </>
              )}

              {/* NEW CAR — full pricing */}
              {isNewCar && (
                <>
                  {/* Pricing Section Header */}
                  <Col xs={24}>
                    <div className="mt-6 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Vehicle Pricing</span>
                      </div>
                      <div className="h-px bg-border"></div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Ex-Showroom Price" name="exShowroomPrice">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Ex-Showroom Price"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Insurance Cost" name="insuranceCost">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Insurance Cost"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Road Tax" name="roadTax">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Road Tax"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Accessories Amount" name="accessoriesAmount">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Accessories Amount"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  {/* Discounts Section Header */}
                  <Col xs={24}>
                    <div className="mt-2 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Discounts & Deductions</span>
                      </div>
                      <div className="h-px bg-border"></div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer Discount" name="dealerDiscount">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Dealer Discount"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Manufacturer Discount" name="manufacturerDiscount">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Manufacturer Discount"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  {/* Loan Components Section Header */}
                  <Col xs={24}>
                    <div className="mt-2 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Loan Components</span>
                      </div>
                      <div className="h-px bg-border"></div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Margin Money" name="marginMoney">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Margin Money"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Advance EMI" name="advanceEmi">
                      <InputNumber 
                        style={{ width: "100%" }} 
                        className="rounded-lg"
                        placeholder="Enter Advance EMI"
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/₹\s?|(,*)/g, '')} 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Trade-in Value" name="tradeInValue">
                      <InputNumber style={{ width: "100%" }} formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/₹\s?|(,*)/g, '')} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Other Discounts" name="otherDiscounts">
                      <InputNumber style={{ width: "100%" }} formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/₹\s?|(,*)/g, '')} />
                    </Form.Item>
                  </Col>

                  {/* Dealer fields */}
                  <Col xs={24}>
                     <div className="h-px bg-border my-4" />
                     <span className="text-xs text-muted-foreground block mb-4">Dealer Details</span>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Dealer Name" name="dealerName">
                      <Input placeholder="Enter Dealer Name" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Contact Person"
                      name="dealerContactPerson"
                    >
                      <Input placeholder="Enter Contact Person" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Contact Number"
                      name="dealerContactNumber"
                    >
                      <Input placeholder="Enter Contact Number" />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="Dealer Address" name="dealerAddress">
                      <Input.TextArea rows={2} placeholder="Enter Dealer Address" />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                     <div className="h-px bg-border my-4" />
                     <span className="text-xs text-muted-foreground block mb-4">Registration Details</span>
                  </Col>

                  <Col xs={24}>
                    <Form.Item
                      label="Is vehicle registered at Aadhaar address?"
                      name="registerSameAsAadhaar"
                    >
                      <Radio.Group>
                        <Radio value="Yes">Yes</Radio>
                        <Radio value="No">No</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>

                  {aadhaarSame === "No" && (
                    <Col xs={24}>
                      <Form.Item
                        label="Registration Address"
                        name="registrationAddress"
                        rules={[{ required: true }]}
                      >
                        <Input.TextArea rows={2} placeholder="Enter Registration Address" />
                      </Form.Item>
                    </Col>
                  )}
                </>
              )}
            </Row>
        </Col>

        {/* Summary on right for New Car */}
        {isNewCar && (
          <Col span={9}>
            <SummaryCard />
          </Col>
        )}
      </Row>
    </div>
  );
};

/* Small SummaryRow component */
const SummaryRow = ({ label, value = 0, highlight, isDeduction }) => {
  const display = Number.isFinite(Number(value))
    ? Math.abs(Math.trunc(Number(value)))
    : 0;

  return (
    <div
      className={`flex justify-between text-sm mb-1.5 ${highlight ? 'font-bold' : 'font-medium'}`}
    >
      <span className={highlight ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`${isDeduction ? 'text-error' : highlight ? 'text-foreground' : 'text-foreground'}`}>
        {isDeduction ? "- " : ""}₹ {display.toLocaleString("en-IN")}
      </span>
    </div>
  );
};

export default Section4VehiclePricing;
