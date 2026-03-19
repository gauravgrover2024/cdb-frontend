import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AutoComplete,
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
} from "antd";

import Icon from "../../../components/AppIcon";
import { lookupIfscDetails, normalizeIfsc } from "../../../utils/ifscLookup";
import { useBankDirectoryOptions } from "../../../hooks/useBankDirectoryOptions";
import { MAX_ADDITIONAL_BANKS } from "../../../utils/bankDetails";

const accountTypeOptions = [
  { label: "Savings", value: "Savings" },
  { label: "Current", value: "Current" },
];

const BankDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  const ifsc = Form.useWatch("ifsc", form);
  const accountSinceYears = Form.useWatch("accountSinceYears", form);
  const hasAdditionalBankDetails = Form.useWatch("hasAdditionalBankDetails", form);
  const watchedAdditionalBankDetails = Form.useWatch(
    "additionalBankDetails",
    { form, preserve: true },
  );
  const additionalBankDetails = useMemo(
    () =>
      Array.isArray(watchedAdditionalBankDetails)
        ? watchedAdditionalBankDetails
        : [],
    [watchedAdditionalBankDetails],
  );
  const previousHasAdditionalRef = useRef(hasAdditionalBankDetails);
  const resolvedAdditionalIfscRef = useRef(new Map());
  const [loadingIfsc, setLoadingIfsc] = useState(false);
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();

  // Show in customer module & financed loans
  const showBank = isFinanced !== "No";

  useEffect(() => {
    if (!showBank) return;
    const normalized = normalizeIfsc(ifsc);
    if (normalized.length !== 11) return;
    let cancelled = false;

    const resolveIfsc = async () => {
      try {
        setLoadingIfsc(true);
        const details = await lookupIfscDetails(normalized);
        if (cancelled || !details) return;
        const patch = { ifsc: normalized, ifscCode: normalized };
        if (details.bankName) patch.bankName = details.bankName;
        if (details.branch || details.address) patch.branch = details.branch || details.address;
        form.setFieldsValue(patch);
      } catch (error) {
        console.error("Customer IFSC lookup failed", error);
      } finally {
        if (!cancelled) setLoadingIfsc(false);
      }
    };

    const timer = setTimeout(resolveIfsc, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ifsc, form, showBank]);

  useEffect(() => {
    if (!showBank) return;
    if (typeof accountSinceYears === "number" && accountSinceYears >= 0) {
      const currentYear = new Date().getFullYear();
      form.setFieldsValue({ openedIn: currentYear - accountSinceYears });
      return;
    }
    form.setFieldsValue({ openedIn: undefined });
  }, [accountSinceYears, form, showBank]);

  useEffect(() => {
    if (!showBank || !Array.isArray(additionalBankDetails)) return;
    const currentYear = new Date().getFullYear();

    additionalBankDetails.forEach((bank, idx) => {
      const years = bank?.accountSinceYears;
      const openedInPath = ["additionalBankDetails", idx, "openedIn"];
      const currentOpenedIn = bank?.openedIn;

      if (typeof years === "number" && years >= 0) {
        const computed = currentYear - years;
        if (currentOpenedIn !== computed) {
          form.setFieldValue(openedInPath, computed);
        }
        return;
      }

      if (currentOpenedIn !== undefined && currentOpenedIn !== "") {
        form.setFieldValue(openedInPath, undefined);
      }
    });
  }, [additionalBankDetails, form, showBank]);

  useEffect(() => {
    if (!showBank || !Array.isArray(additionalBankDetails) || additionalBankDetails.length === 0) {
      return;
    }

    const timers = [];
    additionalBankDetails.forEach((bank, idx) => {
      const normalized = normalizeIfsc(bank?.ifsc || bank?.ifscCode);
      if (normalized && normalized !== String(bank?.ifsc || "")) {
        form.setFieldValue(["additionalBankDetails", idx, "ifsc"], normalized);
      }
      if (normalized && normalized !== String(bank?.ifscCode || "")) {
        form.setFieldValue(["additionalBankDetails", idx, "ifscCode"], normalized);
      }
      if (normalized.length !== 11) {
        resolvedAdditionalIfscRef.current.delete(idx);
        return;
      }
      if (resolvedAdditionalIfscRef.current.get(idx) === normalized) return;

      const timer = setTimeout(async () => {
        try {
          const latest = normalizeIfsc(
            form.getFieldValue(["additionalBankDetails", idx, "ifsc"]) ||
              form.getFieldValue(["additionalBankDetails", idx, "ifscCode"]),
          );
          if (latest !== normalized) return;

          const details = await lookupIfscDetails(normalized);
          if (!details) return;

          resolvedAdditionalIfscRef.current.set(idx, normalized);
          form.setFieldValue(["additionalBankDetails", idx, "ifsc"], normalized);
          form.setFieldValue(["additionalBankDetails", idx, "ifscCode"], normalized);
          if (details.bankName) {
            form.setFieldValue(
              ["additionalBankDetails", idx, "bankName"],
              details.bankName,
            );
          }
          if (details.branch || details.address) {
            form.setFieldValue(
              ["additionalBankDetails", idx, "branch"],
              details.branch || details.address,
            );
          }
        } catch (error) {
          console.error("Customer additional IFSC lookup failed", error);
        }
      }, 300);

      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [additionalBankDetails, form, showBank]);

  useEffect(() => {
    if (!showBank) return;
    const previous = previousHasAdditionalRef.current;
    previousHasAdditionalRef.current = hasAdditionalBankDetails;

    if (previous !== true || hasAdditionalBankDetails !== false) return;
    if (!Array.isArray(additionalBankDetails) || additionalBankDetails.length === 0) return;
    form.setFieldValue("additionalBankDetails", []);
  }, [additionalBankDetails, form, hasAdditionalBankDetails, showBank]);

  const handleAddAdditionalBank = () => {
    const current = Array.isArray(form.getFieldValue("additionalBankDetails"))
      ? form.getFieldValue("additionalBankDetails")
      : [];
    if (current.length >= MAX_ADDITIONAL_BANKS) return;
    form.setFieldsValue({
      hasAdditionalBankDetails: true,
      additionalBankDetails: [
        ...current,
        {
          ifsc: "",
          ifscCode: "",
          bankName: "",
          branch: "",
          accountNumber: "",
          accountSinceYears: undefined,
          openedIn: undefined,
          accountType: "",
        },
      ],
    });
  };

  const handleRemoveAdditionalBank = (index) => {
    const current = Array.isArray(form.getFieldValue("additionalBankDetails"))
      ? form.getFieldValue("additionalBankDetails")
      : [];
    const next = current.filter((_, idx) => idx !== index);
    form.setFieldsValue({
      additionalBankDetails: next,
      hasAdditionalBankDetails: next.length > 0 ? true : false,
    });
  };

  if (!showBank) {
    return null;
  }

  return (
    <div 
        id="section-bank" 
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      {/* SECTION HEADER */}
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
             <Icon name="Building2" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">Banking Details</span>
        </div>
      </div>

      {/* FORM FIELDS */}
      <Row gutter={[16, 16]}>
        <Form.Item name="ifscCode" hidden>
          <Input />
        </Form.Item>

         {/* IFSC */}
        <Col xs={24} md={8}>
          <Form.Item
            label="IFSC Code"
            name="ifsc"
            normalize={(value) => normalizeIfsc(value)}
          >
            <Input
              placeholder="IFSC Code"
              maxLength={11}
              className="rounded-xl border-border placeholder:font-normal"
              suffix={
                loadingIfsc ? (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Fetching...
                  </span>
                ) : null
              }
            />
          </Form.Item>
        </Col>

        {/* Bank Name */}
        <Col xs={24} md={8}>
          <Form.Item label="Bank Name" name="bankName">
            <AutoComplete
              placeholder="Select or type bank name"
              options={bankDirectoryOptions}
              filterOption={(inputValue, option) =>
                String(option?.value || "")
                  .toUpperCase()
                  .includes(String(inputValue || "").toUpperCase())
              }
              className="rounded-xl border-border w-full placeholder:font-normal"
            />
          </Form.Item>
        </Col>

        {/* Branch */}
        <Col xs={24} md={8}>
          <Form.Item label="Branch" name="branch">
            <Input placeholder="Branch name" className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>
        
        {/* Account Number */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Number" name="accountNumber">
            <Input placeholder="Account number" className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>

      

        {/* Account Since */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Since (Years)" name="accountSinceYears">
            <InputNumber
              placeholder="Number of years"
              min={0}
              className="w-full rounded-xl border-border placeholder:font-normal"
            />
          </Form.Item>
        </Col>

        {/* Account Type */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Type" name="accountType">
            <Select
              placeholder="Select account type"
              options={accountTypeOptions}
              className="rounded-xl border-border w-full placeholder:font-normal"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Opened In" name="openedIn">
            <Input placeholder="Auto-filled year" disabled className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>
      </Row>

      <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-4">
        <Form.Item
          name="hasAdditionalBankDetails"
          valuePropName="checked"
          className="mb-3"
        >
          <Checkbox>
            Add additional banking details (up to 3 banks total)
          </Checkbox>
        </Form.Item>

        {hasAdditionalBankDetails && (
          <div className="space-y-4">
            {additionalBankDetails.map((_, index) => (
              <div
                key={`additional-bank-${index + 2}`}
                className="rounded-xl border border-border/70 bg-card p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">
                    Bank {index + 2}
                  </div>
                  <Button
                    size="small"
                    danger
                    type="text"
                    onClick={() => handleRemoveAdditionalBank(index)}
                  >
                    Remove
                  </Button>
                </div>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="IFSC Code"
                      name={["additionalBankDetails", index, "ifsc"]}
                      normalize={(value) => normalizeIfsc(value)}
                    >
                      <Input
                        placeholder="IFSC Code"
                        maxLength={11}
                        className="rounded-xl border-border placeholder:font-normal"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Bank Name"
                      name={["additionalBankDetails", index, "bankName"]}
                    >
                      <AutoComplete
                        placeholder="Select or type bank name"
                        options={bankDirectoryOptions}
                        filterOption={(inputValue, option) =>
                          String(option?.value || "")
                            .toUpperCase()
                            .includes(String(inputValue || "").toUpperCase())
                        }
                        className="rounded-xl border-border w-full placeholder:font-normal"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Branch"
                      name={["additionalBankDetails", index, "branch"]}
                    >
                      <Input
                        placeholder="Branch name"
                        className="rounded-xl border-border placeholder:font-normal"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Account Number"
                      name={["additionalBankDetails", index, "accountNumber"]}
                    >
                      <Input
                        placeholder="Account number"
                        className="rounded-xl border-border placeholder:font-normal"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Account Since (Years)"
                      name={["additionalBankDetails", index, "accountSinceYears"]}
                    >
                      <InputNumber
                        placeholder="Number of years"
                        min={0}
                        className="w-full rounded-xl border-border placeholder:font-normal"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Opened In"
                      name={["additionalBankDetails", index, "openedIn"]}
                    >
                      <Input
                        placeholder="Auto-filled year"
                        disabled
                        className="rounded-xl border-border placeholder:font-normal"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Account Type"
                      name={["additionalBankDetails", index, "accountType"]}
                    >
                      <Select
                        placeholder="Select account type"
                        options={accountTypeOptions}
                        className="rounded-xl border-border w-full placeholder:font-normal"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            ))}

            {additionalBankDetails.length < MAX_ADDITIONAL_BANKS && (
              <Button type="dashed" onClick={handleAddAdditionalBank}>
                + Add Bank {additionalBankDetails.length + 2}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BankDetails;
