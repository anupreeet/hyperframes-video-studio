// Scene type 10: progress-ring — SVG circle that fills to a percentage. For
// proportions and completion metrics.
// SKILL.md appendix §10.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, findNumber, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

const CIRCUMFERENCE = 1005; // 2π×160, matches the r=160 track/fill circles below

export const progressRing: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const found = findNumber(scene.sentence);
  const rawPct = payload.percent ?? found?.value ?? 65;
  const targetPct = Math.max(0, Math.min(100, Math.round(rawPct)));
  const header = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 4).join(" "),
  );
  const sub = escapeHtml(scene.sentence);
  // Scoped per-scene (sNRing, not a shared global) so multiple progress-ring
  // scenes in the same composition don't clobber each other's tween object.
  const ringVar = `${p}Ring`;

  const inner =
    `<div id="${p}-prhead" style="${theme.css.sub}font-size:52px;margin-bottom:40px;">${header}</div>` +
    `<div style="position:relative;width:400px;height:400px;margin:0 auto;">` +
    `<svg width="400" height="400" style="position:absolute;top:0;left:0;" viewBox="0 0 400 400">` +
    `<circle cx="200" cy="200" r="160" fill="none" stroke="${theme.colors.surface}" stroke-width="20"/>` +
    `<circle id="${p}-ring" cx="200" cy="200" r="160" fill="none" stroke="${theme.colors.accent}" stroke-width="20" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${CIRCUMFERENCE}" stroke-linecap="round" transform="rotate(-90 200 200)"/>` +
    `</svg>` +
    `<div id="${p}-rpct" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:${theme.typography.fontFamily};font-weight:900;font-size:100px;color:${theme.colors.text};">0%</div>` +
    `</div>` +
    `<div id="${p}-rsub" style="${theme.css.sub}margin-top:32px;">${sub}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  const gsap =
    `var ${ringVar} = { pct: 0 };\n` +
    `tl.fromTo('#${p}-prhead', { y:-30, opacity:0 }, { y:0, opacity:1, duration:0.5, ease:'power2.out' }, ${t(offset + 0.15)});\n` +
    `tl.fromTo(${ringVar}, { pct: 0 }, {\n` +
    `  pct: ${targetPct}, duration: 1.0, ease: 'power2.inOut',\n` +
    `  onUpdate: function() {\n` +
    `    var el = document.getElementById('${p}-rpct');\n` +
    `    var ring = document.getElementById('${p}-ring');\n` +
    `    if (el) el.textContent = Math.round(${ringVar}.pct) + '%';\n` +
    `    if (ring) ring.setAttribute('stroke-dashoffset', String(${CIRCUMFERENCE} * (1 - ${ringVar}.pct / 100)));\n` +
    `  }\n` +
    `}, ${t(offset + 0.3)});\n` +
    `tl.fromTo('#${p}-rsub', { y:20, opacity:0 }, { y:0, opacity:1, duration:0.4, ease:'power1.out' }, ${t(offset + 0.5)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;text-align:center;" }),
    gsap,
  };
};
