import React, { useMemo, useState } from "react";
import {
  Bell,
  Calculator,
  ChevronDown,
  ChevronRight,
  FileText,
  Fuel,
  Gauge,
  Heart,
  IndianRupee,
  Mic,
  Palette,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Wallet,
  Scale,
  Check,
} from "lucide-react";

const AVATAR =
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=240&auto=format&fit=crop";

const CRETA_IMAGE = "/images/cretaimage.png";

function fireAction(label) {
  console.log("ACI Assist action:", label);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("aci-assist-click", {
        detail: { label },
      }),
    );
  }
}

function AciLogo({ mobile = false }) {
  return (
    <button
      type="button"
      className={mobile ? "aci-logo mobile" : "aci-logo"}
      onClick={() => fireAction("Home")}
    >
      <span>ACI</span>
      <strong>ASSIST</strong>
      {!mobile ? <Sparkles size={12} /> : null}
    </button>
  );
}

function CretaPhoto({ className = "", alt = "Hyundai Creta" }) {
  return (
    <img
      src={CRETA_IMAGE}
      alt={alt}
      className={`creta-photo ${className}`}
      draggable="false"
    />
  );
}

function CarVector({
  type = "suv",
  accent = "#2563eb",
  height = 120,
  label = "CAR",
}) {
  const rawId = React.useId().replace(/:/g, "");
  const bodyId = `body-${rawId}`;
  const glassId = `glass-${rawId}`;
  const plateId = `plate-${rawId}`;

  const isSedan = type === "sedan";
  const isDark = type === "dark-suv";
  const body = isSedan ? "#313846" : isDark ? "#111827" : "#334155";
  const bodyMid = isSedan ? "#505968" : isDark ? "#374151" : "#475569";
  const bodyLight = isSedan ? "#6b7280" : isDark ? "#4b5563" : "#64748b";

  return (
    <svg
      viewBox="0 0 420 190"
      height={height}
      width="100%"
      role="img"
      aria-label={label}
      className="car-vector"
    >
      <defs>
        <linearGradient id={bodyId} x1="0" x2="1">
          <stop offset="0%" stopColor={body} />
          <stop offset="52%" stopColor={bodyMid} />
          <stop offset="100%" stopColor={bodyLight} />
        </linearGradient>

        <linearGradient id={glassId} x1="0" x2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="45%" stopColor="#93a4ba" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        <linearGradient id={plateId} x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      <ellipse cx="210" cy="160" rx="140" ry="18" fill="rgba(15,23,42,0.14)" />

      {isSedan ? (
        <>
          <path
            d="M56 131 L81 99 Q100 74 139 72 L217 68 Q248 68 274 86 L317 113 Q334 123 344 134 L350 143 L54 143 Z"
            fill={`url(#${bodyId})`}
          />
          <path
            d="M132 77 L211 73 Q241 73 263 87 L287 106 L106 106 Z"
            fill={`url(#${glassId})`}
          />
          <path
            d="M125 77 L107 106 M209 74 L201 106 M263 88 L243 106"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
          />
        </>
      ) : (
        <>
          <path
            d="M48 132 L72 96 Q91 67 127 67 L224 64 Q262 64 290 86 L335 110 Q351 119 361 134 L367 143 L47 143 Z"
            fill={`url(#${bodyId})`}
          />
          <path
            d="M119 73 L226 70 Q259 70 281 87 L305 108 L91 108 Z"
            fill={`url(#${glassId})`}
          />
          <path
            d="M113 75 L92 108 M225 71 L216 108 M282 88 L257 108"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
          />
        </>
      )}

      <path
        d="M84 113 H338"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <rect x="63" y="126" width="40" height="13" rx="6.5" fill="#e5e7eb" />
      <rect x="319" y="126" width="28" height="13" rx="6.5" fill={accent} />
      <rect
        x="176"
        y="124"
        width="72"
        height="19"
        rx="6"
        fill={`url(#${plateId})`}
      />

      <text
        x="212"
        y="137"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="#0f172a"
      >
        {label}
      </text>

      <circle cx="124" cy="141" r="27" fill="#0f172a" />
      <circle cx="124" cy="141" r="14" fill="#cbd5e1" />
      <circle cx="124" cy="141" r="7" fill="#64748b" />

      <circle cx="303" cy="141" r="27" fill="#0f172a" />
      <circle cx="303" cy="141" r="14" fill="#cbd5e1" />
      <circle cx="303" cy="141" r="7" fill="#64748b" />

      <rect
        x="336"
        y="116"
        width="18"
        height="10"
        rx="5"
        fill={accent}
        opacity="0.9"
      />
      <rect x="70" y="116" width="20" height="10" rx="5" fill="#f8fafc" />
    </svg>
  );
}

