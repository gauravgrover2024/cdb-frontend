const R2_PUBLIC_BASE = "https://pub-8504a10fc1c04f02ac8760cb90462ae3.r2.dev";

export const resolveCarImageUrl = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^data:image\//i.test(text)) return text;
  if (/^(https?:)?\/\//i.test(text)) return text;

  // We do not want frontend to use local /media directly.
  // Convert known media paths to R2 public URL.
  if (text.startsWith("/media/")) {
    return `${R2_PUBLIC_BASE}${text}`;
  }

  return "";
};

export const isUsableImageUrl = (value = "") => {
  return Boolean(resolveCarImageUrl(value));
};

export const getDisplayCarImage = (record = {}) => {
  if (!record || typeof record !== "object") return "";

  const heroImage =
    record.heroImageNormalizedUrl ||
    record.normalizedHeroImageUrl ||
    record.heroNormalizedImageUrl ||
    record.displayNormalizedImageUrl ||
    record.heroImageUrl ||
    record.heroImage ||
    record.defaultNormalizedImageUrl ||
    record.displayStagedImageUrl ||
    "";

  const topLevel =
    heroImage ||
    record.normalizedImageUrl ||
    record.cleanImageUrl ||
    record.normalizedImagePngUrl ||
    record.imageUrl ||
    record.originalImageUrl ||
    record.sourceImageUrl ||
    record.image ||
    record.carImageUrl ||
    "";

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

  const selected = [topLevel, colorImage, colorCandidateImage]
    .map(resolveCarImageUrl)
    .find(Boolean);

  return selected || "";
};
