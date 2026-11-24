'use client';

import React from 'react';

/** اسکلتون یکسان برای Suspense و bootstrap میز کار */
export default function MeizitoWorkspaceSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="در حال بارگذاری میز کار">
      {!compact && (
        <div className="hidden md:flex flex-nowrap gap-1 p-1.5 bg-gray-100 rounded-2xl">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-20 bg-gray-200/80 rounded-xl animate-pulse" />
          ))}
        </div>
      )}
      <div className="nexa-card p-6 md:p-8 min-h-[520px] space-y-4">
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-h-[280px] bg-gray-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
