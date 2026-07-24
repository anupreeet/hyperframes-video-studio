import assert from "node:assert/strict";
import test from "node:test";
import { buildStoryboard, splitSentences } from "./storyboard.js";

const PRIMARY_SCRIPT = `HyperFrames turns one narration into a complete visual system.
Our user count grew to 12000 in one year.
The trend over time bends upward month after month.
The budget breakdown is 50 percent engineering, 30 percent design, and 20 percent support.
72 percent of all users finish the workflow.
The launch produced 4200 verified renders.
The Pro plan versus the Free plan costs 29 dollars per user per month.
Manual review versus automation changes the pace completely.
The problem is scattered feedback; the solution is one shared queue.
Teams need speed, clarity, and ownership.
The process starts with capture then review then publish.
Ada says, "Simple systems scale."
Picture a three-dimensional globe orbiting in a dark space station.
The live dashboard shows terminal telemetry and monitoring alerts.
Imagine a city street filled with creative teams at work.
Async work means progress without shared office hours.
Move now!
Think of it like a compass in fog.
Because every signal is shared, the result is faster alignment.
Build the next story with confidence.`;

test("splitSentences keeps closing quotes with their sentence", () => {
  assert.deepEqual(splitSentences('Ada says, "Simple systems scale." Picture a globe.'), [
    'Ada says, "Simple systems scale."',
    "Picture a globe.",
  ]);
  assert.deepEqual(splitSentences("Ada says, “Ship it!” Then the team moves."), [
    "Ada says, “Ship it!”",
    "Then the team moves.",
  ]);
});

test("primary scenario produces the intended 20 scene types", () => {
  const sentences = splitSentences(PRIMARY_SCRIPT);
  assert.equal(sentences.length, 20);
  const storyboard = buildStoryboard({
    slug: "primary-test",
    mode: "script",
    themeId: "shadow-cut",
    sentences,
    words: [],
    totalDuration: 60,
    title: "Complete Scene Type Test",
  });
  assert.deepEqual(
    storyboard.scenes.map((scene) => scene.type),
    [
      "title-card",
      "counter-up",
      "line-chart",
      "donut-chart",
      "progress-ring",
      "stat-reveal",
      "product-comparison",
      "comparison",
      "split-screen",
      "list-reveal",
      "flow-steps",
      "quote-card",
      "threejs-object",
      "hud-overlay",
      "pexels-hero",
      "kinetic-text",
      "callout",
      "doodle-split",
      "split-layout",
      "outro-card",
    ],
  );
});
