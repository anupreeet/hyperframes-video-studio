import { useEffect, useState } from "react";
import {
  getDoctor,
  getLlmModels,
  getSettings,
  getThemes,
  saveSettings,
  type AppSettings,
  type DoctorResult,
  type LlmEffort,
  type PublicAppSettings,
  type Theme,
} from "../api";
import { Badge, Button, ErrorBox, Field, Panel, Spinner } from "../components";

function toForm(s: PublicAppSettings): AppSettings {
  return {
    projectsDir: s.projectsDir,
    omivoiceUrl: s.omivoiceUrl,
    omivoiceRefVoice: s.omivoiceRefVoice,
    pexelsApiKey: s.pexelsApiKey,
    anthropicApiKey: s.anthropicApiKey,
    openaiBaseUrl: s.openaiBaseUrl,
    openaiApiKey: s.openaiApiKey,
    openaiModel: s.openaiModel,
    openaiEffort: s.openaiEffort,
    defaultThemeId: s.defaultThemeId,
    defaultFps: s.defaultFps,
    kokoroVoice: s.kokoroVoice,
  };
}

const EFFORTS: { value: LlmEffort; label: string }[] = [
  { value: "", label: "Default (off)" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "X-High" },
  { value: "max", label: "Max" },
];

export default function Settings() {
  const [form, setForm] = useState<AppSettings | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [doctor, setDoctor] = useState<DoctorResult | null>(null);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);

  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  async function fetchModels(baseUrl: string, apiKey: string) {
    const url = baseUrl.trim();
    if (!url) {
      setModels([]);
      setModelsError(null);
      return;
    }
    setModelsLoading(true);
    setModelsError(null);
    try {
      setModels((await getLlmModels(url, apiKey.trim())).models);
    } catch (err) {
      setModels([]);
      setModelsError(err instanceof Error ? err.message : String(err));
    } finally {
      setModelsLoading(false);
    }
  }

  async function loadSettings() {
    try {
      setLoadError(null);
      const [settings, themeList] = await Promise.all([getSettings(), getThemes()]);
      setForm(toForm(settings));
      setThemes(themeList);
      if (settings.openaiBaseUrl) void fetchModels(settings.openaiBaseUrl, settings.openaiApiKey);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadDoctor() {
    setDoctorLoading(true);
    setDoctorError(null);
    try {
      setDoctor(await getDoctor());
    } catch (err) {
      setDoctorError(err instanceof Error ? err.message : String(err));
    } finally {
      setDoctorLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
    void loadDoctor();
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSavedAt(null);
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveSettings(form);
      setForm(toForm(saved));
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorBox message={loadError} />

      {!form ? (
        <div className="empty-state">
          <Spinner />
          <p>Loading settings…</p>
        </div>
      ) : (
        <Panel
          title="General"
          actions={
            <Button onClick={() => void handleSave()} loading={saving}>
              {savedAt ? "Saved" : "Save"}
            </Button>
          }
        >
          <ErrorBox message={saveError} />
          <div className="form-grid">
            <Field label="Projects directory" htmlFor="projectsDir" hint="Where project folders are created on disk.">
              <input
                id="projectsDir"
                className="input mono"
                value={form.projectsDir}
                onChange={(e) => update("projectsDir", e.target.value)}
              />
            </Field>

            <Field label="OmiVoice URL" htmlFor="omivoiceUrl" hint="Local OmiVoice TTS server, e.g. http://127.0.0.1:8261">
              <input
                id="omivoiceUrl"
                className="input mono"
                value={form.omivoiceUrl}
                onChange={(e) => update("omivoiceUrl", e.target.value)}
              />
            </Field>

            <Field label="OmiVoice reference voice" htmlFor="omivoiceRefVoice" hint="Path to a reference voice sample file.">
              <input
                id="omivoiceRefVoice"
                className="input mono"
                value={form.omivoiceRefVoice}
                onChange={(e) => update("omivoiceRefVoice", e.target.value)}
              />
            </Field>

            <Field label="Kokoro voice" htmlFor="kokoroVoice" hint="Built-in TTS voice id, e.g. af_heart">
              <input
                id="kokoroVoice"
                className="input mono"
                value={form.kokoroVoice}
                onChange={(e) => update("kokoroVoice", e.target.value)}
              />
            </Field>

            <Field label="Pexels API key" htmlFor="pexelsApiKey" hint="Needed for pexels-hero scenes. Leave as ••• to keep the saved key.">
              <input
                id="pexelsApiKey"
                type="password"
                className="input mono"
                value={form.pexelsApiKey}
                onChange={(e) => update("pexelsApiKey", e.target.value)}
              />
            </Field>

            <Field
              label="Anthropic API key"
              htmlFor="anthropicApiKey"
              hint="Enables AI assists (topic→script, storyboard polish, compose self-heal). Leave as ••• to keep the saved key."
            >
              <input
                id="anthropicApiKey"
                type="password"
                className="input mono"
                value={form.anthropicApiKey}
                onChange={(e) => update("anthropicApiKey", e.target.value)}
              />
            </Field>

            <Field
              label="OpenAI-compatible URL"
              htmlFor="openaiBaseUrl"
              hint="Ollama: http://127.0.0.1:11434/v1 · LM Studio: http://127.0.0.1:1234/v1 · OpenRouter: https://openrouter.ai/api/v1. When URL + model are set, AI assists use this instead of Anthropic."
            >
              <input
                id="openaiBaseUrl"
                className="input mono"
                placeholder="http://127.0.0.1:11434/v1"
                value={form.openaiBaseUrl}
                onChange={(e) => update("openaiBaseUrl", e.target.value)}
                onBlur={() => void fetchModels(form.openaiBaseUrl, form.openaiApiKey)}
              />
            </Field>

            <Field
              label="OpenAI-compatible API key"
              htmlFor="openaiApiKey"
              hint="Optional — most local servers need none. Leave as ••• to keep the saved key."
            >
              <input
                id="openaiApiKey"
                type="password"
                className="input mono"
                value={form.openaiApiKey}
                onChange={(e) => update("openaiApiKey", e.target.value)}
                onBlur={() => void fetchModels(form.openaiBaseUrl, form.openaiApiKey)}
              />
            </Field>

            <Field
              label="Model"
              htmlFor="openaiModel"
              hint={modelsError ?? (models.length ? `${models.length} models available` : "Set the URL, then refresh to list models.")}
            >
              <div className="flex items-center gap-2">
                <select
                  id="openaiModel"
                  className="input"
                  value={form.openaiModel}
                  onChange={(e) => update("openaiModel", e.target.value)}
                >
                  <option value="">— none —</option>
                  {form.openaiModel && !models.includes(form.openaiModel) ? (
                    <option value={form.openaiModel}>{form.openaiModel} (saved)</option>
                  ) : null}
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  loading={modelsLoading}
                  onClick={() => void fetchModels(form.openaiBaseUrl, form.openaiApiKey)}
                  className="shrink-0"
                >
                  Refresh
                </Button>
              </div>
            </Field>

            <Field label="Reasoning effort" htmlFor="openaiEffort" hint="Sent as reasoning_effort when supported by the model.">
              <select
                id="openaiEffort"
                className="input"
                value={form.openaiEffort}
                onChange={(e) => update("openaiEffort", e.target.value as LlmEffort)}
              >
                {EFFORTS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Default theme" htmlFor="defaultThemeId">
              <select
                id="defaultThemeId"
                className="input"
                value={form.defaultThemeId}
                onChange={(e) => update("defaultThemeId", e.target.value)}
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Default fps" htmlFor="defaultFps">
              <select
                id="defaultFps"
                className="input"
                value={form.defaultFps}
                onChange={(e) => update("defaultFps", Number(e.target.value) as 24 | 30 | 60)}
              >
                <option value={24}>24</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </Field>
          </div>
        </Panel>
      )}

      <Panel
        title="Doctor"
        actions={
          <Button variant="ghost" onClick={() => void loadDoctor()} loading={doctorLoading}>
            Recheck
          </Button>
        }
      >
        <ErrorBox message={doctorError} />
        {doctorLoading && !doctor ? (
          <div className="empty-state">
            <Spinner />
            <p>Running checks…</p>
          </div>
        ) : null}
        {doctor ? (
          <>
            <div className="doctor-llm-row">
              <Badge tone={doctor.llm ? "done" : "neutral"}>AI assists: {doctor.llm ? "on" : "off"}</Badge>
              {!doctor.llm ? (
                <span className="field-hint">
                  Add an Anthropic API key above to enable topic→script, storyboard polish, and compose self-heal.
                </span>
              ) : null}
            </div>
            <ul className="doctor-list">
              {doctor.checks.map((check) => (
                <li key={check.name} className={`doctor-item ${check.ok ? "ok" : "bad"}`}>
                  <span className="doctor-icon" aria-hidden="true">
                    {check.ok ? "✓" : "✗"}
                  </span>
                  <span className="doctor-name">{check.name}</span>
                  <span className="doctor-detail mono">{check.detail}</span>
                </li>
              ))}
            </ul>
            {!doctor.kokoro.ok && doctor.kokoro.remediation ? (
              <p className="field-hint">
                Kokoro setup: <span className="mono">{doctor.kokoro.remediation}</span>
              </p>
            ) : null}
          </>
        ) : null}
      </Panel>
    </div>
  );
}
