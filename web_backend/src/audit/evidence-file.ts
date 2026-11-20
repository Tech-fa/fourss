import { BadRequestException } from "@nestjs/common";
import { auditHttpError } from "./audit.errors";
import { AuditFindingEvidenceType } from "./entities/audit-finding-evidence.entity";

export async function storedEvidenceUrl(
  evidence: { evidenceType?: string; fileId?: unknown },
  findFileUrl: (id: string) => Promise<string | null>,
): Promise<string | null> {
  if (evidence.evidenceType !== AuditFindingEvidenceType.AUDIT_EVIDENCE_FILE) return null;
  if (typeof evidence.fileId !== "string" || !evidence.fileId.trim()) return null;
  const fileUrl = await findFileUrl(evidence.fileId.trim());
  if (!fileUrl) throw new BadRequestException(auditHttpError("AUDIT_084"));
  return fileUrl;
}
