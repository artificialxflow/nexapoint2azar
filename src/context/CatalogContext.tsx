'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { normalizePhone } from '@/src/lib/pricing';
import { productsFetch } from '@/src/lib/products/client';
import {
  createPersonApi,
  deletePersonApi,
  fetchPeople,
  fetchPeopleModule,
  type PeopleModulePayload,
  savePeopleModuleApi,
  updatePersonApi,
} from '@/src/lib/erp/people-client';
import { saveCatalogModuleApi } from '@/src/lib/erp/commerce-client';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { emitNexaEvent } from '@/src/lib/automation/event-bus';
import type {
  MoneyDocument,
  Person,
  PersonBankAccount,
  PersonCategory,
  PersonEmail,
  PersonGroup,
  PersonGroupLevel,
  PersonRole,
  PriceList,
  ShareholderRecord,
  VendorRecord,
} from '@/src/types/person';
import type { Product, ProductCategory } from '@/src/types/product';
import {
  readCatalogBusinessCache,
  writeCatalogBusinessCache,
  type CatalogLoadFlags,
} from '@/src/lib/erp/catalog-business-cache';
import { registerCatalogPrefetchDelegate } from '@/src/lib/dashboard/sidebar-prefetch';

export type CatalogHydrationScope =
  | 'people'
  | 'catalog'
  | 'peopleModule'
  | 'people+catalog'
  | 'full';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return String(Date.now());
}

export interface DuplicateMatch {
  field: 'phone' | 'nationalId';
  person: Person;
}

