import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { readStore, updateStore } from "./src/store.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(moduleDirectory, "public");
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let rawBody = "";
  for await (const chunk of request) {
    rawBody += chunk;
    if (rawBody.length > 1_000_000) {
      throw new Error("Request body is too large.");
    }
  }

  if (!rawBody) return {};
  return JSON.parse(rawBody);
}

function cleanText(value, maximumLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function requireTitle(value) {
  const title = cleanText(value, 120);
  if (!title) throw new Error("Tiêu đề là bắt buộc.");
  return title;
}

function createTask(input) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: requireTitle(input.title),
    description: cleanText(input.description, 1000),
    status: ["TODO", "IN_PROGRESS", "DONE"].includes(input.status) ? input.status : "TODO",
    priority: ["LOW", "MEDIUM", "HIGH"].includes(input.priority) ? input.priority : "MEDIUM",
    dueAt: cleanText(input.dueAt, 40) || null,
    createdAt: now,
    updatedAt: now,
  };
}

function createEvent(input) {
  const now = new Date().toISOString();
  const startAt = cleanText(input.startAt, 40);
  const endAt = cleanText(input.endAt, 40);
  if (!startAt || !endAt) throw new Error("Thời gian bắt đầu và kết thúc là bắt buộc.");
  if (new Date(endAt) <= new Date(startAt)) throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");

  return {
    id: randomUUID(),
    title: requireTitle(input.title),
    description: cleanText(input.description, 1000),
    startAt,
    endAt,
    color: ["mint", "blue", "orange", "pink"].includes(input.color) ? input.color : "mint",
    createdAt: now,
    updatedAt: now,
  };
}

function itemPath(pathname, collection) {
  const match = pathname.match(new RegExp(`^/api/${collection}/([^/]+)$`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function handleCollection(request, response, collection) {
  if (request.method === "GET") {
    const store = await readStore();
    return sendJson(response, 200, { data: store[collection] });
  }

  if (request.method === "POST") {
    const input = await readJson(request);
    const created = collection === "tasks" ? createTask(input) : createEvent(input);
    await updateStore((store) => store[collection].push(created));
    return sendJson(response, 201, { data: created });
  }

  return sendJson(response, 405, { error: "Method not allowed." });
}

async function handleItem(request, response, collection, id) {
  if (request.method === "DELETE") {
    const deleted = await updateStore((store) => {
      const index = store[collection].findIndex((item) => item.id === id);
      if (index < 0) return false;
      store[collection].splice(index, 1);
      return true;
    });
    return sendJson(response, deleted ? 200 : 404, deleted ? { data: { id } } : { error: "Không tìm thấy dữ liệu." });
  }

  if (request.method === "PATCH") {
    const input = await readJson(request);
    const updated = await updateStore((store) => {
      const item = store[collection].find((candidate) => candidate.id === id);
      if (!item) return null;

      if (input.title !== undefined) item.title = requireTitle(input.title);
      if (input.description !== undefined) item.description = cleanText(input.description, 1000);
      if (collection === "tasks") {
        if (["TODO", "IN_PROGRESS", "DONE"].includes(input.status)) item.status = input.status;
        if (["LOW", "MEDIUM", "HIGH"].includes(input.priority)) item.priority = input.priority;
        if (input.dueAt !== undefined) item.dueAt = cleanText(input.dueAt, 40) || null;
      } else {
        if (input.startAt !== undefined) item.startAt = cleanText(input.startAt, 40);
        if (input.endAt !== undefined) item.endAt = cleanText(input.endAt, 40);
        if (["mint", "blue", "orange", "pink"].includes(input.color)) item.color = input.color;
        if (!item.startAt || !item.endAt || new Date(item.endAt) <= new Date(item.startAt)) {
          throw new Error("Khoảng thời gian sự kiện không hợp lệ.");
        }
      }
      item.updatedAt = new Date().toISOString();
      return item;
    });
    return sendJson(response, updated ? 200 : 404, updated ? { data: updated } : { error: "Không tìm thấy dữ liệu." });
  }

  return sendJson(response, 405, { error: "Method not allowed." });
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health") {
    return sendJson(response, 200, { status: "ok", service: "tikto-app" });
  }

  if (url.pathname === "/api/overview" && request.method === "GET") {
    return sendJson(response, 200, { data: await readStore() });
  }

  for (const collection of ["tasks", "events"]) {
    if (url.pathname === `/api/${collection}`) {
      return handleCollection(request, response, collection);
    }

    const id = itemPath(url.pathname, collection);
    if (id) return handleItem(request, response, collection, id);
  }

  return sendJson(response, 404, { error: "API route not found." });
}

async function serveStatic(response, pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(publicDirectory, relativePath);
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`)) {
    return sendJson(response, 403, { error: "Forbidden." });
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream" });
    response.end(content);
  } catch (error) {
    if (error?.code === "ENOENT") return sendJson(response, 404, { error: "Page not found." });
    throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);
    return await serveStatic(response, url.pathname);
  } catch (error) {
    const message = error instanceof SyntaxError ? "JSON không hợp lệ." : error.message;
    return sendJson(response, 400, { error: message || "Request failed." });
  }
});

server.listen(port, () => {
  console.log(`TikTo app running at http://localhost:${port}`);
});
