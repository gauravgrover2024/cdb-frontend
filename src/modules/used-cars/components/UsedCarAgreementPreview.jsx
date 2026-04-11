import React from "react";
import dayjs from "dayjs";

const money = (value) => {
  const amount = Number(String(value ?? 0).replace(/,/g, ""));
  if (!Number.isFinite(amount)) return "Rs 0";
  return `Rs ${amount.toLocaleString("en-IN")}`;
};

const valueOrDash = (value) => {
  if (value === undefined || value === null) return "-";
  const text = String(value).trim();
  return text || "-";
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD MMM YYYY") : String(value);
};

const formatTime = (value) => {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("hh:mm A") : String(value);
};

function Clause({ index, children }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-6 shrink-0 text-sm font-black text-slate-400 dark:text-slate-500">
        {index}.
      </div>
      <p className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
        {children}
      </p>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/10">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {valueOrDash(value)}
      </div>
    </div>
  );
}

function SignatureBlock({ title, name, signature, helper }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-sm font-black text-slate-900 dark:text-slate-100">{valueOrDash(name)}</p>
      <div className="mt-3 flex h-24 items-center justify-center overflow-hidden rounded-[16px] border border-dashed border-slate-300 bg-white dark:border-white/15 dark:bg-[#0f1319]">
        {signature ? (
          <img src={signature} alt={title} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Pending signature</span>
        )}
      </div>
      {helper ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{helper}</p>
      ) : null}
    </div>
  );
}

function PaymentTable({ values, netPayable }) {
  const rows = [
    { label: "Offer Price (A)", amount: values.offerPrice || values.vehiclePrice || 0, remarks: "Agreed buy-side commercial" },
    { label: "- Challan", amount: values.deductionChallan || 0, remarks: "Deduction (B)" },
    { label: "- Other", amount: values.deductionOther || 0, remarks: "Deduction (B)" },
    { label: "- Instant Payment Charges", amount: values.instantPaymentCharges || 0, remarks: "Charges (C)" },
    { label: "- Service Charges", amount: values.serviceCharges || 0, remarks: "Charges (C)" },
    { label: "Net Payable Amount (A-B-C)", amount: netPayable, remarks: "Computed" },
  ];

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-white/10">
      <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
        <div>Particulars</div>
        <div>Amount (INR)</div>
        <div>Remarks</div>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[1.5fr_1fr_1fr] border-t border-slate-100 px-4 py-3 text-sm dark:border-white/10">
          <div className="font-semibold text-slate-800 dark:text-slate-100">{row.label}</div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{money(row.amount)}</div>
          <div className="font-medium text-slate-500 dark:text-slate-400">{row.remarks}</div>
        </div>
      ))}
    </div>
  );
}

function NetPayableDetails({ values }) {
  const receiptRows = Array.isArray(values?.paymentBreakup)
    ? values.paymentBreakup.filter((item) => item && (item.label || item.amount || item.mode))
    : [];

  const tokenReceipt = receiptRows.find((row) => String(row.label || "").toLowerCase().includes("token"));
  const balanceReceipt = receiptRows.find((row) => String(row.label || "").toLowerCase().includes("balance"));

  const rows = [
    { label: "Token", amount: tokenReceipt?.amount || values.tokenAmount || 0, status: tokenReceipt?.amount || values.tokenAmount ? "Received" : "Pending" },
    { label: "Balance Payment", amount: balanceReceipt?.amount || values.balancePaymentReceived || 0, status: balanceReceipt?.amount || values.balancePaymentReceived ? "Received / Processed" : "Pending" },
    { label: "Hold (if any)", amount: values.holdbackAmount || 0, status: values.holdbackAmount ? "Held" : "Nil" },
  ];

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-white/10">
      <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
        <div>Particulars</div>
        <div>Amount (INR)</div>
        <div>Status</div>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[1.5fr_1fr_1fr] border-t border-slate-100 px-4 py-3 text-sm dark:border-white/10">
          <div className="font-semibold text-slate-800 dark:text-slate-100">{row.label}</div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{money(row.amount)}</div>
          <div className="font-medium text-slate-500 dark:text-slate-400">{row.status}</div>
        </div>
      ))}
    </div>
  );
}

