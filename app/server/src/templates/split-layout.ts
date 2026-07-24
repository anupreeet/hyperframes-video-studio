// Scene type 9: split-layout — left column text, right column a supporting
// visual (icon/glyph).
// SKILL.md appendix §9.
//
// No ghost-text watermark here: the right pane's large glyph already fills
// the decorative-element role from SKILL.md 4e, and a second faint glyph
// behind it risks reading as a duplicate/rendering glitch.

import { shell } from "./atoms.js";
import { escapeHtml, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const splitLayout: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const headline = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 4).join(" "),
  );
  const sub = escapeHtml(scene.sentence);
  const glyph = escapeHtml(payload.glyph ?? pickGlyph(scene.sentence, index));

  const inner =
    `<div id="${p}-left" style="flex:1;display:flex;flex-direction:column;gap:20px;">` +
    `<div style="${theme.css.hed}font-size:80px;">${headline}</div>` +
    `<div style="${theme.css.sub}">${sub}</div>` +
    `</div>` +
    `<div id="${p}-div" style="width:4px;height:400px;background:${theme.colors.accent};border-radius:2px;flex-shrink:0;opacity:0;"></div>` +
    `<div id="${p}-right" style="flex:1;display:flex;align-items:center;justify-content:center;">` +
    `<div style="font-size:200px;line-height:1;color:${theme.colors.accent};">${glyph}</div>` +
    `</div>`;

  const gsap =
    `tl.fromTo('#${p}-left', { x:-60, opacity:0 }, { x:0, opacity:1, duration:0.65, ease:'expo.out' }, ${t(offset + 0.2)});\n` +
    `tl.fromTo('#${p}-div', { scaleY:0, opacity:0 }, { scaleY:1, opacity:1, duration:0.5, ease:'power2.out', transformOrigin:'top' }, ${t(offset + 0.5)});\n` +
    `tl.fromTo('#${p}-right', { x:60, opacity:0 }, { x:0, opacity:1, duration:0.65, ease:'expo.out' }, ${t(offset + 0.6)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "flex-direction:row;align-items:center;gap:80px;" }),
    gsap,
  };
};
