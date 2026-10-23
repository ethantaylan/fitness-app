import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * En-tête des écrans plein page (création de séance, détail de séance) : retour toujours
 * visible, titre court, safe-area iOS respectée.
 */
export default function PageHeader({
  title,
  backLabel,
  fallbackPath,
  actions,
}: Readonly<{ title: string; backLabel: string; fallbackPath: string; actions?: ReactNode }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== "default";
  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-paper"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-16 max-w-4xl items-center gap-2 px-2 sm:px-4">
        <button
          type="button"
          aria-label={backLabel}
          onClick={() => {
            if (canGoBack) void navigate(-1);
            else void navigate(fallbackPath);
          }}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink hover:bg-card-soft"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Retour
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-black sm:text-left">
          {title}
        </h1>
        <div className="flex min-w-11 shrink-0 items-center justify-end gap-1">{actions}</div>
      </div>
    </header>
  );
}
