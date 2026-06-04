export interface Theme {
  bg: string;
  accent: string;
  textPrimary: string;
  textMuted: string;
  font: string;
  panelBg: string;
  panelBorder: string;
  warnAccent: string;
}

export const THEME: Theme = {
  bg: '#00000a',
  accent: '#44aaff',
  textPrimary: '#aabbdd',
  textMuted: '#334466',
  font: "'Courier New', monospace",
  panelBg: 'rgba(0,4,16,0.92)',
  panelBorder: 'rgba(68,170,255,0.3)',
  warnAccent: '#ff8844',
};

export default THEME;

export function getGasColor(gas: string): string {
  const map: Record<string, string> = {
    Oxygen: '#44aaff',
    O2: '#44aaff',
    Nitrogen: '#4466cc',
    N2: '#4466cc',
    'Carbon Dioxide': '#ff6633',
    CO2: '#ff6633',
    Hydrogen: '#9966ff',
    H2: '#9966ff',
    Helium: '#33cc66',
    He: '#33cc66',
    Methane: '#44ddcc',
    CH4: '#44ddcc',
    'Sulfur Dioxide': '#ffaa00',
    SO2: '#ffaa00',
    Argon: '#778899',
    Ar: '#778899',
    Sodium: '#ffdd44',
    Potassium: '#ffaa22',
  };
  return map[gas] ?? '#667788';
}
