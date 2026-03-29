export default function BetaBadge({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-black uppercase tracking-[0.18em] ${
        compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1 text-[10px]"
      }`}
      style={{
        backgroundColor: "#fef3c7",
        borderColor: "#fcd34d",
        color: "#92400e",
      }}
      title="Version beta : l'application est déjà utilisable, mais continue d'évoluer."
    >
      Beta
    </span>
  );
}
