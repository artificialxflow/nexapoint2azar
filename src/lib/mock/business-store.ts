import type { NexaBusiness } from '@/src/types/business';
import { NEXA_ACTIVE_BUSINESS_ID_KEY } from '@/src/types/business';

const STORAGE_KEY = 'nexa-mock-businesses-v1';

export const DEMO_BUSINESS_ID = 'biz-demo';

function readAll(): NexaBusiness[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as NexaBusiness[];
  } catch {
    return [];
  }
}

function writeAll(list: NexaBusiness[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function seedDemoBusinessIfEmpty(): NexaBusiness[] {
  let list = readAll();
  if (list.length === 0) {
    const now = new Date().toISOString();
    list = [
      {
        id: DEMO_BUSINESS_ID,
        name: 'شرکت نمایشی',
        role: 'owner',
        plan: 'trial',
        createdAt: now,
        creditLabel: 'demo',
      },
    ];
    writeAll(list);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NEXA_ACTIVE_BUSINESS_ID_KEY, DEMO_BUSINESS_ID);
    }
  }
  return list.filter((b) => !b.isArchived);
}

export function listMockBusinesses(): NexaBusiness[] {
  return seedDemoBusinessIfEmpty();
}

export function addMockBusiness(name: string): NexaBusiness {
  const list = readAll();
  const id = `biz-${Date.now()}`;
  const row: NexaBusiness = {
    id,
    name: name.trim() || 'کسب‌وکار جدید',
    role: 'owner',
    plan: 'trial',
    createdAt: new Date().toISOString(),
  };
  writeAll([...list, row]);
  return row;
}

export function updateMockBusiness(
  id: string,
  patch: Partial<Omit<NexaBusiness, 'id' | 'createdAt'>>
): void {
  const list = readAll();
  writeAll(
    list.map((b) => (b.id === id ? { ...b, ...patch } : b))
  );
}

export function removeMockBusiness(id: string): void {
  writeAll(readAll().filter((b) => b.id !== id));
}
