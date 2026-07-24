// Scene type 7: flow-steps — numbered steps connected by an animated SVG
// arrow. Ideal for process sentences.
// SKILL.md appendix §7.
//
// CRITICAL: each arrow <svg> starts with inline opacity:0 — the arrowhead
// <polygon> is otherwise visible immediately, before its reveal. tl.set()
// flips it to opacity:1 at the right moment, then the line draws in.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, fallbackItems, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const flowSteps: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const steps = (payload.steps && payload.steps.length ? payload.steps : fallbackItems(scene.sentence, 4)).slice(0, 4);
  const header = escapeHtml(payload.headline ?? "How it works");

  const stepsHtml = steps
    .map((step, i) => {
      const n = i + 1;
      const circle =
        `<div id="${p}-st${n}" style="flex:1;text-align:center;">` +
        `<div style="width:100px;height:100px;border-radius:50%;border:4px solid ${theme.colors.accent};display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-family:${theme.typography.fontFamily};font-weight:900;font-size:52px;color:${theme.colors.accent};">${n}</div>` +
        `<div style="font-family:${theme.typography.fontFamily};font-weight:700;font-size:44px;color:${theme.colors.text};">${escapeHtml(step)}</div>` +
        `</div>`;
      if (n === steps.length) return circle;
      const arrow =
        `<svg id="${p}-arr${n}" width="120" height="40" viewBox="0 0 120 40" style="flex-shrink:0;opacity:0;">` +
        `<line x1="0" y1="20" x2="100" y2="20" stroke="${theme.colors.accent}" stroke-width="3" stroke-dasharray="100" stroke-dashoffset="100"/>` +
        `<polygon points="100,10 120,20 100,30" fill="${theme.colors.accent}"/>` +
        `</svg>`;
      return circle + arrow;
    })
    .join("");

  const inner =
    `<div id="${p}-fhead" style="${theme.css.sub}margin-bottom:48px;">${header}</div>` +
    `<div style="display:flex;align-items:center;gap:0;width:100%;">${stepsHtml}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  let gsap = `tl.fromTo('#${p}-fhead', { y:-30, opacity:0 }, { y:0, opacity:1, duration:0.5, ease:'power2.out' }, ${t(offset + 0.1)});\n`;
  let cursor = 0.3;
  steps.forEach((_, i) => {
    const n = i + 1;
    gsap += `tl.fromTo('#${p}-st${n}', { scale:0.7, opacity:0 }, { scale:1, opacity:1, duration:0.5, ease:'back.out(2)' }, ${t(offset + cursor)});\n`;
    if (n < steps.length) {
      const arrowAt = cursor + 0.35;
      gsap +=
        `tl.set('#${p}-arr${n}', { opacity:1 }, ${t(offset + arrowAt)});\n` +
        `tl.fromTo('#${p}-arr${n} line', { strokeDashoffset:100 }, { strokeDashoffset:0, duration:0.35, ease:'power2.out' }, ${t(offset + arrowAt)});\n`;
      cursor = arrowAt + 0.2;
    }
  });

  return { html: shell(theme, inner, { contentStyle: "align-items:center;" }), gsap };
};
