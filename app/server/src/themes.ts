import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Theme } from "./types.js";

// themes/ lives at the repo root, two levels above app/server.
const HERE = path.dirname(fileURLToPath(import.meta.url));

function themesDir(): string {
  // Works from src/ (tsx) and dist/ (build) alike: walk up until themes/ found.
  let dir = HERE;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "themes");
    if (fs.existsSync(path.join(candidate, "shadow-cut.json"))) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error("themes/ directory not found above " + HERE);
}

let cache: Theme[] | null = null;

export function listThemes(): Theme[] {
  if (cache) return cache;
  const dir = themesDir();
  cache = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Theme)
    .sort((a, b) => (a.defaultFor ? -1 : b.defaultFor ? 1 : a.name.localeCompare(b.name)));
  return cache;
}

export function getTheme(id: string): Theme {
  const theme = listThemes().find((t) => t.id === id);
  if (!theme) throw new Error(`Unknown theme: ${id}`);
  return theme;
}

/** SKILL.md 4b mood → theme mapping for free-text style hints. */
export function themeForMood(hint: string): Theme {
  const h = hint.toLowerCase();
  const table: [RegExp, string][] = [
    [/dark|cinematic|dramatic/, "shadow-cut"],
    [/light|white|handwriting|casual/, "open-page"],
    [/futuristic|\bai\b|cyberpunk|neon|tech/, "neon-tokyo"],
    [/hacker|dev|coding|terminal|cli/, "terminal-green"],
    [/editorial|journalism|newspaper/, "broadsheet"],
    [/technical|engineering|process|spec/, "blueprint"],
    [/luxury|premium|finance|gold/, "velvet-standard"],
    [/creator|lifestyle|sunset|personal/, "dusk-gradient"],
    [/saas|product|clean|modern|corporate/, "frost"],
    [/bold|raw|punchy|hot take|viral/, "brutalist"],
  ];
  for (const [re, id] of table) if (re.test(h)) return getTheme(id);
  return getTheme("shadow-cut");
}
