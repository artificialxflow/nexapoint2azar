import type { AttachmentRef } from '@/src/types/attachment';

export const PROJECT_META_KIND = 'meta' as const;

export type MeizitoProjectFile = {
  name: string;
  fileRef?: AttachmentRef;
};

export type MeizitoProjectPhase = {
  id: string;
  title: string;
  listTitles?: string[];
};

export type MeizitoProjectMeta = {
  kind: typeof PROJECT_META_KIND;
  activePhaseId?: string;
  meetingUrl?: string;
  files?: MeizitoProjectFile[];
};

export type MeizitoProjectPhaseRow = MeizitoProjectPhase | MeizitoProjectMeta | Record<string, unknown>;

export function newPhaseId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ph-${Date.now()}`;
}

export function getProjectMeta(phases: MeizitoProjectPhaseRow[] | unknown[] | undefined): MeizitoProjectMeta {
  const list = Array.isArray(phases) ? phases : [];
  const raw = list.find((p) => (p as MeizitoProjectMeta).kind === PROJECT_META_KIND) as
    | MeizitoProjectMeta
    | undefined;
  return raw ?? { kind: PROJECT_META_KIND, files: [], meetingUrl: '' };
}

export function getProjectPhases(phases: MeizitoProjectPhaseRow[] | unknown[] | undefined): MeizitoProjectPhase[] {
  const list = Array.isArray(phases) ? phases : [];
  return list
    .filter((p) => (p as MeizitoProjectMeta).kind !== PROJECT_META_KIND)
    .map((p, idx) => {
      const row = p as MeizitoProjectPhase & { name?: string; lists?: string[] };
      return {
        id: row.id || `phase-${idx}`,
        title: row.title ?? row.name ?? `فاز ${idx + 1}`,
        listTitles: row.listTitles ?? row.lists ?? [],
      };
    });
}

export function withProjectMeta(
  phases: MeizitoProjectPhaseRow[] | unknown[] | undefined,
  metaPatch: Partial<Omit<MeizitoProjectMeta, 'kind'>>
): MeizitoProjectPhaseRow[] {
  const phaseRows = getProjectPhases(phases);
  const meta = { ...getProjectMeta(phases), ...metaPatch, kind: PROJECT_META_KIND };
  return [meta, ...phaseRows];
}

export function withProjectPhases(
  phases: MeizitoProjectPhaseRow[] | undefined | unknown[],
  nextPhases: MeizitoProjectPhase[]
): MeizitoProjectPhaseRow[] {
  const meta = getProjectMeta(phases);
  return [meta, ...nextPhases];
}

/** Remove one phase by id; keeps meta row. */
export function withoutProjectPhase(
  phases: MeizitoProjectPhaseRow[] | undefined | unknown[],
  phaseId: string
): MeizitoProjectPhaseRow[] {
  const next = getProjectPhases(phases).filter((p) => p.id !== phaseId);
  const meta = getProjectMeta(phases);
  const activePhaseId = meta.activePhaseId === phaseId ? next[0]?.id : meta.activePhaseId;
  return withProjectMeta(withProjectPhases(phases, next), { activePhaseId });
}

export function ensurePhaseStructure(phases: unknown[] | undefined): MeizitoProjectPhaseRow[] {
  if (!Array.isArray(phases) || phases.length === 0) {
    return [{ kind: PROJECT_META_KIND, files: [] }];
  }
  if (!phases.some((p) => (p as MeizitoProjectMeta).kind === PROJECT_META_KIND)) {
    return [{ kind: PROJECT_META_KIND, files: [] }, ...(phases as MeizitoProjectPhaseRow[])];
  }
  return phases as MeizitoProjectPhaseRow[];
}
