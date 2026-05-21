import React from "react";
import { motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import CarImageStage from "./CarImageStage";
import { getDisplayCarImage, isUsableImageUrl } from "./aciV2Image";
import AciV2StickyChatBar from "./AciV2StickyChatBar";

export const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
  },
};

export const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

export function normalizeAciAction(action, extra = {}) {
  if (typeof action === "string") {
    return {
      id: action.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: action,
      query: action,
      type: "ask",
      ...extra,
    };
  }

  return {
    id:
      action?.id ||
      String(action?.label || action?.query || "aci-action")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
    label:
      action?.label || action?.title || action?.query || "ACI Assist action",
    query: action?.query || action?.label || action?.title || "",
    type: action?.type || "ask",
    intent: action?.intent || "",
    canvasType: action?.canvasType || "",
    inlineType: action?.inlineType || "",
    tone: action?.tone || "",
    vehicle: action?.vehicle || null,
    contextPatch: action?.contextPatch || {},
    payload: action?.payload || {},
    ...action,
    ...extra,
  };
}

export function emitAciAction(action, onAction, extra = {}) {
  const detail = normalizeAciAction(action, extra);

  if (typeof onAction === "function") {
    onAction(detail);
  } else if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("aci-assist-click", {
        detail,
      }),
    );
  }

  return detail;
}

export function AciLogo({ mobile = false, compact = false, onAction }) {
  return (
    <motion.button
      type="button"
      className={`aci-logo ${mobile ? "mobile" : ""} ${
        compact ? "compact" : ""
      }`}
      onClick={() =>
        emitAciAction({ label: "Home", type: "go_home" }, onAction)
      }
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="aci-mark">ACI</span>

      <span className="aci-logo-copy">
        <strong>ASSIST</strong>
        {!compact ? <em>One bot solution</em> : null}
      </span>

      {!mobile ? <Sparkles size={13} /> : null}
    </motion.button>
  );
}

/* -------------------------------------------------------------------------- */
/* ACI PREMIUM ORB - SINGLE FILE VERSION                                      */
/* -------------------------------------------------------------------------- */


