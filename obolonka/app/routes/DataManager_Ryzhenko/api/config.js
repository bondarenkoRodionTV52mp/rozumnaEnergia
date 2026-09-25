import { API_BASE_URL } from "../../../../consts";

const DATA_MANAGER_RYZHENKO_DEMO_PORT = 6023;

const DEMO_API_BASE_URL =
  `${API_BASE_URL}:${DATA_MANAGER_RYZHENKO_DEMO_PORT}`;

export const API_CONFIG = {
  relational: `${DEMO_API_BASE_URL}/api/relational`,
  document: `${DEMO_API_BASE_URL}/api/document`,
  file: `${DEMO_API_BASE_URL}/api/file`,
};