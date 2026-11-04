import { readFileSync } from "fs";
import { join } from "path";

describe("playground migration", () => {
  const source = readFileSync(
    join(__dirname, "../migrations/1793133393720-playground.ts"),
    "utf8",
  );

  it("does not add a document_id column", () => {
    expect(source).not.toContain("document_id");
  });

  it("stores the publisher, the enabled flag, and the publish time", () => {
    expect(source).toContain("publisher_id");
    expect(source).toContain("enabled");
    expect(source).toContain("last_published_at");
    expect(source).toContain("tinyint NOT NULL DEFAULT 0");
    expect(source).toContain("bigint NULL");
  });
});
