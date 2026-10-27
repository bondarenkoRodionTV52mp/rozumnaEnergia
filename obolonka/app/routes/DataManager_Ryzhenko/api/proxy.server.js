import { Agent as HttpAgent, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { Buffer } from "node:buffer";
import { env as processEnv } from "node:process";

const agents = {
  "http:": new HttpAgent({ keepAlive: true, proxyEnv: processEnv }),
  "https:": new HttpsAgent({ keepAlive: true, proxyEnv: processEnv }),
};

const services = {
  document: {
    variable: "DATA_MANAGER_DOCUMENT_API_URL",
    fallback: "http://77.47.192.6:6066/api/v1",
    routes: [
      [/^auth\/login$/, ["POST"]],
      [/^auth\/me$/, ["GET"]],
      [/^auth\/register$/, ["POST"]],
      [/^auth\/users$/, ["GET"]],
      [/^auth\/users\/[^/]+$/, ["PATCH"]],
      [/^data-types$/, ["GET"]],
      [/^documents$/, ["GET", "POST"]],
      [/^documents\/[^/]+$/, ["GET", "PATCH", "DELETE"]],
    ],
  },
  relational: {
    variable: "DATA_MANAGER_RELATIONAL_API_URL",
    fallback: "http://77.47.192.6:6024",
    routes: [
      [/^api\/temp-control\/records$/, ["GET", "POST"]],
      [/^api\/temp-control\/records\/latest$/, ["GET"]],
    ],
  },
  file: {
    variable: "DATA_MANAGER_FILE_API_URL",
    fallback: "http://77.47.192.6:6023/api/file",
    routes: [
      [/^data$/, ["GET"]],
      [/^data\/[^/]+$/, ["PUT", "DELETE"]],
    ],
  },
};

function problem(status, detail, headers = {}) {
  return Response.json({ detail }, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function proxyRequest(target, request, body, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let timer;
    let upstream;

    function finish(response) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.signal.removeEventListener("abort", abort);
      resolve(response);
    }

    function failed() {
      finish(timedOut
        ? problem(504, "API не відповів вчасно. Спробуйте ще раз.")
        : request.signal.aborted
          ? problem(499, "Запит скасовано.")
          : problem(502, "Не вдалося з’єднатися з API."));
    }

    function abort() {
      upstream?.destroy();
      failed();
    }

    const headers = { Accept: request.headers.get("Accept") || "application/json" };
    if (body !== undefined) {
      headers["Content-Type"] = request.headers.get("Content-Type") || "application/json";
    }
    if (request.service === "document" && request.headers.has("Authorization")) {
      headers.Authorization = request.headers.get("Authorization");
    }

    try {
      const send = target.protocol === "https:" ? httpsRequest : httpRequest;
      upstream = send(target, {
        method: request.method,
        agent: agents[target.protocol],
        headers,
      }, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          response.destroy();
          finish(problem(502, "API повернув непідтримуване перенаправлення."));
          return;
        }
        if (response.statusCode < 200 || response.statusCode > 599) {
          response.destroy();
          finish(problem(502, "API повернув некоректний HTTP-статус."));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("error", failed);
        response.on("aborted", failed);
        response.on("end", () => {
          const status = response.statusCode;
          const noBody = [204, 205, 304].includes(status);
          finish(new Response(noBody ? null : Buffer.concat(chunks), {
            status,
            headers: {
              "Content-Type": response.headers["content-type"] || "application/json; charset=utf-8",
              "Cache-Control": "no-store",
            },
          }));
        });
      });
      upstream.on("error", failed);
      timer = setTimeout(() => {
        timedOut = true;
        upstream.destroy();
        failed();
      }, timeoutMs);
      timer.unref?.();
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) abort();
      else upstream.end(body);
    } catch {
      failed();
    }
  });
}
export function createDataManagerProxy({ env = processEnv, timeoutMs = 15_000 } = {}) {
  return async function proxyDataManagerRequest({ request, params }) {
    const service = params.service;
    const config = Object.hasOwn(services, service) ? services[service] : null;
    if (!config) return problem(404, "Невідомий сервіс Data Manager.");

    const incoming = new URL(request.url);
    const prefix = `/DataManager_Ryzhenko/api/${service}/`;
    if (!incoming.pathname.startsWith(prefix)) return problem(404, "Маршрут API не знайдено.");

    let segments;
    try {
      segments = incoming.pathname.slice(prefix.length).split("/").map(decodeURIComponent);
    } catch {
      return problem(400, "Некоректний шлях API.");
    }
    if (segments.some((part) => !part || part === "." || part === ".." || /[/\\]/.test(part)
      || [...part].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) {
      return problem(400, "Некоректний шлях API.");
    }
    const path = segments.join("/");
    const route = config.routes.find(([pattern]) => pattern.test(path));
    if (!route) return problem(404, "Маршрут API не знайдено.");
    if (!route[1].includes(request.method)) {
      return problem(405, "Цей метод не підтримується.", { Allow: route[1].join(", ") });
    }

    let target;
    try {
      target = new URL(env[config.variable] || config.fallback);
      if (!agents[target.protocol] || target.username || target.password || target.search || target.hash) {
        return problem(502, "Некоректне серверне налаштування API.");
      }
      target.pathname = `${target.pathname.replace(/\/+$/, "")}/${segments.map(encodeURIComponent).join("/")}`;
      target.search = incoming.search;
    } catch {
      return problem(502, "Некоректне серверне налаштування API.");
    }

    let body;
    try {
      request.signal.throwIfAborted();
      if (request.body !== null) body = Buffer.from(await request.arrayBuffer());
      request.signal.throwIfAborted();
    } catch {
      return problem(499, "Запит скасовано.");
    }
    return proxyRequest(target, {
      service,
      method: request.method,
      headers: request.headers,
      signal: request.signal,
    }, body, timeoutMs);
  };
}

export const proxyDataManagerRequest = createDataManagerProxy();
