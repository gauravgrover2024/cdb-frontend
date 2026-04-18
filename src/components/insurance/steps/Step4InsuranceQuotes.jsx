import React from "react";
import {
  Button,
  Checkbox,
  Col,
  Divider,
  Empty,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { PlusCircle, RotateCcw, ShieldCheck } from "lucide-react";
import PlanFeaturesModalBody from "../PlanFeaturesModalBody";
import { addOnCatalog } from "./allSteps";

const { Text } = Typography;

// ─── Main component ───────────────────────────────────────────────────────────
const Step4InsuranceQuotes = ({
  quoteDraft,
  setQuoteDraft,
  quoteComputed,
  quotes,
  quoteRows,
  acceptedQuoteId,
  acceptedQuote,
  showErrors,
  addQuote,
  acceptQuote,
  initialQuoteDraft,
  mapQuoteToDraft,
  durationOptions,
  toINR,
  getQuoteRowId,
  computeQuoteBreakupFromRow,
  formatStoredOrComputedIdv,
  formatStoredOrComputedPremium,
  planFeaturesModal,
  setPlanFeaturesModal,
}) => {
  const selectedAddOnNames = addOnCatalog.filter(
    (n) => quoteDraft.addOnsIncluded?.[n],
  );

  // ── Preview card computed values ─────────────────────────────────────────
  const tierInfo =
    selectedAddOnNames.length === 0
      ? { label: "Basic", color: "bg-white/10 text-violet-200" }
      : selectedAddOnNames.length <= 3
        ? { label: "Standard", color: "bg-blue-400/25 text-blue-100" }
        : selectedAddOnNames.length <= 6
          ? { label: "Premium", color: "bg-violet-400/25 text-violet-100" }
          : { label: "Elite", color: "bg-amber-400/25 text-amber-200" };

  // Form completeness (out of ~8 key fields)
  const filledFields = [
    quoteDraft.insuranceCompany,
    quoteDraft.coverageType,
    quoteDraft.policyDuration,
    quoteDraft.vehicleIdv > 0,
    quoteDraft.odAmount > 0 || quoteDraft.thirdPartyAmount > 0,
    quoteDraft.ncbDiscount >= 0,
  ].filter(Boolean).length;
  const completePct = Math.round((filledFields / 6) * 100);

  const resetDraft = () =>
    setQuoteDraft({
      ...initialQuoteDraft,
      addOns: { ...initialQuoteDraft.addOns },
      addOnsIncluded: { ...initialQuoteDraft.addOnsIncluded },
    });

  return (
    <div className="flex flex-col gap-8">
      {/* ════════════════════════════════════════════════════════════════════
          Section 1 — Quote Builder  (left: form | right: live preview)
         ════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <ShieldCheck size={18} className="text-violet-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Add New Quote
          </h3>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row">
          {/* ── LEFT COLUMN: form + add-ons + actions ── */}
          <div className="min-w-0 flex-1 p-6 lg:border-r lg:border-slate-100 lg:dark:border-slate-800">
            {/* ─ Primary fields ─────────────────────────────────────── */}
            <Row gutter={[16, 16]}>
              {/* Insurance Company */}
              <Col xs={24} md={12}>
                <Text
                  strong
                  className="text-[11px] uppercase tracking-wider text-slate-500"
                >
                  Insurance Company *
                </Text>
                <Input
                  value={quoteDraft.insuranceCompany}
                  onChange={(e) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      insuranceCompany: e.target.value,
                    }))
                  }
                  style={{ marginTop: 6 }}
                  placeholder="e.g. HDFC ERGO"
                />
              </Col>

              {/* Coverage Type */}
              <Col xs={24} md={12}>
                <Text
                  strong
                  className="text-[11px] uppercase tracking-wider text-slate-500"
                >
                  Coverage Type *
                </Text>
                <Select
                  value={quoteDraft.coverageType}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      coverageType: v,
                      policyDuration: "",
                    }))
                  }
                  style={{ width: "100%", marginTop: 6 }}
                  options={[
                    { label: "Comprehensive", value: "Comprehensive" },
                    { label: "Stand Alone OD", value: "Stand Alone OD" },
                    { label: "Third Party", value: "Third Party" },
                  ]}
                  placeholder="Select type"
                />
              </Col>

              {/* Policy Duration */}
              <Col xs={24} md={12}>
                <Text
                  strong
                  className="text-[11px] uppercase tracking-wider text-slate-500"
                >
                  Policy Duration *
                </Text>
                <Select
                  value={quoteDraft.policyDuration || undefined}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({ ...p, policyDuration: v }))
                  }
                  style={{ width: "100%", marginTop: 6 }}
                  options={
                    quoteDraft.coverageType === "Comprehensive"
                      ? [
                          {
                            label: "1yr OD + 1yr TP",
                            value: "1yr OD + 1yr TP",
                          },
                          {
                            label: "1yr OD + 3yr TP",
                            value: "1yr OD + 3yr TP",
                          },
                          {
                            label: "2yr OD + 3yr TP",
                            value: "2yr OD + 3yr TP",
                          },
                          {
                            label: "3yr OD + 3yr TP",
                            value: "3yr OD + 3yr TP",
                          },
                        ]
                      : quoteDraft.coverageType === "Stand Alone OD"
                        ? [
                            { label: "1 Year", value: "1 Year" },
                            { label: "2 Years", value: "2 Years" },
                            { label: "3 Years", value: "3 Years" },
                          ]
                        : quoteDraft.coverageType === "Third Party"
                          ? [
                              { label: "1 Year", value: "1 Year" },
                              { label: "2 Years", value: "2 Years" },
                              { label: "3 Years", value: "3 Years" },
                            ]
                          : []
                  }
                  placeholder={
                    quoteDraft.coverageType
                      ? "Select duration"
                      : "Select coverage type first"
                  }
                  disabled={!quoteDraft.coverageType}
                />
              </Col>

              {/* NCB */}
              <Col xs={24} md={12}>
                <Text
                  strong
                  className="text-[11px] uppercase tracking-wider text-slate-500"
                >
                  NCB Discount (%)
                </Text>
                <InputNumber
                  min={0}
                  max={100}
                  value={Number(quoteDraft.ncbDiscount || 0)}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      ncbDiscount: Number(v || 0),
                    }))
                  }
                  style={{ width: "100%", marginTop: 6 }}
                  addonAfter="%"
                />
              </Col>
            </Row>

            {/* ─ IDV fields ──────────────────────────────────────────── */}
            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                IDV (Insured Declared Value)
              </p>
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                  <Text className="text-[11px] text-slate-500">
                    Vehicle IDV (₹)
                  </Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.vehicleIdv || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        vehicleIdv: Number(v || 0),
                      }))
                    }
                    style={{ width: "100%", marginTop: 4 }}
                    controls={false}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text className="text-[11px] text-slate-500">
                    CNG IDV (₹)
                  </Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.cngIdv || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({ ...p, cngIdv: Number(v || 0) }))
                    }
                    style={{ width: "100%", marginTop: 4 }}
                    controls={false}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text className="text-[11px] text-slate-500">
                    Accessories IDV (₹)
                  </Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.accessoriesIdv || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        accessoriesIdv: Number(v || 0),
                      }))
                    }
                    style={{ width: "100%", marginTop: 4 }}
                    controls={false}
                  />
                </Col>
              </Row>
            </div>

            {/* ─ Premium fields ──────────────────────────────────────── */}
            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Premium Amounts
              </p>
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                  <Text className="text-[11px] text-slate-500">
                    OD Premium (₹)
                  </Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.odAmount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        odAmount: Number(v || 0),
                      }))
                    }
                    style={{ width: "100%", marginTop: 4 }}
                    controls={false}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text className="text-[11px] text-slate-500">
                    3rd Party (₹)
                  </Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.thirdPartyAmount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        thirdPartyAmount: Number(v || 0),
                      }))
                    }
                    style={{ width: "100%", marginTop: 4 }}
                    controls={false}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text className="text-[11px] text-slate-500">
                    Bulk Add-ons (₹)
                  </Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.addOnsAmount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        addOnsAmount: Number(v || 0),
                      }))
                    }
                    style={{ width: "100%", marginTop: 4 }}
                    controls={false}
                  />
                </Col>
              </Row>
            </div>

            {/* ─ Add-ons catalog ─────────────────────────────────────── */}
            <Divider
              className="border-slate-100 dark:border-slate-800"
              style={{ marginBlock: 20 }}
            />
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              {/* Add-ons header */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Individual Add-ons{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    ₹0 = included free; enter amount for charged coverage
                  </p>
                </div>
                <Space size={6}>
                  <Button
                    size="small"
                    className="!border-emerald-500 !text-emerald-600 text-[10px] h-6"
                    onClick={() =>
                      setQuoteDraft((p) => ({
                        ...p,
                        addOns: addOnCatalog.reduce(
                          (acc, n) => ({ ...acc, [n]: 0 }),
                          {},
                        ),
                        addOnsIncluded: addOnCatalog.reduce(
                          (acc, n) => ({ ...acc, [n]: true }),
                          {},
                        ),
                      }))
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    danger
                    className="text-[10px] h-6"
                    onClick={() =>
                      setQuoteDraft((p) => ({
                        ...p,
                        addOns: addOnCatalog.reduce(
                          (acc, n) => ({ ...acc, [n]: 0 }),
                          {},
                        ),
                        addOnsIncluded: addOnCatalog.reduce(
                          (acc, n) => ({ ...acc, [n]: false }),
                          {},
                        ),
                      }))
                    }
                  >
                    Clear
                  </Button>
                </Space>
              </div>

              <Row gutter={[10, 10]}>
                {addOnCatalog.map((name) => {
                  const included = Boolean(quoteDraft.addOnsIncluded?.[name]);
                  const amt = Number(quoteDraft.addOns?.[name] || 0);
                  return (
                    <Col xs={24} sm={12} xl={8} key={name}>
                      <div
                        className={`rounded-lg border p-2.5 transition-all ${
                          included
                            ? "border-violet-300 bg-violet-50 shadow-sm dark:border-violet-700 dark:bg-violet-950/30"
                            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
                        }`}
                      >
                        <Checkbox
                          checked={included}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setQuoteDraft((p) => ({
                              ...p,
                              addOnsIncluded: {
                                ...p.addOnsIncluded,
                                [name]: on,
                              },
                              addOns: {
                                ...p.addOns,
                                [name]: on ? Number(p.addOns?.[name] || 0) : 0,
                              },
                            }));
                          }}
                          className="items-start [&_.ant-checkbox]:mt-0.5"
                        >
                          <Text className="text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100">
                            {name}
                          </Text>
                        </Checkbox>
                        <div className="ml-6 mt-2">
                          <InputNumber
                            min={0}
                            size="small"
                            disabled={!included}
                            value={amt}
                            addonBefore="₹"
                            controls={false}
                            placeholder="0"
                            onChange={(v) =>
                              setQuoteDraft((p) => ({
                                ...p,
                                addOns: {
                                  ...p.addOns,
                                  [name]: Number(v ?? 0),
                                },
                              }))
                            }
                            className="w-full max-w-full"
                          />
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>

            {/* ─ Action buttons ──────────────────────────────────────── */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                type="primary"
                size="large"
                icon={<PlusCircle size={15} />}
                onClick={addQuote}
                disabled={!quoteDraft.insuranceCompany.trim()}
                className="h-10 px-5"
              >
                Add Quote to List
              </Button>
              <Button
                size="large"
                icon={<RotateCcw size={14} />}
                onClick={resetDraft}
                className="h-10 border-slate-200 dark:border-slate-700"
              >
                Reset Form
              </Button>
              <div className="ml-auto hidden rounded-lg bg-sky-50 px-3 py-1.5 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 md:block">
                <Text className="text-[11px]">
                  💡 <b>Tip:</b> Fill amounts then click <b>Add Quote</b> to
                  compare.
                </Text>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Live Preview Card ── */}
          <div className="w-full shrink-0 p-4 lg:w-[300px] xl:w-[340px] lg:p-5">
            <div className="lg:sticky lg:top-4">
              {/* Gradient preview card */}
              <div className="rounded-2xl bg-gradient-to-b from-violet-600 via-violet-700 to-indigo-800 p-5 text-white shadow-2xl">
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/80">
                    Live Quote Preview
                  </p>
                  {/* Coverage Tier badge */}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tierInfo.color}`}
                  >
                    {tierInfo.label}
                  </span>
                </div>
                <h3 className="mt-1 truncate text-base font-bold text-white">
                  {quoteDraft.insuranceCompany || (
                    <span className="text-violet-300/60 italic">
                      Enter insurer name…
                    </span>
                  )}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {quoteDraft.coverageType && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-violet-100">
                      {quoteDraft.coverageType}
                    </span>
                  )}
                  {quoteDraft.policyDuration && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-violet-200">
                      {quoteDraft.policyDuration}
                    </span>
                  )}
                </div>

                {/* Form completeness mini-bar */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] text-violet-400/70">
                      Form completion
                    </span>
                    <span className="text-[9px] font-bold text-violet-300">
                      {completePct}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-300 to-indigo-300 transition-all duration-500"
                      style={{ width: `${completePct}%` }}
                    />
                  </div>
                </div>

                {/* Live Premium Estimate block (requested breakdown) */}
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/70">
                      Live Premium Estimate
                    </p>

                    <div className="mt-2 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-violet-100">
                            Total Premium
                          </p>
                          <p className="text-[9px] text-violet-300/70">
                            Taxable + 18% GST
                          </p>
                        </div>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {toINR(quoteComputed.totalPremium)}
                        </p>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-violet-100">
                            Base Premium
                          </p>
                          <p className="text-[9px] text-violet-300/70">
                            OD {toINR(quoteComputed.odAmt)} · 3P{" "}
                            {toINR(quoteComputed.tpAmt)}
                          </p>
                        </div>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {toINR(quoteComputed.basePremium)}
                        </p>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-violet-100">
                            Add-ons
                          </p>
                          <p className="text-[9px] text-violet-300/70">
                            Bulk + selected
                          </p>
                        </div>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {toINR(quoteComputed.addOnsTotal)}
                        </p>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-violet-100">
                            NCB Discount
                          </p>
                          <p className="text-[9px] text-violet-300/70">
                            {Number(quoteDraft.ncbDiscount || 0)}% on base
                          </p>
                        </div>
                        <p className="text-sm font-bold tabular-nums text-emerald-300">
                          -{toINR(quoteComputed.ncbAmount)}
                        </p>
                      </div>

                      <div className="flex items-start justify-between gap-2 border-t border-white/15 pt-2">
                        <div>
                          <p className="text-[11px] font-semibold text-violet-100">
                            GST 18%
                          </p>
                          <p className="text-[9px] text-violet-300/70">
                            On {toINR(quoteComputed.taxableAmount)}
                          </p>
                        </div>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {toINR(quoteComputed.gstAmount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/70">
                      IDV Breakdown
                    </p>
                    <div className="mt-2 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-violet-100">Vehicle</span>
                        <span className="font-semibold tabular-nums text-white">
                          {toINR(quoteDraft.vehicleIdv || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-violet-100">CNG</span>
                        <span className="font-semibold tabular-nums text-white">
                          {toINR(quoteDraft.cngIdv || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-violet-100">Accessories</span>
                        <span className="font-semibold tabular-nums text-white">
                          {toINR(quoteDraft.accessoriesIdv || 0)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-white/15 pt-2">
                        <span className="font-semibold text-violet-100">
                          Total IDV
                        </span>
                        <span className="text-sm font-bold tabular-nums text-white">
                          {toINR(quoteComputed.totalIdv)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/70">
                      Taxable Breakdown
                    </p>
                    <div className="mt-2 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-violet-100">OD Amount</span>
                        <span className="font-semibold tabular-nums text-white">
                          {toINR(quoteComputed.odAmt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-violet-100">3rd Party</span>
                        <span className="font-semibold tabular-nums text-white">
                          {toINR(quoteComputed.tpAmt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-violet-100">Add-ons</span>
                        <span className="font-semibold tabular-nums text-white">
                          {toINR(quoteComputed.addOnsTotal)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-white/15 pt-2">
                        <span className="font-semibold text-violet-100">
                          Taxable Total
                        </span>
                        <span className="text-sm font-bold tabular-nums text-white">
                          {toINR(quoteComputed.taxableAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  onClick={addQuote}
                  disabled={!quoteDraft.insuranceCompany.trim()}
                  className="mt-4 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-violet-700 shadow transition-all hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Add to Quotes List
                </button>
              </div>

              {/* Selected add-ons — enhanced detail rows */}
              {selectedAddOnNames.length > 0 && (
                <div className="mt-3 rounded-xl border border-violet-200/60 bg-violet-50/60 p-4 dark:border-violet-800/40 dark:bg-violet-950/20">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                      Included Add-ons
                    </p>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                      {selectedAddOnNames.length} selected
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedAddOnNames.map((name) => {
                      const amt = Number(quoteDraft.addOns?.[name] || 0);
                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                            <span className="text-[11px] text-violet-700 dark:text-violet-300">
                              {name}
                            </span>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-violet-800 dark:text-violet-200">
                            {amt === 0 ? (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                FREE
                              </span>
                            ) : (
                              `₹${amt.toLocaleString("en-IN")}`
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Add-ons subtotal */}
                  {quoteComputed.addOnsTotal > 0 && (
                    <div className="mt-3 flex items-center justify-between border-t border-violet-200/60 pt-2 dark:border-violet-700/40">
                      <span className="text-[10px] font-bold text-violet-500 dark:text-violet-400">
                        Add-ons Subtotal
                      </span>
                      <span className="text-[11px] font-bold text-violet-700 dark:text-violet-200">
                        {toINR(quoteComputed.addOnsTotal)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* No-data hint */}
              {quoteComputed.basePremium === 0 && (
                <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-600">
                  Enter premium amounts to see live calculation ↑
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Section 2 — Generated Quotes List
         ════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Generated Quotes ({quotes.length})
          </h3>
          {acceptedQuote ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase">
                Accepted: {acceptedQuote.insuranceCompany}
              </span>
            </div>
          ) : (
            <Text type="secondary" className="text-xs italic">
              No quote accepted yet
            </Text>
          )}
        </div>

        {quoteRows.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-500 dark:text-slate-400">
                No quotes yet. Add one using the form above.
              </span>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {quoteRows.map((row) => {
              const rid = getQuoteRowId(row);
              const isAccepted = String(acceptedQuoteId) === String(rid);
              return (
                <div
                  key={String(rid)}
                  className={`rounded-xl border p-4 shadow-sm transition-colors ${
                    isAccepted
                      ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Insurer info */}
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-bold uppercase ${
                          isAccepted
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {(row.insuranceCompany || "?").toString().slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {row.insuranceCompany || "—"}
                          </span>
                          {isAccepted && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                              ✓ Accepted
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1.5">
                          {row.coverageType && (
                            <Tag color="blue" className="!text-[10px]">
                              {row.coverageType}
                            </Tag>
                          )}
                          {row.policyDuration && (
                            <Tag className="!text-[10px]">
                              {row.policyDuration}
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Key numbers + actions */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          IDV
                        </div>
                        <div className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                          {formatStoredOrComputedIdv(row)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          Total Premium
                        </div>
                        <div className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatStoredOrComputedPremium(row)}
                        </div>
                      </div>
                      <Space wrap size={[6, 6]}>
                        <Button
                          size="small"
                          onClick={() =>
                            setPlanFeaturesModal({ open: true, row })
                          }
                        >
                          Details
                        </Button>
                        <Button
                          size="small"
                          type={isAccepted ? "primary" : "default"}
                          onClick={() => acceptQuote(rid)}
                          className={
                            isAccepted
                              ? "!bg-emerald-600 !border-emerald-600"
                              : ""
                          }
                        >
                          {isAccepted ? "Accepted ✓" : "Accept"}
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          className="px-1"
                          onClick={() => setQuoteDraft(mapQuoteToDraft(row))}
                        >
                          Load
                        </Button>
                      </Space>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showErrors && quotes.length === 0 ? (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 dark:bg-red-950/30">
            <Text type="danger" className="text-xs">
              ⚠ At least 1 quote is required to continue.
            </Text>
          </div>
        ) : null}
      </div>

      {/* ── Plan Features Modal ───────────────────────────────────────────── */}
      <Modal
        title={
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Plan features
          </span>
        }
        open={planFeaturesModal.open}
        onCancel={() => setPlanFeaturesModal({ open: false, row: null })}
        footer={null}
        width={960}
        centered
        destroyOnClose
        zIndex={1100}
        getContainer={() => document.body}
        styles={{
          body: {
            padding: 0,
            maxHeight: "min(85vh, 900px)",
            overflowY: "auto",
          },
          header: { marginBottom: 0 },
          content: { padding: 0 },
        }}
        className="[&_.ant-modal-content]:rounded-2xl [&_.ant-modal-header]:border-slate-200 [&_.ant-modal-header]:px-6 [&_.ant-modal-header]:py-4 dark:[&_.ant-modal-header]:border-slate-700"
      >
        {planFeaturesModal.row ? (
          <PlanFeaturesModalBody
            key={String(getQuoteRowId(planFeaturesModal.row))}
            row={planFeaturesModal.row}
            acceptedQuoteId={acceptedQuoteId}
            onAcceptAndClose={(rid) => {
              acceptQuote(rid);
              setPlanFeaturesModal({ open: false, row: null });
            }}
            getQuoteRowId={getQuoteRowId}
            computeQuoteBreakupFromRow={computeQuoteBreakupFromRow}
            toINR={toINR}
          />
        ) : (
          <div className="px-8 py-10 text-center">
            <Text type="secondary">No quote selected.</Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Step4InsuranceQuotes;
