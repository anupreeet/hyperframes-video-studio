// Scene type 2c: kinetic-slam — single massive word punching in as a
// one-word beat between heavier scenes. Ultra-short duration.
// SKILL.md appendix §2c.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

/** Last 1-2 words of the sentence, used only when no payload text is given. */
function deriveSlamWord(sentence: string): string {
  const cleaned = sentence.replace(/[.!?]+$/, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length) return "STOP.";
  const tail = words.length >= 2 ? words.slice(-2) : words;
  return `${tail.join(" ")}.`;
}

export const kineticSlam: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const word = escapeHtml(
    (payload.emphasis?.slam ?? payload.headline ?? deriveSlamWord(scene.sentence)).toUpperCase(),
  );

  const inner =
    `<div id="${p}-slam" style="${theme.css.hed}font-size:240px;letter-spacing:-6px;text-align:center;opacity:0;">${word}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  const gsap = `tl.fromTo('#${p}-slam', { opacity:0, scale:0.7 }, { opacity:1, scale:1, duration:0.2, ease:'back.out(3)' }, ${t(offset + 0.02)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;justify-content:center;" }),
    gsap,
  };
};
