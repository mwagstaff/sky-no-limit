// The distant spiral galaxy at the end of the journey: a gold core winding
// out into blue arms dotted with violet and magenta star-forming regions.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  Quaternion,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import vertexShader from '../../shaders/galaxy.vert.glsl?raw';
import fragmentShader from '../../shaders/galaxy.frag.glsl?raw';
import { GALAXY } from '../layout.js';
import { createGlowTexture, disposeTree, seeded } from '../textures.js';

const CORE = new Color('#ffd27a');
const ARM = new Color('#7fb6ff');
const DUST = new Color('#3b5bdb');
const NURSERY = [new Color('#d946ef'), new Color('#8b5cf6'), new Color('#f472b6')];

export function createGalaxy({ tier }) {
  const group = new Group();
  group.position.copy(GALAXY.centre);
  group.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), GALAXY.normal));

  const rand = seeded(2026);
  const gaussian = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const count = tier.galaxy;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colour = new Color();
  const arms = 2;
  const R = GALAXY.radius;

  for (let i = 0; i < count; i++) {
    const inCore = rand() < 0.22;
    const r = inCore ? Math.abs(gaussian()) * R * 0.16 : (0.08 + rand() ** 0.75 * 0.92) * R;
    const t = r / R;
    const arm = i % arms;
    const angle = arm * ((Math.PI * 2) / arms) + t * Math.PI * 3.4 + gaussian() * (0.35 - t * 0.18);
    const thickness = R * (inCore ? 0.06 : 0.018) * (1 - t * 0.6);
    positions[i * 3] = Math.cos(angle) * r + gaussian() * R * 0.025;
    positions[i * 3 + 1] = gaussian() * thickness;
    positions[i * 3 + 2] = Math.sin(angle) * r + gaussian() * R * 0.025;

    if (!inCore && rand() < 0.035) {
      colour.copy(NURSERY[(rand() * NURSERY.length) | 0]).multiplyScalar(1.6);
      sizes[i] = 70 + rand() * 90;
    } else {
      colour.copy(CORE).lerp(ARM, Math.min(1, t * 1.8));
      if (!inCore && rand() < 0.25) colour.lerp(DUST, 0.6);
      colour.multiplyScalar(inCore ? 0.9 + (1 - t * 4) * 0.8 : 0.45 + rand() * 0.5);
      sizes[i] = 26 + rand() ** 4 * 80;
    }
    colour.toArray(colours, i * 3);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new BufferAttribute(colours, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uPixelRatio: { value: 1 }, uScale: { value: 380 }, uPresence: { value: 1 } },
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const stars = new Points(geometry, material);
  stars.frustumCulled = false;

  const core = new Sprite(
    new SpriteMaterial({
      map: createGlowTexture(256, 2.8),
      color: new Color('#ffcf7a').multiplyScalar(1.2),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  core.scale.setScalar(R * 0.75);

  group.add(stars, core);

  return {
    object: group,
    setPixelRatio(ratio) {
      material.uniforms.uPixelRatio.value = ratio;
    },
    setPresence(amount) {
      group.visible = amount > 0.001;
      material.uniforms.uPresence.value = amount;
      core.material.opacity = amount;
    },
    update(time) {
      stars.rotation.y = -time * 0.006;
    },
    dispose() {
      disposeTree(group);
    },
  };
}
