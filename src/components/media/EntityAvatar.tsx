'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

type Props = {
  imageUrl?: string | null;
  label: string;
  className?: string;
  rounded?: 'full' | 'lg' | 'xl';
  fallbackIcon?: LucideIcon;
};

const radius: Record<NonNullable<Props['rounded']>, string> = {
  full: 'rounded-full',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

export default function EntityAvatar({
  imageUrl,
  label,
  className = 'w-10 h-10',
  rounded = 'xl',
  fallbackIcon: FallbackIcon,
}: Props) {
  const initial = label.trim().slice(0, 1) || '?';

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- session-scoped attachment URLs
      <img
        src={imageUrl}
        alt=""
        className={`${className} ${radius[rounded]} object-cover shrink-0 bg-gray-100 border border-nexa-border/40`}
      />
    );
  }

  if (FallbackIcon) {
    return (
      <span
        className={`${className} ${radius[rounded]} bg-gray-100 flex items-center justify-center text-gray-400 shrink-0`}
        aria-hidden
      >
        <FallbackIcon className="w-[45%] h-[45%]" />
      </span>
    );
  }

  return (
    <span
      className={`${className} ${radius[rounded]} bg-nexa-accent/15 text-nexa-accent text-[10px] font-black flex items-center justify-center shrink-0`}
      aria-hidden
    >
      {initial}
    </span>
  );
}