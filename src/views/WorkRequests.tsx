'use client';

import { useEffect } from 'react';
import { MeizitoProviders } from '@/src/context/MeizitoProviders';
import { useMeizito } from '@/src/context/MeizitoContext';
import RequestsPanel from '@/src/views/meizito/panels/RequestsPanel';

function WorkRequestsInner() {
  const { ensureMeizitoModuleLoaded } = useMeizito();

  useEffect(() => {
    ensureMeizitoModuleLoaded('requests');
  }, [ensureMeizitoModuleLoaded]);

  return (
    <div className="space-y-4" dir="rtl">
      <RequestsPanel />
    </div>
  );
}

export default function WorkRequests() {
  return (
    <MeizitoProviders>
      <WorkRequestsInner />
    </MeizitoProviders>
  );
}
