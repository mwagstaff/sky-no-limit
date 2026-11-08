// Occasional events in the far sky: a shooting star every few seconds and,
// now and then, a comet drifting slowly across with its tails streaming away
// from the star. Both are placed on the sky sphere relative to the camera, as
// the distant stars are, always where the visitor is looking and never behind
// the copy (`isClear` asks the page whether a screen point is empty sky).

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import streakVertexShader from '../../shaders/streak.vert.glsl?raw';
import streakFragmentShader from '../../shaders/streak.frag.glsl?raw';
import starVertexShader from '../../shaders/stars.vert.glsl?raw';
import starFragmentShader from '../../shaders/stars.frag.glsl?raw';
import { EARTH, STAR } from '../layout.js';
import { disposeTree } from '../textures.js';

const DISTANCE = 40000;
const deg = MathUtils.degToRad;

const right = new Vector3();
const up = new Vector3();
const forward = new Vector3();
const scratch = new Vector3();

/** Rotate unit vector `v` about unit `axis` by `angle` (Rodrigues). */
function rotate(v, axis, angle, out) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  scratch.crossVectors(axis, v);
  return out
    .copy(v)
    .multiplyScalar(cos)
    .addScaledVector(scratch, sin)
    .addScaledVector(axis, axis.dot(v) * (1 - cos));
}

function streak({ headColor, tailColor, falloff }) {
  const material = new ShaderMaterial({
    vertexShader: streakVertexShader,
    fragmentShader: streakFragmentShader,
    uniforms: {
      uHead: { value: new Vector3() },
      uTail: { value: new Vector3() },
      uResolution: { value: new Vector2(1, 1) },
      uHeadWidth: { value: 2 },
      uTailWidth: { value: 1 },
      uHeadColor: { value: new Color(...headColor) },
      uTailColor: { value: new Color(...tailColor) },
      uOpacity: { value: 0 },
      uFalloff: { value: falloff },
    },
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1, 32, 1), material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return mesh;
}

function glint(size) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
  geometry.setAttribute('aColor', new BufferAttribute(new Float32Array(3), 3));
  geometry.setAttribute('aSize', new BufferAttribute(new Float32Array([size]), 1));
  geometry.setAttribute('aPhase', new BufferAttribute(new Float32Array([0]), 1));
  const points = new Points(
    geometry,
    new ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uTwinkle: { value: 0 },
        uAttenuate: { value: 0 },
      },
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  points.frustumCulled = false;
  points.visible = false;
  return points;
}

function setGlint(points, position, colour, amount) {
  points.geometry.getAttribute('position').setXYZ(0, position.x, position.y, position.z);
  points.geometry.getAttribute('aColor').setXYZ(0, colour.r * amount, colour.g * amount, colour.b * amount);
  points.geometry.getAttribute('position').needsUpdate = true;
  points.geometry.getAttribute('aColor').needsUpdate = true;
}

