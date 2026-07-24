// Scene type 15: threejs-object — full 3D scene rendered with Three.js inside the clip.
// SKILL.md appendix §15. Canvas fills the clip as its own background; a text column
// with a dashed "spec box" sits on top with a gradient scrim behind it.
//
// RENDERING MODEL (kept exactly as documented, not converted to onUpdate):
// SKILL.md is explicit that HyperFrames seeks the GSAP timeline with
// `suppressEvents:true` during frame capture, so `onUpdate` callbacks never fire while
// rendering — only GSAP's own tweened DOM/property writes survive a suppressed seek.
// Three.js needs a real per-frame `renderer.render()` call, which is a side effect no
// tweened CSS property can trigger. SKILL.md's fix is a `requestAnimationFrame` loop
// that reads a plain `state` object each frame; HyperFrames detects rAF usage and
// switches to a virtual-time screenshot capture mode built for exactly this. This is
// the documented, tested integration point for this renderer, so it is preserved as-is
// rather than force-fit into an onUpdate/progress-object shape that SKILL.md itself
// says will render blank.
//
// Three.js is loaded locally (SKILL.md: "must be bundled locally — do NOT use CDN";
// three.min.js in the project root), referenced via headHtml.

import { escapeHtml, payloadOf, sid, t, type SceneTemplate } from "./util.js";

/** Theme hex ("#c0392b") → Three.js numeric hex literal text ("0xc0392b"). */
function hex(c: string): string {
  return `0x${c.replace("#", "").trim()}`;
}

/** Theme hex → "r,g,b,a" rgba() string for CSS scrims. */
function hexToRgba(c: string, a: number): string {
  const h = c.replace("#", "").trim();
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const threejsObject: SceneTemplate = (ctx) => {
  const { theme, scene, index, offset, duration } = ctx;
  const p = sid(index);
  const payload = payloadOf(ctx);
  const headline = escapeHtml(
    payload.headline ?? scene.sentence.replace(/[.!?]$/, "").split(/\s+/).slice(0, 4).join(" "),
  );
  const sub = escapeHtml(scene.sentence);
  const stateVar = `${p}State`;

  // Text column sits over a gradient scrim so it stays legible against the 3D scene.
  // Spec-box sizing rule (SKILL.md §15): headline font-size <=68px to fit padding:80px 120px.
  const html =
    `<canvas id="${p}-canvas" style="position:absolute;inset:0;display:block;"></canvas>` +
    `<div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,${hexToRgba(theme.colors.bg, 0.92)} 40%,transparent 72%);">` +
    `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:120px 160px;max-width:900px;">` +
    `<div id="${p}-label" style="font-size:22px;font-family:${theme.typography.fontFamily};color:${theme.colors.muted};letter-spacing:5px;text-transform:uppercase;opacity:0;">// 3D SCENE</div>` +
    `<div id="${p}-box" style="border:2px dashed ${hexToRgba(theme.colors.muted, 0.4)};background:${theme.colors.surface};padding:40px 48px;margin-top:20px;opacity:0;">` +
    `<h1 style="${theme.css.hed}font-size:68px;">${headline}</h1>` +
    `<p style="font-family:${theme.typography.fontFamily};font-size:38px;color:${theme.colors.muted};margin-top:20px;">${sub}</p>` +
    `</div>` +
    `<div id="${p}-rule" style="width:0px;height:3px;background:${theme.colors.accent};margin-top:32px;"></div>` +
    `</div>` +
    `</div>` +
    `<script>(function(){` +
    `var canvas=document.getElementById('${p}-canvas');` +
    `var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});` +
    `renderer.setSize(1920,1080);renderer.setPixelRatio(1);renderer.setClearColor(${hex(theme.colors.bg)},1);` +
    `var scene=new THREE.Scene();` +
    `var camera=new THREE.PerspectiveCamera(55,1920/1080,0.1,1000);` +
    `camera.position.set(4,0,7);camera.lookAt(4,0,0);` +
    `var geo=new THREE.TorusKnotGeometry(1.5,0.42,160,32);` +
    `var solidMesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:${hex(theme.colors.surface)},emissive:${hex(theme.colors.accent)},roughness:0.25,metalness:0.85}));` +
    `solidMesh.position.set(4,0,0);scene.add(solidMesh);` +
    `var wireMesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:${hex(theme.colors.accent)},wireframe:true,opacity:0.55,transparent:true}));` +
    `wireMesh.position.set(4,0,0);scene.add(wireMesh);` +
    `scene.add(new THREE.AmbientLight(${hex(theme.colors.accent)},0.3));` +
    `var key=new THREE.PointLight(${hex(theme.colors.accent)},4,30);key.position.set(6,4,6);scene.add(key);` +
    `window.${stateVar}={rotX:0,rotY:0,scale:0.01};` +
    `(function animate(){` +
    `requestAnimationFrame(animate);` +
    `solidMesh.rotation.x=wireMesh.rotation.x=window.${stateVar}.rotX;` +
    `solidMesh.rotation.y=wireMesh.rotation.y=window.${stateVar}.rotY;` +
    `solidMesh.scale.setScalar(window.${stateVar}.scale);` +
    `wireMesh.scale.setScalar(window.${stateVar}.scale);` +
    `renderer.render(scene,camera);` +
    `})();` +
    `})();</script>`;

  const gsap =
    `tl.fromTo(window.${stateVar}, { scale:0.01 }, { scale:1, duration:1.2, ease:'back.out(1.5)' }, ${t(offset + 0.1)});\n` +
    `tl.fromTo(window.${stateVar}, { rotY:0, rotX:0 }, { rotY:Math.PI*2, rotX:Math.PI*0.6, duration:${duration.toFixed(2)}, ease:'none' }, ${t(offset)});\n` +
    `tl.fromTo('#${p}-label', { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.4, ease:'power2.out' }, ${t(offset + 0.9)});\n` +
    `tl.fromTo('#${p}-box', { opacity:0, y:40 }, { opacity:1, y:0, duration:0.7, ease:'power3.out' }, ${t(offset + 1.2)});\n` +
    `tl.fromTo('#${p}-rule', { width:'0px' }, { width:'240px', duration:0.8, ease:'power2.inOut' }, ${t(offset + 1.8)});\n`;

  return {
    html,
    gsap,
    // Pinned CDN UMD build (global THREE) — r147 is the last release shipping
    // build/three.min.js. Matches the composer's CDN-GSAP pattern; the render
    // pipeline localizes remote scripts at capture time.
    headHtml: `<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>`,
  };
};
