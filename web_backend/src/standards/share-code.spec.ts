import { openShareCode, sealShareCode } from "./share-code";

const secret = "test-secret";

describe("share codes", () => {
  const payload = {
    v: 1 as const,
    sid: "share-1",
    email: "Person@Example.com",
    impl: 4,
    scope: "list" as const,
    exp: Date.now() + 1000,
  };

  it("seals the recipient email inside a long code", () => {
    const code = sealShareCode(payload, secret);

    expect(code.length).toBeGreaterThan(600);
    expect(code).not.toContain("person@example.com");
    expect(openShareCode(code, secret)).toMatchObject({
      sid: "share-1",
      email: "person@example.com",
      impl: 4,
      scope: "list",
    });
  });

  it("rejects a tampered code and a different secret", () => {
    const code = sealShareCode(payload, secret);
    const tampered = `${code.slice(0, -1)}${code.endsWith("a") ? "b" : "a"}`;

    expect(openShareCode(tampered, secret)).toBeNull();
    expect(openShareCode(code, "other-secret")).toBeNull();
  });
});
