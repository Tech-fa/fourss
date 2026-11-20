import { bytesFromProgram } from "../common/file-bytes";
import { resetRequestLimits, runIntegrationHook } from "./integration.runner";
import { IntegrationService } from "./integration.service";

const capabilities = { outboundHosts: ["https://api.example.com"], maxPerMinute: 10 };

function host() {
  return {
    configGet: async (_key: string): Promise<string | null> => null,
    configSet: async () => undefined,
    stateGet: async () => null,
    stateSet: async () => undefined,
    http: jest.fn(async () => ({ status: 200, body: { ok: true } })),
    save: jest.fn(async () => ({ fileId: "file-1", name: "file", size: 0, contentType: "application/octet-stream", url: "http://localhost/files/file-1" })),
    extractText: jest.fn(async () => ({ text: "", source: "extracted" as const })),
    emit: async () => undefined,
    log: async () => undefined,
    setStatus: jest.fn(async () => undefined),
  };
}

function serviceWith(source: string, failures: Array<{ hook: string; message: string }>) {
  return new IntegrationService(
    {
      findOne: async () => ({
        id: "i1",
        name: "Mail",
        status: "draft",
        acceptedRevisionId: null,
        inboundPath: null,
        nextRunAt: null,
        createdById: "u1",
        createdAt: "1",
        updatedAt: "1",
        deleted: false,
      }),
    } as never,
    {
      find: async () => [
        {
          id: "r1",
          integrationId: "i1",
          number: 1,
          source,
          capabilities,
          inputs: [],
          steps: [],
          status: "draft",
          createdAt: "1",
        },
      ],
    } as never,
    { find: async () => [], save: async (row: unknown) => row, delete: async () => ({}) } as never,
    { findOne: async () => null, save: async (row: unknown) => row } as never,
    { find: async () => [], delete: async () => ({}), save: async (row: unknown) => row } as never,
    {
      save: async (row: { hook: string; message: string }) => {
        failures.push(row);
        return row;
      },
      findOne: async () => null,
      find: async () => failures,
    } as never,
    { query: async () => undefined, findOne: async () => null, delete: async () => ({}) } as never,
    { find: async () => [], save: async (row: unknown) => row, delete: async () => ({}), update: async () => ({}) } as never,
    { findOne: async () => null, save: async (row: unknown) => row, delete: async () => ({}) } as never,
    { publishIntegration: () => undefined } as never,
    { save: async () => { throw new Error("save"); }, extract: async () => { throw new Error("extract"); } } as never,
  );
}

