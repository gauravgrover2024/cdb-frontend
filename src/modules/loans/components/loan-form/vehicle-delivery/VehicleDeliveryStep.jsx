import React, { useState, useEffect } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";

const VehicleDeliveryStep = ({ form }) => {
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [rcFile, setRcFile] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(false);
  const [viewRc, setViewRc] = useState(false);

  const loanType =
    Form.useWatch("typeOfLoan", form) || form.getFieldValue("typeOfLoan");
  const isFinanced =
    Form.useWatch("isFinanced", form) || form.getFieldValue("isFinanced");
  const approvalBankName =
    Form.useWatch("approval_bankName", form) ||
    form.getFieldValue("approval_bankName");

  const isNewCar = loanType === "New Car";
  const showHypothecation = isFinanced === "Yes";

  // Pre-fill dealer details from vehicle verification
  const dealerName = Form.useWatch("dealerName", form);
  const dealerContactPerson = Form.useWatch("dealerContactPerson", form);
  const dealerContactNumber = Form.useWatch("dealerContactNumber", form);
  const dealerAddress = Form.useWatch("dealerAddress", form);

  // Initialize Insurance by default to "Autocredits India LLP"
  useEffect(() => {
    const alreadyInitialized = form.getFieldValue("__deliveryInitialized");
    if (alreadyInitialized) return;

    form.setFieldsValue({
      insurance_by: "Autocredits India LLP",
      __deliveryInitialized: true,
    });
  }, [form]);

  const handleInvoiceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInvoiceFile({
        name: file.name,
        size: formatFileSize(file.size),
        url: URL.createObjectURL(file),
        file: file,
      });
    }
  };

  const handleRcUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRcFile({
        name: file.name,
        size: formatFileSize(file.size),
        url: URL.createObjectURL(file),
        file: file,
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Show message if not New Car
  if (!isNewCar) {
    return (
      <div className="bg-card rounded-lg shadow-elevation-2 p-8 text-center">
        <Icon
          name="Info"
          size={48}
          className="text-muted-foreground mx-auto mb-4"
        />
        <p className="text-base font-medium text-foreground">
          Vehicle Delivery section is only applicable for New Car loans
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Current loan type: {loanType || "Not selected"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Delivery Details Section */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Truck" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Delivery Details
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Vehicle delivery information
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item
              label="Delivery Date"
              name="delivery_date"
              className="mb-0"
            >
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item
              label="Dealer Name"
              name="delivery_dealerName"
              className="mb-0"
            >
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item
              label="Contact Person"
              name="delivery_dealerContactPerson"
              className="mb-0"
            >
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item
              label="Contact Number"
              name="delivery_dealerContactNumber"
              className="mb-0"
            >
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Dealer Address"
              name="delivery_dealerAddress"
              className="mb-0"
            >
              <textarea
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                rows={2}
              />
            </Form.Item>

            <Form.Item label="Delivery By" name="delivery_by" className="mb-0">
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                placeholder="e.g., Showroom Staff"
              />
            </Form.Item>
          </div>
        </div>
      </div>

      {/* Insurance Details Section */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Shield" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Insurance Details
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Vehicle insurance information
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Form.Item label="Insurance By" name="insurance_by" className="mb-0">
            <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
              <option value="">Select</option>
              <option value="Autocredits India LLP">
                Autocredits India LLP
              </option>
              <option value="Customer">Customer</option>
              <option value="Showroom">Showroom</option>
              <option value="Broker">Broker</option>
            </select>
          </Form.Item>

          <Form.Item
            label="Insurance Company Name"
            name="insurance_company_name"
            className="mb-0"
          >
            <input
              type="text"
              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              placeholder="e.g., HDFC ERGO"
            />
          </Form.Item>

          <Form.Item
            label="Policy Number"
            name="insurance_policy_number"
            className="mb-0"
          >
            <input
              type="text"
              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              placeholder="e.g., POL123456"
            />
          </Form.Item>
        </div>
      </div>

      {/* Invoice Details Section */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="FileText" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Invoice Details
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Vehicle invoice information
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item
              label="Invoice Number"
              name="invoice_number"
              className="mb-0"
            >
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                placeholder="e.g., INV-2025-001"
              />
            </Form.Item>

            <Form.Item
              label="Invoice Date"
              name="invoice_date"
              className="mb-0"
            >
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item
              label="Received As"
              name="invoice_received_as"
              className="mb-0"
            >
              <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                <option value="">Select</option>
                <option value="Original">Original</option>
                <option value="Photocopy">Photocopy</option>
              </select>
            </Form.Item>

            <Form.Item
              label="Received From"
              name="invoice_received_from"
              className="mb-0"
            >
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                placeholder="e.g., Dealer"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item
              label="Received Date"
              name="invoice_received_date"
              className="mb-0"
            >
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Upload Invoice
              </label>
              {!invoiceFile ? (
                <label
                  htmlFor="invoiceUpload"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <input
                    type="file"
                    id="invoiceUpload"
                    style={{ display: "none" }}
                    accept="image/*,.pdf"
                    onChange={handleInvoiceUpload}
                  />
                  <Icon name="Upload" size={16} />
                  <span>Upload</span>
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm border border-primary/20">
                    <Icon name="Tag" size={14} />
                    Invoice
                  </span>
                  <button
                    onClick={() => setViewInvoice(true)}
                    className="px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setInvoiceFile(null)}
                    className="px-3 py-1.5 border border-error/20 text-error rounded-md text-sm hover:bg-error/10"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RC Details Section */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="CreditCard" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              RC Details
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Registration certificate information
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item label="Regd No" name="rc_redg_no" className="mb-0">
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                placeholder="e.g., DL01AB1234"
              />
            </Form.Item>

            <Form.Item label="Chassis No" name="rc_chassis_no" className="mb-0">
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                placeholder="e.g., MA3EXXXX"
              />
            </Form.Item>

            <Form.Item label="Engine No" name="rc_engine_no" className="mb-0">
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                placeholder="e.g., K15BXXXX"
              />
            </Form.Item>

            <Form.Item label="Regd Date" name="rc_redg_date" className="mb-0">
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {showHypothecation && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Hypothecation
                </label>
                <div className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted/40 flex items-center gap-2">
                  <Icon name="Building2" size={14} className="text-primary" />
                  <span className="font-medium">{approvalBankName || "-"}</span>
                </div>
              </div>
            )}

            <Form.Item
              label="Received As"
              name="rc_received_as"
              className="mb-0"
            >
              <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                <option value="">Select</option>
                <option value="Original">Original</option>
                <option value="Photocopy">Photocopy</option>
              </select>
            </Form.Item>

            <Form.Item
              label="Received From"
              name="rc_received_from"
              className="mb-0"
            >
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                placeholder="e.g., RTO Office"
              />
            </Form.Item>

            <Form.Item
              label="Received Date"
              name="rc_received_date"
              className="mb-0"
            >
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Upload RC
              </label>
              {!rcFile ? (
                <label
                  htmlFor="rcUpload"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <input
                    type="file"
                    id="rcUpload"
                    style={{ display: "none" }}
                    accept="image/*,.pdf"
                    onChange={handleRcUpload}
                  />
                  <Icon name="Upload" size={16} />
                  <span>Upload</span>
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm border border-primary/20">
                    <Icon name="Tag" size={14} />
                    RC
                  </span>
                  <button
                    onClick={() => setViewRc(true)}
                    className="px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setRcFile(null)}
                    className="px-3 py-1.5 border border-error/20 text-error rounded-md text-sm hover:bg-error/10"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>  
          </div>
        </div>
      </div>

      {/* Invoice Viewer Modal */}
      {viewInvoice && invoiceFile && (
        <DocumentViewerModal
          document={invoiceFile}
          title="Invoice"
          onClose={() => setViewInvoice(false)}
        />
      )}

      {/* RC Viewer Modal */}
      {viewRc && rcFile && (
        <DocumentViewerModal
          document={rcFile}
          title="RC Document"
          onClose={() => setViewRc(false)}
        />
      )}
    </div>
  );
};

const DocumentViewerModal = ({ document, title, onClose }) => {
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="Eye" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {title}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20">
          <img
            src={document.url}
            alt={document.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        <div className="flex justify-between items-center px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {document.name} • {document.size}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
              size="sm"
              onClick={() => {
                const link = document.createElement("a");
                link.href = document.url;
                link.download = document.name;
                link.click();
              }}
            >
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDeliveryStep;
