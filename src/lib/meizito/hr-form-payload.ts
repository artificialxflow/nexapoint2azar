import { z } from 'zod';
import type { HrRequestSubtypeId } from '@/src/lib/meizito/hr-request-types';

export const HR_LEAVE_KINDS = [
  { id: 'annual', label: 'استحقاقی' },
  { id: 'sick', label: 'استعلاجی' },
  { id: 'unpaid', label: 'بدون حقوق' },
] as const;

export type HrLeaveKindId = (typeof HR_LEAVE_KINDS)[number]['id'];

export type HrLeaveFormPayload = {
  leaveKind: HrLeaveKindId;
  startDate: string;
  endDate: string;
};

export type HrAdvanceFormPayload = {
  amount: number;
  reason?: string;
};

export type HrLoanFormPayload = {
  amount: number;
  termMonths: number;
  reason?: string;
};

export type HrFormPayload = HrLeaveFormPayload | HrAdvanceFormPayload | HrLoanFormPayload;

const leaveSchema = z.object({
  leaveKind: z.enum(['annual', 'sick', 'unpaid']),
  startDate: z.string().min(1, 'تاریخ شروع الزامی است.'),
  endDate: z.string().min(1, 'تاریخ پایان الزامی است.'),
});

const advanceSchema = z.object({
  amount: z.number().positive('مبلغ مساعده باید بیشتر از صفر باشد.'),
  reason: z.string().optional(),
});

const loanSchema = z.object({
  amount: z.number().positive('مبلغ وام باید بیشتر از صفر باشد.'),
  termMonths: z.number().int().min(1).max(60, 'مدت وام حداکثر ۶۰ ماه است.'),
  reason: z.string().optional(),
});

export function defaultHrFormPayload(subtype: HrRequestSubtypeId): Record<string, unknown> {
  if (subtype === 'leave') {
    return { leaveKind: 'annual', startDate: '', endDate: '' };
  }
  if (subtype === 'advance') {
    return { amount: 0, reason: '' };
  }
  return { amount: 0, termMonths: 6, reason: '' };
}

export type HrFormValidation =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; messageFa: string };

export function validateHrFormPayload(
  subtype: string,
  raw: unknown
): HrFormValidation {
  const payload = raw && typeof raw === 'object' ? raw : {};
  if (subtype === 'leave') {
    const parsed = leaveSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, messageFa: parsed.error.issues[0]?.message ?? 'فرم مرخصی ناقص است.' };
    }
    if (parsed.data.endDate < parsed.data.startDate) {
      return { ok: false, messageFa: 'تاریخ پایان باید بعد از تاریخ شروع باشد.' };
    }
    return { ok: true, data: parsed.data };
  }
  if (subtype === 'advance') {
    const parsed = advanceSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, messageFa: parsed.error.issues[0]?.message ?? 'فرم مساعده ناقص است.' };
    }
    return { ok: true, data: parsed.data };
  }
  if (subtype === 'loan') {
    const parsed = loanSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, messageFa: parsed.error.issues[0]?.message ?? 'فرم وام ناقص است.' };
    }
    return { ok: true, data: parsed.data };
  }
  return { ok: false, messageFa: 'زیرنوع HR نامعتبر است.' };
}

export function summarizeHrFormPayload(
  subtype: string | undefined,
  raw: unknown
): string | null {
  if (!subtype || !raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (subtype === 'leave') {
    const kind = HR_LEAVE_KINDS.find((k) => k.id === p.leaveKind)?.label ?? String(p.leaveKind ?? '');
    return `${kind} · ${String(p.startDate ?? '')} تا ${String(p.endDate ?? '')}`;
  }
  if (subtype === 'advance') {
    return `مبلغ ${String(p.amount ?? '')} ریال`;
  }
  if (subtype === 'loan') {
    return `مبلغ ${String(p.amount ?? '')} · ${String(p.termMonths ?? '')} ماه`;
  }
  return null;
}
