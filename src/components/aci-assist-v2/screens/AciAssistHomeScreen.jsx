import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Heart,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";

import {
  AciAssistantOrb,
  AciComposer,
  AciLogo,
  AciSavedButton,
  AciVehicleVisual,
  emitAciAction,
  fadeUp,
  stagger,
} from "../shared/AciAssistShared";

const buildOpenModelAction = (car = {}) => ({
  ...car,
  label: car.displayName || car.name || [car.brand || car.make, car.model].filter(Boolean).join(" "),
  query: car.displayName || car.name || car.model || "",
  type: "open_vehicle",
  intent: "vehicle_overview",
  canvasType: "car_overview_canvas",
  vehicle: car,
});

const getModelDisplayName = (car = {}) => {
  const composed = [car.brand || car.make, car.model].filter(Boolean).join(" ").trim();
  return composed || car.displayName || car.name || "Vehicle";
};

const toCityLabel = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "Delhi";
  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

function DesktopHeader({ data, onAction }) {
  return (
    <motion.header
      className="desktop-header"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="desktop-header-left">
        <AciLogo onAction={onAction} />
      </div>

      <div className="desktop-header-center">
        <label className="desktop-search">
          <Search size={18} />
          <input placeholder={data.header.searchPlaceholder} />
          <button
            type="button"
            onClick={() =>
              emitAciAction(
                { label: "Command search", query: "Command search" },
                onAction,
              )
            }
          >
            ⌘ K
          </button>
        </label>
      </div>

      <div className="desktop-header-right">
        <button
          type="button"
          className="bell-button"
          onClick={() =>
            emitAciAction(
              { label: "Notifications", query: "Notifications" },
              onAction,
            )
          }
          aria-label="Notifications"
        >
          <Bell size={22} />
          <i />
        </button>

        <button
          type="button"
          className="avatar-button"
          onClick={() =>
            emitAciAction({ label: "Profile", query: "Profile" }, onAction)
          }
          aria-label="Profile"
        >
          <img src={data.avatarUrl} alt="Profile" />
        </button>

        <button
          type="button"
          className="plain-button"
          onClick={() =>
            emitAciAction(
              { label: "Profile menu", query: "Profile menu" },
              onAction,
            )
          }
          aria-label="Profile menu"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </motion.header>
  );
}

