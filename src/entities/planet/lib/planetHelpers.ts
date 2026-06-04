import { THEME } from '@shared/config/theme';

import type { PlanetType } from '../model/types';

export interface TypeBadge {
  label: string;
  color: string;
}

export type TypeBadgeT = (key: string) => string;

export function getTypeBadge(
  type: PlanetType | string | null | undefined,
  t: TypeBadgeT,
): TypeBadge {
  if (type === 'terrestrial') return { label: t('typeTerrestrial'), color: '#88ccff' };
  if (type === 'gas_giant') return { label: t('typeGasGiant'), color: '#ffaa44' };
  if (type === 'ice_giant') return { label: t('typeIceGiant'), color: '#44ddcc' };
  return {
    label: type ? String(type).toUpperCase() : 'UNKNOWN',
    color: THEME.textMuted,
  };
}
