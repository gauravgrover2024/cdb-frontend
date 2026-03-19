import React, { useState, useEffect } from "react";
import { AutoComplete, DatePicker, Form, Input, Select, Spin, message } from "antd";
import dayjs from "dayjs";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import { uploadSingleFile } from "../../../../../api/uploads";
import { loansApi } from "../../../../../api/loans";
import { IRDAI_INSURANCE_COMPANIES } from "../../../../../constants/irdaiInsuranceCompanies";
import useShowroomAutoSuggest from "../../../../../hooks/useShowroomAutoSuggest";
import { useVehicleRegistrationLookup } from "../../../../../hooks/useVehicleRegistrationLookup";
import { buildVehicleRecordAutofillPatch } from "../../../../../utils/vehicleRecordAutofill";

const inputClassName = "h-10";
const textAreaClassName = "min-h-[84px]";
const SHOWROOM_AUTOSUGGEST_POPUP_WIDTH = 520;

// Helper component to handle date input formatting
// Converts incoming value (DayJS, Date, timestamp, string) to yyyy-MM-dd
// Returns yyyy-MM-dd string on change
const DateInput = ({ value, onChange, ...props }) => {
  const parsedValue = React.useMemo(() => {
    if (!value) return null;
    try {
      // If it's a DayJS object (has format function)
      if (value && typeof value.format === "function") {
        return value;
      }
      // If it's a string or number (timestamp)
      const parsed = dayjs(value);
      if (parsed.isValid()) {
        return parsed;
      }
    } catch (e) {
      console.warn("Date parsing error", e);
      return null;
    }
    return null;
  }, [value]);

  return (
    <DatePicker
      className="h-10 w-full"
      format="DD/MM/YYYY"
      value={parsedValue || null}
      onChange={(date) => onChange?.(date ? date.format("YYYY-MM-DD") : "")}
      allowClear
      {...props}
    />
  );
};

const POLICY_DURATION_OPTIONS = [
  { value: "1", label: "1yr OD + 3yr TP" },
  { value: "2", label: "2yr OD + 3yr TP" },
  { value: "3", label: "3yr OD + 3yr TP" },
];

const addYearsToIsoDate = (dateString, yearsToAdd) => {
  if (!dateString || !yearsToAdd) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + Number(yearsToAdd));
  nextDate.setDate(nextDate.getDate() - 1);

  if (Number.isNaN(nextDate.getTime())) return "";
  return nextDate.toISOString().split("T")[0];
};

const DeliverySection = ({ id, icon, iconTone, title, aside, children }) => (
  <section
    id={id}
    className="rounded-[24px] border border-border/70 bg-card p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:bg-black/20 md:p-6"
  >
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconTone}`}
        >
          <Icon name={icon} size={17} />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
            {title}
          </h2>
        </div>
      </div>
      {aside}
    </div>
    {children}
  </section>
);

const UploadField = ({
  id,
  label,
  file,
  uploading,
  onChange,
  onView,
  onRemove,
}) => (
  <div>
    <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
    {!file ? (
      <label
        htmlFor={id}
        className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm transition-all ${
          uploading
            ? "cursor-not-allowed border-slate-300/60 bg-slate-100/60 opacity-60 dark:border-slate-700 dark:bg-slate-900/50"
            : "cursor-pointer border-slate-300/80 bg-white hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-950/70 dark:hover:bg-slate-900"
        }`}
      >
        <input
          type="file"
          id={id}
          style={{ display: "none" }}
          accept="image/*,.pdf"
          onChange={onChange}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Spin size="small" />
            <span className="text-muted-foreground">Uploading...</span>
          </>
        ) : (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Icon name="Upload" size={14} />
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Upload File
            </span>
          </>
        )}
      </label>
    ) : (
      <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex max-w-[180px] items-center gap-1.5 truncate rounded-xl bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm dark:bg-slate-950/70">
            <Icon
              name="FileText"
              size={14}
              className="text-sky-600 dark:text-sky-300"
            />
            {file.name}
          </span>
          <button
            type="button"
            onClick={onView}
            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-500/10 dark:text-sky-200"
          >
            View
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200"
          >
            Remove
          </button>
        </div>
      </div>
    )}
  </div>
);

