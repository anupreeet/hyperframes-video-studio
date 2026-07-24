// Optional Anthropic-powered assists (the "hybrid" tier). Everything here is
// gated on an API key in Settings; the app is fully functional without it.
//
// Three assists:
//  1. writeScript      — topic → voiceover script (SKILL.md Step 1 rules)
//  2. polishStoryboard — review heuristic type assignment + extract payloads
//  3. repairComposition — self-heal loop: composed HTML + lint findings →
//     corrected HTML (pattern from heygen-com/hyperframes-cloudflare-template)

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// The SDK's zod helper expects zod-v4-core schemas; zod 3.25+ ships the v4 API
// on this subpath (classic `zod` imports elsewhere are unaffected).
import { z } from "zod/v4";
import { getSettings } from "../settings.js";
import { SCENE_TYPES, type ScenePayload, type Storyboard } from "../types.js";

const MODEL = "claude-opus-4-8";

/** OpenAI-compatible endpoint takes over when a base URL + model are both set. */
function openaiActive(): boolean {
  const s = getSettings();
  return Boolean(s.openaiBaseUrl && s.openaiModel);
}

export function llmAvailable(): boolean {
  return openaiActive() || Boolean(getSettings().anthropicApiKey);
}

function getClient(): Anthropic {
  const key = getSettings().anthropicApiKey;
  if (!key) {
    throw new Error(
      "No Anthropic API key configured — add one in Settings to use AI assists, or paste a finished script instead.",
    );
  }
  return new Anthropic({ apiKey: key });
}

/** Minimal chat-completions call against the configured OpenAI-compatible URL. */
async function openaiChat(
  system: string,
  user: string,
  opts: { json?: boolean } = {},
): Promise<string> {
  const s = getSettings();
  const res = await fetch(`${s.openaiBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(s.openaiApiKey ? { Authorization: `Bearer ${s.openaiApiKey}` } : {}),
    },
    body: JSON.stringify({
      model: s.openaiModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(s.openaiEffort ? { reasoning_effort: s.openaiEffort } : {}),
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`OpenAI-compatible request failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI-compatible endpoint returned an empty response");
  return text;
}

// ── 1. Topic → script ───────────────────────────────────────────────────────

const SCRIPT_SYSTEM =
  "You write voiceover scripts for short explainer videos. Rules: " +
  "target at most 250 words (~90 seconds at natural speech pace). " +
  "Structure: hook (1-2 sentences), body (3-4 short paragraphs), close (1 sentence). " +
  "Write for the ear: short sentences, no jargon, natural rhythm, no headings, " +
  "no stage directions, no emoji — output ONLY the script text.";

export async function writeScript(topic: string, styleHint?: string): Promise<string> {
  const userPrompt = `Write a voiceover script about: ${topic}${styleHint ? `\nTone/style: ${styleHint}` : ""}`;

  if (openaiActive()) {
    return openaiChat(SCRIPT_SYSTEM, userPrompt);
  }

  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SCRIPT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("Model returned an empty script");
  return text;
}

// ── 2. Storyboard polish (strict JSON via structured outputs) ───────────────

const PayloadSchema = z.object({
  headline: z.string().nullable(),
  stat: z.object({ value: z.string(), label: z.string().nullable() }).nullable(),
  counter: z
    .object({
      from: z.number(),
      to: z.number(),
      suffix: z.string().nullable(),
      label: z.string().nullable(),
    })
    .nullable(),
  items: z.array(z.string()).nullable(),
  steps: z.array(z.string()).nullable(),
  bars: z.array(z.object({ label: z.string(), value: z.number() })).nullable(),
  segments: z.array(z.object({ label: z.string(), value: z.number() })).nullable(),
  points: z.array(z.number()).nullable(),
  compare: z
    .object({
      left: z.string(),
      right: z.string(),
      leftLabel: z.string().nullable(),
      rightLabel: z.string().nullable(),
      verdict: z.string().nullable(),
    })
    .nullable(),
  quote: z.object({ text: z.string(), attribution: z.string().nullable() }).nullable(),
  percent: z.number().nullable(),
  glyph: z.string().nullable(),
  pexels: z
    .object({ query: z.string(), media: z.enum(["photo", "video"]) })
    .nullable(),
  emphasis: z
    .object({
      setup: z.string().nullable(),
      mid: z.string().nullable(),
      slam: z.string().nullable(),
    })
    .nullable(),
});

const PolishSchema = z.object({
  scenes: z.array(
    z.object({
      id: z.number(),
      type: z.enum(SCENE_TYPES),
      payload: PayloadSchema,
      note: z.string().nullable(),
    }),
  ),
});

// Tolerant variant for OpenAI-compatible endpoints, which give no structured-
// output guarantee: missing payload fields count as unused, ids may be strings.
const PolishLooseSchema = z.object({
  scenes: z.array(
    z.object({
      id: z.coerce.number(),
      type: z.enum(SCENE_TYPES),
      payload: PayloadSchema.partial().default({}),
      note: z.string().nullish().default(null),
    }),
  ),
});

/** Strip nulls recursively so the result matches our optional-field ScenePayload. */
function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripNulls) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== null) out[k] = stripNulls(v);
    }
    return out as T;
  }
  return value;
}

