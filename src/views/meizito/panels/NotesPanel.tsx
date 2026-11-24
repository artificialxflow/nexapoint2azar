'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Plus, StickyNote, Trash2, Archive, Paperclip, Settings, X } from 'lucide-react';
import { AttachmentPickerModal } from '@/src/components/attachments/AttachmentPickerModal';
import { attachmentScopeForMeizitoNotes } from '@/src/lib/attachments/scopes';
import { openLocalAttachment } from '@/src/lib/attachments/client';
import { useMeizito } from '@/src/context/MeizitoContext';
import type { AttachmentRef } from '@/src/types/attachment';
import { NOTE_LABEL_PRESETS } from '@/src/lib/meizito/note-labels';

const COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#f5f5f4'];

type ListMode = 'active' | 'archived' | 'deleted';

function newChecklistId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now());
}

export default function NotesPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    notes,
    noteBoards,
    activeNoteBoardId,
    setActiveNoteBoardId,
    addNoteBoard,
    updateNoteBoard,
    addNote,
    updateNote,
    toggleNoteStar,
    archiveNote,
    listTeamDirectory,
    activeBusinessId,
  } = useMeizito();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [listMode, setListMode] = useState<ListMode>('active');
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [pendingFiles, setPendingFiles] = useState<AttachmentRef[]>([]);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [checklistNoteId, setChecklistNoteId] = useState<string | null>(null);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState('');
  const [boardColorDraft, setBoardColorDraft] = useState('#fef08a');
  const [boardMemberDraft, setBoardMemberDraft] = useState<string[]>([]);
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  const teamMembers = useMemo(() => listTeamDirectory('all'), [listTeamDirectory]);

  const activeBoard = useMemo(
    () => noteBoards.find((b) => b.id === activeNoteBoardId) ?? noteBoards[0],
    [noteBoards, activeNoteBoardId]
  );

  const boardNotes = useMemo(() => {
    const bid = activeBoard?.id ?? activeNoteBoardId;
    return notes.filter((n) => n.boardId === bid);
  }, [notes, activeBoard, activeNoteBoardId]);

  const visible = useMemo(() => {
    let base: typeof boardNotes;
    if (listMode === 'deleted') base = boardNotes.filter((n) => n.deletedAt);
    else if (listMode === 'archived') base = boardNotes.filter((n) => n.archived && !n.deletedAt);
    else base = boardNotes.filter((n) => !n.deletedAt && !n.archived);
    if (filterLabelId && listMode === 'active') {
      return base.filter((n) => (n.labelIds ?? []).includes(filterLabelId));
    }
    return base;
  }, [boardNotes, listMode, filterLabelId]);

  const openBoardSettings = () => {
    if (!activeBoard) return;
    setBoardNameDraft(activeBoard.name);
    setBoardColorDraft(activeBoard.color ?? '#fef08a');
    setBoardMemberDraft(activeBoard.memberUserIds ?? []);
    setBoardSettingsOpen(true);
  };

  const saveBoardSettings = () => {
    if (!activeBoard) return;
    const name = boardNameDraft.trim();
    updateNoteBoard(activeBoard.id, {
      name: name || activeBoard.name,
      color: boardColorDraft,
      memberUserIds: boardMemberDraft,
    });
    setBoardSettingsOpen(false);
  };

  const toggleNoteLabel = (noteId: string, labelId: string, current: string[]) => {
    const next = current.includes(labelId)
      ? current.filter((x) => x !== labelId)
      : [...current, labelId];
    updateNote(noteId, { labelIds: next });
  };

  const otherBoards = useMemo(
    () => noteBoards.filter((b) => b.id !== activeBoard?.id),
    [noteBoards, activeBoard]
  );

  const selectNoteBoard = (id: string) => {
    setActiveNoteBoardId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'notes');
    params.set('noteBoard', id);
    router.replace(`/dashboard/tasks?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fromUrl = searchParams.get('noteBoard');
    if (!fromUrl) return;
    if (noteBoards.some((b) => b.id === fromUrl) && fromUrl !== activeNoteBoardId) {
      setActiveNoteBoardId(fromUrl);
    }
  }, [searchParams, noteBoards, activeNoteBoardId, setActiveNoteBoardId]);

  const createBoard = () => {
    const name = newBoardName.trim();
    if (!name) return;
    addNoteBoard(name);
    setNewBoardName('');
    setShowNewBoard(false);
  };

  const moveToBoard = (noteId: string, targetBoardId: string) => {
    updateNote(noteId, { boardId: targetBoardId });
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">یادداشت‌ها — بوردهای یادداشت</p>

      <div className="flex flex-wrap items-center gap-2">
        {noteBoards
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => selectNoteBoard(b.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                b.id === activeNoteBoardId
                  ? 'bg-white border-nexa-accent text-nexa-accent shadow-sm'
                  : 'bg-gray-50 border-transparent text-gray-600'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                style={{ backgroundColor: b.color ?? '#e5e7eb' }}
              />
              {b.name}
            </button>
          ))}
        <button
          type="button"
          onClick={() => setShowNewBoard((v) => !v)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-700"
        >
          <LayoutGrid size={14} />
          بورد جدید
        </button>
      </div>

      {showNewBoard && (
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="نام بورد"
            className="bg-gray-50 rounded-xl px-3 py-2 text-sm flex-1 min-w-[140px]"
            onKeyDown={(e) => e.key === 'Enter' && createBoard()}
          />
          <button type="button" onClick={createBoard} className="nexa-btn-primary py-2 px-4 text-xs font-bold">
            ایجاد
          </button>
        </div>
      )}

      {activeBoard && (
        <div
          className="rounded-2xl px-4 py-3 border border-nexa-border flex items-center gap-3"
          style={{ backgroundColor: `${activeBoard.color ?? '#f3f4f6'}55` }}
        >
          <StickyNote size={18} className="text-gray-600" />
          <div>
            <p className="text-sm font-black text-gray-900">{activeBoard.name}</p>
            <p className="text-[10px] text-gray-500">
              {boardNotes.filter((n) => !n.deletedAt && !n.archived).length} یادداشت فعال
              {(activeBoard.memberUserIds?.length ?? 0) > 0 &&
                ` · ${activeBoard.memberUserIds!.length} عضو`}
            </p>
          </div>
          <button
            type="button"
            onClick={openBoardSettings}
            className="mr-auto text-[10px] font-bold text-gray-600 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80"
          >
            <Settings size={12} />
            تنظیمات بورد
          </button>
        </div>
      )}

      {boardSettingsOpen && activeBoard && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full border border-nexa-border shadow-xl space-y-3" dir="rtl">
            <div className="flex items-center justify-between">
              <p className="font-black text-gray-900">تنظیمات بورد یادداشت</p>
              <button type="button" onClick={() => setBoardSettingsOpen(false)} className="p-1 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <label className="text-[10px] font-bold text-gray-500 block">نام</label>
            <input
              value={boardNameDraft}
              onChange={(e) => setBoardNameDraft(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
            />
            <p className="text-[10px] font-bold text-gray-500">رنگ بورد</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBoardColorDraft(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    boardColorDraft === c ? 'border-gray-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className="text-[10px] font-bold text-gray-500">اعضا</p>
            <ul className="max-h-36 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
              {teamMembers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={boardMemberDraft.includes(u.id)}
                    onChange={() =>
                      setBoardMemberDraft((prev) =>
                        prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]
                      )
                    }
                  />
                  {u.name}
                </label>
              ))}
            </ul>
            <button type="button" onClick={saveBoardSettings} className="w-full nexa-btn-primary py-2 text-sm font-bold">
              ذخیره تنظیمات
            </button>
          </div>
        </div>
      )}

      {listMode === 'active' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500">فیلتر برچسب:</span>
          <button
            type="button"
            onClick={() => setFilterLabelId(null)}
            className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
              !filterLabelId ? 'bg-nexa-accent text-white border-nexa-accent' : 'bg-white border-gray-200'
            }`}
          >
            همه
          </button>
          {NOTE_LABEL_PRESETS.map((lb) => (
            <button
              key={lb.id}
              type="button"
              onClick={() => setFilterLabelId(lb.id)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                filterLabelId === lb.id
                  ? 'bg-nexa-accent text-white border-nexa-accent'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {lb.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(
          [
            ['active', 'فعال'],
            ['archived', 'آرشیو'],
            ['deleted', 'حذف‌شده'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setListMode(mode)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
              listMode === mode ? 'bg-nexa-accent text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {listMode === 'active' && (
        <div className="nexa-card p-5 space-y-3">
          <p className="text-sm font-black flex items-center gap-2">
            <Plus size={16} />
            یادداشت جدید
            {activeBoard && (
              <span className="text-[10px] font-normal text-gray-500">→ {activeBoard.name}</span>
            )}
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
            placeholder="متن"
          />
          <div className="flex flex-wrap gap-1.5">
            {NOTE_LABEL_PRESETS.map((lb) => (
              <button
                key={lb.id}
                type="button"
                onClick={() =>
                  setSelectedLabelIds((prev) =>
                    prev.includes(lb.id) ? prev.filter((x) => x !== lb.id) : [...prev, lb.id]
                  )
                }
                className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  selectedLabelIds.includes(lb.id)
                    ? 'bg-nexa-accent text-white border-nexa-accent'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {lb.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-900' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {pendingFiles.length > 0 && (
            <p className="text-[10px] text-gray-500 flex flex-wrap gap-2">
              {pendingFiles.map((ref) => (
                <span key={ref.id} className="flex items-center gap-1">
                  <Paperclip size={10} />
                  {ref.name}
                </span>
              ))}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilePickerOpen(true)}
              className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-1"
            >
              <Paperclip size={12} />
              پیوست تصویر/فایل
            </button>
            {saveError && (
              <p className="text-xs font-bold text-red-600 w-full">{saveError}</p>
            )}
            <button
              type="button"
              data-testid="meizito-note-save"
              disabled={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  setSaveError('');
                  try {
                    await addNote(
                      title || 'بدون عنوان',
                      content,
                      color,
                      activeNoteBoardId,
                      pendingFiles.length ? pendingFiles : undefined,
                      selectedLabelIds.length ? selectedLabelIds : undefined
                    );
                    setTitle('');
                    setContent('');
                    setPendingFiles([]);
                    setSelectedLabelIds([]);
                  } catch (e) {
                    setSaveError(
                      e instanceof Error ? e.message : 'ذخیره یادداشت ناموفق بود. دوباره تلاش کنید.'
                    );
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
              className="nexa-btn-primary py-2 px-4 text-sm font-bold disabled:opacity-60"
            >
              ذخیره
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          {listMode === 'active'
            ? 'یادداشتی در این بورد نیست.'
            : listMode === 'archived'
              ? 'آرشیو این بورد خالی است.'
              : 'یادداشت حذف‌شده‌ای نیست.'}
        </p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((n) => (
          <div
            key={n.id}
            className="rounded-2xl p-4 border border-nexa-border shadow-sm"
            style={{ backgroundColor: n.color }}
          >
            <div className="flex justify-between items-start gap-2">
              <StickyNote size={18} className="text-gray-600 shrink-0" />
              <button type="button" onClick={() => toggleNoteStar(n.id)} className="text-amber-600 text-xs font-bold">
                {n.starred ? '★' : '☆'}
              </button>
            </div>
            <p className="font-bold text-sm text-gray-900 mt-2">{n.title}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {NOTE_LABEL_PRESETS.map((lb) => {
                const on = (n.labelIds ?? []).includes(lb.id);
                return (
                  <button
                    key={lb.id}
                    type="button"
                    disabled={listMode !== 'active'}
                    onClick={() => toggleNoteLabel(n.id, lb.id, n.labelIds ?? [])}
                    className={`text-[9px] font-bold rounded-full px-2 py-0.5 border ${
                      on ? 'bg-white border-nexa-accent text-nexa-accent' : 'bg-white/50 border-transparent text-gray-600 opacity-70'
                    } disabled:cursor-default`}
                  >
                    {lb.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-700 mt-1 line-clamp-4">{n.content}</p>
            {(n.fileAttachments?.length ?? 0) > 0 && (
              <p className="text-[10px] mt-1 flex flex-wrap gap-2">
                {n.fileAttachments!.map((ref) => (
                  <button
                    key={ref.id}
                    type="button"
                    className="text-nexa-accent font-bold underline flex items-center gap-0.5"
                    onClick={() => openLocalAttachment(ref)}
                  >
                    <Paperclip size={10} />
                    {ref.name}
                  </button>
                ))}
              </p>
            )}
            <ul className="mt-2 space-y-1">
              {n.checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-[10px]">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() =>
                      updateNote(n.id, {
                        checklist: n.checklist.map((x) =>
                          x.id === item.id ? { ...x, done: !x.done } : x
                        ),
                      })
                    }
                  />
                  {item.title}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              {checklistNoteId === n.id ? (
                <>
                  <input
                    data-testid="meizito-note-checklist-input"
                    value={checklistDraft}
                    onChange={(e) => setChecklistDraft(e.target.value)}
                    placeholder="عنوان آیتم"
                    className="min-w-[120px] flex-1 bg-white/60 rounded px-2 py-0.5 text-[10px]"
                    autoFocus
                  />
                  <button
                    type="button"
                    data-testid="meizito-note-checklist-add"
                    className="text-[10px] font-bold text-nexa-accent"
                    onClick={() => {
                      const t = checklistDraft.trim();
                      if (!t) return;
                      updateNote(n.id, {
                        checklist: [
                          ...n.checklist,
                          { id: newChecklistId(), title: t, done: false },
                        ],
                      });
                      setChecklistDraft('');
                      setChecklistNoteId(null);
                    }}
                  >
                    افزودن
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-gray-600"
                    onClick={() => {
                      setChecklistDraft('');
                      setChecklistNoteId(null);
                    }}
                  >
                    انصراف
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="meizito-note-checklist-add-open"
                  className="text-[10px] font-bold text-nexa-accent"
                  onClick={() => {
                    setChecklistNoteId(n.id);
                    setChecklistDraft('');
                  }}
                >
                  + چک
                </button>
              )}
              {listMode === 'active' && (
                <>
                  <button
                    type="button"
                    className="text-[10px] font-bold flex items-center gap-1"
                    onClick={() => archiveNote(n.id, true)}
                  >
                    <Archive size={12} /> آرشیو
                  </button>
                  <button
                    type="button"
                    className="text-[10px] font-bold text-rose-600 flex items-center gap-1"
                    onClick={() => updateNote(n.id, { deletedAt: new Date().toISOString() })}
                  >
                    <Trash2 size={12} /> حذف
                  </button>
                </>
              )}
              {listMode === 'archived' && (
                <button
                  type="button"
                  className="text-[10px] font-bold text-gray-600"
                  onClick={() => archiveNote(n.id, false)}
                >
                  بازگردانی
                </button>
              )}
              {listMode === 'deleted' && (
                <button
                  type="button"
                  className="text-[10px] font-bold text-gray-600"
                  onClick={() => updateNote(n.id, { deletedAt: null })}
                >
                  بازیابی
                </button>
              )}
              {otherBoards.length > 0 && listMode === 'active' && (
                <select
                  className="text-[10px] font-bold bg-white/80 rounded-lg px-1 py-0.5 border border-black/10"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) moveToBoard(n.id, e.target.value);
                  }}
                >
                  <option value="">انتقال به بورد</option>
                  {otherBoards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      <AttachmentPickerModal
        open={filePickerOpen}
        onClose={() => setFilePickerOpen(false)}
        onSelect={(ref) => setPendingFiles((prev) => [...prev, ref])}
        scope={attachmentScopeForMeizitoNotes(activeBusinessId)}
      />
    </div>
  );
}

