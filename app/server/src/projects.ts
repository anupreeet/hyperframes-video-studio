import fs from "node:fs";
import path from "node:path";
import { getSettings } from "./settings.js";
import type { ProjectMeta, ProjectMode, StepName, StepState, Storyboard } from "./types.js";

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "video"
  );
}

export function projectDir(slug: string): string {
  return path.join(getSettings().projectsDir, slug);
}

function metaFile(slug: string): string {
  return path.join(projectDir(slug), "project.json");
}

export function listProjects(): ProjectMeta[] {
  const dir = getSettings().projectsDir;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => fs.existsSync(path.join(dir, f, "project.json")))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f, "project.json"), "utf8")) as ProjectMeta)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createProject(input: {
  title: string;
  mode: ProjectMode;
  themeId: string;
  fps?: 24 | 30 | 60;
  script?: string;
}): ProjectMeta {
  let slug = slugify(input.title);
  let n = 2;
  while (fs.existsSync(projectDir(slug))) slug = `${slugify(input.title)}-${n++}`;

  const dir = projectDir(slug);
  fs.mkdirSync(path.join(dir, "audio"), { recursive: true });
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.mkdirSync(path.join(dir, "renders"), { recursive: true });

  const now = new Date().toISOString();
  const meta: ProjectMeta = {
    slug,
    title: input.title,
    mode: input.mode,
    themeId: input.themeId,
    createdAt: now,
    updatedAt: now,
    fps: input.fps ?? getSettings().defaultFps,
    script: input.script,
    steps: {},
  };
  saveMeta(meta);
  return meta;
}

export function getMeta(slug: string): ProjectMeta {
  const file = metaFile(slug);
  if (!fs.existsSync(file)) throw new Error(`Unknown project: ${slug}`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as ProjectMeta;
}

export function saveMeta(meta: ProjectMeta): ProjectMeta {
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaFile(meta.slug), JSON.stringify(meta, null, 2));
  return meta;
}

export function updateStep(
  slug: string,
  step: StepName,
  state: StepState,
  detail?: string,
): ProjectMeta {
  const meta = getMeta(slug);
  meta.steps[step] = { state, detail, at: new Date().toISOString() };
  return saveMeta(meta);
}

export function saveStoryboard(slug: string, sb: Storyboard): void {
  fs.writeFileSync(path.join(projectDir(slug), "storyboard.json"), JSON.stringify(sb, null, 2));
}

export function getStoryboard(slug: string): Storyboard | null {
  const file = path.join(projectDir(slug), "storyboard.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Storyboard;
}

export function deleteProject(slug: string): void {
  const dir = projectDir(slug);
  // Refuse to rm anything outside the projects root.
  const root = getSettings().projectsDir;
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error("Refusing to delete outside projects dir");
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}
