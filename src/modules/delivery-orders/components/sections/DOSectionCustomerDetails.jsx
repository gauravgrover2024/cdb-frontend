import React, { useEffect } from "react";
import { Form } from "antd";
import dayjs from "dayjs";
import Icon from "../../../../components/AppIcon";

const DOSectionCustomerDetails = ({ form, readOnly = false }) => {
  // Prefill from loan profile fields
  const customerName = Form.useWatch("customerName", form);
  const residenceAddress = Form.useWatch("residenceAddress", form);
  const pincode = Form.useWatch("pincode", form);
  const city = Form.useWatch("city", form);

  const recordSource = Form.useWatch("recordSource", form);
  const sourceName = Form.useWatch("sourceName", form);

  // DO fields
  const doDate = Form.useWatch("do_date", form);
  const doRefNo = Form.useWatch("do_refNo", form);

  // Auto-generate DO ref no (only if missing)
  useEffect(() => {
    if (!form) return;

    const existingRef = form.getFieldValue("do_refNo");
    if (!existingRef) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 999999)
        .toString()
        .padStart(6, "0");
      form.setFieldsValue({
        do_refNo: `DO-${year}-${random}`,
      });
    }

    const existingDate = form.getFieldValue("do_date");
    if (!existingDate) {
      form.setFieldsValue({
        do_date: dayjs(),
      });
    }
  }, [form]);

  const sourceText = recordSource
    ? recordSource === "Indirect"
      ? `Indirect (${sourceName || "-"})`
      : "Direct"
    : "-";

  return (
    <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Section 1 — Customer Details
      </h2>

      {/* Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Date
          </label>
          <Form.Item name="do_date" style={{ marginBottom: 0 }}>
              <div className="relative">
                <Icon
                  name="Calendar"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="date"
                  className="w-full border border-border rounded-md pl-10 pr-3 py-2 text-sm bg-background text-foreground"
                  disabled={readOnly}
                  value={doDate ? dayjs(doDate).format("YYYY-MM-DD") : ""}
                  onChange={(e) =>
                    form.setFieldsValue({ do_date: dayjs(e.target.value) })
                  }
                />
              </div>
          </Form.Item>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Ref No (DO Number)
          </label>
          <Form.Item name="do_refNo" style={{ marginBottom: 0 }}>
            <input
              type="text"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40"
              value={doRefNo || ""}
              disabled
            />
          </Form.Item>
        </div>
      </div>

      {/* Customer Prefilled Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Customer Name
          </label>
          <input
            type="text"
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40"
            value={customerName || "-"}
            disabled
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            City
          </label>
          <input
            type="text"
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40"
            value={city || "-"}
            disabled
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Address
          </label>
          <textarea
            rows={2}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40"
            value={residenceAddress || "-"}
            disabled
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Pincode
          </label>
          <input
            type="text"
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40"
            value={pincode || "-"}
            disabled
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Source
          </label>
          <input
            type="text"
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40"
            value={sourceText}
            disabled
          />
        </div>
      </div>
    </div>
  );
};

export default DOSectionCustomerDetails;
