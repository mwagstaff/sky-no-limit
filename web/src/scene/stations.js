// Camera poses for each station on the journey. Poses are recomputed every
// frame, because the worlds they frame are moving, and they adapt to the
// viewport: in landscape the subject sits opposite its text panel, in
// portrait it rises above the panel.

import { MathUtils, Quaternion, Vector3 } from 'three';
import {
  EARTH,
  GALAXY,
  NEBULA,
  ORBIT_NORMAL,
  SINGULARITY,
  STAR,
  SYSTEM_RADIUS,
  TOWARD_EYE,
  UP,
} from './layout.js';

const forward = new Vector3();
const right = new Vector3();
const up = new Vector3();
const subject = new Vector3();
const approach = new Vector3();
const toStar = new Vector3();
const across = new Vector3();
const toSubject = new Vector3();
const seen = new Vector3();
const turn = new Quaternion();
const HORIZON_APPROACH = GALAXY.normal
  .clone()
  .multiplyScalar(0.5)
  .add(new Vector3(0.1, -0.35, 1).normalize())
  .normalize();

const isPortrait = (aspect) => aspect < 0.9;

/** Widen the vertical field of view on tall screens so the scene keeps its breadth. */
function fitFov(fov, aspect) {
  if (!isPortrait(aspect)) return fov;
  const tan = Math.tan(MathUtils.degToRad(fov / 2)) * Math.min(1.9, 0.62 / aspect);
  return Math.min(74, MathUtils.radToDeg(Math.atan(tan)) * 2);
}

/**
 * Place the camera so `subject` (of the given radius) fills `fill` of the
 * viewport's half-height and appears at normalised screen offset (sx, sy).
 */
function frame(out, { radius, fill, sx = 0, sy = 0, room = Infinity, fov, aspect }) {
  fill = Math.min(fill, room);
  const tanV = Math.tan(MathUtils.degToRad(fov / 2));
  const distance = radius / (fill * tanV);
  out.position.copy(subject).addScaledVector(approach, distance);
  forward.copy(subject).sub(out.position).normalize();
  right.crossVectors(forward, UP).normalize();
  up.crossVectors(right, forward);
  out.target
    .copy(subject)
    .addScaledVector(right, -sx * distance * tanV * aspect)
    .addScaledVector(up, -sy * distance * tanV);
  out.fov = fov;
  return out;
}

/**
 * Like frame(), but exact: from `subject` + `approach` × distance, turn the
 * camera until the subject lands precisely at (sx, sy). Used for the opening,
 * where the offset is large enough for frame()'s approximation to drift.
 */
function aim(out, { radius, fill, sx, sy, fov, aspect }) {
  const tanV = Math.tan(MathUtils.degToRad(fov / 2));
  const distance = radius / (fill * tanV);
  out.position.copy(subject).addScaledVector(approach, distance);
  toSubject.copy(subject).sub(out.position).normalize();
  forward.copy(toSubject);
  for (let i = 0; i < 5; i++) {
    right.crossVectors(forward, UP).normalize();
    up.crossVectors(right, forward);
    seen.copy(forward).addScaledVector(right, sx * tanV * aspect).addScaledVector(up, sy * tanV).normalize();
    forward.applyQuaternion(turn.setFromUnitVectors(seen, toSubject));
  }
  out.target.copy(out.position).addScaledVector(forward, distance);
  out.fov = fov;
  return out;
}

/**
 * Where the subject sits on screen: in the free space the page measured
 * beside (or above) the station's panel, falling back to the panel's side.
 */
function placement(station, aspect, landscapeX = 0.42) {
  if (station.focus) return { sx: station.focus.x, sy: station.focus.y, room: station.focus.room };
  if (isPortrait(aspect)) return { sx: 0, sy: 0.4 };
  if (station.side === 'left') return { sx: landscapeX, sy: 0 };
  if (station.side === 'right') return { sx: -landscapeX, sy: 0 };
  return { sx: 0, sy: 0 };
}

