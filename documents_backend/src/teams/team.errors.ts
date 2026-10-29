import { catalogHttpError } from '../common/errors/catalog-http-error';

export const TEAM_ERROR_MAP = {
  TEAM_002: { message: 'Team not found' },
  TEAM_007: {
    message: 'This team is referenced by other records and cannot be deleted',
  },
  TEAM_008: { message: 'Failed to delete team' },
  TEAM_016: { message: 'Cannot delete the only team for this company' },
  TEAM_018: { message: 'Role not found' },
  TEAM_019: {
    message: 'Cannot assign the Admin role from this form',
  },
  TEAM_020: { message: 'One or more selected users were not found' },
  TEAM_021: {
    message: 'Each user can only be assigned once per team',
  },
  TEAM_022: {
    message: 'Admin users cannot be removed or changed on a single team',
  },
  TEAM_023: {
    message: 'There must always be at least one Admin user',
  },
} as const;

export type TeamErrorCode = keyof typeof TEAM_ERROR_MAP;

export function teamHttpError(
  code: TeamErrorCode,
  options?: { cause?: unknown; message?: string; params?: Record<string, string> },
) {
  return catalogHttpError(TEAM_ERROR_MAP, code, options);
}
