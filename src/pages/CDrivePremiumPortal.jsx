import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTime,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Gauge,
  MessageSquareText,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

const CARS = [
  {
    id: "creta-sxo",
    make: "Hyundai",
    model: "Creta",
    variant: "SX(O) Turbo DCT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    familyFit: 91,
    budgetFit: 84,
    resale: 86,
    demand: 78,
    availability: 64,
    basePrice: 1939000,
    dealerDiscount: 32000,
    insuranceSavings: 18000,
    financeBenefit: 15000,
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=80",
    reason:
      "Strong family practicality, premium feature mix, and high demand make this a balanced city-plus-highway choice.",
  },
  {
    id: "seltos-gtx",
    make: "Kia",
    model: "Seltos",
    variant: "GTX+ DCT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    familyFit: 88,
    budgetFit: 79,
    resale: 82,
    demand: 74,
    availability: 58,
    basePrice: 2019000,
    dealerDiscount: 28000,
    insuranceSavings: 22000,
    financeBenefit: 14000,
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=80",
    reason:
      "Best for buyers wanting a more assertive design language, a rich feature list, and a sporty premium feel.",
  },
  {
    id: "xuv700-ax7",
    make: "Mahindra",
    model: "XUV700",
    variant: "AX7 AT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    familyFit: 93,
    budgetFit: 70,
    resale: 79,
    demand: 83,
    availability: 52,
    basePrice: 2310000,
    dealerDiscount: 35000,
    insuranceSavings: 20000,
    financeBenefit: 17000,
    image:
      "https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1800&q=80",
    reason:
      "Excellent for larger families who prioritize cabin presence, stronger road stance, and feature-heavy long-distance comfort.",
  },
  {
    id: "grand-vitara-alpha",
    make: "Maruti Suzuki",
    model: "Grand Vitara",
    variant: "Alpha AT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    familyFit: 87,
    budgetFit: 81,
    resale: 90,
    demand: 72,
    availability: 71,
    basePrice: 1975000,
    dealerDiscount: 26000,
    insuranceSavings: 17000,
    financeBenefit: 11000,
    image:
      "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1800&q=80",
    reason:
      "A safer long-term ownership pick for buyers who care about practicality, lower running anxiety, and resale confidence.",
  },
  {
    id: "city-zx",
    make: "Honda",
    model: "City",
    variant: "ZX CVT",
    bodyType: "Sedan",
    fuel: "Petrol",
    transmission: "Automatic",
    familyFit: 82,
    budgetFit: 85,
    resale: 83,
    demand: 62,
    availability: 73,
    basePrice: 1688000,
    dealerDiscount: 24000,
    insuranceSavings: 16000,
    financeBenefit: 12000,
    image:
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1800&q=80",
    reason:
      "Perfect for buyers who want a refined, chauffeur-friendly sedan with clean ergonomics and strong daily usability.",
  },
  {
    id: "nexon-fearless",
    make: "Tata",
    model: "Nexon",
    variant: "Fearless+ S DCA",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    familyFit: 84,
    budgetFit: 92,
    resale: 76,
    demand: 80,
    availability: 77,
    basePrice: 1559000,
    dealerDiscount: 29000,
    insuranceSavings: 19000,
    financeBenefit: 13000,
    image:
      "https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1800&q=80",
    reason:
      "A strong value-led automatic SUV for buyers who want a more aggressive deal envelope without losing feature appeal.",
  },
];

const quickPrompts = [
  "SUV under 20L",
  "Compare Creta vs Seltos",
  "Best family automatic",
  "Highest resale under 18L",
];

const formatLakh = (value) => {
  if (!value) return "₹ 0";
  if (value >= 10000000) return `₹ ${(value / 10000000).toFixed(2)} Cr`;
  return `₹ ${(value / 100000).toFixed(2)} Lakh`;
};

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const calcFinalPrice = (car, toggles) => {
  const total =
    (toggles.dealerDiscount ? car.dealerDiscount : 0) +
    (toggles.insuranceSavings ? car.insuranceSavings : 0) +
    (toggles.financeBenefit ? car.financeBenefit : 0);

  return {
    totalSavings: total,
    finalPrice: car.basePrice - total,
  };
};

const getDealStrength = (car, savings) => {
  const savingsPercent = (savings / car.basePrice) * 100;
  const raw =
    savingsPercent * 9 +
    car.demand * 0.35 +
    car.availability * 0.25 +
    car.resale * 0.18;
  return Math.round(clamp(raw, 18, 96));
};

