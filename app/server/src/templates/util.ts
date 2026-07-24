import type { ScenePayload, StoryboardScene, Theme } from "../types.js";

/** Everything a scene template needs to emit its HTML + GSAP code. */
export interface SceneContext {
  scene: StoryboardScene;
  theme: Theme;
  /** 1-based scene number → element id prefix `s{n}`. */
  index: number;
  /** Absolute start time in seconds (== scene.startTime). */
  offset: number;
  /** Scene duration in seconds (already overlap-trimmed). */
  duration: number;
}

export interface SceneOutput {
  /** Inner HTML of the `.clip` div: `<div class="scene-bg">…</div><div class="scene-content">…</div>`. */
  html: string;
  /** GSAP statements appended to the main timeline builder. Reference `tl`, bake absolute times as literals. */
  gsap: string;
  /**
   * Elements that must live OUTSIDE all `.clip` divs (e.g. the non-timed
   * `#v-wrap` video wrapper used by pexels-hero / presenter-aside /
   * hud-overlay, revealed via `tl.set('#…', {display:'block'}, T)`).
   */
  outerHtml?: string;
  /** Extra `<head>` additions (e.g. three.js CDN script tag). Deduped by compose. */
  headHtml?: string;
  /** Media this scene needs fetched into assets/ before render. */
  assets?: { kind: "pexels"; query: string; media: "photo" | "video"; file: string }[];
}

export type SceneTemplate = (ctx: SceneContext) => SceneOutput;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Absolute-time literal for GSAP position parameters: t(3.4156) → "3.42". */
export function t(seconds: number): string {
  return seconds.toFixed(2);
}

/** id prefix helper: sid(3) → "s3". */
export function sid(index: number): string {
  return `s${index}`;
}

/**
 * Semantic Unicode glyph picker (SKILL.md 4e: glyphs, never emoji — safe
 * monochrome Chromium ranges only). Keyword-matched with a rotating fallback.
 */
export function pickGlyph(sentence: string, fallbackSeed = 0): string {
  const s = sentence.toLowerCase();
  const rules: [RegExp, string][] = [
    [/grow|increase|rise|up|boost|improve/, "↑"],
    [/drop|decrease|fall|decline|down/, "↓"],
    [/infinit|scale|endless|forever|unlimited/, "∞"],
    [/differen|contrast|versus|vs\b|not the same|unlike/, "≠"],
    [/warn|danger|risk|fail|dead|kill/, "☠"],
    [/star|best|top|favorite|premium/, "★"],
    [/check|done|complete|success|right|correct/, "✓"],
    [/wrong|mistake|error|avoid|never/, "✗"],
    [/next|forward|then|leads|toward|into/, "→"],
    [/idea|spark|highlight|key|insight/, "✸"],
    [/sum|total|together|combine|all\b/, "∑"],
    [/change|shift|delta|transform/, "∆"],
    [/roughly|about|approx|almost/, "≈"],
    [/swap|exchange|trade|back and forth/, "⇄"],
    [/target|focus|aim|goal/, "◉"],
  ];
  for (const [re, glyph] of rules) if (re.test(s)) return glyph;
  const pool = ["◆", "✦", "▲", "◈", "⬡", "✧", "■", "◎"];
  return pool[fallbackSeed % pool.length];
}

/** Default payload accessor with graceful fallback. */
export function payloadOf(ctx: SceneContext): ScenePayload {
  return ctx.scene.payload ?? {};
}

/**
 * Split a sentence into display items when a payload list is missing:
 * "X, Y, and Z" → ["X", "Y", "Z"]. Falls back to word-chunks of 2–3.
 */
export function fallbackItems(sentence: string, max = 4): string[] {
  const cleaned = sentence.replace(/[.!?]$/g, "");
  const parts = cleaned
    .split(/,|;| and | or |—/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
  if (parts.length >= 2) return parts.slice(0, max);
  const words = cleaned.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length && chunks.length < max; i += 3) {
    chunks.push(words.slice(i, i + 3).join(" "));
  }
  return chunks;
}

/** First number found in a sentence, with its raw display form ("43%", "1.5M", "12"). */
export function findNumber(sentence: string): { raw: string; value: number } | null {
  const m = sentence.match(/(\d+(?:[.,]\d+)?)\s*(%|percent|x|k|m|b|million|billion|thousand)?/i);
  if (!m) return null;
  const value = parseFloat(m[1].replace(",", "."));
  let raw = m[1];
  const suffix = (m[2] ?? "").toLowerCase();
  if (suffix === "%" || suffix === "percent") raw = `${m[1]}%`;
  else if (suffix === "x") raw = `${m[1]}×`;
  else if (suffix) raw = `${m[1]}${suffix.charAt(0).toUpperCase()}`;
  return { raw, value };
}
