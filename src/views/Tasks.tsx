'use client';

import { Suspense } from 'react';
import { MeizitoProviders } from '@/src/context/MeizitoProviders';
import MeizitoWorkspace from './meizito/MeizitoWorkspace';

export default function Tasks() {
  return (
    <MeizitoProviders>
      <Suspense fallback={null}>
        <MeizitoWorkspace />
      </Suspense>
    </MeizitoProviders>
  );
}
