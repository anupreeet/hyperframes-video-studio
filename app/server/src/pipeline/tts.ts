// Voiceover synthesis — three tiers (user decision: pluggable + upload):
//  1. OmiVoice — the user's local gradio voice-clone server (SKILL.md Step 2)
//  2. Kokoro   — built into the HyperFrames CLI (`npx hyperframes tts`), no key
//  3. Upload   — handled by the route (multer) + normalizeAudio below

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Client, handle_file } from "@gradio/client";
import { capabilityUnavailable } from "../errors.js";
import { hyperframesChildEnv, probeKokoroRuntime } from "../hyperframes-runtime.js";
import { getSettings } from "../settings.js";

const run = promisify(execFile);
const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TTS_TIMEOUT = 10 * 60_000;

export type TtsProvider = "omivoice" | "kokoro";

export async function omivoiceOnline(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    await fetch(getSettings().omivoiceUrl, { signal: ctrl.signal });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

/** Port of SKILL.md Step 2 — gradio /_clone_fn with a reference voice sample. */
async function synthesizeOmiVoice(text: string, outWav: string): Promise<void> {
  const { omivoiceUrl, omivoiceRefVoice } = getSettings();
  if (!omivoiceRefVoice || !fs.existsSync(omivoiceRefVoice)) {
    throw new Error(
      "OmiVoice needs a reference voice sample — set its path in Settings (Voice → reference sample).",
    );
  }
  if (!(await omivoiceOnline())) {
    throw new Error(`OmiVoice server offline at ${omivoiceUrl} — start it, wait ~10s, retry.`);
  }

  const client = await Client.connect(omivoiceUrl);
  const result = (await client.predict("/_clone_fn", {
    text,
    lang: "Auto",
    ref_aud: handle_file(omivoiceRefVoice),
    ref_text: "",
    instruct: "",
    ns: 32,
    gs: 2.0,
    dn: true,
    sp: 1.0,
    du: 0,
    pp: true,
    po: true,
  })) as { data: unknown };

  // Result shapes vary: FileData object, list of them, or a bare path/url.
  const first = Array.isArray(result.data) ? result.data[0] : result.data;
  let url: string | null = null;
  let localPath: string | null = null;
  if (typeof first === "string") localPath = first;
  else if (first && typeof first === "object") {
    const fd = first as { url?: string; path?: string; value?: { url?: string; path?: string } };
    url = fd.url ?? fd.value?.url ?? null;
    localPath = fd.path ?? fd.value?.path ?? null;
  }

  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OmiVoice result fetch failed: ${res.status}`);
    fs.writeFileSync(outWav, Buffer.from(await res.arrayBuffer()));
  } else if (localPath && fs.existsSync(localPath)) {
    fs.copyFileSync(localPath, outWav);
  } else {
    throw new Error(`OmiVoice returned an unusable result: ${JSON.stringify(first).slice(0, 200)}`);
  }
}

const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;

function cleanOutput(value: unknown): string {
  return typeof value === "string" || Buffer.isBuffer(value)
    ? String(value).replace(ANSI_RE, "").trim()
    : "";
}

/** Extract the useful HyperFrames diagnostic without echoing narration/argv. */
export function parseHyperframesTtsError(err: unknown): string {
  const failure = err && typeof err === "object" ? (err as { stdout?: unknown; stderr?: unknown; message?: unknown }) : {};
  const stdout = cleanOutput(failure.stdout);
  const stderr = cleanOutput(failure.stderr);

  for (const line of stdout.split(/\r?\n/).reverse()) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const parsed = JSON.parse(line) as { error?: unknown; message?: unknown };
      const message = typeof parsed.error === "string" ? parsed.error : typeof parsed.message === "string" ? parsed.message : "";
      if (message) return message;
    } catch {
      // Spinner/progress output may surround the final JSON line.
    }
  }

  const output = stderr || stdout;
  if (output) return output.split(/\r?\n/).filter(Boolean).slice(-3).join("\n");
  const message = typeof failure.message === "string" ? failure.message : err instanceof Error ? err.message : String(err);
  return message.split(/\r?\n/)[0] || "HyperFrames TTS failed";
}

/** Built-in local TTS via the HyperFrames CLI (Kokoro-82M, 54 voices, no key). */
async function synthesizeKokoro(text: string, outWav: string, voice?: string): Promise<void> {
  const runtime = await probeKokoroRuntime();
  if (!runtime.ok) throw capabilityUnavailable(runtime.detail, runtime.remediation);

  const projectDir = path.dirname(path.dirname(outWav));
  const textFile = path.join(projectDir, "script.txt");
  const tempWav = path.join(path.dirname(outWav), `${path.parse(outWav).name}.tmp.wav`);
  fs.writeFileSync(textFile, text, "utf8");
  fs.rmSync(tempWav, { force: true });

  const args = [
    "hyperframes",
    "tts",
    "--text-file",
    textFile,
    "--output",
    tempWav,
    "--json",
    ...(voice ? ["--voice", voice] : []),
  ];

  try {
    await run("npx", args, {
      cwd: SERVER_DIR,
      timeout: TTS_TIMEOUT,
      maxBuffer: 8 * 1024 * 1024,
      env: hyperframesChildEnv(),
    });
  } catch (err) {
    fs.rmSync(tempWav, { force: true });
    const message = parseHyperframesTtsError(err);
    if (/kokoro[_-]onnx|soundfile|python 3/i.test(message)) {
      throw capabilityUnavailable(
        `${message} Run \`npm run setup:kokoro\` from the app directory, then retry.`,
        "Run `npm run setup:kokoro` from the app directory, then recheck Doctor.",
      );
    }
    throw new Error(message);
  }

  if (!fs.existsSync(tempWav)) throw new Error("HyperFrames TTS completed without producing an output file");
  fs.rmSync(outWav, { force: true });
  fs.renameSync(tempWav, outWav);
}

export async function synthesize(
  provider: TtsProvider,
  text: string,
  projectDir: string,
  slug: string,
): Promise<string> {
  const outWav = path.join(projectDir, "audio", `${slug}.wav`);
  fs.mkdirSync(path.dirname(outWav), { recursive: true });
  if (provider === "omivoice") await synthesizeOmiVoice(text, outWav);
  else await synthesizeKokoro(text, outWav, getSettings().kokoroVoice);
  return outWav;
}

/** Uploaded audio → normalized project WAV (any input format ffmpeg reads). */
export async function normalizeAudio(
  inputPath: string,
  projectDir: string,
  slug: string,
): Promise<string> {
  const outWav = path.join(projectDir, "audio", `${slug}.wav`);
  fs.mkdirSync(path.dirname(outWav), { recursive: true });
  await run(
    "ffmpeg",
    ["-y", "-i", inputPath, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", outWav],
    { timeout: TTS_TIMEOUT },
  );
  return outWav;
}
