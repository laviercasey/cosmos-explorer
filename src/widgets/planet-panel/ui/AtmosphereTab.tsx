'use client';

import { useTranslations } from 'next-intl';

import type { Planet } from '@entities/planet/model/types';

import { THEME, getGasColor } from '@shared/config/theme';

export interface TabProps {
  planet: Planet;
}

export default function AtmosphereTab({ planet }: TabProps) {
  const t = useTranslations('Common');
  const atm = planet.atmosphere;
  const composition = atm.composition;
  const pressure = atm.surfacePressureAtm;
  const pressureDisplay =
    !pressure || pressure === 0 ? t('traceNone') : pressure.toFixed(pressure < 0.01 ? 4 : 2);

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
          {t('surfacePressure')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontFamily: THEME.font,
              fontSize: 28,
              fontWeight: 700,
              color: THEME.accent,
              textShadow: `0 0 10px rgba(68,170,255,0.4)`,
              letterSpacing: '0.05em',
            }}
          >
            {pressureDisplay}
          </span>
          {pressure !== 0 && (
            <span
              style={{
                fontFamily: THEME.font,
                fontSize: 12,
                color: THEME.textMuted,
                letterSpacing: '0.15em',
              }}
            >
              ATM
            </span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            fontFamily: THEME.font,
            fontSize: 10,
            letterSpacing: '0.2em',
            color: THEME.textMuted,
          }}
        >
          {t('greenhouse')}
        </div>
        <div
          style={{
            fontFamily: THEME.font,
            fontSize: 11,
            letterSpacing: '0.12em',
            color: atm.hasGreenhouse ? '#ff8844' : '#44cc88',
            background: atm.hasGreenhouse ? 'rgba(255,136,68,0.15)' : 'rgba(68,204,136,0.15)',
            border: `1px solid ${
              atm.hasGreenhouse ? 'rgba(255,136,68,0.4)' : 'rgba(68,204,136,0.4)'
            }`,
            borderRadius: 3,
            padding: '2px 8px',
          }}
        >
          {atm.hasGreenhouse ? t('ghYes') : t('ghNo')}
        </div>
      </div>

      {composition.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontFamily: THEME.font,
              fontSize: 10,
              letterSpacing: '0.2em',
              color: THEME.textMuted,
              marginBottom: 12,
            }}
          >
            {t('composition')}
          </div>
          {composition.map((gas) => (
            <div
              key={gas.gas}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
            >
              <div
                style={{
                  width: 90,
                  fontSize: 11,
                  color: '#aabbdd',
                  fontFamily: THEME.font,
                  letterSpacing: '0.04em',
                }}
              >
                {gas.gas}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 9,
                  background: 'rgba(68,170,255,0.1)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: String(gas.percent) + '%',
                    height: '100%',
                    background: getGasColor(gas.gas),
                    borderRadius: 4,
                  }}
                />
              </div>
              <div
                style={{
                  width: 44,
                  textAlign: 'right',
                  fontSize: 11,
                  color: '#44aaff',
                  fontFamily: THEME.font,
                }}
              >
                {gas.percent}%
              </div>
            </div>
          ))}
        </div>
      )}

      {atm.notes && (
        <div>
          <div
            style={{
              fontFamily: THEME.font,
              fontSize: 10,
              letterSpacing: '0.2em',
              color: THEME.textMuted,
              marginBottom: 8,
            }}
          >
            {t('notes')}
          </div>
          <p
            style={{
              fontFamily: THEME.font,
              fontSize: 11,
              lineHeight: 1.75,
              color: THEME.textPrimary,
              margin: 0,
              opacity: 0.8,
            }}
          >
            {atm.notes}
          </p>
        </div>
      )}
    </div>
  );
}
