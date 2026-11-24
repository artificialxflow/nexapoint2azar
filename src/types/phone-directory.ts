export interface PhoneDirectoryGroup {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface PhoneDirectoryEntry {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  mobile: string;
  landline?: string;
  internalCode?: string;
  address?: string;
  notes?: string;
  extension: string;
  department: string;
  jobTitle: string;
  userId?: string;
  personId?: string;
  sortOrder: number;
  groupId?: string;
  entryKind?: 'internal' | 'linked_user' | 'linked_person';
  visibilityTags?: string[];
}
