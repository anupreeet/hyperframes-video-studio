import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDoctor, getProject, type DoctorResult, type ProjectMeta, type ProjectMode, type StepName, type Storyboard } from "../api";
import { Button, ErrorBox, Spinner, stepTone } from "../components";
import ScriptStep from "./ScriptStep";
import SourceStep from "./SourceStep";
import ThemeStep from "./ThemeStep";
import VoiceStep from "./VoiceStep";
import TranscribeStep from "./TranscribeStep";
import StoryboardStep from "./StoryboardStep";
import PreviewStep from "./PreviewStep";
import RenderStep from "./RenderStep";

/** Props every wizard step component receives. */
export interface WizardStepProps {
  slug: string;
  meta: ProjectMeta;
  storyboard: Storyboard | null;
  doctor: DoctorResult | null;
  refresh: () => Promise<void>;
  blockedReason?: string | null;
}

type StepId = "script" | "source" | "theme" | "voice" | "transcribe" | "storyboard" | "preview" | "render";

interface StepDef {
  id: StepId;
  label: string;
  /** meta.steps key backing this pill's status — omitted for client-only steps (theme/source). */
  stepName?: StepName;
}

const STEP_LISTS: Record<ProjectMode, StepDef[]> = {
  script: [
    { id: "script", label: "Script", stepName: "script" },
    { id: "theme", label: "Theme" },
    { id: "voice", label: "Voice", stepName: "tts" },
    { id: "transcribe", label: "Transcribe", stepName: "transcribe" },
    { id: "storyboard", label: "Storyboard", stepName: "storyboard" },
    { id: "preview", label: "Preview", stepName: "compose" },
    { id: "render", label: "Render", stepName: "render" },
  ],
  showcase: [
    { id: "source", label: "Source" },
    { id: "theme", label: "Theme" },
    { id: "transcribe", label: "Transcribe", stepName: "transcribe" },
    { id: "storyboard", label: "Storyboard", stepName: "storyboard" },
    { id: "preview", label: "Preview", stepName: "compose" },
    { id: "render", label: "Render", stepName: "render" },
  ],
  "talking-cut": [
    { id: "source", label: "Source" },
    { id: "theme", label: "Theme" },
    { id: "transcribe", label: "Encode+Transcribe", stepName: "transcribe" },
    { id: "storyboard", label: "Storyboard", stepName: "storyboard" },
    { id: "preview", label: "Preview", stepName: "compose" },
    { id: "render", label: "Render", stepName: "render" },
  ],
};

function statusFor(def: StepDef, meta: ProjectMeta): "pending" | "running" | "done" | "error" {
  if (def.stepName) return meta.steps[def.stepName]?.state ?? "pending";
  if (def.id === "source") return meta.sourceMedia || meta.audioFile ? "done" : "pending";
  if (def.id === "theme") return meta.themeId ? "done" : "pending";
  return "pending";
}

function blockerForStep(stepId: StepId, meta: ProjectMeta, storyboard: Storyboard | null): string | null {
  switch (stepId) {
    case "voice":
      return meta.script ? null : "Finish the Script step first.";
    case "transcribe":
      if (meta.mode === "script") return meta.audioFile ? null : "Create or upload voiceover audio first.";
      if (meta.mode === "talking-cut") return meta.sourceMedia ? null : "Upload a talking-head video first.";
      return meta.sourceMedia || meta.audioFile ? null : "Upload showcase audio or video first.";
    case "storyboard":
      if (!meta.transcriptFile) return "Run Transcribe first.";
      if (!meta.script || !meta.totalDuration) return "The transcript and audio timing are incomplete.";
      return null;
    case "preview":
      return storyboard && meta.steps.storyboard?.state === "done" ? null : "Build the storyboard first.";
    case "render":
      return meta.steps.compose?.state === "done" ? null : "Compose successfully before rendering.";
    default:
      return null;
  }
}

