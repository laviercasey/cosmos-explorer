import { Code, ConnectError, createClient } from '@connectrpc/connect';

import type { Mission, Trajectory } from '@entities/mission/model/types';
import type { Planet } from '@entities/planet/model/types';
import type { Language } from '@shared/i18n/types';

import { CosmosService } from './gen/cosmos/v1/cosmos_pb';
import { flattenMission, flattenPlanet, flattenTrajectory } from './mappers';
import { browserTransport } from './transport-client';

const LIST_PLANET_LIMIT = 100;
const LIST_MISSION_LIMIT = 200;
const DEFAULT_LANG: Language = 'en';

export class ApiError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;

  constructor(message: string, code?: string, httpStatus?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code ?? 'unknown';
    this.httpStatus = httpStatus ?? 0;
  }
}

export interface FetchOptions {
  signal?: AbortSignal;
  lang?: Language;
}

function buildCallOptions(signal: AbortSignal | undefined): { signal?: AbortSignal } {
  return signal === undefined ? {} : { signal };
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ConnectError) {
    return new ApiError(err.rawMessage, Code[err.code], 0);
  }
  if (err instanceof Error) {
    return new ApiError(err.message, 'network_error', 0);
  }
  return new ApiError('Unknown error', 'unknown', 0);
}

function client() {
  return createClient(CosmosService, browserTransport);
}

export async function fetchPlanets(opts: FetchOptions = {}): Promise<Planet[]> {
  const lang = opts.lang ?? DEFAULT_LANG;
  try {
    const res = await client().listPlanets(
      { limit: LIST_PLANET_LIMIT, lang },
      buildCallOptions(opts.signal),
    );
    return res.planets.map(flattenPlanet);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw toApiError(err);
  }
}

export async function fetchMissions(opts: FetchOptions = {}): Promise<Mission[]> {
  const lang = opts.lang ?? DEFAULT_LANG;
  try {
    const res = await client().listMissions(
      { limit: LIST_MISSION_LIMIT, lang },
      buildCallOptions(opts.signal),
    );
    return res.missions.map(flattenMission);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw toApiError(err);
  }
}

export async function fetchTrajectories(
  opts: FetchOptions = {},
): Promise<Record<string, Trajectory>> {
  const lang = opts.lang ?? DEFAULT_LANG;
  try {
    const res = await client().listTrajectories({ lang }, buildCallOptions(opts.signal));
    const out: Record<string, Trajectory> = {};
    for (const raw of res.trajectories) {
      const adapted = flattenTrajectory(raw);
      const key = adapted.missionSlug ?? raw.missionSlug;
      if (!key) continue;
      out[key] = adapted;
    }
    return out;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw toApiError(err);
  }
}

export default fetchPlanets;
