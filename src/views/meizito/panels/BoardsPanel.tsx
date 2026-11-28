'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Star,
  GripVertical,
  Search,
  Paperclip,
  Cloud,
  X,
  Trash2,
  Settings,
  ChevronUp,
  ChevronDown,
  ArrowRightLeft,
} from 'lucide-react';
import BusinessMemberPicker from '@/src/components/BusinessMemberPicker';
import { isPickableBusinessCalendar } from '@/src/types/meizito';
import { AttachmentPickerModal } from '@/src/components/attachments/AttachmentPickerModal';
import { attachmentScopeForMeizitoCard } from '@/src/lib/attachments/scopes';
import { openLocalAttachment, uploadAttachment } from '@/src/lib/attachments/client';
import { useMeizito } from '@/src/context/MeizitoContext';
import { formatDateKeyJalaliHint, toDateKey } from '@/src/lib/meizito/calendarGrid';
import JalaliDateInput from '@/src/views/meizito/components/JalaliDateInput';
import type { MeizitoCard, MeizitoChecklistItem, MeizitoRecurrence } from '@/src/types/meizito';
import type { AttachmentRef } from '@/src/types/attachment';
import { MeizitoApiError } from '@/src/lib/meizito/client';
import ConfirmDialog from '@/src/components/admin/ConfirmDialog';

function newLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now());
}

/** فاصلهٔ داخل عنوان/نام حفظ می‌شود؛ فقط لبه‌ها بریده می‌شود */
function trimEdges(value: string) {
  return value.replace(/^\s+|\s+$/g, '');
}

const KANBAN_CARD_MIME = 'text/meizito-card';

function readKanbanDragCardId(e: React.DragEvent, fallbackId: string | null): string {
  const fromDt =
    e.dataTransfer.getData(KANBAN_CARD_MIME) || e.dataTransfer.getData('text/plain') || '';
  const id = (fromDt || fallbackId || '').trim();
  return id;
}

function acceptKanbanCardDrop(e: React.DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
}

function computeKanbanInsertIndex(
  columnCardIds: string[],
  draggedCardId: string,
  beforeCardId: string | null
): number {
  const ids = columnCardIds.filter((id) => id !== draggedCardId);
  if (!beforeCardId) return ids.length;
  const idx = ids.indexOf(beforeCardId);
  return idx < 0 ? ids.length : idx;
}

function startKanbanCardDrag(e: React.DragEvent, cardId: string, onActive: (id: string | null) => void) {
  e.stopPropagation();
  onActive(cardId);
  e.dataTransfer.setData(KANBAN_CARD_MIME, cardId);
  e.dataTransfer.setData('text/plain', cardId);
  e.dataTransfer.effectAllowed = 'move';
}

function endKanbanCardDrag(onActive: (id: string | null) => void) {
  onActive(null);
}

type KanbanColumnLite = { id: string; title: string };

type KanbanBoardCardProps = {
  card: MeizitoCard;
  columnId: string;
  columnCardIds: string[];
  boardCols: KanbanColumnLite[];
  labelPalette: { id: string; name: string; color: string }[];
  dragFallbackRef: React.MutableRefObject<string | null>;
  setDragActive: (id: string | null) => void;
  onOpenDetail: (card: MeizitoCard) => void;
  onToggleStar: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onMoveCard: (cardId: string, toColumnId: string, index: number) => void;
};