/**
 * VEHICLE DELIVERY STEP COMPONENT
 *
 * PURPOSE:
 * Manages vehicle delivery details including invoice, RC, and insurance information
 *
 * BACKEND INTEGRATION:
 * - Data Source/Update: Loan model
 * - Fields Managed:
 *   • delivery_date: Date of vehicle delivery
 *   • delivery_dealerName, delivery_dealerContactPerson, delivery_dealerContactNumber, delivery_dealerAddress
 *   • delivery_by: Who handled delivery ("Dealer" / "Autocredits")
 *   • insurance_by: Insurance handled by (default: "Autocredits India LLP")
 *   • insurance_company_name, insurance_policy_number
 *   • invoice_number, invoice_date, invoice_received_as, invoice_received_from, invoice_received_date
 *   • rc_redg_no, rc_chassis_no, rc_engine_no, rc_redg_date
 *   • rc_received_as, rc_received_from, rc_received_date
 *   • delivery_invoiceFile, delivery_rcFile: File uploads (storage URLs)
 */
const VehicleDeliveryStep = ({ form }) => {
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [rcFile, setRcFile] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(false);
  const [viewRc, setViewRc] = useState(false);

  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingRc, setUploadingRc] = useState(false);
  const rcInvReservationInFlightRef = React.useRef(false);
  const {
    options: registrationLookupOptions,
    loading: registrationLookupLoading,
    search: searchRegistrationLookup,
    resolveSelectedRecord: resolveSelectedRegistrationRecord,
  } = useVehicleRegistrationLookup({ minChars: 2, limit: 20 });

  const loanType =
    Form.useWatch("typeOfLoan", form) || form.getFieldValue("typeOfLoan");
  const isFinanced =
    Form.useWatch("isFinanced", form) || form.getFieldValue("isFinanced");
  const approvalBankName =
    Form.useWatch("approval_bankName", form) ||
    form.getFieldValue("approval_bankName");
  const rcInvStorageNumber =
    Form.useWatch("rc_inv_storage_number", form) ||
    form.getFieldValue("rc_inv_storage_number");
  const insuranceBy =
    Form.useWatch("insurance_by", form) || form.getFieldValue("insurance_by");
  const vehicleMake = Form.useWatch("vehicleMake", form);
  const loanIdValue = Form.useWatch("loanId", form);
  const loanNumber = Form.useWatch("loan_number", form);
  const createdAt = Form.useWatch("createdAt", form);
  const insuranceStartDate = Form.useWatch("insurance_policy_start_date", form);
  const insurancePolicyDuration = Form.useWatch(
    "insurance_policy_duration_od",
    form,
  );

  const isNewCar = loanType === "New Car";
  const showHypothecation = isFinanced === "Yes";
  const { options: showroomOptions, search: searchShowrooms } =
    useShowroomAutoSuggest({ limit: 25, brand: vehicleMake });

  const syncDealerFields = (patch = {}) => {
    const next = { ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, "delivery_dealerName")) {
      next.showroomDealerName = patch.delivery_dealerName;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "delivery_dealerAddress")) {
      next.showroomDealerAddress = patch.delivery_dealerAddress;
    }
    form.setFieldsValue(next);
  };

  const handleShowroomSelect = (_, option) => {
    const showroom = option?.showroom;
    if (!showroom) return;
    syncDealerFields({
      delivery_dealerName: showroom.name || "",
      delivery_dealerAddress: showroom.address || "",
    });
  };

  const handleRegistrationSelect = (_, option) => {
    const record = resolveSelectedRegistrationRecord(_, option);
    if (!record) return;
    const patch = buildVehicleRecordAutofillPatch(record, "rc_redg_no");
    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
  };

  // Pre-fill dealer details from vehicle verification
  useEffect(() => {
    const dealerName = form.getFieldValue("showroomDealerName");
    const dealerAddress = form.getFieldValue("showroomDealerAddress");

    // Only set if delivery fields are empty
    if (dealerName && !form.getFieldValue("delivery_dealerName")) {
      form.setFieldsValue({
        delivery_dealerName: dealerName,
        delivery_dealerAddress: dealerAddress,
      });
    }
  }, [form]);

  // Initialize static defaults only for genuinely new loans.
  useEffect(() => {
    const patch = {};

    if (!form.getFieldValue("insurance_by")) {
      patch.insurance_by = "Autocredits India LLP";
    }
    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
  }, [form, loanIdValue, loanNumber, createdAt]);

  // Reserve RC/INV storage number via backend atomic counter.
  useEffect(() => {
    const isEditRoute =
      typeof window !== "undefined" &&
      /\/loans\/edit\//.test(window.location.pathname);
    const isExistingLoan = Boolean(loanIdValue || loanNumber || createdAt);
    if (isEditRoute || isExistingLoan) return;
    if (form.getFieldValue("rc_inv_storage_number")) return;
    if (rcInvReservationInFlightRef.current) return;

    let cancelled = false;
    rcInvReservationInFlightRef.current = true;

    const reserveRcInvNumber = async () => {
      try {
        const response = await loansApi.getNextRcInvStorageNumber();
        const nextValue =
          response?.data?.rcInvStorageNumber ||
          response?.rcInvStorageNumber ||
          response?.data?.value ||
          "";

        if (cancelled) return;
        if (!nextValue) throw new Error("Counter service returned empty value");
        if (!form.getFieldValue("rc_inv_storage_number")) {
          form.setFieldValue("rc_inv_storage_number", String(nextValue));
        }
      } catch (error) {
        if (!cancelled) {
          message.error(
            error?.message || "Failed to reserve RC/INV storage number",
          );
        }
      } finally {
        rcInvReservationInFlightRef.current = false;
      }
    };

    void reserveRcInvNumber();
    return () => {
      cancelled = true;
    };
  }, [form, loanIdValue, loanNumber, createdAt]);

  // Sync local file state to the form (URL String only)
  useEffect(() => {
    if (invoiceFile !== undefined) {
      form.setFieldValue(
        "delivery_invoiceFile",
        invoiceFile ? invoiceFile.url : null,
      );
    }
    if (rcFile !== undefined) {
      form.setFieldValue("delivery_rcFile", rcFile ? rcFile.url : null);
    }
  }, [invoiceFile, rcFile, form]);

  // Load initial files from form if editing
  // We use a ref to track if we've initialized to avoid overwrite loops
  const initializedFiles = React.useRef(false);

  useEffect(() => {
    if (initializedFiles.current) return;

    const initialInvoice = form.getFieldValue("delivery_invoiceFile");
    const initialRc = form.getFieldValue("delivery_rcFile");

    // Helper to safely parse initial value
    const parseInitialFile = (val) => {
      if (!val) return null;
      if (typeof val === "string") {
        // It's a URL string from DB
        const name = val.split("/").pop() || "Document";
        return { name: name, size: "", url: val };
      }
      // It's an object (maybe from draft)
      return val;
    };

    if (initialInvoice) setInvoiceFile(parseInitialFile(initialInvoice));
    if (initialRc) setRcFile(parseInitialFile(initialRc));

    initializedFiles.current = true;
  }, [form]);

  useEffect(() => {
    const calculatedOdEndDate = addYearsToIsoDate(
      insuranceStartDate,
      insurancePolicyDuration,
    );

    if (
      form.getFieldValue("insurance_policy_end_date_od") !== calculatedOdEndDate
    ) {
      form.setFieldValue(
        "insurance_policy_end_date_od",
        calculatedOdEndDate || "",
      );
    }
  }, [form, insurancePolicyDuration, insuranceStartDate]);

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadingInvoice(true);
        const data = await uploadSingleFile(file);

        setInvoiceFile({
          name: file.name,
          size: formatFileSize(file.size),
          url: data.url,
        });
        message.success("Invoice uploaded successfully");
      } catch (error) {
        console.error("Upload failed", error);
        message.error("Failed to upload invoice. Please try again.");
      } finally {
        setUploadingInvoice(false);
      }
    }
  };

  const handleRcUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadingRc(true);
        const data = await uploadSingleFile(file);

        setRcFile({
          name: file.name,
          size: formatFileSize(file.size),
          url: data.url,
        });
        message.success("RC uploaded successfully");
      } catch (error) {
        console.error("Upload failed", error);
        message.error("Failed to upload RC. Please try again.");
      } finally {
        setUploadingRc(false);
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Delivery Details Section */}
      {isNewCar && (
        <DeliverySection
          id="delivery-details"
          icon="Truck"
          iconTone="bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200"
          title="Delivery Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <Form.Item
                label="Delivery Date"
                name="delivery_date"
                className="mb-0"
                getValueProps={(val) => ({ value: val })}
              >
                <DateInput />
              </Form.Item>

              <Form.Item
                label="Dealer Name"
                name="delivery_dealerName"
                className="mb-0"
              >
                <AutoComplete
                  options={showroomOptions}
                  popupMatchSelectWidth={false}
                  popupStyle={{
                    width: SHOWROOM_AUTOSUGGEST_POPUP_WIDTH,
                    maxWidth: "92vw",
                  }}
                  onSearch={searchShowrooms}
                  onSelect={handleShowroomSelect}
                  onChange={(value) =>
                    syncDealerFields({ delivery_dealerName: value || "" })
                  }
                  filterOption={(inputValue, option) =>
                    String(option?.label || "")
                      .toUpperCase()
                      .includes(String(inputValue || "").toUpperCase())
                  }
                >
                  <Input className={inputClassName} />
                </AutoComplete>
              </Form.Item>

              <Form.Item
                label="Contact Person"
                name="delivery_dealerContactPerson"
                className="mb-0"
              >
                <Input className={inputClassName} />
              </Form.Item>

              <Form.Item
                label="Contact Number"
                name="delivery_dealerContactNumber"
                className="mb-0"
              >
                <Input className={inputClassName} />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Dealer Address"
                name="delivery_dealerAddress"
                className="mb-0"
              >
                <Input.TextArea
                  className={textAreaClassName}
                  autoSize={{ minRows: 2, maxRows: 5 }}
                  onChange={(e) =>
                    syncDealerFields({
                      delivery_dealerAddress: e.target.value || "",
                    })
                  }
                />
              </Form.Item>

              <Form.Item
                label="Delivery By"
                name="delivery_by"
                className="mb-0"
              >
                <Input className={inputClassName} placeholder="e.g., Showroom Staff" />
              </Form.Item>
            </div>
          </div>
        </DeliverySection>
      )}

      {/* Insurance Details Section */}
      {isNewCar && (
        <DeliverySection
          id="delivery-insurance"
          icon="Shield"
          iconTone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
          title="Insurance Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Form.Item
                label="Insurance By"
                name="insurance_by"
                className="mb-0"
              >
                <Select
                  className="h-10"
                  placeholder="Select"
                  options={[
                    { label: "Autocredits India LLP", value: "Autocredits India LLP" },
                    { label: "Customer", value: "Customer" },
                    { label: "Showroom", value: "Showroom" },
                    { label: "Broker", value: "Broker" },
                  ]}
                  value={insuranceBy || undefined}
                  onChange={(value) => form.setFieldValue("insurance_by", value || "")}
                  allowClear
                />
              </Form.Item>

              <Form.Item
                label="Insurance Company Name"
                name="insurance_company_name"
                className="mb-0"
              >
                <AutoComplete
                  className="w-full"
                  options={IRDAI_INSURANCE_COMPANIES.map((company) => ({
                    value: company,
                    label: company,
                  }))}
                  filterOption={(input, option) =>
                    String(option?.value || "")
                      .toLowerCase()
                      .includes(String(input || "").toLowerCase())
                  }
                >
                  <Input className={inputClassName} placeholder="Start typing insurer name" />
                </AutoComplete>
              </Form.Item>

              <Form.Item
                label="Policy Number"
                name="insurance_policy_number"
                className="mb-0"
              >
                <Input className={inputClassName} placeholder="e.g., POL123456" />
              </Form.Item>

              <Form.Item
                label="Policy Start Date"
                name="insurance_policy_start_date"
                className="mb-0"
                getValueProps={(val) => ({ value: val })}
              >
                <DateInput />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Form.Item
                label="Policy Duration"
                name="insurance_policy_duration_od"
                className="mb-0"
              >
                <Select
                  className="h-10"
                  placeholder="Select duration"
                  options={POLICY_DURATION_OPTIONS}
                  allowClear
                />
              </Form.Item>

              <Form.Item
                label="Policy End Date (OD)"
                name="insurance_policy_end_date_od"
                className="mb-0"
                getValueProps={(val) => ({ value: val })}
              >
                <DateInput disabled />
              </Form.Item>
            </div>
          </div>
        </DeliverySection>
      )}

      {/* Invoice Details Section */}
      {isNewCar && (
        <DeliverySection
          id="delivery-invoice"
          icon="FileText"
          iconTone="bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200"
          title="Invoice Details"
          aside={
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
              RC/INV Storage Number: {rcInvStorageNumber || "-"}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Form.Item
                label="Invoice Number"
                name="invoice_number"
                className="mb-0"
              >
                <Input className={inputClassName} placeholder="e.g., INV-2025-001" />
              </Form.Item>

              <Form.Item
                label="Invoice Date"
                name="invoice_date"
                className="mb-0"
                getValueProps={(val) => ({ value: val })}
              >
                <DateInput />
              </Form.Item>

              <Form.Item
                label="Received As"
                name="invoice_received_as"
                className="mb-0"
              >
                <Select
                  className="h-10"
                  placeholder="Select"
                  options={[
                    { label: "Original", value: "Original" },
                    { label: "Photocopy", value: "Photocopy" },
                  ]}
                  allowClear
                />
              </Form.Item>

              <Form.Item
                label="Received From"
                name="invoice_received_from"
                className="mb-0"
              >
                <Input className={inputClassName} placeholder="e.g., Dealer" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Form.Item
                label="Received Date"
                name="invoice_received_date"
                className="mb-0"
                getValueProps={(val) => ({ value: val })}
              >
                <DateInput />
              </Form.Item>

              <UploadField
                id="invoiceUpload"
                label="Upload Invoice"
                file={invoiceFile}
                uploading={uploadingInvoice}
                onChange={handleInvoiceUpload}
                onView={() => setViewInvoice(true)}
                onRemove={() => setInvoiceFile(null)}
              />
            </div>
          </div>
        </DeliverySection>
      )}

      {/* RC Details Section */}
      <DeliverySection
        id="delivery-rc"
        icon="CreditCard"
        iconTone="bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200"
        title="RC Details"
        aside={
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
            RC/INV Storage Number: {rcInvStorageNumber || "-"}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item label="Regd No" name="rc_redg_no" className="mb-0">
              <AutoComplete
                options={registrationLookupOptions}
                onSearch={searchRegistrationLookup}
                onSelect={handleRegistrationSelect}
                filterOption={false}
                allowClear
              >
                <Input
                  className={inputClassName}
                  placeholder="e.g., DL01AB1234 (or last 4 digits)"
                  suffix={
                    registrationLookupLoading ? (
                      <span className="text-[10px] text-muted-foreground animate-pulse">
                        Searching...
                      </span>
                    ) : null
                  }
                />
              </AutoComplete>
            </Form.Item>

            <Form.Item
              label="Year of Manufacture"
              name="yearOfManufacture"
              className="mb-0"
            >
              <Input maxLength={4} className={inputClassName} placeholder="e.g., 2026" />
            </Form.Item>

            <Form.Item label="Chassis No" name="rc_chassis_no" className="mb-0">
              <Input className={inputClassName} placeholder="e.g., MA3EXXXX" />
            </Form.Item>

            <Form.Item label="Engine No" name="rc_engine_no" className="mb-0">
              <Input className={inputClassName} placeholder="e.g., K15BXXXX" />
            </Form.Item>

            <Form.Item
              label="Regd Date"
              name="rc_redg_date"
              className="mb-0"
              getValueProps={(val) => ({ value: val })}
            >
              <DateInput />
            </Form.Item>

            <Form.Item
              label="Received As"
              name="rc_received_as"
              className="mb-0"
            >
              <Select
                className="h-10"
                placeholder="Select"
                options={[
                  { label: "Original", value: "Original" },
                  { label: "Photocopy", value: "Photocopy" },
                ]}
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="Received From"
              name="rc_received_from"
              className="mb-0"
            >
              <Input className={inputClassName} placeholder="e.g., RTO Office" />
            </Form.Item>

            <Form.Item
              label="Received Date"
              name="rc_received_date"
              className="mb-0"
              getValueProps={(val) => ({ value: val })}
            >
              <DateInput />
            </Form.Item>
          </div>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 ${showHypothecation ? "xl:grid-cols-4" : "xl:grid-cols-3"} gap-4`}
          >
            {showHypothecation && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Hypothecation
                </label>
                <Input
                  className="h-10"
                  value={approvalBankName || "-"}
                  readOnly
                  prefix={<Icon name="Building2" size={14} className="text-primary" />}
                />
              </div>
            )}

            <UploadField
              id="rcUpload"
              label="Upload RC"
              file={rcFile}
              uploading={uploadingRc}
              onChange={handleRcUpload}
              onView={() => setViewRc(true)}
              onRemove={() => setRcFile(null)}
            />
          </div>
        </div>
      </DeliverySection>

      {/* Invoice Viewer Modal */}
      {viewInvoice && invoiceFile && (
        <DocumentViewerModal
          document={invoiceFile}
          title="Invoice"
          onClose={() => setViewInvoice(false)}
        />
      )}

      {/* RC Viewer Modal */}
      {viewRc && rcFile && (
        <DocumentViewerModal
          document={rcFile}
          title="RC Document"
          onClose={() => setViewRc(false)}
        />
      )}
    </div>
  );
};

const DocumentViewerModal = ({ document, title, onClose }) => {
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="Eye" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {title}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20">
          <img
            src={document.url}
            alt={document.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        <div className="flex justify-between items-center px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {document.name} • {document.size}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
              size="sm"
              onClick={() => {
                const link = document.createElement("a");
                link.href = document.url;
                link.download = document.name;
                link.click();
              }}
            >
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDeliveryStep;
