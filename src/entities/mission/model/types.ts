export type MissionAgency =
  | 'NASA'
  | 'Soviet'
  | 'Roscosmos'
  | 'ESA'
  | 'CNSA'
  | 'JAXA'
  | 'ISRO'
  | 'SpaceX'
  | 'ESA/JAXA'
  | 'International';

export type MissionStatus = 'active' | 'completed' | 'failed' | 'ongoing';

export type Destination =
  | 'Earth Orbit'
  | 'Moon'
  | 'Mars'
  | 'Venus'
  | 'Mercury'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Sun'
  | 'Asteroid'
  | 'Comet'
  | 'Deep Space'
  | 'ISS';

export type MissionCategory =
  | 'flyby'
  | 'orbiter'
  | 'lander'
  | 'rover'
  | 'impactor'
  | 'robotic'
  | 'sample-return'
  | 'crewed'
  | 'space-station'
  | 'telescope';

export type DecadeLabel = `${number}s`;

export interface Mission {
  id: string;
  slug?: string;
  name: string;
  agency: MissionAgency | string;
  country: string;
  year: number;
  endYear: number | null;
  destination: Destination | string;
  type: MissionCategory | string;
  status: MissionStatus | string;
  description: string;
  keyFact: string | null;
  achievements: readonly string[];
  crew?: readonly string[] | null;
  planetSlugs?: readonly string[];
}

export type TrajectoryWaypoint = readonly [x: number, y: number, z: number];

export interface TrajectoryPhase {
  id: string;
  label: string;
  t: readonly [start: number, end: number];
  description: string;
}

export interface Trajectory {
  missionSlug?: string;
  missionName: string;
  agency: string;
  year: number;
  duration: string;
  durationRu: string;
  crew: readonly string[];
  moonPos: readonly [number, number, number];
  moonOrbitArc: number;
  waypoints: readonly TrajectoryWaypoint[];
  simDuration: number;
  phases: readonly TrajectoryPhase[];
}
