import React from "react";
import dayjs from "dayjs";
import {
  AutoComplete,
  DatePicker,
  Checkbox,
  Col,
  Collapse,
  Input,
  InputNumber,
  Row,
  Select,
  Tag,
} from "antd";
import {
  CalendarOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  InfoCircleOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { lenderHypothecationOptions } from "../../../constants/lenderHypothecationOptions";
import { IRDAI_INSURANCE_COMPANIES } from "../../../constants/irdaiInsuranceCompanies";

const shellStyle =
  "rounded-[28px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const controlStyle = {
  width: "100%",
  marginTop: 8,
  height: 44,
  borderRadius: 14,
};

const inputControlStyle = {
  ...controlStyle,
  paddingTop: 0,
  paddingBottom: 0,
  lineHeight: "44px",
};

const computedDateStyle = {
  ...inputControlStyle,
  pointerEvents: "none",
  cursor: "default",
  background: "#fff",
  color: "rgba(0,0,0,0.88)",
};

const textAreaStyle = {
  width: "100%",
  marginTop: 8,
  borderRadius: 14,
  minHeight: 86,
};

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500";

const microHintClass = "mt-1 text-[11px] text-slate-400";

const fieldWrapClass =
  "[&_.ant-input]:!h-[44px] [&_.ant-input]:!rounded-[14px] [&_.ant-input]:!text-[14px] [&_.ant-input]:!py-0 [&_.ant-input]:!leading-[44px] [&_.ant-input-number]:!h-[44px] [&_.ant-input-number]:!w-full [&_.ant-input-number]:!rounded-[14px] [&_.ant-input-number-input-wrap]:!h-[42px] [&_.ant-input-number-input]:!h-[42px] [&_.ant-input-number-input]:!leading-[42px] [&_.ant-input-number-input]:!text-[14px] [&_.ant-select-selector]:!h-[44px] [&_.ant-select-selector]:!rounded-[14px] [&_.ant-select-selector]:!px-[11px] [&_.ant-select-selector]:!py-0 [&_.ant-select-selection-item]:!leading-[42px] [&_.ant-select-selection-placeholder]:!leading-[42px] [&_.ant-picker]:!h-[44px] [&_.ant-picker]:!w-full [&_.ant-picker]:!rounded-[14px] [&_.ant-picker]:!px-[11px] [&_.ant-picker-input_>input]:!h-[42px] [&_.ant-picker-input_>input]:!leading-[42px] [&_.ant-picker-input_>input]:!text-[14px] [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-[#22A06B] [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-[#22A06B] [&_.ant-checkbox:hover_.ant-checkbox-inner]:!border-[#22A06B]";

const ALL_ADDONS = [
  "Zero Depreciation",
  "Consumables",
  "Engine Protection",
  "Roadside Assistance",
  "No Claim Bonus (NCB) Protection",
  "Key Replacement",
  "Tyre Protection",
  "Return to Invoice",
  "Driver Cover",
  "Personal Accident Cover for Passengers",
  "Loss of Personal Belongings",
  "Outstation Emergency Cover",
  "Battery Cover",
];

const HYPOTHECATION_OPTIONS = [
  { label: "Not Applicable", value: "Not Applicable" },
  ...lenderHypothecationOptions.map((option) => ({
    label: option.value,
    value: option.value,
  })),
];

const CleanField = ({ label, required, hint, children, extra }) => (
  <div className="pb-1 insurance-field-block" data-ins-field="true">
    <div className={labelClass}>
      {label} {required ? <span className="text-[#FF8EAD]">*</span> : null}
    </div>
    {children}
    {hint ? <div className={microHintClass}>{hint}</div> : null}
    {extra ? <div className="mt-1">{extra}</div> : null}
  </div>
);

const BreakupRow = ({ label, value, bold, muted, indent }) => (
  <div
    className={`flex items-center justify-between py-1.5 ${
      bold ? "mt-1 border-t border-slate-100 pt-2.5" : ""
    } ${indent ? "pl-3" : ""}`}
  >
    <span
      className={`text-[12px] ${
        bold
          ? "font-bold text-slate-800"
          : muted
            ? "text-slate-500"
            : "text-slate-500"
      }`}
    >
      {label}
    </span>
    <span
      className={`tabular-nums text-[12px] ${
        bold
          ? "font-black text-slate-900"
          : muted
            ? "text-slate-500"
            : "font-semibold text-slate-700"
      }`}
    >
      {value}
    </span>
  </div>
);

