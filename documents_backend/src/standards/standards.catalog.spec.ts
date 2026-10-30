import { ImplementationDocumentStatus } from "./standards.enums";
import {
  computeImplementationStatus,
  countImplemented,
  getStandard,
  listStandards,
  snapshotRequiredDocuments,
} from "./standards.catalog";
import { STANDARDS } from "./standards.config";

describe("standards catalog", () => {
  it("exposes the four uploaded ISO standards", () => {
    expect(listStandards().map((standard) => standard.key)).toEqual([
      "iso-9001-2015",
      "iso-27001-2022",
      "iso-45001-2018",
      "iso-14001-2026",
    ]);
  });

  it("lists required documents for every standard", () => {
    for (const standard of STANDARDS) {
      expect(standard.requiredDocuments.length).toBeGreaterThan(0);
      const keys = standard.requiredDocuments.map((document) => document.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const document of standard.requiredDocuments) {
        expect(document.title).toBeTruthy();
        expect(document.clause).toBeTruthy();
        expect(["maintain", "retain"]).toContain(document.kind);
      }
    }
  });

  it("finds a standard by key and ignores unknown keys", () => {
    expect(getStandard("iso-27001-2022")?.name).toBe("ISO/IEC 27001:2022");
    expect(getStandard("iso-00000")).toBeUndefined();
  });

  it("snapshots required documents as not started", () => {
    const standard = getStandard("iso-9001-2015");
    expect(standard).toBeDefined();
    const docs = snapshotRequiredDocuments(standard!, 100);
    expect(docs).toHaveLength(standard!.requiredDocuments.length);
    expect(docs[0]).toMatchObject({
      documentKey: standard!.requiredDocuments[0].key,
      status: ImplementationDocumentStatus.NOT_STARTED,
      sortOrder: 0,
      updatedAt: 100,
    });
  });

  it("marks an implementation complete only when every document is implemented", () => {
    expect(
      computeImplementationStatus([
        { status: ImplementationDocumentStatus.IMPLEMENTED },
        { status: ImplementationDocumentStatus.IN_PROGRESS },
      ]),
    ).toBe("in_progress");
    expect(
      computeImplementationStatus([
        { status: ImplementationDocumentStatus.IMPLEMENTED },
        { status: ImplementationDocumentStatus.IMPLEMENTED },
      ]),
    ).toBe("completed");
    expect(countImplemented([
      { status: ImplementationDocumentStatus.IMPLEMENTED },
      { status: ImplementationDocumentStatus.NOT_STARTED },
    ])).toBe(1);
  });
});
