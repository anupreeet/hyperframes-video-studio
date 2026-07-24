// Scene type 4: counter-up — number counts up from 0 (or a given start) to a
// target value. Good for counts, years, totals.
// SKILL.md appendix §4.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, findNumber, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const counterUp: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset, duration } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const found = findNumber(scene.sentence);
  const from = payload.counter?.from ?? 0;
  const to = payload.counter?.to ?? found?.value ?? 100;
  const suffix = payload.counter?.suffix ?? (found ? found.raw.replace(/^-?[\d.,]+/, "") : "");
  const label = escapeHtml(
    (payload.counter?.label ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 5).join(" ")).toUpperCase(),
  );
  const isInt = Number.isInteger(from) && Number.isInteger(to);
  const startDisplay = isInt ? from.toLocaleString() : from.toFixed(1);
  const suffixLiteral = suffix.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const countDuration = Math.max(0.4, duration * 0.75);
  // Scoped per-scene (sNCounter, not a shared global) so multiple counter-up
  // scenes in the same composition don't clobber each other's tween object.
  const counterVar = `${p}Counter`;

  const inner =
    `<div id="${p}-counter" style="${theme.css.hed}font-size:180px;font-variant-numeric:tabular-nums;">${startDisplay}${escapeHtml(suffix)}</div>` +
    `<div id="${p}-clabel" style="${theme.css.sub}">${label}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  const gsap =
    `var ${counterVar} = { val: ${from} };\n` +
    `tl.fromTo(${counterVar}, { val: ${from} }, {\n` +
    `  val: ${to}, duration: ${countDuration.toFixed(2)}, ease: 'power1.inOut',\n` +
    `  onUpdate: function() {\n` +
    `    var el = document.getElementById('${p}-counter');\n` +
    `    if (el) el.textContent = (${isInt} ? Math.round(${counterVar}.val).toLocaleString() : ${counterVar}.val.toFixed(1)) + '${suffixLiteral}';\n` +
    `  }\n` +
    `}, ${t(offset + 0.2)});\n` +
    `tl.fromTo('#${p}-clabel', { y:30, opacity:0 }, { y:0, opacity:1, duration:0.4, ease:'power2.out' }, ${t(offset + 0.3)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;text-align:center;" }),
    gsap,
  };
};
