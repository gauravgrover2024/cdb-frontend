// src/modules/delivery-orders/components/DeliveryOrderForm.jsx

import React, { useEffect, useState } from "react";
import { Card, Button, Form, Row, Col, message, Checkbox, Tag } from "antd";
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { loansApi } from "../../../api/loans";
import { useTheme } from "../../../context/ThemeContext";

import DOSectionCustomerDetails from "./sections/DOSectionCustomerDetails";
import Section2DealerDetails from "./sections/Section2DealerDetails";
import Section3VehicleDetailsShowroom from "./sections/Section3VehicleDetailsShowroom";
import Section4VehicleDetailsCustomer from "./sections/Section4VehicleDetailsCustomer";
import Section5DODetails from "./sections/Section5DODetails";
import { DOPrint } from "../../print/PrintFormats";

// -------------------------------------
// Helpers
// -------------------------------------
const generateDONumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0");
  return `DO-${year}-${random}`;
};

const safeText = (v) => (v === undefined || v === null ? "" : String(v));
const hasMeaningfulValue = (v) => {
  if (v === undefined || v === null) return false;
  const t = String(v).trim();
  if (!t) return false;
  const lc = t.toLowerCase();
  return !["n/a", "na", "null", "undefined", "-", "--", "not set"].includes(lc);
};
const pickFirstMeaningful = (...values) => {
  for (const value of values) {
    if (hasMeaningfulValue(value)) return String(value).trim();
  }
  return "";
};
const asNumberOrEmpty = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const normalized = String(value).replace(/,/g, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : "";
};
const asNullableNumberField = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).replace(/,/g, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};
const isEmpty = (v) => v === undefined || v === null || v === "";
const hasOwn = (obj, key) =>
  !!obj && Object.prototype.hasOwnProperty.call(obj, key);
