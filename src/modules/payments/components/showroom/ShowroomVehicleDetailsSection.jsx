// src/modules/payments/components/showroom/ShowroomVehicleDetailsSection.jsx
import React, { useMemo } from "react";
import { Card, Divider } from "antd";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const RowItem = ({ label, value }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      fontSize: 12,
    }}
  >
    <div style={{ color: "#6b7280" }}>{label}</div>
    <div
      style={{
        fontWeight: 600,
        color: "#111827",
        maxWidth: 240,
        textAlign: "right",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {value !== undefined && value !== null && value !== "" ? value : "—"}
    </div>
  </div>
);

const LadderRow = ({ label, value, sign, highlight, subtle }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      fontSize: 12,
      fontWeight: highlight ? 700 : 500,
      color: highlight ? "#1d4ed8" : subtle ? "#6b7280" : "#111827",
      marginBottom: 3,
    }}
  >
    <div>{label}</div>
    <div>
      {sign ? `${sign} ` : ""}
      {money(value || 0)}
    </div>
  </div>
);

const ShowroomVehicleDetailsSection = ({ data = {} }) => {
  // Vehicle title
  const titleLine = [data?.make, data?.model, data?.variant]
    .filter(Boolean)
    .join(" · ");

  const customerName = data?.customerName || "—";

  // Summary values from DO / showroomData
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
    data?.do_netOnRoadVehicleCost ?? data?.netOnRoadVehicleCost ?? 0,
  );

  // Detailed DO components
  const exShowroom = asInt(data?.do_exShowroomPrice);
  const tcs = asInt(data?.do_tcs);
  const epc = asInt(data?.do_epc);
  const insuranceCost = asInt(data?.do_insuranceCost);
  const roadTax = asInt(data?.do_roadTax);
  const accessoriesAmount = asInt(data?.do_accessoriesAmount);
  const fastag = asInt(data?.do_fastag);
  const extendedWarranty = asInt(data?.do_extendedWarranty);
  const additionsOthersTotal = asInt(data?.do_additions_othersTotal || 0);

  const marginMoneyPaid = asInt(data?.do_marginMoneyPaid);
  const dealerDiscount = asInt(data?.do_dealerDiscount);
  const schemeDiscount = asInt(data?.do_schemeDiscount);
  const insuranceCashback = asInt(data?.do_insuranceCashback);
  const exchange = asInt(data?.do_exchange);
  const exchangeVehiclePrice = asInt(data?.do_exchangeVehiclePrice);
  const loyalty = asInt(data?.do_loyalty);
  const corporate = asInt(data?.do_corporate);
  const discountsOthersTotal = asInt(data?.do_discounts_othersTotal || 0);

  // Net used for payments (customer-side, where exchange vehicle price is added back)
  const customerNetOnRoad = asInt(
    data?.customerNetOnRoadVehicleCost ?? netOnRoadDO,
  );

  // This should equal: netOnRoadDO + exchangeVehiclePrice (per your rule)
  const exchangeDeltaForPayment = Math.max(0, customerNetOnRoad - netOnRoadDO);

  const { additions, discounts } = useMemo(() => {
    const additionsList = [
      { label: "Ex-showroom price", value: exShowroom },
      { label: "TCS", value: tcs },
      { label: "EPC", value: epc },
      { label: "Insurance", value: insuranceCost },
      { label: "Road tax", value: roadTax },
      { label: "Accessories", value: accessoriesAmount },
      { label: "Fastag", value: fastag },
      { label: "Extended warranty", value: extendedWarranty },
      { label: "Others (additions)", value: additionsOthersTotal },
    ].filter((r) => r.value > 0);

    const discountsList = [
      { label: "Margin money paid", value: marginMoneyPaid },
      { label: "Dealer discount", value: dealerDiscount },
      { label: "Scheme discount", value: schemeDiscount },
      { label: "Insurance cashback", value: insuranceCashback },
      { label: "Exchange bonus", value: exchange },
      { label: "Exchange vehicle price", value: exchangeVehiclePrice },
      { label: "Loyalty", value: loyalty },
      { label: "Corporate", value: corporate },
      { label: "Others (discounts)", value: discountsOthersTotal },
    ].filter((r) => r.value > 0);

    return { additions: additionsList, discounts: discountsList };
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
    marginMoneyPaid,
    dealerDiscount,
    schemeDiscount,
    insuranceCashback,
    exchange,
    exchangeVehiclePrice,
    loyalty,
    corporate,
    discountsOthersTotal,
  ]);

  return (
    <Card
      style={{
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        padding: 12,
      }}
      bodyStyle={{ padding: 12 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.12,
              color: "#6b7280",
              marginBottom: 2,
            }}
          >
            Vehicle & DO · Showroom account
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 260,
            }}
          >
            {titleLine || "Vehicle not set"}
          </div>
        </div>

        {data?.loanRefNo && (
          <div
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#4b5563",
              maxWidth: 180,
              textAlign: "right",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.loanRefNo}
          </div>
        )}
      </div>

      {/* Two-column layout: left context, right breakup */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1.7fr",
          gap: 12,
          marginTop: 8,
        }}
      >
        {/* Left: context */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <RowItem label="Customer" value={customerName} />
          <RowItem label="DO ref no." value={data?.doRefNo} />
          <RowItem label="Loan ref no." value={data?.loanRefNo} />
          {data?.do_colour && (
            <RowItem label="Colour" value={data?.do_colour} />
          )}
          {data?.dealerName && (
            <RowItem label="Dealer" value={data?.dealerName} />
          )}
          {data?.hypothecationBank && (
            <RowItem
              label="Hypothecation bank"
              value={data?.hypothecationBank}
            />
          )}
        </div>

        {/* Right: full DO + payment net ladder */}
        <div
          style={{
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: 10,
          }}
        >
          {/* Stage 1: build on-road */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            1. Build on-road (DO)
          </div>

          {additions.length > 0 ? (
            additions.map((r) => (
              <LadderRow
                key={r.label}
                label={r.label}
                value={r.value}
                sign="+"
              />
            ))
          ) : (
            <LadderRow
              label="On-road vehicle cost (DO)"
              value={onRoadVehicleCost}
              highlight
            />
          )}

          {additions.length > 0 && (
            <>
              <Divider style={{ margin: "6px 0" }} />
              <LadderRow
                label="On-road vehicle cost (DO)"
                value={onRoadVehicleCost}
                highlight
              />
            </>
          )}

          {/* Stage 2: discounts / deductions */}
          <Divider style={{ margin: "8px 0" }} />
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            2. Discounts / deductions (DO)
          </div>

          {discounts.length > 0 ? (
            discounts.map((r) => (
              <LadderRow
                key={r.label}
                label={r.label}
                value={r.value}
                sign="-"
              />
            ))
          ) : (
            <LadderRow
              label="Total discount (DO)"
              value={totalDiscountDO}
              sign="-"
            />
          )}

          {discounts.length > 0 && (
            <>
              <Divider style={{ margin: "6px 0" }} />
              <LadderRow
                label="Total discount (DO)"
                value={totalDiscountDO}
                highlight
              />
            </>
          )}

          {/* Net DO line */}
          <LadderRow
            label="Net on-road (as per DO)"
            value={netOnRoadDO}
            highlight
          />

          {/* Stage 3: adjust to payment net */}
          <Divider style={{ margin: "8px 0" }} />
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            3. Net used for payments
          </div>

          {exchangeDeltaForPayment > 0 && (
            <LadderRow
              label="Exchange vehicle price added back for payment"
              value={exchangeDeltaForPayment}
              sign="+"
              subtle
            />
          )}

          <LadderRow
            label="Net on-road used for payment"
            value={customerNetOnRoad}
            highlight
          />

          <div
            style={{
              marginTop: 3,
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            This is the figure we reconcile in the showroom payments timeline.
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ShowroomVehicleDetailsSection;
