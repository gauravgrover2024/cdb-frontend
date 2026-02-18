// src/modules/loans/components/LoanStickyHeader.jsx
import React, { useState } from "react";
import { Form, message } from "antd";
import dayjs from "dayjs";

import Icon from "../../../components/AppIcon";
import { AutoSaveIndicator } from "../../../utils/formDataProtection";
import NotesModal from "./NotesModal";
import DocumentsModal from "./DocumentsModal";

/* --------------------------- Helpers --------------------------- */
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (v) => {
  const n = toNumber(v);
  if (!n) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const formatPercent = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n}%`;
};

/* --------------------------- Sub-Components --------------------------- */
const HeaderStat = ({ label, value, hide = false }) => {
  if (hide) return null;
  return (
    <div className="flex flex-col border-r border-border/50 px-4 last:border-0 first:pl-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground truncate max-w-[150px]">
        {value === undefined || value === null || value === "" ? "" : value}
      </span>
    </div>
  );
};

/* --------------------------- Main Sticky Header --------------------------- */
const LoanStickyHeader = ({
  title,
  onSave,
  activeStep,
  isFinanced,
  form,
  isDisbursed,
  saving = false,
  innerRef,
  autoSaveStatus = null,
}) => {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);

  // Watch fields (use actual form field names so data shows; fallbacks for API-loaded names)
  const loanId = Form.useWatch("loanId", form);
  const customerName = Form.useWatch("customerName", form);
  const primaryMobile = Form.useWatch("primaryMobile", form);
  const customerEmailWatch = Form.useWatch("customerEmail", form);
  const emailWatch = Form.useWatch("email", form);
  const customerPanWatch = Form.useWatch("customerPan", form);
  const panNumberWatch = Form.useWatch("panNumber", form);
  const customerAadharWatch = Form.useWatch("customerAadhar", form);
  const aadhaarNumberWatch = Form.useWatch("aadhaarNumber", form);
  const customerAddressWatch = Form.useWatch("customerAddress", form);
  const residenceAddressWatch = Form.useWatch("residenceAddress", form);
  const permanentAddressWatch = Form.useWatch("permanentAddress", form);
  const city = Form.useWatch("city", form);
  const caseTypeWatch = Form.useWatch("caseType", form);
  const typeOfLoanWatch = Form.useWatch("typeOfLoan", form);
  const loanTypeWatch = Form.useWatch("loanType", form);
  const caseType = caseTypeWatch || typeOfLoanWatch || loanTypeWatch;
  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);
  const vehicleVariant = Form.useWatch("vehicleVariant", form);
  const vehicleRegNoWatch = Form.useWatch("vehicleRegNo", form);
  const rcRedgNoWatch = Form.useWatch("rc_redg_no", form);
  const vehicleChassisNoWatch = Form.useWatch("vehicleChassisNo", form);
  const rcChassisNoWatch = Form.useWatch("rc_chassis_no", form);
  const vehicleEngineNoWatch = Form.useWatch("vehicleEngineNo", form);
  const rcEngineNoWatch = Form.useWatch("rc_engine_no", form);
  const approvalStatus = Form.useWatch("approval_status", form);
  const approvalBankName = Form.useWatch("approval_bankName", form);
  const approvalLoanAmountApproved = Form.useWatch("approval_loanAmountApproved", form);
  const financeExpectation = Form.useWatch("financeExpectation", form);
  const postfileEmiAmount = Form.useWatch("postfile_emiAmount", form);
  const postfileRoi = Form.useWatch("postfile_roi", form);
  const approvalTenureMonths = Form.useWatch("approval_tenureMonths", form);
  const downPayment = Form.useWatch("downPayment", form);
  const exShowroomPrice = Form.useWatch("exShowroomPrice", form);
  const onRoadPrice = Form.useWatch("onRoadPrice", form);
  const coApplicantNameWatch = Form.useWatch("coApplicant_name", form);
  const coNameWatch = Form.useWatch("co_name", form);
  const guarantorNameWatch = Form.useWatch("guarantor_name", form);
  const guNameWatch = Form.useWatch("gu_name", form);
  const disbursementDate = Form.useWatch("disbursement_date", form);
  const rcReceivedDate = Form.useWatch("rc_received_date", form);
  const invoiceNumber = Form.useWatch("invoice_number", form);
  const createdAt = Form.useWatch("createdAt", form);

  const customerEmail = customerEmailWatch || emailWatch;
  const customerPan = customerPanWatch || panNumberWatch;
  const customerAadhar = customerAadharWatch || aadhaarNumberWatch;
  const customerAddress = customerAddressWatch || residenceAddressWatch || permanentAddressWatch;
  const vehicleRegNo = vehicleRegNoWatch || rcRedgNoWatch;
  const vehicleChassisNo = vehicleChassisNoWatch || rcChassisNoWatch;
  const vehicleEngineNo = vehicleEngineNoWatch || rcEngineNoWatch;
  const coApplicantName = coApplicantNameWatch || coNameWatch;
  const guarantorName = guarantorNameWatch || guNameWatch;

  const isBeforeOrAtApproval = ["profile", "prefile", "approval"].includes(activeStep);
  
  const amountLabel = approvalStatus === "Disbursed" ? "Disbursed" : 
                      approvalStatus === "Approved" ? "Approved" : "Expected";

  const amountValue = isBeforeOrAtApproval ? financeExpectation : approvalLoanAmountApproved;

  return (
    <>
      <div 
        ref={innerRef} 
        className="fixed left-0 right-0 z-[100] w-full bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
        style={{ top: 60 }}
      >
        <div className="max-w-[1600px] mx-auto px-6 py-2">
          <div className="flex items-center justify-between gap-6">
            
            {/* Left Section: Identity */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Icon name="User" size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-base font-bold text-foreground truncate leading-tight">
                    {customerName || title || "New Application"}
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground uppercase tracking-tight">
                    {approvalStatus || activeStep}
                  </span>
                  <AutoSaveIndicator status={autoSaveStatus} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                  {loanId && <span className="text-primary/80 font-mono">#{loanId}</span>}
                  <span className="flex items-center gap-1">
                    <Icon name="Phone" size={12} /> {primaryMobile || ""}
                  </span>
                  {city && <span>• {city}</span>}
                </div>
                {(coApplicantName || guarantorName) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/75 mt-1">
                    {coApplicantName && <span><b>Co-App:</b> {coApplicantName}</span>}
                    {guarantorName && <span>|</span>}
                    {guarantorName && <span><b>Guarantor:</b> {guarantorName}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Section: Quick Stats Divider */}
            <div className="hidden lg:flex flex-1 items-center justify-center border-x border-border/60 px-4 mx-2 overflow-x-auto">
              <HeaderStat label="Case Type" value={caseType} />
              <HeaderStat 
                label="Vehicle" 
                value={vehicleMake ? `${vehicleMake} ${vehicleModel || ""} ${vehicleVariant || ""}`.trim() : null} 
              />
              <HeaderStat label="Vehicle Reg No" value={vehicleRegNo} hide={!vehicleRegNo} />
              <HeaderStat label="Chassis No" value={vehicleChassisNo} hide={!vehicleChassisNo} />
              <HeaderStat label="Engine No" value={vehicleEngineNo} hide={!vehicleEngineNo} />
              <HeaderStat 
                label="Ex-Showroom" 
                value={formatMoney(exShowroomPrice)}
                hide={!exShowroomPrice}
              />
              <HeaderStat 
                label="On-Road Price" 
                value={formatMoney(onRoadPrice)}
                hide={!onRoadPrice}
              />
              <HeaderStat 
                label="Down Payment" 
                value={formatMoney(downPayment)}
                hide={!downPayment}
              />
              <HeaderStat 
                label={amountLabel} 
                value={formatMoney(amountValue)} 
                hide={isFinanced !== "Yes"} 
              />
              <HeaderStat 
                label="Bank" 
                value={approvalBankName} 
                hide={!approvalBankName} 
              />
              <HeaderStat 
                label="Tenure" 
                value={approvalTenureMonths ? `${approvalTenureMonths}M` : null}
                hide={!approvalTenureMonths}
              />
              <HeaderStat 
                label="EMI" 
                value={formatMoney(postfileEmiAmount)}
                hide={!postfileEmiAmount}
              />
              <HeaderStat 
                label="ROI" 
                value={formatPercent(postfileRoi)}
                hide={!postfileRoi}
              />
              <HeaderStat label="Disbursement Date" value={disbursementDate ? dayjs(disbursementDate).format("DD MMM YYYY") : ""} hide={!disbursementDate} />
              <HeaderStat label="RC Received" value={rcReceivedDate ? dayjs(rcReceivedDate).format("DD MMM YYYY") : ""} hide={!rcReceivedDate} />
              <HeaderStat label="Invoice No" value={invoiceNumber} hide={!invoiceNumber} />
              <HeaderStat label="Created" value={createdAt ? dayjs(createdAt).format("DD MMM YYYY") : ""} hide={!createdAt} />
              <HeaderStat label="Email" value={customerEmail} hide={!customerEmail} />
              <HeaderStat label="PAN" value={customerPan} hide={!customerPan} />
              <HeaderStat label="Aadhar" value={customerAadhar} hide={!customerAadhar} />
              <HeaderStat label="Address" value={customerAddress} hide={!customerAddress} />
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center mr-2 border-r border-border pr-4 gap-3">
                <button 
                  onClick={() => setShowDocumentsModal(true)}
                  className="flex items-center gap-1.5 p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                  title="Documents"
                >
                  <Icon name="Files" size={18} />
                  <p className="text-xs font-medium">{ "Documents"}</p>
                </button>
                <button 
                  onClick={() => setShowNotesModal(true)}
                  className="flex items-center gap-1.5 p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                  title="Notes"
                >
                  <Icon name="MessageSquare" size={18} />
                  <p className="text-xs font-medium">{ "Notes"}</p>
                </button>
              </div>

              {/* <button
                onClick={onSave}
                disabled={saving}
                className={`
                  relative flex items-center gap-2 px-5 py-2 rounded-md font-semibold text-xs transition-all
                  ${saving 
                    ? "bg-muted text-muted-foreground cursor-not-allowed" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-sm"}
                `}
              >
                {saving ? (
                  <>
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Icon name="Save" size={14} />
                    Save Application
                  </>
                )}
              </button> */}
            </div>
          </div>
        </div>
      </div>

      <NotesModal
        open={showNotesModal}
        form={form}
        title={customerName || "Applicant"}
        onClose={() => setShowNotesModal(false)}
      />

      <DocumentsModal
        open={showDocumentsModal}
        title={customerName || "Applicant"}
        onClose={() => setShowDocumentsModal(false)}
      />
    </>
  );
};

export default LoanStickyHeader;