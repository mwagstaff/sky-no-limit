// Cosmic dust in the foreground: a sparse cloud of soft motes that travels
// with the camera, drifting slowly when the journey rests and streaming past
// when it flies. Positions wrap inside a box in the vertex shader, so there's
// no per-frame work on the CPU.

import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';
import vertexShader from '../../shaders/dust.vert.glsl?raw';
import fragmentShader from '../../shaders/dust.frag.glsl?raw';
import { disposeTree, seeded } from '../textures.js';

const BOX = 900;

export function createDust({ tier }) {
  const count = tier.dust;
  const rand = seeded(311);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rand();
    positions[i * 3 + 1] = rand();
    positions[i * 3 + 2] = rand();
    sizes[i] = 0.8 + 1.8 * rand() ** 2;
    phases[i] = rand();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));

  const points = new Points(
    geometry,
    new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBox: { value: BOX },
        uPixelRatio: { value: 1 },
        uOpacity: { value: 0.32 },
      },
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  points.frustumCulled = false;
  points.visible = count > 0;

  return {
    object: points,
    setPixelRatio(ratio) {
      points.material.uniforms.uPixelRatio.value = ratio;
    },
    update(time) {
      points.material.uniforms.uTime.value = time;
    },
    dispose() {
      disposeTree(points);
    },
  };
}
