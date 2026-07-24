// Typed fetch client for the HyperFrames Video Studio server.
//
// Types below are a minimal mirror of app/server/src/types.ts — kept in sync
// by hand since the web app cannot import server source directly. SCENE_TYPES
// is copied verbatim (30 values, same order) from server types.ts.

export const SCENE_TYPES = [
  "title-card",
  "kinetic-text",
  "kinetic-impact",
  "kinetic-slam",
  "stat-reveal",
  "counter-up",
  "bar-chart",
  "list-reveal",
  "list-reveal-words",
  "flow-steps",
  "flow-steps-text",
  "quote-card",
  "split-layout",
  "split-screen",
  "doodle-split",
  "progress-ring",
  "comparison",
  "comparison-verdict",
  "product-comparison",
  "callout",
  "cta-callout",
  "icon-grid",
  "outro-card",
  "threejs-object",
  "canvas2d-scene",
  "donut-chart",
  "line-chart",
  "pexels-hero",
  "presenter-aside",
  "hud-overlay",
] as const;

export type SceneType = (typeof SCENE_TYPES)[number];

export type ProjectMode = "script" | "showcase" | "talking-cut";

export type StepName = "script" | "tts" | "transcribe" | "storyboard" | "compose" | "render";
export type StepState = "pending" | "running" | "done" | "error";

export interface ScenePayload {
  headline?: string;
  stat?: { value: string; label?: string };
  counter?: { from: number; to: number; suffix?: string; label?: string };
  items?: string[];
  steps?: string[];
  bars?: { label: string; value: number }[];
  segments?: { label: string; value: number }[];
  points?: number[];
  compare?: { left: string; right: string; leftLabel?: string; rightLabel?: string; verdict?: string };
  quote?: { text: string; attribution?: string };
  percent?: number;
  glyph?: string;
  pexels?: { query: string; media: "photo" | "video"; file?: string };
  products?: { name: string; attrs: string[] }[];
  emphasis?: { setup?: string; mid?: string; slam?: string };
}

export interface StoryboardScene {
  id: number;
  sentence: string;
  type: SceneType;
  startTime: number;
  endTime: number;
  note?: string;
  payload?: ScenePayload;
}

export interface Storyboard {
  slug: string;
  mode: ProjectMode;
  themeId: string;
  totalDuration: number;
  scenes: StoryboardScene[];
}

export interface ProjectMeta {
  slug: string;
  title: string;
  mode: ProjectMode;
  themeId: string;
  createdAt: string;
  updatedAt: string;
  fps: 24 | 30 | 60;
  script?: string;
  steps: Partial<Record<StepName, { state: StepState; detail?: string; at: string }>>;
  sourceMedia?: string;
  audioFile?: string;
  transcriptFile?: string;
  renderedFile?: string;
  totalDuration?: number;
  cutawayIds?: number[];
  mutedVideo?: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  mood: string[];
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentAlt?: string;
  };
  typography: {
    fontFamily: string;
    googleFonts: string;
    weights: { headline: number; body: number; caption: number };
    sizes: { headline: string; sub: string; caption: string };
  };
  captions: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
    textShadow: string;
    padding: string;
    lineHeight: string;
    bottom: string;
  };
  css: { htmlBody: string; hed: string; sub: string; capText: string };
  transitions: string[];
  defaultFor?: string;
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
  llm: boolean;
  kokoro: {
    ok: boolean;
    pythonPath: string | null;
    version: string | null;
    missingModules: string[];
    detail: string;
    remediation?: string;
  };
}

export interface LintFinding {
  rule?: string;
  ruleId?: string;
  message?: string;
  severity?: string;
  hint?: string;
}

export interface LintResult {
  errorCount: number;
  warningCount: number;
  findings: LintFinding[];
  raw?: string;
}

export interface AssetResult {
  file: string;
  ok: boolean;
  error?: string;
}

export type LlmEffort = "" | "low" | "medium" | "high" | "xhigh" | "max";

export interface AppSettings {
  projectsDir: string;
  omivoiceUrl: string;
  omivoiceRefVoice: string;
  pexelsApiKey: string;
  anthropicApiKey: string;
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiEffort: LlmEffort;
  defaultThemeId: string;
  defaultFps: 24 | 30 | 60;
  kokoroVoice: string;
}

/** GET/PUT /api/settings response — secrets redacted to "•••" when set. */
export interface PublicAppSettings extends AppSettings {
  hasPexelsKey: boolean;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
}

export interface ProjectState {
  meta: ProjectMeta;
  storyboard: Storyboard | null;
}

export interface UploadResult extends ProjectMeta {
  /** Present only for kind=video uploads — the raw detected source fps. */
  srcFps?: number;
}

export interface ComposeResult {
  meta: ProjectMeta;
  lint: LintResult;
  healAttempts: number;
  assets: AssetResult[];
}

// ── Low-level request helper ────────────────────────────────────────────────

interface ServerErrorBody {
  error?: string;
}

