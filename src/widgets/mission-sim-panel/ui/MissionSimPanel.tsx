'use client';

import { useLocale } from 'next-intl';
import type { MouseEvent as ReactMouseEvent } from 'react';

import type { Trajectory, TrajectoryPhase } from '@entities/mission/model/types';

import { THEME } from '@shared/config/theme';

export interface MissionSimPanelProps {
  trajectoryData: Trajectory | null;
  currentPhase: TrajectoryPhase | null;
  progress: number;
  speed: number;
  onClose: () => void;
  onSetSpeed: (s: number) => void;
}

export default function MissionSimPanel({
  trajectoryData,
  currentPhase,
  progress,
  speed,
  onClose,
  onSetSpeed,
}: MissionSimPanelProps) {
  const lang = useLocale();
  if (!trajectoryData) return null;

  const phases = trajectoryData.phases;
  const missionName = trajectoryData.missionName;
  const duration = lang === 'ru' ? trajectoryData.durationRu : trajectoryData.duration;
  const pct = Math.round(progress * 100);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 540,
        maxWidth: 'calc(100vw - 24px)',
        background: THEME.panelBg,
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: 8,
        padding: '16px 20px',
        zIndex: 300,
        boxShadow: '0 0 40px rgba(68,170,255,0.18), 0 4px 24px rgba(0,0,0,0.7)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: THEME.font,
              fontSize: 13,
              letterSpacing: '0.22em',
              color: THEME.accent,
              fontWeight: 700,
            }}
          >
            ◈ {missionName.toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: THEME.font,
              fontSize: 11,
              letterSpacing: '0.12em',
              color: THEME.textMuted,
            }}
          >
            {trajectoryData.agency} · {trajectoryData.year}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: `1px solid rgba(68,170,255,0.2)`,
            borderRadius: 3,
            color: THEME.textMuted,
            fontFamily: THEME.font,
            fontSize: 11,
            letterSpacing: '0.15em',
            padding: '3px 10px',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.color = THEME.accent;
            e.currentTarget.style.borderColor = 'rgba(68,170,255,0.5)';
          }}
          onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.color = THEME.textMuted;
            e.currentTarget.style.borderColor = 'rgba(68,170,255,0.2)';
          }}
        >
          ✕ {lang === 'ru' ? 'ВЫХОД' : 'EXIT SIM'}
        </button>
      </div>

      <div
        style={{
          height: 3,
          background: 'rgba(68,170,255,0.1)',
          borderRadius: 2,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${String(pct)}%`,
            background: THEME.accent,
            boxShadow: `0 0 8px ${THEME.accent}`,
            borderRadius: 2,
            transition: 'width 0.12s linear',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 3, marginBottom: 14, alignItems: 'flex-start' }}>
        {phases.map((ph) => {
          const isActive = currentPhase?.id === ph.id;
          const isPast = progress > ph.t[1];
          const label = ph.label;
          return (
            <div key={ph.id} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  marginBottom: 5,
                  background: isActive
                    ? THEME.accent
                    : isPast
                      ? 'rgba(68,170,255,0.5)'
                      : 'rgba(68,170,255,0.1)',
                  boxShadow: isActive ? `0 0 7px ${THEME.accent}88` : 'none',
                }}
              />
              <div
                style={{
                  fontFamily: THEME.font,
                  fontSize: 8,
                  letterSpacing: '0.06em',
                  lineHeight: 1.4,
                  color: isActive
                    ? THEME.accent
                    : isPast
                      ? THEME.textPrimary
                      : THEME.textMuted,
                }}
              >
                {label.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {currentPhase && (
        <div
          style={{
            borderTop: `1px solid rgba(68,170,255,0.1)`,
            paddingTop: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: THEME.font,
              fontSize: 11,
              letterSpacing: '0.18em',
              color: THEME.accent,
              marginBottom: 7,
            }}
          >
            {currentPhase.label.toUpperCase()}
          </div>
          <p
            style={{
              fontFamily: THEME.font,
              fontSize: 12,
              lineHeight: 1.75,
              color: THEME.textPrimary,
              margin: 0,
              opacity: 0.88,
            }}
          >
            {currentPhase.description}
          </p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          borderTop: '1px solid rgba(68,170,255,0.08)',
        }}
      >
        <span
          style={{
            fontFamily: THEME.font,
            fontSize: 11,
            color: THEME.textMuted,
            letterSpacing: '0.1em',
          }}
        >
          {lang === 'ru' ? 'Длительность' : 'Duration'}:{' '}
          <span style={{ color: THEME.textPrimary }}>{duration}</span>
          <span style={{ marginLeft: 14 }}>{pct}%</span>
        </span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <span
            style={{
              fontFamily: THEME.font,
              fontSize: 10,
              color: THEME.textMuted,
              letterSpacing: '0.1em',
              marginRight: 2,
            }}
          >
            {lang === 'ru' ? 'СКОРОСТЬ' : 'SPEED'}
          </span>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              style={{
                fontFamily: THEME.font,
                fontSize: 10,
                letterSpacing: '0.1em',
                color: speed === s ? THEME.accent : THEME.textMuted,
                background: speed === s ? 'rgba(68,170,255,0.12)' : 'transparent',
                border: `1px solid ${
                  speed === s ? 'rgba(68,170,255,0.45)' : 'rgba(68,170,255,0.15)'
                }`,
                borderRadius: 3,
                padding: '3px 9px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
