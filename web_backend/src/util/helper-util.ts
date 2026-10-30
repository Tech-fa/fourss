import { HttpException, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import axios from "axios";

import * as bcrypt from "bcrypt";

export interface AppResponse {
  status: number;
  data?: any;
}
export const updateObject = (target, updates) => {
  const filteredUpdates = Object.entries(updates).filter(
    ([key, value]) => value !== undefined,
  );
  return { ...target, ...Object.fromEntries(filteredUpdates) };
};

export const emptyToNull = ({ value }: { value: unknown }) =>
  value === "" || value === "null" ? null : value;

export type AssignDefinedOptions<T> = {
  keys?: (keyof T)[];
  transforms?: {
    [K in keyof T]?: (value: NonNullable<T[K]>) => T[K];
  };
};

export function assignDefined<T extends object>(
  target: T,
  source: Partial<T> | Record<string, unknown>,
  options?: AssignDefinedOptions<T> | (keyof T)[],
): T {
  const keys = Array.isArray(options) ? options : options?.keys;
  const transforms = Array.isArray(options) ? undefined : options?.transforms;
  const keysToAssign = keys ?? (Object.keys(source as object) as (keyof T)[]);

  for (const key of keysToAssign) {
    const value = (source as Record<string, unknown>)[key as string];
    if (value !== undefined) {
      const transform = transforms?.[key];
      (target as Record<string, unknown>)[key as string] = transform
        ? transform(value as never)
        : value;
    }
  }

  return target;
}
export const formatResponse = async (
  logger: Logger,
  dataPromise: Promise<any>,
  response: any,
  endpoint: string,
): Promise<AppResponse | undefined> => {
  logger.log(`executing ${endpoint}`);
  try {
    const data = await dataPromise;
    checkForForbiddenAttributes(data);
    response.status(200).send(data);

    logger.log(`returning successful result for ${endpoint}`);
    return data;
  } catch (error) {
    logger.error(error);
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      const payload =
        typeof body === "string" ? { statusCode: status, message: body } : body;
      response.status(status).json(payload);
      return;
    }
    const message = error instanceof Error ? error.message : "Request failed";
    response.status(400).json({ message });
    return;
  }
};
function checkForForbiddenAttributes(data: any) {
  function removePassword(obj: any) {
    if (!obj || typeof obj !== "object") return;
    if (obj.password) {
      obj.password = undefined;
    }

    Object.values(obj).forEach((value) => {
      if (value && typeof value === "object") {
        removePassword(value);
      }
    });
  }

  removePassword(data);
}

const encryptionPass = () => process.env.ENCRYPTION_KEY ?? "";

// An encrypt function
export async function encrypt(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const algorithm = "aes-192-cbc";

    const key = crypto.scryptSync(encryptionPass(), "GfG", 24);

    const iv = Buffer.alloc(16, 0);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = "";

    // Reading data
    cipher.on("readable", () => {
      let chunk;
      while (null !== (chunk = cipher.read())) {
        encrypted += chunk.toString("base64");
      }
    });

    // Handling end event
    cipher.on("end", () => {
      resolve(encrypted);
    });
    cipher.on("error", (err) => {
      reject(err);
    });
    // Writing data
    cipher.write(text);
    cipher.end();
  });
}
export function decrypt(text): Promise<string> {
  return new Promise((resolve, reject) => {
    // Defining algorithm
    const algorithm = "aes-192-cbc";

    // Defining key
    const key = crypto.scryptSync(encryptionPass(), "GfG", 24);

    // Defining iv
    const iv = Buffer.alloc(16, 0);

    // Creating decipher
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    // Declaring decrypted
    let decrypted = "";
    // Reading data
    decipher.on("readable", () => {
      let chunk;
      while (null !== (chunk = decipher.read())) {
        decrypted += chunk.toString("utf8");
      }
    });
    // Handling end event
    decipher.on("end", () => {
      resolve(decrypted);
    });

    decipher.on("error", (err) => {
      reject(err);
    });

    decipher.write(text, "base64");
    decipher.end();
  });
}
export function decodeJWT(jwtToken: string) {
  return jwt.decode(jwtToken, { complete: true });
}

