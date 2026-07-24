import { useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProjectMode, Theme } from "../../api";

const MODES: { id: ProjectMode; label: string }[] = [
  { id: "script", label: "Script" },
  { id: "showcase", label: "Showcase" },
  { id: "talking-cut", label: "Talking-cut" },
];

export interface ComposerSubmit {
  title: string;
  mode: ProjectMode;
  themeId?: string;
  fps: 24 | 30 | 60;
}

/** Floating project launcher. Narration and topic input live in the wizard. */
export default function Composer({
  themes,
  onCreate,
}: {
  themes: Theme[];
  onCreate: (input: ComposerSubmit) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ProjectMode>("script");
  const [themeId, setThemeId] = useState<string>("");
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveThemeId = themeId || themes[0]?.id || "";
  const selectedTheme = themes.find((t) => t.id === effectiveThemeId);

  async function submit() {
    const title = text.trim();
    if (!title) {
      setError("Name the project first. Add the narration inside the wizard.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await onCreate({ title, mode, themeId: effectiveThemeId || undefined, fps });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-6 left-16 right-0 z-30 flex justify-center px-6">
      <div className="pointer-events-auto w-full max-w-2xl">
        {error ? (
          <p className="mx-auto mb-2 w-fit rounded-full border border-destructive/40 bg-destructive/15 px-3.5 py-1 text-xs text-destructive backdrop-blur">
            {error}
          </p>
        ) : null}
        <div className="rounded-2xl border border-white/12 bg-card/85 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <Textarea
            id="composer-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Name your project — add the script in the next step…"
            maxLength={120}
            rows={1}
            className="min-h-11 resize-none border-0 bg-transparent px-4 pt-3 text-[15px] shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
            {/* Mode segmented control */}
            <div className="flex rounded-full border border-border bg-secondary/60 p-0.5">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors",
                    mode === m.id && "bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Theme chip */}
            <Select value={effectiveThemeId} onValueChange={setThemeId}>
              <SelectTrigger
                size="sm"
                className="h-7 w-auto gap-1.5 rounded-full border-border bg-secondary/60 px-3 text-xs shadow-none"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: selectedTheme?.colors.accent ?? "#e8443a" }}
                />
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    <span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: t.colors.accent }} />
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* FPS chip */}
            <Select value={String(fps)} onValueChange={(v) => setFps(Number(v) as 24 | 30 | 60)}>
              <SelectTrigger
                size="sm"
                className="h-7 w-auto rounded-full border-border bg-secondary/60 px-3 text-xs shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[24, 30, 60].map((f) => (
                  <SelectItem key={f} value={String(f)} className="text-xs">
                    {f} fps
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => void submit()}
              disabled={creating}
              aria-label="Create video"
              className={cn(
                "flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all",
                "hover:bg-[#ff5647] hover:shadow-[0_0_16px_rgba(232,68,58,0.5)]",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
