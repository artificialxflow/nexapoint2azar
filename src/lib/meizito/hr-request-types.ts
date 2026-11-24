export const HR_REQUEST_SUBTYPES = [
  { id: 'leave', label: 'مرخصی' },
  { id: 'loan', label: 'وام' },
  { id: 'advance', label: 'مساعده' },
] as const;

export type HrRequestSubtypeId = (typeof HR_REQUEST_SUBTYPES)[number]['id'];

export const HR_SUBTYPE_LABELS: Record<string, string> = Object.fromEntries(
  HR_REQUEST_SUBTYPES.map((s) => [s.id, s.label])
);
