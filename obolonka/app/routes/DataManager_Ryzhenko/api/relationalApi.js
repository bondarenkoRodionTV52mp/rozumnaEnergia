import { API_CONFIG } from "./config";

const BASE_URL = API_CONFIG.relational;

// Отримати список доступних таблиць
export async function getRelationalTables() {
  const response = await fetch(`${BASE_URL}/tables`);

  if (!response.ok) {
    throw new Error("Не вдалося отримати список таблиць");
  }

  return response.json();
}

// Отримати дані вибраної таблиці
export async function getRelationalTableData(tableName) {
  const response = await fetch(`${BASE_URL}/tables/${tableName}`);

  if (!response.ok) {
    throw new Error(
      `Не вдалося отримати дані таблиці "${tableName}"`
    );
  }

  return response.json();
}

// Отримати один запис
export async function getRelationalRecord(tableName, id) {
  const response = await fetch(
    `${BASE_URL}/tables/${tableName}/${id}`
  );

  if (!response.ok) {
    throw new Error("Не вдалося отримати запис");
  }

  return response.json();
}

// Створити новий запис
export async function createRelationalRecord(tableName, data) {
  const response = await fetch(
    `${BASE_URL}/tables/${tableName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Не вдалося створити запис");
  }

  return response.json();
}

// Оновити запис
export async function updateRelationalRecord(
  tableName,
  id,
  updatedData
) {
  const response = await fetch(
    `${BASE_URL}/tables/${tableName}/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    }
  );

  if (!response.ok) {
    throw new Error("Не вдалося оновити запис");
  }

  return response.json();
}

// Видалити запис
export async function deleteRelationalRecord(tableName, id) {
  const response = await fetch(
    `${BASE_URL}/tables/${tableName}/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Не вдалося видалити запис");
  }

  return response.json();
}