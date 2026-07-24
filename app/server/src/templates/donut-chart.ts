// Scene type 16: donut-chart — multi-segment SVG donut, each slice draws on in sequence.
// SKILL.md appendix §16. Part-of-whole data (market share, budget splits); max 5 segments.

import { shell } from "./atoms.js";
import { escapeHtml, findNumber, payloadOf, sid, t, type SceneTemplate } from "./util.js";
import type { Theme } from "../types.js";

const C = 1005; // circumference of the r=160 ring (SKILL.md constant: 2*PI*160 ~= 1005).

/**
 * SKILL.md documents a fixed 3-colour table per theme id (shadow-cut:
 * #c0392b/#e67e22/#8899aa, blueprint: #4da6ff/#27ae60/#c0392b, neon-tokyo:
 * #00f5ff/#ff2d78/#a855f7, velvet-standard: #c9a84c/#8899aa/#555). That table isn't
 * derivable from Theme fields and this port only has shadow-cut.json in hand to verify
 * against, so rather than hardcode unverified hexes for themes it can't check, the
 * palette is derived generically from theme.colors — correct for any theme.json, at the
 * cost of not exactly matching the documented table for the other 3 named themes.
 */
function segmentPalette(theme: Theme): string[] {
  return [theme.colors.accent, theme.colors.accentAlt ?? theme.colors.muted, theme.colors.muted, theme.colors.surface, theme.colors.text];
}

/** payload.segments fallback: synthesize a 3-part split anchored on the sentence's first number. */
function syntheticSegments(sentence: string): { label: string; value: number }[] {
  const found = findNumber(sentence);
  const primary = found ? Math.max(10, Math.min(80, Math.round(found.value))) : 40;
  const remainder = 100 - primary;
  const second = Math.round(remainder * 0.6);
  return [
    { label: "This", value: primary },
    { label: "That", value: second },
    { label: "Other", value: 100 - primary - second },
  ];
}

export const donutChart: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const raw = payload.segments && payload.segments.length > 0 ? payload.segments.slice(0, 5) : syntheticSegments(scene.sentence);
  const total = raw.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1;
  const palette = segmentPalette(theme);

  let cum = 0;
  const segs = raw.map((s, i) => {
    const pct = (Math.max(0, s.value) / total) * 100;
    const px = (pct * C) / 100;
    const dashoffset = -cum;
    cum += px;
    return { label: escapeHtml(s.label), pct, px, dashoffset, color: palette[i % palette.length] };
  });

  const heading = escapeHtml(payload.headline ?? "Where it goes");

  const circlesHtml = segs
    .map(
      (s, i) =>
        `<circle id="${p}-seg${i + 1}" cx="200" cy="200" r="160" fill="none" stroke="${s.color}" stroke-width="60" stroke-dasharray="0 ${C}" stroke-dashoffset="${s.dashoffset.toFixed(1)}"/>`,
    )
    .join("");

  const legendHtml = segs
    .map(
      (s, i) =>
        `<div id="${p}-ll${i + 1}" style="display:flex;align-items:center;gap:20px;opacity:0;">` +
        `<div style="width:20px;height:20px;border-radius:4px;background:${s.color};flex-shrink:0;"></div>` +
        `<span style="font-family:${theme.typography.fontFamily};font-weight:600;font-size:44px;color:${theme.colors.text};">${s.label}</span>` +
        `<span style="font-family:${theme.typography.fontFamily};font-weight:900;font-size:44px;color:${s.color};margin-left:auto;">${Math.round(s.pct)}%</span>` +
        `</div>`,
    )
    .join("");

  const inner =
    `<div style="position:relative;flex-shrink:0;width:480px;height:480px;">` +
    `<svg width="480" height="480" viewBox="0 0 400 400" style="transform:rotate(-90deg);display:block;">` +
    `<circle cx="200" cy="200" r="160" fill="none" stroke="${theme.colors.surface}" stroke-width="60"/>` +
    circlesHtml +
    `</svg>` +
    `<div id="${p}-clbl" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);${theme.css.hed}font-size:72px;text-align:center;opacity:0;">100%</div>` +
    `</div>` +
    `<div style="flex:1;display:flex;flex-direction:column;gap:28px;">` +
    `<div id="${p}-dhead" style="${theme.css.sub}font-size:52px;margin-bottom:8px;opacity:0;">${heading}</div>` +
    legendHtml +
    `</div>`;

  const html = shell(theme, inner, { contentStyle: "flex-direction:row;align-items:center;gap:80px;" });

  let gsap = `tl.fromTo('#${p}-dhead', { x:-40, opacity:0 }, { x:0, opacity:1, duration:0.5, ease:'power2.out' }, ${t(offset + 0.1)});\n`;

  segs.forEach((s, i) => {
    gsap += `tl.fromTo('#${p}-seg${i + 1}', { strokeDasharray:'0 ${C}' }, { strokeDasharray:'${s.px.toFixed(1)} ${(C - s.px).toFixed(1)}', duration:0.7, ease:'power2.out' }, ${t(offset + 0.4 + i * 0.25)});\n`;
    gsap += `tl.fromTo('#${p}-ll${i + 1}', { opacity:0, x:30 }, { opacity:1, x:0, duration:0.4 }, ${t(offset + 0.9 + i * 0.25)});\n`;
  });

  // Centre label pops at the same beat as the last legend row (matches SKILL.md's
  // fixed offset+1.4 for its 3-segment example: 0.9 + (3-1)*0.25 = 1.4).
  gsap += `tl.fromTo('#${p}-clbl', { opacity:0, scale:0.6 }, { opacity:1, scale:1, duration:0.5, ease:'back.out(2)' }, ${t(offset + 0.9 + (segs.length - 1) * 0.25)});\n`;

  return { html, gsap };
};
