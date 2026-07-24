// Scene type 19: presenter-aside — webcam/talking-head video on the right half, text
// (eyebrow + headline + sub) on the left half. SKILL.md appendix §19.
//
// Requires a pre-existing local recording (SKILL.md: "assets/webcam-enc.mp4", re-encoded
// with dense keyframes beforehand) — unlike pexels-hero there is no fetch mechanism
// documented for this source, so no `assets` entry is returned; the file is assumed to
// already exist in the project's assets/ directory.

import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";

function hexToRgba(c: string, a: number): string {
  const h = c.replace("#", "").trim();
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const presenterAside: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset, duration } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const headline = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 4).join(" "),
  );
  const sub = escapeHtml(scene.sentence);
  // SKILL.md's literal example eyebrow text ("INPUT") — no ScenePayload field maps to a
  // short category tag for this scene type.
  const eyebrowText = "INPUT";

  // Video wrapper: plain non-timed div OUTSIDE all .clip divs, starts display:none to
  // avoid bleeding through any earlier scene (SKILL.md Error Handling: "presenter-aside
  // video wrapper bleeds through earlier title card / scenes" if display:none is
  // omitted). Revealed/hidden via tl.set at this scene's exact window. A themed
  // background fallback sits behind the video in case the asset fails to decode.
  const outerHtml =
    `<div id="${p}-vwrap" style="position:absolute;top:0;right:0;width:55%;height:100%;pointer-events:none;overflow:hidden;display:none;background:${theme.colors.bg};">` +
    `<video id="${p}-vid" data-start="${t(offset)}" data-duration="${duration.toFixed(2)}" data-track-index="0" muted playsinline src="assets/webcam-enc.mp4" style="width:100%;height:100%;object-fit:cover;object-position:center top;"></video>` +
    `<div style="position:absolute;inset:0;background:linear-gradient(90deg,${hexToRgba(theme.colors.bg, 1)} 0%,${hexToRgba(theme.colors.bg, 0.6)} 20%,transparent 45%);"></div>` +
    `</div>`;

  // No .scene-bg div here (matches SKILL.md source exactly) — the clip itself is
  // transparent so the presenter video shows through from the wrapper beneath it.
  const html =
    `<div class="scene-content" style="align-items:flex-start;max-width:860px;">` +
    `<div id="${p}-eye" style="font-size:22px;font-weight:700;letter-spacing:6px;color:${theme.colors.accent};text-transform:uppercase;opacity:0;">${eyebrowText}</div>` +
    `<h2 id="${p}-hed" style="${theme.css.hed}font-size:100px;margin:0;opacity:0;">${headline}</h2>` +
    `<p id="${p}-sub" style="font-size:44px;font-weight:400;color:${theme.colors.muted};margin:0;opacity:0;">${sub}</p>` +
    `</div>`;

  const gsap =
    `tl.set('#${p}-vwrap', { display:'block' }, ${t(offset)});\n` +
    `tl.set('#${p}-vwrap', { display:'none' }, ${t(offset + duration)});\n` +
    `tl.fromTo('#${p}-eye', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.3, ease:'power2.out' }, ${t(offset + 0.3)});\n` +
    `tl.fromTo('#${p}-hed', { opacity:0, y:50 }, { opacity:1, y:0, duration:0.65, ease:'power3.out' }, ${t(offset + 0.55)});\n` +
    `tl.fromTo('#${p}-sub', { opacity:0, y:30 }, { opacity:1, y:0, duration:0.4, ease:'power2.out' }, ${t(offset + 1.0)});\n`;

  return { html, gsap, outerHtml };
};
