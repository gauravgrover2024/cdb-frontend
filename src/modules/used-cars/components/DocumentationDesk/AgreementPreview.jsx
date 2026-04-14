import React from "react";
import { Modal, Button, Tag, Divider, Table } from "antd";
import { PrinterOutlined, DownloadOutlined, CloseOutlined } from "@ant-design/icons";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";

// ── Document Styles ──────────────────────────────────────────────
const styles = {
  container: "max-w-[850px] mx-auto bg-white p-12 text-slate-900 leading-relaxed shadow-sm print:shadow-none print:p-0 font-serif",
  h1: "text-center text-xl font-black uppercase tracking-widest mb-8 border-b-2 border-slate-900 pb-2",
  h2: "text-center text-lg font-black uppercase tracking-tight mb-6 mt-10",
  body: "text-[13px] text-justify space-y-4",
  clause: "mb-3",
  table: "w-full border-collapse border border-slate-950 my-6 text-[12px]",
  th: "border border-slate-950 p-2 bg-slate-50 font-black text-left",
  td: "border border-slate-950 p-2 px-4",
  signatureLine: "w-48 border-t border-slate-900 mt-20 mb-2",
  pageBreak: "print:page-break-after-always h-12 print:h-0",
  receipt: "bg-slate-50 p-6 rounded-lg border border-slate-200 my-8 print:bg-white print:border-slate-950",
};

