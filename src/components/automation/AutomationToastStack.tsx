'use client';

import React from 'react';
import { Bell, MessageSquare, X } from 'lucide-react';
import { useAutomationToastsOptional } from '@/src/context/AutomationContext';

export default function AutomationToastStack() {
  const ctx = useAutomationToastsOptional();
  if (!ctx || ctx.toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[90] flex flex-col gap-2 max-w-sm pointer-events-none">
      {ctx.toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto nexa-card p-3 shadow-lg border-l-4 border-l-nexa-accent flex gap-2 items-start"
        >
          {t.kind === 'sms' ? (
            <MessageSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Bell size={16} className="text-nexa-accent shrink-0 mt-0.5" />
          )}
          <p className="text-xs font-bold text-gray-800 flex-1">{t.message}</p>
          <button
            type="button"
            onClick={() => ctx.dismissToast(t.id)}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
