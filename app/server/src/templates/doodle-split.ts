// Scene type 9b: doodle-split — text on the left, a hand-drawn doodle
// illustration on the right.
// SKILL.md appendix §9b (second one).
//
// The source references a local doodle asset library (E:\Doodle_Library)
// that does not exist in this repo. The doodle pane below substitutes a
// large themed glyph in its place — see the "doodle library hook" comment.

import { shell } from "./atoms.js";
import { escapeHtml, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const doodleSplit: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const headline = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 5).join(" "),
  );
  const sub = escapeHtml(scene.sentence);
  const glyph = escapeHtml(payload.glyph ?? pickGlyph(scene.sentence, index));

  // doodle library hook: once a doodle asset library exists, swap this glyph
  // pane for `<img src="assets/doodle-${p}.png" style="width:480px;height:480px;
  // object-fit:contain;filter:invert(1)">` (filter:invert(1) on dark themes
  // only — omit on light themes where black ink shows naturally).
  const doodlePane =
    `<div id="${p}-dimg" style="flex-shrink:0;width:480px;height:480px;display:flex;align-items:center;justify-content:center;opacity:0;">` +
    `<div style="font-size:280px;line-height:1;color:${theme.colors.accent};">${glyph}</div>` +
    `</div>`;

  const inner =
    `<div id="${p}-dtxt" style="flex:1;display:flex;flex-direction:column;gap:24px;">` +
    `<div id="${p}-deye" style="font-size:22px;font-weight:700;letter-spacing:6px;color:${theme.colors.accent};text-transform:uppercase;opacity:0;">CONCEPT</div>` +
    `<div id="${p}-dhed" style="${theme.css.hed}font-size:96px;line-height:1.05;opacity:0;">${headline}</div>` +
    `<div id="${p}-dsub" style="${theme.css.sub}font-size:44px;line-height:1.4;opacity:0;">${sub}</div>` +
    `</div>` +
    `<div id="${p}-ddiv" style="width:3px;height:0px;background:${theme.colors.accent};border-radius:2px;flex-shrink:0;align-self:center;"></div>` +
    doodlePane;

  const gsap =
    `tl.fromTo('#${p}-deye', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.3, ease:'power2.out' }, ${t(offset + 0.15)});\n` +
    `tl.fromTo('#${p}-dhed', { opacity:0, x:-50 }, { opacity:1, x:0, duration:0.6, ease:'expo.out' }, ${t(offset + 0.3)});\n` +
    `tl.fromTo('#${p}-dsub', { opacity:0, x:-40 }, { opacity:1, x:0, duration:0.5, ease:'power2.out' }, ${t(offset + 0.65)});\n` +
    `tl.fromTo('#${p}-ddiv', { height:'0px' }, { height:'320px', duration:0.5, ease:'power2.inOut' }, ${t(offset + 0.5)});\n` +
    `tl.fromTo('#${p}-dimg', { opacity:0, scale:0.75, x:40 }, { opacity:1, scale:1, x:0, duration:0.65, ease:'back.out(1.8)' }, ${t(offset + 0.6)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "flex-direction:row;align-items:center;gap:80px;padding:80px 120px;" }),
    gsap,
  };
};