function ColorOrb({ hex, name, selected = false }) {
  const safeHex = hex || "#E2E8F0";
  const isLight = useMemo(() => {
    const cleaned = safeHex.replace("#", "");
    if (cleaned.length !== 6) return true;
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 170;
  }, [safeHex]);

  return (
    <div
      className={`color-orb ${selected ? "selected" : ""} ${
        isLight ? "light" : "dark"
      }`}
      style={{
        background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.94), ${safeHex} 34%, ${safeHex} 62%, rgba(15,23,42,0.38) 140%)`,
      }}
      title={name}
    >
      <div className="color-orb-gloss" />
      {selected ? (
        <div className="color-orb-check">
          <Check size={11} strokeWidth={3} />
        </div>
      ) : null}
    </div>
  );
}

function AssistantOrb({ small = false }) {
  return (
    <div className={small ? "orb small" : "orb"}>
      {!small ? (
        <>
          <span className="orb-ring ring-one" />
          <span className="orb-ring ring-two" />
          <span className="orb-ring ring-three" />
          <span className="orb-base" />
        </>
      ) : null}

      <div className="orb-shell">
        <div className="orb-face">
          <i className="orb-eye left" />
          <i className="orb-eye right" />
        </div>
      </div>
    </div>
  );
}

function DesktopHeader() {
  return (
    <header className="desktop-header">
      <div className="desktop-header-left">
        <AciLogo />
      </div>

      <div className="desktop-header-center">
        <div className="header-search">
          <Search size={18} />
          <input placeholder="Search cars, prices, features, EMI, compare..." />
          <button type="button" onClick={() => fireAction("Command search")}>
            ⌘ K
          </button>
        </div>
      </div>

      <div className="desktop-header-right">
        <button
          type="button"
          className="icon-button"
          onClick={() => fireAction("Notifications")}
          aria-label="Notifications"
        >
          <Bell size={21} />
          <i />
        </button>

        <button
          type="button"
          className="avatar-button"
          onClick={() => fireAction("Profile")}
          aria-label="Profile"
        >
          <img src={AVATAR} alt="Profile" />
        </button>

        <button
          type="button"
          className="plain-button"
          onClick={() => fireAction("Profile menu")}
          aria-label="Profile menu"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}

function DesktopHero() {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <div className="hero-badges">
          <button
            type="button"
            className="soft-badge blue"
            onClick={() => fireAction("Selected car hub")}
          >
            <ShieldCheck size={14} />
            Selected car hub
          </button>

          <button
            type="button"
            className="soft-badge gold"
            onClick={() => fireAction("Remembered car")}
          >
            <Sparkles size={14} />
            ACI Assist remembers this car
          </button>
        </div>

        <h1>Hyundai Creta</h1>

        <button
          type="button"
          className="hero-subtitle"
          onClick={() => fireAction("Change city")}
        >
          Premium mid-size SUV · Delhi prices
          <ChevronDown size={16} />
        </button>

        <div className="hero-chips">
          {["26 variants", "Petrol / Diesel", "Manual / Automatic"].map(
            (chip) => (
              <button type="button" key={chip} onClick={() => fireAction(chip)}>
                {chip}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="hero-car-stage">
        <CretaPhoto className="hero-creta-photo" />
      </div>

      <aside className="price-card">
        <p>Starting on-road price</p>
        <strong>₹12.65L</strong>
        <span>Ex-showroom: ₹11.11L</span>

        <button type="button" onClick={() => fireAction("View all variants")}>
          View all variants
          <ChevronRight size={17} />
        </button>
      </aside>
    </section>
  );
}

function DesktopActionStrip() {
  const actions = [
    { icon: IndianRupee, label: "Price list", tone: "blue" },
    { icon: Calculator, label: "Calculate EMI", tone: "blue" },
    { icon: Scale, label: "Compare", tone: "blue" },
    { icon: Palette, label: "Colors", tone: "blue" },
    { icon: Sparkles, label: "Features", tone: "blue" },
    { icon: FileText, label: "Get quotation", tone: "gold" },
  ];

  return (
    <section className="action-strip">
      <h2>What do you want to do?</h2>

      <div>
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.label}
              className={`action-pill ${item.tone}`}
              onClick={() => fireAction(item.label)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              <ChevronRight size={14} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PanelHead({ title, sub, action = "View all" }) {
  return (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>

      <button type="button" onClick={() => fireAction(action)}>
        {action}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function AssistantPanel() {
  return (
    <section className="panel assistant-panel">
      <div className="assistant-title">
        <Sparkles size={17} />
        <div>
          <h3>ACI Assistant</h3>
          <p>Your intelligent co-pilot</p>
        </div>
      </div>

      <div className="chat-row">
        <AssistantOrb small />
        <div className="chat-bubble assistant">
          <strong>
            Hi! I’m <span>ACI Assist.</span>
          </strong>
          <br />
          How can I help you with Hyundai Creta today?
        </div>
      </div>

      <div className="chat-bubble user">Show me the top automatic variants</div>

      <div className="chat-row">
        <AssistantOrb small />
        <div className="chat-bubble assistant">
          Sure! Here are the top automatic variants of Hyundai Creta based on
          features and value.
        </div>
      </div>

      <div className="assistant-suggestions">
        {[
          "Best diesel variants",
          "Compare with Seltos",
          "EMI under ₹20 lakh",
        ].map((item) => (
          <button type="button" key={item} onClick={() => fireAction(item)}>
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

function HighlightsPanel() {
  const items = [
    { icon: Sparkles, value: "26", label: "Variants" },
    { icon: Fuel, value: "3", label: "Fuel options" },
    { icon: Scale, value: "2", label: "Transmissions" },
    { icon: Gauge, value: "18.4 km/l", label: "Mileage (ARAI)" },
    { icon: Star, value: "5★", label: "Global NCAP" },
  ];

  return (
    <section className="panel highlights-panel">
      <PanelHead
        title="Variant highlights"
        sub="Key highlights across the Creta range"
      />

      <div className="stats-grid">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              className="stat-card"
              key={item.label}
              onClick={() => fireAction(item.label)}
            >
              <Icon size={17} />
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PopularVariantsPanel() {
  const variants = [
    {
      tag: "BEST SELLER",
      tagTone: "gold",
      name: "SX (O) IVT",
      fuel: "Petrol · Automatic",
      price: "₹17.55L",
      sub: "On-road Delhi",
      meta: ["18.4 km/l", "5★ Safety"],
    },
    {
      tag: "TOP RATED",
      tagTone: "blue",
      name: "SX Tech IVT",
      fuel: "Petrol · Automatic",
      price: "₹18.98L",
      sub: "On-road Delhi",
      meta: ["18.4 km/l", "5★ Safety"],
    },
    {
      tag: "VALUE PICK",
      tagTone: "gold",
      name: "S (O) IVT",
      fuel: "Petrol · Automatic",
      price: "₹15.45L",
      sub: "On-road Delhi",
      meta: ["17.8 km/l", "5★ Safety"],
    },
  ];

  return (
    <section className="panel variants-panel">
      <PanelHead title="Popular variants" sub="Top picks by our customers" />

      <div className="variant-card-grid">
        {variants.map((variant) => (
          <article className="variant-card" key={variant.name}>
            <div className="variant-image-zone">
              <span className={`variant-badge ${variant.tagTone}`}>
                {variant.tag}
              </span>

              <button
                type="button"
                className="variant-heart"
                onClick={() => fireAction(`Save ${variant.name}`)}
                aria-label={`Save ${variant.name}`}
              >
                <Heart size={17} />
              </button>

              <CretaPhoto className="variant-creta-photo" alt={variant.name} />
            </div>

            <button
              type="button"
              className="variant-content"
              onClick={() => fireAction(variant.name)}
            >
              <h4>{variant.name}</h4>
              <p>{variant.fuel}</p>
              <strong>{variant.price}</strong>
              <small>{variant.sub}</small>
            </button>

            <div className="variant-meta">
              <button
                type="button"
                onClick={() => fireAction(`${variant.name} mileage`)}
              >
                <Gauge size={12} />
                {variant.meta[0]}
              </button>

              <button
                type="button"
                onClick={() => fireAction(`${variant.name} safety`)}
              >
                <ShieldCheck size={12} />
                {variant.meta[1]}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ColorsPanel() {
  const colors = [
    { name: "Atlas White", hex: "#F7F7F5", tag: "" },
    { name: "Abyss Black", hex: "#050912", tag: "Most chosen" },
    { name: "Titan Grey", hex: "#8E98A6", tag: "" },
    { name: "Fiery Red", hex: "#CD1E25", tag: "" },
    { name: "Starry Blue", hex: "#19338C", tag: "" },
  ];

  const [selected, setSelected] = useState(1);
  const active = colors[selected];

  return (
    <section className="panel colors-panel">
      <PanelHead title="Colors" sub="Choose your perfect shade" />

      <div className="colors-swatch-row">
        {colors.map((color, index) => (
          <button
            type="button"
            className="colors-swatch-button"
            key={color.name}
            onClick={() => {
              setSelected(index);
              fireAction(color.name);
            }}
            aria-label={color.name}
          >
            <ColorOrb
              hex={color.hex}
              name={color.name}
              selected={index === selected}
            />
          </button>
        ))}
      </div>

      <div className="selected-color-readout">
        <strong>{active.name}</strong>
        {active.tag ? <span>{active.tag}</span> : null}
      </div>
    </section>
  );
}

function ComparePanel() {
  const facts = [
    { icon: Gauge, label: "Mileage 18.4 km/l" },
    { icon: Wallet, label: "Boot Space 433 L" },
    { icon: ShieldCheck, label: "Safety 5★" },
  ];

  return (
    <section className="panel compare-panel">
      <PanelHead
        title="Compare with Verna"
        sub="See how Creta compares"
        action="View comparison"
      />

      <div className="compare-cars">
        <button type="button" onClick={() => fireAction("Creta comparison")}>
          <div>
            <CretaPhoto className="compare-creta-photo" />
          </div>
          <strong>Creta SX (O) IVT</strong>
          <b>₹17.55L</b>
          <small>On-road Delhi</small>
        </button>

        <span>VS</span>

        <button type="button" onClick={() => fireAction("Verna comparison")}>
          <div>
            <CarVector
              type="sedan"
              accent="#2563eb"
              height={74}
              label="VERNA"
            />
          </div>
          <strong>Verna SX IVT</strong>
          <b>₹16.70L</b>
          <small>On-road Delhi</small>
        </button>
      </div>

      <div className="compare-facts">
        {facts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.label}
              onClick={() => fireAction(item.label)}
            >
              <Icon size={13} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PremiumComposer({ mobile = false }) {
  return (
    <section className={mobile ? "composer-dock mobile" : "composer-dock"}>
      <div className="composer">
        <button
          type="button"
          className="composer-spark"
          onClick={() => fireAction("Open assistant")}
          aria-label="Open assistant"
        >
          <Sparkles size={mobile ? 20 : 21} />
        </button>

        <input
          placeholder={
            mobile
              ? "Ask ACI Assist anything..."
              : "Type Creta, Verna price, EMI, compare, quote..."
          }
        />

        <button
          type="button"
          className="composer-mic"
          onClick={() => fireAction("Voice input")}
          aria-label="Voice input"
        >
          <Mic size={mobile ? 22 : 20} />
        </button>

        <button
          type="button"
          className="composer-send"
          onClick={() => fireAction("Send")}
          aria-label="Send"
        >
          <SendHorizontal size={mobile ? 22 : 22} />
        </button>
      </div>

      {!mobile ? (
        <p>
          ACI Assist can make mistakes. Please verify important information.
        </p>
      ) : null}
    </section>
  );
}

function DesktopPage() {
  return (
    <>
      <DesktopHeader />

      <main className="desktop-page">
        <DesktopHero />
        <DesktopActionStrip />

        <section className="desktop-grid">
          <AssistantPanel />

          <div className="column">
            <HighlightsPanel />
            <PopularVariantsPanel />
          </div>

          <div className="column">
            <ColorsPanel />
            <ComparePanel />
          </div>
        </section>

        <PremiumComposer />
      </main>
    </>
  );
}

function MobileHeader() {
  return (
    <header className="mobile-header">
      <AciLogo mobile />

      <div>
        <button
          type="button"
          className="mobile-bell"
          onClick={() => fireAction("Notifications")}
          aria-label="Notifications"
        >
          <Bell size={26} />
          <i />
        </button>

        <button
          type="button"
          className="mobile-avatar"
          onClick={() => fireAction("Profile")}
          aria-label="Profile"
        >
          <img src={AVATAR} alt="Profile" />
        </button>
      </div>
    </header>
  );
}

function MobileHero() {
  return (
    <section className="mobile-hero">
      <div className="mobile-orb">
        <AssistantOrb />
      </div>

      <div className="mobile-hero-copy">
        <p>ACI ASSIST</p>
        <h1>Your car buying co-pilot</h1>
        <h2>
          Ask one question and get a clear, confident answer to find your
          perfect new car.
        </h2>

        <button type="button" onClick={() => fireAction("Start with budget")}>
          Start with your budget
          <ChevronRight size={26} />
        </button>

        <small>
          <Sparkles size={16} />
          Trusted by 2M+ car buyers
        </small>
      </div>
    </section>
  );
}

function MobileShortcuts() {
  const items = [
    { icon: Wallet, a: "Find car", b: "by budget" },
    { icon: Scale, a: "Compare", b: "cars" },
    { icon: Tag, a: "Check", b: "price" },
  ];

  return (
    <div className="mobile-shortcuts">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            type="button"
            key={item.a}
            onClick={() => fireAction(`${item.a} ${item.b}`)}
          >
            <Icon size={30} />
            <span>
              {item.a}
              <br />
              {item.b}
            </span>
            <i>
              <ChevronRight size={20} />
            </i>
          </button>
        );
      })}
    </div>
  );
}

function MobilePopularCars() {
  const cars = [
    {
      tag: "BEST SELLER",
      name: "Hyundai Verna",
      variant: "SX (O) IVT",
      price: "₹11.07L – ₹17.55L",
      score: "9.3/10",
      type: "sedan",
      blue: false,
      label: "VERNA",
    },
    {
      tag: "TOP RATED",
      name: "Tata Safari",
      variant: "Accomplished+ 6S",
      price: "₹16.19L – ₹27.34L",
      score: "8.9/10",
      type: "dark-suv",
      blue: true,
      label: "SAFARI",
    },
  ];

  return (
    <>
      <div className="mobile-section-head">
        <h3>Popular right now</h3>
        <button type="button" onClick={() => fireAction("View all popular")}>
          View all
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mobile-cars">
        {cars.map((car) => (
          <article className="mobile-car-card" key={car.name}>
            <span className={car.blue ? "mobile-tag blue" : "mobile-tag"}>
              {car.tag}
            </span>

            <button
              type="button"
              className="mobile-heart"
              onClick={() => fireAction(`Save ${car.name}`)}
              aria-label={`Save ${car.name}`}
            >
              <Heart size={22} />
            </button>

            <button
              type="button"
              className="mobile-car-body"
              onClick={() => fireAction(car.name)}
            >
              <div>
                <CarVector
                  type={car.type}
                  accent="#2563eb"
                  height={112}
                  label={car.label}
                />
              </div>

              <h4>{car.name}</h4>
              <p>{car.variant}</p>
              <b />
              <strong>{car.price}</strong>
              <em>{car.score}</em>
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function MobileSelectedCar() {
  return (
    <button
      type="button"
      className="mobile-selected"
      onClick={() => fireAction("Selected Hyundai Creta")}
    >
      <div className="mobile-selected-car-thumb">
        <CretaPhoto className="selected-creta-photo" />
      </div>

      <span>
        <ShieldCheck size={14} />
        Selected car
      </span>

      <strong>Hyundai Creta</strong>

      <em>
        <Sparkles size={14} />
        ACI Assist remembers this car
      </em>

      <ChevronRight size={20} />
    </button>
  );
}

function MobilePage() {
  return (
    <main className="mobile-page">
      <MobileHeader />
      <MobileHero />
      <MobileShortcuts />
      <MobilePopularCars />
      <MobileSelectedCar />
      <PremiumComposer mobile />
    </main>
  );
}

export default function AciAssistReplacement() {
  return (
    <div className="aci-root">
      <style>{`
        :root {
          --blue: #2563eb;
          --blue-dark: #1d4ed8;
          --ink: #0f172a;
          --text: #334155;
          --muted: #64748b;
          --line: #dbe3ef;
          --card-shadow: 0 18px 50px -40px rgba(15, 23, 42, 0.42);
          --surface: rgba(255,255,255,0.94);
        }

        html,
        body,
        #root {
          margin: 0;
          min-height: 100%;
          overflow-x: hidden;
        }

        * {
          box-sizing: border-box;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        button:active {
          transform: translateY(1px);
        }

        .aci-root {
          min-height: 100vh;
          color: var(--ink);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background:
            radial-gradient(circle at 86% -6%, rgba(37,99,235,0.08), transparent 28%),
            linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          -webkit-font-smoothing: antialiased;
        }

        .desktop-header,
        .desktop-page {
          width: min(100%, 1510px);
          margin-inline: auto;
        }

        .desktop-header {
          position: sticky;
          top: 0;
          z-index: 60;
          height: 82px;
          padding: 14px 40px 8px;
          display: grid;
          grid-template-columns: minmax(220px, 1fr) minmax(520px, 640px) minmax(220px, 1fr);
          align-items: center;
          background: linear-gradient(
            180deg,
            rgba(255,255,255,0.96) 0%,
            rgba(255,255,255,0.90) 100%
          );
          backdrop-filter: blur(18px);
        }

        .desktop-header-left {
          display: flex;
          justify-content: flex-start;
        }

        .desktop-header-center {
          display: flex;
          justify-content: center;
        }

        .desktop-header-right {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 13px;
        }

        .aci-logo {
          width: max-content;
          padding: 0;
          border: 0;
          background: transparent;
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: var(--ink);
        }

        .aci-logo span {
          color: var(--blue);
          font-size: 34px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -4px;
          transform: skewX(-9deg);
        }

        .aci-logo strong {
          font-size: 15px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 6px;
        }

        .aci-logo svg {
          color: #c68a2a;
          fill: currentColor;
        }

        .header-search,
        .hero-card,
        .action-strip,
        .panel,
        .composer,
        .mobile-hero,
        .mobile-shortcuts button,
        .mobile-car-card,
        .mobile-selected {
          border: 1px solid var(--line);
          background: var(--surface);
          box-shadow: var(--card-shadow), inset 0 1px 0 rgba(255,255,255,0.96);
          backdrop-filter: blur(18px);
        }

        .header-search {
          width: 100%;
          height: 56px;
          padding: 0 12px 0 20px;
          border-radius: 20px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 14px;
        }

        .header-search svg {
          color: #5f6b7c;
        }

        .header-search input {
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1e293b;
          font-size: 14px;
          font-weight: 500;
        }

        .header-search input::placeholder {
          color: #7b8799;
        }

        .header-search button {
          height: 31px;
          min-width: 46px;
          border-radius: 11px;
          border: 1px solid #d8e0eb;
          background: #fbfcff;
          color: #6b7280;
          font-size: 12px;
          font-weight: 700;
        }

        .icon-button,
        .plain-button {
          width: 36px;
          height: 36px;
          border: 0;
          background: transparent;
          color: #475569;
          display: grid;
          place-items: center;
          position: relative;
        }

        .icon-button i,
        .mobile-bell i {
          position: absolute;
          top: 4px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--blue);
          border: 2px solid #fff;
        }

        .avatar-button,
        .mobile-avatar {
          border: 0;
          border-radius: 999px;
          padding: 3px;
          background: #fff;
          box-shadow:
            0 0 0 1px #dbe5f2,
            0 10px 24px -14px rgba(37,99,235,0.45);
        }

        .avatar-button {
          width: 48px;
          height: 48px;
        }

        .avatar-button img,
        .mobile-avatar img {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: inherit;
          object-fit: cover;
        }

        .desktop-page {
          padding: 10px 40px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .hero-card {
          min-height: 286px;
          overflow: hidden;
          border-radius: 28px;
          padding: 34px 42px;
          display: grid;
          grid-template-columns: minmax(440px, 1fr) minmax(360px, 450px) 250px;
          align-items: center;
          gap: 20px;
          background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(242,247,255,0.96));
        }

        .hero-copy h1 {
          margin: 0;
          color: #080d25;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(60px, 5.2vw, 84px);
          line-height: 0.90;
          letter-spacing: -0.07em;
          font-weight: 700;
        }

        .hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 24px;
        }

        .soft-badge {
          height: 32px;
          padding: 0 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
        }

        .soft-badge.blue {
          border: 1px solid rgba(37,99,235,0.20);
          background: #f5f8ff;
          color: var(--blue);
        }

        .soft-badge.gold {
          border: 1px solid rgba(183,121,31,0.20);
          background: #fff7ea;
          color: #b7791f;
        }

        .hero-subtitle {
          margin-top: 20px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #465063;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
        }

        .hero-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .hero-chips button {
          height: 38px;
          padding: 0 17px;
          border-radius: 14px;
          border: 1px solid #dbe3ef;
          background: rgba(255,255,255,0.84);
          color: #1e293b;
          font-size: 13px;
          font-weight: 650;
        }

        .hero-car-stage {
          display: grid;
          place-items: center;
          min-height: 220px;
        }

        .creta-photo {
          display: block;
          object-fit: contain;
          object-position: center;
          user-select: none;
          pointer-events: none;
        }

        .hero-creta-photo {
          width: min(455px, 100%);
          height: 238px;
          filter: drop-shadow(0 18px 16px rgba(15,23,42,0.14));
        }

        .price-card {
          padding: 24px 22px;
          border-radius: 24px;
          border: 1px solid #dfe7f2;
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(244,248,255,0.95));
          box-shadow: 0 18px 44px -34px rgba(15,23,42,0.28);
        }

        .price-card p {
          margin: 0;
          color: #667085;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 700;
        }

        .price-card strong {
          display: block;
          margin-top: 11px;
          color: #07102b;
          font-size: 36px;
          line-height: 1;
          letter-spacing: -0.05em;
          font-weight: 800;
        }

        .price-card span {
          display: block;
          margin-top: 12px;
          color: #667085;
          font-size: 14px;
          font-weight: 600;
        }

        .price-card button {
          width: 100%;
          height: 47px;
          margin-top: 20px;
          border: 0;
          border-radius: 999px;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--blue-dark));
          box-shadow: 0 18px 36px -20px rgba(37,99,235,0.48);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
        }

        .action-strip {
          min-height: 76px;
          border-radius: 25px;
          padding: 16px 28px;
          display: grid;
          grid-template-columns: 290px 1fr;
          align-items: center;
          gap: 18px;
          background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(245,249,255,0.94));
        }

        .action-strip h2 {
          margin: 0;
          color: #0f172a;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 21px;
          line-height: 1.08;
          letter-spacing: -0.04em;
          font-weight: 600;
        }

        .panel-head h3,
        .assistant-title h3,
        .mobile-section-head h3 {
          font-family: Georgia, "Times New Roman", serif;
        }

        .action-strip > div {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
        }

        .action-pill {
          height: 42px;
          min-width: 118px;
          padding: 0 15px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 650;
        }

        .action-pill.blue {
          border: 1px solid rgba(37,99,235,0.18);
          background: rgba(255,255,255,0.84);
          color: var(--blue);
        }

        .action-pill.gold {
          border: 1px solid rgba(183,121,31,0.24);
          background: #fff7ea;
          color: #b7791f;
        }

        .desktop-grid {
          display: grid;
          grid-template-columns: minmax(340px, 0.94fr) minmax(470px, 1.22fr) minmax(350px, 0.92fr);
          gap: 14px;
          align-items: stretch;
        }

        .column {
          min-width: 0;
          display: grid;
          grid-template-rows: 218px 384px;
          gap: 14px;
        }

        .panel {
          border-radius: 24px;
          padding: 18px;
          min-width: 0;
          overflow: hidden;
        }

        .assistant-panel {
          min-height: 616px;
          background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(246,250,255,0.95));
        }

        .highlights-panel,
        .colors-panel {
          height: 218px;
        }

        .variants-panel,
        .compare-panel {
          height: 384px;
        }

        .assistant-title {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 24px;
        }

        .assistant-title svg {
          color: #c68a2a;
          fill: currentColor;
        }

        .assistant-title h3,
        .panel-head h3 {
          margin: 0;
          color: #10172f;
          font-size: 19px;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 600;
        }

        .assistant-title p,
        .panel-head p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
        }

        .panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .panel-head button {
          border: 0;
          background: transparent;
          color: var(--blue);
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
        }

        .chat-row {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-bottom: 14px;
        }

        .chat-bubble {
          border: 1px solid #e3e9f2;
          box-shadow: 0 16px 36px -34px rgba(15,23,42,0.28);
          font-size: 12px;
          line-height: 1.55;
          font-weight: 500;
          padding: 14px 16px;
        }

        .chat-bubble.assistant {
          max-width: 300px;
          border-radius: 20px;
          background: rgba(255,255,255,0.94);
        }

        .chat-bubble.assistant span {
          color: var(--blue);
        }

        .chat-bubble.user {
          max-width: 292px;
          margin: 0 16px 14px auto;
          border-radius: 20px;
          color: #1e40af;
          background: #eef5ff;
          font-weight: 500;
        }

        .assistant-suggestions {
          margin-top: 20px;
          display: flex;
          flex-wrap: nowrap;
          gap: 6px;
          overflow: hidden;
        }

        .assistant-suggestions button {
          height: 30px;
          flex: 1 1 0;
          min-width: 0;
          padding: 0 9px;
          border-radius: 999px;
          border: 1px solid #dce7f7;
          background: rgba(255,255,255,0.88);
          color: #244a91;
          font-size: 9.5px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .stats-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }

        .stat-card {
          min-height: 98px;
          border-radius: 17px;
          border: 1px solid #e3e9f2;
          background: rgba(255,255,255,0.88);
          color: #c47d18;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 6px;
        }

        .stat-card strong {
          color: #0f172a;
          font-size: 15px;
          line-height: 1;
          font-weight: 700;
        }

        .stat-card span {
          color: #475569;
          font-size: 9.5px;
          line-height: 1.15;
          font-weight: 600;
        }

        .variant-card-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .variant-card {
          min-width: 0;
          border-radius: 22px;
          border: 1px solid #dfe7f2;
          background: #fff;
          box-shadow: 0 16px 40px -38px rgba(15,23,42,0.34);
          overflow: hidden;
        }

        .variant-image-zone {
          position: relative;
          height: 124px;
          margin: 10px 10px 0;
          border-radius: 17px;
          overflow: hidden;
          display: grid;
          place-items: end center;
          background: linear-gradient(135deg, #ffffff 0%, #eef4fb 100%);
        }

        .variant-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 3;
          padding: 5px 8px;
          border-radius: 9px;
          font-size: 8px;
          line-height: 1;
          font-weight: 800;
        }

        .variant-badge.gold {
          background: #fff0d6;
          color: #9b620b;
        }

        .variant-badge.blue {
          background: #dbeafe;
          color: var(--blue);
        }

        .variant-heart {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 4;
          width: 31px;
          height: 31px;
          border-radius: 999px;
          border: 1px solid #d9e1ec;
          background: rgba(255,255,255,0.94);
          color: #586579;
          display: grid;
          place-items: center;
        }

        .variant-creta-photo {
          width: 118%;
          height: 94px;
          object-position: center bottom;
          filter: drop-shadow(0 12px 10px rgba(15,23,42,0.10));
        }

        .variant-content {
          width: 100%;
          padding: 12px 14px 8px;
          border: 0;
          background: transparent;
          text-align: left;
        }

        .variant-content h4 {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          line-height: 1.12;
          font-weight: 700;
        }

        .variant-content p {
          margin: 5px 0 10px;
          color: #64748b;
          font-size: 11px;
          font-weight: 500;
        }

        .variant-content strong {
          display: block;
          color: #0f172a;
          font-size: 13px;
          line-height: 1;
          font-weight: 700;
        }

        .variant-content small {
          display: block;
          margin-top: 4px;
          color: #7c8aa0;
          font-size: 9.5px;
          font-weight: 500;
        }

        .variant-meta {
          padding: 0 14px 13px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .variant-meta button {
          border: 0;
          background: transparent;
          padding: 0;
          color: #475569;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          font-weight: 600;
          white-space: nowrap;
        }

        .colors-swatch-row {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          justify-content: space-between;
        }

        .colors-swatch-button {
          border: 0;
          padding: 0;
          background: transparent;
        }

        .color-orb {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 999px;
          flex-shrink: 0;
          box-shadow:
            inset 0 8px 16px rgba(255,255,255,0.34),
            inset 0 -12px 20px rgba(15,23,42,0.22),
            0 14px 28px -20px rgba(15,23,42,0.45);
        }

        .color-orb.light {
          border: 1px solid #dbe3ef;
        }

        .color-orb.dark {
          border: 1px solid rgba(255,255,255,0.5);
        }

        .color-orb-gloss {
          position: absolute;
          left: 22%;
          top: 18%;
          width: 24%;
          height: 24%;
          border-radius: 999px;
          background: rgba(255,255,255,0.70);
          filter: blur(2px);
        }

        .color-orb-check {
          position: absolute;
          right: -2px;
          top: -2px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #2563eb;
          color: white;
          display: grid;
          place-items: center;
          box-shadow: 0 6px 16px rgba(37,99,235,0.35);
          border: 2px solid white;
        }

        .selected-color-readout {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .selected-color-readout strong {
          color: #1e293b;
          font-size: 13px;
          font-weight: 700;
        }

        .selected-color-readout span {
          display: inline-flex;
          padding: 4px 8px;
          border-radius: 999px;
          background: #edf4ff;
          color: var(--blue);
          font-size: 9px;
          font-weight: 700;
        }

        .compare-cars {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 38px 1fr;
          gap: 10px;
          align-items: center;
        }

        .compare-cars > button {
          min-width: 0;
          padding: 11px;
          border-radius: 18px;
          border: 1px solid #e1e8f2;
          background: #fff;
          text-align: left;
        }

        .compare-cars > button > div {
          height: 86px;
          border-radius: 14px;
          background: linear-gradient(135deg, #ffffff 0%, #f5f8fc 100%);
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .compare-creta-photo {
          width: 110%;
          height: 74px;
          object-position: center bottom;
          filter: drop-shadow(0 10px 8px rgba(15,23,42,0.10));
        }

        .compare-cars strong,
        .compare-cars b,
        .compare-cars small {
          display: block;
        }

        .compare-cars strong {
          margin-top: 8px;
          color: #1d4ed8;
          font-size: 11.5px;
          line-height: 1.15;
          font-weight: 700;
        }

        .compare-cars b {
          margin-top: 4px;
          color: #0f172a;
          font-size: 11.5px;
          font-weight: 700;
        }

        .compare-cars small {
          margin-top: 2px;
          color: #7c8aa0;
          font-size: 9px;
          font-weight: 500;
        }

        .compare-cars > span {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid #e1e8f2;
          background: #fff;
          color: #64748b;
          display: grid;
          place-items: center;
          font-size: 10px;
          font-weight: 700;
        }

        .compare-facts {
          margin-top: 11px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .compare-facts button {
          min-height: 40px;
          padding: 6px 7px;
          border-radius: 13px;
          border: 1px solid #e1e8f2;
          background: #fff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 9.5px;
          line-height: 1.2;
          font-weight: 600;
          text-align: center;
        }

        .compare-facts button svg {
          color: var(--blue);
          flex: 0 0 auto;
        }

        .composer-dock {
          position: sticky;
          bottom: 0;
          z-index: 50;
          padding: 12px 0 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(
            180deg,
            rgba(248,251,255,0) 0%,
            rgba(248,251,255,0.88) 38%,
            rgba(248,251,255,0.98) 100%
          );
        }

        .composer {
          width: min(980px, 74vw);
          min-height: 62px;
          padding: 6px 8px 6px 10px;
          border-radius: 30px;
          display: grid;
          grid-template-columns: 48px 1fr 36px 54px;
          gap: 10px;
          align-items: center;
          background: rgba(255,255,255,0.97);
          border-color: #cbd5e1;
          box-shadow:
            0 22px 70px -48px rgba(15,23,42,0.45),
            inset 0 1px 0 rgba(255,255,255,1);
        }

        .composer-spark {
          width: 48px;
          height: 48px;
          border: 1px solid #e0e7f1;
          border-radius: 19px;
          background: radial-gradient(circle at 35% 28%, #fff 0%, #eef5ff 100%);
          color: var(--blue);
          display: grid;
          place-items: center;
          box-shadow: 0 12px 24px -20px rgba(37,99,235,0.55);
        }

        .composer-spark svg {
          fill: currentColor;
        }

        .composer input {
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1e293b;
          font-size: 14px;
          font-weight: 500;
        }

        .composer input::placeholder {
          color: #94a3b8;
        }

        .composer-mic {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 14px;
          background: transparent;
          color: #526075;
          display: grid;
          place-items: center;
        }

        .composer-send {
          width: 54px;
          height: 48px;
          border: 0;
          border-radius: 18px;
          color: #fff;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          display: grid;
          place-items: center;
          box-shadow:
            0 18px 36px -22px rgba(37,99,235,0.58),
            inset 0 1px 0 rgba(255,255,255,0.24);
        }

        .composer-dock p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 500;
        }

        .orb {
          position: relative;
          width: 188px;
          height: 188px;
          display: grid;
          place-items: center;
        }

        .orb.small {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
        }

        .orb-shell {
          position: relative;
          z-index: 3;
          width: 128px;
          height: 128px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 28% 22%, rgba(255,255,255,0.98) 0 16%, rgba(239,246,255,0.94) 32%, rgba(148,178,235,0.62) 58%, rgba(25,93,210,0.2) 78%, rgba(255,255,255,0.72) 100%);
          box-shadow:
            inset 10px 14px 18px rgba(255,255,255,0.92),
            inset -12px -16px 24px rgba(24,84,185,0.25),
            0 18px 28px rgba(37,99,235,0.18);
        }

        .orb.small .orb-shell {
          width: 32px;
          height: 32px;
        }

        .orb-face {
          position: absolute;
          left: 29px;
          top: 30px;
          width: 70px;
          height: 70px;
          border-radius: 999px;
          background: radial-gradient(circle at 50% 35%, #142b60 0%, #050912 68%);
          box-shadow:
            inset 0 0 0 2px rgba(96,165,250,0.38),
            0 0 24px rgba(37,99,235,0.4);
        }

        .orb.small .orb-face {
          left: 7px;
          top: 7px;
          width: 18px;
          height: 18px;
        }

        .orb-eye {
          position: absolute;
          top: 30px;
          width: 16px;
          height: 10px;
          border-radius: 999px 999px 0 0;
          border-top: 5px solid #67c8ff;
          filter: drop-shadow(0 0 6px #3b82f6);
        }

        .orb-eye.left {
          left: 15px;
        }

        .orb-eye.right {
          right: 15px;
        }

        .orb.small .orb-eye {
          top: 7px;
          width: 5px;
          height: 3px;
          border-top-width: 2px;
        }

        .orb.small .orb-eye.left {
          left: 4px;
        }

        .orb.small .orb-eye.right {
          right: 4px;
        }

        .orb-ring {
          position: absolute;
          left: 23px;
          top: 52px;
          width: 140px;
          height: 72px;
          border: 1.5px solid rgba(76,124,210,0.22);
          border-radius: 50%;
          z-index: 1;
        }

        .ring-one {
          transform: rotate(-26deg);
        }

        .ring-two {
          transform: rotate(28deg);
          opacity: 0.48;
        }

        .ring-three {
          transform: rotate(82deg) scale(0.9);
          opacity: 0.24;
        }

        .orb-base {
          position: absolute;
          z-index: 2;
          bottom: 10px;
          width: 144px;
          height: 25px;
          border-radius: 50%;
          background:
            radial-gradient(ellipse at center, rgba(37,99,235,0.28), transparent 56%),
            linear-gradient(180deg, rgba(255,255,255,0.95), rgba(214,223,238,0.86));
          box-shadow:
            0 10px 14px rgba(15,23,42,0.10),
            inset 0 2px 0 rgba(255,255,255,0.8);
        }

        .mobile-page {
          display: none;
        }

        @media (max-width: 1240px) and (min-width: 821px) {
          .desktop-header {
            grid-template-columns: minmax(180px, 1fr) minmax(360px, 520px) minmax(180px, 1fr);
            padding-inline: 24px;
          }

          .desktop-page {
            padding-inline: 24px;
          }

          .hero-card {
            grid-template-columns: minmax(340px, 1fr) minmax(280px, 360px);
          }

          .price-card {
            display: none;
          }

          .action-strip {
            grid-template-columns: 1fr;
          }

          .action-strip h2 {
            display: none;
          }

          .action-strip > div {
            justify-content: center;
          }

          .desktop-grid {
            grid-template-columns: 1fr 1fr;
          }

          .assistant-panel {
            display: none;
          }

          .column {
            grid-template-rows: auto auto;
          }

          .highlights-panel,
          .colors-panel,
          .variants-panel,
          .compare-panel {
            height: auto;
          }

          .composer {
            width: min(900px, 88vw);
          }
        }

        @media (max-width: 820px) {
          .desktop-header,
          .desktop-page {
            display: none;
          }

          .aci-root {
            background:
              radial-gradient(circle at 50% 100%, rgba(37,99,235,0.12), transparent 25%),
              linear-gradient(180deg, #fff 0%, #fbfcff 54%, #f8fbff 100%);
          }

          .mobile-page {
            width: 100%;
            max-width: 468px;
            min-height: 100vh;
            margin: 0 auto;
            padding: 22px 14px 18px;
            display: flex;
            flex-direction: column;
            gap: 13px;
          }

          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 4px;
          }

          .aci-logo.mobile {
            gap: 13px;
          }

          .aci-logo.mobile span {
            font-size: 31px;
          }

          .aci-logo.mobile strong {
            font-size: 15px;
            letter-spacing: 7px;
          }

          .mobile-header > div {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .mobile-bell {
            position: relative;
            width: 34px;
            height: 34px;
            border: 0;
            background: transparent;
            display: grid;
            place-items: center;
            color: #596174;
          }

          .mobile-avatar {
            width: 46px;
            height: 46px;
          }

          .mobile-hero {
            width: 100%;
            min-height: 268px;
            position: relative;
            overflow: hidden;
            border-radius: 25px;
            display: grid;
            grid-template-columns: 46% 54%;
            align-items: center;
            background:
              radial-gradient(circle at 18% 40%, rgba(37,99,235,0.13), transparent 35%),
              linear-gradient(135deg, #edf4ff 0%, #ffffff 54%, #fbfdff 100%);
          }

          .mobile-orb {
            position: relative;
            z-index: 1;
            width: 192px;
            height: 192px;
            margin-left: -8px;
            display: grid;
            place-items: center;
          }

          .mobile-hero-copy {
            position: relative;
            z-index: 2;
            padding: 16px 18px 14px 0;
          }

          .mobile-hero-copy p {
            margin: 0 0 7px;
            color: var(--blue);
            font-size: 9px;
            letter-spacing: 4px;
            font-weight: 700;
          }

          .mobile-hero-copy h1 {
            margin: 0;
            color: #07102b;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 28px;
            line-height: 0.96;
            letter-spacing: -0.055em;
            font-weight: 700;
          }

          .mobile-hero-copy h2 {
            margin: 12px 0 14px;
            color: #5d6678;
            font-size: 12px;
            line-height: 1.32;
            font-weight: 500;
          }

          .mobile-hero-copy > button {
            width: 100%;
            height: 44px;
            border: 0;
            border-radius: 999px;
            background: linear-gradient(135deg, var(--blue), var(--blue-dark));
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px 0 20px;
            font-size: 13px;
            font-weight: 650;
            box-shadow: 0 18px 38px -20px rgba(37,99,235,0.62);
          }

          .mobile-hero-copy small {
            margin-top: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #738095;
            font-size: 10.4px;
            white-space: nowrap;
          }

          .mobile-hero-copy small svg,
          .mobile-selected em svg {
            color: #c68a2a;
            fill: currentColor;
          }

          .mobile-shortcuts {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .mobile-shortcuts button {
            min-height: 82px;
            width: 100%;
            min-width: 0;
            border-radius: 20px;
            padding: 12px 10px 12px 12px;
            display: grid;
            grid-template-columns: 31px minmax(0, 1fr) 24px;
            align-items: center;
            gap: 8px;
            color: var(--ink);
            text-align: left;
            overflow: hidden;
          }

          .mobile-shortcuts button > svg {
            color: var(--blue);
            flex-shrink: 0;
          }

          .mobile-shortcuts span {
            min-width: 0;
            font-size: 10.8px;
            line-height: 1.15;
            font-weight: 700;
          }

          .mobile-shortcuts i {
            width: 24px;
            height: 24px;
            border-radius: 999px;
            background: #f2f4f8;
            color: #697285;
            display: grid;
            place-items: center;
            font-style: normal;
            flex-shrink: 0;
          }

          .mobile-section-head {
            margin-top: 8px;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            padding: 0 6px;
          }

          .mobile-section-head h3 {
            margin: 0;
            color: #0b1028;
            font-size: 20px;
            line-height: 1;
            letter-spacing: -0.045em;
            font-weight: 600;
          }

          .mobile-section-head button {
            border: 0;
            background: transparent;
            color: var(--blue);
            display: inline-flex;
            align-items: center;
            gap: 3px;
            font-size: 12px;
            font-weight: 650;
          }

          .mobile-cars {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .mobile-car-card {
            min-height: 306px;
            width: 100%;
            position: relative;
            overflow: hidden;
            border-radius: 23px;
          }

          .mobile-tag {
            position: absolute;
            z-index: 5;
            top: 12px;
            left: 13px;
            padding: 4px 8px;
            border-radius: 9px;
            color: #a46500;
            background: #ffedc9;
            font-size: 8px;
            font-weight: 700;
          }

          .mobile-tag.blue {
            color: var(--blue);
            background: #dbeafe;
          }

          .mobile-heart {
            position: absolute;
            z-index: 6;
            top: 9px;
            right: 9px;
            width: 35px;
            height: 35px;
            border-radius: 999px;
            border: 1px solid #dfe5ef;
            background: rgba(255,255,255,0.94);
            color: #596174;
            display: grid;
            place-items: center;
          }

          .mobile-car-body {
            width: 100%;
            height: 100%;
            padding: 10px 13px 14px;
            border: 0;
            background: transparent;
            text-align: left;
            position: relative;
          }

          .mobile-car-body > div {
            height: 154px;
            margin: -2px -8px 10px;
            border-radius: 14px;
            overflow: hidden;
            display: grid;
            place-items: end center;
            background:
              radial-gradient(circle at 50% 55%, rgba(37,99,235,0.09), transparent 56%),
              linear-gradient(135deg, #fff, #eef3fa);
          }

          .mobile-car-body .car-vector {
            width: 118%;
          }

          .mobile-car-body h4 {
            margin: 0 0 3px;
            color: #0b1028;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 17px;
            line-height: 1.08;
            letter-spacing: -0.04em;
            font-weight: 700;
          }

          .mobile-car-body p {
            margin: 0;
            color: var(--blue);
            font-size: 10.8px;
            font-weight: 550;
          }

          .mobile-car-body b {
            width: 26px;
            height: 1px;
            display: block;
            margin: 6px 0 5px;
            background: #bcc5d3;
          }

          .mobile-car-body strong {
            display: block;
            color: #0f172a;
            font-size: 11.8px;
            line-height: 1;
            font-weight: 700;
          }

          .mobile-car-body em {
            position: absolute;
            right: 12px;
            bottom: 14px;
            padding: 5px 9px;
            border-radius: 999px;
            background: #dff7ed;
            color: #087249;
            font-size: 10px;
            line-height: 1;
            font-style: normal;
            font-weight: 700;
          }

          .mobile-selected {
            width: 100%;
            min-height: 62px;
            border-radius: 19px;
            padding: 9px 12px;
            display: grid;
            grid-template-columns: 56px auto auto 1fr auto;
            align-items: center;
            gap: 8px;
            color: inherit;
            text-align: left;
          }

          .mobile-selected-car-thumb {
            width: 52px;
            height: 34px;
            display: grid;
            place-items: center;
            overflow: hidden;
          }

          .selected-creta-photo {
            width: 54px;
            height: 34px;
            object-fit: contain;
            filter: drop-shadow(0 6px 6px rgba(15, 23, 42, 0.10));
          }

          .mobile-selected span {
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--blue);
            font-size: 8.4px;
            font-weight: 650;
            white-space: nowrap;
          }

          .mobile-selected strong {
            color: #11172c;
            font-size: 10.4px;
            font-weight: 700;
            white-space: nowrap;
          }

          .mobile-selected em {
            display: flex;
            align-items: center;
            justify-self: end;
            gap: 6px;
            color: #a76808;
            font-size: 8px;
            font-style: normal;
            font-weight: 650;
            white-space: nowrap;
          }

          .composer-dock.mobile {
            width: 100%;
            padding: 4px 0 0;
            background: transparent;
          }

          .mobile .composer {
            width: 100%;
            min-height: 58px;
            grid-template-columns: 42px 1fr 30px 48px;
            border-radius: 28px;
            padding: 5px 6px 5px 8px;
            gap: 8px;
            border-color: rgba(37,99,235,0.18);
            box-shadow:
              0 0 0 5px rgba(37,99,235,0.04),
              0 20px 44px -34px rgba(37,99,235,0.45),
              inset 0 1px 0 rgba(255,255,255,1);
          }

          .mobile .composer-spark {
            width: 40px;
            height: 40px;
            border-radius: 18px;
          }

          .mobile .composer input {
            font-size: 12.8px;
            font-weight: 500;
          }

          .mobile .composer-mic {
            width: 30px;
            height: 30px;
            border-radius: 12px;
          }

          .mobile .composer-send {
            width: 48px;
            height: 44px;
            border-radius: 17px;
          }
        }

        @media (max-width: 430px) {
          .mobile-page {
            max-width: 430px;
            padding: 20px 12px 16px;
            gap: 10px;
          }

          .aci-logo.mobile span {
            font-size: 28px;
          }

          .aci-logo.mobile strong {
            font-size: 14px;
            letter-spacing: 6px;
          }

          .mobile-hero {
            min-height: 248px;
          }

          .mobile-orb,
          .mobile-orb .orb {
            width: 176px;
            height: 176px;
          }

          .mobile-hero-copy h1 {
            font-size: 25px;
          }

          .mobile-hero-copy h2 {
            font-size: 11px;
          }

          .mobile-selected {
            grid-template-columns: 52px auto auto 1fr auto;
            gap: 6px;
          }

          .mobile-selected em {
            font-size: 7.2px;
          }
        }
      `}</style>

      <DesktopPage />
      <MobilePage />
    </div>
  );
}
