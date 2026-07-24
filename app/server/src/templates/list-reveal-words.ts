// Scene type 6b: list-reveal-words — compact word-stack variant: 2-4 giant
// stacked words, individually timed (not staggered) so they can sync to
// audio word timestamps.
// SKILL.md appendix §6b.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, fallbackItems, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

/** Normalize to 2-4 short phrases; splits a single fallback item in half if
 *  the sentence didn't produce enough clauses on its own. */
function normalizeWords(items: string[] | undefined, sentence: string): string[] {
  let words = items && items.length ? items.slice(0, 4) : fallbackItems(sentence, 4);
  if (words.length < 2) {
    const parts = (words[0] ?? sentence).split(/\s+/).filter(Boolean);
    const mid = Math.ceil(parts.length / 2) || 1;
    words = [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")].filter(Boolean);
  }
  return words.slice(0, 4);
}

export const listRevealWords: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const words = normalizeWords(payload.items, scene.sentence);
  const label = escapeHtml((payload.headline ?? "IN SHORT").toUpperCase());

  const wordsHtml = words
    .map(
      (w, i) =>
        `<div id="${p}-w${i + 1}" style="${theme.css.hed}font-size:100px;opacity:0;">${escapeHtml(w.toUpperCase())}</div>`,
    )
    .join("");

  const inner =
    `<div id="${p}-wlbl" style="font-size:22px;font-weight:700;letter-spacing:6px;color:${theme.colors.accent};text-transform:uppercase;margin-bottom:24px;opacity:0;">${label}</div>` +
    `<div style="display:flex;flex-direction:column;gap:8px;">${wordsHtml}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  // Each word individually timed — NOT stagger — so they can sync to audio.
  let gsap = `tl.fromTo('#${p}-wlbl', { opacity:0 }, { opacity:1, duration:0.2 }, ${t(offset + 0.06)});\n`;
  let cursor = 0.26;
  words.forEach((_, i) => {
    gsap += `tl.fromTo('#${p}-w${i + 1}', { opacity:0, x:-50 }, { opacity:1, x:0, duration:0.25, ease:'power2.out' }, ${t(offset + cursor)});\n`;
    cursor += 0.42;
  });

  return {
    html: shell(theme, inner, { contentStyle: "align-items:flex-start;justify-content:center;" }),
    gsap,
  };
};
