import { catalogHttpError } from '../common/errors/catalog-http-error';

/** Catalogued document API errors (HTTP body: { key, message, params? }). Matches dashboard `errors.document.*`. */
export const DOCUMENT_ERROR_MAP = {
  DOC_001: { message: 'File, editor content, or checklist is required' },
  DOC_002: { message: 'You do not have access to this team' },
  DOC_003: { message: 'Document category or team not found' },
  DOC_004: {
    message:
      'No approval strategy applies to this document category or team. Contact your administrator.',
  },
  DOC_005: { message: 'Document code already exists' },
  DOC_006: { message: 'Document template not found' },
  DOC_007: { message: 'Document not found' },
  DOC_008: {
    message:
      'Team has no approval strategy. Please contact your administrator to set up an approval strategy before creating a new version.',
  },
  DOC_009: { message: 'Version content is only available for editor documents' },
  DOC_010: { message: 'Version content not found' },
  DOC_011: { message: 'Failed to fetch version content' },
  DOC_012: {
    message: 'Add content to the latest document version before editing.',
  },
  DOC_013: { message: 'Failed to update document' },
  DOC_014: { message: 'Failed to delete document' },
  DOC_015: { message: 'A document category with this category code already exists' },
  DOC_016: { message: 'Failed to create document category' },
  DOC_017: { message: 'Document Category is attached to documents' },
  DOC_018: { message: 'Failed to delete document category' },
  DOC_019: { message: 'Failed to create document' },
  DOC_021: {
    message:
      'One or more selected teams are already associated with another approval strategy',
  },
  DOC_022: { message: 'Failed to create approval strategy' },
  DOC_023: { message: 'Failed to get approval strategies' },
  DOC_024: { message: 'Approval strategy not found' },
  DOC_025: {
    message:
      'Cannot update approval strategy: There are documents in progress (pending or ready for approval).',
  },
  DOC_026: {
    message:
      'Cannot remove teams: one or more teams have documents.',
  },
  DOC_027: {
    message:
      'Approval strategy is linked to documents and cannot be changed this way.',
  },
  DOC_028: { message: 'Failed to update approval strategy' },
  DOC_029: { message: 'Approval strategy is attached to documents' },
  DOC_030: { message: 'Failed to delete approval strategy' },
  DOC_031: { message: 'You are not a contributor to this document' },
  DOC_032: { message: 'Only approvers can approve or reject documents' },
  DOC_033: { message: 'Only reviewers can review documents' },
  DOC_034: { message: 'Required number of reviews is not there' },
  DOC_035: { message: 'Required number of approvals is not there' },
  DOC_036: { message: 'Failed to create document action' },
  DOC_037: { message: 'Document action not found' },
  DOC_038: { message: 'Failed to get document action' },
  DOC_039: { message: 'Comment not found' },
  DOC_040: { message: 'You can only delete your own comments' },
  DOC_041: { message: 'Only comments can be deleted' },
  DOC_042: { message: 'Action does not belong to this document' },
  DOC_043: { message: 'Failed to delete document action' },
  DOC_044: { message: 'You do not have access to this document' },
  DOC_045: { message: '{title} already has an active change request.' },
  DOC_046: { message: '{titles} already have an active change request.' },
  DOC_047: {
    message:
      '{title} has unpublished versions. Please publish or remove it before creating a change request.',
  },
  DOC_048: {
    message:
      '{titles} have unpublished versions. Please publish or remove them before creating a change request.',
  },
  DOC_049: { message: 'Failed to create change request' },
  DOC_050: { message: 'Change request not found' },
  DOC_051: { message: 'You can only update your own change requests' },
  DOC_052: { message: 'Cannot update a reviewed change request' },
  DOC_053: {
    message: 'Editor content is only allowed for documents with editor content type.',
  },
  DOC_054: { message: 'Change request has already been reviewed' },
  DOC_055: { message: 'You can only delete your own change requests' },
  DOC_056: { message: 'Cannot delete a reviewed change request' },
  DOC_057: { message: 'Editor content is required for this document.' },
  DOC_058: {
    message: 'cannot create a new version while another one is still in progress',
  },
  DOC_059: {
    message: 'cannot create a new version while a change request is pending',
  },
  DOC_060: { message: 'Failed to create new document version' },
  DOC_061: { message: 'A template with this title already exists' },
  DOC_062: { message: 'Failed to create document template' },
  DOC_063: { message: 'Default templates cannot be modified' },
  DOC_064: { message: 'Failed to update document template' },
  DOC_065: { message: 'No file provided' },
  DOC_066: { message: 'Version not found' },
  DOC_067: {
    message: 'Cannot replace file content on a pending FILE document',
  },
  DOC_068: { message: 'Editor content is required' },
  DOC_069: {
    message: 'Editor content can only be set for editor-type documents',
  },
  DOC_070: {
    message: 'Content can only be added while the version is pending review',
  },
  DOC_071: { message: 'Document Template is attached to documents' },
  DOC_072: { message: 'Failed to delete document template' },
  DOC_074: { message: 'Document category not found' },
  DOC_075: { message: 'A document category with this name already exists' },
  DOC_076: { message: 'Failed to update document category' },
  DOC_077: { message: 'Failed to get document template' },
  DOC_078: { message: 'Failed to upload version file' },
  DOC_079: { message: 'Failed to upload version editor content' },
  DOC_080: { message: 'Failed to update change request' },
  DOC_081: { message: 'Failed to review change request' },
  DOC_082: { message: 'Failed to delete change request' },
  DOC_083: { message: 'Failed to save document draft' },
  DOC_084: { message: 'Version does not belong to this document' },
  DOC_085: { message: 'Document draft not found' },
  DOC_086: { message: 'Failed to delete document draft' },
  DOC_087: {
    message: 'This document category already has an approval strategy',
  },
  DOC_088: {
    message:
      'Approval strategy must be linked to either a document category or at least one team',
  },
  DOC_089: {
    message:
      'Approval strategy cannot be linked to both a document category and teams',
  },
  DOC_090: {
    message:
      'Approval strategy scope cannot be changed between document category and teams',
  },
  DOC_091: {
    message:
      'Category approval strategies must use selected reviewers and approvers only',
  },
  DOC_092: {
    message:
      'Cannot change category: an approval strategy is assigned to this category.',
  },
  DOC_093: {
    message:
      'Only the document creator, reviewers, or approvers can save review comments',
  },
  DOC_094: {
    message:
      'Review comments can only be saved while the version is under review',
  },
  DOC_095: { message: 'Failed to save review comments' },
  DOC_096: { message: 'Failed to create document acknowledgement' },
  DOC_097: { message: 'Failed to get document acknowledgements' },
  DOC_098: { message: 'Document acknowledgement not found' },
  DOC_099: {
    message:
      'Cannot update document acknowledgement: There are documents in progress (pending or ready for approval).',
  },
  DOC_100: {
    message:
      'Cannot remove teams: one or more teams have documents.',
  },
  DOC_101: {
    message:
      'Document acknowledgement is linked to documents and cannot be changed this way.',
  },
  DOC_102: { message: 'Failed to update document acknowledgement' },
  DOC_103: { message: 'Document acknowledgement is attached to documents' },
  DOC_104: { message: 'Failed to delete document acknowledgement' },
  DOC_105: {
    message: 'This document category already has a document acknowledgement',
  },
  DOC_106: {
    message:
      'Document acknowledgement must be linked to either a document category or at least one team',
  },
  DOC_107: {
    message:
      'Document acknowledgement cannot be linked to both a document category and teams',
  },
  DOC_108: {
    message:
      'Document acknowledgement scope cannot be changed between document category and teams',
  },
  DOC_109: {
    message:
      'Category document acknowledgements must use selected users only',
  },
  DOC_110: {
    message: 'Only assigned acknowledgers can acknowledge this document',
  },
  DOC_111: {
    message: 'Only the latest document version can be acknowledged',
  },
  DOC_112: {
    message:
      'Document version must be published or obsolete before it can be acknowledged',
  },
  DOC_113: { message: 'Checklist is required for checklist documents' },
  DOC_114: {
    message: 'Checklist can only be set for checklist-type documents',
  },
  DOC_115: { message: 'Failed to save version checklist' },
  DOC_116: { message: 'Invalid checklist payload' },
  DOC_117: {
    message: 'File content can only be set for file-type documents',
  },
  DOC_118: {
    message:
      'New approval strategies must be linked to a document category. Use the default strategy for all other categories.',
  },
  DOC_119: {
    message: 'The default approval strategy cannot be deleted',
  },
  DOC_120: { message: 'Failed to generate document content' },
  DOC_121: {
    message: 'One or more processes are not linked to the selected team',
  },
  DOC_122: {
    message:
      'Earlier reviewers must finish before you can review this document',
  },
  DOC_123: {
    message:
      'Earlier approvers must finish before you can approve or reject this document',
  },
  DOC_124: { message: 'This document has no extracted text' },
  DOC_125: {
    message: 'Only the document owner can add or remove contributors',
  },
  DOC_126: {
    message:
      'Only the document owner or a contributor can edit this document or create a new version',
  },
  DOC_127: {
    message:
      'One or more selected people cannot edit documents for this team',
  },
  DOC_128: {
    message:
      'The document owner does not need to be added as a contributor',
  },
  DOC_129: { message: 'This person is not a contributor on this document' },
} as const;

export type DocumentErrorCode = keyof typeof DOCUMENT_ERROR_MAP;

export function documentHttpError(
  code: DocumentErrorCode,
  options?: { cause?: unknown; message?: string; params?: Record<string, string> },
) {
  return catalogHttpError(DOCUMENT_ERROR_MAP, code, options);
}
