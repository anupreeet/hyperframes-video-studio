import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "./components/layout/Sidebar";
import { useDoctorStatus } from "./hooks/useDoctorStatus";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import Wizard from "./wizard/Wizard";

export default function App() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { doctor, refresh } = useDoctorStatus();

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen">
        <Sidebar
          onHome={() => setActiveSlug(null)}
          onNew={() => {
            setActiveSlug(null);
            requestAnimationFrame(() => document.getElementById("composer-input")?.focus());
          }}
          onSettings={() => setSettingsOpen(true)}
          doctor={doctor}
          galleryActive={activeSlug === null}
        />

        <main className="pl-16">
          {activeSlug === null ? (
            <Projects onOpen={setActiveSlug} />
          ) : (
            <Wizard key={activeSlug} slug={activeSlug} onExit={() => setActiveSlug(null)} />
          )}
        </main>

        <Sheet
          open={settingsOpen}
          onOpenChange={(open) => {
            setSettingsOpen(open);
            if (!open) refresh();
          }}
        >
          <SheetContent side="right" className="w-full gap-0 overflow-y-auto border-border bg-background sm:max-w-xl">
            <SheetHeader className="pb-2">
              <SheetTitle>Settings</SheetTitle>
              <SheetDescription>Local paths, API keys, and defaults for new projects.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-10">
              <Settings />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
