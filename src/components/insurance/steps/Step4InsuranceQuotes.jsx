import React from "react";
import {
  Alert,
  Button,
  Card,
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
  Typography,
} from "antd";
import PlanFeaturesModalBody from "../PlanFeaturesModalBody";
import { addOnCatalog } from "./allSteps";

const { Text } = Typography;

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
  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: Quote Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">Add New Quote</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text strong>Insurance Company *</Text>
            <Input
              value={quoteDraft.insuranceCompany}
              onChange={(e) =>
                setQuoteDraft((p) => ({
                  ...p,
                  insuranceCompany: e.target.value,
                }))
              }
              style={{ marginTop: 6 }}
              placeholder="Insurance Company"
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Coverage Type *</Text>
            <Select
              value={quoteDraft.coverageType}
              onChange={(v) =>
                setQuoteDraft((p) => ({ ...p, coverageType: v }))
              }
              style={{ width: "100%", marginTop: 6 }}
              options={[
                { label: "Comprehensive", value: "Comprehensive" },
                { label: "Third Party", value: "Third Party" },
                { label: "Own Damage", value: "Own Damage" },
              ]}
              placeholder="Select type"
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Policy Duration *</Text>
            <Select
              value={quoteDraft.policyDuration}
              onChange={(v) =>
                setQuoteDraft((p) => ({ ...p, policyDuration: v }))
              }
              style={{ width: "100%", marginTop: 6 }}
              options={durationOptions.map((d) => ({
                label: d,
                value: d,
              }))}
              placeholder="Duration"
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Vehicle IDV (₹)</Text>
            <InputNumber
              min={0}
              value={Number(quoteDraft.vehicleIdv || 0)}
              onChange={(v) =>
                setQuoteDraft((p) => ({
                  ...p,
                  vehicleIdv: Number(v || 0),
                }))
              }
              style={{ width: "100%", marginTop: 6 }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>CNG IDV (₹)</Text>
            <InputNumber
              min={0}
              value={Number(quoteDraft.cngIdv || 0)}
              onChange={(v) =>
                setQuoteDraft((p) => ({ ...p, cngIdv: Number(v || 0) }))
              }
              style={{ width: "100%", marginTop: 6 }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Accessories IDV (₹)</Text>
            <InputNumber
              min={0}
              value={Number(quoteDraft.accessoriesIdv || 0)}
              onChange={(v) =>
                setQuoteDraft((p) => ({
                  ...p,
                  accessoriesIdv: Number(v || 0),
                }))
              }
              style={{ width: "100%", marginTop: 6 }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>OD Amount (₹)</Text>
            <InputNumber
              min={0}
              value={Number(quoteDraft.odAmount || 0)}
              onChange={(v) =>
                setQuoteDraft((p) => ({
                  ...p,
                  odAmount: Number(v || 0),
                }))
              }
              style={{ width: "100%", marginTop: 6 }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>3rd Party Amount (₹)</Text>
            <InputNumber
              min={0}
              value={Number(quoteDraft.thirdPartyAmount || 0)}
              onChange={(v) =>
                setQuoteDraft((p) => ({
                  ...p,
                  thirdPartyAmount: Number(v || 0),
                }))
              }
              style={{ width: "100%", marginTop: 6 }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>NCB Discount (%)</Text>
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
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Add-ons Amount (₹)</Text>
            <InputNumber
              min={0}
              value={Number(quoteDraft.addOnsAmount || 0)}
              onChange={(v) =>
                setQuoteDraft((p) => ({
                  ...p,
                  addOnsAmount: Number(v || 0),
                }))
              }
              style={{ width: "100%", marginTop: 6 }}
            />
          </Col>
        </Row>

        <Divider
          className="border-slate-100 dark:border-slate-800"
          style={{ marginBlock: 24 }}
        />

        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50/50 p-3 dark:border-sky-900/30 dark:bg-sky-950/20">
            <Row gutter={[16, 8]} align="middle">
              <Col xs={24} md={6}>
                <h4 className="m-0 text-[13px] font-bold uppercase tracking-wide text-slate-500">
                  Additional Add-ons (Optional)
                </h4>
              </Col>
              <Col xs={24} md={10}>
                <Text className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Select ₹0 to include without charges, or enter custom amounts.
                </Text>
              </Col>
              <Col xs={24} md={8} className="md:text-right">
                <Space size="small">
                  <Button
                    size="small"
                    type="primary"
                    className="!border-emerald-600 !bg-emerald-600 hover:!bg-emerald-700 text-[10px] h-7"
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
                    Select All (₹0)
                  </Button>
                  <Button
                    size="small"
                    danger
                    className="text-[10px] h-7"
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
                    Deselect All
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          <Row gutter={[12, 12]}>
            {addOnCatalog.map((name) => {
              const included = Boolean(quoteDraft.addOnsIncluded?.[name]);
              const amt = Number(quoteDraft.addOns?.[name] || 0);
              return (
                <Col xs={24} sm={12} lg={8} key={name}>
                  <div
                    className={`h-full rounded-lg border p-2.5 transition-colors ${
                      included
                        ? "border-violet-400 bg-white shadow-sm dark:border-violet-600 dark:bg-slate-950 dark:shadow-none"
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
                    <div className="mt-2 ml-6">
                      <Text className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                        Amount (₹)
                      </Text>
                      <InputNumber
                        min={0}
                        size="middle"
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
                        className="w-full max-w-full dark:[&_.ant-input-number-group-addon]:border-slate-600 dark:[&_.ant-input-number-group-addon]:bg-slate-800 dark:[&_.ant-input-number-input]:text-slate-100"
                      />
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>

        <div className="mt-4 rounded-lg border border-purple-200/90 bg-purple-50/95 p-4 dark:border-purple-900/60 dark:bg-purple-950/40">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Base Premium
              </Text>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {toINR(quoteComputed.basePremium)}
              </div>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                OD: {toINR(quoteComputed.odAmt)} + 3P:{" "}
                {toINR(quoteComputed.tpAmt)} + Add-ons:{" "}
                {toINR(quoteComputed.addOnsTotal)}
              </Text>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Add-ons Total
              </Text>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {toINR(quoteComputed.addOnsTotal)}
              </div>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                (Bulk field + selected rows)
              </Text>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                NCB Discount
              </Text>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                -{toINR(quoteComputed.ncbAmount)}
              </div>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                ({Number(quoteDraft.ncbDiscount || 0)}% on base)
              </Text>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                GST (18%)
              </Text>
              <div className="text-lg font-bold text-sky-600 dark:text-sky-400">
                {toINR(quoteComputed.gstAmount)}
              </div>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                On {toINR(quoteComputed.taxableAmount)}
              </Text>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Total Premium
              </Text>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {toINR(quoteComputed.totalPremium)}
              </div>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                (Taxable + GST)
              </Text>
            </Col>
          </Row>

          <Divider
            className="border-slate-200 dark:border-slate-700/80"
            style={{ margin: "16px 0" }}
          />

          <Text
            strong
            className="mb-3 block text-purple-800 dark:text-purple-200"
          >
            IDV Breakdown
          </Text>
          <Row gutter={[12, 8]}>
            <Col xs={12} sm={6}>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                Vehicle IDV
              </Text>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toINR(quoteDraft.vehicleIdv || 0)}
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                CNG IDV
              </Text>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toINR(quoteDraft.cngIdv || 0)}
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                Accessories IDV
              </Text>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toINR(quoteDraft.accessoriesIdv || 0)}
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                Total IDV
              </Text>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {toINR(quoteComputed.totalIdv)}
              </div>
            </Col>
          </Row>

          <Divider
            className="border-slate-200 dark:border-slate-700/80"
            style={{ margin: "12px 0" }}
          />

          <Row gutter={[12, 8]}>
            <Col xs={12} sm={6}>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                OD Amount
              </Text>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toINR(quoteComputed.odAmt)}
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                3rd Party Amount
              </Text>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toINR(quoteComputed.tpAmt)}
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                Add-ons Total
              </Text>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toINR(quoteComputed.addOnsTotal)}
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                Taxable Amount
              </Text>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {toINR(quoteComputed.taxableAmount)}
              </div>
            </Col>
          </Row>
        </div>

        <Divider style={{ marginBlock: 16 }} />
        <Row gutter={[16, 16]} align="middle" className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <Col xs={24} md={12}>
            <Space wrap>
              <Button
                type="primary"
                size="large"
                icon={<span className="text-xl leading-none">+</span>}
                onClick={addQuote}
                disabled={!quoteDraft.insuranceCompany.trim()}
                className="h-11 px-6 shadow-none"
              >
                Add Quote to List
              </Button>
              <Button
                size="large"
                onClick={() =>
                  setQuoteDraft({
                    ...initialQuoteDraft,
                    addOns: { ...initialQuoteDraft.addOns },
                    addOnsIncluded: {
                      ...initialQuoteDraft.addOnsIncluded,
                    },
                  })
                }
                className="h-11 border-slate-200 dark:border-slate-800"
              >
                Reset Form
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <div className="rounded-lg bg-sky-50 p-3 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400">
              <Text className="text-xs">
                💡 <b>Tip:</b> Fill premiums & duration, tune your add-ons, then click <b>Add Quote</b> to compare rows below.
              </Text>
            </div>
          </Col>
        </Row>
      </div>

      {/* Section 2: Quote List */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Generated Quotes ({quotes.length})
          </h3>
          {acceptedQuote ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold uppercase">Accepted: {acceptedQuote.insuranceCompany}</span>
            </div>
          ) : (
            <Text type="secondary" className="text-xs italic">No quote accepted yet</Text>
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
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold uppercase text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {(row.insuranceCompany || "?").toString().slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                          {row.insuranceCompany || "—"}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {row.coverageType || "—"} ·{" "}
                          {row.policyDuration || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-6 sm:gap-8">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          IDV — Cover value
                        </div>
                        <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatStoredOrComputedIdv(row)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Total premium
                        </div>
                        <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatStoredOrComputedPremium(row)}
                        </div>
                      </div>
                      <Space wrap size={[8, 8]}>
                        <Button
                          type="primary"
                          onClick={() =>
                            setPlanFeaturesModal({
                              open: true,
                              row,
                            })
                          }
                        >
                          Plan features
                        </Button>
                        <Button
                          type={isAccepted ? "primary" : "default"}
                          onClick={() => acceptQuote(rid)}
                        >
                          {isAccepted ? "Accepted" : "Accept"}
                        </Button>
                        <Button
                          type="link"
                          className="px-1"
                          onClick={() => setQuoteDraft(mapQuoteToDraft(row))}
                        >
                          Load in form
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
          <div className="mt-2">
            <Text type="danger">At least 1 quote is required.</Text>
          </div>
        ) : null}
      </div>

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
