// Two star layers: an infinitely distant sky that travels with the camera
// (no parallax, like real stars), and a sparse near field scattered along the
// flight path so travel reads as motion through depth.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import vertexShader from '../../shaders/stars.vert.glsl?raw';
import fragmentShader from '../../shaders/stars.frag.glsl?raw';
import { OPENING_EYE, SKY_RADIUS } from '../layout.js';
import { disposeTree, seeded } from '../textures.js';

// colour temperatures, cool to warm, weighted towards white-blue
const TEMPERATURES = ['#a9c4ff', '#c9d8ff', '#e6edff', '#ffffff', '#fff4e3', '#ffdcae'].map(
  (hex) => new Color(hex)
);
const TEMPERATURE_WEIGHTS = [0.12, 0.22, 0.26, 0.2, 0.12, 0.08];

function pickTemperature(rand) {
  let r = rand();
  for (let i = 0; i < TEMPERATURES.length; i++) {
    if ((r -= TEMPERATURE_WEIGHTS[i]) <= 0) return TEMPERATURES[i];
  }
  return TEMPERATURES[3];
}

function starAttributes(count, rand, place) {
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const p = new Vector3();
  for (let i = 0; i < count; i++) {
    place(p, rand);
    p.toArray(positions, i * 3);
    // brightness follows a steep power law: a handful of bright stars, a sea of faint ones
    const brightness = 0.22 + 2.4 * rand() ** 5;
    pickTemperature(rand).toArray(colours, i * 3);
    for (let c = 0; c < 3; c++) colours[i * 3 + c] *= brightness;
    sizes[i] = 0.55 + 2.3 * rand() ** 7;
    phases[i] = rand();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new BufferAttribute(colours, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
  return geometry;
}

function starMaterial(attenuate) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uTwinkle: { value: 1 },
      uAttenuate: { value: attenuate },
    },
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

export function createStarfield({ tier }) {
  const group = new Group();
  const rand = seeded(1979);

  // distant sky: a uniform sphere plus a denser, slightly warmer galactic band
  const band = new Vector3(0.3, 0.9, -0.3).normalize();
  const skyGeometry = starAttributes(tier.stars, rand, (p, r) => {
    p.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (r() < 0.4) p.addScaledVector(band, -p.dot(band) * (0.85 + r() * 0.1));
    p.normalize().multiplyScalar(SKY_RADIUS);
  });
  const sky = new Points(skyGeometry, starMaterial(0));
  sky.frustumCulled = false;
  sky.renderOrder = -10;

  // near field along the journey (the path runs roughly from z=0 to z=-34000),
  // kept clear of the opening's foreground so no star sits in front of Earth
  const nearGeometry = starAttributes(tier.nearStars, rand, (p, r) => {
    do p.set((r() - 0.5) * 18000, (r() - 0.35) * 12000, 3000 - r() * 40000);
    while (p.distanceTo(OPENING_EYE) < 2600);
  });
  const near = new Points(nearGeometry, starMaterial(1));
  near.frustumCulled = false;
  near.renderOrder = -9;

  group.add(sky, near);
  const materials = [sky.material, near.material];

  return {
    object: group,
    setPixelRatio(ratio) {
      for (const m of materials) m.uniforms.uPixelRatio.value = ratio;
    },
    setMotion(enabled) {
      for (const m of materials) m.uniforms.uTwinkle.value = enabled ? 1 : 0;
    },
    update(time, camera) {
      sky.position.copy(camera.position);
      for (const m of materials) m.uniforms.uTime.value = time;
    },
    dispose() {
      disposeTree(group);
    },
  };
}
