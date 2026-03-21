import React, { useEffect, useState } from "react";
import { AutoComplete, DatePicker, Form, Input, InputNumber, Select, Tooltip } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import DocumentUpload from "../../../../../components/ui/DocumentUpload";
import { formatINR, formatINRInput, parseINRInput } from "../../../../../utils/currency";
import { lookupMicrDetails, normalizeMicr } from "../../../../../utils/ifscLookup";
import dayjs from "dayjs";
import { useBankDirectoryOptions } from "../../../../../hooks/useBankDirectoryOptions";

const { Option } = Select;
const asDayjs = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const EntryField = ({ label, children }) => (
  <div className="space-y-1">
    <div className="text-[13px] text-muted-foreground">{label}</div>
    {children}
  </div>
);

const INSTRUMENT_TYPE_OPTIONS = [
  { value: "Cheque", icon: "CreditCard", label: "Cheque", subLabel: "PDC / security" },
  { value: "ECS", icon: "Zap", label: "ECS", subLabel: "Bank mandate" },
  { value: "SI", icon: "RefreshCw", label: "SI", subLabel: "Standing instruction" },
  { value: "NACH", icon: "Landmark", label: "NACH", subLabel: "E-mandate" },
];

const MANDATE_SIGNED_BY_OPTIONS = ["Applicant", "Co-applicant", "Guarantor"];

