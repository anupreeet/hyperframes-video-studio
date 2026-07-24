// Scene type 8: quote-card — pull quote with a bold left border, 180px
// accent quote mark, and an inline word highlight.
// SKILL.md appendix §8.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";
import type { Theme } from "../types.js";

/** Wraps the longest word (by alnum length) in an accent <em>, mirroring the
 *  source's manually-curated highlight when no payload text is given. */
function highlightLongestWord(sentence: string, theme: Theme): string {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (!words.length) return escapeHtml(sentence);
  const bare = (w: string) => w.replace(/[.,!?;:]/g, "");
  let idx = 0;
  words.forEach((w, i) => {
    if (bare(w).length > bare(words[idx]).length) idx = i;
  });
  return words
    .map((w, i) =>
      i === idx
        ? `<em style="color:${theme.colors.accent};font-style:normal;font-weight:700;">${escapeHtml(w)}</em>`
        : escapeHtml(w),
    )
    .join(" ");
}

export const quoteCard: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const introText = escapeHtml(payload.headline ?? "Worth remembering:");
  const quoteSource = payload.quote?.text ?? scene.sentence;
  const quoteHtml = highlightLongestWord(quoteSource, theme);
  const attribution = payload.quote?.attribution ? escapeHtml(payload.quote.attribution) : null;

  const inner =
    `<div style="width:1400px;">` +
    `<div id="${p}-intro" style="font-family:${theme.typography.fontFamily};font-size:26px;font-weight:500;color:${theme.colors.muted};letter-spacing:3px;text-transform:uppercase;margin-bottom:28px;opacity:0;">${introText}</div>` +
    `<div id="${p}-card" style="background:${theme.colors.surface};padding:60px 80px;border-left:8px solid ${theme.colors.accent};position:relative;opacity:0;">` +
    `<div id="${p}-mark" style="position:absolute;top:-30px;left:56px;font-family:${theme.typography.fontFamily};font-size:180px;color:${theme.colors.accent};line-height:1;opacity:0;">"</div>` +
    `<blockquote id="${p}-qt" style="font-family:${theme.typography.fontFamily};font-weight:400;font-size:50px;color:${theme.colors.text};line-height:1.5;padding-top:36px;margin:0;opacity:0;">${quoteHtml}</blockquote>` +
    (attribution
      ? `<div id="${p}-attr" style="font-family:${theme.typography.fontFamily};font-size:24px;font-weight:500;color:${theme.colors.muted};margin-top:20px;letter-spacing:2px;opacity:0;">— ${attribution}</div>`
      : "") +
    `</div>` +
    `</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  let gsap =
    `tl.fromTo('#${p}-intro', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.4 }, ${t(offset + 0.12)});\n` +
    `tl.fromTo('#${p}-card', { opacity:0, y:30 }, { opacity:1, y:0, duration:0.5, ease:'power2.out' }, ${t(offset + 0.5)});\n` +
    `tl.fromTo('#${p}-mark', { opacity:0, scale:2 }, { opacity:1, scale:1, duration:0.35 }, ${t(offset + 0.5)});\n` +
    `tl.fromTo('#${p}-qt', { opacity:0 }, { opacity:1, duration:0.5 }, ${t(offset + 1.3)});\n`;
  if (attribution) {
    gsap += `tl.fromTo('#${p}-attr', { opacity:0 }, { opacity:1, duration:0.3 }, ${t(offset + 3.5)});\n`;
  }

  return {
    html: shell(theme, inner, { contentStyle: "align-items:flex-start;justify-content:center;" }),
    gsap,
  };
};
