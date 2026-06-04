'use client';

import { useMemo, useState } from 'react';

import { THEME } from '@shared/config/theme';
import type { WsStatus } from '@shared/lib/websocket';

export interface ConnectionStatusBadgeProps {
  status: WsStatus;
  lastTickAgeMs: number | null;
}

const COLOR_OPEN = '#33dd99';
const COLOR_PENDING = '#ffaa55';
const COLOR_OFFLINE = '#778899';
const OFFLINE_THRESHOLD_MS = 30_000;

interface BadgeStyle {
  dot: string;
  label: string;
}

function styleFor(status: WsStatus, ageMs: number | null): BadgeStyle {
  if (status === 'open') {
    if (ageMs !== null && ageMs > OFFLINE_THRESHOLD_MS) {
      return { dot: COLOR_OFFLINE, label: 'stale' };
    }
    return { dot: COLOR_OPEN, label: 'live' };
  }
  if (status === 'connecting' || status === 'reconnecting') {
    if (ageMs !== null && ageMs > OFFLINE_THRESHOLD_MS) {
      return { dot: COLOR_OFFLINE, label: 'offline' };
    }
    return { dot: COLOR_PENDING, label: status === 'connecting' ? 'connecting' : 'reconnecting' };
  }
  return { dot: COLOR_OFFLINE, label: 'offline' };
}

export default function ConnectionStatusBadge({
  status,
  lastTickAgeMs,
}: ConnectionStatusBadgeProps) {
  const [hovered, setHovered] = useState(false);

  const { dot, label } = useMemo(() => styleFor(status, lastTickAgeMs), [status, lastTickAgeMs]);

  const ageLabel =
    lastTickAgeMs === null
      ? 'awaiting first frame'
      : `last frame ${(lastTickAgeMs / 1000).toFixed(0)}s ago`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: 18,
        left: 20,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: THEME.panelBg,
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: 2,
        fontFamily: THEME.font,
        fontSize: 10,
        letterSpacing: '0.18em',
        color: THEME.textPrimary,
        textTransform: 'uppercase',
        pointerEvents: 'auto',
        cursor: 'help',
        userSelect: 'none',
      }}
      title={`${label} — ${ageLabel}`}
      aria-label={`Live stream ${label}, ${ageLabel}`}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dot,
          boxShadow: `0 0 8px ${dot}`,
          transition: 'background 200ms ease-out, box-shadow 200ms ease-out',
        }}
      />
      <span>iss · {label}</span>
      {hovered && (
        <span
          style={{
            marginLeft: 6,
            color: THEME.textMuted,
            letterSpacing: '0.12em',
            textTransform: 'none',
          }}
        >
          {ageLabel}
        </span>
      )}
    </div>
  );
}
