// src/modules/payments/pages/NewBookingPage.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  Button,
  message,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { bookingsApi } from "../../../api/bookings";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";

const { Option } = Select;

const NewBookingPage = () => {
  const { bookingId } = useParams(); // undefined for NEW, set for EDIT
  const navigate = useNavigate();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!!bookingId);

  useEffect(() => {
    if (!bookingId) return; // pure "new" case

    const load = async () => {
      setLoading(true);
      try {
        const data = await bookingsApi.getById(bookingId); // JSON
        if (data) {
          form.setFieldsValue({
            leadSourceType: data.leadSourceType,
            directSourceName: data.directSourceName,
            vehicleMake: data.vehicleMake,
            vehicleModel: data.vehicleModel,
            vehicleVariant: data.vehicleVariant,
            vehicleColor: data.vehicleColor,
            regCity: data.regCity,
            customerName: data.customerName,
            sdwOf: data.sdwOf,
            customerPhone: data.customerPhone,
            exShowroomPrice: data.exShowroomPrice,
            dealerDiscount: data.dealerDiscount,
            manufacturerDiscount: data.manufacturerDiscount,
            otherDiscounts: data.otherDiscounts,
            financeRequired: data.financeRequired,
            showroomName: data.showroomName,
            showroomContactPerson: data.showroomContactPerson,
            showroomContactNumber: data.showroomContactNumber,
            showroomAddress: data.showroomAddress,
            bookingAmount: data.bookingAmount,
            bookingDate: data.bookingDate ? dayjs(data.bookingDate) : null,
            bookingPaymentMode: data.bookingPaymentMode,
            exchangePresent: data.exchangePresent,
          });
        }
      } catch (err) {
        console.error("Failed to load booking for edit", err);
        message.error("Failed to load booking");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId, form]);

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        bookingDate: values.bookingDate
          ? values.bookingDate.toISOString()
          : null,
      };

      if (bookingId) {
        // TODO: when you add update endpoint:
        // await bookingsApi.update(bookingId, payload);
        message.info(
          "Edit not saved yet — add update API (PUT /api/bookings/:id) to persist changes.",
        );
        navigate(`/payments/bookings/${bookingId}`);
      } else {
        const created = await bookingsApi.create(payload);
        message.success("Booking created");
        navigate(`/payments/bookings/${created.bookingId}`);
      }
    } catch (err) {
      console.error("Failed to save booking", err);
      message.error("Failed to save booking");
    }
  };

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen">
      <Card
        className="rounded-2xl mb-4 bg-card border border-border"
        bodyStyle={{ padding: 16 }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/payments")}
              size="small"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground mb-0.5">
                {bookingId ? `Edit booking ${bookingId}` : "New booking"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {bookingId ? "Update booking details" : "Create a new booking"}
              </p>
            </div>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer details */}
            <Card size="small" title="Customer details">
              <Form.Item label="Customer name" name="customerName">
                <Input />
              </Form.Item>
              <Form.Item label="S/D/W of" name="sdwOf">
                <Input />
              </Form.Item>
              <Form.Item label="Customer phone" name="customerPhone">
                <Input />
              </Form.Item>
              <Form.Item label="Lead source type" name="leadSourceType">
                <Select allowClear>
                  <Option value="Direct">Direct</Option>
                  <Option value="Referral">Referral</Option>
                  <Option value="Dealer">Dealer</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Direct source name" name="directSourceName">
                <Input />
              </Form.Item>
            </Card>

            {/* Vehicle details */}
            <Card size="small" title="Vehicle details">
              <Form.Item label="Make" name="vehicleMake">
                <Input />
              </Form.Item>
              <Form.Item label="Model" name="vehicleModel">
                <Input />
              </Form.Item>
              <Form.Item label="Variant" name="vehicleVariant">
                <Input />
              </Form.Item>
              <Form.Item label="Color" name="vehicleColor">
                <Input />
              </Form.Item>
              <Form.Item label="Registration city" name="regCity">
                <Input />
              </Form.Item>
            </Card>

            {/* Price & booking */}
            <Card size="small" title="Price & booking">
              <Form.Item label="Ex-showroom price" name="exShowroomPrice">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(value) =>
                    value
                      ? `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : ""
                  }
                  parser={(value) =>
                    value ? value.replace(/[₹\s,]/g, "") : ""
                  }
                />
              </Form.Item>
              <Form.Item label="Dealer discount" name="dealerDiscount">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
              <Form.Item
                label="Manufacturer discount"
                name="manufacturerDiscount"
              >
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
              <Form.Item label="Other discounts" name="otherDiscounts">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
              <Form.Item label="Finance required" name="financeRequired">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
              <Form.Item label="Booking amount" name="bookingAmount">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
              <Form.Item label="Booking date" name="bookingDate">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Booking payment mode" name="bookingPaymentMode">
                <Select allowClear>
                  <Option value="Online Transfer/UPI">
                    Online Transfer/UPI
                  </Option>
                  <Option value="Cash">Cash</Option>
                  <Option value="Cheque">Cheque</Option>
                  <Option value="DD">DD</Option>
                  <Option value="Credit Card">Credit Card</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Exchange present" name="exchangePresent">
                <Select allowClear>
                  <Option value="Yes">Yes</Option>
                  <Option value="No">No</Option>
                </Select>
              </Form.Item>
            </Card>

            {/* Showroom details */}
            <Card size="small" title="Showroom details">
              <Form.Item label="Showroom name" name="showroomName">
                <Input />
              </Form.Item>
              <Form.Item
                label="Showroom contact person"
                name="showroomContactPerson"
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Showroom contact number"
                name="showroomContactNumber"
              >
                <Input />
              </Form.Item>
              <Form.Item label="Showroom address" name="showroomAddress">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Card>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              {bookingId ? "Save changes" : "Create booking"}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default NewBookingPage;
