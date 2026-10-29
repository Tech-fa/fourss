import { catalogHttpError } from '../common/errors/catalog-http-error';

export const USER_ERROR_MAP = {
  USER_001: { message: 'User not found' },
  USER_002: { message: 'Invalid credentials' },
  USER_003: { message: 'User not active yet, please activate it from the form sent to your email' },
  USER_004: { message: 'User not active yet, please contact us to activate your account' },
  USER_005: { message: 'Account is locked. Please contact your administrator' },
  USER_006: { message: "There's no active subscription for this account" },
  USER_007: { message: 'Cannot change email if user has verified their email' },
  USER_008: { message: 'Cannot activate or deactivate user if they have not verified their email' },
  USER_009: { message: 'Email already exists' },
  USER_010: { message: 'Competency not found' },
  USER_011: { message: 'Competency level not found' },
  USER_012: { message: 'User competency already exists' },
  USER_013: { message: 'User competency not found' },
  USER_014: { message: 'Competency level does not belong to the selected competency' },
  USER_015: { message: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character' },
  USER_016: { message: 'Invalid or expired verification code' },
  USER_017: { message: 'User is already verified' },
  USER_018: { message: 'A user must belong to at least one team' },
  USER_019: { message: 'Role is required when assigning teams' },
  USER_020: { message: 'A user can only have one role per team' },
  USER_021: {
    message:
      'You may not remove the admin permissions from the only user with admin permissions',
  },
  USER_022: { message: 'You cannot delete your own user' },
  USER_023: { message: 'Only an admin can assign the Admin role' },
  USER_024: { message: 'Employee interested party not found' },
  USER_025: { message: 'Signature image is required' },
  USER_026: { message: 'Required certifications are missing' },
  USER_027: { message: 'One or more certifications have expired and must be re-submitted' },
  USER_028: { message: 'Certification issue dates must be valid and not in the future' },
  USER_029: { message: 'A file is required for each certification' },
} as const;

export type UserErrorCode = keyof typeof USER_ERROR_MAP;

export function userHttpError(
  code: UserErrorCode,
  options?: { cause?: unknown; message?: string; params?: Record<string, string> },
) {
  return catalogHttpError(USER_ERROR_MAP, code, options);
}
