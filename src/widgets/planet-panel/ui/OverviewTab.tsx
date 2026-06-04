'use client';

import { useTranslations } from 'next-intl';

import { getTypeBadge } from '@entities/planet';
import type { Planet } from '@entities/planet/model/types';

import { THEME } from '@shared/config/theme';
import { StatRow } from '@shared/ui';

export interface TabProps {
  planet: Planet;
}

export default function OverviewTab({ planet }: TabProps) {
  const t = useTranslations('Common');
  const badge = getTypeBadge(planet.type, t);
  const facts = planet.facts.slice(0, 4);

  return (
    <div>
      <div
        style={{
          fontFamily: THEME.font,
          fontSize: 20,
          letterSpacing: '0.2em',
          color: THEME.accent,
          textShadow: `0 0 12px ${THEME.accent}, 0 0 30px rgba(68,170,255,0.3)`,
          marginBottom: 8,
        }}
      >
        {planet.name.toUpperCase()}
      </div>

      <div
        style={{
          display: 'inline-block',
          fontFamily: THEME.font,
          fontSize: 9,
          letterSpacing: '0.18em',
          color: badge.color,
          background: `${badge.color}22`,
          border: `1px solid ${badge.color}66`,
          borderRadius: 3,
          padding: '3px 10px',
          marginBottom: 14,
        }}
      >
        {badge.label}
      </div>

      <p
        style={{
          fontFamily: THEME.font,
          fontSize: 12,
          lineHeight: 1.75,
          color: THEME.textPrimary,
          margin: '0 0 18px',
          opacity: 0.85,
        }}
      >
        {planet.description}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 16 }}>
        <StatRow
          label={t('statRadius')}
          value={`${planet.radiusKm.toLocaleString()} km`}
        />
        <StatRow
          label={t('statMass')}
          value={`${String(planet.massEarths)} ${t('unitEarthMass')}`}
        />
        <StatRow
          label={t('statGravity')}
          value={`${String(planet.surfaceGravityMs2)} m/s²`}
        />
        <StatRow
          label={t('statEscape')}
          value={`${String(planet.escapeVelocityKmS)} km/s`}
        />
        <StatRow
          label={t('statDay')}
          value={`${Math.abs(planet.rotationPeriodHours).toFixed(1)} h${
            planet.rotationPeriodHours < 0 ? ' ' + t('retrograde') : ''
          }`}
        />
        <StatRow
          label={t('statYear')}
          value={`${planet.periodDays.toFixed(1)} ${t('unitEarthDays')}`}
        />
        <StatRow label={t('statTemp')} value={`${String(planet.tempAvgC)}°C`} />
        <StatRow label={t('statAlbedo')} value={planet.albedo} />
      </div>

      {facts.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: THEME.font,
              fontSize: 10,
              letterSpacing: '0.2em',
              color: THEME.textMuted,
              marginBottom: 10,
            }}
          >
            {t('keyFacts')}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {facts.map((fact, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 8,
                  fontFamily: THEME.font,
                  fontSize: 11,
                  lineHeight: 1.65,
                  color: THEME.textPrimary,
                  opacity: 0.85,
                }}
              >
                <span
                  style={{ color: THEME.accent, flexShrink: 0, fontSize: 9, marginTop: 2 }}
                >
                  ◆
                </span>
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
