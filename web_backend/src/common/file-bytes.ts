export const CONNECTION_FILE_BYTES = 20 * 1024 * 1024;

export function bytesFromProgram(value: unknown): Buffer {
  if (typeof value === "string") {
    let binary = true;
    for (let i = 0; i < value.length; i += 1) {
      if (value.charCodeAt(i) > 255) {
        binary = false;
        break;
      }
    }
    return Buffer.from(value, binary ? "latin1" : "utf8");
  }
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (Array.isArray(value)) return bytesFromNumbers(value);
  if (value && typeof value === "object") {
    const data = (value as { data?: unknown }).data;
    if (Array.isArray(data)) return bytesFromNumbers(data);
    const keys = Object.keys(value);
    if (keys.length && keys.every((key) => /^\d+$/.test(key))) {
      return bytesFromNumbers(keys.map((key) => (value as Record<string, unknown>)[key]));
    }
  }
  throw new Error("ctx.save needs the file bytes as a string or a Uint8Array.");
}

export function assertFileSize(bytes: Buffer) {
  if (!bytes.length) throw new Error("The file is empty.");
  if (bytes.length > CONNECTION_FILE_BYTES) throw new Error("That file is larger than 20 MB.");
}

export function contentTypeFor(name: string, given?: string): string {
  const explicit = String(given || "").split(";")[0].trim().toLowerCase();
  if (explicit && !/[\r\n]/.test(explicit)) return explicit.slice(0, 255);
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

function bytesFromNumbers(values: unknown[]): Buffer {
  if (values.length > CONNECTION_FILE_BYTES) throw new Error("That file is larger than 20 MB.");
  const bytes = Buffer.alloc(values.length);
  for (let i = 0; i < values.length; i += 1) {
    const n = values[i];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 255) {
      throw new Error("ctx.save needs the file bytes as a string or a Uint8Array.");
    }
    bytes[i] = n;
  }
  return bytes;
}
