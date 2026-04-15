import { apiClient } from "./client";

export const uploadSingleFile = async (file) => {
  if (!file) throw new Error("No file selected for upload");

  const formData = new FormData();
  formData.append("files", file);

  const payload = await apiClient.upload("/api/upload", formData);
  const first = Array.isArray(payload?.data) ? payload.data[0] : null;

  if (!first || !first.url) {
    throw new Error("Upload succeeded but file URL is missing");
  }

  return {
    ...first,
    secure_url: first.url,
  };
};

export const uploadMultipleFiles = async (files = []) => {
  const validFiles = Array.from(files || []).filter(Boolean);
  if (!validFiles.length) throw new Error("No files selected for upload");

  const formData = new FormData();
  validFiles.forEach((file) => formData.append("files", file));

  const payload = await apiClient.upload("/api/upload", formData);
  const uploaded = Array.isArray(payload?.data) ? payload.data : [];

  return uploaded.map((file) => ({
    ...file,
    secure_url: file.url,
  }));
};
