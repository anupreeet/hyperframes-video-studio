// Scene type 12: callout — full-frame dark background + single bold punchline.
// SKILL.md appendix §12. Maximum impact, no decorative bg — typography carries
// the weight (explicitly no radial glow / ghost text per source).
// Short punchlines (≤3 words, e.g. "WRONG." "BACKWARDS.") get the kinetic
// rotationZ "slam" entrance instead of the standard scale/opacity pop — the
// two variants documented in SKILL.md share the same single text element,
// they only swap the tween (per source note: "Same HTML as above, just
// change the GSAP entrance").

import { shell } from "./atoms.js";
import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";

export const callout: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const text = escapeHtml(payload.headline ?? scene.sentence);
  const isSlam = text.split(/\s+/).filter(Boolean).length <= 3;

  const inner = `<div id="${p}-ctext" style="${theme.css.hed}font-size:110px;max-width:1400px;line-height:1.1;opacity:0;">${text}</div>`;

  const gsap = isSlam
    ? `tl.fromTo('#${p}-ctext', { scale:1.3, opacity:0, rotationZ:-2 }, { scale:1, opacity:1, rotationZ:0, duration:0.5, ease:'power3.out' }, ${t(offset + 0.1)});\n`
    : `tl.fromTo('#${p}-ctext', { scale:0.85, opacity:0 }, { scale:1, opacity:1, duration:0.65, ease:'back.out(1.5)' }, ${t(offset + 0.1)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;text-align:center;" }),
    gsap,
  };
};
