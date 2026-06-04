'use client';

import { useTranslations } from 'next-intl';

import { getAgencyStyle, getMissionIcon } from '@entities/mission';
import type { Planet } from '@entities/planet/model/types';

import { THEME } from '@shared/config/theme';

export interface TabProps {
  planet: Planet;
}

export default function MissionsTab({ planet }: TabProps) {
  const t = useTranslations('Common');
  const missions = [...planet.missions].sort((a, b) => b.year - a.year);

  if (missions.length === 0) {
    return (
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
        {t('noMissionData')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {missions.map((mission, i) => {
        const agencyStyle = getAgencyStyle(mission.agency);
        return (
          <div
            key={`${mission.name}-${String(i)}`}
            style={{
              background: 'rgba(68,170,255,0.04)',
              border: '1px solid rgba(68,170,255,0.12)',
              borderRadius: 5,
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: THEME.font,
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  color: agencyStyle.color,
                  background: agencyStyle.bg,
                  border: `1px solid ${agencyStyle.border}`,
                  borderRadius: 3,
                  padding: '2px 8px',
                  flexShrink: 0,
                }}
              >
                {mission.agency}
              </span>
              <span
                style={{
                  fontFamily: THEME.font,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: THEME.textPrimary,
                  flex: 1,
                }}
              >
                {mission.name}
              </span>
              <span
                style={{
                  fontFamily: THEME.font,
                  fontSize: 11,
                  color: THEME.accent,
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}
              >
                {mission.year}
              </span>
            </div>

            {mission.type && (
              <div
                style={{
                  fontFamily: THEME.font,
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: THEME.textMuted,
                  marginBottom: 6,
                }}
              >
                {getMissionIcon(mission.type)}
              </div>
            )}

            {mission.achievement && (
              <p
                style={{
                  fontFamily: THEME.font,
                  fontSize: 11,
                  lineHeight: 1.7,
                  color: THEME.textPrimary,
                  margin: 0,
                  opacity: 0.65,
                }}
              >
                {mission.achievement}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