describe("integration runner", () => {
  beforeEach(() => resetRequestLimits());

  it("calls an allowed host and refuses one that was not listed", async () => {
    const calls = host();
    const allowed = await runIntegrationHook(
      `export async function onTick(ctx) { return ctx.http("https://api.example.com/messages", { method: "GET" }); }`,
      "onTick",
      null,
      calls,
      capabilities,
    ).promise;
    expect(allowed).toEqual({ status: 200, body: { ok: true } });
    expect(calls.http).toHaveBeenCalledTimes(1);

    await expect(
      runIntegrationHook(
        `export async function onTick(ctx) { return ctx.http("https://evil.example/messages"); }`,
        "onTick",
        null,
        calls,
        capabilities,
      ).promise,
    ).rejects.toThrow("not allowed");
    expect(calls.http).toHaveBeenCalledTimes(1);
  });

  it("runs a route the program registered and lists its schedule", async () => {
    const calls = host();
    const source = `
      route("POST", "/webhook", async (ctx, request) => {
        await ctx.setStatus("Waiting for consent");
        return { status: 200, body: request.body };
      });
      schedule("renew", { everySeconds: 3000 }, async (ctx) => ctx.setStatus("Renewed"));
      subscribe("mail.received", async () => ({ ok: true }));
    `;
    const registered = await runIntegrationHook(source, { kind: "register" }, null, calls, capabilities).promise;
    expect(registered).toEqual({
      schedules: [{ name: "renew", everySeconds: 3000 }],
      subscriptions: ["mail.received"],
      routes: [{ method: "POST", path: "/webhook" }],
    });
    const response = await runIntegrationHook(
      source,
      { kind: "route", method: "POST", path: "/webhook" },
      { body: { hello: "there" } },
      calls,
      capabilities,
    ).promise;
    expect(response).toEqual({ status: 200, body: { hello: "there" } });
    expect(calls.setStatus).toHaveBeenCalledWith("Waiting for consent");
  });

  it("stores a binary http body through ctx.save", async () => {
    const calls = host();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    let stored: Buffer | null = null;
    calls.http = jest.fn(async () => ({ status: 200, body: png.toString("latin1") }));
    calls.save = jest.fn(async (bytes: unknown, name: string, options: { contentType?: string }) => {
      stored = bytesFromProgram(bytes);
      return { fileId: "file-1", name, size: stored.length, contentType: options.contentType || "", url: "http://localhost/files/file-1" };
    });
    const value = await runIntegrationHook(
      `route("GET", "/fetch", async (ctx) => { const r = await ctx.http("https://files.slack.com/file"); return ctx.save(r.body, "shot.png", { contentType: "image/png" }); });`,
      { kind: "route", method: "GET", path: "/fetch" },
      {},
      calls,
      { outboundHosts: ["https://files.slack.com"], maxPerMinute: 10 },
    ).promise;
    expect(value).toEqual({ fileId: "file-1", name: "shot.png", size: png.length, contentType: "image/png", url: "http://localhost/files/file-1" });
    expect(stored).toEqual(png);
  });

  it("stores a Uint8Array from the program", async () => {
    const calls = host();
    let stored: Buffer | null = null;
    calls.save = jest.fn(async (bytes: unknown, name: string) => {
      stored = bytesFromProgram(bytes);
      return { fileId: "file-2", name, size: stored.length, contentType: "image/png", url: "http://localhost/files/file-2" };
    });
    await runIntegrationHook(
      `route("GET", "/bytes", async (ctx) => ctx.save(new Uint8Array([137, 80, 78, 71]), "shot.png", { contentType: "image/png" }));`,
      { kind: "route", method: "GET", path: "/bytes" },
      {},
      calls,
      capabilities,
    ).promise;
    expect(stored).toEqual(Buffer.from([137, 80, 78, 71]));
  });

  it("puts a saved secret on ctx.config and on ctx.config.get", async () => {
    const calls = host();
    calls.configGet = async (key: string) => (key === "botToken" ? "xoxb-secret" : null);
    const value = await runIntegrationHook(
      `route("GET", "/diag", async (ctx) => ({ token: await ctx.config.get("botToken"), direct: String(ctx.config.botToken || ""), channel: ctx.query.channel || "" }));`,
      { kind: "route", method: "GET", path: "/diag?channel=iso-work" },
      {},
      calls,
      capabilities,
      { config: { botToken: "xoxb-secret" } },
    ).promise;
    expect(value).toEqual({ token: "xoxb-secret", direct: "xoxb-secret", channel: "iso-work" });
  });

  it("returns a thrown route error from the call", async () => {
    const failures: Array<{ hook: string; message: string }> = [];
    const service = serviceWith(
      `route("GET", "/diag", async () => { throw new Error("r.json is not a function"); });`,
      failures,
    );
    await expect(service.callRoute("i1", "GET", "/diag", null)).rejects.toThrow("r.json is not a function");
    expect(failures[0].message).toContain("r.json is not a function");
  });

  it("records a thrown hook as a failure", async () => {
    const failures: Array<{ hook: string; message: string }> = [];
    const service = serviceWith(
      `export async function onTick() { throw new Error("authorization: Bearer secret-token nope"); }`,
      failures,
    );

    await expect(service.tryHook("i1", "onTick", null)).rejects.toThrow("authorization: redacted");
    expect(failures[0].hook).toBe("onTick");
    expect(failures[0].message).toContain("authorization: redacted");
    expect(failures[0].message).not.toContain("secret-token");
  });
});