const hydrateNullableNumberFromDO = (
  source,
  primaryKeys = [],
  fallbackKeys = [],
) => {
  for (const key of primaryKeys) {
    if (hasOwn(source, key)) {
      const value = source?.[key];
      return value === null ? "" : asNumberOrEmpty(value);
    }
  }
  for (const key of fallbackKeys) {
    if (hasOwn(source, key)) {
      const value = source?.[key];
      return value === null ? "" : asNumberOrEmpty(value);
    }
  }
  return undefined;
};
const hydrateFieldFromDO = (
  source,
  primaryKeys = [],
  fallbackKeys = [],
  transform = (value) => value,
) => {
  for (const key of primaryKeys) {
    if (hasOwn(source, key)) {
      return transform(source?.[key]);
    }
  }
  for (const key of fallbackKeys) {
    if (hasOwn(source, key)) {
      return transform(source?.[key]);
    }
  }
  return undefined;
};
const buildLoanContextPrefill = (loan = {}) => ({
  customerName: pickFirstMeaningful(
    loan?.customerName,
    loan?.do_customerName,
    loan?.profile_customerName,
    loan?.applicant_name,
    loan?.applicantName,
    loan?.companyName,
    loan?.profile?.customerName,
    loan?.personalDetails?.name,
    loan?.leadName,
  ),
  primaryMobile: pickFirstMeaningful(
    loan?.primaryMobile,
    loan?.mobile,
    loan?.phone,
    loan?.phoneNumber,
    loan?.do_primaryMobile,
    loan?.profile?.primaryMobile,
    loan?.profile?.mobile,
  ),
  residenceAddress: pickFirstMeaningful(
    loan?.residenceAddress,
    loan?.do_residenceAddress,
    loan?.currentAddress,
    loan?.current_address,
    loan?.address,
    loan?.permanentAddress,
    loan?.profile?.residenceAddress,
    loan?.profile?.currentAddress,
    loan?.profile?.address,
  ),
  pincode: pickFirstMeaningful(
    loan?.pincode,
    loan?.do_pincode,
    loan?.currentPincode,
    loan?.current_pincode,
    loan?.permanentPincode,
    loan?.profile?.pincode,
    loan?.profile?.currentPincode,
    loan?.profile?.permanentPincode,
  ),
  city: pickFirstMeaningful(
    loan?.city,
    loan?.do_city,
    loan?.currentCity,
    loan?.current_city,
    loan?.permanentCity,
    loan?.registrationCity,
    loan?.profile?.city,
    loan?.profile?.currentCity,
    loan?.profile?.permanentCity,
  ),
  recordSource: pickFirstMeaningful(
    loan?.recordSource,
    loan?.do_recordSource,
    loan?.source,
    loan?.sourcingChannel,
    loan?.sourceType,
    loan?.profile?.recordSource,
    loan?.record_details?.recordSource,
  ),
  sourceName: pickFirstMeaningful(
    loan?.sourceName,
    loan?.do_sourceName,
    loan?.showroomDealerName,
    loan?.showroomName,
    loan?.dealerName,
    loan?.channelName,
    loan?.profile?.sourceName,
    loan?.record_details?.sourceName,
  ),
  dealerMobile: pickFirstMeaningful(
    loan?.dealerMobile,
    loan?.do_dealerMobile,
    loan?.dealerContactNumber,
    loan?.dealerPhone,
    loan?.delivery_dealerContactNumber,
    loan?.record_dealerContactNumber,
  ),
  dealerAddress: pickFirstMeaningful(
    loan?.dealerAddress,
    loan?.do_dealerAddress,
    loan?.showroomAddress,
    loan?.record_dealerAddress,
    loan?.delivery_dealerAddress,
    loan?.showroomDealerAddress,
  ),
  dealerName: pickFirstMeaningful(
    loan?.showroomDealerName,
    loan?.delivery_dealerName,
    loan?.dealerName,
    loan?.showroomName,
    loan?.do_dealerName,
  ),
  dealerContactPerson: pickFirstMeaningful(
    loan?.delivery_dealerContactPerson,
    loan?.dealerContactPerson,
    loan?.showroomContactPerson,
    loan?.do_dealerContactPerson,
  ),
  dealerCity: pickFirstMeaningful(
    loan?.delivery_dealerCity,
    loan?.dealerCity,
    loan?.showroomCity,
    loan?.do_dealerCity,
  ),
  dealerPincode: pickFirstMeaningful(
    loan?.delivery_dealerPincode,
    loan?.dealerPincode,
    loan?.showroomPincode,
    loan?.do_dealerPincode,
  ),
  insuranceBy: pickFirstMeaningful(
    loan?.do_insuranceBy,
    loan?.insurance_by,
    loan?.insuranceBy,
  ),
  insuranceCompanyName: pickFirstMeaningful(
    loan?.do_customer_insuranceCompanyName,
    loan?.insurance_company_name,
  ),
  insurancePolicyNumber: pickFirstMeaningful(
    loan?.do_customer_insurancePolicyNumber,
    loan?.insurance_policy_number,
  ),
  insurancePremium: asNumberOrEmpty(
    loan?.do_customer_actualInsurancePremium ?? loan?.insurance_premium,
  ),
  insurancePolicyStartDate:
    loan?.do_customer_insurancePolicyStartDate ||
    loan?.insurance_policy_start_date ||
    null,
  insurancePolicyDurationOD: pickFirstMeaningful(
    loan?.do_customer_insurancePolicyDurationOD,
    loan?.insurance_policy_duration_od,
  ),
  insurancePolicyEndDateOD:
    loan?.do_customer_insurancePolicyEndDateOD ||
    loan?.insurance_policy_end_date_od ||
    null,
});

const patchDateFieldsToDayjs = (obj = {}) => {
  const patched = { ...(obj || {}) };

  Object.keys(patched).forEach((key) => {
    const val = patched[key];
    if (!val) return;

    if (key.toLowerCase().includes("date")) {
      if (dayjs.isDayjs(val)) return;

      if (typeof val === "string") {
        const d = dayjs(val);
        patched[key] = d.isValid() ? d : undefined;
      }
    }
  });

  return patched;
};

const serializeDatesToISO = (obj = {}) => {
  const out = { ...(obj || {}) };

  Object.keys(out).forEach((key) => {
    const val = out[key];
    if (dayjs.isDayjs(val)) {
      out[key] = val.toISOString();
    }
  });

  return out;
};

const getLoanDisbursementDate = (loan = {}) => {
  const candidates = [
    loan?.latestBusinessDate,
    loan?.delivery_date,
    loan?.deliveryDate,
    loan?.do_date,
    loan?.doDate,
    loan?.invoice_date,
    loan?.invoiceDate,
    loan?.approval_disbursedDate,
    loan?.disbursement_date,
    loan?.disbursementDate,
    loan?.disbursedDate,
    loan?.disburseDate,
    loan?.postfile_disbursementDate,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = dayjs(candidate);
    if (parsed.isValid()) return parsed;
  }
  return null;
};

const LEGACY_CUTOFF = dayjs("2026-02-01T00:00:00.000Z");