const ChequeHeader = ({ id, index, isExpanded, onToggle, onDelete, onCopy, isFirst, form }) => {
  const number = Form.useWatch(`cheque_${id}_number`, form);
  const amount = Form.useWatch(`cheque_${id}_amount`, form);
  const tag = Form.useWatch(`cheque_${id}_tag`, form);
  const hasSummary = Boolean(number || tag || Number(amount || 0) > 0);

  return (
    <div
      className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${
        isExpanded ? "bg-primary/5 border-b border-border" : "bg-muted/30 hover:bg-muted/50"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={18} className="text-primary" />
        <div className="flex items-center gap-2 min-w-0">
           <span className="font-semibold text-sm">Cheque {index + 1}</span>
           {!isExpanded && hasSummary && (
             <div className="flex items-center gap-2 h-5 min-w-0">
               <div className="w-[1px] h-3 bg-border" />
               <div className="flex gap-2 text-[10px] font-semibold text-muted-foreground min-w-0 flex-wrap">
                 {number && (
                   <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary max-w-[110px] truncate">
                     <Icon name="Hash" size={10} className="text-primary" />
                     <span className="truncate">{number}</span>
                   </span>
                 )}
                 {tag && (
                   <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 max-w-[120px] truncate">
                     <Icon name="Tag" size={10} className="text-primary" />
                     <span className="truncate">{tag}</span>
                   </span>
                 )}
                 {amount && (
                   <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                     <Icon name="IndianRupee" size={10} className="text-emerald-600 dark:text-emerald-300" />
                     {formatINR(amount).replace(/^₹\s?/, "")}
                   </span>
                 )}
               </div>
             </div>
           )}
        </div>
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {!isFirst && (
          <Tooltip title="Copy details from first cheque">
            <button
              onClick={onCopy}
              className="px-2 py-1 text-[10px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              Copy 1st
            </button>
          </Tooltip>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-colors"
        >
          <Icon name="Trash2" size={14} className="text-destructive" />
        </button>
      </div>
    </div>
  );
};

const PostFileInstrumentDetails = ({ form }) => {
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();
  const loanId = Form.useWatch("loanId", form);
  const instrumentType = Form.useWatch("instrumentType", form);
  const siAccountNumber = Form.useWatch("si_accountNumber", form);
  const nachAccountNumber = Form.useWatch("nach_accountNumber", form);
  const ecsAccountNumber = Form.useWatch("ecs_accountNumber", form);
  const ecsMicrCode = Form.useWatch("ecs_micrCode", form);
  const ecsBankName = Form.useWatch("ecs_bankName", form);
  const cheque1Number = Form.useWatch("cheque_1_number", form);
  const cheque1BankName = Form.useWatch("cheque_1_bankName", form);
  const cheque1AccountNumber = Form.useWatch("cheque_1_accountNumber", form);
  const [cheques, setCheques] = useState([{ id: 1 }]);
  const [expandedCheque, setExpandedCheque] = useState(1);
  const resolvedInstrumentType =
    instrumentType ||
    (nachAccountNumber ? "NACH" : "") ||
    (siAccountNumber ? "SI" : "") ||
    (ecsAccountNumber || ecsBankName ? "ECS" : "") ||
    (cheque1Number || cheque1BankName || cheque1AccountNumber ? "Cheque" : "");

  // Sync initialization
  useEffect(() => {
    const patch = {};
    const detectedInstrumentType =
      form.getFieldValue("instrumentType") ||
      (form.getFieldValue("nach_accountNumber") ? "NACH" : undefined) ||
      (form.getFieldValue("si_accountNumber") ? "SI" : undefined) ||
      (form.getFieldValue("ecs_accountNumber") || form.getFieldValue("ecs_bankName") ? "ECS" : undefined) ||
      (() => {
        for (let i = 1; i <= 20; i += 1) {
          if (
            form.getFieldValue(`cheque_${i}_number`) ||
            form.getFieldValue(`cheque_${i}_bankName`) ||
            form.getFieldValue(`cheque_${i}_accountNumber`)
          ) {
            return "Cheque";
          }
        }
        return undefined;
      })();

    if (detectedInstrumentType && detectedInstrumentType !== form.getFieldValue("instrumentType")) {
      patch.instrumentType = detectedInstrumentType;
    }

    const existing = [];
    for (let i = 1; i <= 20; i++) {
      if (
        form.getFieldValue(`cheque_${i}_number`) ||
        form.getFieldValue(`cheque_${i}_bankName`) ||
        form.getFieldValue(`cheque_${i}_accountNumber`) ||
        form.getFieldValue(`cheque_${i}_date`) ||
        form.getFieldValue(`cheque_${i}_amount`)
      ) {
        existing.push({ id: i });
      }
    }
    if (existing.length > 0) {
      setCheques(existing);
      setExpandedCheque(existing[0].id);
    }
    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
  }, [
    form,
    loanId,
    instrumentType,
    nachAccountNumber,
    siAccountNumber,
    ecsAccountNumber,
    ecsMicrCode,
    ecsBankName,
    cheque1Number,
    cheque1BankName,
    cheque1AccountNumber,
  ]);

  useEffect(() => {
    const normalized = normalizeMicr(ecsMicrCode);
    if (String(ecsMicrCode || "") !== normalized) {
      form.setFieldsValue({ ecs_micrCode: normalized });
      return;
    }
    if (normalized.length !== 9) return;

    let cancelled = false;
    const resolveMicr = async () => {
      try {
        const details = await lookupMicrDetails(normalized);
        if (cancelled || !details) return;
        if (details.bankName && !String(form.getFieldValue("ecs_bankName") || "").trim()) {
          form.setFieldsValue({ ecs_bankName: details.bankName });
        }
      } catch (error) {
        console.error("MICR lookup failed", error);
      }
    };

    const timer = setTimeout(resolveMicr, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ecsMicrCode, form]);

  // Calculate Total Cheque Amount
  const totalAmount = React.useMemo(() => {
    if (!(resolvedInstrumentType === "Cheque" || resolvedInstrumentType === "ECS")) return 0;
    return cheques.reduce((sum, c) => {
      const val = form.getFieldValue(`cheque_${c.id}_amount`);
      return sum + (Number(val) || 0);
    }, 0);
  }, [cheques, resolvedInstrumentType, form]);

  const addCheque = () => {
    const newId = Math.max(...cheques.map((c) => c.id), 0) + 1;
    setCheques([...cheques, { id: newId }]);
    setExpandedCheque(newId);
  };

  const deleteCheque = (id) => {
    if (cheques.length > 1) {
      setCheques(cheques.filter((c) => c.id !== id));
      const fields = ["number", "bankName", "accountNumber", "date", "amount", "tag", "favouring", "signedBy"];
      const updates = {};
      fields.forEach(f => {
        updates[`cheque_${id}_${f}`] = undefined;
      });
      form.setFieldsValue(updates);
    }
  };

  const copyCheque = (fromId, toId) => {
    const fields = ["bankName", "accountNumber", "date", "amount", "tag", "favouring", "signedBy"];
    const values = {};
    fields.forEach((f) => {
      values[`cheque_${toId}_${f}`] = form.getFieldValue(`cheque_${fromId}_${f}`);
    });
    form.setFieldsValue(values);
  };

  return (
    <div className="h-full flex flex-col rounded-2xl border border-border bg-[#f9fafb] dark:bg-slate-950/35 p-4 md:p-5">
      <Form.Item name="instrumentType" hidden><input /></Form.Item>
      <Form.Item name="si_accountNumber" hidden><input /></Form.Item>
      <Form.Item name="si_signedBy" hidden><input /></Form.Item>
      <Form.Item name="si_image" hidden><input /></Form.Item>
      <Form.Item name="nach_accountNumber" hidden><input /></Form.Item>
      <Form.Item name="nach_signedBy" hidden><input /></Form.Item>
      <Form.Item name="nach_image" hidden><input /></Form.Item>
      <Form.Item name="ecs_micrCode" hidden><input /></Form.Item>
      <Form.Item name="ecs_bankName" hidden><input /></Form.Item>
      <Form.Item name="ecs_accountNumber" hidden><input /></Form.Item>
      <Form.Item name="ecs_date" hidden><input /></Form.Item>
      <Form.Item name="ecs_amount" hidden><input /></Form.Item>
      <Form.Item name="ecs_tag" hidden><input /></Form.Item>
      <Form.Item name="ecs_favouring" hidden><input /></Form.Item>
      <Form.Item name="ecs_signedBy" hidden><input /></Form.Item>
      <Form.Item name="cheque_1_number" hidden><input /></Form.Item>
      <Form.Item name="cheque_1_bankName" hidden><input /></Form.Item>
      <Form.Item name="cheque_1_accountNumber" hidden><input /></Form.Item>
      <Form.Item name="cheque_1_date" hidden><input /></Form.Item>
      <Form.Item name="cheque_1_amount" hidden><input /></Form.Item>
      <Form.Item name="cheque_1_tag" hidden><input /></Form.Item>
      <Form.Item name="cheque_1_favouring" hidden><input /></Form.Item>
      <Form.Item name="cheque_1_signedBy" hidden><input /></Form.Item>

      {/* content */}
      <div className="flex-1 overflow-y-auto text-sm space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Repayment Instrument
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">
                Instrument Controls
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Configure mode, fill details, and upload mandate documents.
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {INSTRUMENT_TYPE_OPTIONS.map((type) => {
              const isActive = resolvedInstrumentType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => form.setFieldsValue({ instrumentType: type.value })}
                  className={`rounded-full border px-3 py-1.5 text-[11px] transition-all inline-flex items-center gap-1.5 ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  <Icon name={type.icon} size={12} />
                  <span className="font-medium">{type.label}</span>
                  <span className="opacity-75">{type.subLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cheque Section */}
        {resolvedInstrumentType === "Cheque" && (
          <div className="space-y-4 rounded-2xl border border-border bg-background p-4 md:p-5">
             <div className="flex items-center justify-between">
                <h3 className="text-sm md:text-base font-semibold text-foreground">
                  Cheque Configuration
                </h3>
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                   <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-200">
                     Total: {formatINR(totalAmount)}
                   </span>
                </div>
             </div>

            <div className="space-y-3">
              {cheques.map((cheque, index) => (
                <div
                  key={cheque.id}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    expandedCheque === cheque.id ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border"
                  }`}
                >
                  <Form.Item name={`cheque_${cheque.id}_number`} hidden><input /></Form.Item>
                  <Form.Item name={`cheque_${cheque.id}_amount`} hidden><input /></Form.Item>
                  <Form.Item name={`cheque_${cheque.id}_tag`} hidden><input /></Form.Item>
                  <ChequeHeader
                    id={cheque.id}
                    index={index}
                    isExpanded={expandedCheque === cheque.id}
                    onToggle={() => setExpandedCheque(expandedCheque === cheque.id ? null : cheque.id)}
                    onDelete={() => deleteCheque(cheque.id)}
                    onCopy={() => copyCheque(cheques[0].id, cheque.id)}
                    isFirst={index === 0}
                    form={form}
                  />

                  {expandedCheque === cheque.id && (
                    <div className="p-4 bg-muted/20 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <EntryField label="Cheque No">
                          <Form.Item name={`cheque_${cheque.id}_number`} className="mb-0">
                            <Input placeholder="6-digit No" maxLength={6} className="bg-background border-border font-medium h-10" />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Bank Name">
                          <Form.Item name={`cheque_${cheque.id}_bankName`} className="mb-0">
                            <AutoComplete
                              options={bankDirectoryOptions}
                              placeholder="e.g. HDFC Bank"
                              className="w-full"
                              filterOption={(inputValue, option) =>
                                String(option?.value || "")
                                  .toUpperCase()
                                  .includes(String(inputValue || "").toUpperCase())
                              }
                            />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Acc Number">
                          <Form.Item name={`cheque_${cheque.id}_accountNumber`} className="mb-0">
                            <Input placeholder="Acc No" className="bg-background border-border font-medium h-10" />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Cheque Date">
                          <Form.Item name={`cheque_${cheque.id}_date`} className="mb-0">
                            <DatePicker className="w-full bg-background border-border font-medium h-10" format="DD-MM-YYYY" getValueProps={(value) => ({ value: asDayjs(value) })} />
                          </Form.Item>
                        </EntryField>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <EntryField label="Amount">
                          <Form.Item name={`cheque_${cheque.id}_amount`} className="mb-0">
                            <InputNumber 
                              className="w-full bg-background border-border font-medium h-10" 
                              placeholder="₹ 0"
                              formatter={value => formatINRInput(value)}
                              parser={value => parseINRInput(value)}
                            />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Purpose / Tag">
                          <Form.Item name={`cheque_${cheque.id}_tag`} className="mb-0">
                            <Input placeholder="e.g. Security, EMI" className="bg-background border-border font-medium h-10" />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Favouring">
                          <Form.Item name={`cheque_${cheque.id}_favouring`} className="mb-0">
                            <Input placeholder="Beneficiary Name" className="bg-background border-border font-medium h-10" />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Signed By">
                          <Form.Item name={`cheque_${cheque.id}_signedBy`} className="mb-0">
                            <Select className="w-full font-medium h-10" placeholder="Select Entity">
                              <Option value="Applicant">Applicant</Option>
                              <Option value="Co-applicant">Co-applicant</Option>
                              <Option value="Guarantor">Guarantor</Option>
                            </Select>
                          </Form.Item>
                        </EntryField>
                      </div>

                      {/* Cheque Image Upload */}
                      <div className="mt-4 p-4 bg-foreground/5 rounded-xl border border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon name="Image" size={16} className="text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Document Verification</span>
                        </div>
                        <Form.Item name={`cheque_${cheque.id}_image`} className="mb-0">
                          <DocumentUpload
                            uploadTitle="Upload Cheque Image"
                            viewerTitle="Post-File Document Viewer"
                            docTag="Cheque Image"
                          />
                        </Form.Item>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={addCheque} variant="outline" className="w-full border-dashed border-2 py-6 rounded-2xl hover:border-primary hover:text-primary transition-all group">
              <div className="flex flex-col items-center">
                 <Icon name="Plus" size={20} className="mb-1 text-primary group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-semibold">Add Another Instrument</span>
              </div>
            </Button>
          </div>
        )}

        {/* ECS Section */}
        {resolvedInstrumentType === "ECS" && (
          <div className="space-y-4 rounded-2xl border border-border bg-background p-4 md:p-5">
            <h3 className="text-sm md:text-base font-semibold text-foreground">ECS Configuration</h3>

            <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <EntryField label="MICR Code">
                  <Form.Item
                    name="ecs_micrCode"
                    className="mb-0"
                    normalize={(value) => normalizeMicr(value)}
                  >
                    <Input placeholder="9-digit MICR" maxLength={9} className="bg-background border-border font-medium h-10" />
                  </Form.Item>
                </EntryField>

                <EntryField label="Bank Name">
                  <Form.Item name="ecs_bankName" className="mb-0">
                    <AutoComplete
                      options={bankDirectoryOptions}
                      placeholder="e.g. HDFC Bank"
                      className="w-full"
                      filterOption={(inputValue, option) =>
                        String(option?.value || "")
                          .toUpperCase()
                          .includes(String(inputValue || "").toUpperCase())
                      }
                    />
                  </Form.Item>
                </EntryField>

                <EntryField label="Acc Number">
                  <Form.Item name="ecs_accountNumber" className="mb-0">
                    <Input placeholder="Acc No" className="bg-background border-border font-medium h-10" />
                  </Form.Item>
                </EntryField>

                <EntryField label="Start Date">
                  <Form.Item name="ecs_date" className="mb-0">
                    <DatePicker className="w-full bg-background border-border font-medium h-10" format="DD-MM-YYYY" getValueProps={(value) => ({ value: asDayjs(value) })} />
                  </Form.Item>
                </EntryField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <EntryField label="Max Amount">
                  <Form.Item name="ecs_amount" className="mb-0">
                    <InputNumber 
                      className="w-full bg-background border-border font-medium h-10" 
                      placeholder="₹ 0"
                      formatter={value => formatINRInput(value)}
                      parser={value => parseINRInput(value)}
                    />
                  </Form.Item>
                </EntryField>

                <EntryField label="Type / Tag">
                  <Form.Item name="ecs_tag" className="mb-0">
                    <Input placeholder="e.g. EMI Mandate" className="bg-background border-border font-medium h-10" />
                  </Form.Item>
                </EntryField>

                <EntryField label="Favouring">
                  <Form.Item name="ecs_favouring" className="mb-0">
                    <Input placeholder="Beneficiary Name" className="bg-background border-border font-medium h-10" />
                  </Form.Item>
                </EntryField>

                <EntryField label="Signed By">
                  <Form.Item name="ecs_signedBy" className="mb-0">
                    <Select className="w-full font-medium h-10" placeholder="Select Entity">
                      <Option value="Applicant">Applicant</Option>
                      <Option value="Co-applicant">Co-applicant</Option>
                      <Option value="Guarantor">Guarantor</Option>
                    </Select>
                  </Form.Item>
                </EntryField>
              </div>

              {/* ECS Document Upload */}
              <div className="mt-4 p-4 bg-foreground/5 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Image" size={16} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Document Verification</span>
                </div>
                <Form.Item name="ecs_image" className="mb-0">
                  <DocumentUpload
                    uploadTitle="Upload ECS Form"
                    viewerTitle="Post-File Document Viewer"
                    docTag="ECS Form"
                  />
                </Form.Item>
              </div>
            </div>
          </div>
        )}

        {/* ECS supporting cheques (shown below ECS config) */}
        {resolvedInstrumentType === "ECS" && (
          <div className="space-y-4 rounded-2xl border border-border bg-background p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm md:text-base font-semibold text-foreground">Supporting Cheque Configuration</h3>
              <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                <span className="text-[10px] font-semibold text-primary">
                  Total: {formatINR(totalAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {cheques.map((cheque, index) => (
                <div
                  key={cheque.id}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    expandedCheque === cheque.id ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border"
                  }`}
                >
                  <Form.Item name={`cheque_${cheque.id}_number`} hidden><input /></Form.Item>
                  <Form.Item name={`cheque_${cheque.id}_amount`} hidden><input /></Form.Item>
                  <Form.Item name={`cheque_${cheque.id}_tag`} hidden><input /></Form.Item>
                  <ChequeHeader
                    id={cheque.id}
                    index={index}
                    isExpanded={expandedCheque === cheque.id}
                    onToggle={() => setExpandedCheque(expandedCheque === cheque.id ? null : cheque.id)}
                    onDelete={() => deleteCheque(cheque.id)}
                    onCopy={() => copyCheque(cheques[0].id, cheque.id)}
                    isFirst={index === 0}
                    form={form}
                  />

                  {expandedCheque === cheque.id && (
                    <div className="p-4 bg-muted/20 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <EntryField label="Cheque No">
                          <Form.Item name={`cheque_${cheque.id}_number`} className="mb-0">
                            <Input placeholder="6-digit No" maxLength={6} className="bg-background border-border font-medium h-10" />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Bank Name">
                          <Form.Item name={`cheque_${cheque.id}_bankName`} className="mb-0">
                            <AutoComplete
                              options={bankDirectoryOptions}
                              placeholder="e.g. HDFC Bank"
                              className="w-full"
                              filterOption={(inputValue, option) =>
                                String(option?.value || "")
                                  .toUpperCase()
                                  .includes(String(inputValue || "").toUpperCase())
                              }
                            />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Acc Number">
                          <Form.Item name={`cheque_${cheque.id}_accountNumber`} className="mb-0">
                            <Input placeholder="Acc No" className="bg-background border-border font-medium h-10" />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Cheque Date">
                          <Form.Item name={`cheque_${cheque.id}_date`} className="mb-0">
                            <DatePicker className="w-full bg-background border-border font-medium h-10" format="DD-MM-YYYY" getValueProps={(value) => ({ value: asDayjs(value) })} />
                          </Form.Item>
                        </EntryField>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <EntryField label="Amount">
                          <Form.Item name={`cheque_${cheque.id}_amount`} className="mb-0">
                            <InputNumber
                              className="w-full bg-background border-border font-medium h-10"
                              placeholder="₹ 0"
                              formatter={value => formatINRInput(value)}
                              parser={value => parseINRInput(value)}
                            />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Purpose / Tag">
                          <Form.Item name={`cheque_${cheque.id}_tag`} className="mb-0">
                            <Input placeholder="e.g. Security, EMI" className="bg-background border-border font-medium h-10" />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Favouring">
                          <Form.Item name={`cheque_${cheque.id}_favouring`} className="mb-0">
                            <Input placeholder="Beneficiary Name" className="bg-background border-border font-medium h-10" />
                          </Form.Item>
                        </EntryField>

                        <EntryField label="Signed By">
                          <Form.Item name={`cheque_${cheque.id}_signedBy`} className="mb-0">
                            <Select className="w-full font-medium h-10" placeholder="Select Entity">
                              <Option value="Applicant">Applicant</Option>
                              <Option value="Co-applicant">Co-applicant</Option>
                              <Option value="Guarantor">Guarantor</Option>
                            </Select>
                          </Form.Item>
                        </EntryField>
                      </div>

                      <div className="mt-4 p-4 bg-foreground/5 rounded-xl border border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon name="Image" size={16} className="text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Document Verification</span>
                        </div>
                        <Form.Item name={`cheque_${cheque.id}_image`} className="mb-0">
                          <DocumentUpload
                            uploadTitle="Upload Cheque Image"
                            viewerTitle="Post-File Document Viewer"
                            docTag="Cheque Image"
                          />
                        </Form.Item>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={addCheque} variant="outline" className="w-full border-dashed border-2 py-6 rounded-2xl hover:border-primary hover:text-primary transition-all group">
              <div className="flex flex-col items-center">
                 <Icon name="Plus" size={20} className="mb-1 text-primary group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-semibold">Add Another Instrument</span>
              </div>
            </Button>
          </div>
        )}

        {/* SI / NACH Section */}
        {(resolvedInstrumentType === "SI" || resolvedInstrumentType === "NACH") && (
          <div className="space-y-4 rounded-2xl border border-border bg-background p-4 md:p-5">
            <h3 className="text-sm md:text-base font-semibold text-foreground">
              {resolvedInstrumentType === "NACH"
                ? "NACH / E-mandate Details"
                : "Standing Instruction (SI) Details"}
            </h3>

            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EntryField label="Account Number">
                  <Form.Item
                    name={resolvedInstrumentType === "NACH" ? "nach_accountNumber" : "si_accountNumber"}
                    className="mb-0"
                  >
                    <Input placeholder="Internal Bank Acc No" className="bg-background border-border font-medium h-10" />
                  </Form.Item>
                </EntryField>

                <EntryField label="Signed By">
                  <Form.Item
                    name={resolvedInstrumentType === "NACH" ? "nach_signedBy" : "si_signedBy"}
                    className="mb-0"
                  >
                    <Select className="w-full font-medium h-10" placeholder="Select Entity">
                      {MANDATE_SIGNED_BY_OPTIONS.map((entity) => (
                        <Option key={entity} value={entity}>
                          {entity}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </EntryField>
              </div>

              {/* SI Document Upload */}
              <div className="mt-4 p-4 bg-foreground/5 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Image" size={16} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Document Verification</span>
                </div>
                <Form.Item
                  name={resolvedInstrumentType === "NACH" ? "nach_image" : "si_image"}
                  className="mb-0"
                >
                  <DocumentUpload
                    uploadTitle={
                      resolvedInstrumentType === "NACH"
                        ? "Upload NACH / E-mandate Document"
                        : "Upload SI Document"
                    }
                    viewerTitle="Post-File Document Viewer"
                    docTag={resolvedInstrumentType === "NACH" ? "NACH Document" : "SI Document"}
                  />
                </Form.Item>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
  );
};

export default PostFileInstrumentDetails;
