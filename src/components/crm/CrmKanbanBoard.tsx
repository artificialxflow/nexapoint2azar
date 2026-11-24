'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import {
  createCrmOpportunityApi,
  createCrmStageApi,
  deleteCrmOpportunityApi,
  deleteCrmStageApi,
  fetchCrmPipelineBoard,
  updateCrmOpportunityApi,
  updateCrmStageApi,
} from '@/src/lib/erp/crm-client';
import type { CrmOpportunity, CrmPipelineStage } from '@/src/types/crm';

type Props = {
  businessId: string | null | undefined;
  onNotice?: (msg: string, ok: boolean) => void;
};

export default function CrmKanbanBoard({ businessId, onNotice }: Props) {
  const [stages, setStages] = useState<CrmPipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageDraft, setStageDraft] = useState('');
  const [editingOppId, setEditingOppId] = useState<string | null>(null);
  const [oppTitleDraft, setOppTitleDraft] = useState('');
  const [oppCloseDraft, setOppCloseDraft] = useState('');

  const refresh = useCallback(async () => {
    if (FRONTEND_ONLY || !businessId) return;
    setLoading(true);
    try {
      const board = await fetchCrmPipelineBoard(businessId);
      setStages(board.stages);
      setOpportunities(board.opportunities);
    } catch {
      onNotice?.('بارگذاری کانبان ناموفق بود.', false);
    } finally {
      setLoading(false);
    }
  }, [businessId, onNotice]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const oppsForStage = (stageId: string) =>
    opportunities.filter((o) => o.stageId === stageId).sort((a, b) => a.sortOrder - b.sortOrder);

  const onDropStage = async (stageId: string) => {
    if (!dragId || !businessId || FRONTEND_ONLY) return;
    const opp = opportunities.find((o) => o.id === dragId);
    if (!opp || opp.stageId === stageId) return;
    try {
      const updated = await updateCrmOpportunityApi(businessId, dragId, { stageId });
      setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      onNotice?.('مرحله فرصت به‌روز شد.', true);
    } catch {
      onNotice?.('جابه‌جایی فرصت ناموفق بود.', false);
    }
    setDragId(null);
  };

  const addCard = async (stageId: string) => {
    if (!businessId || FRONTEND_ONLY) return;
    const title = window.prompt('عنوان فرصت:', 'پروژه جدید');
    if (!title?.trim()) return;
    try {
      const created = await createCrmOpportunityApi(businessId, {
        stageId,
        title: title.trim(),
        expectedClose: '',
        sortOrder: oppsForStage(stageId).length,
      });
      setOpportunities((prev) => [...prev, created]);
      onNotice?.('فرصت اضافه شد.', true);
    } catch {
      onNotice?.('ایجاد فرصت ناموفق بود.', false);
    }
  };

  const addStage = async () => {
    if (!businessId || FRONTEND_ONLY) return;
    const title = window.prompt('نام مرحله جدید:');
    if (!title?.trim()) return;
    try {
      const created = await createCrmStageApi(businessId, {
        title: title.trim(),
        sortOrder: stages.length,
        color: '',
      });
      setStages((prev) => [...prev, created]);
      onNotice?.('مرحله اضافه شد.', true);
    } catch {
      onNotice?.('ایجاد مرحله ناموفق بود.', false);
    }
  };

  const startEditStage = (stage: CrmPipelineStage) => {
    setEditingStageId(stage.id);
    setStageDraft(stage.title);
  };

  const commitStageTitle = async (stage: CrmPipelineStage) => {
    const title = stageDraft.trim();
    setEditingStageId(null);
    if (!title || title === stage.title || !businessId || FRONTEND_ONLY) return;
    try {
      const updated = await updateCrmStageApi(businessId, stage.id, { title });
      setStages((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      onNotice?.('نام مرحله به‌روز شد.', true);
    } catch {
      onNotice?.('ویرایش مرحله ناموفق بود.', false);
    }
  };

  const startEditOpp = (card: CrmOpportunity) => {
    setEditingOppId(card.id);
    setOppTitleDraft(card.title);
    setOppCloseDraft(card.expectedClose || '');
  };

  const commitOppEdit = async (card: CrmOpportunity) => {
    const title = oppTitleDraft.trim();
    const expectedClose = oppCloseDraft.trim();
    setEditingOppId(null);
    if (!title || !businessId || FRONTEND_ONLY) return;
    if (title === card.title && expectedClose === (card.expectedClose || '')) return;
    try {
      const updated = await updateCrmOpportunityApi(businessId, card.id, {
        title,
        expectedClose,
      });
      setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      onNotice?.('فرصت به‌روز شد.', true);
    } catch {
      onNotice?.('ویرایش فرصت ناموفق بود.', false);
    }
  };

  const removeCard = async (opp: CrmOpportunity) => {
    if (!businessId || FRONTEND_ONLY) return;
    if (!window.confirm(`فرصت «${opp.title}» حذف شود؟`)) return;
    try {
      await deleteCrmOpportunityApi(businessId, opp.id);
      setOpportunities((prev) => prev.filter((o) => o.id !== opp.id));
      onNotice?.('فرصت حذف شد.', true);
    } catch {
      onNotice?.('حذف فرصت ناموفق بود.', false);
    }
  };

  const removeStage = async (stage: CrmPipelineStage) => {
    if (!businessId || FRONTEND_ONLY) return;
    if (!window.confirm(`مرحله «${stage.title}» و فرصت‌هایش حذف شوند؟`)) return;
    try {
      await deleteCrmStageApi(businessId, stage.id);
      await refresh();
      onNotice?.('مرحله حذف شد.', true);
    } catch {
      onNotice?.('حذف مرحله ناموفق بود.', false);
    }
  };

  if (loading && stages.length === 0) {
    return <p className="text-xs text-gray-500">بارگذاری کانبان…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => void addStage()} className="text-xs font-bold text-nexa-accent">
          + مرحله
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stages.map((stage) => {
          const cards = oppsForStage(stage.id);
          return (
            <div
              key={stage.id}
              className="space-y-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDropStage(stage.id)}
            >
              <div className="flex items-center justify-between px-2 gap-2">
                <h4 className="text-xs font-black text-gray-900 flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-nexa-accent shrink-0" />
                  {editingStageId === stage.id ? (
                    <input
                      value={stageDraft}
                      onChange={(e) => setStageDraft(e.target.value)}
                      onBlur={() => void commitStageTitle(stage)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitStageTitle(stage);
                        if (e.key === 'Escape') setEditingStageId(null);
                      }}
                      className="flex-1 min-w-0 bg-white border border-nexa-border rounded-lg px-2 py-0.5 text-xs font-bold"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditStage(stage)}
                      className="truncate text-right hover:text-nexa-accent"
                      title="ویرایش نام مرحله"
                    >
                      {stage.title}
                    </button>
                  )}
                </h4>
                <span className="text-[10px] font-bold text-gray-400 font-fa-num shrink-0">{cards.length}</span>
                <button
                  type="button"
                  aria-label={`ویرایش مرحله ${stage.title}`}
                  onClick={() => startEditStage(stage)}
                  className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  aria-label={`حذف مرحله ${stage.title}`}
                  onClick={() => void removeStage(stage)}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="bg-gray-100/50 p-3 rounded-2xl min-h-[280px] space-y-3">
                <button
                  type="button"
                  onClick={() => void addCard(stage.id)}
                  className="w-full py-2 text-[10px] font-bold text-gray-500 border border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-1"
                >
                  <Plus size={12} /> فرصت
                </button>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    draggable={editingOppId !== card.id}
                    onDragStart={() => setDragId(card.id)}
                    onDragEnd={() => setDragId(null)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-nexa-border cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex justify-between gap-2">
                      {editingOppId === card.id ? (
                        <div className="flex-1 space-y-1">
                          <input
                            value={oppTitleDraft}
                            onChange={(e) => setOppTitleDraft(e.target.value)}
                            className="w-full bg-gray-50 rounded-lg px-2 py-1 text-xs font-bold"
                            placeholder="عنوان"
                          />
                          <input
                            value={oppCloseDraft}
                            onChange={(e) => setOppCloseDraft(e.target.value)}
                            className="w-full bg-gray-50 rounded-lg px-2 py-1 text-[10px] font-fa-num"
                            placeholder="تاریخ بسته‌شدن"
                          />
                          <button
                            type="button"
                            onClick={() => void commitOppEdit(card)}
                            className="text-[10px] font-bold text-nexa-accent"
                          >
                            ذخیره
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditOpp(card)}
                          className="text-xs font-bold text-gray-900 mb-2 text-right flex-1 hover:text-nexa-accent"
                        >
                          {card.title}
                        </button>
                      )}
                      <div className="flex flex-col gap-1 shrink-0">
                        {editingOppId !== card.id && (
                          <button
                            type="button"
                            aria-label={`ویرایش ${card.title}`}
                            onClick={() => startEditOpp(card)}
                            className="text-gray-400 hover:text-nexa-accent"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`حذف ${card.title}`}
                          onClick={() => void removeCard(card)}
                          className="text-rose-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {editingOppId !== card.id && (
                      <span className="text-[9px] text-gray-400 font-fa-num">{card.expectedClose || '—'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
