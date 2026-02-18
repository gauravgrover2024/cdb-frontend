
/**
 * Uploads a file to Cloudinary using the unsigned upload preset.
 * 
 * @param {File} file - The file to upload
 * @param {string} [preset] - Optional upload preset (defaults to env var)
 * @param {string} [cloudName] - Optional cloud name (defaults to env var)
 * @returns {Promise<{url: string, public_id: string, format: string, ...}>}
 */
export const uploadToCloudinary = async (file, preset, cloudName) => {
  const CLOUD_NAME = cloudName || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = preset || process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  if (!CLOUD_NAME) {
    throw new Error("Cloudinary Cloud Name is not configured. Please set REACT_APP_CLOUDINARY_CLOUD_NAME.");
  }

  if (!UPLOAD_PRESET) {
    throw new Error("Cloudinary Upload Preset is not configured. Please set REACT_APP_CLOUDINARY_UPLOAD_PRESET.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Upload failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};
