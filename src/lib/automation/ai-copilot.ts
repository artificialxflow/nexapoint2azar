import type { AutomationRuleDraft, NexaEvent } from '@/src/lib/automation/types';
import { isAiAssistEnabled, listRecentEvents } from '@/src/lib/automation/store';

/** پیشنهاد قانون — بدون API خارجی؛ سیستم بدون این هم کار می‌کند */
export function suggestAutomationRules(events?: NexaEvent[]): AutomationRuleDraft[] {
  if (!isAiAssistEnabled()) return [];
  const recent = events ?? listRecentEvents(30);
  const suggestions: AutomationRuleDraft[] = [];
  const counts = new Map<string, number>();
  for (const e of recent) {
    counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  }

  if ((counts.get('meizito.card.moved') ?? 0) >= 3) {
    suggestions.push({
      name: 'اعلان جابجایی پرتکرار کارت',
      triggerType: 'meizito.card.moved',
      actionType: 'notify_in_app',
      messageTemplate: 'کارت «{{card}}» جابجا شد — تیم را مطلع کنید.',
      reasonFa: 'در ۳۰ رویداد اخیر، جابجایی کارت بیش از حد تکرار شده است.',
    });
  }
  if ((counts.get('sales.invoice.created') ?? 0) >= 2) {
    suggestions.push({
      name: 'پیامک نمایشی پس از فاکتور',
      triggerType: 'sales.invoice.created',
      actionType: 'mock_sms',
      messageTemplate: 'فاکتور برای {{customer}} ثبت شد.',
      reasonFa: 'چند فاکتور پیاپی ثبت شده — اطلاع‌رسانی خودکار پیشنهاد می‌شود.',
    });
  }
  if (recent.some((e) => e.type === 'inventory.below_minimum')) {
    suggestions.push({
      name: 'سفارش خرید خودکار (نمایشی)',
      triggerType: 'inventory.below_minimum',
      actionType: 'notify_in_app',
      messageTemplate: 'موجودی {{item}} کم است — درخواست خرید بررسی شود.',
      reasonFa: 'رویداد حداقل موجودی در لاگ دیده شد.',
    });
  }
  if (suggestions.length === 0 && recent.length > 0) {
    suggestions.push({
      name: 'ثبت رویدادهای مهم در لاگ',
      triggerType: recent[0].type,
      actionType: 'log_only',
      messageTemplate: '{{title}}',
      reasonFa: 'پیشنهاد عمومی بر اساس آخرین فعالیت سیستم.',
    });
  }
  return suggestions.slice(0, 3);
}
