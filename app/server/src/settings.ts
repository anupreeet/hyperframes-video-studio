import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppSettings } from "./types.js";

const SETTINGS_DIR = path.join(os.homedir(), ".hyperframes-app");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

const DEFAULTS: AppSettings = {
  projectsDir: path.join(os.homedir(), "HyperframesApp", "projects"),
  omivoiceUrl: "http://127.0.0.1:8261",
  omivoiceRefVoice: "",
  pexelsApiKey: "",
  anthropicApiKey: "",
  openaiBaseUrl: "",
  openaiApiKey: "",
  openaiModel: "",
  openaiEffort: "",
  defaultThemeId: "shadow-cut",
  defaultFps: 60,
  kokoroVoice: "af_heart",
};

let cached: AppSettings | null = null;

export function getSettings(): AppSettings {
  if (cached) return cached;
  let fromDisk: Partial<AppSettings> = {};
  try {
    fromDisk = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    // first run — defaults only
  }
  cached = { ...DEFAULTS, ...fromDisk };
  // Env vars fill empty secrets without persisting them to disk.
  if (!cached.pexelsApiKey && process.env.PEXELS_API_KEY) {
    cached.pexelsApiKey = process.env.PEXELS_API_KEY;
  }
  if (!cached.anthropicApiKey && process.env.ANTHROPIC_API_KEY) {
    cached.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }
  if (!cached.openaiApiKey && process.env.OPENAI_API_KEY) {
    cached.openaiApiKey = process.env.OPENAI_API_KEY;
  }
  fs.mkdirSync(cached.projectsDir, { recursive: true });
  return cached;
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const merged = { ...getSettings(), ...patch };
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  cached = merged;
  fs.mkdirSync(merged.projectsDir, { recursive: true });
  return merged;
}

/** Redact secrets for the API response. */
export function publicSettings(): AppSettings & {
  hasPexelsKey: boolean;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
} {
  const s = getSettings();
  return {
    ...s,
    pexelsApiKey: s.pexelsApiKey ? "•••" : "",
    anthropicApiKey: s.anthropicApiKey ? "•••" : "",
    openaiApiKey: s.openaiApiKey ? "•••" : "",
    hasPexelsKey: Boolean(s.pexelsApiKey),
    hasAnthropicKey: Boolean(s.anthropicApiKey),
    hasOpenaiKey: Boolean(s.openaiApiKey),
  };
}
