import React from "react";
import { Car } from "lucide-react";

const isUsableImageUrl = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^data:image\//i.test(text)) return true;
  if (/^(https?:)?\/\//i.test(text)) return true;
  if (text.startsWith("/")) return true;
  return false;
};

export default function CarImageStage({
  src = "",
  alt = "Vehicle",
  className = "",
  imageClassName = "",
  stageVariant = "default",
  fallbackLabel = "CAR",
  showGroundShadow = true,
}) {
  const [failed, setFailed] = React.useState(false);
  const hasImage = isUsableImageUrl(src) && !failed;

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className={`aci-car-image-stage ${stageVariant} ${className}`.trim()}>
      <i className="aci-car-stage-glow" aria-hidden="true" />
      {showGroundShadow ? <i className="aci-car-stage-ground" aria-hidden="true" /> : null}

      {hasImage ? (
        <img
          src={src}
          alt={alt}
          className={`aci-car-stage-image ${imageClassName}`.trim()}
          onError={() => setFailed(true)}
          draggable="false"
        />
      ) : (
        <div className="aci-car-stage-fallback" role="img" aria-label={alt}>
          <Car size={34} strokeWidth={1.6} />
          <span>{String(fallbackLabel || "CAR").slice(0, 12).toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
