import { catalogHttpError } from "../common/errors/catalog-http-error";

export const STANDARD_ERROR_MAP = {
  STANDARD_001: { message: "Standard not found" },
  STANDARD_004: { message: "Implementation already exists for this standard" },
  STANDARD_005: { message: "Implementation not found" },
  STANDARD_006: { message: "Failed to create implementation" },
  STANDARD_007: { message: "Implementation document not found" },
  STANDARD_008: { message: "Linked document not found" },
  STANDARD_009: { message: "Failed to update implementation document" },
  STANDARD_010: { message: "Failed to delete implementation" },
} as const;

export type StandardErrorCode = keyof typeof STANDARD_ERROR_MAP;

export function standardHttpError(
  code: StandardErrorCode,
  options?: {
    cause?: unknown;
    message?: string;
    params?: Record<string, string>;
  },
) {
  return catalogHttpError(STANDARD_ERROR_MAP, code, options);
}
