import React from "react";
import {
  AutoComplete,
  Col,
  Collapse,
  DatePicker,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Tag,
  Typography,
} from "antd";
import { UserOutlined, TeamOutlined, IdcardOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

const shellStyle =
  "rounded-[28px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const controlStyle = {
  width: "100%",
  marginTop: 8,
  height: 46,
  borderRadius: 14,
};

const inputControlStyle = {
  ...controlStyle,
  paddingTop: 0,
  paddingBottom: 0,
  lineHeight: "46px",
};

const textAreaStyle = {
  width: "100%",
  marginTop: 8,
  borderRadius: 14,
  minHeight: 86,
};

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500";

const fieldWrapClass =
  "[&_.ant-input]:!rounded-[14px] [&_.ant-input]:!text-[14px] [&_.ant-input]:!h-[46px] [&_.ant-input]:!py-0 [&_.ant-input]:!leading-[46px] [&_.ant-input-affix-wrapper]:!h-[46px] [&_.ant-input-affix-wrapper]:!rounded-[14px] [&_.ant-input-affix-wrapper]:!px-3 [&_.ant-input-affix-wrapper]:!py-0 [&_.ant-input-affix-wrapper]:!flex [&_.ant-input-affix-wrapper]:!items-center [&_.ant-input-affix-wrapper_.ant-input]:!h-[42px] [&_.ant-input-affix-wrapper_.ant-input]:!py-0 [&_.ant-input-affix-wrapper_.ant-input]:!leading-[42px] [&_.ant-input-number]:!h-[46px] [&_.ant-input-number]:!w-full [&_.ant-input-number]:!rounded-[14px] [&_.ant-input-number-input-wrap]:!h-[44px] [&_.ant-input-number-input]:!h-[44px] [&_.ant-input-number-input]:!leading-[44px] [&_.ant-input-number-input]:!text-[14px] [&_.ant-select-selector]:!h-[46px] [&_.ant-select-selector]:!rounded-[14px] [&_.ant-select-selector]:!px-[11px] [&_.ant-select-selector]:!py-0 [&_.ant-select-selection-item]:!leading-[44px] [&_.ant-select-selection-placeholder]:!leading-[44px] [&_.ant-radio-group]:!flex [&_.ant-radio-group]:!w-full [&_.ant-radio-group]:!gap-2 [&_.ant-radio-group]:!flex-wrap [&_.ant-radio-button-wrapper]:!h-[42px] [&_.ant-radio-button-wrapper]:!min-w-[124px] [&_.ant-radio-button-wrapper]:!rounded-[999px] [&_.ant-radio-button-wrapper]:!border [&_.ant-radio-button-wrapper]:!border-slate-300 [&_.ant-radio-button-wrapper]:!bg-white [&_.ant-radio-button-wrapper]:!px-5 [&_.ant-radio-button-wrapper]:!text-center [&_.ant-radio-button-wrapper]:!font-semibold [&_.ant-radio-button-wrapper]:!text-slate-600 [&_.ant-radio-button-wrapper]:!leading-[40px] [&_.ant-radio-button-wrapper]:!shadow-none [&_.ant-radio-button-wrapper]:!transition-all [&_.ant-radio-button-wrapper:hover]:!border-[#7cad89] [&_.ant-radio-button-wrapper:hover]:!text-slate-800 [&_.ant-radio-button-wrapper-checked]:!border-[#5f9770] [&_.ant-radio-button-wrapper-checked]:!bg-[#5f9770] [&_.ant-radio-button-wrapper-checked]:!text-white [&_.ant-radio-button-wrapper-checked]:!shadow-[0_8px_20px_rgba(95,151,112,0.28)] [&_.ant-radio-button-wrapper-checked:hover]:!border-[#5f9770] [&_.ant-radio-button-wrapper-checked:hover]:!color-white [&_.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)]:!background-[#5f9770] [&_.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)]:!color-white [&_.ant-radio-button-wrapper-checked::before]:!hidden [&_.ant-radio-button-wrapper:not(:first-child)::before]:!hidden";

const CleanField = ({ label, required, children, extra }) => (
  <div className="pb-1">
    <div className={labelClass}>
      {label} {required ? <span className="text-[#D8B8B4]">*</span> : null}
    </div>
    {children}
    {extra ? <div className="mt-1">{extra}</div> : null}
  </div>
);

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

