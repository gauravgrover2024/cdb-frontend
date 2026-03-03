// src/modules/payments/pages/BookingEditPage.jsx
import React from "react";
import { useParams } from "react-router-dom";
import { Card } from "antd";

const BookingEditPage = () => {
  const { bookingId } = useParams();

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen">
      <Card className="rounded-2xl bg-card border border-border">
        <h1 className="text-xl font-bold mb-2">Edit booking</h1>
        <p className="text-sm text-muted-foreground">Booking ID: {bookingId}</p>
        {/* TODO: add actual edit form here */}
      </Card>
    </div>
  );
};

export default BookingEditPage;
