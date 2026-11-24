'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeNexaAutomation } from '@/src/lib/automation/event-bus';
import type { ActionResult } from '@/src/lib/automation/rule-engine';
import type { NexaEvent } from '@/src/lib/automation/types';

export type AutomationToast = {
  id: string;
  message: string;
  kind: 'notify' | 'sms' | 'log';
  at: string;
};

type AutomationContextValue = {
  toasts: AutomationToast[];
  dismissToast: (id: string) => void;
  lastEvent: NexaEvent | null;
};

const AutomationContext = createContext<AutomationContextValue | null>(null);

export function AutomationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<AutomationToast[]>([]);
  const [lastEvent, setLastEvent] = useState<NexaEvent | null>(null);

  useEffect(() => {
    return subscribeNexaAutomation(({ event, results }) => {
      setLastEvent(event);
      const newToasts: AutomationToast[] = results
        .filter((r) => r.type !== 'log_only')
        .map((r: ActionResult) => ({
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          message: r.message,
          kind: r.type === 'mock_sms' ? 'sms' : 'notify',
          at: new Date().toISOString(),
        }));
      if (newToasts.length) {
        setToasts((prev) => [...newToasts, ...prev].slice(0, 8));
      }
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, dismissToast, lastEvent }),
    [toasts, dismissToast, lastEvent]
  );

  return <AutomationContext.Provider value={value}>{children}</AutomationContext.Provider>;
}

export function useAutomationToasts() {
  const ctx = useContext(AutomationContext);
  if (!ctx) throw new Error('useAutomationToasts requires AutomationProvider');
  return ctx;
}

export function useAutomationToastsOptional() {
  return useContext(AutomationContext);
}
