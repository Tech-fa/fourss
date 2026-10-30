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

  it("includes Annex A controls that require documented information", () => {
    const documents = getStandard("iso-27001-2022")?.requiredDocuments ?? [];
    const annex = documents.filter((document) => document.clause.startsWith("A."));
    expect(annex.map((document) => document.clause)).toEqual([
      "A.5.1",
      "A.5.2",
      "A.5.9",
      "A.5.10",
      "A.5.11",
      "A.5.12",
      "A.5.13",
      "A.5.14",
      "A.5.15",
      "A.5.18",
      "A.5.19",
      "A.5.20",
      "A.5.21",
      "A.5.23",
      "A.5.24",
      "A.5.26",
      "A.5.27",
      "A.5.28",
      "A.5.29",
      "A.5.30",
      "A.5.31",
      "A.5.32",
      "A.5.33",
      "A.5.34",
      "A.5.35",
      "A.5.36",
      "A.5.37",
      "A.6.1",
      "A.6.2",
      "A.6.3",
      "A.6.4",
      "A.6.5",
      "A.6.6",
      "A.6.7",
      "A.7.2",
      "A.7.7",
      "A.7.10",
      "A.7.13",
      "A.8.1",
      "A.8.2",
      "A.8.5",
      "A.8.8",
      "A.8.9",
      "A.8.10",
      "A.8.13",
      "A.8.14",
      "A.8.15",
      "A.8.16",
      "A.8.17",
      "A.8.19",
      "A.8.21",
      "A.8.24",
      "A.8.25",
      "A.8.26",
      "A.8.27",
      "A.8.28",
      "A.8.29",
      "A.8.32",
      "A.8.34",
    ]);
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