export default function Wizard({ slug, onExit }: { slug: string; onExit: () => void }) {
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [doctor, setDoctor] = useState<DoctorResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasAutoJumped = useRef(false);

  async function refresh() {
    try {
      setLoadError(null);
      const state = await getProject(slug);
      setMeta(state.meta);
      setStoryboard(state.storyboard);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
    // Doctor is a soft dependency (only gates AI-assist affordances), so a
    // failure here still resolves to doctor=null — AI features render as
    // off — rather than blocking the wizard. The error is still surfaced.
    getDoctor()
      .then((d) => {
        setDoctor(d);
        setDoctorError(null);
      })
      .catch((err: unknown) => {
        setDoctor(null);
        setDoctorError(err instanceof Error ? err.message : String(err));
      });
    // slug is fixed for the lifetime of this component instance (see key={slug} in App.tsx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!meta || hasAutoJumped.current) return;
    hasAutoJumped.current = true;
    const list = STEP_LISTS[meta.mode];
    const firstIncomplete = list.findIndex((s) => statusFor(s, meta) !== "done");
    setActiveIndex(firstIncomplete === -1 ? list.length - 1 : firstIncomplete);
  }, [meta]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Button variant="ghost" onClick={onExit}>
          <ArrowLeft className="size-4" /> Library
        </Button>
        <ErrorBox message={loadError} />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner />
        <p className="text-sm">Loading project…</p>
      </div>
    );
  }

  const steps = STEP_LISTS[meta.mode];
  const active = steps[activeIndex] ?? steps[0];
  const activeBlockedReason = blockerForStep(active.id, meta, storyboard);
  const nextStep = steps[activeIndex + 1];
  const nextBlockedReason = nextStep ? blockerForStep(nextStep.id, meta, storyboard) : null;

  const pillTone: Record<ReturnType<typeof stepTone>, string> = {
    done: "border-success/35 bg-success/10 text-success",
    running: "border-info/35 bg-info/10 text-info",
    error: "border-destructive/40 bg-destructive/10 text-destructive",
    pending: "border-border text-muted-foreground hover:text-foreground",
    warn: "border-warning/35 bg-warning/10 text-warning",
    info: "border-info/35 bg-info/10 text-info",
    neutral: "border-border text-muted-foreground",
  };

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-6">
      <div className="mb-5 flex items-start gap-4">
        <Button variant="ghost" onClick={onExit} className="shrink-0">
          <ArrowLeft className="size-4" /> Library
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{meta.title}</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            <span className="mono">{meta.slug}</span> · {meta.mode} mode
          </p>
        </div>
      </div>

      <ErrorBox message={doctorError} />

      <ol className="mb-6 flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => {
          const state = statusFor(s, meta);
          const isActive = i === activeIndex;
          const blockedReason = blockerForStep(s.id, meta, storyboard);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(i)}
                disabled={Boolean(blockedReason)}
                title={blockedReason ?? undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all",
                  pillTone[stepTone(state)],
                  blockedReason && "cursor-not-allowed opacity-45",
                  isActive && "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_14px_rgba(232,68,58,0.25)]",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="text-[11px] opacity-60">{i + 1}</span>
                )}
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-4">
        <StepView
          stepId={active.id}
          slug={slug}
          meta={meta}
          storyboard={storyboard}
          doctor={doctor}
          refresh={refresh}
          blockedReason={activeBlockedReason}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" disabled={activeIndex === 0} onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button
          disabled={activeIndex === steps.length - 1 || Boolean(nextBlockedReason)}
          title={nextBlockedReason ?? undefined}
          onClick={() => setActiveIndex((i) => Math.min(steps.length - 1, i + 1))}
        >
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function StepView({ stepId, ...props }: { stepId: StepId } & WizardStepProps) {
  switch (stepId) {
    case "script":
      return <ScriptStep {...props} />;
    case "source":
      return <SourceStep {...props} />;
    case "theme":
      return <ThemeStep {...props} />;
    case "voice":
      return <VoiceStep {...props} />;
    case "transcribe":
      return <TranscribeStep {...props} />;
    case "storyboard":
      return <StoryboardStep {...props} />;
    case "preview":
      return <PreviewStep {...props} />;
    case "render":
      return <RenderStep {...props} />;
    default:
      return null;
  }
}
