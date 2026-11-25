'use client';

import { useEffect } from 'react';
import { useCatalog, type CatalogHydrationScope } from '@/src/context/CatalogContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';

/** بارگذاری تنبل دادهٔ ERP مطابق ویو — v12 */
export function useCatalogEnsure(scope: CatalogHydrationScope) {
  const { ensureCatalogScope, activeBusinessId } = useCatalog();

  useEffect(() => {
    if (FRONTEND_ONLY || !activeBusinessId) return;
    void ensureCatalogScope(scope);
  }, [scope, ensureCatalogScope, activeBusinessId]);
}