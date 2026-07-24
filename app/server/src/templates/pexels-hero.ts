// Scene type 18: pexels-hero — full-bleed Pexels photo or looping video background with a
// dark scrim + text overlay. SKILL.md appendix §18. Atmospheric/contextual/emotional
// sentences: product environments, people working, cityscapes, abstract tech visuals.

import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";

function hexToRgba(c: string, a: number): string {
  const h = c.replace("#", "").trim();
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** payload.pexels.query fallback: 4-6 concrete words pulled from the sentence. */
function fallbackQuery(sentence: string): string {
  const words = sentence
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return words.slice(0, 6).join(" ") || sentence.slice(0, 40);
}

export const pexelsHero: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset, duration } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const media = payload.pexels?.media ?? "video";
  const query = payload.pexels?.query ?? fallbackQuery(scene.sentence);
  const file = `assets/pexels-s${index}.${media === "video" ? "mp4" : "jpg"}`;
  const assets: { kind: "pexels"; query: string; media: "photo" | "video"; file: string }[] = [
    { kind: "pexels", query, media, file },
  ];

  // SKILL.md's literal example eyebrow text ("THE REALITY") — no ScenePayload field
  // maps to a short category tag for this scene type, so the documented copy is kept
  // as a generic default rather than invented.
  const eyebrowText = "THE REALITY";
  const headline = escapeHtml(payload.headline ?? scene.sentence);

  if (media === "photo") {
    // Fallback layer behind the <img> keeps the scene rendering even if the pexels
    // fetch failed to land the asset before compose.
    const html =
      `<div class="scene-bg" style="background:${theme.colors.bg};"></div>` +
      `<img id="${p}-img" src="${file}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;">` +
      `<div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,${hexToRgba(theme.colors.bg, 0.88)} 38%,${hexToRgba(theme.colors.bg, 0.3)} 100%);"></div>` +
      `<div class="scene-content" style="align-items:flex-start;max-width:900px;">` +
      `<div id="${p}-eye" style="font-size:20px;font-weight:700;letter-spacing:6px;color:${theme.colors.accent};text-transform:uppercase;opacity:0;">${eyebrowText}</div>` +
      `<h2 id="${p}-hed" style="${theme.css.hed}font-size:96px;margin-top:16px;opacity:0;">${headline}</h2>` +
      `</div>`;

    // Ken Burns drift (SKILL.md "recommended for photos"); transformOrigin varies by
    // index so adjacent pexels-hero scenes don't read as identical motion.
    const originPool = ["center center", "right center", "left bottom"];
    const origin = originPool[index % originPool.length];

    const gsap =
      `tl.fromTo('#${p}-img', { opacity:0 }, { opacity:1, duration:0.9, ease:'power1.inOut' }, ${t(offset + 0.05)});\n` +
      `tl.fromTo('#${p}-img', { scale:1.0, transformOrigin:'${origin}' }, { scale:1.06, duration:${duration.toFixed(2)}, ease:'none', transformOrigin:'${origin}' }, ${t(offset)});\n` +
      `tl.fromTo('#${p}-eye', { opacity:0, y:-16 }, { opacity:1, y:0, duration:0.35, ease:'power2.out' }, ${t(offset + 0.55)});\n` +
      `tl.fromTo('#${p}-hed', { opacity:0, y:40 }, { opacity:1, y:0, duration:0.65, ease:'power3.out' }, ${t(offset + 0.75)});\n`;

    return { html, gsap, assets };
  }

  // Video variant — <video> lives in a non-timed wrapper OUTSIDE all .clip divs.
  // SKILL.md Error Handling: the broken anti-pattern is <video autoplay> nested inside a
  // .clip with no data-track-index (bleeds through every clip in the render). Correct
  // pattern: data-track-index="0", no autoplay, plain wrapper div; HyperFrames seeks
  // video.currentTime per rendered frame. Wrapper starts display:none and is toggled by
  // tl.set() (not tl.fromTo, since .clip display is HyperFrames-owned but this wrapper
  // is NOT a .clip element, so it's fine/expected to drive its display manually here).
  const outerHtml =
    `<div id="${p}-vwrap" style="position:absolute;inset:0;display:none;background:${theme.colors.bg};pointer-events:none;">` +
    `<video id="${p}-vid" data-start="${t(offset)}" data-duration="${duration.toFixed(2)}" data-track-index="0" muted playsinline src="${file}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>` +
    `</div>`;

  const html =
    `<div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,${hexToRgba(theme.colors.bg, 0.92)} 36%,${hexToRgba(theme.colors.bg, 0.08)} 100%);"></div>` +
    `<div class="scene-content" style="align-items:flex-start;max-width:900px;">` +
    `<div id="${p}-eye" style="font-size:20px;font-weight:700;letter-spacing:6px;color:${theme.colors.accent};text-transform:uppercase;opacity:0;">${eyebrowText}</div>` +
    `<h2 id="${p}-hed" style="${theme.css.hed}font-size:96px;margin-top:16px;opacity:0;">${headline}</h2>` +
    `</div>`;

  const gsap =
    `tl.set('#${p}-vwrap', { display:'block' }, ${t(offset)});\n` +
    `tl.set('#${p}-vwrap', { display:'none' }, ${t(offset + duration)});\n` +
    `tl.fromTo('#${p}-eye', { opacity:0, y:-16 }, { opacity:1, y:0, duration:0.35, ease:'power2.out' }, ${t(offset + 0.6)});\n` +
    `tl.fromTo('#${p}-hed', { opacity:0, y:40 }, { opacity:1, y:0, duration:0.65, ease:'power3.out' }, ${t(offset + 0.8)});\n`;

  return { html, gsap, outerHtml, assets };
};
