import { useEffect, useRef, useState } from "react";
import { cancelRender, renderStreamUrl, startRender } from "../api";
import { Button, ErrorBox, Panel } from "../components";
import type { WizardStepProps } from "./Wizard";

/** SSE `progress` event payload. `percent` is already 0–100 (the producer
 *  clamps + rounds server-side), not a 0–1 fraction. */
interface RenderProgress {
  percent: number;
  stage: string;
  message: string;
}

export default function RenderStep({ slug, meta, refresh, blockedReason }: WizardStepProps) {
  const [fps, setFps] = useState<24 | 30 | 60>(meta.fps);
  const [quality, setQuality] = useState<"draft" | "standard" | "high">("standard");
  const [starting, setStarting] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [renderedFile, setRenderedFile] = useState<string | null>(
    meta.renderedFile ? `/projects/${slug}/${meta.renderedFile}` : null,
  );
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(
    () => () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    },
    [],
  );

  function openStream() {
    sourceRef.current?.close();
    const es = new EventSource(renderStreamUrl(slug));
    sourceRef.current = es;

    es.addEventListener("progress", (e) => {
      try {
        setProgress(JSON.parse((e as MessageEvent).data) as RenderProgress);
      } catch {
        // malformed progress frame — ignore, next one will arrive shortly
      }
    });
    es.addEventListener("done", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { file: string };
        setRenderedFile(data.file);
      } catch {
        setError("Render finished but the output file could not be read from the event payload.");
      }
      setRendering(false);
      es.close();
      void refresh();
    });
    es.addEventListener("error", (e) => {
      // "error" fires both for the server's named `event: error` frames (has
      // .data) and for a bare EventSource connection failure (plain Event,
      // no .data) — surface a message either way rather than going quiet.
      const data = (e as MessageEvent).data as string | undefined;
      if (data) {
        try {
          setError((JSON.parse(data) as { message: string }).message);
        } catch {
          setError("Render failed.");
        }
      } else {
        setError("Lost connection to the render progress stream. The render may still be running — check back or try again.");
      }
      setRendering(false);
      es.close();
      void refresh();
    });
  }

  async function handleRender() {
    setStarting(true);
    setError(null);
    setProgress(null);
    try {
      await startRender(slug, { fps, quality });
      setRendering(true);
      openStream();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setStarting(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelRender(slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setCancelling(false);
    }
  }

  const percent = Math.max(0, Math.min(100, Math.round(progress?.percent ?? 0)));

  return (
    <div className="step">
      <Panel title="Render">
        <ErrorBox message={error} />
        {blockedReason ? <p className="field-hint">{blockedReason}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span className="field-label">FPS</span>
            <select
              className="input"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value) as 24 | 30 | 60)}
              disabled={rendering}
            >
              <option value={24}>24</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Quality</span>
            <select
              className="input"
              value={quality}
              onChange={(e) => setQuality(e.target.value as "draft" | "standard" | "high")}
              disabled={rendering}
            >
              <option value="draft">Draft</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        <div className="button-row">
          <Button onClick={() => void handleRender()} loading={starting} disabled={rendering || Boolean(blockedReason)}>
            Render
          </Button>
          {rendering ? (
            <Button variant="danger" onClick={() => void handleCancel()} loading={cancelling}>
              Cancel
            </Button>
          ) : null}
        </div>

        {rendering || progress ? (
          <div className="render-progress">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="field-hint">
              {progress ? `${progress.stage} — ${progress.message} (${percent}%)` : "Starting…"}
            </p>
          </div>
        ) : null}
      </Panel>

      {renderedFile ? (
        <Panel title="Rendered video">
          <video controls src={renderedFile} style={{ width: "100%" }} />
          <div className="button-row">
            <a
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary"
              href={renderedFile}
              download
            >
              Download
            </a>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
