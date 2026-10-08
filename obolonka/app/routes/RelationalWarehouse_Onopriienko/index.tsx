import { Link } from "react-router";
import type { Route } from "./+types/index";
import { API_BASE_URL } from "../../../consts";

const RELATIONAL_WAREHOUSE_PORT = 6024;
const swaggerUrl = `${API_BASE_URL}:${RELATIONAL_WAREHOUSE_PORT}/swagger-ui.html`;

export function meta({}: Route.MetaArgs) {
  return [{ title: "Relational Warehouse API | Smart Energy Lab" }];
}

export default function RelationalWarehouseDocs() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Relational Warehouse API
            </h1>
            <p className="text-slate-600">
              Swagger UI для API реляційного сховища даних сенсорів (PostgreSQL).
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              className="rounded border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              to="/"
            >
              На головну
            </Link>
            <a
              className="rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
              href={swaggerUrl}
              rel="noreferrer"
              target="_blank"
            >
              Відкрити Swagger
            </a>
          </div>
        </div>

        <iframe
          className="h-[calc(100vh-10rem)] min-h-[36rem] w-full rounded border border-slate-300 bg-white shadow"
          src={swaggerUrl}
          title="Relational Warehouse API Swagger UI"
        />
      </div>
    </main>
  );
}
