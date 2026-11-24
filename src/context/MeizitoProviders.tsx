'use client';

import { MeizitoProvider } from '@/src/context/MeizitoContext';

export function MeizitoProviders({
  children,
  workspaceSnapshotEnabled = true,
}: {
  children: React.ReactNode;
  workspaceSnapshotEnabled?: boolean;
}) {
  return (
    <MeizitoProvider workspaceSnapshotEnabled={workspaceSnapshotEnabled}>
      {children}
    </MeizitoProvider>
  );
}
