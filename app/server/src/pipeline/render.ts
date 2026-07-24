// Lint + render. Rendering goes through @hyperframes/producer IN-PROCESS
// (createRenderJob/executeRenderJob with a typed progress callback) — no CLI
// stdout parsing. Lint uses the CLI's --json output.

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createRenderJob, executeRenderJob } from "@hyperframes/producer";

const runCmd = promisify(execFile);
const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Finding shape from @hyperframes/lint: code (rule id), severity, message,
 *  file?, selector?, elementId?, fixHint?, snippet? — no line numbers. */
export interface LintFinding {
  code?: string;
  severity?: "error" | "warning" | "info";
  message?: string;
  file?: string;
  selector?: string;
  elementId?: string;
  fixHint?: string;
  snippet?: string;
  /** Extra hint from this app's SKILL.md error-handling table. */
  hint?: string;
}

export interface LintResult {
  errorCount: number;
  warningCount: number;
  findings: LintFinding[];
  raw?: string;
}

/** SKILL.md Error Handling table → UI fix hints, keyed by lint rule id. */
const LINT_HINTS: Record<string, string> = {
  timed_element_missing_clip_class:
    'Add class="clip" to every scene div — HyperFrames needs it to schedule visibility. Without it all scenes render at once.',
  overlapping_clips_same_track:
    "Two clips on one track share a boundary. Trim the earlier clip's duration by 0.04s — or in talking-cut, remove data-track-index from the <audio> element entirely (data-main-audio is sufficient).",
  media_missing_id:
    'Every <video>/<audio> with data-start needs a unique id (e.g. id="main-audio", id="bg-video").',
  gsap_animates_clip_element:
    "The timeline sets display on a .clip div — HyperFrames owns clip scheduling. Remove tl.set('#sN', {display}) calls; data-start/data-duration control clips.",
};

export function normalizeFinding(finding: LintFinding): LintFinding {
  const snippet = finding.snippet ?? "";
  const intentionalRaf =
    finding.code === "requestanimationframe_in_composition" &&
    /THREE\.WebGLRenderer|getContext\(['\"]2d['\"]\)|window\.s\d+Stat/.test(snippet);
  if (intentionalRaf) {
    return {
      ...finding,
      severity: "warning",
      hint:
        "This app intentionally uses requestAnimationFrame for Three.js/Canvas/HUD rendering because HyperFrames capture seeks GSAP with suppressed callbacks.",
    };
  }
  return {
    ...finding,
    hint: LINT_HINTS[finding.code ?? ""] ?? undefined,
  };
}

export async function lintProject(projectDir: string): Promise<LintResult> {
  let stdout = "";
  try {
    const res = await runCmd("npx", ["hyperframes", "lint", "--json"], {
      cwd: projectDir,
      timeout: 5 * 60_000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, PATH: `${SERVER_DIR}/node_modules/.bin:${process.env.PATH}` },
    });
    stdout = res.stdout;
  } catch (err) {
    // Lint exits non-zero when findings exist — the JSON is still on stdout.
    const e = err as { stdout?: string; stderr?: string };
    stdout = e.stdout ?? "";
    if (!stdout.trim()) {
      return {
        errorCount: 1,
        warningCount: 0,
        findings: [{ message: `lint failed to run: ${(e.stderr ?? String(err)).slice(0, 400)}` }],
      };
    }
  }

  try {
    const jsonStart = stdout.indexOf("{");
    const parsed = JSON.parse(stdout.slice(jsonStart)) as {
      errorCount?: number;
      warningCount?: number;
      findings?: LintFinding[];
    };
    // The rule identifier field is `code`; the CLI also ships its own fixHint.
    // Normalize documented renderer patterns before deriving the final counts.
    const findings = (parsed.findings ?? []).map(normalizeFinding);
    return {
      errorCount: findings.filter((f) => f.severity === "error").length,
      warningCount: findings.filter((f) => f.severity === "warning").length,
      findings,
    };
  } catch {
    return { errorCount: 0, warningCount: 0, findings: [], raw: stdout.slice(0, 2000) };
  }
}

export interface RenderProgress {
  percent: number;
  stage: string;
  message: string;
}

const activeRenders = new Map<string, AbortController>();

export function cancelRender(slug: string): boolean {
  const ctrl = activeRenders.get(slug);
  if (!ctrl) return false;
  ctrl.abort();
  return true;
}

export async function renderProject(
  slug: string,
  projectDir: string,
  opts: { fps: 24 | 30 | 60; quality?: "draft" | "standard" | "high" },
  onProgress: (p: RenderProgress) => void,
): Promise<string> {
  const outputPath = path.join(projectDir, "renders", `${slug}.mp4`);
  // Canvas size comes from the composition's own data-width/data-height;
  // entryFile defaults to "index.html"; outputPath is a positional arg on
  // executeRenderJob, not a config field.
  const job = createRenderJob({
    fps: opts.fps,
    quality: opts.quality ?? "standard",
    format: "mp4",
  });

  const ctrl = new AbortController();
  activeRenders.set(slug, ctrl);
  try {
    // Mutates `job` in place; job.progress is an integer 0-100.
    await executeRenderJob(
      job,
      projectDir,
      outputPath,
      (j, message) => {
        onProgress({
          percent: j.progress ?? 0,
          stage: j.currentStage ?? j.status ?? "",
          message: message ?? "",
        });
      },
      ctrl.signal,
    );
  } finally {
    activeRenders.delete(slug);
  }
  if (job.outcome === "failed" || job.status === "failed") {
    throw new Error(job.error ?? "render failed");
  }
  if (job.outcome === "cancelled" || job.status === "cancelled") {
    throw new Error("render cancelled");
  }
  return job.outputPath ?? outputPath;
}
