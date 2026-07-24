import { useEffect, useState } from "react";
import { getThemes, patchProject, type Theme } from "../api";
import { ErrorBox, Panel, Spinner } from "../components";
import type { WizardStepProps } from "./Wizard";

export default function ThemeStep({ slug, meta, refresh }: WizardStepProps) {
  const [themes, setThemes] = useState<Theme[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getThemes()
      .then(setThemes)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, []);

  async function select(themeId: string) {
    if (themeId === meta.themeId || saving) return;
    setSaving(themeId);
    setSaveError(null);
    try {
      await patchProject(slug, { themeId });
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="step">
      <Panel title="Theme">
        <ErrorBox message={loadError} />
        <ErrorBox message={saveError} />
        {!themes ? (
          <div className="empty-state">
            <Spinner />
            <p>Loading themes…</p>
          </div>
        ) : (
          <div className="theme-grid">
            {themes.map((theme) => {
              const selected = theme.id === meta.themeId;
              return (
                <button
                  type="button"
                  key={theme.id}
                  className={`theme-card${selected ? " selected" : ""}`}
                  style={{ background: theme.colors.bg }}
                  onClick={() => void select(theme.id)}
                  disabled={saving !== null}
                >
                  <span className="theme-card-accent" style={{ background: theme.colors.accent }} />
                  <span className="theme-card-title" style={{ fontFamily: theme.typography.fontFamily, color: theme.colors.text }}>
                    {theme.name}
                  </span>
                  <span className="theme-card-desc" style={{ color: theme.colors.muted }}>
                    {theme.description}
                  </span>
                  <span className="theme-card-moods">
                    {theme.mood.map((m) => (
                      <span key={m} className="theme-mood-tag" style={{ borderColor: theme.colors.muted, color: theme.colors.muted }}>
                        {m}
                      </span>
                    ))}
                  </span>
                  <span className="theme-card-footer">
                    {saving === theme.id ? <Spinner size={14} /> : selected ? <span className="theme-card-selected">✓ Selected</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