const buildCustomerOption = (c, getCustomerId) => {
  const id = getCustomerId(c);
  if (!id) return null;

  const name = c?.customerName || c?.companyName || "Unnamed Customer";
  const mobile = c?.primaryMobile || "No mobile";
  const pan = c?.panNumber || c?.pan || "";
  const city = c?.city || "";
  const initial = name.slice(0, 2).toUpperCase();

  return {
    value: id,
    label: (
      <div className="flex items-start gap-3 rounded-[14px] border border-slate-100 bg-white px-3 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3EF] text-xs font-bold text-slate-700 ring-1 ring-[#D6E6DF]">
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

const Step1CustomerInfo = ({
  formData,
  setField,
  handleChange,
  onPolicyDoneByChange,
  onSourceChange,
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
  getCustomerId,
}) => {
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
  const sourceMode = String(formData.source || formData.sourceOrigin || "Direct");
  const policyDoneBy = String(formData.policyDoneBy || "Autocredits India LLP");
  const nomineeDobLabel = (() => {
    if (!formData.nomineeDob) return "DOB";
    const parsed = dayjs(formData.nomineeDob);
    return parsed.isValid() ? parsed.format("DD-MM-YYYY") : "DOB";
  })();

  const collapseItems = [
    {
      key: "1",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF3EF] text-slate-700 ring-1 ring-[#D6E6DF]">
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
          <Row gutter={[24, 22]} align="top">
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
                <CleanField label="Employee (staff)" required>
                  <AutoComplete
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
                    placeholder="Search staff"
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
                <CleanField label="Policy Type" required>
                  <Radio.Group
                    value={formData.policyCategory || "Insurance Policy"}
                    onChange={(e) =>
                      setField("policyCategory", e?.target?.value || "Insurance Policy")
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
                <CleanField label="Policy Done By" required>
                  <Select
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
                    status={showErrors && step1Errors.policyDoneBy ? "error" : ""}
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
                    <Input
                      value={formData.brokerName}
                      onChange={handleChange("brokerName")}
                      placeholder="Enter broker name"
                      style={inputControlStyle}
                      status={showErrors && step1Errors.brokerName ? "error" : ""}
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
                    <Input
                      value={formData.showroomName}
                      onChange={handleChange("showroomName")}
                      placeholder="Enter showroom name"
                      style={inputControlStyle}
                      status={showErrors && step1Errors.showroomName ? "error" : ""}
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
                <CleanField label="Source" required>
                  <Select
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
                      value={formData.sourceName}
                      onChange={handleChange("sourceName")}
                      placeholder="Enter source name"
                      style={inputControlStyle}
                      status={showErrors && step1Errors.sourceName ? "error" : ""}
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
                      <Input
                        value={formData.dealerChannelName}
                        onChange={handleChange("dealerChannelName")}
                        placeholder="Dealer / Channel"
                        style={inputControlStyle}
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
                      <Input
                        value={formData.dealerChannelAddress}
                        onChange={handleChange("dealerChannelAddress")}
                        placeholder="Dealer / Channel address"
                        style={inputControlStyle}
                        status={
                          showErrors && step1Errors.dealerChannelAddress
                            ? "error"
                            : ""
                        }
                      />
                    </CleanField>
                  </div>
                  {showErrors && step1Errors.dealerChannelAddress ? (
                    <Text type="danger">{step1Errors.dealerChannelAddress}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={8}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Payout Applicable" required>
                      <Select
                        value={formData.payoutApplicable || "No"}
                        onChange={(value) => setField("payoutApplicable", value)}
                        style={controlStyle}
                        options={[
                          { label: "No", value: "No" },
                          { label: "Yes", value: "Yes" },
                        ]}
                        status={
                          showErrors && step1Errors.payoutApplicable ? "error" : ""
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
                            showErrors && step1Errors.payoutPercent ? "error" : ""
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
          </Row>
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF8F1] text-slate-700 ring-1 ring-[#FAF8F1]">
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
          <Row gutter={[24, 22]} align="top">
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
                          const selected = customerSearchResults.find(
                            (c) =>
                              String(getCustomerId(c)) === String(customerId),
                          );
                          if (selected) applyCustomerToForm(selected);
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
                        placeholder="Search company..."
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
                      <Input
                        value={formData.contactPersonName}
                        onChange={handleChange("contactPersonName")}
                        style={inputControlStyle}
                        status={
                          showErrors && step1Errors.contactPersonName
                            ? "error"
                            : ""
                        }
                        placeholder="Enter contact person name"
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
                        const selected = customerSearchResults.find(
                          (c) =>
                            String(getCustomerId(c)) === String(customerId),
                        );
                        if (selected) applyCustomerToForm(selected);
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
                      placeholder="Search customer..."
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
                      const selected = customerSearchResults.find(
                        (c) => String(getCustomerId(c)) === String(customerId),
                      );
                      if (selected) applyCustomerToForm(selected);
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
                    placeholder="10-digit mobile"
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
                  <Input
                    value={formData.alternatePhone}
                    onChange={(e) => {
                      const digits = String(e?.target?.value || "")
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      setField("alternatePhone", digits);
                    }}
                    maxLength={10}
                    placeholder="Optional"
                    style={inputControlStyle}
                  />
                </CleanField>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className={fieldWrapClass}>
                <CleanField label="Email Address" required>
                  <Input
                    value={formData.email}
                    onChange={handleChange("email")}
                    style={inputControlStyle}
                    status={showErrors && step1Errors.email ? "error" : ""}
                    placeholder={
                      isCompany ? "Company email address" : "Email address"
                    }
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
                    <Select
                      value={formData.gender || undefined}
                      onChange={(v) => setField("gender", v)}
                      style={controlStyle}
                      status={showErrors && step1Errors.gender ? "error" : ""}
                      options={[
                        { label: "Male", value: "Male" },
                        { label: "Female", value: "Female" },
                        { label: "Other", value: "Other" },
                      ]}
                      placeholder="Select gender"
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
                  <Input
                    value={formData.panNumber}
                    onChange={handleChange("panNumber")}
                    style={inputControlStyle}
                    status={showErrors && step1Errors.panNumber ? "error" : ""}
                    placeholder="ABCDE1234F"
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
                    <Input
                      value={formData.gstNumber}
                      onChange={handleChange("gstNumber")}
                      style={inputControlStyle}
                      placeholder="Optional"
                    />
                  </CleanField>
                </div>
              </Col>
            ) : (
              <Col xs={24} md={12}>
                <div className={fieldWrapClass}>
                  <CleanField label="Aadhaar Number">
                    <Input
                      value={formData.aadhaarNumber}
                      onChange={handleChange("aadhaarNumber")}
                      style={inputControlStyle}
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
                <Input.TextArea
                  rows={2}
                  value={formData.residenceAddress}
                  onChange={handleChange("residenceAddress")}
                  style={textAreaStyle}
                  status={
                    showErrors && step1Errors.residenceAddress ? "error" : ""
                  }
                  placeholder="Enter complete address"
                />
              </CleanField>
              {showErrors && step1Errors.residenceAddress ? (
                <Text type="danger">{step1Errors.residenceAddress}</Text>
              ) : null}
            </Col>

            <Col xs={24} md={12}>
              <div className={fieldWrapClass}>
                <CleanField label="Pincode" required>
                  <Input
                    value={formData.pincode}
                    onChange={(e) => {
                      const digits = String(e?.target?.value || "")
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setField("pincode", digits);
                    }}
                    maxLength={6}
                    style={inputControlStyle}
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
                  <Input
                    value={formData.city}
                    onChange={handleChange("city")}
                    style={inputControlStyle}
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
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF3EF] text-slate-700 ring-1 ring-[#D6E6DF]">
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
                      <Input
                        value={formData.nomineeName}
                        onChange={handleChange("nomineeName")}
                        placeholder="Nominee Name"
                        style={inputControlStyle}
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Relationship">
                      <Input
                        value={formData.nomineeRelationship}
                        onChange={handleChange("nomineeRelationship")}
                        placeholder="Relationship"
                        style={inputControlStyle}
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Date Of Birth">
                      <DatePicker
                        value={formData.nomineeDob ? dayjs(formData.nomineeDob) : null}
                        onChange={(value) =>
                          setField(
                            "nomineeDob",
                            value ? value.startOf("day").toISOString() : "",
                          )
                        }
                        format="DD-MM-YYYY"
                        style={controlStyle}
                        placeholder="DD-MM-YYYY"
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label={`Age (${nomineeDobLabel})`}>
                      <InputNumber
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
                <div className="mt-1 text-sm font-bold text-slate-800">
                  Optional contact
                </div>
              </div>

              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Name">
                      <Input
                        value={formData.referenceName}
                        onChange={handleChange("referenceName")}
                        placeholder="Reference Name"
                        style={inputControlStyle}
                      />
                    </CleanField>
                  </div>
                </Col>

                <Col span={24}>
                  <div className={fieldWrapClass}>
                    <CleanField label="Phone">
                      <Input
                        value={formData.referencePhone}
                        onChange={handleChange("referencePhone")}
                        placeholder="Reference Phone"
                        style={inputControlStyle}
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
      <style>
        {`
          .step1-customer-info .ant-radio-button-wrapper-checked,
          .step1-customer-info .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled),
          .step1-customer-info .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover {
            background: #5f9770 !important;
            border-color: #5f9770 !important;
            color: #ffffff !important;
          }

          .step1-customer-info .ant-radio-button-wrapper-checked span {
            color: #ffffff !important;
          }

          .step1-customer-info .customer-autocomplete-dropdown .ant-select-item {
            padding: 6px !important;
            border-radius: 14px !important;
          }

          .step1-customer-info .customer-autocomplete-dropdown .ant-select-item-option-active {
            background: #f6faf7 !important;
          }

          .step1-customer-info .customer-autocomplete-dropdown .ant-select-item-option-selected {
            background: #eef7f1 !important;
          }
        `}
      </style>

      <div className="rounded-[30px] bg-gradient-to-r from-[#EEF3EF] via-white to-[#FAF8F1] p-5 ring-1 ring-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.06)] md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className={sectionHeaderLabel}>Customer information</div>
            <div className="mt-1 text-[24px] font-black tracking-tight text-slate-800">
              Customer details
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Buyer setup, CRM-linked customer info and KYC details in the same
              policy theme
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background:
                  formData.buyerType === "Individual" ||
                  formData.buyerType === "Company"
                    ? "#5f9770"
                    : "#ffffff",
                borderColor:
                  formData.buyerType === "Individual" ||
                  formData.buyerType === "Company"
                    ? "#5f9770"
                    : "#d1d5db",
                color:
                  formData.buyerType === "Individual" ||
                  formData.buyerType === "Company"
                    ? "#ffffff"
                    : "#475569",
              }}
            >
              {formData.buyerType || "Buyer Type Pending"}
            </Tag>

            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background:
                  formData.vehicleType === "New Car" ||
                  formData.vehicleType === "Used Car"
                    ? "#5f9770"
                    : "#ffffff",
                borderColor:
                  formData.vehicleType === "New Car" ||
                  formData.vehicleType === "Used Car"
                    ? "#5f9770"
                    : "#d1d5db",
                color:
                  formData.vehicleType === "New Car" ||
                  formData.vehicleType === "Used Car"
                    ? "#ffffff"
                    : "#475569",
              }}
            >
              {formData.vehicleType || "Vehicle Type Pending"}
            </Tag>

            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#5f9770",
                borderColor: "#5f9770",
                color: "#ffffff",
              }}
            >
              {getPolicyTypePillLabel(formData.policyCategory)}
            </Tag>

            <Tag
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold"
              style={{
                background: "#FAF8F1",
                borderColor: "#FAF8F1",
                color: "#1f2937",
              }}
            >
              {isCompany ? "Company Case" : "Individual Case"}
            </Tag>
          </div>
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={8} className="xl:self-stretch">
          <div className="xl:sticky xl:top-[150px] self-start">
            <div className="relative overflow-hidden rounded-[28px] bg-white ring-1 ring-[#D6E6DF] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6E6DF]/70 text-xs font-black text-slate-800 ring-1 ring-[#D6E6DF]">
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
                <SummaryRow
                  label="Policy Type"
                  value={formData.policyCategory || "Insurance Policy"}
                />
                <SummaryRow
                  label="Policy Done By"
                  value={formData.policyDoneBy}
                />
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
          <div className={`${shellStyle} p-3 md:p-4`}>
            <Collapse
              ghost
              defaultActiveKey={["1", "2", "3"]}
              expandIconPosition="end"
              items={collapseItems}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Step1CustomerInfo;
