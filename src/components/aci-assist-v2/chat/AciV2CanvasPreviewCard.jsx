import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { AciVehicleVisual } from "../shared/AciAssistShared";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";
import AciV2QuestionIcon from "./AciV2QuestionIcon";
import {
  buildChatImageFrameStyle,
  buildChatSuggestions,
  buildInlineColorFrameStyle,
  canvasTypeLabel,
  firstValue,
  formatFeaturePreviewPrice,
  formatIndianPrice,
  getFeaturePreviewRows,
  getWidgetRows,
  isFeatureCanvasWidget,
  toArray,
} from "./aciV2ChatWidgetUtils";

const pickText = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
};

const pickAny = (...values) =>
  values.find((value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  }) || null;

const isColorCanvas = (widget = {}, canvasType = "") =>
  widget?.type === "vehicle_colors" ||
  widget?.tool === "vehicle_colors" ||
  widget?.toolName === "vehicle_colors" ||
  widget?.tool_name === "vehicle_colors" ||
  widget?.canvasType === "color_studio_canvas" ||
  widget?.canvasType === "colors_canvas" ||
  widget?.canvasType === "vehicle_colors" ||
  canvasType === "color_studio_canvas" ||
  canvasType === "colors_canvas" ||
  canvasType === "vehicle_colors";

const getCanvasRows = ({ widget, canvasType, isColorResult, isFeatureResult }) => {
  if (isColorResult) {
    return toArray(widget.colors || widget.rows || widget.items || widget.records).slice(0, 3);
  }

  if (isFeatureResult) {
    return getFeaturePreviewRows(widget, canvasType);
  }

  return getWidgetRows(widget);
};

