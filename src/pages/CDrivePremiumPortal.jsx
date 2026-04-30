import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  CircleDollarSign,
  Fuel,
  Gauge,
  GitCompare,
  Heart,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Users,
  Wallet,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

const fallbackCars = [
  {
    id: "creta-sxo",
    make: "Hyundai",
    model: "Creta",
    variant: "SX(O) Turbo DCT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    price: 1939000,
    marketPrice: 1989000,
    savings: 50000,
    emi: 33450,
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80",
    ],
    tags: ["family", "automatic", "suv"],
    valueProposition: "Balanced family SUV with strong feature-value ratio.",
    mileage: "17.8 km/l",
    engine: "1.5L Turbo Petrol",
    power: "160 PS",
    torque: "253 Nm",
    seating: "5 Seater",
    boot: "433 L",
    rating: 4.7,
    reviewCount: 284,
    launchStatus: "Available Now",
    colors: ["Abyss Black", "Atlas White", "Titan Grey", "Fiery Red"],
    features: [
      "Panoramic sunroof",
      "ADAS features",
      "Ventilated seats",
      "10.25-inch infotainment",
      "Digital cluster",
      "Bose audio",
    ],
    safety: [
      "6 airbags",
      "ESC + hill assist",
      "Rear camera",
      "Tyre pressure monitoring",
    ],
    whyVariant:
      "Best suited for family buyers who want premium features, strong road presence, and a smoother automatic ownership experience.",
    reviews: [
      {
        author: "Rohan M.",
        title: "Feels premium and easy to own",
        text: "Best mix of features, comfort, and city drivability. The pricing support matters a lot.",
        rating: 5,
      },
      {
        author: "Aditi S.",
        title: "Good family automatic",
        text: "Rear seat comfort and feature set are strong. Worth shortlisting for urban families.",
        rating: 4,
      },
    ],
  },
  {
    id: "seltos-gtx",
    make: "Kia",
    model: "Seltos",
    variant: "GTX+ DCT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    price: 2019000,
    marketPrice: 2069000,
    savings: 50000,
    emi: 34880,
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=80",
    ],
    tags: ["sporty", "automatic", "suv"],
    valueProposition: "More design-forward and sporty for urban buyers.",
    mileage: "17.7 km/l",
    engine: "1.5L Turbo Petrol",
    power: "160 PS",
    torque: "253 Nm",
    seating: "5 Seater",
    boot: "433 L",
    rating: 4.6,
    reviewCount: 232,
    launchStatus: "Available Now",
    colors: ["Pewter Olive", "Glacier White", "Intense Red", "Aurora Black"],
    features: [
      "Dual-screen cockpit",
      "Premium Bose sound",
      "Ventilated seats",
      "ADAS package",
      "Air purifier",
      "Connected tech",
    ],
    safety: ["6 airbags", "360 camera", "Blind view monitor", "ESC"],
    whyVariant:
      "A better fit for users who value sharper styling, a more expressive cabin, and stronger visual appeal in city driving.",
    reviews: [
      {
        author: "Karan P.",
        title: "Looks and feels sharp",
        text: "The design stands out. It is a strong urban SUV if styling matters to you.",
        rating: 5,
      },
      {
        author: "Sonal D.",
        title: "Feature loaded",
        text: "One of the better equipped options. Price negotiation makes a real difference here.",
        rating: 4,
      },
    ],
  },
  {
    id: "city-zx",
    make: "Honda",
    model: "City",
    variant: "ZX CVT",
    bodyType: "Sedan",
    fuel: "Petrol",
    transmission: "Automatic",
    price: 1688000,
    marketPrice: 1730000,
    savings: 42000,
    emi: 29120,
    image:
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
    ],
    tags: ["sedan", "automatic", "premium"],
    valueProposition: "Refined sedan comfort with strong rear-seat experience.",
    mileage: "18.4 km/l",
    engine: "1.5L i-VTEC Petrol",
    power: "121 PS",
    torque: "145 Nm",
    seating: "5 Seater",
    boot: "506 L",
    rating: 4.5,
    reviewCount: 174,
    launchStatus: "Available Now",
    colors: ["Platinum White", "Golden Brown", "Meteoroid Grey", "Radiant Red"],
    features: [
      "Lane watch camera",
      "Honda Sensing",
      "Sunroof",
      "Wireless Android Auto",
      "Leather seats",
      "Rear AC vents",
    ],
    safety: [
      "6 airbags",
      "Lane keep assist",
      "Collision mitigation",
      "ABS + EBD",
    ],
    whyVariant:
      "Ideal for buyers who prioritize comfort, rear-seat space, and a more refined sedan driving experience over SUV stance.",
    reviews: [
      {
        author: "Neha T.",
        title: "Still the benchmark sedan",
        text: "Quiet, spacious, and smooth. A very comfortable daily car with premium feel.",
        rating: 5,
      },
      {
        author: "Vivek R.",
        title: "Practical and classy",
        text: "If you want sedan comfort and less visual noise, this is a mature choice.",
        rating: 4,
      },
    ],
  },
  {
    id: "nexon-fearless",
    make: "Tata",
    model: "Nexon",
    variant: "Fearless+ S DCA",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    price: 1559000,
    marketPrice: 1605000,
    savings: 46000,
    emi: 26950,
    image:
      "https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    ],
    tags: ["budget", "automatic", "suv"],
    valueProposition: "Strong value entry point for automatic SUV buyers.",
    mileage: "17.0 km/l",
    engine: "1.2L Turbo Petrol",
    power: "120 PS",
    torque: "170 Nm",
    seating: "5 Seater",
    boot: "382 L",
    rating: 4.4,
    reviewCount: 312,
    launchStatus: "Available Now",
    colors: ["Fearless Purple", "Daytona Grey", "White", "Flame Red"],
    features: [
      "Large touchscreen",
      "Sunroof",
      "360 camera",
      "Digital cluster",
      "Connected car tech",
      "Air purifier",
    ],
    safety: ["6 airbags", "ESP", "ISOFIX", "Front parking sensors"],
    whyVariant:
      "A strong pick for value-conscious upgraders who want an automatic SUV with premium touches without overspending.",
    reviews: [
      {
        author: "Arjun K.",
        title: "Great value SUV",
        text: "A lot of car for the money. The deal support makes it even more attractive.",
        rating: 4,
      },
      {
        author: "Priya L.",
        title: "Good first automatic SUV",
        text: "Easy to drive and practical for urban use. Works well as an upgrade car.",
        rating: 4,
      },
    ],
  },
  {
    id: "grand-vitara-alpha",
    make: "Maruti Suzuki",
    model: "Grand Vitara",
    variant: "Alpha AT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    price: 1865000,
    marketPrice: 1919000,
    savings: 54000,
    emi: 32180,
    image:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
    ],
    tags: ["family", "automatic", "suv"],
    valueProposition:
      "Efficient, family-friendly SUV with broad ownership appeal.",
    mileage: "19.4 km/l",
    engine: "1.5L Petrol",
    power: "103 PS",
    torque: "137 Nm",
    seating: "5 Seater",
    boot: "373 L",
    rating: 4.5,
    reviewCount: 146,
    launchStatus: "Available Now",
    colors: ["Nexa Blue", "Chestnut Brown", "Arctic White", "Splendid Silver"],
    features: [
      "Panoramic sunroof",
      "360 camera",
      "HUD",
      "Wireless charging",
      "Ventilated seats",
      "Connected features",
    ],
    safety: ["6 airbags", "Hill hold", "Tyre monitoring", "ABS + EBD"],
    whyVariant:
      "Great for family buyers who want a calm ownership experience, efficient running, and sensible premium features.",
    reviews: [
      {
        author: "Manish B.",
        title: "Efficient and calm",
        text: "Feels easy to live with. Good pick for family use where ownership costs matter.",
        rating: 4,
      },
      {
        author: "Ishita N.",
        title: "A sensible premium SUV",
        text: "Not flashy, but very balanced. The right buy if you want maturity over drama.",
        rating: 4,
      },
    ],
  },
  {
    id: "verna-sx",
    make: "Hyundai",
    model: "Verna",
    variant: "SX IVT",
    bodyType: "Sedan",
    fuel: "Petrol",
    transmission: "Automatic",
    price: 1749000,
    marketPrice: 1799000,
    savings: 50000,
    emi: 30120,
    image:
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
    ],
    tags: ["sedan", "automatic", "premium"],
    valueProposition:
      "Modern styling with premium cabin and smooth urban drive.",
    mileage: "18.6 km/l",
    engine: "1.5L Petrol",
    power: "115 PS",
    torque: "144 Nm",
    seating: "5 Seater",
    boot: "528 L",
    rating: 4.5,
    reviewCount: 128,
    launchStatus: "Available Now",
    colors: ["Fiery Red", "Titan Grey", "Abyss Black", "Atlas White"],
    features: [
      "Dual screens",
      "Ventilated seats",
      "Sunroof",
      "ADAS features",
      "Ambient lighting",
      "Premium audio",
    ],
    safety: ["6 airbags", "ADAS", "Rear disc brakes", "Camera + sensors"],
    whyVariant:
      "A more design-led sedan choice for buyers who want modern styling, strong features, and premium cabin drama.",
    reviews: [
      {
        author: "Siddharth V.",
        title: "Sharp design, easy drive",
        text: "Modern sedan with a nicer cabin than most buyers expect in this segment.",
        rating: 5,
      },
      {
        author: "Pooja A.",
        title: "Strong highway sedan",
        text: "Comfortable, feature-rich, and well suited to buyers who want a premium sedan.",
        rating: 4,
      },
    ],
  },
];

