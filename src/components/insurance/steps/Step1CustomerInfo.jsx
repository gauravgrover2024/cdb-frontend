import React from "react";
import {
  Alert,
  AutoComplete,
  Col,
  Collapse,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Tag,
  Typography,
} from "antd";
import { UserOutlined, TeamOutlined, IdcardOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import useChannelPartnerAutoSuggest from "../../../hooks/useChannelPartnerAutoSuggest";
import useChannelsMasterSearch from "../../../hooks/useChannelsMasterSearch";
import useShowroomAutoSuggest from "../../../hooks/useShowroomAutoSuggest";

const { Text } = Typography;

const shellStyle =
  "rounded-xl border border-slate-200/75 bg-white shadow-sm";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500";

const fieldWrapClass = "insurance-field-wrap";

const controlStyle = { width: "100%" };
const inputControlStyle = { width: "100%" };
const textAreaStyle = { minHeight: 86 };

const CleanField = ({ label, required, children, extra }) => {
  const normalizedChild = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: ["w-full", children.props.className].filter(Boolean).join(" "),
        style: {
          width: "100%",
          ...(children.props.style || {}),
        },
      })
    : children;

  return (
    <div className="pb-1 space-y-2" data-ins-field="true">
    <div className={labelClass}>
      {label} {required ? <span className="text-[#FF8EAD]">*</span> : null}
    </div>
    {normalizedChild}
    {extra ? <div className="mt-1">{extra}</div> : null}
  </div>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2">
    <span className="text-[12px] text-slate-500">{label}</span>
    <span className="text-right text-[12px] font-semibold text-slate-800">
      {value || "—"}
    </span>
  </div>
);

const getInitial = (name) => (name || "?").toString().slice(0, 2).toUpperCase();

const POLICY_DONE_BY_OPTIONS = [
  "Autocredits India LLP",
  "Broker",
  "Showroom",
  "Customer",
];

const NOMINEE_RELATIONSHIP_OPTIONS = [
  "Son",
  "Daughter",
  "Spouse",
  "Father",
  "Mother",
].map((value) => ({ value }));

const getPolicyTypePillLabel = (value) => {
  if (String(value || "").trim() === "Extended Warranty") return "EW Policy";
  return "Insurance";
};

