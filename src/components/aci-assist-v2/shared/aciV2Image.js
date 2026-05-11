export const isUsableImageUrl = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^data:image\//i.test(text)) return true;
  if (/^(https?:)?\/\//i.test(text)) return true;
  if (text.startsWith("/")) return true;
  return false;
};

export const getDisplayCarImage = (record = {}) => {
  if (!record || typeof record !== "object") return "";

  const colorImage =
    record.selectedColor?.normalizedImageUrl ||
    record.selectedColor?.cleanImageUrl ||
    record.selectedColor?.imageUrl ||
    record.selectedColor?.carImageUrl ||
    "";

  const colors = Array.isArray(record.colors) ? record.colors : [];
  const colorCandidate = colors.find(
    (item) => item?.isSelected || item?.selected,
  );

  const colorCandidateImage =
    colorCandidate?.normalizedImageUrl ||
    colorCandidate?.cleanImageUrl ||
    colorCandidate?.imageUrl ||
    colorCandidate?.carImageUrl ||
    "";

  const topLevel =
    record.normalizedImageUrl ||
    record.cleanImageUrl ||
    record.normalizedImagePngUrl ||
    record.heroNormalizedImageUrl ||
    record.heroImageUrl ||
    record.imageUrl ||
    record.originalImageUrl ||
    record.sourceImageUrl ||
    record.image ||
    record.carImageUrl ||
    "";

  const selected = [colorImage, colorCandidateImage, topLevel].find(isUsableImageUrl);
  return selected || "";
};
