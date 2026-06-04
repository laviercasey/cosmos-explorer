import { z } from 'zod';

import type { CatalogFrame, Frame, TickFrame } from './types';

const tupleVec3 = z.tuple([z.number(), z.number(), z.number()]);

const tickFrameSchema = z
  .object({
    v: z.literal(1),
    type: z.literal('tick'),
    seq: z.number(),
    ts: z.string(),
    epoch_ms: z.number(),
    satellites: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        ecef_km: tupleVec3,
        vel_kms: tupleVec3.optional(),
        alt_km: z.number().optional(),
      }),
    ),
  })
  .transform((raw): TickFrame => ({
    v: 1,
    type: 'tick',
    seq: raw.seq,
    ts: raw.ts,
    epoch_ms: raw.epoch_ms,
    satellites: raw.satellites.map((s) => {
      const sat: {
        id: number;
        name: string;
        ecefKm: readonly [number, number, number];
        velKms?: readonly [number, number, number];
        altKm?: number;
      } = {
        id: s.id,
        name: s.name,
        ecefKm: s.ecef_km,
      };
      if (s.vel_kms !== undefined) sat.velKms = s.vel_kms;
      if (s.alt_km !== undefined) sat.altKm = s.alt_km;
      return sat;
    }),
  }));

const catalogFrameSchema = z
  .object({
    v: z.literal(1),
    type: z.literal('catalog'),
    satellites: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        color_hint: z
          .string()
          .regex(/^#[0-9a-fA-F]{3,8}$/)
          .optional(),
        highlight: z.boolean().optional(),
      }),
    ),
  })
  .transform((raw): CatalogFrame => {
    return {
      v: 1,
      type: 'catalog',
      satellites: raw.satellites.map((s) => {
        const entry: {
          id: number;
          name: string;
          color_hint?: string;
          highlight?: boolean;
        } = { id: s.id, name: s.name };
        if (s.color_hint !== undefined) entry.color_hint = s.color_hint;
        if (s.highlight !== undefined) entry.highlight = s.highlight;
        return entry;
      }),
    };
  });

const byeFrameSchema = z.object({
  v: z.literal(1),
  type: z.literal('bye'),
  reason: z.string().optional(),
  retry_after_ms: z.number().optional(),
});

const pingFrameSchema = z.object({
  v: z.literal(1),
  type: z.literal('ping'),
  ts: z.string(),
});

const frameSchema = z.discriminatedUnion('type', [
  tickFrameSchema,
  catalogFrameSchema,
  byeFrameSchema,
  pingFrameSchema,
]);

export default function parseFrame(raw: string): Frame | null {
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = frameSchema.safeParse(candidate);
  if (!result.success) return null;
  return result.data;
}
