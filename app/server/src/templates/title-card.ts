// Scene type 1: title-card — large centered title + subtitle (opening / major transitions).
// SKILL.md appendix §1. Clean pure-dark background, no radial glow (4e rule).

import { shell } from "./atoms.js";
import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";

export const titleCard: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const headline = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 5).join(" "),
  ).toUpperCase();
  const sub = escapeHtml(scene.sentence);

  let inner =
    `<h1 id="${p}-title" style="${theme.css.hed}font-size:130px;">${headline}</h1>` +
    `<p id="${p}-sub" style="${theme.css.sub}">${sub}</p>`;

  // Blueprint theme signature: dashed spec-box + // ANNOTATION label is REQUIRED
  // on title cards (theme table, SKILL.md 4b).
  if (theme.id === "blueprint") {
    inner =
      `<div id="${p}-anno" style="font-family:${theme.typography.fontFamily};font-size:24px;letter-spacing:4px;color:${theme.colors.accent};opacity:0;">// TITLE</div>` +
      `<div style="border:2px dashed rgba(77,106,153,0.4);background:#0d1f3c;padding:60px 80px;">${inner}</div>`;
  }

  const gsap =
    `tl.fromTo('#${p}-title', { y:60, opacity:0 }, { y:0, opacity:1, duration:0.7, ease:'power3.out' }, ${t(offset + 0.2)});\n` +
    `tl.fromTo('#${p}-sub', { y:40, opacity:0 }, { y:0, opacity:1, duration:0.5, ease:'power2.out' }, ${t(offset + 0.5)});\n` +
    (theme.id === "blueprint"
      ? `tl.fromTo('#${p}-anno', { opacity:0 }, { opacity:1, duration:0.3 }, ${t(offset + 0.1)});\n`
      : "");

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;text-align:center;" }),
    gsap,
  };
};
