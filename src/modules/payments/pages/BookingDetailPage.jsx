// src/modules/payments/pages/BookingDetailPage.jsx
import React, { useEffect, useState } from "react";
import { Card, Button, Tag, Modal, message, Tooltip } from "antd";
import {
  ArrowLeftOutlined,
  FileAddOutlined,
  LinkOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { bookingsApi } from "../../../api/bookings";
import BookingSummaryCard from "../components/bookings/BookingSummaryCard";
import BookingCancellationModal from "../components/bookings/BookingCancellationModal";

const BookingDetailPage = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const [creatingLoan, setCreatingLoan] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const bookingData = await bookingsApi.getById(bookingId); // plain JSON
        console.log("BOOKING DETAIL RESPONSE", bookingData);
        setBooking(bookingData || null);
      } catch (err) {
        console.error("Failed to load booking", err);
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const canCreateLoan =
    booking && booking.status === "Open" && !booking.linkedLoanId;

  const canMerge =
    booking &&
    booking.status === "Converted" &&
    booking.linkedLoanId &&
    !booking.linkedPaymentLoanId;

  const canCancel = booking && booking.status === "Open";

  const handleCreateLoan = async () => {
    if (!booking) return;
    setCreatingLoan(true);
    try {
      const res = await bookingsApi.createLoanFromBooking(booking.bookingId); // { loanId }
      message.success("Loan created from booking");
      navigate(`/payments/${res.loanId}`);
    } catch (err) {
      console.error("Failed to create loan from booking", err);
      message.error("Failed to create loan from booking");
    } finally {
      setCreatingLoan(false);
    }
  };

  const handleMergeBooking = async () => {
    if (!booking || !booking.linkedLoanId) return;

    const mismatchLines = [];

    if (
      booking.showroomName &&
      booking.doShowroomName &&
      booking.showroomName !== booking.doShowroomName
    ) {
      mismatchLines.push("Showroom name differs");
    }
    if (
      booking.vehicleMake &&
      booking.loanVehicleMake &&
      booking.vehicleMake !== booking.loanVehicleMake
    ) {
      mismatchLines.push("Vehicle make differs");
    }
    if (
      booking.vehicleModel &&
      booking.loanVehicleModel &&
      booking.vehicleModel !== booking.loanVehicleModel
    ) {
      mismatchLines.push("Vehicle model differs");
    }
    if (
      booking.vehicleVariant &&
      booking.loanVehicleVariant &&
      booking.vehicleVariant !== booking.loanVehicleVariant
    ) {
      mismatchLines.push("Vehicle variant differs");
    }

    Modal.confirm({
      title: "Merge booking into payment account?",
      icon: <ExclamationCircleOutlined style={{ color: "#f97316" }} />,
      content: (
        <div>
          {mismatchLines.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#b91c1c",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ExclamationCircleOutlined />
                Warning: some details do not match current DO/payment:
              </div>
              <ul style={{ paddingLeft: 18, fontSize: 12, color: "#6b7280" }}>
                {mismatchLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ fontSize: 12, color: "#374151" }}>
            This will add a <b>Booking Amount</b> row in showroom payments for
            loan <b>{booking.linkedLoanId}</b>. Continue?
          </div>
        </div>
      ),
      okText: "Merge booking",
      okButtonProps: { type: "primary" },
      cancelText: "Cancel",
      onOk: async () => {
        setMerging(true);
        try {
          const updated = await bookingsApi.mergeIntoPayment(booking.bookingId); // updated booking
          message.success("Booking amount merged into payment account");
          setBooking(updated || null);
        } catch (err) {
          console.error("Failed to merge booking into payment account", err);
          message.error("Failed to merge booking into payment account");
        } finally {
          setMerging(false);
        }
      },
    });
  };

  if (loading || !booking) {
    return (
      <div className="p-4 md:p-6 bg-background min-h-screen">
        <Card>Loading...</Card>
      </div>
    );
  }

  const statusTag =
    booking.status === "Open" ? (
      <Tag color="processing">Open</Tag>
    ) : booking.status === "Converted" ? (
      <Tag color="success">Converted</Tag>
    ) : (
      <Tag color="error">Cancelled</Tag>
    );

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen">
      <Card
        className="rounded-2xl mb-4 bg-card border border-border"
        bodyStyle={{ padding: 16 }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/payments")}
              size="small"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground mb-0.5">
                Booking {booking.bookingId}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <InfoCircleOutlined className="text-sky-500" />
                <span>
                  {booking.customerName} · {booking.vehicleMake}{" "}
                  {booking.vehicleModel} {booking.vehicleVariant}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusTag}
            {booking.linkedLoanId && (
              <Tag icon={<LinkOutlined />} color="purple">
                Linked loan: {booking.linkedLoanId}
              </Tag>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <InfoCircleOutlined className="text-amber-500" />
            <span>
              Create loan only when vehicle is ready. Merge booking once
              payments file exists.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* EDIT BUTTON (view → edit page) */}
            <Button
              icon={<EditOutlined />}
              onClick={() =>
                navigate(`/payments/bookings/${booking.bookingId}/edit`)
              }
            >
              Edit booking
            </Button>

            {canCreateLoan && (
              <Tooltip title="Create a fresh loan file from this booking">
                <Button
                  type="primary"
                  icon={<FileAddOutlined />}
                  loading={creatingLoan}
                  onClick={handleCreateLoan}
                >
                  Create loan from booking
                </Button>
              </Tooltip>
            )}
            {canMerge && (
              <Tooltip title="Copy booking amount into showroom payments for linked loan">
                <Button
                  icon={<LinkOutlined />}
                  loading={merging}
                  onClick={handleMergeBooking}
                >
                  Merge into payment account
                </Button>
              </Tooltip>
            )}
            {canCancel && (
              <Tooltip title="Cancel this booking with reason">
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel booking
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </Card>

      <Card
        className="rounded-2xl bg-card border border-border mb-4"
        bodyStyle={{ padding: 16 }}
      >
        <BookingSummaryCard booking={booking} />
      </Card>

      <BookingCancellationModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        booking={booking}
        onCancelled={(updated) => {
          setBooking(updated);
          setCancelOpen(false);
        }}
      />
    </div>
  );
};

export default BookingDetailPage;
