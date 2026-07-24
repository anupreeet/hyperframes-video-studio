// Composition assembler — turns a storyboard + theme + scene templates into a
// HyperFrames index.html (SKILL.md Step 4d structure, 4e layout rules).

import { getTheme } from "../themes.js";
import { sceneTemplates } from "../templates/index.js";
import type { SceneOutput } from "../templates/util.js";
import type { Storyboard, StoryboardScene, Theme } from "../types.js";

const GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";
/** Overlapping-clips lint fix: trim every non-final scene by 0.04s. */
const OVERLAP_TRIM = 0.04;

export interface ComposeOptions {
  /** Project-relative audio path, e.g. "audio/my-video.wav". */
  audioFile: string;
  subtitles?: boolean;
}

export interface TalkingCutOptions {
  /** Project-relative muted face-cam video, e.g. "assets/source-kf.mp4". */
  mutedVideo: string;
  /** Project-relative WAV extracted from the same CFR encode. */
  audioFile: string;
  /** ffprobe duration of the muted video — used for ALL data-duration attrs. */
  duration: number;
  /** Storyboard scene ids that become graphic cutaways (≥3s gaps enforced upstream). */
  cutawayIds: number[];
  subtitles?: boolean;
}

export interface ComposeResult {
  html: string;
  assets: NonNullable<SceneOutput["assets"]>;
}

function renderScenes(
  scenes: StoryboardScene[],
  theme: Theme,
  opts: { trackIndex: number; zIndex?: number; trimLast: boolean },
): {
  clips: string;
  gsap: string;
  outer: string;
  head: string;
  assets: NonNullable<SceneOutput["assets"]>;
} {
  const clips: string[] = [];
  const gsapParts: string[] = [];
  const outerParts: string[] = [];
  const headParts = new Set<string>();
  const assets: NonNullable<SceneOutput["assets"]> = [];

  scenes.forEach((scene, i) => {
    const template = sceneTemplates[scene.type];
    const index = scene.id;
    const start = scene.startTime;
    const isLast = i === scenes.length - 1;
    const duration = Math.max(
      0.5,
      scene.endTime - scene.startTime - (!isLast || !opts.trimLast ? OVERLAP_TRIM : 0),
    );

    const out = template({ scene, theme, index, offset: start, duration });
    const z = opts.zIndex ? `style="z-index:${opts.zIndex};"` : "";
    clips.push(
      `<div id="s${index}" class="clip" data-start="${start.toFixed(2)}" ` +
        `data-duration="${duration.toFixed(2)}" data-track-index="${opts.trackIndex}" ${z}>\n${out.html}\n</div>`,
    );
    gsapParts.push(`// ── scene s${index} (${scene.type}) ──\n${out.gsap}`);
    if (out.outerHtml) outerParts.push(out.outerHtml);
    if (out.headHtml) headParts.add(out.headHtml);
    if (out.assets) assets.push(...out.assets);
  });

  return {
    clips: clips.join("\n\n"),
    gsap: gsapParts.join("\n"),
    outer: outerParts.join("\n"),
    head: [...headParts].join("\n"),
    assets,
  };
}

function baseStyles(theme: Theme): string {
  const c = theme.captions;
  return `
    /* ── Full-screen foundation — ALL THREE RULES required (SKILL.md 4d) ── */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${theme.colors.bg}; }
    [data-composition-id] { position: absolute; inset: 0; overflow: hidden; }
    /* ⚠️ NEVER OMIT: without this, clips have auto-height → content renders in a corner */
    .clip { position: absolute; inset: 0; }
    .scene-bg { position: absolute; inset: 0; background: ${theme.colors.bg}; }
    .scene-content {
      position: relative; width: 100%; height: 100%;
      padding: 120px 160px;
      display: flex; flex-direction: column; justify-content: center;
      gap: 24px; box-sizing: border-box;
    }
    /* ── Captions ── */
    #captions { position: absolute; inset: 0; pointer-events: none; z-index: 50; }
    #cap-text {
      position: absolute; bottom: ${c.bottom}; left: 0; right: 0; text-align: center;
      font-family: ${c.fontFamily}; font-size: ${c.fontSize}; font-weight: ${c.fontWeight};
      color: ${c.color}; text-shadow: ${c.textShadow}; padding: ${c.padding};
      opacity: 0; line-height: ${c.lineHeight};
    }
    /* HyperFrames overrides visibility on composition divs — suppress via class + !important */
    #captions.subs-off #cap-text { opacity: 0 !important; }
  `;
}

