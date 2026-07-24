// Scene type 7b: flow-steps-text — text-arrow variant of flow-steps using
// plain "→" characters instead of SVG (no arrowhead-visibility bug
// possible). Use for card-based steps on a flat background.
// SKILL.md appendix §7b.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, fallbackItems, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const flowStepsText: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const steps = (payload.steps && payload.steps.length ? payload.steps : fallbackItems(scene.sentence, 3)).slice(0, 4);
  const eyebrowLabel = escapeHtml((payload.headline ?? "THE PROCESS").toUpperCase());
  const tagline = escapeHtml(scene.sentence);

  const stepsHtml = steps
    .map((step, i) => {
      const n = i + 1;
      const card =
        `<div id="${p}-fs${n}" style="background:${theme.colors.surface};padding:48px 52px;flex:1;text-align:center;opacity:0;">` +
        `<div style="font-size:52px;font-weight:900;color:${theme.colors.accent};margin-bottom:12px;">${n}</div>` +
        `<div style="font-size:34px;font-weight:700;color:${theme.colors.text};line-height:1.3;">${escapeHtml(step)}</div>` +
        `</div>`;
      if (n === steps.length) return card;
      const arrow = `<div id="${p}-fa${n}" style="font-size:60px;color:${theme.colors.muted};padding:0 16px;opacity:0;">→</div>`;
      return card + arrow;
    })
    .join("");

  const inner =
    `<div id="${p}-fttl" style="font-size:24px;font-weight:700;letter-spacing:6px;color:${theme.colors.accent};text-transform:uppercase;margin-bottom:56px;opacity:0;">${eyebrowLabel}</div>` +
    `<div style="display:flex;align-items:center;justify-content:center;width:100%;">${stepsHtml}</div>` +
    `<div id="${p}-fsub" style="font-size:28px;font-weight:400;color:${theme.colors.muted};margin-top:36px;opacity:0;">${tagline}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  // Steps/arrows individually timed (source cadence: step1 @0.56, arrow1
  // @+0.55, step2 @+1.05, repeating) rather than auto-staggered, so a fixed
  // reading rhythm is preserved regardless of step count.
  let gsap = `tl.fromTo('#${p}-fttl', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.4 }, ${t(offset + 0.1)});\n`;
  let stepDelay = 0.56;
  steps.forEach((_, i) => {
    const n = i + 1;
    gsap += `tl.fromTo('#${p}-fs${n}', { opacity:0, y:30 }, { opacity:1, y:0, duration:0.4, ease:'power2.out' }, ${t(offset + stepDelay)});\n`;
    if (n < steps.length) {
      const arrowDelay = stepDelay + 0.55;
      gsap += `tl.fromTo('#${p}-fa${n}', { opacity:0, x:-20 }, { opacity:1, x:0, duration:0.2 }, ${t(offset + arrowDelay)});\n`;
      stepDelay = arrowDelay + 1.05;
    }
  });
  gsap += `tl.fromTo('#${p}-fsub', { opacity:0 }, { opacity:1, duration:0.4 }, ${t(offset + stepDelay + 0.8)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;flex-direction:column;" }),
    gsap,
  };
};
