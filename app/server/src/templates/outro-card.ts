// Scene type 14: outro-card — closing scene. Three-beat structure: eyebrow →
// title + sub → rule bar → hold → fade out. SKILL.md appendix §14.
// No payload field maps to a closing label, so the eyebrow is always the
// fixed "THANKS FOR WATCHING" (per the fallback spec); the sentence itself
// becomes the farewell sub-line.

import { shell } from "./atoms.js";
import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";

export const outroCard: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset, duration } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  // Uppercase before escaping (not after) — escaping first would upcase HTML
  // entities too (e.g. "&amp;" → "&AMP;", which browsers don't decode).
  const title = escapeHtml(
    (payload.headline ?? scene.sentence.replace(/[.!?]+$/, "").split(/\s+/).slice(0, 5).join(" ")).toUpperCase(),
  );
  const sub = escapeHtml(scene.sentence);

  const inner =
    `<div id="${p}-olbl" style="font-size:22px;font-weight:700;letter-spacing:8px;` +
    `color:${theme.colors.accent};text-transform:uppercase;opacity:0;">THANKS FOR WATCHING</div>` +
    `<div id="${p}-otitle" style="${theme.css.hed}font-size:130px;opacity:0;">${title}</div>` +
    `<div id="${p}-osub" style="${theme.css.sub}font-size:38px;opacity:0;">${sub}</div>` +
    `<div id="${p}-orule" style="width:0px;height:3px;background:${theme.colors.accent};"></div>`;

  // Rule-bar entrance finishes at +2.0; never let the exit fire before that,
  // even for very short outro scenes.
  const exitTime = Math.max(offset + 2.1, offset + duration - 1.4);

  const gsap =
    `tl.fromTo('#${p}-olbl', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.4, ease:'power2.out' }, ${t(offset + 0.25)});\n` +
    `tl.fromTo('#${p}-otitle', { opacity:0, y:60 }, { opacity:1, y:0, duration:0.7, ease:'power3.out' }, ${t(offset + 0.55)});\n` +
    `tl.fromTo('#${p}-osub', { opacity:0, y:30 }, { opacity:1, y:0, duration:0.5, ease:'power2.out' }, ${t(offset + 0.9)});\n` +
    `tl.fromTo('#${p}-orule', { width:'0px' }, { width:'280px', duration:0.8, ease:'power2.inOut' }, ${t(offset + 1.2)});\n` +
    `tl.fromTo('#${p}-otitle, #${p}-olbl, #${p}-osub, #${p}-orule', { opacity:1, y:0 }, { opacity:0, y:-30, duration:0.6, ease:'power2.in', stagger:0.08 }, ${t(exitTime)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;text-align:center;gap:28px;" }),
    gsap,
  };
};
