'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { fetchCommerceModule, saveCommerceModuleApi } from '@/src/lib/erp/commerce-client';
import type { CommerceModulePayload } from '@/src/types/commerce';

export const emptyCommerceModule = (): CommerceModulePayload => ({
  saleInvoices: [],
  incomeTypes: ['فروش نقدی', 'سود سپرده', 'درآمد خدمات'],
  incomeRows: [],
  installments: [],
  productDiscounts: [],
  purchaseInvoices: [],
  expenses: [],
  wastes: [],
});

export function useCommerceModuleState() {
  const businessId = useBusinessOptional()?.activeBusinessId ?? null;
  const [module, setModule] = useState<CommerceModulePayload>(() => emptyCommerceModule());
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
    void fetchCommerceModule(businessId)
      .then((m) => {
        moduleRef.current = m;
        setModule(m);
        setHydrated(true);
        setSaveError(null);
      })
      .catch(() => {
        setHydrated(true);
      });
  }, [businessId]);

  const persist = useCallback(
    async (
      updater: CommerceModulePayload | ((prev: CommerceModulePayload) => CommerceModulePayload)
    ) => {
      if (!hydrated && !FRONTEND_ONLY && businessId) {
        setSaveError('در حال بارگذاری دادهٔ بازرگانی… لطفاً چند ثانیه صبر کنید.');
        return false;
      }
      const prev = moduleRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      moduleRef.current = next;
      setModule(next);
      if (FRONTEND_ONLY || !businessId) return true;
      try {
        const saved = await saveCommerceModuleApi(businessId, next);
        moduleRef.current = saved;
        setModule(saved);
        setSaveError(null);
        return true;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'خطا در ذخیره بازرگانی');
        return false;
      }
    },
    [businessId, hydrated]
  );

  return { module, setModule, persist, hydrated, saveError, businessId };
}
