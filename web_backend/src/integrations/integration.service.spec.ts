import {
  accept,
  createFlow,
  propose,
  restore,
  saveValues,
  view,
} from "./integration.model";

const origin = "https://app.example";

function draft() {
  const created = createFlow({
    id: "i1",
    name: "Gmail",
    userId: "u1",
    now: 1,
    revisionId: "r1",
  });
  return propose(
    created,
    {
      inputs: [
        {
          key: "clientId",
          label: "Client id",
          description: "Copy the client id from the credentials page.",
          required: true,
          secret: false,
        },
        {
          key: "clientSecret",
          label: "Client secret",
          description: "Copy the client secret from the same page.",
          required: true,
          secret: true,
        },
      ],
      steps: [
        {
          id: "credentials",
          title: "Create the app",
          instruction: "Open the console and copy both values into the fields below.",
          link: { label: "Google Cloud", url: "https://console.cloud.google.com" },
          fields: ["clientId", "clientSecret"],
          doneWhen: "fields_saved",
        },
        {
          id: "webhook",
          title: "Add the webhook",
          instruction: "Paste this URL into the notification endpoint field.",
          copy: { kind: "webhookUrl", url: "https://evil.example/hook" },
          fields: [],
          doneWhen: "manual",
        },
      ],
      capabilities: {
        outboundHosts: ["https://gmail.googleapis.com"],
        maxPerMinute: 60,
        inboundPath: "gmail",
      },
      source: "export async function onHttp(ctx, request) { return { status: 200, body: request.method }; }",
    },
    2,
    "r2",
  );
}

describe("integration flow", () => {
  it("keeps a revision that is missing required keys from becoming the running one", () => {
    const result = accept(draft(), 3);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== "needs_input") throw new Error("expected missing keys");
    expect(result.missing).toEqual(["clientId", "clientSecret"]);
    expect(result.state.acceptedRevisionId).toBeNull();
    expect(result.state.status).toBe("needs_input");
  });

  it("swaps to the newly accepted revision and can restore the previous one", () => {
    const ready = saveValues(
      draft(),
      { clientId: "client-1", clientSecret: "super-secret" },
      undefined,
      3,
    );
    const first = accept(ready, 4);
    if (!first.ok) throw new Error(first.reason === "invalid" ? first.message : "missing keys");
    expect(first.state.acceptedRevisionId).toBe("r2");

    const revised = propose(
      first.state,
      { source: "export async function onHttp() { return { status: 204, body: null }; }" },
      5,
      "r3",
    );
    const second = accept(revised, 6);
    if (!second.ok) throw new Error("second accept failed");
    expect(second.state.acceptedRevisionId).toBe("r3");
    expect(second.state.revisions.find((revision) => revision.id === "r2")?.status).toBe("accepted");

    const restored = restore(second.state, "r2", 7);
    expect(restored.acceptedRevisionId).toBe("r2");
    expect(restored.status).toBe("active");
  });

  it("omits secret values from the view", () => {
    const ready = saveValues(draft(), { clientId: "client-1", clientSecret: "super-secret" }, undefined, 3);
    const presented = view(ready, origin);
    expect(JSON.stringify(presented)).not.toContain("super-secret");
    const secret = presented.inputs.find((field) => field.key === "clientSecret");
    expect(secret?.filled).toBe(true);
    expect(secret).not.toHaveProperty("value");
    expect(presented.inputs.find((field) => field.key === "clientId")).toMatchObject({ value: "client-1" });
    const kept = saveValues(ready, { clientSecret: "" }, "credentials", 4);
    expect(kept.values.clientSecret.value).toBe("super-secret");
  });

  it("rejects an inbound integration that does not tell the user to copy the webhook URL", () => {
    const created = createFlow({ id: "i1", name: "Mail", userId: "u1", now: 1, revisionId: "r1" });
    const proposed = propose(
      created,
      {
        capabilities: { outboundHosts: [], maxPerMinute: 60, inboundPath: "mail" },
        source: "export async function onHttp() { return { status: 200, body: null }; }",
        steps: [],
        inputs: [],
      },
      2,
      "r2",
    );
    const result = accept(proposed, 3);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== "invalid") throw new Error("expected a rejected inbound revision");
    expect(result.message).toContain("webhook URL");
  });

  it("fills the webhook URL from the public origin and ignores a URL written on the step", () => {
    const presented = view(draft(), origin);
    const step = presented.steps.find((item) => item.id === "webhook");
    expect(step?.copyValue).toBe("https://app.example/integrations/hooks/gmail");
    expect(JSON.stringify(presented)).not.toContain("evil.example");
  });

  it("rejects a program that does not export the hook its capabilities need", () => {
    const created = createFlow({ id: "i1", name: "Poll", userId: "u1", now: 1, revisionId: "r1" });
    const proposed = propose(
      created,
      {
        capabilities: { outboundHosts: ["https://api.example.com"], maxPerMinute: 10, tickEverySeconds: 60 },
        source: "export async function onHttp() { return null; }",
      },
      2,
      "r2",
    );
    const result = accept(proposed, 3);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== "invalid") throw new Error("expected a missing hook");
    expect(result.message).toContain("onTick");
  });
});
