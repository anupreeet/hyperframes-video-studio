// Scene type 5: bar-chart — horizontal CSS bars that grow from left. Max 5
// bars, no axes/gridlines/legends.
// SKILL.md appendix §5.

import { ghostText, shell } from "./atoms.js";
import { escapeHtml, fallbackItems, payloadOf, pickGlyph, sid, t, type SceneTemplate } from "./util.js";

/** No payload.bars: derive 3-4 bars from sentence clauses with synthetic
 *  descending values (90/65/45/30) since no real metric is available. */
function syntheticBars(sentence: string): { label: string; value: number }[] {
  const items = fallbackItems(sentence, 4);
  const pad = ["Primary", "Secondary", "Tertiary", "Other"];
  while (items.length < 3) items.push(pad[items.length] ?? `Item ${items.length + 1}`);
  const synthetic = [90, 65, 45, 30];
  return items.slice(0, 4).map((label, i) => ({ label, value: synthetic[i] ?? 20 }));
}

export const barChart: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const bars = (payload.bars && payload.bars.length ? payload.bars : syntheticBars(scene.sentence)).slice(0, 5);
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  // Values already read 0-100 → treat as percentages (matches source's "78%"
  // style). Otherwise normalize bar width to the max value and show the raw
  // number instead of a misleading "%".
  const asPercent = bars.every((b) => b.value >= 0 && b.value <= 100);
  const widths = bars.map((b) => (asPercent ? b.value : (b.value / maxVal) * 100));
  const title = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 4).join(" "),
  );

  const rows = bars
    .map((b, i) => {
      const n = i + 1;
      const displayVal = asPercent ? `${b.value}%` : String(b.value);
      return (
        `<div style="display:flex;align-items:center;gap:24px;">` +
        `<span style="font-family:${theme.typography.fontFamily};font-weight:700;font-size:40px;color:${theme.colors.text};width:220px;text-align:right;">${escapeHtml(b.label)}</span>` +
        `<div style="flex:1;background:${theme.colors.surface};border-radius:4px;height:44px;overflow:hidden;">` +
        `<div id="${p}-bar${n}" style="width:0%;height:100%;background:${theme.colors.accent};border-radius:4px;transform-origin:left;"></div>` +
        `</div>` +
        `<span id="${p}-pct${n}" style="font-family:${theme.typography.fontFamily};font-weight:900;font-size:44px;color:${theme.colors.text};opacity:0;">${escapeHtml(displayVal)}</span>` +
        `</div>`
      );
    })
    .join("");

  const inner =
    `<div id="${p}-chart-title" style="${theme.css.sub}font-size:48px;margin-bottom:32px;">${title}</div>` +
    `<div style="display:flex;flex-direction:column;gap:28px;width:100%;">${rows}</div>` +
    ghostText(`${p}-ghost`, pickGlyph(scene.sentence, index), theme);

  let gsap = `tl.fromTo('#${p}-chart-title', { x:-40, opacity:0 }, { x:0, opacity:1, duration:0.5, ease:'power2.out' }, ${t(offset + 0.15)});\n`;
  bars.forEach((_, i) => {
    const n = i + 1;
    gsap +=
      `tl.fromTo('#${p}-bar${n}', { width:'0%' }, { width:'${widths[i]}%', duration:0.6, ease:'power2.out' }, ${t(offset + 0.3 + n * 0.12)});\n` +
      `tl.fromTo('#${p}-pct${n}', { opacity:0 }, { opacity:1, duration:0.3, ease:'power1.out' }, ${t(offset + 0.7 + n * 0.12)});\n`;
  });

  return { html: shell(theme, inner), gsap };
};
