// src/modules/payments/components/bookings/BookingSummaryCard.jsx
import React from "react";
import { Card, Divider } from "antd";
import { CarOutlined, UserOutlined } from "@ant-design/icons";

const money = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

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

const BookingSummaryCard = ({ booking }) => {
  const titleLine = [
    booking.vehicleMake,
    booking.vehicleModel,
    booking.vehicleVariant,
  ]
    .filter(Boolean)
    .join(" · ");

  const totalDiscount =
    (booking.dealerDiscount || 0) +
    (booking.manufacturerDiscount || 0) +
    (booking.otherDiscounts || 0);

  const netExShowroom = (booking.exShowroomPrice || 0) - totalDiscount;

  return (
    <Card
      style={{
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CarOutlined style={{ color: "#1418fa" }} />
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
              Booking · New car
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
        </div>

        <div style={{ fontSize: 11, color: "#6b7280" }}>
          Booking created on{" "}
          {booking.createdAt
            ? new Date(booking.createdAt).toLocaleDateString("en-IN")
            : "—"}
        </div>
      </div>

      {/* Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1.6fr",
          gap: 12,
          marginTop: 8,
        }}
      >
        {/* Left: customer + showroom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <RowItem label="Customer" value={booking.customerName} />
          <RowItem
            label="S/D/W of"
            value={
              booking.relationType && booking.relationName
                ? `${booking.relationType}/O ${booking.relationName}`
                : ""
            }
          />
          <RowItem label="Customer city" value={booking.customerCity} />
          <Divider style={{ margin: "8px 0" }} />
          <RowItem label="Showroom name" value={booking.showroomName} />
          <RowItem
            label="Showroom contact"
            value={
              booking.showroomContactPerson
                ? `${booking.showroomContactPerson}${
                    booking.showroomContactNumber
                      ? ` · ${booking.showroomContactNumber}`
                      : ""
                  }`
                : booking.showroomContactNumber
            }
          />
          <RowItem label="Showroom address" value={booking.showroomAddress} />
        </div>

        {/* Right: deal + booking amount ladder */}
        <div
          style={{
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            Deal & booking amount
          </div>

          <RowItem
            label="Ex-showroom price"
            value={money(booking.exShowroomPrice || 0)}
          />
          <RowItem
            label="Dealer discount"
            value={money(booking.dealerDiscount || 0)}
          />
          <RowItem
            label="Manufacturer discount"
            value={money(booking.manufacturerDiscount || 0)}
          />
          <RowItem
            label="Other discounts"
            value={money(booking.otherDiscounts || 0)}
          />
          <Divider style={{ margin: "6px 0" }} />
          <RowItem label="Total discount" value={money(totalDiscount)} />
          <RowItem
            label="Net ex-showroom (booking)"
            value={money(netExShowroom)}
          />

          <Divider style={{ margin: "8px 0" }} />
          <RowItem
            label="Booking amount"
            value={money(booking.bookingAmount || 0)}
          />
          <RowItem label="Payment mode" value={booking.bookingPaymentMode} />
          <RowItem
            label="Payment date"
            value={
              booking.bookingPaymentDate
                ? new Date(booking.bookingPaymentDate).toLocaleDateString(
                    "en-IN",
                  )
                : "—"
            }
          />
          <RowItem
            label="Transaction / Ref"
            value={booking.bookingTransactionRef}
          />
          <RowItem label="Bank name" value={booking.bookingBankName} />
        </div>
      </div>
    </Card>
  );
};

export default BookingSummaryCard;
