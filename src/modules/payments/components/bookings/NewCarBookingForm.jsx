// src/modules/payments/components/bookings/NewCarBookingForm.jsx
import React from "react";
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Radio,
  Divider,
  Button,
} from "antd";
import {
  UserOutlined,
  CarOutlined,
  BankOutlined,
  ShopOutlined,
  SwapOutlined,
} from "@ant-design/icons";

const { Option } = Select;

const moneyFormatter = (v) =>
  v ? `₹ ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` : "";

const moneyParser = (v) => (v ? v.replace(/₹\s?|,/g, "") : "");

const NewCarBookingForm = ({ loading, onSubmit, initialValues }) => {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    if (onSubmit) onSubmit(values);
  };

  const sectionHeader = (title, subtitle, icon) => (
    <div className="mb-2 flex items-center justify-between">
      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-[0.12em] flex items-center gap-1">
          {icon}
          <span>{title}</span>
        </div>
        {subtitle && (
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </div>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        leadSourceType: "Direct",
        bookingPaymentMode: "Online Transfer/UPI",
        exchangePresent: "No",
        ...initialValues,
      }}
      onFinish={handleFinish}
    >
      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* SECTION: Lead source */}
          <div className="border border-border rounded-2xl bg-background p-4">
            {sectionHeader(
              "Lead source",
              "Who brought this case?",
              <UserOutlined className="text-sky-500" />,
            )}

            <Form.Item
              label="Source type"
              name="leadSourceType"
              rules={[{ required: true, message: "Please select source type" }]}
            >
              <Radio.Group>
                <Radio.Button value="Direct">Direct</Radio.Button>
                <Radio.Button value="Indirect">Indirect</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {/* Direct */}
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) =>
                prev.leadSourceType !== cur.leadSourceType
              }
            >
              {({ getFieldValue }) =>
                getFieldValue("leadSourceType") === "Direct" && (
                  <Form.Item
                    label="Direct reference / source name"
                    name="directSourceName"
                    rules={[
                      {
                        required: true,
                        message: "Please enter reference / source name",
                      },
                    ]}
                  >
                    <Input placeholder="Friend, existing customer, walk-in, etc." />
                  </Form.Item>
                )
              }
            </Form.Item>

            {/* Indirect */}
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) =>
                prev.leadSourceType !== cur.leadSourceType
              }
            >
              {({ getFieldValue }) =>
                getFieldValue("leadSourceType") === "Indirect" && (
                  <>
                    <Form.Item
                      label="Dealer name"
                      name="dealerName"
                      rules={[
                        {
                          required: true,
                          message: "Please enter dealer name",
                        },
                      ]}
                    >
                      <Input placeholder="Showroom / dealer" />
                    </Form.Item>
                    <Form.Item label="Dealer address" name="dealerAddress">
                      <Input.TextArea
                        rows={2}
                        placeholder="Dealer showroom address"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Dealer mobile"
                      name="dealerMobile"
                      rules={[
                        {
                          required: true,
                          message: "Please enter dealer mobile",
                        },
                      ]}
                    >
                      <Input placeholder="10-digit mobile" maxLength={10} />
                    </Form.Item>
                  </>
                )
              }
            </Form.Item>
          </div>

          {/* SECTION: Vehicle + registration */}
          <div className="border border-border rounded-2xl bg-background p-4">
            {sectionHeader(
              "Vehicle details",
              "Booking vehicle configuration",
              <CarOutlined className="text-emerald-500" />,
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item
                label="Make"
                name="vehicleMake"
                rules={[{ required: true, message: "Please enter make" }]}
              >
                <Input placeholder="Maruti, Hyundai, etc." />
              </Form.Item>
              <Form.Item
                label="Model"
                name="vehicleModel"
                rules={[{ required: true, message: "Please enter model" }]}
              >
                <Input placeholder="Baleno, Creta, etc." />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item
                label="Variant"
                name="vehicleVariant"
                rules={[{ required: true, message: "Please enter variant" }]}
              >
                <Input placeholder="Zeta MT, SX(O) AT, etc." />
              </Form.Item>
              <Form.Item label="Colour" name="vehicleColor">
                <Input placeholder="White, Grey, etc." />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item label="Mfg year" name="mfgYear">
                <InputNumber
                  min={2010}
                  max={2099}
                  style={{ width: "100%" }}
                  placeholder="2025"
                />
              </Form.Item>
              <Form.Item label="Registration city" name="regCity">
                <Input placeholder="Delhi, Gurgaon, etc." />
              </Form.Item>
            </div>
          </div>

          {/* SECTION: Customer */}
          <div className="border border-border rounded-2xl bg-background p-4">
            {sectionHeader(
              "Customer",
              "Primary customer identity",
              <UserOutlined className="text-indigo-500" />,
            )}

            <Form.Item
              label="Customer name"
              name="customerName"
              rules={[
                { required: true, message: "Please enter customer name" },
              ]}
            >
              <Input placeholder="Customer full name" />
            </Form.Item>

            <Form.Item label="S/D/W of" name="sdwOf">
              <Input placeholder="Father / spouse name" />
            </Form.Item>

            <Form.Item
              label="Customer mobile"
              name="customerPhone"
              rules={[{ required: true, message: "Please enter mobile" }]}
            >
              <Input placeholder="10-digit mobile" maxLength={10} />
            </Form.Item>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* SECTION: Pricing */}
          <div className="border border-border rounded-2xl bg-background p-4">
            {sectionHeader(
              "Pricing & finance",
              "Basic ex-showroom and discounts",
              <BankOutlined className="text-amber-500" />,
            )}

            <Form.Item
              label="Ex-showroom price"
              name="exShowroomPrice"
              rules={[
                { required: true, message: "Please enter ex-showroom price" },
              ]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={moneyFormatter}
                parser={moneyParser}
                placeholder="₹ 8,50,000"
              />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Form.Item label="Dealer discount" name="dealerDiscount">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  formatter={moneyFormatter}
                  parser={moneyParser}
                  placeholder="₹ 25,000"
                />
              </Form.Item>
              <Form.Item
                label="Manufacturer discount"
                name="manufacturerDiscount"
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  formatter={moneyFormatter}
                  parser={moneyParser}
                  placeholder="₹ 10,000"
                />
              </Form.Item>
              <Form.Item label="Other discounts" name="otherDiscounts">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  formatter={moneyFormatter}
                  parser={moneyParser}
                  placeholder="₹ 5,000"
                />
              </Form.Item>
            </div>

            <Form.Item
              label="Finance required"
              name="financeRequired"
              rules={[
                { required: true, message: "Please enter finance requirement" },
              ]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={moneyFormatter}
                parser={moneyParser}
                placeholder="₹ 6,50,000"
              />
            </Form.Item>
          </div>

          {/* SECTION: Showroom contact */}
          <div className="border border-border rounded-2xl bg-background p-4">
            {sectionHeader(
              "Showroom contact",
              "Booking showroom reference",
              <ShopOutlined className="text-purple-500" />,
            )}

            <Form.Item
              label="Showroom name"
              name="showroomName"
              rules={[
                { required: true, message: "Please enter showroom name" },
              ]}
            >
              <Input placeholder="Dealer / showroom name" />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item label="Contact person" name="showroomContactPerson">
                <Input placeholder="Sales person name" />
              </Form.Item>
              <Form.Item label="Contact number" name="showroomContactNumber">
                <Input placeholder="10-digit mobile" maxLength={10} />
              </Form.Item>
            </div>

            <Form.Item label="Showroom address" name="showroomAddress">
              <Input.TextArea rows={2} placeholder="Showroom address" />
            </Form.Item>
          </div>

          {/* SECTION: Booking amount */}
          <div className="border border-border rounded-2xl bg-background p-4">
            {sectionHeader(
              "Booking amount",
              "Capture like showroom payment row",
              <BankOutlined className="text-rose-500" />,
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item
                label="Amount paid"
                name="bookingAmount"
                rules={[
                  { required: true, message: "Please enter booking amount" },
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  formatter={moneyFormatter}
                  parser={moneyParser}
                  placeholder="₹ 11,000"
                />
              </Form.Item>
              <Form.Item label="Booking date" name="bookingDate">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item
                label="Payment mode"
                name="bookingPaymentMode"
                rules={[
                  { required: true, message: "Please select payment mode" },
                ]}
              >
                <Select placeholder="Select mode">
                  <Option value="Online Transfer/UPI">
                    Online Transfer/UPI
                  </Option>
                  <Option value="Cash">Cash</Option>
                  <Option value="Cheque">Cheque</Option>
                  <Option value="DD">DD</Option>
                  <Option value="Credit Card">Credit Card</Option>
                  <Option value="Adjustment">Adjustment</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Bank name" name="bookingBankName">
                <Input placeholder="Bank / wallet" />
              </Form.Item>
            </div>

            <Form.Item label="Txn / reference no." name="bookingTxnRef">
              <Input placeholder="UTR / cheque no / ref no" />
            </Form.Item>

            <Form.Item label="Remarks" name="bookingRemarks">
              <Input.TextArea
                rows={2}
                placeholder="Any notes about booking payment"
              />
            </Form.Item>
          </div>

          {/* SECTION: Exchange */}
          <div className="border border-border rounded-2xl bg-background p-4">
            {sectionHeader(
              "Exchange vehicle",
              "Basic info if exchange is present",
              <SwapOutlined className="text-slate-500" />,
            )}

            <Form.Item
              label="Exchange vehicle present?"
              name="exchangePresent"
              rules={[
                { required: true, message: "Please select exchange option" },
              ]}
            >
              <Radio.Group>
                <Radio.Button value="No">No</Radio.Button>
                <Radio.Button value="Yes">Yes</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) =>
                prev.exchangePresent !== cur.exchangePresent
              }
            >
              {({ getFieldValue }) =>
                getFieldValue("exchangePresent") === "Yes" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Form.Item
                      label="Exchange make"
                      name="exchangeMake"
                      rules={[
                        {
                          required: true,
                          message: "Please enter exchange make",
                        },
                      ]}
                    >
                      <Input placeholder="Make" />
                    </Form.Item>
                    <Form.Item
                      label="Exchange model"
                      name="exchangeModel"
                      rules={[
                        {
                          required: true,
                          message: "Please enter exchange model",
                        },
                      ]}
                    >
                      <Input placeholder="Model" />
                    </Form.Item>
                    <Form.Item label="Mfg year" name="exchangeYear">
                      <InputNumber
                        min={2000}
                        max={2099}
                        style={{ width: "100%" }}
                        placeholder="2018"
                      />
                    </Form.Item>
                  </div>
                )
              }
            </Form.Item>
          </div>
        </div>
      </div>

      {/* FOOTER BUTTON */}
      <Divider />
      <div className="flex justify-end">
        <Button type="primary" htmlType="submit" loading={loading}>
          Save booking
        </Button>
      </div>
    </Form>
  );
};

export default NewCarBookingForm;
