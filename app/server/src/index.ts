import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { runDoctor } from "./doctor.js";
import { prerequisite, StudioError } from "./errors.js";
import {
  createProject,
  deleteProject,
  getMeta,
  getStoryboard,
  listProjects,
  projectDir,
  saveMeta,
  saveStoryboard,
  updateStep,
} from "./projects.js";
import { getSettings, publicSettings, saveSettings } from "./settings.js";
import { listThemes } from "./themes.js";
import type { ProjectMode, TranscriptWord } from "./types.js";
import { composeStandard, composeTalkingCut } from "./pipeline/compose.js";
import {
  detectDuration,
  detectFps,
  mapFps,
  syncSafeEncode,
} from "./pipeline/encode.js";
import { llmAvailable, polishStoryboard, repairComposition } from "./pipeline/llm.js";
import { fetchAssets } from "./pipeline/pexels.js";
import { cancelRender, lintProject, renderProject } from "./pipeline/render.js";
import { prepareScript } from "./pipeline/script.js";
import { buildStoryboard, planCutaways, splitSentences } from "./pipeline/storyboard.js";
import { ensureThumbnail } from "./pipeline/thumbnail.js";
import { normalizeAudio, synthesize } from "./pipeline/tts.js";
import { transcribe } from "./pipeline/transcribe.js";

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 4600);

const app = express();
app.use(express.json({ limit: "8mb" }));

