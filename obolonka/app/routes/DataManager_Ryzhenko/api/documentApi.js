
import {
  documentPageParams,
  documentPageResult,
  documentRequest,
} from "./documentClient";

// Отримання зареєстрованих типів документів
export async function getDocumentTypes() {
  const result = await documentRequest(
    "/data-types?page=1&page_size=500"
  );

  return result.data;
}
export async function getDocumentData(options = {}) {
  const { page = 1, page_size = 10, tags, signal } = options;
  const params = documentPageParams(page, page_size);
  if (tags !== undefined && tags !== null && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string"))) {
    throw new Error("Теги мають бути масивом рядків");
  }
  for (const field of [
    "sort", "type", "category", "source_system", "entity_id", "owner_id",
    "visibility", "created_after", "created_before",
  ]) {
    if (options[field] !== undefined && options[field] !== null && options[field] !== "") {
      params.set(field, options[field]);
    }
  }
  for (const tag of tags ?? []) {
    if (tag !== "") params.append("tags", tag);
  }
  const result = await documentRequest(`/documents?${params}`, { signal });
  return documentPageResult(result, "Некоректний формат списку документів");
}

// Отримання окремого документа
export async function getDocumentById(id) {
  const result = await documentRequest(
    `/documents/${encodeURIComponent(id)}`
  );

  return result.data;
}

// Створення документа
export async function createDocumentData(newDocument) {
  const result = await documentRequest("/documents", {
    method: "POST",
    body: JSON.stringify(newDocument),
  });

  return result.data;
}

// Редагування документа
export async function updateDocumentData(id, updatedData) {
  const allowedFields = [
    "category",
    "schema_version",
    "source_system",
    "entity_id",
    "owner_id",
    "tags",
    "payload",
    "metadata",
    "visibility",
  ];

  const changes = {};

  for (const field of allowedFields) {
    if (updatedData[field] !== undefined) {
      changes[field] = updatedData[field];
    }
  }

  const result = await documentRequest(
    `/documents/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(changes),
    }
  );

  return result.data;
}

// Видалення документа
export async function deleteDocumentData(id) {
  const result = await documentRequest(
    `/documents/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  return result.data;
}
