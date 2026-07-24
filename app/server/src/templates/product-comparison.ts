// Scene type 11c: product-comparison — two product cards split by a VS divider.
// SKILL.md appendix §11c. Left card: standard/challenger (muted). Right card:
// winner/recommended (accent border, floating badge). Feature rows stagger in
// row-by-row across both cards simultaneously, then the winner badge pops last.

import { shell } from "./atoms.js";
import { escapeHtml, fallbackItems, payloadOf, sid, t, type SceneTemplate } from "./util.js";
import type { Theme } from "../types.js";

const SUCCESS_GREEN = "#27ae60";

type AttrKind = "no" | "unlimited" | "numeric" | "yes";

/** Classify one free-text attribute string into an icon + trailing label. */
function classifyAttr(raw: string): { icon: string; label: string; kind: AttrKind } {
  const text = raw.trim();
  const s = text.toLowerCase();
  if (/^(no|none|n\/a|not included|unavailable)\b/.test(s)) {
    return { icon: "✗", label: text.replace(/^(no|none|n\/a|not included|unavailable)[:\s-]*/i, "") || text, kind: "no" };
  }
  if (/unlimited|infinite|∞/.test(s)) {
    return { icon: "∞", label: text.replace(/unlimited\s*/i, "").trim() || text, kind: "unlimited" };
  }
  const numMatch = text.match(/^([\d.,]+(?:[a-zA-Z%]{1,3})?)\b\s*(.*)$/);
  if (numMatch && numMatch[2]) {
    return { icon: numMatch[1], label: numMatch[2].trim(), kind: "numeric" };
  }
  return { icon: "✓", label: text, kind: "yes" };
}

function iconColor(kind: AttrKind, isWinner: boolean, theme: Theme): string {
  if (kind === "no") return theme.colors.muted;
  if (kind === "yes") return SUCCESS_GREEN;
  // unlimited / numeric: emphasized with the accent only on the winner card.
  return isWinner ? theme.colors.accent : theme.colors.muted;
}

function renderFeatureRow(attr: string | undefined, theme: Theme, isWinner: boolean): string {
  const c = attr ? classifyAttr(attr) : { icon: "✗", label: "—", kind: "no" as const };
  const iCol = iconColor(c.kind, isWinner, theme);
  const lCol = isWinner ? theme.colors.text : theme.colors.muted;
  const iconSize = c.kind === "numeric" ? 22 : 28;
  return (
    `<div class="pc-row" style="display:flex;align-items:center;gap:16px;opacity:0;">` +
    `<span style="font-size:${iconSize}px;min-width:36px;text-align:center;color:${iCol};">${escapeHtml(c.icon)}</span>` +
    `<span style="font-family:${theme.typography.fontFamily};font-size:30px;font-weight:600;color:${lCol};">${escapeHtml(c.label)}</span>` +
    `</div>`
  );
}

