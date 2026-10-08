import {
  getDocumentData,
  updateDocumentData,
  deleteDocumentData,
} from "./documentApi";

import {
  getFileData,
  updateFileData,
  deleteFileData,
} from "./fileApi";

export async function getDataByType(type) {
  switch (type) {
    case "document":
      return getDocumentData();

    case "file":
      return getFileData();

    default:
      throw new Error(`Отримання даних для типу "${type}" не реалізовано`);
  }
}

export async function updateDataByType(type, id, updatedData) {
  switch (type) {
    case "document":
      return updateDocumentData(id, updatedData);

    case "file":
      return updateFileData(id, updatedData);

    default:
      throw new Error(`Оновлення для типу "${type}" не реалізовано`);
  }
}

export async function deleteDataByType(type, id) {
  switch (type) {
    case "document":
      return deleteDocumentData(id);

    case "file":
      return deleteFileData(id);

    default:
      throw new Error(`Видалення для типу "${type}" не реалізовано`);
  }
}