const latestLaunches = [
  {
    id: "xuv-3xo-ev",
    name: "Mahindra XUV 3XO EV",
    expectedPrice: "₹ 14.5L - ₹ 17.8L",
    launch: "June 2026",
    tag: "Latest Launch",
    image:
      "https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "curvv-ev",
    name: "Tata Curvv EV",
    expectedPrice: "₹ 18.0L - ₹ 22.0L",
    launch: "July 2026",
    tag: "Hot New EV",
    image:
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "elevate-hybrid",
    name: "Honda Elevate Hybrid",
    expectedPrice: "₹ 17.0L - ₹ 21.0L",
    launch: "August 2026",
    tag: "Upcoming",
    image:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80",
  },
];

const hotDeals = [
  {
    title: "Creta SX(O) Turbo DCT",
    save: "Save ₹ 50,000",
    urgency: "12 people viewing",
  },
  {
    title: "Grand Vitara Alpha AT",
    save: "Save ₹ 54,000",
    urgency: "5 deals closed today",
  },
  {
    title: "Verna SX IVT",
    save: "Save ₹ 50,000",
    urgency: "Dealer offer live now",
  },
  {
    title: "Nexon Fearless+ S DCA",
    save: "Save ₹ 46,000",
    urgency: "Fast moving deal",
  },
];

const trendingSearches = [
  "SUV under 20L",
  "Best family automatic under 20L",
  "Compare Creta vs Seltos",
  "Best sedan under 18L",
  "Need EMI for Nexon",
  "Insurance quote for Creta",
];

const trustReasons = [
  {
    title: "Smarter comparison",
    text: "Compare cars, prices, features, and monthly costs without visual clutter.",
  },
  {
    title: "Deal-first pricing",
    text: "See market price, your price, and savings before the lead form appears.",
  },
  {
    title: "Finance + insurance",
    text: "Move from shortlist to EMI and protection without breaking the buying flow.",
  },
];

const quickPrompts = [
  "SUV under 20L",
  "Compare Creta vs Seltos",
  "Need EMI for Nexon",
  "Insurance quote for Creta",
  "Best family automatic under 20L",
  "Sell my old car",
];

const formatLakh = (value) => `₹ ${(value / 100000).toFixed(2)} Lakh`;
const formatMoney = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function inferView(query) {
  const q = normalizeText(query);
  if (q.includes("compare") || q.includes(" vs ")) return "compare";
  if (q.includes("finance") || q.includes("emi") || q.includes("loan"))
    return "finance";
  if (q.includes("insurance") || q.includes("policy")) return "insurance";
  if (q.includes("sell") || q.includes("valuation") || q.includes("exchange"))
    return "sell";
  return "results";
}

function formatApiCars(items = []) {
  return items
    .map((item, index) => {
      const make =
        item.make ||
        item.makeName ||
        item.brand ||
        item.oem ||
        item.manufacturer ||
        "Unknown";
      const model =
        item.model || item.modelName || item.carModel || item.name || "Model";
      const variant =
        item.variant ||
        item.variantName ||
        item.version ||
        item.grade ||
        "Variant";
      const fuel = item.fuel || item.fuelType || "Petrol";
      const transmission =
        item.transmission || item.transmissionType || "Manual";
      const price = Number(
        item.price ||
          item.exShowroomPrice ||
          item.onRoadPrice ||
          item.minPrice ||
          0,
      );
      if (!price) return null;

      const marketPrice = Math.round(price * 1.03);
      const savings = marketPrice - price;
      const emi = Math.round(price / 58);

      return {
        ...fallbackCars[index % fallbackCars.length],
        id: item.id || item._id || `${make}-${model}-${variant}-${index}`,
        make,
        model,
        variant,
        bodyType: item.bodyType || item.segment || "Car",
        fuel,
        transmission,
        price,
        marketPrice,
        savings,
        emi,
        image:
          item.image ||
          item.imageUrl ||
          item.thumbnail ||
          item.photo ||
          fallbackCars[index % fallbackCars.length].image,
        valueProposition:
          item.valueProposition ||
          "Dealer-linked pricing with a cleaner, faster buying journey.",
      };
    })
    .filter(Boolean);
}

function getFallbackResults(query) {
  const q = normalizeText(query);

  if (q.includes("compare") && q.includes("vs")) {
    const cleaned = q.replace("compare", "").trim();
    const parts = cleaned
      .split("vs")
      .map((s) => s.trim())
      .filter(Boolean);

    return fallbackCars
      .filter((car) =>
        parts.some((part) => normalizeText(car.model).includes(part)),
      )
      .slice(0, 3);
  }

  let result = [...fallbackCars];

  if (q.includes("suv")) result = result.filter((c) => c.bodyType === "SUV");
  if (q.includes("sedan"))
    result = result.filter((c) => c.bodyType === "Sedan");
  if (q.includes("family")) {
    result = result.filter(
      (c) =>
        c.tags.includes("family") ||
        ["Creta", "Grand Vitara"].includes(c.model),
    );
  }
  if (q.includes("automatic")) {
    result = result.filter((c) =>
      normalizeText(c.transmission).includes("automatic"),
    );
  }
  if (q.includes("creta"))
    result = result.filter((c) => normalizeText(c.model).includes("creta"));
  if (q.includes("seltos"))
    result = result.filter((c) => normalizeText(c.model).includes("seltos"));
  if (q.includes("nexon"))
    result = result.filter((c) => normalizeText(c.model).includes("nexon"));

  const under = q.match(/under\s+(\d+)/);
  if (under) {
    const max = Number(under[1]) * 100000;
    result = result.filter((c) => c.price <= max);
  }

  return result.slice(0, 4);
}

function wantsLead(view, results) {
  if (["compare", "finance", "insurance", "sell", "details"].includes(view))
    return true;
  if (results.length && results.some((car) => car.savings >= 45000))
    return true;
  return false;
}

function getLeadTitle(view, car) {
  if (view === "finance")
    return `Unlock finance-backed pricing${car ? ` for ${car.model}` : ""}`;
  if (view === "insurance")
    return `Bundle quote and save more${car ? ` on ${car.model}` : ""}`;
  if (view === "sell") return "Use your exchange to improve the offer";
  if (view === "compare") return "You have enough clarity to unlock offers";
  if (view === "details")
    return `Get dealer offers${car ? ` for ${car.model}` : ""}`;
  return "Unlock the best deal instantly";
}