const MiniDateCard = ({ icon, label, value, tone = "slate" }) => {
  const toneMap = {
    slate: "bg-slate-50 ring-slate-200",
    sage: "bg-[#DAF3FF] ring-[#9FC0FF]",
    warm: "bg-[#FFE6C6] ring-[#FFE6C6]",
  };

  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${toneMap[tone]}`}>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/80 text-slate-700 ring-1 ring-white/70">
          {icon}
        </span>
        {label}
      </div>
      <div className="text-sm font-bold text-slate-800">{value || "—"}</div>
    </div>
  );
};

const getInitial = (name) => (name || "?").toString().slice(0, 2).toUpperCase();

const formatDisplayDate = (value) =>
  value ? dayjs(value).format("DD MMM YYYY") : "—";

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

const formatAmountInput = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return "";
  const [whole, decimal] = cleaned.split(".");
  const formattedWhole = new Intl.NumberFormat("en-IN").format(
    Number(whole || 0),
  );
  return decimal !== undefined
    ? `₹ ${formattedWhole}.${decimal}`
    : `₹ ${formattedWhole}`;
};

const parseAmountInput = (value) => (value ? value.replace(/[₹,\s]/g, "") : "");

const computeMinusOneDayExpiry = (startDate, years) => {
  if (!startDate || !years) return "";
  return dayjs(startDate)
    .add(years, "year")
    .subtract(1, "day")
    .format("YYYY-MM-DD");
};

const getDurationYears = (policyType, durationValue) => {
  const value = String(durationValue || "").trim();

  if (!value) {
    return { odYears: 0, tpYears: 0 };
  }

  if (policyType === "Comprehensive") {
    const odMatch = value.match(/(\d+)\s*yr\s*OD/i);
    const tpMatch = value.match(/(\d+)\s*yr\s*TP/i);
    return {
      odYears: odMatch ? Number(odMatch[1]) : 0,
      tpYears: tpMatch ? Number(tpMatch[1]) : 0,
    };
  }

  const genericMatch = value.match(/(\d+)/);
  const years = genericMatch ? Number(genericMatch[1]) : 0;

  if (policyType === "Stand Alone OD") {
    return { odYears: years, tpYears: 0 };
  }

  if (policyType === "Third Party") {
    return { odYears: 0, tpYears: years };
  }

  return { odYears: 0, tpYears: 0 };
};

const buildDefaultQuoteState = () => ({
  idv: 0,
  ownDamage: 0,
  basicOwnDamage: 0,
  ncbAmount: 0,
  thirdParty: 0,
  basicThirdParty: 0,
  addOnsTotal: 0,
  totalPremium: 0,
  selectedAddOns: [],
});

const toPositiveInt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
};

const Step3PreviousPolicy = ({
  formData,
  setField,
  handleChange,
  handlePreviousPolicyStartOrDuration,
  showErrors = false,
  step3Errors = {},
}) => {
  const [showAllPreviewAddons, setShowAllPreviewAddons] = React.useState(false);
  const [isQuoteEditMode, setIsQuoteEditMode] = React.useState(false);
  const [quoteDraft, setQuoteDraft] = React.useState(buildDefaultQuoteState);

  const previewPolicyId =
    formData.previousPolicyNumber || "PREV-POLICY-PREVIEW";

  const previewCompany =
    formData.previousInsuranceCompany || "Previous Insurance Co.";

  const previewPolicyType = formData.previousPolicyType || "—";

  const previewDuration = formData.previousPolicyDuration || "—";

  const previewNcb = Number(formData.previousNcbDiscount || 0);
  const isNewCar = String(formData.vehicleType || "").trim() === "New Car";

  const companyInitial = getInitial(previewCompany);

  const quoteSnapshot = React.useMemo(() => {
    const addOns =
      Array.isArray(formData.previousSelectedAddOns) &&
      formData.previousSelectedAddOns.length
        ? formData.previousSelectedAddOns
        : [];
    return {
      idv: toPositiveInt(formData.previousIdvAmount),
      ownDamage: toPositiveInt(formData.previousOwnDamageAmount),
      basicOwnDamage: toPositiveInt(
        formData.previousBasicOwnDamageAmount ?? formData.previousOwnDamageAmount,
      ),
      ncbAmount: 0,
      thirdParty: toPositiveInt(formData.previousThirdPartyAmount),
      basicThirdParty: toPositiveInt(
        formData.previousBasicThirdPartyAmount ?? formData.previousThirdPartyAmount,
      ),
      addOnsTotal: toPositiveInt(formData.previousAddOnsTotal),
      totalPremium: toPositiveInt(formData.previousTotalPremium),
      selectedAddOns: addOns,
    };
  }, [
    formData.previousAddOnsTotal,
    formData.previousBasicOwnDamageAmount,
    formData.previousBasicThirdPartyAmount,
    formData.previousIdvAmount,
    formData.previousOwnDamageAmount,
    formData.previousSelectedAddOns,
    formData.previousThirdPartyAmount,
    formData.previousTotalPremium,
  ]);

  const comprehensiveDurationOptions = React.useMemo(
    () =>
      isNewCar
        ? [
            { label: "1yr OD + 3yr TP", value: "1yr OD + 3yr TP" },
            { label: "2yr OD + 3yr TP", value: "2yr OD + 3yr TP" },
            { label: "3yr OD + 3yr TP", value: "3yr OD + 3yr TP" },
          ]
        : [{ label: "1yr OD + 1yr TP", value: "1yr OD + 1yr TP" }],
    [isNewCar],
  );

  const durationSelectOptions =
    formData.previousPolicyType === "Comprehensive"
      ? comprehensiveDurationOptions
      : formData.previousPolicyType === "Stand Alone OD"
        ? [
            { label: "1 Year", value: "1 Year" },
            { label: "2 Years", value: "2 Years" },
            { label: "3 Years", value: "3 Years" },
          ]
        : formData.previousPolicyType === "Third Party"
          ? [
              { label: "1 Year", value: "1 Year" },
              { label: "2 Years", value: "2 Years" },
              { label: "3 Years", value: "3 Years" },
            ]
          : [];

  React.useEffect(() => {
    const policyType = String(formData.previousPolicyType || "").trim();
    if (!policyType) return;
    const currentDuration = String(formData.previousPolicyDuration || "").trim();

    if (policyType === "Comprehensive") {
      const allowed = comprehensiveDurationOptions.map((opt) => opt.value);
      const nextDuration = allowed[0] || "";
      if (!allowed.includes(currentDuration) && nextDuration) {
        setField("previousPolicyDuration", nextDuration);
      }
      return;
    }

    if (policyType === "Third Party") {
      const allowed = ["1 Year", "2 Years", "3 Years"];
      if (!allowed.includes(currentDuration)) {
        setField("previousPolicyDuration", "1 Year");
      }
      return;
    }

    if (policyType === "Stand Alone OD") {
      const allowed = ["1 Year", "2 Years", "3 Years"];
      if (!allowed.includes(currentDuration)) {
        setField("previousPolicyDuration", "1 Year");
      }
    }
  }, [
    comprehensiveDurationOptions,
    formData.previousPolicyDuration,
    formData.previousPolicyType,
    setField,
  ]);

  const derivedYears = React.useMemo(
    () =>
      getDurationYears(
        formData.previousPolicyType,
        formData.previousPolicyDuration,
      ),
    [formData.previousPolicyType, formData.previousPolicyDuration],
  );

  const computedOdExpiry = React.useMemo(() => {
    if (!formData.previousPolicyStartDate || !derivedYears.odYears) return "";
    return computeMinusOneDayExpiry(
      formData.previousPolicyStartDate,
      derivedYears.odYears,
    );
  }, [formData.previousPolicyStartDate, derivedYears.odYears]);

  const computedTpExpiry = React.useMemo(() => {
    if (!formData.previousPolicyStartDate || !derivedYears.tpYears) return "";
    return computeMinusOneDayExpiry(
      formData.previousPolicyStartDate,
      derivedYears.tpYears,
    );
  }, [formData.previousPolicyStartDate, derivedYears.tpYears]);

  React.useEffect(() => {
    const policyType = formData.previousPolicyType;

    if (policyType === "Comprehensive") {
      if (formData.previousOdExpiryDate !== computedOdExpiry) {
        setField("previousOdExpiryDate", computedOdExpiry);
      }
      if (formData.previousTpExpiryDate !== computedTpExpiry) {
        setField("previousTpExpiryDate", computedTpExpiry);
      }
      return;
    }

    if (policyType === "Stand Alone OD") {
      if (formData.previousOdExpiryDate !== computedOdExpiry) {
        setField("previousOdExpiryDate", computedOdExpiry);
      }
      if (formData.previousTpExpiryDate !== "") {
        setField("previousTpExpiryDate", "");
      }
      return;
    }

    if (policyType === "Third Party") {
      if (formData.previousTpExpiryDate !== computedTpExpiry) {
        setField("previousTpExpiryDate", computedTpExpiry);
      }
      if (formData.previousOdExpiryDate !== "") {
        setField("previousOdExpiryDate", "");
      }
      return;
    }

    if (formData.previousOdExpiryDate !== "") {
      setField("previousOdExpiryDate", "");
    }
    if (formData.previousTpExpiryDate !== "") {
      setField("previousTpExpiryDate", "");
    }
  }, [
    computedOdExpiry,
    computedTpExpiry,
    formData.previousOdExpiryDate,
    formData.previousPolicyType,
    formData.previousTpExpiryDate,
    setField,
  ]);

  const longPolicyNumberPreview =
    formData.previousPolicyNumber &&
    formData.previousPolicyNumber.length > 26 ? (
      <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600 ring-1 ring-slate-200 break-all">
        {formData.previousPolicyNumber}
      </div>
    ) : null;

  const amountInputProps = {
    formatter: formatAmountInput,
    parser: parseAmountInput,
  };

  const activeQuote = isQuoteEditMode ? quoteDraft : quoteSnapshot;
  const visiblePreviewAddons = showAllPreviewAddons
    ? activeQuote.selectedAddOns
    : activeQuote.selectedAddOns.slice(0, 4);

  const computedEditModeTotalPremium = React.useMemo(() => {
    const ownDamage = Number(quoteDraft.ownDamage || 0);
    const thirdParty = Number(quoteDraft.thirdParty || 0);
    const addOnsTotal = Number(quoteDraft.addOnsTotal || 0);
    const basePremium = ownDamage + thirdParty + addOnsTotal;
    const gstInclusivePremium = Math.max(0, basePremium) * 1.18;

    return Math.round(gstInclusivePremium);
  }, [
    quoteDraft.ownDamage,
    quoteDraft.thirdParty,
    quoteDraft.addOnsTotal,
  ]);

  React.useEffect(() => {
    if (!isQuoteEditMode) return;

    setQuoteDraft((prev) => {
      if (Number(prev.totalPremium || 0) === computedEditModeTotalPremium) {
        return prev;
      }
      return {
        ...prev,
        totalPremium: computedEditModeTotalPremium,
      };
    });
  }, [computedEditModeTotalPremium, isQuoteEditMode]);

  const startQuoteEdit = () => {
    setQuoteDraft({
      ...quoteSnapshot,
      basicOwnDamage: quoteSnapshot.ownDamage,
      basicThirdParty: quoteSnapshot.thirdParty,
    });
    setIsQuoteEditMode(true);
  };

  const cancelQuoteEdit = () => {
    setQuoteDraft({
      ...quoteSnapshot,
      basicOwnDamage: quoteSnapshot.ownDamage,
      basicThirdParty: quoteSnapshot.thirdParty,
    });
    setIsQuoteEditMode(false);
  };

  const saveQuoteEdit = () => {
    const cleaned = {
      ...quoteDraft,
      ownDamage: Number(quoteDraft.ownDamage || 0),
      basicOwnDamage: Number(quoteDraft.ownDamage || 0),
      ncbAmount: 0,
      thirdParty: Number(quoteDraft.thirdParty || 0),
      basicThirdParty: Number(quoteDraft.thirdParty || 0),
      addOnsTotal: Number(quoteDraft.addOnsTotal || 0),
      totalPremium: Number(computedEditModeTotalPremium || 0),
      idv: Number(quoteDraft.idv || 0),
      selectedAddOns: quoteDraft.selectedAddOns || [],
    };
    setQuoteDraft(cleaned);
    setField("previousIdvAmount", cleaned.idv);
    setField("previousOwnDamageAmount", cleaned.ownDamage);
    setField("previousBasicOwnDamageAmount", cleaned.basicOwnDamage);
    setField("previousThirdPartyAmount", cleaned.thirdParty);
    setField("previousBasicThirdPartyAmount", cleaned.basicThirdParty);
    setField("previousAddOnsTotal", cleaned.addOnsTotal);
    setField("previousTotalPremium", cleaned.totalPremium);
    setField("previousSelectedAddOns", cleaned.selectedAddOns);
    setIsQuoteEditMode(false);
  };

  const standaloneAgeYears = React.useMemo(() => {
    const regDateRaw = String(formData.dateOfReg || "").trim();
    if (regDateRaw) {
      const regDate = dayjs(regDateRaw);
      if (regDate.isValid()) {
        return dayjs().diff(regDate, "year", true);
      }
    }
    const mfgYear = Number(formData.manufactureYear || 0);
    if (Number.isFinite(mfgYear) && mfgYear > 1900) {
      return dayjs().diff(dayjs(`${mfgYear}-01-01`), "year", true);
    }
    return null;
  }, [formData.dateOfReg, formData.manufactureYear]);

  const showStandaloneAgeWarning =
    formData.previousPolicyType === "Stand Alone OD" &&
    standaloneAgeYears != null &&
    standaloneAgeYears > 3;

  const suggestedNcb = React.useMemo(() => {
    const regDateRaw = String(formData.dateOfReg || "").trim();
    if (!regDateRaw) return 0;
    const regDate = dayjs(regDateRaw);
    if (!regDate.isValid()) return 0;

    const asOfRaw = String(formData.previousPolicyStartDate || "").trim();
    const asOfDate = asOfRaw ? dayjs(asOfRaw) : dayjs();
    if (!asOfDate.isValid()) return 0;

    const vehicleAgeYears = asOfDate.diff(regDate, "year", true);
    if (vehicleAgeYears <= 1) return 0;
    if (vehicleAgeYears <= 2) return 20;
    if (vehicleAgeYears <= 3) return 25;
    if (vehicleAgeYears <= 4) return 35;
    if (vehicleAgeYears <= 5) return 45;
    return 50;
  }, [formData.dateOfReg, formData.previousPolicyStartDate]);

  const toggleAddon = (addon) => {
    setQuoteDraft((prev) => {
      const exists = prev.selectedAddOns.includes(addon);
      return {
        ...prev,
        selectedAddOns: exists
          ? prev.selectedAddOns.filter((item) => item !== addon)
          : [...prev.selectedAddOns, addon],
      };
    });
  };

  const collapseItems = [
    {
      key: "1",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DAF3FF] text-slate-700 ring-1 ring-[#9FC0FF]">
            <SafetyCertificateOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              Previous policy details
            </div>
            <div className="text-xs text-slate-500">
              Company, type, duration, dates, NCB and financing details
            </div>
          </div>
        </div>
      ),
      children: (
        <div className="pt-3">
          <Row gutter={[22, 20]}>
            <Col xs={24} md={16}>
              <div className={fieldWrapClass}>
                <CleanField label="Insurance Company">
                  <AutoComplete
                    value={formData.previousInsuranceCompany}
                    style={controlStyle}
                    options={IRDAI_INSURANCE_COMPANIES.map((name) => ({
                      value: name,
                    }))}
                    onChange={(value) =>
                      setField("previousInsuranceCompany", String(value || ""))
                    }
                    filterOption={(inputValue, option) =>
                      String(option?.value || "")
                        .toLowerCase()
                        .includes(String(inputValue || "").toLowerCase())
                    }
                  >
                    <Input style={inputControlStyle} placeholder="e.g., Bajaj" />
                  </AutoComplete>
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Policy Type" required>
                  <Select
                    value={formData.previousPolicyType}
                    onChange={(v) => {
                      setField("previousPolicyType", v);
                      setField("previousPolicyDuration", "");
                      setField("previousOdExpiryDate", "");
                      setField("previousTpExpiryDate", "");
                    }}
                    style={controlStyle}
                    options={[
                      { label: "Comprehensive", value: "Comprehensive" },
                      { label: "Stand Alone OD", value: "Stand Alone OD" },
                      { label: "Third Party", value: "Third Party" },
                    ]}
                  />
                </CleanField>
              </div>
              {showStandaloneAgeWarning ? (
                <div className="mt-1 text-[12px] text-red-500">
                  Stand Alone OD is generally for vehicles up to 3 years old.
                  Please verify eligibility.
                </div>
              ) : null}
            </Col>

            <Col xs={24} md={16}>
              <div className={fieldWrapClass}>
                <CleanField
                  label="Policy Number"
                  extra={longPolicyNumberPreview}
                >
                  <Input
                    value={formData.previousPolicyNumber}
                    onChange={handleChange("previousPolicyNumber")}
                    style={inputControlStyle}
                    placeholder="e.g., OG-25-..."
                    title={formData.previousPolicyNumber || ""}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Policy Start Date">
                  <DatePicker
                    value={
                      formData.previousPolicyStartDate
                        ? dayjs(formData.previousPolicyStartDate)
                        : null
                    }
                    onChange={(value) =>
                      handlePreviousPolicyStartOrDuration({
                        previousPolicyStartDate: value
                          ? value.format("YYYY-MM-DD")
                          : "",
                      })
                    }
                    style={controlStyle}
                    format={["DD/MM/YYYY", "D/M/YYYY"]}
                    placeholder="Select start date"
                    popupClassName="insurance-themed-calendar"
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Policy Duration">
                  <Select
                    value={formData.previousPolicyDuration}
                    onChange={(v) =>
                      handlePreviousPolicyStartOrDuration({
                        previousPolicyDuration: v,
                      })
                    }
                    style={controlStyle}
                    options={durationSelectOptions}
                    placeholder="Duration"
                    disabled={!formData.previousPolicyType}
                  />
                </CleanField>
              </div>
            </Col>

            {formData.previousPolicyType === "Comprehensive" && (
              <>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="OD Expiry Date">
                      <Input
                        type="date"
                        value={formData.previousOdExpiryDate}
                        style={computedDateStyle}
                        readOnly
                        tabIndex={-1}
                      />
                    </CleanField>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="TP Expiry Date">
                      <Input
                        type="date"
                        value={formData.previousTpExpiryDate}
                        style={computedDateStyle}
                        readOnly
                        tabIndex={-1}
                      />
                    </CleanField>
                  </div>
                </Col>
              </>
            )}

            {formData.previousPolicyType === "Stand Alone OD" && (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="OD Expiry Date">
                    <Input
                      type="date"
                      value={formData.previousOdExpiryDate}
                      style={computedDateStyle}
                      readOnly
                      tabIndex={-1}
                    />
                  </CleanField>
                </div>
              </Col>
            )}

            {formData.previousPolicyType === "Third Party" && (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="TP Expiry Date">
                    <Input
                      type="date"
                      value={formData.previousTpExpiryDate}
                      style={computedDateStyle}
                      readOnly
                      tabIndex={-1}
                    />
                  </CleanField>
                </div>
              </Col>
            )}

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="NCB Discount (%)">
                  <Select
                    value={Number(formData.previousNcbDiscount ?? 0)}
                    onChange={(v) =>
                      setField("previousNcbDiscount", Number(v ?? 0))
                    }
                    style={controlStyle}
                    options={[
                      { label: "0%", value: 0 },
                      { label: "20%", value: 20 },
                      { label: "25%", value: 25 },
                      { label: "35%", value: 35 },
                      { label: "45%", value: 45 },
                      { label: "50%", value: 50 },
                    ]}
                  />
                </CleanField>
              </div>
              <div className="mt-1 text-[12px] text-slate-500">
                Suggested NCB:{" "}
                <span className="font-semibold text-slate-700">
                  {suggestedNcb}%
                </span>
                {Number(formData.previousNcbDiscount ?? 0) !== suggestedNcb ? (
                  <button
                    type="button"
                    className="ml-2 rounded-full border border-[#9FC0FF] bg-[#DAF3FF] px-2 py-[2px] text-[11px] font-semibold text-slate-700"
                    onClick={() => setField("previousNcbDiscount", suggestedNcb)}
                  >
                    Use suggested
                  </button>
                ) : null}
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Claim Last Year" required>
                  <Select
                    value={formData.claimTakenLastYear}
                    onChange={(v) => setField("claimTakenLastYear", v)}
                    style={controlStyle}
                    options={[
                      { label: "Yes", value: "Yes" },
                      { label: "No", value: "No" },
                    ]}
                    placeholder="Select"
                    status={
                      showErrors && step3Errors?.claimTakenLastYear
                        ? "error"
                        : ""
                    }
                  />
                </CleanField>
              </div>
              {showErrors && step3Errors?.claimTakenLastYear ? (
                <div className="mt-1 text-[12px] text-red-500">
                  {step3Errors.claimTakenLastYear}
                </div>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Hypothecation">
                  <Select
                    value={formData.previousHypothecation}
                    onChange={(v) => setField("previousHypothecation", v)}
                    style={controlStyle}
                    options={HYPOTHECATION_OPTIONS}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label || "")
                        .toLowerCase()
                        .includes(String(input || "").toLowerCase())
                    }
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24}>
              <CleanField label="Remarks">
                <Input.TextArea
                  rows={2}
                  value={formData.previousRemarks}
                  onChange={handleChange("previousRemarks")}
                  style={textAreaStyle}
                  placeholder="Notes..."
                />
              </CleanField>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[30px] bg-gradient-to-r from-[#DAF3FF] via-white to-[#FFE6C6] p-5 ring-1 ring-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.06)] md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className={sectionHeaderLabel}>Policy information</div>
            <div className="mt-1 text-[24px] font-black tracking-tight text-slate-800">
              Previous policy details
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Previous policy record shown in the same UI pattern as Step 5
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              color="default"
            >
              Policy No: {previewPolicyId}
            </Tag>
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#DAF3FF",
                borderColor: "#9FC0FF",
                color: "#1f2937",
              }}
            >
              {previewPolicyType}
            </Tag>
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#FFE6C6",
                borderColor: "#FFE6C6",
                color: "#1f2937",
              }}
            >
              {previewDuration}
            </Tag>
          </div>
        </div>
      </div>

      <Row gutter={[20, 20]} align="top">
        <Col xs={24} xl={8}>
          <div className="flex flex-col gap-4 md:sticky md:top-4">
            <div className="relative overflow-hidden rounded-[28px] bg-white ring-1 ring-[#9FC0FF] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9FC0FF]/70 text-xs font-black text-slate-800 ring-1 ring-[#9FC0FF]">
                      {companyInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-bold leading-tight text-slate-800">
                        {previewCompany}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {previewPolicyType && (
                          <span className="text-[11px] text-slate-500">
                            {previewPolicyType}
                          </span>
                        )}
                        {previewPolicyType && previewDuration && (
                          <span className="text-[10px] text-slate-300">·</span>
                        )}
                        {previewDuration && (
                          <span className="text-[11px] text-slate-500">
                            {previewDuration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-start gap-2">
                    <div className="text-right">
                      <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        IDV
                      </p>
                      <p className="m-0 text-sm font-black tabular-nums text-slate-800">
                        {formatCurrency(activeQuote.idv)}
                      </p>
                    </div>

                    {!isQuoteEditMode ? (
                      <button
                        type="button"
                        onClick={startQuoteEdit}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#9FC0FF] bg-[#DAF3FF] text-slate-700 transition hover:bg-[#e4eee7]"
                      >
                        <EditOutlined />
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveQuoteEdit}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#9FC0FF] bg-[#DAF3FF] text-slate-700 transition hover:bg-[#e4eee7]"
                        >
                          <SaveOutlined />
                        </button>
                        <button
                          type="button"
                          onClick={cancelQuoteEdit}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E7D9D2] bg-[#FFE6C6] text-slate-700 transition hover:bg-[#f4eee6]"
                        >
                          <CloseOutlined />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mx-5 border-t border-slate-100" />

              <div className="px-5 pt-5 pb-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="m-0 text-sm font-black text-slate-800">
                    Premium Breakup
                  </p>
                  {isQuoteEditMode && (
                    <span className="rounded-full bg-[#DAF3FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 ring-1 ring-[#9FC0FF]">
                      Edit mode
                    </span>
                  )}
                </div>

                {isQuoteEditMode ? (
                  <div className="space-y-4">
                    <div className={fieldWrapClass}>
                      <CleanField label="IDV Amount">
                        <InputNumber
                          min={0}
                          value={Number(quoteDraft.idv || 0)}
                          onChange={(v) =>
                            setQuoteDraft((prev) => ({
                              ...prev,
                              idv: Number(v || 0),
                            }))
                          }
                          style={controlStyle}
                          placeholder="₹ 0"
                          {...amountInputProps}
                        />
                      </CleanField>
                    </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className={fieldWrapClass}>
                        <CleanField label="Own Damage Amount">
                          <InputNumber
                            min={0}
                            value={Number(quoteDraft.ownDamage || 0)}
                            onChange={(v) =>
                              setQuoteDraft((prev) => ({
                                ...prev,
                                ownDamage: Number(v || 0),
                                basicOwnDamage: Number(v || 0),
                              }))
                            }
                            style={controlStyle}
                            placeholder="₹ 0"
                            {...amountInputProps}
                          />
                        </CleanField>
                      </div>

                      <div className={fieldWrapClass}>
                        <CleanField label="Third Party Amount">
                          <InputNumber
                            min={0}
                            value={Number(quoteDraft.thirdParty || 0)}
                            onChange={(v) =>
                              setQuoteDraft((prev) => ({
                                ...prev,
                                thirdParty: Number(v || 0),
                                basicThirdParty: Number(v || 0),
                              }))
                            }
                            style={controlStyle}
                            placeholder="₹ 0"
                            {...amountInputProps}
                          />
                        </CleanField>
                      </div>

                      <div className={fieldWrapClass}>
                        <CleanField label="Add-ons Total">
                          <InputNumber
                            min={0}
                            value={Number(quoteDraft.addOnsTotal || 0)}
                            onChange={(v) =>
                              setQuoteDraft((prev) => ({
                                ...prev,
                                addOnsTotal: Number(v || 0),
                              }))
                            }
                            style={controlStyle}
                            placeholder="₹ 0"
                            {...amountInputProps}
                          />
                        </CleanField>
                      </div>
                    </div>

                    <div className={fieldWrapClass}>
                      <CleanField
                        label="Total Premium"
                        hint="Auto-calculated: (OD + TP + Add-ons) × 1.18"
                      >
                        <InputNumber
                          min={0}
                          value={Number(computedEditModeTotalPremium || 0)}
                          style={controlStyle}
                          placeholder="₹ 0"
                          disabled
                          {...amountInputProps}
                        />
                      </CleanField>
                    </div>

                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Add-ons
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {ALL_ADDONS.map((addon) => {
                          const checked =
                            quoteDraft.selectedAddOns.includes(addon);
                          return (
                            <button
                              key={addon}
                              type="button"
                              onClick={() => toggleAddon(addon)}
                              className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition ${
                                checked
                                  ? "border-[#BFD7C7] bg-[#EEF7F1]"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox checked={checked} />
                                <span
                                  className={`text-[12px] ${
                                    checked
                                      ? "font-semibold text-slate-800"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {addon}
                                </span>
                              </div>

                              {checked ? (
                                <CheckCircleFilled className="text-[#22A06B]" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <BreakupRow
                      label="Own Damage"
                      value={formatCurrency(activeQuote.ownDamage)}
                      bold
                    />
                    <BreakupRow
                      label="Basic Own Damage"
                      value={formatCurrency(activeQuote.basicOwnDamage)}
                      indent
                      muted
                    />

                    <BreakupRow
                      label="NCB %"
                      value={`${previewNcb}%`}
                      indent
                      muted
                    />

                    <BreakupRow
                      label="Third Party"
                      value={formatCurrency(activeQuote.thirdParty)}
                      bold
                    />
                    <BreakupRow
                      label="Basic Third Party"
                      value={formatCurrency(activeQuote.basicThirdParty)}
                      indent
                      muted
                    />

                    {activeQuote.selectedAddOns.length > 0 && (
                      <>
                        <BreakupRow
                          label="Add Ons"
                          value={formatCurrency(activeQuote.addOnsTotal)}
                          bold
                        />
                        {visiblePreviewAddons.map((name) => (
                          <BreakupRow
                            key={name}
                            label={name}
                            value="included"
                            indent
                            muted
                          />
                        ))}
                        {activeQuote.selectedAddOns.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setShowAllPreviewAddons((p) => !p)}
                            className="mt-1 ml-3 flex items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-semibold text-slate-600 transition-colors hover:text-slate-700 cursor-pointer"
                          >
                            <span
                              className={`inline-block transition-transform duration-200 ${
                                showAllPreviewAddons ? "rotate-180" : ""
                              }`}
                            >
                              ▾
                            </span>
                            {showAllPreviewAddons
                              ? "Show Less"
                              : `+${activeQuote.selectedAddOns.length - 4} More Add-ons`}
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="mx-5 border-t border-dashed border-slate-200" />

              <div className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-800">
                    Total Amount
                  </span>
                  <span className="text-xl font-black tabular-nums text-slate-900">
                    {formatCurrency(activeQuote.totalPremium)}
                  </span>
                </div>
                <p className="m-0 mt-0.5 text-right text-[10px] text-slate-400">
                  Prices are inclusive of GST
                </p>
              </div>
            </div>

            <div className={`${shellStyle} p-4`}>
              <div className="mb-3 flex items-center gap-2">
                <CalendarOutlined className="text-slate-600" />
                <span className="text-sm font-bold text-slate-800">
                  Important dates
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <MiniDateCard
                  icon={<CalendarOutlined />}
                  label="Policy Start"
                  value={formatDisplayDate(formData.previousPolicyStartDate)}
                  tone="warm"
                />
                <MiniDateCard
                  icon={<SafetyCertificateOutlined />}
                  label="OD Expiry"
                  value={formatDisplayDate(formData.previousOdExpiryDate)}
                  tone="sage"
                />
                <MiniDateCard
                  icon={<BankOutlined />}
                  label="TP Expiry"
                  value={formatDisplayDate(formData.previousTpExpiryDate)}
                  tone="slate"
                />
                <MiniDateCard
                  icon={<InfoCircleOutlined />}
                  label="Claim Last Year"
                  value={formData.claimTakenLastYear || "—"}
                  tone="slate"
                />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} xl={16}>
          <div className={`${shellStyle} p-2 md:p-3`}>
            <Collapse
              ghost
              defaultActiveKey={["1"]}
              expandIconPosition="end"
              items={collapseItems}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Step3PreviousPolicy;
