import { Dumbbell, Flower2, Footprints, type LucideIcon } from "lucide-react";

/** Pictogramme de la discipline d'après le type de séance (« Yoga », « Endurance facile »…). */
export function sessionIcon(type: string): LucideIcon {
  if (/yoga|mobilit|souplesse|[ée]tirement/i.test(type)) return Flower2;
  if (/course|running|endurance|fractionn|footing|c[oô]tes|trail/i.test(type)) return Footprints;
  return Dumbbell;
}
