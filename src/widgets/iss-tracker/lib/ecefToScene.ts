import * as THREE from 'three';

const EARTH_RADIUS_KM = 6371;

export default function ecefKmToSceneVec3(
  ecef: readonly [number, number, number],
  earthRadiusUnits: number,
  altBoost = 6,
): THREE.Vector3 {
  if (earthRadiusUnits <= 0 || !Number.isFinite(earthRadiusUnits)) {
    return new THREE.Vector3();
  }
  const scale = earthRadiusUnits / EARTH_RADIUS_KM;

  const [ex, ey, ez] = ecef;
  const sx = ex * scale;
  const sy = ey * scale;
  const sz = ez * scale;

  const dirX = sx;
  const dirY = sz;
  const dirZ = -sy;

  const radial = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  if (radial === 0) return new THREE.Vector3(0, 0, 0);

  const altitude = Math.max(0, radial - earthRadiusUnits);
  const targetRadial = earthRadiusUnits + altitude * altBoost;
  const k = targetRadial / radial;

  return new THREE.Vector3(dirX * k, dirY * k, dirZ * k);
}

export const ECEF_EARTH_RADIUS_KM = EARTH_RADIUS_KM;
