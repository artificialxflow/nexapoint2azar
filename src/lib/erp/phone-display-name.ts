import type { PhoneDirectoryEntry } from '@/src/types/phone-directory';

export function phoneEntryDisplayName(e: Pick<PhoneDirectoryEntry, 'displayName' | 'firstName' | 'lastName'>): string {
  const fromParts = [e.firstName, e.lastName].filter(Boolean).join(' ').trim();
  if (fromParts) return fromParts;
  return e.displayName.trim() || '—';
}

export function phoneEntrySearchHaystack(e: PhoneDirectoryEntry): string {
  return [
    e.displayName,
    e.firstName,
    e.lastName,
    e.mobile,
    e.landline,
    e.internalCode,
    e.extension,
    e.department,
    e.jobTitle,
    e.address,
    e.notes,
    ...(e.visibilityTags ?? []),
  ]
    .filter(Boolean)
    .join(' ');
}