function getIntentLabel(view) {
  if (view === "compare") return "Intent detected: Compare";
  if (view === "finance") return "Intent detected: Finance";
  if (view === "insurance") return "Intent detected: Insurance";
  if (view === "sell") return "Intent detected: Exchange";
  if (view === "details") return "Intent detected: Detail page";
  return "Intent detected: Search";
}

function getAssistantReply(view, results) {
  const first = results[0];
  if (view === "compare") {
    return {
      title: "Comparison ready",
      subtitle: "Best next action",
      text: `I prepared a cleaner side-by-side view. ${first ? `${first.model} looks strong on savings.` : ""} Want me to unlock dealer offers on one of these?`,
    };
  }
  if (view === "finance") {
    return {
      title: "Finance opened",
      subtitle: "Best next action",
      text: `I opened EMI options on the right. ${first ? `For ${first.model}, locking a better price first can improve the EMI immediately.` : ""}`,
    };
  }
  if (view === "insurance") {
    return {
      title: "Insurance opened",
      subtitle: "Best next action",
      text: `I opened protection plans on the right. ${first ? `Bundling ${first.model} with the deal can reduce total ownership cost.` : ""}`,
    };
  }
  if (view === "sell") {
    return {
      title: "Exchange flow opened",
      subtitle: "Best next action",
      text: "I opened the valuation flow. If you exchange your current car, I can move you toward a stronger final deal.",
    };
  }
  if (view === "details") {
    return {
      title: "Detail page opened",
      subtitle: "Best next action",
      text: `I opened the full product view. ${first ? `This is the moment to anchor price, savings, EMI, and dealer offer visibility.` : ""}`,
    };
  }
  return {
    title: "Shortlist updated",
    subtitle: "Best next action",
    text: `I refined the shortlist on the right. ${first ? `Want the best deal on the ${first.model}?` : "I can get dealer offers for the right car."}`,
  };
}

function SoftCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-white/88 shadow-[0_18px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function Logo() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-10 w-10"
      fill="none"
      aria-label="CDrive"
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="18"
        className="stroke-current"
        strokeWidth="3.5"
      />
      <path
        d="M43 20c-2.8-2.7-6.8-4.2-11-4.2-9.1 0-16 7-16 16.2 0 9.1 6.9 16.2 16 16.2 4.2 0 8.1-1.5 11-4.2"
        className="stroke-current"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M34 24l11.5 8L34 40"
        className="stroke-current"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#64748b] backdrop-blur-xl">
      {children}
    </div>
  );
}

function MetricChip({ value, label, tone = "neutral" }) {
  const toneMap = {
    neutral: "bg-white/85 text-[#334155]",
    blue: "bg-sky-50/95 text-sky-700",
    emerald: "bg-emerald-50/95 text-emerald-700",
  };

  return (
    <div
      className={`rounded-[22px] border border-white/60 px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl ${toneMap[tone]}`}
    >
      <div className="text-lg font-semibold tracking-[-0.05em]">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.18em]">
        {label}
      </div>
    </div>
  );
}

function AssistantBubble({ message }) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="ml-auto max-w-[92%] rounded-[22px] bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700"
      >
        {message.text}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="max-w-[94%] rounded-[24px] border border-[rgba(15,23,42,0.05)] bg-[#f8fafc] p-4"
    >
      {message.title ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-[#111111]">
            {message.title}
          </div>
          {message.subtitle ? (
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
              {message.subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className={`text-sm leading-6 text-[#475569] ${message.title ? "mt-2" : ""}`}
      >
        {message.text}
      </div>
    </motion.div>
  );
}

function ResultCard({
  car,
  selected,
  onToggleCompare,
  onBestDeal,
  onOpenDetails,
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease: EASE }}
      whileHover={{ y: -6 }}
      className={`group overflow-hidden rounded-[30px] border bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)] ${
        selected
          ? "border-sky-200 ring-1 ring-sky-100"
          : "border-[rgba(15,23,42,0.07)]"
      }`}
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={car.image}
          alt={`${car.make} ${car.model}`}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.10),rgba(255,255,255,0.22)_100%)]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <div className="rounded-full bg-white/85 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#111111] backdrop-blur-xl">
            {car.bodyType}
          </div>
          <div className="rounded-full bg-white/85 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-sky-700 backdrop-blur-xl">
            {car.transmission}
          </div>
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-emerald-50/95 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-700 backdrop-blur-xl">
          Save {formatMoney(car.savings)}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
              {car.make}
            </div>
            <div className="mt-2 text-[1.8rem] font-semibold tracking-[-0.06em] text-[#111111]">
              {car.model}
            </div>
            <div className="mt-1 text-sm leading-6 text-[#6b7280]">
              {car.variant}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleCompare(car)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
              selected
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : "border-[rgba(15,23,42,0.06)] bg-[#f8fafc] text-[#6b7280] hover:bg-white"
            }`}
            aria-label={`Compare ${car.make} ${car.model}`}
          >
            <GitCompare className="h-4 w-4" />
            {selected ? "Added" : "Compare"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 rounded-[24px] bg-[#f8fafc] p-3.5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
              Market
            </div>
            <div className="mt-2 text-xs line-through text-[#9ca3af]">
              {formatLakh(car.marketPrice)}
            </div>
          </div>
          <div className="rounded-[16px] bg-white px-3 py-2 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-sky-600">
              Your Price
            </div>
            <div className="mt-2 text-sm font-semibold text-[#111111]">
              {formatLakh(car.price)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-600">
              Savings
            </div>
            <div className="mt-2 text-xs font-semibold text-emerald-600">
              {formatMoney(car.savings)}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-[20px] border border-[rgba(15,23,42,0.05)] bg-white px-4 py-3 text-sm text-[#6b7280]">
          <span>{car.fuel}</span>
          <span>{car.transmission}</span>
          <span>{formatMoney(car.emi)}/mo</span>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#6b7280]">
          {car.valueProposition}
        </p>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => onBestDeal(car)}
            className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5"
          >
            Get Best Deal
          </button>
          <button
            onClick={() => onOpenDetails(car)}
            className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-5 text-sm font-semibold text-[#111111] transition hover:-translate-y-0.5"
          >
            View Details
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6b7280]">
          <div className="rounded-full bg-[#f8fafc] px-3 py-2">
            EMI options inside detail page
          </div>
          <div className="rounded-full bg-[#f8fafc] px-3 py-2">
            Insurance quote after click
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function CompareBar({ selectedCars, onOpenCompare, onRemove, onClear }) {
  if (!selectedCars.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="sticky top-[88px] z-20 mb-5"
    >
      <SoftCard className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-sky-50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-sky-700">
              Compare shortlist
            </div>
            {selectedCars.map((car) => (
              <div
                key={car.id}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] px-3 py-2 text-sm text-[#111111]"
              >
                <span>
                  {car.make} {car.model}
                </span>
                <button
                  onClick={() => onRemove(car.id)}
                  className="text-[#94a3b8] transition hover:text-[#111111]"
                  aria-label={`Remove ${car.make} ${car.model}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onClear}
              className="min-h-11 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-4 text-sm font-medium text-[#4b5563]"
            >
              Clear
            </button>
            <button
              onClick={onOpenCompare}
              className="min-h-11 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.14)]"
            >
              Compare {selectedCars.length} Cars
            </button>
          </div>
        </div>
      </SoftCard>
    </motion.div>
  );
}

