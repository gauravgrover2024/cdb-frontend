import { Zap, Shield, TrendingUp, Users } from "lucide-react";

export const EASE = [0.22, 1, 0.36, 1];

export const ALL_CARS = [
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
    tags: ["family", "automatic", "suv"],
    isTrending: true,
    budgetRange: "above10",
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
    tags: ["sporty", "automatic", "suv"],
    isTrending: true,
    budgetRange: "above10",
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
    tags: ["sedan", "automatic", "premium"],
    isTrending: false,
    budgetRange: "above10",
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
    tags: ["budget", "automatic", "suv"],
    isTrending: true,
    budgetRange: "above10",
  },
  {
    id: "taigun-topline",
    make: "Volkswagen",
    model: "Taigun",
    variant: "Topline MT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Manual",
    price: 1890000,
    marketPrice: 1940000,
    savings: 50000,
    emi: 32600,
    image:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1600&q=80",
    tags: ["european", "suv", "popular"],
    isTrending: true,
    budgetRange: "above10",
  },
  {
    id: "punch",
    make: "Tata",
    model: "Punch",
    variant: "Creative+ iCNG",
    bodyType: "SUV",
    fuel: "CNG",
    transmission: "Manual",
    price: 860000,
    marketPrice: 910000,
    savings: 50000,
    emi: 14870,
    image:
      "https://images.unsplash.com/photo-1503376759508-0a98c7abe867?auto=format&fit=crop&w=1600&q=80",
    tags: ["budget", "cng", "suv"],
    isTrending: true,
    budgetRange: "under10",
  },
  {
    id: "baleno",
    make: "Maruti Suzuki",
    model: "Baleno",
    variant: "Alpha CVT",
    bodyType: "Hatchback",
    fuel: "Petrol",
    transmission: "Automatic",
    price: 969000,
    marketPrice: 1020000,
    savings: 51000,
    emi: 16750,
    image:
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=80",
    tags: ["budget", "hatchback", "automatic"],
    isTrending: true,
    budgetRange: "under10",
  },
  {
    id: "sonet",
    make: "Kia",
    model: "Sonet",
    variant: "GTX+ Turbo DCT",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    price: 1079000,
    marketPrice: 1130000,
    savings: 51000,
    emi: 18650,
    image:
      "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1600&q=80",
    tags: ["budget", "suv", "automatic"],
    isTrending: true,
    budgetRange: "under10",
  },
  {
    id: "majestor",
    make: "MG",
    model: "Majestor",
    variant: "Alpha",
    bodyType: "SUV",
    fuel: "Hybrid",
    transmission: "Automatic",
    price: 4325000,
    marketPrice: 4500000,
    savings: 175000,
    emi: 74800,
    image:
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1600&q=80",
    tags: ["upcoming", "suv", "premium"],
    isUpcoming: true,
    launchDate: "10 May 2026",
    budgetRange: "luxury",
  },
  {
    id: "safari-ev",
    make: "Tata",
    model: "Safari EV",
    variant: "Long Range",
    bodyType: "SUV",
    fuel: "Electric",
    transmission: "Automatic",
    price: 3200000,
    marketPrice: 3350000,
    savings: 150000,
    emi: 55300,
    image:
      "https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1600&q=80",
    tags: ["upcoming", "suv", "ev"],
    isUpcoming: true,
    launchDate: "15 May 2026",
    budgetRange: "luxury",
  },
  {
    id: "sierra-ev",
    make: "Tata",
    model: "Sierra EV",
    variant: "Dual Motor",
    bodyType: "SUV",
    fuel: "Electric",
    transmission: "Automatic",
    price: 1500000,
    marketPrice: 1575000,
    savings: 75000,
    emi: 25950,
    image:
      "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1600&q=80",
    tags: ["upcoming", "suv", "ev", "budget"],
    isUpcoming: true,
    launchDate: "19 May 2026",
    budgetRange: "above10",
  },
  {
    id: "sorento",
    make: "Kia",
    model: "Sorento",
    variant: "Premium",
    bodyType: "SUV",
    fuel: "Hybrid",
    transmission: "Automatic",
    price: 4800000,
    marketPrice: 5000000,
    savings: 200000,
    emi: 83000,
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=80",
    tags: ["upcoming", "suv", "premium"],
    isUpcoming: true,
    launchDate: "June 2026",
    budgetRange: "luxury",
  },
];

export const quickPrompts = [
  "SUV under 20L",
  "Compare Creta vs Seltos",
  "Show finance offers",
  "Show insurance offers",
  "Best family automatic",
  "Sell my car",
];

export const formatLakh = (value) => `₹ ${(value / 100000).toFixed(2)} Lakh`;
export const formatMoney = (value) => `₹ ${value.toLocaleString("en-IN")}`;

export function inferView(query) {
  const q = query.toLowerCase();
  if (q.includes("compare") || q.includes("vs")) return "compare";
  if (q.includes("finance") || q.includes("emi") || q.includes("loan"))
    return "finance";
  if (q.includes("insurance")) return "insurance";
  if (q.includes("sell")) return "sell";
  return "results";
}

export function getResults(query) {
  const q = query.toLowerCase();

  if (q.includes("compare") && q.includes("vs")) {
    const parts =
      q
        .split("compare")[1]
        ?.split("vs")
        .map((s) => s.trim()) || [];
    return ALL_CARS.filter(
      (car) =>
        !car.isUpcoming &&
        parts.some((p) => car.model.toLowerCase().includes(p)),
    ).slice(0, 3);
  }

  let result = ALL_CARS.filter((c) => !c.isUpcoming);

  if (q.includes("suv")) result = result.filter((c) => c.bodyType === "SUV");
  if (q.includes("sedan"))
    result = result.filter((c) => c.bodyType === "Sedan");
  if (q.includes("family"))
    result = result.filter(
      (c) => c.tags.includes("family") || c.model === "Creta",
    );

  const under = q.match(/under\s+(\d+)/);
  if (under) {
    const lakh = Number(under[1]) * 100000;
    result = result.filter((c) => c.price <= lakh);
  }

  return result.slice(0, 4);
}

export function wantsLead(view, results) {
  if (view === "compare" || view === "finance" || view === "insurance")
    return true;
  if (results.length && results[0].savings >= 45000) return true;
  return false;
}

export const features = [
  {
    icon: Zap,
    title: "Instant Best Prices",
    description:
      "AI-powered pricing engine gets you the lowest market prices in real-time",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Shield,
    title: "100% Verified Cars",
    description:
      "Every vehicle undergoes 200+ point quality inspection by certified experts",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: TrendingUp,
    title: "Smart Financing",
    description:
      "Get instant loan approval with interest rates as low as 7.5% APR",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Users,
    title: "Expert Advisors",
    description:
      "Personal car advisors available 24/7 to guide your purchase journey",
    color: "from-green-500 to-emerald-500",
  },
];

export const stats = [
  { value: "50K+", label: "Cars Sold" },
  { value: "₹80K", label: "Avg. Savings" },
  { value: "4.9★", label: "Customer Rating" },
  { value: "24/7", label: "Support" },
];