function isServerErrorBody(value: unknown): value is ServerErrorBody {
  return typeof value === "object" && value !== null && "error" in value;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const body = init?.body;
  const isFormData = body instanceof FormData;
  const headers = body && !isFormData ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers;
  const res = await fetch(path, { ...init, headers });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message = isServerErrorBody(parsed) && parsed.error ? parsed.error : `Request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return parsed as T;
}

const getJSON = <T>(path: string): Promise<T> => request<T>(path);
const postJSON = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
const putJSON = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
const patchJSON = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
const del = <T>(path: string): Promise<T> => request<T>(path, { method: "DELETE" });

// ── Health / doctor / settings / themes ─────────────────────────────────────

export function getHealth(): Promise<{ ok: boolean }> {
  return getJSON("/api/health");
}

export function getDoctor(): Promise<DoctorResult> {
  return getJSON("/api/doctor");
}

export function getSettings(): Promise<PublicAppSettings> {
  return getJSON("/api/settings");
}

export function saveSettings(patch: Partial<AppSettings>): Promise<PublicAppSettings> {
  return putJSON("/api/settings", patch);
}

export function getThemes(): Promise<Theme[]> {
  return getJSON("/api/themes");
}

/** Live model list from the OpenAI-compatible endpoint (saved URL/key, or overrides). */
export function getLlmModels(baseUrl?: string, apiKey?: string): Promise<{ models: string[] }> {
  const params = new URLSearchParams();
  if (baseUrl) params.set("baseUrl", baseUrl);
  if (apiKey) params.set("apiKey", apiKey);
  const qs = params.toString();
  return getJSON(`/api/llm/models${qs ? `?${qs}` : ""}`);
}

// ── Projects ─────────────────────────────────────────────────────────────────

export function getProjects(): Promise<ProjectMeta[]> {
  return getJSON("/api/projects");
}

export function createProject(input: {
  title: string;
  mode: ProjectMode;
  themeId?: string;
  fps?: 24 | 30 | 60;
}): Promise<ProjectMeta> {
  return postJSON("/api/projects", input);
}

export function getProject(slug: string): Promise<ProjectState> {
  return getJSON(`/api/projects/${slug}`);
}

export function deleteProject(slug: string): Promise<{ ok: true }> {
  return del(`/api/projects/${slug}`);
}

export function patchProject(slug: string, patch: { themeId?: string; fps?: 24 | 30 | 60 }): Promise<ProjectMeta> {
  return patchJSON(`/api/projects/${slug}`, patch);
}

// ── Uploads ──────────────────────────────────────────────────────────────────

export function uploadFile(slug: string, kind: "audio" | "video", file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResult>(`/api/projects/${slug}/upload?kind=${kind}`, { method: "POST", body: form });
}

// ── Pipeline steps ───────────────────────────────────────────────────────────

export function submitScript(
  slug: string,
  body: { topic?: string; scriptText?: string; styleHint?: string },
): Promise<{ script: string; meta: ProjectMeta }> {
  return postJSON(`/api/projects/${slug}/steps/script`, body);
}

export function submitTts(slug: string, provider: "omivoice" | "kokoro"): Promise<ProjectMeta> {
  return postJSON(`/api/projects/${slug}/steps/tts`, { provider });
}

export function runTranscribe(slug: string): Promise<{ meta: ProjectMeta; wordCount: number; model: string }> {
  return postJSON(`/api/projects/${slug}/steps/transcribe`, {});
}

export function buildStoryboardStep(
  slug: string,
  polish: boolean,
): Promise<{ storyboard: Storyboard; meta: ProjectMeta }> {
  return postJSON(`/api/projects/${slug}/steps/storyboard`, { polish });
}

export function saveStoryboard(slug: string, storyboard: Storyboard, cutawayIds?: number[]): Promise<{ ok: true }> {
  return putJSON(`/api/projects/${slug}/storyboard`, { ...storyboard, cutawayIds });
}

export function runCompose(slug: string, body: { subtitles: boolean; selfHeal: boolean }): Promise<ComposeResult> {
  return postJSON(`/api/projects/${slug}/steps/compose`, body);
}

export function runLint(slug: string): Promise<LintResult> {
  return postJSON(`/api/projects/${slug}/steps/lint`, {});
}

// ── Render ───────────────────────────────────────────────────────────────────

export function startRender(
  slug: string,
  body: { fps?: 24 | 30 | 60; quality: "draft" | "standard" | "high" },
): Promise<{ started: true; fps: number; quality: string }> {
  return postJSON(`/api/projects/${slug}/steps/render`, body);
}

export function cancelRender(slug: string): Promise<{ cancelled: boolean }> {
  return postJSON(`/api/projects/${slug}/render/cancel`, {});
}

/** URL for the render progress EventSource (not a fetch — use with `new EventSource(...)`) . */
export function renderStreamUrl(slug: string): string {
  return `/api/projects/${slug}/render/stream`;
}

// ── HyperFrames Studio hand-off ──────────────────────────────────────────────

export function openPreviewStudio(slug: string): Promise<{ url: string | null }> {
  return postJSON(`/api/projects/${slug}/preview-studio`, {});
}
