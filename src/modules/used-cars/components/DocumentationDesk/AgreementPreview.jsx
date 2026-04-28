import React from "react";
import { Modal, Button, Divider, Tag } from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
  CloseOutlined,
  CheckCircleFilled,
  FileTextOutlined,
} from "@ant-design/icons";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";

const terms = [
  "The vehicle will be sold through Autocredits India LLP to its network or channel partner at the agreed commercial value captured in this form.",
  "Any fees, deductions, or commercial adjustments recorded in this document may be reduced from the agreed vehicle price before final settlement.",
  "A part of the payment may be released as token and the balance may remain subject to holdback conditions, document delivery, lien clearance, or other pending obligations.",
  "All challans, dues, penalties, or liabilities generated before physical handover remain the responsibility of the user unless expressly recorded otherwise.",
  "The user will cooperate for loan closure, OTP support, NOC procurement, Form 35 support, RC transfer workflow, and other transfer formalities when required.",
  "If the transfer process cannot be completed because of user-side title, document, or compliance issues, any amount already paid may become recoverable as per the agreed process.",
  "The user confirms lawful ownership, peaceful possession, correct vehicle details, and an accurate odometer disclosure to the best of their knowledge.",
  "The user confirms there is no undisclosed encumbrance, charge, pledge, or finance exposure beyond what is recorded in this agreement.",
  "The user agrees to indemnify Autocredits India LLP against claims, losses, penalties, or disputes arising from misrepresentation, hidden defects, or incorrect ownership disclosures.",
  "After physical delivery, custody and operational responsibility shift as per the delivery acknowledgement and the transfer process captured in the agreement set.",
  "Insurance claim proceeds, where legally applicable and contractually relevant, may be directed in accordance with the operational process for the delivered vehicle.",
  "Deal cancellation, RC release, or document reversal may attract applicable process charges, penalties, or recoveries as per the commercial arrangement.",
];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const val = (value, fallback = "—") => value || fallback;

