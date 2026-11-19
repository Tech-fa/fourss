import { catalogHttpError } from '../common/errors/catalog-http-error';

/** Catalogued audit API errors (HTTP body: { key, message, params? }). Matches dashboard `errors.audit.*`. */
export const AUDIT_ERROR_MAP = {
  AUDIT_001: { message: 'Audit role name already exists' },
  AUDIT_002: { message: 'Audit role not found' },
  AUDIT_003: {
    message:
      'Cannot delete this audit role because it is used in one or more audit instances',
  },
  AUDIT_004: { message: 'Audit Criteria name already exists' },
  AUDIT_005: { message: 'Failed to add audit criteria' },
  AUDIT_006: { message: 'Audit criteria not found' },
  AUDIT_007: { message: 'Failed to update audit criteria' },
  AUDIT_008: {
    message: 'Audit criteria is used in one or more audit instances',
  },
  AUDIT_009: { message: 'Audit activity type name already exists' },
  AUDIT_010: { message: 'Failed to add activity type' },
  AUDIT_011: { message: 'Audit activity type not found' },
  AUDIT_012: { message: 'Failed to update activity type' },
  AUDIT_013: { message: 'Audit activity type has audit program' },
  AUDIT_014: { message: 'Audit activity type has checklist definition' },
  AUDIT_015: { message: 'Personnel already exists' },
  AUDIT_016: { message: 'Failed to create audit personnel' },
  AUDIT_017: { message: 'Audit personnel not found' },
  AUDIT_018: { message: 'Email already exists' },
  AUDIT_019: {
    message:
      'Cannot deactivate this audit personnel because they are used as a team member in one or more audit instances',
  },
  AUDIT_020: {
    message:
      'Cannot delete this audit personnel because they are used as a team member in one or more audit instances',
  },
  AUDIT_021: { message: 'Audit document type name already exists' },
  AUDIT_022: { message: 'Audit document type not found' },
  AUDIT_023: { message: 'Audit program title already exists' },
  AUDIT_024: {
    message:
      'You do not have access to one or more selected teams',
  },
  AUDIT_025: { message: 'Failed to create audit program' },
  AUDIT_026: { message: 'Audit program not found' },
  AUDIT_027: {
    message:
      'Cannot change audit program status from Planned to Draft when it has audit instances',
  },
  AUDIT_028: {
    message:
      'Cannot change activity type because audit instances of this audit program use checklists of this activity type. Please remove the audit instances first.',
  },
  AUDIT_029: {
    message:
      'Cannot remove a team because audit instances of this audit program use checklists associated with that team. Please remove the audit instances first.',
  },
  AUDIT_030: { message: 'Audit instance not found' },
  AUDIT_031: {
    message: 'Cannot delete audit program as it has audit instances',
  },
  AUDIT_032: { message: 'Checklist definition not found' },
  AUDIT_033: { message: 'No version found for this checklist definition' },
  AUDIT_034: {
    message:
      'Checklist definition title already exists within the selected team(s)',
  },
  AUDIT_035: {
    message:
      'Cannot delete checklist definition as it is in use by one or more audit instances',
  },
  AUDIT_036: {
    message:
      'Cannot create audit findings when the audit is on hold or completed',
  },
  AUDIT_037: {
    message: 'You do not have access to this audit checklist response',
  },
  AUDIT_038: { message: 'Team member not found in this audit instance' },
  AUDIT_039: { message: 'Audit checklist response not found' },
  AUDIT_040: { message: 'Audit finding title already exists' },
  AUDIT_041: { message: 'Failed to create audit finding' },
  AUDIT_042: { message: 'Failed to find audit findings' },
  AUDIT_043: { message: 'Audit finding not found' },
  AUDIT_044: { message: 'Failed to find audit finding' },
  AUDIT_045: { message: 'An audit finding with this title already exists' },
  AUDIT_046: { message: 'Failed to update audit finding' },
  AUDIT_047: { message: 'Failed to delete audit finding' },
  AUDIT_048: {
    message: 'Cannot create audit instance with a draft checklist definition',
  },
  AUDIT_049: {
    message:
      'This audit instance cannot be updated while its status is {status}. Provide an audit summary to save changes.',
  },
  AUDIT_050: {
    message:
      'Cannot assign a draft checklist definition to an audit instance',
  },
  AUDIT_051: { message: 'Failed to delete audit instance' },
  AUDIT_052: { message: 'Cannot start audit without at least one assigned checklist' },
  AUDIT_053: {
    message:
      'Cannot complete the audit. You have answered {answered} of {total} questions. Please answer all questions.',
  },
  AUDIT_054: {
    message:
      'Cannot complete the audit. No checklist questions were found for the assigned checklists.',
  },
  AUDIT_055: { message: 'Failed to upload audit report file' },
  AUDIT_056: { message: 'Audit report not found' },
  AUDIT_057: { message: 'Failed to delete audit checklist response' },
  AUDIT_058: { message: 'You do not have access to this audit instance' },
  AUDIT_059: { message: 'Responses must be an array' },
  AUDIT_060: {
    message:
      'Cannot update audit results when the audit is on hold or completed',
  },
  AUDIT_061: { message: 'Failed to process bulk audit checklist responses' },
  AUDIT_062: { message: 'Document not found' },
  AUDIT_063: { message: 'Cannot modify or delete a default audit type' },
  AUDIT_064: { message: 'Cannot modify or delete a default audit role' },
  AUDIT_065: { message: 'Audit program schedule month must be between 1 and 12' },
  AUDIT_066: { message: 'Amendment reason is required for unplanned audits' },
  AUDIT_067: { message: 'Audit program schedule entry not found' },
  AUDIT_068: { message: 'Linked audit instance does not belong to this audit program' },
  AUDIT_069: { message: 'Cannot modify or delete a default audit criterion' },
  AUDIT_070: { message: 'Standard name already exists' },
  AUDIT_071: { message: 'Failed to add standard' },
  AUDIT_072: { message: 'Process is required for schedule entries and unplanned audits' },
  AUDIT_073: { message: 'Linked user not found' },
  AUDIT_074: { message: 'This user is already linked to audit personnel' },
  AUDIT_075: { message: 'User is required for internal audit personnel' },
  AUDIT_076: {
    message: 'Name and email are required for external audit personnel',
  },
  AUDIT_077: {
    message:
      'This email belongs to an existing user. Add them as internal personnel instead',
  },
  AUDIT_078: {
    message: 'A program needs a start date and a duration of at least 1 year',
  },
  AUDIT_079: {
    message: 'The schedule date must fall within the program period',
  },
  AUDIT_080: { message: 'Failed to upload the attachment' },
  AUDIT_081: { message: 'Attachment not found' },
  AUDIT_082: {
    message: 'Attachments can only be changed while the audit is in progress',
  },
  AUDIT_083: { message: 'Choose a file to attach' },
} as const;

export type AuditErrorCode = keyof typeof AUDIT_ERROR_MAP;

export function auditHttpError(
  code: AuditErrorCode,
  options?: {
    cause?: unknown;
    message?: string;
    params?: Record<string, string>;
  },
) {
  return catalogHttpError(AUDIT_ERROR_MAP, code, options);
}
