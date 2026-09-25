import {  getRelationalData,  updateRelationalData,  deleteRelationalData, } from "./relationalApi";
import {  getDocumentData,  updateDocumentData,  deleteDocumentData, } from "./documentApi";
import {  getFileData,  updateFileData, deleteFileData, } from "./fileApi";

export async function getDataByType(type) {
  switch (type) {
    case "relational":
      return getRelationalData();

    case "document":
      return getDocumentData();

    case "file":
      return getFileData();

    default:
      throw new Error(`Невідомий тип даних: ${type}`);
  }
}

export async function updateDataByType(type, id, updatedData) {
  switch (type) {
    case "relational":
      return updateRelationalData(id, updatedData);

    case "document":
      return updateDocumentData(id, updatedData);

    case "file":
      return updateFileData(id, updatedData);

    default:
      throw new Error(`Оновлення для типу "${type}" поки не реалізовано`);
  }
}

export async function deleteDataByType(type, id) {
  switch (type) {
    case "relational":
      return deleteRelationalData(id);
    
    case "document":
      return deleteDocumentData(id);

    case "file":
        return deleteFileData(id);

    default:
      throw new Error(`Видалення для типу "${type}" поки не реалізовано`);
  }
}