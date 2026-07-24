import { useState } from "react";
import { openPreviewStudio, runCompose, type ComposeResult } from "../api";
import { Badge, Button, ErrorBox, Panel, Toggle } from "../components";
import type { WizardStepProps } from "./Wizard";

export default function PreviewStep({ slug, meta, doctor, refresh, blockedReason }: WizardStepProps) {
  const llmOn = Boolean(doctor?.llm);
  const [subtitles, setSubtitles] = useState(false);
  const [selfHeal, setSelfHeal] = useState(true);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioLoading, setStudioLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(() => Date.now());

  const composed = meta.steps.compose?.state === "done" || result !== null;

  async function handleCompose() {
    setComposing(true);
    setError(null);
    try {
      const res = await runCompose(slug, { subtitles, selfHeal: selfHeal && llmOn });
      setResult(res);
      setPreviewVersion(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setComposing(false);
    }
  }

  async function handleOpenStudio() {
    setStudioLoading(true);
    setStudioError(null);
    try {
      const { url } = await openPreviewStudio(slug);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setStudioError("HyperFrames Studio didn't report a URL in time. Make sure the CLI is installed and try again.");
      }
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : String(err));
    } finally {
      setStudioLoading(false);
    }
  }

  return (
    <div className="step">
      <Panel title="Compose">
        <ErrorBox message={error} />
        {blockedReason ? <p className="field-hint">{blockedReason}</p> : null}
        <div className="toggle-group">
          <Toggle checked={subtitles} onChange={setSubtitles} label="Burn in subtitles" />
          <Toggle
            checked={selfHeal}
            onChange={setSelfHeal}
            label="Self-heal lint errors with AI"
            disabled={!llmOn}
            hint={llmOn ? undefined : "Needs an Anthropic API key in Settings"}
          />
        </div>
        <div className="button-row">
          <Button onClick={() => void handleCompose()} loading={composing} disabled={Boolean(blockedReason)}>
            Compose
          </Button>
        </div>
      </Panel>

      {result ? (
        <Panel title="Lint results">
          <div className="lint-summary">
            <Badge tone={result.lint.errorCount > 0 ? "error" : "done"}>{result.lint.errorCount} errors</Badge>
            <Badge tone={result.lint.warningCount > 0 ? "warn" : "neutral"}>{result.lint.warningCount} warnings</Badge>
            {result.healAttempts > 0 ? <Badge tone="info">self-healed ×{result.healAttempts}</Badge> : null}
          </div>
          {result.lint.findings.length > 0 ? (
            <ul className="lint-findings">
              {result.lint.findings.map((f, i) => (
                <li key={i} className="lint-finding">
                  <p>
                    {f.severity ? <Badge tone={f.severity === "error" ? "error" : "warn"}>{f.severity}</Badge> : null}{" "}
                    {f.message ?? "Unspecified lint finding"}
                    {(f.rule ?? f.ruleId) ? <span className="mono lint-rule"> ({f.rule ?? f.ruleId})</span> : null}
                  </p>
                  {f.hint ? <p className="accent-box">{f.hint}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {result.assets.some((a) => !a.ok) ? (
            <div className="asset-failures">
              <p className="field-hint">Some assets failed to fetch:</p>
              <ul className="lint-findings">
                {result.assets
                  .filter((a) => !a.ok)
                  .map((a) => (
                    <li key={a.file} className="lint-finding">
                      <span className="mono">{a.file}</span> — {a.error ?? "unknown error"}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      ) : null}

      {composed ? (
        <Panel
          title="Preview"
          actions={
            <Button variant="ghost" onClick={() => void handleOpenStudio()} loading={studioLoading}>
              Open in HyperFrames Studio
            </Button>
          }
        >
          <ErrorBox message={studioError} />
          <hyperframes-player
            src={`/projects/${slug}/index.html?v=${previewVersion}`}
            controls=""
            style={{ width: "100%", aspectRatio: "16 / 9" }}
          />
        </Panel>
      ) : null}
    </div>
  );
}
