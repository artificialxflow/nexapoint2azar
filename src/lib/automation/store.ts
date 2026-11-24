import type { AutomationLogEntry, AutomationRule, NexaEvent } from '@/src/lib/automation/types';

const RULES_KEY = 'nexa-automation-rules-v1';
const LOGS_KEY = 'nexa-automation-logs-v1';
const EVENTS_KEY = 'nexa-automation-events-v1';
const AI_KEY = 'nexa-automation-ai-assist-v1';

const MAX_EVENTS = 80;
const MAX_LOGS = 100;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function listRules(): AutomationRule[] {
  return readJson<AutomationRule[]>(RULES_KEY, []);
}

export function saveRules(rules: AutomationRule[]) {
  writeJson(RULES_KEY, rules);
}

export function upsertRule(rule: AutomationRule) {
  const list = listRules();
  const idx = list.findIndex((r) => r.id === rule.id);
  if (idx >= 0) list[idx] = rule;
  else list.unshift(rule);
  saveRules(list);
}

export function deleteRule(id: string) {
  saveRules(listRules().filter((r) => r.id !== id));
}

export function appendEvent(event: NexaEvent) {
  const list = readJson<NexaEvent[]>(EVENTS_KEY, []);
  list.unshift(event);
  writeJson(EVENTS_KEY, list.slice(0, MAX_EVENTS));
}

export function listRecentEvents(limit = 40): NexaEvent[] {
  return readJson<NexaEvent[]>(EVENTS_KEY, []).slice(0, limit);
}

export function appendLog(entry: AutomationLogEntry) {
  const list = readJson<AutomationLogEntry[]>(LOGS_KEY, []);
  list.unshift(entry);
  writeJson(LOGS_KEY, list.slice(0, MAX_LOGS));
}

export function listLogs(limit = 50): AutomationLogEntry[] {
  return readJson<AutomationLogEntry[]>(LOGS_KEY, []).slice(0, limit);
}

export function isAiAssistEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(AI_KEY) === '1';
}

export function setAiAssistEnabled(on: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AI_KEY, on ? '1' : '0');
}
