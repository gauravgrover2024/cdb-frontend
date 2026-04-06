// src/modules/payments/components/showroom/ShowroomVehicleDetailsSection.jsx
import React, { useMemo } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import BreakdownSummaryCard from "../shared/BreakdownSummaryCard";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const buildNamedRows = (list = [], fallbackLabel = "Other") => {
  if (!Array.isArray(list)) return [];
  return list
    .map((item, idx) => {
      const amount = asInt(item?.amount || 0);
      const label = safeText(item?.label).trim() || `${fallbackLabel} ${idx + 1}`;
      return { label, value: amount, intent: "addition" };
    })
    .filter((row) => row.value > 0);
};

const ShowroomVehicleDetailsSection = ({ data = {} }) => {
  const { isDarkMode } = useTheme();

  const titleLine = [data?.make, data?.model, data?.variant]
    .filter(Boolean)
    .join(" ")
    .trim();

  const customerName = safeText(data?.customerName) || "—";

  const onRoadVehicleCost = asInt(
    data?.do_onRoadVehicleCost ?? data?.onRoadVehicleCost ?? 0,
  );
  const totalDiscountDO = asInt(
    data?.do_selectedEffectiveTotalDiscount ??
      data?.do_totalDiscount ??
      data?.discountExclVehicleValue ??
      0,
  );
  const netOnRoadDO = asInt(
    data?.do_netOnRoadVehicleCost ?? data?.showroomNetOnRoadVehicleCost ?? 0,
  );

  const exShowroom = asInt(data?.do_exShowroomPrice);
  const tcs = asInt(data?.do_tcs);
  const epc = asInt(data?.do_epc);
  const insuranceCost = asInt(data?.do_insuranceCost);
  const roadTax = asInt(data?.do_roadTax);
  const accessoriesAmount = asInt(data?.do_accessoriesAmount);
  const fastag = asInt(data?.do_fastag);
  const extendedWarranty = asInt(data?.do_extendedWarranty);
  const namedAdditionsRows = buildNamedRows(data?.do_additions_others, "Addition");
  const namedDiscountRows = buildNamedRows(data?.do_discounts_others, "Discount").map(
    (row) => ({ ...row, intent: "discount" }),
  );
  const additionsOthersTotal = asInt(data?.do_additions_othersTotal || 0);

  const dealerDiscount = asInt(data?.do_dealerDiscount);
  const schemeDiscount = asInt(data?.do_schemeDiscount);
  const insuranceCashback = asInt(data?.do_insuranceCashback);
  const exchange = asInt(data?.do_exchange);
  const exchangeVehiclePrice = asInt(data?.do_exchangeVehiclePrice);
  const loyalty = asInt(data?.do_loyalty);
  const corporate = asInt(data?.do_corporate);
  const discountsOthersTotal = asInt(data?.do_discounts_othersTotal || 0);

  // Critical fix: add-back must come only from DO showroom account exchange value,
  // never from customer/showroom net difference.
  const exchangeAddBackForPayment = asInt(
    data?.do_exchangeVehiclePrice ?? data?.exchangeValue ?? 0,
  );
  const netUsedForPayment = Math.max(0, netOnRoadDO + exchangeAddBackForPayment);

  const summarySections = useMemo(() => {
    const additionsRows = [
      { label: "Ex-showroom price", value: exShowroom, intent: "addition" },
      { label: "TCS", value: tcs, intent: "addition" },
      { label: "EPC", value: epc, intent: "addition" },
      { label: "Insurance", value: insuranceCost, intent: "addition" },
      { label: "Road tax", value: roadTax, intent: "addition" },
      { label: "Accessories", value: accessoriesAmount, intent: "addition" },
      { label: "Fastag", value: fastag, intent: "addition" },
      { label: "Extended warranty", value: extendedWarranty, intent: "addition" },
      ...namedAdditionsRows,
      {
        label: "Others (additions)",
        value:
          additionsOthersTotal ||
          namedAdditionsRows.reduce((sum, row) => sum + asInt(row?.value || 0), 0),
        intent: "addition",
      },
    ].filter((row) => row.value > 0);

    const discountsRows = [
      { label: "Dealer discount", value: dealerDiscount, intent: "discount" },
      { label: "Scheme discount", value: schemeDiscount, intent: "discount" },
      { label: "Insurance cashback", value: insuranceCashback, intent: "discount" },
      { label: "Exchange bonus", value: exchange, intent: "discount" },
      { label: "Exchange vehicle price", value: exchangeVehiclePrice, intent: "discount" },
      { label: "Loyalty", value: loyalty, intent: "discount" },
      { label: "Corporate", value: corporate, intent: "discount" },
      ...namedDiscountRows,
      {
        label: "Others (discounts)",
        value:
          discountsOthersTotal ||
          namedDiscountRows.reduce((sum, row) => sum + asInt(row?.value || 0), 0),
        intent: "discount",
      },
    ].filter((row) => row.value > 0);

    return [
      {
        title: "On-road build-up (DO)",
        rows: [
          ...additionsRows,
          {
            label: "On-road vehicle cost (DO)",
            value: onRoadVehicleCost,
            intent: "total",
            strong: true,
          },
        ],
      },
      {
        title: "Discounts / deductions (DO)",
        rows: [
          ...discountsRows,
          {
            label: "Total discount (DO)",
            value: totalDiscountDO,
            intent: "discount",
            strong: true,
          },
          {
            label: "Net on-road (DO)",
            value: netOnRoadDO,
            intent: "total",
            strong: true,
          },
        ],
      },
      {
        title: "Net used for payments",
        rows: [
          ...(exchangeAddBackForPayment > 0
            ? [
                {
                  label: "Exchange vehicle price added back for payment",
                  value: exchangeAddBackForPayment,
                  intent: "addition",
                },
              ]
            : []),
          {
            label: "Net on-road used for payment",
            value: netUsedForPayment,
            intent: "total",
            strong: true,
          },
        ],
      },
      {
        title: "Case context",
        rows: [
          { label: "Customer", value: customerName, raw: true },
          { label: "DO ref no.", value: safeText(data?.doRefNo) || "—", raw: true },
          { label: "Loan ref no.", value: safeText(data?.loanRefNo) || "—", raw: true },
          {
            label: "Colour",
            value:
              safeText(data?.do_colour) ||
              safeText(data?.do_vehicleColor) ||
              safeText(data?.vehicleColor) ||
              "—",
            raw: true,
          },
          { label: "Dealer", value: safeText(data?.dealerName) || "—", raw: true },
          {
            label: "Hypothecation bank",
            value: safeText(data?.hypothecationBank) || "—",
            raw: true,
          },
        ],
      },
    ];
  }, [
    exShowroom,
    tcs,
    epc,
    insuranceCost,
    roadTax,
    accessoriesAmount,
    fastag,
    extendedWarranty,
    additionsOthersTotal,
    namedAdditionsRows,
    namedDiscountRows,
    dealerDiscount,
    schemeDiscount,
    insuranceCashback,
    exchange,
    exchangeVehiclePrice,
    loyalty,
    corporate,
    discountsOthersTotal,
    onRoadVehicleCost,
    totalDiscountDO,
    netOnRoadDO,
    exchangeAddBackForPayment,
    netUsedForPayment,
    customerName,
    data?.doRefNo,
    data?.loanRefNo,
    data?.do_colour,
    data?.do_vehicleColor,
    data?.vehicleColor,
    data?.dealerName,
    data?.hypothecationBank,
  ]);

  return (
    <BreakdownSummaryCard
      isDarkMode={isDarkMode}
      eyebrow="Showroom account snapshot"
      title={titleLine || "Vehicle not set"}
      subtitle="Vehicle & DO · Showroom account"
      chipLabel="Showroom"
      chipTone="blue"
      sections={summarySections}
      compact
      sticky={false}
    />
  );
};

export default ShowroomVehicleDetailsSection;
