import { API_CONFIG } from "./config";

const BASE_URL = API_CONFIG.file;

export async function getFileData() {
  const response = await fetch(`${BASE_URL}/data`);

  if (!response.ok) {
    throw new Error("Не вдалося отримати файлові дані");
  }

  return response.json();
}

export async function updateFileData(id, updatedData) {
  const response = await fetch(`${BASE_URL}/data/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedData),
  });

  if (!response.ok) {
    throw new Error("Не вдалося оновити файлові дані");
  }

  return response.json();
}

export async function deleteFileData(id) {
  const response = await fetch(`${BASE_URL}/data/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Не вдалося видалити файлові дані");
  }

  return response.json();
}