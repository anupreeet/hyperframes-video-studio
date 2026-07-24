import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  hyperframesChildEnv,
  probeKokoroRuntime,
  type KokoroRuntimeStatus,
} from "./hyperframes-runtime.js";

const run = promisify(execFile);

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  kokoro: KokoroRuntimeStatus;
}

async function check(
  name: string,
  cmd: string,
  args: string[],
  parse: (stdout: string) => string,
  opts: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<DoctorCheck> {
  try {
    const { stdout } = await run(cmd, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 30_000,
      env: opts.env,
    });
    return { name, ok: true, detail: parse(stdout.trim()) };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message.slice(0, 200) : String(err) };
  }
}

export async function runDoctor(serverDir: string): Promise<DoctorReport> {
  const [kokoro, ...checks] = await Promise.all([
    probeKokoroRuntime(),
    Promise.resolve<DoctorCheck>({
      name: "node",
      ok: Number(process.versions.node.split(".")[0]) >= 22,
      detail: `v${process.versions.node} (need ≥22)`,
    }),
    check("ffmpeg", "ffmpeg", ["-version"], (o) => o.split("\n")[0]),
    check("ffprobe", "ffprobe", ["-version"], (o) => o.split("\n")[0]),
    check(
      "hyperframes CLI",
      "npx",
      ["hyperframes", "--version"],
      (o) => o.split("\n").pop() ?? o,
      { cwd: serverDir, timeoutMs: 120_000, env: hyperframesChildEnv() },
    ),
  ]);

  checks.push({
    name: "kokoro TTS",
    ok: kokoro.ok,
    detail: kokoro.detail,
  });

  return { checks, kokoro };
}
