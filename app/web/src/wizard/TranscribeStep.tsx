import { useState } from "react";
import { runTranscribe } from "../api";
import { Button, ErrorBox, Panel, Spinner } from "../components";
import type { WizardStepProps } from "./Wizard";

export default function TranscribeStep({ slug, meta, refresh, blockedReason }: WizardStepProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ wordCount: number; model: string } | null>(null);

  const isTalkingCut = meta.mode === "talking-cut";
  const lastDetail = meta.steps.transcribe?.detail;

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const res = await runTranscribe(slug);
      setResult({ wordCount: res.wordCount, model: res.model });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setRunning(false);
    }
  }

  return (
    <div className="step">
      <Panel title={isTalkingCut ? "Sync-safe encode + transcribe" : "Transcribe"}>
        <ErrorBox message={error} />
        {blockedReason ? <p className="field-hint">{blockedReason}</p> : null}
        {isTalkingCut ? (
          <p className="field-hint">
            Runs a 3-step constant-frame-rate re-encode of the source video before transcribing, so the video, audio
            track, and word timestamps all share one timing baseline — this is what prevents lip-sync drift.
          </p>
        ) : (
          <p className="field-hint">Runs Whisper to produce word-level timestamps used to align the storyboard.</p>
        )}
        {running ? (
          <p className="field-hint running-hint">
            <Spinner size={14} />
            <span>Can take a few minutes on the first run — the Whisper model downloads once, then it's cached.</span>
          </p>
        ) : null}
        <div className="button-row">
          <Button onClick={() => void handleRun()} loading={running} disabled={Boolean(blockedReason)}>
            {isTalkingCut ? "Encode + transcribe" : "Transcribe"}
          </Button>
        </div>
        {result ? (
          <p className="field-hint">
            {result.wordCount} words transcribed with model <span className="mono">{result.model}</span>.
          </p>
        ) : lastDetail ? (
          <p className="field-hint">Last run: {lastDetail}</p>
        ) : null}
      </Panel>
    </div>
  );
}