const POLISH_SYSTEM =
  "You are a storyboard director for HyperFrames explainer videos. For each sentence " +
  "you receive a heuristically assigned scene type and payload. Improve them: " +
  "pick the scene type that best matches the sentence's content signal (numbers → stat-reveal/counter-up, " +
  "lists → list-reveal, process → flow-steps, contrast → comparison, quote → quote-card, " +
  "definition → kinetic-text, proportion → progress-ring/donut-chart, trend → line-chart, " +
  "atmosphere/imagery → pexels-hero, 3D concept → threejs-object, dashboard/terminal → hud-overlay). " +
  "HARD RULES: scene 1 keeps type title-card; the last scene keeps type outro-card; " +
  "no two CONSECUTIVE scenes may share a type; keep every scene id. " +
  "Extract concrete payload data from each sentence (real numbers, real list items, real " +
  "comparison sides, a specific 4-6 word Pexels query). Set unused payload fields to null. " +
  "For kinetic-impact/kinetic-slam, split the sentence into setup/mid/slam emphasis tiers.";

export async function polishStoryboard(storyboard: Storyboard): Promise<Storyboard> {
  const sceneInput = storyboard.scenes.map((s) => ({
    id: s.id,
    sentence: s.sentence,
    currentType: s.type,
    currentPayload: s.payload ?? {},
  }));

  let parsed: z.infer<typeof PolishLooseSchema>;
  if (openaiActive()) {
    const raw = await openaiChat(
      POLISH_SYSTEM +
        " Respond with ONLY a JSON object shaped {\"scenes\":[{\"id\",\"type\",\"payload\",\"note\"}]} — " +
        "every payload field present (null when unused), no markdown fences, no prose.",
      JSON.stringify({ scenes: sceneInput }),
      { json: true },
    );
    const text = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    parsed = PolishLooseSchema.parse(JSON.parse(text));
  } else {
    const client = getClient();
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: POLISH_SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ scenes: sceneInput }),
        },
      ],
      output_config: { format: zodOutputFormat(PolishSchema) },
    });
    if (!response.parsed_output) throw new Error("Storyboard polish returned unparseable output");
    parsed = response.parsed_output;
  }

  const byId = new Map(parsed.scenes.map((s) => [s.id, s]));
  const scenes = storyboard.scenes.map((scene) => {
    const polished = byId.get(scene.id);
    if (!polished) return scene;
    return {
      ...scene,
      type: polished.type,
      // stripNulls removes every null at runtime; the schema's `| null`
      // markers don't survive it, so the assertion states its contract.
      payload: stripNulls(polished.payload) as unknown as ScenePayload,
      note: polished.note ?? scene.note,
    };
  });

  // Belt-and-braces: enforce the no-repeat rule even on model output.
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].type === scenes[i - 1].type) scenes[i] = { ...scenes[i], type: "kinetic-text" };
  }
  return { ...storyboard, scenes };
}

// ── 3. Composition self-heal (lint errors fed back, ≤2 retries) ─────────────

import type { LintFinding } from "./render.js";
export type { LintFinding };

const REPAIR_SYSTEM =
  "You repair HyperFrames HTML video compositions so they pass `hyperframes lint`. " +
  "HyperFrames rules: the root div has data-composition-id/data-width/data-height; every timed " +
  "scene div has class=\"clip\" plus data-start/data-duration (seconds); one paused GSAP timeline " +
  "is registered on window.__timelines keyed by the composition id; every <video>/<audio> with " +
  "data-start has a unique id; never animate display on .clip elements (HyperFrames owns clip " +
  "scheduling); no render-time network calls, clocks, or randomness. " +
  "Fix ONLY what the lint findings require — keep design, timings, text, and structure otherwise " +
  "byte-identical. Output the complete corrected HTML document and nothing else — no markdown fences.";

export async function repairComposition(
  html: string,
  findings: LintFinding[],
  attempt: number,
): Promise<string> {
  const userPrompt =
    `Lint findings (attempt ${attempt}):\n${JSON.stringify(findings, null, 2)}\n\n` +
    `Composition:\n${html}`;

  let fixed: string;
  if (openaiActive()) {
    fixed = await openaiChat(REPAIR_SYSTEM, userPrompt);
  } else {
    const client = getClient();
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: REPAIR_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    const message = await stream.finalMessage();
    fixed = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }
  // Defensive: strip accidental markdown fences.
  fixed = fixed.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
  if (!fixed.toLowerCase().includes("<!doctype") && !fixed.toLowerCase().includes("<html")) {
    throw new Error("Repair output does not look like an HTML document");
  }
  return fixed;
}
