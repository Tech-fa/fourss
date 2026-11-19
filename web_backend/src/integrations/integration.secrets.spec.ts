import { decryptSecret, encryptSecret } from "./integration.secrets";

describe("integration secrets", () => {
  const previous = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-key";
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = previous;
  });

  it("round-trips a secret and uses a different payload each time", () => {
    const first = encryptSecret("super-secret");
    const second = encryptSecret("super-secret");
    expect(first).not.toBe(second);
    expect(first).not.toContain("super-secret");
    expect(decryptSecret(first)).toBe("super-secret");
  });
});
