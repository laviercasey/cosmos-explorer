'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { THEME } from '@shared/config/theme';

export interface TimeControlsProps {
  timeScale: number;
  onTimeScaleChange: (scale: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

const PRESETS: readonly number[] = [0.1, 1, 10, 100];

function sliderToScale(v: number): number {
  return Math.pow(10, v * 3 - 1);
}

function scaleToSlider(s: number): number {
  return (Math.log10(s) + 1) / 3;
}

export default function TimeControls({
  timeScale,
  onTimeScaleChange,
  isPaused,
  onTogglePause,
}: TimeControlsProps) {
  const t = useTranslations('Common');
  const sliderValue = scaleToSlider(Math.max(0.1, Math.min(100, timeScale)));

  function handleSliderChange(e: ChangeEvent<HTMLInputElement>): void {
    const newScale = sliderToScale(parseFloat(e.target.value));
    onTimeScaleChange(Math.round(newScale * 10) / 10);
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: THEME.font,
          fontSize: 8,
          letterSpacing: '0.22em',
          color: THEME.textMuted,
        }}
      >
        {t('timeScale')}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: THEME.panelBg,
          border: `1px solid ${THEME.panelBorder}`,
          borderRadius: 6,
          padding: '10px 16px',
          boxShadow: '0 0 24px rgba(68,170,255,0.08)',
        }}
      >
        <button
          onClick={onTogglePause}
          title={isPaused ? t('resumeTitle') : t('pauseTitle')}
          style={{
            fontFamily: THEME.font,
            fontSize: 14,
            color: THEME.accent,
            background: 'rgba(68,170,255,0.08)',
            border: `1px solid rgba(68,170,255,0.3)`,
            borderRadius: 4,
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'filter 0.15s ease',
            flexShrink: 0,
            textShadow: `0 0 8px rgba(68,170,255,0.5)`,
          }}
        >
          {isPaused ? '▶' : '‖'}
        </button>

        <div
          style={{
            fontFamily: THEME.font,
            fontSize: 13,
            letterSpacing: '0.08em',
            color: THEME.accent,
            width: 52,
            textAlign: 'center',
            textShadow: `0 0 8px rgba(68,170,255,0.4)`,
            flexShrink: 0,
          }}
        >
          ×{timeScale < 10 ? timeScale.toFixed(1) : String(Math.round(timeScale))}
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={sliderValue}
          onChange={handleSliderChange}
          style={{
            width: 160,
            accentColor: THEME.accent,
            cursor: 'pointer',
            background: 'transparent',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          width: '100%',
          justifyContent: 'space-between',
          paddingLeft: 64,
          paddingRight: 16,
          boxSizing: 'border-box',
        }}
      >
        {PRESETS.map((preset) => {
          const isActive = Math.abs(timeScale - preset) < 0.05;
          return (
            <div
              key={preset}
              onClick={() => onTimeScaleChange(preset)}
              style={{
                fontFamily: THEME.font,
                fontSize: 8,
                letterSpacing: '0.1em',
                color: isActive ? THEME.accent : THEME.textMuted,
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 2,
                background: isActive ? 'rgba(68,170,255,0.1)' : 'transparent',
                textShadow: isActive ? `0 0 6px rgba(68,170,255,0.5)` : 'none',
                transition: 'color 0.15s ease, background 0.15s ease',
                userSelect: 'none',
              }}
            >
              ×{preset < 1 ? preset.toFixed(1) : String(preset)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
