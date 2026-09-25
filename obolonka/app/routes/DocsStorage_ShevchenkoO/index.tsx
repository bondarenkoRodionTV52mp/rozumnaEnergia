import { Link } from "react-router";
import { useEffect, useState } from "react";
import type { Route } from "./+types/index";

const documentStoragePort = "6066";

function getSwaggerUrl() {
  const url = new URL("/docs", window.location.origin);
  url.port = documentStoragePort;
  return url.toString();
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Document Storage API | Smart Energy Lab" }];
}

export default function DocumentStorageDocs() {
  const [swaggerUrl, setSwaggerUrl] = useState<string | null>(null);

  useEffect(() => {
    setSwaggerUrl(getSwaggerUrl());
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Document Storage API
            </h1>
            <p className="text-slate-600">
              Swagger UI для API збереження документів і телеметрії.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              className="rounded border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              to="/"
            >
              На головну
            </Link>
            {swaggerUrl && (
              <a
                className="rounded bg-violet-700 px-4 py-2 font-medium text-white hover:bg-violet-800"
                href={swaggerUrl}
                rel="noreferrer"
                target="_blank"
              >
                Відкрити Swagger
              </a>
            )}
          </div>
        </div>

        {swaggerUrl ? (
          <iframe
            className="h-[calc(100vh-10rem)] min-h-[36rem] w-full rounded border border-slate-300 bg-white shadow"
            src={swaggerUrl}
            title="Document Storage API Swagger UI"
          />
        ) : (
          <div className="flex min-h-[36rem] items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow">
            Завантаження Swagger UI...
          </div>
        )}
      </div>
    </main>
  );
}
