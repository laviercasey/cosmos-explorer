import type { ReactNode } from 'react';

import { THEME } from '../config/theme';

export interface StatRowProps {
  label: string;
  value: ReactNode;
}

export default function StatRow({ label, value }: StatRowProps) {
  return (
    <div style={{ padding: '7px 10px', borderBottom: '1px solid rgba(68,170,255,0.07)' }}>
      <div
        style={{
          fontFamily: THEME.font,
          fontSize: 10,
          letterSpacing: '0.12em',
          color: THEME.textMuted,
          marginBottom: 3,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: THEME.font,
          fontSize: 13,
          color: THEME.textPrimary,
          letterSpacing: '0.04em',
        }}
      >
        {value}
      </div>
    </div>
  );
}
