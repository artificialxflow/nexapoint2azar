import type { AutomationAction, AutomationRule, NexaEvent } from '@/src/lib/automation/types';
import { appendLog, listRules, upsertRule } from '@/src/lib/automation/store';

export type ActionResult = {
  type: AutomationAction['type'];
  message: string;
};

function interpolate(template: string, event: NexaEvent): string {
  const p = event.payload ?? {};
  return template
    .replace(/\{\{title\}\}/g, event.title)
    .replace(/\{\{customer\}\}/g, String(p.customer ?? p.customerName ?? 'مشتری'))
    .replace(/\{\{item\}\}/g, String(p.item ?? p.productName ?? 'کالا'))
    .replace(/\{\{card\}\}/g, String(p.cardTitle ?? p.title ?? 'کارت'));
}

export function runRulesForEvent(event: NexaEvent): ActionResult[] {
  const results: ActionResult[] = [];
  const rules = listRules().filter((r) => r.enabled && r.triggerType === event.type);

  for (const rule of rules) {
    try {
      for (const action of rule.actions) {
        const message = interpolate(action.messageTemplate, event);
        results.push({ type: action.type, message });
        appendLog({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          eventId: event.id,
          status: 'success',
          at: new Date().toISOString(),
          detail: message,
        });
      }
      upsertRule({ ...rule, lastRunAt: new Date().toISOString() });
    } catch (e) {
      appendLog({
        id: `log-${Date.now()}-err`,
        ruleId: rule.id,
        ruleName: rule.name,
        eventId: event.id,
        status: 'error',
        at: new Date().toISOString(),
        detail: e instanceof Error ? e.message : 'خطای اجرا',
      });
    }
  }
  return results;
}
