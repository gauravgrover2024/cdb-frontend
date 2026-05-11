import React, { useMemo } from "react";
import AciAssistRecommendationScreen from "./AciAssistRecommendationScreen";

const toTitleCase = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function AciAssistBrandsScreen(props) {
  const nextWidget = useMemo(() => {
    const baseWidget = props?.widget || {};
    const brand =
      baseWidget?.brand ||
      baseWidget?.data?.brand ||
      baseWidget?.contextPatch?.anchorMake ||
      "";
    const normalizedBrand = toTitleCase(brand);

    return {
      ...baseWidget,
      title: baseWidget.title || (normalizedBrand ? `${normalizedBrand} cars` : "Brand cars"),
      answer:
        baseWidget.answer ||
        (normalizedBrand
          ? `Showing live ${normalizedBrand} models. Tap a card to open overview.`
          : "Showing live models. Tap a card to open overview."),
    };
  }, [props?.widget]);

  return <AciAssistRecommendationScreen {...props} widget={nextWidget} />;
}
