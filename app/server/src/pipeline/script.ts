// Step 1 — script preparation (SKILL.md): topic (LLM) | pasted text | file.

import fs from "node:fs";
import { llmAvailable, writeScript } from "./llm.js";

export interface ScriptInput {
  topic?: string;
  scriptText?: string;
  scriptFile?: string;
  styleHint?: string;
}

/** Light cleanup for natural TTS delivery (Step 1: "clean up punctuation"). */
export function cleanScript(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(\w)\n(\w)/g, "$1 $2")
    .trim();
}

export async function prepareScript(input: ScriptInput): Promise<string> {
  if (input.scriptText?.trim()) return cleanScript(input.scriptText);
  if (input.scriptFile) {
    if (!fs.existsSync(input.scriptFile)) throw new Error(`Script file not found: ${input.scriptFile}`);
    return cleanScript(fs.readFileSync(input.scriptFile, "utf8"));
  }
  if (input.topic?.trim()) {
    if (!llmAvailable()) {
      throw new Error(
        "Topic→script generation needs an Anthropic API key (Settings). " +
          "Alternatively, paste a finished script.",
      );
    }
    return cleanScript(await writeScript(input.topic, input.styleHint));
  }
  throw new Error("Provide a topic, script text, or script file");
}