function KanbanBoardCard({
  card,
  columnId,
  columnCardIds,
  boardCols,
  labelPalette,
  dragFallbackRef,
  setDragActive,
  onOpenDetail,
  onToggleStar,
  onDeleteCard,
  onMoveCard,
}: KanbanBoardCardProps) {
  const showColumnPicker = boardCols.length > 1;

  const handleDropOnCard = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = readKanbanDragCardId(e, dragFallbackRef.current);
    if (!draggedId || draggedId === card.id) return;
    const index = computeKanbanInsertIndex(columnCardIds, draggedId, card.id);
    onMoveCard(draggedId, columnId, index);
  };

  const stopCardDragOnControls = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      draggable
      onDragStart={(e) => startKanbanCardDrag(e, card.id, setDragActive)}
      onDragEnd={() => endKanbanCardDrag(setDragActive)}
      onDragOver={acceptKanbanCardDrop}
      onDrop={handleDropOnCard}
      className="bg-white rounded-xl p-3 border border-nexa-border shadow-sm cursor-grab active:cursor-grabbing touch-manipulation select-none"
    >
      <div className="flex items-start gap-2">
        <div
          className="shrink-0 mt-0.5 text-gray-300 cursor-grab active:cursor-grabbing"
          aria-hidden
          title="جابه‌جایی با ماوس"
        >
          <GripVertical size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            role="button"
            tabIndex={0}
            draggable={false}
            onClick={() => onOpenDetail(card)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenDetail(card);
              }
            }}
            className="text-sm font-bold text-gray-900 text-right w-full cursor-pointer"
          >
            {card.title}
          </div>
          {card.assignee && (
            <p className="text-[10px] text-gray-500 mt-1 pointer-events-none">ارجاع: {card.assignee}</p>
          )}
          {card.dueDate && (
            <p className="text-[10px] text-gray-400 mt-0.5 font-fa-num pointer-events-none">
              سررسید: {card.dueDate}
              {card.dueTime ? ` — ${card.dueTime}` : ''}
            </p>
          )}
          {card.category && <p className="text-[10px] text-gray-400 pointer-events-none">{card.category}</p>}
          <div className="flex flex-wrap gap-1 mt-2 pointer-events-none">
            {card.labelIds.map((lid) => {
              const lb = labelPalette.find((l) => l.id === lid);
              return lb ? (
                <span
                  key={lid}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: lb.color }}
                >
                  {lb.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            draggable={false}
            onDragStart={stopCardDragOnControls}
            title="نشان‌دار"
            aria-label={card.starred ? 'حذف از نشان‌دار' : 'افزودن به نشان‌دار'}
            onClick={() => onToggleStar(card.id)}
            className={card.starred ? 'text-amber-500' : 'text-gray-300'}
          >
            <Star size={16} fill={card.starred ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            draggable={false}
            onDragStart={stopCardDragOnControls}
            aria-label="حذف وظیفه"
            onClick={() => onDeleteCard(card.id)}
            className="text-gray-300 hover:text-rose-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {showColumnPicker && (
        <label
          className="flex items-center gap-1 mt-2 text-[10px] text-gray-500"
          onDragStart={stopCardDragOnControls}
        >
          <ArrowRightLeft size={12} className="shrink-0 pointer-events-none" />
          <span className="shrink-0 pointer-events-none">انتقال به</span>
          <select
            draggable={false}
            className="flex-1 min-w-0 bg-gray-50 rounded-lg px-1 py-0.5 text-[10px] font-bold text-gray-700 cursor-pointer"
            value={card.columnId}
            onChange={(e) => {
              const target = e.target.value;
              if (target && target !== card.columnId) {
                onMoveCard(card.id, target, 0);
              }
            }}
            aria-label="انتقال کارت به ستون دیگر"
          >
            {boardCols.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function BoardModal({
  title,
  onClose,
  children,
  zClass = 'z-[90]',
  panelClassName = 'max-w-md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  zClass?: string;
  panelClassName?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center p-4 bg-black/40`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`bg-white rounded-3xl p-6 w-full shadow-xl border border-nexa-border max-h-[90vh] overflow-y-auto ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="font-black text-gray-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="بستن"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BoardsPanel() {
  const {
    boards,
    columns,
    cards,
    activeBoardId,
    setActiveBoardId,
    addBoard,
    addCard,
    moveCard,
    updateCard,
    deleteCard,
    copyCardForAssignees,
    toggleCardStar,
    addColumn,
    updateColumn,
    deleteColumn,
    updateBoard,
    deleteBoard,
    addBoardLabel,
    calendars,
    listTeamDirectory,
    searchCards,
    activeBusinessId,
  } = useMeizito();

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDueTime, setNewTaskDueTime] = useState('');
  const [newTaskCalendarId, setNewTaskCalendarId] = useState('');
  const [newTaskAddToCalendar, setNewTaskAddToCalendar] = useState(false);
  const [newTaskReminderMinutes, setNewTaskReminderMinutes] = useState<number | ''>('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<MeizitoRecurrence>('none');
  const [newTaskChecklist, setNewTaskChecklist] = useState<MeizitoChecklistItem[]>([]);
  const [newTaskChecklistDraft, setNewTaskChecklistDraft] = useState('');
  const [boardMembersDraft, setBoardMembersDraft] = useState('');
  const [memberPicker, setMemberPicker] = useState('');
  const [newLabelOpen, setNewLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newTaskCol, setNewTaskCol] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskLabelIds, setNewTaskLabelIds] = useState<string[]>([]);
  const [newTaskEndDueDate, setNewTaskEndDueDate] = useState('');
  const [newTaskAttachments, setNewTaskAttachments] = useState<MeizitoCard['attachments']>([]);
  const [newTaskSaving, setNewTaskSaving] = useState(false);
  const [newTaskError, setNewTaskError] = useState('');
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [detail, setDetail] = useState<MeizitoCard | null>(null);
  const [copyNames, setCopyNames] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardSaving, setNewBoardSaving] = useState(false);
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [checklistDraft, setChecklistDraft] = useState('');
  const [checklistAdding, setChecklistAdding] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<
    | null
    | { type: 'board'; id: string; name: string }
    | { type: 'column'; id: string; title: string; cardCount: number }
    | { type: 'card'; id: string; closeDetail?: boolean }
  >(null);

  const boardCols = useMemo(() => {
    return columns
      .filter((c) => c.boardId === activeBoardId)
      .sort((a, b) => a.order - b.order);
  }, [columns, activeBoardId]);

  const [mobileKanbanCol, setMobileKanbanCol] = useState('');
  const kanbanDragCardRef = useRef<string | null>(null);
  const setKanbanDragActive = (id: string | null) => {
    kanbanDragCardRef.current = id;
  };

  useEffect(() => {
    if (boardCols.length === 0) {
      setMobileKanbanCol('');
      return;
    }
    setMobileKanbanCol((prev) =>
      prev && boardCols.some((c) => c.id === prev) ? prev : boardCols[0].id
    );
  }, [boardCols, activeBoardId]);

  const pickableCalendars = useMemo(
    () => calendars.filter(isPickableBusinessCalendar),
    [calendars]
  );

  const moveBoardColumn = (columnId: string, direction: -1 | 1) => {
    const idx = boardCols.findIndex((c) => c.id === columnId);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= boardCols.length) return;
    const a = boardCols[idx];
    const b = boardCols[swapIdx];
    updateColumn(a.id, { order: b.order });
    updateColumn(b.id, { order: a.order });
  };

  const board = boards.find((b) => b.id === activeBoardId);

  const boardMemberNames = useMemo(
    () => (board?.memberNames ?? []).filter(Boolean),
    [board?.memberNames]
  );

  useEffect(() => {
    setBoardNameDraft(board?.name ?? '');
  }, [board?.id, board?.name]);

  const visibleCardIds = useMemo(() => {
    const matched = searchCards(activeBoardId, searchQuery, labelFilter || undefined);
    return new Set(matched.map((c) => c.id));
  }, [searchCards, activeBoardId, searchQuery, labelFilter]);

  const hasActiveFilter = searchQuery.trim() !== '' || labelFilter !== '';

  useEffect(() => {
    if (!detail) return;
    const fresh = cards.find((c) => c.id === detail.id);
    if (fresh) setDetail(fresh);
  }, [cards, detail?.id]);

  useEffect(() => {
    setChecklistAdding(false);
    setChecklistDraft('');
  }, [detail?.id]);

  useEffect(() => {
    setBoardMembersDraft((board?.memberNames ?? []).join('، '));
  }, [board?.id, board?.memberNames]);

  const teamPickOptions = useMemo(() => listTeamDirectory('all'), [listTeamDirectory]);

  const parseBoardMemberNames = (draft: string) =>
    draft
      .split(/[،,]/)
      .map((s) => trimEdges(s))
      .filter(Boolean);

  const persistBoardMembers = () => {
    if (!board) return;
    const names = parseBoardMemberNames(boardMembersDraft);
    updateBoard(board.id, { memberNames: names });
  };

  const removeBoardMember = (name: string) => {
    if (!board) return;
    const names = parseBoardMemberNames(boardMembersDraft).filter((n) => n !== name);
    const next = names.join('، ');
    setBoardMembersDraft(next);
    updateBoard(board.id, { memberNames: names });
  };

  const resolveAssigneeUserId = (assigneeName: string): string | undefined => {
    const n = trimEdges(assigneeName);
    if (!n) return undefined;
    const hit = teamPickOptions.find((u) => u.name === n || u.id === n);
    return hit?.id;
  };

  const saveBoardSettings = () => {
    if (!board) return;
    const n = boardNameDraft.trim();
    if (n && n !== board.name) updateBoard(board.id, { name: n });
    persistBoardMembers();
    setBoardSettingsOpen(false);
  };

  const taskTodayKey = useMemo(() => toDateKey(new Date()), []);

  const openNewTask = () => {
    const first = boardCols[0];
    setNewTaskCol(first?.id ?? '');
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskAssignee('');
    setNewTaskDueDate(taskTodayKey);
    setNewTaskDueTime('');
    setNewTaskCalendarId(pickableCalendars[0]?.id ?? '');
    setNewTaskAddToCalendar(false);
    setNewTaskReminderMinutes('');
    setNewTaskRecurrence('none');
    setNewTaskCategory('');
    setNewTaskLabelIds([]);
    setNewTaskEndDueDate('');
    setNewTaskChecklist([]);
    setNewTaskChecklistDraft('');
    setNewTaskAttachments([]);
    setNewTaskError('');
    setNewTaskOpen(true);
  };

  const addNewTaskPlainFile = (file: File) => {
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    setNewTaskAttachments((prev) => [
      ...prev,
      { id: newLocalId(), name: file.name, size: `${sizeKb} KB` },
    ]);
  };

  const toggleNewTaskLabel = (labelId: string) => {
    setNewTaskLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  const removeBoardLabel = (labelId: string) => {
    if (!board) return;
    updateBoard(board.id, {
      labelPalette: (board.labelPalette ?? []).filter((lb) => lb.id !== labelId),
    });
  };

  const submitNewTask = async () => {
    const title = trimEdges(newTaskTitle);
    if (!title) {
      setNewTaskError('عنوان وظیفه را وارد کنید.');
      return;
    }
    if (!activeBoardId) {
      setNewTaskError('ابتدا یک میز کار انتخاب کنید.');
      return;
    }

    setNewTaskSaving(true);
    setNewTaskError('');

    try {
      let targetColumnId = newTaskCol || boardCols[0]?.id || '';
      if (!targetColumnId) {
        const createdColumnId = await addColumn(activeBoardId, 'انجام نشده');
        targetColumnId = createdColumnId || '';
      }
      if (!targetColumnId) throw new Error('ستون پیش‌فرض ساخته نشد.');

      const assignee = trimEdges(newTaskAssignee);
      const assigneeUserId = resolveAssigneeUserId(assignee);
      const extra: Partial<MeizitoCard> = {
        description: trimEdges(newTaskDescription),
        assignee,
        assigneeUserId,
        category: trimEdges(newTaskCategory),
        labelIds: newTaskLabelIds,
        dueDate: newTaskDueDate,
        dueTime: newTaskDueTime,
        endDueDate:
          newTaskAddToCalendar && trimEdges(newTaskEndDueDate)
            ? trimEdges(newTaskEndDueDate)
            : undefined,
        calendarId: newTaskAddToCalendar ? newTaskCalendarId || undefined : undefined,
        addToCalendar: newTaskAddToCalendar && Boolean(newTaskDueDate),
        reminderMinutes:
          newTaskReminderMinutes === '' ? undefined : Number(newTaskReminderMinutes),
        recurrence: newTaskRecurrence,
        checklist: newTaskChecklist,
        attachments: newTaskAttachments,
      };
      await addCard(activeBoardId, targetColumnId, title, extra);
      setNewTaskOpen(false);
    } catch (err) {
      setNewTaskError(err instanceof Error ? err.message : 'ثبت وظیفه ناموفق بود.');
    } finally {
      setNewTaskSaving(false);
    }
  };

  const toggleLabelOnDetail = (labelId: string) => {
    if (!detail) return;
    const has = detail.labelIds.includes(labelId);
    const labelIds = has
      ? detail.labelIds.filter((id) => id !== labelId)
      : [...detail.labelIds, labelId];
    updateCard(detail.id, { labelIds });
  };

  const addFileAttachment = (ref: AttachmentRef) => {
    if (!detail) return;
    const sizeKb = ref.size ? Math.max(1, Math.round(ref.size / 1024)) : 0;
    updateCard(detail.id, {
      attachments: [
        ...detail.attachments,
        {
          id: newLocalId(),
          name: ref.name,
          size: sizeKb ? `${sizeKb} KB` : '—',
          fileRef: ref,
        },
      ],
    });
  };

  const handleDeleteCard = (cardId: string, closeDetail?: boolean) => {
    setPendingDelete({ type: 'card', id: cardId, closeDetail });
  };

  const runPendingDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'board') {
      deleteBoard(pendingDelete.id);
    } else if (pendingDelete.type === 'column') {
      deleteColumn(pendingDelete.id);
    } else {
      deleteCard(pendingDelete.id);
      if (pendingDelete.closeDetail) setDetail(null);
    }
    setPendingDelete(null);
  };

  const pendingDeleteMessage = (() => {
    if (!pendingDelete) return '';
    if (pendingDelete.type === 'board') {
      return `میز «${pendingDelete.name}» و همهٔ ستون‌ها و وظایفش برای همیشه حذف می‌شود. این کار برگشت‌پذیر نیست.`;
    }
    if (pendingDelete.type === 'column') {
      const n = pendingDelete.cardCount;
      return n > 0
        ? `ستون «${pendingDelete.title}» و ${n} وظیفهٔ داخلش حذف شود؟`
        : `ستون «${pendingDelete.title}» حذف شود؟`;
    }
    return 'این وظیفه حذف شود؟';
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            data-testid={`meizito-board-tab-${b.id}`}
            onClick={() => setActiveBoardId(b.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              b.id === activeBoardId
                ? 'bg-white border-nexa-accent text-nexa-accent shadow-sm'
                : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}
          >
            {b.name}
          </button>
        ))}
        <button
          type="button"
          data-testid="meizito-board-add-board"
          onClick={() => {
            setNewBoardName('');
            setNewBoardOpen(true);
          }}
          className="text-xs font-bold text-nexa-accent px-2"
        >
          + میز جدید
        </button>
      </div>

      <div className="relative z-10 mb-4 flex flex-col gap-3 bg-white/80 dark:bg-transparent pb-2">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              data-testid="meizito-board-add-column"
              onClick={() => {
                setNewColumnTitle('');
                setNewColumnOpen(true);
              }}
              className="text-xs font-bold text-gray-600 px-2"
            >
              + ستون
            </button>
            {board && (
              <>
                <button
                  type="button"
                  data-testid="meizito-board-settings"
                  onClick={() => setBoardSettingsOpen(true)}
                  className="text-xs font-bold text-gray-600 px-2 py-2 rounded-xl bg-gray-50 inline-flex items-center gap-1"
                >
                  <Settings size={14} />
                  تنظیمات میز
                </button>
                {boards.length > 1 && (
                  <button
                    type="button"
                    data-testid="meizito-board-delete"
                    onClick={() => {
                      if (!board) return;
                      setPendingDelete({ type: 'board', id: board.id, name: board.name });
                    }}
                    className="text-xs font-bold text-rose-600 px-2 inline-flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    حذف میز
                  </button>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            data-testid="meizito-board-add-task"
            onClick={openNewTask}
            className="nexa-btn-primary flex items-center gap-2 text-sm py-2 px-4"
          >
            <Plus size={16} />
            وظیفه جدید
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو: عنوان، ارجاع، دسته…"
              className="w-full bg-gray-50 rounded-xl py-2 pr-10 pl-3 text-sm"
            />
          </div>
          {board && (board.labelPalette?.length ?? 0) > 0 && (
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <option value="">همه برچسب‌ها</option>
              {(board.labelPalette ?? []).map((lb) => (
                <option key={lb.id} value={lb.id}>
                  {lb.name}
                </option>
              ))}
            </select>
          )}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setLabelFilter('');
              }}
              className="text-[10px] font-bold text-gray-500 hover:text-nexa-accent"
            >
              پاک کردن فیلتر
            </button>
          )}
        </div>
      </div>

      {hasActiveFilter && visibleCardIds.size === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3 relative z-10">
          کارتی با این فیلتر پیدا نشد.
        </p>
      )}

      {boardCols.length > 0 && (
        <div
          className="sm:hidden relative z-0 flex gap-1 overflow-x-auto pb-2 mb-1"
          role="tablist"
          aria-label="ستون‌های کانبان"
        >
          {boardCols.map((col) => (
            <button
              key={col.id}
              type="button"
              role="tab"
              aria-selected={mobileKanbanCol === col.id}
              onClick={() => setMobileKanbanCol(col.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap ${
                mobileKanbanCol === col.id
                  ? 'bg-nexa-accent text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {col.title}
            </button>
          ))}
        </div>
      )}

      <div className="relative z-0 isolate min-w-0 -mx-2 px-2 flex flex-nowrap gap-4 meizito-kanban-scroll pb-3 min-h-[320px] sm:min-h-[420px] overflow-x-auto">
        {boardCols.map((col) => {
          const colCardIds = col.cardIds ?? [];
          const hiddenOnMobile = mobileKanbanCol && col.id !== mobileKanbanCol;
          return (
          <div
            key={col.id}
            className={`shrink-0 w-[min(100%,18rem)] sm:w-72 nexa-card p-3 bg-gray-50/80 flex flex-col ${
              hiddenOnMobile ? 'max-sm:hidden' : ''
            }`}
            onDragEnter={acceptKanbanCardDrop}
            onDragOver={acceptKanbanCardDrop}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const cardId = readKanbanDragCardId(e, kanbanDragCardRef.current);
              if (!cardId) return;
              const index = computeKanbanInsertIndex(colCardIds, cardId, null);
              moveCard(cardId, col.id, index);
            }}
          >
            <div className="flex items-center gap-1 mb-3 px-1">
              <input
                key={`${col.id}-${col.title}`}
                defaultValue={col.title}
                onBlur={(e) => {
                  const t = e.target.value.trim();
                  if (t && t !== col.title) updateColumn(col.id, { title: t });
                }}
                className="flex-1 min-w-0 text-xs font-black text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-nexa-accent outline-none px-0.5"
                aria-label="عنوان ستون"
              />
              <span className="text-gray-400 font-fa-num text-xs shrink-0">
                {colCardIds.filter((id) => visibleCardIds.has(id)).length}
              </span>
              <button
                type="button"
                onClick={() => {
                  const n = colCardIds.length;
                  setPendingDelete({
                    type: 'column',
                    id: col.id,
                    title: col.title,
                    cardCount: n,
                  });
                }}
                className="p-0.5 text-gray-400 hover:text-rose-600 shrink-0"
                aria-label="حذف ستون"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div
              className="space-y-2 flex-1 min-h-[5rem] flex flex-col"
              onDragEnter={acceptKanbanCardDrop}
              onDragOver={acceptKanbanCardDrop}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const cardId = readKanbanDragCardId(e, kanbanDragCardRef.current);
                if (!cardId) return;
                const index = computeKanbanInsertIndex(colCardIds, cardId, null);
                moveCard(cardId, col.id, index);
              }}
            >
              {colCardIds.map((cid) => {
                if (!visibleCardIds.has(cid)) return null;
                const card = cards.find((c) => c.id === cid);
                if (!card) return null;
                return (
                  <KanbanBoardCard
                    key={card.id}
                    card={card}
                    columnId={col.id}
                    columnCardIds={colCardIds}
                    boardCols={boardCols}
                    labelPalette={board?.labelPalette ?? []}
                    dragFallbackRef={kanbanDragCardRef}
                    setDragActive={setKanbanDragActive}
                    onOpenDetail={setDetail}
                    onToggleStar={toggleCardStar}
                    onDeleteCard={handleDeleteCard}
                    onMoveCard={moveCard}
                  />
                );
              })}
              {colCardIds.filter((id) => visibleCardIds.has(id)).length === 0 && (
                <div
                  className="flex-1 min-h-[4.5rem] rounded-xl border border-dashed border-gray-200 bg-white/50 flex items-center justify-center text-[10px] text-gray-400 px-2 text-center"
                  onDragEnter={acceptKanbanCardDrop}
                  onDragOver={acceptKanbanCardDrop}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const cardId = readKanbanDragCardId(e, kanbanDragCardRef.current);
                    if (!cardId) return;
                    moveCard(cardId, col.id, 0);
                  }}
                >
                  رها کردن کارت در این ستون
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {newBoardOpen && (
        <BoardModal title="میز کار جدید" onClose={() => setNewBoardOpen(false)}>
          <input
            data-testid="meizito-board-name-input"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="نام میز"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-4"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 nexa-btn-primary py-2 text-sm font-bold disabled:opacity-60"
              disabled={newBoardSaving}
              onClick={() => {
                const n = trimEdges(newBoardName);
                if (!n || newBoardSaving) return;
                setNewBoardSaving(true);
                void addBoard(n)
                  .then(() => {
                    setNewBoardOpen(false);
                    setNewBoardName('');
                  })
                  .catch((err: unknown) => {
                    const msg =
                      err instanceof MeizitoApiError
                        ? err.message
                        : err instanceof Error
                          ? err.message
                          : 'ایجاد میز کار انجام نشد. دوباره تلاش کنید.';
                    window.alert(msg);
                  })
                  .finally(() => setNewBoardSaving(false));
              }}
            >
              {newBoardSaving ? 'در حال ایجاد…' : 'ایجاد'}
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-100 rounded-xl py-2 text-sm font-bold"
              onClick={() => setNewBoardOpen(false)}
            >
              انصراف
            </button>
          </div>
        </BoardModal>
      )}

      {newColumnOpen && (
        <BoardModal title="ستون جدید" onClose={() => setNewColumnOpen(false)}>
          <input
            data-testid="meizito-board-column-input"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="عنوان ستون"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-4"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 nexa-btn-primary py-2 text-sm font-bold"
              onClick={() => {
                const t = newColumnTitle.trim();
                if (!t || !activeBoardId) return;
                void addColumn(activeBoardId, t);
                setNewColumnOpen(false);
                setNewColumnTitle('');
              }}
            >
              ایجاد
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-100 rounded-xl py-2 text-sm font-bold"
              onClick={() => setNewColumnOpen(false)}
            >
              انصراف
            </button>
          </div>
        </BoardModal>
      )}

      {newTaskOpen && (
        <BoardModal
          title="وظیفه جدید"
          panelClassName="max-w-lg"
          onClose={() => !newTaskSaving && setNewTaskOpen(false)}
        >
          <input
            data-testid="meizito-board-task-title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="عنوان"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-3"
          />
          <textarea
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="توضیحات"
            rows={3}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-3"
          />
          <div className="mb-3 space-y-1">
            <p className="text-xs font-bold text-gray-500">ارجاع به</p>
            <BusinessMemberPicker
              value={newTaskAssignee}
              onChange={(name) => setNewTaskAssignee(name)}
              placeholder="انتخاب از اعضای میز"
              restrictToMemberNames={boardMemberNames.length > 0 ? boardMemberNames : undefined}
            />
          </div>
          <input
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value)}
            placeholder="دسته (اختیاری)"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-3"
          />
          {board && (board.labelPalette?.length ?? 0) > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-500 mb-2">برچسب</p>
              <div className="flex flex-wrap gap-2">
                {board.labelPalette.map((lb) => (
                  <button
                    key={lb.id}
                    type="button"
                    onClick={() => toggleNewTaskLabel(lb.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      newTaskLabelIds.includes(lb.id)
                        ? 'text-white border-transparent'
                        : 'text-gray-800 border-nexa-border bg-white'
                    }`}
                    style={
                      newTaskLabelIds.includes(lb.id) ? { backgroundColor: lb.color } : undefined
                    }
                  >
                    {lb.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {board && (board.labelPalette?.length ?? 0) === 0 && (
            <button
              type="button"
              className="text-xs font-bold text-nexa-accent mb-3"
              onClick={() => {
                setNewTaskOpen(false);
                setBoardSettingsOpen(true);
              }}
            >
              + برچسب در تنظیمات میز تعریف کنید
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <JalaliDateInput value={newTaskDueDate} onChange={setNewTaskDueDate} allowEmpty />
            <input
              type="time"
              value={newTaskDueTime}
              onChange={(e) => setNewTaskDueTime(e.target.value)}
              className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
            />
          </div>
          {newTaskDueDate && (
            <p className="text-[10px] text-gray-500 font-fa-num mb-3">
              {formatDateKeyJalaliHint(newTaskDueDate)}
            </p>
          )}
          <select
            value={newTaskRecurrence}
            onChange={(e) => setNewTaskRecurrence(e.target.value as MeizitoRecurrence)}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-3"
          >
            <option value="none">بدون تکرار</option>
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
          </select>
          {pickableCalendars.length > 0 && (
            <div className="mb-3 space-y-2 rounded-xl border border-gray-100 p-3">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTaskAddToCalendar}
                  onChange={(e) => setNewTaskAddToCalendar(e.target.checked)}
                  className="rounded border-gray-300"
                />
                افزودن به تقویم
              </label>
              {newTaskAddToCalendar && (
                <>
                  <select
                    value={newTaskCalendarId}
                    onChange={(e) => setNewTaskCalendarId(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
                  >
                    {pickableCalendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTaskReminderMinutes === '' ? '' : String(newTaskReminderMinutes)}
                    onChange={(e) =>
                      setNewTaskReminderMinutes(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">بدون یادآور</option>
                    <option value="60">۱ ساعت قبل</option>
                    <option value="120">۲ ساعت قبل</option>
                    <option value="1440">۱ روز قبل</option>
                  </select>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 mb-1">پایان (چندروزه)</p>
                    <JalaliDateInput
                      value={newTaskEndDueDate}
                      onChange={setNewTaskEndDueDate}
                      allowEmpty
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <div className="mb-3 space-y-2">
            <p className="text-xs font-bold text-gray-500">چک‌لیست</p>
            <ul className="space-y-1">
              {newTaskChecklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() =>
                      setNewTaskChecklist((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x))
                      )
                    }
                  />
                  <span className="flex-1">{item.title}</span>
                  <button
                    type="button"
                    className="text-rose-600"
                    onClick={() => setNewTaskChecklist((prev) => prev.filter((x) => x.id !== item.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                data-testid="meizito-new-task-checklist"
                value={newTaskChecklistDraft}
                onChange={(e) => setNewTaskChecklistDraft(e.target.value)}
                placeholder="مورد چک‌لیست"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const t = newTaskChecklistDraft.trim();
                    if (!t) return;
                    setNewTaskChecklist((prev) => [...prev, { id: newLocalId(), title: t, done: false }]);
                    setNewTaskChecklistDraft('');
                  }
                }}
              />
              <button
                type="button"
                className="text-xs font-bold text-nexa-accent px-3 rounded-xl bg-gray-50"
                onClick={() => {
                  const t = newTaskChecklistDraft.trim();
                  if (!t) return;
                  setNewTaskChecklist((prev) => [...prev, { id: newLocalId(), title: t, done: false }]);
                  setNewTaskChecklistDraft('');
                }}
              >
                +
              </button>
            </div>
          </div>
          <div className="mb-3 space-y-2">
            <p className="text-xs font-bold text-gray-500">پیوست</p>
            {newTaskAttachments.length > 0 && (
              <ul className="space-y-1">
                {newTaskAttachments.map((att) => (
                  <li key={att.id} className="text-xs text-gray-700 flex items-center gap-2">
                    <Paperclip size={12} />
                    <span className="flex-1">{att.name}</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-rose-600"
                      onClick={() =>
                        setNewTaskAttachments((prev) => prev.filter((a) => a.id !== att.id))
                      }
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="text-xs font-bold text-gray-600 border border-dashed border-gray-300 rounded-xl px-3 py-2 cursor-pointer inline-flex items-center gap-1 hover:border-nexa-accent">
              <Paperclip size={14} />
              افزودن فایل
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addNewTaskPlainFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <select
            value={newTaskCol}
            onChange={(e) => setNewTaskCol(e.target.value)}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-4"
          >
            {boardCols.length === 0 && <option value="">ستون پیش‌فرض ساخته می‌شود</option>}
            {boardCols.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {newTaskError && <p className="text-xs font-bold text-red-600 mb-3">{newTaskError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="meizito-board-task-submit"
              onClick={submitNewTask}
              disabled={newTaskSaving}
              className="flex-1 nexa-btn-primary py-2 text-sm font-bold disabled:opacity-60"
            >
              {newTaskSaving ? 'در حال ثبت…' : 'ثبت'}
            </button>
            <button
              type="button"
              onClick={() => setNewTaskOpen(false)}
              disabled={newTaskSaving}
              className="flex-1 bg-gray-100 rounded-xl py-2 text-sm font-bold"
            >
              انصراف
            </button>
          </div>
        </BoardModal>
      )}

      {boardSettingsOpen && board && (
        <BoardModal
          title="تنظیمات میز کار"
          panelClassName="max-w-lg"
          onClose={() => setBoardSettingsOpen(false)}
        >
          <div className="space-y-4 text-sm">
            <div>
              <label className="text-xs font-bold text-gray-500">نام میز</label>
              <input
                data-testid="meizito-board-rename"
                value={boardNameDraft}
                onChange={(e) => setBoardNameDraft(e.target.value)}
                onBlur={() => {
                  const n = boardNameDraft.trim();
                  if (n && n !== board.name) updateBoard(board.id, { name: n });
                  else setBoardNameDraft(board.name);
                }}
                className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-1 font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">اعضای میز</label>
              <input
                data-testid="meizito-board-members"
                value={boardMembersDraft}
                onChange={(e) => setBoardMembersDraft(e.target.value)}
                onBlur={persistBoardMembers}
                placeholder="نام‌ها با ، جدا"
                className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-1 text-xs"
              />
              <ul className="flex flex-wrap gap-2 mt-2">
                {parseBoardMemberNames(boardMembersDraft).map((name) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-800 px-2 py-1 rounded-lg"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeBoardMember(name)}
                      className="text-gray-500 hover:text-rose-600"
                      aria-label={`حذف ${name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2" data-testid="meizito-board-add-member">
                <BusinessMemberPicker
                  value={memberPicker}
                  onChange={(name, id) => {
                    setMemberPicker(name);
                    if (!id || !name.trim()) return;
                    const existing = boardMembersDraft
                      .split(/[،,]/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (existing.includes(name)) {
                      setMemberPicker('');
                      return;
                    }
                    const next = [...existing, name].join('، ');
                    setBoardMembersDraft(next);
                    updateBoard(board!.id, { memberNames: [...existing, name] });
                    setMemberPicker('');
                  }}
                  placeholder="افزودن عضو از تیم"
                  allowFreeText={false}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">ستون‌ها</p>
              <ul className="space-y-2">
                {boardCols.map((col) => (
                  <li key={col.id} className="flex items-center gap-2">
                    <input
                      defaultValue={col.title}
                      onBlur={(e) => {
                        const t = e.target.value.trim();
                        if (t && t !== col.title) updateColumn(col.id, { title: t });
                      }}
                      className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-400 font-fa-num">{col.cardIds?.length ?? 0}</span>
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={() => moveBoardColumn(col.id, -1)}
                        className="text-gray-400 hover:text-nexa-accent p-0.5"
                        aria-label="جابجایی به راست"
                      >
                        <ChevronUp size={14} className="rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBoardColumn(col.id, 1)}
                        className="text-gray-400 hover:text-nexa-accent p-0.5"
                        aria-label="جابجایی به چپ"
                      >
                        <ChevronDown size={14} className="rotate-90" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          type: 'column',
                          id: col.id,
                          title: col.title,
                          cardCount: col.cardIds?.length ?? 0,
                        })
                      }
                      className="text-rose-600 p-1"
                      aria-label="حذف ستون"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-2 text-xs font-bold text-nexa-accent"
                onClick={() => {
                  setBoardSettingsOpen(false);
                  setNewColumnTitle('');
                  setNewColumnOpen(true);
                }}
              >
                + ستون جدید
              </button>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">برچسب‌های میز</p>
              <ul className="flex flex-wrap gap-2 mb-2">
                {(board.labelPalette ?? []).map((lb) => (
                  <li
                    key={lb.id}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-white px-2 py-1 rounded-lg"
                    style={{ backgroundColor: lb.color }}
                  >
                    {lb.name}
                    <button
                      type="button"
                      onClick={() => removeBoardLabel(lb.id)}
                      className="opacity-90 hover:opacity-100"
                      aria-label="حذف برچسب"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                data-testid="meizito-board-add-label"
                className="text-xs font-bold text-nexa-accent"
                onClick={() => {
                  setNewLabelName('');
                  setNewLabelOpen(true);
                }}
              >
                + برچسب جدید
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              data-testid="meizito-board-settings-save"
              className="flex-1 nexa-btn-primary py-2 text-sm font-bold"
              onClick={saveBoardSettings}
            >
              ذخیره تنظیمات
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-100 rounded-xl py-2 text-sm font-bold"
              onClick={() => setBoardSettingsOpen(false)}
            >
              بستن
            </button>
          </div>
        </BoardModal>
      )}

      {newLabelOpen && board && (
        <BoardModal title="برچسب جدید" onClose={() => setNewLabelOpen(false)}>
          <input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="نام برچسب"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-4"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 nexa-btn-primary py-2 text-sm font-bold"
              onClick={() => {
                addBoardLabel(board.id, newLabelName);
                setNewLabelOpen(false);
              }}
            >
              افزودن
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-100 rounded-xl py-2 text-sm font-bold"
              onClick={() => setNewLabelOpen(false)}
            >
              انصراف
            </button>
          </div>
        </BoardModal>
      )}

      {detail && (
        <BoardModal
          title="جزئیات وظیفه"
          zClass="z-[95]"
          panelClassName="max-w-lg"
          onClose={() => setDetail(null)}
        >
          <div className="space-y-3 text-sm -mt-2">
              <div>
                <label className="text-xs font-bold text-gray-500">عنوان</label>
                <input
                  data-testid="meizito-card-title-edit"
                  value={detail.title}
                  onChange={(e) => updateCard(detail.id, { title: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-1 font-bold text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">توضیح</label>
                <textarea
                  value={detail.description}
                  onChange={(e) => updateCard(detail.id, { description: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-1 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">دسته</label>
                <input
                  value={detail.category}
                  onChange={(e) => updateCard(detail.id, { category: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">برچسب</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {board?.labelPalette.map((lb) => (
                    <button
                      key={lb.id}
                      type="button"
                      onClick={() => toggleLabelOnDetail(lb.id)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                        detail.labelIds.includes(lb.id)
                          ? 'text-white border-transparent'
                          : 'text-gray-600 border-nexa-border bg-white'
                      }`}
                      style={
                        detail.labelIds.includes(lb.id) ? { backgroundColor: lb.color } : undefined
                      }
                    >
                      {lb.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">ارجاع</label>
                <BusinessMemberPicker
                  value={detail.assignee ?? ''}
                  userId={detail.assigneeUserId}
                  onChange={(a, uid) => {
                    updateCard(detail.id, {
                      assignee: a,
                      assigneeUserId: uid ?? resolveAssigneeUserId(a),
                    });
                  }}
                  placeholder="انتخاب از اعضای میز"
                  restrictToMemberNames={boardMemberNames.length > 0 ? boardMemberNames : undefined}
                  className="mt-1"
                />
              </div>
              {(detail.sourceChatMessageId || detail.sourceChatThreadId) && (
                <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2">
                  منبع: پیام گفتگو
                  {detail.sourceChatThreadId && (
                    <>
                      {' '}
                      <Link
                        href={`/dashboard/chats?thread=${encodeURIComponent(detail.sourceChatThreadId)}`}
                        className="underline hover:text-indigo-800"
                      >
                        باز کردن گفتگو
                      </Link>
                    </>
                  )}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-500">سررسید (شمسی)</label>
                  <div className="mt-1">
                    <JalaliDateInput
                      value={detail.dueDate || ''}
                      onChange={(key) => updateCard(detail.id, { dueDate: key })}
                      allowEmpty
                    />
                  </div>
                  {detail.dueDate && (
                    <p className="text-[10px] text-gray-500 mt-1 font-fa-num">
                      {formatDateKeyJalaliHint(detail.dueDate)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">ساعت</label>
                  <input
                    type="time"
                    value={detail.dueTime}
                    onChange={(e) => updateCard(detail.id, { dueTime: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-1 font-fa-num"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500">تکرار</label>
                  <select
                    value={detail.recurrence}
                    onChange={(e) =>
                      updateCard(detail.id, { recurrence: e.target.value as MeizitoCard['recurrence'] })
                    }
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-1 text-sm"
                  >
                    <option value="none">بدون تکرار</option>
                    <option value="daily">روزانه</option>
                    <option value="weekly">هفتگی</option>
                  </select>
                </div>
              </div>
              {pickableCalendars.length > 0 && (
                <div className="space-y-2 rounded-xl border border-gray-100 p-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detail.addToCalendar ?? false}
                      onChange={(e) =>
                        updateCard(detail.id, {
                          addToCalendar: e.target.checked,
                          calendarId: e.target.checked
                            ? detail.calendarId ?? pickableCalendars[0]?.id
                            : undefined,
                        })
                      }
                    />
                    افزودن به تقویم
                  </label>
                  {detail.addToCalendar && (
                    <>
                      <select
                        value={detail.calendarId ?? pickableCalendars[0]?.id ?? ''}
                        onChange={(e) => updateCard(detail.id, { calendarId: e.target.value })}
                        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
                      >
                        {pickableCalendars.map((cal) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={detail.reminderMinutes ?? ''}
                        onChange={(e) =>
                          updateCard(detail.id, {
                            reminderMinutes: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
                      >
                        <option value="">بدون یادآوری</option>
                        <option value="60">۱ ساعت قبل</option>
                        <option value="120">۲ ساعت قبل</option>
                        <option value="1440">۱ روز قبل</option>
                      </select>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 mb-1">پایان (چندروزه)</p>
                        <JalaliDateInput
                          value={detail.endDueDate ?? ''}
                          onChange={(key) => updateCard(detail.id, { endDueDate: key })}
                          allowEmpty
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500">پیوست‌ها</label>
                {detail.attachments.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {detail.attachments.map((att) => (
                      <li key={att.id} className="text-xs text-gray-600 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                        <Paperclip size={12} />
                        {att.fileRef ? (
                          <>
                            <button
                              type="button"
                              className="text-nexa-accent font-bold hover:underline"
                              onClick={() => void openLocalAttachment(att.fileRef!)}
                            >
                              {att.name}
                            </button>
                            <button
                              type="button"
                              className="text-[10px] font-bold text-gray-500 hover:text-nexa-accent"
                              onClick={() => void openLocalAttachment(att.fileRef!)}
                            >
                              دانلود / مشاهده
                            </button>
                          </>
                        ) : (
                          <span>{att.name}</span>
                        )}
                        <span className="text-gray-400 font-fa-num">({att.size})</span>
                        </div>
                        {att.fileRef?.url &&
                          (att.fileRef.mimeType?.startsWith('image/') ||
                            /\.(png|jpe?g|webp|gif)$/i.test(att.name)) && (
                            <img
                              src={att.fileRef.url}
                              alt={att.name}
                              className="max-h-28 rounded-lg border border-nexa-border object-contain w-fit"
                            />
                          )}
                        <button
                          type="button"
                          aria-label="حذف پیوست"
                          className="text-gray-400 hover:text-rose-600"
                          onClick={() =>
                            updateCard(detail.id, {
                              attachments: detail.attachments.filter((a) => a.id !== att.id),
                            })
                          }
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <label className="nexa-btn-ghost text-xs py-1.5 px-3 cursor-pointer inline-flex items-center gap-1">
                    <Paperclip size={14} />
                    افزودن فایل
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f || !detail || !activeBusinessId) return;
                        void (async () => {
                          const scope = attachmentScopeForMeizitoCard(
                            activeBusinessId,
                            detail.boardId,
                            detail.id
                          );
                          const ref = await uploadAttachment(f, scope, {
                            businessId: activeBusinessId,
                            entityType: 'workspace_card',
                            entityId: detail.id,
                          });
                          addFileAttachment(ref);
                        })();
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFilePickerOpen(true)}
                    className="text-xs font-bold text-gray-500 border border-dashed border-gray-300 rounded-xl px-3 py-1.5 inline-flex items-center gap-1 hover:border-nexa-accent hover:text-nexa-accent"
                  >
                    <Cloud size={14} />
                    پیوست فایل
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">چک‌لیست</label>
                <ul className="mt-2 space-y-2">
                  {detail.checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          updateCard(detail.id, {
                            checklist: detail.checklist.map((x) =>
                              x.id === item.id ? { ...x, done: !x.done } : x
                            ),
                          })
                        }
                      />
                      <input
                        value={item.title}
                        onChange={(e) =>
                          updateCard(detail.id, {
                            checklist: detail.checklist.map((x) =>
                              x.id === item.id ? { ...x, title: e.target.value } : x
                            ),
                          })
                        }
                        className="flex-1 min-w-0 text-xs bg-gray-50 rounded px-2 py-0.5"
                      />
                      <button
                        type="button"
                        aria-label="حذف آیتم چک‌لیست"
                        className="text-gray-400 hover:text-rose-600 shrink-0"
                        onClick={() =>
                          updateCard(detail.id, {
                            checklist: detail.checklist.filter((x) => x.id !== item.id),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                {checklistAdding ? (
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <input
                      data-testid="meizito-checklist-item-input"
                      value={checklistDraft}
                      onChange={(e) => setChecklistDraft(e.target.value)}
                      placeholder="عنوان آیتم"
                      className="flex-1 min-w-[140px] bg-gray-50 rounded-lg px-2 py-1 text-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      data-testid="meizito-checklist-add"
                      className="text-xs font-bold text-nexa-accent"
                      onClick={() => {
                        const t = checklistDraft.trim();
                        if (!t) return;
                        updateCard(detail.id, {
                          checklist: [
                            ...detail.checklist,
                            { id: newLocalId(), title: t, done: false },
                          ],
                        });
                        setChecklistDraft('');
                        setChecklistAdding(false);
                      }}
                    >
                      افزودن
                    </button>
                    <button
                      type="button"
                      className="text-xs text-gray-500"
                      onClick={() => {
                        setChecklistDraft('');
                        setChecklistAdding(false);
                      }}
                    >
                      انصراف
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="meizito-checklist-add-open"
                    className="mt-2 text-xs font-bold text-nexa-accent"
                    onClick={() => setChecklistAdding(true)}
                  >
                    + آیتم
                  </button>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">کپی برای چند نفر (با ویرگول)</label>
                <input
                  value={copyNames}
                  onChange={(e) => setCopyNames(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 mt-1"
                  placeholder="علی، مریم"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parts = copyNames.split(/[،,]/).map((s) => s.trim()).filter(Boolean);
                    copyCardForAssignees(detail.id, parts);
                    setCopyNames('');
                  }}
                  className="mt-2 text-xs font-bold bg-gray-900 text-white rounded-lg px-3 py-1.5"
                >
                  کپی وظیفه
                </button>
              </div>
            </div>
            <button
              type="button"
              data-testid="meizito-card-delete"
              onClick={() => handleDeleteCard(detail.id, true)}
              className="mt-6 w-full flex items-center justify-center gap-2 text-rose-600 border border-rose-200 rounded-xl py-2 text-sm font-bold hover:bg-rose-50"
            >
              <Trash2 size={16} />
              حذف وظیفه
            </button>
        </BoardModal>
      )}

      {detail && (
        <AttachmentPickerModal
          open={filePickerOpen}
          onClose={() => setFilePickerOpen(false)}
          onSelect={addFileAttachment}
          scope={attachmentScopeForMeizitoCard(activeBusinessId, detail.boardId, detail.id)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={runPendingDelete}
        title={
          pendingDelete?.type === 'board'
            ? 'حذف میز کار'
            : pendingDelete?.type === 'column'
              ? 'حذف ستون'
              : 'حذف وظیفه'
        }
        message={pendingDeleteMessage}
        requiredPhrase={
          pendingDelete?.type === 'board' ? pendingDelete.name : undefined
        }
        phraseHint="نام دقیق میز را برای تأیید بنویسید:"
        confirmLabel="حذف"
        variant="danger"
      />
    </div>
  );
}