export function decodeBase64(b64string: string) {
  const buf = Buffer.from(b64string, "base64");
  return buf.toString("utf-8");
}

export async function httpCall({
  url,
  method,
  body,
  headers,
}: {
  url: string;
  method: string;
  body?: any;
  headers?: any;
}) {
  const res = await axios.request({ url, method, data: body, headers });
  return res;
}

export async function hashPassword(
  plainText: string,
  skipValidation: boolean = false,
): Promise<string> {
  if (
    !skipValidation &&
    !plainText.match(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-_])[A-Za-z\d@$!%*?&-_]{8,}$/,
    )
  ) {
    throw new Error(
      "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    );
  }
  const salt = await bcrypt.genSalt();
  return await bcrypt.hash(plainText, salt);
}

export function snakeToCamelCase(str: string): string {
  return str
    .split("_")
    .map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}



export const getStartOfTodayEpoch = (): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

export const isTimestampWithinToday = (timestamp: number): boolean => {
  const startOfToday = getStartOfTodayEpoch();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1; // 23:59:59.999
  return timestamp >= startOfToday && timestamp <= endOfToday;
};

// CSV helpers (backend-side)
export function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < row.length) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
    i++;
  }
  result.push(current);
  return result;
}

export function normalizeIds(ids?: number[]): number[] {
  return [...new Set((ids ?? []).map((id) => Number(id)).filter(Boolean))];
}
export function normalizeStrings(strings?: string[]): string[] {
  return [
    ...new Set((strings ?? []).map((string) => string?.trim()).filter(Boolean)),
  ];
}

export function userCanAccessControl(
  userTeamIds: number[],
  destinationTeamIds: number[],
): boolean {
  return userTeamIds.every((id) => destinationTeamIds.includes(id));
}

export function getCsvLines(content: string): string[] {
  if (!content) return [];
  return content.split("\n").filter((line) => line.trim());
}

export function getCsvHeaders(content: string): string[] {
  const lines = getCsvLines(content);
  if (lines.length === 0) return [];
  return parseCsvRow(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ""));
}

export type SupportingDocumentExpirationConfig = {
  hasExpirationDate: boolean;
  renewalPeriodValue: number | null;
  renewalPeriodUnit: string | null;
};

const startOfUtcDay = (timestamp: number) => {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const addUtcMonths = (timestamp: number, months: number) => {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    date.getUTCDate(),
  );
};

const addUtcYears = (timestamp: number, years: number) => {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear() + years,
    date.getUTCMonth(),
    date.getUTCDate(),
  );
};

export const computeProviderDocumentExpiryDate = (
  documentDateMs: number,
  renewalPeriodValue: number,
  renewalPeriodUnit: string,
): number => {
  const start = startOfUtcDay(documentDateMs);
  return renewalPeriodUnit === "month"
    ? addUtcMonths(start, renewalPeriodValue)
    : addUtcYears(start, renewalPeriodValue);
};

export const isProviderDocumentExpired = (
  supportingDocument: SupportingDocumentExpirationConfig,
  documentDateMs: number,
  todayMs = Date.now(),
): boolean => {
  if (!supportingDocument.hasExpirationDate) {
    return false;
  }
  if (
    !supportingDocument.renewalPeriodValue ||
    !supportingDocument.renewalPeriodUnit
  ) {
    return false;
  }

  const expiryDay = computeProviderDocumentExpiryDate(
    documentDateMs,
    supportingDocument.renewalPeriodValue,
    supportingDocument.renewalPeriodUnit,
  );

  return startOfUtcDay(todayMs) >= expiryDay;
};

export const getLocalStartOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const isProviderEvaluationOverdue = (
  evaluationDueDate: number,
  result: string | null | undefined,
  todayMs = Date.now(),
): boolean => {
  if (result != null) {
    return false;
  }

  return getLocalStartOfDay(todayMs) > getLocalStartOfDay(evaluationDueDate);
};
