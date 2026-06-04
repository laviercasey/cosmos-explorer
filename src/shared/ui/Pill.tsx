import { THEME } from '../config/theme';

export interface PillProps {
  label: string;
  color?: string;
  small?: boolean;
}

export default function Pill({ label, color, small }: PillProps) {
  const c = color ?? THEME.textMuted;
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: THEME.font,
        fontSize: small ? 10 : 11,
        letterSpacing: '0.12em',
        color: c,
        background: c + '22',
        border: `1px solid ${c}55`,
        borderRadius: 3,
        padding: small ? '2px 6px' : '3px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
