'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { fetchStoreModule, saveStoreModuleApi } from '@/src/lib/erp/commerce-client';
import type { StoreModulePayload } from '@/src/types/commerce';

const defaultStore = (): StoreModulePayload => ({
  products: [],
  orders: [],
  seo: { title: '', description: '', keywords: '' },
  settings: { shopName: 'فروشگاه نکسا', currency: 'تومان', shippingNote: '' },
});

export function useStoreModuleState() {
  const businessId = useBusinessOptional()?.activeBusinessId ?? null;
  const [module, setModule] = useState<StoreModulePayload>(() => defaultStore());
  const moduleRef = useRef(module);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    moduleRef.current = module;
  }, [module]);

  useEffect(() => {
    if (FRONTEND_ONLY || !businessId) {
      setHydrated(true);
      return;
    }
    setHydrated(false);
    void fetchStoreModule(businessId)
      .then((m) => {
        moduleRef.current = m;
        setModule(m);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, [businessId]);

  const persist = useCallback(
    async (updater: StoreModulePayload | ((prev: StoreModulePayload) => StoreModulePayload)) => {
      if (!hydrated && !FRONTEND_ONLY && businessId) {
        setSaveError('در حال بارگذاری فروشگاه…');
        return false;
      }
      const prev = moduleRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      moduleRef.current = next;
      setModule(next);
      if (FRONTEND_ONLY || !businessId) return true;
      try {
        const saved = await saveStoreModuleApi(businessId, next);
        moduleRef.current = saved;
        setModule(saved);
        setSaveError(null);
        return true;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'خطا در ذخیره فروشگاه');
        return false;
      }
    },
    [businessId, hydrated]
  );

  return { module, setModule, persist, hydrated, saveError };
}
