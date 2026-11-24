import type { MoneyDocument, Person } from '@/src/types/person';

export function pickUnusedPersonId(people: Person[], usedPersonIds: string[]): string {
  const used = new Set(usedPersonIds.filter(Boolean));
  const free = people.find((p) => !used.has(p.id));
  return free?.id ?? '';
}

export function moneyDocumentMatchesSearch(doc: MoneyDocument, search: string): boolean {
  const q = search.trim();
  if (!q) return true;
  if (doc.number.includes(q) || (doc.description || '').includes(q)) return true;
  if (doc.id.includes(q)) return true;
  if ((doc.notes || []).some((n) => n.includes(q))) return true;
  if (doc.lines.some((line) => (line.note || '').includes(q))) return true;
  return false;
}
