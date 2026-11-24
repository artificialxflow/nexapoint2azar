import React from 'react';
import Image from 'next/image';

/** Brand assets in `public/logo/` */
const BRAND = {
  icon: '/logo/nexa-logo03.png',
  horizontal: '/logo/nexa-logo02.png',
  vertical: '/logo/nexa-logo01.png',
} as const;

interface LogoProps {
  className?: string;
  showText?: boolean;
  /** @deprecated PNGs include brand colors; kept for call-site compatibility */
  light?: boolean;
  /** Full lockup: horizontal (default) or stacked vertical */
  layout?: 'horizontal' | 'vertical';
}

export default function Logo({
  className = '',
  showText = true,
  light: _light = false,
  layout = 'horizontal',
}: LogoProps) {
  if (!showText) {
    return (
      <Image
        src={BRAND.icon}
        alt="nexa"
        width={40}
        height={40}
        priority
        className={`h-10 w-10 object-contain ${className}`.trim()}
      />
    );
  }

  const src = layout === 'vertical' ? BRAND.vertical : BRAND.horizontal;
  const size =
    layout === 'vertical'
      ? { width: 120, height: 160, imgClass: 'h-24 w-auto max-w-[140px] object-contain' }
      : { width: 200, height: 56, imgClass: 'h-10 w-auto max-w-[200px] object-contain' };

  return (
    <Image
      src={src}
      alt="nexa — Next Point of Innovation"
      width={size.width}
      height={size.height}
      priority
      className={`${size.imgClass} ${className}`.trim()}
    />
  );
}
