// Shared presentational atoms used across pages and wizard steps.
// API is frozen (names + props) — internals wrap shadcn/ui primitives, so every
// consumer reskins without call-site changes.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { StepState } from "./api";

// ── Button ───────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_MAP = {
  primary: "default",
  ghost: "outline",
  danger: "destructive",
} as const;

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <UiButton
      type={type}
      variant={VARIANT_MAP[variant]}
      disabled={disabled || loading}
      className={cn("rounded-lg font-semibold", className)}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" /> : null}
      <span>{children}</span>
    </UiButton>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────

interface PanelProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, actions, children, className }: PanelProps) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      {title || actions ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          {title ? <h3 className="text-sm font-semibold tracking-tight">{title}</h3> : <span />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <CardContent className="px-5 py-4">{children}</CardContent>
    </Card>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────

export type BadgeTone = "pending" | "running" | "done" | "error" | "warn" | "info" | "neutral";

const toneVariants = cva("border font-medium", {
  variants: {
    tone: {
      pending: "border-border bg-muted text-muted-foreground",
      running: "border-transparent bg-info/15 text-info",
      done: "border-transparent bg-success/15 text-success",
      error: "border-transparent bg-destructive/15 text-destructive",
      warn: "border-transparent bg-warning/15 text-warning",
      info: "border-transparent bg-info/15 text-info",
      neutral: "border-border bg-muted text-muted-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <UiBadge variant="outline" className={toneVariants({ tone })}>
      {children}
    </UiBadge>
  );
}

/** Maps a wizard/project step state to the Badge tone + label used everywhere. */
export function stepTone(state?: StepState): BadgeTone {
  if (state === "done") return "done";
  if (state === "running") return "running";
  if (state === "error") return "error";
  return "pending";
}

export function stepLabel(state?: StepState): string {
  if (state === "done") return "Done";
  if (state === "running") return "Running";
  if (state === "error") return "Error";
  return "Pending";
}

// ── Spinner ──────────────────────────────────────────────────────────────

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <Loader2
      className="animate-spin text-muted-foreground"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

// ── ErrorBox ─────────────────────────────────────────────────────────────

export function ErrorBox({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="my-2 border-destructive/40 bg-destructive/10">
      <AlertDescription className="text-destructive">{message}</AlertDescription>
    </Alert>
  );
}

// ── Toggle ───────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  hint?: string;
}

export function Toggle({ checked, onChange, label, disabled = false, hint }: ToggleProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-sm",
        disabled && "cursor-not-allowed opacity-55",
      )}
      title={hint}
    >
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

// ── Field ────────────────────────────────────────────────────────────────

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}

export function Field({ label, hint, children, htmlFor }: FieldProps) {
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div>{children}</div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
