// Shared atoms (SKILL.md appendix "Shared Atoms"): eyebrow, rule bar, sec-label.
// Each returns { html, gsap } fragments the calling template composes in.

import { t } from "./util.js";
import type { Theme } from "../types.js";

/** Small uppercase accent label above a title. Drops in before the headline. */
export function eyebrow(
  id: string,
  text: string,
  theme: Theme,
  offset: number,
  opts: { margin?: string } = {},
): { html: string; gsap: string } {
  return {
    html: `<div id="${id}" style="font-size:22px;font-weight:700;letter-spacing:6px;color:${theme.colors.accent};text-transform:uppercase;opacity:0;${opts.margin ? `margin:${opts.margin};` : ""}">${text}</div>`,
    gsap: `tl.fromTo('#${id}', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.3, ease:'power2.out' }, ${t(offset + 0.1)});\n`,
  };
}

/** 200px accent horizontal rule that scales in from the left, under a title. */
export function ruleBar(
  id: string,
  theme: Theme,
  offset: number,
  opts: { centered?: boolean } = {},
): { html: string; gsap: string } {
  const margin = opts.centered ? "28px auto 0" : "28px 0 0";
  return {
    html: `<div id="${id}" style="width:200px;height:6px;background:${theme.colors.accent};transform-origin:left;transform:scaleX(0);margin:${margin};"></div>`,
    gsap: `tl.fromTo('#${id}', { scaleX:0 }, { scaleX:1, duration:0.6, ease:'power2.inOut', transformOrigin:'left' }, ${t(offset + 0.45)});\n`,
  };
}

/** Category header inside a scene (list-reveal, flow-steps). Slides down from above. */
export function secLabel(
  id: string,
  text: string,
  theme: Theme,
  offset: number,
): { html: string; gsap: string } {
  return {
    html: `<div id="${id}" style="font-size:22px;font-weight:700;letter-spacing:6px;color:${theme.colors.accent};text-transform:uppercase;margin-bottom:36px;opacity:0;">${text}</div>`,
    gsap: `tl.fromTo('#${id}', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.3 }, ${t(offset + 0.1)});\n`,
  };
}

/** Standard scene shell wrapper: bg + centered content column. */
export function shell(
  theme: Theme,
  inner: string,
  opts: { contentStyle?: string; bgStyle?: string } = {},
): string {
  return (
    `<div class="scene-bg" style="background:${theme.colors.bg};${opts.bgStyle ?? ""}"></div>` +
    `<div class="scene-content" style="${opts.contentStyle ?? ""}">${inner}</div>`
  );
}

/** Decorative ghost background text for non-title scenes (SKILL.md 4e). */
export function ghostText(id: string, word: string, theme: Theme): string {
  return `<div id="${id}" aria-hidden="true" style="position:absolute;right:-40px;bottom:-30px;font-family:${theme.typography.fontFamily};font-weight:${theme.typography.weights.headline};font-size:340px;line-height:1;color:${theme.colors.text};opacity:0.04;pointer-events:none;white-space:nowrap;">${word}</div>`;
}