export default function UsedCarAgreementPreview({ values = {} }) {
  const offerPrice = Number(values.offerPrice || values.vehiclePrice || 0);
  const deductionChallan = Number(values.deductionChallan || 0);
  const deductionOther = Number(values.deductionOther || 0);
  const instantPaymentCharges = Number(values.instantPaymentCharges || 0);
  const serviceCharges = Number(values.serviceCharges || 0);
  const netPayable = Math.max(0, offerPrice - deductionChallan - deductionOther - instantPaymentCharges - serviceCharges);
  const combinedChallanCount = valueOrDash(values.challanCount) !== "-"
    ? values.challanCount
    : [values.delhiChallanCount, values.vahanChallanCount].filter(Boolean).join(" + ") || "-";
  const combinedChallanAmount = (Number(values.challanAmount || 0) || 0) + (Number(values.delhiChallanAmount || 0) || 0) + (Number(values.vahanChallanAmount || 0) || 0);
  const ownerName = values.registeredOwnerName || values.customerName;

  return (
    <div className="mx-auto max-w-[920px] space-y-5 rounded-[30px] border border-slate-200 bg-white px-6 py-6 text-slate-900 shadow-sm dark:border-white/10 dark:bg-[#0b0d11] dark:text-white md:px-8 md:py-8">
      <section className="rounded-[26px] border border-slate-200 px-5 py-5 dark:border-white/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              Vehicle Purchase Agreement
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight md:text-[30px]">
              Vehicle Purchase Agreement
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              This memorandum of agreement is made between the first party seller and Autocredits India LLP as the second party for the sale, custody, transfer support, and settlement of the vehicle described below.
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Agreement state</p>
            <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">{valueOrDash(values.approvalStatus)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Dated {formatDate(values.agreementDate)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200 px-4 py-3 dark:border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">First Party</p>
            <div className="mt-3">
              <DataRow label="Name" value={ownerName} />
              <DataRow label="Father / spouse" value={values.fatherName} />
              <DataRow label="Address" value={values.address} />
              <DataRow label="Contact" value={values.contactNo} />
              <DataRow label="Email" value={values.emailId} />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 px-4 py-3 dark:border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Vehicle sold to second party</p>
            <div className="mt-3">
              <DataRow label="Make & model" value={[values.make, values.model, values.variant].filter(Boolean).join(" ")} />
              <DataRow label="Registration no." value={values.registrationNo} />
              <DataRow label="VIN no." value={values.vinNo || values.chassisNo} />
              <DataRow label="Engine no." value={values.engineNo} />
              <DataRow label="Sale amount" value={money(offerPrice)} />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[22px] border border-slate-200 px-4 py-3 dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Terms and conditions</p>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
            <Clause index="1">The first party assures and represents that he or she is the authorized owner of the vehicle described in this agreement.</Clause>
            <Clause index="2">The first party has sold the above vehicle to the second party for the agreed sum captured in this form.</Clause>
            <Clause index="3">The second party becomes the authorized legal custodian of the vehicle and has the right to sell, lend, or otherwise dispose of it as deemed fit.</Clause>
            <Clause index="4">The first party alone shall remain responsible for any violation of law, arrears of taxes, challans, fines, or encumbrances arising before the date and time of sale.</Clause>
            <Clause index="5">The first party keeps the second party indemnified and exonerated from risks, responsibilities, damages, and compensation arising out of prior liabilities.</Clause>
            <Clause index="6">The first party confirms that the vehicle has valid insurance and agrees to cooperate in any claim routing in favour of the second party where required.</Clause>
            <Clause index="7">The first party undertakes to take the necessary steps to get the vehicle transferred in the name of the actual transferee.</Clause>
            <Clause index="8">Deal cancellation may attract a penalty of Rs 5,000 to be paid upfront to get the RC released.</Clause>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 px-5 py-5 dark:border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Vehicle Delivery Acknowledgement Receipt
        </p>
        <h3 className="mt-2 text-xl font-black tracking-tight">Physical vehicle handover acknowledgement</h3>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200 px-4 py-3 dark:border-white/10">
            <DataRow label="Date" value={formatDate(values.deliveryDate || values.agreementDate)} />
            <DataRow label="Time" value={formatTime(values.deliveryTime)} />
            <DataRow label="Vehicle owner" value={ownerName} />
            <DataRow label="Registration no." value={values.registrationNo} />
            <DataRow label="Chassis no." value={values.chassisNo} />
            <DataRow label="Engine no." value={values.engineNo} />
          </div>
          <div className="rounded-[22px] border border-slate-200 px-4 py-3 dark:border-white/10">
            <DataRow label="Odometer reading" value={values.odometerReading ? `${values.odometerReading} km` : "-"} />
            <DataRow label="Delivery executive" value={values.deliveryExecutiveName} />
            <DataRow label="Insurance" value={values.insuranceType} />
            <DataRow label="Hypothecation" value={values.hypothecation ? `Yes${values.bankName ? ` - ${values.bankName}` : ""}` : "No"} />
            <DataRow label="Additional note" value={values.notes} />
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 px-5 py-5 dark:border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Customer Application Form - Delivery
        </p>
        <div className="mt-5 grid gap-6 xl:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 px-4 py-3 dark:border-white/10">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Vehicle owner details</p>
            <div className="mt-3">
              <DataRow label="Registered owner" value={ownerName} />
              <DataRow label="Contact" value={values.contactNo} />
              <DataRow label="Address" value={values.address} />
              <DataRow label="Email" value={values.emailId} />
              <DataRow label="PAN" value={values.panCardNo} />
              <DataRow label="Address proof no." value={values.addressProofNo} />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 px-4 py-3 dark:border-white/10">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Vehicle details</p>
            <div className="mt-3">
              <DataRow label="Registration" value={values.registrationNo} />
              <DataRow label="Make & model" value={[values.make, values.model].filter(Boolean).join(" ")} />
              <DataRow label="Fuel / reg year" value={[values.fuelType, values.regYear].filter(Boolean).join(" • ")} />
              <DataRow label="Variant" value={values.variant} />
              <DataRow label="Odometer" value={values.odometerReading ? `${values.odometerReading} km` : "-"} />
              <DataRow label="Chassis no." value={values.chassisNo} />
              <DataRow label="Insurance" value={values.insuranceType} />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 px-4 py-3 dark:border-white/10">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Bank and challan details</p>
            <div className="mt-3">
              <DataRow label="Account holder" value={values.accountHolderName} />
              <DataRow label="Account no." value={values.accountNumber} />
              <DataRow label="Bank / IFSC" value={[values.bankName, values.ifscCode].filter(Boolean).join(" • ")} />
              <DataRow label="Delhi challan" value={`${valueOrDash(values.delhiChallanCount)} | ${money(values.delhiChallanAmount)}`} />
              <DataRow label="Vahan challan" value={`${valueOrDash(values.vahanChallanCount)} | ${money(values.vahanChallanAmount)}`} />
              <DataRow label="Combined challan" value={`${combinedChallanCount} | ${money(combinedChallanAmount)}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 px-5 py-5 dark:border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Payment Receipt</p>
        <h3 className="mt-2 text-xl font-black tracking-tight">Offer, deductions, charges, and net payable</h3>
        <div className="mt-4">
          <PaymentTable values={values} netPayable={netPayable} />
          <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            All charges are treated as inclusive of GST at 18% wherever applicable, matching the operational note in the document.
          </p>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 px-5 py-5 dark:border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Net Payable Details</p>
        <h3 className="mt-2 text-xl font-black tracking-tight">Receipt status against seller settlement</h3>
        <div className="mt-4">
          <NetPayableDetails values={values} />
        </div>
        <div className="mt-4 rounded-[22px] bg-slate-50 px-4 py-4 text-sm font-medium leading-6 text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">
          <p>1. In case instant payment is not opted for, the balance payment may take 3-4 working days after delivery of the vehicle.</p>
          <p className="mt-2">2. The transaction process is intended to remain fully digital. Cash handling should be avoided unless policy explicitly permits it.</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SignatureBlock
          title="First Party / Registered Owner"
          name={ownerName}
          signature={values.customerSignature}
          helper={`${valueOrDash(values.contactNo)} • ${valueOrDash(values.panCardNo)}`}
        />
        <SignatureBlock
          title="For Autocredits India LLP"
          name={values.deliveryExecutiveName || "Authorized representative"}
          signature={values.companySignature}
          helper={`${valueOrDash(values.approvalStatus)} • ${formatDate(values.agreementDate)}`}
        />
      </section>
    </div>
  );
}
