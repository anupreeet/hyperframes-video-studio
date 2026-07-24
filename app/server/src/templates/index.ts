// Scene template registry — one module per scene type, ported from SKILL.md's
// appendix catalog. compose.ts looks templates up by storyboard scene type.

import type { SceneType } from "../types.js";
import type { SceneTemplate } from "./util.js";

import { titleCard } from "./title-card.js";
import { kineticText } from "./kinetic-text.js";
import { kineticImpact } from "./kinetic-impact.js";
import { kineticSlam } from "./kinetic-slam.js";
import { statReveal } from "./stat-reveal.js";
import { counterUp } from "./counter-up.js";
import { barChart } from "./bar-chart.js";
import { listReveal } from "./list-reveal.js";
import { listRevealWords } from "./list-reveal-words.js";
import { flowSteps } from "./flow-steps.js";
import { flowStepsText } from "./flow-steps-text.js";
import { quoteCard } from "./quote-card.js";
import { splitLayout } from "./split-layout.js";
import { splitScreen } from "./split-screen.js";
import { doodleSplit } from "./doodle-split.js";
import { progressRing } from "./progress-ring.js";
import { comparison } from "./comparison.js";
import { comparisonVerdict } from "./comparison-verdict.js";
import { productComparison } from "./product-comparison.js";
import { callout } from "./callout.js";
import { ctaCallout } from "./cta-callout.js";
import { iconGrid } from "./icon-grid.js";
import { outroCard } from "./outro-card.js";
import { threejsObject } from "./threejs-object.js";
import { canvas2dScene } from "./canvas2d-scene.js";
import { donutChart } from "./donut-chart.js";
import { lineChart } from "./line-chart.js";
import { pexelsHero } from "./pexels-hero.js";
import { presenterAside } from "./presenter-aside.js";
import { hudOverlay } from "./hud-overlay.js";

export const sceneTemplates: Record<SceneType, SceneTemplate> = {
  "title-card": titleCard,
  "kinetic-text": kineticText,
  "kinetic-impact": kineticImpact,
  "kinetic-slam": kineticSlam,
  "stat-reveal": statReveal,
  "counter-up": counterUp,
  "bar-chart": barChart,
  "list-reveal": listReveal,
  "list-reveal-words": listRevealWords,
  "flow-steps": flowSteps,
  "flow-steps-text": flowStepsText,
  "quote-card": quoteCard,
  "split-layout": splitLayout,
  "split-screen": splitScreen,
  "doodle-split": doodleSplit,
  "progress-ring": progressRing,
  comparison: comparison,
  "comparison-verdict": comparisonVerdict,
  "product-comparison": productComparison,
  callout: callout,
  "cta-callout": ctaCallout,
  "icon-grid": iconGrid,
  "outro-card": outroCard,
  "threejs-object": threejsObject,
  "canvas2d-scene": canvas2dScene,
  "donut-chart": donutChart,
  "line-chart": lineChart,
  "pexels-hero": pexelsHero,
  "presenter-aside": presenterAside,
  "hud-overlay": hudOverlay,
};
