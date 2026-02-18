import React, { useMemo, useEffect, useState } from "react";
import { Form, Select, Spin, AutoComplete } from "antd";
import Icon from "../../../../../components/AppIcon";
import { useVehicleData } from "../../../../../hooks/useVehicleData";
import { formatINR } from "../../../../../utils/currency";

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

const PostFileVehicleVerification = ({ form }) => {
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
    autofillPricing: false,
  });

  const loanType = form.getFieldValue("typeOfLoan");
  const isNewCar = loanType === "New Car";
  const registerSameAsAadhaar = form.getFieldValue("registerSameAsAadhaar");

  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);

  useEffect(() => {
    // Force component to re-render when form state changes
    const updateTrigger = () => {};
    // This ensures form updates trigger re-renders
  }, [form.getFieldsValue()]);

  const watchedRegistrationCity = Form.useWatch("registrationCity", form);
  const watchedPostfileRegdCity = Form.useWatch("postfile_regd_city", form);

  // Sync Registration City from Pre-File if available
  useEffect(() => {
    if (watchedRegistrationCity && !watchedPostfileRegdCity) {
      form.setFieldsValue({ postfile_regd_city: watchedRegistrationCity });
    }
  }, [watchedRegistrationCity, watchedPostfileRegdCity, form]);

  // Pre-file field values
  const boughtInYear = form.getFieldValue("boughtInYear") || "";
  const hypothecation = form.getFieldValue("hypothecation") || "";

  // New Car pricing fields
  const exShowroomPrice = form.getFieldValue("exShowroomPrice") || 0;
  const insuranceCost = form.getFieldValue("insuranceCost") || 0;
  const roadTax = form.getFieldValue("roadTax") || 0;
  const accessoriesAmount = form.getFieldValue("accessoriesAmount") || 0;
  const dealerDiscount = form.getFieldValue("dealerDiscount") || 0;
  const manufacturerDiscount = form.getFieldValue("manufacturerDiscount") || 0;
  const dealerName = form.getFieldValue("dealerName") || "";
  const dealerContactPerson = form.getFieldValue("dealerContactPerson") || "";
  const dealerContactNumber = form.getFieldValue("dealerContactNumber") || "";
  const dealerAddress = form.getFieldValue("dealerAddress") || "";

  // Helper to convert to integer
  const asInt = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.trunc(n);
  };

  // Calculate On-Road Cost
  const exShowroom = asInt(exShowroomPrice);
  const insurance = asInt(insuranceCost);
  const tax = asInt(roadTax);
  const accessories = asInt(accessoriesAmount);
  const dealerDisc = asInt(dealerDiscount);
  const manufacturerDisc = asInt(manufacturerDiscount);

  const onRoadCost = useMemo(
    () =>
      exShowroom +
      insurance +
      tax +
      accessories -
      dealerDisc -
      manufacturerDisc,
    [exShowroom, insurance, tax, accessories, dealerDisc, manufacturerDisc]
  );

  return (
    <div className="bg-card rounded-xl border border-border p-5 md:p-6 h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Car" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Vehicle Verification
            </h2>
            <p className="text-sm text-muted-foreground">
              Verify and update vehicle details
            </p>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 text-sm">
        {/* Vehicle Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon name="Info" size={16} className="text-primary" />
            Vehicle Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Make" name="vehicleMake" className="mb-0">
              <Select
                placeholder="Select make"
                allowClear
                showSearch
                loading={vehicleLoading}
                onChange={handleMakeChange}
                className="w-full"
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

            <Form.Item label="Model" name="vehicleModel" className="mb-0">
              <Select
                placeholder={vehicleMake ? "Select model" : "Select make first"}
                disabled={!vehicleMake}
                allowClear
                showSearch
                loading={vehicleLoading}
                onChange={handleModelChange}
                className="w-full"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Variant" name="vehicleVariant" className="mb-0">
              <Select
                placeholder={vehicleModel ? "Select variant" : "Select model first"}
                disabled={!vehicleModel}
                allowClear
                showSearch
                loading={vehicleLoading}
                onChange={handleVariantChange}
                className="w-full"
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

            <Form.Item
              label="Regd-City"
              name="postfile_regd_city"
              className="mb-0"
            >
              <AutoComplete
                options={INDIAN_CITIES.sort().map((city) => ({
                  value: city,
                  label: city,
                }))}
                placeholder="Search or select city"
                filterOption={(inputValue, option) =>
                  option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
                className="w-full"
                style={{ height: '32px' }}
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                allowClear
                showSearch
              />
            </Form.Item>
          </div>
        </div>

        {/* For Used Car Only */}
        {!isNewCar && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="Calendar" size={16} className="text-primary" />
              Vehicle History
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Bought in Year"
                name="boughtInYear"
                className="mb-0"
              >
                <input
                  type="text"
                  className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                />
              </Form.Item>

              <Form.Item label="Hypothecation" className="mb-0">
                <div className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40">
                  {hypothecation || "-"}
                </div>
              </Form.Item>
            </div>
          </div>
        )}

        {/* For New Car Only */}
        {isNewCar && (
          <>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon name="DollarSign" size={16} className="text-primary" />
                Vehicle Pricing
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  label="Ex-Showroom Price"
                  name="exShowroomPrice"
                  className="mb-0"
                >
                  <input
                    type="number"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                  />
                </Form.Item>

                <Form.Item
                  label="Insurance Cost"
                  name="insuranceCost"
                  className="mb-0"
                >
                  <input
                    type="number"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item label="Road Tax" name="roadTax" className="mb-0">
                  <input
                    type="number"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                  />
                </Form.Item>

                <Form.Item
                  label="Accessories Amount"
                  name="accessoriesAmount"
                  className="mb-0"
                >
                  <input
                    type="number"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  label="Dealer Discount"
                  name="dealerDiscount"
                  className="mb-0"
                >
                  <input
                    type="number"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                  />
                </Form.Item>

                <Form.Item
                  label="Manufacturer Discount"
                  name="manufacturerDiscount"
                  className="mb-0"
                >
                  <input
                    type="number"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                  />
                </Form.Item>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  On-Road Vehicle Cost
                </label>
                <Form.Item label="On-Road Vehicle Cost" className="mb-0">
                  <div className="w-full border border-dashed border-primary/40 rounded-md px-3 py-2 text-sm bg-primary/5">
                    <span className="text-muted-foreground">
                      Auto-calculated
                    </span>
                    <div className="font-semibold text-primary mt-1">
                      {formatINR(onRoadCost)}
                    </div>
                  </div>
                </Form.Item>
              </div>
            </div>
          </>
        )}
        {/* For New Car Only - Dealer Information */}
        {isNewCar && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="User" size={16} className="text-primary" />
              Dealer Information
            </h3>

            <Form.Item label="Dealer Name" name="dealerName" className="mb-0">
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Contact Person"
                name="dealerContactPerson"
                className="mb-0"
              >
                <input
                  type="text"
                  className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                />
              </Form.Item>

              <Form.Item
                label="Contact Number"
                name="dealerContactNumber"
                className="mb-0"
              >
                <input
                  type="text"
                  className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                />
              </Form.Item>
            </div>

            <div>
              <Form.Item
                label="Dealer Address"
                name="dealerAddress"
                className="mb-0"
              >
                <textarea
                  className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                  rows={2}
                />
              </Form.Item>
            </div>
          </div>
        )}

        {/* Registration Address Reminder */}
        {isNewCar && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="MapPin" size={16} className="text-primary" />
              Vehicle Registration
            </h3>

            <div
              className={`p-3 rounded-md border ${
                registerSameAsAadhaar === "Yes"
                  ? "bg-success/10 border-success/20"
                  : registerSameAsAadhaar === "No"
                  ? "bg-warning/10 border-warning/20"
                  : "bg-muted/10 border-border/20"
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon
                  name={
                    registerSameAsAadhaar === "Yes"
                      ? "CheckCircle"
                      : "AlertCircle"
                  }
                  size={16}
                  className={
                    registerSameAsAadhaar === "Yes"
                      ? "text-success"
                      : "text-warning"
                  }
                />
                <div className="text-xs">
                  <p className="font-medium text-foreground mb-1">
                    Is vehicle registered at Aadhaar address?
                  </p>
                  <p
                    className={`${
                      registerSameAsAadhaar === "Yes"
                        ? "text-success"
                        : registerSameAsAadhaar === "No"
                        ? "text-warning"
                        : "text-muted-foreground"
                    }`}
                  >
                    {registerSameAsAadhaar === "Yes"
                      ? "✓ Yes - Vehicle registered at Aadhaar address"
                      : registerSameAsAadhaar === "No"
                      ? "✕ No - Vehicle has different registration address (see Pre-File section)"
                      : "- Not specified in Pre-File"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostFileVehicleVerification;
