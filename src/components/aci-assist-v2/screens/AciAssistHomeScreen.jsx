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
  AciSavedButton,
  AciVehicleVisual,
  emitAciAction,
  fadeUp,
  stagger,
} from "../shared/AciAssistShared";
import { getAciV2PremiumIcon } from "../shared/AciV2PremiumIcons";

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

const EMPTY_HOME_DATA = {
  avatarUrl: "",
  header: {
    searchPlaceholder: "Ask about prices, features, EMI, or compare cars",
  },
  hero: {
    titlePrefix: "Hi there! I’m",
    titleHighlight: "ACI Assist",
    subtitle:
      "Your intelligent co-pilot for everything about new cars. Discover, compare, plan and decide with confidence.",
    badge: "For new cars only",
    prompts: [],
  },
  quickActions: [],
  trendingCars: [],
  rightRail: {
    popularAsks: [],
    savedCars: [],
    help: [],
  },
  mobile: {
    heroTitle: "One Bot Solution",
    heroSubtitle:
      "Ask one question and get a clear, confident answer to find your perfect new car.",
    primaryCta: "Start with your budget",
    trustLine: "Live new-car assistance",
    shortcuts: [],
    popularCars: [],
  },
  selectedVehicle: null,
};

const toSafeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const normalizeHomeData = (data = {}) => {
  const source = data && typeof data === "object" ? data : {};

  return {
    ...EMPTY_HOME_DATA,
    ...source,
    avatarUrl: source.avatarUrl || EMPTY_HOME_DATA.avatarUrl,
    header: {
      ...EMPTY_HOME_DATA.header,
      ...(source.header || {}),
    },
    hero: {
      ...EMPTY_HOME_DATA.hero,
      ...(source.hero || {}),
      prompts: toSafeArray(source.hero?.prompts),
    },
    quickActions: toSafeArray(source.quickActions),
    trendingCars: toSafeArray(source.trendingCars),
    rightRail: {
      ...EMPTY_HOME_DATA.rightRail,
      ...(source.rightRail || {}),
      popularAsks: toSafeArray(source.rightRail?.popularAsks),
      savedCars: toSafeArray(source.rightRail?.savedCars),
      help: toSafeArray(source.rightRail?.help),
    },
    mobile: {
      ...EMPTY_HOME_DATA.mobile,
      ...(source.mobile || {}),
      shortcuts: toSafeArray(source.mobile?.shortcuts),
      popularCars: toSafeArray(source.mobile?.popularCars),
    },
    selectedVehicle: source.selectedVehicle || null,
  };
};


function AciAssistSignatureLogo({ mobile = false, onAction }) {
  return (
    <button
      type="button"
      className={`aci-signature-logo ${mobile ? "is-mobile" : "is-desktop"}`}
      onClick={() =>
        emitAciAction(
          {
            label: "ACI Assist Home",
            query: "ACI Assist Home",
            type: "go_home",
          },
          onAction,
        )
      }
      aria-label="ACI Assist Home"
    >
      <span className="aci-signature-mark" aria-hidden="true">
        <span>A</span>
        <span>C</span>
        <span>I</span>
      </span>

      <span className="aci-signature-copy">
        <strong>ASSIST</strong>
        <em>{mobile ? "ONE BOT SOLUTION" : "INTELLIGENT NEW CAR CO-PILOT"}</em>
      </span>
    </button>
  );
}


function DesktopTrendingSkeletonCard({ index }) {
  return (
    <motion.article
      className="desktop-car-card desktop-car-card-skeleton"
      aria-hidden="true"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
    >
      <span className="car-tag skeleton-token skeleton-tag" />

      <span className="heart-button skeleton-heart" />

      <div className="desktop-car-image skeleton-image">
        <span className="skeleton-car-visual" />
      </div>

      <h3>
        <span className="skeleton-line skeleton-title" />
      </h3>

      <p>
        <span className="skeleton-line skeleton-price" />
      </p>

      <div className="desktop-car-specs skeleton-specs">
        <span />
        <span />
        <span />
      </div>
    </motion.article>
  );
}

function MobilePopularSkeletonCard({ index }) {
  return (
    <motion.article
      className="mobile-car-card mobile-car-card-skeleton"
      aria-hidden="true"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
    >
      <span className="mobile-heart skeleton-heart" />

      <div className="mobile-car-body skeleton-mobile-body">
        <div className="mobile-car-image skeleton-mobile-image">
          <span className="skeleton-car-visual" />
        </div>

        <div className="mobile-car-meta is-visible skeleton-mobile-meta">
          <h3>
            <span className="skeleton-line skeleton-title" />
          </h3>
          <b />
          <strong>
            <span className="skeleton-line skeleton-price" />
          </strong>
          <em>
            <span className="skeleton-line skeleton-city" />
          </em>
        </div>
      </div>
    </motion.article>
  );
}


