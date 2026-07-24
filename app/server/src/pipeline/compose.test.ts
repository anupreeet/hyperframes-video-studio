import assert from "node:assert/strict";
import test from "node:test";
import { composeStandard } from "./compose.js";
import { normalizeFinding } from "./render.js";

test("standard composition keeps main audio outside visual media tracks", () => {
  const result = composeStandard(
    {
      slug: "track-test",
      mode: "script",
      themeId: "shadow-cut",
      totalDuration: 5,
      scenes: [
        {
          id: 1,
          sentence: "Imagine a city at night.",
          type: "pexels-hero",
          startTime: 0,
          endTime: 5,
          payload: { pexels: { query: "city night", media: "video" } },
        },
      ],
    },
    { audioFile: "audio/voice.wav" },
  );
  const audioTag = result.html.match(/<audio id="main-audio"[\s\S]*?<\/audio>/)?.[0] ?? "";
  assert.ok(audioTag);
  assert.doesNotMatch(audioTag, /data-track-index/);
  assert.match(result.html, /data-track-index="0"[^>]*src="assets\/pexels-s1\.mp4"/);
});

test("documented renderer loops are warnings, arbitrary rAF remains an error", () => {
  const renderer = normalizeFinding({
    code: "requestanimationframe_in_composition",
    severity: "error",
    snippet: "var renderer=new THREE.WebGLRenderer({canvas:canvas}); requestAnimationFrame(loop);",
  });
  assert.equal(renderer.severity, "warning");

  const arbitrary = normalizeFinding({
    code: "requestanimationframe_in_composition",
    severity: "error",
    snippet: "requestAnimationFrame(() => element.remove())",
  });
  assert.equal(arbitrary.severity, "error");
});
