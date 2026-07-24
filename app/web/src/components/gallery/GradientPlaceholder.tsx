import { Clapperboard } from "lucide-react";
import type { Theme } from "../../api";

/** Animated theme-colored gradient shown when a project has no poster yet. */
export default function GradientPlaceholder({
  colors,
  title,
}: {
  colors?: Theme["colors"];
  title: string;
}) {
  const from = colors?.bg ?? "#14181e";
  const mid = colors?.accent ?? "#e8443a";
  const to = colors?.accentAlt ?? colors?.surface ?? "#1c212a";
  return (
    <div
      className="hf-gradient-pan absolute inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(130deg, ${from} 0%, ${to} 42%, ${mid} 75%, ${from} 100%)`,
        backgroundSize: "220% 220%",
      }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-2 text-white/60">
        <Clapperboard className="size-8" />
        <span className="max-w-[80%] truncate text-xs font-medium tracking-wide">{title}</span>
      </div>
    </div>
  );
}
