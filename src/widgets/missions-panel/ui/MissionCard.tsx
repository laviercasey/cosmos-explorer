'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { getAgencyColor, getDestinationColor, statusColor } from '@entities/mission';
import type { Mission } from '@entities/mission/model/types';

import { THEME } from '@shared/config/theme';
import { useData } from '@shared/data';
import { Pill } from '@shared/ui';

export interface MissionCardProps {
  mission: Mission;
  expanded: boolean;
  onToggle: () => void;
  onSimulate?: (missionName: string) => void;
}

export default function MissionCard({ mission, expanded, onToggle, onSimulate }: MissionCardProps) {
  const t = useTranslations('Common');
  const lang = useLocale();
  const { trajectories } = useData();
  const agencyColor = getAgencyColor(mission.agency);
  const destColor = getDestinationColor(mission.destination);
  const dotColor = statusColor(mission.status);
  const hasTrajectory = Boolean(mission.slug && trajectories[mission.slug]);

  return (
    <div
      style={{
        background: 'rgba(68,170,255,0.04)',
        border: `1px solid rgba(68,170,255,0.13)`,
        borderRadius: 5,
        padding: '12px 14px',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={(e: ReactMouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.borderColor = 'rgba(68,170,255,0.3)';
      }}
      onMouseLeave={(e: ReactMouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.borderColor = 'rgba(68,170,255,0.13)';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 7,
          flexWrap: 'wrap',
        }}
      >
        <Pill label={mission.agency} color={agencyColor} />
        <span
          style={{
            fontFamily: THEME.font,
            fontSize: 12,
            letterSpacing: '0.08em',
            color: THEME.textMuted,
          }}
        >
          {mission.year}
          {mission.endYear && mission.endYear !== mission.year ? `–${String(mission.endYear)}` : ''}
        </span>
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: `0 0 4px ${dotColor}`,
            flexShrink: 0,
          }}
          title={mission.status || 'completed'}
        />
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {mission.destination && <Pill label={mission.destination} color={destColor} small />}
          {mission.type && <Pill label={mission.type} color={THEME.textMuted} small />}
        </div>
      </div>

      <div
        style={{
          fontFamily: THEME.font,
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: THEME.accent,
          textShadow: `0 0 8px rgba(68,170,255,0.3)`,
          marginBottom: 7,
        }}
      >
        {mission.name}
      </div>

      {mission.description && (
        <p
          style={{
            fontFamily: THEME.font,
            fontSize: 13,
            lineHeight: 1.7,
            color: THEME.textPrimary,
            margin: '0 0 8px',
            opacity: 0.85,
            overflow: expanded ? 'visible' : 'hidden',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {mission.description}
        </p>
      )}

      {mission.keyFact && (
        <div
          style={{
            fontFamily: THEME.font,
            fontSize: 12,
            letterSpacing: '0.04em',
            color: THEME.warnAccent,
            marginBottom: 10,
            opacity: 0.9,
          }}
        >
          ★ {mission.keyFact}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10, borderTop: '1px solid rgba(68,170,255,0.1)', paddingTop: 10 }}>
          {mission.achievements.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontFamily: THEME.font,
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  color: THEME.textMuted,
                  marginBottom: 7,
                }}
              >
                {t('achievements')}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {mission.achievements.map((a, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 6,
                      fontFamily: THEME.font,
                      fontSize: 12,
                      lineHeight: 1.65,
                      color: THEME.textPrimary,
                      opacity: 0.85,
                    }}
                  >
                    <span
                      style={{ color: THEME.accent, flexShrink: 0, fontSize: 10, marginTop: 2 }}
                    >
                      ◆
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mission.crew && mission.crew.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: THEME.font,
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  color: THEME.textMuted,
                  marginRight: 7,
                }}
              >
                {t('crew')}
              </span>
              <span
                style={{
                  fontFamily: THEME.font,
                  fontSize: 12,
                  color: THEME.textPrimary,
                  opacity: 0.85,
                }}
              >
                {mission.crew.join(', ')}
              </span>
            </div>
          )}

          {hasTrajectory && onSimulate && (
            <button
              onClick={() => onSimulate(mission.name)}
              style={{
                marginTop: 12,
                fontFamily: THEME.font,
                fontSize: 11,
                letterSpacing: '0.18em',
                color: THEME.accent,
                background: 'rgba(68,170,255,0.08)',
                border: `1px solid rgba(68,170,255,0.35)`,
                borderRadius: 4,
                padding: '7px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = 'rgba(68,170,255,0.16)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(68,170,255,0.25)';
              }}
              onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = 'rgba(68,170,255,0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: 13 }}>▶</span>
              {lang === 'ru' ? 'СИМУЛЯЦИЯ МИССИИ' : 'SIMULATE MISSION'}
            </button>
          )}
        </div>
      )}

      <button
        onClick={onToggle}
        style={{
          fontFamily: THEME.font,
          fontSize: 11,
          letterSpacing: '0.15em',
          color: THEME.textMuted,
          background: 'transparent',
          border: `1px solid rgba(68,170,255,0.15)`,
          borderRadius: 3,
          padding: '4px 10px',
          cursor: 'pointer',
          marginTop: 6,
          transition: 'color 0.15s ease, border-color 0.15s ease',
          display: 'block',
        }}
        onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.color = THEME.accent;
          e.currentTarget.style.borderColor = 'rgba(68,170,255,0.4)';
        }}
        onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.color = THEME.textMuted;
          e.currentTarget.style.borderColor = 'rgba(68,170,255,0.15)';
        }}
      >
        {expanded ? t('collapseBtn') : t('detailsBtn')}
      </button>
    </div>
  );
}
