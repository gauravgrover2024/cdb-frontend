const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://cdb-api.vercel.app";

const parseUploadResponse = async (res) => {
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || text || "File upload request failed",
    );
  }

  return data;
};

export const uploadSingleFile = async (file) => {
  if (!file) throw new Error("No file selected for upload");

  const formData = new FormData();
  formData.append("files", file);

  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = await parseUploadResponse(res);
  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (!first || !first.url) {
    throw new Error("Upload succeeded but file URL is missing");
  }

  return {
    ...first,
    secure_url: first.url,
  };
};
