export interface Satellite {
  id: number;
  name: string;
  colorHint: string;
  highlight: boolean;
  ecefKm: readonly [number, number, number] | null;
  altKm: number | null;
  velKms: readonly [number, number, number] | null;
  lastUpdateMs: number | null;
}

export type Vec3 = readonly [number, number, number];