const ACI_PREMIUM_ORB_CSS = `
.aci-ref-orb {
  position: relative;
  width: var(--orb-w);
  height: var(--orb-h);
  min-width: var(--orb-w);
  min-height: var(--orb-h);
  display: grid;
  place-items: center;
  overflow: visible;
  pointer-events: none;
  isolation: isolate;
}

.aci-ref-orb svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.aci-ref-orb__orbit-one {
  transform-origin: 500px 325px;
  animation: aciRefOrbitOne var(--orbit-duration) linear infinite;
}

.aci-ref-orb__orbit-two {
  transform-origin: 500px 325px;
  animation: aciRefOrbitTwo calc(var(--orbit-duration) * 1.18) linear infinite;
}

.aci-ref-orb__orbit-three {
  transform-origin: 500px 325px;
  animation: aciRefOrbitThree calc(var(--orbit-duration) * 1.34) linear infinite reverse;
}

.aci-ref-orb__particle {
  animation: aciRefParticle 3.8s ease-in-out infinite;
  transform-origin: center;
}

.aci-ref-orb__p1 { animation-delay: 0s; }
.aci-ref-orb__p2 { animation-delay: .35s; }
.aci-ref-orb__p3 { animation-delay: .75s; }

.aci-ref-orb__core {
  transform-origin: 500px 325px;
}

.aci-ref-orb.is-thinking .aci-ref-orb__core {
  animation: aciRefThink 2.2s ease-in-out infinite;
}

.aci-ref-orb.is-speaking .aci-ref-orb__core {
  animation: aciRefSpeak 2.6s ease-in-out infinite;
}

.aci-ref-orb__star {
  transform-box: fill-box;
  transform-origin: center center;
  animation: aciRefStarPulse 1.85s ease-in-out infinite;
}

.aci-ref-orb__eyes {
  transform-box: fill-box;
  transform-origin: 50% 78%;
  animation: aciRefEyesTripleBlinkLoop 5.6s ease-in-out infinite;
}

.aci-ref-orb__floor {
  animation: aciRefFloor 5.6s ease-in-out infinite;
  transform-origin: center;
}

@keyframes aciRefOrbitOne {
  from { transform: rotate(-8deg); }
  to { transform: rotate(352deg); }
}

@keyframes aciRefOrbitTwo {
  from { transform: rotate(27deg); }
  to { transform: rotate(387deg); }
}

@keyframes aciRefOrbitThree {
  from { transform: rotate(105deg); }
  to { transform: rotate(465deg); }
}

@keyframes aciRefParticle {
  0%, 100% {
    opacity: .45;
    transform: translateY(0) scale(.92);
  }
  50% {
    opacity: 1;
    transform: translateY(-8px) scale(1.12);
  }
}

@keyframes aciRefFloor {
  0%, 100% {
    opacity: .42;
    transform: scaleX(.88);
  }
  50% {
    opacity: .72;
    transform: scaleX(1.05);
  }
}

@keyframes aciRefStar {
  0%, 100% {
    transform: scale(.96);
    opacity: .88;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

@keyframes aciRefEyesTripleBlinkLoop {
  0%,
  52% {
    transform: scaleY(1);
    opacity: 1;
  }

  /* blink 1 */
  56% {
    transform: scaleY(0.08);
    opacity: 0.42;
  }

  60% {
    transform: scaleY(1);
    opacity: 1;
  }

  /* blink 2 */
  66% {
    transform: scaleY(1);
    opacity: 1;
  }

  69% {
    transform: scaleY(0.08);
    opacity: 0.42;
  }

  73% {
    transform: scaleY(1);
    opacity: 1;
  }

  /* blink 3 */
  79% {
    transform: scaleY(1);
    opacity: 1;
  }

  82% {
    transform: scaleY(0.08);
    opacity: 0.42;
  }

  87%,
  100% {
    transform: scaleY(1);
    opacity: 1;
  }
}

@keyframes aciRefStarPulse {
  0%,
  100% {
    transform: scale(0.9);
    opacity: 0.78;
  }

  38% {
    transform: scale(1.22);
    opacity: 1;
  }

  58% {
    transform: scale(1.04);
    opacity: 0.94;
  }
}

@keyframes aciRefStarPulse {
  0%,
  100% {
    transform: scale(0.9);
    opacity: 0.78;
  }

  38% {
    transform: scale(1.22);
    opacity: 1;
  }

  58% {
    transform: scale(1.04);
    opacity: 0.94;
  }
}

@keyframes aciRefThink {
  0%, 100% { transform: rotate(0deg) scale(1); }
  35% { transform: rotate(1deg) scale(1.012); }
  70% { transform: rotate(-.8deg) scale(.996); }
}

@keyframes aciRefSpeak {
  0%, 100% { transform: rotate(0deg) scale(1); }
  40% { transform: rotate(-.8deg) scale(1.018); }
  72% { transform: rotate(.8deg) scale(1.006); }
}
`;

function AciPremiumOrbInlineStyles() {
  return <style>{ACI_PREMIUM_ORB_CSS}</style>;
}

const ACI_PREMIUM_ORB_SIZES = {
  hero: {
    width: 420,
    height: 330,
  },
  chat: {
    width: 96,
    height: 76,
  },
  compact: {
    width: 58,
    height: 46,
  },
};

const ACI_PREMIUM_ORB_STATE = {
  idle: {
    floatDuration: 6.4,
    orbitDuration: 15,
  },
  thinking: {
    floatDuration: 3.2,
    orbitDuration: 7,
  },
  speaking: {
    floatDuration: 2.8,
    orbitDuration: 8,
  },
  listening: {
    floatDuration: 3.8,
    orbitDuration: 9,
  },
};

