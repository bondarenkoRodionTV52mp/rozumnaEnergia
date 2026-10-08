import { API_CONFIG } from "./config";

const BASE_URL = API_CONFIG.document;

export async function getDocumentData() {
  const response = await fetch(`${BASE_URL}/data`);

  if (!response.ok) {
    throw new Error("Не вдалося отримати документоорієнтовані дані");
  }

  return response.json();
}

export async function updateDocumentData(id, updatedData) {
  const response = await fetch(`${BASE_URL}/data/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedData),
  });

  if (!response.ok) {
    throw new Error("Не вдалося оновити документоорієнтовані дані");
  }

  return response.json();
}

export async function deleteDocumentData(id) {
  const response = await fetch(`${BASE_URL}/data/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Не вдалося видалити документоорієнтовані дані");
  }

  return response.json();
}