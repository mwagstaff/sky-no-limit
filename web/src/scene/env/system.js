// The star and the four app worlds orbiting it. Worlds are placeholders in
// Phase 1 (lit spheres); Phase 3 gives each its own surface and atmosphere.

import {
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { ORBIT_ACROSS, ORBIT_AWAY, STAR, WORLDS } from '../layout.js';
import { createGlowTexture, createStreakTexture, disposeTree } from '../textures.js';

const TAU = Math.PI * 2;

export function orbitPoint(world, angle, out = new Vector3()) {
  return out
    .copy(STAR.position)
    .addScaledVector(ORBIT_ACROSS, Math.cos(angle) * world.orbit)
    .addScaledVector(ORBIT_AWAY, Math.sin(angle) * world.orbit);
}

export function createSystem({ tier }) {
  const group = new Group();
  const glowTexture = createGlowTexture(256, 2.4);

  // the star: an over-bright core, so tone mapping rolls it to white-gold, plus a wide glow
  const star = new Mesh(
    new SphereGeometry(STAR.radius, 48, 32),
    new MeshBasicMaterial({ color: new Color('#fbbf24').multiplyScalar(6) })
  );
  star.position.copy(STAR.position);

  const corona = new Sprite(
    new SpriteMaterial({
      map: glowTexture,
      color: new Color('#ffcf6b').multiplyScalar(2.2),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  // kept tight: the camera flies within a few hundred units of the star, and
  // an oversized additive sprite would wash every world station in gold
  corona.scale.setScalar(STAR.radius * 9);
  corona.position.copy(STAR.position);

  const halo = new Sprite(
    new SpriteMaterial({
      map: glowTexture,
      color: new Color('#f59e0b').multiplyScalar(0.55),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  halo.scale.setScalar(STAR.radius * 26);
  halo.position.copy(STAR.position);

  // a delicate anamorphic streak: a lens effect, so it keeps one size on
  // screen however near the star is (scaled with distance in update)
  const streak = new Sprite(
    new SpriteMaterial({
      map: createStreakTexture(),
      color: new Color('#ffd58a').multiplyScalar(0.55),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  streak.position.copy(STAR.position);

  const light = new PointLight(new Color('#ffe2a8'), 4, 0, 0);
  light.position.copy(STAR.position);
  const ambient = new AmbientLight(new Color('#1b2a55'), 0.12);

  group.add(halo, corona, streak, star, light, ambient);

  const segments = tier.name === 'low' ? 32 : 64;
  const bodies = new Map();
  for (const world of WORLDS) {
    const mesh = new Mesh(
      new SphereGeometry(world.radius, segments, segments * 0.75),
      new MeshStandardMaterial({ color: new Color(world.tint), roughness: 0.85, metalness: 0 })
    );
    mesh.rotation.z = 0.35 * world.side;

    const ring = [];
    for (let i = 0; i <= 256; i++) ring.push(orbitPoint(world, (i / 256) * TAU));
    const orbit = new LineLoop(
      new BufferGeometry().setFromPoints(ring),
      new LineBasicMaterial({
        color: new Color('#8fd8fb'),
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      })
    );

    group.add(mesh, orbit);
    bodies.set(world.slug, { world, mesh, angle: world.phase });
  }

  return {
    object: group,
    worlds: bodies,
    worldPosition(slug, out = new Vector3()) {
      return out.copy(bodies.get(slug).mesh.position);
    },
    worldRadius(slug) {
      return bodies.get(slug).world.radius;
    },
    update(time, camera) {
      // the wide halo reads from afar; up close, inside it, it would only haze the frame
      const distance = camera.position.distanceTo(STAR.position);
      const far = Math.min(1, Math.max(0, (distance - 500) / 1100));
      halo.material.opacity = far;
      streak.material.opacity = far;
      // narrower on tall screens, where it would otherwise reach across the copy
      streak.scale.set(distance * 0.3 * Math.min(1, camera.aspect / 1.3), distance * 0.012, 1);
      for (const body of bodies.values()) {
        body.angle = body.world.phase + (time / body.world.period) * TAU;
        orbitPoint(body.world, body.angle, body.mesh.position);
        body.mesh.rotation.y = time * 0.05;
      }
    },
    dispose() {
      disposeTree(group);
    },
  };
}
