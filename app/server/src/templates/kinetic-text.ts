// Scene type 2: kinetic-text — definition/explanation, each word flies in sequentially.
// SKILL.md appendix §2. Fallback type for unmatched sentences.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

export const kineticText: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const words = scene.sentence.split(/\s+/).filter(Boolean);

  // Accent the most meaningful-looking word (longest, excluding the first).
  const accentIdx = words.reduce(
    (best, w, i) => (i > 0 && w.length > words[best].length ? i : best),
    0,
  );

  const spans = words
    .map((w, i) => {
      const color = i === accentIdx ? `color:${theme.colors.accent};` : "";
      return `<span class="kw" style="display:inline-block;${color}">${escapeHtml(w)}</span>`;
    })
    .join(" ");

  const inner =
    `<div id="${p}-kinetic" style="${theme.css.hed}font-size:96px;line-height:1.1;max-width:1500px;">${spans}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  const gsap = `tl.fromTo('#${p}-kinetic .kw', { y:80, opacity:0 }, { y:0, opacity:1, duration:0.45, ease:'power3.out', stagger:{ each:0.07, from:'start' } }, ${t(offset + 0.15)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:flex-start;" }),
    gsap,
  };
};

// Re-exported for template modules that want the same word-splitting behaviour.
export function wordSpans(
  sentence: string,
  className: string,
  accentColor: string | null,
  accentEvery = 0,
): string {
  return sentence
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const accent =
        accentColor && accentEvery > 0 && i % accentEvery === accentEvery - 1
          ? `color:${accentColor};`
          : "";
      return `<span class="${className}" style="display:inline-block;${accent}">${escapeHtml(w)}</span>`;
    })
    .join(" ");
}