function Page({ title, subtitle, children }) {
  return (
    <div className="mx-auto mb-6 max-w-[900px] rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm print:mb-0 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-500">
          Autocredits documentation
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function DataCard({ label, value, tone = "slate" }) {
  const toneMap = {
    slate: "border-slate-200 bg-slate-50 text-slate-800",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <div
      className={`rounded-[22px] border p-4 ${toneMap[tone] || toneMap.slate}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-base font-black">{value}</p>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-3 text-sm last:border-b-0">
      <p className="font-medium text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || "—"}</p>
    </div>
  );
}

function SignatureBlock({
  leftName = "Signature of User",
  rightName = "For Autocredits India LLP",
}) {
  return (
    <div className="mt-14 grid gap-8 md:grid-cols-2">
      <div>
        <div className="h-14" />
        <div className="border-t border-slate-400 pt-2 text-sm font-bold text-slate-900">
          {leftName}
        </div>
      </div>
      <div>
        <div className="h-14" />
        <div className="border-t border-slate-400 pt-2 text-sm font-bold text-slate-900">
          {rightName}
        </div>
      </div>
    </div>
  );
}

export default function AgreementPreview({ visible, onCancel, data = {} }) {
  const handlePrint = () => window.print();
  const handleDownload = () => window.print();

  const formattedDate = data.agreementDate
    ? dayjs(data.agreementDate).format("DD MMM YYYY")
    : dayjs().format("DD MMM YYYY");

  const formattedTime = data.deliveryTime
    ? dayjs(data.deliveryTime).format("HH:mm")
    : "—";

  const netPayable =
    Number(data.vehiclePrice || 0) -
    Number(data.feesByUser || 0) -
    Number(data.holdbackAmount || 0);

  const challanTotal =
    Number(data.challanAmount || 0) + Number(data.vahanChallanAmount || 0);

  const estimatedAfterLiabilities =
    netPayable - challanTotal - Number(data.foreclosureAmount || 0);

  const balanceTransfer = netPayable - Number(data.tokenAmount || 0);

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      centered
      closeIcon={
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white">
          <CloseOutlined className="text-slate-500" />
        </div>
      }
      className="agreement-light-modal"
    >
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
          }
          .agreement-light-modal .ant-modal-header,
          .agreement-light-modal .ant-modal-footer,
          .agreement-light-modal .ant-modal-close,
          .agreement-toolbar {
            display: none !important;
          }
          .agreement-light-modal .ant-modal-content {
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="agreement-toolbar sticky top-0 z-20 -mx-6 -mt-6 mb-6 rounded-t-2xl border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FileTextOutlined className="text-lg" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-500">
                Agreement builder
              </p>
              <h2 className="text-lg font-black text-slate-900">
                Legal Contract Preview
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              className="!h-11 !rounded-2xl !border-slate-200 !bg-white px-4 font-semibold !text-slate-700"
            >
              Save as PDF
            </Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              className="!h-11 !rounded-2xl !border-indigo-600 !bg-indigo-600 px-4 font-semibold shadow-sm"
            >
              Print Agreement
            </Button>
          </div>
        </div>
      </div>

      <div className="max-h-[78vh] overflow-y-auto px-1 print:max-h-none print:overflow-visible">
        <Page
          title="User Acceptance Form"
          subtitle="A clean light-styled agreement page with the same data bindings used by your current module."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <DataCard
              label="Seller"
              value={val(data.customerName)}
              tone="indigo"
            />
            <DataCard
              label="Registration"
              value={val(data.regNo)}
              tone="slate"
            />
            <DataCard
              label="Vehicle"
              value={
                `${val(data.make, "")} ${val(data.model, "")}`.trim() || "—"
              }
              tone="slate"
            />
            <DataCard
              label="Agreement date"
              value={formattedDate}
              tone="emerald"
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            This User Acceptance Form is being signed by{" "}
            <span className="font-bold text-slate-900">
              {val(data.customerName, "«Name»")}
            </span>
            , child / spouse of{" "}
            <span className="font-bold text-slate-900">
              {val(data.fathersName, "«Father’s Name»")}
            </span>
            , residing at{" "}
            <span className="font-bold text-slate-900">
              {val(data.address, "«Address»")}
            </span>
            . The user confirms that the vehicle details, commercial details,
            bank details, and compliance declarations below are being submitted
            for vehicle sale and transfer processing.
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Vehicle details
              </p>
              <div className="mt-3">
                <KV label="Registration No." value={val(data.regNo)} />
                <KV
                  label="Make / Model"
                  value={`${val(data.make, "—")} / ${val(data.model, "—")}`}
                />
                <KV label="Chassis No." value={val(data.chassisNo)} />
                <KV label="Engine No." value={val(data.engineNo)} />
                <KV label="Manufacturing Year" value={val(data.mfgYear)} />
                <KV
                  label="Odometer"
                  value={data.odometer ? `${data.odometer} KM` : "—"}
                />
                <KV
                  label="Ownership Serial"
                  value={val(data.ownershipSerial)}
                />
                <KV label="Insurance Type" value={val(data.insuranceType)} />
                <KV label="RC Type" value={val(data.rcType)} />
                <KV
                  label="Procurement Category"
                  value={val(data.procurementCategory)}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Seller details
              </p>
              <div className="mt-3">
                <KV label="Owner Name" value={val(data.customerName)} />
                <KV
                  label="Father / Spouse Name"
                  value={val(data.fathersName)}
                />
                <KV label="Contact No." value={val(data.contactNo)} />
                <KV label="Email ID" value={val(data.emailId)} />
                <KV label="PAN" value={val(data.panNo)} />
                <KV label="Aadhaar" value={val(data.aadhaarNo)} />
                <KV label="GST Number" value={val(data.gstNumber)} />
                <KV label="Ownership Type" value={val(data.ownershipType)} />
                <KV label="Death Case" value={val(data.isDeathCase, "No")} />
              </div>
            </div>
          </div>

          <Divider />

          <div className="grid gap-4 md:grid-cols-4">
            <DataCard
              label="Vehicle price"
              value={money(data.vehiclePrice)}
              tone="indigo"
            />
            <DataCard
              label="Fees"
              value={money(data.feesByUser)}
              tone="amber"
            />
            <DataCard
              label="Holdback"
              value={money(data.holdbackAmount)}
              tone="amber"
            />
            <DataCard
              label="Net payable"
              value={money(netPayable)}
              tone="emerald"
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-4 py-3 font-bold text-slate-700">
                    Additional services
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {(data.additionalServices || []).join(", ") || "None"}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-4 py-3 font-bold text-slate-700">
                    Holdback conditions
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {(data.holdbackCondition || []).join(", ") || "None"}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-4 py-3 font-bold text-slate-700">
                    Permitted holdback days
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {val(data.holdbackDays)}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-50 px-4 py-3 font-bold text-slate-700">
                    Balance status
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {val(data.balanceStatus)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Bank details
              </p>
              <div className="mt-3">
                <KV label="Account Holder" value={val(data.accHolderName)} />
                <KV label="Account No." value={val(data.accountNo)} />
                <KV label="Bank Name" value={val(data.bankName)} />
                <KV label="IFSC" value={val(data.ifsc)} />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Loan and finance details
              </p>
              <div className="mt-3">
                <KV
                  label="Hypothecation"
                  value={val(data.hypothecation, "No")}
                />
                <KV label="Financer Name" value={val(data.financerName)} />
                <KV label="Loan Status" value={val(data.loanStatus)} />
                <KV label="Linked Loan" value={val(data.linkedLoan, "No")} />
                <KV
                  label="Linked Loan Status"
                  value={val(data.linkedLoanStatus)}
                />
                <KV label="Loan Account No." value={val(data.loanAccountNo)} />
                <KV
                  label="Foreclosure Amount"
                  value={money(data.foreclosureAmount)}
                />
              </div>
            </div>
          </div>

          <SignatureBlock />
        </Page>

        <Page
          title="Standard Terms & Conditions"
          subtitle="Readable clauses for preview. Swap this array with your exact legal text if your legal team needs verbatim language."
        >
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-4 text-sm leading-7 text-slate-700">
              {terms.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <span className="mt-0.5 min-w-[24px] text-sm font-black text-slate-900">
                    {index + 1}.
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <SignatureBlock />
        </Page>

        <Page
          title="Vehicle Delivery Acknowledgement"
          subtitle="Delivery handoff, KYC snapshot, and challan summary."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <DataCard
              label="Delivery date"
              value={formattedDate}
              tone="indigo"
            />
            <DataCard
              label="Delivery time"
              value={formattedTime}
              tone="slate"
            />
            <DataCard
              label="Odometer"
              value={data.odometer ? `${data.odometer} KM` : "—"}
              tone="slate"
            />
            <DataCard
              label="Insurance"
              value={val(data.insuranceType)}
              tone="emerald"
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            It is recorded that Autocredits India LLP has taken or will take
            physical delivery of vehicle{" "}
            <span className="font-bold text-slate-900">{val(data.regNo)}</span>,
            chassis{" "}
            <span className="font-bold text-slate-900">
              {val(data.chassisNo)}
            </span>
            , engine{" "}
            <span className="font-bold text-slate-900">
              {val(data.engineNo)}
            </span>
            , from{" "}
            <span className="font-bold text-slate-900">
              {val(data.customerName)}
            </span>{" "}
            on <span className="font-bold text-slate-900">{formattedDate}</span>{" "}
            at <span className="font-bold text-slate-900">{formattedTime}</span>
            .
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Customer application details
              </p>
              <div className="mt-3">
                <KV label="Contact No." value={val(data.contactNo)} />
                <KV label="Email ID" value={val(data.emailId)} />
                <KV label="PAN Card No." value={val(data.panNo)} />
                <KV label="Aadhaar No." value={val(data.aadhaarNo)} />
                <KV label="GST Number" value={val(data.gstNumber)} />
                <KV
                  label="Uploads completed"
                  value={
                    [
                      data.panAttested && "PAN",
                      data.aadhaarAttested && "Aadhaar",
                      data.photoUploaded && "Photo",
                      data.gstUploaded && "GST",
                      data.foreclosureStatement && "Foreclosure statement",
                    ]
                      .filter(Boolean)
                      .join(", ") || "None"
                  }
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Challan details
              </p>
              <div className="mt-3">
                <KV
                  label="Delhi Traffic Challan Count"
                  value={val(data.challanCount, 0)}
                />
                <KV
                  label="Delhi Traffic Challan Amount"
                  value={money(data.challanAmount)}
                />
                <KV
                  label="Vahan Challan Count"
                  value={val(data.vahanChallanCount, 0)}
                />
                <KV
                  label="Vahan Challan Amount"
                  value={money(data.vahanChallanAmount)}
                />
                <KV label="Combined challan dues" value={money(challanTotal)} />
                <KV
                  label="Handoff checklist"
                  value={(data.handoffChecklist || []).join(", ") || "None"}
                />
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="text-center">
              <div className="h-12" />
              <div className="border-t border-slate-400 pt-2 text-sm font-bold text-slate-900">
                Autocredits India LLP
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Acknowledged and accepted
              </p>
            </div>
            <div className="text-center">
              <div className="h-12" />
              <div className="border-t border-slate-400 pt-2 text-sm font-bold text-slate-900">
                Registered Owner
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Acknowledged and accepted
              </p>
            </div>
          </div>
        </Page>

        <Page
          title="Payment Receipt"
          subtitle="Commercial summary, deductions, and balance transfer snapshot."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <DataCard
              label="Offer price"
              value={money(data.vehiclePrice)}
              tone="indigo"
            />
            <DataCard
              label="Token amount"
              value={money(data.tokenAmount)}
              tone="amber"
            />
            <DataCard
              label="Net payable"
              value={money(netPayable)}
              tone="emerald"
            />
            <DataCard
              label="Est. after liabilities"
              value={money(estimatedAfterLiabilities)}
              tone="rose"
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-bold text-slate-700">
                    Particulars
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">
                    Amount (INR)
                  </th>
                  <th className="px-4 py-3 font-bold text-slate-700">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Offer Price (A)
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {money(data.vehiclePrice)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Agreed purchase value
                  </td>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Fees / deductions
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {money(data.feesByUser)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Processing and other deductions
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Holdback
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {money(data.holdbackAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Held against listed conditions
                  </td>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Challan dues
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {money(challanTotal)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Traffic and Vahan liabilities
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Foreclosure hold
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {money(data.foreclosureAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Finance closure exposure
                  </td>
                </tr>
                <tr className="border-t border-slate-200 bg-emerald-50">
                  <td className="px-4 py-3 text-base font-black text-emerald-900">
                    Net Payable (A less fees and holdback)
                  </td>
                  <td className="px-4 py-3 text-right text-base font-black text-emerald-900">
                    {money(netPayable)}
                  </td>
                  <td className="px-4 py-3 text-emerald-700">
                    Current module calculation
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Net payable details
              </p>
              <div className="mt-3">
                <KV label="Token Amount" value={money(data.tokenAmount)} />
                <KV label="Balance Transfer" value={money(balanceTransfer)} />
                <KV label="Balance Status" value={val(data.balanceStatus)} />
                <KV
                  label="Payment Reference"
                  value={
                    data.regNo ? `REF-${String(data.regNo).slice(-4)}` : "—"
                  }
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              <div className="flex items-start gap-3">
                <CheckCircleFilled className="mt-1 text-emerald-500" />
                <div>
                  <p className="font-bold text-slate-900">Payment note</p>
                  <p className="mt-2">
                    If instant payment is not selected, balance transfer may
                    take a few working days after delivery and document
                    completion. The process should remain digital and traceable.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 text-center">
            <div className="mx-auto h-12 max-w-[280px]" />
            <div className="mx-auto max-w-[280px] border-t border-slate-400 pt-2 text-sm font-bold text-slate-900">
              Registered Owner Acceptance
            </div>
          </div>
        </Page>
      </div>
    </Modal>
  );
}
