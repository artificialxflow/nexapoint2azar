import type { NexaEvent, NexaEventType } from '@/src/lib/automation/types';
import { appendEvent } from '@/src/lib/automation/store';
import { runRulesForEvent, type ActionResult } from '@/src/lib/automation/rule-engine';

type Listener = (payload: { event: NexaEvent; results: ActionResult[] }) => void;

const listeners = new Set<Listener>();

export function subscribeNexaAutomation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitNexaEvent(input: {
  type: NexaEventType;
  businessId: string | null;
  title: string;
  payload?: Record<string, unknown>;
}): NexaEvent {
  if (typeof window === 'undefined') {
    return {
      id: 'ssr',
      type: input.type,
      businessId: input.businessId,
      at: new Date().toISOString(),
      title: input.title,
      payload: input.payload,
    };
  }
  const event: NexaEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    businessId: input.businessId,
    at: new Date().toISOString(),
    title: input.title,
    payload: input.payload,
  };
  appendEvent(event);
  const results = runRulesForEvent(event);
  listeners.forEach((l) => l({ event, results }));
  return event;
}