function DesktopHeader({ data, onAction }) {
  const [searchText, setSearchText] = useState("");

  const submitSearch = () => {
    const query = String(searchText || "").trim();
    if (!query) return;

    emitAciAction({ label: query, query, type: "ask" }, onAction);
    setSearchText("");
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitSearch();
  };

  return (
    <motion.header
      className="desktop-header"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="desktop-header-left">
        <AciAssistSignatureLogo onAction={onAction} />
      </div>

      <div className="desktop-header-center">
        <label className="desktop-search">
          <Search size={18} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={data.header.searchPlaceholder}
          />
          <button
            type="button"
            onClick={submitSearch}
            aria-label="Search ACI Assist"
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
            const Icon = getAciV2PremiumIcon(item.label || item.title || item.query) || item.icon;

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
        const Icon = getAciV2PremiumIcon(item.title || item.label || item.body) || item.icon;

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
  const cars = Array.isArray(data?.trendingCars) ? data.trendingCars : [];
  const hasCars = cars.length > 0;

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
        {!hasCars
          ? Array.from({ length: 3 }).map((_, index) => (
              <DesktopTrendingSkeletonCard
                key={`desktop-trending-skeleton-${index}`}
                index={index}
              />
            ))
          : cars.map((car) => (
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
                  {(Array.isArray(car.specs) ? car.specs : []).map((spec) => {
                    const Icon = spec.icon;
                    return (
                      <span key={`${car.name || car.id}-${spec.label}`}>
                        {Icon ? <Icon size={12} /> : null}
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
  const popularAsks = Array.isArray(data?.rightRail?.popularAsks)
    ? data.rightRail.popularAsks
    : [];
  const savedCars = Array.isArray(data?.rightRail?.savedCars)
    ? data.rightRail.savedCars
    : [];
  const help = Array.isArray(data?.rightRail?.help) ? data.rightRail.help : [];

  return (
    <aside className="desktop-right-rail aci-reference-rail">
      <motion.article className="rail-card reference-rail-card reference-asks-card" variants={fadeUp}>
        <div className="reference-rail-heading">
          <span className="reference-rail-mini-icon">
            <Sparkles size={16} />
          </span>
          <h3>Today’s popular asks</h3>
        </div>

        <div className="reference-asks-list">
          {popularAsks.length ? (
            popularAsks.slice(0, 5).map((ask, index) => (
              <button
                type="button"
                key={ask}
                onClick={() => emitAciAction({ label: ask, query: ask, type: "ask" }, onAction)}
              >
                <span>{index + 1}</span>
                <strong>{ask}</strong>
                <ChevronRight size={14} />
              </button>
            ))
          ) : (
            <div className="reference-empty-line">
              <p>Live popular asks will appear here.</p>
            </div>
          )}
        </div>

        <button
          type="button"
          className="reference-rail-link"
          onClick={() =>
            emitAciAction(
              {
                label: "See more trending asks",
                query: "See more trending asks",
                type: "ask",
              },
              onAction,
            )
          }
        >
          See more trending asks <ChevronRight size={15} />
        </button>
      </motion.article>

      <motion.article className="rail-card reference-rail-card reference-saved-card" variants={fadeUp}>
        <div className="reference-rail-head-row">
          <h3>Saved cars</h3>

          <button
            type="button"
            onClick={() =>
              emitAciAction(
                { label: "View saved cars", query: "View saved cars", type: "ask" },
                onAction,
              )
            }
          >
            View all <ChevronRight size={15} />
          </button>
        </div>

        {savedCars.length ? (
          <div className="reference-saved-list">
            {savedCars.slice(0, 3).map((car) => (
              <button
                type="button"
                key={car.id || car.name}
                onClick={() => emitAciAction(buildOpenModelAction(car), onAction)}
              >
                <AciVehicleVisual vehicle={car} height={45} />

                <span>
                  <strong>{getModelDisplayName(car)}</strong>
                  <em>{car.price || car.variant || car.model || "Saved car"}</em>
                </span>

                <span
                  role="button"
                  tabIndex={0}
                  className={`reference-heart ${savedIds.has(car.id) ? "is-saved" : ""}`}
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
                  aria-label={savedIds.has(car.id) ? `Remove ${getModelDisplayName(car)}` : `Save ${getModelDisplayName(car)}`}
                  aria-pressed={savedIds.has(car.id)}
                >
                  <Heart size={18} fill={savedIds.has(car.id) ? "currentColor" : "none"} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="reference-saved-empty">
            <span>
              <Heart size={18} />
            </span>
            <div>
              <strong>No saved cars yet</strong>
              <p>Save cars from recommendations, prices, colors, or comparisons.</p>
            </div>
          </div>
        )}

        <button
          type="button"
          className="reference-save-compare"
          onClick={() =>
            emitAciAction(
              {
                label: "Save a car to compare",
                query: "Recommend cars I can save and compare",
                type: "ask",
              },
              onAction,
            )
          }
        >
          + Save a car to compare
        </button>
      </motion.article>

      <motion.article className="rail-card reference-rail-card reference-help-card" variants={fadeUp}>
        <h3>What can I help with?</h3>

        <div className="reference-help-list">
          {help.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => emitAciAction({ label: item, query: item, type: "ask" }, onAction)}
            >
              <CircleCheck size={14} />
              <span>{item}</span>
            </button>
          ))}
        </div>
      </motion.article>

      <motion.article className="rail-card reference-rail-card reference-tour-card" variants={fadeUp}>
        <div>
          <h3>New to ACI Assist?</h3>
          <p>Take a quick tour to explore all the features.</p>

          <button
            type="button"
            onClick={() =>
              emitAciAction({ label: "Start tour", query: "Start ACI Assist tour", type: "ask" }, onAction)
            }
          >
            Start tour <ChevronRight size={15} />
          </button>
        </div>

        <span className="reference-tour-map">
          <MapPin size={26} />
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
      <AciAssistSignatureLogo mobile onAction={onAction} />

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
        const Icon = getAciV2PremiumIcon(item.label || item.title || item.query) || item.icon;

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

function MobilePopularCars({ data, onAction, savedIds, onToggleSaved }) {
  const cars = Array.isArray(data?.mobile?.popularCars) ? data.mobile.popularCars : [];
  const hasCars = cars.length > 0;
  const [index, setIndex] = useState(0);
  const [hintPlayed, setHintPlayed] = useState(false);
  const [visibleMeta, setVisibleMeta] = useState({});
  const metaTimersRef = useRef({});
  const visibleCars = hasCars ? cars.slice(index, index + 2) : [];
  const slideCount = hasCars ? Math.max(1, cars.length - 1) : 1;
  const indicatorCount = hasCars ? slideCount : 2;

  const next = () => {
    if (!hasCars) return;
    setIndex((prev) => Math.min(prev + 1, Math.max(0, cars.length - 2)));
  };
  const prev = () => {
    if (!hasCars) return;
    setIndex((prev) => Math.max(prev - 1, 0));
  };
  const shouldSwipeHint = hasCars && !hintPlayed && index === 0 && cars.length > 2;

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
        <h2>Trending cars for you</h2>
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
            {!hasCars
              ? Array.from({ length: 2 }).map((_, skeletonIndex) => (
                  <MobilePopularSkeletonCard
                    key={`mobile-popular-skeleton-${skeletonIndex}`}
                    index={skeletonIndex}
                  />
                ))
              : visibleCars.map((car) => (
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

      {indicatorCount > 1 ? (
        <div className="mobile-cars-dots" aria-label="Popular cars pagination">
          {Array.from({ length: indicatorCount }).map((_, dotIndex) => (
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
      <MobilePopularCars data={data} onAction={onAction} savedIds={savedIds} onToggleSaved={onToggleSaved} />
      <AciComposer mobile onAction={onAction} placeholder="Ask ACI Assist anything…" />
    </motion.main>
  );
}

export default function AciAssistHomeScreen({ data, onAction, savedIds = new Set(), onToggleSaved }) {
  const safeData = normalizeHomeData(data);

  return (
    <div className="aci-home-root">
      <style>{`
.aci-home-root .desktop-home-page {
  padding-bottom: 90px !important;
}

.aci-home-root .desktop-car-card-skeleton,
.aci-home-root .mobile-car-card-skeleton {
  pointer-events: none;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-token,
.aci-home-root .desktop-car-card-skeleton .skeleton-heart,
.aci-home-root .desktop-car-card-skeleton .skeleton-car-visual,
.aci-home-root .desktop-car-card-skeleton .skeleton-line,
.aci-home-root .desktop-car-card-skeleton .desktop-car-specs span,
.aci-home-root .mobile-car-card-skeleton .skeleton-heart,
.aci-home-root .mobile-car-card-skeleton .skeleton-car-visual,
.aci-home-root .mobile-car-card-skeleton .skeleton-line {
  position: relative;
  overflow: hidden;
  color: transparent !important;
  background: linear-gradient(90deg, #e8f0ff 0%, #f8fbff 42%, #dbeafe 78%);
  background-size: 220% 100%;
  animation: aciHomeSkeletonPulse 1.35s ease-in-out infinite;
}

@keyframes aciHomeSkeletonPulse {
  0% {
    background-position: 120% 0;
    opacity: .72;
  }
  50% {
    opacity: 1;
  }
  100% {
    background-position: -120% 0;
    opacity: .72;
  }
}

.aci-home-root .desktop-car-card-skeleton .skeleton-tag {
  width: 82px;
  height: 24px;
  border-radius: 999px;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-heart,
.aci-home-root .mobile-car-card-skeleton .skeleton-heart {
  border-radius: 999px;
  border: 0;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-image,
.aci-home-root .mobile-car-card-skeleton .skeleton-mobile-image {
  display: grid;
  place-items: center;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-car-visual {
  width: min(88%, 230px);
  height: 92px;
  border-radius: 34px 34px 28px 28px;
  clip-path: polygon(9% 62%, 20% 36%, 39% 24%, 68% 25%, 83% 42%, 93% 63%, 88% 79%, 15% 79%);
}

.aci-home-root .desktop-car-card-skeleton h3,
.aci-home-root .desktop-car-card-skeleton p,
.aci-home-root .mobile-car-card-skeleton h3,
.aci-home-root .mobile-car-card-skeleton strong,
.aci-home-root .mobile-car-card-skeleton em {
  margin: 0;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-title,
.aci-home-root .mobile-car-card-skeleton .skeleton-title {
  display: block;
  width: 68%;
  height: 18px;
  border-radius: 999px;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-price,
.aci-home-root .mobile-car-card-skeleton .skeleton-price {
  display: block;
  width: 46%;
  height: 15px;
  border-radius: 999px;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-specs span {
  width: 58px;
  height: 22px;
  border-radius: 999px;
}

.aci-home-root .mobile-car-card-skeleton .skeleton-mobile-body {
  pointer-events: none;
}

.aci-home-root .mobile-car-card-skeleton .skeleton-car-visual {
  width: min(90%, 210px);
  height: 96px;
  border-radius: 34px 34px 28px 28px;
  clip-path: polygon(8% 62%, 19% 37%, 39% 24%, 69% 25%, 83% 43%, 94% 64%, 89% 80%, 14% 80%);
}

.aci-home-root .mobile-car-card-skeleton .skeleton-city {
  display: block;
  width: 54%;
  height: 13px;
  border-radius: 999px;
}

@media (prefers-reduced-motion: reduce) {
  .aci-home-root .desktop-car-card-skeleton .skeleton-token,
  .aci-home-root .desktop-car-card-skeleton .skeleton-heart,
  .aci-home-root .desktop-car-card-skeleton .skeleton-car-visual,
  .aci-home-root .desktop-car-card-skeleton .skeleton-line,
  .aci-home-root .desktop-car-card-skeleton .desktop-car-specs span,
  .aci-home-root .mobile-car-card-skeleton .skeleton-heart,
  .aci-home-root .mobile-car-card-skeleton .skeleton-car-visual,
  .aci-home-root .mobile-car-card-skeleton .skeleton-line {
    animation: none;
  }
}



/* ACI_HOME_SAFE_FINISH_START */

/* Keep original page rhythm. Only add enough bottom safety for fixed composer. */
.aci-home-root .desktop-home-page {
  padding-bottom: 104px !important;
}

/* Do not let the fixed composer create a double-container look */
.aci-home-root .aci-v2-chatdock {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* Mobile chips should scroll instead of truncating, without changing vertical rhythm too much */
.aci-home-root .mobile-assistant-chips {
  display: flex !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  gap: 10px !important;
  padding-bottom: 4px !important;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.aci-home-root .mobile-assistant-chips::-webkit-scrollbar {
  display: none;
}

.aci-home-root .mobile-assistant-chips button {
  flex: 0 0 auto !important;
  white-space: nowrap !important;
  max-width: none !important;
}

/* Keep skeleton visible but not oversized */
.aci-home-root .desktop-car-card-skeleton,
.aci-home-root .mobile-car-card-skeleton {
  background:
    radial-gradient(circle at 10% 10%, rgba(219, 234, 254, .55), transparent 18%),
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.95)) !important;
  border-color: rgba(147, 197, 253, .55) !important;
}

.aci-home-root .desktop-car-card-skeleton .skeleton-token,
.aci-home-root .desktop-car-card-skeleton .skeleton-heart,
.aci-home-root .desktop-car-card-skeleton .skeleton-car-visual,
.aci-home-root .desktop-car-card-skeleton .skeleton-line,
.aci-home-root .desktop-car-card-skeleton .desktop-car-specs span,
.aci-home-root .mobile-car-card-skeleton .skeleton-heart,
.aci-home-root .mobile-car-card-skeleton .skeleton-car-visual,
.aci-home-root .mobile-car-card-skeleton .skeleton-line {
  background: linear-gradient(90deg, #dbeafe 0%, #f8fbff 46%, #d7e6ff 78%) !important;
  background-size: 220% 100% !important;
}

/* ACI_HOME_SAFE_FINISH_END */


/* ACI_RIGHT_RAIL_POLISH_START */

.aci-home-root .aci-right-rail-v2 {
  gap: 14px;
}

.aci-home-root .aci-rail-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, .82) !important;
  background:
    radial-gradient(circle at 92% 8%, rgba(37, 99, 235, .055), transparent 28%),
    rgba(255, 255, 255, .92) !important;
  box-shadow: 0 18px 48px rgba(15, 23, 42, .065) !important;
  backdrop-filter: blur(18px);
}

.aci-home-root .aci-rail-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(37, 99, 235, .26), transparent);
  opacity: .72;
}

.aci-home-root .aci-rail-card-top {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-bottom: 14px;
}

.aci-home-root .aci-rail-icon {
  width: 31px;
  height: 31px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: #0b5cff;
  background: linear-gradient(135deg, #eef5ff, #ffffff);
  border: 1px solid rgba(147, 197, 253, .72);
  box-shadow: 0 12px 26px rgba(37, 99, 235, .10);
}

.aci-home-root .aci-rail-icon.blue {
  color: #0b5cff;
}

.aci-home-root .aci-rail-card h3,
.aci-home-root .aci-rail-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  letter-spacing: -.02em;
}

.aci-home-root .aci-rail-card p,
.aci-home-root .aci-rail-head p {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 650;
}

.aci-home-root .aci-popular-asks {
  display: grid;
  gap: 8px;
}

.aci-home-root .aci-popular-asks button {
  min-height: 40px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 9px;
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 14px;
  padding: 7px 8px;
  color: #334155;
  text-align: left;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
}

.aci-home-root .aci-popular-asks button:hover {
  background: #f8fbff;
  border-color: rgba(147, 197, 253, .58);
  transform: translateX(2px);
}

.aci-home-root .aci-popular-asks button > span {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #eef5ff;
  color: #0b5cff;
  font-size: 11px;
  font-weight: 850;
}

.aci-home-root .aci-popular-asks button strong {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 760;
}

.aci-home-root .aci-popular-asks button svg {
  color: #94a3b8;
}

.aci-home-root .aci-rail-link {
  margin-top: 12px;
  width: 100%;
  justify-content: center;
  min-height: 34px;
  border-radius: 12px;
  background: #f8fbff !important;
  border: 1px solid rgba(147, 197, 253, .55) !important;
  color: #0b5cff !important;
  font-weight: 800;
}

.aci-home-root .aci-rail-head {
  align-items: flex-start;
}

.aci-home-root .aci-rail-head > button {
  color: #0b5cff;
  font-weight: 800;
}

.aci-home-root .aci-saved-list {
  display: grid;
  gap: 9px;
  margin-top: 13px;
}

.aci-home-root .aci-saved-list button {
  border-radius: 15px;
  border: 1px solid rgba(226, 232, 240, .92);
  background: #ffffff;
  padding: 8px;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}

.aci-home-root .aci-saved-list button:hover {
  transform: translateY(-1px);
  border-color: rgba(147, 197, 253, .72);
  box-shadow: 0 12px 26px rgba(37, 99, 235, .08);
}

.aci-home-root .aci-saved-empty {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  border-radius: 17px;
  border: 1px dashed rgba(147, 197, 253, .72);
  background: linear-gradient(135deg, #f8fbff, #ffffff);
  padding: 13px;
}

.aci-home-root .aci-saved-empty > span {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #0b5cff;
  background: #eef5ff;
}

.aci-home-root .aci-saved-empty strong {
  display: block;
  color: #0f172a;
  font-size: 12px;
  font-weight: 850;
}

.aci-home-root .aci-saved-empty p {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.45;
}

.aci-home-root .aci-save-compare {
  margin-top: 12px;
  min-height: 37px;
  border-radius: 14px !important;
  background: #0b5cff !important;
  color: #ffffff !important;
  box-shadow: 0 14px 30px rgba(11, 92, 255, .18) !important;
}

.aci-home-root .aci-help-list {
  display: grid;
  gap: 8px;
}

.aci-home-root .aci-help-list button {
  min-height: 38px;
  display: grid;
  grid-template-columns: 17px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 8px;
  border-radius: 13px;
  border: 1px solid rgba(226, 232, 240, .86);
  background: #ffffff;
  padding: 8px 9px;
  color: #334155;
  text-align: left;
  font-size: 12px;
  font-weight: 730;
  cursor: pointer;
}

.aci-home-root .aci-help-list button svg:first-child {
  color: #0b5cff;
}

.aci-home-root .aci-help-list button svg:last-child {
  color: #94a3b8;
}

.aci-home-root .aci-tour-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 58px;
  align-items: center;
  gap: 14px;
  background:
    radial-gradient(circle at 84% 36%, rgba(37, 99, 235, .10), transparent 28%),
    linear-gradient(135deg, #ffffff, #f8fbff) !important;
}

.aci-home-root .aci-tour-kicker {
  display: inline-flex;
  margin-bottom: 6px;
  color: #0b5cff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .04em;
}

.aci-home-root .aci-tour-card h3 {
  font-size: 16px;
}

.aci-home-root .aci-tour-card p {
  max-width: 210px;
}

.aci-home-root .aci-tour-card button {
  margin-top: 10px;
  color: #0b5cff;
  font-weight: 850;
}

.aci-home-root .aci-tour-orb {
  width: 58px;
  height: 58px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  color: #0b5cff;
  background: linear-gradient(135deg, #eef5ff, #ffffff);
  border: 1px solid rgba(147, 197, 253, .72);
  box-shadow: inset 0 1px 0 #fff, 0 14px 30px rgba(37,99,235,.10);
}

.aci-home-root .aci-rail-empty {
  border-radius: 15px;
  border: 1px dashed rgba(147, 197, 253, .68);
  background: #f8fbff;
  padding: 14px;
}

.aci-home-root .aci-rail-empty span {
  display: block;
  width: 64px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, #dbeafe, #f8fbff, #dbeafe);
  margin-bottom: 9px;
}

/* ACI_RIGHT_RAIL_POLISH_END */


/* ACI_PREMIUM_ICONS_AND_RAIL_LEVELUP_START */

/* Premium icon feel inspired by the provided reference */
.aci-home-root .mobile-shortcuts svg,
.aci-home-root .desktop-quick-grid svg,
.aci-home-root .desktop-prompt-grid svg {
  color: #0b5cff;
  stroke-width: 2.15;
}

.aci-home-root .mobile-shortcuts button svg {
  width: 30px;
  height: 30px;
}

.aci-home-root .desktop-quick-grid button > span {
  background:
    radial-gradient(circle at 32% 24%, #ffffff, #eef5ff 56%, #e7f0ff 100%) !important;
  border: 1px solid rgba(147, 197, 253, .62) !important;
  color: #0b5cff !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.94),
    0 14px 28px rgba(37, 99, 235, .10) !important;
}

.aci-home-root .mobile-shortcuts button {
  background:
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.95)) !important;
  border-color: rgba(147, 197, 253, .48) !important;
  box-shadow: 0 16px 36px rgba(15, 23, 42, .06) !important;
}

.aci-home-root .mobile-shortcuts button svg {
  filter: drop-shadow(0 8px 14px rgba(11, 92, 255, .12));
}

.aci-home-root .desktop-prompt-grid button svg {
  width: 17px;
  height: 17px;
}

/* Further level-up of the right rail without changing data */
.aci-home-root .aci-right-rail-v2 {
  position: sticky;
  top: 18px;
  align-self: start;
}

.aci-home-root .aci-right-rail-v2 .aci-rail-card {
  border-radius: 24px !important;
  background:
    linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,251,255,.92)) !important;
  box-shadow:
    0 1px 0 rgba(255,255,255,.9) inset,
    0 22px 58px rgba(15, 23, 42, .075) !important;
}

.aci-home-root .aci-right-rail-v2 .aci-rail-card:hover {
  border-color: rgba(147, 197, 253, .78) !important;
  box-shadow:
    0 1px 0 rgba(255,255,255,.95) inset,
    0 26px 68px rgba(37, 99, 235, .09) !important;
}

.aci-home-root .aci-rail-card-asks {
  background:
    radial-gradient(circle at 92% 8%, rgba(11, 92, 255, .11), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.94)) !important;
}

.aci-home-root .aci-popular-asks button {
  min-height: 44px !important;
  grid-template-columns: 28px minmax(0, 1fr) 18px !important;
  border-radius: 16px !important;
}

.aci-home-root .aci-popular-asks button > span {
  width: 28px !important;
  height: 28px !important;
  background:
    linear-gradient(135deg, #eef5ff, #ffffff) !important;
  border: 1px solid rgba(147, 197, 253, .58);
}

.aci-home-root .aci-popular-asks button strong {
  white-space: normal !important;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.25;
}

.aci-home-root .aci-saved-empty {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 92% 20%, rgba(11, 92, 255, .08), transparent 28%),
    linear-gradient(135deg, #ffffff, #f8fbff) !important;
}

.aci-home-root .aci-saved-empty::after {
  content: "";
  position: absolute;
  right: -22px;
  bottom: -30px;
  width: 92px;
  height: 92px;
  border-radius: 999px;
  background: rgba(219, 234, 254, .42);
}

.aci-home-root .aci-save-compare {
  transition: transform .18s ease, box-shadow .18s ease;
}

.aci-home-root .aci-save-compare:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 38px rgba(11, 92, 255, .22) !important;
}

.aci-home-root .aci-help-list button {
  background:
    linear-gradient(180deg, #ffffff, #fbfdff) !important;
  border-color: rgba(226, 232, 240, .9) !important;
  transition: transform .18s ease, border-color .18s ease, background .18s ease;
}

.aci-home-root .aci-help-list button:hover {
  transform: translateX(2px);
  border-color: rgba(147, 197, 253, .72) !important;
  background: #f8fbff !important;
}

.aci-home-root .aci-tour-card {
  min-height: 132px;
}

.aci-home-root .aci-tour-card::after {
  content: "";
  position: absolute;
  inset: auto 16px 14px auto;
  width: 82px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(11,92,255,.24));
}

.aci-home-root .aci-tour-orb {
  animation: aciRailOrbFloat 5.6s ease-in-out infinite;
}

@keyframes aciRailOrbFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .aci-home-root .aci-tour-orb {
    animation: none;
  }

  .aci-home-root .aci-right-rail-v2 .aci-rail-card,
  .aci-home-root .aci-popular-asks button,
  .aci-home-root .aci-help-list button,
  .aci-home-root .aci-save-compare {
    transition: none !important;
  }
}

/* ACI_PREMIUM_ICONS_AND_RAIL_LEVELUP_END */


/* ACI_HOME_REFERENCE_MATCH_START */

/* Approved reference background */
.aci-home-root {
  min-height: 100vh;
  background:
    radial-gradient(circle at 50% 0%, rgba(248, 251, 255, .88), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 54%, #ffffff 100%) !important;
  color: #0b1024;
}

/* Remove rejected borderless direction and return to soft-card reference look */
.aci-home-root .desktop-home-page,
.aci-home-root .mobile-home-page {
  background:
    radial-gradient(circle at 52% 22%, rgba(219, 234, 254, .42), transparent 33%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
}

/* ---------- MOBILE REFERENCE MATCH ---------- */
@media (max-width: 767px) {
  .aci-home-root .mobile-home-page {
    width: 100%;
    max-width: 430px;
    margin: 0 auto;
    padding: 24px 16px 104px !important;
    min-height: 100dvh;
    overflow-x: hidden;
  }

  .aci-home-root .mobile-header {
    margin: 0 0 22px !important;
    padding: 0 4px !important;
    align-items: center !important;
  }

  .aci-home-root .mobile-header .aci-logo,
  .aci-home-root .mobile-header [class*="logo"] {
    transform: scale(.98);
    transform-origin: left center;
  }

  .aci-home-root .mobile-top-search {
    height: 64px;
    width: 100%;
    margin: 0 0 22px;
    border-radius: 28px;
    border: 1px solid rgba(203, 213, 225, .92);
    background: rgba(255,255,255,.96);
    box-shadow:
      0 18px 42px rgba(15,23,42,.075),
      inset 0 1px 0 rgba(255,255,255,.92);
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 34px;
    align-items: center;
    gap: 10px;
    padding: 0 14px 0 18px;
    color: #0b5cff;
  }

  .aci-home-root .mobile-top-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #0f172a;
    font-size: 15px;
    font-weight: 560;
  }

  .aci-home-root .mobile-top-search input::placeholder {
    color: #7a8498;
  }

  .aci-home-root .mobile-top-search button {
    border: 0;
    background: transparent;
    display: grid;
    place-items: center;
    color: #0b5cff;
    opacity: .78;
  }

  .aci-home-root .mobile-hero {
    min-height: 250px !important;
    margin: 0 0 20px !important;
    padding: 22px 20px !important;
    border-radius: 28px !important;
    border: 1px solid rgba(203, 213, 225, .86) !important;
    background:
      radial-gradient(circle at 16% 44%, rgba(219, 234, 254, .78), transparent 36%),
      linear-gradient(135deg, rgba(255,255,255,.96), rgba(248,251,255,.88)) !important;
    box-shadow:
      0 18px 44px rgba(15,23,42,.075),
      inset 0 1px 0 rgba(255,255,255,.95) !important;
    overflow: hidden;
  }

  .aci-home-root .mobile-hero-orb {
    transform: scale(1.10);
    transform-origin: center;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: 42px !important;
    line-height: .93 !important;
    letter-spacing: -0.055em !important;
    color: #070b20 !important;
  }

  .aci-home-root .mobile-hero-copy p {
    margin-top: 16px !important;
    color: #374151 !important;
    font-size: 15px !important;
    line-height: 1.42 !important;
    font-weight: 520 !important;
  }

  .aci-home-root .mobile-hero-copy button {
    margin-top: 18px !important;
    min-height: 50px !important;
    border-radius: 999px !important;
    background: #0b5cff !important;
    box-shadow: 0 18px 36px rgba(11,92,255,.20) !important;
    font-size: 15px !important;
    font-weight: 760 !important;
  }

  .aci-home-root .mobile-hero-copy small {
    margin-top: 14px !important;
    color: #64748b !important;
    font-size: 12px !important;
    font-weight: 640 !important;
  }

  .aci-home-root .mobile-shortcuts {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 12px !important;
    margin: 0 0 24px !important;
  }

  .aci-home-root .mobile-shortcuts button {
    min-height: 76px !important;
    height: 76px !important;
    padding: 13px 10px !important;
    border-radius: 22px !important;
    border: 1px solid rgba(203, 213, 225, .88) !important;
    background: rgba(255,255,255,.94) !important;
    box-shadow: 0 12px 28px rgba(15,23,42,.055) !important;
  }

  .aci-home-root .mobile-shortcuts button svg {
    width: 25px !important;
    height: 25px !important;
    stroke-width: 1.9 !important;
    color: #0b5cff !important;
  }

  .aci-home-root .mobile-shortcuts button span {
    color: #070b20 !important;
    font-size: 13px !important;
    line-height: 1.08 !important;
    font-weight: 730 !important;
    letter-spacing: -.02em;
  }

  /* Hide extra chip row to match final mobile reference */
  .aci-home-root .mobile-assistant-chips {
    display: none !important;
  }

  .aci-home-root .mobile-popular {
    margin-top: 0 !important;
  }

  .aci-home-root .mobile-section-head {
    margin: 0 4px 14px !important;
    align-items: center !important;
  }

  .aci-home-root .mobile-section-head h2 {
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: 29px !important;
    line-height: 1 !important;
    letter-spacing: -0.045em !important;
    color: #070b20 !important;
  }

  .aci-home-root .mobile-section-head::after {
    content: "View all ›";
    margin-left: auto;
    color: #0b5cff;
    font-size: 14px;
    font-weight: 760;
  }

  .aci-home-root .mobile-cars-grid {
    gap: 14px !important;
  }

  .aci-home-root .mobile-car-card,
  .aci-home-root .mobile-car-card-skeleton {
    border-radius: 24px !important;
    border: 1px solid rgba(203, 213, 225, .9) !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow: 0 16px 36px rgba(15,23,42,.075) !important;
    overflow: hidden;
  }

  .aci-home-root .mobile-car-card-skeleton {
    min-height: 248px !important;
  }

  .aci-home-root .aci-v2-chatdock {
    width: min(392px, calc(100vw - 32px)) !important;
    bottom: calc(12px + env(safe-area-inset-bottom)) !important;
  }

  .aci-home-root .aci-v2-chatdock .aci-v2-chatbar {
    height: 58px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(147,197,253,.78) !important;
    box-shadow: 0 20px 42px rgba(37,99,235,.14) !important;
  }
}

/* ---------- DESKTOP REFERENCE MATCH ---------- */
@media (min-width: 768px) {
  .aci-home-root .desktop-header {
    padding: 22px 28px 16px !important;
    background: transparent !important;
  }

  .aci-home-root .desktop-search {
    height: 48px !important;
    border-radius: 12px !important;
    border: 1px solid rgba(203,213,225,.9) !important;
    background: rgba(255,255,255,.94) !important;
    box-shadow: 0 12px 30px rgba(15,23,42,.045) !important;
  }

  .aci-home-root .desktop-home-page {
    padding: 0 22px 112px !important;
  }

  .aci-home-root .desktop-home-layout {
    gap: 18px !important;
  }

  .aci-home-root .desktop-hero {
    border-radius: 22px !important;
    border: 1px solid rgba(203,213,225,.86) !important;
    background:
      radial-gradient(circle at 8% 42%, rgba(219,234,254,.62), transparent 26%),
      radial-gradient(circle at 96% 6%, rgba(219,234,254,.52), transparent 32%),
      linear-gradient(135deg, rgba(255,255,255,.96), rgba(248,251,255,.88)) !important;
    box-shadow: 0 18px 44px rgba(15,23,42,.06) !important;
  }

  .aci-home-root .desktop-hero-copy h1 {
    color: #0f172a !important;
    letter-spacing: -.035em !important;
  }

  .aci-home-root .desktop-hero-copy h1 span {
    color: #0b5cff !important;
  }

  .aci-home-root .desktop-prompt-grid button,
  .aci-home-root .desktop-quick-grid button,
  .aci-home-root .rail-card,
  .aci-home-root .aci-rail-card,
  .aci-home-root .desktop-trending {
    border: 1px solid rgba(203,213,225,.86) !important;
    background: rgba(255,255,255,.92) !important;
    box-shadow: 0 14px 34px rgba(15,23,42,.045) !important;
  }

  .aci-home-root .desktop-prompt-grid button {
    border-radius: 10px !important;
    min-height: 38px !important;
  }

  .aci-home-root .desktop-quick-grid button {
    border-radius: 16px !important;
    min-height: 76px !important;
  }

  .aci-home-root .desktop-quick-grid button > span {
    border-radius: 999px !important;
    background: #f5f7fb !important;
    border: 1px solid rgba(203,213,225,.9) !important;
    color: #111827 !important;
    box-shadow: none !important;
  }

  .aci-home-root .desktop-quick-grid svg,
  .aci-home-root .desktop-prompt-grid svg,
  .aci-home-root .aci-right-rail-v2 svg {
    stroke-width: 1.75 !important;
  }

  .aci-home-root .desktop-trending {
    border-radius: 18px !important;
  }

  .aci-home-root .desktop-car-card,
  .aci-home-root .desktop-car-card-skeleton {
    border: 1px solid rgba(203,213,225,.86) !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow: 0 14px 34px rgba(15,23,42,.045) !important;
  }

  .aci-home-root .aci-right-rail-v2 .aci-rail-card {
    border-radius: 18px !important;
    border: 1px solid rgba(203,213,225,.86) !important;
    background: rgba(255,255,255,.94) !important;
    box-shadow: 0 14px 34px rgba(15,23,42,.045) !important;
  }

  .aci-home-root .aci-rail-card::before {
    display: none !important;
  }

  .aci-home-root .aci-popular-asks button,
  .aci-home-root .aci-help-list button {
    background: transparent !important;
    border-color: transparent !important;
  }

  .aci-home-root .aci-popular-asks button > span {
    background: #f1f5f9 !important;
    color: #475569 !important;
    border-color: rgba(203,213,225,.7) !important;
  }

  .aci-home-root .aci-rail-link,
  .aci-home-root .aci-save-compare {
    border-radius: 11px !important;
  }

  .aci-home-root .aci-v2-chatdock.is-desktop {
    width: min(640px, calc(100vw - 56px)) !important;
    bottom: calc(12px + env(safe-area-inset-bottom)) !important;
  }

  .aci-home-root .aci-v2-chatdock.is-desktop .aci-v2-chatbar {
    border: 1px solid rgba(203,213,225,.9) !important;
    box-shadow: 0 18px 42px rgba(15,23,42,.08) !important;
  }
}

/* ACI_HOME_REFERENCE_MATCH_END */


/* ACI_HOME_FINAL_REFERENCE_LOCK_START */

/* Remove mobile top search if any older patch left it behind */
.aci-home-root .mobile-top-search {
  display: none !important;
}

/* Premium ACI logo used only on this home screen */
.aci-home-root .aci-signature-logo {
  border: 0;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 13px;
  cursor: pointer;
  color: #071126;
  text-align: left;
}

.aci-home-root .aci-signature-mark {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  gap: 0;
  font-weight: 1000;
  letter-spacing: -0.16em;
  line-height: .78;
  font-size: 34px;
  color: #0b5cff;
  transform: skewX(-8deg);
  filter: drop-shadow(0 12px 18px rgba(11, 92, 255, .13));
}

.aci-home-root .aci-signature-mark::after {
  content: "";
  position: absolute;
  right: -8px;
  top: -5px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #0b5cff;
  box-shadow: 0 0 0 5px rgba(11, 92, 255, .12);
}

.aci-home-root .aci-signature-mark span:nth-child(2) {
  transform: translateX(-1px);
}

.aci-home-root .aci-signature-mark span:nth-child(3) {
  transform: translateX(-3px);
}

.aci-home-root .aci-signature-copy {
  display: grid;
  gap: 2px;
}

.aci-home-root .aci-signature-copy strong {
  color: #071126;
  font-size: 19px;
  line-height: 1;
  letter-spacing: .26em;
  font-weight: 900;
}

.aci-home-root .aci-signature-copy em {
  color: #64748b;
  font-style: normal;
  font-size: 9px;
  line-height: 1;
  letter-spacing: .24em;
  font-weight: 760;
}

.aci-home-root .aci-signature-logo.is-mobile .aci-signature-mark {
  font-size: 34px;
}

.aci-home-root .aci-signature-logo.is-mobile .aci-signature-copy strong {
  font-size: 18px;
}

.aci-home-root .aci-signature-logo.is-mobile .aci-signature-copy em {
  font-size: 8.5px;
}

/* Mobile final lock: no search bar, rest unchanged except requested sizing */
@media (max-width: 767px) {
  .aci-home-root .mobile-home-page {
    background:
      radial-gradient(circle at 50% 4%, rgba(248, 251, 255, .92), transparent 34%),
      linear-gradient(180deg, #ffffff 0%, #f8fbff 58%, #ffffff 100%) !important;
  }

  .aci-home-root .mobile-hero-copy button {
    font-size: 13.5px !important;
    font-weight: 730 !important;
    min-height: 48px !important;
  }

  .aci-home-root .mobile-shortcuts button span {
    font-size: 11.8px !important;
    line-height: 1.08 !important;
    font-weight: 720 !important;
    max-width: 78px;
    white-space: normal !important;
    text-align: left;
  }

  .aci-home-root .mobile-shortcuts button {
    align-items: center !important;
  }

  .aci-home-root .mobile-shortcuts button svg {
    stroke-width: 1.7 !important;
  }
}

/* Laptop right rail: match provided reference, not experimental rail */
@media (min-width: 768px) {
  .aci-home-root .reference-rail-card {
    border-radius: 18px !important;
    border: 1px solid rgba(203, 213, 225, .86) !important;
    background: rgba(255, 255, 255, .94) !important;
    box-shadow: 0 14px 34px rgba(15, 23, 42, .045) !important;
    overflow: hidden;
  }

  .aci-home-root .reference-rail-card::before,
  .aci-home-root .aci-rail-card::before {
    display: none !important;
  }

  .aci-home-root .reference-rail-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .aci-home-root .reference-rail-mini-icon {
    width: 24px;
    height: 24px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    color: #0b5cff;
    background: #eef5ff;
    border: 1px solid rgba(147, 197, 253, .55);
  }

  .aci-home-root .reference-rail-card h3 {
    margin: 0;
    color: #0f172a;
    font-size: 15px;
    line-height: 1.2;
    font-weight: 850;
    letter-spacing: -.02em;
  }

  .aci-home-root .reference-asks-list {
    display: grid;
    gap: 8px;
  }

  .aci-home-root .reference-asks-list button {
    width: 100%;
    min-height: 38px;
    border: 0;
    background: transparent;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) 14px;
    align-items: center;
    gap: 10px;
    padding: 5px 4px;
    color: #334155;
    text-align: left;
    cursor: pointer;
  }

  .aci-home-root .reference-asks-list button > span {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #f1f5f9;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
  }

  .aci-home-root .reference-asks-list button strong {
    color: #334155;
    font-size: 12px;
    line-height: 1.25;
    font-weight: 720;
  }

  .aci-home-root .reference-asks-list button svg {
    color: #94a3b8;
  }

  .aci-home-root .reference-rail-link,
  .aci-home-root .reference-save-compare {
    width: 100%;
    margin-top: 12px;
    min-height: 36px;
    border: 1px solid rgba(219, 234, 254, .92);
    border-radius: 11px;
    background: #f8fbff;
    color: #0b5cff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 800;
  }

  .aci-home-root .reference-rail-head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .aci-home-root .reference-rail-head-row button {
    border: 0;
    background: transparent;
    color: #0b5cff;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .aci-home-root .reference-saved-list {
    display: grid;
    gap: 9px;
  }

  .aci-home-root .reference-saved-list > button {
    border: 0;
    background: transparent;
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) 24px;
    align-items: center;
    gap: 10px;
    min-height: 54px;
    padding: 0;
    text-align: left;
    cursor: pointer;
  }

  .aci-home-root .reference-saved-list strong {
    display: block;
    color: #0f172a;
    font-size: 12px;
    font-weight: 780;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .aci-home-root .reference-saved-list em {
    display: block;
    color: #64748b;
    font-style: normal;
    font-size: 11px;
    margin-top: 2px;
  }

  .aci-home-root .reference-heart {
    display: grid;
    place-items: center;
    color: #94a3b8;
  }

  .aci-home-root .reference-heart.is-saved {
    color: #0b5cff;
  }

  .aci-home-root .reference-saved-empty {
    min-height: 74px;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    border-radius: 13px;
    background: #f8fbff;
    border: 1px dashed rgba(147, 197, 253, .62);
    padding: 12px;
  }

  .aci-home-root .reference-saved-empty > span {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: #0b5cff;
    background: #eef5ff;
  }

  .aci-home-root .reference-saved-empty strong {
    display: block;
    color: #0f172a;
    font-size: 12px;
    font-weight: 820;
  }

  .aci-home-root .reference-saved-empty p {
    margin: 3px 0 0;
    color: #64748b;
    font-size: 11px;
    line-height: 1.35;
  }

  .aci-home-root .reference-save-compare {
    background: #f8fbff !important;
    color: #0b5cff !important;
    box-shadow: none !important;
  }

  .aci-home-root .reference-help-card h3 {
    margin-bottom: 12px;
  }

  .aci-home-root .reference-help-list {
    display: grid;
    gap: 8px;
  }

  .aci-home-root .reference-help-list button {
    min-height: 27px;
    border: 0;
    background: transparent;
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 0;
    color: #334155;
    font-size: 12px;
    font-weight: 690;
    text-align: left;
    cursor: pointer;
  }

  .aci-home-root .reference-help-list svg {
    color: #64748b;
    stroke-width: 1.7;
  }

  .aci-home-root .reference-tour-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 64px;
    align-items: center;
    gap: 16px;
  }

  .aci-home-root .reference-tour-card p {
    margin: 7px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.38;
  }

  .aci-home-root .reference-tour-card button {
    margin-top: 12px;
    border: 0;
    background: transparent;
    color: #0b5cff;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    font-size: 12px;
    font-weight: 800;
  }

  .aci-home-root .reference-tour-map {
    width: 62px;
    height: 62px;
    border-radius: 20px;
    background:
      radial-gradient(circle at 50% 50%, rgba(11, 92, 255, .10), transparent 54%),
      #f5f8ff;
    color: #0b5cff;
    display: grid;
    place-items: center;
  }
}

/* ACI_HOME_FINAL_REFERENCE_LOCK_END */


/* ACI_HOME_FINAL_TIGHTENING_START */

/* More premium hero background, closer to the approved references */
.aci-home-root .mobile-hero,
.aci-home-root .desktop-hero {
  background:
    radial-gradient(circle at 18% 42%, rgba(219, 234, 254, .92), transparent 33%),
    radial-gradient(circle at 4% 12%, rgba(255, 255, 255, .96), transparent 24%),
    radial-gradient(circle at 92% 10%, rgba(11, 92, 255, .08), transparent 30%),
    linear-gradient(135deg, #ffffff 0%, #f4f8ff 48%, #ffffff 100%) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .96),
    0 18px 42px rgba(15, 23, 42, .065) !important;
}

/* Desktop: slightly tighter rhythm and less internal padding */
@media (min-width: 768px) {
  .aci-home-root .desktop-header {
    padding-top: 18px !important;
    padding-bottom: 12px !important;
  }

  .aci-home-root .desktop-home-page {
    padding-top: 0 !important;
  }

  .aci-home-root .desktop-home-layout {
    gap: 16px !important;
  }

  .aci-home-root .desktop-home-main {
    gap: 14px !important;
  }

  .aci-home-root .desktop-hero {
    padding: 30px 34px !important;
    border-radius: 22px !important;
  }

  .aci-home-root .desktop-prompt-grid {
    gap: 9px !important;
    margin-top: 18px !important;
  }

  .aci-home-root .desktop-prompt-grid button {
    min-height: 36px !important;
    padding: 0 13px !important;
  }

  .aci-home-root .desktop-quick-grid {
    gap: 10px !important;
    margin-top: 12px !important;
  }

  .aci-home-root .desktop-quick-grid button {
    min-height: 68px !important;
    padding: 12px 14px !important;
  }

  .aci-home-root .desktop-quick-grid button > span {
    width: 40px !important;
    height: 40px !important;
  }

  .aci-home-root .desktop-trending {
    margin-top: 12px !important;
    padding: 18px !important;
  }

  .aci-home-root .desktop-trending .section-head {
    margin-bottom: 12px !important;
  }

  .aci-home-root .desktop-trending .section-head h2 {
    font-size: 17px !important;
    letter-spacing: -0.025em !important;
  }

  .aci-home-root .desktop-trending-grid {
    gap: 12px !important;
  }

  .aci-home-root .desktop-right-rail,
  .aci-home-root .aci-reference-rail {
    gap: 12px !important;
  }

  .aci-home-root .reference-rail-card {
    padding: 18px !important;
  }
}

/* Mobile: final compacting only, no layout change */
@media (max-width: 767px) {
  .aci-home-root .mobile-home-page {
    padding-top: 22px !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
  }

  .aci-home-root .mobile-header {
    margin-bottom: 18px !important;
  }

  .aci-home-root .mobile-hero {
    min-height: 234px !important;
    padding: 20px 18px !important;
    margin-bottom: 16px !important;
    border-radius: 28px !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 39px !important;
    line-height: .94 !important;
  }

  .aci-home-root .mobile-hero-copy p {
    margin-top: 13px !important;
    font-size: 14px !important;
    line-height: 1.38 !important;
  }

  .aci-home-root .mobile-hero-copy button {
    margin-top: 15px !important;
    min-height: 44px !important;
    font-size: 12.8px !important;
    padding-left: 18px !important;
    padding-right: 18px !important;
  }

  .aci-home-root .mobile-hero-copy small {
    margin-top: 11px !important;
    font-size: 11.3px !important;
  }

  .aci-home-root .mobile-shortcuts {
    gap: 10px !important;
    margin-bottom: 18px !important;
  }

  .aci-home-root .mobile-shortcuts button {
    height: 68px !important;
    min-height: 68px !important;
    border-radius: 19px !important;
    padding: 10px 9px !important;
  }

  .aci-home-root .mobile-shortcuts button svg {
    width: 22px !important;
    height: 22px !important;
  }

  .aci-home-root .mobile-shortcuts button span {
    font-size: 11px !important;
    line-height: 1.05 !important;
    max-width: 74px !important;
  }

  .aci-home-root .mobile-section-head {
    margin-bottom: 11px !important;
  }

  .aci-home-root .mobile-section-head h2 {
    font-size: 24px !important;
    letter-spacing: -0.04em !important;
  }

  .aci-home-root .mobile-cars-grid {
    gap: 12px !important;
  }

  .aci-home-root .mobile-car-card,
  .aci-home-root .mobile-car-card-skeleton {
    border-radius: 22px !important;
  }

  .aci-home-root .mobile-car-card-skeleton {
    min-height: 222px !important;
  }

  .aci-home-root .mobile-car-card-skeleton .skeleton-car-visual {
    height: 82px !important;
  }
}

/* ACI_HOME_FINAL_TIGHTENING_END */


/* ACI_HOME_MOBILE_FINAL_FIX_START */

@media (max-width: 767px) {
  /* Tighter page rhythm */
  .aci-home-root .mobile-home-page {
    padding-top: 18px !important;
    padding-bottom: 98px !important;
    gap: 0 !important;
  }

  .aci-home-root .mobile-header {
    margin-bottom: 14px !important;
  }

  /* Hero: reduce dead space */
  .aci-home-root .mobile-hero {
    min-height: 208px !important;
    padding: 16px 16px 14px !important;
    margin-bottom: 12px !important;
    border-radius: 26px !important;
  }

  .aci-home-root .mobile-hero-copy h1 {
    font-size: 34px !important;
    line-height: .93 !important;
    letter-spacing: -0.05em !important;
    margin-bottom: 0 !important;
  }

  .aci-home-root .mobile-hero-copy p {
    margin-top: 8px !important;
    margin-bottom: 0 !important;
    font-size: 12.8px !important;
    line-height: 1.34 !important;
  }

  .aci-home-root .mobile-hero-copy button {
    margin-top: 12px !important;
    min-height: 40px !important;
    padding: 0 16px !important;
    font-size: 12px !important;
    line-height: 1.15 !important;
    border-radius: 999px !important;
  }

  .aci-home-root .mobile-hero-copy small {
    margin-top: 8px !important;
    font-size: 10.8px !important;
    line-height: 1.2 !important;
  }

  /* Shortcuts: reduce height and fix text clipping */
  .aci-home-root .mobile-shortcuts {
    gap: 8px !important;
    margin-bottom: 12px !important;
  }

  .aci-home-root .mobile-shortcuts button {
    min-height: 58px !important;
    height: 58px !important;
    padding: 8px 8px !important;
    border-radius: 18px !important;
    align-items: center !important;
    overflow: visible !important;
  }

  .aci-home-root .mobile-shortcuts button svg {
    width: 19px !important;
    height: 19px !important;
    stroke-width: 1.65 !important;
    flex: 0 0 auto !important;
  }

  .aci-home-root .mobile-shortcuts button span {
    font-size: 10.6px !important;
    line-height: 1.14 !important;
    font-weight: 720 !important;
    max-width: 72px !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow: visible !important;
    text-align: left !important;
    display: block !important;
  }

  /* Specifically prevent bottom clipping like the "g" in budget */
  .aci-home-root .mobile-shortcuts button span,
  .aci-home-root .mobile-hero-copy button {
    padding-bottom: 1px !important;
  }

  /* Trending section heading */
  .aci-home-root .mobile-section-head {
    margin: 0 2px 9px !important;
    align-items: center !important;
  }

  .aci-home-root .mobile-section-head h2 {
    font-size: 18px !important;
    line-height: 1.04 !important;
    letter-spacing: -0.03em !important;
    max-width: 220px !important;
  }

  /* Remove View all on mobile */
  .aci-home-root .mobile-section-head::after {
    display: none !important;
    content: none !important;
  }

  .aci-home-root .mobile-popular {
    margin-top: 0 !important;
  }

  .aci-home-root .mobile-cars-grid {
    gap: 10px !important;
  }

  .aci-home-root .mobile-car-card,
  .aci-home-root .mobile-car-card-skeleton {
    border-radius: 20px !important;
  }

  .aci-home-root .mobile-car-card-skeleton {
    min-height: 210px !important;
  }

  .aci-home-root .mobile-car-card-skeleton .skeleton-car-visual {
    height: 76px !important;
  }

  /* Dots / swipe markers */
  .aci-home-root .mobile-slider-dots,
  .aci-home-root .mobile-dots,
  .aci-home-root .car-slider-dots {
    margin-top: 10px !important;
    margin-bottom: 2px !important;
    display: flex !important;
    justify-content: center !important;
    gap: 6px !important;
  }

  .aci-home-root .mobile-slider-dots .dot,
  .aci-home-root .mobile-dots .dot,
  .aci-home-root .car-slider-dots .dot,
  .aci-home-root .dot {
    width: 6px !important;
    height: 6px !important;
    border-radius: 999px !important;
    background: #dbe3f0 !important;
    transform: none !important;
    opacity: 1 !important;
  }

  .aci-home-root .mobile-slider-dots .dot.active,
  .aci-home-root .mobile-dots .dot.active,
  .aci-home-root .car-slider-dots .dot.active,
  .aci-home-root .dot.active {
    width: 18px !important;
    background: #0b5cff !important;
  }
}

/* ACI_HOME_MOBILE_FINAL_FIX_END */


/* ACI_HOME_SPACE_UTILISATION_START */

/* Mobile: better use of vertical space and cleaner shortcut alignment */
@media (max-width: 767px) {
  .aci-home-root .mobile-shortcuts {
    margin-bottom: 18px !important;
    gap: 9px !important;
  }

  .aci-home-root .mobile-shortcuts button {
    height: 62px !important;
    min-height: 62px !important;
    padding: 9px 9px !important;
    display: grid !important;
    grid-template-columns: 20px minmax(0, 1fr) !important;
    align-items: center !important;
    justify-items: start !important;
    column-gap: 7px !important;
    row-gap: 0 !important;
  }

  .aci-home-root .mobile-shortcuts button svg {
    width: 23px !important;
    height: 23px !important;
    margin: 0 !important;
    justify-self: center !important;
  }

  .aci-home-root .mobile-shortcuts button span {
    max-width: 66px !important;
    font-size: 12px !important;
    line-height: 1.16 !important;
    text-align: left !important;
    display: block !important;
    overflow: visible !important;
    padding-bottom: 2px !important;
  }

  /* More intentional space between shortcuts and section title */
  .aci-home-root .mobile-section-head {
    margin-top: 4px !important;
    margin-bottom: 10px !important;
  }

  .aci-home-root .mobile-section-head h2 {
    font-size: 18px !important;
    max-width: none !important;
    white-space: nowrap !important;
  }

  /* Use the dead space above the composer by making the carousel area taller */
  .aci-home-root .mobile-cars-window {
    min-height: 252px !important;
  }

  .aci-home-root .mobile-cars-grid {
    align-items: stretch !important;
  }

  .aci-home-root .mobile-car-card,
  .aci-home-root .mobile-car-card-skeleton {
    min-height: 248px !important;
    height: 248px !important;
  }

  .aci-home-root .mobile-car-card-skeleton .skeleton-car-visual {
    height: 96px !important;
    width: min(92%, 220px) !important;
  }

  .aci-home-root .mobile-car-card-skeleton .skeleton-mobile-image {
    min-height: 126px !important;
  }

  .aci-home-root .mobile-car-card-skeleton .skeleton-mobile-meta {
    padding-top: 4px !important;
  }

  .aci-home-root .mobile-cars-dots,
  .aci-home-root .mobile-slider-dots,
  .aci-home-root .mobile-dots,
  .aci-home-root .car-slider-dots {
    margin-top: 9px !important;
    margin-bottom: 0 !important;
  }

  /* Keep the composer close to bottom without creating an extra empty band */
  .aci-home-root .aci-v2-chatdock {
    bottom: calc(8px + env(safe-area-inset-bottom)) !important;
  }
}

/* Laptop right rail: blue counters and checkmarks like the rest of the icon system */
@media (min-width: 768px) {
  .aci-home-root .reference-asks-list button > span,
  .aci-home-root .aci-popular-asks button > span {
    color: #0b5cff !important;
    background: #eef5ff !important;
    border: 1px solid rgba(147, 197, 253, .72) !important;
  }

  .aci-home-root .reference-help-list svg,
  .aci-home-root .aci-help-list button svg:first-child {
    color: #0b5cff !important;
    stroke: #0b5cff !important;
  }

  .aci-home-root .reference-asks-list button svg,
  .aci-home-root .aci-popular-asks button svg {
    color: #0b5cff !important;
    stroke: #0b5cff !important;
    opacity: .78;
  }
}

/* ACI_HOME_SPACE_UTILISATION_END */




/* ACI_HOME_DOT_CLASS_FIX_START */

@media (max-width: 767px) {
  .aci-home-root .mobile-cars-dots {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
  }

  .aci-home-root .mobile-cars-dots button {
    width: 6px !important;
    height: 6px !important;
    border: 0 !important;
    border-radius: 999px !important;
    background: #dbe3f0 !important;
    padding: 0 !important;
    opacity: 1 !important;
  }

  .aci-home-root .mobile-cars-dots button.is-active,
  .aci-home-root .mobile-cars-dots button.active {
    width: 18px !important;
    background: #0b5cff !important;
  }
}

/* ACI_HOME_DOT_CLASS_FIX_END */

      `}</style>
<DesktopHomePage data={safeData} onAction={onAction} savedIds={savedIds} onToggleSaved={onToggleSaved} />
      <MobileHomePage data={safeData} onAction={onAction} savedIds={savedIds} onToggleSaved={onToggleSaved} />
    </div>
  );
}
