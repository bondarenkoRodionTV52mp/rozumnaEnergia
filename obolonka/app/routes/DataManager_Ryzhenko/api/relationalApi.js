import { API_CONFIG } from "./config";

const BASE_URL = API_CONFIG.relational;

export async function getRelationalData() {
  const response = await fetch(`${BASE_URL}/data`);

  if (!response.ok) {
    throw new Error("Не вдалося отримати реляційні дані");
  }

  return response.json();
}

export async function updateRelationalData(id, updatedData) {
  const response = await fetch(`${BASE_URL}/data/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedData),
  });

  if (!response.ok) {
    throw new Error("Не вдалося оновити реляційні дані");
  }

  return response.json();
}

export async function deleteRelationalData(id) {
  const response = await fetch(`${BASE_URL}/data/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Не вдалося видалити реляційні дані");
  }

  return response.json();
}