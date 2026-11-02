import * as crypto from "crypto";

export type ShareCodeScope = "list" | "document";

export type ShareCodePayload = {
  v: 1;
  sid: string;
  email: string;
  impl: number;
  scope: ShareCodeScope;
  doc?: number;
  exp: number;
};

const PAD_BYTES = 384;
const MAX_CODE_LENGTH = 4096;

export function normalizeShareEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashShareEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeShareEmail(email))
    .digest("hex");
}

export function sealShareCode(
  payload: ShareCodePayload,
  secret: string,
): string {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      email: normalizeShareEmail(payload.email),
      pad: crypto.randomBytes(PAD_BYTES).toString("base64url"),
    }),
  );
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", codeKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}

export function openShareCode(
  code: string,
  secret: string,
): ShareCodePayload | null {
  if (!code || code.length < 80 || code.length > MAX_CODE_LENGTH) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const raw = Buffer.from(code, "base64url");
    if (raw.length < 12 + 16 + 16) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      codeKey(secret),
      raw.subarray(0, 12),
    );
    decipher.setAuthTag(raw.subarray(12, 28));
    const plain = Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]);
    return parsePayload(JSON.parse(plain.toString("utf8")));
  } catch {
    return null;
  }
}

function codeKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function parsePayload(value: unknown): ShareCodePayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const doc = record.doc;
  const docOk =
    doc === undefined || (typeof doc === "number" && Number.isInteger(doc));
  if (
    record.v !== 1 ||
    typeof record.sid !== "string" ||
    record.sid.length === 0 ||
    record.sid.length > 64 ||
    typeof record.email !== "string" ||
    record.email.length === 0 ||
    record.email.length > 320 ||
    typeof record.impl !== "number" ||
    !Number.isInteger(record.impl) ||
    (record.scope !== "list" && record.scope !== "document") ||
    typeof record.exp !== "number" ||
    !docOk
  ) {
    return null;
  }
  return {
    v: 1,
    sid: record.sid,
    email: record.email,
    impl: record.impl,
    scope: record.scope,
    doc: typeof doc === "number" ? doc : undefined,
    exp: record.exp,
  };
}