const isLegacyNewCarAutoCreateBlocked = (loan = {}) => {
  const loanType = safeText(loan?.typeOfLoan || loan?.loanType)
    .trim()
    .toLowerCase();
  if (loanType !== "new car") return false;
  const disbDate = getLoanDisbursementDate(loan);
  if (!disbDate) return false;
  return disbDate.isBefore(LEGACY_CUTOFF);
};

// ---- API helpers for DOs ----
const fetchDOByLoanId = async (loanId) => {
  const res = await deliveryOrdersApi.getByLoanId(loanId);
  return res.data || null;
};

const saveDOByLoanId = async (loanId, payload) => {
  return await deliveryOrdersApi.update(loanId, payload);
};

const sanitizeNamedAmountList = (list = []) => {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      label: safeText(item?.label).trim(),
      amount: asNullableNumberField(item?.amount),
    }))
    .filter((item) => item.label || item.amount !== null);
};

// -------------------------------------
// Main Component
// -------------------------------------
const DeliveryOrderForm = () => {
  const navigate = useNavigate();
  const { loanId: routeLoanId } = useParams();
  const { isDarkMode } = useTheme();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [createdLoanId, setCreatedLoanId] = useState("");
  const activeLoanId = String(createdLoanId || routeLoanId || "").trim();

  const showCustomerVehicleSection = Form.useWatch(
    "do_showCustomerVehicleSection",
    form,
  );

  const [hasLoadedLoanContext, setHasLoadedLoanContext] = useState(false);
  const [existingDO, setExistingDO] = useState(null);
  const [loanData, setLoanData] = useState(null);

  // Load Loan from API (prefill) with sessionStorage fallback
  useEffect(() => {
    if (!routeLoanId) return;

    const load = async () => {
      try {
        const res = await loansApi.getById(routeLoanId);
        const fromById = res?.data?.loanId || res?.data?._id ? res.data : null;
        if (fromById) {
          setLoanData(fromById);
          return;
        }
        if (res?.data?.data) {
          setLoanData(res.data.data);
          return;
        }
      } catch (e) {
        // ignore and fall back
      }

      try {
        const listRes = await loansApi.getAll({
          loanIds: routeLoanId,
          limit: 1,
          noCount: true,
          view: "dashboard",
        });
        const candidate =
          (Array.isArray(listRes?.data) && listRes.data[0]) ||
          (Array.isArray(listRes) && listRes[0]) ||
          null;
        if (candidate) {
          setLoanData(candidate);
          return;
        }
      } catch (_) {
        // ignore and continue with session fallbacks
      }

      const editingLoanRaw = sessionStorage.getItem("editingLoan");
      if (editingLoanRaw) {
        try {
          const parsed = JSON.parse(editingLoanRaw);
          setLoanData(parsed || null);
          return;
        } catch (e) {
          // ignore
        }
      }

      const savedLoansRaw = sessionStorage.getItem("savedLoans");
      if (savedLoansRaw && routeLoanId) {
        try {
          const saved = JSON.parse(savedLoansRaw || "[]");
          const match = saved.find(
            (x) => x.loanId === routeLoanId || x.id === routeLoanId,
          );
          setLoanData(match || null);
          return;
        } catch (e) {
          // ignore
        }
      }

      setLoanData(null);
    };

    load().finally(() => {
      setHasLoadedLoanContext(true);
    });
  }, [routeLoanId]);

  // Load existing DO
  useEffect(() => {
    if (!routeLoanId) return;
    if (!hasLoadedLoanContext) return;

    const load = async () => {
      try {
        const foundDO = await fetchDOByLoanId(routeLoanId);
        if (!foundDO) {
          if (isLegacyNewCarAutoCreateBlocked(loanData || {})) {
            return;
          }
          return;
        }

        setExistingDO(foundDO);
        const patched = patchDateFieldsToDayjs(foundDO);
        const loanPrefill = buildLoanContextPrefill(loanData || {});
        const hydrated = {
          ...patched,
          customerName: pickFirstMeaningful(
            patched?.customerName,
            patched?.do_customerName,
            patched?.customer_name,
            loanPrefill.customerName,
          ),
          primaryMobile: pickFirstMeaningful(
            patched?.primaryMobile,
            patched?.do_primaryMobile,
            patched?.mobile,
            loanPrefill.primaryMobile,
          ),
          residenceAddress: pickFirstMeaningful(
            patched?.residenceAddress,
            patched?.do_residenceAddress,
            patched?.address,
            loanPrefill.residenceAddress,
          ),
          pincode: pickFirstMeaningful(
            patched?.pincode,
            patched?.do_pincode,
            loanPrefill.pincode,
          ),
          city: pickFirstMeaningful(
            patched?.city,
            patched?.do_city,
            loanPrefill.city,
          ),
          recordSource: pickFirstMeaningful(
            patched?.recordSource,
            patched?.do_recordSource,
            patched?.source,
            loanPrefill.recordSource,
          ),
          sourceName: pickFirstMeaningful(
            patched?.sourceName,
            patched?.do_sourceName,
            patched?.dealerName,
            loanPrefill.sourceName,
          ),
          dealerMobile: pickFirstMeaningful(
            patched?.dealerMobile,
            patched?.do_dealerMobile,
            patched?.do_dealerContactNumber,
            loanPrefill.dealerMobile,
          ),
          dealerAddress: pickFirstMeaningful(
            patched?.dealerAddress,
            patched?.do_dealerAddress,
            loanPrefill.dealerAddress,
          ),
          do_dealerName: pickFirstMeaningful(
            patched?.do_dealerName,
            patched?.dealerName,
            patched?.delivery_dealerName,
            loanPrefill.dealerName,
          ),
          do_dealerAddress: pickFirstMeaningful(
            patched?.do_dealerAddress,
            patched?.dealerAddress,
            patched?.delivery_dealerAddress,
            loanPrefill.dealerAddress,
          ),
          do_dealerMobile: pickFirstMeaningful(
            patched?.do_dealerMobile,
            patched?.do_dealerContactNumber,
            patched?.dealerMobile,
            patched?.delivery_dealerContactNumber,
            loanPrefill.dealerMobile,
          ),
          do_dealerContactPerson: pickFirstMeaningful(
            patched?.do_dealerContactPerson,
            patched?.dealerContactPerson,
            patched?.delivery_dealerContactPerson,
            loanPrefill.dealerContactPerson,
          ),
          do_dealerCity: pickFirstMeaningful(
            patched?.do_dealerCity,
            patched?.delivery_dealerCity,
            loanPrefill.dealerCity,
          ),
          do_dealerPincode: pickFirstMeaningful(
            patched?.do_dealerPincode,
            patched?.delivery_dealerPincode,
            loanPrefill.dealerPincode,
          ),
          do_vehicleMake: pickFirstMeaningful(
            patched?.do_vehicleMake,
            patched?.vehicleMake,
            loanData?.vehicleMake,
            loanData?.make,
          ),
          do_vehicleModel: pickFirstMeaningful(
            patched?.do_vehicleModel,
            patched?.vehicleModel,
            loanData?.vehicleModel,
            loanData?.model,
          ),
          do_vehicleVariant: pickFirstMeaningful(
            patched?.do_vehicleVariant,
            patched?.vehicleVariant,
            loanData?.vehicleVariant,
            loanData?.variant,
          ),
          do_colour: pickFirstMeaningful(
            patched?.do_colour,
            patched?.do_vehicleColor,
            patched?.vehicleColor,
          ),
          do_exShowroomPrice: (() => {
            return hydrateNullableNumberFromDO(
              patched,
              ["do_exShowroomPrice"],
              ["exShowroomPrice", "ex_showroom"],
            );
          })(),
          do_insuranceCost: (() => {
            return hydrateNullableNumberFromDO(
              patched,
              ["do_insuranceCost"],
              ["insuranceCost", "insurance"],
            );
          })(),
          do_roadTax: (() => {
            return hydrateNullableNumberFromDO(
              patched,
              ["do_roadTax"],
              ["roadTax", "rto"],
            );
          })(),
          do_accountType: pickFirstMeaningful(
            patched?.do_accountType,
            "Showroom",
          ),
          do_loanAmount: asNumberOrEmpty(
            pickFirstMeaningful(
              patched?.do_loanAmount,
              patched?.loanAmount,
              loanData?.postfile_disbursedLoan,
              loanData?.loanAmount,
            ),
          ),
          do_processingFees: (() => {
            return hydrateNullableNumberFromDO(
              patched,
              ["do_processingFees"],
              ["processingFees"],
            );
          })(),
          do_customer_insuranceBy: (() => {
            const hydratedValue = hydrateFieldFromDO(
              patched,
              ["do_customer_insuranceBy"],
              ["do_insuranceBy", "insurance_by"],
              safeText,
            );
            return hydratedValue !== undefined
              ? hydratedValue
              : safeText(loanPrefill.insuranceBy);
          })(),
          do_customer_insuranceCompanyName: (() => {
            const hydratedValue = hydrateFieldFromDO(
              patched,
              ["do_customer_insuranceCompanyName"],
              ["insurance_company_name"],
              safeText,
            );
            return hydratedValue !== undefined
              ? hydratedValue
              : safeText(loanPrefill.insuranceCompanyName);
          })(),
          do_customer_insurancePolicyNumber: (() => {
            const hydratedValue = hydrateFieldFromDO(
              patched,
              ["do_customer_insurancePolicyNumber"],
              ["insurance_policy_number"],
              safeText,
            );
            return hydratedValue !== undefined
              ? hydratedValue
              : safeText(loanPrefill.insurancePolicyNumber);
          })(),
          do_customer_actualInsurancePremium: (() => {
            const hydratedValue = hydrateNullableNumberFromDO(
              patched,
              ["do_customer_actualInsurancePremium"],
              ["insurance_premium"],
            );
            return hydratedValue !== undefined
              ? hydratedValue
              : asNumberOrEmpty(loanPrefill.insurancePremium);
          })(),
          do_customer_insurancePolicyStartDate: (() => {
            const hydratedValue = hydrateFieldFromDO(
              patched,
              ["do_customer_insurancePolicyStartDate"],
              ["insurance_policy_start_date"],
            );
            return hydratedValue !== undefined
              ? hydratedValue
              : loanPrefill.insurancePolicyStartDate;
          })(),
          do_customer_insurancePolicyDurationOD: (() => {
            const hydratedValue = hydrateFieldFromDO(
              patched,
              ["do_customer_insurancePolicyDurationOD"],
              ["insurance_policy_duration_od"],
              safeText,
            );
            return hydratedValue !== undefined
              ? hydratedValue
              : safeText(loanPrefill.insurancePolicyDurationOD);
          })(),
          do_customer_insurancePolicyEndDateOD: (() => {
            const hydratedValue = hydrateFieldFromDO(
              patched,
              ["do_customer_insurancePolicyEndDateOD"],
              ["insurance_policy_end_date_od"],
            );
            return hydratedValue !== undefined
              ? hydratedValue
              : loanPrefill.insurancePolicyEndDateOD;
          })(),
        };

        form.setFieldsValue({
          ...hydrated,
          do_loanId: hydrated?.do_loanId || hydrated?.loanId || routeLoanId,
          loanId: hydrated?.loanId || hydrated?.do_loanId || routeLoanId,
        });
      } catch (err) {
        console.error("Load DO Error:", err);
      }
    };

    load();
  }, [routeLoanId, form, hasLoadedLoanContext, loanData]);

  // Prefill defaults ONLY when empty
  useEffect(() => {
    const existing = form.getFieldsValue(true);

    if (!existing.do_date) form.setFieldsValue({ do_date: dayjs() });

    if (!existing.do_refNo) {
      form.setFieldsValue({ do_refNo: generateDONumber() });
    }

    if (existing.do_showCustomerVehicleSection === undefined) {
      form.setFieldsValue({ do_showCustomerVehicleSection: false });
    }

    if (!existing.do_loanId) {
      form.setFieldsValue({
        do_loanId: loanData?.loanId || routeLoanId || "",
      });
    }

    const loanPrefill = buildLoanContextPrefill(loanData || {});
    const hasExistingDORecord = Boolean(
      existingDO?._id || existingDO?.loanId || existingDO?.do_loanId,
    );
    const fieldPatch = {};

    [
      "customerName",
      "primaryMobile",
      "residenceAddress",
      "pincode",
      "city",
      "recordSource",
      "sourceName",
      "dealerMobile",
      "dealerAddress",
      "dealerName",
      "dealerContactPerson",
      "dealerCity",
      "dealerPincode",
    ].forEach((key) => {
      if (
        !hasMeaningfulValue(existing[key]) &&
        hasMeaningfulValue(loanPrefill[key])
      ) {
        fieldPatch[key] = loanPrefill[key];
      }
    });

    if (
      !hasMeaningfulValue(existing.do_dealerName) &&
      hasMeaningfulValue(loanPrefill.dealerName)
    ) {
      fieldPatch.do_dealerName = loanPrefill.dealerName;
    }
    if (
      !hasMeaningfulValue(existing.do_dealerAddress) &&
      hasMeaningfulValue(loanPrefill.dealerAddress)
    ) {
      fieldPatch.do_dealerAddress = loanPrefill.dealerAddress;
    }
    if (
      !hasMeaningfulValue(existing.do_dealerMobile) &&
      hasMeaningfulValue(loanPrefill.dealerMobile)
    ) {
      fieldPatch.do_dealerMobile = loanPrefill.dealerMobile;
    }
    if (
      !hasMeaningfulValue(existing.do_dealerContactPerson) &&
      hasMeaningfulValue(loanPrefill.dealerContactPerson)
    ) {
      fieldPatch.do_dealerContactPerson = loanPrefill.dealerContactPerson;
    }
    if (
      !hasMeaningfulValue(existing.do_dealerCity) &&
      hasMeaningfulValue(loanPrefill.dealerCity)
    ) {
      fieldPatch.do_dealerCity = loanPrefill.dealerCity;
    }
    if (
      !hasMeaningfulValue(existing.do_dealerPincode) &&
      hasMeaningfulValue(loanPrefill.dealerPincode)
    ) {
      fieldPatch.do_dealerPincode = loanPrefill.dealerPincode;
    }

    if (!hasExistingDORecord) {
      if (
        !hasMeaningfulValue(existing.do_customer_insuranceBy) &&
        hasMeaningfulValue(loanPrefill.insuranceBy)
      ) {
        fieldPatch.do_customer_insuranceBy = loanPrefill.insuranceBy;
      }
      if (
        !hasMeaningfulValue(existing.do_customer_insuranceCompanyName) &&
        hasMeaningfulValue(loanPrefill.insuranceCompanyName)
      ) {
        fieldPatch.do_customer_insuranceCompanyName =
          loanPrefill.insuranceCompanyName;
      }
      if (
        !hasMeaningfulValue(existing.do_customer_insurancePolicyNumber) &&
        hasMeaningfulValue(loanPrefill.insurancePolicyNumber)
      ) {
        fieldPatch.do_customer_insurancePolicyNumber =
          loanPrefill.insurancePolicyNumber;
      }
      if (
        isEmpty(existing.do_customer_actualInsurancePremium) &&
        !isEmpty(loanPrefill.insurancePremium)
      ) {
        fieldPatch.do_customer_actualInsurancePremium =
          loanPrefill.insurancePremium;
      }
      if (
        isEmpty(existing.do_customer_insurancePolicyStartDate) &&
        loanPrefill.insurancePolicyStartDate
      ) {
        fieldPatch.do_customer_insurancePolicyStartDate =
          loanPrefill.insurancePolicyStartDate;
      }
      if (
        isEmpty(existing.do_customer_insurancePolicyDurationOD) &&
        hasMeaningfulValue(loanPrefill.insurancePolicyDurationOD)
      ) {
        fieldPatch.do_customer_insurancePolicyDurationOD =
          loanPrefill.insurancePolicyDurationOD;
      }
      if (
        isEmpty(existing.do_customer_insurancePolicyEndDateOD) &&
        loanPrefill.insurancePolicyEndDateOD
      ) {
        fieldPatch.do_customer_insurancePolicyEndDateOD =
          loanPrefill.insurancePolicyEndDateOD;
      }
    }

    if (Object.keys(fieldPatch).length) {
      form.setFieldsValue(fieldPatch);
    }
  }, [form, loanData, routeLoanId, existingDO]);

  // Actions
  const handleDiscardAndExit = () => {
    form.resetFields();
    navigate("/delivery-orders");
  };

  const saveDeliveryOrder = async ({ exitAfterSave = false } = {}) => {
    try {
      setLoading(true);

      if (
        typeof document !== "undefined" &&
        document.activeElement &&
        typeof document.activeElement.blur === "function"
      ) {
        document.activeElement.blur();
        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      await form.validateFields();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const serialized = serializeDatesToISO(form.getFieldsValue(true));
      const currentValues = form.getFieldsValue(true);

      let finalLoanId =
        serialized?.do_loanId ||
        existingDO?.do_loanId ||
        loanData?.loanId ||
        routeLoanId;

      if (!finalLoanId) {
        if (!serialized?.customerName || !serialized?.primaryMobile) {
          message.error(
            "Customer name and mobile are required to create a new DO entry.",
          );
          return;
        }

        const createdRes = await deliveryOrdersApi.createDirect({
          customerName: serialized?.customerName,
          primaryMobile: serialized?.primaryMobile,
          vehicleMake: serialized?.do_vehicleMake || "",
          vehicleModel: serialized?.do_vehicleModel || "",
          vehicleVariant: serialized?.do_vehicleVariant || "",
          typeOfLoan: serialized?.typeOfLoan || "New Car",
          isFinanced:
            String(serialized?.isFinanced || "").toLowerCase() === "no"
              ? "No"
              : "Yes",
          dealerName: serialized?.do_dealerName || "",
          dealerAddress: serialized?.do_dealerAddress || "",
          vehicleColor: serialized?.do_colour || "",
        });
        const createdId = createdRes?.data?.loanId || createdRes?.loanId;
        if (!createdId) {
          throw new Error("Unable to create new DO entry");
        }
        finalLoanId = createdId;
        setCreatedLoanId(createdId);
        form.setFieldsValue({ do_loanId: createdId, loanId: createdId });
      }

      const payload = {
        ...(existingDO || {}),
        ...serialized,
        do_exShowroomPrice: isEmpty(currentValues?.do_exShowroomPrice)
          ? null
          : asNullableNumberField(currentValues?.do_exShowroomPrice),
        do_insuranceCost: isEmpty(currentValues?.do_insuranceCost)
          ? null
          : asNullableNumberField(currentValues?.do_insuranceCost),
        do_roadTax: isEmpty(currentValues?.do_roadTax)
          ? null
          : asNullableNumberField(currentValues?.do_roadTax),
        do_processingFees: asNullableNumberField(currentValues?.do_processingFees),
        do_customer_exShowroomPrice: asNullableNumberField(
          currentValues?.do_customer_exShowroomPrice,
        ),
        do_customer_insuranceCost: asNullableNumberField(
          currentValues?.do_customer_insuranceCost,
        ),
        do_customer_roadTax: asNullableNumberField(
          currentValues?.do_customer_roadTax,
        ),
        do_customer_actualInsurancePremium: asNullableNumberField(
          currentValues?.do_customer_actualInsurancePremium,
        ),
        do_marginMoneyPaid: asNullableNumberField(currentValues?.do_marginMoneyPaid),
        do_additions_others: sanitizeNamedAmountList(
          currentValues?.do_additions_others,
        ),
        do_discounts_others: sanitizeNamedAmountList(
          currentValues?.do_discounts_others,
        ),
        loanId: finalLoanId,
        do_loanId: finalLoanId,
        updatedAt: new Date().toISOString(),
        createdAt: existingDO?.createdAt || new Date().toISOString(),
      };

      const saveRes = await saveDOByLoanId(finalLoanId, payload);
      if (saveRes?.skipped || saveRes?.data === null) {
        message.warning(
          "DO creation is paused for New Car loans delivered/disbursed before 1 Feb 2026.",
        );
        return;
      }
      setExistingDO(saveRes?.data?.data || saveRes?.data || payload);

      message.success("Delivery Order saved successfully ✅");
      if (exitAfterSave) {
        navigate("/delivery-orders");
        return true;
      }
      if (!routeLoanId && finalLoanId) {
        navigate(`/delivery-orders/${finalLoanId}`, { replace: true });
      }
      return true;
    } catch (err) {
      console.error("Save DO Error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    await saveDeliveryOrder();
  };

  const handleSaveAndExit = async () => {
    await saveDeliveryOrder({ exitAfterSave: true });
  };

  const handlePrint = () => {
    window.print();
  };

  // UI
  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDarkMode
          ? "linear-gradient(180deg, #090b10 0%, #111111 24%, #161616 100%)"
          : "linear-gradient(180deg, #edf5ff 0%, #f8fafc 30%, #ffffff 100%)",
        color: isDarkMode ? "#f5f5f5" : "#111827",
        padding: "0 16px 32px",
      }}
    >
      {/* full width, no maxWidth container */}
      <div>
        {/* TOP ACTION BAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            gap: 12,
            position: "sticky",
            top: 64,
            zIndex: 80,
            color: isDarkMode ? "#f5f5f5" : "#111827",
            padding: "10px 14px",
            borderRadius: 20,
            border: `1px solid ${isDarkMode ? "#252525" : "#dce8f6"}`,
            background: isDarkMode
              ? "rgba(20,20,20,0.82)"
              : "rgba(255,255,255,0.78)",
            backdropFilter: "blur(18px)",
            boxShadow: isDarkMode
              ? "0 18px 40px rgba(0,0,0,0.28)"
              : "0 18px 40px rgba(59,130,246,0.08)",
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/delivery-orders")}
          >
            Back
          </Button>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              Print DO
            </Button>
            <Button danger onClick={handleDiscardAndExit}>
              Discard & Exit
            </Button>
            <Button
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSaveAndExit}
            >
              Save & Exit
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>

        <Form form={form} layout="vertical">
          {/* HEADER BANNER */}
          <Card
            style={{
              borderRadius: 28,
              marginBottom: 18,
              overflow: "hidden",
              border: `1px solid ${isDarkMode ? "#2a2f39" : "#dbe7f4"}`,
              background: isDarkMode
                ? "linear-gradient(135deg, rgba(20,24,32,0.98) 0%, rgba(17,17,17,0.98) 100%)"
                : "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(244,249,255,0.98) 100%)",
              boxShadow: isDarkMode
                ? "0 28px 60px rgba(0,0,0,0.35)"
                : "0 28px 60px rgba(37,99,235,0.10)",
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div
              style={{
                padding: "24px 24px 22px",
                background: isDarkMode
                  ? "radial-gradient(circle at top right, rgba(96,165,250,0.12), transparent 34%), radial-gradient(circle at left center, rgba(52,211,153,0.08), transparent 28%)"
                  : "radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 34%), radial-gradient(circle at left center, rgba(16,185,129,0.08), transparent 28%)",
              }}
            >
              <Row align="middle" justify="space-between">
                <Col>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: isDarkMode ? "#dbeafe" : "#1d4ed8",
                      background: isDarkMode
                        ? "rgba(37,99,235,0.16)"
                        : "rgba(59,130,246,0.10)",
                      marginBottom: 12,
                    }}
                  >
                    Delivery order
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 24,
                      marginTop: 2,
                      color: isDarkMode ? "#f8fafc" : "#111827",
                    }}
                  >
                    Delivery Order Workspace
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#a1a1aa" : "#64748b",
                      marginTop: 8,
                      maxWidth: 700,
                    }}
                  >
                    Review customer, showroom, pricing, and net payable in one
                    place before handing over the vehicle.
                  </div>
                </Col>

                <Col>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    <Tag color="blue">
                      Loan ID: {activeLoanId || "Not assigned yet"}
                    </Tag>
                    <Tag color="purple">
                      DO Ref: {form.getFieldValue("do_refNo") || "Draft"}
                    </Tag>
                    {existingDO && <Tag color="green">Existing DO</Tag>}
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
          {/* SECTION 1 — Customer & DO Header */}
          <DOSectionCustomerDetails form={form} readOnly={false} />
          {/* SECTION 2 */}
          <Section2DealerDetails form={form} loan={loanData} />
          {/* SECTION 3 — Showroom Vehicle Details */}
          <Section3VehicleDetailsShowroom loan={loanData} />
          {/* SECTION 4 — Customer account vehicle section toggle */}
          <Card
            style={{
              borderRadius: 24,
              marginTop: 16,
              border: `1px solid ${isDarkMode ? "#303030" : "#dbe7f4"}`,
              background: isDarkMode
                ? "linear-gradient(180deg, rgba(27,27,27,0.98) 0%, rgba(19,19,19,0.98) 100%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
              boxShadow: isDarkMode
                ? "0 22px 48px rgba(0,0,0,0.24)"
                : "0 22px 48px rgba(37,99,235,0.08)",
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Row align="middle" justify="space-between" gutter={[16, 8]}>
              <Col xs={24} md={18}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Customer account
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: isDarkMode ? "#f3f4f6" : "#111827",
                  }}
                >
                  Enable customer account vehicle details
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    marginTop: 4,
                    maxWidth: 520,
                  }}
                >
                  Turn this on only when Delivery Order calculations should be
                  based on customer account pricing instead of showroom pricing.
                </div>
              </Col>

              <Col
                xs={24}
                md={6}
                style={{ display: "flex", justifyContent: "flex-end" }}
              >
                <Form.Item
                  name="do_showCustomerVehicleSection"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Enable customer account section</Checkbox>
                </Form.Item>
              </Col>
            </Row>
          </Card>
          {showCustomerVehicleSection && (
            <>
              <div style={{ height: 16 }} />
              <Section4VehicleDetailsCustomer loan={loanData} />
            </>
          )}

          <div style={{ height: 32 }} />

          {/* SECTION 5 — DO DETAILS */}
          <Section5DODetails loan={loanData} />
          <div style={{ height: 24 }} />

          {/* Point 9: Hidden print area — rendered for window.print() */}
          <div style={{ display: "none" }} className="print-area">
            <DOPrint doData={existingDO || {}} loan={loanData || {}} />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default DeliveryOrderForm;
