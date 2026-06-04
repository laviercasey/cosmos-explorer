'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';

import type { Mission } from '@entities/mission/model/types';

import { THEME } from '@shared/config/theme';
import { useData } from '@shared/data';
import { FilterSelect } from '@shared/ui';

import MissionCard from './MissionCard';

export interface MissionsPanelProps {
  open: boolean;
  onClose: () => void;
  onSimulate: (missionName: string) => void;
}

export default function MissionsPanel({ open, onClose, onSimulate }: MissionsPanelProps) {
  const t = useTranslations('Common');
  const { missions, agencies, destinations, types, decades } = useData();
  const [filterDecade, setFilterDecade] = useState<string>('');
  const [filterAgency, setFilterAgency] = useState<string>('');
  const [filterDestination, setFilterDestination] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedId(null);
  }, [filterDecade, filterAgency, filterDestination, filterType, search]);

  const filtered = useMemo<readonly Mission[]>(() => {
    let list: readonly Mission[] = missions;
    if (filterDecade) {
      list = list.filter((m) => {
        const dec = m.year ? `${String(Math.floor(m.year / 10) * 10)}s` : '';
        return dec === filterDecade;
      });
    }
    if (filterAgency) list = list.filter((m) => m.agency === filterAgency);
    if (filterDestination) list = list.filter((m) => m.destination === filterDestination);
    if (filterType) list = list.filter((m) => m.type === filterType);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
  }, [missions, filterDecade, filterAgency, filterDestination, filterType, search]);

  const hasFilters =
    filterDecade !== '' ||
    filterAgency !== '' ||
    filterDestination !== '' ||
    filterType !== '' ||
    search.trim() !== '';

  function resetFilters(): void {
    setFilterDecade('');
    setFilterAgency('');
    setFilterDestination('');
    setFilterType('');
    setSearch('');
  }

  function toggleCard(id: string): void {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,8,0.45)' }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 540,
          maxWidth: '100vw',
          height: '100vh',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          background: THEME.panelBg,
          borderRight: `1px solid ${THEME.panelBorder}`,
          boxShadow: '4px 0 40px rgba(0,0,0,0.6), 0 0 60px rgba(68,170,255,0.06)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: open ? 'all' : 'none',
        }}
      >
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: `1px solid ${THEME.panelBorder}`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: THEME.font,
                fontSize: 19,
                letterSpacing: '0.2em',
                color: THEME.accent,
                textShadow: `0 0 14px rgba(68,170,255,0.5)`,
                marginBottom: 4,
              }}
            >
              {t('misTitle')}
            </div>
            <div
              style={{
                fontFamily: THEME.font,
                fontSize: 11,
                letterSpacing: '0.3em',
                color: THEME.textMuted,
              }}
            >
              {t('misSubtitle')}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: THEME.font,
              fontSize: 18,
              lineHeight: 1,
              color: THEME.textMuted,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0 2px',
              marginTop: 2,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = THEME.textPrimary;
            }}
            onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = THEME.textMuted;
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: '12px 16px 10px',
            borderBottom: `1px solid ${THEME.panelBorder}`,
            flexShrink: 0,
            background: THEME.panelBg,
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <FilterSelect
              label={t('filterDecade')}
              value={filterDecade}
              options={decades}
              onChange={setFilterDecade}
            />
            <FilterSelect
              label={t('filterAgency')}
              value={filterAgency}
              options={agencies}
              onChange={setFilterAgency}
            />
            <FilterSelect
              label={t('filterDest')}
              value={filterDestination}
              options={destinations}
              onChange={setFilterDestination}
            />
            <FilterSelect
              label={t('filterType')}
              value={filterType}
              options={types}
              onChange={setFilterType}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              placeholder={t('searchPh')}
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              style={{
                flex: 1,
                fontFamily: THEME.font,
                fontSize: 12,
                letterSpacing: '0.08em',
                color: search ? THEME.textPrimary : THEME.textMuted,
                background: 'rgba(0,4,16,0.9)',
                border: `1px solid ${
                  search ? 'rgba(68,170,255,0.4)' : 'rgba(68,170,255,0.15)'
                }`,
                borderRadius: 3,
                padding: '7px 10px',
                outline: 'none',
              }}
            />
            {hasFilters && (
              <button
                onClick={resetFilters}
                style={{
                  fontFamily: THEME.font,
                  fontSize: 11,
                  letterSpacing: '0.15em',
                  color: THEME.warnAccent,
                  background: 'rgba(255,136,68,0.08)',
                  border: '1px solid rgba(255,136,68,0.3)',
                  borderRadius: 3,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.background = 'rgba(255,136,68,0.18)';
                }}
                onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.background = 'rgba(255,136,68,0.08)';
                }}
              >
                {t('resetBtn')}
              </button>
            )}
          </div>

          <div
            style={{
              fontFamily: THEME.font,
              fontSize: 11,
              letterSpacing: '0.12em',
              color: THEME.textMuted,
              marginTop: 8,
            }}
          >
            {missions.length === 0
              ? t('misLoading')
              : t('showing', { n: filtered.length, total: missions.length })}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px 20px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(68,170,255,0.2) transparent',
          }}
        >
          {missions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                fontFamily: THEME.font,
                fontSize: 13,
                letterSpacing: '0.15em',
                color: THEME.textMuted,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 14, opacity: 0.4 }}>✦</div>
              {t('misLoading')}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                fontFamily: THEME.font,
                fontSize: 13,
                letterSpacing: '0.15em',
                color: THEME.textMuted,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.35 }}>◈</div>
              {t('misNoMatch')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((mission, idx) => {
                const id = mission.id || `${mission.name}-${String(mission.year)}-${String(idx)}`;
                return (
                  <MissionCard
                    key={id}
                    mission={mission}
                    expanded={expandedId === id}
                    onToggle={() => toggleCard(id)}
                    onSimulate={onSimulate}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