function CompareCanvas({ results, onBestDeal, onOpenDetails }) {
  const compareResults = results.slice(0, 3);

  return (
    <SoftCard className="overflow-hidden">
      <div className="border-b border-[rgba(15,23,42,0.06)] p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
              Compare intelligently
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
              Premium side-by-side view
            </div>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-700">
            Best-value differences highlighted
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 xl:p-6">
        {compareResults.map((car) => (
          <div
            key={car.id}
            className="overflow-hidden rounded-[26px] border border-[rgba(15,23,42,0.06)] bg-white"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={car.image}
                alt={`${car.make} ${car.model}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.28))]" />
            </div>
            <div className="p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
                {car.make}
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                {car.model}
              </div>
              <div className="mt-1 text-sm text-[#6b7280]">{car.variant}</div>

              <div className="mt-5 space-y-3">
                {[
                  ["Your Price", formatLakh(car.price)],
                  ["Fuel", car.fuel],
                  ["Transmission", car.transmission],
                  ["Savings", formatMoney(car.savings)],
                  ["EMI", `${formatMoney(car.emi)}/mo`],
                  ["Why choose it", car.valueProposition],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[18px] bg-[#f8fafc] px-4 py-3"
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
                      {label}
                    </div>
                    <div className="mt-1.5 text-sm font-medium leading-6 text-[#111111]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => onBestDeal(car)}
                  className="min-h-12 flex-1 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.14)]"
                >
                  Get Best Deal
                </button>
                <button
                  onClick={() => onOpenDetails(car)}
                  className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-5 text-sm font-semibold text-[#111111]"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}

function FinanceCanvas({ results, onBestDeal }) {
  const car = results[0] || fallbackCars[0];
  const discountedPrice = car.price;
  const marketPrice = car.marketPrice;
  const downPayment = Math.round(discountedPrice * 0.2);
  const tenure = 60;
  const interest = 8.75;
  const emiEstimate = car.emi;

  return (
    <SoftCard className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                Finance / EMI
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
                {car.make} {car.model}
              </div>
              <div className="mt-2 text-sm leading-6 text-[#6b7280]">
                Pricing clarity first, then the cleanest monthly ownership path.
              </div>
            </div>
            <div className="rounded-full bg-sky-50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-sky-700">
              Loan ready
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: <Tag className="h-4 w-4" />,
                label: "Market Price",
                value: formatLakh(marketPrice),
              },
              {
                icon: <CircleDollarSign className="h-4 w-4" />,
                label: "Your Price",
                value: formatLakh(discountedPrice),
              },
              {
                icon: <Wallet className="h-4 w-4" />,
                label: "Savings",
                value: formatMoney(car.savings),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] bg-[#f8fafc] p-5">
                <div className="flex items-center gap-2 text-[#6b7280]">
                  {item.icon}
                  <span className="text-[10px] uppercase tracking-[0.18em]">
                    {item.label}
                  </span>
                </div>
                <div
                  className={`mt-3 tracking-[-0.05em] ${item.label === "Your Price" ? "text-2xl font-semibold text-[#111111]" : "text-xl font-semibold text-[#111111]"}`}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Down Payment", formatMoney(downPayment)],
              ["Tenure", `${tenure} Months`],
              ["Interest", `${interest}%`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[24px] border border-[rgba(15,23,42,0.06)] bg-white p-5"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
                  {label}
                </div>
                <div className="mt-3 text-xl font-semibold tracking-[-0.05em] text-[#111111]">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#f8fafc] p-6 sm:p-7">
          <div className="rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">
              Estimated EMI
            </div>
            <div className="mt-3 text-[2.4rem] font-semibold tracking-[-0.08em] text-[#111111]">
              {formatMoney(emiEstimate)}
              <span className="text-lg font-medium text-[#6b7280]"> /mo</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6b7280]">
              Locking a lower purchase price first usually improves the EMI more
              than adjusting the tenure later.
            </p>

            <div className="mt-5 space-y-3">
              {[
                "Dealer-linked offers",
                "Low-friction eligibility",
                "Mobile number only in step 1",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-[#4b5563]"
                >
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onBestDeal(car)}
              className="mt-6 min-h-12 w-full rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.14)]"
            >
              Get Best Deal + Finance Offer
            </button>
          </div>
        </div>
      </div>
    </SoftCard>
  );
}

function InsuranceCanvas({ results, onBestDeal }) {
  const car = results[0] || fallbackCars[0];
  const plans = [
    {
      plan: "Essential",
      idv: formatMoney(Math.round(car.price * 0.85)),
      type: "Comprehensive",
      premium: "₹ 32,400",
      addOns: "Basic own damage + third party",
      savings: "Bundle savings up to ₹ 8,000",
    },
    {
      plan: "Preferred",
      idv: formatMoney(Math.round(car.price * 0.88)),
      type: "Zero Dep",
      premium: "₹ 38,800",
      addOns: "Zero dep + RSA + engine protect",
      savings: "Bundle savings up to ₹ 12,000",
    },
    {
      plan: "Signature",
      idv: formatMoney(Math.round(car.price * 0.9)),
      type: "Zero Dep Plus",
      premium: "₹ 43,500",
      addOns: "RTI + consumables + invoice cover",
      savings: "Bundle savings up to ₹ 16,000",
    },
  ];

  return (
    <SoftCard className="p-6 sm:p-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
            Insurance quote
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
            Protection for {car.make} {car.model}
          </div>
          <div className="mt-2 text-sm leading-6 text-[#6b7280]">
            Cleaner quote cards with bundling cues that guide users toward
            conversion.
          </div>
        </div>
        <div className="rounded-full bg-sky-50 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-sky-700">
          Better when bundled
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {plans.map((item) => (
          <div
            key={item.plan}
            className="rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
                {item.plan}
              </div>
              <ShieldCheck className="h-4.5 w-4.5 text-sky-600" />
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
              {item.premium}
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["IDV", item.idv],
                ["Policy Type", item.type],
                ["Add-ons", item.addOns],
                ["Savings", item.savings],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] bg-white px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
                    {label}
                  </div>
                  <div className="mt-1.5 text-sm font-medium leading-6 text-[#111111]">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => onBestDeal(car)}
              className="mt-5 min-h-12 w-full rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.14)]"
            >
              Get Best Deal + Insurance
            </button>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}

function SellCanvas({ onBestDeal }) {
  return (
    <SoftCard className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="p-6 sm:p-7">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
            Sell / valuation
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
            Smart exchange, cleaner upgrade path
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
            A restrained valuation module that helps users move from their old
            car into a better upgrade offer without turning the page into a
            listing marketplace.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Estimated Value", "₹ 6.8L - ₹ 7.4L"],
              ["Exchange Bonus", "Up to ₹ 35,000"],
              ["Inspection Slot", "Same-day availability"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[24px] bg-[#f8fafc] p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
                  {label}
                </div>
                <div className="mt-3 text-xl font-semibold tracking-[-0.05em] text-[#111111]">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#f8fafc] p-6 sm:p-7">
          <div className="rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">
              Upgrade message
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
              Exchange your old car and unlock a stronger final offer.
            </div>
            <div className="mt-5 space-y-3">
              {[
                "Get a guided inspection call",
                "Apply exchange bonus on the final deal",
                "Move into a better automatic SUV with less friction",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 text-sm leading-6 text-[#4b5563]"
                >
                  <Check className="mt-1 h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="min-h-12 flex-1 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                Book Inspection
              </button>
              <button
                onClick={() => onBestDeal(fallbackCars[0])}
                className="min-h-12 flex-1 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-5 text-sm font-semibold text-[#111111]"
              >
                Use Exchange for Best Deal
              </button>
            </div>
          </div>
        </div>
      </div>
    </SoftCard>
  );
}

function MiniSectionHeader({ label, title, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
          {label}
        </div>
        <div className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
          {title}
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

function HotDealsCarousel({ deals }) {
  const [index, setIndex] = useState(0);
  const visible = [
    deals[index],
    deals[(index + 1) % deals.length],
    deals[(index + 2) % deals.length],
  ];

  return (
    <SoftCard className="overflow-hidden p-6 sm:p-7">
      <MiniSectionHeader
        label="Hot deals"
        title="Live dealer-moving offers"
        action={
          <div className="flex gap-2">
            <button
              onClick={() =>
                setIndex((prev) => (prev - 1 + deals.length) % deals.length)
              }
              className="rounded-full border border-[rgba(15,23,42,0.06)] bg-white p-3 text-[#4b5563]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIndex((prev) => (prev + 1) % deals.length)}
              className="rounded-full border border-[rgba(15,23,42,0.06)] bg-white p-3 text-[#4b5563]"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((deal, i) => (
          <motion.div
            key={`${deal.title}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-[linear-gradient(180deg,#ffffff,#f7fafc)] p-5"
          >
            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-700">
              {deal.urgency}
            </div>
            <div className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[#111111]">
              {deal.title}
            </div>
            <div className="mt-2 text-sm text-[#6b7280]">{deal.save}</div>
            <button className="mt-5 min-h-11 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-4 text-sm font-semibold text-white">
              Get Best Deal
            </button>
          </motion.div>
        ))}
      </div>
    </SoftCard>
  );
}

function TrendingSearchesSection({ searches, onSearch }) {
  return (
    <SoftCard className="overflow-hidden p-6 sm:p-7">
      <MiniSectionHeader
        label="Trending searches"
        title="What buyers are exploring right now"
      />
      <div className="flex flex-wrap gap-3">
        {searches.map((item) => (
          <button
            key={item}
            onClick={() => onSearch(item)}
            className="rounded-full border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] px-4 py-3 text-sm font-medium text-[#334155] transition hover:bg-white"
          >
            {item}
          </button>
        ))}
      </div>
    </SoftCard>
  );
}

function LatestLaunchesSection({ items }) {
  return (
    <SoftCard className="overflow-hidden p-6 sm:p-7">
      <MiniSectionHeader
        label="Latest launches"
        title="New arrivals worth watching"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-white"
          >
            <div className="relative h-48">
              <img
                src={item.image}
                alt={item.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-sky-700 backdrop-blur-xl">
                {item.tag}
              </div>
            </div>
            <div className="p-5">
              <div className="text-xl font-semibold tracking-[-0.04em] text-[#111111]">
                {item.name}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#6b7280]">
                <CalendarDays className="h-4 w-4" />
                <span>{item.launch}</span>
              </div>
              <div className="mt-2 text-sm text-[#6b7280]">
                {item.expectedPrice}
              </div>
              <button className="mt-5 min-h-11 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-4 text-sm font-semibold text-[#111111]">
                Get Early Deal
              </button>
            </div>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}

function CustomerReviewsSection({ cars }) {
  const reviewCards = cars.slice(0, 4).flatMap((car) =>
    car.reviews.slice(0, 1).map((review) => ({
      ...review,
      carLabel: `${car.make} ${car.model}`,
    })),
  );

  return (
    <SoftCard className="overflow-hidden p-6 sm:p-7">
      <MiniSectionHeader
        label="Customer reviews"
        title="Short trust signals that improve conversion"
      />
      <div className="grid gap-4 lg:grid-cols-4">
        {reviewCards.map((review, index) => (
          <div
            key={`${review.author}-${index}`}
            className="rounded-[26px] border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] p-5"
          >
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <div className="mt-4 text-lg font-semibold tracking-[-0.04em] text-[#111111]">
              {review.title}
            </div>
            <div className="mt-2 text-sm leading-6 text-[#6b7280]">
              {review.text}
            </div>
            <div className="mt-5 text-sm font-medium text-[#111111]">
              {review.author}
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
              {review.carLabel}
            </div>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}

function WhyCDriveSection() {
  return (
    <SoftCard className="overflow-hidden p-6 sm:p-7">
      <MiniSectionHeader
        label="Why CDrive"
        title="What makes the workflow feel smarter"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {trustReasons.map((item) => (
          <div
            key={item.title}
            className="rounded-[26px] border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] p-5"
          >
            <div className="text-lg font-semibold tracking-[-0.04em] text-[#111111]">
              {item.title}
            </div>
            <div className="mt-2 text-sm leading-6 text-[#6b7280]">
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}

function SimilarCarsSection({ currentCar, allCars, onOpenDetails }) {
  const similarCars = allCars
    .filter(
      (car) => car.id !== currentCar.id && car.bodyType === currentCar.bodyType,
    )
    .slice(0, 3);

  if (!similarCars.length) return null;

  return (
    <div className="mt-8">
      <MiniSectionHeader
        label="Similar cars"
        title="Cars close to this shortlist"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {similarCars.map((car) => (
          <div
            key={car.id}
            className="overflow-hidden rounded-[26px] border border-[rgba(15,23,42,0.06)] bg-white"
          >
            <div className="h-44 overflow-hidden">
              <img
                src={car.image}
                alt={`${car.make} ${car.model}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
                {car.make}
              </div>
              <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#111111]">
                {car.model}
              </div>
              <div className="mt-1 text-sm text-[#6b7280]">{car.variant}</div>
              <div className="mt-4 text-sm font-medium text-[#111111]">
                {formatLakh(car.price)}
              </div>
              <button
                onClick={() => onOpenDetails(car)}
                className="mt-4 min-h-11 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-4 text-sm font-semibold text-[#111111]"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailStickyRail({ car, onBestDeal }) {
  return (
    <div className="lg:sticky lg:top-[102px]">
      <SoftCard className="overflow-hidden">
        <div className="p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">
            Deal summary
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
            {car.make} {car.model}
          </div>
          <div className="mt-1 text-sm text-[#6b7280]">{car.variant}</div>

          <div className="mt-5 space-y-3">
            {[
              ["Market Price", formatLakh(car.marketPrice)],
              ["Your Price", formatLakh(car.price)],
              ["Savings", formatMoney(car.savings)],
              ["EMI From", `${formatMoney(car.emi)}/mo`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[20px] bg-[#f8fafc] px-4 py-3"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
                  {label}
                </div>
                <div
                  className={`mt-1.5 ${label === "Your Price" ? "text-lg font-semibold text-[#111111]" : "text-sm font-semibold text-[#111111]"}`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              3 dealers can quote on this now
            </div>
            <div className="rounded-[18px] bg-sky-50 px-4 py-3 text-sm text-sky-700">
              Mobile only in step 1
            </div>
          </div>

          <button
            onClick={() => onBestDeal(car)}
            className="mt-5 min-h-12 w-full rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
          >
            Get Best Deal
          </button>

          <div className="mt-4 text-xs leading-6 text-[#6b7280]">
            Unlock city-level dealer offers, finance support, and exchange
            assistance after step 1.
          </div>
        </div>
      </SoftCard>
    </div>
  );
}

function CarDetailsPage({
  car,
  allCars,
  onBack,
  onBestDeal,
  onOpenFinance,
  onOpenInsurance,
  onOpenDetails,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeImage, setActiveImage] = useState(car.gallery?.[0] || car.image);

  useEffect(() => {
    setActiveTab("overview");
    setActiveImage(car.gallery?.[0] || car.image);
  }, [car]);

  const tabs = ["overview", "features", "finance", "insurance", "reviews"];

  const colorMap = {
    "Abyss Black": "#111827",
    "Atlas White": "#e5e7eb",
    "Titan Grey": "#6b7280",
    "Fiery Red": "#dc2626",
    "Pewter Olive": "#556b52",
    "Glacier White": "#f8fafc",
    "Intense Red": "#b91c1c",
    "Aurora Black": "#0f172a",
    "Platinum White": "#f3f4f6",
    "Golden Brown": "#8b5e3c",
    "Meteoroid Grey": "#475569",
    "Radiant Red": "#ef4444",
    "Fearless Purple": "#7c3aed",
    "Daytona Grey": "#64748b",
    White: "#f8fafc",
    "Flame Red": "#e11d48",
    "Nexa Blue": "#1d4ed8",
    "Chestnut Brown": "#7c4a24",
    "Arctic White": "#f8fafc",
    "Splendid Silver": "#94a3b8",
  };

  return (
    <div className="space-y-6">
      <SoftCard className="overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="p-4 sm:p-5">
            <div className="relative overflow-hidden rounded-[30px]">
              <img
                src={activeImage}
                alt={`${car.make} ${car.model}`}
                className="h-[420px] w-full object-cover sm:h-[540px]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.18),rgba(15,23,42,0.44)_100%)]" />
              <div className="absolute left-5 top-5 rounded-full bg-white/85 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-sky-700 backdrop-blur-xl">
                {car.launchStatus}
              </div>

              <div className="absolute inset-x-5 bottom-5 rounded-[28px] border border-white/10 bg-[rgba(15,23,42,0.48)] p-5 text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">
                      Current highlight
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                      {car.make} {car.model}
                    </div>
                    <div className="mt-1 text-sm text-white/75">
                      {car.variant}
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-400/12 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-200">
                    Save {formatMoney(car.savings)}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] bg-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">
                      Market Price
                    </div>
                    <div className="mt-2 text-sm line-through text-white/60">
                      {formatLakh(car.marketPrice)}
                    </div>
                  </div>
                  <div className="rounded-[20px] bg-white/16 p-4 ring-1 ring-white/10">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-sky-200">
                      Your Price
                    </div>
                    <div className="mt-2 text-base font-semibold">
                      {formatLakh(car.price)}
                    </div>
                  </div>
                  <div className="rounded-[20px] bg-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">
                      EMI From
                    </div>
                    <div className="mt-2 text-sm font-semibold">
                      {formatMoney(car.emi)}/mo
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {(car.gallery || [car.image]).slice(0, 3).map((item, idx) => (
                <button
                  key={`${item}-${idx}`}
                  onClick={() => setActiveImage(item)}
                  className={`overflow-hidden rounded-[22px] border ${
                    activeImage === item
                      ? "border-sky-200 ring-2 ring-sky-100"
                      : "border-[rgba(15,23,42,0.06)]"
                  }`}
                >
                  <img
                    src={item}
                    alt={`${car.model}-${idx}`}
                    className="h-24 w-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                {
                  icon: <Fuel className="h-4 w-4" />,
                  label: "Fuel",
                  value: car.fuel,
                },
                {
                  icon: <Gauge className="h-4 w-4" />,
                  label: "Transmission",
                  value: car.transmission,
                },
                {
                  icon: <Users className="h-4 w-4" />,
                  label: "Seating",
                  value: car.seating,
                },
                {
                  icon: <Car className="h-4 w-4" />,
                  label: "Body Type",
                  value: car.bodyType,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] bg-[#f8fafc] px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-[#64748b]">
                    {item.icon}
                    <span className="text-[10px] uppercase tracking-[0.18em]">
                      {item.label}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#111111]">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[rgba(15,23,42,0.06)] p-6 xl:border-l xl:border-t-0 sm:p-7">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-4 py-2 text-sm font-medium text-[#4b5563]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to results
            </button>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-sky-50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-sky-700">
                Premium detail view
              </div>
              <div className="rounded-full bg-amber-50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-amber-700">
                {car.rating} rating • {car.reviewCount} reviews
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
                {car.make}
              </div>
              <div className="mt-2 text-[2.4rem] font-semibold tracking-[-0.07em] text-[#111111]">
                {car.model}
              </div>
              <div className="mt-1 text-base text-[#6b7280]">{car.variant}</div>
            </div>

            <div className="mt-6 rounded-[28px] bg-[#f8fafc] p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">
                Why this variant
              </div>
              <p className="mt-3 text-sm leading-6 text-[#475569]">
                {car.whyVariant}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                    activeTab === tab
                      ? "bg-[#111111] text-white"
                      : "border border-[rgba(15,23,42,0.06)] bg-white text-[#4b5563]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => onBestDeal(car)}
                className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
              >
                Get Best Deal
              </button>
              <button
                onClick={() => onOpenFinance(car)}
                className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-5 text-sm font-semibold text-[#111111]"
              >
                View Finance
              </button>
              <button
                onClick={() => onOpenInsurance(car)}
                className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-5 text-sm font-semibold text-[#111111]"
              >
                Insurance Quote
              </button>
            </div>
          </div>
        </div>
      </SoftCard>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <SoftCard className="overflow-hidden p-6 sm:p-7">
            {activeTab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div>
                  <MiniSectionHeader
                    label="Overview"
                    title="Editorial snapshot"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Mileage", car.mileage],
                      ["Engine", car.engine],
                      ["Power", car.power],
                      ["Torque", car.torque],
                      ["Boot", car.boot],
                      ["Seating", car.seating],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[24px] bg-[#f8fafc] p-5"
                      >
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#94a3b8]">
                          {label}
                        </div>
                        <div className="mt-3 text-lg font-semibold tracking-[-0.04em] text-[#111111]">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <MiniSectionHeader label="Colors" title="Exterior choices" />
                  <div className="space-y-3">
                    {car.colors.map((color) => (
                      <div
                        key={color}
                        className="flex items-center gap-3 rounded-[22px] border border-[rgba(15,23,42,0.06)] bg-white px-4 py-3"
                      >
                        <span
                          className="h-5 w-5 rounded-full border border-black/5"
                          style={{
                            backgroundColor: colorMap[color] || "#cbd5e1",
                          }}
                        />
                        <span className="text-sm font-medium text-[#334155]">
                          {color}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "features" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <MiniSectionHeader
                    label="Features"
                    title="Top cabin and convenience highlights"
                  />
                  <div className="space-y-3">
                    {car.features.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-[20px] bg-[#f8fafc] px-4 py-3 text-sm text-[#334155]"
                      >
                        <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <MiniSectionHeader
                    label="Safety"
                    title="Confidence and protection"
                  />
                  <div className="space-y-3">
                    {car.safety.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-[20px] bg-[#f8fafc] px-4 py-3 text-sm text-[#334155]"
                      >
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "finance" && (
              <div>
                <MiniSectionHeader
                  label="Finance"
                  title="Monthly ownership made simpler"
                />
                <FinanceCanvas results={[car]} onBestDeal={onBestDeal} />
              </div>
            )}

            {activeTab === "insurance" && (
              <div>
                <MiniSectionHeader
                  label="Insurance"
                  title="Protection options for this car"
                />
                <InsuranceCanvas results={[car]} onBestDeal={onBestDeal} />
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                <MiniSectionHeader
                  label="Reviews"
                  title="What buyers are saying"
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  {car.reviews.map((review, idx) => (
                    <div
                      key={`${review.author}-${idx}`}
                      className="rounded-[26px] border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] p-5"
                    >
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <div className="mt-4 text-lg font-semibold tracking-[-0.04em] text-[#111111]">
                        {review.title}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[#6b7280]">
                        {review.text}
                      </div>
                      <div className="mt-5 text-sm font-medium text-[#111111]">
                        {review.author}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SoftCard>

          <SoftCard className="overflow-hidden p-6 sm:p-7">
            <SimilarCarsSection
              currentCar={car}
              allCars={allCars}
              onOpenDetails={onOpenDetails}
            />
          </SoftCard>
        </div>

        <DetailStickyRail car={car} onBestDeal={onBestDeal} />
      </div>
    </div>
  );
}

export default function CDrivePremiumPortal() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      title: "Welcome",
      subtitle: "Buying copilot",
      text: "Ask naturally. I’ll stay here on the left and update the right side with exactly what you need.",
    },
    {
      role: "assistant",
      title: "What I can do",
      subtitle: "Best next action",
      text: "I can shortlist cars, compare options, open finance and insurance views, and guide you toward the best deal.",
    },
  ]);
  const [input, setInput] = useState("SUV under 20L");
  const [activeView, setActiveView] = useState("results");
  const [results, setResults] = useState(fallbackCars.slice(0, 4));
  const [selectedCars, setSelectedCars] = useState([]);
  const [showLead, setShowLead] = useState(true);
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("SUV under 20L");
  const [apiStatus, setApiStatus] = useState("fallback");
  const [detailCar, setDetailCar] = useState(fallbackCars[0]);
  const workspaceRef = useRef(null);

  const activeHeroCar =
    activeView === "details" ? detailCar : results[0] || fallbackCars[0];

  const canvasTitle = useMemo(() => {
    if (activeView === "compare") return "Comparison";
    if (activeView === "finance") return "Finance Offers";
    if (activeView === "insurance") return "Insurance Quote";
    if (activeView === "sell") return "Sell Car";
    if (activeView === "details") return "Car Details";
    return "Search Results";
  }, [activeView]);

  useEffect(() => {
    runQuery("SUV under 20L", { silentUserMessage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncSelectedCars = (incomingResults) => {
    setSelectedCars((prev) =>
      prev
        .map((car) => {
          const match = incomingResults.find((item) => item.id === car.id);
          return match || car;
        })
        .slice(0, 3),
    );
  };

  const fetchCarsFromApi = async (q) => {
    try {
      if (
        typeof window !== "undefined" &&
        window.featuresApi &&
        typeof window.featuresApi.getVariantsWithPrice === "function"
      ) {
        const res = await window.featuresApi.getVariantsWithPrice({
          slim: "1",
          includeDiscontinued: "0",
          q,
        });

        const payload = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.results)
              ? res.results
              : Array.isArray(res?.variants)
                ? res.variants
                : [];

        const mapped = formatApiCars(payload);
        if (mapped.length) {
          setApiStatus("live");
          return mapped;
        }
      }
    } catch (error) {
      setApiStatus("fallback");
    }

    setApiStatus("fallback");
    return [];
  };

  const pushAssistantMessage = (payload) => {
    setMessages((prev) => [...prev, { role: "assistant", ...payload }]);
  };

  const runQuery = async (query, options = {}) => {
    const q = query.trim();
    if (!q || loading) return;

    const view = inferView(q);
    const fallback = getFallbackResults(q);
    const compareSeed =
      view === "compare"
        ? fallback.length
          ? fallback
          : fallbackCars.slice(0, 2)
        : fallback.length
          ? fallback
          : fallbackCars.slice(0, 4);

    if (!options.silentUserMessage) {
      setMessages((prev) => [...prev, { role: "user", text: q }]);
    }

    setInput("");
    setLoading(true);
    setLastQuery(q);

    let finalResults = compareSeed;

    if (view === "results" || view === "finance" || view === "insurance") {
      const live = await fetchCarsFromApi(q);
      if (live.length) {
        finalResults =
          view === "results"
            ? live.slice(0, 4)
            : live.length
              ? live
              : compareSeed;
      }
    }

    if (view === "compare" && selectedCars.length >= 2) {
      finalResults = selectedCars.slice(0, 3);
    }

    window.clearTimeout(runQuery._timer);
    runQuery._timer = window.setTimeout(() => {
      setActiveView(view);
      setResults(finalResults);
      syncSelectedCars(finalResults);
      if (finalResults[0]) setDetailCar(finalResults[0]);
      setShowLead(wantsLead(view, finalResults));
      pushAssistantMessage(getAssistantReply(view, finalResults));
      setLoading(false);
    }, 480);
  };

  const handleToggleCompare = (car) => {
    setSelectedCars((prev) => {
      const exists = prev.some((item) => item.id === car.id);
      if (exists) return prev.filter((item) => item.id !== car.id);
      if (prev.length >= 3) return [...prev.slice(1), car];
      return [...prev, car];
    });
  };

  const handleOpenCompare = () => {
    const compareCars =
      selectedCars.length >= 2 ? selectedCars.slice(0, 3) : results.slice(0, 2);
    setActiveView("compare");
    setResults(compareCars);
    setShowLead(true);
    pushAssistantMessage(getAssistantReply("compare", compareCars));
  };

  const handleBestDeal = (car) => {
    setShowLead(true);
    pushAssistantMessage({
      title: "Deal capture ready",
      subtitle: "Best next action",
      text: `I can get dealer offers for ${car.make} ${car.model}. Enter your mobile number below to unlock the best deal.`,
    });
    workspaceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleOpenFinance = (car) => {
    setActiveView("finance");
    setResults([car]);
    setDetailCar(car);
    setShowLead(true);
    pushAssistantMessage(getAssistantReply("finance", [car]));
  };

  const handleOpenInsurance = (car) => {
    setActiveView("insurance");
    setResults([car]);
    setDetailCar(car);
    setShowLead(true);
    pushAssistantMessage(getAssistantReply("insurance", [car]));
  };

  const handleOpenDetails = (car) => {
    setDetailCar(car);
    setActiveView("details");
    setShowLead(true);
    pushAssistantMessage(getAssistantReply("details", [car]));
  };

  const handleAskAi = () => {
    workspaceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const leadCar =
    activeView === "details" ? detailCar : results[0] || fallbackCars[0];

  return (
    <div
      className="min-h-screen bg-[#f5f7fb] text-[#111111] antialiased"
      style={{
        backgroundImage:
          "radial-gradient(circle at top left, rgba(125,211,252,0.16), transparent 25%), radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 18%), linear-gradient(180deg, #edf5ff 0%, #ffffff 18%, #f6f8fb 54%, #f4f6f8 100%)",
      }}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(circle_at_15%_18%,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.08),transparent_20%),radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.78),transparent_44%)]" />

      <header className="sticky top-0 z-50 border-b border-[rgba(15,23,42,0.06)] bg-[linear-gradient(180deg,rgba(238,246,255,0.84),rgba(255,255,255,0.76))] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="text-[13px] font-semibold tracking-[0.3em]">
                CDRIVE
              </div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#64748b]">
                AI Deal Workspace
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="rounded-full border border-[rgba(15,23,42,0.06)] bg-white/80 px-4 py-2 text-sm text-[#64748b]">
              {apiStatus === "live"
                ? "Live pricing connected"
                : "Fallback pricing ready"}
            </div>
            <button className="min-h-11 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
              Get Best Deal
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">
          <div className="mx-auto grid max-w-[1600px] items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <SectionLabel>
                <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                Premium conversational buying
              </SectionLabel>

              <h1 className="mt-6 max-w-[10ch] text-5xl font-semibold tracking-[-0.08em] text-[#111111] sm:text-7xl lg:text-[6.6rem] lg:leading-[0.92]">
                Buy smarter. Close better.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6b7280]">
                Find your dream car, compare intelligently, explore finance
                instantly, and unlock the best deal in one premium, seamless
                experience.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-7 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.15)]">
                  Get Best Deal
                </button>
                <button
                  onClick={handleAskAi}
                  className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-white/80 px-7 text-sm font-semibold text-[#111111] backdrop-blur-xl"
                >
                  Ask AI
                </button>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {[
                  "12 people viewing",
                  "5 deals closed today",
                  "Mobile only in step 1",
                ].map((chip) => (
                  <div
                    key={chip}
                    className="rounded-full border border-[rgba(15,23,42,0.06)] bg-white/75 px-4 py-2 text-sm text-[#6b7280] backdrop-blur-xl"
                  >
                    {chip}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.985, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <SoftCard className="overflow-hidden p-4">
                <div className="relative h-[580px] overflow-hidden rounded-[30px] bg-[#eaf3fb]">
                  <img
                    src={activeHeroCar.image}
                    alt={`${activeHeroCar.make} ${activeHeroCar.model}`}
                    className="h-full w-full object-cover brightness-[0.9] saturate-[0.92]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.16),rgba(15,23,42,0.50)_78%,rgba(7,12,20,0.72)_100%)]" />

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
                    className="absolute left-6 top-6"
                  >
                    <MetricChip
                      value="₹ 50,000"
                      label="Typical savings"
                      tone="emerald"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
                    className="absolute right-6 top-6"
                  >
                    <MetricChip
                      value="2 min"
                      label="Shortlist speed"
                      tone="blue"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
                    className="absolute inset-x-6 bottom-6 rounded-[30px] border border-white/10 bg-[rgba(15,23,42,0.52)] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.18)] backdrop-blur-[22px] sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-white/65">
                          Current highlight
                        </div>
                        <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                          {activeHeroCar.make} {activeHeroCar.model}
                        </div>
                        <div className="mt-1 text-sm text-white/75">
                          {activeHeroCar.variant}
                        </div>
                      </div>
                      <div className="rounded-full bg-emerald-400/12 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-200">
                        Save {formatMoney(activeHeroCar.savings)}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[20px] bg-white/10 p-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                          Market Price
                        </div>
                        <div className="mt-2 text-sm line-through text-white/55">
                          {formatLakh(activeHeroCar.marketPrice)}
                        </div>
                      </div>
                      <div className="rounded-[20px] bg-white/18 p-4 ring-1 ring-white/10">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-sky-200">
                          Your Price
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {formatLakh(activeHeroCar.price)}
                        </div>
                      </div>
                      <div className="rounded-[20px] bg-white/10 p-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                          EMI From
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {formatMoney(activeHeroCar.emi)}/mo
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </SoftCard>
            </motion.div>
          </div>
        </section>

        <section
          ref={workspaceRef}
          className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-16"
        >
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-white px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#6b7280] shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                Workspace
              </div>
              <div className="text-sm text-[#6b7280]">
                Left side holds the conversation. Right side responds to the
                user’s intent.
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
              <aside className="lg:sticky lg:top-[94px] lg:h-[calc(100vh-118px)]">
                <SoftCard className="flex h-full flex-col overflow-hidden bg-white/82">
                  <div className="border-b border-[rgba(15,23,42,0.06)] p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-sky-50 p-3 text-sky-600 shadow-[0_8px_18px_rgba(14,165,233,0.05)]">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                          AI Buying Copilot
                        </div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.05em] text-[#111111]">
                          CDrive Assistant
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <div className="rounded-full bg-[#f8fafc] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#64748b]">
                        {getIntentLabel(activeView)}
                      </div>
                      <div className="rounded-full bg-[#f8fafc] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#64748b]">
                        Goal: Get Best Deal
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[#6b7280]">
                      Ask naturally. I’ll parse the intent, update the right
                      canvas, and keep nudging toward the best possible deal.
                    </p>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto p-5">
                    {messages.map((message, i) => (
                      <AssistantBubble
                        key={`${message.role}-${i}`}
                        message={message}
                      />
                    ))}

                    <AnimatePresence>
                      {loading ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="inline-flex rounded-full bg-[#f8fafc] px-4 py-3 text-sm text-[#6b7280]"
                        >
                          Updating the canvas...
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <div className="border-t border-[rgba(15,23,42,0.06)] p-5">
                    <div className="flex flex-wrap gap-2">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => runQuery(prompt)}
                          className="rounded-full border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] px-3 py-2 text-xs text-[#6b7280] transition hover:bg-white"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-3">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runQuery(input)}
                        className="min-h-12 flex-1 rounded-full border border-[rgba(15,23,42,0.05)] bg-[#f8fafc] px-4 text-sm text-[#111111] outline-none focus:border-sky-200"
                        placeholder="Compare Creta vs Seltos"
                      />
                      <button
                        onClick={() => runQuery(input)}
                        className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-5 text-sm font-semibold text-[#111111] shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                      >
                        Ask
                      </button>
                    </div>
                  </div>
                </SoftCard>
              </aside>

              <section className="min-w-0">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                      Dynamic canvas
                    </div>
                    <div className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
                      {canvasTitle}
                    </div>
                    <div className="mt-2 text-sm text-[#6b7280]">
                      {lastQuery
                        ? `Query: ${lastQuery}`
                        : "Intent-driven results"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {showLead ? (
                      <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                        High intent detected
                      </div>
                    ) : null}
                    <div className="rounded-full border border-[rgba(15,23,42,0.06)] bg-white px-4 py-2 text-sm text-[#6b7280]">
                      Unlock best price instantly
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  <CompareBar
                    selectedCars={selectedCars}
                    onOpenCompare={handleOpenCompare}
                    onRemove={(id) =>
                      setSelectedCars((prev) =>
                        prev.filter((item) => item.id !== id),
                      )
                    }
                    onClear={() => setSelectedCars([])}
                  />
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeView}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    {activeView === "results" && (
                      <div className="grid gap-5 md:grid-cols-2">
                        {results.map((car) => (
                          <ResultCard
                            key={car.id}
                            car={car}
                            selected={selectedCars.some(
                              (item) => item.id === car.id,
                            )}
                            onToggleCompare={handleToggleCompare}
                            onBestDeal={handleBestDeal}
                            onOpenDetails={handleOpenDetails}
                          />
                        ))}
                      </div>
                    )}

                    {activeView === "compare" && (
                      <CompareCanvas
                        results={
                          results.length ? results : fallbackCars.slice(0, 2)
                        }
                        onBestDeal={handleBestDeal}
                        onOpenDetails={handleOpenDetails}
                      />
                    )}

                    {activeView === "finance" && (
                      <FinanceCanvas
                        results={results}
                        onBestDeal={handleBestDeal}
                      />
                    )}

                    {activeView === "insurance" && (
                      <InsuranceCanvas
                        results={results}
                        onBestDeal={handleBestDeal}
                      />
                    )}

                    {activeView === "sell" && (
                      <SellCanvas onBestDeal={handleBestDeal} />
                    )}

                    {activeView === "details" && (
                      <CarDetailsPage
                        car={detailCar}
                        allCars={fallbackCars}
                        onBack={() => setActiveView("results")}
                        onBestDeal={handleBestDeal}
                        onOpenFinance={handleOpenFinance}
                        onOpenInsurance={handleOpenInsurance}
                        onOpenDetails={handleOpenDetails}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {showLead ? (
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="mt-6"
                    >
                      <SoftCard className="overflow-hidden">
                        <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
                          <div className="p-6">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                              Next step
                            </div>
                            <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
                              {getLeadTitle(activeView, leadCar)}
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
                              Show value first, then ask for the number. This
                              keeps friction low and makes the conversion ask
                              feel natural instead of pushy.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-3">
                              {[
                                leadCar
                                  ? `3 dealers can quote on ${leadCar.model}`
                                  : "Dealer offers unlocked",
                                "Best deal in one step",
                                "No long form upfront",
                              ].map((item) => (
                                <div
                                  key={item}
                                  className="rounded-full border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] px-4 py-2 text-sm text-[#6b7280]"
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-[#f8fafc] p-6">
                            <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">
                                Step 1
                              </div>
                              <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#111111]">
                                {leadCar
                                  ? `Get dealer offers for ${leadCar.model}`
                                  : "Unlock the best deal"}
                              </div>

                              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <div className="relative flex-1">
                                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                                  <input
                                    value={mobile}
                                    onChange={(e) =>
                                      setMobile(
                                        e.target.value
                                          .replace(/\D/g, "")
                                          .slice(0, 10),
                                      )
                                    }
                                    placeholder="Enter mobile number"
                                    className="min-h-12 w-full rounded-full border border-[rgba(15,23,42,0.05)] bg-[#f8fafc] pl-11 pr-4 text-sm text-[#111111] outline-none focus:border-sky-200"
                                  />
                                </div>
                                <button className="min-h-12 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
                                  Get Best Deal
                                </button>
                              </div>

                              <div className="mt-4 flex items-start gap-2 text-xs text-[#6b7280]">
                                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                                Mobile only for step 1. City, finance,
                                insurance, and exchange can come later.
                              </div>
                            </div>
                          </div>
                        </div>
                      </SoftCard>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-28">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <HotDealsCarousel deals={hotDeals} />
            <TrendingSearchesSection
              searches={trendingSearches}
              onSearch={runQuery}
            />
            <LatestLaunchesSection items={latestLaunches} />
            <CustomerReviewsSection cars={fallbackCars} />
            <WhyCDriveSection />
          </div>
        </section>
      </main>

      <div className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-8 lg:w-auto">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#111111] px-6 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.24)] lg:w-auto"
        >
          <span>Get Best Deal</span>
          <ArrowRight className="h-4.5 w-4.5" />
        </motion.button>
      </div>
    </div>
  );
}
