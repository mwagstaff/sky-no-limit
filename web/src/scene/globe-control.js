// Lets the visitor take hold of Earth in the opening and turn it any way they
// like, trackball-style: the drag's direction sets the axis, its length the
// angle, and a fling coasts to a stop. The whole universe turns with the
// globe (in truth the camera swings round Earth the other way), so the sun,
// the stars and the gold star move with it and Earth's daylight stays true.
// Only empty sky over the globe responds, never the copy, and only near the
// opening; as the journey moves on, the view eases back onto its path, and
// reset() swings it home on request (the "Reset view" button).
// On touch, a swipe that starts sideways takes hold; one that starts
// vertically scrolls the page (touch-action: pan-y).

import { MathUtils, Quaternion, Ray, Sphere, Vector3 } from 'three';
import { EARTH } from './layout.js';

const COPY =
  'a, button, input, textarea, select, label, summary, [role="button"], .panel, .opening-copy, .site-header, .trajectory, .cookie-notice, .site-footer';
const MAX_FLING = 1.5; // radians per second: a hard fling coasts about a sixth of a turn
const COAST = 1.6; // how quickly a fling dies away (per second)
const STILL = 80; // ms: holding still this long before letting go means no fling
const GRAB_UNTIL = 0.25; // journey value past which the globe can't be taken hold of
const HOMING = 4; // how quickly reset() swings the view home (per second)
const TURNED = 0.01; // radians: any swing beyond this counts as the visitor having turned things

export function createGlobeControl({ camera, journeyValue, reducedMotion, onChange }) {
  const root = document.documentElement;
  const sphere = new Sphere(EARTH.centre, EARTH.radius * 1.02);
  const ray = new Ray();
  const point = new Vector3();
  const right = new Vector3();
  const up = new Vector3();
  const back = new Vector3();
  const axis = new Vector3();
  const spin = new Vector3(); // angular velocity of the universe, world axis × radians per second
  const turn = new Quaternion();
  const home = new Quaternion();

  /** How the camera has been swung round Earth by the visitor. */
  const orbit = { centre: EARTH.centre, quaternion: new Quaternion(), weight: 0 };
  let drag = null;
  let homing = false;

  function overGlobe(event) {
    if (journeyValue() > GRAB_UNTIL || event.target.closest?.(COPY)) return false;
    ray.origin.setFromMatrixPosition(camera.matrixWorld);
    point
      .set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5)
      .unproject(camera);
    ray.direction.subVectors(point, ray.origin).normalize();
    return ray.intersectsSphere(sphere);
  }

  /** Radians per pixel dragged, so the surface under the pointer keeps pace with it. */
  function radiansPerPixel() {
    const distance = camera.position.distanceTo(EARTH.centre);
    const tanHalf = Math.tan(MathUtils.degToRad(camera.fov / 2));
    return 1 / ((EARTH.radius / distance / tanHalf) * (window.innerHeight / 2));
  }

  /** Turn the universe by `angle` about world `axis`: the camera goes the other way round Earth. */
  function rotateUniverse(worldAxis, angle) {
    orbit.quaternion.premultiply(turn.setFromAxisAngle(worldAxis, -angle)).normalize();
  }

  window.addEventListener('pointerdown', (event) => {
    if (drag || !event.isPrimary || event.button !== 0 || !overGlobe(event)) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp, scale: radiansPerPixel() };
    spin.set(0, 0, 0);
    homing = false;
    try {
      event.target.setPointerCapture(event.pointerId);
    } catch {
      // capture is a nicety: window still hears the moves
    }
    if (event.pointerType === 'mouse') event.preventDefault();
    root.classList.add('globe-grabbing');
  });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (!drag) {
        if (event.pointerType === 'mouse') root.classList.toggle('globe-grab', overGlobe(event));
        return;
      }
      if (event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      const pixels = Math.hypot(dx, dy);
      if (pixels === 0) return;

      // dragging right turns the near face right (about screen up); dragging
      // down turns it down (about screen right)
      camera.matrixWorld.extractBasis(right, up, back);
      axis.copy(up).multiplyScalar(dx).addScaledVector(right, dy).normalize();
      const angle = pixels * drag.scale;
      rotateUniverse(axis, angle);

      const seconds = Math.max(1, event.timeStamp - drag.at) / 1000;
      spin.lerp(axis.multiplyScalar(angle / seconds), 0.4);
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.at = event.timeStamp;
      onChange();
    },
    { passive: true }
  );

  const release = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const fling = event.type === 'pointerup' && event.timeStamp - drag.at < STILL;
    if (fling) spin.clampLength(0, MAX_FLING);
    else spin.set(0, 0, 0);
    drag = null;
    root.classList.remove('globe-grabbing');
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  return {
    orbit,
    get dragging() {
      return drag !== null;
    },
    /** Whether the visitor has turned the view away from its designed pose (and it's in sight). */
    get turned() {
      return !homing && orbit.weight > 0.5 && orbit.quaternion.angleTo(home) > TURNED;
    },
    /** Swing the view back to the designed opening: smoothly, or at once with reduced motion. */
    reset() {
      spin.set(0, 0, 0);
      if (reducedMotion.matches) {
        orbit.quaternion.identity();
        onChange();
      } else {
        homing = true;
      }
    },
    /** Coast after a fling, and fade the swing out as the journey leaves the opening. */
    update(dt) {
      if (!drag && dt > 0 && spin.lengthSq() > 0) {
        const rate = spin.length();
        rotateUniverse(axis.copy(spin).divideScalar(rate), rate * dt);
        spin.multiplyScalar(Math.exp(-dt * COAST));
        if (spin.lengthSq() < 1e-6) spin.set(0, 0, 0);
      }
      if (homing && !drag) {
        orbit.quaternion.slerp(home, 1 - Math.exp(-dt * HOMING));
        if (orbit.quaternion.angleTo(home) < 0.002) {
          orbit.quaternion.identity();
          homing = false;
        }
      }
      orbit.weight = 1 - MathUtils.smoothstep(journeyValue(), 0.04, 0.5);
      // once well clear of Earth, forget the swing: coming back finds the opening as designed
      if (orbit.weight === 0 && !drag) {
        orbit.quaternion.identity();
        spin.set(0, 0, 0);
        homing = false;
      }
    },
  };
}
