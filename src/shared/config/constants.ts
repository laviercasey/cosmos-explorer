export interface SceneConstants {
  readonly AU: number;
  readonly SCALE_FACTOR: number;
  readonly PLANET_SCALE: number;
  readonly TIME_BASE: number;
  readonly MIN_TIME_SCALE: number;
  readonly MAX_TIME_SCALE: number;
  readonly DEFAULT_TIME_SCALE: number;
  readonly STAR_COUNT: number;
  readonly STAR_SHELL_INNER: number;
  readonly STAR_SHELL_OUTER: number;
  readonly ASTEROID_COUNT: number;
  readonly ASTEROID_BELT_INNER: number;
  readonly ASTEROID_BELT_OUTER: number;
  readonly CAMERA_DEFAULT_RADIUS: number;
  readonly CAMERA_DEFAULT_PHI: number;
  readonly CAMERA_DEFAULT_THETA: number;
  readonly CAMERA_LERP_SPEED: number;
  readonly CAMERA_NEAR: number;
  readonly CAMERA_FAR: number;
  readonly CAMERA_FOV: number;
  readonly BLOOM_THRESHOLD: number;
  readonly BLOOM_STRENGTH: number;
  readonly BLOOM_RADIUS: number;
  readonly BACKGROUND_COLOR: number;
  readonly SUN_LIGHT_INTENSITY: number;
  readonly SUN_LIGHT_DISTANCE: number;
  readonly AMBIENT_LIGHT_COLOR: number;
  readonly AMBIENT_LIGHT_INTENSITY: number;
}

const CONSTANTS: SceneConstants = {
  AU: 149_597_870.7,
  SCALE_FACTOR: 20,
  PLANET_SCALE: 1.0,
  TIME_BASE: 60,
  MIN_TIME_SCALE: 0,
  MAX_TIME_SCALE: 100,
  DEFAULT_TIME_SCALE: 1,
  STAR_COUNT: 15000,
  STAR_SHELL_INNER: 600,
  STAR_SHELL_OUTER: 1200,
  ASTEROID_COUNT: 2500,
  ASTEROID_BELT_INNER: 29,
  ASTEROID_BELT_OUTER: 33,
  CAMERA_DEFAULT_RADIUS: 100,
  CAMERA_DEFAULT_PHI: 1.1,
  CAMERA_DEFAULT_THETA: 0.4,
  CAMERA_LERP_SPEED: 0.07,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 3000,
  CAMERA_FOV: 55,
  BLOOM_THRESHOLD: 0.9,
  BLOOM_STRENGTH: 0.25,
  BLOOM_RADIUS: 0.5,
  BACKGROUND_COLOR: 0x00000a,
  SUN_LIGHT_INTENSITY: 3,
  SUN_LIGHT_DISTANCE: 800,
  AMBIENT_LIGHT_COLOR: 0x0a0a1a,
  AMBIENT_LIGHT_INTENSITY: 1,
};

export default CONSTANTS;
