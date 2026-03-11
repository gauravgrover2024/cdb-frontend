import React, { useCallback, useEffect, useState } from "react";
import { Form, Empty, message, Button, Spin, ConfigProvider } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import Icon from "../../../../../components/AppIcon";
import { customersApi } from "../../../../../api/customers";
import PreFilePersonalDetails from "./PreFilePersonalDetails.jsx";

const toDayjsSafe = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const PreFileStep = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  const customerId = Form.useWatch("customerId", form);
  
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 🔄 FETCH FRESH CUSTOMER DATA ON PREFILE STEP LOAD
  useEffect(() => {
    const autoFetchCustomerData = async () => {
      if (!customerId || !isFinanced) return;

      try {
        setSyncing(true);
        const response = await customersApi.getById(customerId);
        const freshCustomer = response?.data;

        if (!freshCustomer) {
          console.warn("⚠️ Fresh customer data not found");
          return;
        }

        // 🔄 UPDATE FORM WITH FRESH CUSTOMER DATA
        const updates = {
          customerName: freshCustomer.customerName || form.getFieldValue("customerName"),
          primaryMobile: freshCustomer.primaryMobile || form.getFieldValue("primaryMobile"),
          email: freshCustomer.email || form.getFieldValue("email"),
          sdwOf: freshCustomer.sdwOf || form.getFieldValue("sdwOf"),
          gender: freshCustomer.gender || form.getFieldValue("gender"),
          dob: freshCustomer.dob ? toDayjsSafe(freshCustomer.dob) : form.getFieldValue("dob"),
          motherName: freshCustomer.motherName || form.getFieldValue("motherName"),
          residenceAddress: freshCustomer.residenceAddress || form.getFieldValue("residenceAddress"),
          pincode: freshCustomer.pincode || form.getFieldValue("pincode"),
          city: freshCustomer.city || form.getFieldValue("city"),
          yearsInCurrentHouse: freshCustomer.yearsInCurrentHouse || form.getFieldValue("yearsInCurrentHouse"),
          yearsInCurrentCity: freshCustomer.yearsInCurrentCity || form.getFieldValue("yearsInCurrentCity"),
          houseType: freshCustomer.houseType || form.getFieldValue("houseType"),
          permanentAddress: freshCustomer.permanentAddress || form.getFieldValue("permanentAddress"),
          permanentPincode: freshCustomer.permanentPincode || form.getFieldValue("permanentPincode"),
          permanentCity: freshCustomer.permanentCity || form.getFieldValue("permanentCity"),
          education: freshCustomer.education || form.getFieldValue("education"),
          maritalStatus: freshCustomer.maritalStatus || form.getFieldValue("maritalStatus"),
          dependents: freshCustomer.dependents || form.getFieldValue("dependents"),
          panNumber: freshCustomer.panNumber || form.getFieldValue("panNumber"),
          aadhaarNumber: freshCustomer.aadhaarNumber || form.getFieldValue("aadhaarNumber"),
          gstNumber: freshCustomer.gstNumber || form.getFieldValue("gstNumber"),
          contactPersonName: freshCustomer.contactPersonName || form.getFieldValue("contactPersonName"),
          contactPersonMobile: freshCustomer.contactPersonMobile || form.getFieldValue("contactPersonMobile"),
          sameAsCurrentAddress: freshCustomer.sameAsCurrentAddress ?? form.getFieldValue("sameAsCurrentAddress"),
          occupationType: freshCustomer.occupationType || form.getFieldValue("occupationType"),
          professionalType: freshCustomer.professionalType || form.getFieldValue("professionalType"),
          companyType: freshCustomer.companyType || form.getFieldValue("companyType"),
          businessNature:
            freshCustomer.businessNature ??
            form.getFieldValue("businessNature"),
          companyName: freshCustomer.companyName || form.getFieldValue("companyName"),
          designation: freshCustomer.designation || form.getFieldValue("designation"),
          incorporationYear: freshCustomer.incorporationYear || form.getFieldValue("incorporationYear"),
          experienceCurrent: freshCustomer.experienceCurrent || form.getFieldValue("experienceCurrent"),
          totalExperience: freshCustomer.totalExperience || form.getFieldValue("totalExperience"),
          isMSME: freshCustomer.isMSME || form.getFieldValue("isMSME"),
          monthlyIncome: freshCustomer.monthlyIncome || form.getFieldValue("monthlyIncome"),
          salaryMonthly: freshCustomer.salaryMonthly || form.getFieldValue("salaryMonthly"),
          bankName: freshCustomer.bankName || form.getFieldValue("bankName"),
          accountNumber: freshCustomer.accountNumber || form.getFieldValue("accountNumber"),
          ifscCode: freshCustomer.ifscCode || form.getFieldValue("ifscCode"),

          // Sync Documents
          aadhaarCardDocUrl: freshCustomer.aadhaarCardDocUrl || form.getFieldValue("aadhaarCardDocUrl"),
          panCardDocUrl: freshCustomer.panCardDocUrl || form.getFieldValue("panCardDocUrl"),
          passportDocUrl: freshCustomer.passportDocUrl || form.getFieldValue("passportDocUrl"),
          dlDocUrl: freshCustomer.dlDocUrl || form.getFieldValue("dlDocUrl"),
          addressProofDocUrl: freshCustomer.addressProofDocUrl || form.getFieldValue("addressProofDocUrl"),
          gstDocUrl: freshCustomer.gstDocUrl || form.getFieldValue("gstDocUrl"),
          photoUrl: freshCustomer.photoUrl || form.getFieldValue("photoUrl"),
          signatureUrl: freshCustomer.signatureUrl || form.getFieldValue("signatureUrl"),
          reference1: freshCustomer.reference1 || {
            name: freshCustomer.reference1_name || form.getFieldValue(["reference1", "name"]) || "",
            mobile: freshCustomer.reference1_mobile || form.getFieldValue(["reference1", "mobile"]) || "",
            address: freshCustomer.reference1_address || form.getFieldValue(["reference1", "address"]) || "",
            pincode: freshCustomer.reference1_pincode || form.getFieldValue(["reference1", "pincode"]) || "",
            city: freshCustomer.reference1_city || form.getFieldValue(["reference1", "city"]) || "",
            relation: freshCustomer.reference1_relation || form.getFieldValue(["reference1", "relation"]) || "",
          },
          reference2: freshCustomer.reference2 || {
            name: freshCustomer.reference2_name || form.getFieldValue(["reference2", "name"]) || "",
            mobile: freshCustomer.reference2_mobile || form.getFieldValue(["reference2", "mobile"]) || "",
            address: freshCustomer.reference2_address || form.getFieldValue(["reference2", "address"]) || "",
            pincode: freshCustomer.reference2_pincode || form.getFieldValue(["reference2", "pincode"]) || "",
            city: freshCustomer.reference2_city || form.getFieldValue(["reference2", "city"]) || "",
            relation: freshCustomer.reference2_relation || form.getFieldValue(["reference2", "relation"]) || "",
          },
        };

        form.setFieldsValue(updates);
        setLastSyncTime(new Date());
      } catch (err) {
        console.error("⚠️ Error fetching fresh customer data:", err);
      } finally {
        setSyncing(false);
      }
    };

    // Auto-fetch on component mount or when customerId changes
    if (customerId && isFinanced === "Yes") {
      autoFetchCustomerData();
    }
  }, [customerId, isFinanced, form]);

  // 🔄 MANUAL REFRESH FUNCTION
  const handleRefreshCustomerData = useCallback(async () => {
    if (!customerId) {
      message.warning("No customer linked to this loan");
      return;
    }

    try {
      setSyncing(true);
      const response = await customersApi.getById(customerId);
      const freshCustomer = response?.data;

      if (!freshCustomer) {
        message.error("Failed to fetch fresh customer data");
        return;
      }

      const updates = {
        customerName: freshCustomer.customerName,
        primaryMobile: freshCustomer.primaryMobile,
        email: freshCustomer.email,
        sdwOf: freshCustomer.sdwOf,
        gender: freshCustomer.gender,
        dob: toDayjsSafe(freshCustomer.dob),
        motherName: freshCustomer.motherName,
        residenceAddress: freshCustomer.residenceAddress,
        pincode: freshCustomer.pincode,
        city: freshCustomer.city,
        yearsInCurrentHouse: freshCustomer.yearsInCurrentHouse,
        yearsInCurrentCity: freshCustomer.yearsInCurrentCity,
        houseType: freshCustomer.houseType,
        permanentAddress: freshCustomer.permanentAddress,
        permanentPincode: freshCustomer.permanentPincode,
        permanentCity: freshCustomer.permanentCity,
        education: freshCustomer.education,
        maritalStatus: freshCustomer.maritalStatus,
        dependents: freshCustomer.dependents,
        panNumber: freshCustomer.panNumber,
        aadhaarNumber: freshCustomer.aadhaarNumber,
        gstNumber: freshCustomer.gstNumber,
        contactPersonName: freshCustomer.contactPersonName,
        contactPersonMobile: freshCustomer.contactPersonMobile,
        sameAsCurrentAddress: freshCustomer.sameAsCurrentAddress,
        occupationType: freshCustomer.occupationType,
        professionalType: freshCustomer.professionalType,
        companyType: freshCustomer.companyType,
        businessNature: freshCustomer.businessNature,
        companyName: freshCustomer.companyName,
        designation: freshCustomer.designation,
        incorporationYear: freshCustomer.incorporationYear,
        experienceCurrent: freshCustomer.experienceCurrent,
        totalExperience: freshCustomer.totalExperience,
        isMSME: freshCustomer.isMSME,
        monthlyIncome: freshCustomer.monthlyIncome,
        salaryMonthly: freshCustomer.salaryMonthly,
        bankName: freshCustomer.bankName,
        accountNumber: freshCustomer.accountNumber,
        ifscCode: freshCustomer.ifscCode,
        
        // Sync Documents
        aadhaarCardDocUrl: freshCustomer.aadhaarCardDocUrl,
        panCardDocUrl: freshCustomer.panCardDocUrl,
        passportDocUrl: freshCustomer.passportDocUrl,
        dlDocUrl: freshCustomer.dlDocUrl,
        addressProofDocUrl: freshCustomer.addressProofDocUrl,
        gstDocUrl: freshCustomer.gstDocUrl,
        photoUrl: freshCustomer.photoUrl,
        signatureUrl: freshCustomer.signatureUrl,
        reference1: freshCustomer.reference1 || {
          name: freshCustomer.reference1_name || "",
          mobile: freshCustomer.reference1_mobile || "",
          address: freshCustomer.reference1_address || "",
          pincode: freshCustomer.reference1_pincode || "",
          city: freshCustomer.reference1_city || "",
          relation: freshCustomer.reference1_relation || "",
        },
        reference2: freshCustomer.reference2 || {
          name: freshCustomer.reference2_name || "",
          mobile: freshCustomer.reference2_mobile || "",
          address: freshCustomer.reference2_address || "",
          pincode: freshCustomer.reference2_pincode || "",
          city: freshCustomer.reference2_city || "",
          relation: freshCustomer.reference2_relation || "",
        },
      };

      form.setFieldsValue(updates);
      setLastSyncTime(new Date());
      message.success("✅ Customer data refreshed from database");
    } catch (err) {
      console.error("Error refreshing customer data:", err);
      message.error("Failed to refresh customer data ❌");
    } finally {
      setSyncing(false);
    }
  }, [customerId, form]);

  // Pre-File visible ONLY for financed cars
  if (isFinanced !== "Yes") {
    return (
      <Empty
        description="Pre-File is applicable only for financed vehicles"
        style={{ padding: 40 }}
      />
    );
  }

  return (
    <ConfigProvider
      getPopupContainer={(triggerNode) => triggerNode?.parentElement || document.body}
      theme={{
        token: {
          fontFamily:
            "Manrope, Satoshi, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          borderRadius: 14,
          controlOutlineWidth: 0,
        },
        components: {
          Select: {
            optionFontSize: 13,
            optionHeight: 36,
            showArrowPaddingInlineEnd: 28,
          },
          Input: {
            paddingBlock: 10,
            paddingInline: 12,
          },
          InputNumber: {
            paddingBlock: 10,
          },
          AutoComplete: {
            optionHeight: 36,
            optionFontSize: 13,
          },
          DatePicker: {
            cellHeight: 28,
          },
        },
      }}
    >
      <>
        {/* 🔄 SYNC STATUS HEADER */}
        <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-3">
            <Icon name="Zap" size={18} className="text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                Customer Data Auto-Sync
              </div>
              {lastSyncTime && (
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Last synced: {lastSyncTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            loading={syncing}
            onClick={handleRefreshCustomerData}
            disabled={!customerId}
          >
            Refresh Now
          </Button>
        </div>

        {/* ===============================
            PRE-FILE : SECTION 1
           =============================== */}
        <Spin spinning={syncing} tip="Syncing customer data...">
          <PreFilePersonalDetails />
        </Spin>
      </>
    </ConfigProvider>
  );
};

export default PreFileStep;