export function createStationPoses({ system }) {
  const poses = {
    opening(out, aspect) {
      // Earth low and to the right, clear of the title and the rail; on tall
      // screens the copy stacks deeper, so the globe rises from the bottom
      // edge and the star sits beside the actions
      const portrait = isPortrait(aspect);
      subject.copy(EARTH.centre);
      approach.copy(EARTH.approach);
      return aim(out, {
        radius: EARTH.radius,
        fill: portrait ? 0.6 : 0.5,
        sx: portrait ? 0.35 : 0.36,
        sy: portrait ? -1.12 : -0.2,
        fov: fitFov(50, aspect),
        aspect,
      });
    },

    system(out, aspect, station) {
      subject.copy(STAR.position);
      approach.copy(TOWARD_EYE).multiplyScalar(0.8).addScaledVector(ORBIT_NORMAL, 0.62).normalize();
      const portrait = isPortrait(aspect);
      return frame(out, {
        radius: SYSTEM_RADIUS,
        fill: portrait ? 0.62 : 0.86,
        ...placement(station, aspect, 0.3),
        fov: fitFov(45, aspect),
        aspect,
      });
    },

    world(out, aspect, station) {
      const body = system.worlds.get(station.id);
      system.worldPosition(station.id, subject);
      // come in from the side, slightly sunward and above the plane, so most
      // of the disc is lit and the terminator still shows
      toStar.copy(STAR.position).sub(subject).normalize();
      across.crossVectors(toStar, ORBIT_NORMAL).normalize().multiplyScalar(body.world.side);
      approach
        .copy(across)
        .multiplyScalar(0.9)
        .addScaledVector(toStar, 0.38)
        .addScaledVector(ORBIT_NORMAL, 0.32)
        .normalize();
      const moon = body.world.radius < 10;
      return frame(out, {
        radius: body.world.radius,
        fill: isPortrait(aspect) ? 0.3 : moon ? 0.24 : 0.36,
        ...placement(station, aspect),
        fov: fitFov(40, aspect),
        aspect,
      });
    },

    nebula(out, aspect, station) {
      // face-on, from the distance its layers line up at: the Veil sweeps
      // across the sky behind the panel, its brightest filaments drawn into
      // the free space beside (or above) it
      subject.copy(NEBULA.centre);
      approach.copy(NEBULA.facing);
      const fov = fitFov(50, aspect);
      const { sx, sy } = placement(station, aspect, 0.3);
      return frame(out, {
        radius: NEBULA.viewDistance * Math.tan(MathUtils.degToRad(fov / 2)),
        fill: 1,
        sx: isPortrait(aspect) ? 0.1 : sx - 0.24,
        sy: isPortrait(aspect) ? sy * 0.6 : 0,
        fov,
        aspect,
      });
    },

    singularity(out, aspect, station) {
      subject.copy(SINGULARITY.centre);
      // nearly edge-on to the disc, from slightly above it
      approach.set(-0.35, 0, 1).projectOnPlane(SINGULARITY.normal).normalize();
      approach.addScaledVector(SINGULARITY.normal, 0.16).normalize();
      return frame(out, {
        radius: SINGULARITY.discOuter,
        fill: isPortrait(aspect) ? 0.62 : 0.7,
        ...placement(station, aspect, 0.36),
        fov: fitFov(42, aspect),
        aspect,
      });
    },

    horizon(out, aspect) {
      subject.copy(GALAXY.centre);
      // a three-quarter view of the disc, seen from the journey's side
      approach.copy(HORIZON_APPROACH);
      return frame(out, {
        radius: GALAXY.radius,
        // the core rides above the headline; the arms sweep behind it
        fill: isPortrait(aspect) ? 0.55 : 0.7,
        sx: 0,
        sy: isPortrait(aspect) ? 0.5 : 0.5,
        fov: fitFov(50, aspect),
        aspect,
      });
    },
  };

  return function poseFor(station, aspect, out) {
    const pose = poses[station.id] ?? poses.world;
    return pose(out, aspect, station);
  };
}
