// Scene type 15b: canvas2d-scene — Canvas 2D generative visual filling the clip.
// SKILL.md appendix §15b. Same requestAnimationFrame + tweened `state` object pattern
// as threejs-object (see that file's header comment for why rAF is kept instead of an
// onUpdate-driven progress object): HyperFrames seeks the timeline with
// suppressEvents:true during capture, so onUpdate never fires while rendering — rAF is
// the documented, tested integration point instead.
//
// Ported here: the built-in Canvas 2D API path (no external library, draws an
// expanding/glowing ring). SKILL.md also documents p5.js
// (https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js) and PixiJS
// (https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js) as drop-in alternatives for
// generative art / sprite effects, but gives no concrete drawing example for either, so
// they are not wired up — only referenced here in comment form.

import { payloadOf, sid, t, type SceneTemplate } from "./util.js";

/** Theme hex ("#c0392b") → "r,g,b" triplet for CSS rgba() strings. */
function hexToRgbTriplet(c: string): string {
  const h = c.replace("#", "").trim();
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

export const canvas2dScene: SceneTemplate = (ctx) => {
  const { theme, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  // ScenePayload has no dedicated "progress" field for this scene type; percent
  // (progress-ring's field) doubles as an optional 0-100 driver when present, else the
  // ring draws fully closed (progress 1), matching SKILL.md's example target.
  const progress = payload.percent != null ? Math.max(0, Math.min(100, payload.percent)) / 100 : 1;
  const stateVar = `${p}State`;

  const html =
    `<canvas id="${p}-c2d" style="position:absolute;inset:0;display:block;background:${theme.colors.bg};"></canvas>` +
    `<script>(function(){` +
    `var cv=document.getElementById('${p}-c2d');cv.width=1920;cv.height=1080;` +
    `var ctx2d=cv.getContext('2d');` +
    `window.${stateVar}={progress:0,glow:0};` +
    `(function loop(){` +
    `requestAnimationFrame(loop);` +
    `ctx2d.clearRect(0,0,1920,1080);` +
    `var r=window.${stateVar}.progress*960;` +
    `ctx2d.beginPath();` +
    `ctx2d.arc(960,540,r,0,Math.PI*2);` +
    `ctx2d.strokeStyle='rgba(${hexToRgbTriplet(theme.colors.accent)},'+window.${stateVar}.glow+')';` +
    `ctx2d.lineWidth=4;` +
    `ctx2d.stroke();` +
    `})();` +
    `})();</script>`;

  // SKILL.md's example hardcodes duration:2 (not scaled to scene length) — ported
  // literally; scenes shorter than ~2s will cut the draw-on short, matching source.
  const gsap = `tl.fromTo(window.${stateVar}, { progress:0, glow:0 }, { progress:${progress}, glow:1, duration:2, ease:'power2.out' }, ${t(offset)});\n`;

  return { html, gsap };
};
