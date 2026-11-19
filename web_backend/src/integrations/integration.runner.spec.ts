import { resetRequestLimits, runIntegrationHook } from "./integration.runner";
import { IntegrationService } from "./integration.service";

const capabilities = { outboundHosts: ["https://api.example.com"], maxPerMinute: 10 };

function host() {
  return {
    configGet: async () => null,
    configSet: async () => undefined,
    stateGet: async () => null,
    stateSet: async () => undefined,
    http: jest.fn(async () => ({ status: 200, body: { ok: true } })),
    emit: async () => undefined,
    log: async () => undefined,
    setStatus: jest.fn(async () => undefined),
  };
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

  it("records a thrown hook as a failure", async () => {
    const failures: Array<{ hook: string; message: string }> = [];
    const service = new IntegrationService(
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
            source: `export async function onTick() { throw new Error("authorization: Bearer secret-token nope"); }`,
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
    );

    await expect(service.tryHook("i1", "onTick", null)).rejects.toThrow("authorization: redacted");
    expect(failures[0].hook).toBe("onTick");
    expect(failures[0].message).toContain("authorization: redacted");
    expect(failures[0].message).not.toContain("secret-token");
  });
});
