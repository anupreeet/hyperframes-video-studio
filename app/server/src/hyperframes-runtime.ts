import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCAL_PYTHON =
  process.platform === "win32"
    ? path.join(APP_DIR, "python", ".venv", "Scripts", "python.exe")
    : path.join(APP_DIR, "python", ".venv", "bin", "python");
const REMEDIATION = "Run `npm run setup:kokoro` from the app directory, then recheck Doctor.";

export interface KokoroRuntimeStatus {
  ok: boolean;
  pythonPath: string | null;
  version: string | null;
  missingModules: string[];
  detail: string;
  remediation?: string;
}

export function resolveHyperframesPython(): string | null {
  const explicit = process.env.HYPERFRAMES_PYTHON?.trim();
  if (explicit) return explicit;
  return fs.existsSync(LOCAL_PYTHON) ? LOCAL_PYTHON : null;
}

export function hyperframesChildEnv(): NodeJS.ProcessEnv {
  const python = resolveHyperframesPython();
  return python ? { ...process.env, HYPERFRAMES_PYTHON: python } : { ...process.env };
}

async function probe(python: string): Promise<{
  executable: string;
  version: string;
  missing: string[];
}> {
  const code = [
    "import importlib.util, json, sys",
    'modules = ["kokoro_onnx", "soundfile"]',
    "print(json.dumps({",
    '  "executable": sys.executable,',
    '  "version": ".".join(str(v) for v in sys.version_info[:3]),',
    '  "missing": [m for m in modules if importlib.util.find_spec(m) is None],',
    "}))",
  ].join("\n");
  const { stdout } = await run(python, ["-c", code], { timeout: 10_000 });
  return JSON.parse(stdout.trim()) as {
    executable: string;
    version: string;
    missing: string[];
  };
}

export async function probeKokoroRuntime(): Promise<KokoroRuntimeStatus> {
  const selected = resolveHyperframesPython();
  const candidates = selected ? [selected] : ["python3", "python"];
  let lastError = "No Python runtime found";

  for (const candidate of candidates) {
    try {
      const result = await probe(candidate);
      const [major = 0, minor = 0] = result.version.split(".").map(Number);
      const versionOk = major > 3 || (major === 3 && minor >= 10);
      const ok = versionOk && result.missing.length === 0;
      const issues = [
        ...(!versionOk ? [`Python ${result.version} is below the required 3.10`] : []),
        ...(result.missing.length > 0 ? [`missing ${result.missing.join(", ")}`] : []),
      ];

      return {
        ok,
        pythonPath: result.executable,
        version: result.version,
        missingModules: result.missing,
        detail: ok
          ? `Python ${result.version} at ${result.executable}; Kokoro packages ready`
          : `Python ${result.version} at ${result.executable}; ${issues.join("; ")}`,
        ...(ok ? {} : { remediation: REMEDIATION }),
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (selected) break;
    }
  }

  return {
    ok: false,
    pythonPath: selected,
    version: null,
    missingModules: ["kokoro_onnx", "soundfile"],
    detail: selected
      ? `Could not run the configured Kokoro Python at ${selected}`
      : `No usable Python runtime found (${lastError.split("\n")[0]})`,
    remediation: REMEDIATION,
  };
}
