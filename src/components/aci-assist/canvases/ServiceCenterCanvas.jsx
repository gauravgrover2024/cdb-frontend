import React from "react";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Navigation,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { ModernCanvasShell } from "./BaseComponents";

export function ServiceCenterCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const { city = "Delhi", brand = "Hyundai", centers = [] } = data;

  return (
    <ModernCanvasShell
      title={`${brand} Service Centers`}
      subtitle={`Find authorized service workshops in ${city}.`}
      icon={Wrench}
      eyebrow="Care Network"
      footer={footer}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {centers.length > 0 ? (
          centers.map((center, idx) => <ServiceCenterCard key={idx} {...center} />)
        ) : (
          <>
            <ServiceCenterCard
              name="Himgiri Hyundai Service"
              address="Shed No 22, Okhla Phase III, New Delhi"
              rating={4.8}
              distance="2.4 km"
              phone="011-41612000"
            />
            <ServiceCenterCard
              name="Deep Hyundai Workshop"
              address="Plot No 13, Rama Road, Najafgarh, New Delhi"
              rating={4.6}
              distance="5.8 km"
              phone="011-45456767"
            />
            <ServiceCenterCard
              name="Koncept Hyundai Service"
              address="B-62, Sector 6, Noida"
              rating={4.7}
              distance="12.1 km"
              phone="0120-4343434"
            />
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center">
        <button className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-8 py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#1d4ed8] hover:shadow-xl">
          Book Service Appointment <ChevronRight size={18} />
        </button>
      </div>
    </ModernCanvasShell>
  );
}

function ServiceCenterCard({ name, address, rating, distance, phone }) {
  return (
    <div className="flex flex-col rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm transition hover:border-[#2563eb] hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
          <BuildingIcon />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
          <Star size={12} fill="currentColor" /> {rating}
        </div>
      </div>

      <div className="mt-5 flex-1">
        <h4 className="font-black text-[#0f172a] line-clamp-1">{name}</h4>
        <div className="mt-3 space-y-2 text-sm font-semibold text-[#64748b]">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-[#94a3b8]" />
            <p className="line-clamp-2 leading-relaxed">{address}</p>
          </div>
          <div className="flex items-center gap-2">
            <Navigation size={16} className="shrink-0 text-[#94a3b8]" />
            <p>{distance} away</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={16} className="shrink-0 text-[#94a3b8]" />
            <p>{phone}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button className="flex-1 rounded-xl bg-[#f8fafc] py-2.5 text-xs font-black text-[#0f172a] transition hover:bg-[#f1f5f9]">
          Call
        </button>
        <button className="flex-1 rounded-xl bg-[#eff6ff] py-2.5 text-xs font-black text-[#2563eb] transition hover:bg-[#dbeafe]">
          Directions
        </button>
      </div>
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="10" width="20" height="12" rx="2" />
      <path d="M6 10V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6" />
      <path d="M10 18h4" />
    </svg>
  );
}
