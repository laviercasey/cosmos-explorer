import { describe, expect, it } from 'vitest';

import parseFrame from '../parseFrame';

describe('parseFrame', () => {
  it('returns null for non-JSON input', () => {
    expect(parseFrame('not json')).toBeNull();
    expect(parseFrame('')).toBeNull();
    expect(parseFrame('{')).toBeNull();
  });

  it('returns null for missing required keys', () => {
    expect(parseFrame(JSON.stringify({ v: 1 }))).toBeNull();
    expect(parseFrame(JSON.stringify({ type: 'tick' }))).toBeNull();
    expect(parseFrame(JSON.stringify({ v: 1, type: 'tick' }))).toBeNull();
  });

  it('returns null for unknown frame type', () => {
    expect(
      parseFrame(JSON.stringify({ v: 1, type: 'mystery', payload: 'whatever' })),
    ).toBeNull();
  });

  it('returns null for wrong version', () => {
    expect(
      parseFrame(
        JSON.stringify({
          v: 2,
          type: 'tick',
          seq: 1,
          ts: 't',
          epoch_ms: 0,
          satellites: [],
        }),
      ),
    ).toBeNull();
  });

  it('parses a valid tick frame and converts to camelCase', () => {
    const raw = JSON.stringify({
      v: 1,
      type: 'tick',
      seq: 42,
      ts: '2026-05-08T12:00:00.000Z',
      epoch_ms: 1746710400000,
      satellites: [
        {
          id: 25544,
          name: 'ISS (ZARYA)',
          ecef_km: [4803.05, 3117.31, 3645.52],
          vel_kms: [-5.42, 3.21, 4.38],
          alt_km: 416.04,
        },
      ],
    });
    const frame = parseFrame(raw);
    expect(frame).not.toBeNull();
    if (frame?.type !== 'tick') throw new Error('expected tick');
    expect(frame.v).toBe(1);
    expect(frame.seq).toBe(42);
    expect(frame.satellites).toHaveLength(1);
    const sat = frame.satellites[0]!;
    expect(sat.id).toBe(25544);
    expect(sat.name).toBe('ISS (ZARYA)');
    expect(sat.ecefKm).toEqual([4803.05, 3117.31, 3645.52]);
    expect(sat.velKms).toEqual([-5.42, 3.21, 4.38]);
    expect(sat.altKm).toBeCloseTo(416.04);
  });

  it('tolerates a tick with optional fields missing', () => {
    const raw = JSON.stringify({
      v: 1,
      type: 'tick',
      seq: 1,
      ts: 't',
      epoch_ms: 0,
      satellites: [{ id: 1, name: 'Sat', ecef_km: [1, 2, 3] }],
    });
    const frame = parseFrame(raw);
    expect(frame).not.toBeNull();
    if (frame?.type !== 'tick') throw new Error('expected tick');
    const sat = frame.satellites[0]!;
    expect(sat.velKms).toBeUndefined();
    expect(sat.altKm).toBeUndefined();
  });

  it('parses a catalog frame', () => {
    const raw = JSON.stringify({
      v: 1,
      type: 'catalog',
      satellites: [
        { id: 25544, name: 'ISS', color_hint: '#44aaff', highlight: true },
        { id: 20580, name: 'Hubble' },
      ],
    });
    const frame = parseFrame(raw);
    expect(frame).not.toBeNull();
    if (frame?.type !== 'catalog') throw new Error('expected catalog');
    expect(frame.satellites).toHaveLength(2);
    expect(frame.satellites[0]).toMatchObject({
      id: 25544,
      name: 'ISS',
      color_hint: '#44aaff',
      highlight: true,
    });
    expect(frame.satellites[1]).toMatchObject({ id: 20580, name: 'Hubble' });
    expect(frame.satellites[1]?.color_hint).toBeUndefined();
  });

  it('parses bye + ping frames', () => {
    const bye = parseFrame(
      JSON.stringify({ v: 1, type: 'bye', reason: 'server_shutdown', retry_after_ms: 5000 }),
    );
    expect(bye?.type).toBe('bye');

    const ping = parseFrame(JSON.stringify({ v: 1, type: 'ping', ts: '2026-05-08T12:00:00Z' }));
    expect(ping?.type).toBe('ping');
  });

  it('rejects malformed ECEF tuple', () => {
    const raw = JSON.stringify({
      v: 1,
      type: 'tick',
      seq: 1,
      ts: 't',
      epoch_ms: 0,
      satellites: [{ id: 1, name: 'Sat', ecef_km: [1, 2] }],
    });
    expect(parseFrame(raw)).toBeNull();
  });

  it('rejects when satellites is not an array', () => {
    const raw = JSON.stringify({
      v: 1,
      type: 'tick',
      seq: 1,
      ts: 't',
      epoch_ms: 0,
      satellites: 'not-an-array',
    });
    expect(parseFrame(raw)).toBeNull();
  });
});
