import { Injectable } from "@nestjs/common";
import { readFile } from "fs/promises";
import { join } from "path";

export const agentRulesPath = join(__dirname, "agent-rules.md");

export async function readAgentRules(path = agentRulesPath): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("The agent rules file is missing.");
    }
    throw error;
  }
}

@Injectable()
export class AgentRulesService {
  async getRules(): Promise<{ text: string }> {
    return { text: await readAgentRules() };
  }
}
