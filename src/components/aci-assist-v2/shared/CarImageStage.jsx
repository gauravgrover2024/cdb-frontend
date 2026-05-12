import React from "react";
import { isUsableImageUrl } from "./aciV2Image";

export default function CarImageStage({
  src = "",
  alt = "Vehicle",
  className = "",
  imageClassName = "",
  stageVariant = "default",
  fallbackLabel = "CAR",
  showGroundShadow = true,
  onImageReady,
}) {
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const hasImage = isUsableImageUrl(src) && !failed;

  React.useEffect(() => {
    setFailed(false);
    setLoading(true);
  }, [src]);

  React.useEffect(() => {
    if (!hasImage) onImageReady?.(false);
  }, [hasImage, onImageReady]);

  return (
    <div className={`aci-car-image-stage ${stageVariant} ${className}`.trim()}>
      <i className="aci-car-stage-glow" aria-hidden="true" />
      {showGroundShadow ? <i className="aci-car-stage-ground" aria-hidden="true" /> : null}

      {hasImage ? (
        <>
          {loading ? <i className="aci-car-stage-skeleton" aria-hidden="true" /> : null}
          <img
            src={src}
            alt={alt}
            className={`aci-car-stage-image ${imageClassName}`.trim()}
            onLoad={() => {
              setLoading(false);
              onImageReady?.(true);
            }}
            onError={() => {
              setFailed(true);
              setLoading(false);
              onImageReady?.(false);
            }}
            draggable="false"
          />
        </>
      ) : (
        <div className="aci-car-stage-fallback text-only" role="img" aria-label={alt}>
          <span>{String(fallbackLabel || "IMAGE NOT AVAILABLE").slice(0, 24).toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
