import type { Planet } from '@entities/planet/model/types';
import type { Language } from '@shared/i18n/types';

export interface BuildSeoOptions {
  lang: Language;
  selectedPlanet: Planet | null;
  siteUrl: string;
}
