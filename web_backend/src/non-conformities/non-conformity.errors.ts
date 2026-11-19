import { catalogHttpError } from '../common/errors/catalog-http-error';

/** Catalogued API errors for non-conformity module (HTTP body: { key, message, params? }). */
export const NON_CONFORMITY_ERROR_MAP = {
  NON_CONFORMITY_001: {
    message:
      'Responsible user does not belong to the selected team',
  },
  NON_CONFORMITY_002: { message: 'Category with this name already exists' },
  NON_CONFORMITY_003: {
    message: 'Duplicate custom field labels are not allowed',
  },
  NON_CONFORMITY_004: { message: 'Parent category not found' },
  NON_CONFORMITY_005: { message: 'Category not found' },
  NON_CONFORMITY_006: { message: 'Category cannot be its own parent' },
  NON_CONFORMITY_007: {
    message:
      'Cannot modify custom fields for a category that has open non-conformities',
  },
  NON_CONFORMITY_008: {
    message: 'Cannot delete category with child categories',
  },
  NON_CONFORMITY_009: {
    message: 'Cannot delete category in use by non-conformities',
  },
  NON_CONFORMITY_010: {
    message:
      'Custom field with this label already exists in this category',
  },
  NON_CONFORMITY_011: {
    message: 'Cannot delete custom field that has values',
  },
  NON_CONFORMITY_012: { message: 'Custom field not found' },
  NON_CONFORMITY_013: { message: 'Custom field value not found' },
  NON_CONFORMITY_014: {
    message:
      'Value already exists for this non-conformity and custom field',
  },
  NON_CONFORMITY_015: { message: 'Assigned user not found' },
  NON_CONFORMITY_016: { message: 'Corrective action not found' },
  NON_CONFORMITY_017: { message: 'Non-conformity type already exists' },
  NON_CONFORMITY_018: { message: 'Non-conformity type not found' },
  NON_CONFORMITY_019: {
    message: 'Cannot delete non-conformity type in use by non-conformities',
  },
  NON_CONFORMITY_020: {
    message: 'Risk levels array is required and cannot be empty',
  },
  NON_CONFORMITY_021: {
    message: 'Duplicate risk level name in the list: {name}',
  },
  NON_CONFORMITY_022: {
    message: 'Duplicate risk level order in the list: {order}',
  },
  NON_CONFORMITY_023: { message: 'Duplicate risk level ID in the list: {id}' },
  NON_CONFORMITY_024: {
    message: 'Non-conformity risk level not found for update (ID: {id})',
  },
  NON_CONFORMITY_025: {
    message:
      'Cannot update risk level "{name}" while open non-conformities are still linked to it',
  },
  NON_CONFORMITY_026: {
    message: 'Cannot delete non-conformity risk level in use by non-conformities',
  },
  NON_CONFORMITY_027: { message: 'Non-conformity risk level not found' },
  NON_CONFORMITY_028: {
    message:
      'No team owner found; assign a representative or add a team admin',
  },
  NON_CONFORMITY_029: { message: 'Internal representative (user) not found' },
  NON_CONFORMITY_030: { message: 'Non-conformity representative not found' },
  NON_CONFORMITY_031: { message: 'Representative not found' },
  NON_CONFORMITY_032: {
    message:
      'representativeType must be INTERNAL or EXTERNAL when representativeId is provided',
  },
  NON_CONFORMITY_033: {
    message: 'You do not have access to this team',
  },
  NON_CONFORMITY_034: { message: 'Problem statement is required' },
  NON_CONFORMITY_035: { message: 'Invalid customFieldValues format' },
  NON_CONFORMITY_036: { message: 'Non-conformity not found' },
  NON_CONFORMITY_037: { message: 'Non-conformity is already closed' },
  NON_CONFORMITY_038: {
    message:
      'Cannot close while immediate actions are still open; close them first',
  },
  NON_CONFORMITY_039: {
    message:
      'Cannot close: investigation is required but none has been created yet',
  },
  NON_CONFORMITY_040: {
    message: 'Create a root cause analysis before closing this non-conformity',
  },
  NON_CONFORMITY_041: {
    message: 'Complete root cause analysis data before closing',
  },
  NON_CONFORMITY_042: {
    message:
      'At least one corrective action must be created and closed before closing',
  },
  NON_CONFORMITY_043: {
    message: 'Upload investigation evidence before closing',
  },
  NON_CONFORMITY_044: { message: 'Failed to upload custom field files' },
  NON_CONFORMITY_045: { message: 'Representative already exists' },
  NON_CONFORMITY_047: {
    message: 'Another representative is already using this email',
  },
  NON_CONFORMITY_048: {
    message:
      'Cannot delete non-conformity representative in use by non-conformities',
  },
  NON_CONFORMITY_049: {
    message:
      'Assigned user does not belong to the non-conformity team',
  },
  NON_CONFORMITY_050: {
    message: 'Cannot modify a completed corrective action',
  },
  NON_CONFORMITY_051: {
    message:
      'Cannot apply corrective action while change requests are pending',
  },
  NON_CONFORMITY_052: {
    message:
      'A change request of the same type is already pending for this corrective action',
  },
  NON_CONFORMITY_053: {
    message:
      'You are not authorized to create a change request for this corrective action',
  },
  NON_CONFORMITY_054: { message: 'CA change request not found' },
  NON_CONFORMITY_055: {
    message: 'Cannot delete a pending change request',
  },
  NON_CONFORMITY_056: {
    message: 'Closing a non-conformity must use the dedicated close endpoint',
  },
  NON_CONFORMITY_057: {
    message: 'Root cause analysis already exists for this non-conformity',
  },
  NON_CONFORMITY_058: {
    message: 'One or more users selected as performers were not found',
  },
  NON_CONFORMITY_059: {
    message:
      'Cannot change analysis method after implementation has already started',
  },
  NON_CONFORMITY_060: {
    message: 'Could not load the updated root cause analysis',
  },
  NON_CONFORMITY_061: {
    message: 'Fishbone analysis already exists for this root cause analysis',
  },
  NON_CONFORMITY_062: { message: 'Fishbone analysis not found' },
  NON_CONFORMITY_063: { message: 'Access denied' },
  NON_CONFORMITY_064: { message: 'Insufficient permissions' },
  NON_CONFORMITY_065: { message: 'Investigation not found' },
  NON_CONFORMITY_066: {
    message: 'Investigation already exists for this non-conformity',
  },
  NON_CONFORMITY_067: { message: 'Investigation evidence not found' },
  NON_CONFORMITY_068: { message: 'File must be provided' },
  NON_CONFORMITY_069: {
    message: 'Categories array is required and cannot be empty',
  },
  NON_CONFORMITY_070: { message: 'Root cause analysis not found' },
  NON_CONFORMITY_071: {
    message: 'Failed to close non-conformity',
  },
  NON_CONFORMITY_072: {
    message: 'Failed to update non-conformity',
  },
  NON_CONFORMITY_073: {
    message: 'Failed to create fishbone analysis',
  },
  NON_CONFORMITY_074: {
    message: 'Failed to update fishbone analysis',
  },
  NON_CONFORMITY_075: {
    message:
      'Problem statement cannot be edited for non-conformities created from a performance indicator',
  },
  NON_CONFORMITY_083: {
    message: 'Audit not found',
  },
  NON_CONFORMITY_084: {
    message: 'Finding not found',
  },
  NON_CONFORMITY_085: {
    message: 'This finding is not on that audit',
  },
  NON_CONFORMITY_079: {
    message:
      'This non-conformity is overdue and cannot be changed. Amend the due date first',
  },
  NON_CONFORMITY_080: {
    message: 'Amended due date must be today or later',
  },
  NON_CONFORMITY_081: {
    message: 'Amended due date must be different from the current due date',
  },
  NON_CONFORMITY_082: {
    message: 'Cannot amend the due date of a closed non-conformity',
  },
  NON_CONFORMITY_OPERATION_FAILED: {
    message: 'Unable to complete this request',
  },
} as const;

export type NonConformityErrorCode = keyof typeof NON_CONFORMITY_ERROR_MAP;

export function nonConformityHttpError(
  code: NonConformityErrorCode,
  options?: {
    cause?: unknown;
    message?: string;
    params?: Record<string, string>;
  },
) {
  return catalogHttpError(NON_CONFORMITY_ERROR_MAP, code, options);
}
