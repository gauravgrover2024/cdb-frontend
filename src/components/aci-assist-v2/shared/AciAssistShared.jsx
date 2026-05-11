import React from "react";
import { motion } from "framer-motion";
import { Heart, Mic, SendHorizontal, Sparkles } from "lucide-react";
import CarImageStage from "./CarImageStage";
import { getDisplayCarImage, isUsableImageUrl } from "./aciV2Image";

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
    label: action?.label || action?.title || action?.query || "ACI Assist action",
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
      onClick={() => emitAciAction({ label: "Home", type: "go_home" }, onAction)}
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

export function AciAssistantOrb({ small = false }) {
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
          {!small ? <b className="orb-star">✦</b> : null}
        </div>
      </div>
    </div>
  );
}

export function AciVehiclePhoto({
  imageUrl,
  className = "",
  alt = "Vehicle",
  onError,
}) {
  if (!imageUrl) return null;

  return (
    <img
      src={imageUrl}
      alt={alt}
      onError={onError}
      className={`creta-photo vehicle-photo ${className}`}
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
          alt={vehicle.name || vehicle.displayName || vehicle.label || "Vehicle"}
          className={className}
          stageVariant={stageVariant}
          fallbackLabel={vehicle?.label || vehicle?.model || vehicle?.name || "CAR"}
        />
      );
    }

    return (
      <AciVehiclePhoto
        imageUrl={imageUrl}
        alt={vehicle.name || vehicle.displayName || vehicle.label || "Vehicle"}
        className={className}
        onError={() => setImageFailed(true)}
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
        fallbackLabel={vehicle?.label || vehicle?.model || vehicle?.name || "CAR"}
      />
    );
  }

  return (
    <AciCarVector
      type={vehicle?.bodyType || vehicle?.type || "sedan"}
      label={vehicle?.label || vehicle?.name || "CAR"}
      height={height}
      blue={Boolean(vehicle?.blue)}
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
      aria-label={saved ? `Remove ${vehicle?.displayName || vehicle?.name}` : `Save ${vehicle?.displayName || vehicle?.name}`}
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
}) {
  const finalPlaceholder =
    placeholder ||
    (mobile
      ? `Ask ACI Assist ${selectedVehicle?.model ? `about ${selectedVehicle.model}` : "anything"}...`
      : "Ask ACI Assist anything about new cars...");

  return (
    <motion.section
      className={`composer-dock ${mobile ? "mobile" : ""}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.22 }}
    >
      <div className="composer">
        <button
          type="button"
          className="composer-spark"
          onClick={() =>
            emitAciAction(
              {
                label: "Open assistant",
                query: "",
                type: "open_assistant",
                vehicle: selectedVehicle || null,
              },
              onAction,
            )
          }
          aria-label="Open assistant"
        >
          <Sparkles size={mobile ? 21 : 21} />
        </button>

        <input placeholder={finalPlaceholder} />

        <button
          type="button"
          className="composer-mic"
          onClick={() =>
            emitAciAction(
              {
                label: "Voice input",
                query: "",
                type: "voice_input",
                vehicle: selectedVehicle || null,
              },
              onAction,
            )
          }
          aria-label="Voice input"
        >
          <Mic size={mobile ? 24 : 20} />
        </button>

        <button
          type="button"
          className="composer-send"
          onClick={() =>
            emitAciAction(
              {
                label: "Send",
                query: "",
                type: "send",
                vehicle: selectedVehicle || null,
              },
              onAction,
            )
          }
          aria-label="Send"
        >
          <SendHorizontal size={mobile ? 23 : 22} />
        </button>
      </div>

      {!mobile ? (
        <p>
          ACI Assist can make mistakes. Please verify important information.
        </p>
      ) : null}
    </motion.section>
  );
}
