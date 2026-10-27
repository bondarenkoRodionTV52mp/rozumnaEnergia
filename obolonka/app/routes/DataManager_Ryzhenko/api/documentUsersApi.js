import {
  documentPageParams,
  documentPageResult,
  documentRequest,
} from "./documentClient";

export const DOCUMENT_ROLES = Object.freeze(["sensor", "researcher", "admin"]);

export async function getDocumentProfile({ signal } = {}) {
  const result = await documentRequest("/auth/me", { signal });
  const profile = result?.data;
  if (!profile || typeof profile.username !== "string" || !profile.username.trim()) {
    throw new Error("Сервер не повернув коректний профіль користувача");
  }
  if (!DOCUMENT_ROLES.includes(profile.role)) {
    throw new Error("Сервер повернув невідому роль користувача");
  }
  return profile;
}

export async function getDocumentUsers({ page = 1, page_size = 10, role, signal } = {}) {
  const params = documentPageParams(page, page_size);
  if (role) params.set("role", role);
  const result = await documentRequest(`/auth/users?${params}`, { signal });
  return documentPageResult(result, "Некоректний формат списку користувачів");
}

function userFields(data, fields) {
  return Object.fromEntries(fields
    .filter((field) => data[field] !== undefined)
    .map((field) => [field, data[field]]));
}

export async function createDocumentUser(data) {
  const result = await documentRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userFields(data, [
      "username", "password", "email", "full_name", "role", "is_active",
    ])),
  });
  return result.data;
}

export async function updateDocumentUser(username, data) {
  const result = await documentRequest(`/auth/users/${encodeURIComponent(username)}`, {
    method: "PATCH",
    body: JSON.stringify(userFields(data, [
      "email", "full_name", "role", "is_active", "password",
    ])),
  });
  return result.data;
}
