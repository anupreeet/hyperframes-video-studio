// Transcription via the HyperFrames CLI (local Whisper), SKILL.md Step 3.
// Always pass --model explicitly; retry with medium.en when the small.en
// output fails the quality check (>20% music/garbled tokens).

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { hyperframesChildEnv } from "../hyperframes-runtime.js";
import type { TranscriptWord } from "../types.js";

const run = promisify(execFile);
const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function qualityFilter(words: TranscriptWord[]): TranscriptWord[] {
  return words.filter((w) => {
    if (!w.text || w.text.trim().length === 0) return false;
    if (/^[♪♫♬♭♮♯\u{1F3B5}\u{1F3B6}]+$/u.test(w.text)) return false;
    if (/^(huh|uh|um|ah|oh)$/i.test(w.text.trim()) && w.end - w.start < 0.1) return false;
    return true;
  });
}

async function runTranscribe(
  audioPath: string,
  projectDir: string,
  model: string,
): Promise<TranscriptWord[]> {
  // -d is passed EXPLICITLY: without it the CLI writes transcript.json next to
  // the audio file (dirname(input)), not cwd. --json prints a summary object
  // {ok, transcriptPath, wordCount, ...} to stdout; the file write is
  // unconditional. Words are a flat [{text,start,end}] array (no id field).
  const { stdout } = await run(
    "npx",
    ["hyperframes", "transcribe", audioPath, "-d", projectDir, "--json", "--model", model],
    {
      cwd: SERVER_DIR,
      timeout: 15 * 60_000,
      maxBuffer: 64 * 1024 * 1024,
      env: hyperframesChildEnv(),
    },
  );

  const transcriptFile = path.join(projectDir, "transcript.json");
  if (fs.existsSync(transcriptFile)) {
    return JSON.parse(fs.readFileSync(transcriptFile, "utf8")) as TranscriptWord[];
  }
  // Fallback: locate the file via the stdout summary's transcriptPath.
  try {
    const jsonStart = stdout.indexOf("{");
    const summary = JSON.parse(stdout.slice(jsonStart)) as {
      ok?: boolean;
      error?: string;
      transcriptPath?: string;
    };
    if (summary.ok === false) throw new Error(summary.error ?? "transcribe reported failure");
    if (summary.transcriptPath && fs.existsSync(summary.transcriptPath)) {
      const words = JSON.parse(fs.readFileSync(summary.transcriptPath, "utf8")) as TranscriptWord[];
      fs.writeFileSync(transcriptFile, JSON.stringify(words, null, 2));
      return words;
    }
  } catch (err) {
    if (err instanceof Error && err.message !== "Unexpected end of JSON input") throw err;
  }
  throw new Error("transcribe produced no transcript.json");
}

export async function transcribe(
  audioPath: string,
  projectDir: string,
): Promise<{ words: TranscriptWord[]; model: string }> {
  let model = "small.en";
  let raw = await runTranscribe(audioPath, projectDir, model);
  let words = qualityFilter(raw);

  if (raw.length > 0 && (raw.length - words.length) / raw.length > 0.2) {
    model = "medium.en";
    raw = await runTranscribe(audioPath, projectDir, model);
    words = qualityFilter(raw);
  }
  return { words, model };
}
