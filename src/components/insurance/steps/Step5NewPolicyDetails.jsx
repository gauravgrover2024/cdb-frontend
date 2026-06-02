import React from "react";
import dayjs from "dayjs";
import {
  AutoComplete,
  Col,
  Collapse,
  DatePicker,
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
} from "@ant-design/icons";
import { lenderHypothecationOptions } from "../../../constants/lenderHypothecationOptions";
import { IRDAI_INSURANCE_COMPANIES } from "../../../constants/irdaiInsuranceCompanies";
import PremiumBreakupCard from "../PremiumBreakupCard";

const shellStyle =
  "rounded-xl border border-slate-200/75 bg-white shadow-sm";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500";

const microHintClass = "mt-1 text-[11px] text-slate-400";

const fieldWrapClass = "insurance-field-wrap";
const controlStyle = {};

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

const HYPOTHECATION_OPTIONS = [
  { label: "Not Applicable", value: "Not Applicable" },
  ...lenderHypothecationOptions.map((option) => ({
    label: option.value,
    value: option.value,
  })),
];
const NCB_OPTIONS = [0, 20, 25, 35, 45, 50].map((value) => ({
  label: `${value}%`,
  value,
}));

const INSURER_LOGO_DOMAIN_MAP = {
  "Acko General Insurance Limited": "acko.com",
  "Bajaj General Insurance Limited": "bajajallianz.com",
  "Cholamandalam MS General Insurance Company Limited": "cholainsurance.com",
  "Go Digit General Insurance Limited": "godigit.com",
  "HDFC ERGO General Insurance Company Limited": "hdfcergo.com",
  "ICICI Lombard General Insurance Company Limited": "icicilombard.com",
  "IFFCO TOKIO General Insurance Company Limited": "iffcotokio.co.in",
  "Zurich Kotak General Insurance Company (India) Limited": "kotakgeneral.com",
  "Liberty General Insurance Limited": "libertyinsurance.in",
  "Magma General Insurance Limited": "magmahdi.com",
  "Navi General Insurance Limited": "navi.com",
  "Royal Sundaram General Insurance Company Limited": "royalsundaram.in",
  "SBI General Insurance Company Limited": "sbigeneral.in",
  "Shriram General Insurance Company Limited": "shriramgi.com",
  "Tata AIG General Insurance Company Limited": "tataaig.com",
  "The New India Assurance Company Limited": "newindia.co.in",
  "The Oriental Insurance Company Limited": "orientalinsurance.org.in",
  "United India Insurance Company Limited": "uiic.co.in",
  "Universal Sompo General Insurance Company Limited": "universalsompo.com",
  "Zuno General Insurance Ltd.": "hizuno.com",
};

const getInsurerLogoCandidates = (companyName) => {
  const company = String(companyName || "").trim();
  if (!company) return [];
  const domain = INSURER_LOGO_DOMAIN_MAP[company];
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ];
};

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

