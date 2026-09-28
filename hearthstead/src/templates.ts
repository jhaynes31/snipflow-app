import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "agents");

export interface RoleTemplate {
  role: string;
  title: string;
  team: "leadership" | "marketing" | "dev" | "custom";
  model: "fast" | "smart";
  shift: "day" | "night" | "always";
  avatarSpriteKey: string;
  dailyTokenBudget: number;
  skills: string[];
  tools: string[];
  personalityOptions: string[];
  defaultName: string;
  systemPrompt: string;
}

export function loadTemplates(): RoleTemplate[] {
  const dir = path.join(root, "templates");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as RoleTemplate);
}

/** Hard rules are appended at run time, never stored in the editable prompt, so nobody can edit them away. */
export const HARD_RULES = fs.readFileSync(path.join(root, "hard-rules.md"), "utf8");
