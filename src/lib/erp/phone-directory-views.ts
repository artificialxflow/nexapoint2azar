import type { PhoneDirectoryEntry } from '@/src/types/phone-directory';
import { phoneEntryDisplayName } from '@/src/lib/erp/phone-display-name';

export function splitPhoneTags(raw: string): string[] {
  return raw
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type PhoneDirectoryViewMode = 'alpha' | 'topic' | 'group' | 'tag';

export type PhoneDirectorySection = {
  key: string;
  title: string;
  entries: PhoneDirectoryEntry[];
};

export function phoneEntrySortKey(e: PhoneDirectoryEntry): string {
  const last = (e.lastName ?? '').trim();
  const first = (e.firstName ?? '').trim();
  if (last || first) return `${last} ${first}`.trim();
  return phoneEntryDisplayName(e);
}

function sortEntries(entries: PhoneDirectoryEntry[]): PhoneDirectoryEntry[] {
  return [...entries].sort((a, b) => phoneEntrySortKey(a).localeCompare(phoneEntrySortKey(b), 'fa'));
}

export function buildPhoneDirectorySections(
  entries: PhoneDirectoryEntry[],
  mode: PhoneDirectoryViewMode,
  groupNameById: Map<string, string>
): PhoneDirectorySection[] {
  if (mode === 'alpha') {
    return [{ key: 'alpha', title: '', entries: sortEntries(entries) }];
  }

  if (mode === 'topic') {
    const buckets = new Map<string, PhoneDirectoryEntry[]>();
    for (const e of entries) {
      const label = (e.department || e.jobTitle || '').trim() || 'بدون واحد/سمت';
      const list = buckets.get(label) ?? [];
      list.push(e);
      buckets.set(label, list);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'fa'))
      .map(([title, items]) => ({
        key: `topic:${title}`,
        title,
        entries: sortEntries(items),
      }));
  }

  if (mode === 'group') {
    const buckets = new Map<string, PhoneDirectoryEntry[]>();
    for (const e of entries) {
      const label = e.groupId ? groupNameById.get(e.groupId) ?? 'دسته حذف‌شده' : 'بدون دسته';
      const list = buckets.get(label) ?? [];
      list.push(e);
      buckets.set(label, list);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'fa'))
      .map(([title, items]) => ({
        key: `group:${title}`,
        title,
        entries: sortEntries(items),
      }));
  }

  const buckets = new Map<string, PhoneDirectoryEntry[]>();
  for (const e of entries) {
    const tags = e.visibilityTags?.length ? e.visibilityTags : ['بدون برچسب'];
    for (const tag of tags) {
      const list = buckets.get(tag) ?? [];
      list.push(e);
      buckets.set(tag, list);
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'fa'))
    .map(([title, items]) => ({
      key: `tag:${title}`,
      title,
      entries: sortEntries(items),
    }));
}
