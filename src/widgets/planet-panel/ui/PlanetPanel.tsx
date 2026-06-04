'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

import type { Planet } from '@entities/planet/model/types';

import { THEME } from '@shared/config/theme';

import AtmosphereTab from './AtmosphereTab';
import MissionsTab from './MissionsTab';
import MoonsTab from './MoonsTab';
import OverviewTab from './OverviewTab';

export interface PlanetPanelProps {
  planet: Planet | null;
  onClose: () => void;
}

type TabKey = 'OVERVIEW' | 'ATMOSPHERE' | 'MOONS' | 'MISSIONS';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = (): void => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return isMobile;
}

export default function PlanetPanel({ planet, onClose }: PlanetPanelProps) {
  const t = useTranslations('Common');
  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setActiveTab('OVERVIEW');
    setCollapsed(false);
  }, [planet?.name]);

  if (!planet) return null;

  const p = planet;

  const TABS: readonly { key: TabKey; label: string }[] = [
    { key: 'OVERVIEW', label: t('tabOverview') },
    { key: 'ATMOSPHERE', label: t('tabAtmosphere') },
    { key: 'MOONS', label: t('tabMoons') },
    { key: 'MISSIONS', label: t('tabMissions') },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? 0 : 20,
        left: isMobile ? 0 : 20,
        right: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : 400,
        maxWidth: isMobile ? '100%' : 'calc(100vw - 40px)',
        maxHeight: isMobile ? (collapsed ? 56 : '45vh') : '72vh',
        display: 'flex',
        flexDirection: 'column',
        background: THEME.panelBg,
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: isMobile ? '12px 12px 0 0' : 6,
        boxShadow: '0 0 40px rgba(68,170,255,0.12)',
        zIndex: 200,
        animation: 'slideInUp 0.35s ease both',
        overflow: 'hidden',
        transition: 'max-height 0.25s ease',
      }}
    >
      {isMobile ? (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            color: THEME.textPrimary,
            fontFamily: 'inherit',
            fontSize: 13,
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: collapsed ? 'none' : `1px solid ${THEME.panelBorder}`,
          }}
        >
          <span style={{ fontWeight: 600, letterSpacing: '0.05em' }}>{p.name.toUpperCase()}</span>
          <span style={{ opacity: 0.6, fontSize: 11 }}>{collapsed ? '▲ TAP' : '▼'}</span>
        </button>
      ) : null}
      {isMobile && collapsed ? null : (
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${THEME.panelBorder}`,
          padding: '0 16px',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                fontFamily: THEME.font,
                fontSize: 10,
                letterSpacing: '0.16em',
                color: isActive ? THEME.accent : THEME.textMuted,
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? `2px solid ${THEME.accent}`
                  : '2px solid transparent',
                padding: '12px 10px 10px',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s ease, border-color 0.15s ease',
                textShadow: isActive ? `0 0 8px rgba(68,170,255,0.4)` : 'none',
              }}
            >
              {label}
            </button>
          );
        })}

        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            fontFamily: THEME.font,
            fontSize: 14,
            color: THEME.textMuted,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 4px',
            lineHeight: 1,
            transition: 'filter 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.color = THEME.textPrimary;
          }}
          onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.color = THEME.textMuted;
          }}
        >
          ×
        </button>
      </div>
      )}

      {isMobile && collapsed ? null : (
      <div
        style={{
          overflowY: 'auto',
          padding: '16px 20px 20px',
          flex: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(68,170,255,0.2) transparent',
        }}
      >
        {activeTab === 'OVERVIEW' && <OverviewTab planet={p} />}
        {activeTab === 'ATMOSPHERE' && <AtmosphereTab planet={p} />}
        {activeTab === 'MOONS' && <MoonsTab planet={p} />}
        {activeTab === 'MISSIONS' && <MissionsTab planet={p} />}
      </div>
      )}
    </div>
  );
}
