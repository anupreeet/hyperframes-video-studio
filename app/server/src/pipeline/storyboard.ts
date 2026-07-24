// Storyboard engine — ports SKILL.md Step 3.5 (sentence↔timestamp alignment),
// Step 4c (signal→scene-type rules + no-repeat), the showcase priority order,
// and talking-cut cutaway planning (≥3s gaps + auto card-count heuristic).

import {
  SHOWCASE_PRIORITY,
  type ProjectMode,
  type ScenePayload,
  type SceneType,
  type Storyboard,
  type StoryboardScene,
  type TranscriptWord,
} from "../types.js";
import { fallbackItems, findNumber, pickGlyph } from "../templates/util.js";

export function splitSentences(script: string): string[] {
  const text = script.replace(/\s+/g, " ").trim();
  if (!text) return [];

  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!".!?".includes(text[i])) continue;
    let end = i + 1;
    while (end < text.length && /["'”’\])}]/.test(text[end])) end++;
    if (end < text.length && !/\s/.test(text[end])) continue;
    const sentence = text.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    while (end < text.length && /\s/.test(text[end])) end++;
    start = end;
    i = end - 1;
  }

  const tail = text.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

const strip = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();

/**
 * Align script sentences to word-level transcript timestamps.
 * Walks the transcript with a moving pointer (Step 3.5 semantics) but bounds
 * the last-word search to the sentence's expected window so a repeated word
 * later in the audio can't stretch a scene (robustness fix over the original).
 */
export function alignSentences(
  sentences: string[],
  words: TranscriptWord[],
  totalDuration: number,
): { startTime: number; endTime: number }[] {
  const out: { startTime: number; endTime: number }[] = [];
  let ptr = 0;
  const totalScriptWords = sentences.reduce((n, s) => n + s.split(/\s+/).length, 0) || 1;

  for (const sentence of sentences) {
    const sw = sentence.split(/\s+/).map(strip).filter(Boolean);
    const first = sw[0];
    const last = sw[sw.length - 1];

    // Find first word near the pointer (tolerate transcription drift of a few tokens).
    let startIdx = -1;
    for (let i = ptr; i < Math.min(words.length, ptr + 8); i++) {
      if (strip(words[i].text) === first) {
        startIdx = i;
        break;
      }
    }
    if (startIdx === -1) startIdx = Math.min(ptr, Math.max(0, words.length - 1));

    // Expected end position ± slack; search backward from the far edge for the last word.
    const expectedEnd = startIdx + sw.length - 1;
    let endIdx = -1;
    const hi = Math.min(words.length - 1, expectedEnd + 6);
    const lo = Math.max(startIdx, expectedEnd - 6);
    for (let i = hi; i >= lo; i--) {
      if (strip(words[i].text) === last) {
        endIdx = i;
        break;
      }
    }
    if (endIdx === -1) endIdx = Math.min(words.length - 1, Math.max(startIdx, expectedEnd));

    const fallbackStart = (out.length / sentences.length) * totalDuration;
    out.push({
      startTime: words[startIdx]?.start ?? fallbackStart,
      endTime: words[endIdx]?.end ?? fallbackStart + totalDuration / sentences.length,
    });
    ptr = endIdx + 1;
  }

  // Contiguity pass: title starts at 0, each scene runs until the next begins,
  // last scene runs to the end of audio (scene durations come from transcript,
  // boundaries stay gap-free for clip scheduling).
  for (let i = 0; i < out.length; i++) {
    if (i === 0) out[i].startTime = 0;
    if (i < out.length - 1) out[i].endTime = out[i + 1].startTime;
    else out[i].endTime = Math.max(out[i].endTime, totalDuration);
    if (out[i].endTime <= out[i].startTime) {
      out[i].endTime = out[i].startTime + Math.max(1, totalDuration / (sentences.length * 2));
    }
  }
  void totalScriptWords;
  return out;
}

interface Rule {
  type: SceneType;
  test: (s: string) => boolean;
}

const hasListShape = (s: string) =>
  (s.match(/,/g) ?? []).length >= 2 || /first\b[\s\S]*second\b|second\b[\s\S]*third\b/i.test(s);

/** Step 4c signal table, in priority order (first/last handled separately). */
const RULES: Rule[] = [
  { type: "product-comparison", test: (s) => /pricing|plan|tier|per month|per user|free vs|pro\b/i.test(s) && /\bvs\.?\b|versus|compared? (to|with)/i.test(s) },
  { type: "counter-up", test: (s) => !!findNumber(s) && /grow|grew|reach|climb|count|rose|from \d+ to|up to|per (day|week|month|year)/i.test(s) },
  { type: "line-chart", test: (s) => /over time|trend|growth curve|since (19|20)\d{2}|timeline|trajectory|month after month|year after year/i.test(s) },
  { type: "donut-chart", test: (s) => /market share|budget|breakdown|slice|portion of|split between|make[s]? up/i.test(s) && !!findNumber(s) },
  { type: "progress-ring", test: (s) => /%|percent/i.test(s) && /of (all|every|the|our|users|teams|people|projects)|proportion|share/i.test(s) },
  { type: "stat-reveal", test: (s) => !!findNumber(s) && /%|percent|million|billion|thousand|\b\d{2,}\b/i.test(s) },
  { type: "comparison", test: (s) => /\bvs\.?\b|versus|compared? (to|with)|instead of|rather than|on one side/i.test(s) },
  { type: "split-screen", test: (s) => /problem[\s\S]*solution|need[\s\S]*answer|question[\s\S]*answer|before[\s\S]*after/i.test(s) },
  { type: "list-reveal", test: hasListShape },
  { type: "flow-steps", test: (s) => /\bsteps?\b|process|pipeline|workflow|sequence|then\b|first,|finally|stage/i.test(s) },
  { type: "quote-card", test: (s) => /[""].+[""]|\bsaid\b|\bsays\b|\bquote\b|famously/i.test(s) },
  { type: "threejs-object", test: (s) => /\b3d\b|three.?dimensional|dimension|cube|globe|sphere|orbit|space station/i.test(s) },
  { type: "hud-overlay", test: (s) => /dashboard|terminal|command line|interface|hud|telemetry|monitoring/i.test(s) },
  { type: "pexels-hero", test: (s) => /imagine|picture (a|the|this)|city|nature|ocean|forest|people (around|everywhere)|real world|street/i.test(s) },
  { type: "kinetic-text", test: (s) => /what is|what are|means|definition|is (a|the) (way|process|method|practice)/i.test(s) },
  { type: "doodle-split", test: (s) => /like (a|an)\b|as if|metaphor|think of it|feels like/i.test(s) },
  { type: "callout", test: (s) => s.split(/\s+/).length <= 8 && /[!.]$/.test(s) },
  { type: "icon-grid", test: (s) => /every|all of|across|team|tools|features|benefits/i.test(s) && hasListShape(s) },
  { type: "split-layout", test: (s) => /because|which means|so that|the result/i.test(s) },
];

/** No-repeat fallback chains (Step 4c: move to next best fit). */
const ALTERNATES: Partial<Record<SceneType, SceneType[]>> = {
  "stat-reveal": ["counter-up", "bar-chart", "progress-ring"],
  "counter-up": ["stat-reveal", "bar-chart", "donut-chart"],
  "progress-ring": ["stat-reveal", "donut-chart", "counter-up"],
  "bar-chart": ["donut-chart", "stat-reveal", "line-chart"],
  "donut-chart": ["bar-chart", "progress-ring", "stat-reveal"],
  "line-chart": ["bar-chart", "counter-up", "stat-reveal"],
  "kinetic-text": ["kinetic-impact", "callout", "kinetic-slam"],
  "kinetic-impact": ["kinetic-slam", "kinetic-text", "callout"],
  "kinetic-slam": ["kinetic-impact", "callout", "kinetic-text"],
  callout: ["kinetic-impact", "quote-card", "kinetic-text"],
  "quote-card": ["callout", "kinetic-text", "split-layout"],
  "list-reveal": ["list-reveal-words", "icon-grid", "flow-steps"],
  "list-reveal-words": ["list-reveal", "icon-grid", "flow-steps-text"],
  "flow-steps": ["flow-steps-text", "list-reveal", "icon-grid"],
  "flow-steps-text": ["flow-steps", "list-reveal-words", "split-layout"],
  comparison: ["comparison-verdict", "split-screen", "split-layout"],
  "comparison-verdict": ["comparison", "split-screen", "callout"],
  "split-screen": ["split-layout", "comparison", "doodle-split"],
  "split-layout": ["split-screen", "doodle-split", "kinetic-text"],
  "doodle-split": ["split-layout", "icon-grid", "kinetic-text"],
  "icon-grid": ["list-reveal", "doodle-split", "flow-steps"],
  "pexels-hero": ["doodle-split", "split-layout", "kinetic-text"],
  "threejs-object": ["hud-overlay", "kinetic-slam", "callout"],
  "hud-overlay": ["threejs-object", "split-layout", "kinetic-text"],
  "product-comparison": ["comparison", "comparison-verdict", "bar-chart"],
};

function assignType(sentence: string, i: number, count: number, prev: SceneType | null): SceneType {
  let type: SceneType;
  if (i === 0) type = "title-card";
  else if (i === count - 1) type = "outro-card";
  else type = RULES.find((r) => r.test(sentence))?.type ?? "kinetic-text";

  if (type === prev) {
    const alts = ALTERNATES[type] ?? ["kinetic-text", "callout", "split-layout"];
    type = alts.find((a) => a !== prev) ?? "kinetic-text";
  }
  return type;
}

/** Showcase mode: walk the priority order, one unique type per sentence. */
function assignShowcaseTypes(count: number): SceneType[] {
  const types: SceneType[] = [];
  for (let i = 0; i < count; i++) {
    if (i < SHOWCASE_PRIORITY.length) types.push(SHOWCASE_PRIORITY[i]);
    else {
      const next = SHOWCASE_PRIORITY[i % SHOWCASE_PRIORITY.length];
      types.push(next === types[i - 1] ? SHOWCASE_PRIORITY[(i + 1) % SHOWCASE_PRIORITY.length] : next);
    }
  }
  return types;
}

/** Heuristic payload extraction per type — the LLM polish step may overwrite. */
export function extractPayload(sentence: string, type: SceneType, index: number): ScenePayload {
  const num = findNumber(sentence);
  const payload: ScenePayload = {};
  switch (type) {
    case "stat-reveal":
      if (num) payload.stat = { value: num.raw, label: sentence.replace(/[.!?]$/, "") };
      break;
    case "counter-up":
      if (num) payload.counter = { from: 0, to: num.value, suffix: num.raw.replace(/[\d.,]+/, "") };
      break;
    case "progress-ring":
      payload.percent = num ? Math.min(100, Math.round(num.value)) : 75;
      break;
    case "bar-chart": {
      const items = fallbackItems(sentence, 4);
      payload.bars = items.map((label, i) => ({
        label: label.split(/\s+/).slice(0, 3).join(" "),
        value: [90, 65, 45, 30][i] ?? 25,
      }));
      break;
    }
    case "donut-chart": {
      const items = fallbackItems(sentence, 3);
      payload.segments = items.map((label, i) => ({
        label: label.split(/\s+/).slice(0, 3).join(" "),
        value: [50, 30, 20][i] ?? 10,
      }));
      break;
    }
    case "line-chart":
      payload.points = [12, 19, 26, 41, 58, 84];
      break;
    case "list-reveal":
    case "list-reveal-words":
    case "icon-grid":
      payload.items = fallbackItems(sentence, 5);
      break;
    case "flow-steps":
    case "flow-steps-text":
      payload.steps = fallbackItems(sentence, 4);
      break;
    case "comparison":
    case "comparison-verdict":
    case "split-screen": {
      const m = sentence.split(/\bvs\.?\b|versus|compared? (?:to|with)|instead of|rather than|—|;|\bbut\b/i);
      if (m.length >= 2) {
        payload.compare = { left: m[0].trim(), right: m.slice(1).join(" ").trim() };
      }
      break;
    }
    case "quote-card": {
      const q = sentence.match(/[""]([^""]+)[""]/);
      payload.quote = { text: q?.[1] ?? sentence.replace(/[.!?]$/, "") };
      break;
    }
    case "kinetic-impact":
    case "kinetic-slam": {
      const parts = sentence.split(/\?|—|:/);
      if (parts.length >= 2) {
        const tail = parts.slice(1).join(" ").trim().split(/\s+/);
        payload.emphasis = {
          setup: parts[0].trim() + (sentence.includes("?") ? "?" : ""),
          mid: tail.slice(0, Math.max(1, tail.length - 1)).join(" "),
          slam: tail[tail.length - 1]?.replace(/[.!?]$/, "").toUpperCase(),
        };
      }
      break;
    }
    case "pexels-hero": {
      const contentWords = sentence
        .replace(/[^\p{L}\s]/gu, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !/this|that|with|from|have|will|your|they|when|what|there/i.test(w));
      payload.pexels = { query: contentWords.slice(0, 5).join(" ") || "abstract dark texture", media: "video" };
      break;
    }
    case "doodle-split":
    case "split-layout":
      payload.glyph = pickGlyph(sentence, index);
      break;
    default:
      break;
  }
  return payload;
}

export function buildStoryboard(input: {
  slug: string;
  mode: ProjectMode;
  themeId: string;
  sentences: string[];
  words: TranscriptWord[];
  totalDuration: number;
  title?: string;
}): Storyboard {
  const { slug, mode, themeId, sentences, words, totalDuration } = input;
  const times = alignSentences(sentences, words, totalDuration);
  const types =
    mode === "showcase"
      ? assignShowcaseTypes(sentences.length)
      : sentences.map((s, i) =>
          assignType(s, i, sentences.length, undefined as unknown as SceneType | null),
        );

  // Sequential no-repeat enforcement for the rule-based path.
  if (mode !== "showcase") {
    for (let i = 1; i < types.length; i++) {
      if (types[i] === types[i - 1]) {
        const alts = ALTERNATES[types[i]] ?? ["kinetic-text", "callout"];
        types[i] = alts.find((a) => a !== types[i - 1]) ?? "kinetic-text";
      }
    }
  }

  const scenes: StoryboardScene[] = sentences.map((sentence, i) => {
    const payload = extractPayload(sentence, types[i], i);
    if (i === 0 && input.title) payload.headline = input.title;
    return {
      id: i + 1,
      sentence,
      type: types[i],
      startTime: Number(times[i].startTime.toFixed(3)),
      endTime: Number(times[i].endTime.toFixed(3)),
      payload,
    };
  });

  return { slug, mode, themeId, totalDuration, scenes };
}

// ── Talking-cut planning ────────────────────────────────────────────────────

/** Official talking-head-recut pacing: seconds-per-card by source duration. */
function basePace(durationSec: number): number {
  if (durationSec < 60) return 7;
  if (durationSec < 600) return 15;
  if (durationSec < 1800) return 30;
  return 45;
}

function densityMultiplier(wordsPerSecond: number): number {
  if (wordsPerSecond > 2.8) return 0.7;
  if (wordsPerSecond < 1.5) return 1.5;
  return 1.0;
}

export interface CutawayPlan {
  sceneIds: number[];
  count: number;
}

/**
 * Pick which storyboard sentences become graphic cutaways in talking-cut mode.
 * Count from the official auto formula, capped so every cutaway can keep the
 * skill's ≥3s face-cam gap; picks the strongest content signals first.
 */
export function planCutaways(
  scenes: StoryboardScene[],
  totalDuration: number,
  wordCount: number,
): CutawayPlan {
  const formulaCount = Math.max(
    5,
    Math.round(totalDuration / (basePace(totalDuration) * densityMultiplier(wordCount / Math.max(1, totalDuration)))),
  );
  const maxByGaps = Math.max(1, Math.floor(totalDuration / 6.5));
  const target = Math.min(formulaCount, maxByGaps, scenes.length);

  const score = (s: StoryboardScene): number => {
    let n = 0;
    if (findNumber(s.sentence)) n += 3;
    if (/\bvs\.?\b|versus|compared/i.test(s.sentence)) n += 2;
    if ((s.sentence.match(/,/g) ?? []).length >= 2) n += 2;
    if (/step|process|then/i.test(s.sentence)) n += 1;
    if (s.sentence.split(/\s+/).length <= 9) n += 1;
    return n;
  };

  const ranked = [...scenes]
    .filter((s) => s.endTime - s.startTime >= 2.5)
    .sort((a, b) => score(b) - score(a));

  const chosen: StoryboardScene[] = [];
  for (const cand of ranked) {
    if (chosen.length >= target) break;
    const ok = chosen.every(
      (c) => cand.startTime >= c.endTime + 3 || cand.endTime <= c.startTime - 3,
    );
    if (ok) chosen.push(cand);
  }
  chosen.sort((a, b) => a.startTime - b.startTime);
  return { sceneIds: chosen.map((s) => s.id), count: chosen.length };
}
