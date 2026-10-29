import { catalogHttpError } from '../common/errors/catalog-http-error';

/** Catalogued API errors for auth module (HTTP body: { key, message, params? }). */
export const AUTH_ERROR_MAP = {
  AUTH_001: { message: 'Client is not active' },
  AUTH_002: { message: 'invalid user email' },
  AUTH_003: { message: 'Invalid validation code!' },
  AUTH_004: { message: 'Account already verified' },
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_MAP;

export function authHttpError(
  code: AuthErrorCode,
  options?: {
    cause?: unknown;
    message?: string;
    params?: Record<string, string>;
  },
) {
  return catalogHttpError(AUTH_ERROR_MAP, code, options);
}
