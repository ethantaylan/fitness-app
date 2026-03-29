import { EQUIPMENT_LABELS } from "./constants";

export function normalizeEquipmentLabel(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function hasEquipmentLabel(list: string[], candidate: string): boolean {
  const normalized = normalizeEquipmentLabel(candidate).toLocaleLowerCase();
  if (!normalized) return false;

  return list.some((item) => normalizeEquipmentLabel(item).toLocaleLowerCase() === normalized);
}

export function addEquipmentLabel(list: string[], candidate: string): string[] {
  const normalized = normalizeEquipmentLabel(candidate);
  if (!normalized || hasEquipmentLabel(list, normalized)) return list;
  return [...list, normalized];
}

export function removeEquipmentLabel(list: string[], candidate: string): string[] {
  const normalized = normalizeEquipmentLabel(candidate).toLocaleLowerCase();
  return list.filter((item) => normalizeEquipmentLabel(item).toLocaleLowerCase() !== normalized);
}

export function isPresetEquipment(label: string): boolean {
  const normalized = normalizeEquipmentLabel(label).toLocaleLowerCase();
  return EQUIPMENT_LABELS.some((item) => item.toLocaleLowerCase() === normalized);
}

export function getCustomEquipment(list: string[]): string[] {
  return list.filter((item) => !isPresetEquipment(item));
}
