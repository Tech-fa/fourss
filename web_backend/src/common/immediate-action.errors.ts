import { catalogHttpError } from './errors/catalog-http-error';

export const IMMEDIATE_ACTION_ERROR_MAP = {
  IMMEDIATE_ACTION_001: { message: '{entityName} not found' },
  IMMEDIATE_ACTION_002: {
    message: 'You do not have access to this organization unit',
  },
  IMMEDIATE_ACTION_003: {
    message: 'Immediate Action due date cannot be after the NC due date',
  },
  IMMEDIATE_ACTION_004: {
    message:
      'Immediate action due date cannot be after the non-conformity due date',
  },
  IMMEDIATE_ACTION_005: { message: 'Immediate action not found' },
  IMMEDIATE_ACTION_006: {
    message: 'Cannot modify a completed immediate action',
  },
  IMMEDIATE_ACTION_007: {
    message: 'Cannot delete immediate action that is not open',
  },
  IMMEDIATE_ACTION_009: { message: 'File must be provided' },
  IMMEDIATE_ACTION_010: { message: 'Immediate action evidence not found' },
  IMMEDIATE_ACTION_011: {
    message: 'Checklist document is required for checklist evidence',
  },
  IMMEDIATE_ACTION_012: {
    message: 'This immediate action does not use checklist evidence',
  },
  IMMEDIATE_ACTION_013: {
    message: 'Only the assigned user can sign off this checklist',
  },
  IMMEDIATE_ACTION_014: {
    message: 'All required checklist questions must be answered',
  },
  IMMEDIATE_ACTION_015: {
    message: 'Checklist document not found or is not a checklist',
  },
  IMMEDIATE_ACTION_016: {
    message: 'Checklist document has no questions',
  },
  IMMEDIATE_ACTION_017: {
    message: 'File evidence is not allowed for checklist actions',
  },
  IMMEDIATE_ACTION_018: {
    message: 'Rejection reason is required',
  },
  IMMEDIATE_ACTION_019: {
    message: 'Comment text is required',
  },
  IMMEDIATE_ACTION_020: {
    message: 'Immediate action comment not found',
  },
  IMMEDIATE_ACTION_021: {
    message: 'You can only delete your own comments',
  },
  IMMEDIATE_ACTION_022: {
    message: 'Rejection comments cannot be deleted',
  },
  IMMEDIATE_ACTION_023: {
    message:
      'Assigned user does not have access to this immediate action',
  },
  IMMEDIATE_ACTION_024: {
    message: 'A drawn signature is required',
  },
  IMMEDIATE_ACTION_OPERATION_FAILED: {
    message: 'Unable to complete this request',
  },
} as const;

export type ImmediateActionErrorCode = keyof typeof IMMEDIATE_ACTION_ERROR_MAP;

export function immediateActionHttpError(
  code: ImmediateActionErrorCode,
  options?: {
    cause?: unknown;
    message?: string;
    params?: Record<string, string>;
  },
) {
  return catalogHttpError(IMMEDIATE_ACTION_ERROR_MAP, code, options);
}
