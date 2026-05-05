import React from "react";
import {
  HelpCircle,
  FileText,
  CreditCard,
  Percent,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { asArray } from "../utils";
import { compactText } from "../canvas-utils";
import { ModernCanvasShell } from "./BaseComponents";

export function FinanceFAQCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const { faqs = [] } = data;

  return (
    <ModernCanvasShell
      title="Finance & Loan Guide"
      subtitle="Everything you need to know about financing your new car."
      icon={HelpCircle}
      eyebrow="Finance Expert"
      footer={footer}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_0.7fr]">
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#0f172a]">Common Questions</h3>
          <div className="grid gap-3">
            {faqs.length > 0 ? (
              faqs.map((faq, idx) => <FaqItem key={idx} {...faq} />)
            ) : (
              <>
                <FaqItem
                  question="What is the current interest rate?"
                  answer="Interest rates currently range from 8.5% to 9.25% depending on the bank and your credit score."
                />
                <FaqItem
                  question="What documents are required?"
                  answer="You'll need PAN Card, Aadhaar Card, last 6 months bank statement, and latest 3 salary slips."
                />
                <FaqItem
                  question="Can I get 100% on-road funding?"
                  answer="Yes, select banks offer 100% on-road funding for salaried professionals with high CIBIL scores."
                />
                <FaqItem
                  question="What is the maximum loan tenure?"
                  answer="Most banks offer up to 7 years (84 months) for new car loans."
                />
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-[#0f172a]">
              Eligibility Check
            </h3>
            <div className="mt-6 space-y-4">
              <EligibilityRow
                icon={Briefcase}
                label="Employment"
                value="Salaried / Self-Emp"
              />
              <EligibilityRow
                icon={Percent}
                label="Min CIBIL Score"
                value="750+"
              />
              <EligibilityRow
                icon={Calendar}
                label="Age Limit"
                value="21 - 65 Years"
              />
            </div>
            <button className="mt-6 w-full rounded-2xl bg-[#2563eb] py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#1d4ed8]">
              Check My Eligibility
            </button>
          </div>

          <div className="rounded-[24px] bg-[#f8fafc] p-6 ring-1 ring-[#dbe3ef]">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563eb] shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-black text-[#0f172a]">Paperless Process</h4>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-[#64748b]">
                  Get instant digital approval with our integrated bank
                  partners. No physical documents needed for initial offer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernCanvasShell>
  );
}

function FaqItem({ question, answer }) {
  return (
    <div className="rounded-2xl border border-[#dbe3ef] bg-white p-5 transition hover:border-[#2563eb]">
        <p className="font-bold text-[#0f172a]">{compactText(question)}</p>
        <p className="mt-1 text-sm text-[#64748b] leading-relaxed">
          {compactText(answer)}
        </p>
    </div>
  );
}

function EligibilityRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff6ff] text-[#2563eb]">
          <Icon size={16} />
        </div>
        <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">{compactText(label)}</p>
      </div>
      <p className="text-sm font-black text-[#0f172a]">{compactText(value)}</p>
    </div>
  );
}
