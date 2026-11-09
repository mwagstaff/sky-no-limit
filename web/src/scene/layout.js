// Where everything sits in the one universe. Positions are derived from the
// opening viewpoint so the first frame's composition is designed, not found:
// the camera hangs off Earth, which sits low and to the right like a jewel,
// while the gold star the journey heads for burns in open sky above it, with
// the app worlds orbiting that star beyond.

import { MathUtils, Vector3 } from 'three';

export const UP = new Vector3(0, 1, 0);

/** Unit vector for an azimuth (degrees from -Z towards +X) and elevation. */
export function direction(azimuthDeg, elevationDeg, out = new Vector3()) {
  const az = MathUtils.degToRad(azimuthDeg);
  const el = MathUtils.degToRad(elevationDeg);
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

export const OPENING_EYE = new Vector3(0, 0, 0);

/* ---------- Earth ---------- */

const earthCentre = direction(11.5, -40.75).multiplyScalar(1716);
const earthApproach = OPENING_EYE.clone().sub(earthCentre).normalize();
const earthRight = new Vector3().crossVectors(earthApproach, UP).multiplyScalar(-1).normalize();

export const EARTH = {
  centre: earthCentre,
  radius: 400,
  /** Unit vector from Earth towards the opening eye. */
  approach: earthApproach,
  // Which way north points across the disc in the opening: up, with a touch of
  // roll. The face shown and the sunlight are set at run time from the clock
  // and the visitor's region (see solar.js and env/earth.js).
  north: UP.clone()
    .projectOnPlane(earthApproach)
    .addScaledVector(earthRight, -0.12)
    .projectOnPlane(earthApproach)
    .normalize(),
};

/* ---------- the star and its system ---------- */

export const STAR = {
  // in open sky up and to the right of Earth in the opening frame
  position: direction(13, -21.18).multiplyScalar(3200),
  radius: 34,
};

const towardEye = OPENING_EYE.clone().sub(STAR.position).normalize();
const viewRight = new Vector3().crossVectors(towardEye, UP).normalize();

/** Normal of the shared orbital plane: rolled so orbits read as a tilted ellipse. */
export const ORBIT_NORMAL = UP.clone()
  .multiplyScalar(Math.cos(MathUtils.degToRad(16)))
  .addScaledVector(viewRight, Math.sin(MathUtils.degToRad(16)))
  .normalize();

// in-plane basis: ORBIT_AWAY points from the star away from the opening eye
export const ORBIT_AWAY = towardEye
  .clone()
  .multiplyScalar(-1)
  .projectOnPlane(ORBIT_NORMAL)
  .normalize();
export const ORBIT_ACROSS = new Vector3().crossVectors(ORBIT_NORMAL, ORBIT_AWAY).normalize();
export const TOWARD_EYE = towardEye;

/**
 * The app worlds, in journey order. `phase` is the orbital angle in radians
 * (0..π is the far side of the star from the opening eye, so all of them sit
 * clear of Earth in the first frame). `period` is in seconds — orbits drift,
 * they don't race. `side` matches the panel: 1 when it sits left, -1 right.
 */
export const WORLDS = [
  { slug: 'traintrack-uk', orbit: 200, radius: 16, phase: 1.05, period: 1400, tint: '#5f8fd0', side: 1 },
  { slug: 'tubetrack-uk', orbit: 265, radius: 11, phase: 2.35, period: 1900, tint: '#c9d6e6', side: -1 },
  { slug: 'bikespot-london', orbit: 330, radius: 14, phase: 0.55, period: 2500, tint: '#b8604c', side: 1 },
  { slug: 'top-scores', orbit: 400, radius: 24, phase: 1.75, period: 3000, tint: '#7d6fd6', side: -1 },
  { slug: 'kidsplorers', orbit: 480, radius: 12, phase: 0.95, period: 3700, tint: '#d9a441', side: 1 },
  { slug: 'bromley-bins', orbit: 560, radius: 7, phase: 2.55, period: 4400, tint: '#93a0b4', side: -1 },
];

export const SYSTEM_RADIUS = 600;

/* ---------- deeper space ---------- */

/**
 * The Veil: Hubble's image of a supernova remnant's filaments, laid out as a
 * few layers of light across `width` (the image's 3:2 frame), facing the way
 * the journey arrives so the Capabilities station sees it whole.
 */
export const NEBULA = {
  centre: STAR.position.clone().add(new Vector3(-2200, 1100, -3600)),
  width: 4600,
  aspect: 2048 / 1365,
  facing: new Vector3(0.42, 0.12, 1).normalize(),
  /** Roll of the image about `facing` (radians): sets which way the filaments sweep across the sky. */
  roll: 0.6,
  /** How far off the Capabilities station hangs, along `facing`; the layers line up from there. */
  viewDistance: 4800,
};

export const SINGULARITY = {
  centre: STAR.position.clone().add(new Vector3(1500, -250, -7200)),
  horizon: 58,
  discInner: 92,
  discOuter: 430,
  // disc plane normal: tipped so the disc is seen nearly edge-on on approach
  normal: new Vector3(0.12, 1, 0.18).normalize(),
};

export const GALAXY = {
  centre: STAR.position.clone().add(new Vector3(-3000, 5200, -30000)),
  radius: 8500,
  normal: new Vector3(0.18, 0.62, 0.76).normalize(),
};

export const FAR = 160000;
export const SKY_RADIUS = 100000;
