import React, { useMemo, useEffect, useState } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";

const INDIAN_CITIES = [
  "Ahmedabad",
  "Bangalore",
  "Chennai",
  "Delhi",
  "Gurgaon",
  "Hyderabad",
  "Jaipur",
  "Kolkata",
  "Mumbai",
  "Noida",
  "Pune",
  "Surat",
  "Vadodara",
  "Chandigarh",
  "Indore",
  "Kochi",
  "Lucknow",
  "Nagpur",
  "Visakhapatnam",
  "Coimbatore",
];

const PostFileVehicleVerification = ({ form }) => {
  const loanType = form.getFieldValue("typeOfLoan");
  const isNewCar = loanType === "New Car";
  const registerSameAsAadhaar = form.getFieldValue("registerSameAsAadhaar");

  useEffect(() => {
    // Force component to re-render when form state changes
    const updateTrigger = () => {};
    // This ensures form updates trigger re-renders
  }, [form.getFieldsValue()]);

  // Pre-file field values
  const vehicleMake = form.getFieldValue("vehicleMake") || "";
  const vehicleModel = form.getFieldValue("vehicleModel") || "";
  const vehicleVariant = form.getFieldValue("vehicleVariant") || "";
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
    <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6 h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Car" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Vehicle Details Verification
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Pre-filled from pre-file and editable
            </p>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 text-sm">
        {/* Vehicle Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon name="Info" size={16} />
            Vehicle Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Make" name="vehicleMake" className="mb-0">
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item label="Model" name="vehicleModel" className="mb-0">
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Variant" name="vehicleVariant" className="mb-0">
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item
              label="Regd-City"
              name="postfile_regd_city"
              className="mb-0"
            >
              <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                <option value="">Select City</option>
                {INDIAN_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </Form.Item>
          </div>
        </div>

        {/* For Used Car Only */}
        {!isNewCar && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="Calendar" size={16} />
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
                <Icon name="DollarSign" size={16} />
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
                      ₹ {onRoadCost.toLocaleString("en-IN")}
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
              <Icon name="User" size={16} />
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
              <Icon name="MapPin" size={16} />
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
