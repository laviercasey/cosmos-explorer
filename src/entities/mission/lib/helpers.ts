import { THEME } from '@shared/config/theme';

export const AGENCY_COLORS: Record<string, string> = {
  NASA: '#44aaff',
  Soviet: '#ff4444',
  Roscosmos: '#ff6666',
  ESA: '#44ffaa',
  CNSA: '#ffaa44',
  JAXA: '#aa44ff',
  ISRO: '#ff8844',
  SpaceX: '#aaaaaa',
};

export function getAgencyColor(agency: string | null | undefined): string {
  if (!agency) return '#556677';
  return AGENCY_COLORS[agency] ?? '#556677';
}

export const DESTINATION_COLORS: Record<string, string> = {
  Moon: '#ccccaa',
  Mars: '#ff7744',
  Venus: '#ffcc44',
  Jupiter: '#aaddff',
  Saturn: '#aaddff',
  Uranus: '#aaddff',
  Neptune: '#aaddff',
  Sun: '#ffee44',
  'Deep Space': '#8899bb',
  'Earth Orbit': '#44aaff',
  ISS: '#44aaff',
  Asteroid: '#99aaaa',
  Comet: '#99aaaa',
};

export function getDestinationColor(dest: string | null | undefined): string {
  if (!dest) return THEME.textMuted;
  for (const key of Object.keys(DESTINATION_COLORS)) {
    if (dest.includes(key)) {
      return DESTINATION_COLORS[key] ?? '#667788';
    }
  }
  return '#667788';
}

export function statusColor(status: string | null | undefined): string {
  if (!status) return '#556677';
  const s = status.toLowerCase();
  if (s === 'active' || s === 'ongoing') return '#44ff88';
  if (s === 'failed') return '#ff4444';
  return '#778899';
}

export interface AgencyStyle {
  bg: string;
  border: string;
  color: string;
}

export function getAgencyStyle(agency: string): AgencyStyle {
  const styles: Record<string, AgencyStyle> = {
    NASA: { bg: 'rgba(0,80,200,0.35)', border: 'rgba(68,130,255,0.6)', color: '#88bbff' },
    ESA: { bg: 'rgba(200,80,0,0.35)', border: 'rgba(255,140,68,0.6)', color: '#ffbb88' },
    JAXA: { bg: 'rgba(200,0,0,0.35)', border: 'rgba(255,80,80,0.6)', color: '#ff9999' },
    Soviet: { bg: 'rgba(200,0,0,0.35)', border: 'rgba(255,80,80,0.6)', color: '#ff9999' },
    International: {
      bg: 'rgba(100,0,180,0.35)',
      border: 'rgba(180,80,255,0.6)',
      color: '#cc88ff',
    },
  };
  return (
    styles[agency] ?? {
      bg: 'rgba(40,60,80,0.4)',
      border: 'rgba(68,170,255,0.3)',
      color: THEME.textPrimary,
    }
  );
}

export function getMissionIcon(type: string | null | undefined): string {
  if (!type) return '';
  const t = type.toLowerCase();
  if (t === 'flyby') return '🛸 FLYBY';
  if (t === 'orbiter') return '🛰️ ORBITER';
  if (t === 'lander' || t === 'rover') return '🌕 LANDER';
  if (t === 'impactor') return '💥 IMPACTOR';
  return type.toUpperCase();
}
