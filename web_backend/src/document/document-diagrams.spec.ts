import { sanitizeDiagramMap } from "./document-diagrams";

const id = "6f1e8a0e-9c3b-4d2a-8f7e-1b2c3d4e5f60";

describe("sanitizeDiagramMap", () => {
  it("keeps a diagram config keyed by its id", () => {
    const map = sanitizeDiagramMap({
      [id]: {
        kind: "org",
        nodes: [
          { id: "n1", kind: "person", label: "Director", subtitle: "Lead", x: 10, y: 20 },
        ],
        edges: [],
      },
    });

    expect(map?.[id]).toEqual(
      expect.objectContaining({ kind: "org" }),
    );
  });

  it("drops a map that is not a diagram", () => {
    expect(sanitizeDiagramMap({ [id]: { kind: "chart", nodes: [], edges: [] } })).toBeNull();
    expect(sanitizeDiagramMap("nope")).toBeNull();
    expect(sanitizeDiagramMap(null)).toBeNull();
  });
});
