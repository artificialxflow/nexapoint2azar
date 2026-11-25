'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { HrRequestRow } from './useHrLiveData';
import HrRequestCompose from './HrRequestCompose';
type Filter = 'all' | 'mine' | 'pending_me';

type Props = {
  businessId: string | null;
  requests: HrRequestRow[];
  currentUserId?: string;
  currentUserName?: string;
  live: boolean;
  onReload?: () => void;
};

export default function HrRequestsPanel({
  businessId,
  requests,
  currentUserId,
  currentUserName = 'کاربر',
  live,
  onReload,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    let list = requests;
    if (filter === 'mine' && currentUserId) {
      list = list.filter((r) => r.raw?.authorId === currentUserId);
    }
    if (filter === 'pending_me' && currentUserId) {
      list = list.filter(
        (r) =>
          r.raw?.approvalState === 'pending' && r.raw?.currentAssigneeId === currentUserId
      );
    }
    return list;
  }, [requests, filter, currentUserId]);

  return (
    <div className="space-y-4" data-testid="hr-requests-panel">
      <p className="text-[10px] text-gray-500 leading-relaxed">
        هنگام ثبت درخواست جدید، شرایط احراز (سابقه، نقش و قوانین سازمان) بررسی می‌شود و
        پیش‌نمایش نتیجه زیر فرم «ثبت درخواست» نمایش داده می‌شود.
      </p>
      <div className="flex flex-wrap gap-1">
        {(
          [
            ['all', 'همه HR'],
            ['mine', 'درخواست‌های من'],
            ['pending_me', 'منتظر تأیید من'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border ${
              filter === id ? 'bg-nexa-accent text-white border-nexa-accent' : 'bg-white border-nexa-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 col-span-2">
            {live ? 'درخواستی در این فیلتر نیست.' : 'درخواست HR ثبت‌شده‌ای نیست.'}
          </p>
        )}
        {filtered.map((req) => (
          <RequestCard key={req.id} req={req} />
        ))}
        {live && (
          <HrRequestCompose
            businessId={businessId}
            authorId={currentUserId}
            authorName={currentUserName}
            onCreated={onReload}
          />
        )}
      </div>
    </div>
  );
}

function RequestCard({ req }: { req: HrRequestRow }) {
  return (
    <div className="nexa-card p-6 hover:shadow-lg transition-all border-r-4 border-r-nexa-accent">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-sm font-black text-gray-900">{req.title}</h4>
          <p className="text-[10px] text-gray-500 mt-1">{req.type}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">{req.status}</span>
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-nexa-border">
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-fa-num">
          <Clock size={12} />
          {req.date}
        </div>
        <Link href="/dashboard/work-requests" className="text-[10px] font-bold text-nexa-accent hover:underline">
          صندوق درخواست اداری (میزیتو)
        </Link>
      </div>
    </div>
  );
}