const digits10 = (v) =>
  String(v ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

const normalizeForMatch = (v) => String(v || "").trim().toLowerCase();

// The backend search endpoint matches across name/mobile/PAN/city/etc., so
// name-only fields (Customer Name, Company Name) re-filter to rows whose own
// name actually contains what was typed, instead of showing every match.
const buildNameOnlyOptions = (results, query, getCustomerId, nameField) => {
  const q = normalizeForMatch(query);
  const pool = q
    ? results.filter((c) =>
        normalizeForMatch(c?.[nameField] || c?.name || c?.fullName).includes(q),
      )
    : results;
  return pool
    .slice(0, 12)
    .map((c) => buildCustomerOption(c, getCustomerId))
    .filter(Boolean);
};

const buildCustomerOption = (c, getCustomerId) => {
  const id = getCustomerId(c);
  if (!id) return null;

  const name =
    c?.customerName ||
    c?.companyName ||
    c?.name ||
    c?.fullName ||
    "Unnamed Customer";
  const mobileRaw =
    c?.primaryMobile ?? c?.mobile ?? c?.phone ?? c?.contactNumber ?? "";
  const mobile =
    digits10(mobileRaw) || String(mobileRaw || "").trim() || "No mobile";
  const pan = c?.panNumber || c?.pan || "";
  const city = c?.city || "";
  const initial = name.slice(0, 2).toUpperCase();

  return {
    value: id,
    label: (
      <div className="flex items-start gap-3 rounded-[14px] border border-slate-100 bg-white px-3 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DAF3FF] text-xs font-bold text-slate-700 ring-1 ring-[#9FC0FF]">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-slate-800">
            {name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <span>{mobile}</span>
            {pan ? <span>• {pan}</span> : null}
            {city ? <span>• {city}</span> : null}
          </div>
        </div>
      </div>
    ),
  };
};

const resolveSelectedCustomer = (selectedValue, customerSearchResults, getCustomerId) => {
  const id = String(selectedValue ?? "").trim();
  if (!id) return null;
  return (
    customerSearchResults.find((c) => String(getCustomerId(c)) === id) ||
    customerSearchResults.find(
      (c) =>
        String(c?._id ?? c?.id ?? c?.customerId ?? "") === id,
    ) ||
    null
  );
};

const Step1CustomerInfo = ({
  formData,
  setField,
  handleChange,
  modifiedCrmFields = [],
  onPolicyDoneByChange,
  onSourceChange,
  isExtendedWarranty = false,
  showErrors,
  step1Errors,
  isCompany,
  employeeOptions,
  employeesLoading,
  employeesList,
  cityLookupLoading,
  customerSearchResults,
  customerSearchLoading,
  searchCustomers,
  applyCustomerToForm,
  applyReferenceFromCustomer,
  getCustomerId,
}) => {
  const {
    options: partnerOptions,
    search: searchPartners,
    getByName: getPartnerByName,
  } = useChannelPartnerAutoSuggest();

  const {
    options: brokerOptions,
    search: searchBrokers,
    getByName: getBrokerByName,
  } = useChannelPartnerAutoSuggest({ type: "Broker" });

  const {
    options: showroomOptions,
    search: searchShowrooms,
    getByName: getShowroomByName,
  } = useShowroomAutoSuggest();

  const {
    options: channelMasterOptions,
    search: searchChannelMaster,
    loading: channelMasterLoading,
    notFoundContent: channelMasterNotFound,
  } = useChannelsMasterSearch();

  const sourceMode = String(formData.source || formData.sourceOrigin || "Direct");

  const applyChannelDealerNo = (value) => {
    setField("channelDealerNo", String(value || "").trim());
  };

  const applyDealerContactDetails = (channel) => {
    if (!channel) return;
    if (channel.address) setField("dealerChannelAddress", channel.address);

    const mobileVal = String(channel.mobile || channel.contactNumber || "");
    if (mobileVal) {
      let digits = mobileVal.replace(/\D/g, "");
      if (digits.length >= 10) digits = digits.slice(-10);
      setField("dealerMobile", digits);
    }
  };

  const applyChannelFromMaster = (channel) => {
    if (!channel) return;
    const channelId = String(channel.channelId || "").trim();
    const channelName = String(channel.name || "").trim();
    const channelType = String(channel.type || "").trim().toLowerCase();

    applyChannelDealerNo(channelId);

    if (channelType.includes("broker")) {
      setField("brokerName", channelName);
      applyDealerContactDetails(channel);
      if (onPolicyDoneByChange) onPolicyDoneByChange("Broker");
      else setField("policyDoneBy", "Broker");
      return;
    }

    if (channelType.includes("dealer") || sourceMode === "Indirect") {
      setField("dealerChannelName", channelName);
      applyDealerContactDetails(channel);

      if (channel.commissionRate != null && channel.commissionRate !== "") {
        setField("payoutApplicable", "Yes");
        setField("payoutPercent", String(channel.commissionRate));
      }
      if (onSourceChange) onSourceChange("Indirect");
      else {
        setField("source", "Indirect");
        setField("sourceOrigin", "Indirect");
      }
    }
  };

  const syncChannelDealerNoFromSelection = () => {
    const doneBy = String(formData.policyDoneBy || "").trim().toLowerCase();
    if (doneBy === "broker") {
      const broker = getBrokerByName(formData.brokerName);
      if (broker?.channelId) applyChannelDealerNo(broker.channelId);
      applyDealerContactDetails(broker);
      return;
    }
    if (doneBy === "showroom") {
      const showroom = getShowroomByName(formData.showroomName);
      if (showroom?.showroomId) applyChannelDealerNo(showroom.showroomId);
      applyDealerContactDetails(showroom);
      return;
    }
    if (sourceMode === "Indirect") {
      const partner = getPartnerByName(formData.dealerChannelName);
      if (partner?.channelId) applyChannelDealerNo(partner.channelId);
      applyDealerContactDetails(partner);
    }
  };

  React.useEffect(() => {
    syncChannelDealerNoFromSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.policyDoneBy,
    formData.brokerName,
    formData.showroomName,
    formData.dealerChannelName,
    sourceMode,
  ]);

  const [customerDataLoaded, setCustomerDataLoaded] = React.useState(false);
  const [pendingChange, setPendingChange] = React.useState(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Auto-collapse Basic Setup when data is already filled
  const [basicSetupCollapsed, setBasicSetupCollapsed] = React.useState(
    () => Boolean(formData.employeeName),
  );

  const guardedSetField = React.useCallback(
    (key, value) => {
      if (customerDataLoaded) {
        setPendingChange(() => () => setField(key, value));
        setConfirmOpen(true);
      } else {
        setField(key, value);
      }
    },
    [customerDataLoaded, setField],
  );

  const guardedHandleChange = React.useCallback(
    (key) => (e) => guardedSetField(key, e?.target?.value ?? ""),
    [guardedSetField],
  );

  const handleConfirmYes = React.useCallback(() => {
    if (pendingChange) pendingChange();
    setCustomerDataLoaded(false);
    setPendingChange(null);
    setConfirmOpen(false);
  }, [pendingChange]);

  const handleConfirmNo = React.useCallback(() => {
    setPendingChange(null);
    setConfirmOpen(false);
  }, []);


  const primaryName = isCompany
    ? formData.companyName || "Company details"
    : formData.customerName || "Customer details";

  const secondaryName = isCompany
    ? formData.contactPersonName || "Contact person pending"
    : formData.mobile || "Mobile pending";

  const customerInitial = getInitial(primaryName);

  const customerOptions = customerSearchResults
    .slice(0, 12)
    .map((c) => buildCustomerOption(c, getCustomerId))
    .filter(Boolean);
  const customerNameOptions = buildNameOnlyOptions(
    customerSearchResults,
    formData.customerName,
    getCustomerId,
    "customerName",
  );
  const companyNameOptions = buildNameOnlyOptions(
    customerSearchResults,
    formData.companyName,
    getCustomerId,
    "companyName",
  );
  const policyDoneBy = String(formData.policyDoneBy || "Autocredits India LLP");
  const nomineeDobLabel = (() => {
    if (!formData.nomineeDob) return "DOB";
    const parsed = dayjs(formData.nomineeDob);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "DOB";
  })();

  const collapseItems = [
    {
      key: "1",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DAF3FF] text-slate-700 ring-1 ring-[#9FC0FF]">
            <TeamOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Basic setup</div>
          </div>
        </div>
      ),
      children: (
        <div className="space-y-5 pt-2 pb-1">

          {/* ── Type toggles strip ── */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Type Configuration
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

              {/* Buyer Type */}
              <div>
                <p className={labelClass}>
                  Buyer Type <span className="text-[#FF8EAD]">*</span>
                </p>
                <div className="mt-2 flex gap-2">
                  {["Individual", "Company"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setField("buyerType", val)}
                      className={`flex-1 rounded-xl border py-2 text-[12px] font-bold transition-all ${
                        formData.buyerType === val
                          ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Type */}
              <div>
                <p className={labelClass}>
                  Vehicle Type <span className="text-[#FF8EAD]">*</span>
                </p>
                <div className="mt-2 flex gap-2">
                  {["New Car", "Used Car"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setField("vehicleType", val)}
                      className={`flex-1 rounded-xl border py-2 text-[12px] font-bold transition-all ${
                        formData.vehicleType === val
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Policy Type */}
              <div>
                <p className={labelClass}>
                  Policy Type <span className="text-[#FF8EAD]">*</span>
                </p>
                <div className="mt-2 flex gap-2">
                  {[
                    { label: "Insurance", value: "Insurance Policy" },
                    { label: "EW Policy", value: "Extended Warranty" },
                  ].map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setField("policyCategory", value)}
                      className={`flex-1 rounded-xl border py-2 text-[12px] font-bold transition-all ${
                        (formData.policyCategory || "Insurance Policy") === value
                          ? "border-violet-300 bg-violet-50 text-violet-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Used Car Flow — shown inline in type strip when relevant */}
            {formData.vehicleType === "Used Car" && !isExtendedWarranty ? (
              <div className="mt-4 border-t border-slate-200/70 pt-4">
                <p className={labelClass}>
                  Used Car Flow Type <span className="text-[#FF8EAD]">*</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Renewal", "Policy Already Expired", "Sale/Purchase"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setField("usedCarFlowType", val)}
                      className={`rounded-xl border px-4 py-2 text-[12px] font-bold transition-all ${
                        (formData.usedCarFlowType || "Renewal") === val
                          ? "border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                {showErrors && step1Errors.usedCarFlowType ? (
                  <p className="mt-1 text-[11px] text-red-500">{step1Errors.usedCarFlowType}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* ── Staff & Policy assignment ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <div className={fieldWrapClass}>
              <CleanField label="Employee (Staff)" required>
                <AutoComplete
                  size="large"
                  value={formData.employeeName}
                  onSearch={(val) => {
                    setField("employeeName", val);
                    setField("employeeUserId", "");
                  }}
                  onChange={(val) => {
                    setField("employeeName", val);
                    setField("employeeUserId", "");
                  }}
                  options={employeeOptions}
                  loading={employeesLoading}
                  placeholder="Search staff name"
                  allowClear
                  style={{ width: "100%" }}
                  onSelect={(id) => {
                    const emp = employeesList.find(
                      (e) => String(e._id || e.id) === String(id),
                    );
                    if (emp) {
                      setField("employeeName", emp.name || "");
                      setField("employeeUserId", emp._id || emp.id || "");
                    }
                  }}
                  status={showErrors && step1Errors.employeeName ? "error" : ""}
                />
              </CleanField>
              {showErrors && step1Errors.employeeName ? (
                <p className="mt-1 text-[11px] text-red-500">{step1Errors.employeeName}</p>
              ) : null}
            </div>

            <div className={fieldWrapClass}>
              <CleanField label="Policy Done By" required>
                <Select
                  size="large"
                  allowClear
                  value={policyDoneBy || "Autocredits India LLP"}
                  onChange={(value) => {
                    if (onPolicyDoneByChange) onPolicyDoneByChange(value);
                    else setField("policyDoneBy", value);
                  }}
                  style={controlStyle}
                  options={POLICY_DONE_BY_OPTIONS.map((value) => ({ label: value, value }))}
                  status={showErrors && step1Errors.policyDoneBy ? "error" : ""}
                />
              </CleanField>
              {showErrors && step1Errors.policyDoneBy ? (
                <p className="mt-1 text-[11px] text-red-500">{step1Errors.policyDoneBy}</p>
              ) : null}
            </div>

            {/* Broker Name + Dealer contact — shown when policyDoneBy = Broker, all in one line */}
            {policyDoneBy === "Broker" ? (
              <div className={`${fieldWrapClass} sm:col-span-2 lg:col-span-3`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <CleanField label="Broker Name" required>
                      <AutoComplete
                        size="large"
                        allowClear
                        value={formData.brokerName}
                        options={brokerOptions}
                        onSearch={searchBrokers}
                        onSelect={(val, option) => {
                          const p = option?.partner;
                          setField("brokerName", p?.name || val || "");
                          applyChannelDealerNo(p?.channelId || "");
                          applyDealerContactDetails(p);
                        }}
                        onChange={(val) => setField("brokerName", val)}
                        placeholder="Type 3+ chars — broker name"
                        status={showErrors && step1Errors.brokerName ? "error" : ""}
                      />
                    </CleanField>
                    {showErrors && step1Errors.brokerName ? (
                      <p className="mt-1 text-[11px] text-red-500">{step1Errors.brokerName}</p>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <CleanField label="Dealer / Channel Mobile">
                      <Input
                        size="large"
                        allowClear
                        value={formData.dealerMobile}
                        onChange={(e) =>
                          setField(
                            "dealerMobile",
                            String(e?.target?.value || "")
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          )
                        }
                        maxLength={10}
                        placeholder="Dealer / Channel mobile"
                      />
                    </CleanField>
                  </div>

                  <div className="min-w-0 flex-1">
                    <CleanField label="Dealer / Channel Address">
                      <Input
                        size="large"
                        allowClear
                        value={formData.dealerChannelAddress}
                        onChange={(e) =>
                          setField("dealerChannelAddress", e?.target?.value || "")
                        }
                        placeholder="Dealer / Channel address"
                      />
                    </CleanField>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Showroom Name + Dealer contact — shown when policyDoneBy = Showroom, all in one line */}
            {policyDoneBy === "Showroom" ? (
              <div className={`${fieldWrapClass} sm:col-span-2 lg:col-span-3`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <CleanField label="Showroom Name" required>
                      <AutoComplete
                        size="large"
                        allowClear
                        value={formData.showroomName}
                        options={showroomOptions}
                        onSearch={searchShowrooms}
                        onSelect={(val, option) => {
                          const s = option?.showroom;
                          setField("showroomName", s?.name || val || "");
                          applyChannelDealerNo(s?.showroomId || "");
                          applyDealerContactDetails(s);
                        }}
                        onChange={(val) => setField("showroomName", val)}
                        placeholder="Type 3+ chars — showroom name"
                        status={showErrors && step1Errors.showroomName ? "error" : ""}
                      />
                    </CleanField>
                    {showErrors && step1Errors.showroomName ? (
                      <p className="mt-1 text-[11px] text-red-500">{step1Errors.showroomName}</p>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <CleanField label="Dealer / Channel Mobile">
                      <Input
                        size="large"
                        allowClear
                        value={formData.dealerMobile}
                        onChange={(e) =>
                          setField(
                            "dealerMobile",
                            String(e?.target?.value || "")
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          )
                        }
                        maxLength={10}
                        placeholder="Dealer / Channel mobile"
                      />
                    </CleanField>
                  </div>

                  <div className="min-w-0 flex-1">
                    <CleanField label="Dealer / Channel Address">
                      <Input
                        size="large"
                        allowClear
                        value={formData.dealerChannelAddress}
                        onChange={(e) =>
                          setField("dealerChannelAddress", e?.target?.value || "")
                        }
                        placeholder="Dealer / Channel address"
                      />
                    </CleanField>
                  </div>
                </div>
              </div>
            ) : null}

          </div>

          {/* ── Source ── */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Source Details
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

              <div className={fieldWrapClass}>
                <CleanField label="Source" required>
                  <Select
                    size="large"
                    allowClear
                    value={sourceMode || "Direct"}
                    onChange={(value) => {
                      if (onSourceChange) onSourceChange(value);
                      else setField("source", value);
                    }}
                    style={controlStyle}
                    options={[
                      { label: "Direct", value: "Direct" },
                      { label: "Indirect", value: "Indirect" },
                    ]}
                    status={showErrors && step1Errors.source ? "error" : ""}
                  />
                </CleanField>
                {showErrors && step1Errors.source ? (
                  <p className="mt-1 text-[11px] text-red-500">{step1Errors.source}</p>
                ) : null}
              </div>

              {/* Direct source name */}
              {sourceMode === "Direct" ? (
                <div className={fieldWrapClass}>
                  <CleanField label="Source Name" required>
                    <Input
                      size="large"
                      allowClear
                      value={formData.sourceName}
                      onChange={handleChange("sourceName")}
                      placeholder="Source Name"
                      status={showErrors && step1Errors.sourceName ? "error" : ""}
                    />
                  </CleanField>
                  {showErrors && step1Errors.sourceName ? (
                    <p className="mt-1 text-[11px] text-red-500">{step1Errors.sourceName}</p>
                  ) : null}
                </div>
              ) : null}

              {/* Indirect source fields */}
              {sourceMode === "Indirect" ? (
                <>
                  <div className={fieldWrapClass}>
                    <CleanField label="Dealer / Channel" required>
                      <AutoComplete
                        size="large"
                        allowClear
                        value={formData.dealerChannelName}
                        options={partnerOptions}
                        onSearch={searchPartners}
                        onSelect={(val, option) => {
                          const p = option.partner;
                          if (p) {
                            setField("dealerChannelName", p.name || "");
                            setField("channelDealerNo", p.channelId || "");
                            if (p.address) setField("dealerChannelAddress", p.address);
                            const pMobile = String(p.mobile || p.contactNumber || "");
                            if (pMobile) {
                              let digits = pMobile.replace(/\D/g, "");
                              if (digits.length >= 10) digits = digits.slice(-10);
                              setField("dealerMobile", digits);
                            }
                            setField("payoutApplicable", "Yes");
                            if (p.commissionRate) setField("payoutPercent", String(p.commissionRate));
                          }
                        }}
                        onChange={(val) => setField("dealerChannelName", val)}
                        placeholder="Type 3+ chars — dealer name or mobile"
                        status={showErrors && step1Errors.dealerChannelName ? "error" : ""}
                      />
                    </CleanField>
                    {showErrors && step1Errors.dealerChannelName ? (
                      <p className="mt-1 text-[11px] text-red-500">{step1Errors.dealerChannelName}</p>
                    ) : null}
                  </div>

                  <div className={fieldWrapClass}>
                    <CleanField label="Dealer / Channel Address" required>
                      <Input
                        size="large"
                        allowClear
                        value={formData.dealerChannelAddress}
                        onChange={handleChange("dealerChannelAddress")}
                        placeholder="Dealer / Channel address"
                        status={showErrors && step1Errors.dealerChannelAddress ? "error" : ""}
                      />
                    </CleanField>
                    {showErrors && step1Errors.dealerChannelAddress ? (
                      <p className="mt-1 text-[11px] text-red-500">{step1Errors.dealerChannelAddress}</p>
                    ) : null}
                  </div>

                  <div className={fieldWrapClass}>
                    <CleanField label="Dealer / Channel Mobile" required>
                      <Input
                        size="large"
                        allowClear
                        value={formData.dealerMobile}
                        onChange={(e) => {
                          const digits = String(e?.target?.value || "")
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setField("dealerMobile", digits);
                        }}
                        maxLength={10}
                        placeholder="10-digit mobile"
                        status={showErrors && step1Errors.dealerMobile ? "error" : ""}
                      />
                    </CleanField>
                    {showErrors && step1Errors.dealerMobile ? (
                      <p className="mt-1 text-[11px] text-red-500">{step1Errors.dealerMobile}</p>
                    ) : null}
                  </div>

                  <div className={fieldWrapClass}>
                    <CleanField label="Payout Applicable" required>
                      <Select
                        size="large"
                        allowClear
                        value={formData.payoutApplicable || "No"}
                        onChange={(value) => setField("payoutApplicable", value)}
                        style={controlStyle}
                        options={[
                          { label: "No", value: "No" },
                          { label: "Yes", value: "Yes" },
                        ]}
                        status={showErrors && step1Errors.payoutApplicable ? "error" : ""}
                      />
                    </CleanField>
                    {showErrors && step1Errors.payoutApplicable ? (
                      <p className="mt-1 text-[11px] text-red-500">{step1Errors.payoutApplicable}</p>
                    ) : null}
                  </div>

                  {String(formData.payoutApplicable || "No") === "Yes" ? (
                    <div className={fieldWrapClass}>
                      <CleanField label="Payout %" required>
                        <InputNumber
                          size="large"
                          min={0}
                          max={100}
                          value={
                            formData.payoutPercent === "" ||
                            formData.payoutPercent === undefined ||
                            formData.payoutPercent === null
                              ? null
                              : Number(formData.payoutPercent)
                          }
                          onChange={(value) =>
                            setField("payoutPercent", value === null ? "" : String(value))
                          }
                          style={controlStyle}
                          placeholder="e.g. 10"
                          suffix="%"
                          status={showErrors && step1Errors.payoutPercent ? "error" : ""}
                        />
                      </CleanField>
                      {showErrors && step1Errors.payoutPercent ? (
                        <p className="mt-1 text-[11px] text-red-500">{step1Errors.payoutPercent}</p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

        </div>
      ),
    },
    {
      key: "2",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFE6C6] text-slate-700 ring-1 ring-[#FFE6C6]">
            <UserOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              Customer details
            </div>
          </div>
        </div>
      ),
      children: (
        <div className="pt-3">
          <Row gutter={[16, 16]} align="top">
            {isCompany ? (
              <>
                <Col xs={24} md={12}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Company Name" required>
                      <AutoComplete
                        value={formData.companyName}
                        onSearch={(val) => {
                          setField("companyName", val);
                          searchCustomers(val);
                        }}
                        onChange={(val) => {
                          const v = String(val ?? "");
                          if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                          setField("companyName", v);
                        }}
                        options={companyNameOptions}
                        onSelect={(customerId) => {
                          const selected = resolveSelectedCustomer(
                            customerId,
                            customerSearchResults,
                            getCustomerId,
                          );
                          if (selected) {
                            applyCustomerToForm(selected, { overwrite: false });
                            setCustomerDataLoaded(true);
                          }
                        }}
                        style={{ width: "100%" }}
                        popupClassName="customer-autocomplete-dropdown"
                        dropdownStyle={{
                          padding: 8,
                          borderRadius: 18,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
                          background: "#ffffff",
                        }}
                        notFoundContent={
                          customerSearchLoading ? "Searching…" : "No companies"
                        }
                        status={
                          showErrors && step1Errors.companyName ? "error" : ""
                        }
                        placeholder="Company Name"
                      />
                    </CleanField>
                  </div>
                  {showErrors && step1Errors.companyName ? (
                    <Text type="danger">{step1Errors.companyName}</Text>
                  ) : null}
                </Col>

                <Col xs={24} md={12}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Contact Person Name" required>
                      <Input size="large" allowClear
                        value={formData.contactPersonName}
                        onChange={handleChange("contactPersonName")}
                       
                        status={
                          showErrors && step1Errors.contactPersonName
                            ? "error"
                            : ""
                        }
                        placeholder="Contact Person Name"
                      />
                    </CleanField>
                  </div>
                  {showErrors && step1Errors.contactPersonName ? (
                    <Text type="danger">{step1Errors.contactPersonName}</Text>
                  ) : null}
                </Col>
              </>
            ) : (
              <Col xs={24} md={12}>
                <div className={fieldWrapClass}>
                  <CleanField label="Customer Name" required>
                    <AutoComplete
                      value={formData.customerName}
                      onSearch={(val) => {
                        setField("customerName", val);
                        searchCustomers(val);
                      }}
                      onChange={(val) => {
                        const v = String(val ?? "");
                        if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                        setField("customerName", v);
                      }}
                      options={customerNameOptions}
                      onSelect={(customerId) => {
                        const selected = resolveSelectedCustomer(
                          customerId,
                          customerSearchResults,
                          getCustomerId,
                        );
                        if (selected) {
                          // Explicitly set the full name so fillEmptyOnly doesn't
                          // leave the typed partial text (e.g. "Ram") in the field.
                          const fullName =
                            selected?.customerName ||
                            selected?.companyName ||
                            selected?.name ||
                            selected?.fullName ||
                            "";
                          if (fullName) setField("customerName", fullName);
                          applyCustomerToForm(selected, { overwrite: false });
                          setCustomerDataLoaded(true);
                        }
                      }}
                      style={{ width: "100%" }}
                      popupClassName="customer-autocomplete-dropdown"
                      dropdownStyle={{
                        padding: 8,
                        borderRadius: 18,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
                        background: "#ffffff",
                      }}
                      notFoundContent={
                        customerSearchLoading ? (
                          <span style={{ padding: 8, display: "block" }}>
                            Searching…
                          </span>
                        ) : (
                          <span style={{ padding: 8, display: "block" }}>
                            No customers
                          </span>
                        )
                      }
                      placeholder="Customer Name"
                      status={
                        showErrors && step1Errors.customerName ? "error" : ""
                      }
                    />
                  </CleanField>
                </div>
                {showErrors && step1Errors.customerName ? (
                  <Text type="danger">{step1Errors.customerName}</Text>
                ) : null}
              </Col>
            )}

            <Col xs={24} md={12}>
              <div className={fieldWrapClass}>
                <CleanField label="Customer Mobile" required>
                  <AutoComplete
                    value={formData.mobile}
                    onSearch={(raw) => {
                      const digits = String(raw || "")
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      setField("mobile", digits);
                      searchCustomers(digits);
                    }}
                    onChange={(val) => {
                      const v = String(val ?? "");
                      if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                      const digits = v.replace(/\D/g, "").slice(0, 10);
                      setField("mobile", digits);
                    }}
                    onSelect={(customerId) => {
                      const selected = resolveSelectedCustomer(
                        customerId,
                        customerSearchResults,
                        getCustomerId,
                      );
                      if (selected) {
                        // Explicitly set mobile so fillEmptyOnly doesn't leave
                        // the typed partial digits in the field.
                        const mobileRaw =
                          selected?.primaryMobile ??
                          selected?.mobile ??
                          selected?.phone ??
                          selected?.contactNumber ??
                          "";
                        const mobile10 = String(mobileRaw)
                          .replace(/\D/g, "")
                          .slice(-10);
                        if (mobile10) setField("mobile", mobile10);
                        applyCustomerToForm(selected, { overwrite: false });
                        setCustomerDataLoaded(true);
                      }
                    }}
                    options={customerOptions.slice(0, 10)}
                    style={{ width: "100%" }}
                    popupClassName="customer-autocomplete-dropdown"
                    dropdownStyle={{
                      padding: 8,
                      borderRadius: 18,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
                      background: "#ffffff",
                    }}
                    notFoundContent={
                      customerSearchLoading ? "Searching…" : null
                    }
                    placeholder="Mobile"
                    status={showErrors && step1Errors.mobile ? "error" : ""}
                  />
                </CleanField>
              </div>
              {showErrors && step1Errors.mobile ? (
                <Text type="danger">{step1Errors.mobile}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={12}>
              <div className={fieldWrapClass}>
                <CleanField label="Alternate Phone">
                  <Input size="large" allowClear
                    value={formData.alternatePhone}
                    onChange={(e) => {
                      const digits = String(e?.target?.value || "")
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      guardedSetField("alternatePhone", digits);
                    }}
                    maxLength={10}
                    placeholder="Alternate Phone"
                   
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className={fieldWrapClass}>
                <CleanField label="Email Address">
                  <Input size="large" allowClear
                    value={formData.email}
                    onChange={guardedHandleChange("email")}

                    status={showErrors && step1Errors.email ? "error" : ""}
                    placeholder="Email Address"
                  />
                </CleanField>
              </div>
              {showErrors && step1Errors.email ? (
                <Text type="danger">{step1Errors.email}</Text>
              ) : null}
            </Col>

            {!isCompany ? (
              <Col xs={24} md={12}>
                <div className={fieldWrapClass}>
                  <CleanField label="Gender" required>
                    <Select size="large" allowClear
                      value={formData.gender || undefined}
                      onChange={(v) => guardedSetField("gender", v)}
                      style={controlStyle}
                      status={showErrors && step1Errors.gender ? "error" : ""}
                      options={[
                        { label: "Male", value: "Male" },
                        { label: "Female", value: "Female" },
                        { label: "Other", value: "Other" },
                      ]}
                      placeholder="Select Gender"
                    />
                  </CleanField>
                </div>
                {showErrors && step1Errors.gender ? (
                  <Text type="danger">{step1Errors.gender}</Text>
                ) : null}
              </Col>
            ) : null}

            <Col xs={24} md={12}>
              <div className={fieldWrapClass}>
                <CleanField label={`PAN Number ${isCompany ? "*" : ""}`}>
                  <Input size="large" allowClear
                    value={formData.panNumber}
                    onChange={guardedHandleChange("panNumber")}
                   
                    status={showErrors && step1Errors.panNumber ? "error" : ""}
                    placeholder="e.g. ABCDE1234F"
                  />
                </CleanField>
              </div>
              {showErrors && step1Errors.panNumber ? (
                <Text type="danger">{step1Errors.panNumber}</Text>
              ) : null}
            </Col>

            {isCompany ? (
              <Col xs={24} md={12}>
                <div className={fieldWrapClass}>
                  <CleanField label="GST Number">
                    <Input size="large" allowClear
                      value={formData.gstNumber}
                      onChange={guardedHandleChange("gstNumber")}
                     
                      placeholder="Optional"
                    />
                  </CleanField>
                </div>
              </Col>
            ) : (
              <Col xs={24} md={12}>
                <div className={fieldWrapClass}>
                  <CleanField label="Aadhaar Number">
                    <Input size="large" allowClear
                      value={formData.aadhaarNumber}
                      onChange={guardedHandleChange("aadhaarNumber")}
                     
                      placeholder="Optional"
                    />
                  </CleanField>
                </div>
              </Col>
            )}

            <Col xs={24}>
              <CleanField
                label={isCompany ? "Office Address" : "Residence Address"}
                required
              >
                <Input.TextArea allowClear
                  rows={2}
                  value={formData.residenceAddress}
                  onChange={guardedHandleChange("residenceAddress")}
                 
                  status={
                    showErrors && step1Errors.residenceAddress ? "error" : ""
                  }
                  placeholder="Address"
                />
              </CleanField>
              {showErrors && step1Errors.residenceAddress ? (
                <Text type="danger">{step1Errors.residenceAddress}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={12}>
              <div className={fieldWrapClass}>
                <CleanField label="Pincode" required>
                  <Input size="large" allowClear
                    value={formData.pincode}
                    onChange={(e) => {
                      const digits = String(e?.target?.value || "")
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      guardedSetField("pincode", digits);
                    }}
                    maxLength={6}
                   
                    status={showErrors && step1Errors.pincode ? "error" : ""}
                    placeholder="Pincode"
                  />
                </CleanField>
              </div>
              {showErrors && step1Errors.pincode ? (
                <Text type="danger">{step1Errors.pincode}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={12}>
              <div className={fieldWrapClass}>
                <CleanField
                  label="City"
                  required
                  extra={
                    cityLookupLoading ? (
                      <Text className="text-[11px] text-slate-400">
                        Detecting city from pincode...
                      </Text>
                    ) : null
                  }
                >
                  <Input size="large" allowClear
                    value={formData.city}
                    onChange={guardedHandleChange("city")}
                   
                    status={showErrors && step1Errors.city ? "error" : ""}
                    placeholder="City"
                  />
                </CleanField>
              </div>
              {showErrors && step1Errors.city ? (
                <Text type="danger">{step1Errors.city}</Text>
              ) : null}
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: "3",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DAF3FF] text-slate-700 ring-1 ring-[#9FC0FF]">
            <IdcardOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              Nominee & reference
            </div>
          </div>
        </div>
      ),
      children: (
        <div className="pt-3">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <div className="mb-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Nominee
                </div>
                <div className="mt-1 text-sm font-bold text-slate-800">
                  Insurance beneficiary
                </div>
              </div>

              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Name">
                      <Input size="large" allowClear
                        value={formData.nomineeName}
                        onChange={handleChange("nomineeName")}
                        placeholder="Name"
                        
                       
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Relationship">
                      <AutoComplete
                        size="large"
                        allowClear
                        value={formData.nomineeRelationship}
                        options={NOMINEE_RELATIONSHIP_OPTIONS.filter((opt) =>
                          normalizeForMatch(opt.value).includes(
                            normalizeForMatch(formData.nomineeRelationship),
                          ),
                        )}
                        onSearch={(val) => setField("nomineeRelationship", val)}
                        onChange={(val) => setField("nomineeRelationship", val)}
                        onSelect={(val) => setField("nomineeRelationship", val)}
                        placeholder="e.g. Son, Daughter, Spouse"
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Date Of Birth">
                      <DatePicker
                        size="large"
                        allowClear
                        value={
                          formData.nomineeDob
                            ? dayjs(formData.nomineeDob)
                            : null
                        }
                        onChange={(value) =>
                          setField(
                            "nomineeDob",
                            value ? value.format("YYYY-MM-DD") : "",
                          )
                        }
                        format={["DD/MM/YYYY", "D/M/YYYY"]}
                        placeholder="DD/MM/YYYY"
                        popupClassName="insurance-themed-calendar"
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label={`Age (${nomineeDobLabel})`}>
                      <InputNumber
                        size="large"
                        min={0}
                        value={
                          formData.nomineeAge === "" ||
                          formData.nomineeAge === undefined ||
                          formData.nomineeAge === null
                            ? null
                            : Number(formData.nomineeAge)
                        }
                        readOnly
                        disabled
                        style={controlStyle}
                        placeholder="Nominee Age"
                      />
                    </CleanField>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <div className="mb-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Reference
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Enter reference details manually
                </div>
              </div>

              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Name">
                      <AutoComplete
                        size="large"
                        allowClear
                        value={formData.referenceName}
                        options={[]}
                        onSearch={(val) => {
                          setField("referenceName", val);
                        }}
                        onChange={(val) => {
                          const v = String(val ?? "");
                          if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                          setField("referenceName", v);
                        }}
                        placeholder="Reference name"
                        style={{ width: "100%" }}
                        notFoundContent={null}
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Phone">
                      <AutoComplete
                        size="large"
                        allowClear
                        value={formData.referencePhone}
                        options={[]}
                        onSearch={(raw) => {
                          const digits = String(raw || "")
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setField("referencePhone", digits);
                        }}
                        onChange={(val) => {
                          const v = String(val ?? "");
                          if (/^[a-f0-9]{24}$/i.test(v.trim())) return;
                          setField(
                            "referencePhone",
                            v.replace(/\D/g, "").slice(0, 10),
                          );
                        }}
                        placeholder="Reference mobile (10 digits)"
                        style={{ width: "100%" }}
                        notFoundContent={null}
                      />
                    </CleanField>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="step1-customer-info flex flex-col gap-6">
      {modifiedCrmFields.length ? (
        <Alert
          type="warning"
          showIcon
          message="Existing customer data changed"
          description={`You have changed these details of an existing customer: ${modifiedCrmFields.join(
            ", ",
          )}. You will be asked to confirm before moving to the next step or saving.`}
        />
      ) : null}

      <div className="relative overflow-hidden rounded-xl border border-slate-200/75 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className={sectionHeaderLabel}>Customer information</div>
            <div className="mt-1 text-[22px] font-black tracking-tight text-slate-800">
              Customer details
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Buyer setup, CRM-linked customer info and KYC details in the same
              policy theme
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tag
              className={`step1-status-chip !rounded-full !px-3 !py-1 !text-[11px] !font-bold ${
                formData.buyerType === "Individual" ||
                formData.buyerType === "Company"
                  ? "is-filled"
                  : ""
              }`}
            >
              {formData.buyerType || "Buyer Type Pending"}
            </Tag>

            <Tag
              className={`step1-status-chip !rounded-full !px-3 !py-1 !text-[11px] !font-bold ${
                formData.vehicleType === "New Car" ||
                formData.vehicleType === "Used Car"
                  ? "is-filled"
                  : ""
              }`}
            >
              {formData.vehicleType || "Vehicle Type Pending"}
            </Tag>

            {formData.vehicleType === "Used Car" && !isExtendedWarranty ? (
              <Tag
                className="step1-status-chip is-flow !rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              >
                {formData.usedCarFlowType || "Used-car flow pending"}
              </Tag>
            ) : null}

            <Tag
              className="step1-status-chip is-policy !rounded-full !px-3 !py-1 !text-[11px] !font-bold"
            >
              {getPolicyTypePillLabel(formData.policyCategory)}
            </Tag>

            <Tag
              className="step1-status-chip is-case !rounded-full !px-3 !py-1 !text-[11px] !font-bold"
            >
              {isCompany ? "Company Case" : "Individual Case"}
            </Tag>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8} className="xl:self-stretch">
          <div className="xl:sticky xl:top-[150px] self-start">
            <div className="relative overflow-hidden rounded-xl border border-slate-200/75 bg-white shadow-sm">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dbeafe] text-xs font-black text-slate-800 ring-1 ring-[#bfd4ff]">
                      {customerInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-bold leading-tight text-slate-800">
                        {primaryName}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">
                          {secondaryName}
                        </span>
                        {formData.city ? (
                          <>
                            <span className="text-[10px] text-slate-300">
                              ·
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formData.city}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Staff
                    </p>
                    <p className="m-0 max-w-[120px] truncate text-sm font-black text-slate-800">
                      {formData.employeeName || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mx-5 border-t border-slate-100" />

              <div className="px-5 pt-5 pb-5">
                <p className="m-0 mb-3 text-sm font-black text-slate-800">
                  Customer Snapshot
                </p>

                <SummaryRow label="Buyer Type" value={formData.buyerType} />
                <SummaryRow label="Vehicle Type" value={formData.vehicleType} />
                {formData.vehicleType === "Used Car" && !isExtendedWarranty ? (
                  <SummaryRow
                    label="Used-car Flow"
                    value={formData.usedCarFlowType}
                  />
                ) : null}
                {formData.vehicleType === "Used Car" &&
                formData.policyJourneyClassification ? (
                  <SummaryRow
                    label="Journey Classification"
                    value={formData.policyJourneyClassification}
                  />
                ) : null}
                <SummaryRow
                  label="Policy Type"
                  value={formData.policyCategory || "Insurance Policy"}
                />
                <SummaryRow
                  label="Policy Done By"
                  value={formData.policyDoneBy}
                />
                {formData.dealerMobile ||
                formData.dealerChannelAddress ||
                formData.channelDealerNo ? (
                  <>
                    <SummaryRow
                      label="Dealer / Channel Mobile"
                      value={formData.dealerMobile}
                    />
                    <SummaryRow
                      label="Dealer / Channel Address"
                      value={formData.dealerChannelAddress}
                    />
                  </>
                ) : null}
                {formData.policyDoneBy === "Broker" ? (
                  <SummaryRow label="Broker Name" value={formData.brokerName} />
                ) : null}
                {formData.policyDoneBy === "Showroom" ? (
                  <SummaryRow label="Showroom Name" value={formData.showroomName} />
                ) : null}
                <SummaryRow
                  label="Source"
                  value={formData.source || formData.sourceOrigin}
                />
                {(formData.source || formData.sourceOrigin) === "Direct" ? (
                  <SummaryRow label="Source Name" value={formData.sourceName} />
                ) : null}
                {(formData.source || formData.sourceOrigin) === "Indirect" ? (
                  <>
                    <SummaryRow
                      label="Dealer / Channel"
                      value={formData.dealerChannelName}
                    />
                    <SummaryRow
                      label="Payout Applicable"
                      value={formData.payoutApplicable}
                    />
                    {String(formData.payoutApplicable || "").trim() === "Yes" ? (
                      <SummaryRow label="Payout %" value={formData.payoutPercent} />
                    ) : null}
                  </>
                ) : null}
                <SummaryRow
                  label={isCompany ? "Company Name" : "Customer Name"}
                  value={
                    isCompany ? formData.companyName : formData.customerName
                  }
                />
                {isCompany ? (
                  <SummaryRow
                    label="Contact Person"
                    value={formData.contactPersonName}
                  />
                ) : (
                  <SummaryRow label="Gender" value={formData.gender} />
                )}
                <SummaryRow label="Mobile" value={formData.mobile} />
                <SummaryRow label="Email" value={formData.email} />
                <SummaryRow label="PAN Number" value={formData.panNumber} />
                <SummaryRow label="City" value={formData.city} />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} xl={16}>
          <div className="flex flex-col gap-4">
            {collapseItems.map((item) => {
              const isBasicSetup = item.key === "1";
              const isCollapsed = isBasicSetup && basicSetupCollapsed;

              return (
                <div
                  key={item.key}
                  className="rounded-xl border border-slate-200/75 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div
                    className={`flex items-center justify-between ${isCollapsed ? "" : "pb-3 border-b border-slate-100"}`}
                    style={isBasicSetup ? { cursor: "pointer" } : undefined}
                    onClick={isBasicSetup ? () => setBasicSetupCollapsed((v) => !v) : undefined}
                  >
                    <div className="flex-1">{item.label}</div>
                    {isBasicSetup && (
                      <div className="ml-3 flex items-center gap-2 shrink-0">
                        {basicSetupCollapsed && (
                          <div className="flex flex-wrap gap-1.5">
                            {formData.employeeName && (
                              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                {formData.employeeName}
                              </span>
                            )}
                            {formData.vehicleType && (
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                {formData.vehicleType}
                              </span>
                            )}
                            {formData.buyerType && (
                              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                {formData.buyerType}
                              </span>
                            )}
                            {(formData.source || formData.sourceOrigin) && (
                              <span className="rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                                {formData.source || formData.sourceOrigin}
                              </span>
                            )}
                          </div>
                        )}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-slate-400 transition-transform duration-200"
                          style={{ transform: basicSetupCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className={isBasicSetup ? "pt-3" : ""}>
                      {item.children}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Col>
      </Row>

      <Modal
        open={confirmOpen}
        title="Override customer data?"
        onCancel={handleConfirmNo}
        footer={[
          <button
            key="no"
            type="button"
            onClick={handleConfirmNo}
            className="mr-2 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            No
          </button>,
          <button
            key="yes"
            type="button"
            onClick={handleConfirmYes}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Yes
          </button>,
        ]}
      >
        <p className="text-slate-600">
          Customer details were loaded from CRM. Do you want to override this field?
        </p>
      </Modal>
    </div>
  );
};

export default Step1CustomerInfo;
