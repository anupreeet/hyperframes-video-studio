import { useEffect, useMemo, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createProject,
  deleteProject,
  getProjects,
  getThemes,
  type ProjectMeta,
  type Theme,
} from "../api";
import { Button, ErrorBox, Modal } from "../components";
import Composer, { type ComposerSubmit } from "../components/gallery/Composer";
import ProjectCard from "../components/gallery/ProjectCard";

export default function Projects({ onOpen }: { onOpen: (slug: string) => void }) {
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProjectMeta | null>(null);
  const [preview, setPreview] = useState<ProjectMeta | null>(null);

  const themeById = useMemo(() => new Map(themes.map((t) => [t.id, t])), [themes]);

  async function refresh() {
    try {
      setListError(null);
      const [projectList, themeList] = await Promise.all([getProjects(), getThemes()]);
      setProjects(projectList);
      setThemes(themeList);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate(input: ComposerSubmit) {
    const project = await createProject(input);
    onOpen(project.slug);
  }

  async function handleDelete(slug: string) {
    setActionError(null);
    setConfirmDelete(null);
    setPreview((p) => (p?.slug === slug ? null : p));
    try {
      await deleteProject(slug);
      setProjects((prev) => prev?.filter((p) => p.slug !== slug) ?? null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-full px-6 pb-44 pt-6">
      <div className="mb-5 flex items-baseline gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Library</h1>
        {projects ? (
          <span className="text-xs text-muted-foreground">
            {projects.length} {projects.length === 1 ? "video" : "videos"}
          </span>
        ) : null}
      </div>

      <ErrorBox message={actionError} />
      <ErrorBox message={listError} />

      {projects === null && !listError ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : null}

      {projects && projects.length === 0 ? (
        <div className="relative flex min-h-[55vh] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-border">
          <DotPattern className="absolute inset-0 text-white/[0.07] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />
          <AnimatedGradientText
            colorFrom="#e8443a"
            colorTo="#ff9a5c"
            className="relative z-10 text-3xl font-bold tracking-tight"
          >
            Make something worth watching
          </AnimatedGradientText>
          <p className="relative z-10 max-w-md text-center text-sm text-muted-foreground">
            Describe a video below — script it, voice it, storyboard it, and render it to MP4, all locally.
          </p>
        </div>
      ) : null}

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.slug}
              project={project}
              themeName={themeById.get(project.themeId)?.name ?? project.themeId}
              themeColors={themeById.get(project.themeId)?.colors}
              onOpen={() => onOpen(project.slug)}
              onPreview={() => setPreview(project)}
              onDelete={() => setConfirmDelete(project)}
              onRenderDone={() => void refresh()}
            />
          ))}
        </div>
      ) : null}

      <Composer themes={themes} onCreate={handleCreate} />

      {/* Detail lightbox */}
      <Dialog open={preview !== null} onOpenChange={(open) => (!open ? setPreview(null) : undefined)}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-4xl">
          {preview ? (
            <>
              {preview.renderedFile ? (
                <video
                  src={`/projects/${preview.slug}/${preview.renderedFile}`}
                  className="aspect-video w-full rounded-none border-0 bg-black"
                  controls
                  autoPlay
                />
              ) : null}
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-[15px] font-semibold">{preview.title}</DialogTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {themeById.get(preview.themeId)?.name ?? preview.themeId} · {preview.fps} fps ·{" "}
                    {preview.mode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setConfirmDelete(preview)}>
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                  {preview.renderedFile ? (
                    <a
                      href={`/projects/${preview.slug}/${preview.renderedFile}`}
                      download={`${preview.slug}.mp4`}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary"
                    >
                      <Download className="size-3.5" /> Download
                    </a>
                  ) : null}
                  <Button
                    onClick={() => {
                      setPreview(null);
                      onOpen(preview.slug);
                    }}
                  >
                    <Pencil className="size-3.5" /> Open in studio
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      {confirmDelete ? (
        <Modal
          title={`Delete "${confirmDelete.title}"?`}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void handleDelete(confirmDelete.slug)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            This removes the whole project folder — script, audio, storyboard, and any rendered video. It can't be
            undone.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
