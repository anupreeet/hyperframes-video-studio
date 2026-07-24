import { LayoutGrid, Plus, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DoctorResult } from "../../api";

interface SidebarProps {
  onHome: () => void;
  onNew: () => void;
  onSettings: () => void;
  doctor: DoctorResult | null;
  galleryActive: boolean;
}

function RailButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        className={cn(
          "flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors",
          "hover:bg-secondary hover:text-foreground",
          active && "bg-secondary text-foreground",
        )}
        aria-label={label}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Sidebar({ onHome, onNew, onSettings, doctor, galleryActive }: SidebarProps) {
  const allOk = doctor !== null && doctor.checks.every((c) => c.ok);
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col items-center gap-2 border-r border-border bg-background/80 py-4 backdrop-blur-md">
      <button
        type="button"
        onClick={onHome}
        aria-label="HyperFrames Video Studio"
        className="mb-3 flex size-10 items-center justify-center"
      >
        <span className="size-3.5 rounded-[5px] bg-primary shadow-[0_0_0_5px_var(--accent-dim),0_0_18px_2px_rgba(232,68,58,0.45)]" />
      </button>

      <RailButton label="Gallery" onClick={onHome} active={galleryActive}>
        <LayoutGrid className="size-5" />
      </RailButton>
      <RailButton label="New video" onClick={onNew}>
        <Plus className="size-5" />
      </RailButton>

      <div className="flex-1" />

      <RailButton label={allOk ? "Environment OK — Settings" : "Environment issues — Settings"} onClick={onSettings}>
        <span className="relative">
          <Settings className="size-5" />
          <span
            className={cn(
              "absolute -right-1 -top-1 size-2 rounded-full ring-2 ring-background",
              doctor === null ? "bg-muted-foreground" : allOk ? "bg-success" : "bg-warning",
            )}
          />
        </span>
      </RailButton>
    </aside>
  );
}
