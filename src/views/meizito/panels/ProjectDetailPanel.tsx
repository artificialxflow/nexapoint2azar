'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  FolderKanban,
  Paperclip,
  Plus,
  Video,
} from 'lucide-react';
import { AttachmentPickerModal } from '@/src/components/attachments/AttachmentPickerModal';
import { attachmentScopeForMeizitoProject } from '@/src/lib/attachments/scopes';
import { openLocalAttachment } from '@/src/lib/attachments/client';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { useMeizito } from '@/src/context/MeizitoContext';
import {
  ensurePhaseStructure,
  getProjectMeta,
  getProjectPhases,
  newPhaseId,
  withProjectMeta,
  withProjectPhases,
  withoutProjectPhase,
  type MeizitoProjectPhase,
} from '@/src/lib/meizito/project-phases';
import type { AttachmentRef } from '@/src/types/attachment';
import type { MeizitoCard, MeizitoProject } from '@/src/types/meizito';

type Props = {
  project: MeizitoProject;
  memberNames: string[];
  onBack: () => void;
};

export default function ProjectDetailPanel({ project, memberNames, onBack }: Props) {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId;
  const {
    boards,
    columns,
    cards,
    updateProject,
    addColumn,
    addCard,
    moveCard,
    setActiveBoardId,
  } = useMeizito();
  const phases = useMemo(() => getProjectPhases(project.phases), [project.phases]);
  const meta = useMemo(() => getProjectMeta(project.phases), [project.phases]);
  const activePhaseId = meta.activePhaseId ?? phases[0]?.id;
  const activePhase = phases.find((p) => p.id === activePhaseId);

  const board = boards.find((b) => b.id === project.boardId);
  const boardColumns = useMemo(
    () =>
      columns
        .filter((c) => c.boardId === project.boardId)
        .sort((a, b) => a.order - b.order),
    [columns, project.boardId]
  );

  const visibleColumns = useMemo(() => {
    const titles = activePhase?.listTitles ?? [];
    if (!titles.length) return boardColumns;
    const set = new Set(titles.map((t) => t.trim()));
    return boardColumns.filter((c) => set.has(c.title.trim()));
  }, [boardColumns, activePhase]);

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, MeizitoCard[]>();
    for (const col of visibleColumns) {
      const ids = col.cardIds ?? [];
      map.set(
        col.id,
        ids
          .map((id) => cards.find((c) => c.id === id))
          .filter((c): c is MeizitoCard => Boolean(c))
      );
    }
    return map;
  }, [visibleColumns, cards]);

  const [listDraft, setListDraft] = useState('');
  const [phaseTitleDraft, setPhaseTitleDraft] = useState('');
  const [meetingDraft, setMeetingDraft] = useState(meta.meetingUrl ?? '');
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState<Record<string, string>>({});

  const persistPhases = (rows: ReturnType<typeof ensurePhaseStructure>) => {
    updateProject(project.id, { phases: rows });
  };

  const setActivePhase = (phaseId: string) => {
    persistPhases(withProjectMeta(project.phases, { activePhaseId: phaseId }));
  };

  const addPhase = () => {
    const title = phaseTitleDraft.trim();
    if (!title) return;
    const next: MeizitoProjectPhase[] = [
      ...phases,
      { id: newPhaseId(), title, listTitles: [] },
    ];
    persistPhases(withProjectPhases(project.phases, next));
    setPhaseTitleDraft('');
  };

  const removePhase = (phaseId: string) => {
    persistPhases(withoutProjectPhase(project.phases, phaseId));
  };

  const addListToPhase = async () => {
    const title = listDraft.trim();
    if (!title || !project.boardId || !activePhase) return;
    await addColumn(project.boardId, title);
    const nextPhases = phases.map((p) =>
      p.id === activePhase.id ? { ...p, listTitles: [...(p.listTitles ?? []), title] } : p
    );
    persistPhases(withProjectPhases(project.phases, nextPhases));
    setListDraft('');
  };

  const addFile = (ref: AttachmentRef) => {
    const files = [...(meta.files ?? []), { name: ref.name, fileRef: ref }];
    persistPhases(withProjectMeta(project.phases, { files }));
    setFilePickerOpen(false);
  };

  const saveMeetingUrl = () => {
    persistPhases(withProjectMeta(project.phases, { meetingUrl: meetingDraft.trim() || undefined }));
  };

  const submitCard = (columnId: string) => {
    const title = (newCardTitle[columnId] ?? '').trim();
    if (!title || !project.boardId) return;
    void addCard(project.boardId, columnId, title, {
      description: '',
      assignee: '',
      dueDate: '',
      dueTime: '',
      recurrence: 'none',
    });
    setNewCardTitle((prev) => ({ ...prev, [columnId]: '' }));
  };

  return (
    <div className="space-y-5" dir="rtl" data-testid="meizito-project-detail">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-bold text-gray-500 flex items-center gap-1 hover:text-nexa-accent"
      >
        <ArrowRight size={14} />
        بازگشت به لیست پروژه‌ها
      </button>

      <div className="nexa-card p-4 flex flex-wrap gap-3 items-start justify-between">
        <div className="flex gap-3 items-start">
          <FolderKanban className="text-nexa-accent shrink-0" size={26} />
          <div>
            <h2 className="text-lg font-black text-gray-900">{project.name}</h2>
            <p className="text-[10px] text-gray-500 mt-1">
              {memberNames.join('، ') || 'بدون عضو'}
            </p>
            {board ? (
              <p className="text-[10px] text-nexa-accent font-bold mt-1">میز: {board.name}</p>
            ) : (
              <p className="text-[10px] text-amber-700 mt-1">میز کار متصل نیست — از لیست پروژه میز را تنظیم کنید.</p>
            )}
          </div>
        </div>
        {project.boardId && (
          <button
            type="button"
            onClick={() => {
              setActiveBoardId(project.boardId!);
            }}
            className="text-[10px] font-bold text-nexa-accent underline"
          >
            باز کردن کانبان کامل میز کار
          </button>
        )}
      </div>

      <section className="space-y-2">
        <p className="text-xs font-bold text-gray-600">
          مرحله / فاز پروژه — <span className="text-gray-500 font-normal">مقصد: {project.name}</span>
        </p>
        <div className="flex flex-wrap gap-1">
          {phases.map((ph) => (
            <span key={ph.id} className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setActivePhase(ph.id)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border ${
                  ph.id === activePhaseId
                    ? 'bg-nexa-accent text-white border-nexa-accent'
                    : 'bg-white border-nexa-border'
                }`}
              >
                {ph.title}
              </button>
              <button
                type="button"
                title="حذف فاز"
                onClick={() => removePhase(ph.id)}
                className="text-[10px] text-rose-600 px-1 hover:bg-rose-50 rounded"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={phaseTitleDraft}
            onChange={(e) => setPhaseTitleDraft(e.target.value)}
            placeholder={`فاز جدید برای «${project.name}»`}
            className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-xs"
          />
          <button type="button" onClick={addPhase} className="text-xs font-bold text-nexa-accent px-3">
            + فاز
          </button>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="nexa-card p-4 space-y-2">
          <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
            <Video size={14} />
            جلسه آنلاین (MVP)
          </p>
          <input
            value={meetingDraft}
            onChange={(e) => setMeetingDraft(e.target.value)}
            placeholder="لینک جلسه (Zoom, Meet, …)"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs"
          />
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={saveMeetingUrl} className="text-[10px] font-bold text-nexa-accent">
              ذخیره لینک
            </button>
            {meta.meetingUrl && (
              <a
                href={meta.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-gray-600 flex items-center gap-1"
              >
                ورود به جلسه
                <ExternalLink size={10} />
              </a>
            )}
          </div>
          <p className="text-[9px] text-gray-400">یکپارچگی گفتگوی گروهی پروژه در فاز بعدی.</p>
        </section>

        <section className="nexa-card p-4 space-y-2">
          <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
            <Paperclip size={14} />
            فایل‌های پروژه
          </p>
          <button
            type="button"
            onClick={() => setFilePickerOpen(true)}
            className="text-[10px] font-bold text-nexa-accent flex items-center gap-1"
          >
            <Plus size={12} />
            پیوست
          </button>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {(meta.files ?? []).length === 0 && (
              <li className="text-[10px] text-gray-400">فایلی نیست.</li>
            )}
            {(meta.files ?? []).map((f, i) => (
              <li key={`${f.name}-${i}`} className="text-[10px]">
                {f.fileRef ? (
                  <button
                    type="button"
                    className="text-nexa-accent font-bold hover:underline"
                    onClick={() => openLocalAttachment(f.fileRef!)}
                  >
                    {f.name}
                  </button>
                ) : (
                  f.name
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {project.boardId && activePhase && (
        <section className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs font-bold text-gray-600">لیست‌های فاز «{activePhase.title}»</p>
            <input
              value={listDraft}
              onChange={(e) => setListDraft(e.target.value)}
              placeholder="لیست جدید (ستون میز)"
              className="bg-gray-50 rounded-xl px-3 py-1.5 text-xs min-w-[10rem]"
            />
            <button type="button" onClick={() => void addListToPhase()} className="text-[10px] font-bold text-nexa-accent">
              + لیست
            </button>
          </div>
        </section>
      )}

      {project.boardId ? (
        <ProjectKanban
          columns={visibleColumns}
          cardsByColumn={cardsByColumn}
          newCardTitle={newCardTitle}
          setNewCardTitle={setNewCardTitle}
          onAddCard={submitCard}
          onMoveCard={(cardId, columnId) => moveCard(cardId, columnId, 0)}
        />
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">برای وظایف پروژه، یک میز کار به پروژه وصل کنید.</p>
      )}

      <AttachmentPickerModal
        open={filePickerOpen}
        scope={attachmentScopeForMeizitoProject(activeBusinessId ?? null, project.id)}
        onClose={() => setFilePickerOpen(false)}
        onSelect={addFile}
      />
    </div>
  );
}

function ProjectKanban({
  columns,
  cardsByColumn,
  newCardTitle,
  setNewCardTitle,
  onAddCard,
  onMoveCard,
}: {
  columns: { id: string; title: string }[];
  cardsByColumn: Map<string, MeizitoCard[]>;
  newCardTitle: Record<string, string>;
  setNewCardTitle: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAddCard: (columnId: string) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
}) {
  if (columns.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        ستونی برای این فاز نیست — یک «لیست جدید» بسازید یا همهٔ ستون‌های میز نمایش داده می‌شود.
      </p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => {
        const colCards = cardsByColumn.get(col.id) ?? [];
        return (
          <div key={col.id} className="min-w-[220px] max-w-[260px] shrink-0 nexa-card p-3 bg-gray-50/80">
            <p className="text-xs font-black text-gray-800 mb-2">{col.title}</p>
            <ul className="space-y-2 mb-2 max-h-64 overflow-y-auto">
              {colCards.map((card) => (
                <li key={card.id} className="bg-white rounded-xl p-2 border border-nexa-border/40 text-xs">
                  <p className="font-bold text-gray-900">{card.title}</p>
                  {(card.dueDate || card.dueTime) && (
                    <p className="text-[9px] text-gray-500 font-fa-num flex items-center gap-0.5 mt-0.5">
                      <Calendar size={10} />
                      {[card.dueDate, card.dueTime].filter(Boolean).join(' ')}
                    </p>
                  )}
                  {card.assignee && (
                    <p className="text-[9px] text-gray-400 mt-0.5">مسئول: {card.assignee}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {columns
                      .filter((c) => c.id !== col.id)
                      .slice(0, 3)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onMoveCard(card.id, c.id)}
                          className="text-[8px] font-bold text-nexa-accent bg-nexa-accent/5 px-1.5 py-0.5 rounded"
                        >
                          → {c.title.slice(0, 8)}
                        </button>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
            <CaptureInColumn
              columnId={col.id}
              value={newCardTitle[col.id] ?? ''}
              onChange={(v) => setNewCardTitle((prev) => ({ ...prev, [col.id]: v }))}
              onSubmit={() => onAddCard(col.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

function CaptureInColumn({
  columnId,
  value,
  onChange,
  onSubmit,
}: {
  columnId: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex gap-1" data-column={columnId}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="وظیفه جدید"
        className="flex-1 bg-white rounded-lg px-2 py-1 text-[10px]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />
      <button type="button" onClick={onSubmit} className="text-[10px] font-bold text-nexa-accent px-1">
        +
      </button>
    </div>
  );
}
