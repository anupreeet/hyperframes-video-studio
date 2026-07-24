// Scene type 11b: comparison-verdict — "SUDDENLY." reveal header above a bad→good
// card pair joined by an arrow. SKILL.md appendix §11b (derived from user-stories S13).
// The bad card keeps the theme accent (matches §11's "attention" role); the good
// card uses a hardcoded success green — a universal semantic, not a brand color,
// so it stays literal rather than reading from theme.colors.

import { shell } from "./atoms.js";
import { splitCompare } from "./comparison.js";
import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";
import type { ScenePayload } from "../types.js";

const SUCCESS_GREEN = "#27ae60";

export const comparisonVerdict: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const compare: NonNullable<ScenePayload["compare"]> = payload.compare ?? { ...splitCompare(scene.sentence) };
  const badLabel = escapeHtml((compare.leftLabel ?? "BEFORE").toUpperCase());
  const goodLabel = escapeHtml((compare.rightLabel ?? "AFTER").toUpperCase());
  const badText = escapeHtml(compare.left);
  const goodText = escapeHtml(compare.right);

  const impactWords = (compare.verdict ?? "Suddenly")
    .replace(/[.!?]+$/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
  const impactWord = escapeHtml(impactWords.toUpperCase()) + ".";

  const goodBg = `color-mix(in srgb, ${SUCCESS_GREEN} 8%, ${theme.colors.bg})`;

  const inner =
    `<div id="${p}-suddenly" style="font-family:${theme.typography.fontFamily};font-weight:${theme.typography.weights.headline};` +
    `font-size:96px;color:${theme.colors.text};letter-spacing:-2px;align-self:flex-start;opacity:0;">${impactWord}</div>` +
    `<div style="display:flex;align-items:stretch;gap:0;width:100%;">` +
    `<div id="${p}-cbad" style="flex:1;background:${theme.colors.surface};border-radius:16px;padding:48px 40px;` +
    `border-top:6px solid ${theme.colors.accent};display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;opacity:0;">` +
    `<div style="font-size:72px;">☠</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:900;font-size:44px;color:${theme.colors.text};">${badLabel}</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:400;font-size:28px;color:${theme.colors.muted};line-height:1.4;">${badText}</div>` +
    `</div>` +
    `<div id="${p}-cvs" style="flex-shrink:0;align-self:center;padding:0 32px;` +
    `font-family:${theme.typography.fontFamily};font-weight:900;font-size:52px;color:${theme.colors.muted};opacity:0;">→</div>` +
    `<div id="${p}-cgood" style="flex:1;background:${goodBg};border-radius:16px;padding:48px 40px;` +
    `border-top:6px solid ${SUCCESS_GREEN};display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;opacity:0;">` +
    `<div style="font-size:72px;">◆</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:900;font-size:44px;color:${SUCCESS_GREEN};">${goodLabel}</div>` +
    `<div style="font-family:${theme.typography.fontFamily};font-weight:400;font-size:28px;color:${theme.colors.muted};line-height:1.4;">${goodText}</div>` +
    `</div>` +
    `</div>`;

  const gsap =
    `tl.fromTo('#${p}-suddenly', { y:-50, opacity:0 }, { y:0, opacity:1, duration:0.55, ease:'expo.out' }, ${t(offset + 0.1)});\n` +
    `tl.fromTo('#${p}-cbad', { x:-80, opacity:0 }, { x:0, opacity:1, duration:0.55, ease:'expo.out' }, ${t(offset + 0.55)});\n` +
    `tl.fromTo('#${p}-cvs', { scale:0.4, opacity:0 }, { scale:1, opacity:1, duration:0.4, ease:'back.out(3)' }, ${t(offset + 0.9)});\n` +
    `tl.fromTo('#${p}-cgood', { x:80, opacity:0 }, { x:0, opacity:1, duration:0.55, ease:'expo.out' }, ${t(offset + 1.05)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;gap:32px;" }),
    gsap,
  };
};