export default function AciV2CanvasPreviewCard({
  message = {},
  selectedVehicle,
  onAction,
  onOpen,
}) {
  const widget = message.widget || {};
  const canvasType =
    message.canvasType || widget.canvasType || widget.__rawCanvasType || "";
  const isColorResult = isColorCanvas(widget, canvasType);
  const isFeatureResult = isFeatureCanvasWidget(widget, canvasType);
  const rows = getCanvasRows({
    widget,
    canvasType,
    isColorResult,
    isFeatureResult,
  });
  const hasCanvas = Boolean(canvasType);
  const openCanvasLabel =
    canvasType === "pricelist_canvas" || canvasType === "price_breakup_canvas"
      ? "Open Pricelist"
      : `Open ${canvasTypeLabel(canvasType)}`;
  const actions = buildChatSuggestions({ widget, message, limit: 4 });
  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const maxCarouselIndex = Math.max(0, rows.length - 1);
  const carouselProgress =
    maxCarouselIndex > 0 ? carouselIndex / maxCarouselIndex : 0;

  const getCarouselStep = () => {
    const scroller = carouselRef.current;
    if (!scroller) return 0;

    const firstCard = scroller.querySelector(".aci-chat-preview-card");
    if (!firstCard) return 0;

    const styles = window.getComputedStyle(scroller);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;

    return firstCard.getBoundingClientRect().width + gap;
  };

  const handleCarouselScroll = () => {
    const scroller = carouselRef.current;
    if (!scroller) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = Math.max(
      0,
      Math.min(maxCarouselIndex, Math.round(scroller.scrollLeft / step)),
    );

    setCarouselIndex(nextIndex);
  };

  const snapCarouselToNearest = () => {
    const scroller = carouselRef.current;
    if (!scroller) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = Math.max(
      0,
      Math.min(maxCarouselIndex, Math.round(scroller.scrollLeft / step)),
    );

    scroller.scrollTo({
      left: step * nextIndex,
      behavior: "smooth",
    });

    setCarouselIndex(nextIndex);
  };

  const handleCarouselIndicatorClick = () => {
    const scroller = carouselRef.current;
    if (!scroller || maxCarouselIndex <= 0) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = carouselIndex >= maxCarouselIndex ? 0 : carouselIndex + 1;

    scroller.scrollTo({
      left: step * nextIndex,
      behavior: "smooth",
    });

    setCarouselIndex(nextIndex);
  };

  const handleOpenCanvas = () => {
    if (!hasCanvas || typeof onOpen !== "function") return;
    onOpen(message);
  };

  return (
    <article
      className={`aci-chat-result-card ${isColorResult ? "aci-chat-color-result-card" : ""}`}
    >
      {rows.length ? (
        <>
          <div
            className="aci-chat-result-rows"
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            onTouchEnd={snapCarouselToNearest}
            onMouseUp={snapCarouselToNearest}
          >
            {rows.map((row, index) => {
              const rowTitle = isColorResult
                ? pickText(
                    row.colorName,
                    row.name,
                    row.desktopName,
                    row.mobileName,
                    row.title,
                    row.label,
                    `Color ${index + 1}`,
                  )
                : isFeatureResult
                  ? pickText(
                      row.variant,
                      row.variantName,
                      row.label,
                      row.name,
                      row.matchedFeature,
                      row.feature,
                      `Feature option ${index + 1}`,
                    )
                  : pickText(
                      row.variant,
                      row.name,
                      row.title,
                      row.label,
                      row.model,
                      `Option ${index + 1}`,
                    );

              const rowSub = isColorResult
                ? ""
                : isFeatureResult
                  ? pickText(
                      row.section,
                      row.feature,
                      row.matchedFeature,
                      [
                        row.availableCount ? `${row.availableCount} available` : "",
                        row.featureCount ? `${row.featureCount} features` : "",
                      ]
                        .filter(Boolean)
                        .join(" / "),
                    )
                  : pickText(
                      row.subtitle,
                      row.fuelTransmission,
                      [row.fuel, row.transmission].filter(Boolean).join(" / "),
                    );

              const rowPrice = isColorResult
                ? ""
                : isFeatureResult
                  ? formatFeaturePreviewPrice(row)
                  : pickText(
                      row.price,
                      row.priceRange,
                      row.onRoadPrice,
                      row.exShowroomPrice,
                      row.value,
                    );

              const rowImageFrame = isColorResult
                ? pickAny(
                    row.displayFrameMeta,
                    row.display_frame_meta,
                    row.imageFrame,
                    row.frameMeta,
                    row.frame_meta,
                    row.image_frame,
                    row.carImageFrame,
                    row.car_image_frame,
                    row.frame,
                    row.vehicle?.displayFrameMeta,
                    row.vehicle?.display_frame_meta,
                    row.vehicle?.imageFrame,
                    row.vehicle?.frameMeta,
                    row.vehicle?.frame_meta,
                    row.vehicle?.carImageFrame,
                    row.vehicle?.frame,
                    selectedVehicle?.displayFrameMeta,
                    selectedVehicle?.imageFrame,
                    selectedVehicle?.frameMeta,
                  )
                : pickAny(
                    row.vehicle?.imageFrame,
                    row.vehicle?.frameMeta,
                    row.vehicle?.frame_meta,
                    row.imageFrame,
                    row.frameMeta,
                    row.frame_meta,
                    row.frame,
                    selectedVehicle?.imageFrame,
                    selectedVehicle?.frameMeta,
                    selectedVehicle?.displayFrameMeta,
                  );

              const rowImageUrl = isColorResult
                ? pickText(
                    row.displayNormalizedImageUrl,
                    row.display_normalized_image_url,
                    row.vehicle?.displayNormalizedImageUrl,
                    row.vehicle?.display_normalized_image_url,
                    row.normalizedImageUrl,
                    row.cleanImageUrl,
                    row.normalizedImagePngUrl,
                    row.stagedImageUrl,
                    row.imageUrl,
                    row.carImageUrl,
                    row.sourceImageUrl,
                    row.vehicle?.normalizedImageUrl,
                    row.vehicle?.cleanImageUrl,
                    row.vehicle?.normalizedImagePngUrl,
                    row.vehicle?.stagedImageUrl,
                    row.vehicle?.imageUrl,
                    selectedVehicle?.displayNormalizedImageUrl,
                    selectedVehicle?.normalizedImageUrl,
                    selectedVehicle?.imageUrl,
                  )
                : "";

              const frameStyle = isColorResult
                ? buildInlineColorFrameStyle(rowImageFrame || {})
                : rowImageFrame
                  ? buildChatImageFrameStyle(rowImageFrame, "chatCard")
                  : {};

              const priceContext =
                row.exShowroomPrice &&
                !row.onRoadPrice &&
                !row.price &&
                !row.priceRange &&
                !row.value
                  ? "Ex-showroom"
                  : "On-road";

              return (
                <motion.button
                  type="button"
                  className={`aci-chat-preview-card ${isColorResult ? "is-color-card" : ""} ${isFeatureResult ? "is-feature-card" : ""}`}
                  key={row.id || row._id || rowTitle || index}
                  aria-label={`View ${rowTitle}`}
                  initial={{ opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -3, scale: 1.012 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{
                    duration: 0.38,
                    ease: [0.22, 1, 0.36, 1],
                    delay: Math.min(index * 0.045, 0.12),
                  }}
                  onClick={() => {
                    if (hasCanvas && typeof onOpen === "function") {
                      onOpen({
                        ...message,
                        widget: {
                          ...widget,
                          selectedRow: row,
                          selectedRowIndex: index,
                        },
                      });
                      return;
                    }

                    const nextVehicle = isColorResult
                      ? {
                          ...(selectedVehicle || {}),
                          selectedColor: row,
                          colorName: rowTitle,
                          imageUrl: rowImageUrl,
                          normalizedImageUrl: rowImageUrl,
                          imageFrame: rowImageFrame,
                        }
                      : row.vehicle || selectedVehicle;

                    onAction?.({
                      id: `chat-preview-row-${index}`,
                      label: rowTitle,
                      query: row.query || rowTitle,
                      vehicle: nextVehicle,
                      contextPatch: {
                        ...buildVehicleContextPatch({
                          vehicle: nextVehicle,
                          includeVariant: false,
                        }),
                        selectedColor: isColorResult ? row : undefined,
                      },
                    });
                  }}
                >
                  <div className="aci-chat-row-visual" style={frameStyle}>
                    <motion.div
                      className="aci-chat-row-car-motion"
                      initial={{ opacity: 0, y: 10, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.52,
                        ease: [0.19, 1, 0.22, 1],
                        delay: Math.min(index * 0.055, 0.16),
                      }}
                    >
                      {isColorResult && rowImageUrl ? (
                        <img
                          className="aci-chat-color-card-image"
                          src={rowImageUrl}
                          alt={rowTitle}
                          loading="lazy"
                          draggable="false"
                        />
                      ) : isFeatureResult ? (
                        <div className="aci-chat-feature-preview-icon">
                          <AciV2QuestionIcon label={rowTitle} index={index} />
                          <strong>
                            {firstValue(
                              row.availableCount,
                              row.matchedVariantCount,
                              row.featureCount,
                              "Y",
                            )}
                          </strong>
                        </div>
                      ) : (
                        <AciVehicleVisual
                          vehicle={row.vehicle || row}
                          height={112}
                          stage
                          stageVariant="compact"
                        />
                      )}
                    </motion.div>
                  </div>

                  <div className="aci-chat-row-copy">
                    <strong>{rowTitle}</strong>
                    {!isColorResult && rowSub ? <span>{rowSub}</span> : null}
                    {!isColorResult && rowPrice ? (
                      <b className="aci-chat-row-price">
                        <span className="aci-chat-price-context">
                          {priceContext}
                        </span>
                        <span className="aci-chat-price-amount">
                          {formatIndianPrice(rowPrice)}
                        </span>
                      </b>
                    ) : null}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {rows.length > 2 ? (
            <button
              type="button"
              className="aci-chat-carousel-indicator"
              style={{ "--aci-carousel-progress": carouselProgress }}
              onClick={handleCarouselIndicatorClick}
              aria-label="Show more car options"
            >
              <span />
              <i />
            </button>
          ) : null}
        </>
      ) : (
        <div className="aci-chat-result-skeleton">
          <i />
          <i />
          <i />
        </div>
      )}

      {hasCanvas || actions.length ? (
        <footer>
          {hasCanvas ? (
            <button
              type="button"
              className="aci-chat-open-canvas-pill"
              onClick={handleOpenCanvas}
            >
              <AciV2QuestionIcon label={openCanvasLabel} index={0} />
              <span>{openCanvasLabel}</span>
            </button>
          ) : null}

          {actions.map((item, index) => {
            const label =
              item.label || item.title || item.query || `Next ${index + 1}`;

            return (
              <button
                type="button"
                key={item.id || item.label || item.query || index}
                onClick={() => onAction?.(item)}
              >
                <AciV2QuestionIcon label={label} index={index + 1} />
                <span>{label}</span>
              </button>
            );
          })}
        </footer>
      ) : null}
    </article>
  );
}
