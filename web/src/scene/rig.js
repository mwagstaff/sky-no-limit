// The camera rig: follows the journey value with critically damped easing,
// holds still while a station's panel is centred (the dwell), and flies a
// centripetal Catmull-Rom path between stations. Pointer parallax and a
// slow drift are layered on top in camera space, and the visitor's own swing
// round Earth (`orbit`, from globe-control.js) on top of everything.

import { CatmullRomCurve3, MathUtils, Quaternion, Vector3 } from 'three';
import { UP } from './layout.js';

const DWELL = 0.16;
const FOLLOW = 3.2; // higher = camera keeps closer to the scroll position
const smootherstep = (x) => x * x * x * (x * (x * 6 - 15) + 10);

export function createRig({ camera, stations, poseFor, orbit = null }) {
  const count = stations.length;
  const positions = stations.map(() => new Vector3());
  const targets = stations.map(() => new Vector3());
  const fovs = new Float32Array(count);
  const positionPath = new CatmullRomCurve3(positions, false, 'centripetal');
  const targetPath = new CatmullRomCurve3(targets, false, 'centripetal');

  const pose = { position: new Vector3(), target: new Vector3(), fov: 45 };
  const target = new Vector3();
  const forward = new Vector3();
  const right = new Vector3();
  const up = new Vector3();
  const swing = new Quaternion();

  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
  const intro = { amount: 0 };
  let value = null;

  /** Ease each leg so the camera rests at stations and travels between them. */
  function shape(p) {
    const i = Math.min(count - 2, Math.floor(p));
    const t = MathUtils.clamp((p - i - DWELL) / (1 - 2 * DWELL), 0, 1);
    return i + smootherstep(t);
  }

  function refreshPoses(aspect) {
    for (let i = 0; i < count; i++) {
      poseFor(stations[i], aspect, pose);
      positions[i].copy(pose.position);
      targets[i].copy(pose.target);
      fovs[i] = pose.fov;
    }
  }

  return {
    pointer,
    intro,
    get value() {
      return value;
    },
    /**
     * @param dt seconds since last frame
     * @param journey the scroll-derived journey value
     * @param opts.snap jump straight to the nearest station (reduced motion)
     */
    update(dt, journey, { aspect, time = 0, snap = false }) {
      if (value === null || snap) value = journey;
      else value += (journey - value) * (1 - Math.exp(-dt * FOLLOW));

      refreshPoses(aspect);
      const s = snap ? Math.round(journey) : shape(value);
      const u = s / (count - 1);
      positionPath.getPoint(u, camera.position);
      targetPath.getPoint(u, target);

      const i = Math.min(count - 2, Math.floor(s));
      camera.fov = MathUtils.lerp(fovs[i], fovs[i + 1], s - i);

      forward.subVectors(target, camera.position);
      const distance = forward.length();
      forward.divideScalar(distance);
      right.crossVectors(forward, UP).normalize();
      up.crossVectors(right, forward);

      if (!snap) {
        // arrival: begin a little further back and lower, then settle
        if (intro.amount > 0) {
          camera.position
            .addScaledVector(forward, -distance * 0.05 * intro.amount)
            .addScaledVector(up, -distance * 0.01 * intro.amount);
        }
        const ease = 1 - Math.exp(-dt * 2.4);
        pointer.smoothX += (pointer.x - pointer.smoothX) * ease;
        pointer.smoothY += (pointer.y - pointer.smoothY) * ease;
        camera.position
          .addScaledVector(right, pointer.smoothX * distance * 0.012)
          .addScaledVector(up, pointer.smoothY * distance * 0.008 + Math.sin(time * 0.21) * distance * 0.0015);
      }

      if (orbit && orbit.weight > 0) {
        swing.identity().slerp(orbit.quaternion, orbit.weight);
        camera.position.sub(orbit.centre).applyQuaternion(swing).add(orbit.centre);
        target.sub(orbit.centre).applyQuaternion(swing).add(orbit.centre);
        camera.up.copy(UP).applyQuaternion(swing);
      } else {
        camera.up.copy(UP);
      }

      camera.lookAt(target);
      camera.updateProjectionMatrix();
    },
  };
}