export function AciPremiumOrb({
  size = "hero",
  state = "idle",
  className = "",
  style,
  showLabel = true,
  "aria-label": ariaLabel,
}) {
  const safeSize = ACI_PREMIUM_ORB_SIZES[size] ? size : "hero";
  const safeState = ACI_PREMIUM_ORB_STATE[state] ? state : "idle";
  const dims = ACI_PREMIUM_ORB_SIZES[safeSize];
  const mood = ACI_PREMIUM_ORB_STATE[safeState];
  const isHero = safeSize === "hero";
  const uid = React.useId().replace(/:/g, "");
  const showCaption = showLabel && isHero;

  return (
    <>
      <AciPremiumOrbInlineStyles />

      <motion.div
        className={`aci-ref-orb premium-${safeSize} is-${safeState} ${className}`}
        role="img"
        aria-label={ariaLabel || `ACI Assist ${safeState} premium orb`}
        initial={false}
        animate={{
          y: isHero ? [0, -6, 0] : [0, -2, 0],
          scale:
            safeState === "thinking"
              ? [1, 1.018, 0.998, 1.01, 1]
              : safeState === "speaking"
                ? [1, 1.025, 1.005, 1.03, 1]
                : [1, 1.01, 1],
        }}
        transition={{
          y: {
            duration: mood.floatDuration,
            repeat: Infinity,
            ease: "easeInOut",
          },
          scale: {
            duration: mood.floatDuration * 0.9,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        style={{
          "--orb-w": `${dims.width}px`,
          "--orb-h": `${dims.height}px`,
          "--orbit-duration": `${mood.orbitDuration}s`,
          ...style,
        }}
      >
        <svg
          viewBox="0 0 1000 760"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`bgWash-${uid}`} cx="50%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="38%" stopColor="#f4f8ff" stopOpacity=".88" />
              <stop offset="68%" stopColor="#dce9ff" stopOpacity=".34" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            <radialGradient id={`floorGlow-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1384ff" stopOpacity=".72" />
              <stop offset="42%" stopColor="#79bdff" stopOpacity=".28" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            <radialGradient id={`glassFill-${uid}`} cx="43%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity=".68" />
              <stop offset="25%" stopColor="#f7fbff" stopOpacity=".42" />
              <stop offset="48%" stopColor="#dcecff" stopOpacity=".24" />
              <stop offset="68%" stopColor="#9ec8ff" stopOpacity=".13" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity=".035" />
            </radialGradient>

            <radialGradient id={`glassRim-${uid}`} cx="44%" cy="28%" r="76%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity=".95" />
              <stop offset="42%" stopColor="#ffffff" stopOpacity=".34" />
              <stop offset="72%" stopColor="#91c4ff" stopOpacity=".2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity=".75" />
            </radialGradient>

            <linearGradient
              id={`glassSheen-${uid}`}
              x1="250"
              y1="80"
              x2="650"
              y2="360"
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity=".95" />
              <stop offset="38%" stopColor="#ffffff" stopOpacity=".42" />
              <stop offset="68%" stopColor="#ffffff" stopOpacity=".08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <radialGradient id={`coreFill-${uid}`} cx="50%" cy="42%" r="62%">
              <stop offset="0%" stopColor="#09205a" />
              <stop offset="28%" stopColor="#061844" />
              <stop offset="55%" stopColor="#031032" />
              <stop offset="78%" stopColor="#01091f" />
              <stop offset="100%" stopColor="#00030a" />
            </radialGradient>

            <radialGradient
              id={`coreDeepShade-${uid}`}
              cx="72%"
              cy="44%"
              r="58%"
            >
              <stop offset="0%" stopColor="#00184b" stopOpacity=".42" />
              <stop offset="45%" stopColor="#000b26" stopOpacity=".48" />
              <stop offset="100%" stopColor="#00030a" stopOpacity=".92" />
            </radialGradient>

            <radialGradient
              id={`coreBottomBlue-${uid}`}
              cx="50%"
              cy="88%"
              r="50%"
            >
              <stop offset="0%" stopColor="#136fff" stopOpacity=".34" />
              <stop offset="38%" stopColor="#063a9c" stopOpacity=".18" />
              <stop offset="100%" stopColor="#001033" stopOpacity="0" />
            </radialGradient>

            <linearGradient
              id={`coreSideShade-${uid}`}
              x1="18%"
              y1="12%"
              x2="86%"
              y2="92%"
            >
              <stop offset="0%" stopColor="#173a7a" stopOpacity=".16" />
              <stop offset="42%" stopColor="#061638" stopOpacity=".12" />
              <stop offset="100%" stopColor="#00030a" stopOpacity=".78" />
            </linearGradient>

            <radialGradient id={`coreBlue-${uid}`} cx="48%" cy="78%" r="54%">
              <stop offset="0%" stopColor="#1b5fd6" stopOpacity=".22" />
              <stop offset="42%" stopColor="#0b2f88" stopOpacity=".10" />
              <stop offset="100%" stopColor="#001033" stopOpacity="0" />
            </radialGradient>

            <linearGradient
              id={`coreGloss-${uid}`}
              x1="250"
              y1="95"
              x2="650"
              y2="390"
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity=".92" />
              <stop offset="42%" stopColor="#ffffff" stopOpacity=".34" />
              <stop offset="72%" stopColor="#ffffff" stopOpacity=".06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <linearGradient
              id={`eyeGrad-${uid}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#9ff6ff" />
              <stop offset="30%" stopColor="#54cfff" />
              <stop offset="68%" stopColor="#126dff" />
              <stop offset="100%" stopColor="#003fd6" />
            </linearGradient>

            <linearGradient
              id={`orbitBlue-${uid}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#2f7dff" stopOpacity=".1" />
              <stop offset="22%" stopColor="#85b9ff" stopOpacity=".48" />
              <stop offset="58%" stopColor="#246cff" stopOpacity=".56" />
              <stop offset="100%" stopColor="#8bc4ff" stopOpacity=".18" />
            </linearGradient>

            <linearGradient
              id={`orbitWarm-${uid}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#f0bc7c" stopOpacity=".12" />
              <stop offset="40%" stopColor="#8db8ff" stopOpacity=".32" />
              <stop offset="78%" stopColor="#f0bc7c" stopOpacity=".24" />
              <stop offset="100%" stopColor="#8db8ff" stopOpacity=".08" />
            </linearGradient>

            <filter
              id={`softBlur-${uid}`}
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="14" />
            </filter>

            <filter
              id={`eyeGlow-${uid}`}
              x="-120%"
              y="-120%"
              width="340%"
              height="340%"
            >
              <feGaussianBlur stdDeviation="3.1 0.28" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="
                  0 0 0 0 0.08
                  0 0 0 0 0.55
                  0 0 0 0 1
                  0 0 0 .72 0"
                result="blueBlur"
              />
              <feMerge>
                <feMergeNode in="blueBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`starGlow-${uid}`}
              x="-140%"
              y="-140%"
              width="380%"
              height="380%"
            >
              <feGaussianBlur stdDeviation="5" result="blur1" />
              <feGaussianBlur stdDeviation="5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <clipPath id={`coreClip-${uid}`}>
              <circle cx="500" cy="325" r="198" />
            </clipPath>

            <clipPath id={`glassClip-${uid}`}>
              <circle cx="500" cy="325" r="278" />
            </clipPath>
          </defs>

          {/* background atmosphere */}
          <ellipse
            cx="500"
            cy="315"
            rx="430"
            ry="350"
            fill={`url(#bgWash-${uid})`}
            opacity=".92"
          />

          {/* floor glow */}
          <ellipse
            className="aci-ref-orb__floor"
            cx="500"
            cy="642"
            rx="235"
            ry="38"
            fill={`url(#floorGlow-${uid})`}
            filter={`url(#softBlur-${uid})`}
          />

          {/* rear orbit lines */}
          <g opacity=".9">
            <g className="aci-ref-orb__orbit-one">
              <ellipse
                cx="500"
                cy="325"
                rx="392"
                ry="96"
                fill="none"
                stroke={`url(#orbitBlue-${uid})`}
                strokeWidth="1.8"
                transform="rotate(-8 500 325)"
              />

              <circle
                cx="886"
                cy="276"
                r="9"
                fill="#dff5ff"
                stroke="#4e9cff"
                strokeWidth="1.7"
                filter={`url(#eyeGlow-${uid})`}
              />
            </g>

            <g className="aci-ref-orb__orbit-two">
              <ellipse
                cx="500"
                cy="325"
                rx="412"
                ry="124"
                fill="none"
                stroke={`url(#orbitBlue-${uid})`}
                strokeWidth="1.5"
                transform="rotate(22 500 325)"
              />

              <circle
                cx="118"
                cy="340"
                r="9"
                fill="#dff5ff"
                stroke="#4e9cff"
                strokeWidth="1.7"
                filter={`url(#eyeGlow-${uid})`}
              />
            </g>

            <g className="aci-ref-orb__orbit-three">
              <ellipse
                cx="500"
                cy="325"
                rx="402"
                ry="154"
                fill="none"
                stroke={`url(#orbitWarm-${uid})`}
                strokeWidth="1.2"
                transform="rotate(-24 500 325)"
              />

              <circle
                cx="790"
                cy="574"
                r="8"
                fill="#e9f8ff"
                stroke="#5aa3ff"
                strokeWidth="1.5"
                filter={`url(#eyeGlow-${uid})`}
              />
            </g>
          </g>

          {/* glass shell */}
          <g clipPath={`url(#glassClip-${uid})`}>
            <circle cx="500" cy="325" r="278" fill={`url(#glassFill-${uid})`} />

            {/* top-left glass reflection */}
            <ellipse
              cx="385"
              cy="170"
              rx="225"
              ry="82"
              fill={`url(#glassSheen-${uid})`}
              opacity=".76"
              transform="rotate(-24 385 170)"
            />

            {/* inner curved glass reflections */}
            <path
              d="M278 234 C350 135 535 104 680 174"
              fill="none"
              stroke="#ffffff"
              strokeOpacity=".22"
              strokeWidth="18"
              strokeLinecap="round"
            />

            <path
              d="M720 160 C792 270 792 408 720 522"
              fill="none"
              stroke="#ffffff"
              strokeOpacity=".18"
              strokeWidth="24"
              strokeLinecap="round"
            />

            <path
              d="M295 510 C382 624 612 650 724 520"
              fill="none"
              stroke="#ffffff"
              strokeOpacity=".18"
              strokeWidth="28"
              strokeLinecap="round"
            />

            {/* subtle blue inner rim */}
            <circle
              cx="500"
              cy="325"
              r="258"
              fill="none"
              stroke="#7db9ff"
              strokeOpacity=".18"
              strokeWidth="10"
            />
          </g>

          <circle
            cx="500"
            cy="325"
            r="278"
            fill="none"
            stroke={`url(#glassRim-${uid})`}
            strokeWidth="5"
            opacity=".82"
          />

          <circle
            cx="500"
            cy="325"
            r="292"
            fill="none"
            stroke="#ffffff"
            strokeOpacity=".76"
            strokeWidth="2.6"
          />

          <circle
            cx="500"
            cy="325"
            r="278"
            fill="none"
            stroke={`url(#glassRim-${uid})`}
            strokeWidth="4"
            opacity=".72"
          />

          <circle
            cx="500"
            cy="325"
            r="292"
            fill="none"
            stroke="#ffffff"
            strokeOpacity=".72"
            strokeWidth="2.3"
          />

          {/* core ball */}
          <g className="aci-ref-orb__core">
            <circle
              cx="500"
              cy="325"
              r="198"
              fill={`url(#coreFill-${uid})`}
              stroke="#2d6fe8"
              strokeOpacity=".5"
              strokeWidth="2.2"
            />

            <circle
              cx="500"
              cy="325"
              r="198"
              fill={`url(#coreDeepShade-${uid})`}
              opacity=".86"
            />

            <circle
              cx="500"
              cy="325"
              r="198"
              fill={`url(#coreSideShade-${uid})`}
              opacity=".72"
            />

            <circle
              cx="500"
              cy="325"
              r="198"
              fill={`url(#coreBottomBlue-${uid})`}
              opacity=".75"
            />

            <g clipPath={`url(#coreClip-${uid})`}>
              <ellipse
                cx="405"
                cy="182"
                rx="184"
                ry="82"
                fill={`url(#coreGloss-${uid})`}
                opacity=".43"
                transform="rotate(-22 405 182)"
              />

              <path
                d="M250 513 C365 603 575 626 735 470"
                fill="none"
                stroke="#2385ff"
                strokeOpacity=".26"
                strokeWidth="22"
              />

              <path
                d="M303 526 C410 608 590 610 705 508"
                fill="none"
                stroke="#62bdff"
                strokeOpacity=".22"
                strokeWidth="10"
              />
            </g>

            <g className="aci-ref-orb__eyes">
              {/* left eye - thin diya arch */}
              <path
                d="M354 394
       C376 330 456 330 478 394
       C454 339 378 339 354 394 Z"
                fill={`url(#eyeGrad-${uid})`}
                filter={`url(#eyeGlow-${uid})`}
                opacity=".98"
              />

              {/* right eye - thin diya arch */}
              <path
                d="M522 394
       C544 330 624 330 646 394
       C622 339 546 339 522 394 Z"
                fill={`url(#eyeGrad-${uid})`}
                filter={`url(#eyeGlow-${uid})`}
                opacity=".98"
              />

              {/* left eye highlight */}
              <path
                d="M360 387
       C382 342 450 342 472 387"
                fill="none"
                stroke="#dcfdff"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity=".72"
              />

              {/* right eye highlight */}
              <path
                d="M528 387
       C550 342 618 342 640 387"
                fill="none"
                stroke="#dcfdff"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity=".72"
              />
            </g>
            {/* star */}
            <path
              className="aci-ref-orb__star"
              d="M500 401
     C501.5 407 502.6 409.2 504.9 411.1
     C507 413 510.1 413.9 515.9 415.2
     C510.1 416.5 507 417.4 504.9 419.3
     C502.6 421.2 501.5 423.4 500 429
     C498.5 423.4 497.4 421.2 495.1 419.3
     C493 417.4 489.9 416.5 484.1 415.2
     C489.9 413.9 493 413 495.1 411.1
     C497.4 409.2 498.5 407 500 401 Z"
              fill="#fffdf7"
              filter={`url(#starGlow-${uid})`}
            />
          </g>

          {/* front orbit streaks */}
          <path
            d="M210 505 C380 458 620 462 800 518"
            fill="none"
            stroke="#277bff"
            strokeOpacity=".34"
            strokeWidth="1.4"
          />

          <path
            d="M220 526 C390 564 610 558 790 446"
            fill="none"
            stroke="#ffffff"
            strokeOpacity=".48"
            strokeWidth="1.25"
          />

          {isHero ? (
            <>
              <circle
                className="aci-ref-orb__particle aci-ref-orb__p1"
                cx="92"
                cy="350"
                r="6"
                fill="#8fcfff"
                stroke="#3d91ff"
                strokeWidth="1.5"
                filter={`url(#eyeGlow-${uid})`}
              />
              <circle
                className="aci-ref-orb__particle aci-ref-orb__p2"
                cx="880"
                cy="352"
                r="5"
                fill="#8fcfff"
                stroke="#3d91ff"
                strokeWidth="1.4"
                filter={`url(#eyeGlow-${uid})`}
              />
              <circle
                className="aci-ref-orb__particle aci-ref-orb__p3"
                cx="300"
                cy="420"
                r="4"
                fill="#8fcfff"
                stroke="#3d91ff"
                strokeWidth="1.2"
                filter={`url(#eyeGlow-${uid})`}
              />
            </>
          ) : null}

          {showCaption ? (
            <text
              x="500"
              y="725"
              textAnchor="middle"
              fontSize="23"
              letterSpacing="7"
              fill="#1f335f"
              fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
            >
              ACI Assist <tspan fill="#2d7dff">Premium Orb</tspan>
            </text>
          ) : null}
        </svg>
      </motion.div>
    </>
  );
}

export function AciAssistantOrb({
  small = false,
  state = "idle",
  size,
  className = "",
  style,
}) {
  return (
    <AciPremiumOrb
      size={size || (small ? "compact" : "hero")}
      state={state}
      className={className}
      style={style}
      showLabel={false}
    />
  );
}
/* REST OF YOUR ORIGINAL FILE                                                 */
/* -------------------------------------------------------------------------- */

export function AciVehiclePhoto({
  imageUrl,
  className = "",
  alt = "Vehicle",
  loading = "lazy",
  fetchPriority = "auto",
  onError,
  onLoad,
}) {
  if (!imageUrl) return null;

  return (
    <img
      src={imageUrl}
      alt={alt}
      onLoad={onLoad}
      onError={onError}
      className={`creta-photo vehicle-photo ${className}`}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      draggable="false"
    />
  );
}

export function AciCarVector({
  type = "sedan",
  label = "CAR",
  height = 120,
  blue = false,
}) {
  const id = React.useId().replace(/:/g, "");
  const body = blue ? "#173a7a" : type === "suv" ? "#1f2937" : "#374151";
  const mid = blue ? "#1d4ed8" : type === "suv" ? "#4b5563" : "#6b7280";

  return (
    <svg
      viewBox="0 0 420 190"
      width="100%"
      height={height}
      className="car-vector"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={`body-${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor={body} />
          <stop offset="58%" stopColor={mid} />
          <stop offset="100%" stopColor={body} />
        </linearGradient>

        <linearGradient id={`glass-${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      <ellipse cx="210" cy="160" rx="142" ry="18" fill="rgba(15,23,42,0.13)" />

      {type === "suv" || type === "creta" ? (
        <>
          <path
            d="M48 132 L72 96 Q91 67 127 67 L224 64 Q262 64 290 86 L335 110 Q351 119 361 134 L367 143 L47 143 Z"
            fill={`url(#body-${id})`}
          />
          <path
            d="M119 73 L226 70 Q259 70 281 87 L305 108 L91 108 Z"
            fill={`url(#glass-${id})`}
          />
        </>
      ) : (
        <>
          <path
            d="M56 131 L81 99 Q100 74 139 72 L217 68 Q248 68 274 86 L317 113 Q334 123 344 134 L350 143 L54 143 Z"
            fill={`url(#body-${id})`}
          />
          <path
            d="M132 77 L211 73 Q241 73 263 87 L287 106 L106 106 Z"
            fill={`url(#glass-${id})`}
          />
        </>
      )}

      <rect x="176" y="124" width="72" height="19" rx="6" fill="#f8fafc" />

      <text
        x="212"
        y="137"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#0f172a"
      >
        {label}
      </text>

      <circle cx="124" cy="141" r="27" fill="#0f172a" />
      <circle cx="124" cy="141" r="14" fill="#cbd5e1" />
      <circle cx="303" cy="141" r="27" fill="#0f172a" />
      <circle cx="303" cy="141" r="14" fill="#cbd5e1" />
    </svg>
  );
}

export function AciVehicleVisual({
  vehicle,
  height = 120,
  className = "",
  stage = false,
  stageVariant = "default",
  loading = "lazy",
  fetchPriority = "auto",
  onImageReady,
}) {
  const imageUrl = getDisplayCarImage(vehicle);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (isUsableImageUrl(imageUrl) && !imageFailed) {
    if (stage) {
      return (
        <CarImageStage
          src={imageUrl}
          alt={
            vehicle.name || vehicle.displayName || vehicle.label || "Vehicle"
          }
          className={className}
          stageVariant={stageVariant}
          fallbackLabel={
            vehicle?.label || vehicle?.model || vehicle?.name || "CAR"
          }
          loading={loading}
          fetchPriority={fetchPriority}
          onImageReady={onImageReady}
        />
      );
    }

    return (
      <AciVehiclePhoto
        imageUrl={imageUrl}
        alt={vehicle.name || vehicle.displayName || vehicle.label || "Vehicle"}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        onLoad={() => onImageReady?.(true)}
        onError={() => {
          setImageFailed(true);
          onImageReady?.(false);
        }}
      />
    );
  }

  if (stage) {
    return (
      <CarImageStage
        src=""
        alt={vehicle.name || vehicle.displayName || vehicle.label || "Vehicle"}
        className={className}
        stageVariant={stageVariant}
        fallbackLabel={
          vehicle?.label || vehicle?.model || vehicle?.name || "CAR"
        }
        onImageReady={onImageReady}
      />
    );
  }

  return (
    <CarImageStage
      src=""
      alt={vehicle?.name || vehicle?.displayName || vehicle?.label || "Vehicle"}
      className={className}
      stageVariant={stage ? stageVariant : "compact"}
      fallbackLabel={vehicle?.label || vehicle?.model || vehicle?.name || "CAR"}
      showGroundShadow={!stage}
      onImageReady={onImageReady}
    />
  );
}

export function AciSavedButton({
  vehicle,
  saved = false,
  onToggleSaved,
  className = "",
  size = 20,
}) {
  return (
    <button
      type="button"
      className={`${className} ${saved ? "is-saved" : ""}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggleSaved?.(vehicle);
      }}
      aria-label={
        saved
          ? `Remove ${vehicle?.displayName || vehicle?.name}`
          : `Save ${vehicle?.displayName || vehicle?.name}`
      }
      aria-pressed={saved}
    >
      <Heart size={size} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function AciComposer({
  mobile = false,
  onAction,
  placeholder,
  selectedVehicle,
  className = "",
  disabled = false,
  showDisclaimer = false,
}) {
  return (
    <AciV2StickyChatBar
      mobile={mobile}
      onAction={onAction}
      placeholder={placeholder}
      selectedVehicle={selectedVehicle}
      className={className}
      disabled={disabled}
      showDisclaimer={showDisclaimer}
    />
  );
}
