'use client';

import React from 'react';
import { Landmark } from 'lucide-react';
import { BANK_ACCESS_ADMIN_ENABLED } from '@/src/lib/product-roadmap';
import BankAccessTabLive from '@/src/views/settings/access/BankAccessTabLive';

export default function BankAccessTab() {
  if (!BANK_ACCESS_ADMIN_ENABLED) {
    return (
      <div className="nexa-card p-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 text-amber-700">
          <Landmark size={22} />
        </div>
        <h3 className="text-sm font-black text-gray-900">دسترسی بانک — بعد از راه‌اندازی کامل</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          تنظیم مجوز گردش حساب‌های بانکی به اتصال سرویس‌های بانکی و API خارجی وابسته است. تا زمان
          تکمیل زیرساخت ERP و یکپارچه‌سازی بانک، این بخش غیرفعال است و ذخیره‌سازی در پایگاه انجام
          نمی‌شود.
        </p>
      </div>
    );
  }

  return <BankAccessTabLive />;
}
