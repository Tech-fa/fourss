import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { readAgentRules } from "./agent-rules.service";

describe("readAgentRules", () => {
  it("returns the text of the rules file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-rules-"));
    const path = join(dir, "agent-rules.md");
    await writeFile(path, "Use the published procedure.\n");
    await expect(readAgentRules(path)).resolves.toBe(
      "Use the published procedure.\n",
    );
    await rm(dir, { recursive: true });
  });

  it("reports a missing rules file", async () => {
    await expect(
      readAgentRules(join(tmpdir(), "missing-agent-rules.md")),
    ).rejects.toThrow("The agent rules file is missing.");
  });

  it("reads the rules file shipped with the api", async () => {
    const text = await readAgentRules();
    expect(text).toContain("Read the open record");
  });
});
