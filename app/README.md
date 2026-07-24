# HyperFrames Video Studio

A locally-running, UI-based app for the `script-to-video` pipeline in this repo — built on
[HyperFrames](https://github.com/heygen-com/hyperframes), HeyGen's open-source HTML-to-video engine.

Turn a topic, a finished script, an audio file, or a talking-head video into a themed,
scene-by-scene animated MP4 — from the browser instead of a chat session.

## What it does

| Mode | Input | Pipeline |
|---|---|---|
| **Script-to-video** | Topic (AI) or pasted script | script → TTS → Whisper transcript → sentence storyboard → themed composition → MP4 |
| **Catalog showcase** | Existing audio/video file | transcribe → one unique scene type per sentence (priority order) → MP4 |
| **Talking-cut** | Talking-head video | sync-safe CFR re-encode → transcribe → graphic cutaway overlays (≥3s gaps) → MP4 |

Under the hood it ports this repo's `SKILL.md` to TypeScript: the ~30-type scene template
catalog, the sentence→scene-type rules, the 10 themes in `themes/*.json`, the captions system,
and the talking-cut sync-safe encode. Rendering runs in-process via `@hyperframes/producer`;
instant preview uses the `<hyperframes-player>` web component (no render needed).

## Requirements

- Node.js 22+
- `ffmpeg` + `ffprobe` on PATH
- `uv` plus Python 3.12 for the local Kokoro voice runtime
- ~2 GB disk for headless Chromium, Whisper, and voice models (downloaded on first use)

Optional:
- **Anthropic API key** — unlocks topic→script writing, AI storyboard polish, and lint self-healing
- **Pexels API key** — unlocks `pexels-hero` stock photo/video scenes
- **OmiVoice server** — your local gradio voice-clone server for a custom voice

## Run

```bash
cd app
npm install
npm run setup:kokoro # one-time local Python 3.12 voice runtime
npm run dev           # server on :4600, UI on http://localhost:5173
```

Production-ish: `npm run build && npm start` (serves the built UI from :4600).

Projects are stored in `~/HyperframesApp/projects/<slug>/` (changeable in Settings), each with
`storyboard.json`, `index.html`, `transcript.json`, `audio/`, `assets/`, `renders/`.

Check **Settings → Doctor** on first run — it verifies Node, ffmpeg, the HyperFrames CLI, and the selected Kokoro Python runtime. The first successful synthesis may also download Kokoro model and voice files.

## Wizard flow

1. **Script / Source** — topic (AI) or paste a script; or upload the source media
2. **Theme** — pick one of the 10 themes (Shadow Cut default)
3. **Voice** — OmiVoice / Kokoro / upload a WAV-MP3 (script mode)
4. **Transcribe** — word-level timestamps via local Whisper (`hyperframes transcribe`)
5. **Storyboard** — auto-assigned scene types, editable per sentence; optional AI polish
6. **Preview** — compose + lint (with fix hints), instant player preview, "Open in Studio"
7. **Render** — 24/30/60 fps, quality preset, live progress, MP4 download

## Notes

- The composition contract follows the official docs: `class="clip"` on timed divs, one paused
  GSAP timeline on `window.__timelines`, fixed 1920×1080 viewport.
- Captions always use your original script sentences, never raw transcript tokens.
- Talking-cut extracts audio from the *same* CFR encode as the video — the confirmed lip-sync fix.
