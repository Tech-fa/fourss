import { responseBody } from "./integration.http";

describe("integration http body", () => {
  it("parses JSON and keeps a PNG byte for byte", () => {
    const json = responseBody(Buffer.from('{"ok":true}'), "application/json");
    expect(json).toEqual({ ok: true });
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const body = responseBody(png, "image/png");
    expect(typeof body).toBe("string");
    expect(Buffer.from(String(body), "latin1")).toEqual(png);
  });
});
