// Placeholder nebula: layered additive cloud puffs in the brief's violet,
// magenta, cyan and cosmic blue. Phase 4 replaces it with a shader-driven
// volume-like cloud baked once and animated cheaply.

import { AdditiveBlending, Color, Group, Sprite, SpriteMaterial, Vector3 } from 'three';
import { NEBULA } from '../layout.js';
import { createGlowTexture, disposeTree, seeded } from '../textures.js';

const PALETTE = ['#8b5cf6', '#d946ef', '#38bdf8', '#2563eb', '#8b5cf6', '#6d28d9'].map(
  (hex) => new Color(hex)
);

export function createNebula({ tier }) {
  const group = new Group();
  group.position.copy(NEBULA.centre);
  const texture = createGlowTexture(128, 1.6);
  const rand = seeded(42);
  const p = new Vector3();

  for (let i = 0; i < tier.nebulaClouds; i++) {
    // an elongated, lumpy ellipsoid
    p.set(rand() - 0.5, (rand() - 0.5) * 0.55, (rand() - 0.5) * 0.8).multiplyScalar(NEBULA.size * 1.6);
    const material = new SpriteMaterial({
      map: texture,
      color: PALETTE[i % PALETTE.length].clone().multiplyScalar(0.18 + rand() * 0.22),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      rotation: rand() * Math.PI,
    });
    const cloud = new Sprite(material);
    cloud.position.copy(p);
    cloud.scale.setScalar(NEBULA.size * (0.35 + rand() * 0.75));
    group.add(cloud);
  }

  return {
    object: group,
    setPresence(amount) {
      group.visible = amount > 0.001;
      for (const cloud of group.children) cloud.material.opacity = amount;
    },
    update(time) {
      group.rotation.y = time * 0.004;
    },
    dispose() {
      disposeTree(group);
    },
  };
}
