// Scene type 11: comparison — two columns side by side, contrast two things.
// SKILL.md appendix §11. Highlights the "winner" (right) column with the theme accent.

import { shell } from "./atoms.js";
import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";
import type { ScenePayload } from "../types.js";

/**
 * Split a sentence into a "before"/"after" pair when payload.compare is
 * missing: "X vs Y" / "X but Y" / "X compared to Y" / "X — Y" → [X, Y].
 * Falls back to an even word-count split. Re-exported for comparison-verdict.
 */
export function splitCompare(sentence: string): { left: string; right: string } {
  const clean = sentence.replace(/[.!?]+$/, "").trim();
  const parts = clean.split(/\s+(?:vs\.?|versus|but|compared to)\s+|\s*—\s*/i).filter(Boolean);
  if (parts.length >= 2) {
    return { left: parts[0].trim(), right: parts.slice(1).join(" ").trim() };
  }
  const words = clean.split(/\s+/);
  const mid = Math.ceil(words.length / 2) || 1;
  return { left: words.slice(0, mid).join(" ") || clean, right: words.slice(mid).join(" ") || clean };
}

export const comparison: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  // Explicit annotation: the fallback object literal lacks the optional
  // leftLabel/rightLabel/verdict keys entirely (not just `undefined`-valued),
  // so without this the `??` result narrows to a union that can't access them.
  const compare: NonNullable<ScenePayload["compare"]> = payload.compare ?? { ...splitCompare(scene.sentence) };
  const leftLabel = escapeHtml((compare.leftLabel ?? "BEFORE").toUpperCase());
  const rightLabel = escapeHtml((compare.rightLabel ?? "AFTER").toUpperCase());
  const leftText = escapeHtml(compare.left);
  const rightText = escapeHtml(compare.right);

  const borderMuted = `${theme.colors.muted}33`;
  const winnerBg = `color-mix(in srgb, ${theme.colors.accent} 8%, ${theme.colors.bg})`;

  const inner =
    `<div id="${p}-cola" style="flex:1;background:${theme.colors.surface};border-radius:16px;padding:60px 48px;` +
    `display:flex;flex-direction:column;gap:20px;border:2px solid ${borderMuted};` +
    `align-items:center;justify-content:center;text-align:center;opacity:0;">` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:88px;color:${theme.colors.muted};line-height:1;">✗</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:900;font-size:56px;color:${theme.colors.muted};">${leftLabel}</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:400;font-size:40px;color:${theme.colors.muted};line-height:1.4;">${leftText}</div>` +
    `</div>` +
    `<div id="${p}-vs" style="flex-shrink:0;align-self:center;font-family:${theme.typography.fontFamily};` +
    `font-weight:900;font-size:52px;color:${theme.colors.accent};opacity:0;">VS</div>` +
    `<div id="${p}-colb" style="flex:1;background:${winnerBg};border-radius:16px;padding:60px 48px;` +
    `display:flex;flex-direction:column;gap:20px;border:2px solid ${theme.colors.accent};` +
    `align-items:center;justify-content:center;text-align:center;opacity:0;">` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:88px;color:${theme.colors.accent};line-height:1;">◆</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:900;font-size:56px;color:${theme.colors.accent};">${rightLabel}</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:400;font-size:40px;color:${theme.colors.text};line-height:1.4;">${rightText}</div>` +
    `</div>`;

  const gsap =
    `tl.fromTo('#${p}-cola', { x:-80, opacity:0 }, { x:0, opacity:1, duration:0.6, ease:'expo.out' }, ${t(offset + 0.2)});\n` +
    `tl.fromTo('#${p}-vs', { scale:0.5, opacity:0 }, { scale:1, opacity:1, duration:0.4, ease:'back.out(3)' }, ${t(offset + 0.6)});\n` +
    `tl.fromTo('#${p}-colb', { x:80, opacity:0 }, { x:0, opacity:1, duration:0.6, ease:'expo.out' }, ${t(offset + 0.8)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "flex-direction:row;gap:60px;align-items:stretch;" }),
    gsap,
  };
};
