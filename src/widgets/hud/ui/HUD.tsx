'use client';

import { useTranslations } from 'next-intl';

import { THEME } from '@shared/config/theme';

import LangSwitcher from '@widgets/lang-switcher';

export interface HUDProps {
  planetName: string | null;
  onBackToSystem: () => void;
  showIntro: boolean;
  onMissionsOpen: () => void;
  missionsOpen: boolean;
}

export default function HUD({
  planetName,
  onBackToSystem,
  showIntro,
  onMissionsOpen,
  missionsOpen,
}: HUDProps) {
  const t = useTranslations('Common');
  const controlsRaw = t.raw('controls') as unknown;
  const controls: readonly string[] = Array.isArray(controlsRaw)
    ? (controlsRaw as readonly string[])
    : [];

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes warpFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        button:hover { filter: brightness(1.3); }
      `}</style>

      {}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          padding: '20px 28px 40px',
          background: 'linear-gradient(to bottom, rgba(0,4,16,0.85) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontFamily: THEME.font,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.25em',
            color: THEME.accent,
            textShadow: `0 0 12px ${THEME.accent}, 0 0 28px rgba(68,170,255,0.4)`,
          }}
        >
          ✦ {t('appTitle')}
        </div>
        <div
          style={{
            fontFamily: THEME.font,
            fontSize: 9,
            letterSpacing: '0.2em',
            color: THEME.textMuted,
            marginTop: 4,
          }}
        >
          {t('appSubtitle')}
        </div>
      </div>

      {}
      <div
        style={{
          position: 'fixed',
          top: 68,
          left: 20,
          zIndex: 100,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <button
          onClick={onMissionsOpen}
          style={{
            fontFamily: THEME.font,
            fontSize: 11,
            letterSpacing: '0.15em',
            color: THEME.accent,
            background: 'rgba(0,4,16,0.82)',
            border: `1px solid rgba(68,170,255,0.4)`,
            borderRadius: 4,
            padding: '8px 16px',
            cursor: 'pointer',
            textShadow: `0 0 8px rgba(68,170,255,0.5)`,
            boxShadow: '0 0 16px rgba(68,170,255,0.1)',
            transition: 'filter 0.15s ease',
          }}
        >
          {t(missionsOpen ? 'missionsBtn_open' : 'missionsBtn_closed')}
        </button>

        <LangSwitcher />
      </div>

      {}
      {planetName && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100 }}>
          <button
            onClick={onBackToSystem}
            style={{
              fontFamily: THEME.font,
              fontSize: 11,
              letterSpacing: '0.15em',
              color: THEME.warnAccent,
              background: 'rgba(0,4,16,0.82)',
              border: `1px solid rgba(255,136,68,0.4)`,
              borderRadius: 4,
              padding: '8px 16px',
              cursor: 'pointer',
              textShadow: `0 0 8px rgba(255,136,68,0.5)`,
              boxShadow: '0 0 16px rgba(255,136,68,0.1)',
              transition: 'filter 0.15s ease',
            }}
          >
            {t('backBtn')}
          </button>
        </div>
      )}

      {}
      {showIntro && !planetName && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 100,
            animation: 'fadeInUp 0.8s ease 0.5s both',
          }}
        >
          <div
            style={{
              fontFamily: THEME.font,
              fontSize: 13,
              letterSpacing: '0.22em',
              color: THEME.accent,
              textShadow: `0 0 10px ${THEME.accent}, 0 0 24px rgba(68,170,255,0.35)`,
              marginBottom: 6,
            }}
          >
            {t('introTitle')}
          </div>
          <div
            style={{
              fontFamily: THEME.font,
              fontSize: 9,
              letterSpacing: '0.12em',
              color: THEME.textMuted,
            }}
          >
            {t('introHint')}
          </div>
        </div>
      )}

      {}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          textAlign: 'right',
          pointerEvents: 'none',
          zIndex: 100,
          lineHeight: 1.7,
        }}
      >
        {controls.map((label) => (
          <div
            key={label}
            style={{
              fontFamily: THEME.font,
              fontSize: 8,
              letterSpacing: '0.15em',
              color: THEME.textMuted,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </>
  );
}
