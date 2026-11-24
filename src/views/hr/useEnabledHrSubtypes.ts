'use client';

import { useEffect, useState } from 'react';
import { HR_REQUEST_SUBTYPES, type HrRequestSubtypeId } from '@/src/lib/meizito/hr-request-types';

export type HrSubtypeOption = { id: HrRequestSubtypeId; label: string };

const STATIC: HrSubtypeOption[] = HR_REQUEST_SUBTYPES.map((s) => ({
  id: s.id,
  label: s.label,
}));

export function useEnabledHrSubtypes(businessId: string | null) {
  const [options, setOptions] = useState<HrSubtypeOption[]>(STATIC);

  useEffect(() => {
    if (!businessId) {
      setOptions(STATIC);
      return;
    }
    let cancelled = false;
    void fetch(`/api/businesses/${encodeURIComponent(businessId)}/hr-request-types`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data?: { types?: { slug: string; labelFa: string; enabled: boolean }[] } } | null) => {
        if (cancelled || !json?.data?.types?.length) return;
        const enabled = json.data.types
          .filter((t) => t.enabled)
          .map((t) => ({
            id: t.slug as HrRequestSubtypeId,
            label: t.labelFa,
          }))
          .filter((t) => STATIC.some((s) => s.id === t.id));
        if (enabled.length > 0) setOptions(enabled);
      })
      .catch(() => {
        if (!cancelled) setOptions(STATIC);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  return options;
}
