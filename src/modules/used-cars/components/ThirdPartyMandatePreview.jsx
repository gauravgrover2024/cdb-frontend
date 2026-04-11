import React from "react";
import dayjs from "dayjs";

const valueOrLine = (value, minWidth = "180px") => {
  const text = value ? String(value).trim() : "";
  return (
    <span
      className="inline-flex min-h-[22px] min-w-[var(--line-width)] items-end border-b border-slate-400 px-1 font-semibold text-slate-900"
      style={{ "--line-width": minWidth }}
    >
      {text || "\u00A0"}
    </span>
  );
};

const money = (value) => {
  const num = Number(String(value ?? 0).replace(/,/g, ""));
  if (!Number.isFinite(num)) return "Rs 0";
  return `Rs ${num.toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : String(value);
};

export default function ThirdPartyMandatePreview({ values = {} }) {
  if (!values?.thirdPartyPayment) return null;

  return (
    <div className="mx-auto max-w-[820px] rounded-[28px] border border-slate-200 bg-white px-8 py-8 text-slate-900 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Procurement support form
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight">
            3rd Party Payment Authorization Form
          </h3>
        </div>
        <div className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Autocredits India LLP
        </div>
      </div>

      <div className="mt-6 space-y-5 text-[15px] leading-8">
        <p>
          I (the <span className="font-bold">“Seller”</span>), Mr./Mrs.{" "}
          {valueOrLine(values.customerName, "220px")} (Pan No.{" "}
          {valueOrLine(values.panCardNo, "170px")}) hereby authorize
          Autocredits India LLP (the <span className="font-bold">“Buyer”</span>)
          to process a payment on my behalf in the name of the below mentioned
          person (the <span className="font-bold">“3rd Party”</span>) mentioned
          below; with respect to the transaction of Motor Vehicle mentioned
          hereinunder as per the Motor Vehicle Agreement.
        </p>

        <p>
          Dated:{" "}
          {valueOrLine(
            formatDate(values.thirdPartyMandateDate || values.agreementDate),
            "170px",
          )}
        </p>

        <div>
          <p className="mb-2 text-sm font-black uppercase tracking-[0.12em] text-slate-600">
            3rd Party Information
          </p>
          <div className="space-y-2">
            <p>
              Name: {valueOrLine(values.thirdPartyName, "250px")} Pan No.:{" "}
              {valueOrLine(values.thirdPartyPanNo, "190px")}
            </p>
            <p>Relation: {valueOrLine(values.thirdPartyRelation, "240px")}</p>
            <p>KYC: {valueOrLine(values.thirdPartyKycNotes, "240px")}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-black uppercase tracking-[0.12em] text-slate-600">
            Motor Vehicle Details
          </p>
          <div className="space-y-2">
            <p>
              Registration No.:{" "}
              {valueOrLine(values.registrationNo, "220px")}
            </p>
            <p>Engine No.: {valueOrLine(values.engineNo, "220px")}</p>
            <p>Chassis No.: {valueOrLine(values.chassisNo, "220px")}</p>
            <p>
              Model:{" "}
              {valueOrLine(
                [values.make, values.model, values.variant]
                  .filter(Boolean)
                  .join(" "),
                "260px",
              )}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-black uppercase tracking-[0.12em] text-slate-600">
            Payment Information
          </p>
          <div className="space-y-2">
            <p>Amount: {valueOrLine(money(values.thirdPartyPaymentAmount), "220px")}</p>
            <p>Bank: {valueOrLine(values.thirdPartyBankName, "220px")}</p>
            <p>
              Account Number:{" "}
              {valueOrLine(values.thirdPartyAccountNumber, "255px")}
            </p>
            <p>IFSC Code: {valueOrLine(values.thirdPartyIfscCode, "220px")}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-black uppercase tracking-[0.12em] text-slate-600">
            Representation
          </p>
          <p className="leading-7 text-slate-700">
            I represent and warrant that I am authorized to execute this payment
            authorization for the purpose of implementing this transaction.
            Further I indemnify and hold harmless the Buyer, the Bank, and the
            3rd Party harmless from the damage, loss or claim resulting from all
            the authorized actions hereunder.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Disclaimer: No liability can be raised against the Buyer in case of
            any unauthorized use of payment.
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-3 text-sm font-semibold text-slate-600">
              Signature of 3rd Party
            </p>
            <div className="flex h-24 items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-slate-300 bg-slate-50">
              {values.thirdPartySignature ? (
                <img
                  src={values.thirdPartySignature}
                  alt="Third party signature"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs font-medium text-slate-400">
                  Pending signature
                </span>
              )}
            </div>
          </div>
          <div className="md:min-w-[220px]">
            <p className="mb-3 text-sm font-semibold text-slate-600">Date</p>
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
              {formatDate(values.thirdPartyMandateDate || values.agreementDate) ||
                "-"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
