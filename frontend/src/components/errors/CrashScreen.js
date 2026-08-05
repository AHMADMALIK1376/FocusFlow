// 500: shown by ErrorBoundary when the app itself crashes. The dial is full,
// "overloaded". A failed lazy-loaded page after a new deploy (or a dropped
// connection) is reported as an update to reload, not as a crash.
import React, { useState } from "react";
import { TriangleAlert, RotateCw, House, Sparkles } from "lucide-react";
import ErrorScreen, { PrimaryAction, SecondaryAction } from "./ErrorScreen";

export const isUpdateError = (error) =>
  error?.name === "ChunkLoadError" ||
  /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module/i.test(error?.message || "");

export default function CrashScreen({ error, componentStack, onReload, onHome }) {
  const [open, setOpen] = useState(false);
  const update = isUpdateError(error);

  return (
    <ErrorScreen
      code="500"
      dial={100}
      dialCenter={update
        ? <Sparkles size={34} strokeWidth={1.75} className="text-brand" />
        : <TriangleAlert size={34} strokeWidth={1.75} className="text-brand" />}
      title={update ? "FocusFlow was updated" : "Something broke on our side"}
      message={update
        ? "A newer version is ready. Reload to load it; nothing you saved is lost."
        : "FocusFlow hit an unexpected error. Everything you saved is safe, and reloading usually fixes it."}
      actions={<>
        <PrimaryAction icon={RotateCw} onClick={onReload}>Reload page</PrimaryAction>
        <SecondaryAction icon={House} onClick={onHome}>Go to Dashboard</SecondaryAction>
      </>}
    >
      {!update && error?.message && (
        <div className="mt-5 w-full max-w-md">
          <button onClick={() => setOpen((o) => !o)} className="text-xs font-bold text-muted hover:text-ink transition-colors">
            {open ? "Hide what happened" : "What happened?"}
          </button>
          {open && (
            <div className="mt-3 text-left bg-surface rounded-token-md p-4 shadow-neu-inset overflow-auto max-h-64">
              <p className="text-xs font-bold text-brand break-words">{error.message}</p>
              {process.env.NODE_ENV === "development" && (
                <pre className="text-[11px] text-muted whitespace-pre-wrap mt-2">{error.stack}{componentStack}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </ErrorScreen>
  );
}