function DesktopHero({ data, onAction }) {
  return (
    <motion.section className="desktop-hero" variants={fadeUp}>
      <motion.div
        className="desktop-hero-orb"
        animate={{ y: [0, -5, 0], scale: [1, 1.012, 1] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <AciAssistantOrb />
      </motion.div>

      <div className="desktop-hero-copy">
        <h1>
          {data.hero.titlePrefix} <span>{data.hero.titleHighlight}</span>
        </h1>

        <p>{data.hero.subtitle}</p>

        <small>
          <Sparkles size={14} />
          {data.hero.badge}
        </small>

        <div className="desktop-prompt-grid">
          {data.hero.prompts.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.label}
                onClick={() => emitAciAction(item, onAction)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

function DesktopQuickGrid({ data, onAction }) {
  return (
    <motion.section className="desktop-quick-grid" variants={fadeUp}>
      {data.quickActions.map((item) => {
        const Icon = item.icon;

        return (
          <button
            type="button"
            key={item.title}
            onClick={() => emitAciAction(item, onAction)}
          >
            <span>
              <Icon size={24} />
            </span>

            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>

            <ChevronRight size={16} />
          </button>
        );
      })}
    </motion.section>
  );
}

function DesktopTrendingCars({ data, onAction, savedIds, onToggleSaved }) {
  return (
    <motion.section className="desktop-trending" variants={fadeUp}>
      <div className="section-head">
        <h2>Trending cars for you</h2>

        <button
          type="button"
          onClick={() =>
            emitAciAction(
              { label: "View all cars", query: "View all cars" },
              onAction,
            )
          }
        >
          View all cars <ChevronRight size={16} />
        </button>
      </div>

      <div className="desktop-trending-grid">
        {data.trendingCars.map((car) => (
          <motion.article
            className="desktop-car-card"
            key={car.id || car.name}
            whileHover={{ y: -3, scale: 1.008 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="car-tag">{car.tag}</span>

            <AciSavedButton
              vehicle={car}
              saved={savedIds.has(car.id)}
              onToggleSaved={onToggleSaved}
              className="heart-button"
              size={20}
            />

            <button
              type="button"
              className="desktop-car-image"
              onClick={() => emitAciAction(buildOpenModelAction(car), onAction)}
            >
              <AciVehicleVisual vehicle={car} height={142} />
            </button>

            <h3>{getModelDisplayName(car)}</h3>
            <p>{car.price}</p>

            <div className="desktop-car-specs">
              {car.specs.map((spec) => {
                const Icon = spec.icon;
                return (
                  <span key={`${car.name}-${spec.label}`}>
                    <Icon size={12} />
                    {spec.label}
                  </span>
                );
              })}
            </div>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

function DesktopRightRail({ data, onAction, savedIds, onToggleSaved }) {
  const { popularAsks, savedCars, help } = data.rightRail;

  return (
    <aside className="desktop-right-rail">
      <motion.article className="rail-card" variants={fadeUp}>
        <div className="rail-title">
          <h3>
            <Sparkles size={17} />
            Today’s popular asks
          </h3>
        </div>

        <div className="popular-asks">
          {popularAsks.map((ask, index) => (
            <button
              type="button"
              key={ask}
              onClick={() => emitAciAction({ label: ask, query: ask }, onAction)}
            >
              <span>{index + 1}</span>
              {ask}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="rail-link"
          onClick={() =>
            emitAciAction(
              {
                label: "See more trending asks",
                query: "See more trending asks",
              },
              onAction,
            )
          }
        >
          See more trending asks <ChevronRight size={15} />
        </button>
      </motion.article>

      <motion.article className="rail-card" variants={fadeUp}>
        <div className="rail-head">
          <h3>Saved cars</h3>

          <button
            type="button"
            onClick={() =>
              emitAciAction(
                { label: "View saved cars", query: "View saved cars" },
                onAction,
              )
            }
          >
            View all <ChevronRight size={15} />
          </button>
        </div>

        <div className="saved-list">
          {savedCars.map((car) => (
            <button
              type="button"
              key={car.name}
              onClick={() => emitAciAction(car, onAction)}
            >
              <AciVehicleVisual vehicle={car} height={48} />

              <span>
                <strong>{car.name}</strong>
                <em>{car.price}</em>
              </span>

              <span
                role="button"
                tabIndex={0}
                className={`saved-heart-button ${savedIds.has(car.id) ? "is-saved" : ""}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleSaved?.(car);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleSaved?.(car);
                  }
                }}
                aria-label={savedIds.has(car.id) ? `Remove ${car.name}` : `Save ${car.name}`}
                aria-pressed={savedIds.has(car.id)}
              >
                <Heart size={18} fill={savedIds.has(car.id) ? "currentColor" : "none"} />
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="save-compare"
          onClick={() =>
            emitAciAction(
              {
                label: "Save a car to compare",
                query: "Save a car to compare",
              },
              onAction,
            )
          }
        >
          + Save a car to compare
        </button>
      </motion.article>

      <motion.article className="rail-card" variants={fadeUp}>
        <div className="rail-title">
          <h3>What can I help with?</h3>
        </div>

        <div className="help-list">
          {help.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => emitAciAction({ label: item, query: item }, onAction)}
            >
              <CircleCheck size={15} />
              {item}
            </button>
          ))}
        </div>
      </motion.article>

      <motion.article className="rail-card tour-card" variants={fadeUp}>
        <div>
          <h3>New to ACI Assist?</h3>
          <p>Take a quick tour to explore all the features.</p>

          <button
            type="button"
            onClick={() =>
              emitAciAction({ label: "Start tour", query: "Start tour" }, onAction)
            }
          >
            Start tour <ChevronRight size={15} />
          </button>
        </div>

        <span>
          <MapPin size={28} />
        </span>
      </motion.article>
    </aside>
  );
}

function DesktopHomePage({ data, onAction, savedIds, onToggleSaved }) {
  return (
    <>
      <DesktopHeader data={data} onAction={onAction} />

      <motion.main
        className="desktop-home-page"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <section className="desktop-home-layout">
          <div className="desktop-home-main">
            <DesktopHero data={data} onAction={onAction} />
            <DesktopQuickGrid data={data} onAction={onAction} />
            <DesktopTrendingCars data={data} onAction={onAction} savedIds={savedIds} onToggleSaved={onToggleSaved} />
            <AciComposer onAction={onAction} />
          </div>

          <DesktopRightRail data={data} onAction={onAction} savedIds={savedIds} onToggleSaved={onToggleSaved} />
        </section>
      </motion.main>
    </>
  );
}

function MobileHeader({ data, onAction }) {
  return (
    <motion.header
      className="mobile-header"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <AciLogo mobile onAction={onAction} />

      <div>
        <button
          type="button"
          className="mobile-bell"
          onClick={() =>
            emitAciAction(
              { label: "Notifications", query: "Notifications" },
              onAction,
            )
          }
          aria-label="Notifications"
        >
          <Bell size={27} />
          <i />
        </button>

        <button
          type="button"
          className="mobile-avatar"
          onClick={() =>
            emitAciAction({ label: "Profile", query: "Profile" }, onAction)
          }
          aria-label="Profile"
        >
          <img src={data.avatarUrl} alt="Profile" />
        </button>
      </div>
    </motion.header>
  );
}

function MobileHero({ data, onAction }) {
  return (
    <motion.section className="mobile-hero" variants={fadeUp}>
      <motion.div
        className="mobile-hero-orb"
        animate={{ y: [0, -4, 0], scale: [1, 1.01, 1] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <AciAssistantOrb />
      </motion.div>

      <div className="mobile-hero-copy">
        <h1>{data.mobile.heroTitle}</h1>

        <p>{data.mobile.heroSubtitle}</p>

        <button
          type="button"
          onClick={() =>
            emitAciAction(
              {
                label: data.mobile.primaryCta,
                query: data.mobile.primaryCta,
              },
              onAction,
            )
          }
        >
          {data.mobile.primaryCta}
        </button>

        <small>
          <Sparkles size={15} />
          {data.mobile.trustLine}
        </small>
      </div>
    </motion.section>
  );
}

function MobileShortcuts({ data, onAction }) {
  return (
    <motion.section className="mobile-shortcuts" variants={fadeUp}>
      {data.mobile.shortcuts.map((item) => {
        const Icon = item.icon;

        return (
          <motion.button
            type="button"
            key={item.label}
            onClick={() => emitAciAction(item, onAction)}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Icon size={30} />
            <span>{item.label}</span>
          </motion.button>
        );
      })}
    </motion.section>
  );
}

function MobileAssistantChips({ onAction }) {
  const chips = [
    "Best SUV under ₹15L",
    "Compare Creta vs Seltos",
    "Best automatic",
  ];

  return (
    <motion.section className="mobile-assistant-chips" variants={fadeUp}>
      {chips.map((chip) => (
        <motion.button
          type="button"
          key={chip}
          onClick={() => emitAciAction({ label: chip, query: chip }, onAction)}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          {chip}
        </motion.button>
      ))}
    </motion.section>
  );
}

function MobilePopularCars({ data, onAction, savedIds, onToggleSaved }) {
  const cars = data.mobile.popularCars;
  const [index, setIndex] = useState(0);
  const [hintPlayed, setHintPlayed] = useState(false);
  const [visibleMeta, setVisibleMeta] = useState({});
  const metaTimersRef = useRef({});
  const visibleCars = cars.slice(index, index + 2);
  const slideCount = Math.max(1, cars.length - 1);

  const next = () => setIndex((prev) => Math.min(prev + 1, Math.max(0, cars.length - 2)));
  const prev = () => setIndex((prev) => Math.max(prev - 1, 0));
  const shouldSwipeHint = !hintPlayed && index === 0 && cars.length > 2;

  useEffect(() => {
    if (!shouldSwipeHint) return undefined;
    const timer = setTimeout(() => setHintPlayed(true), 1800);
    return () => clearTimeout(timer);
  }, [shouldSwipeHint]);

  useEffect(
    () => () => {
      Object.values(metaTimersRef.current).forEach((timerId) => clearTimeout(timerId));
      metaTimersRef.current = {};
    },
    [],
  );

  const revealMetadata = (carId, loaded) => {
    if (!carId || visibleMeta[carId]) return;

    if (!loaded) {
      setVisibleMeta((prev) => ({ ...prev, [carId]: true }));
      return;
    }

    if (metaTimersRef.current[carId]) {
      clearTimeout(metaTimersRef.current[carId]);
    }

    metaTimersRef.current[carId] = setTimeout(() => {
      setVisibleMeta((prev) => ({ ...prev, [carId]: true }));
      delete metaTimersRef.current[carId];
    }, 100);
  };

  return (
    <motion.section className="mobile-popular" variants={fadeUp}>
      <div className="mobile-section-head">
        <h2>Popular right now</h2>
      </div>

      <div className="mobile-cars-window">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            className="mobile-cars-grid"
            key={index}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            whileTap={{ cursor: "grabbing" }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40) next();
              if (info.offset.x > 40) prev();
            }}
            initial={{ opacity: 0, x: 22 }}
            animate={shouldSwipeHint ? { opacity: 1, x: [0, 14, 0] } : { opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -22 }}
            transition={
              shouldSwipeHint
                ? {
                    duration: 1.2,
                    times: [0, 0.42, 1],
                    ease: [0.22, 1, 0.36, 1],
                  }
                : {
                    x: {
                      type: "spring",
                      stiffness: 320,
                      damping: 30,
                      mass: 0.9,
                      bounce: 0.12,
                    },
                    opacity: { duration: 0.16 },
                  }
            }
          >
            {visibleCars.map((car) => (
              <motion.article
                className="mobile-car-card"
                key={car.id || car.name}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <AciSavedButton
                  vehicle={car}
                  saved={savedIds.has(car.id)}
                  onToggleSaved={onToggleSaved}
                  className="mobile-heart"
                  size={22}
                />

                <button
                  type="button"
                  className="mobile-car-body"
                  onClick={() => emitAciAction(buildOpenModelAction(car), onAction)}
                >
                  <div className="mobile-car-image">
                    <AciVehicleVisual
                      vehicle={car}
                      height={130}
                      className="mobile-creta-card-photo"
                      stage
                      stageVariant="compact"
                      onImageReady={(loaded) => revealMetadata(car.id || car.name, loaded)}
                    />
                  </div>

                  <div className={`mobile-car-meta ${visibleMeta[car.id || car.name] ? "is-visible" : ""}`}>
                    <h3>{getModelDisplayName(car)}</h3>
                    <b />
                    <strong>{car.price}</strong>
                    <em>{`in ${toCityLabel(car.city || data?.selectedVehicle?.city || "Delhi")}`}</em>
                  </div>
                </button>
              </motion.article>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {slideCount > 1 ? (
        <div className="mobile-cars-dots" aria-label="Popular cars pagination">
          {Array.from({ length: slideCount }).map((_, dotIndex) => (
            <button
              type="button"
              key={`dot-${dotIndex}`}
              className={dotIndex === index ? "is-active" : ""}
              onClick={() => setIndex(dotIndex)}
              aria-label={`Go to popular cars slide ${dotIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </motion.section>
  );
}

function MobileHomePage({ data, onAction, savedIds, onToggleSaved }) {
  return (
    <motion.main
      className="mobile-home-page"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <MobileHeader data={data} onAction={onAction} />
      <MobileHero data={data} onAction={onAction} />
      <MobileShortcuts data={data} onAction={onAction} />
      <MobileAssistantChips onAction={onAction} />
      <MobilePopularCars data={data} onAction={onAction} savedIds={savedIds} onToggleSaved={onToggleSaved} />
      <AciComposer mobile onAction={onAction} placeholder="Ask ACI Assist anything…" />
    </motion.main>
  );
}

export default function AciAssistHomeScreen({ data, onAction, savedIds = new Set(), onToggleSaved }) {
  return (
    <div className="aci-home-root">
      <style>{`
.aci-home-root .desktop-home-page {
  padding-bottom: 90px !important;
}
      `}</style>
<DesktopHomePage data={data} onAction={onAction} savedIds={savedIds} onToggleSaved={onToggleSaved} />
      <MobileHomePage data={data} onAction={onAction} savedIds={savedIds} onToggleSaved={onToggleSaved} />
    </div>
  );
}
