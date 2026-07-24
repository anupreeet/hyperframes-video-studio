// Poster-thumbnail generation — grabs a single JPEG frame near the 25% mark
// of a rendered video for the project list. Best-effort and de-duped per
// slug; never blocks the caller.

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const inFlight = new Set<string>();

export function thumbnailPath(dir: string): string {
  return path.join(dir, "thumb.jpg");
}

async function extractPosterFrame(videoPath: string, dir: string, durationSec: number): Promise<void> {
  const ts = Math.max(0, Math.min(durationSec * 0.25, Math.max(durationSec - 0.5, 0)));
  await run(
    "ffmpeg",
    ["-y", "-ss", ts.toFixed(2), "-i", videoPath, "-frames:v", "1", "-vf", "scale=640:-1", "-q:v", "4", thumbnailPath(dir)],
    { timeout: 30_000 },
  );
}

export function ensureThumbnail(slug: string, dir: string, renderedFile: string, durationSec: number): void {
  if (fs.existsSync(thumbnailPath(dir)) || inFlight.has(slug)) return;
  inFlight.add(slug);
  extractPosterFrame(path.join(dir, renderedFile), dir, durationSec)
    .catch((err: unknown) => console.error(`[thumbnail] ${slug} failed:`, err instanceof Error ? err.message : err))
    .finally(() => inFlight.delete(slug));
}
