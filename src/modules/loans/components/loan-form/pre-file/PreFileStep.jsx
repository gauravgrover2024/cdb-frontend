import React, { useCallback, useEffect, useState } from "react";
import { Form, Empty, message, Space, Button, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import Icon from "../../../../../components/AppIcon";
import { customersApi } from "../../../../../api/customers";
import PreFilePersonalDetails from "./PreFilePersonalDetails.jsx";

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
          dob: freshCustomer.dob ? freshCustomer.dob : form.getFieldValue("dob"),
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
          occupationType: freshCustomer.occupationType || form.getFieldValue("occupationType"),
          companyName: freshCustomer.companyName || form.getFieldValue("companyName"),
          designation: freshCustomer.designation || form.getFieldValue("designation"),
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
        };

        form.setFieldsValue(updates);
        setLastSyncTime(new Date());
        
        console.log("✅ Fresh customer data synced to prefile form");
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
        dob: freshCustomer.dob,
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
        occupationType: freshCustomer.occupationType,
        companyName: freshCustomer.companyName,
        designation: freshCustomer.designation,
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
    <>
      {/* 🔄 SYNC STATUS HEADER */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
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
  );
};

export default PreFileStep;
