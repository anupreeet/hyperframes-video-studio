// Shared domain types for the HyperFrames Video Studio pipeline.

/** Shape of themes/*.json (this repo's themes directory). */
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

/** One word from `hyperframes transcribe --json`. */
export interface TranscriptWord {
  id?: number;
  text: string;
  start: number;
  end: number;
}

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

/** Showcase mode priority order (SKILL.md line 69). */
export const SHOWCASE_PRIORITY: SceneType[] = [
  "title-card",
  "kinetic-impact",
  "kinetic-slam",
  "kinetic-text",
  "quote-card",
  "callout",
  "comparison",
  "bar-chart",
  "stat-reveal",
  "counter-up",
  "split-layout",
  "doodle-split",
  "flow-steps-text",
  "progress-ring",
  "list-reveal-words",
  "outro-card",
  "list-reveal",
  "flow-steps",
  "icon-grid",
  "comparison-verdict",
  "cta-callout",
];

/** Structured data extracted from a sentence for its scene template. */
export interface ScenePayload {
  /** Short display headline distinct from the raw sentence. */
  headline?: string;
  stat?: { value: string; label?: string };
  counter?: { from: number; to: number; suffix?: string; label?: string };
  /** list-reveal / list-reveal-words / icon-grid items. */
  items?: string[];
  /** flow-steps / flow-steps-text ordered steps. */
  steps?: string[];
  bars?: { label: string; value: number }[];
  /** donut-chart part-of-whole segments. */
  segments?: { label: string; value: number }[];
  /** line-chart y-values, left→right. */
  points?: number[];
  compare?: {
    left: string;
    right: string;
    leftLabel?: string;
    rightLabel?: string;
    verdict?: string;
  };
  quote?: { text: string; attribution?: string };
  /** progress-ring 0–100. */
  percent?: number;
  /** Semantic Unicode glyph for doodle-split / split-layout / icon-grid. */
  glyph?: string;
  pexels?: { query: string; media: "photo" | "video"; file?: string };
  products?: { name: string; attrs: string[] }[];
  /** kinetic-impact / kinetic-slam text tiers. */
  emphasis?: { setup?: string; mid?: string; slam?: string };
}

export type ProjectMode = "script" | "showcase" | "talking-cut";

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

export type StepName =
  | "script"
  | "tts"
  | "transcribe"
  | "storyboard"
  | "compose"
  | "render";

export type StepState = "pending" | "running" | "done" | "error";

export interface ProjectMeta {
  slug: string;
  title: string;
  mode: ProjectMode;
  themeId: string;
  createdAt: string;
  updatedAt: string;
  fps: 24 | 30 | 60;
  script?: string;
  /** Per-step status for the wizard. */
  steps: Partial<Record<StepName, { state: StepState; detail?: string; at: string }>>;
  /** Source media for showcase / talking-cut modes (absolute path or projects-relative). */
  sourceMedia?: string;
  audioFile?: string;
  transcriptFile?: string;
  renderedFile?: string;
  totalDuration?: number;
  /** Talking-cut: storyboard scene ids selected as graphic cutaways. */
  cutawayIds?: number[];
  /** Talking-cut: muted face-cam video path (project-relative). */
  mutedVideo?: string;
}

export type LlmEffort = "" | "low" | "medium" | "high" | "xhigh" | "max";

export interface AppSettings {
  projectsDir: string;
  omivoiceUrl: string;
  omivoiceRefVoice: string;
  pexelsApiKey: string;
  anthropicApiKey: string;
  /** OpenAI-compatible endpoint (Ollama/LM Studio/OpenRouter/…). When this AND
   * openaiModel are set, AI assists use it instead of Anthropic. */
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiEffort: LlmEffort;
  defaultThemeId: string;
  defaultFps: 24 | 30 | 60;
  kokoroVoice: string;
}