export default function AgreementPreview({ visible, onCancel, data = {} }) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = data.agreementDate ? dayjs(data.agreementDate).format("DD MMM YYYY") : dayjs().format("DD MMM YYYY");
  const formattedPrice = Number(data.vehiclePrice || 0).toLocaleString("en-IN");
  const formattedHoldback = Number(data.holdbackAmount || 0).toLocaleString("en-IN");
  const formattedFees = Number(data.feesByUser || 0).toLocaleString("en-IN");
  const netPayable = (data.vehiclePrice || 0) - (data.feesByUser || 0) - (data.holdbackAmount || 0);

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      className="agreement-modal"
      centered
      closeIcon={<div className="bg-white/10 p-2 rounded-full backdrop-blur-md border border-white/20"><CloseOutlined className="text-white" /></div>}
    >
      <div className="flex justify-between items-center mb-6 bg-slate-900 p-4 -mx-6 -mt-6 rounded-t-xl sticky top-0 z-50">
        <div className="flex items-center gap-3 text-white">
          <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center">
            <PrinterOutlined className="text-xl" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Agreement Builder</p>
            <h2 className="text-lg font-black leading-none">Legal Contract Preview</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<DownloadOutlined />} className="!rounded-xl !bg-white/10 !border-white/20 !text-white font-bold">Download PDF</Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint} className="!rounded-xl !bg-white !text-slate-900 !border-white font-black">
            Print Agreement
          </Button>
        </div>
      </div>

      <div className={styles.container}>
        {/* ── Page 1: Purchase Agreement Header ── */}
        <div className="flex justify-end mb-10">
          <img src="/logo-placeholder.png" alt="Autocredits Logo" className="h-12 grayscale opacity-80" />
        </div>

        <h1 className={styles.h1}>User Acceptance Form</h1>

        <div className={styles.body}>
          <p>
            This User Acceptance Form (“User Acceptance Form”) is being signed by{" "}
            <strong>{data.customerName || "«Name»"}</strong> (“User”) S/o/ D/o/ W/o/{" "}
            <strong>{data.fathersName || "«Father’s Name»"}</strong>, resident of{" "}
            <strong>{data.address || "«Address»"}</strong>, or the company / partnership / proprietorship / LLP known as{" "}
            <strong>{data.ownershipType === "Company" ? (data.customerName || "«Company Name»") : "N/A"}</strong>, having its place of business at{" "}
            <strong>{data.address || "«Business Address»"}</strong> (“User”).
          </p>

          <p className="font-bold underline mt-6 mb-2">The User represents, warrants and confirms the following:</p>
          <div className={styles.clause}>
            1. The user is the rightful owner of the vehicle bearing registration number{" "}
            <strong>{data.regNo || "«Registration No.»"}</strong> of make <strong>{data.make || "«Make»"}</strong> model{" "}
            <strong>{data.model || "«Model»"}</strong> bearing chassis number:{" "}
            <strong>{data.chassisNo || "«Chassis No»"}</strong>, engine number:{" "}
            <strong>{data.engineNo || "«Engine No»"}</strong>, year of manufacture{" "}
            <strong>{data.mfgYear || "«Manufacturing Year»"}</strong> (“Vehicle”).
          </div>
          <div className={styles.clause}>
            2. The user is handing over the vehicle to Autocredits India LLP for sale of the Vehicle based on the details set out below.
          </div>

          <h3 className="font-black text-sm mt-8 border-l-4 border-slate-900 pl-3">Details of the transactions are as follows:</h3>

          <table className={styles.table}>
            <tbody>
              <tr>
                <td className={styles.th}>Vehicle Price (INR)</td>
                <td className={styles.td}>₹{formattedPrice}</td>
                <td className={styles.th} rowSpan={2}>Additional services to be availed (Forfeiture letter, NOC, Loan payment)</td>
                <td className={styles.td} rowSpan={2}>{(data.additionalServices || []).join(", ") || "None"}</td>
              </tr>
              <tr>
                <td className={styles.th}>Holdback Amount (INR)</td>
                <td className={styles.td}>₹{formattedHoldback}</td>
              </tr>
              <tr>
                <td className={styles.th}>Holdback Condition on Delivery</td>
                <td className={styles.td}>{(data.holdbackCondition || []).join(", ") || "N/A"}</td>
                <td className={styles.th}>Ownership Serial</td>
                <td className={styles.td}>{data.ownershipSerial || "«Ownership Serial»"}</td>
              </tr>
              <tr>
                <td className={styles.th}>Fees by User (INR)</td>
                <td className={styles.td}>₹{formattedFees}</td>
                <td className={styles.th}>Odometer Reading (in KMS)</td>
                <td className={styles.td}>{data.odometer || "«Odometer»"} KM</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-8">
            The User represents and warrants to Autocredits India LLP that his bank account details, and his outstanding dues to banker with respect to the Vehicle (direct loan, linked loan and other dues) are as follows:
          </p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} colSpan={2}>Bank Details</th>
                <th className={styles.th} colSpan={2}>Loan Account Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.th}>User Name</td>
                <td className={styles.td}>{data.accHolderName || "«Accountholder Name»"}</td>
                <td className={styles.th}>Loan Account No.</td>
                <td className={styles.td}>{data.loanAccountNo || "«Loan Account Number»"}</td>
              </tr>
              <tr>
                <td className={styles.th}>Account No.</td>
                <td className={styles.td}>{data.accountNo || "«Account Number»"}</td>
                <td className={styles.th}>Finance Co.</td>
                <td className={styles.td}>{data.financerName || "«Financer Name»"}</td>
              </tr>
              <tr>
                <td className={styles.th}>Bank Name</td>
                <td className={styles.td}>{data.bankName || "«Bank Name»"}</td>
                <td className={styles.th}>Foreclosure Amount</td>
                <td className={styles.td}>₹{Number(data.foreclosureAmount || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td className={styles.th}>IFSC</td>
                <td className={styles.td}>{data.ifsc || "«IFSC»"}</td>
                <td className={styles.th}>Linked Loan (Yes/No)</td>
                <td className={styles.td}>{data.linkedLoan || "No"}</td>
              </tr>
            </tbody>
          </table>

          <p className="italic mt-4 text-[11px]">
            I confirm that there are no other charges, loans, or encumbrances of any form on the vehicle other than as set out above.
          </p>

          <div className="flex justify-between mt-12 mb-20">
            <div>
              <div className={styles.signatureLine}></div>
              <p className="font-black text-[12px]">Signature of User</p>
              <div className="mt-4 text-[10px] space-y-1">
                <p>Name: {data.customerName}</p>
                <p>Aadhar No: {data.aadhaarNo}</p>
                <p>PAN: {data.panNo}</p>
                <p>Date: {formattedDate}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={styles.signatureLine}></div>
              <p className="font-black text-[12px]">For Autocredits India LLP</p>
            </div>
          </div>
        </div>

        <div className={styles.pageBreak} />

        {/* ── Page 2: Terms & Conditions ── */}
        <h2 className={styles.h2}>Standard Terms & Conditions</h2>
        <div className={`${styles.body} text-[11px] leading-relaxed`}>
          <p>The User now agrees and acknowledges as follows:</p>
          {[
            "The user agrees to carry out sale of the vehicle through Autocredits India LLP to its Channel Partners for the price set out herein (“Vehicle Price”). The user agrees that the fees, as specified above, shall be deducted from the vehicle price. Such fees is a one-time payment and does not entitle the user for any further services.",
            "The user will either receive the vehicle price in lumpsum or initially a part as token amount. Autocredits India LLP reserves the right to holdback a portion contingent upon performance of obligations (Document Delivery, Bank NOC, Form 35, RC clearance, etc.).",
            "User will be liable for payment of all challans generated prior to Autocredits India LLP taking possession of the Vehicle.",
            "After the sale, Autocredits India LLP will provide chassis plate as scrap proof in case the Vehicle is bought for scrappage.",
            "The user shall cooperate with Autocredits India LLP for RTO record transfer, providing OTP for initiation, and obtaining NOCs from financing authorities.",
            "In case transfer in RTO records cannot be affected, the user shall return all amounts paid in return for possession.",
            "The user represents and warrants rightful ownership and peaceful title. The vehicle is defect-free and odometer reading is accurate and non-tampered. The vehicle has not been involved in illegal activity.",
            "The user represents there is no undisclosed loan. If the bank refuses to provide NOC, the user will immediately return all amounts paid.",
            "The user hereby agrees to indemnify Autocredits India LLP and its partners from any loss or claims resulting from breach or misrepresentation.",
            "Autocredits India LLP will be responsible for damage or loss after physical delivery till transfer is affected, subject to terms.",
            "The vehicle has valid insurance. User has no objection in insurance company making payments to Autocredits India LLP in event of claims.",
            "Deal Cancellation would attract a penalty of Rs. 5,000 to be paid upfront to get the RC released."
          ].map((text, i) => (
            <div key={i} className="flex gap-3 mb-2">
              <span className="font-black min-w-[20px]">{i + 1}.</span>
              <span>{text}</span>
            </div>
          ))}

          <div className="flex justify-between mt-20">
            <div>
              <div className={styles.signatureLine}></div>
              <p className="font-black text-[12px]">Signature of User</p>
            </div>
            <div className="text-right">
              <div className={styles.signatureLine}></div>
              <p className="font-black text-[12px]">For Autocredits India LLP</p>
            </div>
          </div>
        </div>

        <div className={styles.pageBreak} />

        {/* ── Page 3: Acknowledgement & Customer App ── */}
        <h2 className={styles.h2}>Vehicle Delivery Acknowledgement Receipt</h2>
        <div className={styles.body}>
           <p className="mb-6">Dt. <strong>{formattedDate}</strong></p>
           <p className="italic leading-loose">
             It is hereby confirmed that Autocredits India LLP has taken the physical delivery of the vehicle bearing Registration No. 
             <strong> {data.regNo}</strong> having Chassis No. <strong>{data.chassisNo}</strong> and Engine No. <strong>{data.engineNo}</strong> 
             from <strong>{data.customerName}</strong> on date <strong>{formattedDate}</strong> at <strong>{data.deliveryTime ? dayjs(data.deliveryTime).format("HH:mm") : "«Time»"}</strong> 
             with the odometer reading at <strong>{data.odometer} KM</strong>. Subsequent to the date and time mentioned, Autocredits India LLP shall be responsible for any issues/ liabilities arising out of the vehicle till the ownership is transferred.
           </p>

           <div className="grid grid-cols-2 gap-20 mt-20">
              <div className="text-center">
                <div className="border-t border-slate-900 pt-2">Autocredits India LLP</div>
                <p className="text-[10px] mt-1 text-slate-400">Acknowledged & Accepted</p>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-900 pt-2">Registered Owner</div>
                <p className="text-[10px] mt-1 text-slate-400">Acknowledged & Accepted</p>
              </div>
           </div>
        </div>

        <Divider className="!my-16" />

        <h2 className={styles.h2}>Customer Application Form - Delivery</h2>
        <div className={styles.body}>
           <table className={styles.table}>
              <thead>
                <tr><th className={styles.th} colSpan={2}>Vehicle Owner Details</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.td}><span className="text-slate-400 mr-2">Contact No:</span> {data.contactNo}</td>
                  <td className={styles.td}><span className="text-slate-400 mr-2">Email ID:</span> {data.emailId}</td>
                </tr>
                <tr>
                   <td className={styles.td}><span className="text-slate-400 mr-2">PAN Card No:</span> {data.panNo}</td>
                   <td className={styles.td}><span className="text-slate-400 mr-2">Address Proof No:</span> {data.aadhaarNo}</td>
                </tr>
              </tbody>
           </table>

           <table className={styles.table}>
              <thead>
                 <tr><th className={styles.th} colSpan={2}>Vehicle Details</th></tr>
              </thead>
              <tbody>
                 <tr>
                    <td className={styles.td}><span className="text-slate-400 mr-2">Insurance:</span> {data.insuranceType}</td>
                    <td className={styles.td}><span className="text-slate-400 mr-2">Hypothecation:</span> {data.hypothecation}</td>
                 </tr>
              </tbody>
           </table>

           <table className={styles.table}>
              <thead>
                 <tr><th className={styles.th} colSpan={4}>Challan Details</th></tr>
              </thead>
              <tbody>
                 <tr>
                    <td className={styles.th}>Delhi Traffic Challan</td>
                    <td className={styles.td}>{data.challanCount || 0} Count</td>
                    <td className={styles.th}>Amount</td>
                    <td className={styles.td}>₹{Number(data.challanAmount || 0).toLocaleString()}</td>
                 </tr>
                 <tr>
                    <td className={styles.th}>Vahan Challan</td>
                    <td className={styles.td}>{data.vahanChallanCount || 0} Count</td>
                    <td className={styles.th}>Amount</td>
                    <td className={styles.td}>₹{Number(data.vahanChallanAmount || 0).toLocaleString()}</td>
                 </tr>
              </tbody>
           </table>
        </div>

        <div className={styles.pageBreak} />

        {/* ── Page 4: Payment Receipt ── */}
        <h2 className={styles.h2}>Payment Receipt</h2>
        <div className={styles.body}>
           <table className={styles.table}>
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 text-left">PARTICULARS</th>
                  <th className="p-3 text-right">AMOUNT (INR)</th>
                  <th className="p-3 text-left">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 font-black">Offer Price (A)</td>
                  <td className="p-3 text-right">₹{formattedPrice}</td>
                  <td className="p-3 text-slate-400 italic">Agreed purchase price</td>
                </tr>
                <tr className="bg-slate-50 italic">
                  <td className="p-3 font-black" colSpan={3}>Deductions / Holdback (B)</td>
                </tr>
                <tr>
                   <td className="p-3 pl-8">Challan Dues</td>
                   <td className="p-3 text-right">₹{Number(data.challanAmount || 0 + data.vahanChallanAmount || 0).toLocaleString()}</td>
                   <td className="p-3 text-slate-400 italic">Outstanding traffic fines</td>
                </tr>
                <tr>
                   <td className="p-3 pl-8">Loan Closure / Hold</td>
                   <td className="p-3 text-right">₹{Number(data.foreclosureAmount || 0).toLocaleString()}</td>
                   <td className="p-3 text-slate-400 italic">Foreclosure dues</td>
                </tr>
                <tr>
                   <td className="p-3 pl-8">Service Fees / Other</td>
                   <td className="p-3 text-right">₹{formattedFees}</td>
                   <td className="p-3 text-slate-400 italic">Processing fees</td>
                </tr>
                <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                   <td className="p-3 text-lg">Net Payable Amount (A-B)</td>
                   <td className="p-3 text-right text-lg">₹{netPayable.toLocaleString()}</td>
                   <td className="p-3"></td>
                </tr>
              </tbody>
           </table>

           <p className="mt-10 font-black text-sm uppercase underline">Net Payable Details</p>
           <table className={styles.table}>
              <thead>
                <tr className="bg-slate-100 italic">
                  <th className="p-2 border border-slate-950 text-left">PARTICULARS</th>
                  <th className="p-2 border border-slate-950 text-right">AMOUNT (INR)</th>
                  <th className="p-2 border border-slate-950 text-left">STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-slate-950">Token Amount</td>
                  <td className="p-2 border border-slate-950 text-right font-bold">₹{Number(data.tokenAmount || 0).toLocaleString()}</td>
                  <td className="p-2 border border-slate-950 text-emerald-600 font-black">PAID - REF: #{data.regNo?.slice(-4)}</td>
                </tr>
                <tr>
                  <td className="p-2 border border-slate-950">Balance Transfer</td>
                  <td className="p-2 border border-slate-950 text-right font-bold">₹{(netPayable - (data.tokenAmount || 0)).toLocaleString()}</td>
                  <td className="p-2 border border-slate-950 text-amber-600 font-black">PENDING DELIVERY</td>
                </tr>
              </tbody>
           </table>

           <div className="mt-10 p-6 border border-slate-200 rounded-2xl bg-slate-50 italic text-[11px] space-y-2">
              <p>Please Note: -</p>
              <p>In case you have not opted for instant payment it will take 3-4 working days after delivery of the vehicle to transfer the complete payment to your account.</p>
              <p className="font-bold">Our transaction process is completely online – We do not accept/provide any cash.</p>
           </div>

           <div className="mt-20 text-center mx-auto">
              <div className="w-64 border-t border-slate-950 mx-auto"></div>
              <p className="font-black mt-2">Registered Owner Acceptance</p>
           </div>
        </div>
      </div>
    </Modal>
  );
}
