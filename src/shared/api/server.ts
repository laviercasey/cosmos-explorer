import 'server-only';

import { Code, ConnectError, createClient } from '@connectrpc/connect';

import type { Mission, Trajectory } from '@entities/mission/model/types';
import type { Planet } from '@entities/planet/model/types';

import { CosmosService } from './gen/cosmos/v1/cosmos_pb';
import { flattenMission, flattenPlanet, flattenTrajectory } from './mappers';
import { createServerTransport } from './transport-server';

const DEFAULT_REVALIDATE_SECONDS = 3600;
const SLUG_REVALIDATE_SECONDS = 86400;
const LIST_PLANET_LIMIT = 100;
const LIST_MISSION_LIMIT = 200;

interface ServerFetchOptions {
  readonly lang: string;
  readonly revalidate?: number;
  readonly tags?: readonly string[];
  readonly signal?: AbortSignal;
}

interface SlugFetchOptions extends ServerFetchOptions {
  readonly slug: string;
}

function isNotFound(err: unknown): boolean {
  return err instanceof ConnectError && err.code === Code.NotFound;
}

function buildCallOptions(signal: AbortSignal | undefined): { signal?: AbortSignal } {
  return signal === undefined ? {} : { signal };
}

export async function fetchPlanetsServer({
  lang,
  revalidate = DEFAULT_REVALIDATE_SECONDS,
  tags = ['planets'],
  signal,
}: ServerFetchOptions): Promise<Planet[]> {
  const transport = createServerTransport({
    revalidate,
    tags: [...tags, `planets-${lang}`],
  });
  const client = createClient(CosmosService, transport);
  const res = await client.listPlanets(
    { limit: LIST_PLANET_LIMIT, lang },
    buildCallOptions(signal),
  );
  return res.planets.map(flattenPlanet);
}

export async function fetchPlanetServer({
  slug,
  lang,
  revalidate = SLUG_REVALIDATE_SECONDS,
  tags = ['planets'],
  signal,
}: SlugFetchOptions): Promise<Planet | null> {
  if (!slug || slug.trim() === '') return null;
  const transport = createServerTransport({
    revalidate,
    tags: [...tags, `planets-${lang}`, `planet-${slug}-${lang}`],
  });
  const client = createClient(CosmosService, transport);
  try {
    const res = await client.getPlanet({ slug, lang }, buildCallOptions(signal));
    if (!res.planet) return null;
    return flattenPlanet(res.planet);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function fetchMissionsServer({
  lang,
  revalidate = DEFAULT_REVALIDATE_SECONDS,
  tags = ['missions'],
  signal,
}: ServerFetchOptions): Promise<Mission[]> {
  const transport = createServerTransport({
    revalidate,
    tags: [...tags, `missions-${lang}`],
  });
  const client = createClient(CosmosService, transport);
  const res = await client.listMissions(
    { limit: LIST_MISSION_LIMIT, lang },
    buildCallOptions(signal),
  );
  return res.missions.map(flattenMission);
}

export async function fetchMissionServer({
  slug,
  lang,
  revalidate = SLUG_REVALIDATE_SECONDS,
  tags = ['missions'],
  signal,
}: SlugFetchOptions): Promise<Mission | null> {
  if (!slug || slug.trim() === '') return null;
  const transport = createServerTransport({
    revalidate,
    tags: [...tags, `missions-${lang}`, `mission-${slug}-${lang}`],
  });
  const client = createClient(CosmosService, transport);
  try {
    const res = await client.getMission({ slug, lang }, buildCallOptions(signal));
    if (!res.mission) return null;
    return flattenMission(res.mission);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function fetchTrajectoriesServer({
  lang,
  revalidate = DEFAULT_REVALIDATE_SECONDS,
  tags = ['trajectories'],
  signal,
}: ServerFetchOptions): Promise<Record<string, Trajectory>> {
  const transport = createServerTransport({
    revalidate,
    tags: [...tags, `trajectories-${lang}`],
  });
  const client = createClient(CosmosService, transport);
  const res = await client.listTrajectories({ lang }, buildCallOptions(signal));
  const out: Record<string, Trajectory> = {};
  for (const raw of res.trajectories) {
    const adapted = flattenTrajectory(raw);
    const key = adapted.missionSlug ?? raw.missionSlug;
    if (!key) continue;
    out[key] = adapted;
  }
  return out;
}
