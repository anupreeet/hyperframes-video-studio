import { useRef, useState } from "react";
import { uploadFile, type ProjectMode } from "../api";
import { ErrorBox, Panel } from "../components";
import type { WizardStepProps } from "./Wizard";

function acceptFor(mode: ProjectMode): string {
  return mode === "showcase" ? "video/*,audio/*" : "video/*";
}

function basename(p: string): string {
  return p.split("/").pop() ?? p;
}

export default function SourceStep({ slug, meta, refresh }: WizardStepProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [srcFps, setSrcFps] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    setSrcFps(null);
    try {
      const kind = meta.mode === "showcase" && file.type.startsWith("audio/") ? "audio" : "video";
      const result = await uploadFile(slug, kind, file);
      if (typeof result.srcFps === "number") setSrcFps(result.srcFps);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const uploadedName = meta.sourceMedia ? basename(meta.sourceMedia) : meta.audioFile ? basename(meta.audioFile) : null;

  return (
    <div className="step">
      <Panel title="Source media">
        <ErrorBox message={error} />
        <p className="field-hint">
          {meta.mode === "talking-cut"
            ? "Upload the talking-head video. It will be re-encoded with a sync-safe constant frame rate before transcription."
            : "Upload the video or audio file to showcase. It will be transcribed and mapped to a unique scene type per sentence."}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="file-input"
          accept={acceptFor(meta.mode)}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {uploading ? <p className="field-hint">Uploading…</p> : null}
        {uploadedName ? (
          <div className="upload-summary">
            <p>
              Uploaded: <span className="mono">{uploadedName}</span>
            </p>
            {srcFps ? (
              <p>
                Detected source fps: {srcFps} → mapped to {meta.fps}
              </p>
            ) : (
              <p>Project fps: {meta.fps}</p>
            )}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
