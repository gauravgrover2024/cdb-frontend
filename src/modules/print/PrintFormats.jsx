// src/modules/print/PrintFormats.jsx
// Point 9: Print formats for Customer Profile, DO, and Bills
import React from "react";
import dayjs from "dayjs";
import "./print.css";

const fmt = (v) => (v === undefined || v === null || v === "" ? "—" : String(v));
const fmtDate = (v) => (v ? dayjs(v).format("DD MMM YYYY") : "—");
const money = (n) => `₹ ${Math.trunc(Number(n) || 0).toLocaleString("en-IN")}`;

const Field = ({ label, value }) => (
  <div className="print-field">
    <span className="print-label">{label}</span>
    <span className="print-value">{fmt(value)}</span>
  </div>
);

const SectionTitle = ({ children }) => (
  <div className="print-section-title">{children}</div>
);

// ─── 1. Customer Profile Print ───────────────────────────────────────────────
export const CustomerProfilePrint = ({ loan = {} }) => (
  <div className="print-area" style={{ padding: 24 }}>
    <div className="print-header">
      <div>
        <div className="print-title">Autocredits India LLP</div>
        <div className="print-subtitle">Customer Profile</div>
      </div>
      <div style={{ textAlign: "right", fontSize: 11 }}>
        <div><strong>Loan ID:</strong> {fmt(loan.loanId)}</div>
        <div><strong>Date:</strong> {fmtDate(loan.createdAt)}</div>
      </div>
    </div>

    <div className="print-section">
      <SectionTitle>Personal Details</SectionTitle>
      <div className="print-grid">
        <Field label="Customer Name" value={loan.customerName} />
        <Field label="Mobile" value={loan.primaryMobile} />
        <Field label="Email" value={loan.email} />
        <Field label="Date of Birth" value={fmtDate(loan.dob)} />
        <Field label="Gender" value={loan.gender} />
        <Field label="PAN" value={loan.panNumber} />
        <Field label="Aadhaar" value={loan.aadhaarNumber} />
        <Field label="Address" value={loan.residenceAddress} />
        <Field label="City" value={loan.city} />
        <Field label="Pincode" value={loan.pincode} />
      </div>
    </div>

    <div className="print-section">
      <SectionTitle>Employment & Income</SectionTitle>
      <div className="print-grid">
        <Field label="Occupation" value={loan.occupationType} />
        <Field label="Company" value={loan.companyName} />
        <Field label="Monthly Income" value={loan.monthlySalary || loan.monthlyIncome} />
        <Field label="Annual Income" value={loan.annualIncome} />
      </div>
    </div>

    <div className="print-section">
      <SectionTitle>Vehicle & Loan</SectionTitle>
      <div className="print-grid">
        <Field label="Vehicle" value={`${loan.vehicleMake || ""} ${loan.vehicleModel || ""} ${loan.vehicleVariant || ""}`.trim()} />
        <Field label="Loan Type" value={loan.typeOfLoan} />
        <Field label="Loan Amount" value={loan.loanAmount} />
        <Field label="Bank" value={loan.approval_bankName} />
        <Field label="Stage" value={loan.currentStage} />
        <Field label="Status" value={loan.status} />
      </div>
    </div>

    <div className="print-footer">
      <span>Autocredits India LLP · Confidential</span>
      <span>Printed: {dayjs().format("DD MMM YYYY, hh:mm A")}</span>
    </div>
  </div>
);

