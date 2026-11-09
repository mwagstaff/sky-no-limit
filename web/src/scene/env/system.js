// The star and the app worlds orbiting it. Each world is a real body, drawn
// from NASA's maps (assets/space/README.md): Europa's and Enceladus's
// fractured ice, Mars, Jupiter's belts, Io, the Moon. The maps load after the opening is on
// screen; until then each world is a plain sphere in its tint.

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
  NoColorSpace,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three';
import { ORBIT_ACROSS, ORBIT_AWAY, STAR, WORLDS } from '../layout.js';
import { createGlowTexture, createStreakTexture, disposeTree } from '../textures.js';
import atmosphereVertexShader from '../../shaders/atmosphere.vert.glsl?raw';
import atmosphereFragmentShader from '../../shaders/atmosphere.frag.glsl?raw';
import enceladusUrl from '../../assets/space/enceladus-1024.webp?url';
import europaUrl from '../../assets/space/europa-1024.webp?url';
import ioUrl from '../../assets/space/io-2048.webp?url';
import jupiterUrl from '../../assets/space/jupiter-2048.webp?url';
import marsUrl from '../../assets/space/mars-1536.webp?url';
import moonUrl from '../../assets/space/moon-2048.webp?url';
import moonHeightUrl from '../../assets/space/moon-height-1024.webp?url';

const TAU = Math.PI * 2;

// What each world is made of. `bump` gives relief at the terminator; `albedo`
// scales the map (linear RGB); `haze` is a thin atmosphere (the Earth's
// shader, retuned), its scale height a fraction of the radius.
const SURFACES = {
  // Europa: bright, faintly blue ice crossed by long fractures, like lines on a network map
  'traintrack-uk': { map: europaUrl, bump: europaUrl, bumpScale: 0.5, albedo: [1.2, 1.32, 1.6] },
  // Enceladus: the brightest ice in the solar system, its south lined with blue "tiger stripes"
  'tubetrack-uk': { map: enceladusUrl, bump: enceladusUrl, bumpScale: 0.4, albedo: [1.15, 1.2, 1.3] },
  'top-scores': {
    map: jupiterUrl,
    haze: { colour: '#c9d3ea', sunset: '#e9b27c', height: 0.03, intensity: 0.5 },
  },
  // dusty air with blue sunsets, as Mars has
  'bikespot-london': {
    map: marsUrl,
    haze: { colour: '#e0956b', sunset: '#86a8ff', height: 0.02, intensity: 0.75 },
  },
  // Io: sulphur yellows and volcanic spots, the liveliest world in the system
  kidsplorers: { map: ioUrl },
  'bromley-bins': { map: moonUrl, bump: moonHeightUrl, bumpScale: 2.5 },
};

export function orbitPoint(world, angle, out = new Vector3()) {
  return out
    .copy(STAR.position)
    .addScaledVector(ORBIT_ACROSS, Math.cos(angle) * world.orbit)
    .addScaledVector(ORBIT_AWAY, Math.sin(angle) * world.orbit);
}

export function createSystem({ tier, renderer }) {
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
      new MeshStandardMaterial({ color: new Color(world.tint), roughness: 1, metalness: 0 })
    );
    // tilted, then spun about that tilted axis (so the belts don't wobble)
    mesh.rotation.order = 'ZYX';
    mesh.rotation.z = 0.35 * world.side;

    const sun = new Vector3();
    const haze = SURFACES[world.slug]?.haze;
    if (haze) {
      mesh.add(
        new Mesh(
          new SphereGeometry(world.radius * (1 + haze.height * 6), segments, segments * 0.75),
          new ShaderMaterial({
            vertexShader: atmosphereVertexShader,
            fragmentShader: atmosphereFragmentShader,
            uniforms: {
              uCentre: { value: mesh.position },
              uRadius: { value: world.radius },
              uScaleHeight: { value: world.radius * haze.height },
              uSunDirection: { value: sun },
              uRayleigh: { value: new Color(haze.colour) },
              uSunset: { value: new Color(haze.sunset) },
              uIntensity: { value: haze.intensity },
            },
            blending: AdditiveBlending,
            depthWrite: false,
            transparent: true,
          })
        )
      );
    }

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
    bodies.set(world.slug, { world, mesh, sun, angle: world.phase });
  }

  /** Fetch the worlds' maps and dress each world as its map arrives. */
  function loadSurfaces() {
    const loader = new TextureLoader();
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const textures = new Map();
    const fetch = (url) => {
      if (!textures.has(url)) {
        textures.set(
          url,
          loader.loadAsync(url).then((texture) => {
            texture.anisotropy = anisotropy;
            return texture;
          })
        );
      }
      return textures.get(url);
    };
    return Promise.all(
      [...bodies.values()].map(async ({ world, mesh }) => {
        const surface = SURFACES[world.slug];
        if (!surface) return;
        try {
          const [map, bump] = await Promise.all([fetch(surface.map), surface.bump ? fetch(surface.bump) : null]);
          map.colorSpace = SRGBColorSpace;
          if (bump && bump !== map) bump.colorSpace = NoColorSpace;
          mesh.material.color.setRGB(...(surface.albedo ?? [1, 1, 1]));
          mesh.material.map = map;
          if (bump) {
            mesh.material.bumpMap = bump;
            mesh.material.bumpScale = surface.bumpScale;
          }
          mesh.material.needsUpdate = true;
        } catch {
          // a map that won't load leaves its world in its plain tint
        }
      })
    );
  }

  return {
    object: group,
    worlds: bodies,
    loadSurfaces,
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
        body.sun.copy(STAR.position).sub(body.mesh.position).normalize();
      }
    },
    dispose() {
      disposeTree(group);
    },
  };
}