const parsePrompt = (input, source) => {
  const q = input.toLowerCase().trim();
  let results = source;

  if (q.includes("suv"))
    results = results.filter((car) => car.bodyType === "SUV");
  if (q.includes("sedan"))
    results = results.filter((car) => car.bodyType === "Sedan");
  if (q.includes("automatic"))
    results = results.filter((car) => car.transmission === "Automatic");
  if (q.includes("family"))
    results = [...results].sort((a, b) => b.familyFit - a.familyFit);
  if (q.includes("resale"))
    results = [...results].sort((a, b) => b.resale - a.resale);

  const underMatch = q.match(/under\s+(\d+)/);
  if (underMatch) {
    const lakh = Number(underMatch[1]);
    results = results.filter((car) => car.basePrice <= lakh * 100000);
  }

  if (q.includes("compare") && q.includes("vs")) {
    const sides =
      q
        .split("compare")[1]
        ?.split("vs")
        .map((x) => x.trim()) || [];
    const compared = source.filter((car) =>
      sides.some((side) => car.model.toLowerCase().includes(side)),
    );
    return {
      type: "compare",
      results: compared.length ? compared.slice(0, 3) : source.slice(0, 2),
      reply:
        "I prepared a focused comparison and highlighted what actually changes the deal. I can also unlock the best final number now.",
    };
  }

  if (!results.length) {
    return {
      type: "search",
      results: source.slice(0, 3),
      reply:
        "I didn’t find an exact match, so I surfaced the closest premium-fit options. I can still optimize the final offer for you.",
    };
  }

  return {
    type: "search",
    results: results.slice(0, 4),
    reply:
      "I narrowed the shortlist around your intent and kept the strongest matches. Want me to push the best deal next?",
  };
};

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

function CountNumber({ value, formatter = formatLakh, className = "" }) {
  const spring = useSpring(value, { stiffness: 90, damping: 24, mass: 0.8 });
  const [display, setDisplay] = useState(value);

  useEffect(() => spring.set(value), [spring, value]);

  useEffect(() => {
    const unsub = spring.on("change", (latest) => setDisplay(latest));
    return () => unsub();
  }, [spring]);

  return <span className={className}>{formatter(Math.round(display))}</span>;
}

