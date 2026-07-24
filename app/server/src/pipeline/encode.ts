// ffprobe/ffmpeg helpers: fps + duration detection, the fps→{24,30,60}
// mapping, and the talking-cut 3-step sync-safe CFR encode (SKILL.md
// "Sync-Safe Encode — CRITICAL for lip sync").

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const FF_TIMEOUT = 30 * 60_000;

export async function detectFps(videoPath: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v", "quiet",
    "-select_streams", "v:0",
    "-show_entries", "stream=avg_frame_rate",
    "-of", "csv=p=0",
    videoPath,
  ]);
  const frac = stdout.trim().split("\n")[0];
  const [num, den] = frac.split("/").map(Number);
  if (!num || !den) return 30;
  return Math.round(num / den);
}

/** HyperFrames render accepts only 24 / 30 / 60 (SKILL.md mapping). */
export function mapFps(srcFps: number): 24 | 30 | 60 {
  if (srcFps <= 26) return 24;
  if (srcFps <= 45) return 30;
  return 60;
}

export async function detectDuration(mediaPath: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    mediaPath,
  ]);
  return parseFloat(stdout.trim());
}

/** Extract mono 16kHz WAV for transcription (showcase mode, video source). */
export async function extractAudioForTranscription(
  videoPath: string,
  outWav: string,
): Promise<void> {
  await run(
    "ffmpeg",
    ["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", outWav],
    { timeout: FF_TIMEOUT },
  );
}

export interface SyncSafeResult {
  /** CFR re-encode WITH audio (timing baseline, keep for re-extraction). */
  encodedWithAudio: string;
  /** Muted face-cam video for the composition. */
  mutedVideo: string;
  /** WAV extracted from the SAME encode (never the original source). */
  wav: string;
  srcFps: number;
  mappedFps: 24 | 30 | 60;
  /** ffprobe duration of the muted video — use for ALL data-duration attrs. */
  duration: number;
}

/**
 * The confirmed lip-sync fix: all three outputs derive from one CFR encode so
 * video and audio share a timing baseline. Never extract audio from a VFR
 * source directly.
 */
export async function syncSafeEncode(
  sourcePath: string,
  assetsDir: string,
  audioDir: string,
  slug: string,
): Promise<SyncSafeResult> {
  const srcFps = await detectFps(sourcePath);
  const fpsStr = String(srcFps);
  const encodedWithAudio = path.join(assetsDir, "source-kf-audio.mp4");
  const mutedVideo = path.join(assetsDir, "source-kf.mp4");
  const wav = path.join(audioDir, `${slug}.wav`);

  // Step 1: CFR re-encode with dense keyframes, audio preserved.
  await run(
    "ffmpeg",
    ["-y", "-i", sourcePath, "-c:v", "libx264", "-r", fpsStr, "-g", fpsStr,
      "-keyint_min", fpsStr, "-movflags", "+faststart", "-c:a", "copy", encodedWithAudio],
    { timeout: FF_TIMEOUT },
  );
  // Step 2: WAV from THAT encode (not the original).
  await run(
    "ffmpeg",
    ["-y", "-i", encodedWithAudio, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", wav],
    { timeout: FF_TIMEOUT },
  );
  // Step 3: strip audio for the muted face-cam (same timing baseline).
  await run(
    "ffmpeg",
    ["-y", "-i", encodedWithAudio, "-c:v", "copy", "-an", mutedVideo],
    { timeout: FF_TIMEOUT },
  );

  const duration = await detectDuration(mutedVideo);
  return { encodedWithAudio, mutedVideo, wav, srcFps, mappedFps: mapFps(srcFps), duration };
}

/** Re-encode a raw Pexels video with dense keyframes (sparse-keyframe warning fix). */
export async function denseKeyframeEncode(inPath: string, outPath: string): Promise<void> {
  const fps = String(await detectFps(inPath));
  await run(
    "ffmpeg",
    ["-y", "-i", inPath, "-c:v", "libx264", "-r", fps, "-g", fps,
      "-keyint_min", fps, "-movflags", "+faststart", "-an", outPath],
    { timeout: FF_TIMEOUT },
  );
}
