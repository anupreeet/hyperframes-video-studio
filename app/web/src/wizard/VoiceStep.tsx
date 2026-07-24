import { useRef, useState } from "react";
import { submitTts, uploadFile } from "../api";
import { Badge, Button, ErrorBox, Panel } from "../components";
import type { WizardStepProps } from "./Wizard";

type Provider = "kokoro" | "omivoice" | "upload";

export default function VoiceStep({ slug, meta, doctor, refresh, blockedReason }: WizardStepProps) {
  const [provider, setProvider] = useState<Provider>("kokoro");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const kokoroReady = Boolean(doctor?.kokoro.ok);

  async function handleSynthesize() {
    setSubmitting(true);
    setError(null);
    try {
      await submitTts(slug, provider === "omivoice" ? "omivoice" : "kokoro");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setSubmitting(false);
    }
  }

  async function handleUpload(file: File) {
    setSubmitting(true);
    setError(null);
    try {
      await uploadFile(slug, "audio", file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setSubmitting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="step">
      <Panel title="Voice">
        <ErrorBox message={error} />
        {!meta.script ? <p className="field-hint">Finish the Script step first — voice synthesis needs a script.</p> : null}

        <div className="option-list">
          <label className={`option-card${provider === "kokoro" ? " selected" : ""}`}>
            <input type="radio" name="voice-provider" checked={provider === "kokoro"} onChange={() => setProvider("kokoro")} />
            <span className="option-card-title">
              Kokoro <Badge tone="info">default</Badge>
            </span>
            <span className="option-card-desc">No API key. Requires a one-time local Kokoro runtime setup.</span>
          </label>
          <label className={`option-card${provider === "omivoice" ? " selected" : ""}`}>
            <input type="radio" name="voice-provider" checked={provider === "omivoice"} onChange={() => setProvider("omivoice")} />
            <span className="option-card-title">OmiVoice</span>
            <span className="option-card-desc">Needs a local OmiVoice server running — set its URL in Settings.</span>
          </label>
          <label className={`option-card${provider === "upload" ? " selected" : ""}`}>
            <input type="radio" name="voice-provider" checked={provider === "upload"} onChange={() => setProvider("upload")} />
            <span className="option-card-title">Upload audio</span>
            <span className="option-card-desc">Use your own pre-recorded voiceover file.</span>
          </label>
        </div>

        {provider === "kokoro" && !kokoroReady ? (
          <p className="field-hint">
            {doctor?.kokoro.detail ?? "Checking the local Kokoro runtime…"}
            {doctor?.kokoro.remediation ? (
              <>
                {" "}
                <span className="mono">{doctor.kokoro.remediation}</span>
              </>
            ) : null}
          </p>
        ) : provider === "kokoro" ? (
          <p className="field-hint">The first synthesis may download the Kokoro model and voice files.</p>
        ) : null}

        {provider === "upload" ? (
          <input
            ref={inputRef}
            type="file"
            className="file-input"
            accept="audio/*"
            disabled={submitting}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        ) : (
          <div className="button-row">
            <Button
              onClick={() => void handleSynthesize()}
              loading={submitting}
              disabled={Boolean(blockedReason) || !meta.script || (provider === "kokoro" && !kokoroReady)}
            >
              Synthesize with {provider === "omivoice" ? "OmiVoice" : "Kokoro"}
            </Button>
          </div>
        )}
      </Panel>

      {meta.audioFile ? (
        <Panel title="Voiceover audio">
          <audio controls src={`/projects/${slug}/${meta.audioFile}`} />
          {meta.totalDuration ? <p className="field-hint">Duration: {meta.totalDuration.toFixed(1)}s</p> : null}
        </Panel>
      ) : null}
    </div>
  );
}
