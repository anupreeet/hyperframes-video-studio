// Scene type 17: line-chart — animated SVG polyline draws left→right.
// SKILL.md appendix §17. Trends over time, growth curves, before/after timelines.

import { shell } from "./atoms.js";
import { escapeHtml, findNumber, payloadOf, sid, t, type SceneTemplate } from "./util.js";

const W = 1580;
const H = 520;
const LINE_DUR = 1.2; // time for the line to fully draw (SKILL.md constant).

/** payload.points fallback: a rising trend anchored on the sentence's first number. */
function syntheticPoints(sentence: string): number[] {
  const found = findNumber(sentence);
  const end = found ? Math.max(10, found.value) : 100;
  const start = end * 0.35;
  const n = 6;
  return Array.from({ length: n }, (_, i) => Math.round(start + ((end - start) * i) / (n - 1)));
}

function polylineLength(pts: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

export const lineChart: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const values = payload.points && payload.points.length >= 2 ? payload.points : syntheticPoints(scene.sentence);
  const n = values.length;
  const max = Math.max(...values, 1);

  const cx = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * W);
  const cy = (v: number) => H - (Math.max(0, v) / max) * H;
  const pts = values.map((v, i) => ({ x: cx(i), y: cy(v) }));

  const linePoints = pts.map((pt) => `${pt.x.toFixed(0)},${pt.y.toFixed(0)}`).join(" ");
  const polygonPoints = `0,${H} ${linePoints} ${pts[pts.length - 1].x.toFixed(0)},${H}`;

  // Exact path length * 1.15 safety margin, so the stroke-dasharray draw-on trick never
  // undershoots (SKILL.md's "1.2x the width" rule-of-thumb can undershoot for volatile
  // data with large vertical swings, since real polyline length depends on both axes,
  // not just width — computing it directly from the actual points is exact instead).
  const dashLen = Math.ceil(polylineLength(pts) * 1.15);

  const heading = escapeHtml(payload.headline ?? "Growth over time");

  const dotsHtml = pts
    .map((pt, i) => `<circle id="${p}-p${i + 1}" cx="${pt.x.toFixed(0)}" cy="${pt.y.toFixed(0)}" r="8" fill="${theme.colors.accent}" opacity="0"/>`)
    .join("");

  const xLabelsHtml = values
    .map((_, i) => `<span id="${p}-xl${i + 1}" style="font-family:${theme.typography.fontFamily};font-size:32px;color:${theme.colors.muted};opacity:0;">${i + 1}</span>`)
    .join("");

  const inner =
    `<div id="${p}-lchead" style="${theme.css.sub}font-size:52px;margin-bottom:40px;opacity:0;">${heading}</div>` +
    `<div style="position:relative;width:100%;height:${H}px;">` +
    `<svg id="${p}-svg" width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="position:absolute;top:0;left:0;overflow:visible;">` +
    `<line x1="0" y1="${(H * 0.25).toFixed(0)}" x2="${W}" y2="${(H * 0.25).toFixed(0)}" stroke="${theme.colors.surface}" stroke-width="1"/>` +
    `<line x1="0" y1="${(H * 0.5).toFixed(0)}" x2="${W}" y2="${(H * 0.5).toFixed(0)}" stroke="${theme.colors.surface}" stroke-width="1"/>` +
    `<line x1="0" y1="${(H * 0.75).toFixed(0)}" x2="${W}" y2="${(H * 0.75).toFixed(0)}" stroke="${theme.colors.surface}" stroke-width="1"/>` +
    `<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="${theme.colors.muted}" stroke-width="2"/>` +
    `<defs><linearGradient id="${p}-grad" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${theme.colors.accent}" stop-opacity="0.18"/>` +
    `<stop offset="100%" stop-color="${theme.colors.accent}" stop-opacity="0"/>` +
    `</linearGradient></defs>` +
    `<polygon id="${p}-fill" points="${polygonPoints}" fill="url(#${p}-grad)" opacity="0"/>` +
    `<polyline id="${p}-line" points="${linePoints}" fill="none" stroke="${theme.colors.accent}" stroke-width="4" stroke-dasharray="${dashLen}" stroke-dashoffset="${dashLen}"/>` +
    dotsHtml +
    `</svg>` +
    `<div style="position:absolute;bottom:-48px;left:0;right:0;display:flex;justify-content:space-between;">${xLabelsHtml}</div>` +
    `</div>`;

  const html = shell(theme, inner, { contentStyle: "align-items:flex-start;" });

  let gsap =
    `tl.fromTo('#${p}-lchead', { x:-40, opacity:0 }, { x:0, opacity:1, duration:0.5, ease:'power2.out' }, ${t(offset + 0.1)});\n` +
    `tl.fromTo('#${p}-line', { strokeDashoffset:${dashLen} }, { strokeDashoffset:0, duration:${LINE_DUR}, ease:'power2.inOut' }, ${t(offset + 0.4)});\n` +
    `tl.fromTo('#${p}-fill', { opacity:0 }, { opacity:1, duration:${(LINE_DUR * 0.8).toFixed(2)}, ease:'power1.out' }, ${t(offset + 0.6)});\n`;

  const dotInterval = LINE_DUR / n;
  values.forEach((_, i) => {
    const tt = offset + 0.4 + dotInterval * i;
    gsap += `tl.fromTo('#${p}-p${i + 1}', { opacity:0, scale:0, transformOrigin:'center' }, { opacity:1, scale:1, duration:0.2, ease:'back.out(3)' }, ${t(tt)});\n`;
    gsap += `tl.fromTo('#${p}-xl${i + 1}', { opacity:0 }, { opacity:1, duration:0.2 }, ${t(tt + 0.05)});\n`;
  });

  return { html, gsap };
};
