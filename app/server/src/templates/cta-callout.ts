// Scene type 12b: cta-callout — pre-text + main sentence + a framed CTA box
// with a bouncing directional arrow. SKILL.md appendix §12b. For "click the
// link" / action-driving sentences, typically the last scene of a video.
// The box/arrow beats and the bounce repeat count are derived from
// ctx.duration rather than the source's hardcoded 3.18s/repeat:5 — the
// source note itself says "repeat must be finite — calculate from remaining
// scene time," which this makes literal so the scene never overruns short
// durations.

import { shell } from "./atoms.js";
import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";

export const ctaCallout: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset, duration } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  // payload.headline, when present, becomes the short CTA hook line; otherwise
  // fall back to a generic universal pre-text (no payload field maps to this
  // role specifically, so it can't be derived from data).
  const preText = escapeHtml((payload.headline ?? "BEFORE YOU GO").toUpperCase());
  const mainText = escapeHtml(scene.sentence);

  const boxTime = Math.min(3.18, Math.max(1.3, duration * 0.5));
  const arrowStart = boxTime + 0.5;
  const cycleLen = 0.7; // 0.35s up + 0.35s back (yoyo)
  const available = Math.max(0, duration - arrowStart - 0.3);
  const repeatCount = Math.max(1, Math.floor(available / cycleLen));

  const inner =
    `<div id="${p}-ctapre" style="font-family:${theme.typography.fontFamily};font-size:28px;font-weight:700;` +
    `letter-spacing:4px;color:${theme.colors.muted};text-transform:uppercase;margin-bottom:16px;opacity:0;">${preText}</div>` +
    `<div id="${p}-ctamain" style="${theme.css.hed}font-size:68px;max-width:1300px;line-height:1.2;opacity:0;">${mainText}</div>` +
    `<div id="${p}-ctabox" style="display:inline-flex;align-items:center;gap:24px;margin-top:40px;` +
    `border:3px solid ${theme.colors.accent};padding:20px 48px;opacity:0;">` +
    `<span id="${p}-ctaarr" style="font-size:60px;color:${theme.colors.accent};display:inline-block;">↓</span>` +
    `<div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:900;font-size:42px;color:${theme.colors.text};letter-spacing:3px;">CLICK THE LINK</div>` +
    `<div style="font-size:22px;color:${theme.colors.muted};">lower left</div>` +
    `</div>` +
    `</div>`;

  const gsap =
    `tl.fromTo('#${p}-ctapre', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.4 }, ${t(offset + 0.23)});\n` +
    `tl.fromTo('#${p}-ctamain', { opacity:0, y:30 }, { opacity:1, y:0, duration:0.5, ease:'power2.out' }, ${t(offset + 0.68)});\n` +
    `tl.fromTo('#${p}-ctabox', { opacity:0, scale:0.85 }, { opacity:1, scale:1, duration:0.4, ease:'back.out(1.5)' }, ${t(offset + boxTime)});\n` +
    `tl.fromTo('#${p}-ctaarr', { y:0 }, { y:12, duration:0.35, ease:'sine.inOut', yoyo:true, repeat:${repeatCount} }, ${t(offset + arrowStart)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;text-align:center;" }),
    gsap,
  };
};
