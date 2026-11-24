import type { WorkspaceSnapshot } from '@/src/lib/meizito/workspace/serialize';
import {
  loadWorkspaceSnapshotFromDb,
  saveWorkspaceSnapshotToDb,
} from '@/src/lib/meizito/workspace/workspace-db-service';

export type MeizitoStorageMode = 'db';

export function workspaceStorageMode(): MeizitoStorageMode {
  // Preserves MEIZITO_WORKSPACE_STORAGE env contract; normalized PostgreSQL tables are always authoritative.
  void process.env.MEIZITO_WORKSPACE_STORAGE;
  return 'db';
}

export async function loadWorkspaceSnapshot(businessId: string): Promise<WorkspaceSnapshot> {
  return loadWorkspaceSnapshotFromDb(businessId);
}

export async function persistWorkspaceSnapshot(
  businessId: string,
  snap: WorkspaceSnapshot
): Promise<void> {
  await saveWorkspaceSnapshotToDb(businessId, snap);
}
