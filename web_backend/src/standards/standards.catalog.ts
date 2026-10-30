import {
  STANDARDS,
  type StandardDefinition,
  type StandardKey,
} from "./standards.config";
import {
  ImplementationDocumentStatus,
  ImplementationStatus,
} from "./standards.enums";

export function listStandards(): StandardDefinition[] {
  return STANDARDS;
}

export function getStandard(key: string): StandardDefinition | undefined {
  return STANDARDS.find((standard) => standard.key === key);
}

export function isStandardKey(key: string): key is StandardKey {
  return STANDARDS.some((standard) => standard.key === key);
}

export function snapshotRequiredDocuments(
  standard: StandardDefinition,
  now: number,
) {
  return standard.requiredDocuments.map((document, index) => ({
    documentKey: document.key,
    title: document.title,
    clause: document.clause,
    description: document.description,
    kind: document.kind,
    status: ImplementationDocumentStatus.NOT_STARTED,
    sortOrder: index,
    updatedAt: now,
  }));
}

export function computeImplementationStatus(
  documents: { status: ImplementationDocumentStatus }[],
): ImplementationStatus {
  if (
    documents.length > 0 &&
    documents.every(
      (document) => document.status === ImplementationDocumentStatus.IMPLEMENTED,
    )
  ) {
    return ImplementationStatus.COMPLETED;
  }
  return ImplementationStatus.IN_PROGRESS;
}

export function countImplemented(
  documents: { status: ImplementationDocumentStatus }[],
): number {
  return documents.filter(
    (document) => document.status === ImplementationDocumentStatus.IMPLEMENTED,
  ).length;
}
