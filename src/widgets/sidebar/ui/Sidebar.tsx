'use client';

import type { Planet, PlanetIndex } from '@entities/planet/model/types';

import { THEME } from '@shared/config/theme';

export interface SidebarProps {
  planets: readonly Planet[];
  selectedIndex: PlanetIndex | null;
  onSelect: (index: PlanetIndex) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDotSize(visualRadius: number): number {
  const normalized = clamp((visualRadius - 0.2) / (3.0 - 0.2), 0, 1);
  return Math.round(6 + normalized * 8);
}

export default function Sidebar({ planets, selectedIndex, onSelect }: SidebarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 100,
        maxHeight: '80vh',
        overflowY: 'auto',
        padding: '6px 4px',
        scrollbarWidth: 'none',
      }}
    >
      {planets.map((planet, index) => {
        const isActive = selectedIndex === index;
        const dotSize = getDotSize(planet.visualRadius);
        const displayName = planet.name;

        return (
          <button
            key={planet.name}
            onClick={() => onSelect(index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 12px',
              background: isActive ? 'rgba(68,170,255,0.12)' : 'rgba(0,4,16,0.70)',
              border: isActive
                ? `1px solid rgba(68,170,255,0.55)`
                : '1px solid rgba(68,170,255,0.12)',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: THEME.font,
              fontSize: 10,
              letterSpacing: '0.18em',
              color: isActive ? THEME.accent : THEME.textPrimary,
              textAlign: 'left',
              whiteSpace: 'nowrap',
              boxShadow: isActive
                ? `0 0 14px rgba(68,170,255,0.22), inset 0 0 8px rgba(68,170,255,0.06)`
                : 'none',
              transition: 'background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease',
              textShadow: isActive ? `0 0 8px rgba(68,170,255,0.5)` : 'none',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                background: planet.colorHex,
                boxShadow: isActive
                  ? `0 0 ${String(dotSize)}px ${planet.colorHex}99`
                  : `0 0 ${String(Math.round(dotSize * 0.5))}px ${planet.colorHex}55`,
                flexShrink: 0,
              }}
            />
            {displayName.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
