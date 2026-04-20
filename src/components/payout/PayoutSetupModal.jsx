import React, { useEffect, useState } from "react";
import { Input, InputNumber, message, Modal, Select } from "antd";
import { banksApi } from "../../api/banks";
import { insuranceApi } from "../../api/insurance";

const PayoutSetupModal = ({ open, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [options, setOptions] = useState([]);
  const [draft, setDraft] = useState({
    companyName: "",
    payoutPercentage: 10,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    (async () => {
      try {
        const res = await banksApi.getAll({ limit: 10000, sortBy: "name" });
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
            ? res.data.data
            : [];
        if (ignore) return;
        const names = Array.from(
          new Set(
            rows
              .map((row) => String(row?.name || row?.bankName || "").trim())
              .filter(Boolean),
          ),
        );
        setOptions(names);
      } catch {
        if (!ignore) setOptions([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [open]);

  const handleSave = async () => {
    const companyName = String(draft.companyName || "").trim();
    const payoutPercentage = Number(draft.payoutPercentage || 0);
    if (!companyName) {
      message.error("Please select bank/company name");
      return;
    }
    if (!Number.isFinite(payoutPercentage) || payoutPercentage < 0 || payoutPercentage > 100) {
      message.error("Payout % should be between 0 and 100");
      return;
    }
    if (!draft.effectiveFrom) {
      message.error("Please select effective date");
      return;
    }
    try {
      setIsSaving(true);
      await insuranceApi.upsertPayoutRate({
        companyName,
        payoutPercentage,
        effectiveFrom: draft.effectiveFrom,
        notes: String(draft.notes || "").trim(),
      });
      message.success("Payout rate saved");
      onClose?.();
    } catch (err) {
      message.error(err?.message || "Failed to save payout rate");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Set Payout Rate"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save Payout"
      confirmLoading={isSaving}
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bank / Company Name
          </p>
          <Select
            showSearch
            value={draft.companyName || undefined}
            options={options.map((name) => ({ label: name, value: name }))}
            onChange={(v) => setDraft((prev) => ({ ...prev, companyName: v || "" }))}
            placeholder="Select company/bank"
            style={{ width: "100%" }}
            filterOption={(input, option) =>
              String(option?.label || "")
                .toLowerCase()
                .includes(String(input || "").toLowerCase())
            }
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payout Percentage
          </p>
          <InputNumber
            min={0}
            max={100}
            value={Number(draft.payoutPercentage || 0)}
            onChange={(v) =>
              setDraft((prev) => ({ ...prev, payoutPercentage: Number(v || 0) }))
            }
            addonAfter="%"
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Effective From
          </p>
          <Input
            type="date"
            value={draft.effectiveFrom}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, effectiveFrom: e.target.value }))
            }
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </p>
          <Input.TextArea
            rows={2}
            value={draft.notes}
            onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional note"
          />
        </div>
      </div>
    </Modal>
  );
};

export default PayoutSetupModal;
