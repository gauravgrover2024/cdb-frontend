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
  Radio,
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

const getPolicyTypePillLabel = (value) => {
  if (String(value || "").trim() === "Extended Warranty") return "EW Policy";
  return "Insurance";
};

const digits10 = (v) =>
  String(v ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

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

  const applyChannelFromMaster = (channel) => {
    if (!channel) return;
    const channelId = String(channel.channelId || "").trim();
    const channelName = String(channel.name || "").trim();
    const channelType = String(channel.type || "").trim().toLowerCase();

    applyChannelDealerNo(channelId);

    if (channelType.includes("broker")) {
      setField("brokerName", channelName);
      if (onPolicyDoneByChange) onPolicyDoneByChange("Broker");
      else setField("policyDoneBy", "Broker");
      return;
    }

    if (channelType.includes("dealer") || sourceMode === "Indirect") {
      setField("dealerChannelName", channelName);
      if (channel.address) setField("dealerChannelAddress", channel.address);
      
      const mobileVal = String(channel.mobile || channel.contactNumber || "");
      if (mobileVal) {
        let digits = mobileVal.replace(/\D/g, "");
        if (digits.length >= 10) digits = digits.slice(-10);
        setField("dealerMobile", digits);
      }

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
      return;
    }
    if (doneBy === "showroom") {
      const showroom = getShowroomByName(formData.showroomName);
      if (showroom?.showroomId) applyChannelDealerNo(showroom.showroomId);
      return;
    }
    if (sourceMode === "Indirect") {
      const partner = getPartnerByName(formData.dealerChannelName);
      if (partner?.channelId) applyChannelDealerNo(partner.channelId);
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
            <div className="text-xs text-slate-500">
              Buyer type, vehicle type, staff assignment and source details
            </div>
          </div>
        </div>
      ),
      children: (
        <div className="pt-3">
          <Row gutter={[16, 16]} align="top">
            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Buyer Type" required>
                  <Radio.Group
                    value={formData.buyerType}
                    onChange={(e) => setField("buyerType", e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { label: "Individual", value: "Individual" },
                      { label: "Company", value: "Company" },
                    ]}
                    style={{ marginTop: 8, width: "100%" }}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Vehicle Type" required>
                  <Radio.Group
                    value={formData.vehicleType}
                    onChange={(e) => setField("vehicleType", e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { label: "New Car", value: "New Car" },
                      { label: "Used Car", value: "Used Car" },
                    ]}
                    style={{ marginTop: 8, width: "100%" }}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Policy Type" required>
                  <Radio.Group
                    value={formData.policyCategory || "Insurance Policy"}
                    onChange={(e) =>
                      setField(
                        "policyCategory",
                        e?.target?.value || "Insurance Policy",
                      )
                    }
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { label: "Insurance", value: "Insurance Policy" },
                      { label: "EW Policy", value: "Extended Warranty" },
                    ]}
                    style={{ marginTop: 8, width: "100%" }}
                  />
                </CleanField>
              </div>
            </Col>


            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Employee (staff)" required>
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
                    placeholder="Staff Name"
                    allowClear
                    style={{ width: "100%", marginTop: 8 }}
                    onSelect={(id) => {
                      const emp = employeesList.find(
                        (e) => String(e._id || e.id) === String(id),
                      );
                      if (emp) {
                        setField("employeeName", emp.name || "");
                        setField("employeeUserId", emp._id || emp.id || "");
                      }
                    }}
                    status={
                      showErrors && step1Errors.employeeName ? "error" : ""
                    }
                  />
                </CleanField>
              </div>
              {showErrors && step1Errors.employeeName ? (
                <Text type="danger">{step1Errors.employeeName}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Policy Done By" required>
                  <Select size="large" allowClear
                    value={policyDoneBy || "Autocredits India LLP"}
                    onChange={(value) => {
                      if (onPolicyDoneByChange) onPolicyDoneByChange(value);
                      else setField("policyDoneBy", value);
                    }}
                    style={controlStyle}
                    options={POLICY_DONE_BY_OPTIONS.map((value) => ({
                      label: value,
                      value,
                    }))}
                    status={
                      showErrors && step1Errors.policyDoneBy ? "error" : ""
                    }
                  />
                </CleanField>
              </div>
              {showErrors && step1Errors.policyDoneBy ? (
                <Text type="danger">{step1Errors.policyDoneBy}</Text>
              ) : null}
            </Col>

            {policyDoneBy === "Broker" ? (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
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
                      }}
                      onChange={(val) => setField("brokerName", val)}
                      placeholder="Type 3+ chars — broker name"
                      status={
                        showErrors && step1Errors.brokerName ? "error" : ""
                      }
                    />
                  </CleanField>
                </div>
                {showErrors && step1Errors.brokerName ? (
                  <Text type="danger">{step1Errors.brokerName}</Text>
                ) : null}
              </Col>
            ) : null}

            {policyDoneBy === "Showroom" ? (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
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
                      }}
                      onChange={(val) => setField("showroomName", val)}
                      placeholder="Type 3+ chars — showroom name"
                      status={
                        showErrors && step1Errors.showroomName ? "error" : ""
                      }
                    />
                  </CleanField>
                </div>
                {showErrors && step1Errors.showroomName ? (
                  <Text type="danger">{step1Errors.showroomName}</Text>
                ) : null}
              </Col>
            ) : null}

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Channel / Dealer Number">
                  <AutoComplete
                    size="large"
                    allowClear
                    value={formData.channelDealerNo}
                    options={channelMasterOptions}
                    onSearch={searchChannelMaster}
                    onSelect={(_, option) => applyChannelFromMaster(option?.channel)}
                    onChange={(val) => setField("channelDealerNo", val)}
                    placeholder="Type 3+ chars — ID, name, mobile"
                    notFoundContent={channelMasterNotFound}
                    style={{ width: "100%" }}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className={fieldWrapClass}>
                <CleanField label="Source" required>
                  <Select size="large" allowClear
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
              </div>
              {showErrors && step1Errors.source ? (
                <Text type="danger">{step1Errors.source}</Text>
              ) : null}
            </Col>

            {sourceMode === "Direct" ? (
              <Col xs={24} md={8}>
                <div className={fieldWrapClass}>
                  <CleanField label="Source Name" required>
                    <Input
                      size="large"
                      allowClear
                      value={formData.sourceName}
                      onChange={handleChange("sourceName")}
                      placeholder="Source Name"
                      status={
                        showErrors && step1Errors.sourceName ? "error" : ""
                      }
                    />
                  </CleanField>
                </div>
                {showErrors && step1Errors.sourceName ? (
                  <Text type="danger">{step1Errors.sourceName}</Text>
                ) : null}
              </Col>
            ) : null}

            {sourceMode === "Indirect" ? (
              <>
                <Col xs={24} md={8}>
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
                      status={
                        showErrors && step1Errors.dealerChannelName
                          ? "error"
                          : ""
                      }
                    />
                    </CleanField>
                  </div>
                  {showErrors && step1Errors.dealerChannelName ? (
                    <Text type="danger">{step1Errors.dealerChannelName}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Dealer / Channel Address" required>
                      <Input size="large" allowClear
                        value={formData.dealerChannelAddress}
                        onChange={handleChange("dealerChannelAddress")}
                        placeholder="Dealer / Channel address"
                       
                        status={
                          showErrors && step1Errors.dealerChannelAddress
                            ? "error"
                            : ""
                        }
                      />
                    </CleanField>
                  </div>
                  {showErrors && step1Errors.dealerChannelAddress ? (
                    <Text type="danger">
                      {step1Errors.dealerChannelAddress}
                    </Text>
                  ) : null}
                </Col>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Dealer / Channel Mobile" required>
                      <Input size="large" allowClear
                        value={formData.dealerMobile}
                        onChange={(e) => {
                          const digits = String(e?.target?.value || "")
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setField("dealerMobile", digits);
                        }}
                        maxLength={10}
                        placeholder="Dealer Mobile"
                        status={
                          showErrors && step1Errors.dealerMobile
                            ? "error"
                            : ""
                        }
                      />
                    </CleanField>
                  </div>
                  {showErrors && step1Errors.dealerMobile ? (
                    <Text type="danger">{step1Errors.dealerMobile}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Payout Applicable" required>
                      <Select size="large" allowClear
                        value={formData.payoutApplicable || "No"}
                        onChange={(value) =>
                          setField("payoutApplicable", value)
                        }
                        style={controlStyle}
                        options={[
                          { label: "No", value: "No" },
                          { label: "Yes", value: "Yes" },
                        ]}
                        status={
                          showErrors && step1Errors.payoutApplicable
                            ? "error"
                            : ""
                        }
                      />
                    </CleanField>
                  </div>
                  {showErrors && step1Errors.payoutApplicable ? (
                    <Text type="danger">{step1Errors.payoutApplicable}</Text>
                  ) : null}
                </Col>
                {String(formData.payoutApplicable || "No") === "Yes" ? (
                  <Col xs={24} md={8}>
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
                            setField(
                              "payoutPercent",
                              value === null ? "" : String(value),
                            )
                          }
                          style={controlStyle}
                          placeholder="Payout %"
                          status={
                            showErrors && step1Errors.payoutPercent
                              ? "error"
                              : ""
                          }
                        />
                      </CleanField>
                    </div>
                    {showErrors && step1Errors.payoutPercent ? (
                      <Text type="danger">{step1Errors.payoutPercent}</Text>
                    ) : null}
                  </Col>
                ) : null}
              </>
            ) : null}

            {formData.vehicleType === "Used Car" && !isExtendedWarranty ? (
              <Col xs={24} md={16}>
                <div className={fieldWrapClass}>
                  <CleanField label="Used Car Flow Type" required>
                    <Radio.Group
                      value={String(formData.usedCarFlowType || "Renewal")}
                      onChange={(e) =>
                        setField("usedCarFlowType", e?.target?.value || "Renewal")
                      }
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: "Renewal", value: "Renewal" },
                        {
                          label: "Policy Already Expired",
                          value: "Policy Already Expired",
                        },
                        { label: "Sale/Purchase", value: "Sale/Purchase" },
                      ]}
                      style={{ marginTop: 8, width: "100%" }}
                    />
                  </CleanField>
                </div>
                {showErrors && step1Errors.usedCarFlowType ? (
                  <Text type="danger">{step1Errors.usedCarFlowType}</Text>
                ) : null}
              </Col>
            ) : null}
          </Row>
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
            <div className="text-xs text-slate-500">
              CRM search, contact details and KYC information
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
                        options={customerOptions}
                        onSelect={(customerId) => {
                          const selected = resolveSelectedCustomer(
                            customerId,
                            customerSearchResults,
                            getCustomerId,
                          );
                          if (selected) {
                            applyCustomerToForm(selected);
                            setCustomerDataLoaded(true);
                          }
                        }}
                        style={{ width: "100%", marginTop: 8 }}
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
                      options={customerOptions}
                      onSelect={(customerId) => {
                        const selected = resolveSelectedCustomer(
                          customerId,
                          customerSearchResults,
                          getCustomerId,
                        );
                        if (selected) {
                          applyCustomerToForm(selected);
                          setCustomerDataLoaded(true);
                        }
                      }}
                      style={{ width: "100%", marginTop: 8 }}
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
                        applyCustomerToForm(selected);
                        setCustomerDataLoaded(true);
                      }
                    }}
                    options={customerOptions.slice(0, 10)}
                    style={{ width: "100%", marginTop: 8 }}
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
            <div className="text-xs text-slate-500">
              Optional insurance beneficiary and contact reference
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
                      <Input size="large" allowClear
                        value={formData.nomineeRelationship}
                        onChange={handleChange("nomineeRelationship")}
                        placeholder="Relationship"
                       
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Date Of Birth">
                      <DatePicker allowClear
                        value={
                          formData.nomineeDob
                            ? dayjs(formData.nomineeDob)
                            : null
                        }
                        onChange={(value) =>
                          setField(
                            "nomineeDob",
                            value ? value.startOf("day").toISOString() : "",
                          )
                        }
                        format={["DD/MM/YYYY", "D/M/YYYY"]}
                        style={controlStyle}
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
                {formData.channelDealerNo ? (
                  <SummaryRow
                    label="Channel / Dealer No."
                    value={formData.channelDealerNo}
                  />
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
            {collapseItems.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-slate-200/75 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="pb-3 border-b border-slate-100">
                  {item.label}
                </div>
                {item.children}
              </div>
            ))}
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
