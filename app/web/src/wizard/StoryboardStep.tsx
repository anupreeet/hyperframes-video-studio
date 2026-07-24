import { useEffect, useMemo, useState } from "react";
import {
  buildStoryboardStep,
  saveStoryboard,
  SCENE_TYPES,
  type SceneType,
  type Storyboard,
} from "../api";
import { Badge, Button, ErrorBox, Panel, Toggle } from "../components";
import type { WizardStepProps } from "./Wizard";

const MIN_CUTAWAY_GAP = 3;

function truncate(text: string, max = 64): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function StoryboardStep({ slug, meta, storyboard, doctor, refresh, blockedReason }: WizardStepProps) {
  const [local, setLocal] = useState<Storyboard | null>(storyboard);
  const [cutawayIds, setCutawayIds] = useState<number[]>(meta.cutawayIds ?? []);
  const [polish, setPolish] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Resync from the server whenever a fresh storyboard arrives (initial load,
  // or right after a (re)build) — but not merely because the parent re-rendered.
  useEffect(() => {
    setLocal(storyboard);
    setCutawayIds(meta.cutawayIds ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboard]);

  const llmOn = Boolean(doctor?.llm);
  const isTalkingCut = meta.mode === "talking-cut";

  const closeGapIds = useMemo(() => {
    if (!local || !isTalkingCut) return new Set<number>();
    const chosen = local.scenes.filter((s) => cutawayIds.includes(s.id)).sort((a, b) => a.startTime - b.startTime);
    const bad = new Set<number>();
    for (let i = 1; i < chosen.length; i++) {
      const gap = chosen[i].startTime - chosen[i - 1].endTime;
      if (gap < MIN_CUTAWAY_GAP) {
        bad.add(chosen[i - 1].id);
        bad.add(chosen[i].id);
      }
    }
    return bad;
  }, [local, cutawayIds, isTalkingCut]);

  async function handleBuild() {
    setBuilding(true);
    setBuildError(null);
    setSavedAt(null);
    try {
      const result = await buildStoryboardStep(slug, polish && llmOn);
      setLocal(result.storyboard);
      setCutawayIds(result.meta.cutawayIds ?? []);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setBuilding(false);
    }
  }

  async function handleSave() {
    if (!local) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveStoryboard(slug, local, isTalkingCut ? cutawayIds : undefined);
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
      setSaving(false);
    }
  }

  function updateScene(id: number, patch: Partial<{ type: SceneType; note: string }>) {
    setLocal((prev) => (prev ? { ...prev, scenes: prev.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : prev));
    setSavedAt(null);
  }

  function toggleCutaway(id: number) {
    setCutawayIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].sort((a, b) => a - b)));
    setSavedAt(null);
  }

  return (
    <div className="step">
      <Panel title="Build storyboard">
        <ErrorBox message={buildError} />
        {blockedReason ? <p className="field-hint">{blockedReason}</p> : null}
        <p className="field-hint">
          Splits the script into sentences, aligns each to the transcript, and assigns a scene type per the content
          signal rules — no two consecutive scenes repeat a type.
        </p>
        <Toggle
          checked={polish}
          onChange={setPolish}
          label="AI polish (improve scene type + payload picks)"
          disabled={!llmOn}
          hint={llmOn ? undefined : "Needs an Anthropic API key in Settings"}
        />
        <div className="button-row">
          <Button onClick={() => void handleBuild()} loading={building} disabled={Boolean(blockedReason)}>
            {local ? "Rebuild storyboard" : "Build storyboard"}
          </Button>
        </div>
      </Panel>

      {local ? (
        <Panel
          title={`Scenes (${local.scenes.length})`}
          actions={
            <div className="button-row">
              {savedAt ? <span className="field-hint">Saved — re-run Compose to apply.</span> : null}
              <Button onClick={() => void handleSave()} loading={saving}>
                Save
              </Button>
            </div>
          }
        >
          <ErrorBox message={saveError} />
          <div className="table-scroll">
            <table className="storyboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Start–end (s)</th>
                  <th>Sentence</th>
                  <th>Type</th>
                  <th>Note</th>
                  {isTalkingCut ? <th>Cutaway</th> : null}
                </tr>
              </thead>
              <tbody>
                {local.scenes.map((scene, i) => {
                  const isRepeat = i > 0 && scene.type === local.scenes[i - 1].type;
                  return (
                    <tr key={scene.id}>
                      <td>{scene.id}</td>
                      <td className="mono">
                        {scene.startTime.toFixed(1)}–{scene.endTime.toFixed(1)}
                      </td>
                      <td className="storyboard-sentence" title={scene.sentence}>
                        {truncate(scene.sentence)}
                      </td>
                      <td>
                        <div className="type-cell">
                          <select
                            className="input"
                            value={scene.type}
                            onChange={(e) => updateScene(scene.id, { type: e.target.value as SceneType })}
                          >
                            {SCENE_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          {isRepeat ? <Badge tone="warn">repeat!</Badge> : null}
                        </div>
                      </td>
                      <td>
                        <input
                          className="input"
                          value={scene.note ?? ""}
                          onChange={(e) => updateScene(scene.id, { note: e.target.value })}
                        />
                      </td>
                      {isTalkingCut ? (
                        <td className="cutaway-cell">
                          <input
                            type="checkbox"
                            checked={cutawayIds.includes(scene.id)}
                            onChange={() => toggleCutaway(scene.id)}
                          />
                          {closeGapIds.has(scene.id) ? <Badge tone="warn">&lt;3s gap</Badge> : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
