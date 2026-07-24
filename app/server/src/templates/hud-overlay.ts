// Scene type 20: hud-overlay — floating glassmorphism UI cards (terminal + stat) over a
// background video, mimicking a live dashboard/editor HUD. SKILL.md appendix §20.

import { escapeHtml, findNumber, payloadOf, sid, t, type SceneTemplate } from "./util.js";

function hexToRgba(c: string, a: number): string {
  const h = c.replace("#", "").trim();
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** payload.pexels.query fallback: concrete words from the sentence, biased toward tech imagery. */
function fallbackQuery(sentence: string): string {
  const words = sentence
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return `${words.slice(0, 5).join(" ") || sentence.slice(0, 30)} technology`;
}

const DEFAULT_LOG_LINES = [
  { cmd: "analyze_clip", detail: '"intro.mp4"' },
  { cmd: "sync_captions", detail: "114 words" },
  { cmd: "add_motion_gfx", detail: "5 scenes" },
  { cmd: "render_frame", detail: "1920×1080" },
];

const BAR_OPACITY = [0.4, 0.5, 0.6, 0.75, 1];

export const hudOverlay: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset, duration } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);

  const headline = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 6).join(" "),
  );
  const sub = escapeHtml(scene.sentence);

  // Background video is required (SKILL.md: HUD cards on a plain background "look like a
  // flat slide, not an overlay"). SKILL.md doesn't document a fetch mechanism for this
  // scene type the way it does for pexels-hero, but leaving assets/bg.mp4 unresolved
  // would violate that same requirement by default, so this reuses pexels-hero's fetch
  // pattern against a tech-biased query. Flagged as an assumption beyond the literal spec.
  const query = payload.pexels?.query ?? fallbackQuery(scene.sentence);
  const file = `assets/pexels-s${index}.mp4`;
  const assets: { kind: "pexels"; query: string; media: "photo" | "video"; file: string }[] = [
    { kind: "pexels", query, media: "video", file },
  ];

  // Video wrapper: plain non-timed div OUTSIDE all .clip divs, display:none until this
  // scene's window (SKILL.md Error Handling: "hud-overlay cards float on dark background
  // instead of over a video" if the wrapper/reveal is missing). The rgba(8,8,16,0.55)
  // dark overlay is SKILL.md's literal required value for card readability, not a theme
  // hardcode, so it is kept as-is rather than substituted.
  const outerHtml =
    `<div id="${p}-vwrap" style="position:absolute;inset:0;display:none;z-index:0;background:${theme.colors.bg};">` +
    `<video id="${p}-bgvid" data-start="${t(offset)}" data-duration="${duration.toFixed(2)}" data-track-index="0" muted playsinline style="width:100%;height:100%;object-fit:cover;" src="${file}"></video>` +
    `<div style="position:absolute;inset:0;background:rgba(8,8,16,0.55);"></div>` +
    `</div>`;

  // Counter target: prefer payload.counter (this card IS a counter visual), then
  // payload.stat's numeric value, then the sentence's first number, then a literal
  // fallback matching SKILL.md's own example.
  const counterTarget =
    payload.counter?.to ?? (payload.stat ? findNumber(payload.stat.value)?.value : undefined) ?? findNumber(scene.sentence)?.value ?? 248;
  // escapeHtml doubles as a defensive guard here: this string is interpolated both into
  // HTML text (below) and into a JS string literal inside an inline <script> tag —
  // escaping "<" also prevents a payload-supplied suffix from prematurely closing the
  // </script> tag early. The extra replaces close the remaining JS-literal breakouts
  // (a stray ' or \ would end the single-quoted string the suffix lands in).
  const counterSuffix = escapeHtml(payload.counter?.suffix ?? "%")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
  const statLabel = escapeHtml(payload.counter?.label ?? payload.stat?.label ?? "monthly creator views");

  const barValues = payload.bars && payload.bars.length > 0 ? payload.bars.slice(0, 5).map((b) => b.value) : [30, 45, 58, 75, 100];
  const maxBar = Math.max(...barValues, 1);
  const barPcts = barValues.map((v) => Math.max(0, Math.min(100, Math.round((v / maxBar) * 100))));

  const logSource = payload.steps ?? payload.items;
  const logLines =
    logSource && logSource.length > 0
      ? logSource.slice(0, 4).map((s) => ({ cmd: escapeHtml(s), detail: "" }))
      : DEFAULT_LOG_LINES.map((l) => ({ cmd: escapeHtml(l.cmd), detail: escapeHtml(l.detail) }));

  const linesHtml = logLines
    .map((line, i) => {
      const isLast = i === logLines.length - 1;
      const textColor = isLast ? theme.colors.text : theme.colors.muted;
      const statusHtml = isLast
        ? `<span id="${p}-cursor" style="color:${theme.colors.accent};font-size:13px;">▌</span>`
        : `<span style="color:#27ae60;font-size:12px;">ok</span>`;
      const detailHtml = line.detail ? ` <span style="color:${theme.colors.text};">${line.detail}</span>` : "";
      return (
        `<div id="${p}-l${i + 1}" style="font-family:'JetBrains Mono',monospace;font-size:15px;color:${textColor};display:flex;justify-content:space-between;">` +
        `<span><span style="color:${theme.colors.accent};">▸</span> ${line.cmd}${detailHtml}</span>${statusHtml}` +
        `</div>`
      );
    })
    .join("");

  const barsHtml = barPcts
    .map((_, i) => `<div id="${p}-b${i + 1}" style="flex:1;background:${theme.colors.accent};opacity:${BAR_OPACITY[i] ?? 1};border-radius:3px 3px 0 0;height:0%;"></div>`)
    .join("");

  const cardBg = hexToRgba(theme.colors.surface, 0.9);

  // Card chrome (glass panel bg, monospace terminal font, red/amber/green traffic-light
  // dots, "ok" success green) are cross-theme UI conventions, not Shadow Cut hardcodes —
  // kept literal rather than theme-substituted; only the brand accent (arrow/cursor/bars/
  // trend) and text/muted colours are driven from theme.colors.
  const html =
    `<div id="${p}-left" style="position:absolute;top:80px;left:100px;width:520px;background:${cardBg};border:1px solid rgba(255,255,255,0.13);border-radius:14px;padding:28px 32px;backdrop-filter:blur(12px);">` +
    `<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.08);">` +
    `<div style="width:10px;height:10px;border-radius:50%;background:#c0392b;"></div>` +
    `<div style="width:10px;height:10px;border-radius:50%;background:#f39c12;"></div>` +
    `<div style="width:10px;height:10px;border-radius:50%;background:#27ae60;"></div>` +
    `<div style="font-family:'JetBrains Mono',monospace;font-size:15px;color:${theme.colors.accent};font-weight:700;margin-left:8px;">editing.loop()</div>` +
    `</div>` +
    `<div style="display:flex;flex-direction:column;gap:12px;">${linesHtml}</div>` +
    `</div>` +
    `<div id="${p}-right" style="position:absolute;top:80px;right:100px;width:440px;background:${cardBg};border:1px solid rgba(255,255,255,0.13);border-radius:14px;padding:32px 36px;backdrop-filter:blur(12px);">` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:16px;font-weight:700;letter-spacing:4px;color:${theme.colors.muted};text-transform:uppercase;margin-bottom:8px;">${statLabel}</div>` +
    `<div id="${p}-stat" style="font-family:${theme.typography.fontFamily};font-weight:900;font-size:88px;color:${theme.colors.text};line-height:1;margin-bottom:4px;">+0${counterSuffix}</div>` +
    `<div style="display:flex;align-items:flex-end;gap:10px;height:80px;margin-top:20px;">${barsHtml}</div>` +
    `<svg id="${p}-trend" width="100%" height="30" viewBox="0 0 360 30" style="margin-top:8px;opacity:0;" preserveAspectRatio="none">` +
    `<polyline points="0,28 80,22 160,16 240,10 320,4" fill="none" stroke="${theme.colors.accent}" stroke-width="2" stroke-dasharray="400" stroke-dashoffset="400"/>` +
    `<polygon points="315,0 330,8 315,16" fill="${theme.colors.accent}"/>` +
    `</svg>` +
    `</div>` +
    `<div class="scene-content" style="align-items:center;text-align:center;justify-content:flex-end;padding-bottom:100px;">` +
    `<div id="${p}-hed" style="${theme.css.hed}font-size:76px;max-width:1200px;line-height:1.2;opacity:0;">${headline}</div>` +
    `<div id="${p}-sub" style="${theme.css.sub}opacity:0;">${sub}</div>` +
    `</div>` +
    // Stat counter driven by a requestAnimationFrame loop reading a GSAP-tweened `state`
    // object, NOT the source's tl.to(..., {onUpdate:...}) pattern — same reasoning as
    // threejs-object.ts: HyperFrames seeks the timeline with suppressEvents:true during
    // frame capture, so onUpdate callbacks (which is the ONLY thing driving this
    // textContent write; the tweened object itself has no visual effect on its own)
    // never fire while rendering, which would leave the counter frozen at "+0..." in the
    // output video. Mirroring the documented rAF fix keeps it seek-safe.
    `<script>(function(){` +
    `window.${p}Stat={val:0};` +
    `(function statLoop(){` +
    `requestAnimationFrame(statLoop);` +
    `var el=document.getElementById('${p}-stat');` +
    `if(el)el.textContent='+'+Math.round(window.${p}Stat.val)+'${counterSuffix}';` +
    `})();` +
    `})();</script>`;

  let gsap =
    `tl.set('#${p}-vwrap', { display:'block' }, ${t(offset)});\n` +
    `tl.set('#${p}-vwrap', { display:'none' }, ${t(offset + duration)});\n` +
    `tl.fromTo('#${p}-left', { opacity:0, y:-30 }, { opacity:1, y:0, duration:0.55, ease:'expo.out' }, ${t(offset + 0.2)});\n` +
    `tl.fromTo('#${p}-right', { opacity:0, y:-30 }, { opacity:1, y:0, duration:0.55, ease:'expo.out' }, ${t(offset + 0.4)});\n`;

  logLines.forEach((_, i) => {
    gsap += `tl.fromTo('#${p}-l${i + 1}', { opacity:0 }, { opacity:1, duration:0.2 }, ${t(offset + 0.7 + i * 0.5)});\n`;
  });

  const lastLineTime = offset + 0.7 + (logLines.length - 1) * 0.5;
  gsap += `tl.fromTo('#${p}-cursor', { opacity:1 }, { opacity:0, duration:0.35, repeat:8, yoyo:true, ease:'none' }, ${t(lastLineTime + 0.2)});\n`;

  gsap += `tl.fromTo(window.${p}Stat, { val:0 }, { val:${counterTarget}, duration:1.0, ease:'power2.out' }, ${t(offset + 0.6)});\n`;

  barPcts.forEach((pct, i) => {
    gsap += `tl.fromTo('#${p}-b${i + 1}', { height:'0%' }, { height:'${pct}%', duration:0.4, ease:'power2.out' }, ${t(offset + 0.6 + i * 0.08)});\n`;
  });

  gsap += `tl.set('#${p}-trend', { opacity:1 }, ${t(offset + 1.2)});\n`;
  gsap += `tl.fromTo('#${p}-trend polyline', { strokeDashoffset:400 }, { strokeDashoffset:0, duration:0.7, ease:'power2.out' }, ${t(offset + 1.2)});\n`;

  gsap += `tl.fromTo('#${p}-hed', { opacity:0, y:30 }, { opacity:1, y:0, duration:0.5, ease:'power2.out' }, ${t(offset + 3.0)});\n`;
  gsap += `tl.fromTo('#${p}-sub', { opacity:0, y:20 }, { opacity:1, y:0, duration:0.4, ease:'power2.out' }, ${t(offset + 3.5)});\n`;

  return { html, gsap, outerHtml, assets };
};