// ─── 2. Delivery Order Print ─────────────────────────────────────────────────
export const DOPrint = ({ doData = {}, loan = {} }) => {
  const asInt = (v) => Math.trunc(Number(v) || 0);

  return (
    <div className="print-area" style={{ padding: 24 }}>
      <div className="print-header">
        <div>
          <div className="print-title">Autocredits India LLP</div>
          <div className="print-subtitle">Delivery Order</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          <div><strong>DO Ref:</strong> {fmt(doData.do_refNo)}</div>
          <div><strong>DO Date:</strong> {fmtDate(doData.do_date || doData.do_bookingDate)}</div>
          <div><strong>Loan ID:</strong> {fmt(doData.loanId)}</div>
        </div>
      </div>

      <div className="print-section">
        <SectionTitle>Customer Details</SectionTitle>
        <div className="print-grid">
          <Field label="Customer Name" value={doData.customerName || loan.customerName} />
          <Field label="Mobile" value={loan.primaryMobile} />
          <Field label="Address" value={doData.residenceAddress || loan.residenceAddress} />
          <Field label="City" value={doData.city || loan.city} />
        </div>
      </div>

      <div className="print-section">
        <SectionTitle>Dealer Details</SectionTitle>
        <div className="print-grid">
          <Field label="Dealer Name" value={doData.do_dealerName || doData.dealerName} />
          <Field label="Dealer Address" value={doData.do_dealerAddress || doData.dealerAddress} />
          <Field label="Dealer Code" value={doData.dealerCode} />
        </div>
      </div>

      <div className="print-section">
        <SectionTitle>Vehicle Details</SectionTitle>
        <div className="print-grid-3">
          <Field label="Make" value={doData.do_vehicleMake || loan.vehicleMake} />
          <Field label="Model" value={doData.do_vehicleModel || loan.vehicleModel} />
          <Field label="Variant" value={doData.do_vehicleVariant || loan.vehicleVariant} />
          <Field label="Colour" value={doData.do_colour || doData.vehicleColor} />
          <Field label="Chassis No." value={doData.chassisNumber || loan.chassisNumber} />
          <Field label="Engine No." value={doData.engineNumber || loan.engineNumber} />
        </div>
      </div>

      <div className="print-section">
        <SectionTitle>DO Amount Breakdown</SectionTitle>
        <div style={{ maxWidth: 360 }}>
          <div className="print-amount-row"><span>On-road Vehicle Cost</span><span>{money(doData.do_onRoadVehicleCost)}</span></div>
          <div className="print-amount-row"><span>Margin Money Paid</span><span>- {money(doData.do_marginMoneyPaid)}</span></div>
          <div className="print-amount-row"><span>Discount Applied</span><span>- {money(doData.do_selectedEffectiveTotalDiscount || doData.do_totalDiscount)}</span></div>
          <div className="print-amount-row"><span>Net Finance (Loan - PF)</span><span>- {money(doData.do_financeDeduction)}</span></div>
          <div className="print-amount-row"><span>Insurance Deduction</span><span>- {money(doData.do_insuranceDeduction)}</span></div>
          <div className="print-amount-row total"><span>Net DO Amount (Payable)</span><span>{money(doData.do_netDOAmount)}</span></div>
        </div>
      </div>

      <div className="print-section">
        <SectionTitle>Finance Details</SectionTitle>
        <div className="print-grid">
          <Field label="Loan Amount" value={doData.do_loanAmount} />
          <Field label="Processing Fees" value={doData.do_processingFees} />
          <Field label="Hypothecation Bank" value={doData.do_hypothecation} />
          <Field label="Registration City" value={doData.do_redgCity} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
        <div className="print-sign-box">Authorised Signatory (Autocredits)</div>
        <div className="print-sign-box">Dealer Signature</div>
        <div className="print-sign-box">Customer Signature</div>
      </div>

      <div className="print-footer">
        <span>Autocredits India LLP · Delivery Order</span>
        <span>Printed: {dayjs().format("DD MMM YYYY, hh:mm A")}</span>
      </div>
    </div>
  );
};

// ─── 3. Bill / Invoice Print ─────────────────────────────────────────────────
export const BillPrint = ({ payment = {}, loan = {} }) => (
  <div className="print-area" style={{ padding: 24 }}>
    <div className="print-header">
      <div>
        <div className="print-title">Autocredits India LLP</div>
        <div className="print-subtitle">Commission Bill / Invoice</div>
      </div>
      <div style={{ textAlign: "right", fontSize: 11 }}>
        <div><strong>Bill No:</strong> {fmt(payment.bill_number || payment.billNumber)}</div>
        <div><strong>Bill Date:</strong> {fmtDate(payment.bill_date || payment.billDate)}</div>
        <div><strong>Loan ID:</strong> {fmt(payment.loanId)}</div>
      </div>
    </div>

    <div className="print-section">
      <SectionTitle>Billed To</SectionTitle>
      <div className="print-grid">
        <Field label="Showroom / Dealer" value={payment.showroomName} />
        <Field label="Customer" value={loan.customerName} />
        <Field label="Vehicle" value={`${loan.vehicleMake || ""} ${loan.vehicleModel || ""}`.trim()} />
        <Field label="Loan ID" value={payment.loanId} />
      </div>
    </div>

    <div className="print-section">
      <SectionTitle>Commission Details</SectionTitle>
      <table className="print-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Commission Receivable from Showroom</td>
            <td style={{ textAlign: "right" }}>{money(payment.commissionReceivableFromShowroom)}</td>
          </tr>
          <tr>
            <td>Commission Received</td>
            <td style={{ textAlign: "right" }}>{money(payment.commissionReceivedFromShowroom)}</td>
          </tr>
          <tr>
            <td><strong>Outstanding Commission</strong></td>
            <td style={{ textAlign: "right" }}><strong>{money(payment.outstandingCommissionFromShowroom)}</strong></td>
          </tr>
          {Number(payment.excessPaymentToShowroom) > 0 && (
            <tr>
              <td>Excess Payment to Showroom</td>
              <td style={{ textAlign: "right" }}>{money(payment.excessPaymentToShowroom)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
      <div className="print-sign-box">Authorised Signatory (Autocredits)</div>
      <div className="print-sign-box">Showroom Acknowledgement</div>
    </div>

    <div className="print-footer">
      <span>Autocredits India LLP · Commission Bill</span>
      <span>Printed: {dayjs().format("DD MMM YYYY, hh:mm A")}</span>
    </div>
  </div>
);
