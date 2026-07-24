import { useEffect, useState } from "react";
import { submitScript } from "../api";
import { Button, ErrorBox, Field, Panel } from "../components";
import type { WizardStepProps } from "./Wizard";

type Tab = "topic" | "paste";

export default function ScriptStep({ slug, meta, doctor, refresh }: WizardStepProps) {
  const llmOn = Boolean(doctor?.llm);
  const [tab, setTab] = useState<Tab>(meta.script ? "paste" : llmOn ? "topic" : "paste");
  const [topic, setTopic] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [pasted, setPasted] = useState("");
  const [script, setScript] = useState(meta.script ?? "");
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScript(meta.script ?? "");
    setDirty(false);
  }, [meta.script]);

  async function run(body: { topic?: string; scriptText?: string; styleHint?: string }) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitScript(slug, body);
      setScript(result.script);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setSubmitting(false);
    }
  }

  function handleGenerate() {
    if (!topic.trim()) {
      setError("Enter a topic first.");
      return;
    }
    void run({ topic: topic.trim(), styleHint: styleHint.trim() || undefined });
  }

  function handlePaste() {
    if (!pasted.trim()) {
      setError("Paste a script first.");
      return;
    }
    void run({ scriptText: pasted });
  }

  function handleSaveEdit() {
    void run({ scriptText: script });
  }

  return (
    <div className="step">
      <Panel title="Script">
        <ErrorBox message={error} />

        <div className="tabs">
          <button type="button" className={`tab${tab === "topic" ? " active" : ""}`} onClick={() => setTab("topic")}>
            Topic (AI)
          </button>
          <button type="button" className={`tab${tab === "paste" ? " active" : ""}`} onClick={() => setTab("paste")}>
            Paste script
          </button>
        </div>

        {tab === "topic" ? (
          <div className="tab-panel">
            {!llmOn ? (
              <p className="field-hint">
                Topic→script generation needs an Anthropic API key. Add one in Settings, or paste a finished script in
                the other tab.
              </p>
            ) : null}
            <Field label="Topic" htmlFor="script-topic">
              <textarea
                id="script-topic"
                className="input textarea"
                rows={3}
                disabled={!llmOn}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why async Rust is hard to learn"
              />
            </Field>
            <Field label="Style hint (optional)" htmlFor="script-style">
              <input
                id="script-style"
                className="input"
                disabled={!llmOn}
                value={styleHint}
                onChange={(e) => setStyleHint(e.target.value)}
                placeholder="e.g. punchy, confident, for developers"
              />
            </Field>
            <div className="button-row">
              <Button onClick={handleGenerate} disabled={!llmOn} loading={submitting}>
                Generate script
              </Button>
            </div>
          </div>
        ) : (
          <div className="tab-panel">
            <Field label="Script text" htmlFor="script-paste">
              <textarea
                id="script-paste"
                className="input textarea"
                rows={8}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste your voiceover script…"
              />
            </Field>
            <div className="button-row">
              <Button onClick={handlePaste} loading={submitting}>
                Use this script
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {script ? (
        <Panel
          title="Current script"
          actions={
            dirty ? (
              <Button onClick={handleSaveEdit} loading={submitting}>
                Save edits
              </Button>
            ) : null
          }
        >
          <textarea
            className="input textarea"
            rows={10}
            value={script}
            onChange={(e) => {
              setScript(e.target.value);
              setDirty(true);
            }}
          />
        </Panel>
      ) : null}
    </div>
  );
}
