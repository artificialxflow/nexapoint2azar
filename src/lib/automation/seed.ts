import type { AutomationRule } from '@/src/lib/automation/types';
import { listRules, saveRules } from '@/src/lib/automation/store';

export function seedAutomationRulesIfEmpty(): AutomationRule[] {
  const existing = listRules();
  if (existing.length > 0) return existing;
  const now = new Date().toISOString();
  const rules: AutomationRule[] = [
    {
      id: 'rule-invoice-notify',
      name: 'اطلاع‌رسانی خودکار فاکتور',
      enabled: true,
      triggerType: 'sales.invoice.created',
      actions: [{ type: 'mock_sms', messageTemplate: 'فاکتور جدید برای {{customer}} ثبت شد.' }],
      createdAt: now,
    },
    {
      id: 'rule-card-production',
      name: 'ایجاد دستور تولید (نمایشی)',
      enabled: true,
      triggerType: 'sales.invoice.approved',
      actions: [{ type: 'notify_in_app', messageTemplate: 'تسک تولید برای فاکتور تایید‌شده ایجاد شد.' }],
      createdAt: now,
    },
    {
      id: 'rule-lead-reminder',
      name: 'یادآوری پیگیری سرنخ',
      enabled: true,
      triggerType: 'crm.lead.inactive',
      actions: [{ type: 'notify_in_app', messageTemplate: 'سرنخ بدون فعالیت — پیگیری کنید.' }],
      createdAt: now,
    },
    {
      id: 'rule-stock',
      name: 'هشدار حداقل موجودی',
      enabled: false,
      triggerType: 'inventory.below_minimum',
      actions: [{ type: 'notify_in_app', messageTemplate: 'موجودی {{item}} به حداقل رسید.' }],
      createdAt: now,
    },
  ];
  saveRules(rules);
  return rules;
}