interface CatalogContextValue {
  people: Person[];
  products: Product[];
  receipts: MoneyDocument[];
  payments: MoneyDocument[];
  shareholders: ShareholderRecord[];
  vendors: VendorRecord[];
  priceLists: PriceList[];
  personCategories: PersonCategory[];
  personGroups: PersonGroup[];
  upsertPersonGroup: (payload: { id?: string; name: string; levels: PersonGroupLevel[] }) => void;
  removePersonGroup: (id: string) => void;
  upsertPriceList: (payload: {
    id?: string;
    name: string;
    tier?: 'retail' | 'wholesale' | 'partner';
  }) => void;
  removePriceList: (id: string) => void;
  productCategories: ProductCategory[];
  replacePerson: (person: Person) => void;
  addPerson: (person: Person) => void;
  removePerson: (id: string) => void;
  addReceipt: (doc: MoneyDocument) => void;
  replaceReceipt: (doc: MoneyDocument) => void;
  removeReceipt: (id: string) => void;
  addPayment: (doc: MoneyDocument) => void;
  replacePayment: (doc: MoneyDocument) => void;
  removePayment: (id: string) => void;
  addShareholder: (row: ShareholderRecord) => void;
  replaceShareholder: (row: ShareholderRecord) => void;
  removeShareholder: (id: string) => void;
  addVendor: (row: VendorRecord) => void;
  replaceVendor: (row: VendorRecord) => void;
  removeVendor: (id: string) => void;
  addProduct: (product: Product) => void;
  replaceProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  addPersonCategory: (name: string) => void;
  upsertPersonCategory: (payload: { id?: string; name: string; parentId?: string }) => void;
  removePersonCategory: (id: string) => void;
  reorderPersonCategories: (orderedIds: string[]) => void;
  upsertProductCategory: (payload: { id?: string; name: string; parentId?: string }) => void;
  removeProductCategory: (id: string) => void;
  reorderProductCategories: (orderedIds: string[]) => void;
  mergePeople: (sourceId: string, targetId: string) => void;
  generateAccountingCode: () => string;
  generateProductAccountingCode: () => string;
  listDuplicates: () => DuplicateMatch[];
  findDuplicate: (
    phone: string,
    nationalId: string | undefined,
    excludePersonId?: string
  ) => DuplicateMatch | null;
  peopleModuleSaveError: string | null;
  clearPeopleModuleSaveError: () => void;
  /** ذخیره فوری people-module (دریافت/پرداخت/سهامدار/فروشنده) */
  flushPeopleModuleSave: (patch?: Partial<PeopleModulePayload>) => Promise<boolean>;
  catalogModuleSaveError: string | null;
  clearCatalogModuleSaveError: () => void;
  flushCatalogModuleSave: (patch?: {
    productCategories?: ProductCategory[];
    priceLists?: PriceList[];
  }) => Promise<boolean>;
  activeBusinessId: string | null;
  catalogHydrationFlags: CatalogLoadFlags;
  ensureCatalogScope: (scope: CatalogHydrationScope) => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

const DEFAULT_PRICE_LISTS: PriceList[] = [
  { id: 'pl-retail', name: 'نرخ پایه', tier: 'retail' },
];

function migrateEmailsFromStorage(raw: unknown): PersonEmail[] {
  if (!Array.isArray(raw)) {
    const id = newId();
    return [{ id, label: 'اصلی', address: '' }];
  }
  if (raw.length === 0) {
    const id = newId();
    return [{ id, label: 'اصلی', address: '' }];
  }
  const first = raw[0] as unknown;
  if (typeof first === 'string') {
    return (raw as string[]).map((address, i) => ({
      id: newId(),
      label: i === 0 ? 'اصلی' : 'فرعی',
      address: String(address ?? ''),
    }));
  }
  return (raw as PersonEmail[]).map((e) => ({
    id: e.id || newId(),
    label: e.label || 'ایمیل',
    address: e.address || '',
  }));
}

function mergeEmailDedupe(a: PersonEmail[], b: PersonEmail[]): PersonEmail[] {
  const map = new Map<string, PersonEmail>();
  [...a, ...b].forEach((e) => {
    const k = (e.address || '').trim().toLowerCase();
    if (!k) return;
    if (!map.has(k)) map.set(k, { ...e, id: e.id || newId() });
  });
  return [...map.values()];
}

function normalizeBanks(banks: PersonBankAccount[]): PersonBankAccount[] {
  if (!banks.length) return [];
  const mapped = banks.map((b) => ({
    id: b.id || newId(),
    bankName: (b as { bankName?: string; title?: string }).bankName || (b as { title?: string }).title || '',
    accountTitle: b.accountTitle || '',
    iban: b.iban || '',
    cardNumber: b.cardNumber || '',
    accountNumber: b.accountNumber || '',
    isPrimary: !!b.isPrimary,
  }));
  const priIdx = mapped.findIndex((x) => x.isPrimary);
  if (priIdx === -1) return mapped.map((b, i) => ({ ...b, isPrimary: i === 0 }));
  return mapped.map((b, i) => ({ ...b, isPrimary: i === priIdx }));
}

function ensureEmailsAndPrimary(
  emails: PersonEmail[],
  preferredPrimaryId?: string
): { emails: PersonEmail[]; primaryEmailId: string } {
  const list = emails.length ? emails : [{ id: newId(), label: 'اصلی', address: '' }];
  const pid =
    preferredPrimaryId && list.some((e) => e.id === preferredPrimaryId)
      ? preferredPrimaryId
      : list[0].id;
  return { emails: list, primaryEmailId: pid };
}

function cloneProduct(p: Product): Product {
  return {
    ...p,
    categoryIds: [...p.categoryIds],
    prices: { ...p.prices },
    units: { ...p.units },
    inventory: { ...p.inventory },
    tax: { ...p.tax },
    images: { ...p.images, gallery: [...p.images.gallery] },
  };
}

function ensureProductPrices(p: Product, listIds: string[]): Product {
  const prices = { ...p.prices };
  listIds.forEach((id) => {
    if (!(id in prices)) prices[id] = 0;
  });
  return { ...p, prices };
}

function isDescendantCategory<T extends { id: string; parentId?: string }>(
  list: T[],
  targetId: string,
  maybeAncestorId: string
): boolean {
  const map = new Map(list.map((x) => [x.id, x]));
  let cur = map.get(targetId);
  while (cur?.parentId) {
    if (cur.parentId === maybeAncestorId) return true;
    cur = map.get(cur.parentId);
  }
  return false;
}

function reorderByIds<T extends { id: string }>(list: T[], orderedIds: string[]): T[] {
  if (!orderedIds.length) return list;
  const map = new Map(list.map((x) => [x.id, x]));
  const next: T[] = [];
  orderedIds.forEach((id) => {
    const row = map.get(id);
    if (row) {
      next.push(row);
      map.delete(id);
    }
  });
  map.forEach((row) => next.push(row));
  return next;
}

function productToApiPayload(product: Product) {
  return {
    id: product.id,
    accountingCode: product.accountingCode,
    name: product.name,
    code: product.code,
    type: product.type,
    categoryIds: product.categoryIds,
    barcode: product.barcode,
    images: product.images,
    salesDescription: product.salesDescription,
    purchaseDescription: product.purchaseDescription,
    prices: product.prices,
    purchasePrice: product.purchasePrice,
    units: product.units,
    inventory: product.inventory,
    tax: product.tax,
    status: product.status,
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;

  const [priceLists, setPriceLists] = useState<PriceList[]>(() => DEFAULT_PRICE_LISTS);
  const [people, setPeople] = useState<Person[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [receipts, setReceipts] = useState<MoneyDocument[]>([]);
  const [payments, setPayments] = useState<MoneyDocument[]>([]);
  const [shareholders, setShareholders] = useState<ShareholderRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [personCategories, setPersonCategories] = useState<PersonCategory[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [personGroups, setPersonGroups] = useState<PersonGroup[]>([]);
  const [peopleModuleHydrated, setPeopleModuleHydrated] = useState(false);
  const [peopleModuleSaveError, setPeopleModuleSaveError] = useState<string | null>(null);
  const [catalogModuleSaveError, setCatalogModuleSaveError] = useState<string | null>(null);
  const skipModulePersistRef = useRef(true);
  const skipCatalogPersistRef = useRef(true);
  const moduleSaveTimerRef = useRef<number | null>(null);
  const catalogSaveTimerRef = useRef<number | null>(null);
  const moduleSaveInFlightRef = useRef(false);
  const loadFlagsRef = useRef<CatalogLoadFlags>({
    people: false,
    catalog: false,
    peopleModule: false,
  });
  const loadInflightRef = useRef<{
    people?: Promise<void>;
    catalog?: Promise<void>;
    peopleModule?: Promise<void>;
  }>({});

  const priceListIds = useMemo(() => priceLists.map((x) => x.id), [priceLists]);

  const refreshCatalogFromApi = useCallback(async (businessId: string) => {
    skipCatalogPersistRef.current = true;
    const data = await productsFetch<{
      products: Product[];
      productCategories: ProductCategory[];
      priceLists: PriceList[];
    }>(businessId, '/catalog');
    const listIds = data.priceLists.map((x) => x.id);
    setPriceLists(data.priceLists);
    setProductCategories(data.productCategories);
    setProducts(data.products.map((p) => ensureProductPrices(cloneProduct(p), listIds)));
    window.setTimeout(() => {
      skipCatalogPersistRef.current = false;
    }, 150);
  }, []);

  const refreshPeopleFromApi = useCallback(async (businessId: string) => {
    const list = await fetchPeople(businessId);
    const listIds = priceLists.map((x) => x.id);
    setPeople(list.map((p) => normalizePerson(p, listIds)));
  }, [priceLists]);

  const refreshPeopleModuleFromApi = useCallback(async (businessId: string) => {
    skipModulePersistRef.current = true;
    const mod = await fetchPeopleModule(businessId);
    setPersonCategories(mod.personCategories.map((x) => ({ ...x })));
    setPersonGroups(
      mod.personGroups.map((x) => ({ ...x, levels: x.levels.map((l) => ({ ...l })) }))
    );
    setReceipts(mod.receipts.map(cloneMoneyDoc));
    setPayments(mod.payments.map(cloneMoneyDoc));
    setShareholders(mod.shareholders.map((x) => ({ ...x })));
    setVendors(mod.vendors.map((x) => ({ ...x })));
    setPeopleModuleHydrated(true);
    setPeopleModuleSaveError(null);
    window.setTimeout(() => {
      skipModulePersistRef.current = false;
    }, 150);
  }, []);

  const persistCacheSnapshot = useCallback(() => {
    if (!activeBusinessId || FRONTEND_ONLY) return;
    writeCatalogBusinessCache(activeBusinessId, {
      people,
      products,
      receipts,
      payments,
      shareholders,
      vendors,
      priceLists,
      personCategories,
      productCategories,
      personGroups,
      peopleModuleHydrated,
      flags: { ...loadFlagsRef.current },
    });
  }, [
    activeBusinessId,
    people,
    products,
    receipts,
    payments,
    shareholders,
    vendors,
    priceLists,
    personCategories,
    productCategories,
    personGroups,
    peopleModuleHydrated,
  ]);

  const runEnsurePeople = useCallback(
    async (businessId: string) => {
      if (loadFlagsRef.current.people) return;
      if (loadInflightRef.current.people) {
        await loadInflightRef.current.people;
        return;
      }
      const job = refreshPeopleFromApi(businessId)
        .then(() => {
          loadFlagsRef.current.people = true;
        })
        .finally(() => {
          delete loadInflightRef.current.people;
        });
      loadInflightRef.current.people = job;
      await job;
    },
    [refreshPeopleFromApi]
  );

  const runEnsureCatalog = useCallback(
    async (businessId: string) => {
      if (loadFlagsRef.current.catalog) return;
      if (loadInflightRef.current.catalog) {
        await loadInflightRef.current.catalog;
        return;
      }
      const job = refreshCatalogFromApi(businessId)
        .then(() => {
          loadFlagsRef.current.catalog = true;
        })
        .finally(() => {
          delete loadInflightRef.current.catalog;
        });
      loadInflightRef.current.catalog = job;
      await job;
    },
    [refreshCatalogFromApi]
  );

  const runEnsurePeopleModule = useCallback(
    async (businessId: string) => {
      if (loadFlagsRef.current.peopleModule && peopleModuleHydrated) return;
      if (loadInflightRef.current.peopleModule) {
        await loadInflightRef.current.peopleModule;
        return;
      }
      const job = refreshPeopleModuleFromApi(businessId)
        .then(() => {
          loadFlagsRef.current.peopleModule = true;
        })
        .finally(() => {
          delete loadInflightRef.current.peopleModule;
        });
      loadInflightRef.current.peopleModule = job;
      await job;
    },
    [peopleModuleHydrated, refreshPeopleModuleFromApi]
  );

  const ensureCatalogScope = useCallback(
    async (scope: CatalogHydrationScope) => {
      if (FRONTEND_ONLY || !activeBusinessId) return;
      const businessId = activeBusinessId;
      if (scope === 'people' || scope === 'people+catalog' || scope === 'full') {
        await runEnsurePeople(businessId);
      }
      if (scope === 'catalog' || scope === 'people+catalog' || scope === 'full') {
        await runEnsureCatalog(businessId);
      }
      if (scope === 'peopleModule' || scope === 'full') {
        await runEnsurePeopleModule(businessId);
      }
      persistCacheSnapshot();
    },
    [
      activeBusinessId,
      persistCacheSnapshot,
      runEnsureCatalog,
      runEnsurePeople,
      runEnsurePeopleModule,
    ]
  );

  useEffect(() => {
    loadInflightRef.current = {};
    if (FRONTEND_ONLY || !activeBusinessId) {
      loadFlagsRef.current = { people: false, catalog: false, peopleModule: false };
      return;
    }
    const cached = readCatalogBusinessCache(activeBusinessId);
    if (cached) {
      setPeople(cached.people);
      setProducts(cached.products);
      setReceipts(cached.receipts.map(cloneMoneyDoc));
      setPayments(cached.payments.map(cloneMoneyDoc));
      setShareholders(cached.shareholders.map((x) => ({ ...x })));
      setVendors(cached.vendors.map((x) => ({ ...x })));
      setPriceLists(cached.priceLists.map((x) => ({ ...x })));
      setPersonCategories(cached.personCategories.map((x) => ({ ...x })));
      setProductCategories(cached.productCategories.map((x) => ({ ...x })));
      setPersonGroups(
        cached.personGroups.map((x) => ({ ...x, levels: x.levels.map((l) => ({ ...l })) }))
      );
      setPeopleModuleHydrated(cached.peopleModuleHydrated);
      loadFlagsRef.current = { ...cached.flags };
      skipModulePersistRef.current = true;
      skipCatalogPersistRef.current = true;
      window.setTimeout(() => {
        skipModulePersistRef.current = false;
        skipCatalogPersistRef.current = false;
      }, 150);
      void (async () => {
        const tasks: Promise<void>[] = [];
        if (cached.flags.people) tasks.push(runEnsurePeople(activeBusinessId));
        if (cached.flags.catalog) tasks.push(runEnsureCatalog(activeBusinessId));
        if (cached.flags.peopleModule) tasks.push(runEnsurePeopleModule(activeBusinessId));
        await Promise.all(tasks);
        persistCacheSnapshot();
      })();
      return;
    }
    setPeople([]);
    setProducts([]);
    setReceipts([]);
    setPayments([]);
    setShareholders([]);
    setVendors([]);
    setPersonCategories([]);
    setProductCategories([]);
    setPriceLists(DEFAULT_PRICE_LISTS);
    setPersonGroups([]);
    setPeopleModuleHydrated(false);
    loadFlagsRef.current = { people: false, catalog: false, peopleModule: false };
  }, [
    activeBusinessId,
    persistCacheSnapshot,
    runEnsureCatalog,
    runEnsurePeople,
    runEnsurePeopleModule,
  ]);

  useEffect(() => {
    persistCacheSnapshot();
  }, [persistCacheSnapshot]);

  useEffect(() => {
    registerCatalogPrefetchDelegate((businessId, scope) => {
      if (businessId !== activeBusinessId) return;
      void ensureCatalogScope(scope);
    });
    return () => {
      registerCatalogPrefetchDelegate(() => undefined);
    };
  }, [activeBusinessId, ensureCatalogScope]);

  const flushCatalogModuleSave = useCallback(
    async (patch?: { productCategories?: ProductCategory[]; priceLists?: PriceList[] }): Promise<boolean> => {
      if (FRONTEND_ONLY || !activeBusinessId) return true;
      if (skipCatalogPersistRef.current && !patch) return true;
      if (catalogSaveTimerRef.current) {
        window.clearTimeout(catalogSaveTimerRef.current);
        catalogSaveTimerRef.current = null;
      }
      const payload = {
        productCategories: patch?.productCategories ?? productCategories,
        priceLists: patch?.priceLists ?? priceLists,
      };
      try {
        const saved = await saveCatalogModuleApi(activeBusinessId, payload);
        skipCatalogPersistRef.current = true;
        setProductCategories(saved.productCategories.map((x) => ({ ...x })));
        setPriceLists(saved.priceLists.map((x) => ({ ...x })));
        setCatalogModuleSaveError(null);
        window.setTimeout(() => {
          skipCatalogPersistRef.current = false;
        }, 150);
        return true;
      } catch (e) {
        const msg =
          e instanceof Error && e.message
            ? e.message
            : 'ذخیره دسته‌بندی/لیست قیمت در سرور ناموفق بود.';
        setCatalogModuleSaveError(msg);
        return false;
      }
    },
    [activeBusinessId, productCategories, priceLists]
  );

  useEffect(() => {
    if (FRONTEND_ONLY || !activeBusinessId || skipCatalogPersistRef.current) return;
    if (catalogSaveTimerRef.current) window.clearTimeout(catalogSaveTimerRef.current);
    catalogSaveTimerRef.current = window.setTimeout(() => {
      catalogSaveTimerRef.current = null;
      void flushCatalogModuleSave();
    }, 900);
    return () => {
      if (catalogSaveTimerRef.current) window.clearTimeout(catalogSaveTimerRef.current);
    };
  }, [activeBusinessId, productCategories, priceLists, flushCatalogModuleSave]);

  const flushPeopleModuleSave = useCallback(async (patch?: Partial<PeopleModulePayload>): Promise<boolean> => {
    if (FRONTEND_ONLY || !activeBusinessId || !peopleModuleHydrated) return true;
    if (skipModulePersistRef.current && !patch) return true;
    if (moduleSaveInFlightRef.current) {
      if (!patch) return false;
      for (let i = 0; i < 40 && moduleSaveInFlightRef.current; i++) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
      }
      if (moduleSaveInFlightRef.current) return false;
    }
    if (patch) {
      if (moduleSaveTimerRef.current) {
        window.clearTimeout(moduleSaveTimerRef.current);
        moduleSaveTimerRef.current = null;
      }
      skipModulePersistRef.current = true;
    }
    const payload = {
      personCategories: patch?.personCategories ?? personCategories,
      personGroups: patch?.personGroups ?? personGroups,
      receipts: patch?.receipts ?? receipts,
      payments: patch?.payments ?? payments,
      shareholders: patch?.shareholders ?? shareholders,
      vendors: patch?.vendors ?? vendors,
    };
    moduleSaveInFlightRef.current = true;
    try {
      const saved = await savePeopleModuleApi(activeBusinessId, payload);
      skipModulePersistRef.current = true;
      setReceipts(saved.receipts.map(cloneMoneyDoc));
      setPayments(saved.payments.map(cloneMoneyDoc));
      setShareholders(saved.shareholders.map((x) => ({ ...x })));
      setVendors(saved.vendors.map((x) => ({ ...x })));
      const patchVendors = patch?.vendors;
      const patchShareholders = patch?.shareholders;
      if (patchVendors && saved.vendors.length < patchVendors.length) {
        setPeopleModuleSaveError(
          'برخی فروشندگان ذخیره نشدند. شخص را در «اشخاص» ثبت کنید یا شخص دیگری انتخاب کنید.'
        );
      } else if (patchShareholders && saved.shareholders.length < patchShareholders.length) {
        setPeopleModuleSaveError(
          'برخی سهامداران ذخیره نشدند. شخص را در «اشخاص» ثبت کنید یا شخص دیگری انتخاب کنید.'
        );
      } else {
        setPeopleModuleSaveError(null);
      }
      const skipMs = patch ? 600 : 150;
      window.setTimeout(() => {
        skipModulePersistRef.current = false;
      }, skipMs);
      return true;
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : 'ذخیره دریافت/پرداخت/سهامدار/فروشنده در سرور ناموفق بود.';
      setPeopleModuleSaveError(msg);
      return false;
    } finally {
      moduleSaveInFlightRef.current = false;
    }
  }, [
    activeBusinessId,
    peopleModuleHydrated,
    personCategories,
    personGroups,
    receipts,
    payments,
    shareholders,
    vendors,
  ]);

  const schedulePeopleModuleSave = useCallback(() => {
    if (FRONTEND_ONLY || !activeBusinessId || !peopleModuleHydrated || skipModulePersistRef.current) {
      return;
    }
    if (moduleSaveTimerRef.current) window.clearTimeout(moduleSaveTimerRef.current);
    moduleSaveTimerRef.current = window.setTimeout(() => {
      void flushPeopleModuleSave();
    }, 300);
  }, [activeBusinessId, peopleModuleHydrated, flushPeopleModuleSave]);

  useEffect(() => {
    schedulePeopleModuleSave();
  }, [
    receipts,
    payments,
    shareholders,
    vendors,
    personCategories,
    personGroups,
    schedulePeopleModuleSave,
  ]);

  const clearPeopleModuleSaveError = useCallback(() => setPeopleModuleSaveError(null), []);
  const clearCatalogModuleSaveError = useCallback(() => setCatalogModuleSaveError(null), []);

  const upsertPersonGroup = useCallback((payload: { id?: string; name: string; levels: PersonGroupLevel[] }) => {
    setPersonGroups((prev) => {
      const id = payload.id?.trim() || newId();
      const name = payload.name.trim() || 'گروه';
      const levels =
        payload.levels.length > 0
          ? payload.levels.map((l) => ({ ...l, id: l.id?.trim() || newId() }))
          : [{ id: newId(), label: 'سطح ۱' }];
      const row: PersonGroup = { id, name, levels };
      const idx = prev.findIndex((x) => x.id === id);
      if (idx === -1) return [...prev, row];
      const next = [...prev];
      next[idx] = row;
      return next;
    });
  }, []);

  const removePersonGroup = useCallback((id: string) => {
    setPersonGroups((prev) => prev.filter((g) => g.id !== id));
    setPeople((prev) =>
      prev.map((person) => ({
        ...person,
        groupMemberships: person.groupMemberships.filter((m) => m.groupId !== id),
      }))
    );
  }, []);

  const upsertPriceList = useCallback(
    (payload: { id?: string; name: string; tier?: PriceList['tier'] }) => {
      setPriceLists((prev) => {
        const id = payload.id?.trim() || newId();
        const name = payload.name.trim() || 'لیست قیمت';
        const idx = prev.findIndex((x) => x.id === id);
        const existing = idx >= 0 ? prev[idx] : undefined;
        const row: PriceList = {
          id,
          name,
          tier: payload.tier !== undefined ? payload.tier : existing?.tier,
        };
        const next = idx === -1 ? [...prev, row] : prev.map((x, i) => (i === idx ? row : x));
        const ids = next.map((x) => x.id);
        setProducts((prods) => prods.map((p) => ensureProductPrices(p, ids)));
        return next;
      });
    },
    []
  );

  const removePriceList = useCallback((id: string) => {
    setPriceLists((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((x) => x.id !== id);
      const fallback = next[0]?.id;
      setProducts((prods) =>
        prods.map((p) => {
          const prices = { ...p.prices };
          delete prices[id];
          return ensureProductPrices({ ...p, prices }, next.map((x) => x.id));
        })
      );
      setPeople((ps) =>
        ps.map((person) =>
          person.defaultPriceListId === id ? { ...person, defaultPriceListId: fallback } : person
        )
      );
      return next;
    });
  }, []);

  // Persistence is handled directly via PostgreSQL APIs (no localStorage fallback).

  const findDuplicate = useCallback(
    (phone: string, nationalId: string | undefined, excludePersonId?: string) => {
      const nPhone = normalizePhone(phone);
      if (nPhone.length >= 10) {
        const byPhone = people.find((p) => {
          if (p.id === excludePersonId) return false;
          return p.phones.some((ph) => normalizePhone(ph.number) === nPhone);
        });
        if (byPhone) return { field: 'phone' as const, person: byPhone };
      }
      const nid = (nationalId || '').replace(/\s/g, '');
      if (nid.length >= 8) {
        const byN = people.find((p) => {
          if (p.id === excludePersonId) return false;
          return (p.nationalId || '').replace(/\s/g, '') === nid;
        });
        if (byN) return { field: 'nationalId' as const, person: byN };
      }
      return null;
    },
    [people]
  );

  const listDuplicates = useCallback(() => {
    const seenPhones = new Map<string, Person>();
    const seenNationalIds = new Map<string, Person>();
    const matches: DuplicateMatch[] = [];
    people.forEach((person) => {
      person.phones.forEach((phone) => {
        const normalized = normalizePhone(phone.number);
        if (normalized.length < 10) return;
        const existing = seenPhones.get(normalized);
        if (existing && existing.id !== person.id) {
          matches.push({ field: 'phone', person });
        } else {
          seenPhones.set(normalized, person);
        }
      });
      const nid = (person.nationalId || '').replace(/\s/g, '');
      if (nid.length >= 8) {
        const existing = seenNationalIds.get(nid);
        if (existing && existing.id !== person.id) {
          matches.push({ field: 'nationalId', person });
        } else {
          seenNationalIds.set(nid, person);
        }
      }
    });
    return matches;
  }, [people]);

  const replacePerson = useCallback(
    (person: Person) => {
      const row = normalizePerson(person, priceListIds);
      if (activeBusinessId && !FRONTEND_ONLY) {
        void updatePersonApi(activeBusinessId, row)
          .then((updated) => {
            setPeople((prev) => {
              const i = prev.findIndex((p) => p.id === updated.id);
              const norm = normalizePerson(updated, priceListIds);
              if (i === -1) return [norm, ...prev];
              const next = [...prev];
              next[i] = norm;
              return next;
            });
          })
          .catch(() => undefined);
        return;
      }
      setPeople((prev) => {
        const i = prev.findIndex((p) => p.id === person.id);
        if (i === -1) return [row, ...prev];
        const next = [...prev];
        next[i] = row;
        return next;
      });
    },
    [activeBusinessId, priceListIds]
  );

  const addPerson = useCallback(
    (person: Person) => {
      const row = normalizePerson(person, priceListIds);
      if (activeBusinessId && !FRONTEND_ONLY) {
        void createPersonApi(activeBusinessId, row)
          .then((created) => {
            setPeople((prev) => [
              normalizePerson(created, priceListIds),
              ...prev.filter((p) => p.id !== row.id),
            ]);
          })
          .catch(() => undefined);
        return;
      }
      setPeople((prev) => [row, ...prev]);
    },
    [activeBusinessId, priceListIds]
  );

  const removePerson = useCallback(
    (id: string) => {
      if (activeBusinessId && !FRONTEND_ONLY) {
        void deletePersonApi(activeBusinessId, id)
          .then(() => setPeople((prev) => prev.filter((p) => p.id !== id)))
          .catch(() => undefined);
        return;
      }
      setPeople((prev) => prev.filter((p) => p.id !== id));
    },
    [activeBusinessId]
  );

  const addReceipt = useCallback(
    (doc: MoneyDocument) => {
      setReceipts((prev) => [cloneMoneyDoc(doc), ...prev]);
      emitNexaEvent({
        type: 'sales.invoice.created',
        businessId: activeBusinessId,
        title: `رسید ${doc.number || doc.id}`,
        payload: { customer: doc.description, documentId: doc.id },
      });
    },
    [activeBusinessId]
  );

  const replaceReceipt = useCallback((doc: MoneyDocument) => {
    setReceipts((prev) => {
      const i = prev.findIndex((x) => x.id === doc.id);
      if (i === -1) return [cloneMoneyDoc(doc), ...prev];
      const next = [...prev];
      next[i] = cloneMoneyDoc(doc);
      return next;
    });
  }, []);

  const removeReceipt = useCallback((id: string) => {
    setReceipts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addPayment = useCallback((doc: MoneyDocument) => {
    setPayments((prev) => [cloneMoneyDoc(doc), ...prev]);
  }, []);

  const replacePayment = useCallback((doc: MoneyDocument) => {
    setPayments((prev) => {
      const i = prev.findIndex((x) => x.id === doc.id);
      if (i === -1) return [cloneMoneyDoc(doc), ...prev];
      const next = [...prev];
      next[i] = cloneMoneyDoc(doc);
      return next;
    });
  }, []);

  const removePayment = useCallback((id: string) => {
    setPayments((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addShareholder = useCallback((row: ShareholderRecord) => {
    setShareholders((prev) => {
      if (row.personId && prev.some((x) => x.personId === row.personId)) {
        setPeopleModuleSaveError('این شخص قبلاً در لیست سهامداران ثبت شده است.');
        return prev;
      }
      return [{ ...row }, ...prev];
    });
  }, []);

  const replaceShareholder = useCallback((row: ShareholderRecord) => {
    setShareholders((prev) => {
      const dup = prev.some((x) => x.id !== row.id && x.personId === row.personId && row.personId);
      if (dup) {
        setPeopleModuleSaveError('این شخص قبلاً در لیست سهامداران ثبت شده است.');
        return prev;
      }
      const i = prev.findIndex((x) => x.id === row.id);
      if (i === -1) return [{ ...row }, ...prev];
      const next = [...prev];
      next[i] = { ...row };
      return next;
    });
  }, []);

  const removeShareholder = useCallback((id: string) => {
    setShareholders((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addVendor = useCallback((row: VendorRecord) => {
    setVendors((prev) => {
      if (row.personId && prev.some((x) => x.personId === row.personId)) {
        setPeopleModuleSaveError('این شخص قبلاً در لیست فروشندگان ثبت شده است.');
        return prev;
      }
      return [{ ...row }, ...prev];
    });
  }, []);

  const replaceVendor = useCallback((row: VendorRecord) => {
    setVendors((prev) => {
      const dup = prev.some((x) => x.id !== row.id && x.personId === row.personId && row.personId);
      if (dup) {
        setPeopleModuleSaveError('این شخص قبلاً در لیست فروشندگان ثبت شده است.');
        return prev;
      }
      const i = prev.findIndex((x) => x.id === row.id);
      if (i === -1) return [{ ...row }, ...prev];
      const next = [...prev];
      next[i] = { ...row };
      return next;
    });
  }, []);

  const removeVendor = useCallback((id: string) => {
    setVendors((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addProduct = useCallback(
    (product: Product) => {
      if (activeBusinessId && !FRONTEND_ONLY) {
        void productsFetch<{ product: Product }>(activeBusinessId, '/products', {
          method: 'POST',
          body: JSON.stringify({ product: productToApiPayload(product) }),
        })
          .then(({ product: created }) => {
            setProducts((prev) => [
              ensureProductPrices(cloneProduct(created), priceListIds),
              ...prev.filter((p) => p.id !== product.id),
            ]);
          })
          .catch(() => undefined);
        return;
      }
      setProducts((prev) => [
        ensureProductPrices(cloneProduct(product), priceListIds),
        ...prev,
      ]);
    },
    [activeBusinessId, priceListIds]
  );

  const replaceProduct = useCallback(
    (product: Product) => {
      if (activeBusinessId && !FRONTEND_ONLY && product.id) {
        void productsFetch<{ product: Product }>(activeBusinessId, `/products/${encodeURIComponent(product.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ product: productToApiPayload(product) }),
        })
          .then(({ product: updated }) => {
            setProducts((prev) => {
              const i = prev.findIndex((p) => p.id === updated.id);
              const row = ensureProductPrices(cloneProduct(updated), priceListIds);
              if (i === -1) return [row, ...prev];
              const next = [...prev];
              next[i] = row;
              return next;
            });
          })
          .catch(() => undefined);
        return;
      }
      setProducts((prev) => {
        const i = prev.findIndex((p) => p.id === product.id);
        const row = ensureProductPrices(cloneProduct(product), priceListIds);
        if (i === -1) return [row, ...prev];
        const next = [...prev];
        next[i] = row;
        return next;
      });
    },
    [activeBusinessId, priceListIds]
  );

  const removeProduct = useCallback(
    (id: string) => {
      if (activeBusinessId && !FRONTEND_ONLY) {
        void productsFetch(activeBusinessId, `/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
          .then(() => setProducts((prev) => prev.filter((p) => p.id !== id)))
          .catch(() => undefined);
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
    },
    [activeBusinessId]
  );

  const addPersonCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPersonCategories((prev) => [...prev, { id: newId(), name: trimmed }]);
  }, []);

  const upsertPersonCategory = useCallback(
    (payload: { id?: string; name: string; parentId?: string }) => {
      const name = payload.name.trim();
      if (!name) return;
      setPersonCategories((prev) => {
        const parentId = payload.parentId || undefined;
        if (!payload.id) {
          const canUseParent = parentId && prev.some((x) => x.id === parentId);
          return [...prev, { id: newId(), name, parentId: canUseParent ? parentId : undefined }];
        }
        const canUseParent =
          parentId &&
          parentId !== payload.id &&
          prev.some((x) => x.id === parentId) &&
          !isDescendantCategory(prev, parentId, payload.id);
        return prev.map((row) => (row.id === payload.id ? { ...row, name, parentId: canUseParent ? parentId : undefined } : row));
      });
    },
    []
  );

  const removePersonCategory = useCallback((id: string) => {
    setPersonCategories((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c) => (c.parentId === id ? { ...c, parentId: undefined } : c))
    );
    setPeople((prev) =>
      prev.map((p) => ({
        ...p,
        categoryIds: p.categoryIds.filter((cid) => cid !== id),
      }))
    );
  }, []);

  const reorderPersonCategories = useCallback((orderedIds: string[]) => {
    setPersonCategories((prev) => reorderByIds(prev, orderedIds));
  }, []);

  const upsertProductCategory = useCallback(
    (payload: { id?: string; name: string; parentId?: string }) => {
      const name = payload.name.trim();
      if (!name) return;
      setProductCategories((prev) => {
        const parentId = payload.parentId || undefined;
        if (!payload.id) {
          const canUseParent = parentId && prev.some((x) => x.id === parentId);
          return [...prev, { id: newId(), name, parentId: canUseParent ? parentId : undefined }];
        }
        const canUseParent =
          parentId &&
          parentId !== payload.id &&
          prev.some((x) => x.id === parentId) &&
          !isDescendantCategory(prev, parentId, payload.id);
        return prev.map((row) => (row.id === payload.id ? { ...row, name, parentId: canUseParent ? parentId : undefined } : row));
      });
    },
    []
  );

  const removeProductCategory = useCallback((id: string) => {
    setProductCategories((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c) => (c.parentId === id ? { ...c, parentId: undefined } : c))
    );
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        categoryIds: p.categoryIds.filter((cid) => cid !== id),
      }))
    );
  }, []);

  const reorderProductCategories = useCallback((orderedIds: string[]) => {
    setProductCategories((prev) => reorderByIds(prev, orderedIds));
  }, []);

  const generateAccountingCode = useCallback(() => {
    const max = people.reduce((acc, person) => {
      const n = Number(person.accountingCode);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 10000);
    return String(max + 1);
  }, [people]);

  const generateProductAccountingCode = useCallback(() => {
    const max = products.reduce((acc, product) => {
      const n = Number(product.accountingCode);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 20000);
    return String(max + 1);
  }, [products]);

  const mergePeople = useCallback((sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setPeople((prev) => {
      const source = prev.find((p) => p.id === sourceId);
      const target = prev.find((p) => p.id === targetId);
      if (!source || !target) return prev;
      const mergedEmails = mergeEmailDedupe(target.emails, source.emails);
      const emailsFinal =
        mergedEmails.length > 0
          ? mergedEmails
          : [{ id: newId(), label: 'اصلی', address: '' }];
      const primaryEmailId =
        target.primaryEmailId && emailsFinal.some((e) => e.id === target.primaryEmailId)
          ? target.primaryEmailId
          : emailsFinal[0].id;
      const mergedGroupMs = [...target.groupMemberships];
      source.groupMemberships.forEach((m) => {
        if (!mergedGroupMs.some((x) => x.groupId === m.groupId && x.levelId === m.levelId)) {
          mergedGroupMs.push({ ...m });
        }
      });
      const mergedBanksRaw = [
        ...target.banks,
        ...source.banks.filter(
          (b) =>
            !target.banks.some(
              (x) =>
                (x.iban && b.iban && x.iban === b.iban) ||
                (x.cardNumber && b.cardNumber && x.cardNumber === b.cardNumber) ||
                (x.accountNumber && b.accountNumber && x.accountNumber === b.accountNumber)
            )
        ),
      ];
      const merged: Person = {
        ...target,
        roles: Array.from(new Set([...target.roles, ...source.roles])),
        categoryIds: Array.from(new Set([...target.categoryIds, ...source.categoryIds])),
        emails: emailsFinal,
        primaryEmailId,
        groupMemberships: mergedGroupMs,
        phones: [...target.phones, ...source.phones.filter((ph) => !target.phones.some((x) => x.number === ph.number))],
        addresses: [...target.addresses, ...source.addresses.filter((a) => !target.addresses.some((x) => x.text === a.text))],
        banks: normalizeBanks(mergedBanksRaw),
        importantDates: [...target.importantDates, ...source.importantDates],
        ledger: {
          financial: [...target.ledger.financial, ...source.ledger.financial],
          marketing: [...target.ledger.marketing, ...source.ledger.marketing],
          activity: [...target.ledger.activity, ...source.ledger.activity],
          orders: [...target.ledger.orders, ...source.ledger.orders],
        },
      };
      return prev
        .filter((p) => p.id !== sourceId)
        .map((p) => (p.id === targetId ? normalizePerson(merged, priceListIds) : p));
    });
    setReceipts((prev) =>
      prev.map((doc) => ({
        ...doc,
        lines: doc.lines.map((line) => (line.personId === sourceId ? { ...line, personId: targetId } : line)),
      }))
    );
    setPayments((prev) =>
      prev.map((doc) => ({
        ...doc,
        lines: doc.lines.map((line) => (line.personId === sourceId ? { ...line, personId: targetId } : line)),
      }))
    );
    setShareholders((prev) =>
      prev
        .map((x) => (x.personId === sourceId ? { ...x, personId: targetId } : x))
        .filter((row, idx, arr) => arr.findIndex((x) => x.personId === row.personId) === idx)
    );
    setVendors((prev) =>
      prev
        .map((x) => (x.personId === sourceId ? { ...x, personId: targetId } : x))
        .filter((row, idx, arr) => arr.findIndex((x) => x.personId === row.personId) === idx)
    );
  }, [priceListIds]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      people,
      products,
      receipts,
      payments,
      shareholders,
      vendors,
      priceLists,
      personCategories,
      personGroups,
      upsertPersonGroup,
      removePersonGroup,
      upsertPriceList,
      removePriceList,
      productCategories,
      replacePerson,
      addPerson,
      removePerson,
      addReceipt,
      replaceReceipt,
      removeReceipt,
      addPayment,
      replacePayment,
      removePayment,
      addShareholder,
      replaceShareholder,
      removeShareholder,
      addVendor,
      replaceVendor,
      removeVendor,
      addProduct,
      replaceProduct,
      removeProduct,
      addPersonCategory,
      upsertPersonCategory,
      removePersonCategory,
      reorderPersonCategories,
      upsertProductCategory,
      removeProductCategory,
      reorderProductCategories,
      mergePeople,
      generateAccountingCode,
      generateProductAccountingCode,
      listDuplicates,
      findDuplicate,
      peopleModuleSaveError,
      clearPeopleModuleSaveError,
      flushPeopleModuleSave,
      catalogModuleSaveError,
      clearCatalogModuleSaveError,
      flushCatalogModuleSave,
      activeBusinessId,
      catalogHydrationFlags: loadFlagsRef.current,
      ensureCatalogScope,
    }),
    [
      people,
      products,
      activeBusinessId,
      ensureCatalogScope,
      receipts,
      payments,
      shareholders,
      vendors,
      priceLists,
      personCategories,
      personGroups,
      upsertPersonGroup,
      removePersonGroup,
      upsertPriceList,
      removePriceList,
      productCategories,
      replacePerson,
      addPerson,
      removePerson,
      addReceipt,
      replaceReceipt,
      removeReceipt,
      addPayment,
      replacePayment,
      removePayment,
      addShareholder,
      replaceShareholder,
      removeShareholder,
      addVendor,
      replaceVendor,
      removeVendor,
      addProduct,
      replaceProduct,
      removeProduct,
      addPersonCategory,
      upsertPersonCategory,
      removePersonCategory,
      reorderPersonCategories,
      upsertProductCategory,
      removeProductCategory,
      reorderProductCategories,
      mergePeople,
      generateAccountingCode,
      generateProductAccountingCode,
      listDuplicates,
      findDuplicate,
      peopleModuleSaveError,
      clearPeopleModuleSaveError,
      flushPeopleModuleSave,
      catalogModuleSaveError,
      clearCatalogModuleSaveError,
      flushCatalogModuleSave,
    ]
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

function normalizePerson(p: Person, validPriceListIds?: string[]): Person {
  const roles: PersonRole[] =
    Array.isArray(p.roles) && p.roles.length ? p.roles : ['customer'];
  const phones = Array.isArray(p.phones) && p.phones.length ? p.phones : [{ id: newId(), label: 'موبایل', number: '' }];
  const emailsMigrated = migrateEmailsFromStorage((p as { emails?: unknown }).emails);
  const { emails, primaryEmailId } = ensureEmailsAndPrimary(emailsMigrated, p.primaryEmailId);
  const banksNorm = normalizeBanks((p.banks || []) as PersonBankAccount[]);
  let defaultPriceListId = p.defaultPriceListId;
  if (validPriceListIds !== undefined) {
    if (validPriceListIds.length === 0) {
      defaultPriceListId = undefined;
    } else {
      const set = new Set(validPriceListIds);
      if (!defaultPriceListId || !set.has(defaultPriceListId)) {
        defaultPriceListId = validPriceListIds[0];
      }
    }
  }
  return {
    ...p,
    title: p.title || '',
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    accountingCode: p.accountingCode || String(Math.max(10001, Number(p.id) + 10000 || 10001)),
    taxProfile: p.taxProfile || 'vat-included',
    roles: [...roles],
    emails: emails.map((e) => ({ ...e })),
    primaryEmailId,
    defaultPriceListId,
    categoryIds: [...(p.categoryIds || [])],
    groupMemberships: (p.groupMemberships || []).map((m) => ({ ...m })),
    addresses: (p.addresses || []).map((a) => ({ ...a })),
    phones: phones.map((ph) => ({ ...ph })),
    primaryPhoneId: p.primaryPhoneId || phones[0]?.id,
    banks: banksNorm,
    importantDates: (p.importantDates || []).map((d) => ({ ...d })),
    ledger: {
      financial: (p.ledger?.financial || []).map((x) => ({ ...x })),
      marketing: (p.ledger?.marketing || []).map((x) => ({ ...x })),
      activity: (p.ledger?.activity || []).map((x) => ({ ...x })),
      orders: (p.ledger?.orders || []).map((x) => ({ ...x })),
    },
  };
}

function cloneMoneyDoc(doc: MoneyDocument): MoneyDocument {
  return {
    ...doc,
    lines: doc.lines.map((line) => ({ ...line })),
    notes: [...(doc.notes || [])],
    attachments: (doc.attachments || []).map((att) => ({ ...att })),
    history: (doc.history || []).map((event) => ({ ...event })),
  };
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return ctx;
}

export { newId };
