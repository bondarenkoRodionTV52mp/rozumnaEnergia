import { API_BASE_URL } from "../../../../consts";

// Порт бекенду за номером у списку (21) — див. docker-compose.yaml
export const ZT_PORT = 6021;
export const ZT_API_URL = `${API_BASE_URL}:${ZT_PORT}/api`;

// Базовий шлях модуля в оболонці (див. app/routes.ts)
export const ZT_BASE = "/zero-trust-Stelmakh";

export const ztPath = (sub = "") => (sub ? `${ZT_BASE}/${sub}` : ZT_BASE);
