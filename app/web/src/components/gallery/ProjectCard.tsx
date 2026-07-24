import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { GlareHover } from "@/components/ui/glare-hover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { renderStreamUrl, type ProjectMeta, type Theme } from "../../api";
import { Badge } from "../../components";
import GradientPlaceholder from "./GradientPlaceholder";

const MODE_LABELS: Record<ProjectMeta["mode"], string> = {
  script: "Script",
  showcase: "Showcase",
  "talking-cut": "Talking-cut",
};

function formatDuration(seconds?: number): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Live render progress via the project's SSE stream while the render step runs. */
function useRenderProgress(slug: string, rendering: boolean, onDone: () => void) {
  const [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    if (!rendering) {
      setProgress(null);
      return;
    }
    const source = new EventSource(renderStreamUrl(slug));
    source.addEventListener("progress", (e) => {
      const value = Number((e as MessageEvent).data);
      if (Number.isFinite(value)) setProgress(value);
    });
    source.addEventListener("done", () => {
      source.close();
      onDone();
    });
    source.addEventListener("error", () => {
      // Server emits `error` events on failure; EventSource also fires plain
      // network errors here. Either way stop listening — the meta refresh will
      // pick up the final step state.
      source.close();
      onDone();
    });
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, rendering]);
  return progress;
}

export default function ProjectCard({
  project,
  themeName,
  themeColors,
  onOpen,
  onPreview,
  onDelete,
  onRenderDone,
}: {
  project: ProjectMeta;
  themeName: string;
  themeColors?: Theme["colors"];
  onOpen: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onRenderDone: () => void;
}) {
  const rendering = project.steps.render?.state === "running";
  const progress = useRenderProgress(project.slug, rendering, onRenderDone);

  // Poster with graceful fallback + one delayed retry (covers async thumb generation).
  const [posterFailed, setPosterFailed] = useState(false);
  const [posterVersion, setPosterVersion] = useState(0);
  const retried = useRef(false);
  const posterUrl = `/projects/${project.slug}/thumb.jpg?v=${encodeURIComponent(project.updatedAt)}-${posterVersion}`;

  function handlePosterError() {
    setPosterFailed(true);
    if (!retried.current && project.renderedFile) {
      retried.current = true;
      setTimeout(() => {
        setPosterFailed(false);
        setPosterVersion((v) => v + 1);
      }, 4000);
    }
  }

  // Hover-intent video preview: mount after 150ms, full unmount on leave.
  const [hovering, setHovering] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const canPreview = Boolean(project.renderedFile) && !rendering;
  function handleEnter() {
    if (!canPreview) return;
    hoverTimer.current = setTimeout(() => setHovering(true), 150);
  }
  function handleLeave() {
    clearTimeout(hoverTimer.current);
    setHovering(false);
  }

  const duration = formatDuration(project.totalDuration);

  return (
    <GlareHover
      role="button"
      tabIndex={0}
      background="var(--card)"
      color="#ffffff"
      opacity={0.14}
      size={260}
      duration={700}
      className={cn(
        "group relative aspect-video w-full cursor-pointer place-items-stretch overflow-hidden rounded-xl border border-border",
        "transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      )}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => (project.renderedFile ? onPreview() : onOpen())}
      onKeyDown={(e) => {
        if (e.key === "Enter") (project.renderedFile ? onPreview : onOpen)();
      }}
    >
      {/* Poster / placeholder */}
      {posterFailed || !project.renderedFile ? (
        <GradientPlaceholder colors={themeColors} title={project.title} />
      ) : (
        <img
          src={posterUrl}
          onError={handlePosterError}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {/* Hover autoplay preview */}
      {hovering && project.renderedFile ? (
        <video
          src={`/projects/${project.slug}/${project.renderedFile}`}
          className="absolute inset-0 h-full w-full rounded-none border-0 object-cover"
          muted
          loop
          autoPlay
          playsInline
        />
      ) : null}

      {/* Bottom scrim + metadata */}
      <div className="absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3.5 pb-3 pt-10">
        <p className="truncate text-[13.5px] font-semibold leading-tight text-white">{project.title}</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/65">
          <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-px">
            {MODE_LABELS[project.mode]}
          </span>
          <span className="truncate">{themeName}</span>
          {duration ? <span className="ml-auto shrink-0 font-medium text-white/80">{duration}</span> : null}
        </div>
      </div>

      {/* Rendering state */}
      {rendering ? (
        <>
          <div className="absolute inset-0 z-[6] flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[2px]">
            <AnimatedShinyText className="text-sm font-medium">Rendering…</AnimatedShinyText>
            {progress !== null ? (
              <div className="flex w-2/3 items-center gap-2">
                <Progress value={progress} className="h-1.5" />
                <span className="text-[11px] tabular-nums text-white/70">{Math.round(progress)}%</span>
              </div>
            ) : null}
          </div>
          <BorderBeam size={90} duration={5} colorFrom="#e8443a" colorTo="#ff9a8a" borderWidth={1.5} />
        </>
      ) : null}

      {/* Unfinished marker */}
      {!project.renderedFile && !rendering ? (
        <div className="absolute right-2.5 top-2.5 z-[6]">
          <Badge tone={project.steps.render?.state === "error" ? "error" : "pending"}>
            {project.steps.render?.state === "error" ? "Render failed" : "Draft"}
          </Badge>
        </div>
      ) : null}

      {/* Hover controls */}
      <button
        type="button"
        aria-label="Delete project"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute left-2.5 top-2.5 z-20 flex size-7 items-center justify-center rounded-lg bg-black/45 text-white/70 opacity-0 backdrop-blur transition-opacity hover:bg-destructive hover:text-white group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </GlareHover>
  );
}
