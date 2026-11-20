import { BadRequestException } from "@nestjs/common";
import { storedEvidenceUrl } from "./evidence-file";

describe("stored evidence file", () => {
  it("uses a saved file id and leaves a missing id for the upload", async () => {
    const found = await storedEvidenceUrl(
      { evidenceType: "AUDIT_EVIDENCE_FILE", fileId: "file-1" },
      async () => "stored.png",
    );
    expect(found).toBe("stored.png");
    const upload = await storedEvidenceUrl({ evidenceType: "AUDIT_EVIDENCE_FILE" }, async () => null);
    expect(upload).toBeNull();
  });

  it("rejects a file id that is not stored", async () => {
    await expect(
      storedEvidenceUrl({ evidenceType: "AUDIT_EVIDENCE_FILE", fileId: "missing" }, async () => null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});