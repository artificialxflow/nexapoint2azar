'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { fetchBlogModule, saveBlogModuleApi } from '@/src/lib/erp/commerce-client';
import type { BlogModulePayload } from '@/src/types/commerce';

const defaultBlog = (): BlogModulePayload => ({
  posts: [],
  categories: [],
  comments: [],
  seo: { title: 'بلاگ نکساپوینت', description: '' },
});

export function useBlogModuleState() {
  const businessId = useBusinessOptional()?.activeBusinessId ?? null;
  const [module, setModule] = useState<BlogModulePayload>(() => defaultBlog());
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
    void fetchBlogModule(businessId)
      .then((m) => {
        moduleRef.current = m;
        setModule(m);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, [businessId]);

  const persist = useCallback(
    async (updater: BlogModulePayload | ((prev: BlogModulePayload) => BlogModulePayload)) => {
      if (!hydrated && !FRONTEND_ONLY && businessId) {
        setSaveError('در حال بارگذاری بلاگ…');
        return false;
      }
      const prev = moduleRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      moduleRef.current = next;
      setModule(next);
      if (FRONTEND_ONLY || !businessId) return true;
      try {
        const saved = await saveBlogModuleApi(businessId, next);
        moduleRef.current = saved;
        setModule(saved);
        setSaveError(null);
        return true;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'خطا در ذخیره بلاگ');
        return false;
      }
    },
    [businessId, hydrated]
  );

  return { module, setModule, persist, hydrated, saveError };
}
