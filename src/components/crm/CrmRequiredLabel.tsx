'use client';

import React from 'react';

export function CrmRequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-bold text-gray-500 mr-1">
      <span className="text-rose-500" aria-hidden="true">*</span>
      {children}
    </label>
  );
}