function fontLink(theme: Theme): string {
  return theme.typography.googleFonts
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="${theme.typography.googleFonts}" rel="stylesheet">`
    : "";
}

function captionsScript(scenes: StoryboardScene[], subtitlesOn: boolean): string {
  const sentences = scenes.map((s) => ({
    s: Number(s.startTime.toFixed(2)),
    e: Number(s.endTime.toFixed(2)),
    t: s.sentence,
  }));
  return `
    // Captions use ORIGINAL script sentences — never transcribed tokens
    // (small.en mangles proper nouns). Press S in preview to toggle.
    var SUBTITLES_ON = ${subtitlesOn};
    var capRoot = document.getElementById('captions');
    capRoot.classList.toggle('subs-off', !SUBTITLES_ON);
    document.addEventListener('keydown', function (e) {
      if (e.key === 's' || e.key === 'S') {
        SUBTITLES_ON = !SUBTITLES_ON;
        capRoot.classList.toggle('subs-off', !SUBTITLES_ON);
      }
    });
    var SENTENCES = ${JSON.stringify(sentences)};
    var capEl = document.getElementById('cap-text');
    var capTl = gsap.timeline({ paused: true });
    SENTENCES.forEach(function (sen) {
      capTl.call(function (txt) { capEl.textContent = txt; }, [sen.t], sen.s);
      capTl.set(capEl, { opacity: 1 }, sen.s);
      capTl.set(capEl, { opacity: 0 }, Math.max(sen.s + 0.05, sen.e - 0.05));
    });
    window.__timelines['captions-overlay'] = capTl;
  `;
}

function document_(parts: {
  slug: string;
  theme: Theme;
  totalDuration: number;
  head: string;
  bodyInner: string;
  timelineJs: string;
  captionsJs: string;
}): string {
  const { slug, theme, totalDuration, head, bodyInner, timelineJs, captionsJs } = parts;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1920, height=1080">
  ${fontLink(theme)}
  <script src="${GSAP_CDN}"></script>
  ${head}
  <style>${baseStyles(theme)}</style>
</head>
<body>

<div data-composition-id="${slug}" data-start="0" data-duration="${totalDuration.toFixed(2)}"
     data-width="1920" data-height="1080">

${bodyInner}

  <!-- Caption overlay (full duration) — own composition-id (SKILL.md 4d) -->
  <div id="captions" data-composition-id="captions-overlay" data-track-index="10"
       data-duration="${totalDuration.toFixed(2)}" class="subs-off">
    <p id="cap-text"></p>
  </div>

  <script>
    window.__timelines = window.__timelines || {};
    var tl = gsap.timeline({ paused: true });

${timelineJs}

    window.__timelines['${slug}'] = tl;

${captionsJs}
  </script>
</div>
</body>
</html>
`;
}

/** Standard script-to-video / catalog-showcase composition. */
export function composeStandard(storyboard: Storyboard, opts: ComposeOptions): ComposeResult {
  const theme = getTheme(storyboard.themeId);
  const total = storyboard.totalDuration;
  const rendered = renderScenes(storyboard.scenes, theme, { trackIndex: 1, trimLast: true });

  const bodyInner = `
  <!-- Audio track — id REQUIRED (media_missing_id lint) -->
  <audio id="main-audio" data-start="0" data-duration="${total.toFixed(2)}"
         src="${opts.audioFile}" data-main-audio></audio>

${rendered.outer}

${rendered.clips}`;

  return {
    html: document_({
      slug: storyboard.slug,
      theme,
      totalDuration: total,
      head: rendered.head,
      bodyInner,
      timelineJs: rendered.gsap,
      captionsJs: captionsScript(storyboard.scenes, opts.subtitles ?? false),
    }),
    assets: rendered.assets,
  };
}

/**
 * Talking-cut composition (SKILL.md Talking-Cut Mode):
 * full source video in a plain NON-timed wrapper (z1), graphic cutaways as
 * clips on track 1 (z2), audio as the main track WITHOUT data-track-index.
 */
export function composeTalkingCut(storyboard: Storyboard, opts: TalkingCutOptions): ComposeResult {
  const theme = getTheme(storyboard.themeId);
  const total = opts.duration;
  const cutaways = storyboard.scenes.filter((s) => opts.cutawayIds.includes(s.id));
  const rendered = renderScenes(cutaways, theme, { trackIndex: 1, zIndex: 2, trimLast: true });

  const bodyInner = `
  <!-- Plain non-timed wrapper — NOT a .clip; video shows through between cutaways -->
  <div id="v-wrap" style="position:absolute;inset:0;z-index:1;">
    <video id="bg-video" src="${opts.mutedVideo}" muted playsinline
           data-start="0" data-duration="${total.toFixed(2)}" data-track-index="0"
           style="width:100%;height:100%;object-fit:cover;"></video>
  </div>

  <!-- Main audio — data-main-audio, NO data-track-index (conflicts with video on track 0) -->
  <audio id="main-audio" data-start="0" data-duration="${total.toFixed(2)}"
         src="${opts.audioFile}" data-main-audio></audio>

${rendered.outer}

${rendered.clips}`;

  return {
    html: document_({
      slug: storyboard.slug,
      theme,
      totalDuration: total,
      head: rendered.head,
      bodyInner,
      timelineJs: rendered.gsap,
      captionsJs: captionsScript(cutaways, opts.subtitles ?? false),
    }),
    assets: rendered.assets,
  };
}
