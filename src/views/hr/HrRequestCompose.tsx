'use client';

import React, { useEffect, useState } from 'react';
import { defaultHrFormPayload } from '@/src/lib/meizito/hr-form-payload';
import { HR_SUBTYPE_LABELS, type HrRequestSubtypeId } from '@/src/lib/meizito/hr-request-types';
import { useEnabledHrSubtypes } from '@/src/views/hr/useEnabledHrSubtypes';
import { validateHrFormPayload } from '@/src/lib/meizito/hr-form-payload';
import HrRequestFields, { type HrEligibilityPreview } from '@/src/views/meizito/components/HrRequestFields';
import { apiCreateInternalRequest } from '@/src/lib/meizito/requests/client';
import { MeizitoApiError } from '@/src/lib/meizito/client';

type Props = {
  businessId: string | null;
  authorId?: string;
  authorName: string;
  onCreated?: () => void;
};

export default function HrRequestCompose({ businessId, authorId, authorName, onCreated }: Props) {
  const subtypeOptions = useEnabledHrSubtypes(businessId);
  const [hrSubtype, setHrSubtype] = useState<HrRequestSubtypeId>('leave');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [formPayload, setFormPayload] = useState<Record<string, unknown>>(() =>
    defaultHrFormPayload('leave')
  );

  useEffect(() => {
    setFormPayload(defaultHrFormPayload(hrSubtype));
  }, [hrSubtype]);

  useEffect(() => {
    if (!subtypeOptions.some((o) => o.id === hrSubtype) && subtypeOptions[0]) {
      setHrSubtype(subtypeOptions[0].id);
    }
  }, [subtypeOptions, hrSubtype]);
  const [eligibility, setEligibility] = useState<HrEligibilityPreview | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submitDisabled =
    !businessId ||
    !authorId ||
    !subject.trim() ||
    (eligibility != null && !eligibility.ok);

  const submit = async () => {
    if (!businessId || !authorId || submitDisabled) return;
    setError('');
    const validated = validateHrFormPayload(hrSubtype, formPayload);
    if (!validated.ok) {
      setError(validated.messageFa);
      return;
    }
    setSaving(true);
    try {
      await apiCreateInternalRequest(
        businessId,
        {
          subject: subject.trim(),
          body: body.trim(),
          referredTo: [],
          referredToUserIds: [],
          ccUserIds: [],
          authorId,
          authorName,
          attachments: [],
          priority: 'medium',
          category: 'hr',
          box: 'outbox',
          requestKind: 'hr',
          hrSubtype,
          hrFormPayload: validated.data,
        },
        { submitForApproval: true }
      );
      setSubject('');
      setBody('');
      onCreated?.();
    } catch (e) {
      if (e instanceof MeizitoApiError && e.status === 403) {
        setError(e.message || 'شرایط درخواست برآورده نشده است.');
      } else {
        setError(e instanceof Error ? e.message : 'ثبت ناموفق بود.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nexa-card p-6 space-y-3 border-dashed border-2 border-nexa-border" data-testid="hr-request-compose">
      <h4 className="text-sm font-black text-gray-900">ثبت درخواست HR</h4>
      <select
        value={hrSubtype}
        onChange={(e) => setHrSubtype(e.target.value as HrRequestSubtypeId)}
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
      >
        {subtypeOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <HrRequestFields
        businessId={businessId}
        hrSubtype={hrSubtype}
        value={formPayload}
        onChange={setFormPayload}
        onEligibilityChange={setEligibility}
      />
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder={`موضوع — مثلاً ${HR_SUBTYPE_LABELS[hrSubtype] ?? 'درخواست'}`}
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm font-bold"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="توضیح تکمیلی"
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
      />
      {eligibility && !eligibility.ok && (
        <p className="text-xs font-bold text-amber-800 bg-amber-50 rounded-xl px-3 py-2">{eligibility.messageFa}</p>
      )}
      {eligibility?.ok && eligibility.tenureMonths != null && (
        <p className="text-[10px] text-gray-500 font-fa-num">سابقه شما: {eligibility.tenureMonths} ماه</p>
      )}
      {error && <p className="text-xs font-bold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
      <button
        type="button"
        disabled={submitDisabled || saving}
        onClick={() => void submit()}
        className="w-full nexa-btn-primary py-2 text-sm font-bold disabled:opacity-50"
      >
        {saving ? 'در حال ثبت…' : 'ارسال برای تأیید'}
      </button>
    </div>
  );
}
