'use client';

import { Suspense } from 'react';
import { MeizitoProviders } from '@/src/context/MeizitoProviders';
import MeizitoWorkspace from './meizito/MeizitoWorkspace';
import MeizitoWorkspaceSkeleton from './meizito/components/MeizitoWorkspaceSkeleton';

export default function Tasks() {
  return (
    <MeizitoProviders>
      <Suspense fallback={<MeizitoWorkspaceSkeleton compact />}>
        <MeizitoWorkspace />
      </Suspense>
    </MeizitoProviders>
  );
}
