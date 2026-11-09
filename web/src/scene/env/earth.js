// Earth, where the journey departs from: a sunlit blue-and-green globe hung in
// the dark, with drifting weather, city lights along the terminator and one
// small satellite gliding round it. It faces the visitor's part of the world
// in the real sun's light for their clock (solar.js), and turns once an hour.
// The surface is NASA imagery (Blue Marble
// by day, Black Marble by night) baked once into two maps, then lit every
// frame. If the imagery can't be had (Save-Data, a failed download, or
// ?earth=procedural), the same maps are baked from noise instead.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  FrontSide,
  GLSL3,
  Group,
  Matrix4,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import noise from '../../shaders/noise.glsl?raw';
import bakeVertexShader from '../../shaders/earth-bake.vert.glsl?raw';
import proceduralFragmentShader from '../../shaders/earth-bake.frag.glsl?raw';
import imageryFragmentShader from '../../shaders/earth-imagery.frag.glsl?raw';
import surfaceVertexShader from '../../shaders/earth.vert.glsl?raw';
import surfaceFragmentShader from '../../shaders/earth.frag.glsl?raw';
import atmosphereVertexShader from '../../shaders/atmosphere.vert.glsl?raw';
import atmosphereFragmentShader from '../../shaders/atmosphere.frag.glsl?raw';
import starVertexShader from '../../shaders/stars.vert.glsl?raw';
import starFragmentShader from '../../shaders/stars.frag.glsl?raw';
import dayLargeUrl from '../../assets/earth/earth-day-3072.webp?url';
import daySmallUrl from '../../assets/earth/earth-day-2048.webp?url';
import cloudsUrl from '../../assets/earth/earth-clouds-2048.webp?url';
import lightsUrl from '../../assets/earth/earth-lights-2048.webp?url';
import { EARTH } from '../layout.js';
import { sceneDate, subsolarPoint, visitorRegion } from '../solar.js';
import { disposeTree } from '../textures.js';

const TAU = Math.PI * 2;
const SCALE_HEIGHT = EARTH.radius * 0.02;
const SPIN = TAU / 3600; // one turn an hour: a day of light and dark, sped up 24 times
const CLOUD_DRIFT = 1 / 9000; // the weather slides east over the ground
const SATELLITE_PERIOD = 96;
const IMAGERY_PATIENCE = 4000; // ms to wait for the imagery before baking from noise

/**
 * Earth's surface (albedo + water) and detail (clouds, lights, height) maps,
 * baked into one render target. `run(sources)` bakes from NASA imagery when
 * given its textures, or from noise when not.
 */
function createBake(renderer, width) {
  const target = new WebGLRenderTarget(width, width / 2, {
    count: 2,
    depthBuffer: false,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    wrapS: RepeatWrapping,
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
  });
  const shared = { glslVersion: GLSL3, vertexShader: bakeVertexShader, depthTest: false, depthWrite: false };
  const procedural = new ShaderMaterial({
    ...shared,
    fragmentShader: proceduralFragmentShader.replace('#include <noise>', noise),
    uniforms: { uSeaLevel: { value: -0.05 } },
  });
  const imagery = new ShaderMaterial({
    ...shared,
    fragmentShader: imageryFragmentShader,
    uniforms: { uDay: { value: null }, uClouds: { value: null }, uLights: { value: null } },
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), procedural);
  quad.frustumCulled = false;
  const scene = new Scene().add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    textures: target.textures,
    run(sources) {
      if (sources) {
        [imagery.uniforms.uDay.value, imagery.uniforms.uClouds.value, imagery.uniforms.uLights.value] = sources;
        quad.material = imagery;
      } else {
        quad.material = procedural;
      }
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(previous);
      // the baked maps are all the globe needs; free the sources' GPU copies
      // (three uploads them again from their images if a restore needs them)
      for (const texture of sources ?? []) texture.dispose();
    },
    dispose() {
      target.dispose();
      quad.geometry.dispose();
      procedural.dispose();
      imagery.dispose();
    },
  };
}

function loadImagery(tier) {
  const loader = new TextureLoader();
  const load = (url, colorSpace) =>
    loader.loadAsync(url).then((texture) => {
      texture.colorSpace = colorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = LinearFilter;
      return texture;
    });
  return Promise.all([
    load(tier.name === 'high' ? dayLargeUrl : daySmallUrl, SRGBColorSpace),
    load(cloudsUrl, NoColorSpace),
    load(lightsUrl, NoColorSpace),
  ]);
}

/** A point on the globe (latitude, longitude in degrees) in the sphere's own frame, matching its uvs. */
function surfacePoint(lat, lon, out = new Vector3()) {
  const phi = ((lon + 180) / 360) * TAU;
  const theta = ((90 - lat) / 180) * Math.PI;
  return out.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
}

/**
 * Turn the globe so the place at (lat, lon) faces the opening eye with north
 * pointing up the screen, and work out where the real sun is from there.
 */
function orient(date, group, sun) {
  const region = visitorRegion(date);
  // centre a little south of the visitor, so their region sits high on the disc
  // with more of the world around it, rather than looking down on the pole
  const facing = surfacePoint(Math.max(-30, Math.min(30, region.lat * 0.5)), region.lon);
  const northward = new Vector3(0, 1, 0).projectOnPlane(facing).normalize();
  const local = new Matrix4().makeBasis(facing, northward, new Vector3().crossVectors(facing, northward));
  const world = new Matrix4().makeBasis(
    EARTH.approach,
    EARTH.north,
    new Vector3().crossVectors(EARTH.approach, EARTH.north)
  );
  group.quaternion.setFromRotationMatrix(world.multiply(local.transpose()));

  const { lat, lon } = subsolarPoint(date);
  surfacePoint(lat, lon, sun).applyQuaternion(group.quaternion);
}