function MagneticButton({ children, className = "", ...props }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * 0.08);
    y.set(dy * 0.08);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      style={{ x, y, willChange: "transform" }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      whileHover={{ scale: 1.02, rotateX: 2.5, rotateY: -2.5 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

function SoftCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[28px] border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function TogglePill({ active, onClick, label, value }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-12 items-center justify-between rounded-full border px-4 text-sm transition-all duration-300 ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700 shadow-[0_8px_20px_rgba(14,165,233,0.08)]"
          : "border-[rgba(0,0,0,0.06)] bg-white text-[#111111] hover:-translate-y-0.5"
      }`}
    >
      <span>{label}</span>
      <span className={`text-xs ${active ? "text-sky-500" : "text-[#6b7280]"}`}>
        {formatLakh(value)}
      </span>
    </button>
  );
}

function DealConfidenceMeter({ score }) {
  const width = useSpring(score, { stiffness: 90, damping: 24, mass: 0.8 });
  const scaleX = useTransform(width, [0, 100], [0, 1]);

  return (
    <SoftCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
            Deal Strength
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
            {score}%
          </div>
        </div>
        <div className="rounded-full border border-[rgba(0,0,0,0.06)] bg-[#fafafa] px-3 py-2 text-xs text-[#6b7280]">
          Confidence meter
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[rgba(0,0,0,0.05)]">
        <motion.div
          style={{ scaleX, transformOrigin: "left", willChange: "transform" }}
          className="h-full rounded-full bg-[linear-gradient(90deg,#fde68a,#bbf7d0)]"
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[#6b7280]">
        <span>Weak</span>
        <span>Strong</span>
      </div>
    </SoftCard>
  );
}

function WhyItFits({ car }) {
  return (
    <div className="mt-4 rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-[#fafafa] p-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
        Why this fits you
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          ["Family", car.familyFit],
          ["Budget", car.budgetFit],
          ["Resale", car.resale],
        ].map(([label, score]) => (
          <div
            key={label}
            className="rounded-2xl bg-white p-3 text-center shadow-[0_6px_18px_rgba(15,23,42,0.03)]"
          >
            <div className="text-xs text-[#6b7280]">{label}</div>
            <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-[#111111]">
              {score}%
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{car.reason}</p>
    </div>
  );
}

function CompareSplitView({ cars, showOnlyDiff }) {
  if (cars.length < 2) {
    return (
      <SoftCard className="p-8 text-sm text-[#6b7280]">
        Add at least 2 cars to activate the premium split comparison.
      </SoftCard>
    );
  }

  const rows = [
    {
      key: "price",
      label: "Your Price",
      value: (car) => formatLakh(car.livePrice),
    },
    { key: "fuel", label: "Fuel", value: (car) => car.fuel },
    {
      key: "transmission",
      label: "Transmission",
      value: (car) => car.transmission,
    },
    {
      key: "familyFit",
      label: "Family Fit",
      value: (car) => `${car.familyFit}%`,
    },
    {
      key: "resale",
      label: "Resale Strength",
      value: (car) => `${car.resale}%`,
    },
  ];

  const visibleRows = rows.filter((row) => {
    if (!showOnlyDiff) return true;
    const values = cars.map((car) => row.value(car));
    return new Set(values).size > 1;
  });

  const bestPriceId = [...cars].sort((a, b) => a.livePrice - b.livePrice)[0]
    ?.id;

  return (
    <SoftCard className="overflow-hidden">
      <div
        className={`grid ${cars.length === 2 ? "md:grid-cols-[220px_1fr_1fr]" : "md:grid-cols-[220px_1fr_1fr_1fr]"}`}
      >
        <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#fafafa] p-5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
            Field
          </div>
        </div>

        {cars.map((car) => {
          const winner = car.id === bestPriceId;
          return (
            <motion.div
              key={car.id}
              layout
              className={`border-b border-l border-[rgba(0,0,0,0.06)] p-5 ${
                winner ? "bg-emerald-50/70" : "bg-white"
              }`}
              animate={winner ? { y: [0, -2, 0] } : {}}
              transition={
                winner
                  ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-[#6b7280]">{car.make}</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.05em] text-[#111111]">
                    {car.model}
                  </div>
                  <div className="mt-1 text-sm text-[#6b7280]">
                    {car.variant}
                  </div>
                </div>
                {winner ? (
                  <div className="rounded-full bg-emerald-100 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-700">
                    Price winner
                  </div>
                ) : null}
              </div>
            </motion.div>
          );
        })}

        {visibleRows.map((row) => (
          <React.Fragment key={row.key}>
            <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#fafafa] p-5 text-sm font-medium text-[#6b7280]">
              {row.label}
            </div>
            {cars.map((car) => {
              const values = cars.map((item) => row.value(item));
              const different = new Set(values).size > 1;
              return (
                <motion.div
                  key={`${row.key}-${car.id}`}
                  layout
                  className={`border-b border-l border-[rgba(0,0,0,0.06)] p-5 text-sm ${
                    different ? "text-[#111111]" : "text-[#6b7280]"
                  }`}
                >
                  <motion.div
                    key={row.value(car)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className={different ? "font-medium" : ""}
                  >
                    {row.value(car)}
                  </motion.div>
                </motion.div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </SoftCard>
  );
}

export default function CDriveDealOSLight() {
  const pageRef = useRef(null);
  const exploreRef = useRef(null);

  const [selectedCarId, setSelectedCarId] = useState(CARS[0].id);
  const [visibleCars, setVisibleCars] = useState(CARS);
  const [compareIds, setCompareIds] = useState([CARS[0].id, CARS[1].id]);
  const [showOnlyDiff, setShowOnlyDiff] = useState(true);
  const [mobile, setMobile] = useState("");
  const [showFitId, setShowFitId] = useState(null);
  const [chatInput, setChatInput] = useState("SUV under 20L");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Tell me the kind of car you want, and I’ll rebuild the shortlist around your deal.",
    },
  ]);

  const [dealToggles, setDealToggles] = useState({
    dealerDiscount: true,
    insuranceSavings: true,
    financeBenefit: false,
  });

  const selectedCar = useMemo(
    () => visibleCars.find((car) => car.id === selectedCarId) || CARS[0],
    [visibleCars, selectedCarId],
  );

  const compareCars = useMemo(() => {
    const source = visibleCars.length ? visibleCars : CARS;
    return compareIds
      .map(
        (id) =>
          source.find((car) => car.id === id) ||
          CARS.find((car) => car.id === id),
      )
      .filter(Boolean)
      .slice(0, 3)
      .map((car) => ({
        ...car,
        ...calcFinalPrice(car, dealToggles),
        livePrice: calcFinalPrice(car, dealToggles).finalPrice,
      }));
  }, [compareIds, visibleCars, dealToggles]);

  const activeDeal = useMemo(
    () => calcFinalPrice(selectedCar, dealToggles),
    [selectedCar, dealToggles],
  );
  const confidence = useMemo(
    () => getDealStrength(selectedCar, activeDeal.totalSavings),
    [selectedCar, activeDeal.totalSavings],
  );

  const time = useTime();
  const floatSlow = useTransform(time, [0, 5000], [0, 1], { clamp: false });
  const floatY = useTransform(floatSlow, (v) => Math.sin(v * Math.PI * 2) * 8);
  const floatYSmall = useTransform(
    floatSlow,
    (v) => Math.sin(v * Math.PI * 2 + 1.2) * 5,
  );
  const blobOpacity = useTransform(
    floatSlow,
    (v) => 0.3 + (Math.sin(v * Math.PI * 2) + 1) * 0.05,
  );

  const { scrollYProgress } = useScroll({
    target: pageRef,
    offset: ["start start", "end end"],
  });

  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(heroProgress, [0, 1], [0, 120]);
  const carY = useTransform(heroProgress, [0, 1], [0, 70]);
  const uiY = useTransform(heroProgress, [0, 1], [0, 36]);
  const heroScale = useTransform(heroProgress, [0, 1], [1, 1.06]);
  const heroOpacity = useTransform(heroProgress, [0, 0.85, 1], [1, 0.74, 0.42]);
  const carRotate = useTransform(heroProgress, [0, 0.5, 1], [0, -2, 3]);
  const carZoom = useTransform(heroProgress, [0, 1], [1, 1.08]);
  const uiReveal = useTransform(heroProgress, [0, 0.5, 0.95], [0.96, 1, 1.02]);

  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    if (!visibleCars.some((car) => car.id === selectedCarId)) {
      setSelectedCarId(visibleCars[0]?.id || CARS[0].id);
    }
  }, [visibleCars, selectedCarId]);

  const toggleCompare = (id) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return [...current.slice(1), id];
      return [...current, id];
    });
  };

  const handlePrompt = (prompt) => {
    const result = parsePrompt(prompt, CARS);
    setChatMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setChatBusy(true);

    setTimeout(() => {
      setVisibleCars(result.results);
      setSelectedCarId(result.results[0]?.id || CARS[0].id);
      if (result.type === "compare") {
        setCompareIds(result.results.slice(0, 3).map((car) => car.id));
      }
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.reply },
      ]);
      setChatBusy(false);
      exploreRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 900);
  };

  const submitChat = () => {
    const prompt = chatInput.trim();
    if (!prompt || chatBusy) return;
    handlePrompt(prompt);
    setChatInput("");
  };

  const urgencyLine = `${selectedCar.model} ${selectedCar.variant} • ${formatLakh(
    activeDeal.finalPrice,
  )} • 3 dealers competing`;

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-[#f5f5f7] text-[#111111] antialiased selection:bg-sky-100 selection:text-[#111111]"
      style={{ backgroundImage: "linear-gradient(180deg, #ffffff, #f5f5f7)" }}
    >
      <motion.div
        style={{ width: progressWidth }}
        className="fixed left-0 top-0 z-[80] h-1 bg-[linear-gradient(90deg,#7dd3fc,#86efac)]"
      />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          style={{ opacity: blobOpacity }}
          className="absolute left-[-8rem] top-[8rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.14),transparent_65%)] blur-3xl"
        />
        <motion.div
          style={{ opacity: blobOpacity }}
          className="absolute right-[-8rem] top-[18rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(167,243,208,0.14),transparent_65%)] blur-3xl"
        />
        <motion.div
          style={{ opacity: blobOpacity }}
          className="absolute left-1/2 top-[-8rem] h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.85),transparent_68%)] blur-3xl"
        />
      </div>

      <header className="fixed inset-x-0 top-0 z-[70] px-4 pt-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="mx-auto flex w-full max-w-[1380px] items-center justify-between rounded-full border border-[rgba(0,0,0,0.06)] bg-white/70 px-4 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="text-[#111111]">
              <Logo />
            </div>
            <div>
              <div className="text-[13px] font-semibold tracking-[0.3em]">
                CDRIVE
              </div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#6b7280]">
                Deal OS
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-full border border-[rgba(0,0,0,0.05)] bg-white/80 p-1 lg:flex">
            {["Attraction", "Explore", "Decision", "Convert"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="rounded-full px-4 py-2 text-sm text-[#6b7280] transition hover:bg-white hover:text-[#111111]"
              >
                {item}
              </a>
            ))}
          </nav>

          <MagneticButton className="min-h-11 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-5 text-sm font-medium text-[#111111] shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            Get Best Deal
          </MagneticButton>
        </motion.div>
      </header>

      <main>
        <section
          id="attraction"
          ref={heroRef}
          className="relative min-h-[180vh] overflow-hidden px-4 pt-24 sm:px-6 lg:px-8"
        >
          <div className="sticky top-20 mx-auto min-h-[calc(100vh-6rem)] max-w-[1400px] overflow-hidden rounded-[40px] border border-[rgba(0,0,0,0.05)] bg-white/50 shadow-[0_20px_60px_rgba(15,23,42,0.04)] backdrop-blur-xl">
            <motion.div
              style={{ y: bgY, scale: heroScale, opacity: heroOpacity }}
              className="absolute inset-0 will-change-transform"
            >
              <img
                src={selectedCar.image}
                alt={`${selectedCar.make} ${selectedCar.model}`}
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.62)_52%,#f5f5f7_100%)]" />
            </motion.div>

            <motion.div
              style={{
                y: carY,
                rotateZ: carRotate,
                scale: carZoom,
                willChange: "transform",
              }}
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 6.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute right-[-4%] top-[14%] hidden h-[44vw] w-[54vw] max-w-[840px] rounded-[40px] lg:block"
            >
              <div className="absolute inset-0 rounded-[40px] bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.10),transparent_65%)] blur-3xl" />
            </motion.div>

            <div className="relative z-10 grid min-h-[calc(100vh-6rem)] items-end gap-8 pb-12 lg:grid-cols-[1.02fr_0.98fr] lg:pb-20">
              <motion.div
                style={{ y: floatYSmall }}
                className="px-2 sm:px-4 lg:px-10 lg:pb-10"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.06)] bg-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#6b7280] backdrop-blur-xl">
                  <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                  Premium car buying interface
                </div>

                <h1 className="mt-5 max-w-[10ch] text-5xl font-semibold tracking-[-0.08em] text-[#111111] sm:text-7xl lg:text-[7rem] lg:leading-[0.9]">
                  Build the deal with clarity.
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6b7280] sm:text-xl">
                  CDrive feels like a luxury showroom tablet where search,
                  pricing, comparison, and negotiation work together in one
                  calm, guided product experience.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <MagneticButton className="min-h-12 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-7 text-sm font-semibold text-[#111111] shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                    Get Best Deal
                  </MagneticButton>
                  <MagneticButton className="min-h-12 rounded-full border border-[rgba(0,0,0,0.06)] bg-white/70 px-7 text-sm font-semibold text-[#111111] backdrop-blur-xl">
                    Start with AI search
                  </MagneticButton>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  {[
                    "12 people viewing now",
                    "5 deals closed today",
                    "Step 1 asks only for mobile",
                  ].map((chip, i) => (
                    <motion.div
                      key={chip}
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        duration: 4 + i * 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="rounded-full border border-[rgba(0,0,0,0.06)] bg-white/70 px-4 py-2 text-sm text-[#6b7280] backdrop-blur-xl"
                    >
                      {chip}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                style={{ y: uiY, scale: uiReveal }}
                className="px-2 sm:px-4 lg:px-6"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 6.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="rounded-[34px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                >
                  <div className="rounded-[28px] bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                          Signature deal moment
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                          {selectedCar.make} {selectedCar.model}
                        </div>
                        <div className="mt-1 text-sm text-[#6b7280]">
                          {selectedCar.variant}
                        </div>
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="rounded-full bg-emerald-50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.06)]"
                      >
                        Live negotiating
                      </motion.div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[22px] bg-[#fafafa] p-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b7280]">
                          Market
                        </div>
                        <div className="mt-2 text-base line-through text-[#9ca3af]">
                          {formatLakh(selectedCar.basePrice)}
                        </div>
                      </div>
                      <div className="rounded-[22px] bg-sky-50 p-4 shadow-[0_8px_24px_rgba(14,165,233,0.06)]">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-sky-600">
                          Your Price
                        </div>
                        <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#111111]">
                          <CountNumber value={activeDeal.finalPrice} />
                        </div>
                      </div>
                      <div className="rounded-[22px] bg-emerald-50 p-4 shadow-[0_8px_24px_rgba(16,185,129,0.06)]">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-600">
                          Unlocked
                        </div>
                        <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#111111]">
                          <CountNumber value={activeDeal.totalSavings} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-[#fafafa] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b7280]">
                            Deal momentum
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111111]">
                            The pricing layer becomes clearer as the user moves
                            deeper into the page.
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-[#9ca3af]" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1380px] gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                id: "scene-1",
                tag: "Scene 01",
                title: "Attraction",
                body: "A calm, cinematic first impression that sells trust and control.",
              },
              {
                id: "scene-2",
                tag: "Scene 02",
                title: "Exploration",
                body: "Search naturally, build the deal live, and understand the price instantly.",
              },
              {
                id: "scene-3",
                tag: "Scene 03",
                title: "Decision",
                body: "Compare only the differences that matter to a real buyer.",
              },
              {
                id: "scene-4",
                tag: "Scene 04",
                title: "Conversion",
                body: "Move cleanly into a mobile-first lead step without friction or noise.",
              },
            ].map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.08, duration: 0.8, ease: EASE }}
                animate={{ y: [0, -4, 0] }}
                className="rounded-[28px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl"
              >
                <div className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">
                  {item.tag}
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                  {item.title}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6b7280]">
                  {item.body}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section
          id="explore"
          ref={exploreRef}
          className="px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-[1380px]">
            <div className="grid gap-10 xl:grid-cols-[0.86fr_1.14fr]">
              <div className="xl:sticky xl:top-28 xl:h-fit">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.06)] bg-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#6b7280] backdrop-blur-xl">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-sky-500" />
                  Live Deal Builder
                </div>

                <h2 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-6xl">
                  Build the price softly, in real time.
                </h2>

                <p className="mt-5 max-w-xl text-base leading-7 text-[#6b7280]">
                  The interface behaves like a premium negotiation layer. Every
                  benefit is visible, every savings lever is understandable, and
                  the final number updates without stress.
                </p>

                <SoftCard className="mt-8 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                        Selected car
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                        {selectedCar.model}
                      </div>
                    </div>
                    <div className="rounded-full border border-[rgba(0,0,0,0.06)] bg-[#fafafa] px-3 py-2 text-xs text-[#6b7280]">
                      {selectedCar.bodyType} • {selectedCar.transmission}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <TogglePill
                      active={dealToggles.dealerDiscount}
                      onClick={() =>
                        setDealToggles((s) => ({
                          ...s,
                          dealerDiscount: !s.dealerDiscount,
                        }))
                      }
                      label="Dealer Discount"
                      value={selectedCar.dealerDiscount}
                    />
                    <TogglePill
                      active={dealToggles.insuranceSavings}
                      onClick={() =>
                        setDealToggles((s) => ({
                          ...s,
                          insuranceSavings: !s.insuranceSavings,
                        }))
                      }
                      label="Insurance Savings"
                      value={selectedCar.insuranceSavings}
                    />
                    <TogglePill
                      active={dealToggles.financeBenefit}
                      onClick={() =>
                        setDealToggles((s) => ({
                          ...s,
                          financeBenefit: !s.financeBenefit,
                        }))
                      }
                      label="Finance Benefit"
                      value={selectedCar.financeBenefit}
                    />
                  </div>

                  <div className="mt-6 rounded-[24px] bg-sky-50 p-5 shadow-[0_10px_30px_rgba(14,165,233,0.05)]">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-sky-600">
                          Final Price
                        </div>
                        <div className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-[#111111]">
                          <CountNumber value={activeDeal.finalPrice} />
                        </div>
                      </div>
                      <motion.div
                        key={activeDeal.totalSavings}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.5, ease: EASE }}
                        className="rounded-full bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.05)]"
                      >
                        You unlocked {formatLakh(activeDeal.totalSavings)}
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <DealConfidenceMeter score={confidence} />
                  </div>
                </SoftCard>

                <SoftCard className="mt-6 p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                    Deal script
                  </div>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-[#6b7280]">
                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      3 dealers are actively competing on this configuration.
                    </div>
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      Insurance and finance layers can improve the effective
                      number.
                    </div>
                    <div className="flex items-start gap-3">
                      <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                      Strong fit plus decent availability usually creates the
                      best negotiation window.
                    </div>
                  </div>
                </SoftCard>
              </div>

              <div>
                <SoftCard className="overflow-hidden bg-white/70 p-4 backdrop-blur-xl">
                  <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[28px] border border-[rgba(0,0,0,0.06)] bg-white p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
                            AI page controller
                          </div>
                          <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                            Search like you talk.
                          </div>
                        </div>
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="rounded-full border border-[rgba(0,0,0,0.06)] bg-sky-50 p-3 shadow-[0_8px_18px_rgba(14,165,233,0.05)]"
                        >
                          <Bot className="h-5 w-5 text-sky-600" />
                        </motion.div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && submitChat()}
                          className="min-h-14 flex-1 rounded-full border border-[rgba(0,0,0,0.05)] bg-[#fafafa] px-5 text-sm text-[#111111] outline-none placeholder:text-[#9ca3af] focus:border-sky-200"
                          placeholder="Try: Compare Creta vs Seltos"
                        />
                        <MagneticButton
                          onClick={submitChat}
                          className="min-h-14 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-6 text-sm font-semibold text-[#111111] shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                        >
                          Ask AI
                        </MagneticButton>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {quickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => handlePrompt(prompt)}
                            className="rounded-full border border-[rgba(0,0,0,0.06)] bg-[#fafafa] px-4 py-2 text-sm text-[#6b7280] transition hover:-translate-y-0.5 hover:bg-white"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-[#fafafa] p-4">
                        <div className="space-y-3">
                          {chatMessages.slice(-4).map((message, i) => (
                            <motion.div
                              key={`${message.role}-${i}`}
                              initial={{ opacity: 0, y: 14 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.45, ease: EASE }}
                              className={`max-w-[90%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                                message.role === "assistant"
                                  ? "bg-white text-[#111111] shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
                                  : "ml-auto bg-sky-50 text-sky-700"
                              }`}
                            >
                              {message.text}
                            </motion.div>
                          ))}

                          <AnimatePresence>
                            {chatBusy ? (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm text-[#6b7280] shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
                              >
                                <motion.span
                                  animate={{ opacity: [0.35, 1, 0.35] }}
                                  transition={{
                                    duration: 1.4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }}
                                >
                                  AI is refreshing your shortlist
                                </motion.span>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-[rgba(0,0,0,0.06)] bg-white p-5">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
                        Live shortlist
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                        Filtered results
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                        Cards fade and slide between states so the filtering
                        feels natural and controlled.
                      </p>

                      <div className="mt-5 space-y-3">
                        <AnimatePresence mode="popLayout">
                          {visibleCars.slice(0, 4).map((car) => {
                            const live = calcFinalPrice(car, dealToggles);
                            const active = selectedCarId === car.id;

                            return (
                              <motion.button
                                key={car.id}
                                layout
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -24 }}
                                whileHover={{
                                  scale: 1.015,
                                  rotateX: 2,
                                  rotateY: -2,
                                }}
                                transition={{ duration: 0.45, ease: EASE }}
                                onClick={() => setSelectedCarId(car.id)}
                                className={`w-full rounded-[22px] border p-4 text-left ${
                                  active
                                    ? "border-sky-200 bg-sky-50 shadow-[0_10px_24px_rgba(14,165,233,0.05)]"
                                    : "border-[rgba(0,0,0,0.06)] bg-[#fafafa]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-xs text-[#6b7280]">
                                      {car.make}
                                    </div>
                                    <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-[#111111]">
                                      {car.model}
                                    </div>
                                  </div>
                                  <div className="text-sm font-medium text-[#6b7280]">
                                    {formatLakh(live.finalPrice)}
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </SoftCard>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {visibleCars.map((car, idx) => {
                      const live = calcFinalPrice(car, dealToggles);
                      const selected = compareIds.includes(car.id);
                      const active = selectedCarId === car.id;

                      return (
                        <motion.article
                          key={car.id}
                          layout
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 16 }}
                          whileHover={{
                            scale: 1.02,
                            rotateX: 2.5,
                            rotateY: -2.5,
                          }}
                          transition={{
                            duration: 0.5,
                            ease: EASE,
                            delay: idx * 0.02,
                          }}
                          className={`group overflow-hidden rounded-[28px] border bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${
                            active
                              ? "border-sky-200 ring-1 ring-sky-100"
                              : "border-[rgba(0,0,0,0.06)]"
                          }`}
                        >
                          <div className="relative h-56 overflow-hidden">
                            <img
                              src={car.image}
                              alt={`${car.make} ${car.model}`}
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.22))]" />
                            <div className="absolute left-4 top-4 rounded-full bg-white/75 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#111111] backdrop-blur-xl">
                              {car.bodyType}
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs text-[#6b7280]">
                                  {car.make}
                                </div>
                                <div className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                                  {car.model}
                                </div>
                                <div className="mt-1 text-sm text-[#6b7280]">
                                  {car.variant}
                                </div>
                              </div>
                              <button
                                onClick={() => toggleCompare(car.id)}
                                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                                  selected
                                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                                    : "border border-[rgba(0,0,0,0.06)] bg-white text-[#6b7280]"
                                }`}
                              >
                                {selected ? "Added" : "Compare"}
                              </button>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3 rounded-[22px] bg-[#fafafa] p-3">
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b7280]">
                                  Live price
                                </div>
                                <div className="mt-2 text-lg font-semibold text-[#111111]">
                                  {formatLakh(live.finalPrice)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b7280]">
                                  Savings
                                </div>
                                <div className="mt-2 text-lg font-semibold text-emerald-600">
                                  {formatLakh(live.totalSavings)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-sm text-[#6b7280]">
                              <span>{car.fuel}</span>
                              <span>{car.transmission}</span>
                            </div>

                            <div className="mt-5 flex gap-2">
                              <MagneticButton
                                onClick={() => setSelectedCarId(car.id)}
                                className="flex-1 min-h-11 rounded-full border border-[rgba(0,0,0,0.06)] bg-white text-sm font-semibold text-[#111111] shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                              >
                                Make active
                              </MagneticButton>
                              <button
                                onClick={() =>
                                  setShowFitId(
                                    showFitId === car.id ? null : car.id,
                                  )
                                }
                                className="min-h-11 rounded-full border border-[rgba(0,0,0,0.06)] px-4 text-sm text-[#6b7280]"
                              >
                                Why this fits
                              </button>
                            </div>

                            <AnimatePresence>
                              {showFitId === car.id ? (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.45, ease: EASE }}
                                >
                                  <WhyItFits car={car} />
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="decision"
          className="bg-[#fafafa] px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-[1380px]">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.06)] bg-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#6b7280] backdrop-blur-xl">
                  <TrendingUp className="h-3.5 w-3.5 text-sky-500" />
                  Premium split comparison
                </div>

                <h2 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-6xl">
                  Compare like a decision engine.
                </h2>

                <p className="mt-5 max-w-xl text-base leading-7 text-[#6b7280]">
                  The comparison layer reduces overload, surfaces real
                  differences, and highlights the better deal gently instead of
                  shouting for attention.
                </p>

                <SoftCard className="mt-8 bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                        Comparison mode
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                        Show only differences
                      </div>
                    </div>

                    <button
                      onClick={() => setShowOnlyDiff((v) => !v)}
                      className={`relative h-11 w-20 rounded-full transition ${
                        showOnlyDiff ? "bg-sky-100" : "bg-[#f3f4f6]"
                      }`}
                    >
                      <motion.span
                        layout
                        className={`absolute top-1.5 h-8 w-8 rounded-full bg-white shadow-[0_6px_16px_rgba(15,23,42,0.08)] ${
                          showOnlyDiff ? "left-10" : "left-1.5"
                        }`}
                      />
                    </button>
                  </div>
                </SoftCard>
              </div>

              <CompareSplitView
                cars={compareCars}
                showOnlyDiff={showOnlyDiff}
              />
            </div>
          </div>
        </section>

        <section id="convert" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1380px]">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <SoftCard className="overflow-hidden">
                <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
                  <div className="p-6 sm:p-8">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#6b7280]">
                      Final conversion layer
                    </div>
                    <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-5xl">
                      Move toward one confident next step.
                    </h2>
                    <p className="mt-5 max-w-xl text-base leading-7 text-[#6b7280]">
                      The page closes with trust, not pressure: clear pricing,
                      visible savings, low-friction lead capture, and a stable
                      sense of control.
                    </p>

                    <div className="mt-8 space-y-4">
                      {[
                        "Price is already anchored against the market number",
                        "Deal confidence meter reduces hesitation",
                        "AI search handled discovery before asking for commitment",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 text-sm text-[#6b7280]"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="h-4 w-4" />
                          </div>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#fafafa] p-6 sm:p-8">
                    <div className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
                        Unlock best price instantly
                      </div>
                      <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
                        {formatLakh(activeDeal.finalPrice)}
                      </div>
                      <div className="mt-2 text-sm text-emerald-600">
                        {formatLakh(activeDeal.totalSavings)} unlocked across
                        active savings layers
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                          <input
                            value={mobile}
                            onChange={(e) =>
                              setMobile(
                                e.target.value.replace(/\D/g, "").slice(0, 10),
                              )
                            }
                            placeholder="Enter mobile number"
                            className="min-h-12 w-full rounded-full border border-[rgba(0,0,0,0.05)] bg-[#fafafa] pl-11 pr-4 text-sm text-[#111111] outline-none focus:border-sky-200"
                          />
                        </div>
                        <MagneticButton className="min-h-12 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-6 text-sm font-semibold text-[#111111] shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                          Get Best Deal
                        </MagneticButton>
                      </div>

                      <div className="mt-4 text-xs text-[#6b7280]">
                        Step 1 is mobile only. Advisor, city, finance, and
                        exchange can come later.
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        ["Urgency", "12 viewing"],
                        ["Competing dealers", "03"],
                        ["Close rate today", "05"],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="rounded-[22px] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
                        >
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b7280]">
                            {k}
                          </div>
                          <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#111111]">
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SoftCard>

              <div className="grid gap-5">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 4.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <SoftCard className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
                          Sticky deal narrative
                        </div>
                        <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                          The deal strip should feel alive, not loud.
                        </div>
                      </div>
                      <div className="rounded-full bg-amber-50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-amber-700">
                        Closing mode
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#6b7280]">
                      It carries the selected car, live recalculated price, and
                      urgency signal with soft motion so conversion is always
                      present without feeling aggressive.
                    </p>
                  </SoftCard>
                </motion.div>

                <SoftCard className="p-6">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
                    AI insight layer
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <MessageSquareText className="mt-1 h-5 w-5 text-sky-500" />
                    <p className="text-sm leading-7 text-[#6b7280]">
                      The “Why this fits you” layer helps each car feel
                      evaluated instead of merely displayed, supporting a
                      guided, premium product flow. [web:61][web:180]
                    </p>
                  </div>
                </SoftCard>

                <SoftCard className="p-6">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
                    Active savings stack
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      [
                        "Dealer",
                        dealToggles.dealerDiscount
                          ? selectedCar.dealerDiscount
                          : 0,
                      ],
                      [
                        "Insurance",
                        dealToggles.insuranceSavings
                          ? selectedCar.insuranceSavings
                          : 0,
                      ],
                      [
                        "Finance",
                        dealToggles.financeBenefit
                          ? selectedCar.financeBenefit
                          : 0,
                      ],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-[22px] bg-[#fafafa] p-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b7280]">
                          {k}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-[#111111]">
                          {formatLakh(v)}
                        </div>
                      </div>
                    ))}
                  </div>
                </SoftCard>
              </div>
            </div>
          </div>
        </section>
      </main>

      <motion.div
        animate={{
          y: [0, -3, 0],
        }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
        className="fixed inset-x-0 bottom-4 z-[75] px-4 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 rounded-[28px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600 shadow-[0_8px_18px_rgba(14,165,233,0.05)]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#111111]">
                {urgencyLine}
              </div>
              <div className="text-xs text-[#6b7280]">
                A cleaner offer is ready to lock.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <MagneticButton className="min-h-11 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-5 text-sm font-semibold text-[#111111]">
              View savings
            </MagneticButton>
            <MagneticButton className="min-h-11 rounded-full border border-sky-100 bg-sky-50 px-6 text-sm font-semibold text-sky-700 shadow-[0_8px_20px_rgba(14,165,233,0.05)]">
              Get Best Deal
            </MagneticButton>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-28 right-4 z-[76] w-[calc(100vw-2rem)] max-w-[380px] rounded-[28px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:right-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#111111]">
              CDrive AI
            </div>
            <div className="text-xs text-[#6b7280]">Page controller</div>
          </div>
          <div className="rounded-full bg-sky-50 p-2 text-sky-600 shadow-[0_8px_18px_rgba(14,165,233,0.05)]">
            <Bot className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickPrompts.slice(0, 3).map((prompt) => (
            <button
              key={prompt}
              onClick={() => handlePrompt(prompt)}
              className="rounded-full border border-[rgba(0,0,0,0.06)] bg-[#fafafa] px-3 py-2 text-xs text-[#6b7280]"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitChat()}
            className="min-h-11 flex-1 rounded-full border border-[rgba(0,0,0,0.05)] bg-[#fafafa] px-4 text-sm text-[#111111] outline-none focus:border-sky-200"
            placeholder="Ask for your next move"
          />
          <MagneticButton className="min-h-11 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-5 text-sm font-semibold text-[#111111]">
            <Zap className="h-4 w-4" />
          </MagneticButton>
        </div>
      </motion.div>
    </div>
  );
}
