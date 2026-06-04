'use client';

import { useLocale } from 'next-intl';

import { THEME } from '@shared/config/theme';
import { Link, usePathname } from '@shared/i18n';

export interface LangSwitcherProps {
  label?: string;
}

const TITLES: Record<string, string> = {
  en: 'Switch to Russian',
  ru: 'Переключить на английский',
};

export default function LangSwitcher({ label }: LangSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === 'en' ? 'ru' : 'en';
  const title = label ?? TITLES[locale] ?? 'Switch language';

  return (
    <Link
      href={pathname}
      locale={otherLocale}
      title={title}
      style={{
        fontFamily: THEME.font,
        fontSize: 11,
        letterSpacing: '0.12em',
        color: THEME.textPrimary,
        background: 'rgba(0,4,16,0.82)',
        border: `1px solid rgba(68,170,255,0.25)`,
        borderRadius: 4,
        padding: '8px 14px',
        cursor: 'pointer',
        transition: 'filter 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        textDecoration: 'none',
      }}
    >
      <span style={{ opacity: locale === 'en' ? 1 : 0.4, transition: 'opacity 0.2s' }}>EN</span>
      <span style={{ color: THEME.textMuted }}>|</span>
      <span style={{ opacity: locale === 'ru' ? 1 : 0.4, transition: 'opacity 0.2s' }}>RU</span>
    </Link>
  );
}
