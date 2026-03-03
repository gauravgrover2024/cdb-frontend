// src/modules/payments/components/bookings/BookingCancellationModal.jsx
import React from "react";
import { Modal, Form, Select, Input, DatePicker } from "antd";
import dayjs from "dayjs";
import { bookingsApi } from "../../../../api/bookings";

const { Option } = Select;

const BookingCancellationModal = ({ open, onClose, booking, onCancelled }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = React.useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        ...values,
        cancelledAt: values.cancelledAt
          ? values.cancelledAt.toISOString()
          : new Date().toISOString(),
      };
      const res = await bookingsApi.cancel(booking.bookingId, payload);
      onCancelled?.(res.data);
    } catch (err) {
      // validation or API error; you can add message.error here if needed
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Cancel booking ${booking?.bookingId}`}
      onCancel={onClose}
      onOk={handleOk}
      okText="Cancel booking"
      okButtonProps={{ danger: true, loading: submitting }}
      destroyOnClose
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          cancelledAt: dayjs(),
        }}
      >
        <Form.Item
          label="Cancellation reason"
          name="reason"
          rules={[{ required: true, message: "Please select a reason" }]}
        >
          <Select placeholder="Select reason">
            <Option value="Customer backed out">Customer backed out</Option>
            <Option value="Vehicle not available">Vehicle not available</Option>
            <Option value="Better offer elsewhere">
              Better offer elsewhere
            </Option>
            <Option value="Converted without finance">
              Converted without finance
            </Option>
            <Option value="Other">Other</Option>
          </Select>
        </Form.Item>
        <Form.Item label="Remarks" name="remarks">
          <Input.TextArea rows={3} placeholder="Any extra notes" />
        </Form.Item>
        <Form.Item label="Cancellation date" name="cancelledAt">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BookingCancellationModal;
