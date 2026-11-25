'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FolderKanban, Plus, Search, X } from 'lucide-react';
import { useMeizito } from '@/src/context/MeizitoContext';
import { getProjectPhases } from '@/src/lib/meizito/project-phases';
import type { MeizitoProject } from '@/src/types/meizito';
import ProjectDetailPanel from './ProjectDetailPanel';

function resolveMemberNames(
  project: MeizitoProject,
  team: { id: string; name: string }[]
): string[] {
  if (project.memberIds.length > 0) {
    return project.memberIds.map(
      (id) => team.find((u) => u.id === id)?.name ?? `عضو ${id.slice(0, 8)}`
    );
  }
  return project.members ?? [];
}

function MemberChips({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) return <span className="text-xs text-gray-400">بدون عضو</span>;
  const visible = names.slice(0, max);
  const rest = names.length - max;
  return (
    <div className="flex flex-wrap gap-1.5 justify-end" dir="rtl">
      {visible.map((name) => (
        <span
          key={name}
          className="text-[10px] font-bold bg-white/80 border border-black/10 rounded-full px-2 py-0.5"
        >
          {name}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
          +{rest}
        </span>
      )}
    </div>
  );
}

export default function ProjectsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const { projects, addProject, updateProject, boards, cards, listTeamDirectory } = useMeizito();
  const teamMembers = useMemo(() => listTeamDirectory('all'), [listTeamDirectory]);

  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [boardId, setBoardId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [formError, setFormError] = useState('');

  const filteredTeam = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.department?.toLowerCase().includes(q) ?? false) ||
        (u.jobTitle?.toLowerCase().includes(q) ?? false)
    );
  }, [teamMembers, memberSearch]);

  const memberLabel = (id: string) => teamMembers.find((u) => u.id === id)?.name ?? id;

  const toggleMember = (personId: string) => {
    setSelectedIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
    setFormError('');
  };

  const removeMember = (personId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== personId));
  };

  const submitProject = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('نام پروژه را وارد کنید.');
      return;
    }
    if (selectedIds.length === 0) {
      setFormError('حداقل یک عضو انتخاب کنید.');
      return;
    }
    addProject(trimmed, selectedIds, boardId || undefined);
    setName('');
    setSelectedIds([]);
    setBoardId('');
    setMemberSearch('');
    setFormError('');
  };

  const boardCardCount = (bid?: string) => {
    if (!bid) return 0;
    return cards.filter((c) => c.boardId === bid).length;
  };

  const [projectBoardTab, setProjectBoardTab] = useState<string>('all');

  const filteredProjects = useMemo(() => {
    if (projectBoardTab === 'all') return projects;
    if (projectBoardTab === 'none') return projects.filter((p) => !p.boardId);
    return projects.filter((p) => p.boardId === projectBoardTab);
  }, [projects, projectBoardTab]);

  const openProject = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'projects');
    params.set('projectId', id);
    router.replace(`/dashboard/tasks?${params.toString()}`);
  };

  const closeProject = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('projectId');
    router.replace(`/dashboard/tasks?${params.toString()}`);
  };

  const detailProject = projectIdParam
    ? projects.find((p) => p.id === projectIdParam)
    : undefined;

  if (detailProject) {
    const memberNames = resolveMemberNames(detailProject, teamMembers);
    return (
      <ProjectDetailPanel project={detailProject} memberNames={memberNames} onBack={closeProject} />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">پروژه‌ها — تب بر اساس میز کار</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setProjectBoardTab('all')}
          className={`px-3 py-2 rounded-xl text-xs font-bold border ${
            projectBoardTab === 'all'
              ? 'bg-white border-nexa-accent text-nexa-accent'
              : 'bg-gray-50 border-transparent text-gray-600'
          }`}
        >
          همه
        </button>
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setProjectBoardTab(b.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border ${
              projectBoardTab === b.id
                ? 'bg-white border-nexa-accent text-nexa-accent'
                : 'bg-gray-50 border-transparent text-gray-600'
            }`}
          >
            {b.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setProjectBoardTab('none')}
          className={`px-3 py-2 rounded-xl text-xs font-bold border ${
            projectBoardTab === 'none'
              ? 'bg-white border-nexa-accent text-nexa-accent'
              : 'bg-gray-50 border-transparent text-gray-600'
          }`}
        >
          بدون میز
        </button>
      </div>

      <div className="nexa-card p-5 space-y-4 isolate relative">
        <p className="text-sm font-black flex items-center gap-2">
          <Plus size={16} />
          پروژه جدید
        </p>

        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFormError('');
          }}
          placeholder="نام پروژه"
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
        />

        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">میز کار متصل</label>
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">بدون اتصال</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative z-0 overflow-visible">
          <p className="text-xs font-bold text-gray-600 mb-2">اعضای پروژه</p>
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3" dir="rtl">
              {selectedIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-nexa-accent/10 text-nexa-accent border border-nexa-accent/20 rounded-full pl-1 pr-2 py-0.5"
                >
                  {memberLabel(id)}
                  <button
                    type="button"
                    onClick={() => removeMember(id)}
                    className="p-0.5 rounded-full hover:bg-nexa-accent/20"
                    aria-label={`حذف ${memberLabel(id)}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative mb-2">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="جستجو نام یا نقش..."
              className="w-full bg-gray-50 rounded-xl pr-9 pl-3 py-2 text-sm"
            />
          </div>

          <p className="text-[10px] font-bold text-gray-500 mb-1">اعضای کسب‌وکار</p>
          <div className="max-h-40 overflow-y-auto overscroll-contain border border-nexa-border rounded-xl divide-y divide-gray-100">
            {filteredTeam.length === 0 ? (
              <p className="text-xs text-gray-400 p-3 text-center">عضو تیمی یافت نشد.</p>
            ) : (
              filteredTeam.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleMember(u.id)}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                    <p className="text-[10px] text-gray-500">
                      {[u.jobTitle, u.department].filter(Boolean).join(' · ') || 'تیم سازمان'}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {formError && <p className="text-xs text-rose-600 font-bold mt-3">{formError}</p>}

        <button
          type="button"
          onClick={submitProject}
          className="nexa-btn-primary relative z-10 w-full flex items-center justify-center gap-2 py-2 text-sm font-bold disabled:opacity-50 mt-4 shrink-0"
        >
          <Plus size={16} />
          ثبت پروژه
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {projects.length === 0 && (
          <p className="text-sm text-gray-400 col-span-2 text-center py-6">پروژه‌ای ثبت نشده است.</p>
        )}
        {filteredProjects.map((p) => {
          const memberNames = resolveMemberNames(p, teamMembers);
          const board = boards.find((b) => b.id === p.boardId);
          const cardCount = boardCardCount(p.boardId);

          return (
            <div key={p.id} className="nexa-card p-4 flex flex-col gap-3">
              <button
                type="button"
                data-testid="meizito-project-open"
                onClick={() => openProject(p.id)}
                className="flex gap-3 items-start w-full text-right hover:opacity-90"
              >
                <FolderKanban className="text-nexa-accent shrink-0" size={22} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{p.name}</p>
                  {board && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      میز کار: <span className="font-bold">{board.name}</span>
                      {cardCount > 0 && (
                        <span className="mr-1"> — {cardCount} کارت</span>
                      )}
                    </p>
                  )}
                </div>
              </button>
              <MemberChips names={memberNames} />
              <PhaseRowReadOnly project={p} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseRowReadOnly({ project }: { project: MeizitoProject }) {
  const phases = getProjectPhases(project.phases);
  return (
    <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
      <p className="text-[9px] text-gray-400">
        فازها — افزودن در <span className="font-bold">جزئیات پروژه «{project.name}»</span>
      </p>
      {phases.length > 0 ? (
        <ul className="text-[10px] text-gray-600 space-y-0.5">
          {phases.map((ph) => (
            <li key={ph.id} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-nexa-accent" />
              {ph.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-gray-400">بدون فاز</p>
      )}
    </div>
  );
}
