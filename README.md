# HyperFrames Video Studio

A local, open-source AI video production studio built on [HyperFrames](https://github.com/heygen-com/hyperframes). It turns a topic, finished script, narrated media, or talking-head recording into a timed, animated 1080p video from a browser-based workflow.

This repository is an open-source contribution by **Karamjeet Singh Gulati ([@ksg98](https://github.com/ksg98))**. It extends the original [`script-to-video-skill`](https://github.com/pjecuacion/script-to-video-skill) workflow into a complete local application.

## What We Built

`app/` contains **HyperFrames Video Studio**, a Vite + React frontend with an Express + TypeScript pipeline server.

### Video workflows

1. **Script to video** — generate or paste a script, synthesize speech, transcribe it, build a sentence-level storyboard, compose, preview, and render.
2. **Catalog showcase** — upload existing audio or video and map each narrated sentence across the scene catalog.
3. **Talking cut** — upload a talking-head video and add timed graphic cutaways while preserving audio/video synchronization.

### Studio features

- Sora-inspired dark gallery with poster frames and muted hover playback
- Floating project launcher and guided production wizard
- 30 animated scene templates, including kinetic type, statistics, counters, lists, comparisons, charts, Pexels media, Three.js, Canvas, and HUD scenes
- 10 theme presets with configurable typography, captions, colors, and transitions
- Editable sentence-level storyboard and talking-cut cutaway selection
- Instant HyperFrames Player preview and Studio handoff
- In-process MP4 rendering with live SSE progress
- Automatic ffmpeg poster-frame extraction
- Pexels asset fetching for stock photo/video scenes
- Pipeline validation, actionable errors, linting, and optional composition self-healing

### AI and voice providers

- Anthropic-powered topic writing, storyboard polish, and composition repair
- OpenAI-compatible endpoints with live model discovery and reasoning-effort selection
- Local Kokoro TTS through a reproducible uv-managed Python 3.12 environment
- OmiVoice voice cloning
- Uploaded audio as a provider-independent fallback
- Local Whisper transcription through HyperFrames

## Architecture

```text
script-to-video-skill/
├── SKILL.md                 # original skill workflow
├── themes/                  # reusable visual themes
└── app/
    ├── server/              # Express + TypeScript pipeline API
    │   └── src/templates/   # 30 HyperFrames scene templates
    ├── web/                 # Vite + React studio interface
    └── python/              # uv-locked Kokoro runtime
```

Projects are stored outside the repository by default at:

```text
~/HyperframesApp/projects/<project-slug>/
```

Application settings are stored outside the repository at:

```text
~/.hyperframes-app/settings.json
```

## Requirements

- Node.js 22+
- `ffmpeg` and `ffprobe`
- [`uv`](https://docs.astral.sh/uv/) and Python 3.12 for local Kokoro speech
- Sufficient disk space for Chromium, Whisper, and Kokoro model downloads

Optional integrations:

- Anthropic API key
- OpenAI-compatible API endpoint and key
- Pexels API key
- Local OmiVoice server and reference voice

## Run Locally

```bash
cd app
npm install
npm run setup:kokoro
npm run dev
```

Open:

```text
http://localhost:5173
```

The API runs at `http://127.0.0.1:4600`.

## Validation

```bash
cd app
npm test
npm run typecheck
npm run build
```

The verified script-mode pipeline completes:

```text
Script → Kokoro TTS → Whisper → Storyboard → Compose → Lint → Render → MP4
```

## Security

- Do not commit `.env`, `.claude/settings.local.json`, or runtime settings files.
- API keys are redacted in public settings responses.
- Local settings currently remain plaintext on disk and should be protected as credentials.
- Review generated compositions and third-party media licensing before publishing a video.

## License

Licensed under the [MIT License](LICENSE).
