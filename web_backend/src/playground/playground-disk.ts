import { access, mkdir, readFile, rm, unlink, writeFile } from "fs/promises";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { playgroundException } from "./playground.errors";

export const SOURCE_FILES = ["index.html", "app.js", "server.js"] as const;
export type SourceFile = (typeof SOURCE_FILES)[number];

const SOURCE_LIMIT = 262144;
const SQL_LIMIT = 10000;
const RESULT_LIMIT = 262144;
export const PLAYGROUND_FILE_BYTES = 4_000_000;
const SEGMENT = /^[A-Za-z0-9._-]{1,128}$/;
const SAFE_MIME = /^(image\/(png|jpeg|gif|webp|bmp)|application\/pdf|text\/plain)$/;

const WRITE =
  /\b(insert|update|delete|create|drop|alter|replace|begin|commit|rollback|analyze|savepoint|release)\b/i;
const FORBIDDEN = /\b(attach|detach|load_extension|pragma|vacuum)\b/i;

export const DEFAULT_INDEX = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
<div id="app"></div>
<script src="app.js"></script>
</body>
</html>
`;

export const DEFAULT_APP = `const app = document.getElementById("app");
if (app) app.textContent = "Playground";
`;

export function playgroundFolder(root: string, id: string) {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) throw playgroundException("PG_002");
  const base = path.resolve(root);
  const full = path.resolve(base, id);
  if (full !== path.join(base, id)) throw playgroundException("PG_002");
  return full;
}

export function isSourceFile(name: string): name is SourceFile {
  return (SOURCE_FILES as readonly string[]).includes(name);
}

export async function removePlaygroundFolder(folder: string) {
  await rm(folder, { recursive: true, force: true });
}

export async function ensurePlayground(folder: string) {
  await mkdir(path.join(folder, "files"), { recursive: true });
  await writeIfMissing(path.join(folder, "index.html"), DEFAULT_INDEX);
  await writeIfMissing(path.join(folder, "app.js"), DEFAULT_APP);
  const database = path.join(folder, "data.sqlite");
  try {
    await access(database);
  } catch {
    const db = new DatabaseSync(database);
    db.close();
  }
}

export async function readSource(folder: string, name: SourceFile) {
  try {
    return await readFile(path.join(folder, name), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && name === "server.js") return "";
    throw error;
  }
}

export async function writeSource(folder: string, name: SourceFile, text: string) {
  if (typeof text !== "string" || text.length > SOURCE_LIMIT) throw playgroundException("PG_007");
  const file = path.join(folder, name);
  if (name === "server.js" && !text.trim()) {
    await unlink(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }
  await writeFile(file, text);
}

export function dataPath(folder: string, name: string) {
  return containedPath(folder, "files", name);
}

export async function readData(folder: string, name: string) {
  const file = dataPath(folder, name);
  let bytes: Buffer;
  try {
    bytes = await readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw playgroundException("PG_025");
    throw error;
  }
  if (bytes.length > PLAYGROUND_FILE_BYTES) throw playgroundException("PG_026");
  return { bytes, mime: await storedMime(folder, name, bytes) };
}

export async function writeData(folder: string, name: string, bytes: Buffer, mime?: string) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw playgroundException("PG_025");
  if (bytes.length > PLAYGROUND_FILE_BYTES) throw playgroundException("PG_026");
  const file = dataPath(folder, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  const storedType = chooseMime(bytes, mime);
  const typeFile = containedPath(folder, "meta", name);
  await mkdir(path.dirname(typeFile), { recursive: true });
  await writeFile(typeFile, storedType);
  return storedType;
}

export type SqlParam = string | number | null;

export function assertStatement(sql: string) {
  if (typeof sql !== "string" || !sql.trim() || sql.length > SQL_LIMIT) {
    throw playgroundException("PG_023");
  }
  const bare = stripSql(sql);
  const parts = bare
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 1) throw playgroundException("PG_023");
  if (FORBIDDEN.test(bare)) throw playgroundException("PG_023");
  return WRITE.test(bare);
}

export function sqlParams(value: unknown): SqlParam[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 50) throw playgroundException("PG_023");
  let bytes = 0;
  return value.map((item) => {
    if (item === null) return null;
    if (typeof item === "boolean") return item ? 1 : 0;
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw playgroundException("PG_023");
      return item;
    }
    if (typeof item === "string") {
      bytes += item.length;
      if (item.length > PLAYGROUND_FILE_BYTES || bytes > PLAYGROUND_FILE_BYTES) throw playgroundException("PG_026");
      return item;
    }
    throw playgroundException("PG_023");
  });
}

export function runSql(folder: string, statement: string, params: unknown) {
  const write = assertStatement(statement);
  const bound = sqlParams(params);
  const db = new DatabaseSync(path.join(folder, "data.sqlite"), {
    readOnly: !write,
    enableForeignKeyConstraints: true,
  });
  try {
    try {
      db.exec("PRAGMA busy_timeout = 2000");
    } catch {
      // A read-only connection may refuse the timeout pragma. The statement still runs.
    }
    const prepared = db.prepare(statement);
    const returning = /\breturning\b/i.test(stripSql(statement));
    if (!write || returning) {
      const rows = prepared.all(...bound).map(plainRow);
      if (JSON.stringify(rows).length > RESULT_LIMIT) throw playgroundException("PG_026");
      return { rows, changes: 0, lastInsertRowid: null as unknown };
    }
    const result = prepared.run(...bound);
    return {
      rows: [] as Record<string, unknown>[],
      changes: Number(result.changes || 0),
      lastInsertRowid: plainValue(result.lastInsertRowid),
    };
  } finally {
    db.close();
  }
}

function plainRow(row: unknown) {
  const out: Record<string, unknown> = {};
  if (!row || typeof row !== "object") return out;
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    out[key] = plainValue(value);
  }
  return out;
}

function plainValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  return value ?? null;
}

function stripSql(sql: string) {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const current = sql[i];
    const next = sql[i + 1];
    if (current === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
      out += " ";
      continue;
    }
    if (current === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      out += " ";
      continue;
    }
    if (current === "'") {
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      out += "''";
      continue;
    }
    out += current;
    i += 1;
  }
  return out;
}

function fileParts(name: string) {
  const normalized = String(name || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/");
  if (
    parts.length < 1 ||
    parts.length > 8 ||
    parts.some((part) => part === "." || part === ".." || !SEGMENT.test(part))
  ) {
    throw playgroundException("PG_025");
  }
  return parts;
}

function containedPath(folder: string, rootName: string, name: string) {
  const parts = fileParts(name);
  const root = path.resolve(folder, rootName);
  const full = path.resolve(root, ...parts);
  const relative = path.relative(root, full);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw playgroundException("PG_025");
  return full;
}

function chooseMime(bytes: Buffer, declared?: string) {
  return sniff(bytes) || safeMime(declared);
}

function safeMime(value?: string) {
  const mime = String(value || "").split(";")[0].trim().toLowerCase();
  if (mime === "image/jpg") return "image/jpeg";
  return SAFE_MIME.test(mime) ? mime : "application/octet-stream";
}

function sniff(bytes: Buffer) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6) {
    const kind = bytes.toString("ascii", 0, 6);
    if (kind === "GIF87a" || kind === "GIF89a") return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 4 && bytes.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  return "";
}

async function storedMime(folder: string, name: string, bytes: Buffer) {
  try {
    const saved = (await readFile(containedPath(folder, "meta", name), "utf8")).trim();
    const declared = safeMime(saved);
    if (declared !== "application/octet-stream") return declared;
  } catch {
    // A file saved before its type was recorded still has its bytes.
  }
  return chooseMime(bytes);
}

async function writeIfMissing(file: string, text: string) {
  try {
    await access(file);
  } catch {
    await writeFile(file, text);
  }
}