// ── SSE bus for render progress ─────────────────────────────────────────────
const sseClients = new Map<string, Set<Response>>();
function broadcast(slug: string, event: string, data: unknown): void {
  for (const res of sseClients.get(slug) ?? []) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
type Handler = (req: Request, res: Response) => Promise<void>;
const wrap =
  (fn: Handler) =>
  (req: Request, res: Response): void => {
    fn(req, res).catch((err: unknown) => {
      if (err instanceof StudioError) {
        res.status(err.status).json({ error: err.message, code: err.code, ...err.details });
        return;
      }
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request", code: "BAD_REQUEST" });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    });
  };

function requirePipeline(value: unknown, message: string, prerequisiteName: string): asserts value {
  if (!value) throw prerequisite(message, prerequisiteName);
}

function readTranscript(slug: string): TranscriptWord[] {
  const file = path.join(projectDir(slug), "transcript.json");
  if (!fs.existsSync(file)) throw prerequisite("No transcript yet — run the transcribe step first", "transcribe");
  return JSON.parse(fs.readFileSync(file, "utf8")) as TranscriptWord[];
}

/** Derive a display script from transcript words (showcase / talking-cut). */
function scriptFromTranscript(words: TranscriptWord[]): string {
  return words
    .map((w) => w.text.trim())
    .join(" ")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Meta / settings / themes ────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get(
  "/api/doctor",
  wrap(async (_req, res) => {
    const report = await runDoctor(SERVER_DIR);
    res.json({ ...report, llm: llmAvailable() });
  }),
);

app.get("/api/settings", (_req, res) => res.json(publicSettings()));
app.put(
  "/api/settings",
  wrap(async (req, res) => {
    const patch = z
      .object({
        projectsDir: z.string().optional(),
        omivoiceUrl: z.string().optional(),
        omivoiceRefVoice: z.string().optional(),
        pexelsApiKey: z.string().optional(),
        anthropicApiKey: z.string().optional(),
        openaiBaseUrl: z.string().optional(),
        openaiApiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        openaiEffort: z.enum(["", "low", "medium", "high", "xhigh", "max"]).optional(),
        defaultThemeId: z.string().optional(),
        defaultFps: z.union([z.literal(24), z.literal(30), z.literal(60)]).optional(),
        kokoroVoice: z.string().optional(),
      })
      .parse(req.body);
    // "•••" means unchanged secret
    if (patch.pexelsApiKey === "•••") delete patch.pexelsApiKey;
    if (patch.anthropicApiKey === "•••") delete patch.anthropicApiKey;
    if (patch.openaiApiKey === "•••") delete patch.openaiApiKey;
    saveSettings(patch);
    res.json(publicSettings());
  }),
);

// Live model discovery from the configured (or query-supplied) OpenAI-compatible endpoint.
app.get(
  "/api/llm/models",
  wrap(async (req, res) => {
    const baseUrl = (typeof req.query.baseUrl === "string" && req.query.baseUrl) || getSettings().openaiBaseUrl;
    if (!baseUrl) {
      res.status(400).json({ error: "No OpenAI-compatible base URL configured" });
      return;
    }
    // "•••" means "use the saved key" (form echoes the redacted value back).
    const queryKey = typeof req.query.apiKey === "string" ? req.query.apiKey : "";
    const key = queryKey && queryKey !== "•••" ? queryKey : getSettings().openaiApiKey;
    const upstream = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      res.status(502).json({ error: `Model list failed: ${upstream.status} ${upstream.statusText}` });
      return;
    }
    const data = (await upstream.json()) as { data?: { id?: unknown }[] };
    const models = (Array.isArray(data.data) ? data.data : [])
      .map((m) => m.id)
      .filter((id): id is string => typeof id === "string")
      .sort();
    res.json({ models });
  }),
);

app.get("/api/themes", (_req, res) => res.json(listThemes()));

// ── Projects ────────────────────────────────────────────────────────────────
app.get("/api/projects", (_req, res) => {
  const projects = listProjects();
  for (const p of projects) {
    if (p.renderedFile) ensureThumbnail(p.slug, projectDir(p.slug), p.renderedFile, p.totalDuration ?? 10);
  }
  res.json(projects);
});

app.post(
  "/api/projects",
  wrap(async (req, res) => {
    const body = z
      .object({
        title: z.string().trim().min(1).max(120),
        mode: z.enum(["script", "showcase", "talking-cut"]),
        themeId: z.string().default(getSettings().defaultThemeId),
        fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).optional(),
      })
      .parse(req.body);
    res.json(createProject(body));
  }),
);

app.get(
  "/api/projects/:slug",
  wrap(async (req, res) => {
    const meta = getMeta(req.params.slug);
    res.json({ meta, storyboard: getStoryboard(req.params.slug) });
  }),
);

app.delete(
  "/api/projects/:slug",
  wrap(async (req, res) => {
    deleteProject(req.params.slug);
    res.json({ ok: true });
  }),
);

app.patch(
  "/api/projects/:slug",
  wrap(async (req, res) => {
    const body = z
      .object({
        themeId: z.string().optional(),
        fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).optional(),
      })
      .parse(req.body);
    const meta = getMeta(req.params.slug);
    if (body.themeId) meta.themeId = body.themeId;
    if (body.fps) meta.fps = body.fps;
    res.json(saveMeta(meta));
  }),
);

// ── Uploads (source media / ready audio) ────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(projectDir(req.params.slug), "assets");
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, `upload-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

app.post(
  "/api/projects/:slug/upload",
  upload.single("file"),
  wrap(async (req, res) => {
    const slug = req.params.slug;
    const meta = getMeta(slug);
    const kind = z.enum(["audio", "video"]).parse(String(req.query.kind ?? "audio"));
    if (!req.file) throw new StudioError("No file uploaded", 400, "BAD_REQUEST");
    const uploadedPath = req.file.path;

    if (kind === "audio") {
      updateStep(slug, "tts", "running", "importing upload");
      try {
        const wav = await normalizeAudio(uploadedPath, projectDir(slug), slug);
        meta.audioFile = path.relative(projectDir(slug), wav);
        meta.totalDuration = await detectDuration(wav);
        meta.steps.tts = { state: "done", detail: "uploaded audio", at: new Date().toISOString() };
        saveMeta(meta);
        res.json(meta);
      } catch (err) {
        updateStep(slug, "tts", "error", err instanceof Error ? err.message : String(err));
        throw err;
      } finally {
        fs.rmSync(uploadedPath, { force: true });
      }
    } else {
      // Source video (showcase / talking-cut)
      meta.sourceMedia = path.relative(projectDir(slug), uploadedPath);
      const srcFps = await detectFps(uploadedPath);
      meta.fps = mapFps(srcFps);
      saveMeta(meta);
      res.json({ ...meta, srcFps });
    }
  }),
);

// ── Pipeline steps ──────────────────────────────────────────────────────────
app.post(
  "/api/projects/:slug/steps/script",
  wrap(async (req, res) => {
    const slug = req.params.slug;
    const body = z
      .object({
        topic: z.string().optional(),
        scriptText: z.string().optional(),
        styleHint: z.string().optional(),
      })
      .parse(req.body);
    updateStep(slug, "script", "running");
    try {
      const script = await prepareScript(body);
      const meta = getMeta(slug);
      meta.script = script;
      meta.steps.script = { state: "done", at: new Date().toISOString() };
      saveMeta(meta);
      res.json({ script, meta });
    } catch (err) {
      updateStep(slug, "script", "error", err instanceof Error ? err.message : String(err));
      throw err;
    }
  }),
);

app.post(
  "/api/projects/:slug/steps/tts",
  wrap(async (req, res) => {
    const slug = req.params.slug;
    const body = z.object({ provider: z.enum(["omivoice", "kokoro"]) }).parse(req.body);
    const meta = getMeta(slug);
    requirePipeline(meta.script, "No script yet — run the script step first", "script");
    updateStep(slug, "tts", "running", body.provider);
    try {
      const wav = await synthesize(body.provider, meta.script, projectDir(slug), slug);
      const fresh = getMeta(slug);
      fresh.audioFile = path.relative(projectDir(slug), wav);
      fresh.totalDuration = await detectDuration(wav);
      fresh.steps.tts = { state: "done", detail: body.provider, at: new Date().toISOString() };
      saveMeta(fresh);
      res.json(fresh);
    } catch (err) {
      updateStep(slug, "tts", "error", err instanceof Error ? err.message : String(err));
      throw err;
    }
  }),
);

app.post(
  "/api/projects/:slug/steps/transcribe",
  wrap(async (req, res) => {
    const slug = req.params.slug;
    const meta = getMeta(slug);
    const dir = projectDir(slug);
    if (meta.mode === "talking-cut") {
      requirePipeline(meta.sourceMedia, "Upload the talking-head video first", "source");
    } else if (meta.mode === "showcase") {
      requirePipeline(meta.sourceMedia || meta.audioFile, "Upload showcase audio or video first", "source");
    } else {
      requirePipeline(meta.audioFile, "No audio yet — run TTS or upload audio first", "tts");
    }
    updateStep(slug, "transcribe", "running");
    try {
      let audioPath: string;
      if (meta.mode === "talking-cut") {
        if (!meta.sourceMedia) throw new Error("Upload the talking-head video first");
        // Sync-safe 3-step CFR encode — audio comes from the SAME encode.
        const enc = await syncSafeEncode(
          path.join(dir, meta.sourceMedia),
          path.join(dir, "assets"),
          path.join(dir, "audio"),
          slug,
        );
        meta.mutedVideo = path.relative(dir, enc.mutedVideo);
        meta.audioFile = path.relative(dir, enc.wav);
        meta.fps = enc.mappedFps;
        meta.totalDuration = enc.duration; // ffprobe truth, not Whisper's estimate
        saveMeta(meta);
        audioPath = enc.wav;
      } else if (meta.mode === "showcase" && meta.sourceMedia && !meta.audioFile) {
        const wav = await normalizeAudio(path.join(dir, meta.sourceMedia), dir, slug);
        meta.audioFile = path.relative(dir, wav);
        meta.totalDuration = await detectDuration(wav);
        saveMeta(meta);
        audioPath = wav;
      } else {
        if (!meta.audioFile) throw new Error("No audio yet — run TTS or upload audio first");
        audioPath = path.join(dir, meta.audioFile);
      }

      const { words, model } = await transcribe(audioPath, dir);
      const fresh = getMeta(slug);
      fresh.transcriptFile = "transcript.json";
      // Showcase / talking-cut derive their "script" from the transcript.
      if (!fresh.script) fresh.script = scriptFromTranscript(words);
      fresh.steps.transcribe = {
        state: "done",
        detail: `${words.length} words (${model})`,
        at: new Date().toISOString(),
      };
      saveMeta(fresh);
      res.json({ meta: fresh, wordCount: words.length, model });
    } catch (err) {
      updateStep(slug, "transcribe", "error", err instanceof Error ? err.message : String(err));
      throw err;
    }
  }),
);

app.post(
  "/api/projects/:slug/steps/storyboard",
  wrap(async (req, res) => {
    const slug = req.params.slug;
    const body = z.object({ polish: z.boolean().default(false) }).parse(req.body ?? {});
    const meta = getMeta(slug);
    requirePipeline(meta.script, "No script yet — finish the script or transcription step first", "script");
    requirePipeline(meta.totalDuration, "No audio duration yet — create or upload audio first", "tts");
    requirePipeline(meta.transcriptFile, "No transcript yet — run the transcribe step first", "transcribe");
    const words = readTranscript(slug);
    updateStep(slug, "storyboard", "running");
    try {
      let storyboard = buildStoryboard({
        slug,
        mode: meta.mode,
        themeId: meta.themeId,
        sentences: splitSentences(meta.script),
        words,
        totalDuration: meta.totalDuration,
        title: meta.title,
      });
      if (body.polish && llmAvailable()) {
        storyboard = await polishStoryboard(storyboard);
      }
      saveStoryboard(slug, storyboard);

      const fresh = getMeta(slug);
      if (meta.mode === "talking-cut") {
        const plan = planCutaways(storyboard.scenes, meta.totalDuration, words.length);
        fresh.cutawayIds = plan.sceneIds;
      }
      fresh.steps.storyboard = {
        state: "done",
        detail: `${storyboard.scenes.length} scenes${body.polish ? " (AI-polished)" : ""}`,
        at: new Date().toISOString(),
      };
      saveMeta(fresh);
      res.json({ storyboard, meta: fresh });
    } catch (err) {
      updateStep(slug, "storyboard", "error", err instanceof Error ? err.message : String(err));
      throw err;
    }
  }),
);

app.put(
  "/api/projects/:slug/storyboard",
  wrap(async (req, res) => {
    const slug = req.params.slug;
    const storyboard = req.body; // trusted local tool; validated loosely
    if (!storyboard || !Array.isArray(storyboard.scenes)) throw new Error("Invalid storyboard");
    saveStoryboard(slug, storyboard);
    if (Array.isArray(req.body.cutawayIds)) {
      const meta = getMeta(slug);
      meta.cutawayIds = req.body.cutawayIds;
      saveMeta(meta);
    }
    res.json({ ok: true });
  }),
);

app.post(
  "/api/projects/:slug/steps/compose",
  wrap(async (req, res) => {
    const slug = req.params.slug;
    const body = z
      .object({ subtitles: z.boolean().default(false), selfHeal: z.boolean().default(true) })
      .parse(req.body ?? {});
    const meta = getMeta(slug);
    const dir = projectDir(slug);
    const storyboard = getStoryboard(slug);
    requirePipeline(storyboard, "No storyboard yet — build the storyboard first", "storyboard");
    requirePipeline(meta.audioFile, "No audio yet — create, upload, or extract audio first", "tts");
    updateStep(slug, "compose", "running");
    try {
      const result =
        meta.mode === "talking-cut"
          ? composeTalkingCut(storyboard, {
              mutedVideo: meta.mutedVideo ?? "assets/source-kf.mp4",
              audioFile: meta.audioFile,
              duration: meta.totalDuration ?? storyboard.totalDuration,
              cutawayIds: meta.cutawayIds ?? [],
              subtitles: body.subtitles,
            })
          : composeStandard(storyboard, { audioFile: meta.audioFile, subtitles: body.subtitles });

      // Fetch Pexels assets referenced by pexels-hero scenes (best-effort).
      let assetResults: Awaited<ReturnType<typeof fetchAssets>> = [];
      if (result.assets.length > 0) {
        try {
          assetResults = await fetchAssets(result.assets, dir);
        } catch (err) {
          assetResults = result.assets.map((a) => ({
            file: a.file,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }

      let html = result.html;
      fs.writeFileSync(path.join(dir, "index.html"), html);

      // Lint → optional LLM self-heal (≤2 retries, Cloudflare-template pattern).
      let lint = await lintProject(dir);
      let healAttempts = 0;
      while (lint.errorCount > 0 && body.selfHeal && llmAvailable() && healAttempts < 2) {
        healAttempts++;
        html = await repairComposition(html, lint.findings, healAttempts);
        fs.writeFileSync(path.join(dir, "index.html"), html);
        lint = await lintProject(dir);
      }

      const fresh = getMeta(slug);
      fresh.steps.compose = {
        state: lint.errorCount > 0 ? "error" : "done",
        detail:
          lint.errorCount > 0
            ? `${lint.errorCount} lint error(s)${healAttempts ? ` after ${healAttempts} heal attempt(s)` : ""}`
            : `composed${healAttempts ? ` (self-healed ×${healAttempts})` : ""}`,
        at: new Date().toISOString(),
      };
      saveMeta(fresh);
      res.json({ meta: fresh, lint, healAttempts, assets: assetResults });
    } catch (err) {
      updateStep(slug, "compose", "error", err instanceof Error ? err.message : String(err));
      throw err;
    }
  }),
);

app.post(
  "/api/projects/:slug/steps/lint",
  wrap(async (req, res) => {
    res.json(await lintProject(projectDir(req.params.slug)));
  }),
);

// ── Render (async + SSE progress) ───────────────────────────────────────────
app.post(
  "/api/projects/:slug/steps/render",
  wrap(async (req, res) => {
    const slug = req.params.slug;
    const body = z
      .object({
        fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).optional(),
        quality: z.enum(["draft", "standard", "high"]).default("standard"),
      })
      .parse(req.body ?? {});
    const meta = getMeta(slug);
    const fps = body.fps ?? meta.fps;
    requirePipeline(meta.steps.compose?.state === "done", "No successful composition yet — run Compose first", "compose");
    requirePipeline(
      fs.existsSync(path.join(projectDir(slug), "index.html")),
      "Composition file is missing — run Compose again",
      "compose",
    );
    updateStep(slug, "render", "running", `fps ${fps}, ${body.quality}`);

    // Fire and stream — the response returns immediately.
    void renderProject(slug, projectDir(slug), { fps, quality: body.quality }, (p) =>
      broadcast(slug, "progress", p),
    )
      .then(async (outputPath) => {
        const fresh = getMeta(slug);
        fresh.renderedFile = path.relative(projectDir(slug), outputPath);
        fresh.steps.render = { state: "done", at: new Date().toISOString() };
        saveMeta(fresh);
        ensureThumbnail(slug, projectDir(slug), fresh.renderedFile, fresh.totalDuration ?? 10);
        broadcast(slug, "done", { file: `/projects/${slug}/${fresh.renderedFile}` });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        updateStep(slug, "render", "error", message.slice(0, 500));
        broadcast(slug, "error", { message });
      });

    res.json({ started: true, fps, quality: body.quality });
  }),
);

app.get("/api/projects/:slug/render/stream", (req, res) => {
  const slug = req.params.slug;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("event: connected\ndata: {}\n\n");
  if (!sseClients.has(slug)) sseClients.set(slug, new Set());
  sseClients.get(slug)!.add(res);
  const keepalive = setInterval(() => res.write(": keepalive\n\n"), 15000);
  req.on("close", () => {
    clearInterval(keepalive);
    sseClients.get(slug)?.delete(res);
  });
});

app.post(
  "/api/projects/:slug/render/cancel",
  wrap(async (req, res) => {
    res.json({ cancelled: cancelRender(req.params.slug) });
  }),
);

// ── Open HyperFrames Studio for hand-tuning ─────────────────────────────────
app.post(
  "/api/projects/:slug/preview-studio",
  wrap(async (req, res) => {
    const dir = projectDir(req.params.slug);
    const child = spawn("npx", ["hyperframes", "preview", "--no-open"], {
      cwd: dir,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PATH: `${SERVER_DIR}/node_modules/.bin:${process.env.PATH}` },
    });
    const url = await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 10_000);
      const onData = (chunk: Buffer) => {
        // Strip ANSI color codes before matching — the studio URL is wrapped
        // in escape sequences on stdout.
        const clean = chunk.toString().replace(/\x1b\[[0-9;]*m/g, "");
        const m = clean.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/);
        if (m) {
          clearTimeout(timer);
          resolve(m[0]);
        }
      };
      child.stdout?.on("data", onData);
      child.stderr?.on("data", onData);
    });
    child.unref();
    res.json({ url });
  }),
);

// ── Static: projects (compositions, assets, renders) + built web UI ─────────
app.use("/projects", (req, res, next) => {
  express.static(getSettings().projectsDir)(req, res, next);
});

const webDist = path.resolve(SERVER_DIR, "..", "web", "dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}

app.listen(PORT, () => {
  const s = getSettings();
  console.log(`HyperFrames Video Studio server → http://127.0.0.1:${PORT}`);
  console.log(`Projects dir: ${s.projectsDir}`);
});
