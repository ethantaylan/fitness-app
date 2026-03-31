export function formatLoadValue(loadKg?: string, emptyValue = "-"): string {
  const rawValue = loadKg?.trim().replace(/\s+/g, " ");

  if (!rawValue) {
    return emptyValue;
  }

  const normalizedValue = rawValue
    .replace(/(\d)\s*kg\b/gi, "$1 kg")
    .replace(/\bkg(?:\s+kg)+\b/gi, "kg");

  if (/^\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?$/.test(normalizedValue)) {
    return `${normalizedValue} kg`;
  }

  return normalizedValue;
}
