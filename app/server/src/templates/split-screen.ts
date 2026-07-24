// Scene type 9b: split-screen — full-bleed 50/50 vertical split, each half
// filling its side of the canvas with text centered vertically. A large "→"
// floats at the seam. No borders or card boxes — clean negative space
// carries the weight (this is deliberately NOT split-layout, which is text +
// visual inside a horizontal content row).
// SKILL.md appendix §9b (first one).

import { shell } from "./atoms.js";
import { escapeHtml, fallbackItems, payloadOf, sid, t, type SceneTemplate } from "./util.js";

/** Two paired concepts derived from the sentence when no payload.compare is
 *  given: prefer a natural clause split, else bisect by word count. */
function splitPair(sentence: string): [string, string] {
  const items = fallbackItems(sentence, 2);
  if (items.length >= 2) return [items[0], items[1]];
  const words = sentence.replace(/[.!?]$/, "").split(/\s+/).filter(Boolean);
  const mid = Math.ceil(words.length / 2) || 1;
  const left = words.slice(0, mid).join(" ") || sentence;
  const right = words.slice(mid).join(" ") || sentence;
  return [left, right];
}

export const splitScreen: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const [fbLeft, fbRight] = splitPair(scene.sentence);
  const leftText = escapeHtml(payload.compare?.left ?? fbLeft);
  const rightText = escapeHtml(payload.compare?.right ?? fbRight);
  const leftLabel = escapeHtml((payload.compare?.leftLabel ?? "THE NEED").toUpperCase());
  const rightLabel = escapeHtml((payload.compare?.rightLabel ?? "THE ANSWER").toUpperCase());

  // .clip is position:absolute;inset:0 and .scene-content is already
  // position:relative + 100%x100% (base CSS), so this inset:0 wrapper fills
  // the full frame exactly like the source's clip-level sibling placement.
  const inner =
    `<div style="position:absolute;inset:0;display:flex;flex-direction:row;align-items:stretch;">` +
    `<div id="${p}-sl" style="width:50%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${theme.colors.surface};border-right:2px solid ${theme.colors.surface};opacity:0;">` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:26px;font-weight:700;letter-spacing:5px;color:${theme.colors.muted};text-transform:uppercase;margin-bottom:16px;">${leftLabel}</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:64px;font-weight:900;color:${theme.colors.text};text-align:center;line-height:1.2;">${leftText}</div>` +
    `</div>` +
    `<div id="${p}-sr" style="width:50%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${theme.colors.bg};opacity:0;">` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:26px;font-weight:700;letter-spacing:5px;color:${theme.colors.accent};text-transform:uppercase;margin-bottom:16px;">${rightLabel}</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:64px;font-weight:900;color:${theme.colors.text};text-align:center;line-height:1.2;">${rightText}</div>` +
    `</div>` +
    `</div>` +
    `<div id="${p}-sarr" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:${theme.typography.fontFamily};font-size:120px;color:${theme.colors.accent};line-height:1;opacity:0;">→</div>`;

  const gsap =
    `tl.fromTo('#${p}-sl', { opacity:0, x:-40 }, { opacity:1, x:0, duration:0.3, ease:'power2.out' }, ${t(offset + 0.07)});\n` +
    `tl.fromTo('#${p}-sarr', { opacity:0, scale:0 }, { opacity:1, scale:1, duration:0.2 }, ${t(offset + 0.5)});\n` +
    `tl.fromTo('#${p}-sr', { opacity:0, x:40 }, { opacity:1, x:0, duration:0.3, ease:'power2.out' }, ${t(offset + 0.67)});\n`;

  return { html: shell(theme, inner), gsap };
};
