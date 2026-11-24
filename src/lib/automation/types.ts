export type NexaEventType =
  | 'sales.invoice.created'
  | 'sales.invoice.approved'
  | 'inventory.below_minimum'
  | 'crm.lead.inactive'
  | 'meizito.card.moved'
  | 'meizito.card.created'
  | 'meizito.message.sent'
  | 'aftersales.ticket.opened'
  | 'system.custom';

export type NexaEvent = {
  id: string;
  type: NexaEventType;
  businessId: string | null;
  at: string;
  title: string;
  payload?: Record<string, unknown>;
};

export type AutomationActionType = 'notify_in_app' | 'mock_sms' | 'log_only';

export type AutomationAction = {
  type: AutomationActionType;
  messageTemplate: string;
};

export type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: NexaEventType;
  actions: AutomationAction[];
  createdAt: string;
  lastRunAt?: string | null;
};

export type AutomationLogEntry = {
  id: string;
  ruleId: string;
  ruleName: string;
  eventId: string;
  status: 'success' | 'error';
  at: string;
  detail: string;
};

export type AutomationRuleDraft = {
  name: string;
  triggerType: NexaEventType;
  actionType: AutomationActionType;
  messageTemplate: string;
  reasonFa: string;
};

export const TRIGGER_LABELS: Record<NexaEventType, string> = {
  'sales.invoice.created': 'ثبت فاکتور جدید',
  'sales.invoice.approved': 'تایید مالی فاکتور',
  'inventory.below_minimum': 'موجودی کمتر از حداقل',
  'crm.lead.inactive': 'سرنخ بدون فعالیت',
  'meizito.card.moved': 'جابجایی کارت کانبان',
  'meizito.card.created': 'کارت جدید در بورد',
  'meizito.message.sent': 'پیام جدید در میزکار',
  'aftersales.ticket.opened': 'تیکت پس از فروش',
  'system.custom': 'رویداد سفارشی',
};

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  notify_in_app: 'اعلان درون‌برنامه',
  mock_sms: 'پیامک (نمایشی)',
  log_only: 'فقط ثبت در لاگ',
};
