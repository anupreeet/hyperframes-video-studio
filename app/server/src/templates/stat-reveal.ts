// Scene type 3: stat-reveal — big isolated number/stat with a label and fill
// bar beneath.
// SKILL.md appendix §3.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, findNumber, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const statReveal: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const found = findNumber(scene.sentence);
  const value = escapeHtml(payload.stat?.value ?? found?.raw ?? "—");
  const label = escapeHtml(
    (payload.stat?.label ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 4).join(" ")).toUpperCase(),
  );

  // sN-bar-bg / sN-bar are absolutely positioned within scene-content, which
  // is position:relative + 100%x100% per the base .scene-content CSS — this
  // anchors bottom:0/left:0 to the full clip area exactly as the source's
  // sibling-of-scene-content placement does.
  const inner =
    `<div id="${p}-bar-bg" style="position:absolute;bottom:0;left:0;width:100%;height:6px;background:${theme.colors.surface};"></div>` +
    `<div id="${p}-bar" style="position:absolute;bottom:0;left:0;width:0%;height:6px;background:${theme.colors.accent};transform-origin:left;"></div>` +
    `<div id="${p}-num" style="${theme.css.hed}font-size:200px;font-variant-numeric:tabular-nums;">${value}</div>` +
    `<div id="${p}-label" style="${theme.css.sub}font-size:56px;letter-spacing:0.08em;">${label}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  const gsap =
    `tl.fromTo('#${p}-num', { scale:0.6, opacity:0 }, { scale:1, opacity:1, duration:0.6, ease:'back.out(2)' }, ${t(offset + 0.15)});\n` +
    `tl.fromTo('#${p}-label', { y:30, opacity:0 }, { y:0, opacity:1, duration:0.4, ease:'power2.out' }, ${t(offset + 0.55)});\n` +
    `tl.fromTo('#${p}-bar', { width:'0%' }, { width:'100%', duration:0.8, ease:'power2.out' }, ${t(offset + 0.4)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;text-align:center;" }),
    gsap,
  };
};
