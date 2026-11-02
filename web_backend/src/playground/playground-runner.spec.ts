import { PlaygroundRunner } from "./playground-runner";

describe("PlaygroundRunner", () => {
  const runner = new PlaygroundRunner();

  it("returns a save that points at a document", async () => {
    const result = await runner.runHandle(
      `async function handle(host, request) {
        const doc = await host.get('document', request.page.documentId);
        return {
          action: 'save',
          entityType: 'inspection_note',
          data: request.data,
          refs: [{ entityType: 'document', entityId: doc.entityId }]
        };
      }`,
      {
        action: "save",
        entityType: "inspection_note",
        data: { note: "Torque" },
        page: { documentId: "doc-1" },
      },
      {
        get: async () => ({ entityType: "document", entityId: "doc-1", title: "Policy" }),
        list: async () => ({ data: [], nextCursor: null }),
      },
    );
    expect(result).toEqual({
      action: "save",
      entityType: "inspection_note",
      data: { note: "Torque" },
      refs: [{ entityType: "document", entityId: "doc-1" }],
    });
  });

  it("fails when the program reads process.env", async () => {
    await expect(
      runner.runHandle(
        `async function handle() { return process.env.SECRET }`,
        { action: "save" },
        { get: async () => null, list: async () => ({ data: [] }) },
      ),
    ).rejects.toMatchObject({ response: { key: "PG_014" } });
  });

  it("stops an infinite loop", async () => {
    await expect(
      runner.runHandle(
        `function handle() { while (true) {} }`,
        { action: "save" },
        { get: async () => null, list: async () => ({ data: [] }) },
      ),
    ).rejects.toMatchObject({ response: { key: "PG_011" } });
  }, 10000);

  it("requires a handle function", async () => {
    await expect(
      runner.runHandle(
        `function render() { return 1 }`,
        { action: "save" },
        { get: async () => null, list: async () => ({ data: [] }) },
      ),
    ).rejects.toMatchObject({ response: { key: "PG_010" } });
  });

  it("refuses host.save inside handle", async () => {
    await expect(
      runner.runHandle(
        `async function handle(host) { return host.save({ action: 'save' }) }`,
        { action: "save" },
        { get: async () => null, list: async () => ({ data: [] }) },
      ),
    ).rejects.toMatchObject({ response: { key: "PG_014" } });
  });

  it("surfaces a hidden document as not found", async () => {
    await expect(
      runner.runHandle(
        `async function handle(host, request) {
          return host.get('document', request.page.documentId);
        }`,
        { action: "save", page: { documentId: "doc-9" } },
        {
          get: async () => {
            const error = new Error("missing") as Error & {
              getResponse: () => { key: string; message: string };
            };
            error.getResponse = () => ({ key: "PG_006", message: "missing" });
            throw error;
          },
          list: async () => ({ data: [] }),
        },
      ),
    ).rejects.toMatchObject({ response: { key: "PG_006" } });
  });
});
