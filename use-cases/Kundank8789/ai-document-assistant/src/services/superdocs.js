const API_URL = "http://localhost:5000";

export async function uploadDocument(file) {
  const formData = new FormData();

  formData.append("document", file);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to upload document");
  }

  return data;
}

export async function analyzeDocuments() {
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to analyze documents");
  }

  return data;
}