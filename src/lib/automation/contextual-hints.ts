import type { ContextualHint } from '@/src/components/automation/AssistantSuggestionStrip';
import { isAiAssistEnabled } from '@/src/lib/automation/store';

export function hintsForLetters(openCount: number): ContextualHint[] {
  if (!isAiAssistEnabled()) return [];
  const hints: ContextualHint[] = [];
  if (openCount >= 3) {
    hints.push({
      id: 'letters-pending',
      title: 'نامه‌های باز زیاد است',
      detail: `${openCount} نامه باز دارید — قانون یادآوری پیگیری پیشنهاد می‌شود.`,
      ruleDraft: {
        name: 'یادآوری نامه باز',
        triggerType: 'system.custom',
        actionType: 'notify_in_app',
        messageTemplate: 'نامه‌های باز نیاز به پیگیری دارند.',
        reasonFa: '',
      },
    });
  }
  hints.push({
    id: 'letters-template',
    title: 'الگوی «پیگیری»',
    detail: 'برای نامه‌های پیگیری از الگوی آماده استفاده کنید.',
    actionLabel: 'باز کردن فرم',
  });
  return hints.slice(0, 2);
}

export function hintsForRequests(openCount: number, pendingMe: number): ContextualHint[] {
  if (!isAiAssistEnabled()) return [];
  const hints: ContextualHint[] = [];
  if (pendingMe > 0) {
    hints.push({
      id: 'req-pending-me',
      title: 'درخواست در انتظار شما',
      detail: `${pendingMe} مورد منتظر تأیید شماست.`,
      actionLabel: 'فیلتر منتظر من',
    });
  }
  if (openCount >= 5) {
    hints.push({
      id: 'req-sla',
      title: 'حجم درخواست‌ها بالاست',
      detail: 'اعلان خودکار برای درخواست‌های باز پیشنهاد می‌شود.',
      ruleDraft: {
        name: 'اعلان درخواست باز',
        triggerType: 'aftersales.ticket.opened',
        actionType: 'notify_in_app',
        messageTemplate: 'درخواست داخلی نیاز به بررسی دارد.',
        reasonFa: '',
      },
    });
  }
  return hints.slice(0, 2);
}

export function hintsForDashboard(): ContextualHint[] {
  if (!isAiAssistEnabled()) return [];
  return [
    {
      id: 'dash-automation',
      title: 'اتوماسیون فعال است',
      detail: 'قوانین و پیشنهادهای بیشتر را در منوی اتومیشن ببینید.',
      actionLabel: 'رفتن به اتومیشن',
      href: '/dashboard/automation',
    },
  ];
}

export function hintsForChats(): ContextualHint[] {
  if (!isAiAssistEnabled()) return [];
  return [
    {
      id: 'chat-task-rule',
      title: 'تبدیل گفتگو به وظیفه',
      detail: 'از دکمه «→ وظیفه» روی پیام استفاده کنید؛ یا قانون اعلان برای پیام جدید بسازید.',
      ruleDraft: {
        name: 'اعلان پیام میزکار',
        triggerType: 'meizito.message.sent',
        actionType: 'notify_in_app',
        messageTemplate: 'پیام جدید در میزکار.',
        reasonFa: '',
      },
    },
  ];
}

export function hintsForBusinessProfile(emptyFields: number): ContextualHint[] {
  if (!isAiAssistEnabled() || emptyFields < 3) return [];
  return [
    {
      id: 'biz-profile',
      title: 'پروفایل کسب‌وکار ناقص است',
      detail: `${emptyFields} فیلد خالی مانده — برای دمو می‌توانید از داده نمایشی پر کنید.`,
      actionLabel: 'مشاهده تنظیمات',
      href: '/dashboard/settings',
    },
  ];
}
