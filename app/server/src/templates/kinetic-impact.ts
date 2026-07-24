// Scene type 2b: kinetic-impact — three-tier text punch: muted setup line →
// large white emphasis word → XL accent slam word.
// SKILL.md appendix §2b.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

/** Heuristic 3-way split of the sentence into setup/mid/slam tiers, used only
 *  when payload.emphasis is absent: last third → slam, prior third → mid,
 *  remainder → setup. */
function splitEmphasis(sentence: string): { setup: string; mid: string; slam: string } {
  const cleaned = sentence.replace(/[.!?]+$/, "");
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return { setup: "", mid: "", slam: words.join(" ") || cleaned };
  }
  const third = Math.max(1, Math.floor(words.length / 3));
  const setup = words.slice(0, words.length - 2 * third).join(" ");
  const mid = words.slice(words.length - 2 * third, words.length - third).join(" ");
  const slam = words.slice(words.length - third).join(" ");
  return { setup, mid, slam };
}

export const kineticImpact: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const fallback = splitEmphasis(scene.sentence);
  const setupText = escapeHtml(payload.emphasis?.setup ?? fallback.setup);
  const midText = escapeHtml((payload.emphasis?.mid ?? fallback.mid).toUpperCase());
  const slamSource = payload.emphasis?.slam ?? (fallback.slam ? `${fallback.slam}.` : "");
  const slamText = escapeHtml(slamSource.toUpperCase());

  const inner =
    `<div id="${p}-ki1" style="${theme.css.sub}font-size:40px;letter-spacing:0.02em;">${setupText}</div>` +
    `<div id="${p}-ki2" style="${theme.css.hed}font-size:120px;line-height:0.95;letter-spacing:-2px;">${midText}</div>` +
    `<div id="${p}-ki3" style="${theme.css.hed}font-size:180px;color:${theme.colors.accent};line-height:0.9;letter-spacing:-4px;">${slamText}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  const gsap =
    `tl.fromTo('#${p}-ki1', { y:40, opacity:0 }, { y:0, opacity:1, duration:0.5, ease:'power2.out' }, ${t(offset + 0.15)});\n` +
    `tl.fromTo('#${p}-ki2', { y:80, opacity:0 }, { y:0, opacity:1, duration:0.6, ease:'back.out(2)' }, ${t(offset + 0.85)});\n` +
    `tl.fromTo('#${p}-ki3', { y:100, opacity:0, scale:0.85 }, { y:0, opacity:1, scale:1, duration:0.55, ease:'back.out(2.5)' }, ${t(offset + 1.55)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:flex-start;justify-content:center;gap:24px;" }),
    gsap,
  };
};
