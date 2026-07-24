// Scene type 6: list-reveal — 3-5 items stagger in one by one. Use for
// capability/feature lists.
// SKILL.md appendix §6.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, fallbackItems, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const listReveal: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const items = (payload.items && payload.items.length ? payload.items : fallbackItems(scene.sentence, 5)).slice(0, 5);
  const headline = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 5).join(" "),
  );

  const liHtml = items
    .map(
      (item) =>
        `<li class="li-item" style="font-family:${theme.typography.fontFamily};font-weight:500;font-size:56px;color:${theme.colors.text};display:flex;align-items:center;gap:24px;">` +
        `<span style="width:12px;height:12px;border-radius:50%;background:${theme.colors.accent};flex-shrink:0;"></span>${escapeHtml(item)}</li>`,
    )
    .join("");

  const inner =
    `<div id="${p}-lhead" style="${theme.css.hed}font-size:80px;">${headline}</div>` +
    `<ul id="${p}-list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:20px;">${liHtml}</ul>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  const gsap =
    `tl.fromTo('#${p}-lhead', { x:-50, opacity:0 }, { x:0, opacity:1, duration:0.6, ease:'expo.out' }, ${t(offset + 0.1)});\n` +
    `tl.fromTo('#${p}-list .li-item', { x:-60, opacity:0 }, { x:0, opacity:1, duration:0.45, ease:'power2.out', stagger:{ each:0.18, from:'start' } }, ${t(offset + 0.4)});\n`;

  return { html: shell(theme, inner), gsap };
};
