import { useState } from "react";

/** Emplacement du visuel d'une posture ou d'un exercice : ne réserve aucune place s'il est absent. */
export default function ExerciseVisual({ src, name }: Readonly<{ src?: string; name: string }>) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={`Illustration : ${name}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 rounded-xl border border-line bg-card-soft object-cover"
    />
  );
}
