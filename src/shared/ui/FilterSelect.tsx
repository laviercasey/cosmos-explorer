'use client';

import type { ChangeEvent } from 'react';

import { THEME } from '../config/theme';

export interface FilterSelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
}

export default function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      style={{
        fontFamily: THEME.font,
        fontSize: 12,
        letterSpacing: '0.08em',
        color: value ? THEME.accent : THEME.textMuted,
        background: 'rgba(0,4,16,0.9)',
        border: `1px solid ${value ? 'rgba(68,170,255,0.4)' : 'rgba(68,170,255,0.15)'}`,
        borderRadius: 3,
        padding: '6px 10px',
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        outline: 'none',
        minWidth: 110,
      }}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt} style={{ background: '#00040f', color: THEME.textPrimary }}>
          {opt}
        </option>
      ))}
    </select>
  );
}
