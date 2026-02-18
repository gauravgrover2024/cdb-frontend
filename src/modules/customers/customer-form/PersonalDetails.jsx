import React, { useEffect, useState, useRef, useCallback } from "react";
import { Form, Input, DatePicker, Select, Row, Col, Tag, Spin } from "antd";
import Icon from "../../../components/AppIcon";
import { customersApi } from "../../../api/customers";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;

const toDayjsSafe = (val) => {
  if (!val) return undefined;
  if (dayjs.isDayjs(val)) return val;
  const d = dayjs(val);
  return d.isValid() ? d : undefined;
};

const PersonalDetails = ({ excludeFields = false, searchable = false, prefillMode = "all" }) => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  
  // Watch fields for logic
  const pincode = Form.useWatch("pincode", form);
  const education = Form.useWatch("education", form);
  const yearsInCurrentHouse = Form.useWatch("yearsInCurrentHouse", form);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFullData, setLoadingFullData] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 1. Pincode to City logic (Real API)
  const [fetchingPincode, setFetchingPincode] = useState(false);

  useEffect(() => {
    if (pincode && pincode.length === 6) {
      const fetchCity = async () => {
        try {
          setFetchingPincode(true);
          const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          const data = await response.json();

          if (data && data[0]?.Status === "Success") {
             const postOffices = data[0].PostOffice;
             if (postOffices && postOffices.length > 0) {
                const city = postOffices[0].District; 
                form.setFieldsValue({ city: city });
             }
          }
        } catch (error) {
           console.error("Pincode fetch failed", error);
        } finally {
           setFetchingPincode(false);
        }
      };

      const timer = setTimeout(fetchCity, 500); 
      return () => clearTimeout(timer);
    }
  }, [pincode, form]);

  /* Customer Search Logic with race condition handling */
  const fetchCustomers = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setFilteredCustomers([]);
      setLoading(false);
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    
    try {
      const res = await customersApi.search(q);
      // Only update if this is still the latest request
      if (!abortControllerRef.current.signal.aborted) {
        const list = Array.isArray(res?.data) ? res.data : [];
        setFilteredCustomers(list);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Search error:", e);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchTerm) {
      setFilteredCustomers([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchCustomers(searchTerm), 350);
    return () => {
      clearTimeout(debounceRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, fetchCustomers]);

  const handleCustomerSelect = useCallback(async (customer) => {
    try {
      setLoadingFullData(true);
      
      // Fetch full customer details to ensure we have all data
      const fullCustomerRes = await customersApi.getById(customer._id);
      const fullCustomer = fullCustomerRes?.data || customer;
      
      const baseValues = {
        customerId: fullCustomer._id,
        customerName: fullCustomer.customerName || "",
        primaryMobile: fullCustomer.primaryMobile || "",
      };

      const fullValues = {
        ...baseValues,
        sdwOf: fullCustomer.sdwOf || "",
        gender: fullCustomer.gender || "",
        dob: toDayjsSafe(fullCustomer.dob),
        motherName: fullCustomer.motherName || "",
        residenceAddress: fullCustomer.residenceAddress || "",
        pincode: fullCustomer.pincode || "",
        city: fullCustomer.city || "",
        yearsInCurrentHouse: fullCustomer.yearsInCurrentHouse || "",
        houseType: fullCustomer.houseType || "",
        education: fullCustomer.education || "",
        maritalStatus: fullCustomer.maritalStatus || "",
        dependents: fullCustomer.dependents || "",
        extraMobiles: Array.isArray(fullCustomer.extraMobiles) ? fullCustomer.extraMobiles : [],
        email: fullCustomer.email || "",
        nomineeName: fullCustomer.nomineeName || "",
        nomineeDob: toDayjsSafe(fullCustomer.nomineeDob),
        nomineeRelation: fullCustomer.nomineeRelation || "",
        
        // Additional profile fields
        occupationType: fullCustomer.occupationType || "",
        companyName: fullCustomer.companyName || "",
        designation: fullCustomer.designation || "",
        currentExp: fullCustomer.currentExp || "",
        totalExp: fullCustomer.totalExp || "",
        monthlyIncome: fullCustomer.monthlyIncome || "",
        salaryMonthly: fullCustomer.salaryMonthly || "",
        annualIncome: fullCustomer.annualIncome || "",
        
        // Banking
        bankName: fullCustomer.bankName || "",
        accountNumber: fullCustomer.accountNumber || "",
        ifsc: fullCustomer.ifscCode || fullCustomer.ifsc || "",
        branch: fullCustomer.branch || "",
        accountType: fullCustomer.accountType || "",
        
        // KYC
        panNumber: fullCustomer.panNumber || "",
        aadhaarNumber: fullCustomer.aadhaarNumber || fullCustomer.aadharNumber || "",
        
        // References
        reference1_name: fullCustomer.reference1_name || "",
        reference1_mobile: fullCustomer.reference1_mobile || "",
        reference1_address: fullCustomer.reference1_address || "",
        reference2_name: fullCustomer.reference2_name || "",
        reference2_mobile: fullCustomer.reference2_mobile || "",
        reference2_address: fullCustomer.reference2_address || "",
      };

      const fieldValues = prefillMode === "minimal" ? baseValues : fullValues;

      // Filter out empty values
      const merged = Object.fromEntries(
        Object.entries(fieldValues).filter(([_, v]) => {
          if (v === "" || v === null || v === undefined) return false;
          if (Array.isArray(v) && v.length === 0) return false;
          return true;
        })
      );
      
      // Use setFieldsValue to populate form - this keeps fields editable
      form.setFieldsValue(merged);
      
      setSearchTerm("");
      setFilteredCustomers([]);
      setIsOpen(false);
    } catch (error) {
      console.error("Error fetching full customer data:", error);
      // Fallback to basic data if full fetch fails
      form.setFieldsValue({
        customerId: customer._id,
        customerName: customer.customerName || "",
        primaryMobile: customer.primaryMobile || "",
      });
      setSearchTerm("");
      setFilteredCustomers([]);
      setIsOpen(false);
    } finally {
      setLoadingFullData(false);
    }
  }, [form, prefillMode]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
         setIsOpen(false);
       }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Hide credit-relevant fields ONLY when explicitly "No"
  const showCreditFields = isFinanced !== "No";

  return (
    <div 
        id="section-personal" 
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
             <Icon name="User" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">Personal Details</span>
        </div>
        <Tag className="m-0 border-none bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full">Core</Tag>
      </div>

      <Row gutter={[16, 0]}>
        {/* Basic identity */}
        <Col xs={24} md={8}>
          <div className="relative" ref={dropdownRef}>
            <Form.Item 
                label="Customer Name" 
                name="customerName" 
                normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}
            >
              <Input 
                placeholder="Enter Full Name" 
                prefix={<Icon name="User" size={14} className="text-muted-foreground mr-1" />} 
                autoComplete="off"
                onChange={(e) => {
                    if (searchable) {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }
                }}
                onFocus={() => searchable && searchTerm && setIsOpen(true)}
              />
            </Form.Item>

            {/* Custom Search Dropdown */}
            {searchable && isOpen && (searchTerm || loading) && (
              <div className="absolute left-0 right-0 top-[72px] z-[500] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 ring-1 ring-black/5">
                <div className="px-3 py-2 border-b border-border bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Icon name="Search" size={10} />
                    Select a Customer
                  </span>
                </div>
                <div className="max-h-[280px] overflow-y-auto no-scrollbar py-1">
                  {loading ? (
                    <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
                        <Spin size="small" />
                        <span className="text-xs font-medium">Searching...</span>
                    </div>
                  ) : loadingFullData ? (
                    <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
                        <Spin size="small" />
                        <span className="text-xs font-medium">Loading customer data...</span>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    <div className="flex flex-col py-1">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => handleCustomerSelect(c)}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/5 last:border-none group flex flex-col gap-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {c.customerName}
                            </span>
                            <span className="text-[10px] font-black text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-wider">
                                #{c.displayId || c._id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                             <span className="font-semibold">{c.primaryMobile}</span>
                             {c.city && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span>{c.city}</span>
                                </>
                             )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    searchTerm.length > 1 && <div className="p-6 text-center text-muted-foreground text-xs font-medium">No results found for "{searchTerm}"</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="S/D/W of" name="sdwOf" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
            <Input placeholder="Father / Spouse Name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Gender" name="gender">
            <Select placeholder="Select Gender" showSearch filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            } allowClear>
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Date of Birth" name="dob">
            <DatePicker className="w-full" format="DD-MM-YYYY" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Mother's Name" name="motherName" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
            <Input placeholder="Mother's Name" />
          </Form.Item>
        </Col>

        {/* Email ID (Moved from bottom) */}
        <Col xs={24} md={8}>
          <Form.Item label="Email ID" name="email">
            <Input placeholder="Customer@Example.Com" prefix={<Icon name="Mail" size={14} className="text-muted-foreground mr-1" />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={24}>
          <Form.Item label="Residence Address" name="residenceAddress" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
            <TextArea rows={2} placeholder="House No, Street, Area" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8} className="mt-4">
          <Form.Item label="Pincode" name="pincode">
            <Input placeholder="6-Digit Pincode" maxLength={6} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8} className="mt-4">
          <Form.Item label="City" name="city">
            <Input placeholder="City (Auto-Filled)" suffix={fetchingPincode ? <span className="text-[10px] text-muted-foreground">Loading...</span> : null} />
          </Form.Item>
        </Col>

        {/* ===== CREDIT-RELEVANT FIELDS ===== */}
        {showCreditFields && (
          <>
            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Staying since (Year)">
                <div className="flex w-full">
                  <Form.Item name="yearsInCurrentHouse" noStyle>
                    <Input className="flex-[0.6] rounded-r-none" placeholder="Ex: 2016" maxLength={4} />
                  </Form.Item>
                  <Input 
                     className="flex-[0.4] rounded-l-none border-l-0 text-primary font-bold bg-primary/5" 
                     value={(() => {
                        if (!yearsInCurrentHouse) return "";
                        const y = parseInt(yearsInCurrentHouse, 10);
                        if (isNaN(y) || y < 1900 || y > new Date().getFullYear()) return "";
                        return `${new Date().getFullYear() - y} Years`;
                     })()} 
                     readOnly 
                     placeholder="Total"
                  />
                </div>
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="House Type" name="houseType">
                <Select placeholder="Select House Type" showSearch filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                } allowClear>
                  <Option value="owned">Owned</Option>
                  <Option value="parental">Parental</Option>
                  <Option value="company">Company Provided</Option>
                  <Option value="rented">Rented</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
               <Form.Item label="Education" className="mb-0">
                 <Form.Item name="education" className={education === 'others' ? 'mb-2' : 'mb-6'}>
                    <Select placeholder="Select Education" showSearch filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    } allowClear>
                      <Option value="Undergraduate">Undergraduate</Option>
                      <Option value="Graduate">Graduate</Option>
                      <Option value="Postgraduate">Post Graduate & above</Option>
                      <Option value="Others">Others</Option>
                    </Select>
                 </Form.Item>
                 {education === 'others' && (
                    <Form.Item name="educationOther" rules={[{ required: true, message: 'Please specify' }]} normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
                       <Input placeholder="Please Specify" />
                    </Form.Item>
                 )}
               </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Marital Status" name="maritalStatus">
                <Select placeholder="Select Marital Status" showSearch filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                } allowClear>
                  <Option value="Married">Married</Option>
                  <Option value="Unmarried">Unmarried</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Dependents" name="dependents">
                <Input placeholder="Number Of Dependents" />
              </Form.Item>
            </Col>
          </>
        )}

        {/* Phone Number Management Section */}
        <Form.List name="extraMobiles">
          {(fields, { add, remove }) => (
            <>
              {/* Primary Mobile - Now with Plus Icon to start the list */}
              <Col xs={24} md={8} className="mt-4">
                <Form.Item 
                  label="Primary Mobile"
                  name="primaryMobile" 
                  rules={[
                    { required: true, message: 'Required' },
                    { pattern: /^[0-9]{10}$/, message: '10 digits' }
                  ]}
                >
                  <Input 
                    placeholder="Primary Mobile" 
                    maxLength={10} 
                    prefix={<Icon name="Phone" size={14} className="text-muted-foreground mr-1" />}
                    suffix={
                      <div 
                        onClick={() => add()}
                        className="cursor-pointer hover:bg-primary/10 text-primary rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                        title="Add Alternative Mobile"
                      >
                        <Icon name="Plus" size={14} />
                      </div>
                    }
                  />
                </Form.Item>
              </Col>

              {/* Additional Mobiles */}
              {fields.map((field, index) => (
                <Col key={field.key} xs={24} md={8} className="mt-4">
                  <Form.Item
                    {...field}
                    label="Alt Mobile"
                    rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits' }]}
                  >
                    <Input 
                      placeholder="Mobile Number" 
                      maxLength={10}
                      prefix={<Icon name="Phone" size={14} className="text-muted-foreground mr-1 opacity-50" />} 
                      suffix={
                        <div className="flex items-center gap-1">
                          <div 
                            onClick={() => remove(field.name)}
                            className="cursor-pointer hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                            title="Remove"
                          >
                            <Icon name="Trash2" size={14} />
                          </div>
                          {index === fields.length - 1 && (
                            <div 
                              onClick={() => add()}
                              className="cursor-pointer hover:bg-primary/10 text-primary rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                              title="Add Another"
                            >
                              <Icon name="Plus" size={14} />
                            </div>
                          )}
                        </div>
                      }
                    />
                  </Form.Item>
                </Col>
              ))}
            </>
          )}
        </Form.List>
        
        {/* Nominee */}
        <Col xs={24} md={24}>
           <div className="section-divider" />
           <span className="text-[13px] font-black text-foreground uppercase tracking-widest block mb-4">Nominee Details</span>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Nominee Name" name="nomineeName" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
            <Input placeholder="Nominee Name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Nominee DOB" name="nomineeDob">
            <DatePicker className="w-full" format="DD-MM-YYYY" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Nominee Relation" name="nomineeRelation" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
            <Input placeholder="Relation" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default PersonalDetails;
