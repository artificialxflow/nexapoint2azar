import type { BusinessProfile, FiscalYearSettings } from '@/src/types/settings';
import { DEMO_BUSINESS_ID } from '@/src/lib/mock/business-store';

export type MockProjectRow = {
  id: string;
  name: string;
  isDefault: boolean;
  active: boolean;
};

type FiscalYearRow = FiscalYearSettings & { id: string; isActive: boolean };

type BusinessBucket = {
  profile: BusinessProfile;
  fiscalYears: FiscalYearRow[];
  projects: MockProjectRow[];
};

const STORAGE_KEY = 'nexa-mock-business-settings-v1';

function defaultProfile(tradeName = 'شرکت نمایشی'): BusinessProfile {
  return {
    legalName: 'شرکت نمایشی پارس',
    tradeName,
    nationalId: '10101234567',
    economicCode: '41123456789',
    regNo: '123456',
    phone: '02112345678',
    fax: '',
    address: 'تهران، خیابان نمونه، پلاک ۱',
    postalCode: '1234567890',
    city: 'تهران',
    website: 'https://nexapoint.ir',
    email: 'info@demo.local',
  };
}

function seedBucket(businessId: string): BusinessBucket {
  const tradeName = businessId === DEMO_BUSINESS_ID ? 'شرکت نمایشی' : 'کسب‌وکار';
  return {
    profile: defaultProfile(tradeName),
    fiscalYears: [
      {
        id: `fy-${businessId}`,
        label: 'سال مالی ۱۴۰۴',
        startDate: '1404/01/01',
        endDate: '1404/12/29',
        isActive: true,
      },
    ],
    projects: [
      {
        id: `proj-${businessId}-main`,
        name: 'پروژه اصلی',
        isDefault: true,
        active: true,
      },
    ],
  };
}

function readAll(): Record<string, BusinessBucket> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, BusinessBucket>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, BusinessBucket>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getBucket(businessId: string): BusinessBucket {
  const all = readAll();
  if (!all[businessId]) {
    all[businessId] = seedBucket(businessId);
    writeAll(all);
  }
  return all[businessId];
}

function saveBucket(businessId: string, bucket: BusinessBucket) {
  const all = readAll();
  all[businessId] = bucket;
  writeAll(all);
}

export function mockListProjects(businessId: string): MockProjectRow[] {
  const bucket = getBucket(businessId);
  return [...bucket.projects].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name, 'fa');
  });
}

export function mockCreateProject(
  businessId: string,
  input: { name: string; isDefault?: boolean; active?: boolean }
): MockProjectRow {
  const bucket = getBucket(businessId);
  const isDefault = input.isDefault ?? false;
  if (isDefault) {
    bucket.projects = bucket.projects.map((p) => ({ ...p, isDefault: false }));
  }
  const project: MockProjectRow = {
    id: `proj-${Date.now()}`,
    name: input.name.trim(),
    isDefault,
    active: input.active ?? true,
  };
  bucket.projects.push(project);
  saveBucket(businessId, bucket);
  return project;
}

export function mockUpdateProject(
  businessId: string,
  projectId: string,
  patch: Partial<{ name: string; isDefault: boolean; active: boolean }>
): MockProjectRow {
  const bucket = getBucket(businessId);
  const idx = bucket.projects.findIndex((p) => p.id === projectId);
  if (idx < 0) throw new Error('پروژه یافت نشد.');
  if (patch.isDefault) {
    bucket.projects = bucket.projects.map((p) => ({ ...p, isDefault: false }));
  }
  bucket.projects[idx] = { ...bucket.projects[idx], ...patch };
  saveBucket(businessId, bucket);
  return bucket.projects[idx];
}

export function mockDeleteProject(businessId: string, projectId: string): void {
  const bucket = getBucket(businessId);
  bucket.projects = bucket.projects.filter((p) => p.id !== projectId);
  saveBucket(businessId, bucket);
}

export function mockGetProfile(businessId: string): BusinessProfile {
  return { ...getBucket(businessId).profile };
}

export function mockPatchProfile(businessId: string, patch: Partial<BusinessProfile>): BusinessProfile {
  const bucket = getBucket(businessId);
  bucket.profile = { ...bucket.profile, ...patch };
  saveBucket(businessId, bucket);
  return { ...bucket.profile };
}

export function mockGetFiscalYears(businessId: string): {
  fiscalYears: FiscalYearRow[];
  active: FiscalYearRow | null;
} {
  const bucket = getBucket(businessId);
  const active = bucket.fiscalYears.find((f) => f.isActive) ?? bucket.fiscalYears[0] ?? null;
  return { fiscalYears: [...bucket.fiscalYears], active };
}

export function mockUpsertFiscalYear(
  businessId: string,
  input: FiscalYearSettings & { fiscalYearId?: string | null; isActive?: boolean }
): FiscalYearRow {
  const bucket = getBucket(businessId);
  const isActive = input.isActive ?? true;
  if (input.fiscalYearId) {
    const idx = bucket.fiscalYears.findIndex((f) => f.id === input.fiscalYearId);
    if (idx < 0) throw new Error('سال مالی یافت نشد.');
    if (isActive) {
      bucket.fiscalYears = bucket.fiscalYears.map((f) => ({ ...f, isActive: false }));
    }
    bucket.fiscalYears[idx] = {
      ...bucket.fiscalYears[idx],
      label: input.label,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive,
    };
    saveBucket(businessId, bucket);
    return bucket.fiscalYears[idx];
  }
  if (isActive) {
    bucket.fiscalYears = bucket.fiscalYears.map((f) => ({ ...f, isActive: false }));
  }
  const row: FiscalYearRow = {
    id: `fy-${Date.now()}`,
    label: input.label,
    startDate: input.startDate,
    endDate: input.endDate,
    isActive,
  };
  bucket.fiscalYears.unshift(row);
  saveBucket(businessId, bucket);
  return row;
}
