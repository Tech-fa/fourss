import { catalogHttpError } from '../common/errors/catalog-http-error';

export const PERMISSION_ERROR_MAP = {
  PERMISSION_001: { message: 'All permissions must be of the same scope' },
  PERMISSION_002: { message: 'Invalid permissions provided' },
  PERMISSION_003: { message: 'Role not found, or is not custom' },
  PERMISSION_004: { message: 'Scope cannot be changed' },
  PERMISSION_005: { message: 'Role is still in use' },
  PERMISSION_006: { message: 'Cannot remove team membership while it is still required' },
  PERMISSION_007: { message: 'Cannot remove the user from these teams' },
  PERMISSION_008: { message: 'You may not remove the admin permissions from the only user with admin permissions' },
  PERMISSION_009: { message: 'Cannot add user as team owner' },
  PERMISSION_010: { message: 'Role not found' },
  PERMISSION_011: { message: 'Invalid role scope for team assignment' },
  PERMISSION_012: { message: 'Team ids are required for non-admin roles' },
  PERMISSION_013: { message: 'Team membership not found' },
  PERMISSION_014: { message: 'You cannot remove this role from the user' },
  PERMISSION_015: { message: 'Team not found' },
  PERMISSION_016: { message: 'A user must belong to at least one team' },
  PERMISSION_017: {
    message: 'A user can only have one role per team',
  },
} as const;

export type PermissionErrorCode = keyof typeof PERMISSION_ERROR_MAP;

export function permissionHttpError(
  code: PermissionErrorCode,
  options?: { cause?: unknown; message?: string; params?: Record<string, string> },
) {
  return catalogHttpError(PERMISSION_ERROR_MAP, code, options);
}
