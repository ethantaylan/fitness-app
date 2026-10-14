export default function BetaBadge({ compact = false }: Readonly<{ compact?: boolean }>) {
  if (!import.meta.env.DEV) return null;
  return (
    <span
      className={`beta-badge inline-flex items-center rounded-full border font-black uppercase tracking-[0.18em] ${
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-[11px]"
      }`}
      title="Version beta : l'application est déjà utilisable, mais continue d'évoluer."
    >
      Beta
    </span>
  );
}