export const productComparison: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset, duration } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);

  // Fallback: no payload.products → synthesize two generic tiers from the
  // sentence's clauses, each with 3 generic rows illustrating the icon system
  // (a "no", a plain "yes", and a "numeric" attribute) so the render still
  // demonstrates the full visual language without fabricating real pricing.
  const names = fallbackItems(scene.sentence, 2);
  const products =
    payload.products && payload.products.length >= 2
      ? payload.products.slice(0, 2)
      : [
          { name: names[0] || "Standard", attrs: ["No priority support", "Community access", "5 projects"] },
          { name: names[1] || "Premium", attrs: ["Priority support", "Team access", "Unlimited projects"] },
        ];
  const [prodA, prodB] = products;

  const targetRows = duration <= 5 ? 3 : duration >= 8 ? 5 : 4;
  const rowCount = Math.max(1, Math.min(targetRows, Math.max(prodA.attrs.length, prodB.attrs.length)));

  const rowsA = Array.from({ length: rowCount }, (_, i) => renderFeatureRow(prodA.attrs[i], theme, false)).join("");
  const rowsB = Array.from({ length: rowCount }, (_, i) => renderFeatureRow(prodB.attrs[i], theme, true)).join("");

  const borderMuted = `${theme.colors.muted}33`;
  const dividerBg = `color-mix(in srgb, white 5%, ${theme.colors.surface})`;
  const winnerBg = `color-mix(in srgb, ${theme.colors.accent} 8%, ${theme.colors.bg})`;
  // Accent glow behind the winner card — baked into scene-bg via bgStyle so it
  // stays a true background layer (matches source's sibling <div> before
  // scene-content without fighting shell()'s single-inner-string contract).
  const bgStyle = `background-image:radial-gradient(circle 300px at right 200px top 50%, ${theme.colors.accent}1f 0%, transparent 70%);`;

  const inner =
    `<div id="${p}-pclbl" style="font-family:${theme.typography.fontFamily};font-size:20px;font-weight:700;` +
    `letter-spacing:8px;color:${theme.colors.accent};text-transform:uppercase;opacity:0;">HEAD TO HEAD</div>` +
    `<div style="display:flex;align-items:stretch;gap:0;width:100%;flex:1;min-height:0;">` +
    `<div id="${p}-pca" style="flex:1;background:${theme.colors.surface};border-radius:20px 0 0 20px;` +
    `border:2px solid ${borderMuted};border-right:none;padding:44px 48px;display:flex;flex-direction:column;opacity:0;">` +
    `<div style="margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid ${borderMuted};">` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:50px;font-weight:900;color:${theme.colors.muted};">${escapeHtml(prodA.name)}</div>` +
    `</div>` +
    `<div style="display:flex;flex-direction:column;gap:18px;">${rowsA}</div>` +
    `</div>` +
    `<div style="width:72px;background:${dividerBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">` +
    `<div id="${p}-pcvs" style="font-family:${theme.typography.fontFamily};font-size:22px;font-weight:900;` +
    `color:${theme.colors.accent};letter-spacing:6px;opacity:0;">VS</div>` +
    `</div>` +
    `<div id="${p}-pcb" style="flex:1;background:${winnerBg};border-radius:0 20px 20px 0;` +
    `border:2px solid ${theme.colors.accent};border-left:none;padding:44px 48px;display:flex;flex-direction:column;position:relative;opacity:0;">` +
    `<div id="${p}-badge" style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);` +
    `background:${theme.colors.accent};color:#fff;font-family:${theme.typography.fontFamily};font-size:16px;` +
    `font-weight:900;letter-spacing:5px;padding:6px 22px;border-radius:20px;white-space:nowrap;opacity:0;">★ RECOMMENDED</div>` +
    `<div style="margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid ${theme.colors.accent}33;">` +
    `<div style="font-family:${theme.typography.fontFamily};font-size:50px;font-weight:900;color:${theme.colors.accent};">${escapeHtml(prodB.name)}</div>` +
    `</div>` +
    `<div style="display:flex;flex-direction:column;gap:18px;">${rowsB}</div>` +
    `</div>` +
    `</div>`;

  const lastRowStart = 0.9 + (rowCount - 1) * 0.22;
  const badgeTime = lastRowStart + 0.3;

  const gsap =
    `tl.fromTo('#${p}-pclbl', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.4, ease:'power2.out' }, ${t(offset + 0.1)});\n` +
    `tl.fromTo('#${p}-pca', { opacity:0, x:-60 }, { opacity:1, x:0, duration:0.55, ease:'expo.out' }, ${t(offset + 0.3)});\n` +
    `tl.fromTo('#${p}-pcb', { opacity:0, x:60 }, { opacity:1, x:0, duration:0.55, ease:'expo.out' }, ${t(offset + 0.3)});\n` +
    `tl.fromTo('#${p}-pcvs', { opacity:0, scale:0.5 }, { opacity:1, scale:1, duration:0.4, ease:'back.out(2)' }, ${t(offset + 0.65)});\n` +
    `tl.fromTo('#${p}-pca .pc-row', { opacity:0, x:-20 }, { opacity:1, x:0, duration:0.3, ease:'power2.out', stagger:{ each:0.22, from:'start' } }, ${t(offset + 0.9)});\n` +
    `tl.fromTo('#${p}-pcb .pc-row', { opacity:0, x:20 }, { opacity:1, x:0, duration:0.3, ease:'power2.out', stagger:{ each:0.22, from:'start' } }, ${t(offset + 0.9)});\n` +
    `tl.fromTo('#${p}-badge', { opacity:0, scale:0.5, y:-8 }, { opacity:1, scale:1, y:0, duration:0.45, ease:'back.out(3)' }, ${t(offset + badgeTime)});\n`;

  return {
    html: shell(theme, inner, { contentStyle: "align-items:center;gap:24px;padding:60px 120px;", bgStyle }),
    gsap,
  };
};
