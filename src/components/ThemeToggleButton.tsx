import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function ThemeToggleButton({
  showLabel = false,
}: Readonly<{ showLabel?: boolean }>) {
  const { resolvedTheme, setThemeMode } = useTheme();
  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Mode clair" : "Mode sombre";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={() => setThemeMode(isDark ? "light" : "dark")}
      className="relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-xs font-bold transition-colors"
      style={{
        backgroundColor: "var(--theme-surface-soft)",
        border: "1px solid var(--theme-border)",
        color: "var(--theme-text)",
      }}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
