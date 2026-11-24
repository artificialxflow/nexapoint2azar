'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, ChevronLeft } from 'lucide-react';
import { isAiAssistEnabled } from '@/src/lib/automation/store';
import { upsertRule } from '@/src/lib/automation/store';
import type { AutomationRuleDraft } from '@/src/lib/automation/types';
import { ACTION_LABELS, TRIGGER_LABELS } from '@/src/lib/automation/types';

export type ContextualHint = {
  id: string;
  title: string;
  detail: string;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
  ruleDraft?: AutomationRuleDraft;
};

type Props = {
  title?: string;
  hints: ContextualHint[];
  className?: string;
};

export default function AssistantSuggestionStrip({ title = 'پیشنهاد دستیار', hints, className = '' }: Props) {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const enabled = isAiAssistEnabled();

  const visible = useMemo(
    () => hints.filter((h) => !dismissed[h.id] && !applied[h.id]),
    [hints, dismissed, applied]
  );

  if (!enabled || visible.length === 0) return null;

  const applyRule = (h: ContextualHint) => {
    if (h.ruleDraft) {
      upsertRule({
        id: `rule-${Date.now()}-${h.id}`,
        name: h.ruleDraft.name,
        enabled: true,
        triggerType: h.ruleDraft.triggerType,
        actions: [{ type: h.ruleDraft.actionType, messageTemplate: h.ruleDraft.messageTemplate }],
        createdAt: new Date().toISOString(),
      });
      setApplied((p) => ({ ...p, [h.id]: true }));
      return;
    }
    h.onAction?.();
    setApplied((p) => ({ ...p, [h.id]: true }));
  };

  return (
    <div className={`nexa-card p-4 border border-amber-100 bg-amber-50/40 space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-black text-amber-900">
          <Sparkles size={16} className="text-amber-600" />
          {title}
        </div>
        <Link href="/dashboard/automation" className="text-[10px] font-bold text-nexa-accent flex items-center gap-0.5">
          تنظیمات اتومیشن
          <ChevronLeft size={12} />
        </Link>
      </div>
      <div className="space-y-2">
        {visible.map((h) => (
          <div
            key={h.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/80 rounded-xl px-3 py-2 border border-amber-100/80"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900">{h.title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{h.detail}</p>
              {h.ruleDraft && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {TRIGGER_LABELS[h.ruleDraft.triggerType]} → {ACTION_LABELS[h.ruleDraft.actionType]}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {h.href ? (
                <Link
                  href={h.href}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-nexa-accent text-white"
                >
                  {h.actionLabel ?? 'باز کردن'}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => applyRule(h)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-nexa-accent text-white"
                >
                  {h.actionLabel ?? (h.ruleDraft ? 'اعمال قانون' : 'انجام')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDismissed((p) => ({ ...p, [h.id]: true }))}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="بستن"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
