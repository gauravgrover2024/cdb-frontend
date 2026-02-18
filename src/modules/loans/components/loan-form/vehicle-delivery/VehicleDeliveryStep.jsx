import React, { useState, useEffect } from "react";
import { Form, message, Spin } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import { uploadToCloudinary } from "../../../../../utils/cloudinary";

// Helper component to handle date input formatting
// Converts incoming value (DayJS, Date, timestamp, string) to yyyy-MM-dd
// Returns yyyy-MM-dd string on change
const DateInput = ({ value, onChange, ...props }) => {
  const formattedValue = React.useMemo(() => {
    if (!value) return "";
    try {
        // If it's a DayJS object (has format function)
        if (value && typeof value.format === 'function') {
            return value.format('YYYY-MM-DD');
        }
        // If it's a string or number (timestamp)
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch (e) {
        console.warn("Date parsing error", e);
        return "";
    }
    return "";
  }, [value]);

  return (
    <div className="relative">
      <Icon
        name="Calendar"
        size={16}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        type="date"
        className="w-full border border-border rounded-md pl-9 pr-2 py-1 text-sm bg-background text-foreground"
        value={formattedValue}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
    </div>
  );
};

/**
 * VEHICLE DELIVERY STEP COMPONENT
 * 
 * PURPOSE:
 * Manages vehicle delivery details including invoice, RC, and insurance information
 * 
 * BACKEND INTEGRATION:
 * - Data Source/Update: Loan model
 * - Fields Managed:
 *   • delivery_date: Date of vehicle delivery
 *   • delivery_dealerName, delivery_dealerContactPerson, delivery_dealerContactNumber, delivery_dealerAddress
 *   • delivery_by: Who handled delivery ("Dealer" / "Autocredits")
 *   • insurance_by: Insurance handled by (default: "Autocredits India LLP")
 *   • insurance_company_name, insurance_policy_number
 *   • invoice_number, invoice_date, invoice_received_as, invoice_received_from, invoice_received_date
 *   • rc_redg_no, rc_chassis_no, rc_engine_no, rc_redg_date
 *   • rc_received_as, rc_received_from, rc_received_date
 *   • delivery_invoiceFile, delivery_rcFile: File uploads (Cloudinary URLs)
 */
const VehicleDeliveryStep = ({ form }) => {
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [rcFile, setRcFile] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(false);
  const [viewRc, setViewRc] = useState(false);
  
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingRc, setUploadingRc] = useState(false);

  const loanType =
    Form.useWatch("typeOfLoan", form) || form.getFieldValue("typeOfLoan");
  const isFinanced =
    Form.useWatch("isFinanced", form) || form.getFieldValue("isFinanced");
  const approvalBankName =
    Form.useWatch("approval_bankName", form) ||
    form.getFieldValue("approval_bankName");

  const isNewCar = loanType === "New Car";
  const isRefinance = loanType === "Refinance";
  const isCarCashIn = loanType === "Car Cash-in";
  const showHypothecation = isFinanced === "Yes";

  // Pre-fill dealer details from vehicle verification
  useEffect(() => {
    const dealerName = form.getFieldValue("dealerName");
    const dealerContactPerson = form.getFieldValue("dealerContactPerson");
    const dealerContactNumber = form.getFieldValue("dealerContactNumber");
    const dealerAddress = form.getFieldValue("dealerAddress");

    // Only set if delivery fields are empty
    if (dealerName && !form.getFieldValue("delivery_dealerName")) {
      form.setFieldsValue({
        delivery_dealerName: dealerName,
        delivery_dealerContactPerson: dealerContactPerson,
        delivery_dealerContactNumber: dealerContactNumber,
        delivery_dealerAddress: dealerAddress,
      });
    }
  }, [form]);

  // Initialize Insurance by default to "Autocredits India LLP"
  useEffect(() => {
    const alreadyInitialized = form.getFieldValue("__deliveryInitialized");
    if (alreadyInitialized) return;

    form.setFieldsValue({
      insurance_by: "Autocredits India LLP",
      __deliveryInitialized: true,
    });
  }, [form]);

  // Sync local file state to the form (URL String only)
  useEffect(() => {
    if (invoiceFile !== undefined) {
        form.setFieldValue("delivery_invoiceFile", invoiceFile ? invoiceFile.url : null);
    }
    if (rcFile !== undefined) {
        form.setFieldValue("delivery_rcFile", rcFile ? rcFile.url : null);
    }
  }, [invoiceFile, rcFile, form]);

  // Load initial files from form if editing
  // We use a ref to track if we've initialized to avoid overwrite loops
  const initializedFiles = React.useRef(false);

  useEffect(() => {
    if (initializedFiles.current) return;

    const initialInvoice = form.getFieldValue("delivery_invoiceFile");
    const initialRc = form.getFieldValue("delivery_rcFile");
    
    // Helper to safely parse initial value
    const parseInitialFile = (val) => {
      if (!val) return null;
      if (typeof val === 'string') {
        // It's a URL string from DB
        const name = val.split('/').pop() || "Document";
        return { name: name, size: "", url: val };
      }
      // It's an object (maybe from draft)
      return val;
    };

    if (initialInvoice) setInvoiceFile(parseInitialFile(initialInvoice));
    if (initialRc) setRcFile(parseInitialFile(initialRc));
    
    initializedFiles.current = true;
  }, [form]);

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadingInvoice(true);
        const data = await uploadToCloudinary(file);
        
        setInvoiceFile({
          name: file.name,
          size: formatFileSize(file.size),
          url: data.secure_url,
        });
        message.success("Invoice uploaded successfully");
      } catch (error) {
        console.error("Upload failed", error);
        message.error("Failed to upload invoice. Please try again.");
      } finally {
        setUploadingInvoice(false);
      }
    }
  };

  const handleRcUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadingRc(true);
        const data = await uploadToCloudinary(file);
        
        setRcFile({
          name: file.name,
          size: formatFileSize(file.size),
          url: data.secure_url,
        });
        message.success("RC uploaded successfully");
      } catch (error) {
        console.error("Upload failed", error);
        message.error("Failed to upload RC. Please try again.");
      } finally {
        setUploadingRc(false);
      }
    }
  };

  // Show message if Refinance or Car Cash-in
  if (isRefinance || isCarCashIn) {
    return (
      <div className="bg-card rounded-lg shadow-elevation-2 border border-border/60 p-8 text-center">
        <Icon
          name="AlertCircle"
          size={48}
          className="text-amber-500 mx-auto mb-4"
        />
        <p className="text-base font-medium text-foreground">
          Vehicle Delivery module is disabled for {loanType} loans
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          This section is only applicable for New Car and Used Car loans
        </p>
      </div>
    );
  }

  // Show message if not New Car
  if (!isNewCar) {
    return (
      <div className="bg-card rounded-lg shadow-elevation-2 border border-border/60 p-8 text-center">
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
      <div className="bg-card rounded-lg shadow-elevation-2 border border-border/60 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <Icon name="Truck" size={22} className="text-white" />
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
              getValueProps={(val) => ({ value: val })} 
            >
               <DateInput />
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
      <div className="bg-card rounded-lg shadow-elevation-2 border border-border/60 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <Icon name="Shield" size={22} className="text-white" />
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
      <div className="bg-card rounded-lg shadow-elevation-2 border border-border/60 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <Icon name="FileText" size={22} className="text-white" />
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
              getValueProps={(val) => ({ value: val })}
            >
               <DateInput />
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
              getValueProps={(val) => ({ value: val })}
            >
               <DateInput />
            </Form.Item>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Upload Invoice
              </label>
              {!invoiceFile ? (
                <label
                  htmlFor="invoiceUpload"
                  className={`w-full h-10 inline-flex items-center justify-center gap-2 px-4 border-2 border-dashed border-border/60 rounded-lg text-sm transition-all group ${uploadingInvoice ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/60 hover:bg-primary/5'}`}
                >
                  <input
                    type="file"
                    id="invoiceUpload"
                    style={{ display: "none" }}
                    accept="image/*,.pdf"
                    onChange={handleInvoiceUpload}
                    disabled={uploadingInvoice}
                  />
                  {uploadingInvoice ? (
                    <>
                      <Spin size="small" />
                      <span className="text-muted-foreground">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <div className="bg-primary/10 p-1 rounded-md group-hover:bg-primary/20 transition-colors">
                        <Icon name="Upload" size={14} className="text-primary" />
                      </div>
                      <span className="text-muted-foreground group-hover:text-primary font-medium">Upload File</span>
                    </>
                  )}
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm border border-primary/20 max-w-[120px] truncate">
                    <Icon name="Tag" size={14} />
                    {invoiceFile.name}
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
      <div className="bg-card rounded-lg shadow-elevation-2 border border-border/60 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/20 flex items-center justify-center">
            <Icon name="CreditCard" size={22} className="text-white" />
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

            <Form.Item label="Regd Date" name="rc_redg_date" className="mb-0" getValueProps={(val) => ({ value: val })}>
              <DateInput />
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
              getValueProps={(val) => ({ value: val })}
            >
               <DateInput />
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
                  className={`w-full h-10 inline-flex items-center justify-center gap-2 px-4 border-2 border-dashed border-border/60 rounded-lg text-sm transition-all group ${uploadingRc ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/60 hover:bg-primary/5'}`}
                >
                  <input
                    type="file"
                    id="rcUpload"
                    style={{ display: "none" }}
                    accept="image/*,.pdf"
                    onChange={handleRcUpload}
                    disabled={uploadingRc}
                  />
                  {uploadingRc ? (
                    <>
                      <Spin size="small" />
                      <span className="text-muted-foreground">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <div className="bg-primary/10 p-1 rounded-md group-hover:bg-primary/20 transition-colors">
                        <Icon name="Upload" size={14} className="text-primary" />
                      </div>
                      <span className="text-muted-foreground group-hover:text-primary font-medium">Upload File</span>
                    </>
                  )}
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm border border-primary/20 max-w-[120px] truncate">
                    <Icon name="Tag" size={14} />
                    {rcFile.name}
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
