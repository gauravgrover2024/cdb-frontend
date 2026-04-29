import React from "react";
import { BadgeIndianRupee, CalendarDays, CarFront, UserRound } from "lucide-react";
import WidgetFrame from "./WidgetFrame";
import { asArray, formatCurrency, formatDate, humanize, pick } from "./utils";

const iconFor = (label) => {
  if (/customer|name/i.test(label)) return <UserRound size={15} />;
  if (/vehicle|model|registration/i.test(label)) return <CarFront size={15} />;
  if (/amount|price|premium|payout/i.test(label)) return <BadgeIndianRupee size={15} />;
  if (/date|expiry|created|updated/i.test(label)) return <CalendarDays size={15} />;
  return null;
};

const valueFor = (record, key) => {
  const value = pick(record, [key], "");
  if (value === "") return "—";
  if (/amount|price|premium|payout|emi/i.test(key)) return formatCurrency(value);
  if (/date|expiry|created|updated|activity/i.test(key)) return formatDate(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

export default function GenericEntityCard({ widget = {}, entity, title, fields, onAction }) {
  const record = entity || widget.entity || widget.data || widget;
  const cards = asArray(widget.cards || widget.entities || widget.data?.cards);
  if (cards.length) {
    return (
      <WidgetFrame title={widget.title || "Entities"} subtitle={widget.subtitle} actions={widget.actions} onAction={onAction}>
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((item, index) => (
            <GenericEntityCard key={item.id || item._id || index} entity={item} onAction={onAction} />
          ))}
        </div>
      </WidgetFrame>
    );
  }

  const shownFields = asArray(fields).length
    ? asArray(fields)
    : ["customer", "customerName", "vehicle", "model", "registrationNumber", "status", "module", "lastActivityDate", "updatedAt"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-black text-slate-900">
          {title || pick(record, ["title", "name", "customerName", "customer", "vehicle", "model"], "Record")}
        </p>
        {pick(record, ["subtitle", "module", "source"], "") ? (
          <p className="mt-0.5 text-xs font-medium text-slate-500">{pick(record, ["subtitle", "module", "source"], "")}</p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {shownFields.map((key) => {
          const value = valueFor(record, key);
          if (value === "—") return null;
          return (
            <div key={key} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                {iconFor(key)}
                {humanize(key)}
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
