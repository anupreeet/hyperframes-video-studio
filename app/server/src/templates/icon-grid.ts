// Scene type 13: icon-grid — 3-6 glyph+label cells, staggered reveal.
// SKILL.md appendix §13. For multi-concept sentences ("Fix, write, ship — all
// in one place"). Cells share a class scoped under the grid's id so GSAP's
// own stagger drives entrance regardless of item count (generalizes past
// source's fixed 3-id example).

import { shell } from "./atoms.js";
import { escapeHtml, fallbackItems, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const iconGrid: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const items = (payload.items && payload.items.length > 0 ? payload.items : fallbackItems(scene.sentence, 6)).slice(
    0,
    6,
  );
  const headline = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]+$/, "").split(/\s+/).slice(0, 5).join(" "),
  );

  const cells = items
    .map((item, i) => {
      const glyph = pickGlyph(item, index + i);
      return (
        `<div class="ig-cell" style="display:flex;flex-direction:column;align-items:center;gap:16px;` +
        `background:${theme.colors.surface};border-radius:16px;padding:40px 24px;opacity:0;">` +
        `<div style="font-size:80px;line-height:1;color:${theme.colors.accent};">${glyph}</div>` +
        `<div style="font-family:${theme.typography.fontFamily};font-weight:700;font-size:40px;color:${theme.colors.text};text-align:center;">${escapeHtml(item)}</div>` +
        `</div>`
      );
    })
    .join("");

  const inner =
    `<div id="${p}-ighead" style="${theme.css.hed}font-size:80px;margin-bottom:48px;opacity:0;">${headline}</div>` +
    `<div id="${p}-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:40px;">${cells}</div>`;

  const gsap =
    `tl.fromTo('#${p}-ighead', { y:-40, opacity:0 }, { y:0, opacity:1, duration:0.55, ease:'power3.out' }, ${t(offset + 0.1)});\n` +
    `tl.fromTo('#${p}-grid .ig-cell', { y:60, opacity:0, scale:0.9 }, { y:0, opacity:1, scale:1, duration:0.5, ease:'back.out(1.8)', stagger:{ each:0.15, from:'start' } }, ${t(offset + 0.4)});\n`;

  return {
    html: shell(theme, inner, {}),
    gsap,
  };
};