export function createSkyEvents({ isClear = () => true } = {}) {
  const group = new Group();

  const meteor = {
    trail: streak({ headColor: [1.6, 1.55, 1.45], tailColor: [0.3, 0.6, 1.0], falloff: 2.4 }),
    head: glint(3.2),
    colour: new Color(1.5, 1.45, 1.35),
    active: false,
    origin: new Vector3(),
    axis: new Vector3(),
  };
  const comet = {
    dust: streak({ headColor: [1.0, 0.96, 0.88], tailColor: [0.32, 0.36, 0.5], falloff: 1.25 }),
    ion: streak({ headColor: [0.5, 0.85, 1.3], tailColor: [0.15, 0.45, 1.0], falloff: 0.9 }),
    coma: glint(16),
    nucleus: glint(3),
    comaColour: new Color(0.55, 0.75, 1.0),
    nucleusColour: new Color(1.4, 1.4, 1.3),
    active: false,
    origin: new Vector3(),
    axis: new Vector3(),
  };
  group.add(meteor.trail, meteor.head, comet.dust, comet.ion, comet.coma, comet.nucleus);
  const streaks = [meteor.trail, comet.dust, comet.ion];
  const glints = [meteor.head, comet.coma, comet.nucleus];

  let motion = true;
  let pixelRatio = 1;
  let nextMeteor = 4 + Math.random() * 5;
  let nextComet = 9 + Math.random() * 6;

  const head = new Vector3();
  const tail = new Vector3();
  const toStar = new Vector3();
  const toEarth = new Vector3();
  const away = new Vector3();
  const motionDir = new Vector3();
  const world = new Vector3();
  const probe = new Vector3();
  let earthAngle = 0;

  /** Whether a sky direction is in empty sky: off Earth, out of the star's glare, not behind the copy. */
  function clearAt(direction, camera) {
    if (direction.angleTo(toEarth) < earthAngle || direction.angleTo(toStar) < deg(10)) return false;
    probe.copy(camera.position).addScaledVector(direction, DISTANCE).project(camera);
    return Math.abs(probe.x) > 1 || Math.abs(probe.y) > 1 || isClear(probe.x, probe.y);
  }

  /**
   * Find a path through empty sky: a start somewhere in view (x, y in
   * normalised screen units) and a heading (screen angle, degrees) along
   * which `event` can travel `sweep` with its start, middle, end and (for a
   * comet) tail all clear. Writes event.origin and event.axis.
   */
  function findPath(camera, event, { x: xRange, y: yRange, headings, sweep, tail = 0 }) {
    camera.matrixWorld.extractBasis(right, up, forward);
    forward.negate();
    const tanV = Math.tan(deg(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    toEarth.copy(EARTH.centre).sub(camera.position);
    earthAngle = Math.asin(Math.min(1, EARTH.radius / toEarth.length())) + deg(6);
    toEarth.normalize();
    toStar.copy(STAR.position).sub(camera.position).normalize();

    for (let attempt = 0; attempt < 14; attempt++) {
      const x = MathUtils.lerp(xRange[0], xRange[1], Math.random());
      const y = MathUtils.lerp(yRange[0], yRange[1], Math.random());
      const range = headings[Math.floor(Math.random() * headings.length)];
      const heading = deg(MathUtils.randFloat(range[0], range[1]));
      event.origin.copy(forward).addScaledVector(right, x * tanH).addScaledVector(up, y * tanV).normalize();
      motionDir.copy(right).multiplyScalar(Math.cos(heading)).addScaledVector(up, Math.sin(heading));
      event.axis.crossVectors(event.origin, motionDir).normalize();

      if (!clearAt(event.origin, camera)) continue;
      if (!clearAt(rotate(event.origin, event.axis, sweep / 2, head), camera)) continue;
      if (!clearAt(rotate(event.origin, event.axis, sweep, head), camera)) continue;
      if (tail) {
        away.crossVectors(toStar, event.origin).normalize();
        if (!clearAt(rotate(event.origin, away, tail, head), camera)) continue;
      }
      return true;
    }
    return false;
  }

  function launchMeteor(time, camera) {
    const sweep = deg(MathUtils.randFloat(7, 14));
    // mostly downhill, either way
    if (!findPath(camera, meteor, { x: [-0.9, 0.9], y: [0.0, 0.9], headings: [[200, 340]], sweep })) return;
    meteor.start = time;
    meteor.duration = MathUtils.randFloat(0.55, 1.1);
    meteor.sweep = sweep;
    meteor.length = deg(MathUtils.randFloat(3, 6));
    meteor.brightness = MathUtils.randFloat(0.55, 1);
    meteor.active = true;
  }

  function launchComet(time, camera) {
    const sweep = deg(MathUtils.randFloat(5, 8));
    const length = deg(MathUtils.randFloat(6, 9));
    const headings = [[-25, 25], [155, 205]];
    if (!findPath(camera, comet, { x: [-0.6, 0.85], y: [0.2, 0.85], headings, sweep, tail: length })) return;
    comet.start = time;
    comet.duration = MathUtils.randFloat(24, 32);
    comet.sweep = sweep;
    comet.length = length;
    comet.active = true;
  }

  function place(direction, camera, out) {
    return out.copy(camera.position).addScaledVector(direction, DISTANCE);
  }

  function updateMeteor(time, camera) {
    const t = (time - meteor.start) / meteor.duration;
    if (t >= 1) {
      meteor.active = false;
      return;
    }
    const envelope = MathUtils.smoothstep(t, 0, 0.12) * (1 - MathUtils.smoothstep(t, 0.55, 1));
    rotate(meteor.origin, meteor.axis, meteor.sweep * t, head);
    rotate(head, meteor.axis, -meteor.length * MathUtils.smoothstep(t, 0, 0.35), tail);
    const { uniforms } = meteor.trail.material;
    place(head, camera, uniforms.uHead.value);
    place(tail, camera, uniforms.uTail.value);
    uniforms.uOpacity.value = envelope * meteor.brightness;
    uniforms.uHeadWidth.value = 1.7 * pixelRatio;
    uniforms.uTailWidth.value = 0.4 * pixelRatio;
    setGlint(meteor.head, uniforms.uHead.value, meteor.colour, envelope * meteor.brightness);
  }

  function updateComet(time, camera) {
    const t = (time - comet.start) / comet.duration;
    if (t >= 1) {
      comet.active = false;
      return;
    }
    const envelope = MathUtils.smoothstep(t, 0, 0.2) * (1 - MathUtils.smoothstep(t, 0.78, 1));
    rotate(comet.origin, comet.axis, comet.sweep * t, head);
    place(head, camera, world);

    // tails stream away from the star; the dust tail lags a little behind the motion
    toStar.copy(STAR.position).sub(camera.position).normalize();
    away.crossVectors(toStar, head).normalize();
    rotate(head, away, comet.length * 1.15, tail);
    const ion = comet.ion.material.uniforms;
    ion.uHead.value.copy(world);
    place(tail, camera, ion.uTail.value);
    ion.uOpacity.value = envelope * 0.55;
    ion.uHeadWidth.value = 1.6 * pixelRatio;
    ion.uTailWidth.value = 4 * pixelRatio;

    away.multiplyScalar(0.82).addScaledVector(comet.axis, -0.3).normalize();
    rotate(head, away, comet.length, tail);
    const dust = comet.dust.material.uniforms;
    dust.uHead.value.copy(world);
    place(tail, camera, dust.uTail.value);
    dust.uOpacity.value = envelope * 0.7;
    dust.uHeadWidth.value = 5 * pixelRatio;
    dust.uTailWidth.value = 46 * pixelRatio;

    setGlint(comet.coma, world, comet.comaColour, envelope * 0.6);
    setGlint(comet.nucleus, world, comet.nucleusColour, envelope);
  }

  function hideAll() {
    meteor.active = comet.active = false;
    for (const object of [...streaks, ...glints]) object.visible = false;
  }

  return {
    object: group,
    setPixelRatio(ratio) {
      pixelRatio = ratio;
      for (const points of glints) points.material.uniforms.uPixelRatio.value = ratio;
    },
    setSize(width, height) {
      for (const mesh of streaks) mesh.material.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    },
    /** Bring the next shooting star or comet forward to the next frame. */
    trigger(kind) {
      if (kind === 'comet') nextComet = 0;
      else nextMeteor = 0;
    },
    setMotion(enabled) {
      motion = enabled;
      if (!enabled) hideAll();
    },
    update(time, camera) {
      if (!motion) return;
      if (!meteor.active && time >= nextMeteor) {
        launchMeteor(time, camera);
        nextMeteor = time + MathUtils.randFloat(7, 16);
      }
      if (!comet.active && time >= nextComet) {
        launchComet(time, camera);
        nextComet = time + MathUtils.randFloat(55, 95);
      }
      if (meteor.active) updateMeteor(time, camera);
      if (comet.active) updateComet(time, camera);
      meteor.trail.visible = meteor.head.visible = meteor.active;
      comet.dust.visible = comet.ion.visible = comet.coma.visible = comet.nucleus.visible = comet.active;
    },
    dispose() {
      disposeTree(group);
    },
  };
}