const Step5NewPolicyDetails = ({
  formData,
  setField,
  handleChange,
  handleNewPolicyStartOrDuration,
  acceptedQuote,
  acceptedQuoteBreakup,
  durationOptions = [],
}) => {
  const [showAllAcceptedAddons, setShowAllAcceptedAddons] =
    React.useState(false);
  const [isPolicyStartDateManual, setIsPolicyStartDateManual] =
    React.useState(false);
  const hasManualPolicyStartDate =
    isPolicyStartDateManual &&
    Boolean(String(formData.newPolicyStartDate || "").trim());
  const isExtendedWarranty =
    String(formData.policyCategory || "").trim() === "Extended Warranty";
  const isNewCar = String(formData.vehicleType || "").trim() === "New Car";

  const acceptedQuoteId =
    acceptedQuote?._id || acceptedQuote?.id || acceptedQuote?.quoteId || "—";

  const acceptedCompany =
    acceptedQuote?.insuranceCompany || formData.newInsuranceCompany || "—";

  const acceptedPolicyType =
    acceptedQuote?.coverageType || formData.newPolicyType || "—";

  const acceptedDuration =
    acceptedQuote?.policyDuration || formData.newInsuranceDuration || "—";

  const acceptedNcb = Number(
    formData.newNcbDiscount || acceptedQuote?.ncbDiscount || 0,
  );

  const acceptedIdv = acceptedQuoteBreakup?.totalIdv
    ? Number(acceptedQuoteBreakup.totalIdv || 0)
    : Number(
        acceptedQuote?.vehicleIdv ||
          acceptedQuote?.totalIdv ||
          formData.newIdvAmount ||
          0,
      );

  const acceptedPremium = Number(
    acceptedQuoteBreakup?.totalPremium ||
      acceptedQuote?.totalPremium ||
      formData.newTotalPremium ||
      0,
  );

  const acceptedOdAmount = Number(
    acceptedQuoteBreakup?.odAmt || acceptedQuote?.odAmount || 0,
  );

  const acceptedTpAmount = Number(
    acceptedQuoteBreakup?.tpAmt || acceptedQuote?.thirdPartyAmount || 0,
  );

  const acceptedNcbAmount = Number(
    acceptedQuoteBreakup?.ncbReferenceAmount || 0,
  );

  const companyInitial = getInitial(acceptedCompany);
  const acceptedLogoCandidates = React.useMemo(
    () => getInsurerLogoCandidates(acceptedCompany),
    [acceptedCompany],
  );
  const [acceptedLogoIdx, setAcceptedLogoIdx] = React.useState(0);
  React.useEffect(() => setAcceptedLogoIdx(0), [acceptedCompany]);
  const acceptedLogoUrl = acceptedLogoCandidates[acceptedLogoIdx] || "";

  const includedAddons = Object.entries(acceptedQuote?.addOnsIncluded || {})
    .filter(([, v]) => Boolean(v))
    .map(([k]) => ({
      name: k,
      amt: Number(acceptedQuote?.addOns?.[k] || 0),
    }));

  const acceptedAddOnsTotal =
    acceptedQuoteBreakup?.addOnsTotal !== undefined
      ? Number(acceptedQuoteBreakup?.addOnsTotal || 0)
      : includedAddons.reduce((sum, item) => sum + Number(item.amt || 0), 0);

  const durationSelectOptions =
    formData.newPolicyType === "Comprehensive"
      ? isNewCar
        ? [
            { label: "1yr OD + 3yr TP", value: "1yr OD + 3yr TP" },
            { label: "2yr OD + 3yr TP", value: "2yr OD + 3yr TP" },
            { label: "3yr OD + 3yr TP", value: "3yr OD + 3yr TP" },
          ]
        : [{ label: "1yr OD + 1yr TP", value: "1yr OD + 1yr TP" }]
      : formData.newPolicyType === "Stand Alone OD"
        ? [
            { label: "1 Year", value: "1 Year" },
            { label: "2 Years", value: "2 Years" },
            { label: "3 Years", value: "3 Years" },
          ]
        : formData.newPolicyType === "Third Party"
          ? [
              { label: "1 Year", value: "1 Year" },
              { label: "2 Years", value: "2 Years" },
              { label: "3 Years", value: "3 Years" },
            ]
          : durationOptions.map((d) => ({
              label: d,
              value: d,
            }));

  const ewDurationOptions = [
    { label: "1 Year", value: "1 Year" },
    { label: "2 Years", value: "2 Years" },
    { label: "3 Years", value: "3 Years" },
  ];

  const ewYears = React.useMemo(() => {
    const val = String(formData.newInsuranceDuration || "").trim();
    if (val === "1 Year") return 1;
    if (val === "2 Years") return 2;
    if (val === "3 Years") return 3;
    return 0;
  }, [formData.newInsuranceDuration]);

  const ewComputedEndDate = React.useMemo(() => {
    const start = String(formData.ewCommencementDate || "").trim();
    if (!start || !ewYears) return "";
    return computeMinusOneDayExpiry(start, ewYears);
  }, [ewYears, formData.ewCommencementDate]);

  const derivedYears = React.useMemo(
    () =>
      getDurationYears(formData.newPolicyType, formData.newInsuranceDuration),
    [formData.newPolicyType, formData.newInsuranceDuration],
  );

  const computedOdExpiry = React.useMemo(() => {
    if (!formData.newPolicyStartDate || !derivedYears.odYears) return "";
    return computeMinusOneDayExpiry(
      formData.newPolicyStartDate,
      derivedYears.odYears,
    );
  }, [formData.newPolicyStartDate, derivedYears.odYears]);

  const computedTpExpiry = React.useMemo(() => {
    if (!formData.newPolicyStartDate || !derivedYears.tpYears) return "";
    return computeMinusOneDayExpiry(
      formData.newPolicyStartDate,
      derivedYears.tpYears,
    );
  }, [formData.newPolicyStartDate, derivedYears.tpYears]);

  React.useEffect(() => {
    if (isExtendedWarranty) return;
    const shouldAutoCompute = hasManualPolicyStartDate;
    if (!shouldAutoCompute) {
      if (formData.newOdExpiryDate !== "") setField("newOdExpiryDate", "");
      if (formData.newTpExpiryDate !== "") setField("newTpExpiryDate", "");
      return;
    }
    const policyType = formData.newPolicyType;

    if (policyType === "Comprehensive") {
      if (formData.newOdExpiryDate !== computedOdExpiry) {
        setField("newOdExpiryDate", computedOdExpiry);
      }
      if (formData.newTpExpiryDate !== computedTpExpiry) {
        setField("newTpExpiryDate", computedTpExpiry);
      }
      return;
    }

    if (policyType === "Stand Alone OD") {
      if (formData.newOdExpiryDate !== computedOdExpiry) {
        setField("newOdExpiryDate", computedOdExpiry);
      }
      if (formData.newTpExpiryDate !== "") {
        setField("newTpExpiryDate", "");
      }
      return;
    }

    if (policyType === "Third Party") {
      if (formData.newTpExpiryDate !== computedTpExpiry) {
        setField("newTpExpiryDate", computedTpExpiry);
      }
      if (formData.newOdExpiryDate !== "") {
        setField("newOdExpiryDate", "");
      }
      return;
    }

    if (formData.newOdExpiryDate !== "") {
      setField("newOdExpiryDate", "");
    }
    if (formData.newTpExpiryDate !== "") {
      setField("newTpExpiryDate", "");
    }
  }, [
    computedOdExpiry,
    computedTpExpiry,
    formData.newOdExpiryDate,
    formData.newPolicyType,
    formData.newPolicyStartDate,
    formData.newTpExpiryDate,
    hasManualPolicyStartDate,
    isExtendedWarranty,
    setField,
  ]);

  React.useEffect(() => {
    if (isExtendedWarranty) return;
    const vehicleIdv = Number(formData.newVehicleIdv || 0);
    const cngIdv = Number(formData.newCngIdv || 0);
    const accessoriesIdv = Number(formData.newAccessoriesIdv || 0);
    const partsTotal = vehicleIdv + cngIdv + accessoriesIdv;
    const currentTotal = Number(formData.newIdvAmount || 0);
    if (partsTotal === 0 && currentTotal > 0) {
      setField("newVehicleIdv", currentTotal);
      return;
    }
    if (partsTotal > 0 && partsTotal !== currentTotal) {
      setField("newIdvAmount", partsTotal);
    }
  }, [
    formData.newAccessoriesIdv,
    formData.newCngIdv,
    formData.newIdvAmount,
    formData.newVehicleIdv,
    isExtendedWarranty,
    setField,
  ]);

  React.useEffect(() => {
    if (!isExtendedWarranty) return;
    const currentDuration = String(formData.newInsuranceDuration || "").trim();
    if (!["1 Year", "2 Years", "3 Years"].includes(currentDuration)) {
      setField("newInsuranceDuration", "1 Year");
    }
  }, [formData.newInsuranceDuration, isExtendedWarranty, setField]);

  React.useEffect(() => {
    if (!isExtendedWarranty) return;
    if (formData.ewExpiryDate !== ewComputedEndDate) {
      setField("ewExpiryDate", ewComputedEndDate);
    }
    if (formData.newOdExpiryDate !== ewComputedEndDate) {
      setField("newOdExpiryDate", ewComputedEndDate);
    }
    if (formData.newTpExpiryDate !== "") {
      setField("newTpExpiryDate", "");
    }
  }, [
    ewComputedEndDate,
    formData.ewExpiryDate,
    formData.newOdExpiryDate,
    formData.newTpExpiryDate,
    isExtendedWarranty,
    setField,
  ]);

  React.useEffect(() => {
    if (isExtendedWarranty) return;
    if (!String(formData.newPolicyStartDate || "").trim()) {
      setIsPolicyStartDateManual(false);
    }
  }, [formData.newPolicyStartDate, isExtendedWarranty]);

  const amountInputProps = {
    formatter: formatAmountInput,
    parser: parseAmountInput,
  };

  if (isExtendedWarranty) {
    const ewTotalPremium = Number(formData.newTotalPremium || 0);
    const ewTaxableAmount = Math.round(ewTotalPremium / 1.18);
    const ewGstAmount = ewTotalPremium - ewTaxableAmount;

    return (
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200/65 bg-gradient-to-r from-sky-50/90 via-white to-amber-50/50 p-5 shadow-sm md:p-6">
            <div className={sectionHeaderLabel}>Policy information</div>
            <div className="mt-1 text-[24px] font-black tracking-tight text-slate-800">
              Extended warranty details
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Capture vehicle price context, tenure, coverage, premium and remarks
            </div>
          </div>

          <div className={`${shellStyle} p-5 md:p-6`}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Ex-Showroom Price" required>
                    <InputNumber
                      min={0}
                      value={Number(formData.exShowroomPrice || 0)}
                      onChange={(v) =>
                        setField("exShowroomPrice", Number(v || 0))
                      }
                      placeholder="₹ 0"
                      {...amountInputProps}
                    />
                  </CleanField>
                </div>
              </Col>

              {isNewCar ? (
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Date of Sale of Vehicle" required>
                      <Input
                        size="large"
                        allowClear
                        type="date"
                        value={formData.dateOfSale}
                        onChange={handleChange("dateOfSale")}
                      />
                    </CleanField>
                  </div>
                </Col>
              ) : (
                <>
                  <Col xs={24} md={8}>
                    <div className={fieldWrapClass}>
                      <CleanField label="Date of Purchase" required>
                        <Input
                          size="large"
                          allowClear
                          type="date"
                          value={formData.dateOfPurchase}
                          onChange={handleChange("dateOfPurchase")}
                        />
                      </CleanField>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className={fieldWrapClass}>
                      <CleanField label="Current Odometer Reading" required>
                        <InputNumber
                          min={0}
                          value={Number(formData.odometerReading || 0)}
                          onChange={(v) =>
                            setField("odometerReading", Number(v || 0))
                          }
                          placeholder="Kms"
                        />
                      </CleanField>
                    </div>
                  </Col>
                </>
              )}

              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Policy Purchase Date" required>
                    <Input
                      size="large"
                      allowClear
                      type="date"
                      value={formData.policyPurchaseDate}
                      onChange={handleChange("policyPurchaseDate")}
                    />
                  </CleanField>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Policy Duration" required>
                    <Select
                      size="large"
                      allowClear
                      value={formData.newInsuranceDuration}
                      onChange={(v) => setField("newInsuranceDuration", v)}
                      options={ewDurationOptions}
                    />
                  </CleanField>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Policy Start Date" required>
                    <Input
                      size="large"
                      allowClear
                      type="date"
                      value={formData.ewCommencementDate}
                      onChange={(e) => {
                        const value = e.target.value;
                        setField("ewCommencementDate", value);
                        setField("newPolicyStartDate", value);
                      }}
                    />
                  </CleanField>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Policy End Date" required>
                    <Input
                      size="large"
                      allowClear
                      type="date"
                      value={formData.ewExpiryDate}
                      style={{ pointerEvents: "none", cursor: "default" }}
                      readOnly
                      tabIndex={-1}
                    />
                  </CleanField>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Kms Coverage" required>
                    <Input
                      size="large"
                      allowClear
                      value={String(formData.kmsCoverage ?? "")}
                      onChange={(e) => setField("kmsCoverage", e.target.value)}
                      placeholder="e.g. 100000 or Unlimited"
                    />
                  </CleanField>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Premium" required>
                    <InputNumber
                      min={0}
                      value={Number(formData.newTotalPremium || 0)}
                      onChange={(v) =>
                        setField("newTotalPremium", Number(v || 0))
                      }
                      placeholder="₹ 0"
                      {...amountInputProps}
                    />
                  </CleanField>
                </div>
              </Col>

              <Col xs={24}>
                <CleanField label="Remarks">
                  <Input.TextArea
                    allowClear
                    rows={2}
                    value={formData.newRemarks}
                    onChange={handleChange("newRemarks")}
                    placeholder="Notes..."
                  />
                </CleanField>
              </Col>
            </Row>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="sticky top-5 flex flex-col gap-3 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 px-4 pb-4 pt-4 shadow-md shadow-indigo-900/5 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                Live Premium Estimate
              </p>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-300/70"
                title="Recalculates on every field change"
              >
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
                  aria-hidden
                />
                Live
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-indigo-50/40 via-slate-50/90 to-white px-3.5 py-3.5 sm:px-4">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Total payable (incl. GST)
              </p>
              <p className="m-0 mt-1 text-3xl font-black tabular-nums tracking-tight text-slate-900">
                {formatCurrency(ewTotalPremium)}
              </p>
              <div className="mt-3 space-y-1.5 border-t border-slate-200/80 pt-3">
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-slate-500">Taxable premium</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {formatCurrency(ewTaxableAmount)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-slate-500">GST (18% of taxable)</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {formatCurrency(ewGstAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const longPolicyNumberPreview =
    formData.newPolicyNumber && formData.newPolicyNumber.length > 26 ? (
      <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600 ring-1 ring-slate-200 break-all">
        {formData.newPolicyNumber}
      </div>
    ) : null;

  const collapseItems = [
    {
      key: "1",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFE6C6] text-slate-700 ring-1 ring-[#FFE6C6]">
            <SafetyCertificateOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              Policy details
            </div>
            <div className="text-xs text-slate-500">
              Company, type, number, dates, duration, NCB, IDV and premium
            </div>
          </div>
        </div>
      ),
      children: (
        <div className="pt-3">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16} lg={16}>
              <div className={fieldWrapClass}>
                <CleanField label="Insurance Company" required>
                  <AutoComplete
                    style={{ width: "100%" }}
                    className="w-full"
                    value={formData.newInsuranceCompany}
                    allowClear
                    options={IRDAI_INSURANCE_COMPANIES.map((name) => ({
                      value: name,
                    }))}
                    onChange={(value) =>
                      setField("newInsuranceCompany", String(value || ""))
                    }
                    filterOption={(inputValue, option) =>
                      String(option?.value || "")
                        .toLowerCase()
                        .includes(String(inputValue || "").toLowerCase())
                    }
                  >
                    <Input
                      size="large"
                      style={controlStyle}
                      placeholder="e.g. HDFC ERGO General Insurance Company Limited"
                    />
                  </AutoComplete>
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8} lg={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Policy Type" required>
                  <Select
                    size="large"
                    allowClear
                    value={formData.newPolicyType}
                    onChange={(v) => {
                      setField("newPolicyType", v);
                      setField("newInsuranceDuration", "");
                      setField("newOdExpiryDate", "");
                      setField("newTpExpiryDate", "");
                      setIsPolicyStartDateManual(false);
                    }}
                    options={[
                      { label: "Comprehensive", value: "Comprehensive" },
                      { label: "Stand Alone OD", value: "Stand Alone OD" },
                      { label: "Third Party", value: "Third Party" },
                    ]}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={16}>
              <div className={fieldWrapClass}>
                <CleanField
                  label="Policy Number"
                  extra={longPolicyNumberPreview}
                >
                  <Input
                    size="large"
                    allowClear
                    value={formData.newPolicyNumber}
                    onChange={handleChange("newPolicyNumber")}
                    title={formData.newPolicyNumber || ""}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Issue Date" required>
                  <DatePicker
                    allowClear
                    value={
                      formData.newIssueDate
                        ? dayjs(formData.newIssueDate)
                        : null
                    }
                    onChange={(d) =>
                      setField("newIssueDate", d ? d.format("YYYY-MM-DD") : "")
                    }
                    format={["DD/MM/YYYY", "D/M/YYYY"]}
                    popupClassName="insurance-themed-calendar"
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Policy Start Date" required>
                  <DatePicker
                    allowClear
                    value={
                      formData.newPolicyStartDate
                        ? dayjs(formData.newPolicyStartDate)
                        : null
                    }
                    onChange={(d) => {
                      const next = d ? d.format("YYYY-MM-DD") : "";
                      setIsPolicyStartDateManual(Boolean(next));
                      if (!next) {
                        setField("newOdExpiryDate", "");
                        setField("newTpExpiryDate", "");
                      }
                      handleNewPolicyStartOrDuration({
                        newPolicyStartDate: next,
                      });
                    }}
                    format={["DD/MM/YYYY", "D/M/YYYY"]}
                    popupClassName="insurance-themed-calendar"
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Insurance Duration" required>
                  <Select
                    size="large"
                    allowClear
                    value={formData.newInsuranceDuration}
                    onChange={(v) =>
                      handleNewPolicyStartOrDuration({
                        newInsuranceDuration: v,
                      })
                    }
                    options={durationSelectOptions}
                    placeholder="Duration"
                    disabled={!formData.newPolicyType}
                  />
                </CleanField>
              </div>
            </Col>

            {formData.newPolicyType !== "Third Party" && (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="OD Expiry Date">
                    <Input
                      size="large"
                      allowClear
                      type="text"
                      value={
                        hasManualPolicyStartDate
                          ? formatDisplayDate(formData.newOdExpiryDate)
                          : ""
                      }
                      placeholder="Select policy start date"
                      style={{ pointerEvents: "none", cursor: "default" }}
                      readOnly
                      tabIndex={-1}
                    />
                  </CleanField>
                </div>
              </Col>
            )}

            {formData.newPolicyType !== "Stand Alone OD" && (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="TP Expiry Date">
                    <Input
                      size="large"
                      allowClear
                      type="text"
                      value={
                        hasManualPolicyStartDate
                          ? formatDisplayDate(formData.newTpExpiryDate)
                          : ""
                      }
                      placeholder="Select policy start date"
                      style={{ pointerEvents: "none", cursor: "default" }}
                      readOnly
                      tabIndex={-1}
                    />
                  </CleanField>
                </div>
              </Col>
            )}

            {formData.newPolicyType !== "Third Party" && (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="NCB Discount (%)">
                    <Select
                      size="large"
                      allowClear
                      value={Number(formData.newNcbDiscount || 0)}
                      onChange={(v) => setField("newNcbDiscount", Number(v || 0))}
                      options={NCB_OPTIONS}
                    />
                  </CleanField>
                </div>
              </Col>
            )}

            {formData.newPolicyType !== "Third Party" && (
              <>
                <Col xs={24}>
                  <div className={labelClass}>IDV Amount (₹)</div>
                </Col>

                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Vehicle IDV (₹)" required>
                      <InputNumber
                        min={0}
                        value={Number(formData.newVehicleIdv || 0)}
                        onChange={(v) => {
                          const nextVehicleIdv = Number(v || 0);
                          const nextTotal =
                            nextVehicleIdv +
                            Number(formData.newCngIdv || 0) +
                            Number(formData.newAccessoriesIdv || 0);
                          setField("newVehicleIdv", nextVehicleIdv);
                          setField("newIdvAmount", nextTotal);
                        }}
                        placeholder="₹ 0"
                        {...amountInputProps}
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="CNG IDV (₹)">
                      <InputNumber
                        min={0}
                        value={Number(formData.newCngIdv || 0)}
                        onChange={(v) => {
                          const nextCngIdv = Number(v || 0);
                          const nextTotal =
                            Number(formData.newVehicleIdv || 0) +
                            nextCngIdv +
                            Number(formData.newAccessoriesIdv || 0);
                          setField("newCngIdv", nextCngIdv);
                          setField("newIdvAmount", nextTotal);
                        }}
                        placeholder="₹ 0"
                        {...amountInputProps}
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Accessories IDV (₹)">
                      <InputNumber
                        min={0}
                        value={Number(formData.newAccessoriesIdv || 0)}
                        onChange={(v) => {
                          const nextAccessoriesIdv = Number(v || 0);
                          const nextTotal =
                            Number(formData.newVehicleIdv || 0) +
                            Number(formData.newCngIdv || 0) +
                            nextAccessoriesIdv;
                          setField("newAccessoriesIdv", nextAccessoriesIdv);
                          setField("newIdvAmount", nextTotal);
                        }}
                        placeholder="₹ 0"
                        {...amountInputProps}
                      />
                    </CleanField>
                  </div>
                </Col>
              </>
            )}

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Total Premium (₹)" required>
                  <InputNumber
                    min={0}
                    value={Number(formData.newTotalPremium || 0)}
                    onChange={(v) =>
                      setField("newTotalPremium", Number(v || 0))
                    }
                    placeholder="₹ 0"
                    {...amountInputProps}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Hypothecation">
                  <Select
                    size="large"
                    allowClear
                    value={formData.newHypothecation}
                    onChange={(v) => setField("newHypothecation", v)}
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

            <Col xs={24} md={16}>
              <CleanField label="Remarks">
                <Input.TextArea
                  allowClear
                  rows={2}
                  value={formData.newRemarks}
                  onChange={handleChange("newRemarks")}
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
      <div className="rounded-xl border border-slate-200/65 bg-gradient-to-r from-sky-50/90 via-white to-amber-50/50 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className={sectionHeaderLabel}>Policy information</div>
            <div className="mt-1 text-[24px] font-black tracking-tight text-slate-800">
              New policy details
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Accepted quote converted into an editable policy record
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              color="default"
            >
              Quote ID: {acceptedQuoteId}
            </Tag>
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#DAF3FF",
                borderColor: "#9FC0FF",
                color: "#1f2937",
              }}
            >
              {acceptedPolicyType}
            </Tag>
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#FFE6C6",
                borderColor: "#FFE6C6",
                color: "#1f2937",
              }}
            >
              {acceptedDuration}
            </Tag>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={8}>
          <div className="flex flex-col gap-4 xl:sticky xl:top-24">
            <div className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9FC0FF]/70 text-xs font-black text-slate-800 ring-1 ring-[#9FC0FF]">
                      {acceptedLogoUrl ? (
                        <img
                          src={acceptedLogoUrl}
                          alt={acceptedCompany || "Insurer"}
                          className="h-8 w-8 rounded-md object-contain bg-white"
                          onError={() => {
                            setAcceptedLogoIdx((prev) =>
                              prev + 1 < acceptedLogoCandidates.length
                                ? prev + 1
                                : acceptedLogoCandidates.length,
                            );
                          }}
                        />
                      ) : (
                        companyInitial
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-bold leading-tight text-slate-800">
                        {acceptedCompany}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {acceptedPolicyType && (
                          <span className="text-[11px] text-slate-500">
                            {acceptedPolicyType}
                          </span>
                        )}
                        {acceptedPolicyType && acceptedDuration && (
                          <span className="text-[10px] text-slate-300">·</span>
                        )}
                        {acceptedDuration && (
                          <span className="text-[11px] text-slate-500">
                            {acceptedDuration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {formData.newPolicyType !== "Third Party" && (
                    <div className="shrink-0 text-right">
                      <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        IDV
                      </p>
                      <p className="m-0 text-sm font-black tabular-nums text-slate-800">
                        {acceptedIdv > 0 ? formatCurrency(acceptedIdv) : "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mx-5 border-t border-slate-100" />

              <PremiumBreakupCard
                breakup={{
                  ownDamage: acceptedOdAmount,
                  basicOwnDamage: acceptedOdAmount,
                  ncbPercent: acceptedNcb,
                  ncbAmount: acceptedNcbAmount,
                  thirdParty: acceptedTpAmount,
                  basicThirdParty: acceptedTpAmount,
                  addOnsTotal: acceptedAddOnsTotal,
                  coverageType: formData.newPolicyType,
                }}
                formatCurrency={formatCurrency}
                includedAddons={includedAddons}
                showAllAddons={showAllAcceptedAddons}
                onToggleAddons={() => setShowAllAcceptedAddons((p) => !p)}
                totalAmount={acceptedPremium}
                coverageType={formData.newPolicyType}
              />
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
                  label="Issue Date"
                  value={formatDisplayDate(formData.newIssueDate)}
                  tone="warm"
                />
                <MiniDateCard
                  icon={<SafetyCertificateOutlined />}
                  label="Policy Start"
                  value={formatDisplayDate(formData.newPolicyStartDate)}
                  tone="sage"
                />
                {formData.newPolicyType !== "Third Party" && (
                  <MiniDateCard
                    icon={<InfoCircleOutlined />}
                    label="OD Expiry"
                    value={
                      hasManualPolicyStartDate
                        ? formatDisplayDate(formData.newOdExpiryDate)
                        : "—"
                    }
                    tone="slate"
                  />
                )}
                {formData.newPolicyType !== "Stand Alone OD" && (
                  <MiniDateCard
                    icon={<BankOutlined />}
                    label="TP Expiry"
                    value={
                      hasManualPolicyStartDate
                        ? formatDisplayDate(formData.newTpExpiryDate)
                        : "—"
                    }
                    tone="slate"
                  />
                )}
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

export default Step5NewPolicyDetails;
