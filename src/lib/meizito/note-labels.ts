export const NOTE_LABEL_PRESETS = [
  { id: 'follow-up', label: 'پیگیری' },
  { id: 'meeting', label: 'جلسه' },
  { id: 'urgent', label: 'فوری' },
] as const;

export function noteLabelTitle(id: string) {
  return NOTE_LABEL_PRESETS.find((l) => l.id === id)?.label ?? id;
}
