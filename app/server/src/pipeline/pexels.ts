// Pexels asset fetching for pexels-hero scenes (SKILL.md Step 3.6).

import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getSettings } from "../settings.js";
import { denseKeyframeEncode } from "./encode.js";

async function download(url: string, outPath: string, headers?: Record<string, string>) {
  const res = await fetch(url, { headers });
  if (!res.ok || !res.body) throw new Error(`download failed ${res.status}: ${url}`);
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), fs.createWriteStream(outPath));
}

export async function fetchPexels(
  query: string,
  media: "photo" | "video",
  outFile: string,
): Promise<string | null> {
  const key = getSettings().pexelsApiKey;
  if (!key) throw new Error("PEXELS_API_KEY not set — add it in Settings to use pexels-hero scenes");
  const headers = { Authorization: key };

  if (media === "photo") {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      { headers },
    );
    const data = (await res.json()) as { photos?: { src: { large2x: string } }[] };
    const photo = data.photos?.[0];
    if (!photo) return null;
    await download(photo.src.large2x, outFile, headers);
    return outFile;
  }

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
    { headers },
  );
  const data = (await res.json()) as {
    videos?: { video_files: { quality: string | null; link: string }[] }[];
  };
  const video = data.videos?.[0];
  if (!video) return null;
  const hd = video.video_files.find((f) => f.quality === "hd") ?? video.video_files[0];

  // Raw Pexels videos have sparse keyframes — re-encode dense before compositing.
  const rawPath = outFile.replace(/(\.\w+)$/, "-raw$1");
  await download(hd.link, rawPath, headers);
  await denseKeyframeEncode(rawPath, outFile);
  fs.rmSync(rawPath, { force: true });
  return outFile;
}

/** Fetch every asset request produced by the compose step. */
export async function fetchAssets(
  requests: { query: string; media: "photo" | "video"; file: string }[],
  projectDir: string,
): Promise<{ file: string; ok: boolean; error?: string }[]> {
  const results: { file: string; ok: boolean; error?: string }[] = [];
  for (const req of requests) {
    const outFile = path.join(projectDir, req.file);
    if (fs.existsSync(outFile)) {
      results.push({ file: req.file, ok: true });
      continue;
    }
    try {
      const got = await fetchPexels(req.query, req.media, outFile);
      results.push({ file: req.file, ok: Boolean(got), error: got ? undefined : "no result" });
    } catch (err) {
      results.push({ file: req.file, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