export function createEarth({ tier, renderer }) {
  const group = new Group();
  group.position.copy(EARTH.centre);
  // The sun stays put in the universe while Earth turns beneath it, so the
  // day and night the visitor sees start true to their own clock.
  const sun = new Vector3();
  orient(sceneDate(), group, sun);

  const maps = createBake(renderer, tier.name === 'high' ? 3072 : 2048);
  const [surfaceMap, detailMap] = maps.textures;

  // Imagery when we can have it; noise when we can't, or while it's slow to
  // arrive (and the imagery still replaces it the moment it lands).
  let sources = null;
  let baked = false;
  const bakeFrom = (textures) => {
    sources = textures;
    baked = true;
    maps.run(textures);
  };
  const wantImagery =
    new URLSearchParams(window.location.search).get('earth') !== 'procedural' &&
    navigator.connection?.saveData !== true;
  const imagery = wantImagery
    ? loadImagery(tier).then(bakeFrom, () => baked || bakeFrom(null))
    : Promise.resolve(bakeFrom(null));
  const patience = new Promise((resolve) => setTimeout(resolve, IMAGERY_PATIENCE)).then(
    () => baked || bakeFrom(null)
  );
  /** Resolves once the globe has a surface to show. */
  const ready = Promise.race([imagery, patience]);

  const segments = tier.name === 'low' ? 96 : 160;
  const sunLocal = new Vector3();
  const globe = new Mesh(
    new SphereGeometry(EARTH.radius, segments, segments / 2),
    new ShaderMaterial({
      vertexShader: surfaceVertexShader,
      fragmentShader: surfaceFragmentShader,
      uniforms: {
        uSurface: { value: surfaceMap },
        uDetail: { value: detailMap },
        uSunDirection: { value: sun },
        uSunLocal: { value: sunLocal },
        uCloudShift: { value: 0 },
        uSunIntensity: { value: 1.3 },
        uCityColor: { value: new Color('#ffb347').multiplyScalar(1.8) },
        uScaleRatio: { value: Math.sqrt((2 * SCALE_HEIGHT) / (Math.PI * EARTH.radius)) },
      },
    })
  );

  const atmosphere = new Mesh(
    new SphereGeometry(EARTH.radius * 1.12, segments, segments / 2),
    new ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uCentre: { value: EARTH.centre },
        uRadius: { value: EARTH.radius },
        uScaleHeight: { value: SCALE_HEIGHT },
        uSunDirection: { value: sun },
        uRayleigh: { value: new Color('#3d8bff') },
        uSunset: { value: new Color('#ff7a2e') },
        uIntensity: { value: 1.25 },
      },
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      side: FrontSide,
    })
  );

  // A single satellite on an inclined low orbit: a glint in sunlight, a faint
  // warm beacon in Earth's shadow, hidden whenever the globe is in the way.
  const satelliteGeometry = new BufferGeometry();
  satelliteGeometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
  satelliteGeometry.setAttribute('aColor', new BufferAttribute(new Float32Array([1, 1, 1]), 3));
  satelliteGeometry.setAttribute('aSize', new BufferAttribute(new Float32Array([2.4]), 1));
  satelliteGeometry.setAttribute('aPhase', new BufferAttribute(new Float32Array([0]), 1));
  const satellite = new Points(
    satelliteGeometry,
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
  satellite.frustumCulled = false;
  const satellitePosition = satelliteGeometry.getAttribute('position');
  const satelliteColour = satelliteGeometry.getAttribute('aColor');
  const orbitTilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0.35).normalize(), 0.9);
  const orbit = new Vector3();
  const world = new Vector3();
  const sunlit = new Color(0.8, 0.78, 0.72);
  const beacon = new Color(0.55, 0.27, 0.12);
  const shade = new Color();

  group.add(globe, atmosphere, satellite);
  const inverse = new Quaternion();

  return {
    object: group,
    ready,
    setPixelRatio(ratio) {
      satellite.material.uniforms.uPixelRatio.value = ratio;
    },
    update(time) {
      globe.rotation.y = time * SPIN;
      globe.updateMatrixWorld();
      globe.getWorldQuaternion(inverse).invert();
      sunLocal.copy(sun).applyQuaternion(inverse);
      globe.material.uniforms.uCloudShift.value = (time * CLOUD_DRIFT) % 1;

      // the orbit lives in the group's frame, which is already centred and tilted
      const angle = (time / SATELLITE_PERIOD) * TAU + 1.2;
      orbit.set(Math.cos(angle), 0, -Math.sin(angle)).applyQuaternion(orbitTilt).multiplyScalar(EARTH.radius * 1.09);
      satellitePosition.setXYZ(0, orbit.x, orbit.y, orbit.z);
      satellitePosition.needsUpdate = true;

      // in Earth's shadow when the globe sits between it and the sun
      world.copy(orbit).applyQuaternion(group.quaternion);
      const along = world.dot(sun);
      const inShadow = along < 0 && world.addScaledVector(sun, -along).length() < EARTH.radius;
      if (inShadow) shade.copy(beacon).multiplyScalar(0.3 + 0.7 * Math.max(0, Math.sin(time * 4.2)) ** 6);
      else shade.copy(sunlit);
      satelliteColour.setXYZ(0, shade.r, shade.g, shade.b);
      satelliteColour.needsUpdate = true;
    },
    /** Render targets lose their pixels with the context; bake them again. */
    restore() {
      maps.run(sources);
    },
    dispose() {
      maps.dispose();
      disposeTree(group);
    },
  };
}
