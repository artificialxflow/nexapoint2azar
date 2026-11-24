'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { fetchProductionModule, saveProductionModuleApi } from '@/src/lib/erp/production-client';
import type { ProductionModulePayload } from '@/src/types/production';

export const emptyProductionModule = (): ProductionModulePayload => ({
  customerOrders: [],
  procurementRequests: [],
  formulas: [],
  productionOrders: [],
  workOrders: [],
});

export function useProductionModuleState() {
  const businessId = useBusinessOptional()?.activeBusinessId ?? null;
  const [module, setModule] = useState<ProductionModulePayload>(() => emptyProductionModule());
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
    void fetchProductionModule(businessId)
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
      updater: ProductionModulePayload | ((prev: ProductionModulePayload) => ProductionModulePayload)
    ) => {
      if (!hydrated && !FRONTEND_ONLY && businessId) {
        setSaveError('در حال بارگذاری دادهٔ تولید… لطفاً چند ثانیه صبر کنید.');
        return false;
      }
      const prev = moduleRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      moduleRef.current = next;
      setModule(next);
      if (FRONTEND_ONLY || !businessId) return true;
      try {
        const saved = await saveProductionModuleApi(businessId, next);
        moduleRef.current = saved;
        setModule(saved);
        setSaveError(null);
        return true;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'خطا در ذخیره تولید');
        return false;
      }
    },
    [businessId, hydrated]
  );

  return { module, setModule, persist, hydrated, saveError, businessId };
}
