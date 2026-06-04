'use client';

import { useTranslations } from 'next-intl';

import type { Planet } from '@entities/planet/model/types';

import { THEME } from '@shared/config/theme';

export interface TabProps {
  planet: Planet;
}

export default function MoonsTab({ planet }: TabProps) {
  const t = useTranslations('Common');
  const moons = planet.moons;
  const total = planet.totalMoonCount || moons.length;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: THEME.font,
            fontSize: 10,
            letterSpacing: '0.2em',
            color: THEME.textMuted,
            marginBottom: 4,
          }}
        >
          {t('knownMoons')}
        </div>
        <div
          style={{
            fontFamily: THEME.font,
            fontSize: 28,
            fontWeight: 700,
            color: THEME.accent,
            textShadow: `0 0 10px rgba(68,170,255,0.4)`,
            letterSpacing: '0.05em',
          }}
        >
          {total}
        </div>
      </div>

      {moons.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {moons.map((moon) => (
            <div
              key={moon.name}
              style={{
                background: 'rgba(68,170,255,0.05)',
                border: '1px solid rgba(68,170,255,0.14)',
                borderRadius: 5,
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: THEME.font,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: THEME.accent,
                  }}
                >
                  {moon.name}
                </span>
                <span
                  style={{
                    fontFamily: THEME.font,
                    fontSize: 9,
                    color: THEME.textMuted,
                    letterSpacing: '0.08em',
                  }}
                >
                  {moon.discoveredBy} {moon.discoveredYear}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 4,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontFamily: THEME.font, fontSize: 10, color: THEME.textMuted }}>
                  {t('moonDistance')}
                  <div style={{ color: THEME.textPrimary, fontSize: 11, marginTop: 2 }}>
                    {moon.distanceKm ? moon.distanceKm.toLocaleString() + ' km' : '—'}
                  </div>
                </div>
                <div style={{ fontFamily: THEME.font, fontSize: 10, color: THEME.textMuted }}>
                  {t('moonPeriod')}
                  <div style={{ color: THEME.textPrimary, fontSize: 11, marginTop: 2 }}>
                    {moon.periodDays
                      ? moon.periodDays.toFixed(2) + ' ' + t('moonDays')
                      : '—'}
                  </div>
                </div>
              </div>
              {moon.description && (
                <p
                  style={{
                    fontFamily: THEME.font,
                    fontSize: 11,
                    lineHeight: 1.7,
                    color: THEME.textPrimary,
                    margin: 0,
                    opacity: 0.75,
                  }}
                >
                  {moon.description}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 0',
            fontFamily: THEME.font,
            fontSize: 12,
            letterSpacing: '0.12em',
            color: THEME.textMuted,
          }}
        >
          {t('noSatellites')}
        </div>
      )}
    </div>
  );
}
